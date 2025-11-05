/**
 * LoadingScreen - 统一加载界面组件
 * 用于UnifiedAppContext初始化时的加载状态显示
 */

import React from "react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  progress?: number;
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress = 0,
  title = "加载中...",
  description,
  className,
}) => {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100",
        className
      )}
    >
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="mb-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
        {description && (
          <p className="text-gray-600 mb-4 text-sm">{description}</p>
        )}
        {progress > 0 && (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{Math.round(progress)}%</p>
          </>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
