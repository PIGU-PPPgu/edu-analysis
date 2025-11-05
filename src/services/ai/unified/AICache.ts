/**
 * 🗄️ AI缓存系统 - 优化AI服务性能
 * 提供多级缓存策略，减少重复AI请求，提升响应速度
 */

import { UnifiedAIRequest, UnifiedAIResponse } from "./AIGateway";
import { logInfo, logError } from "../../../utils/logger";

/**
 * 缓存配置
 */
interface CacheConfig {
  maxSize: number;
  ttl: number; // 生存时间(毫秒)
  enableAnalysisCache: boolean;
  enableChatCache: boolean;
  enableImageCache: boolean;
}

/**
 * 缓存项
 */
interface CacheItem {
  key: string;
  value: UnifiedAIResponse;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * 缓存统计
 */
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  hitRate: number;
  averageResponseTime: number;
}

/**
 * AI缓存管理器
 */
export class AICache {
  private cache = new Map<string, CacheItem>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    hitRate: 0,
    averageResponseTime: 0,
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 1000,
      ttl: 30 * 60 * 1000, // 30分钟
      enableAnalysisCache: true,
      enableChatCache: false, // 聊天不缓存，保持实时性
      enableImageCache: true,
      ...config,
    };

    // 定期清理过期缓存
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // 每5分钟清理一次
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(request: UnifiedAIRequest): string {
    const keyData = {
      content: request.content.slice(0, 500), // 限制内容长度
      requestType: request.requestType,
      subject: request.context?.subject,
      temperature: request.options?.temperature,
      maxTokens: request.options?.maxTokens,
    };

    // 使用简单的哈希函数
    const str = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }

    return `ai_cache_${Math.abs(hash).toString(16)}`;
  }

  /**
   * 检查是否应该缓存此类型的请求
   */
  private shouldCache(requestType: string): boolean {
    switch (requestType) {
      case "analysis":
      case "homework_analysis":
      case "grade_analysis":
        return this.config.enableAnalysisCache;
      case "image_analysis":
        return this.config.enableImageCache;
      case "chat":
        return this.config.enableChatCache;
      default:
        return false;
    }
  }

  /**
   * 获取缓存
   */
  get(request: UnifiedAIRequest): UnifiedAIResponse | null {
    this.stats.totalRequests++;

    if (!this.shouldCache(request.requestType)) {
      this.stats.misses++;
      return null;
    }

    const key = this.generateCacheKey(request);
    const item = this.cache.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = now;
    this.stats.hits++;

    logInfo("AI缓存命中", {
      key,
      requestType: request.requestType,
      accessCount: item.accessCount,
    });

    return {
      ...item.value,
      metadata: {
        ...item.value.metadata,
        cached: true,
        cacheHit: true,
      },
    };
  }

  /**
   * 设置缓存
   */
  set(
    request: UnifiedAIRequest,
    response: UnifiedAIResponse,
    customTtl?: number
  ): void {
    if (!this.shouldCache(request.requestType)) {
      return;
    }

    const key = this.generateCacheKey(request);
    const now = Date.now();
    const ttl = customTtl || this.config.ttl;

    // 检查缓存大小，如果超出限制则清理
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    const item: CacheItem = {
      key,
      value: response,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, item);

    logInfo("AI缓存设置", {
      key,
      requestType: request.requestType,
      ttl,
      cacheSize: this.cache.size,
    });
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logInfo("AI缓存清理完成", {
        cleanedCount,
        remainingSize: this.cache.size,
      });
    }
  }

  /**
   * 驱逐最少使用的缓存项
   */
  private evictLeastUsed(): void {
    let leastUsedKey = "";
    let leastUsedCount = Infinity;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (
        item.accessCount < leastUsedCount ||
        (item.accessCount === leastUsedCount && item.lastAccessed < oldestTime)
      ) {
        leastUsedKey = key;
        leastUsedCount = item.accessCount;
        oldestTime = item.lastAccessed;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.stats.evictions++;

      logInfo("AI缓存驱逐", {
        evictedKey: leastUsedKey,
        accessCount: leastUsedCount,
        cacheSize: this.cache.size,
      });
    }
  }

  /**
   * 清空特定类型的缓存
   */
  clearByType(requestType: string): void {
    let clearCount = 0;

    for (const [key, item] of this.cache.entries()) {
      // 从缓存值中推断请求类型
      if (key.includes(requestType)) {
        this.cache.delete(key);
        clearCount++;
      }
    }

    logInfo("AI缓存类型清理", {
      requestType,
      clearCount,
      remainingSize: this.cache.size,
    });
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();

    logInfo("AI缓存全部清理", {
      clearedCount: size,
    });
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const hitRate =
      this.stats.totalRequests > 0
        ? (this.stats.hits / this.stats.totalRequests) * 100
        : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * 获取缓存信息
   */
  getInfo(): {
    config: CacheConfig;
    stats: CacheStats;
    size: number;
    items: Array<{
      key: string;
      timestamp: number;
      accessCount: number;
      ttl: number;
    }>;
  } {
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      timestamp: item.timestamp,
      accessCount: item.accessCount,
      ttl: item.ttl,
    }));

    return {
      config: this.config,
      stats: this.getStats(),
      size: this.cache.size,
      items,
    };
  }

  /**
   * 预热缓存 - 为常见请求预先加载响应
   */
  async warmup(commonRequests: UnifiedAIRequest[]): Promise<void> {
    logInfo("AI缓存预热开始", {
      requestCount: commonRequests.length,
    });

    // 这里可以添加预热逻辑
    // 比如为常见的分析请求预先生成响应
    for (const request of commonRequests) {
      const key = this.generateCacheKey(request);
      // 可以从历史数据或模板中加载常见响应
    }

    logInfo("AI缓存预热完成");
  }

  /**
   * 获取缓存性能报告
   */
  getPerformanceReport(): {
    efficiency: string;
    recommendations: string[];
    metrics: {
      hitRate: number;
      cacheSize: number;
      memoryUsage: string;
    };
  } {
    const stats = this.getStats();
    const recommendations: string[] = [];

    if (stats.hitRate < 30) {
      recommendations.push("缓存命中率较低，考虑调整缓存策略或增加TTL");
    }

    if (this.cache.size > this.config.maxSize * 0.9) {
      recommendations.push("缓存接近容量上限，考虑增加最大缓存大小");
    }

    if (stats.evictions / stats.totalRequests > 0.1) {
      recommendations.push("缓存驱逐率较高，考虑优化驱逐策略");
    }

    const efficiency =
      stats.hitRate > 60 ? "优秀" : stats.hitRate > 30 ? "良好" : "需要优化";

    return {
      efficiency,
      recommendations,
      metrics: {
        hitRate: stats.hitRate,
        cacheSize: this.cache.size,
        memoryUsage: `${Math.round(JSON.stringify(Array.from(this.cache.values())).length / 1024)}KB`,
      },
    };
  }
}

// 全局缓存实例
export const aiCache = new AICache({
  maxSize: 500,
  ttl: 20 * 60 * 1000, // 20分钟
  enableAnalysisCache: true,
  enableChatCache: false,
  enableImageCache: true,
});

// 导出缓存管理功能
export const cacheManager = {
  /**
   * 获取缓存统计
   */
  getStats: () => aiCache.getStats(),

  /**
   * 清理缓存
   */
  clear: (type?: string) => {
    if (type) {
      aiCache.clearByType(type);
    } else {
      aiCache.clear();
    }
  },

  /**
   * 获取性能报告
   */
  getReport: () => aiCache.getPerformanceReport(),

  /**
   * 获取详细信息
   */
  getInfo: () => aiCache.getInfo(),
};
