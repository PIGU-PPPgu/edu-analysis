/**
 * 优化的成绩数据钩子
 * 集成缓存、防抖、虚拟化等性能优化策略
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { debounce } from "lodash-es";
import { fetchGradeData } from "@/api/gradeDataAPI";
import { GradeRecord, GradeFilter, GradeDataResponse } from "@/types/grade";

interface UseOptimizedGradeDataOptions {
  examId?: string;
  initialFilter?: GradeFilter;
  pageSize?: number;
  enableRealTimeRefresh?: boolean;
  cacheTime?: number;
}

interface UseOptimizedGradeDataReturn {
  data: GradeRecord[];
  total: number;
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  filter: GradeFilter;
  setFilter: (filter: GradeFilter) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  // 优化相关
  sampledData: GradeRecord[]; // 用于图表的采样数据
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export function useOptimizedGradeData({
  examId,
  initialFilter = {},
  pageSize = 50,
  enableRealTimeRefresh = false,
  cacheTime = 5 * 60 * 1000, // 5分钟缓存
}: UseOptimizedGradeDataOptions = {}): UseOptimizedGradeDataReturn {
  const queryClient = useQueryClient();

  // 状态管理
  const [filter, setFilterState] = useState<GradeFilter>(initialFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  // 防抖的筛选器更新
  const debouncedSetFilter = useCallback(
    debounce((newFilter: GradeFilter) => {
      setFilterState(newFilter);
      setCurrentPage(1); // 重置到第一页
    }, 300),
    []
  );

  const setFilter = useCallback(
    (newFilter: GradeFilter) => {
      debouncedSetFilter(newFilter);
    },
    [debouncedSetFilter]
  );

  // 查询键生成
  const queryKey = useMemo(
    () => ["gradeData", examId, filter, currentPage, pageSize],
    [examId, filter, currentPage, pageSize]
  );

  // 主数据查询
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery<GradeDataResponse>({
    queryKey,
    queryFn: () =>
      fetchGradeData(examId, filter, { page: currentPage, pageSize }),
    staleTime: cacheTime,
    cacheTime: cacheTime * 2,
    keepPreviousData: true, // 保持上一页数据，提升用户体验
    refetchOnWindowFocus: enableRealTimeRefresh,
  });

  // 数据预取 - 预加载下一页
  const prefetchNextPage = useCallback(() => {
    if (response && response.total > currentPage * pageSize) {
      queryClient.prefetchQuery({
        queryKey: ["gradeData", examId, filter, currentPage + 1, pageSize],
        queryFn: () =>
          fetchGradeData(examId, filter, { page: currentPage + 1, pageSize }),
        staleTime: cacheTime,
      });
    }
  }, [queryClient, examId, filter, currentPage, pageSize, response, cacheTime]);

  // 自动预取下一页
  useEffect(() => {
    if (response?.data.length) {
      const timer = setTimeout(prefetchNextPage, 1000);
      return () => clearTimeout(timer);
    }
  }, [response, prefetchNextPage]);

  // 分页控制
  const hasNextPage = useMemo(() => {
    return response ? response.total > currentPage * pageSize : false;
  }, [response, currentPage, pageSize]);

  const fetchNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  // 图表数据采样 - 大数据集时进行采样以提升性能
  const sampledData = useMemo(() => {
    const data = response?.data || [];
    if (data.length <= 100) return data;

    // 使用系统采样，保持数据分布
    const step = Math.ceil(data.length / 100);
    return data.filter((_, index) => index % step === 0);
  }, [response?.data]);

  // 搜索功能
  const filteredData = useMemo(() => {
    const data = response?.data || [];
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter(
      (item) =>
        item.student_name?.toLowerCase().includes(term) ||
        item.class_name?.toLowerCase().includes(term) ||
        item.exam_name?.toLowerCase().includes(term)
    );
  }, [response?.data, searchTerm]);

  return {
    data: filteredData,
    total: response?.total || 0,
    isLoading,
    error: error ? String(error) : response?.error || null,
    hasNextPage,
    fetchNextPage,
    refetch,
    filter,
    setFilter,
    currentPage,
    setCurrentPage,
    sampledData,
    searchTerm,
    setSearchTerm,
  };
}

// 数据采样工具
export function sampleDataForChart<T>(data: T[], maxPoints: number = 100): T[] {
  if (data.length <= maxPoints) return data;

  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
}

// 虚拟化配置
export const VIRTUALIZATION_CONFIG = {
  itemSize: 60, // 每行高度
  overscan: 5, // 预渲染行数
  threshold: 100, // 超过100行启用虚拟化
};
