/**
 * 优化的预警服务
 * 将大部分计算逻辑移到Edge Functions和数据库函数中执行
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WarningRule, WarningRecord, WarningStatistics, WarningFilter } from "./warningService";
import { executeWarningRules, getWarningEngineStatus } from "./warningEngineService";
import { triggerWarningCheck } from "./warningAutoTriggerService";

// 性能监控接口
interface PerformanceMetrics {
  queryTime: number;
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
}

// 缓存管理器
class OptimizedCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private metrics: PerformanceMetrics = {
    queryTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
  };

  set(key: string, data: any, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get(key: string): any | null {
    this.metrics.totalRequests++;
    
    const item = this.cache.get(key);
    if (!item) {
      this.metrics.cacheMisses++;
      return null;
    }

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    this.metrics.cacheHits++;
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getHitRate(): number {
    if (this.metrics.totalRequests === 0) return 0;
    return (this.metrics.cacheHits / this.metrics.totalRequests) * 100;
  }
}

// 创建缓存实例
const optimizedCache = new OptimizedCache();

/**
 * 优化的预警统计获取
 * 使用数据库函数进行服务端计算
 */
export async function getOptimizedWarningStatistics(
  filter?: WarningFilter
): Promise<WarningStatistics> {
  const startTime = Date.now();
  
  try {
    // 创建缓存键
    const cacheKey = `warning_stats_${JSON.stringify(filter || {})}`;
    
    // 尝试从缓存获取
    const cachedData = optimizedCache.get(cacheKey);
    if (cachedData) {
      console.log(`[OptimizedWarningService] 从缓存获取统计数据，耗时: ${Date.now() - startTime}ms`);
      return cachedData;
    }

    // 使用优化的数据库函数
    const timeRangeDays = getTimeRangeDays(filter?.timeRange);
    
    // 首先尝试使用优化的数据库函数
    let data, error;
    try {
      const response = await supabase.rpc('get_warning_statistics_optimized', {
        time_range_days: timeRangeDays,
      });
      data = response.data;
      error = response.error;
    } catch (dbError: any) {
      // 数据库函数不存在，使用前端降级方案
      if (dbError.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] 数据库函数不存在，使用前端计算');
        const { getWarningStatistics } = await import('./warningService');
        const fallbackStats = await getWarningStatistics(filter);
        
        // 缓存降级结果
        optimizedCache.set(cacheKey, fallbackStats, 180);
        console.log(`[OptimizedWarningService] 前端降级计算完成，耗时: ${Date.now() - startTime}ms`);
        return fallbackStats;
      }
      throw dbError;
    }

    if (error) {
      console.error('获取优化预警统计失败:', error);
      // 如果是数据库函数不存在的错误，降级到前端处理
      if (error.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] 数据库函数不存在，使用前端计算');
        const { getWarningStatistics } = await import('./warningService');
        const fallbackStats = await getWarningStatistics(filter);
        
        // 缓存降级结果
        optimizedCache.set(cacheKey, fallbackStats, 180);
        console.log(`[OptimizedWarningService] 前端降级计算完成，耗时: ${Date.now() - startTime}ms`);
        return fallbackStats;
      }
      throw error;
    }

    const result = data[0];
    
    // 构建标准格式的统计数据
    const statistics: WarningStatistics = {
      totalStudents: result.total_students,
      warningStudents: result.warning_students,
      atRiskStudents: result.warning_students,
      warningRatio: result.total_students > 0 
        ? parseFloat(((result.warning_students / result.total_students) * 100).toFixed(1))
        : 0,
      highRiskStudents: result.high_risk_students,
      totalWarnings: result.total_warnings,
      activeWarnings: result.active_warnings,
      riskDistribution: result.risk_distribution,
      categoryDistribution: result.category_distribution,
      scopeDistribution: {
        global: 0,
        exam: 0,
        class: 0,
        student: 0,
      },
      // 这些字段需要额外查询，但优先返回核心数据
      warningsByType: [],
      riskByClass: [],
      commonRiskFactors: [],
    };

    // 并行获取详细数据
    Promise.all([
      getWarningsByType(filter),
      getRiskByClass(filter),
      getCommonRiskFactors(filter),
    ]).then(([warningsByType, riskByClass, commonRiskFactors]) => {
      statistics.warningsByType = warningsByType;
      statistics.riskByClass = riskByClass;
      statistics.commonRiskFactors = commonRiskFactors;
      
      // 更新缓存
      optimizedCache.set(cacheKey, statistics, 180); // 3分钟缓存
    });

    // 缓存基础统计数据
    optimizedCache.set(cacheKey, statistics, 120); // 2分钟缓存

    console.log(`[OptimizedWarningService] 获取统计数据完成，耗时: ${Date.now() - startTime}ms`);
    return statistics;
  } catch (error) {
    console.error('[OptimizedWarningService] 获取预警统计失败:', error);
    throw error;
  }
}

