/**
 * 统一数据缓存系统
 * 支持多级缓存和不同存储方式
 */

import { CacheConfig, CacheKeyGenerator } from "./types";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class DataCache {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private keyGenerator: CacheKeyGenerator;

  constructor(config: CacheConfig, keyGenerator?: CacheKeyGenerator) {
    this.config = config;
    this.keyGenerator = keyGenerator || this.defaultKeyGenerator;

    // 定期清理过期缓存
    if (config.enabled) {
      setInterval(() => this.cleanup(), 60000); // 每分钟清理一次
    }
  }

  private defaultKeyGenerator: CacheKeyGenerator = (
    operation: string,
    params: any
  ) => {
    return `${operation}_${JSON.stringify(params)}`;
  };

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  private cleanup(): void {
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // 如果缓存超过最大大小，删除最老的条目
    if (this.memoryCache.size > this.config.maxSize) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toDelete = entries.slice(
        0,
        this.memoryCache.size - this.config.maxSize
      );
      toDelete.forEach(([key]) => this.memoryCache.delete(key));
    }
  }

  async get<T>(operation: string, params: any): Promise<T | null> {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.keyGenerator(operation, params);

    // 先检查内存缓存
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      console.log(`[DataCache] 内存缓存命中: ${key}`);
      return memoryEntry.data;
    }

    // 检查本地存储缓存
    if (this.config.storage !== "memory") {
      try {
        const storage =
          this.config.storage === "localStorage"
            ? localStorage
            : sessionStorage;
        const cached = storage.getItem(`data_cache_${key}`);

        if (cached) {
          const entry: CacheEntry<T> = JSON.parse(cached);
          if (!this.isExpired(entry)) {
            console.log(`[DataCache] 本地存储缓存命中: ${key}`);
            // 同步到内存缓存
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // 删除过期的本地存储缓存
            storage.removeItem(`data_cache_${key}`);
          }
        }
      } catch (error) {
        console.warn("[DataCache] 读取本地存储缓存失败:", error);
      }
    }

    return null;
  }

  async set<T>(
    operation: string,
    params: any,
    data: T,
    customTtl?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const key = this.keyGenerator(operation, params);
    const ttl = customTtl || this.config.ttl;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // 设置内存缓存
    this.memoryCache.set(key, entry);

    // 设置本地存储缓存
    if (this.config.storage !== "memory") {
      try {
        const storage =
          this.config.storage === "localStorage"
            ? localStorage
            : sessionStorage;
        storage.setItem(`data_cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn("[DataCache] 设置本地存储缓存失败:", error);
      }
    }

    console.log(`[DataCache] 缓存已设置: ${key} (TTL: ${ttl}s)`);
  }

  async invalidate(operation: string, params?: any): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (params) {
      // 删除特定缓存
      const key = this.keyGenerator(operation, params);
      this.memoryCache.delete(key);

      if (this.config.storage !== "memory") {
        try {
          const storage =
            this.config.storage === "localStorage"
              ? localStorage
              : sessionStorage;
          storage.removeItem(`data_cache_${key}`);
        } catch (error) {
          console.warn("[DataCache] 删除本地存储缓存失败:", error);
        }
      }

      console.log(`[DataCache] 缓存已失效: ${key}`);
    } else {
      // 删除所有相关操作的缓存
      const keysToDelete = Array.from(this.memoryCache.keys()).filter((key) =>
        key.startsWith(`${operation}_`)
      );

      keysToDelete.forEach((key) => {
        this.memoryCache.delete(key);

        if (this.config.storage !== "memory") {
          try {
            const storage =
              this.config.storage === "localStorage"
                ? localStorage
                : sessionStorage;
            storage.removeItem(`data_cache_${key}`);
          } catch (error) {
            console.warn("[DataCache] 删除本地存储缓存失败:", error);
          }
        }
      });

      console.log(
        `[DataCache] 已失效 ${keysToDelete.length} 个 ${operation} 相关缓存`
      );
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();

    if (this.config.storage !== "memory") {
      try {
        const storage =
          this.config.storage === "localStorage"
            ? localStorage
            : sessionStorage;
        const keysToDelete = [];

        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key && key.startsWith("data_cache_")) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach((key) => storage.removeItem(key));
        console.log(
          `[DataCache] 已清除所有缓存 (${keysToDelete.length} 个条目)`
        );
      } catch (error) {
        console.warn("[DataCache] 清除本地存储缓存失败:", error);
      }
    }
  }

  getStats(): {
    memorySize: number;
    maxSize: number;
    hitRate: number;
    config: CacheConfig;
  } {
    return {
      memorySize: this.memoryCache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // 需要实现命中率统计
      config: this.config,
    };
  }
}
