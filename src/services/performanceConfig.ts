/**
 * 数据导入性能优化配置
 * 
 * 针对学生画像系统的大批量数据导入场景优化
 */

export const PERFORMANCE_CONFIG = {
  // 批量查询学生记录的配置
  STUDENT_BATCH_QUERY: {
    // 一次性查询的最大学生数量
    MAX_STUDENT_QUERY_SIZE: 1000,
    // 查询超时时间（毫秒）
    QUERY_TIMEOUT: 30000
  },
  
  // 批量插入成绩数据的配置
  GRADE_BATCH_INSERT: {
    // Replace策略：批次大小（推荐500-1000）
    REPLACE_BATCH_SIZE: 500,
    // Update策略：批次大小（推荐300-500，因为upsert操作更耗时）
    UPDATE_BATCH_SIZE: 300,
    // Add-only策略：批次大小（推荐500-1000）
    ADD_ONLY_BATCH_SIZE: 500,
    // 插入超时时间（毫秒）
    INSERT_TIMEOUT: 60000
  },
  
  // 批量创建学生记录的配置
  STUDENT_BATCH_CREATE: {
    // 一次性创建的最大学生数量
    MAX_CREATE_BATCH_SIZE: 100,
    // 创建超时时间（毫秒）
    CREATE_TIMEOUT: 30000
  },
  
  // 性能监控配置
  PERFORMANCE_MONITORING: {
    // 是否启用详细性能日志
    ENABLE_DETAILED_LOGGING: true,
    // 性能警告阈值（毫秒）
    SLOW_OPERATION_THRESHOLD: 5000,
    // 是否在控制台显示进度
    SHOW_PROGRESS: true
  }
};

/**
 * 根据数据量动态调整批次大小
 */
export function getOptimalBatchSize(dataSize: number, strategy: 'replace' | 'update' | 'add_only'): number {
  const config = PERFORMANCE_CONFIG.GRADE_BATCH_INSERT;
  
  // 基础批次大小
  let baseBatchSize: number;
  switch (strategy) {
    case 'replace':
      baseBatchSize = config.REPLACE_BATCH_SIZE;
      break;
    case 'update':
      baseBatchSize = config.UPDATE_BATCH_SIZE;
      break;
    case 'add_only':
      baseBatchSize = config.ADD_ONLY_BATCH_SIZE;
      break;
    default:
      baseBatchSize = config.REPLACE_BATCH_SIZE;
  }
  
  // 根据数据量调整
  if (dataSize < 100) {
    return Math.min(baseBatchSize, dataSize);
  } else if (dataSize > 5000) {
    // 超大数据量时适当减小批次，避免超时
    return Math.floor(baseBatchSize * 0.8);
  }
  
  return baseBatchSize;
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();
  
  constructor(private operationName: string) {
    this.startTime = Date.now();
    if (PERFORMANCE_CONFIG.PERFORMANCE_MONITORING.ENABLE_DETAILED_LOGGING) {
      console.log(`[性能监控] ${operationName} 开始`);
    }
  }
  
  checkpoint(name: string): void {
    const now = Date.now();
    this.checkpoints.set(name, now);
    
    if (PERFORMANCE_CONFIG.PERFORMANCE_MONITORING.ENABLE_DETAILED_LOGGING) {
      const elapsed = now - this.startTime;
      console.log(`[性能监控] ${this.operationName} - ${name}: ${elapsed}ms`);
    }
  }
  
  finish(): { totalTime: number; checkpoints: Record<string, number> } {
    const totalTime = Date.now() - this.startTime;
    const checkpointData: Record<string, number> = {};
    
    this.checkpoints.forEach((time, name) => {
      checkpointData[name] = time - this.startTime;
    });
    
    if (PERFORMANCE_CONFIG.PERFORMANCE_MONITORING.ENABLE_DETAILED_LOGGING) {
      console.log(`[性能监控] ${this.operationName} 完成`, {
        总耗时: `${totalTime}ms`,
        检查点: checkpointData,
        性能等级: totalTime > PERFORMANCE_CONFIG.PERFORMANCE_MONITORING.SLOW_OPERATION_THRESHOLD ? '慢' : '正常'
      });
    }
    
    return { totalTime, checkpoints: checkpointData };
  }
} 