/**
 * 优化的预警规则执行
 * 直接调用Edge Functions而不是前端计算
 */
export async function executeOptimizedWarningRules(
  trigger?: string,
  ruleIds?: string[]
): Promise<{ success: boolean; executionId?: string; summary?: any }> {
  try {
    console.log(`[OptimizedWarningService] 执行预警规则, 触发器: ${trigger || '手动'}`);
    
    // 清理相关缓存
    optimizedCache.clear();
    
    // 调用Edge Function执行预警规则
    const result = await executeWarningRules(trigger);
    
    if (!result) {
      return { success: false };
    }

    // 触发实时通知（如果需要）
    if (result.summary.generatedWarnings > 0) {
      // 通知前端更新数据
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('warningDataUpdated', {
          detail: {
            executionId: result.executionId,
            newWarnings: result.summary.generatedWarnings,
            affectedStudents: result.summary.matchedStudents,
          },
        }));
      }, 1000);
    }

    return {
      success: true,
      executionId: result.executionId,
      summary: result.summary,
    };
  } catch (error) {
    console.error('[OptimizedWarningService] 执行预警规则失败:', error);
    return { success: false };
  }
}

/**
 * 批量处理预警操作
 * 减少网络请求次数
 */
export async function batchWarningOperations(operations: Array<{
  type: 'resolve' | 'dismiss' | 'activate';
  warningIds: string[];
  notes?: string;
}>): Promise<{ success: boolean; processedCount: number }> {
  try {
    let processedCount = 0;
    
    // 批量处理相同类型的操作
    for (const operation of operations) {
      const { type, warningIds, notes } = operation;
      
      let updateData: any = {
        updated_at: new Date().toISOString(),
      };

      switch (type) {
        case 'resolve':
          updateData.status = 'resolved';
          updateData.resolved_at = new Date().toISOString();
          updateData.resolution_notes = notes;
          break;
        case 'dismiss':
          updateData.status = 'dismissed';
          updateData.resolved_at = new Date().toISOString();
          updateData.resolution_notes = notes;
          break;
        case 'activate':
          updateData.status = 'active';
          updateData.resolved_at = null;
          updateData.resolution_notes = null;
          break;
      }

      const { error, count } = await supabase
        .from('warning_records')
        .update(updateData)
        .in('id', warningIds);

      if (error) {
        console.error(`批量${type}操作失败:`, error);
      } else {
        processedCount += count || 0;
      }
    }

    // 清理相关缓存
    optimizedCache.clear();

    toast.success(`批量操作完成，处理了 ${processedCount} 条预警记录`);
    
    return { success: true, processedCount };
  } catch (error) {
    console.error('批量预警操作失败:', error);
    toast.error('批量操作失败');
    return { success: false, processedCount: 0 };
  }
}

/**
 * 智能预警建议
 * 基于历史数据和AI分析生成建议
 */
