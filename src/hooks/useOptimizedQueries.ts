/**
 * 优化的数据查询Hook
 * 集成缓存、防抖、批量请求等性能优化策略
 */
import { useMemo, useCallback, useState, useEffect } from 'react';
import { useDataCache, cacheUtils } from './useDataCache';
import { useDebounce } from './useDebounce';

// 批量请求管理器
class BatchRequestManager {
  private batches = new Map<string, {
    requests: Array<{ id: string; resolve: (data: any) => void; reject: (error: any) => void }>;
    timer: NodeJS.Timeout;
  }>();

  private batchWindow = 50; // 50ms批量窗口

  add<T>(
    batchKey: string,
    requestId: string,
    batchFetcher: (ids: string[]) => Promise<Record<string, T>>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, {
          requests: [],
          timer: setTimeout(() => this.executeBatch(batchKey, batchFetcher), this.batchWindow)
        });
      }

      const batch = this.batches.get(batchKey)!;
      batch.requests.push({ id: requestId, resolve, reject });
    });
  }

  private async executeBatch<T>(
    batchKey: string,
    batchFetcher: (ids: string[]) => Promise<Record<string, T>>
  ) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    const { requests } = batch;
    this.batches.delete(batchKey);

    try {
      const ids = requests.map(req => req.id);
      const results = await batchFetcher(ids);

      requests.forEach(({ id, resolve, reject }) => {
        if (results[id] !== undefined) {
          resolve(results[id]);
        } else {
          reject(new Error(`No data found for id: ${id}`));
        }
      });
    } catch (error) {
      requests.forEach(({ reject }) => reject(error));
    }
  }
}

const batchManager = new BatchRequestManager();

// 成绩数据查询Hook
export function useGradeData(examId?: string, classId?: string, studentId?: string) {
  const cacheKey = cacheUtils.generateKey('grades', { examId, classId, studentId });

  const fetcher = useCallback(async () => {
    const { fetchGradeData } = await import('@/api/gradeDataAPI');
    return fetchGradeData(examId, { class: classId }, { page: 1, pageSize: 1000 });
  }, [examId, classId, studentId]);

  return useDataCache(cacheKey, fetcher, {
    ttl: 10 * 60 * 1000, // 成绩数据缓存10分钟
    refreshOnWindowFocus: true
  });
}

// 班级数据查询Hook
export function useClassData(classId?: string) {
  const cacheKey = cacheUtils.generateKey('class', { classId });

  const fetcher = useCallback(async () => {
    if (!classId) return null;

    // 批量获取班级数据
    return batchManager.add('classes', classId, async (ids) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('class_info')
        .select('*')
        .in('class_name', ids);

      if (error) throw error;

      return data.reduce((acc, cls) => {
        acc[cls.class_name] = cls;
        return acc;
      }, {} as Record<string, any>);
    });
  }, [classId]);

  return useDataCache(cacheKey, fetcher, {
    ttl: 30 * 60 * 1000, // 班级数据缓存30分钟
  });
}

// 学生数据查询Hook
export function useStudentData(studentId?: string) {
  const cacheKey = cacheUtils.generateKey('student', { studentId });

  const fetcher = useCallback(async () => {
    if (!studentId) return null;

    return batchManager.add('students', studentId, async (ids) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .in('student_id', ids);

      if (error) throw error;

      return data.reduce((acc, student) => {
        acc[student.student_id] = student;
        return acc;
      }, {} as Record<string, any>);
    });
  }, [studentId]);

  return useDataCache(cacheKey, fetcher, {
    ttl: 60 * 60 * 1000, // 学生数据缓存1小时
  });
}

// 搜索优化Hook
export function useOptimizedSearch<T>(
  searchTerm: string,
  fetcher: (term: string) => Promise<T[]>,
  options: {
    debounceMs?: number;
    minLength?: number;
    cacheKey?: string;
  } = {}
) {
  const {
    debounceMs = 300,
    minLength = 2,
    cacheKey = 'search'
  } = options;

  const debouncedTerm = useDebounce(searchTerm, debounceMs);

  const shouldSearch = useMemo(() => {
    return debouncedTerm.length >= minLength;
  }, [debouncedTerm, minLength]);

  const finalCacheKey = useMemo(() => {
    return shouldSearch ? cacheUtils.generateKey(cacheKey, { term: debouncedTerm }) : '';
  }, [cacheKey, debouncedTerm, shouldSearch]);

  const searchFetcher = useCallback(async () => {
    if (!shouldSearch) return [];
    return fetcher(debouncedTerm);
  }, [fetcher, debouncedTerm, shouldSearch]);

  const result = useDataCache(finalCacheKey, searchFetcher, {
    ttl: 5 * 60 * 1000, // 搜索结果缓存5分钟
    refreshOnWindowFocus: false
  });

  return {
    ...result,
    searchTerm: debouncedTerm,
    isSearching: shouldSearch && result.isLoading,
    isEmpty: shouldSearch && !result.isLoading && (!result.data || result.data.length === 0)
  };
}

