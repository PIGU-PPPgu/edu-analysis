/**
 * 🚀 系统监控和日志管理
 * 实现完整的系统监控、错误追踪、性能日志和健康检查
 */

// 日志级别枚举
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

// 日志类别
export enum LogCategory {
  SYSTEM = 'system',
  PERFORMANCE = 'performance',
  USER_ACTION = 'user_action',
  API = 'api',
  DATABASE = 'database',
  ERROR = 'error',
  SECURITY = 'security',
  BUSINESS = 'business'
}

// 日志条目接口
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

// 系统指标接口
export interface SystemMetrics {
  timestamp: number;
  performance: {
    memory: {
      used: number;
      total: number;
      limit: number;
    };
    timing: {
      domContentLoaded: number;
      loadComplete: number;
      firstContentfulPaint: number;
      largestContentfulPaint: number;
      firstInputDelay: number;
      cumulativeLayoutShift: number;
    };
    resources: {
      totalRequests: number;
      failedRequests: number;
      avgResponseTime: number;
      slowRequests: number;
    };
  };
  errors: {
    totalErrors: number;
    criticalErrors: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
  };
  user: {
    activeUsers: number;
    sessionDuration: number;
    bounceRate: number;
    userActions: number;
  };
  system: {
    uptime: number;
    version: string;
    environment: string;
    buildTime: string;
  };
}

// 监控配置
export interface MonitorConfig {
  logLevel: LogLevel;
  enableConsoleOutput: boolean;
  enableRemoteLogging: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
  enableUserTracking: boolean;
  maxLogEntries: number;
  flushInterval: number;
  remoteEndpoint?: string;
  apiKey?: string;
}

// 默认配置
const DEFAULT_CONFIG: MonitorConfig = {
  logLevel: LogLevel.INFO,
  enableConsoleOutput: true,
  enableRemoteLogging: false,
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  enableUserTracking: true,
  maxLogEntries: 1000,
  flushInterval: 30000, // 30秒
  remoteEndpoint: '/api/logs',
  apiKey: undefined
};

/**
 * 系统监控管理器
 */
class SystemMonitor {
  private static instance: SystemMonitor;
  private config: MonitorConfig;
  private logBuffer: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;
  private startTime: number;
  private flushTimer?: NodeJS.Timeout;
  private performanceObserver?: PerformanceObserver;
  private errorCount = 0;
  private criticalErrorCount = 0;
  private userActionCount = 0;
  private requestCount = 0;
  private failedRequestCount = 0;

  private constructor(config: Partial<MonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeMonitoring();
  }

