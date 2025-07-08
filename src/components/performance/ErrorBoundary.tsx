/**
 * 🚀 高性能错误边界组件
 * 捕获组件错误、性能监控、错误恢复和用户友好提示
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  RotateCcw,
  Bug,
  Download,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Shield,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle
} from 'lucide-react';
import { trackErrorBoundary } from '@/utils/performanceOptimizer';

// 错误信息接口
interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: number;
  componentStack: string;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
  retryCount: number;
}

// 错误边界状态
interface ErrorBoundaryState {
  hasError: boolean;
  errorDetails: ErrorDetails | null;
  showDetails: boolean;
  isRetrying: boolean;
  retryCount: number;
}

// 错误边界属性
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  maxRetries?: number;
  componentName?: string;
  showErrorDetails?: boolean;
  className?: string;
  isolateFailures?: boolean;
}

// 错误恢复策略
type RecoveryStrategy = 'reload' | 'retry' | 'fallback' | 'isolate';

// 错误严重级别
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private errorLogQueue: ErrorDetails[] = [];
  private maxRetries: number;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.maxRetries = props.maxRetries || 3;
    this.state = {
      hasError: false,
      errorDetails: null,
      showDetails: false,
      isRetrying: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails: ErrorDetails = {
      error,
      errorInfo,
      timestamp: Date.now(),
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      buildVersion: this.getBuildVersion(),
      retryCount: this.state.retryCount
    };

    this.setState({
      errorDetails,
      retryCount: this.state.retryCount + 1
    });

    // 添加到错误队列
    this.errorLogQueue.push(errorDetails);

    // 性能监控追踪
    trackErrorBoundary(error, errorInfo, this.props.componentName || 'Unknown');

    // 调用外部错误处理器
    this.props.onError?.(error, errorInfo);

    // 错误严重级别评估
    const severity = this.assessErrorSeverity(error);
    
    // 错误上报
    this.reportError(errorDetails, severity);

    // 自动恢复策略
    if (this.props.enableRecovery && this.state.retryCount < this.maxRetries) {
      this.scheduleRecovery(severity);
    }

    console.error('🚨 ErrorBoundary捕获到错误:', {
      component: this.props.componentName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      severity,
      retryCount: this.state.retryCount
    });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  // 获取用户ID
  private getUserId(): string | undefined {
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }

  // 获取会话ID
  private getSessionId(): string | undefined {
    try {
      return sessionStorage.getItem('sessionId') || undefined;
    } catch {
      return undefined;
    }
  }

  // 获取构建版本
  private getBuildVersion(): string | undefined {
    try {
      return import.meta.env.VITE_APP_VERSION || undefined;
    } catch {
      return undefined;
    }
  }

  // 评估错误严重级别
  private assessErrorSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // 关键错误模式
    if (
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('load chunk failed')
    ) {
      return 'medium';
    }

    // 高优先级错误
    if (
      message.includes('cannot read property') ||
      message.includes('undefined is not a function') ||
      stack.includes('at render')
    ) {
      return 'high';
    }

    // 系统级错误
    if (
      message.includes('memory') ||
      message.includes('security') ||
      message.includes('permission')
    ) {
      return 'critical';
    }

    return 'low';
  }

  // 错误上报
  private async reportError(errorDetails: ErrorDetails, severity: ErrorSeverity) {
    try {
      // 只上报中等以上的错误
      if (severity === 'low') return;

      const reportData = {
        ...errorDetails,
        severity,
        componentName: this.props.componentName,
        errorId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        environment: import.meta.env.DEV ? 'development' : 'production',
        platform: navigator.platform,
        language: navigator.language,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        memory: 'memory' in performance ? (performance as any).memory : undefined
      };

      // 这里应该发送到错误监控服务
      console.log('📊 错误上报数据:', reportData);
      
      // 模拟发送到错误监控服务
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(reportData)
      // });
      
    } catch (reportError) {
      console.error('❌ 错误上报失败:', reportError);
    }
  }

  // 计划恢复策略
  private scheduleRecovery(severity: ErrorSeverity) {
    const strategy = this.selectRecoveryStrategy(severity);
    const delay = this.calculateRecoveryDelay(this.state.retryCount, severity);

    switch (strategy) {
      case 'retry':
        this.retryTimeoutId = setTimeout(() => {
          this.handleRetry();
        }, delay);
        break;
      
      case 'reload':
        this.retryTimeoutId = setTimeout(() => {
          window.location.reload();
        }, delay);
        break;
      
      case 'fallback':
      case 'isolate':
      default:
        // 使用fallback渲染或隔离失败组件
        break;
    }
  }

  // 选择恢复策略
  private selectRecoveryStrategy(severity: ErrorSeverity): RecoveryStrategy {
    if (severity === 'critical') return 'reload';
    if (severity === 'high') return 'retry';
    if (this.props.isolateFailures) return 'isolate';
    return 'fallback';
  }

  // 计算恢复延迟（指数退避）
  private calculateRecoveryDelay(retryCount: number, severity: ErrorSeverity): number {
    const baseDelay = severity === 'critical' ? 5000 : 2000;
    return Math.min(baseDelay * Math.pow(2, retryCount), 30000); // 最大30秒
  }

  // 手动重试
  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('⚠️ 已达到最大重试次数');
      return;
    }

    this.setState({
      isRetrying: true
    });

    // 延迟重置状态，给用户视觉反馈
    setTimeout(() => {
      this.setState({
        hasError: false,
        errorDetails: null,
        isRetrying: false,
        showDetails: false
      });
    }, 1000);
  };

  // 导出错误日志
  private handleExportLogs = () => {
    const logsData = {
      errors: this.errorLogQueue,
      exported_at: new Date().toISOString(),
      component: this.props.componentName,
      session_info: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now()
      }
    };

    const blob = new Blob([JSON.stringify(logsData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 复制错误信息
  private handleCopyError = async () => {
    if (!this.state.errorDetails) return;

    const errorText = `
错误信息: ${this.state.errorDetails.error.message}
组件: ${this.props.componentName || 'Unknown'}
时间: ${new Date(this.state.errorDetails.timestamp).toLocaleString()}
URL: ${this.state.errorDetails.url}
堆栈:
${this.state.errorDetails.error.stack}

组件堆栈:
${this.state.errorDetails.componentStack}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      console.log('✅ 错误信息已复制到剪贴板');
    } catch {
      console.error('❌ 复制失败');
    }
  };

  // 获取错误级别样式
  private getErrorSeverityStyle(severity: ErrorSeverity) {
    const styles = {
      low: 'bg-[#B9FF66] text-black border-[#B9FF66]',
      medium: 'bg-[#F59E0B] text-white border-[#F59E0B]',
      high: 'bg-[#EF4444] text-white border-[#EF4444]',
      critical: 'bg-[#991B1B] text-white border-[#991B1B]'
    };
    return styles[severity];
  }

  render() {
    if (this.state.hasError) {
      const { errorDetails } = this.state;
      const severity = errorDetails ? this.assessErrorSeverity(errorDetails.error) : 'medium';
      
      // 自定义fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 重试中状态
      if (this.state.isRetrying) {
        return (
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#F59E0B] max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-[#F59E0B] border-t-transparent rounded-full mx-auto mb-4" />
              <h3 className="text-xl font-black text-black mb-2">正在恢复...</h3>
              <p className="text-[#6B7280] font-medium">
                系统正在尝试自动恢复，请稍候
              </p>
            </CardContent>
          </Card>
        );
      }

      return (
        <div className={cn("space-y-6 p-6", this.props.className)}>
          {/* 主要错误卡片 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#EF4444] max-w-4xl mx-auto">
            <CardHeader className="bg-[#EF4444] border-b-2 border-black">
              <CardTitle className="text-white font-black flex items-center gap-3">
                <Shield className="w-6 h-6" />
                系统遇到了问题
                <Badge className={cn(
                  "font-bold border-2 border-white",
                  this.getErrorSeverityStyle(severity)
                )}>
                  {severity === 'low' && '轻微'}
                  {severity === 'medium' && '中等'}
                  {severity === 'high' && '严重'}
                  {severity === 'critical' && '关键'}
                </Badge>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              {/* 错误概述 */}
              <Alert className="border-2 border-[#F59E0B] bg-[#F59E0B]/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  <div className="space-y-2">
                    <p className="text-black font-bold">
                      {errorDetails?.error.message || '未知错误'}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-[#6B7280]">
                      <span className="flex items-center gap-1">
                        <Bug className="w-4 h-4" />
                        组件: {this.props.componentName || '未知'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {errorDetails && new Date(errorDetails.timestamp).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        重试: {this.state.retryCount}/{this.maxRetries}
                      </span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              {/* 操作按钮 */}
              <div className="flex flex-wrap items-center gap-3">
                {this.props.enableRecovery && this.state.retryCount < this.maxRetries && (
                  <Button
                    onClick={this.handleRetry}
                    className="bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    尝试恢复
                  </Button>
                )}
                
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold"
                >
                  刷新页面
                </Button>
                
                {this.props.showErrorDetails && (
                  <Button
                    onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                    variant="outline"
                    className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold"
                  >
                    {this.state.showDetails ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        隐藏详情
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        查看详情
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={this.handleCopyError}
                  variant="outline"
                  className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制错误
                </Button>
                
                <Button
                  onClick={this.handleExportLogs}
                  variant="outline"
                  className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出日志
                </Button>
              </div>

              {/* 详细错误信息 */}
              {this.state.showDetails && errorDetails && (
                <Card className="border-2 border-[#6B7280] bg-[#F9F9F9]">
                  <CardHeader className="bg-[#6B7280] border-b-2 border-black">
                    <CardTitle className="text-white font-bold text-lg flex items-center gap-2">
                      <Bug className="w-5 h-5" />
                      错误详情
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-black mb-2">错误堆栈:</h4>
                        <pre className="bg-black text-green-400 p-3 rounded text-xs overflow-auto max-h-40 font-mono">
                          {errorDetails.error.stack}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-black mb-2">组件堆栈:</h4>
                        <pre className="bg-black text-green-400 p-3 rounded text-xs overflow-auto max-h-40 font-mono">
                          {errorDetails.componentStack}
                        </pre>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-bold text-black mb-1">环境信息:</h4>
                          <ul className="space-y-1 text-[#6B7280]">
                            <li>URL: {errorDetails.url}</li>
                            <li>用户代理: {errorDetails.userAgent}</li>
                            <li>构建版本: {errorDetails.buildVersion || 'Unknown'}</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-bold text-black mb-1">会话信息:</h4>
                          <ul className="space-y-1 text-[#6B7280]">
                            <li>用户ID: {errorDetails.userId || 'Anonymous'}</li>
                            <li>会话ID: {errorDetails.sessionId || 'Unknown'}</li>
                            <li>重试次数: {errorDetails.retryCount}</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 提示信息 */}
              <div className="bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg p-4">
                <h4 className="font-bold text-black mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#B9FF66]" />
                  解决建议
                </h4>
                <ul className="space-y-1 text-sm text-[#6B7280] list-disc list-inside">
                  <li>尝试刷新页面或重新加载应用</li>
                  <li>检查网络连接是否正常</li>
                  <li>清除浏览器缓存和Cookie</li>
                  <li>如果问题持续，请联系技术支持</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;