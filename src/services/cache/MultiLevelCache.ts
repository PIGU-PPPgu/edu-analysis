/**
 * 🚀 第6周多层缓存系统
 * 实现内存缓存、LocalStorage缓存、SessionStorage缓存和IndexedDB缓存
 */

// 缓存项接口
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

// 缓存层级枚举
enum CacheLevel {
  MEMORY = "memory",
  SESSION = "session",
  LOCAL = "local",
  INDEXED_DB = "indexeddb",
}

// 缓存配置
interface CacheConfig {
  maxMemorySize: number; // 内存缓存最大大小(MB)
  maxLocalStorageSize: number; // localStorage最大大小(MB)
  defaultTTL: number; // 默认TTL(毫秒)
  enableCompression: boolean; // 是否启用压缩
  enableMetrics: boolean; // 是否启用指标收集
}

// 缓存指标
interface CacheMetrics {
  totalRequests: number;
  hits: number;
  misses: number;
  evictions: number;
  errors: number;
  averageResponseTime: number;
  hitRateByLevel: Record<CacheLevel, number>;
  sizeByLevel: Record<CacheLevel, number>;
}

export class MultiLevelCache {
  private memoryCache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private db: IDBDatabase | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      maxLocalStorageSize: 10 * 1024 * 1024, // 10MB
      defaultTTL: 30 * 60 * 1000, // 30分钟
      enableCompression: true,
      enableMetrics: true,
      ...config,
    };

    this.metrics = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      errors: 0,
      averageResponseTime: 0,
      hitRateByLevel: {
        [CacheLevel.MEMORY]: 0,
        [CacheLevel.SESSION]: 0,
        [CacheLevel.LOCAL]: 0,
        [CacheLevel.INDEXED_DB]: 0,
      },
      sizeByLevel: {
        [CacheLevel.MEMORY]: 0,
        [CacheLevel.SESSION]: 0,
        [CacheLevel.LOCAL]: 0,
        [CacheLevel.INDEXED_DB]: 0,
      },
    };

    this.initializeIndexedDB();
    this.startCleanupInterval();
  }

  /**
   * 初始化IndexedDB
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("MultiLevelCache", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("cache")) {
          const store = db.createObjectStore("cache", { keyPath: "key" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("ttl", "ttl", { unique: false });
        }
      };
    });
  }

  /**
   * 设置缓存项
   */
  async set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTTL,
    level: CacheLevel = CacheLevel.MEMORY
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: this.calculateSize(data),
      };

      // 根据缓存层级存储
      switch (level) {
        case CacheLevel.MEMORY:
          await this.setMemoryCache(key, item);
          break;
        case CacheLevel.SESSION:
          await this.setSessionStorage(key, item);
          break;
        case CacheLevel.LOCAL:
          await this.setLocalStorage(key, item);
          break;
        case CacheLevel.INDEXED_DB:
          await this.setIndexedDB(key, item);
          break;
      }

      this.updateMetrics(startTime, true);
    } catch (error) {
      this.metrics.errors++;
      console.error(`[MultiLevelCache] 设置缓存失败 ${key}:`, error);
      throw error;
    }
  }

  /**
   * 获取缓存项
   */
  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // 按优先级检查各缓存层
      const levels = [
        CacheLevel.MEMORY,
        CacheLevel.SESSION,
        CacheLevel.LOCAL,
        CacheLevel.INDEXED_DB,
      ];

      for (const level of levels) {
        let item: CacheItem<T> | null = null;

        switch (level) {
          case CacheLevel.MEMORY:
            item = this.getMemoryCache<T>(key);
            break;
          case CacheLevel.SESSION:
            item = await this.getSessionStorage<T>(key);
            break;
          case CacheLevel.LOCAL:
            item = await this.getLocalStorage<T>(key);
            break;
          case CacheLevel.INDEXED_DB:
            item = await this.getIndexedDB<T>(key);
            break;
        }

        if (item && this.isValidItem(item)) {
          // 更新访问统计
          item.accessCount++;
          item.lastAccessed = Date.now();

          // 提升到更高级缓存
          if (level !== CacheLevel.MEMORY) {
            await this.promoteToHigherLevel(key, item, level);
          }

          this.metrics.hits++;
          this.metrics.hitRateByLevel[level]++;
          this.updateMetrics(startTime, true);

          return item.data;
        }

        // 清理过期项
        if (item && !this.isValidItem(item)) {
          await this.delete(key);
        }
      }

      this.metrics.misses++;
      this.updateMetrics(startTime, false);
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.error(`[MultiLevelCache] 获取缓存失败 ${key}:`, error);
      return null;
    }
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<void> {
    try {
      // 从所有缓存层删除
      this.memoryCache.delete(key);

      if (typeof Storage !== "undefined") {
        sessionStorage.removeItem(`cache_${key}`);
        localStorage.removeItem(`cache_${key}`);
      }

      if (this.db) {
        const tx = this.db.transaction(["cache"], "readwrite");
        const store = tx.objectStore("cache");
        store.delete(key);
      }
    } catch (error) {
      console.error(`[MultiLevelCache] 删除缓存失败 ${key}:`, error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();

      if (typeof Storage !== "undefined") {
        // 清理带有cache_前缀的项
        const sessionKeys = Object.keys(sessionStorage).filter((k) =>
          k.startsWith("cache_")
        );
        const localKeys = Object.keys(localStorage).filter((k) =>
          k.startsWith("cache_")
        );

        sessionKeys.forEach((key) => sessionStorage.removeItem(key));
        localKeys.forEach((key) => localStorage.removeItem(key));
      }

      if (this.db) {
        const tx = this.db.transaction(["cache"], "readwrite");
        const store = tx.objectStore("cache");
        store.clear();
      }

      // 重置指标
      this.resetMetrics();
    } catch (error) {
      console.error("[MultiLevelCache] 清空缓存失败:", error);
    }
  }

  /**
   * 内存缓存操作
   */
  private async setMemoryCache<T>(
    key: string,
    item: CacheItem<T>
  ): Promise<void> {
    // 检查内存限制
    const currentSize = this.getMemoryCacheSize();
    if (currentSize + item.size > this.config.maxMemorySize) {
      await this.evictMemoryCache(item.size);
    }

    this.memoryCache.set(key, item);
    this.metrics.sizeByLevel[CacheLevel.MEMORY] = this.getMemoryCacheSize();
  }

  private getMemoryCache<T>(key: string): CacheItem<T> | null {
    return this.memoryCache.get(key) || null;
  }

  /**
   * SessionStorage操作
   */
  private async setSessionStorage<T>(
    key: string,
    item: CacheItem<T>
  ): Promise<void> {
    if (typeof Storage === "undefined") return;

    try {
      const serialized = this.serializeItem(item);
      sessionStorage.setItem(`cache_${key}`, serialized);
      this.updateStorageSize(CacheLevel.SESSION);
    } catch (error) {
      if (error.name === "QuotaExceededError") {
        await this.evictSessionStorage();
        sessionStorage.setItem(`cache_${key}`, this.serializeItem(item));
      } else {
        throw error;
      }
    }
  }

  private async getSessionStorage<T>(
    key: string
  ): Promise<CacheItem<T> | null> {
    if (typeof Storage === "undefined") return null;

    try {
      const serialized = sessionStorage.getItem(`cache_${key}`);
      return serialized ? this.deserializeItem<T>(serialized) : null;
    } catch (error) {
      console.warn(
        `[MultiLevelCache] SessionStorage反序列化失败 ${key}:`,
        error
      );
      sessionStorage.removeItem(`cache_${key}`);
      return null;
    }
  }

  /**
   * LocalStorage操作
   */
  private async setLocalStorage<T>(
    key: string,
    item: CacheItem<T>
  ): Promise<void> {
    if (typeof Storage === "undefined") return;

    try {
      const serialized = this.serializeItem(item);
      localStorage.setItem(`cache_${key}`, serialized);
      this.updateStorageSize(CacheLevel.LOCAL);
    } catch (error) {
      if (error.name === "QuotaExceededError") {
        await this.evictLocalStorage();
        localStorage.setItem(`cache_${key}`, this.serializeItem(item));
      } else {
        throw error;
      }
    }
  }

  private async getLocalStorage<T>(key: string): Promise<CacheItem<T> | null> {
    if (typeof Storage === "undefined") return null;

    try {
      const serialized = localStorage.getItem(`cache_${key}`);
      return serialized ? this.deserializeItem<T>(serialized) : null;
    } catch (error) {
      console.warn(`[MultiLevelCache] LocalStorage反序列化失败 ${key}:`, error);
      localStorage.removeItem(`cache_${key}`);
      return null;
    }
  }

  /**
   * IndexedDB操作
   */
  private async setIndexedDB<T>(
    key: string,
    item: CacheItem<T>
  ): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["cache"], "readwrite");
      const store = tx.objectStore("cache");

      const request = store.put({
        key,
        ...item,
        data: this.serializeItem(item),
      });

      request.onsuccess = () => {
        this.updateStorageSize(CacheLevel.INDEXED_DB);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDB<T>(key: string): Promise<CacheItem<T> | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(["cache"], "readonly");
      const store = tx.objectStore("cache");
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          try {
            const item = this.deserializeItem<T>(request.result.data);
            resolve(item);
          } catch (error) {
            console.warn(
              `[MultiLevelCache] IndexedDB反序列化失败 ${key}:`,
              error
            );
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 工具方法
   */
  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return JSON.stringify(data).length * 2; // 粗略估算
    }
  }

  private isValidItem<T>(item: CacheItem<T>): boolean {
    const now = Date.now();
    return now - item.timestamp < item.ttl;
  }

  private serializeItem<T>(item: CacheItem<T>): string {
    if (this.config.enableCompression) {
      // 简单的压缩实现（生产环境应使用专业压缩库）
      const serialized = JSON.stringify(item);
      return btoa(serialized);
    }
    return JSON.stringify(item);
  }

  private deserializeItem<T>(serialized: string): CacheItem<T> {
    if (this.config.enableCompression) {
      const decompressed = atob(serialized);
      return JSON.parse(decompressed);
    }
    return JSON.parse(serialized);
  }

  private async promoteToHigherLevel<T>(
    key: string,
    item: CacheItem<T>,
    currentLevel: CacheLevel
  ): Promise<void> {
    // 将高频访问的项提升到更快的缓存层
    if (item.accessCount > 5) {
      switch (currentLevel) {
        case CacheLevel.INDEXED_DB:
          await this.setLocalStorage(key, item);
          break;
        case CacheLevel.LOCAL:
          await this.setSessionStorage(key, item);
          break;
        case CacheLevel.SESSION:
          await this.setMemoryCache(key, item);
          break;
      }
    }
  }

  private getMemoryCacheSize(): number {
    let size = 0;
    for (const item of this.memoryCache.values()) {
      size += item.size;
    }
    return size;
  }

  private async evictMemoryCache(neededSize: number): Promise<void> {
    // LRU淘汰策略
    const entries = Array.from(this.memoryCache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    let freedSize = 0;
    for (const [key, item] of entries) {
      this.memoryCache.delete(key);
      freedSize += item.size;
      this.metrics.evictions++;

      if (freedSize >= neededSize) break;
    }
  }

  private async evictSessionStorage(): Promise<void> {
    if (typeof Storage === "undefined") return;

    const keys = Object.keys(sessionStorage)
      .filter((k) => k.startsWith("cache_"))
      .slice(0, Math.floor(Object.keys(sessionStorage).length * 0.3)); // 清理30%

    keys.forEach((key) => {
      sessionStorage.removeItem(key);
      this.metrics.evictions++;
    });
  }

  private async evictLocalStorage(): Promise<void> {
    if (typeof Storage === "undefined") return;

    const keys = Object.keys(localStorage)
      .filter((k) => k.startsWith("cache_"))
      .slice(0, Math.floor(Object.keys(localStorage).length * 0.3)); // 清理30%

    keys.forEach((key) => {
      localStorage.removeItem(key);
      this.metrics.evictions++;
    });
  }

  private updateStorageSize(level: CacheLevel): void {
    // 更新存储大小统计（简化实现）
    this.metrics.sizeByLevel[level] = Date.now(); // 临时标记更新时间
  }

  private updateMetrics(startTime: number, success: boolean): void {
    if (!this.config.enableMetrics) return;

    const responseTime = performance.now() - startTime;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime + responseTime) / 2;
  }

  private resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      evictions: 0,
      errors: 0,
      averageResponseTime: 0,
      hitRateByLevel: {
        [CacheLevel.MEMORY]: 0,
        [CacheLevel.SESSION]: 0,
        [CacheLevel.LOCAL]: 0,
        [CacheLevel.INDEXED_DB]: 0,
      },
      sizeByLevel: {
        [CacheLevel.MEMORY]: 0,
        [CacheLevel.SESSION]: 0,
        [CacheLevel.LOCAL]: 0,
        [CacheLevel.INDEXED_DB]: 0,
      },
    };
  }

  private startCleanupInterval(): void {
    // 每10分钟清理过期项
    setInterval(
      async () => {
        await this.cleanupExpiredItems();
      },
      10 * 60 * 1000
    );
  }

  private async cleanupExpiredItems(): Promise<void> {
    const now = Date.now();

    // 清理内存缓存
    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key);
      }
    }

    // 清理其他存储（简化实现）
    // 生产环境应该更精确地清理localStorage和IndexedDB
  }

  /**
   * 获取缓存统计信息
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取缓存命中率
   */
  getHitRate(): number {
    return this.metrics.totalRequests > 0
      ? (this.metrics.hits / this.metrics.totalRequests) * 100
      : 0;
  }
}

// 全局多层缓存实例
export const multiLevelCache = new MultiLevelCache();

// 缓存装饰器
export function Cacheable(
  ttl: number = 30 * 60 * 1000,
  level: CacheLevel = CacheLevel.MEMORY
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}_${propertyName}_${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cached = await multiLevelCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 执行原方法
      const result = await method.apply(this, args);

      // 缓存结果
      await multiLevelCache.set(cacheKey, result, ttl, level);

      return result;
    };

    return descriptor;
  };
}
