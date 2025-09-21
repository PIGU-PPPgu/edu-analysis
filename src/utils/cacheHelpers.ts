/**
 * 缓存辅助函数
 * 为服务层提供简化的缓存操作
 */
import { cacheUtils } from '@/hooks/useDataCache';

// 获取缓存数据或执行获取函数
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 默认5分钟
): Promise<T> {
  // 尝试从缓存获取数据
  const cached = getCacheEntry<T>(key);

  if (cached && !isCacheExpired(cached, ttl)) {
    return cached.data;
  }

  // 缓存未命中或已过期，执行获取函数
  try {
    const data = await fetcher();
    setCacheEntry(key, data);
    return data;
  } catch (error) {
    // 如果有过期的缓存数据，在出错时返回它
    if (cached) {
      console.warn(`获取新数据失败，返回过期缓存数据: ${key}`, error);
      return cached.data;
    }
    throw error;
  }
}

// 简化的缓存条目接口
interface SimpleCacheEntry<T> {
  data: T;
  timestamp: number;
}

// 简单的内存缓存存储
const memoryCache = new Map<string, SimpleCacheEntry<any>>();

// 获取缓存条目
function getCacheEntry<T>(key: string): SimpleCacheEntry<T> | null {
  return memoryCache.get(key) || null;
}

// 设置缓存条目
function setCacheEntry<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now()
  });

  // 清理过期缓存（简单的LRU）
  if (memoryCache.size > 1000) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // 删除最旧的100个条目
    entries.slice(0, 100).forEach(([key]) => {
      memoryCache.delete(key);
    });
  }
}

// 检查缓存是否过期
function isCacheExpired<T>(entry: SimpleCacheEntry<T>, ttl: number): boolean {
  return Date.now() - entry.timestamp > ttl;
}

// 清除特定缓存
export function clearCache(key: string): void {
  memoryCache.delete(key);
}

// 按模式清除缓存
export function clearCacheByPattern(pattern: RegExp): void {
  for (const key of memoryCache.keys()) {
    if (pattern.test(key)) {
      memoryCache.delete(key);
    }
  }
}

// 清除所有缓存
export function clearAllCache(): void {
  memoryCache.clear();
}

// 批量缓存预热
export async function warmupCache(
  items: Array<{
    key: string;
    fetcher: () => Promise<any>;
    ttl?: number;
  }>
): Promise<void> {
  const promises = items.map(async ({ key, fetcher, ttl = 5 * 60 * 1000 }) => {
    try {
      const data = await fetcher();
      setCacheEntry(key, data);
    } catch (error) {
      console.warn(`预热缓存失败: ${key}`, error);
    }
  });

  await Promise.allSettled(promises);
}

// 缓存统计信息
export function getCacheStats() {
  const now = Date.now();
  let validCount = 0;
  let expiredCount = 0;
  let totalSize = 0;

  for (const [key, entry] of memoryCache.entries()) {
    totalSize++;
    if (now - entry.timestamp > 30 * 60 * 1000) { // 30分钟视为过期
      expiredCount++;
    } else {
      validCount++;
    }
  }

  return {
    totalEntries: totalSize,
    validEntries: validCount,
    expiredEntries: expiredCount,
    hitRatio: validCount / Math.max(totalSize, 1)
  };
}

// 自动清理过期缓存
let cleanupInterval: NodeJS.Timeout;

export function startCacheCleanup(intervalMs: number = 10 * 60 * 1000) {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of memoryCache.entries()) {
      // 删除超过30分钟的缓存
      if (now - entry.timestamp > 30 * 60 * 1000) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => memoryCache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`清理了 ${expiredKeys.length} 个过期缓存条目`);
    }
  }, intervalMs);
}

export function stopCacheCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null as any;
  }
}

// 初始化缓存清理
startCacheCleanup();