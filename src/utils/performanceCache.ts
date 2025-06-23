/**
 * 分层缓存系统
 * 针对预警分析系统的性能优化，提供不同数据类型的专门缓存策略
 */

import { requestCache } from './cacheUtils';

// 缓存层级定义
export enum CacheLayer {
  // L1: 快速访问缓存 (30秒-2分钟)
  IMMEDIATE = 'immediate',
  // L2: 短期缓存 (5-15分钟)
  SHORT_TERM = 'short_term', 
  // L3: 中期缓存 (30分钟-2小时)
  MEDIUM_TERM = 'medium_term',
  // L4: 长期缓存 (4小时-24小时)
  LONG_TERM = 'long_term',
  // L5: 静态缓存 (24小时+)
  STATIC = 'static'
}

// 缓存数据类型
export enum CacheDataType {
  // 预警统计数据
  WARNING_STATS = 'warning_stats',
  // 考试数据
  EXAM_DATA = 'exam_data',
  // 学生数据
  STUDENT_DATA = 'student_data',
  // 历史对比数据
  HISTORY_COMPARISON = 'history_comparison',
  // 趋势数据
  TREND_DATA = 'trend_data',
  // AI分析结果
  AI_ANALYSIS = 'ai_analysis',
  // 规则数据
  RULE_DATA = 'rule_data',
  // 班级数据
  CLASS_DATA = 'class_data'
}

// 缓存配置
interface CacheConfig {
  layer: CacheLayer;
  ttlMs: number;
  maxSize?: number;
  compression?: boolean;
  priority?: number;
}

// 缓存策略配置
const CACHE_STRATEGIES: Record<CacheDataType, CacheConfig> = {
  [CacheDataType.WARNING_STATS]: {
    layer: CacheLayer.SHORT_TERM,
    ttlMs: 5 * 60 * 1000, // 5分钟
    maxSize: 100,
    priority: 9
  },
  [CacheDataType.EXAM_DATA]: {
    layer: CacheLayer.MEDIUM_TERM,
    ttlMs: 30 * 60 * 1000, // 30分钟
    maxSize: 200,
    priority: 8
  },
  [CacheDataType.STUDENT_DATA]: {
    layer: CacheLayer.LONG_TERM,
    ttlMs: 2 * 60 * 60 * 1000, // 2小时
    maxSize: 500,
    priority: 7
  },
  [CacheDataType.HISTORY_COMPARISON]: {
    layer: CacheLayer.MEDIUM_TERM,
    ttlMs: 60 * 60 * 1000, // 1小时
    maxSize: 50,
    priority: 6
  },
  [CacheDataType.TREND_DATA]: {
    layer: CacheLayer.MEDIUM_TERM,
    ttlMs: 45 * 60 * 1000, // 45分钟
    maxSize: 80,
    priority: 6
  },
  [CacheDataType.AI_ANALYSIS]: {
    layer: CacheLayer.LONG_TERM,
    ttlMs: 4 * 60 * 60 * 1000, // 4小时
    maxSize: 30,
    priority: 5,
    compression: true
  },
  [CacheDataType.RULE_DATA]: {
    layer: CacheLayer.STATIC,
    ttlMs: 24 * 60 * 60 * 1000, // 24小时
    maxSize: 200,
    priority: 10
  },
  [CacheDataType.CLASS_DATA]: {
    layer: CacheLayer.LONG_TERM,
    ttlMs: 6 * 60 * 60 * 1000, // 6小时
    maxSize: 100,
    priority: 8
  }
};

