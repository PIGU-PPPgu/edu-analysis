/**
 * 简单的内存缓存实现
 * 用于缓存API请求结果，减少重复请求
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // 过期时间，单位毫秒
}

class RequestCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  /**
   * 从缓存获取数据，如果不存在或已过期则调用fetchFunction获取
   * @param key 缓存键
   * @param fetchFunction 获取数据的函数
   * @param ttl 缓存有效期（毫秒），默认5分钟
   */
  async get<T>(key: string, fetchFunction: () => Promise<T>, ttl = 5 * 60 * 1000): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);
    
    // 如果缓存存在且未过期
    if (cached && now - cached.timestamp < cached.ttl) {
      console.log(`[缓存] 使用缓存数据: ${key}`);
      return cached.data;
    }
    
    // 获取新数据
    console.log(`[缓存] 获取新数据: ${key}`);
    const data = await fetchFunction();
    
    // 存入缓存
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl
    });
    
    return data;
  }
  
  /**
   * 更新指定键的缓存
   * @param key 缓存键
   * @param data 新数据
   */
  update<T>(key: string, data: T): void {
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.set(key, {
        ...cached,
        data,
        timestamp: Date.now()
      });
      console.log(`[缓存] 更新缓存: ${key}`);
    }
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
      this.cache.forEach((_, k) => {
        if (k.startsWith(key)) {
          keysToDelete.push(k);
        }
      });
      
      keysToDelete.forEach(k => this.cache.delete(k));
      console.log(`[缓存] 删除前缀为 ${key} 的缓存，共 ${keysToDelete.length} 项`);
    } else {
      // 删除单个缓存
      this.cache.delete(key);
      console.log(`[缓存] 删除缓存: ${key}`);
    }
  }
  
  /**
   * 清空整个缓存
   */
  clear(): void {
    this.cache.clear();
    console.log('[缓存] 清空所有缓存');
  }
}

// 导出单例
export const requestCache = new RequestCache(); 