// 分页数据查询Hook
export function usePaginatedData<T>(
  fetcher: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>,
  options: {
    pageSize?: number;
    cacheKey?: string;
    preloadPages?: number;
  } = {}
) {
  const {
    pageSize = 20,
    cacheKey = 'paginated',
    preloadPages = 1
  } = options;

  const [currentPage, setCurrentPage] = useState(1);

  // 当前页数据
  const currentCacheKey = cacheUtils.generateKey(cacheKey, { page: currentPage, pageSize });
  const currentData = useDataCache(currentCacheKey, () => fetcher(currentPage, pageSize), {
    ttl: 5 * 60 * 1000
  });

  // 预加载相邻页面
  useEffect(() => {
    if (currentData.data && !currentData.isLoading) {
      const totalPages = Math.ceil(currentData.data.total / pageSize);
      const preloadPromises: Promise<any>[] = [];

      // 预加载下一页
      if (currentPage < totalPages && preloadPages > 0) {
        for (let i = 1; i <= preloadPages && currentPage + i <= totalPages; i++) {
          const nextPageKey = cacheUtils.generateKey(cacheKey, {
            page: currentPage + i,
            pageSize
          });

          preloadPromises.push(
            cacheUtils.prefetchAll([{
              key: nextPageKey,
              fetcher: () => fetcher(currentPage + i, pageSize)
            }])
          );
        }
      }

      // 预加载上一页
      if (currentPage > 1 && preloadPages > 0) {
        for (let i = 1; i <= preloadPages && currentPage - i >= 1; i++) {
          const prevPageKey = cacheUtils.generateKey(cacheKey, {
            page: currentPage - i,
            pageSize
          });

          preloadPromises.push(
            cacheUtils.prefetchAll([{
              key: prevPageKey,
              fetcher: () => fetcher(currentPage - i, pageSize)
            }])
          );
        }
      }

      Promise.allSettled(preloadPromises);
    }
  }, [currentData.data, currentData.isLoading, currentPage, pageSize, preloadPages, cacheKey, fetcher]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const totalPages = useMemo(() => {
    return currentData.data ? Math.ceil(currentData.data.total / pageSize) : 0;
  }, [currentData.data, pageSize]);

  return {
    data: currentData.data?.data || [],
    total: currentData.data?.total || 0,
    totalPages,
    currentPage,
    pageSize,
    isLoading: currentData.isLoading,
    error: currentData.error,
    goToPage,
    refresh: currentData.refresh,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
}

// 实时数据同步Hook
export function useRealtimeSync(
  tableName: string,
  onUpdate: (payload: any) => void,
  options: {
    filter?: string;
    cacheKeyPattern?: RegExp;
  } = {}
) {
  const { filter, cacheKeyPattern } = options;

  useEffect(() => {
    const setupRealtimeSync = async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      let subscription = supabase
        .channel(`${tableName}_changes`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: tableName,
          filter
        }, (payload) => {
          // 清除相关缓存
          if (cacheKeyPattern) {
            cacheUtils.clearByPattern(cacheKeyPattern);
          }

          onUpdate(payload);
        });

      subscription.subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    const cleanup = setupRealtimeSync();
    return () => cleanup.then(fn => fn?.());
  }, [tableName, filter, cacheKeyPattern, onUpdate]);
}

// 缓存预热Hook
export function useCacheWarming(
  preloadConfig: Array<{
    key: string;
    fetcher: () => Promise<any>;
    condition?: () => boolean;
  }>
) {
  useEffect(() => {
    const warmCache = async () => {
      const validConfigs = preloadConfig.filter(config =>
        !config.condition || config.condition()
      );

      await cacheUtils.prefetchAll(validConfigs);
    };

    // 延迟预热，避免阻塞初始渲染
    const timer = setTimeout(warmCache, 100);
    return () => clearTimeout(timer);
  }, [preloadConfig]);
}