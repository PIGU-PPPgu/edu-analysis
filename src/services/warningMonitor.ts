/**
 * 实时预警监控服务
 * 负责自动触发预警规则、实时数据监控和自动预警生成
 */

import { executeWarningRules, getWarningEngineStatus as getEngineStatus } from './warningEngineService';
import { getWarningStatistics } from './warningService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 监控配置
export interface MonitorConfig {
  autoExecuteEnabled: boolean;
  executeInterval: number; // 分钟
  dataChangeMonitoring: boolean;
  realTimeUpdates: boolean;
  notificationEnabled: boolean;
}

// 监控状态
export interface MonitorStatus {
  isActive: boolean;
  lastExecution: string | null;
  nextExecution: string | null;
  totalExecutions: number;
  errorCount: number;
  lastError: string | null;
}

// 数据变更事件
interface DataChangeEvent {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  timestamp: string;
  affectedRows: number;
}

/**
 * 预警监控器类
 */
export class WarningMonitor {
  private config: MonitorConfig;
  private status: MonitorStatus;
  private intervalId: NodeJS.Timeout | null = null;
  private subscribers: Set<(status: MonitorStatus) => void> = new Set();
  private dataListeners: Map<string, any> = new Map();

  constructor() {
    this.config = {
      autoExecuteEnabled: false,
      executeInterval: 30, // 默认30分钟
      dataChangeMonitoring: true,
      realTimeUpdates: true,
      notificationEnabled: true
    };

    this.status = {
      isActive: false,
      lastExecution: null,
      nextExecution: null,
      totalExecutions: 0,
      errorCount: 0,
      lastError: null
    };

    this.loadConfigFromStorage();
  }

  /**
   * 启动监控
   */
  start(): void {
    if (this.status.isActive) {
      return;
    }

    this.status.isActive = true;

    // 启动定时执行
    if (this.config.autoExecuteEnabled) {
      this.startAutoExecution();
    }

    // 启动数据变更监控
    if (this.config.dataChangeMonitoring) {
      this.startDataChangeMonitoring();
    }

    // 启动实时状态更新
    if (this.config.realTimeUpdates) {
      this.startRealTimeUpdates();
    }

    this.notifySubscribers();

    if (this.config.notificationEnabled) {
      toast.success('预警监控系统已启动');
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.status.isActive) {
      return;
    }

    this.status.isActive = false;

    // 停止定时执行
    this.stopAutoExecution();

    // 停止数据变更监控
    this.stopDataChangeMonitoring();

    // 停止实时更新
    this.stopRealTimeUpdates();

    this.notifySubscribers();

    if (this.config.notificationEnabled) {
      toast.info('预警监控系统已停止');
    }
  }

  /**
   * 启动自动执行
   */
  private startAutoExecution(): void {
    const intervalMs = this.config.executeInterval * 60 * 1000;
    
    this.intervalId = setInterval(async () => {
      await this.executeWarningCheck('automatic');
    }, intervalMs);

    // 设置下次执行时间
    const nextExecution = new Date(Date.now() + intervalMs);
    this.status.nextExecution = nextExecution.toISOString();
  }