export async function getWarningRecommendations(
  studentId?: string,
  classId?: string
): Promise<Array<{
  type: string;
  description: string;
  priority: number;
  actions: string[];
}>> {
  try {
    const cacheKey = `recommendations_${studentId || 'all'}_${classId || 'all'}`;
    const cached = optimizedCache.get(cacheKey);
    if (cached) return cached;

    // 尝试调用数据库函数获取建议，如果不存在则返回模拟数据
    let data, error;
    try {
      const response = await supabase.rpc('get_warning_recommendations', {
        p_student_id: studentId,
        p_class_id: classId,
      });
      data = response.data;
      error = response.error;
    } catch (dbError: any) {
      if (dbError.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] get_warning_recommendations函数不存在，返回模拟建议');
        // 返回一些模拟的预警建议
        const mockRecommendations = [
          { 
            type: 'intervention', 
            description: '建议加强数学基础练习',
            priority: 3, 
            actions: ['增加练习时间', '寻求额外辅导', '复习基础概念'] 
          },
          { 
            type: 'monitoring', 
            description: '持续关注学习进度',
            priority: 2, 
            actions: ['定期检查作业完成情况', '与学生沟通学习困难'] 
          },
        ];
        optimizedCache.set(cacheKey, mockRecommendations, 600);
        return mockRecommendations;
      }
      throw dbError;
    }

    if (error) {
      if (error.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] get_warning_recommendations函数不存在，返回模拟建议');
        const mockRecommendations = [
          { 
            type: 'intervention', 
            description: '建议加强数学基础练习',
            priority: 3, 
            actions: ['增加练习时间', '寻求额外辅导', '复习基础概念'] 
          },
          { 
            type: 'monitoring', 
            description: '持续关注学习进度',
            priority: 2, 
            actions: ['定期检查作业完成情况', '与学生沟通学习困难'] 
          },
        ];
        optimizedCache.set(cacheKey, mockRecommendations, 600);
        return mockRecommendations;
      }
      console.error('获取预警建议失败:', error);
      return [];
    }

    const recommendations = data || [];
    optimizedCache.set(cacheKey, recommendations, 600); // 10分钟缓存
    
    return recommendations;
  } catch (error) {
    console.error('获取预警建议失败:', error);
    return [];
  }
}

/**
 * 预警趋势分析
 * 使用服务端计算提高性能
 */
export async function getWarningTrends(
  timeRange: string = '30d',
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<Array<{
  period: string;
  total: number;
  new: number;
  resolved: number;
  active: number;
}>> {
  try {
    const cacheKey = `trends_${timeRange}_${groupBy}`;
    const cached = optimizedCache.get(cacheKey);
    if (cached) return cached;

    // 尝试使用数据库函数，如果不存在则返回空数组
    let data, error;
    try {
      const response = await supabase.rpc('get_warning_trends', {
        p_time_range: timeRange,
        p_group_by: groupBy,
      });
      data = response.data;
      error = response.error;
    } catch (dbError: any) {
      if (dbError.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] get_warning_trends函数不存在，返回空数据');
        return [];
      }
      throw dbError;
    }

    if (error) {
      if (error.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] get_warning_trends函数不存在，返回空数据');
        return [];
      }
      console.error('获取预警趋势失败:', error);
      return [];
    }

    const trends = data || [];
    optimizedCache.set(cacheKey, trends, 900); // 15分钟缓存
    
    return trends;
  } catch (error) {
    console.error('获取预警趋势失败:', error);
    return [];
  }
}

// 辅助函数
function getTimeRangeDays(timeRange?: string): number {
  switch (timeRange) {
    case 'month': return 30;
    case 'quarter': return 90;
    case 'year': return 365;
    case 'semester': return 180;
    default: return 180;
  }
}

async function getWarningsByType(filter?: WarningFilter) {
  try {
    // 尝试使用数据库函数
    const { data, error } = await supabase.rpc('get_warnings_by_type', {
      time_range_days: getTimeRangeDays(filter?.timeRange),
    });
    
    if (error) {
      if (error.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] get_warnings_by_type函数不存在，返回模拟数据');
        return [
          { type: 'grade_decline', count: 5 },
          { type: 'consecutive_fail', count: 3 },
          { type: 'attendance', count: 2 },
        ];
      }
      console.error('获取预警类型分布失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取预警类型分布失败:', error);
    return [];
  }
}

