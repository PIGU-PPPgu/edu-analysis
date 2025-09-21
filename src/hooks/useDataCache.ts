/**
 * 统一数据缓存管理Hook
 * 提供智能缓存、自动失效和后台刷新功能
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export interface CacheConfig {
  ttl?: number; // 缓存时间(毫秒)，默认5分钟
  maxSize?: number; // 最大缓存项数，默认100
  refreshOnWindowFocus?: boolean; // 窗口聚焦时刷新，默认true
  staleWhileRevalidate?: boolean; // 返回过期数据并后台刷新，默认true
}

interface CacheItem<T> {
  data: T;
  timestamp: number;
  isLoading: boolean;
  error?: Error;
}

interface CacheEntry<T> {
  value: CacheItem<T>;
  accessTime: number;
  accessCount: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private subscribers = new Map<string, Set<() => void>>();

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T): void {
    // LRU淘汰策略
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      value: {
        data,
        timestamp: now,
        isLoading: false
      },
      accessTime: now,
      accessCount: 1
    });

    this.notifySubscribers(key);
  }

  get<T>(key: string): CacheItem<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 更新访问信息
    entry.accessTime = Date.now();
    entry.accessCount++;

    return entry.value;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.notifySubscribers(key);
  }

  clear(): void {
    this.cache.clear();
    // 通知所有订阅者
    this.subscribers.forEach((subs) => {
      subs.forEach((callback) => callback());
    });
  }

  isStale(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    return Date.now() - entry.value.timestamp > ttl;
  }

  setLoading(key: string, isLoading: boolean): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.value.isLoading = isLoading;
      this.notifySubscribers(key);
    }
  }

  setError(key: string, error: Error): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.value.error = error;
      entry.value.isLoading = false;
      this.notifySubscribers(key);
    }
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);

    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessTime < oldestTime) {
        oldestTime = entry.accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private notifySubscribers(key: string): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach((callback) => callback());
    }
  }

  // 缓存统计信息
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRatio: this.calculateHitRatio(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private calculateHitRatio(): number {
    const totalAccess = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    return totalAccess > 0 ? this.cache.size / totalAccess : 0;
  }

  private estimateMemoryUsage(): number {
    return this.cache.size * 1024; // 估算每项1KB
  }
}

// 全局缓存实例
const globalCache = new DataCache();

export function useDataCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) {
  const {
    ttl = 5 * 60 * 1000, // 5分钟
    refreshOnWindowFocus = true,
    staleWhileRevalidate = true
  } = config;

  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    lastUpdated: number | null;
  }>(() => {
    const cached = globalCache.get<T>(key);
    return {
      data: cached?.data || null,
      isLoading: cached?.isLoading || false,
      error: cached?.error || null,
      lastUpdated: cached?.timestamp || null
    };
  });

  const fetcherRef = useRef(fetcher);
  const configRef = useRef(config);
  fetcherRef.current = fetcher;
  configRef.current = config;

  // 刷新数据
  const refresh = useCallback(async (force = false) => {
    const currentCache = globalCache.get<T>(key);
    const isStale = globalCache.isStale(key, ttl);

    // 如果缓存新鲜且不强制刷新，直接返回
    if (!force && currentCache && !isStale) {
      setState({
        data: currentCache.data,
        isLoading: false,
        error: currentCache.error || null,
        lastUpdated: currentCache.timestamp
      });
      return currentCache.data;
    }

    // SWR策略：返回旧数据，后台刷新
    if (staleWhileRevalidate && currentCache && !currentCache.isLoading) {
      setState({
        data: currentCache.data,
        isLoading: true,
        error: null,
        lastUpdated: currentCache.timestamp
      });
    } else {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));
    }

    globalCache.setLoading(key, true);

    try {
      const newData = await fetcherRef.current();

      globalCache.set(key, newData);
      setState({
        data: newData,
        isLoading: false,
        error: null,
        lastUpdated: Date.now()
      });

      return newData;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      globalCache.setError(key, err);

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err
      }));

      throw err;
    }
  }, [key, ttl, staleWhileRevalidate]);

  // 预加载数据
  const prefetch = useCallback(async () => {
    if (!globalCache.has(key) || globalCache.isStale(key, ttl)) {
      try {
        await refresh();
      } catch {
        // 预加载失败不抛出错误
      }
    }
  }, [key, ttl, refresh]);

  // 手动失效缓存
  const invalidate = useCallback(() => {
    globalCache.delete(key);
    setState({
      data: null,
      isLoading: false,
      error: null,
      lastUpdated: null
    });
  }, [key]);

  // 订阅缓存变化
  useEffect(() => {
    const unsubscribe = globalCache.subscribe(key, () => {
      const cached = globalCache.get<T>(key);
      if (cached) {
        setState({
          data: cached.data,
          isLoading: cached.isLoading,
          error: cached.error || null,
          lastUpdated: cached.timestamp
        });
      }
    });

    return unsubscribe;
  }, [key]);

  // 窗口聚焦时刷新
  useEffect(() => {
    if (!refreshOnWindowFocus) return;

    const handleFocus = () => {
      if (globalCache.isStale(key, ttl)) {
        refresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, ttl, refreshOnWindowFocus, refresh]);

  // 初始加载
  useEffect(() => {
    if (!globalCache.has(key)) {
      refresh();
    }
  }, [key, refresh]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refresh,
    prefetch,
    invalidate,
    isStale: globalCache.isStale(key, ttl)
  };
}

// 缓存工具函数
export const cacheUtils = {
  // 批量预加载
  async prefetchAll<T>(
    items: Array<{ key: string; fetcher: () => Promise<T>; config?: CacheConfig }>
  ) {
    const promises = items.map(({ key, fetcher, config = {} }) => {
      const { ttl = 5 * 60 * 1000 } = config;
      if (!globalCache.has(key) || globalCache.isStale(key, ttl)) {
        return fetcher().then(data => globalCache.set(key, data));
      }
      return Promise.resolve();
    });

    await Promise.allSettled(promises);
  },

  // 清空所有缓存
  clearAll() {
    globalCache.clear();
  },

  // 按模式清空缓存
  clearByPattern(pattern: RegExp) {
    for (const key of Array.from(globalCache['cache'].keys())) {
      if (pattern.test(key)) {
        globalCache.delete(key);
      }
    }
  },

  // 获取缓存统计
  getStats() {
    return globalCache.getStats();
  },

  // 批量失效缓存
  invalidateKeys(keys: string[]) {
    keys.forEach(key => globalCache.delete(key));
  },

  // 生成缓存键
  generateKey(base: string, params: Record<string, any> = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    return sortedParams ? `${base}?${sortedParams}` : base;
  }
};