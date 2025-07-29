/**
 * 🎨 第6周用户体验增强器
 * 提供加载状态、错误处理、交互反馈等UX优化功能
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { useToast } from "../ui/use-toast";
import { cn } from "../../lib/utils";

// 加载状态类型
export type LoadingState = "idle" | "loading" | "success" | "error";

// 错误类型
interface UXError {
  type: "network" | "validation" | "server" | "unknown";
  message: string;
  recoverable: boolean;
  retryFn?: () => void;
}

// UX状态管理
interface UXState {
  loading: LoadingState;
  progress: number;
  error: UXError | null;
  isOnline: boolean;
  retryCount: number;
}

// 加载指示器组件
export const SmartLoadingIndicator: React.FC<{
  loading: boolean;
  progress?: number;
  message?: string;
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots" | "pulse";
}> = ({
  loading,
  progress,
  message = "加载中...",
  size = "md",
  variant = "spinner",
}) => {
  if (!loading) return null;

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const LoadingIcon = () => {
    switch (variant) {
      case "spinner":
        return <Loader2 className={cn("animate-spin", sizeClasses[size])} />;
      case "dots":
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full bg-primary animate-pulse",
                  size === "sm"
                    ? "h-1 w-1"
                    : size === "md"
                      ? "h-2 w-2"
                      : "h-3 w-3"
                )}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );
      case "pulse":
        return (
          <div
            className={cn(
              "rounded-full bg-primary animate-pulse",
              sizeClasses[size]
            )}
          />
        );
      default:
        return <Loader2 className={cn("animate-spin", sizeClasses[size])} />;
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2 p-4">
      <LoadingIcon />
      <p className="text-sm text-muted-foreground">{message}</p>
      {typeof progress === "number" && (
        <div className="w-full max-w-xs">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-center mt-1">{progress.toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
};

// 错误处理组件
export const SmartErrorHandler: React.FC<{
  error: UXError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}> = ({ error, onRetry, onDismiss, className }) => {
  if (!error) return null;

  const getErrorIcon = (type: UXError["type"]) => {
    switch (type) {
      case "network":
        return <WifiOff className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getErrorColor = (type: UXError["type"]) => {
    switch (type) {
      case "validation":
        return "border-yellow-500 bg-yellow-50 text-yellow-800";
      case "network":
        return "border-blue-500 bg-blue-50 text-blue-800";
      default:
        return "border-red-500 bg-red-50 text-red-800";
    }
  };

  return (
    <Alert className={cn(getErrorColor(error.type), className)}>
      <div className="flex items-start space-x-2">
        {getErrorIcon(error.type)}
        <div className="flex-1">
          <AlertDescription>{error.message}</AlertDescription>
          {error.recoverable && (
            <div className="mt-2 space-x-2">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  重试
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  忽略
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
};

// 网络状态监控
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "网络已连接",
        description: "您的网络连接已恢复",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "网络已断开",
        description: "请检查您的网络连接",
        variant: "destructive",
        duration: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  return isOnline;
};

// 智能重试Hook
export const useSmartRetry = (
  asyncFn: () => Promise<any>,
  maxRetries: number = 3,
  retryDelay: number = 1000
) => {
  const [state, setState] = useState<UXState>({
    loading: "idle",
    progress: 0,
    error: null,
    isOnline: navigator.onLine,
    retryCount: 0,
  });

  const isOnline = useNetworkStatus();

  useEffect(() => {
    setState((prev) => ({ ...prev, isOnline }));
  }, [isOnline]);

  const execute = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: "loading",
      error: null,
      progress: 0,
    }));

    const attempt = async (attemptNumber: number): Promise<any> => {
      try {
        // 模拟进度更新
        const progressInterval = setInterval(() => {
          setState((prev) => ({
            ...prev,
            progress: Math.min(90, prev.progress + Math.random() * 10),
          }));
        }, 200);

        const result = await asyncFn();

        clearInterval(progressInterval);
        setState((prev) => ({
          ...prev,
          loading: "success",
          progress: 100,
          retryCount: 0,
        }));

        return result;
      } catch (error: any) {
        if (attemptNumber < maxRetries) {
          // 重试逻辑
          setState((prev) => ({
            ...prev,
            retryCount: attemptNumber,
            progress: 0,
          }));

          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * attemptNumber)
          );
          return attempt(attemptNumber + 1);
        } else {
          // 最终失败
          const uxError: UXError = {
            type:
              error.name === "TypeError" && !isOnline ? "network" : "server",
            message: isOnline
              ? `操作失败: ${error.message}`
              : "网络连接问题，请检查网络后重试",
            recoverable: true,
            retryFn: () => execute(),
          };

          setState((prev) => ({
            ...prev,
            loading: "error",
            error: uxError,
            progress: 0,
            retryCount: maxRetries,
          }));

          throw error;
        }
      }
    };

    return attempt(1);
  }, [asyncFn, maxRetries, retryDelay, isOnline]);

  const reset = useCallback(() => {
    setState({
      loading: "idle",
      progress: 0,
      error: null,
      isOnline: navigator.onLine,
      retryCount: 0,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isRetrying: state.retryCount > 0,
  };
};

// 操作反馈组件
export const ActionFeedback: React.FC<{
  action: () => Promise<any>;
  successMessage?: string;
  errorMessage?: string;
  children: (props: {
    execute: () => void;
    loading: boolean;
    success: boolean;
    error: UXError | null;
  }) => React.ReactNode;
}> = ({
  action,
  successMessage = "操作成功",
  errorMessage = "操作失败",
  children,
}) => {
  const { toast } = useToast();
  const { loading, error, execute: smartExecute } = useSmartRetry(action);
  const [success, setSuccess] = useState(false);

  const execute = useCallback(async () => {
    try {
      setSuccess(false);
      await smartExecute();
      setSuccess(true);
      toast({
        title: successMessage,
        description: "操作已完成",
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: errorMessage,
        description: error?.message || "请稍后重试",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [smartExecute, successMessage, errorMessage, error, toast]);

  return (
    <>
      {children({
        execute,
        loading: loading === "loading",
        success,
        error,
      })}
    </>
  );
};

// 骨架屏组件
export const SkeletonLoader: React.FC<{
  type: "text" | "card" | "table" | "list";
  count?: number;
  className?: string;
}> = ({ type, count = 1, className }) => {
  const Skeleton = ({
    className: skeletonClassName,
  }: {
    className?: string;
  }) => (
    <div className={cn("animate-pulse bg-muted rounded", skeletonClassName)} />
  );

  const renderSkeleton = () => {
    switch (type) {
      case "text":
        return (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        );

      case "card":
        return (
          <div className="border border-muted rounded-lg p-4 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        );

      case "table":
        return (
          <div className="space-y-2">
            <div className="flex space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-4 flex-1" />
              ))}
            </div>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        );

      case "list":
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <Skeleton className="h-20 w-full" />;
    }
  };

  return <div className={className}>{renderSkeleton()}</div>;
};

// 空状态组件
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

// 网络状态指示器
export const NetworkStatusIndicator: React.FC<{ className?: string }> = ({
  className,
}) => {
  const isOnline = useNetworkStatus();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600">在线</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-600">离线</span>
        </>
      )}
    </div>
  );
};