  static getInstance(config?: Partial<MonitorConfig>): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor(config);
    }
    return SystemMonitor.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring(): void {
    this.setupPerformanceMonitoring();
    this.setupErrorTracking();
    this.setupUserTracking();
    this.startLogFlushing();
    
    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'System monitoring initialized', {
      sessionId: this.sessionId,
      config: this.config
    });
  }

  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // Web Vitals监控
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.handlePerformanceEntry(entry);
        });
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (e) {
        // 某些浏览器可能不支持所有类型
        this.log(LogLevel.WARN, LogCategory.PERFORMANCE, 'Some performance metrics not supported', { error: e });
      }
    }

    // 定期性能检查
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000); // 每分钟
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    const entryData = {
      name: entry.name,
      type: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration
    };

    if (entry.entryType === 'navigation') {
      const navEntry = entry as PerformanceNavigationTiming;
      this.log(LogLevel.INFO, LogCategory.PERFORMANCE, 'Page navigation timing', {
        ...entryData,
        domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
        loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
        connectTime: navEntry.connectEnd - navEntry.connectStart,
        responseTime: navEntry.responseEnd - navEntry.responseStart
      });
    } else if (entry.entryType === 'paint') {
      this.log(LogLevel.INFO, LogCategory.PERFORMANCE, `Paint timing: ${entry.name}`, entryData);
    } else if (entry.entryType === 'largest-contentful-paint') {
      const lcpEntry = entry as any; // LCP类型
      if (lcpEntry.startTime > 2500) { // LCP > 2.5秒是Poor
        this.log(LogLevel.WARN, LogCategory.PERFORMANCE, 'Poor LCP detected', entryData);
      }
    } else if (entry.entryType === 'first-input') {
      const fidEntry = entry as any; // FID类型
      if (fidEntry.processingStart - fidEntry.startTime > 100) { // FID > 100ms是Poor
        this.log(LogLevel.WARN, LogCategory.PERFORMANCE, 'Poor FID detected', entryData);
      }
    } else if (entry.entryType === 'layout-shift') {
      const clsEntry = entry as any; // CLS类型
      if (clsEntry.value > 0.1) { // CLS > 0.1是Poor
        this.log(LogLevel.WARN, LogCategory.PERFORMANCE, 'Layout shift detected', {
          ...entryData,
          value: clsEntry.value,
          hadRecentInput: clsEntry.hadRecentInput
        });
      }
    }
  }

  private collectPerformanceMetrics(): void {
    const metrics: Partial<SystemMetrics> = {
      timestamp: Date.now(),
      performance: {
        memory: this.getMemoryInfo(),
        timing: this.getTimingInfo(),
        resources: this.getResourceInfo()
      },
      errors: {
        totalErrors: this.errorCount,
        criticalErrors: this.criticalErrorCount,
        errorRate: this.errorCount / Math.max(this.userActionCount, 1),
        topErrors: this.getTopErrors()
      },
      user: {
        activeUsers: 1, // 当前会话
        sessionDuration: Date.now() - this.startTime,
        bounceRate: 0, // 需要额外实现
        userActions: this.userActionCount
      },
      system: {
        uptime: Date.now() - this.startTime,
        version: import.meta.env.VITE_APP_VERSION || 'unknown',
        environment: import.meta.env.DEV ? 'development' : 'production',
        buildTime: import.meta.env.VITE_APP_BUILD_TIME || 'unknown'
      }
    };

    this.log(LogLevel.INFO, LogCategory.PERFORMANCE, 'Performance metrics collected', metrics);
  }

  private getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    return { used: 0, total: 0, limit: 0 };
  }

  private getTimingInfo() {
    const timing = performance.timing;
    return {
      domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      loadComplete: timing.loadEventEnd - timing.loadEventStart,
      firstContentfulPaint: 0, // 需要从PerformanceObserver获取
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0
    };
  }

  private getResourceInfo() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const totalRequests = resources.length;
    const failedRequests = resources.filter(r => r.transferSize === 0).length;
    const avgResponseTime = resources.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const slowRequests = resources.filter(r => r.duration > 1000).length;

    return {
      totalRequests,
      failedRequests,
      avgResponseTime,
      slowRequests
    };
  }

  private getTopErrors(): Array<{ message: string; count: number }> {
    const errorCounts = new Map<string, number>();
    
    this.logBuffer
      .filter(entry => entry.level >= LogLevel.ERROR)
      .forEach(entry => {
        const message = entry.message;
        errorCounts.set(message, (errorCounts.get(message) || 0) + 1);
      });

    return Array.from(errorCounts.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private setupErrorTracking(): void {
    if (!this.config.enableErrorTracking) return;

    // 全局错误处理
    window.addEventListener('error', (event) => {
      this.logError('Global Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      });
    });

    // Promise reject处理
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason);
    });

    // 网络请求错误
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const requestId = this.generateLogId();
      const startTime = Date.now();
      
      try {
        this.requestCount++;
        const response = await originalFetch(...args);
        
        const duration = Date.now() - startTime;
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        
        if (!response.ok) {
          this.failedRequestCount++;
          this.log(LogLevel.WARN, LogCategory.API, 'HTTP request failed', {
            url,
            status: response.status,
            statusText: response.statusText,
            duration,
            requestId
          });
        } else if (duration > 5000) {
          this.log(LogLevel.WARN, LogCategory.API, 'Slow HTTP request', {
            url,
            duration,
            requestId
          });
        }
        
        return response;
      } catch (error) {
        this.failedRequestCount++;
        this.logError('Fetch Error', error, {
          url: typeof args[0] === 'string' ? args[0] : args[0].url,
          duration: Date.now() - startTime,
          requestId
        });
        throw error;
      }
    };
  }

  private setupUserTracking(): void {
    if (!this.config.enableUserTracking) return;

    // 用户交互事件
    ['click', 'keydown', 'scroll', 'resize'].forEach(eventType => {
      window.addEventListener(eventType, () => {
        this.userActionCount++;
      }, { passive: true });
    });

    // 页面可见性变化
    document.addEventListener('visibilitychange', () => {
      this.log(LogLevel.INFO, LogCategory.USER_ACTION, 'Page visibility changed', {
        visible: !document.hidden
      });
    });

    // 页面离开前
    window.addEventListener('beforeunload', () => {
      this.log(LogLevel.INFO, LogCategory.USER_ACTION, 'User leaving page', {
        sessionDuration: Date.now() - this.startTime,
        userActions: this.userActionCount
      });
      this.flushLogs(); // 立即发送日志
    });
  }

  private startLogFlushing(): void {
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, this.config.flushInterval);
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, category: LogCategory, message: string, data?: any, source?: string): void {
    if (level < this.config.logLevel) return;

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      source,
      userId: this.userId,
      sessionId: this.sessionId,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        referrer: document.referrer
      }
    };

    this.addLogEntry(entry);

    if (level >= LogLevel.ERROR) {
      this.errorCount++;
      if (level >= LogLevel.CRITICAL) {
        this.criticalErrorCount++;
      }
    }
  }

  /**
   * 记录错误
   */
  logError(message: string, error: any, context?: any): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level: LogLevel.ERROR,
      category: LogCategory.ERROR,
      message,
      data: {
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        },
        context
      },
      source: 'SystemMonitor',
      userId: this.userId,
      sessionId: this.sessionId,
      stackTrace: error?.stack,
      metadata: {
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    };

    this.addLogEntry(entry);
    this.errorCount++;
  }

  /**
   * 记录用户操作
   */
  logUserAction(action: string, data?: any): void {
    this.userActionCount++;
    this.log(LogLevel.INFO, LogCategory.USER_ACTION, action, data, 'UserAction');
  }

  /**
   * 记录API调用
   */
  logApiCall(url: string, method: string, status: number, duration: number, data?: any): void {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, LogCategory.API, `API ${method} ${url}`, {
      method,
      status,
      duration,
      ...data
    }, 'ApiCall');
  }

  /**
   * 记录数据库操作
   */
  logDatabaseOperation(operation: string, table: string, duration: number, data?: any): void {
    this.log(LogLevel.INFO, LogCategory.DATABASE, `DB ${operation} ${table}`, {
      operation,
      table,
      duration,
      ...data
    }, 'DatabaseOperation');
  }

  private addLogEntry(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // 控制台输出
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // 限制缓冲区大小
    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer.shift();
    }

    // 关键错误立即发送
    if (entry.level >= LogLevel.CRITICAL) {
      this.flushLogs();
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level];
    const message = `[${timestamp}] [${level}] [${entry.category}] ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message, entry.data);
        break;
    }
  }

  private async flushLogs(): Promise<void> {
    if (!this.config.enableRemoteLogging || this.logBuffer.length === 0) return;

    const logs = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await this.sendLogsToServer(logs);
    } catch (error) {
      // 发送失败，重新加入缓冲区
      this.logBuffer.unshift(...logs);
      console.error('Failed to send logs to server:', error);
    }
  }

  private async sendLogsToServer(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    const payload = {
      logs,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      metrics: this.getSystemMetrics()
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  }

  /**
   * 获取系统指标
   */
  getSystemMetrics(): SystemMetrics {
    return {
      timestamp: Date.now(),
      performance: {
        memory: this.getMemoryInfo(),
        timing: this.getTimingInfo(),
        resources: this.getResourceInfo()
      },
      errors: {
        totalErrors: this.errorCount,
        criticalErrors: this.criticalErrorCount,
        errorRate: this.errorCount / Math.max(this.userActionCount, 1),
        topErrors: this.getTopErrors()
      },
      user: {
        activeUsers: 1,
        sessionDuration: Date.now() - this.startTime,
        bounceRate: 0,
        userActions: this.userActionCount
      },
      system: {
        uptime: Date.now() - this.startTime,
        version: import.meta.env.VITE_APP_VERSION || 'unknown',
        environment: import.meta.env.DEV ? 'development' : 'production',
        buildTime: import.meta.env.VITE_APP_BUILD_TIME || 'unknown'
      }
    };
  }

  /**
   * 获取日志
   */
  getLogs(filter?: { level?: LogLevel; category?: LogCategory; limit?: number }): LogEntry[] {
    let logs = [...this.logBuffer];

    if (filter?.level !== undefined) {
      logs = logs.filter(log => log.level >= filter.level!);
    }

    if (filter?.category) {
      logs = logs.filter(log => log.category === filter.category);
    }

    if (filter?.limit) {
      logs = logs.slice(-filter.limit);
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logBuffer = [];
    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'Logs cleared');
  }

  /**
   * 设置用户ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'User ID set', { userId });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MonitorConfig>): void {
    this.config = { ...this.config, ...config };
    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'Configuration updated', { config });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'warning' | 'critical'; issues: string[]; metrics: SystemMetrics }> {
    const metrics = this.getSystemMetrics();
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 检查内存使用
    const memoryUsagePercent = (metrics.performance.memory.used / metrics.performance.memory.limit) * 100;
    if (memoryUsagePercent > 90) {
      issues.push('High memory usage');
      status = 'critical';
    } else if (memoryUsagePercent > 75) {
      issues.push('Elevated memory usage');
      if (status === 'healthy') status = 'warning';
    }

    // 检查错误率
    if (metrics.errors.errorRate > 0.1) {
      issues.push('High error rate');
      status = 'critical';
    } else if (metrics.errors.errorRate > 0.05) {
      issues.push('Elevated error rate');
      if (status === 'healthy') status = 'warning';
    }

    // 检查性能
    if (metrics.performance.resources.avgResponseTime > 5000) {
      issues.push('Slow response times');
      if (status === 'healthy') status = 'warning';
    }

    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'Health check completed', { status, issues });

    return { status, issues, metrics };
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }

    this.flushLogs();
    this.log(LogLevel.INFO, LogCategory.SYSTEM, 'System monitoring destroyed');
  }
}

// 导出监控器实例和相关类型
export default SystemMonitor;
export type { LogEntry, SystemMetrics, MonitorConfig };