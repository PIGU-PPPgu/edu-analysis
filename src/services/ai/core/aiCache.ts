/**
 * 🧠 AI缓存管理器
 * 实现智能缓存、去重和批量处理优化
 */

import CryptoJS from 'crypto-js';

// 缓存条目接口
export interface CacheEntry {
  id: string;
  key: string;
  data: any;
  timestamp: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
  size: number;          // 数据大小 (bytes)
  tags: string[];        // 缓存标签
  metadata: {
    providerId: string;
    modelId: string;
    tokenCount: number;
    cost: number;
  };
}

// 缓存策略配置
export interface CachePolicy {
  name: string;
  ttl: number;              // 生存时间 (ms)
  maxSize: number;          // 最大大小 (bytes)
  maxEntries: number;       // 最大条目数
  evictionPolicy: 'LRU' | 'LFU' | 'FIFO' | 'TTL';
  keyGeneration: 'hash' | 'content' | 'semantic';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  invalidationRules: InvalidationRule[];
}

// 缓存失效规则
export interface InvalidationRule {
  name: string;
  trigger: 'time' | 'content-change' | 'tag-match' | 'manual';
  condition: any;
  action: 'delete' | 'refresh' | 'expire';
}

// 批量处理配置
export interface BatchConfig {
  maxBatchSize: number;     // 最大批次大小
  batchTimeout: number;     // 批次超时时间 (ms)
  similarityThreshold: number; // 相似度阈值 (0-1)
  enableDeduplication: boolean;
  enableParallelProcessing: boolean;
}

// 缓存统计信息
export interface CacheStatistics {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  avgAccessTime: number;
  compressionRatio: number;
  costSavings: number;      // 缓存节省的成本
  topKeys: Array<{
    key: string;
    hits: number;
    cost: number;
  }>;
  sizeDistribution: Array<{
    range: string;
    count: number;
  }>;
}

// 📋 预定义的缓存策略
export const DEFAULT_CACHE_POLICIES: CachePolicy[] = [
  {
    name: '快速响应策略',
    ttl: 5 * 60 * 1000,        // 5分钟
    maxSize: 10 * 1024 * 1024, // 10MB
    maxEntries: 1000,
    evictionPolicy: 'LRU',
    keyGeneration: 'hash',
    compressionEnabled: true,
    encryptionEnabled: false,
    invalidationRules: []
  },
  {
    name: '长期缓存策略',
    ttl: 24 * 60 * 60 * 1000,  // 24小时
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 5000,
    evictionPolicy: 'LFU',
    keyGeneration: 'semantic',
    compressionEnabled: true,
    encryptionEnabled: true,
    invalidationRules: []
  },
  {
    name: '开发模式策略',
    ttl: 60 * 1000,            // 1分钟
    maxSize: 5 * 1024 * 1024,  // 5MB
    maxEntries: 100,
    evictionPolicy: 'TTL',
    keyGeneration: 'content',
    compressionEnabled: false,
    encryptionEnabled: false,
    invalidationRules: []
  }
];

/**
 * AI缓存管理器类
 */