  /**
   * 停止自动执行
   */
  private stopAutoExecution(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.status.nextExecution = null;
    }
  }

  /**
   * 启动数据变更监控
   */
  private startDataChangeMonitoring(): void {
    // 监控成绩数据变更
    const gradeChannel = supabase
      .channel('grade_data_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grade_data'
        },
        (payload) => this.handleDataChange('grade_data', payload)
      )
      .subscribe();

    // 监控作业提交变更
    const homeworkChannel = supabase
      .channel('homework_submissions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'homework_submissions'
        },
        (payload) => this.handleDataChange('homework_submissions', payload)
      )
      .subscribe();

    // 监控学生数据变更
    const studentChannel = supabase
      .channel('students_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students'
        },
        (payload) => this.handleDataChange('students', payload)
      )
      .subscribe();

    this.dataListeners.set('grades', gradeChannel);
    this.dataListeners.set('homework', homeworkChannel);
    this.dataListeners.set('students', studentChannel);
  }

  /**
   * 停止数据变更监控
   */
  private stopDataChangeMonitoring(): void {
    for (const [key, channel] of this.dataListeners) {
      channel.unsubscribe();
    }
    this.dataListeners.clear();
  }

  /**
   * 启动实时状态更新
   */
  private startRealTimeUpdates(): void {
    // 定期更新监控状态
    this.intervalId = setInterval(async () => {
      await this.updateStatus();
    }, 5000); // 每5秒更新一次
  }

  /**
   * 停止实时状态更新
   */
  private stopRealTimeUpdates(): void {
    // 这里复用了intervalId，在实际应用中应该分开管理
  }

  /**
   * 处理数据变更事件
   */
  private async handleDataChange(tableName: string, payload: any): Promise<void> {
    const event: DataChangeEvent = {
      table: tableName,
      action: payload.eventType,
      timestamp: new Date().toISOString(),
      affectedRows: 1
    };

    // 根据数据变更类型决定是否触发预警检查
    const shouldTriggerCheck = this.shouldTriggerWarningCheck(event);
    
    if (shouldTriggerCheck) {
      // 延迟执行，避免频繁触发
      setTimeout(async () => {
        await this.executeWarningCheck('data_change');
      }, 5000);
    }
  }

  /**
   * 判断是否应该触发预警检查
   */
  private shouldTriggerWarningCheck(event: DataChangeEvent): boolean {
    // 成绩数据新增或更新时触发
    if (event.table === 'grade_data' && (event.action === 'INSERT' || event.action === 'UPDATE')) {
      return true;
    }

    // 作业提交状态变更时触发
    if (event.table === 'homework_submissions' && event.action === 'UPDATE') {
      return true;
    }

    // 学生信息变更时触发
    if (event.table === 'students' && event.action === 'UPDATE') {
      return true;
    }

    return false;
  }

  /**
   * 执行预警检查
   */
  private async executeWarningCheck(
    trigger: 'automatic' | 'data_change' | 'manual',
    triggerEvent?: string
  ): Promise<void> {
    // 检查引擎是否已在运行
    const engineStatus = getEngineStatus();
    if (engineStatus.isRunning) {
      return;
    }

    try {
      const result = await executeWarningRules(trigger, triggerEvent);
      
      this.status.totalExecutions++;
      this.status.lastExecution = new Date().toISOString();
      
      // 更新下次执行时间
      if (this.config.autoExecuteEnabled && trigger === 'automatic') {
        const nextExecution = new Date(Date.now() + this.config.executeInterval * 60 * 1000);
        this.status.nextExecution = nextExecution.toISOString();
      }

      if (this.config.notificationEnabled && result.totalWarningsGenerated > 0) {
        toast.info(`检测到 ${result.totalWarningsGenerated} 个新预警`);
      }
    } catch (error) {
      this.status.errorCount++;
      this.status.lastError = error instanceof Error ? error.message : String(error);
      
      console.error('预警检查失败:', error);
      
      if (this.config.notificationEnabled) {
        toast.error('预警检查失败');
      }
    }

    this.notifySubscribers();
  }

  /**
   * 更新监控状态
   */
  private async updateStatus(): Promise<void> {
    try {
      // 可以在这里获取更多实时状态信息
      const engineStatus = getEngineStatus();
      
      // 如果引擎在运行但监控显示不活跃，更新状态
      if (engineStatus.isRunning && !this.status.isActive) {
        // 可能是外部触发的执行
      }

      this.notifySubscribers();
    } catch (error) {
      console.error('更新监控状态失败:', error);
    }
  }

  /**
   * 手动触发预警检查
   */
  async triggerCheck(triggerEvent?: string): Promise<void> {
    await this.executeWarningCheck('manual', triggerEvent);
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MonitorConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    // 保存到本地存储
    this.saveConfigToStorage();

    // 如果监控已启动，需要重启以应用新配置
    if (this.status.isActive) {
      // 检查是否需要重启定时任务
      if (oldConfig.autoExecuteEnabled !== this.config.autoExecuteEnabled ||
          oldConfig.executeInterval !== this.config.executeInterval) {
        this.stopAutoExecution();
        if (this.config.autoExecuteEnabled) {
          this.startAutoExecution();
        }
      }

      // 检查是否需要重启数据监控
      if (oldConfig.dataChangeMonitoring !== this.config.dataChangeMonitoring) {
        this.stopDataChangeMonitoring();
        if (this.config.dataChangeMonitoring) {
          this.startDataChangeMonitoring();
        }
      }
    }

    this.notifySubscribers();
  }

  /**
   * 获取当前配置
   */
  getConfig(): MonitorConfig {
    return { ...this.config };
  }

  /**
   * 获取当前状态
   */
  getStatus(): MonitorStatus {
    return { ...this.status };
  }

  /**
   * 订阅状态变更
   */
  subscribe(callback: (status: MonitorStatus) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * 通知所有订阅者
   */
  private notifySubscribers(): void {
    for (const callback of this.subscribers) {
      try {
        callback(this.status);
      } catch (error) {
        console.error('通知订阅者失败:', error);
      }
    }
  }

  /**
   * 从本地存储加载配置
   */
  private loadConfigFromStorage(): void {
    try {
      const stored = localStorage.getItem('warning_monitor_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('加载监控配置失败:', error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  private saveConfigToStorage(): void {
    try {
      localStorage.setItem('warning_monitor_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('保存监控配置失败:', error);
    }
  }

  /**
   * 获取监控统计信息
   */
  async getMonitorStatistics(): Promise<{
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    lastExecutionTime: string | null;
    uptime: number;
    dataChangesHandled: number;
  }> {
    // 这里可以从数据库获取更详细的统计信息
    return {
      totalExecutions: this.status.totalExecutions,
      successRate: this.status.totalExecutions > 0 
        ? (this.status.totalExecutions - this.status.errorCount) / this.status.totalExecutions 
         : 1,
      avgExecutionTime: 0, // 需要从执行记录中计算
      lastExecutionTime: this.status.lastExecution,
      uptime: this.status.isActive ? Date.now() : 0,
      dataChangesHandled: 0, // 需要统计
    };
  }
}

// 导出单例实例
export const warningMonitor = new WarningMonitor();

// 便捷函数
export function startWarningMonitoring(): void {
  warningMonitor.start();
}

export function stopWarningMonitoring(): void {
  warningMonitor.stop();
}

export function getMonitoringStatus(): MonitorStatus {
  return warningMonitor.getStatus();
}

export function configureMonitoring(config: Partial<MonitorConfig>): void {
  warningMonitor.updateConfig(config);
}

export function triggerManualCheck(triggerEvent?: string): Promise<void> {
  return warningMonitor.triggerCheck(triggerEvent);
}