// 缓存键生成器
export class CacheKeyGenerator {
  static forWarningStats(filters?: any): string {
    const baseKey = 'warning_stats';
    if (!filters) return baseKey;
    const filterStr = JSON.stringify(filters);
    return `${baseKey}_${btoa(filterStr).replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  static forExamData(examId?: string, filters?: any): string {
    const baseKey = 'exam_data';
    const parts = [baseKey];
    if (examId) parts.push(examId);
    if (filters) parts.push(btoa(JSON.stringify(filters)).replace(/[^a-zA-Z0-9]/g, '_'));
    return parts.join('_');
  }

  static forHistoryComparison(timeRange: string, filters?: any): string {
    const baseKey = 'history_comparison';
    const parts = [baseKey, timeRange];
    if (filters) parts.push(btoa(JSON.stringify(filters)).replace(/[^a-zA-Z0-9]/g, '_'));
    return parts.join('_');
  }

  static forAIAnalysis(type: string, dataHash: string): string {
    return `ai_analysis_${type}_${dataHash}`;
  }

  static forStudentData(studentId?: string, classId?: string): string {
    const parts = ['student_data'];
    if (studentId) parts.push(studentId);
    if (classId) parts.push(`class_${classId}`);
    return parts.join('_');
  }
}

// 性能缓存管理器
export class PerformanceCacheManager {
  private static instance: PerformanceCacheManager;
  private hitCounts = new Map<string, number>();
  private missCounts = new Map<string, number>();

  static getInstance(): PerformanceCacheManager {
    if (!this.instance) {
      this.instance = new PerformanceCacheManager();
    }
    return this.instance;
  }

  // 智能缓存包装器
  async withCache<T>(
    key: string,
    dataType: CacheDataType,
    fetcher: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const config = CACHE_STRATEGIES[dataType];
    const cacheKey = `${config.layer}_${key}`;
    
    // 尝试从缓存获取
    if (requestCache.has(cacheKey)) {
      this.recordHit(cacheKey);
      // requestCache.get是异步方法，需要使用无操作的异步函数包装
      return await requestCache.get<T>(cacheKey, async () => {
        throw new Error('Should not be called');
      });
    }

    // 缓存未命中，执行请求
    this.recordMiss(cacheKey);
    
    try {
      // 使用requestCache.get的异步特性
      return await requestCache.get<T>(cacheKey, fetcher, customTtl || config.ttlMs);
    } catch (error) {
      console.error(`Cache fetch error for key ${cacheKey}:`, error);
      throw error;
    }
  }

  // 预加载缓存
  async preload<T>(
    key: string,
    dataType: CacheDataType,
    fetcher: () => Promise<T>
  ): Promise<void> {
    const config = CACHE_STRATEGIES[dataType];
    const cacheKey = `${config.layer}_${key}`;
    
    if (!requestCache.has(cacheKey)) {
      try {
        await requestCache.get<T>(cacheKey, fetcher, config.ttlMs);
      } catch (error) {
        console.warn(`Preload failed for key ${cacheKey}:`, error);
      }
    }
  }

  // 批量预加载
  async batchPreload(preloadTasks: Array<{
    key: string;
    dataType: CacheDataType;
    fetcher: () => Promise<any>;
  }>): Promise<void> {
    const promises = preloadTasks.map(task => 
      this.preload(task.key, task.dataType, task.fetcher)
    );
    
    await Promise.allSettled(promises);
  }

  // 缓存失效
  invalidate(pattern: string): void {
    requestCache.invalidate(pattern, true);
  }

  // 批量失效
  invalidateByType(dataType: CacheDataType): void {
    const config = CACHE_STRATEGIES[dataType];
    this.invalidate(`${config.layer}_*`);
  }

  // 记录缓存命中
  private recordHit(key: string): void {
    this.hitCounts.set(key, (this.hitCounts.get(key) || 0) + 1);
  }

  // 记录缓存未命中
  private recordMiss(key: string): void {
    this.missCounts.set(key, (this.missCounts.get(key) || 0) + 1);
  }

  // 获取缓存统计
  getStats(): {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    topKeys: Array<{ key: string; hits: number; misses: number; ratio: number }>;
  } {
    const totalHits = Array.from(this.hitCounts.values()).reduce((a, b) => a + b, 0);
    const totalMisses = Array.from(this.missCounts.values()).reduce((a, b) => a + b, 0);
    const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    // 计算每个键的统计
    const allKeys = new Set([...this.hitCounts.keys(), ...this.missCounts.keys()]);
    const topKeys = Array.from(allKeys)
      .map(key => ({
        key,
        hits: this.hitCounts.get(key) || 0,
        misses: this.missCounts.get(key) || 0,
        ratio: ((this.hitCounts.get(key) || 0) / 
               ((this.hitCounts.get(key) || 0) + (this.missCounts.get(key) || 0))) || 0
      }))
      .sort((a, b) => (b.hits + b.misses) - (a.hits + a.misses))
      .slice(0, 10);

    return {
      hitRate,
      totalHits,
      totalMisses,
      topKeys
    };
  }

  // 清理低优先级缓存
  cleanup(): void {
    // 基于优先级和使用频率清理缓存
    Object.entries(CACHE_STRATEGIES).forEach(([dataType, config]) => {
      if (config.priority < 6) {
        this.invalidateByType(dataType as CacheDataType);
      }
    });
  }
}

// 预警分析专用缓存包装器
export class WarningAnalysisCache {
  private cacheManager = PerformanceCacheManager.getInstance();

  // 预警统计缓存
  async getWarningStats<T>(
    fetcher: () => Promise<T>,
    filters?: any
  ): Promise<T> {
    const key = CacheKeyGenerator.forWarningStats(filters);
    return this.cacheManager.withCache(key, CacheDataType.WARNING_STATS, fetcher);
  }

  // 考试数据缓存
  async getExamData<T>(
    fetcher: () => Promise<T>,
    examId?: string,
    filters?: any
  ): Promise<T> {
    const key = CacheKeyGenerator.forExamData(examId, filters);
    return this.cacheManager.withCache(key, CacheDataType.EXAM_DATA, fetcher);
  }

  // 历史对比缓存
  async getHistoryComparison<T>(
    fetcher: () => Promise<T>,
    timeRange: string,
    filters?: any
  ): Promise<T> {
    const key = CacheKeyGenerator.forHistoryComparison(timeRange, filters);
    return this.cacheManager.withCache(key, CacheDataType.HISTORY_COMPARISON, fetcher);
  }

  // AI分析结果缓存
  async getAIAnalysis<T>(
    fetcher: () => Promise<T>,
    analysisType: string,
    dataHash: string
  ): Promise<T> {
    const key = CacheKeyGenerator.forAIAnalysis(analysisType, dataHash);
    return this.cacheManager.withCache(
      key, 
      CacheDataType.AI_ANALYSIS, 
      fetcher,
      4 * 60 * 60 * 1000 // 4小时缓存
    );
  }

  // 学生数据缓存
  async getStudentData<T>(
    fetcher: () => Promise<T>,
    studentId?: string,
    classId?: string
  ): Promise<T> {
    const key = CacheKeyGenerator.forStudentData(studentId, classId);
    return this.cacheManager.withCache(key, CacheDataType.STUDENT_DATA, fetcher);
  }

  // 规则数据缓存
  async getRuleData<T>(
    fetcher: () => Promise<T>,
    ruleType?: string
  ): Promise<T> {
    const key = `rule_data${ruleType ? `_${ruleType}` : ''}`;
    return this.cacheManager.withCache(key, CacheDataType.RULE_DATA, fetcher);
  }

  // 预加载常用数据
  async preloadCommonData(): Promise<void> {
    const preloadTasks = [
      // 预加载预警统计
      {
        key: CacheKeyGenerator.forWarningStats(),
        dataType: CacheDataType.WARNING_STATS,
        fetcher: async () => {
          // 这里可以调用实际的数据获取函数
          return null;
        }
      },
      // 预加载最近考试数据
      {
        key: CacheKeyGenerator.forExamData(),
        dataType: CacheDataType.EXAM_DATA,
        fetcher: async () => {
          return null;
        }
      }
    ];

    await this.cacheManager.batchPreload(preloadTasks);
  }

  // 失效相关缓存
  invalidateWarningData(): void {
    this.cacheManager.invalidateByType(CacheDataType.WARNING_STATS);
    this.cacheManager.invalidateByType(CacheDataType.HISTORY_COMPARISON);
  }

  invalidateExamData(): void {
    this.cacheManager.invalidateByType(CacheDataType.EXAM_DATA);
  }

  invalidateStudentData(): void {
    this.cacheManager.invalidateByType(CacheDataType.STUDENT_DATA);
  }

  invalidateRuleData(): void {
    this.cacheManager.invalidateByType(CacheDataType.RULE_DATA);
  }
}

// 导出单例实例
export const warningAnalysisCache = new WarningAnalysisCache(); 