/**
 * 缓存管理 - 核心基础设施
 *
 * 功能：
 * - 内存缓存管理
 * - 缓存策略配置
 * - 自动过期清理
 * - 缓存统计监控
 */

import { logInfo, logError } from "@/utils/logger";

export interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

export interface CacheConfig {
  defaultTTL?: number; // 默认过期时间（毫秒）
  maxSize?: number; // 最大缓存条目数
  cleanupInterval?: number; // 清理间隔（毫秒）
  enableStats?: boolean; // 是否启用统计
}

/**
 * 缓存管理器
 */
export class CacheManager<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: Required<CacheConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5分钟
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1分钟
      enableStats: true,
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    try {
      // 检查容量限制
      if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
        this.evictOldest();
      }

      const item: CacheItem<T> = {
        value,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        hitCount: 0,
      };

      this.cache.set(key, item);

      if (this.config.enableStats) {
        this.stats.sets++;
      }

      logInfo(`缓存设置: ${key}`, { ttl: item.ttl, size: this.cache.size });
    } catch (error) {
      logError(`设置缓存失败: ${key}`, error);
    }
  }

  /**
   * 获取缓存
   */
  get(key: string): T | null {
    try {
      const item = this.cache.get(key);

      if (!item) {
        if (this.config.enableStats) {
          this.stats.misses++;
        }
        return null;
      }

      // 检查是否过期
      if (this.isExpired(item)) {
        this.cache.delete(key);
        if (this.config.enableStats) {
          this.stats.misses++;
        }
        return null;
      }

      // 更新命中次数
      item.hitCount++;

      if (this.config.enableStats) {
        this.stats.hits++;
      }

      logInfo(`缓存命中: ${key}`, { hitCount: item.hitCount });
      return item.value;
    } catch (error) {
      logError(`获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (deleted && this.config.enableStats) {
      this.stats.deletes++;
    }

    if (deleted) {
      logInfo(`缓存删除: ${key}`);
    }

    return deleted;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();

    if (this.config.enableStats) {
      this.stats.deletes += size;
    }

    logInfo("缓存已清空", { previousSize: size });
  }

  /**
   * 获取或设置缓存（如果不存在则设置）
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    try {
      // 先尝试获取
      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }

      // 执行工厂函数获取数据
      logInfo(`缓存未命中，执行工厂函数: ${key}`);
      const value = await factory();

      // 设置到缓存
      this.set(key, value, ttl);

      return value;
    } catch (error) {
      logError(`获取或设置缓存失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 批量设置缓存
   */
  setMany(items: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of items) {
      this.set(key, value, ttl);
    }
  }

  /**
   * 批量获取缓存
   */
  getMany(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};

    for (const key of keys) {
      result[key] = this.get(key);
    }

    return result;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    hitRate: number;
    stats: typeof this.stats;
  } {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate =
      totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      stats: { ...this.stats },
    };
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存详细信息
   */
  inspect(): Array<{
    key: string;
    size: number;
    ttl: number;
    age: number;
    hitCount: number;
    expired: boolean;
  }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      size: JSON.stringify(item.value).length,
      ttl: item.ttl,
      age: now - item.timestamp,
      hitCount: item.hitCount,
      expired: this.isExpired(item),
    }));
  }

  /**
   * 检查项目是否过期
   */
  private isExpired(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * 清理过期项目
   */
  private cleanup(): void {
    const sizeBefore = this.cache.size;
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logInfo("缓存清理完成", {
        cleaned: cleanedCount,
        sizeBefore,
        sizeAfter: this.cache.size,
      });
    }
  }

  /**
   * 淘汰最旧的项目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);

      if (this.config.enableStats) {
        this.stats.evictions++;
      }

      logInfo(`淘汰最旧缓存: ${oldestKey}`);
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
    logInfo("缓存管理器已销毁");
  }
}

// 创建全局缓存实例
export const globalCache = new CacheManager();

// 创建专用缓存实例
export const requestCache = new CacheManager({
  defaultTTL: 10 * 60 * 1000, // 10分钟
  maxSize: 500,
});

export const userCache = new CacheManager({
  defaultTTL: 30 * 60 * 1000, // 30分钟
  maxSize: 200,
});

export const dataCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxSize: 1000,
});

// 向后兼容的导出
export { requestCache as default };
