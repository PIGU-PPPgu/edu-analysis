/**
 * ErrorScreen - 统一错误界面组件
 * 用于UnifiedAppContext初始化失败时的错误状态显示
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorScreenProps {
  error: any;
  onRetry: () => void;
  title?: string;
  description?: string;
  className?: string;
  showErrorDetails?: boolean;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
  error,
  onRetry,
  title = "加载失败",
  description,
  className,
  showErrorDetails = true,
}) => {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center bg-red-50",
        className
      )}
    >
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="text-red-500 text-5xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-4 text-sm">
          {description || error?.message || "发生未知错误"}
        </p>
        <Button onClick={onRetry} className="w-full mb-4" variant="default">
          重试
        </Button>

        {showErrorDetails && error && (
          <details className="mt-4 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700">
              错误详情
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto max-h-32">
              {typeof error === "string"
                ? error
                : JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorScreen;
