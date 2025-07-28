// 学生画像系统性能优化工具库
// 基于性能分析结果实施的优化策略

import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// 1. React Query 配置优化
export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 增加缓存时间，减少重复请求
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000, // 10分钟 (原cacheTime)
      // 启用后台重新获取
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // 重试配置
      retry: (failureCount, error: any) => {
        if (error?.status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // 失败重试
      retry: 1,
    },
  },
});

// 2. 数据库查询优化策略
export class DatabaseOptimizer {
  // 优化的学生数据查询
  static async getStudentsOptimized(classId?: string, limit = 50) {
    const query = supabase
      .from("students")
      .select(
        `
        id,
        student_id,
        name,
        class_name,
        grade
      `
      ) // 只选择必要字段
      .order("created_at", { ascending: false })
      .limit(limit); // 限制查询数量

    if (classId) {
      query.eq("class_id", classId);
    }

    return query;
  }

  // 优化的成绩数据查询 - 分页查询
  static async getGradeDataPaginated(
    page = 1,
    pageSize = 20,
    examId?: string,
    classFilter?: string
  ) {
    const startIndex = (page - 1) * pageSize;

    let query = supabase
      .from("grade_data")
      .select(
        `
        id,
        student_id,
        name,
        class_name,
        subject,
        score,
        exam_title,
        exam_date
      `,
        { count: "exact" }
      ) // 获取总数用于分页
      .order("created_at", { ascending: false })
      .range(startIndex, startIndex + pageSize - 1);

    if (examId) {
      query = query.eq("exam_id", examId);
    }

    if (classFilter) {
      query = query.eq("class_name", classFilter);
    }

    return query;
  }

  // 优化的统计查询 - 使用视图或预计算
  static async getClassStatisticsOptimized() {
    // 使用数据库视图或预计算的统计数据
    return supabase
      .from("class_performance_summary") // 假设这是一个优化过的视图
      .select("*")
      .limit(20);
  }

  // 批量查询优化
  static async getBatchData(studentIds: string[]) {
    // 使用 IN 查询而不是多个单独查询
    return supabase
      .from("grade_data")
      .select("*")
      .in("student_id", studentIds)
      .limit(1000);
  }
}

// 3. 组件性能优化 HOC
export function withPerformanceOptimization<T extends object>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  const OptimizedComponent = React.memo((props: T) => {
    return React.createElement(Component, props);
  });

  OptimizedComponent.displayName = `Optimized${Component.displayName || Component.name}`;
  return OptimizedComponent;
}

// 4. 虚拟化列表组件优化
export const VirtualizedTableConfig = {
  // 大数据表格的虚拟化配置
  itemHeight: 48, // 行高
  overscan: 5, // 预渲染行数
  scrollThreshold: 100, // 滚动阈值

  // 获取虚拟化props
  getVirtualProps: (totalItems: number, containerHeight = 400) => ({
    height: containerHeight,
    itemCount: totalItems,
    itemSize: VirtualizedTableConfig.itemHeight,
    overscanCount: VirtualizedTableConfig.overscan,
  }),
};

// 5. 图表渲染优化
export class ChartOptimizer {
  // 数据采样 - 大数据集时减少数据点
  static sampleData<T>(data: T[], maxPoints = 100): T[] {
    if (data.length <= maxPoints) return data;

    const step = Math.ceil(data.length / maxPoints);
    return data.filter((_, index) => index % step === 0);
  }

  // 延迟渲染配置
  static getChartConfig(dataSize: number) {
    return {
      // 大数据集时禁用动画
      animation: dataSize < 500,
      // 响应式配置
      responsive: true,
      maintainAspectRatio: false,
      // 性能优化选项
      devicePixelRatio: dataSize > 1000 ? 1 : window.devicePixelRatio,
    };
  }

