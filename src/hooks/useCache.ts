/**
 * useCache Hook
 *
 * React Hook封装CacheManager,提供自动刷新和状态管理
 *
 * Week 6 Day 9-10
 */

import { useState, useEffect, useCallback } from 'react';
import { cacheManager, CacheKeys, CacheTTL } from '@/services/CacheManager';

/**
 * useCache Hook配置
 */
interface UseCacheOptions {
  /** 缓存键 */
  key: string;
  /** 数据获取函数 */
  fetcher: () => Promise<any>;
  /** TTL(秒) */
  ttl?: number;
  /** 是否持久化 */
  persistent?: boolean;
  /** 是否自动加载 */
  autoLoad?: boolean;
  /** 依赖项(变化时重新加载) */
  deps?: any[];
}

/**
 * useCache返回值
 */
interface UseCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clear: () => void;
}

/**
 * useCache Hook
 */
export function useCache<T = any>(options: UseCacheOptions): UseCacheReturn<T> {
  const {
    key,
    fetcher,
    ttl = CacheTTL.FIVE_MINUTES,
    persistent = false,
    autoLoad = true,
    deps = [],
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 加载数据
   */
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const result = await cacheManager.getOrSet<T>(
        key,
        fetcher,
        { ttl, persistent, forceRefresh }
      );
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error(`[useCache] 加载失败: ${key}`, error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, persistent]);

  /**
   * 刷新数据
   */
  const refresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  /**
   * 清除缓存
   */
  const clear = useCallback(() => {
    cacheManager.delete(key);
    setData(null);
  }, [key]);

  /**
   * 自动加载
   */
  useEffect(() => {
    if (autoLoad) {
      loadData(false);
    }
  }, [autoLoad, ...deps]);

  return {
    data,
    loading,
    error,
    refresh,
    clear,
  };
}

/**
 * 学生列表缓存Hook
 */
export function useStudentsCache() {
  return useCache({
    key: CacheKeys.STUDENTS_LIST,
    fetcher: async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('students')
        .select('id, student_id, name, class_name')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    ttl: CacheTTL.ONE_DAY,
    persistent: true,
  });
}

/**
 * 班级列表缓存Hook
 */
export function useClassesCache() {
  return useCache({
    key: CacheKeys.CLASSES_LIST,
    fetcher: async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('class_info')
        .select('class_name, grade_level, academic_year')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    ttl: CacheTTL.THREE_MONTHS,
    persistent: true,
  });
}

/**
 * 科目列表缓存Hook
 */
export function useSubjectsCache() {
  return useCache({
    key: CacheKeys.SUBJECTS_LIST,
    fetcher: async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('subjects')
        .select('subject_code, subject_name, credit, is_required')
        .order('subject_code');

      if (error) throw error;
      return data || [];
    },
    ttl: CacheTTL.THREE_MONTHS,
    persistent: true,
  });
}

/**
 * 考试查询缓存Hook
 */
export function useExamQueryCache(title: string, type: string, date: string) {
  return useCache({
    key: CacheKeys.examQuery(title, type, date),
    fetcher: async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data, error } = await supabase
        .from('exams')
        .select('id, title, type, date, created_at, updated_at')
        .eq('title', title)
        .eq('type', type)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    ttl: CacheTTL.FIVE_MINUTES,
    persistent: false,
  });
}
