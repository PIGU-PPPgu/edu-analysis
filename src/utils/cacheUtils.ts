/**
 * 简单的内存缓存实现
 * 用于缓存API请求结果，减少重复请求
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
}

class RequestCache {
  private cache: { [key: string]: CacheItem<any> } = {};
  private debug: boolean = false;

  // 设置debug模式
  public setDebug(debug: boolean): void {
    this.debug = debug;
  }

  /**
   * 从缓存获取数据，如果不存在或已过期则调用fetchFunction获取
   * @param key 缓存键
   * @param fetchFunction 获取数据的函数
   * @param ttl 缓存有效期（毫秒），默认5分钟
   */
  async get<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlMs: number = 60 * 1000
  ): Promise<T> {
    const now = Date.now();

    if (this.debug) {
      console.log(`[Cache] 请求键: ${key}`);
    }

    // 检查缓存是否存在且有效
    if (this.cache[key] && this.cache[key].expiry > now) {
      if (this.debug) {
        console.log(
          `[Cache] 命中: ${key}，过期于 ${new Date(this.cache[key].expiry)}`
        );
      }
      return this.cache[key].value;
    }

    if (this.debug) {
      console.log(`[Cache] 未命中: ${key}，获取新数据`);
    }

    // 获取新数据
    try {
      const data = await fetchFunction();
      // 存储到缓存
      this.cache[key] = {
        value: data,
        expiry: now + ttlMs,
      };

      if (this.debug) {
        console.log(
          `[Cache] 已缓存: ${key}，过期于 ${new Date(this.cache[key].expiry)}`
        );
      }

      return data;
    } catch (error) {
      console.error(`[Cache] 获取数据失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 强制更新缓存数据
   * @param key 缓存键
   * @param fetchFunction 获取数据的函数
   * @param ttl 缓存有效期（毫秒），默认5分钟
   */
  async update<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlMs: number = 60 * 1000
  ): Promise<T> {
    if (this.debug) {
      console.log(`[Cache] 强制更新: ${key}`);
    }

    try {
      const data = await fetchFunction();
      // 更新缓存
      this.cache[key] = {
        value: data,
        expiry: Date.now() + ttlMs,
      };

      if (this.debug) {
        console.log(
          `[Cache] 已更新: ${key}，过期于 ${new Date(this.cache[key].expiry)}`
        );
      }

      return data;
    } catch (error) {
      console.error(`[Cache] 更新数据失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param value 新数据
   * @param ttl 缓存有效期（毫秒），默认5分钟
   */
  set<T>(key: string, value: T, ttlMs: number = 60 * 1000): void {
    this.cache[key] = {
      value,
      expiry: Date.now() + ttlMs,
    };

    if (this.debug) {
      console.log(
        `[Cache] 已手动设置: ${key}，过期于 ${new Date(this.cache[key].expiry)}`
      );
    }
  }

  /**
   * 检查缓存是否存在且有效
   * @param key 缓存键
   */
  has(key: string): boolean {
    const now = Date.now();
    return !!this.cache[key] && this.cache[key].expiry > now;
  }

  /**
   * 删除缓存
   * @param key 缓存键或前缀
   * @param isPrefix 是否作为前缀匹配删除多个缓存项
   */
  invalidate(key: string, isPrefix = false): void {
    if (isPrefix) {
      // 删除所有以key开头的缓存
      const keysToDelete: string[] = [];
      for (const k in this.cache) {
        if (k.startsWith(key)) {
          keysToDelete.push(k);
        }
      }

      keysToDelete.forEach((k) => delete this.cache[k]);
      console.log(
        `[缓存] 删除前缀为 ${key} 的缓存，共 ${keysToDelete.length} 项`
      );
    } else {
      // 删除单个缓存
      delete this.cache[key];
      console.log(`[缓存] 删除缓存: ${key}`);
    }
  }

  /**
   * 清空整个缓存
   */
  clear(): void {
    this.cache = {};
    console.log("[缓存] 清空所有缓存");
  }

  /**
   * 强制刷新页面
   */
  refreshPage(): void {
    this.clear();
    if (this.debug) {
      console.log(`[Cache] 刷新页面并清除所有缓存`);
    }
    window.location.reload();
  }

  /**
   * 强制刷新特定键的数据并刷新页面
   * @param key 缓存键
   * @param fetchFunction 获取数据的函数
   */
  async refreshKeyAndPage(
    key: string,
    fetchFunction: () => Promise<any>
  ): Promise<void> {
    try {
      // 先清除特定键缓存
      this.invalidate(key);

      // 如果提供了获取函数，先预热缓存
      if (fetchFunction) {
        await fetchFunction();
      }

      // 然后刷新页面
      if (this.debug) {
        console.log(`[Cache] 刷新页面并清除键: ${key}`);
      }
      window.location.reload();
    } catch (error) {
      console.error(`[Cache] 刷新键和页面失败: ${key}`, error);
      // 即使失败也刷新页面
      window.location.reload();
    }
  }
}

// 创建一个单例
export const requestCache = new RequestCache();

// 开发环境开启调试
if (import.meta.env.DEV) {
  requestCache.setDebug(true);
}