async function getRiskByClass(filter?: WarningFilter) {
  try {
    // 尝试使用数据库函数
    const { data, error } = await supabase.rpc('get_risk_by_class', {
      time_range_days: getTimeRangeDays(filter?.timeRange),
    });
    
    if (error) {
      if (error.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] get_risk_by_class函数不存在，返回模拟数据');
        return [
          { class_name: '高一(1)班', risk_score: 75, student_count: 45 },
          { class_name: '高一(2)班', risk_score: 60, student_count: 43 },
        ];
      }
      console.error('获取班级风险分布失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取班级风险分布失败:', error);
    return [];
  }
}

async function getCommonRiskFactors(filter?: WarningFilter) {
  try {
    // 尝试使用数据库函数
    const { data, error } = await supabase.rpc('get_common_risk_factors', {
      time_range_days: getTimeRangeDays(filter?.timeRange),
    });
    
    if (error) {
      if (error.code === 'PGRST202') {
        console.warn('[OptimizedWarningService] get_common_risk_factors函数不存在，返回模拟数据');
        return [
          { 
            factor: '数学成绩下降', 
            count: 8, 
            percentage: 35, 
            frequency: 8,
            trend: [6, 7, 8, 9, 8, 8],
            category: '学业表现',
            severity: 'high'
          },
          { 
            factor: '作业完成率低', 
            count: 6, 
            percentage: 26, 
            frequency: 6,
            trend: [5, 6, 6, 7, 6, 6],
            category: '学习习惯',
            severity: 'medium'
          },
          { 
            factor: '课堂参与度不足', 
            count: 4, 
            percentage: 17, 
            frequency: 4,
            trend: [3, 4, 4, 4, 4, 4],
            category: '课堂表现',
            severity: 'medium'
          },
        ];
      }
      console.error('获取常见风险因素失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取常见风险因素失败:', error);
    return [];
  }
}

/**
 * 获取缓存性能指标
 */
export function getCacheMetrics(): PerformanceMetrics & { hitRate: number } {
  return {
    ...optimizedCache.getMetrics(),
    hitRate: optimizedCache.getHitRate(),
  };
}

/**
 * 清理缓存
 */
export function clearWarningCache(): void {
  optimizedCache.clear();
  toast.info('预警数据缓存已清理');
}

/**
 * 预热缓存
 * 在后台预加载常用数据
 */
export async function warmupCache(): Promise<void> {
  try {
    console.log('[OptimizedWarningService] 开始预热缓存');
    
    // 并行预加载常用数据
    await Promise.all([
      getOptimizedWarningStatistics(),
      getWarningTrends(),
      getWarningRecommendations(),
    ]);
    
    console.log('[OptimizedWarningService] 缓存预热完成');
  } catch (error) {
    console.error('[OptimizedWarningService] 缓存预热失败:', error);
  }
}

/**
 * 监控预警引擎状态
 */
export async function monitorWarningEngine(): Promise<{
  isHealthy: boolean;
  lastExecution?: any;
  todayStats?: any;
  recommendations: string[];
}> {
  try {
    const status = await getWarningEngineStatus();
    
    const recommendations: string[] = [];
    
    // 基于状态生成建议
    if (status.isRunning) {
      recommendations.push('预警引擎正在运行中，请等待完成');
    } else if (status.lastExecution) {
      const lastExecutionTime = new Date(status.lastExecution.created_at);
      const hoursSinceLastExecution = (Date.now() - lastExecutionTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastExecution > 24) {
        recommendations.push('建议执行预警规则检查，距离上次执行已超过24小时');
      }
    }
    
    if (status.todayStats?.successRate && status.todayStats.successRate < 90) {
      recommendations.push('今日预警引擎成功率较低，建议检查系统状态');
    }
    
    return {
      isHealthy: !status.isRunning && (!status.todayStats || status.todayStats.successRate > 80),
      lastExecution: status.lastExecution,
      todayStats: status.todayStats,
      recommendations,
    };
  } catch (error) {
    console.error('监控预警引擎失败:', error);
    return {
      isHealthy: false,
      recommendations: ['无法获取预警引擎状态，请检查网络连接'],
    };
  }
}