export class AICacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private accessLog: Array<{ key: string; timestamp: Date }> = [];
  private currentPolicy: CachePolicy = DEFAULT_CACHE_POLICIES[0];
  private batchConfig: BatchConfig = {
    maxBatchSize: 10,
    batchTimeout: 2000,
    similarityThreshold: 0.8,
    enableDeduplication: true,
    enableParallelProcessing: true
  };
  
  // 批量处理队列
  private batchQueue: Array<{
    request: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timestamp: Date;
  }> = [];
  
  private batchTimer: NodeJS.Timeout | null = null;
  
  // 存储键
  private readonly STORAGE_KEYS = {
    CACHE_DATA: 'ai_cache_data',
    CACHE_POLICY: 'ai_cache_policy',
    BATCH_CONFIG: 'ai_batch_config',
    ACCESS_LOG: 'ai_cache_access_log'
  };

  constructor() {
    this.loadFromStorage();
    this.startCleanupTimer();
  }

  /**
   * 🔍 获取缓存数据
   */
  async get(key: string, tags?: string[]): Promise<any> {
    const cacheKey = this.generateCacheKey(key);
    const entry = this.cache.get(cacheKey);
    
    // 缓存未命中
    if (!entry) {
      this.recordAccess(cacheKey, false);
      return null;
    }

    // 检查过期
    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      this.recordAccess(cacheKey, false);
      return null;
    }

    // 标签匹配检查
    if (tags && tags.length > 0) {
      const hasMatchingTag = tags.some(tag => entry.tags.includes(tag));
      if (!hasMatchingTag) {
        this.recordAccess(cacheKey, false);
        return null;
      }
    }

    // 缓存命中 - 更新访问信息
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.recordAccess(cacheKey, true);
    
    // 解压缩和解密
    let data = entry.data;
    if (this.currentPolicy.compressionEnabled && entry.metadata) {
      data = this.decompress(data);
    }
    if (this.currentPolicy.encryptionEnabled) {
      data = this.decrypt(data);
    }

    console.log(`🎯 缓存命中: ${key} (访问次数: ${entry.accessCount})`);
    return data;
  }

  /**
   * 💾 设置缓存数据
   */
  async set(
    key: string, 
    data: any, 
    options?: {
      ttl?: number;
      tags?: string[];
      metadata?: Partial<CacheEntry['metadata']>;
    }
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const ttl = options?.ttl || this.currentPolicy.ttl;
    const tags = options?.tags || [];
    
    // 准备数据
    let processedData = data;
    if (this.currentPolicy.encryptionEnabled) {
      processedData = this.encrypt(processedData);
    }
    if (this.currentPolicy.compressionEnabled) {
      processedData = this.compress(processedData);
    }

    const dataSize = this.calculateSize(processedData);
    
    // 检查容量限制
    if (dataSize > this.currentPolicy.maxSize) {
      console.warn(`⚠️ 数据过大，无法缓存: ${key} (${dataSize} bytes)`);
      return;
    }

    const entry: CacheEntry = {
      id: this.generateId(),
      key: cacheKey,
      data: processedData,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      accessCount: 0,
      lastAccessed: new Date(),
      size: dataSize,
      tags,
      metadata: {
        providerId: options?.metadata?.providerId || 'unknown',
        modelId: options?.metadata?.modelId || 'unknown',
        tokenCount: options?.metadata?.tokenCount || 0,
        cost: options?.metadata?.cost || 0
      }
    };

    // 容量管理
    await this.ensureCapacity(dataSize);
    
    this.cache.set(cacheKey, entry);
    this.saveToStorage();
    
    console.log(`💾 数据已缓存: ${key} (${dataSize} bytes, TTL: ${ttl}ms)`);
  }

  /**
   * 🗑️ 删除缓存数据
   */
  async delete(key: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(key);
    const deleted = this.cache.delete(cacheKey);
    
    if (deleted) {
      this.saveToStorage();
      console.log(`🗑️ 缓存已删除: ${key}`);
    }
    
    return deleted;
  }

  /**
   * 🧹 清空缓存
   */
  async clear(tags?: string[]): Promise<void> {
    if (tags && tags.length > 0) {
      // 按标签清空
      for (const [key, entry] of this.cache.entries()) {
        const hasMatchingTag = tags.some(tag => entry.tags.includes(tag));
        if (hasMatchingTag) {
          this.cache.delete(key);
        }
      }
    } else {
      // 全部清空
      this.cache.clear();
    }
    
    this.saveToStorage();
    console.log(`🧹 缓存已清空${tags ? ` (标签: ${tags.join(', ')})` : ''}`);
  }

  /**
   * 📦 批量处理请求
   */
  async batchProcess<T>(
    request: any,
    processor: (requests: any[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // 添加到批量队列
      this.batchQueue.push({
        request,
        resolve,
        reject,
        timestamp: new Date()
      });

      // 检查是否应该立即处理
      if (this.batchQueue.length >= this.batchConfig.maxBatchSize) {
        this.processBatch(processor);
      } else if (!this.batchTimer) {
        // 设置超时处理
        this.batchTimer = setTimeout(() => {
          this.processBatch(processor);
        }, this.batchConfig.batchTimeout);
      }
    });
  }

  /**
   * ⚡ 处理批量队列
   */
  private async processBatch<T>(processor: (requests: any[]) => Promise<T[]>): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.batchQueue.length === 0) return;

    const currentBatch = this.batchQueue.splice(0, this.batchConfig.maxBatchSize);
    
    try {
      // 去重处理
      const uniqueRequests = this.batchConfig.enableDeduplication 
        ? this.deduplicateRequests(currentBatch.map(item => item.request))
        : currentBatch.map(item => item.request);

      console.log(`📦 处理批量请求: ${currentBatch.length} -> ${uniqueRequests.length} (去重后)`);

      // 并行或串行处理
      const results = await processor(uniqueRequests);
      
      // 分发结果
      this.distributeResults(currentBatch, uniqueRequests, results);
      
    } catch (error) {
      // 错误处理
      currentBatch.forEach(item => item.reject(error));
      console.error('❌ 批量处理失败:', error);
    }
  }

  /**
   * 🔄 去重请求
   */
  private deduplicateRequests(requests: any[]): any[] {
    const uniqueRequests: any[] = [];
    const seen = new Set<string>();

    for (const request of requests) {
      const key = this.generateRequestKey(request);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRequests.push(request);
      }
    }

    return uniqueRequests;
  }

  /**
   * 📤 分发批量结果
   */
  private distributeResults<T>(
    batch: Array<{
      request: any;
      resolve: (value: T) => void;
      reject: (error: any) => void;
    }>,
    uniqueRequests: any[],
    results: T[]
  ): void {
    // 创建请求到结果的映射
    const resultMap = new Map<string, T>();
    uniqueRequests.forEach((request, index) => {
      const key = this.generateRequestKey(request);
      resultMap.set(key, results[index]);
    });

    // 分发结果
    batch.forEach(item => {
      const key = this.generateRequestKey(item.request);
      const result = resultMap.get(key);
      if (result !== undefined) {
        item.resolve(result);
      } else {
        item.reject(new Error('未找到对应结果'));
      }
    });
  }

  /**
   * 🔐 生成缓存键
   */
  private generateCacheKey(input: string): string {
    switch (this.currentPolicy.keyGeneration) {
      case 'hash':
        return CryptoJS.SHA256(input).toString();
      case 'content':
        return CryptoJS.MD5(input).toString();
      case 'semantic':
        // 简化的语义哈希 - 去除标点和空格，转小写
        const normalized = input.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        return CryptoJS.SHA256(normalized).toString();
      default:
        return input;
    }
  }

  /**
   * 🔑 生成请求键
   */
  private generateRequestKey(request: any): string {
    return CryptoJS.MD5(JSON.stringify(request)).toString();
  }

  /**
   * 📊 确保缓存容量
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    const currentSize = this.getCurrentSize();
    const currentEntries = this.cache.size;
    
    // 检查条目数限制
    if (currentEntries >= this.currentPolicy.maxEntries) {
      await this.evictEntries(1);
    }
    
    // 检查大小限制
    if (currentSize + requiredSize > this.currentPolicy.maxSize) {
      const sizeToFree = (currentSize + requiredSize) - this.currentPolicy.maxSize;
      await this.evictBySize(sizeToFree);
    }
  }

  /**
   * 🗑️ 驱逐缓存条目
   */
  private async evictEntries(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    let toEvict: string[] = [];

    switch (this.currentPolicy.evictionPolicy) {
      case 'LRU': // 最近最少使用
        toEvict = entries
          .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime())
          .slice(0, count)
          .map(entry => entry[0]);
        break;
        
      case 'LFU': // 最少使用频率
        toEvict = entries
          .sort((a, b) => a[1].accessCount - b[1].accessCount)
          .slice(0, count)
          .map(entry => entry[0]);
        break;
        
      case 'FIFO': // 先进先出
        toEvict = entries
          .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())
          .slice(0, count)
          .map(entry => entry[0]);
        break;
        
      case 'TTL': // 最快过期
        toEvict = entries
          .sort((a, b) => a[1].expiresAt.getTime() - b[1].expiresAt.getTime())
          .slice(0, count)
          .map(entry => entry[0]);
        break;
    }

    toEvict.forEach(key => this.cache.delete(key));
    console.log(`🗑️ 驱逐了 ${toEvict.length} 个缓存条目`);
  }

  /**
   * 📏 按大小驱逐
   */
  private async evictBySize(targetSize: number): Promise<void> {
    let freedSize = 0;
    const entries = Array.from(this.cache.entries());
    
    // 按访问时间排序，优先删除最久未访问的
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
    
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      freedSize += entry.size;
      
      if (freedSize >= targetSize) {
        break;
      }
    }
    
    console.log(`🗑️ 释放了 ${freedSize} bytes 空间`);
  }

  /**
   * 📊 获取缓存统计
   */
  getStatistics(): CacheStatistics {
    const entries = Array.from(this.cache.values());
    const totalEntries = entries.length;
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    
    // 计算命中率
    const recentAccess = this.accessLog.filter(log => 
      log.timestamp > new Date(Date.now() - 60 * 60 * 1000) // 最近1小时
    );
    const hits = recentAccess.filter(log => this.cache.has(log.key)).length;
    const hitRate = recentAccess.length > 0 ? (hits / recentAccess.length) * 100 : 0;
    
    // 计算成本节省
    const costSavings = entries.reduce((sum, entry) => sum + (entry.metadata.cost * entry.accessCount), 0);
    
    // 热门键
    const topKeys = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({
        key: entry.key.substring(0, 20) + '...',
        hits: entry.accessCount,
        cost: entry.metadata.cost * entry.accessCount
      }));

    // 大小分布
    const sizeRanges = [
      { range: '< 1KB', min: 0, max: 1024 },
      { range: '1KB - 10KB', min: 1024, max: 10240 },
      { range: '10KB - 100KB', min: 10240, max: 102400 },
      { range: '> 100KB', min: 102400, max: Infinity }
    ];
    
    const sizeDistribution = sizeRanges.map(range => ({
      range: range.range,
      count: entries.filter(entry => entry.size >= range.min && entry.size < range.max).length
    }));

    return {
      totalEntries,
      totalSize,
      hitRate,
      missRate: 100 - hitRate,
      avgAccessTime: 50, // 模拟值，实际应该测量
      compressionRatio: this.currentPolicy.compressionEnabled ? 0.7 : 1.0,
      costSavings,
      topKeys,
      sizeDistribution
    };
  }

  /**
   * 🔧 工具方法
   */
  private getCurrentSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private recordAccess(key: string, hit: boolean): void {
    this.accessLog.push({
      key,
      timestamp: new Date()
    });
    
    // 保持日志大小在合理范围内
    if (this.accessLog.length > 10000) {
      this.accessLog = this.accessLog.slice(-5000);
    }
  }

  private compress(data: any): string {
    // 简单的压缩实现 - 实际项目中应该使用专业的压缩库
    return JSON.stringify(data);
  }

  private decompress(data: string): any {
    return JSON.parse(data);
  }

  private encrypt(data: any): string {
    const secretKey = 'ai-cache-secret-key'; // 实际项目中应该使用环境变量
    return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
  }

  private decrypt(encryptedData: string): any {
    const secretKey = 'ai-cache-secret-key';
    const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 清理了 ${cleanedCount} 个过期缓存条目`);
      this.saveToStorage();
    }
  }

  /**
   * 💾 数据持久化
   */
  private saveToStorage(): void {
    try {
      const cacheData = Array.from(this.cache.entries()).map(([key, entry]) => [
        key,
        {
          ...entry,
          timestamp: entry.timestamp.toISOString(),
          expiresAt: entry.expiresAt.toISOString(),
          lastAccessed: entry.lastAccessed.toISOString()
        }
      ]);
      
      localStorage.setItem(this.STORAGE_KEYS.CACHE_DATA, JSON.stringify(cacheData));
      localStorage.setItem(this.STORAGE_KEYS.CACHE_POLICY, JSON.stringify(this.currentPolicy));
      localStorage.setItem(this.STORAGE_KEYS.BATCH_CONFIG, JSON.stringify(this.batchConfig));
    } catch (error) {
      console.error('❌ 保存缓存数据失败:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const cacheData = localStorage.getItem(this.STORAGE_KEYS.CACHE_DATA);
      if (cacheData) {
        const entries = JSON.parse(cacheData);
        this.cache = new Map(entries.map(([key, entry]: [string, any]) => [
          key,
          {
            ...entry,
            timestamp: new Date(entry.timestamp),
            expiresAt: new Date(entry.expiresAt),
            lastAccessed: new Date(entry.lastAccessed)
          }
        ]));
      }

      const policyData = localStorage.getItem(this.STORAGE_KEYS.CACHE_POLICY);
      if (policyData) {
        this.currentPolicy = JSON.parse(policyData);
      }

      const batchData = localStorage.getItem(this.STORAGE_KEYS.BATCH_CONFIG);
      if (batchData) {
        this.batchConfig = JSON.parse(batchData);
      }
    } catch (error) {
      console.error('❌ 加载缓存数据失败:', error);
    }
  }

  // 🔍 公开方法
  setPolicy(policy: CachePolicy): void {
    this.currentPolicy = policy;
    this.saveToStorage();
    console.log(`🔧 缓存策略已更新: ${policy.name}`);
  }

  getCurrentPolicy(): CachePolicy {
    return this.currentPolicy;
  }

  setBatchConfig(config: BatchConfig): void {
    this.batchConfig = config;
    this.saveToStorage();
  }

  getBatchConfig(): BatchConfig {
    return this.batchConfig;
  }

  getAvailablePolicies(): CachePolicy[] {
    return DEFAULT_CACHE_POLICIES;
  }
}

// 🌍 全局实例
export const aiCacheManager = new AICacheManager();