  // 图表数据预处理
  static preprocessChartData(
    rawData: any[],
    chartType: "bar" | "line" | "pie"
  ) {
    switch (chartType) {
      case "bar":
      case "line":
        return this.sampleData(rawData, 50);
      case "pie":
        // 饼图只显示前10项，其他合并为"其他"
        if (rawData.length <= 10) return rawData;

        const top9 = rawData.slice(0, 9);
        const others = rawData.slice(9);
        const othersSum = others.reduce(
          (sum, item) => sum + (item.value || 0),
          0
        );

        return [...top9, { name: "其他", value: othersSum }];

      default:
        return rawData;
    }
  }
}

// 6. 缓存策略优化
export class CacheOptimizer {
  private static cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  // 设置缓存
  static set(key: string, data: any, ttlMs = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  // 获取缓存
  static get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 检查是否过期
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // 清除过期缓存
  static cleanup() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 生成缓存键
  static generateKey(prefix: string, params: Record<string, any>) {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join("|");
    return `${prefix}:${sortedParams}`;
  }
}

// 7. 懒加载和代码分割辅助
export const LazyComponentLoader = {
  // 创建懒加载组件
  createLazyComponent: (importFunc: () => Promise<any>) => {
    return React.lazy(() =>
      importFunc().then((module) => ({
        default: module.default || module,
      }))
    );
  },

  // 预加载组件
  preloadComponent: (importFunc: () => Promise<any>) => {
    // 在空闲时间预加载
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => {
        importFunc();
      });
    } else {
      // 降级方案
      setTimeout(() => {
        importFunc();
      }, 100);
    }
  },
};

// 8. 内存优化工具
export class MemoryOptimizer {
  // 清理事件监听器
  static cleanupEventListeners() {
    // 清理性能监控
    if (typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  // 页面卸载前清理
  private static handleBeforeUnload = () => {
    // 清理缓存
    CacheOptimizer.cleanup();

    // 清理其他资源
    if (optimizedQueryClient) {
      optimizedQueryClient.clear();
    }
  };

  // 初始化内存优化
  static initialize() {
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", this.handleBeforeUnload);

      // 定期清理缓存
      setInterval(
        () => {
          CacheOptimizer.cleanup();
        },
        10 * 60 * 1000
      ); // 每10分钟清理一次
    }
  }
}

// 9. 性能监控装饰器
export function performanceMonitor(name: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = performance.now();

      try {
        const result = await method.apply(this, args);
        const end = performance.now();

        console.log(`⚡ ${name} 执行时间: ${Math.round(end - start)}ms`);

        return result;
      } catch (error) {
        const end = performance.now();
        console.log(`❌ ${name} 执行失败: ${Math.round(end - start)}ms`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

// 10. React组件性能优化hooks
export function useOptimizedQuery<T>(
  key: string[],
  queryFn: () => Promise<T>,
  options: any = {}
) {
  return useQuery({
    queryKey: key,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 10 * 60 * 1000, // 10分钟
    ...options,
  });
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 11. 批处理优化
export class BatchProcessor {
  private static batches = new Map<string, any[]>();
  private static timers = new Map<string, NodeJS.Timeout>();

  static addToBatch(
    key: string,
    item: any,
    processor: (items: any[]) => Promise<void>,
    delay = 100
  ) {
    // 添加到批次
    if (!this.batches.has(key)) {
      this.batches.set(key, []);
    }
    this.batches.get(key)!.push(item);

    // 清除现有定时器
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // 设置新的定时器
    const timer = setTimeout(async () => {
      const items = this.batches.get(key) || [];
      this.batches.delete(key);
      this.timers.delete(key);

      if (items.length > 0) {
        try {
          await processor(items);
        } catch (error) {
          console.error(`批处理失败 [${key}]:`, error);
        }
      }
    }, delay);

    this.timers.set(key, timer);
  }
}

// 初始化性能优化
if (typeof window !== "undefined") {
  MemoryOptimizer.initialize();
}

// 导出所有优化工具
export default {
  DatabaseOptimizer,
  ChartOptimizer,
  CacheOptimizer,
  LazyComponentLoader,
  MemoryOptimizer,
  VirtualizedTableConfig,
  BatchProcessor,
  optimizedQueryClient,
};

// 导入必要的依赖
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
