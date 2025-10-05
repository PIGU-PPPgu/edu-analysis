/**
 * 缓存辅助函数
 * 为服务层提供简化的缓存操作
 *
 * ✅ Week 6 Day 9-10: 迁移到CacheManager
 * 保持向后兼容的API，内部使用CacheManager实现
 */
import { cacheManager, CacheTTL } from '@/services/CacheManager';

/**
 * 获取缓存数据或执行获取函数
 * @param key 缓存键
 * @param fetcher 数据获取函数
 * @param ttl 过期时间(毫秒) - 会自动转换为秒传给CacheManager
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 默认5分钟
): Promise<T> {
  return cacheManager.getOrSet(key, fetcher, {
    ttl: Math.floor(ttl / 1000), // 转换为秒
    persistent: false, // 默认不持久化
  });
}

/**
 * 清除特定缓存
 */
export function clearCache(key: string): void {
  cacheManager.delete(key);
}

/**
 * 按模式清除缓存
 */
export function clearCacheByPattern(pattern: RegExp): void {
  cacheManager.clearByPattern(pattern);
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  cacheManager.clear();
}

/**
 * 批量缓存预热
 */
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
      cacheManager.set(key, data, {
        ttl: Math.floor(ttl / 1000),
        persistent: false,
      });
    } catch (error) {
      console.warn(`预热缓存失败: ${key}`, error);
    }
  });

  await Promise.allSettled(promises);
}

/**
 * 缓存统计信息
 */
export function getCacheStats() {
  const stats = cacheManager.getStats();
  return {
    totalEntries: stats.entryCount,
    validEntries: stats.entryCount,
    expiredEntries: 0, // CacheManager自动清理过期缓存
    hitRatio: stats.hits / Math.max(stats.hits + stats.misses, 1),
    hits: stats.hits,
    misses: stats.misses,
    evictions: stats.evictions,
    totalSize: stats.totalSize,
  };
}

/**
 * 自动清理过期缓存 - CacheManager内部已实现，这里保留API兼容性
 */
export function startCacheCleanup(intervalMs: number = 10 * 60 * 1000) {
  console.log('[cacheHelpers] CacheManager已内置自动清理，无需额外启动');
}

export function stopCacheCleanup() {
  console.log('[cacheHelpers] CacheManager的清理无法停止');
}

/**
 * 导出CacheManager实例供高级用��使用
 */
export { cacheManager };