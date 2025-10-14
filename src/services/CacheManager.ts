/**
 * CacheManager - 智能缓存管理器
 *
 * 功能:
 * - 双层缓存(内存 + LocalStorage)
 * - TTL过期管理
 * - LRU淘汰策略
 * - 自动序列化/反序列化
 *
 * Week 6 Day 9-10: 解决Problem 4.3缓存缺失问题
 */

/**
 * 缓存条目
 */
interface CacheEntry<T = any> {
  key: string;
  value: T;
  expireAt: number; // 过期时间戳
  lastAccess: number; // 最后访问时间(用于LRU)
  size: number; // 数据大小(字节)
}

/**
 * 缓存配置
 */
interface CacheOptions {
  /** 过期时间(秒), 0表示永久 */
  ttl?: number;
  /** 是否持久化到LocalStorage */
  persistent?: boolean;
  /** 强制刷新 */
  forceRefresh?: boolean;
}

/**
 * 缓存统计信息
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
}

/**
 * CacheManager类
 */
export class CacheManager {
  private memoryCache: Map<string, CacheEntry>;
  private stats: CacheStats;
  private readonly MAX_MEMORY_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly STORAGE_PREFIX = "cache_";

  constructor() {
    this.memoryCache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
    };

    // 启动时从LocalStorage加载持久化缓存
    this.loadFromStorage();

    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 60000); // 每分钟
  }

  /**
   * 获取缓存
   */
  get<T>(key: string): T | null {
    // 1. 检查内存缓存
    const entry = this.memoryCache.get(key);
    if (entry) {
      // 检查是否过期
      if (entry.expireAt > 0 && entry.expireAt < Date.now()) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // 更新访问时间(LRU)
      entry.lastAccess = Date.now();
      this.stats.hits++;
      return entry.value as T;
    }

    // 2. 检查LocalStorage
    const stored = this.getFromStorage<T>(key);
    if (stored) {
      // 加载到内存
      this.memoryCache.set(key, stored);
      this.stats.totalSize += stored.size;
      this.stats.hits++;
      return stored.value;
    }

    this.stats.misses++;
    return null;
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const { ttl = 0, persistent = false } = options;

    const size = this.calculateSize(value);
    const entry: CacheEntry<T> = {
      key,
      value,
      expireAt: ttl > 0 ? Date.now() + ttl * 1000 : 0,
      lastAccess: Date.now(),
      size,
    };

    // 检查内存容量,必要时淘汰
    if (this.stats.totalSize + size > this.MAX_MEMORY_SIZE) {
      this.evictLRU(size);
    }

    // 存入内存
    this.memoryCache.set(key, entry);
    this.stats.totalSize += size;
    this.stats.entryCount++;

    // 持久化到LocalStorage
    if (persistent) {
      this.saveToStorage(entry);
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const entry = this.memoryCache.get(key);
    if (entry) {
      this.memoryCache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
    }

    // 同时删除LocalStorage
    try {
      localStorage.removeItem(this.STORAGE_PREFIX + key);
    } catch (e) {
      console.warn("[Cache] LocalStorage删除失败:", e);
    }

    return !!entry;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats.totalSize = 0;
    this.stats.entryCount = 0;

    // 清空LocalStorage中的缓存
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith(this.STORAGE_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn("[Cache] LocalStorage清空失败:", e);
    }
  }

  /**
   * 按模式清除缓存
   * @param pattern 正则表达式模式
   * @returns 删除的条目数量
   */
  clearByPattern(pattern: RegExp): number {
    let deletedCount = 0;
    const keysToDelete: string[] = [];

    // 收集需要删除的键
    this.memoryCache.forEach((entry, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    });

    // 删除匹配的键
    keysToDelete.forEach((key) => {
      this.delete(key);
      deletedCount++;
    });

    console.log(`[Cache] 按模式清除了${deletedCount}个缓存条目`);
    return deletedCount;
  }

  /**
   * 获取所有缓存键
   * @returns 缓存键数组
   */
  keys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * 获取或设置缓存(便捷方法)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // 强制刷新
    if (options.forceRefresh) {
      this.delete(key);
    }

    // 尝试获取缓存
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中,执行fetcher
    const value = await fetcher();
    this.set(key, value, options);
    return value;
  }

  /**
   * 获取统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (entry.expireAt > 0 && entry.expireAt < now) {
        toDelete.push(key);
      }
    });

    toDelete.forEach((key) => this.delete(key));

    if (toDelete.length > 0) {
      console.log(`[Cache] 清理了${toDelete.length}个过期缓存`);
    }
  }

  /**
   * LRU淘汰
   */
  private evictLRU(requiredSize: number): void {
    const entries = Array.from(this.memoryCache.entries());

    // 按lastAccess排序(最久未使用在前)
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    let freedSize = 0;
    for (const [key, entry] of entries) {
      this.delete(key);
      freedSize += entry.size;
      this.stats.evictions++;

      if (freedSize >= requiredSize) {
        break;
      }
    }

    console.log(
      `[Cache] LRU淘汰了${this.stats.evictions}个条目,释放${freedSize}字节`
    );
  }

  /**
   * 计算数据大小(粗略估计)
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16编码
    } catch {
      return 1000; // 默认1KB
    }
  }

  /**
   * 从LocalStorage加载
   */
  private loadFromStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((k) => {
        if (k.startsWith(this.STORAGE_PREFIX)) {
          const rawKey = k.replace(this.STORAGE_PREFIX, "");
          const entry = this.getFromStorage(rawKey);
          if (entry) {
            this.memoryCache.set(rawKey, entry);
            this.stats.totalSize += entry.size;
            this.stats.entryCount++;
          }
        }
      });
      console.log(`[Cache] 从LocalStorage加载了${this.stats.entryCount}个缓存`);
    } catch (e) {
      console.warn("[Cache] LocalStorage加载失败:", e);
    }
  }

  /**
   * 从LocalStorage获取单个条目
   */
  private getFromStorage<T>(key: string): CacheEntry<T> | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      // 检查是否过期
      if (entry.expireAt > 0 && entry.expireAt < Date.now()) {
        localStorage.removeItem(this.STORAGE_PREFIX + key);
        return null;
      }

      return entry;
    } catch (e) {
      console.warn("[Cache] LocalStorage读取失败:", key, e);
      return null;
    }
  }

  /**
   * 保存到LocalStorage
   */
  private saveToStorage(entry: CacheEntry): void {
    try {
      const serialized = JSON.stringify(entry);
      localStorage.setItem(this.STORAGE_PREFIX + entry.key, serialized);
    } catch (e) {
      console.warn("[Cache] LocalStorage保存失败:", entry.key, e);
    }
  }
}

/**
 * 全局单例
 */
export const cacheManager = new CacheManager();

/**
 * 预定义的缓存键
 */
export const CacheKeys = {
  // 静态数据(长期)
  STUDENTS_LIST: "students_list",
  CLASSES_LIST: "classes_list",
  SUBJECTS_LIST: "subjects_list",
  TEACHERS_LIST: "teachers_list",

  // 会话数据(永久)
  FIELD_MAPPING_HISTORY: "field_mapping_history",
  IMPORT_CONFIG_PREFERENCE: "import_config_preference",

  // 查询结果(短期)
  examQuery: (title: string, type: string, date: string) =>
    `exam_query_${title}_${type}_${date}`,
  gradeDuplicate: (examId: string, studentId: string) =>
    `grade_duplicate_${examId}_${studentId}`,
} as const;

/**
 * 预定义的TTL(秒)
 */
export const CacheTTL = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
  THREE_MONTHS: 7776000,
  FOREVER: 0,
} as const;
