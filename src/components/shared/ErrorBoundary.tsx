import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 生成错误ID用于追踪
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 调用外部错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 发送错误报告到监控服务（如果配置了）
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // 这里可以集成错误监控服务，如 Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 发送到错误监控服务
    // 例如: Sentry.captureException(error, { extra: errorReport });
    
    // 暂时记录到控制台
    console.error('Error Report:', errorReport);
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorMessage = (error: Error): string => {
    // 根据错误类型返回用户友好的错误信息
    if (error.message.includes('ChunkLoadError')) {
      return '页面资源加载失败，可能是网络问题或版本更新导致的。';
    }
    
    if (error.message.includes('Network')) {
      return '网络连接异常，请检查您的网络连接。';
    }
    
    if (error.message.includes('Permission')) {
      return '权限不足，请联系管理员或重新登录。';
    }
    
    if (error.message.includes('Timeout')) {
      return '请求超时，请稍后重试。';
    }

    return '系统遇到了一个意外错误，我们正在努力修复。';
  };

  private getErrorSuggestions = (error: Error): string[] => {
    const suggestions: string[] = [];
    
    if (error.message.includes('ChunkLoadError')) {
      suggestions.push('刷新页面重新加载资源');
      suggestions.push('清除浏览器缓存后重试');
    } else if (error.message.includes('Network')) {
      suggestions.push('检查网络连接');
      suggestions.push('稍后重试');
    } else {
      suggestions.push('刷新页面重试');
      suggestions.push('返回首页重新开始');
      suggestions.push('如果问题持续，请联系技术支持');
    }
    
    return suggestions;
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error!;
      const errorMessage = this.getErrorMessage(error);
      const suggestions = this.getErrorSuggestions(error);

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-gray-900">
                页面出现错误
              </CardTitle>
              <CardDescription className="text-lg">
                {errorMessage}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* 错误ID */}
              <Alert>
                <AlertDescription className="text-sm text-gray-600">
                  错误ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </AlertDescription>
              </Alert>

              {/* 解决建议 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">解决建议：</h3>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </div>

              {/* 开发环境下显示详细错误信息 */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                    查看详细错误信息 (开发模式)
                  </summary>
                  <div className="mt-3 p-4 bg-gray-100 rounded-lg">
                    <div className="text-sm">
                      <div className="font-semibold text-red-600 mb-2">错误信息:</div>
                      <pre className="whitespace-pre-wrap text-xs text-gray-800 mb-4">
                        {error.message}
                      </pre>
                      
                      <div className="font-semibold text-red-600 mb-2">错误堆栈:</div>
                      <pre className="whitespace-pre-wrap text-xs text-gray-600 mb-4 max-h-40 overflow-y-auto">
                        {error.stack}
                      </pre>
                      
                      {this.state.errorInfo && (
                        <>
                          <div className="font-semibold text-red-600 mb-2">组件堆栈:</div>
                          <pre className="whitespace-pre-wrap text-xs text-gray-600 max-h-40 overflow-y-auto">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </>
                      )}
                    </div>
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 