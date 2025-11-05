/**
 * 🚀 Master-Frontend: 懒加载回退组件
 * 为React.lazy()提供优雅的加载状态
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LoadingFallbackProps {
  className?: string;
  message?: string;
  variant?: "default" | "minimal" | "skeleton";
}

// Positivus风格加载动画
const PositivusLoader: React.FC = () => (
  <div className="relative">
    {/* 主要加载圆形 */}
    <div className="w-16 h-16 border-4 border-black rounded-full relative">
      <div className="absolute inset-0 border-4 border-[#B9FF66] border-t-transparent rounded-full animate-spin" />
    </div>

    {/* 装饰性小圆点 */}
    <div className="absolute -top-2 -right-2 w-4 h-4 bg-[#B9FF66] border-2 border-black rounded-full animate-bounce" />
    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-[#191A23] border-2 border-black rounded-full animate-pulse" />
  </div>
);

// 骨架屏加载
const SkeletonLoader: React.FC = () => (
  <div className="space-y-4 w-full max-w-md">
    {/* 标题骨架 */}
    <div className="h-8 bg-[#B9FF66]/30 border-2 border-black rounded-lg animate-pulse" />

    {/* 内容骨架 */}
    <div className="space-y-3">
      <div className="h-4 bg-[#6B7280]/30 border-2 border-black rounded animate-pulse" />
      <div className="h-4 bg-[#6B7280]/30 border-2 border-black rounded animate-pulse w-3/4" />
      <div className="h-4 bg-[#6B7280]/30 border-2 border-black rounded animate-pulse w-1/2" />
    </div>

    {/* 按钮骨架 */}
    <div className="flex gap-2">
      <div className="h-10 w-20 bg-[#B9FF66]/30 border-2 border-black rounded-lg animate-pulse" />
      <div className="h-10 w-16 bg-[#6B7280]/30 border-2 border-black rounded-lg animate-pulse" />
    </div>
  </div>
);

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  className,
  message = "页面加载中...",
  variant = "default",
}) => {
  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <PositivusLoader />
      </div>
    );
  }

  if (variant === "skeleton") {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-[400px] p-8",
        className
      )}
    >
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] bg-white">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-6">
          <PositivusLoader />

          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-[#191A23] uppercase tracking-wide">
              {message}
            </h3>
            <p className="text-sm text-[#6B7280] font-medium">
              正在为您准备最佳体验
            </p>
          </div>

          {/* 进度指示点 */}
          <div className="flex space-x-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-[#B9FF66] border border-black rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: "1s",
                }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadingFallback;

// 预设加载组件变体
export const PageLoadingFallback = () => (
  <LoadingFallback message="页面加载中..." />
);

export const ComponentLoadingFallback = () => (
  <LoadingFallback variant="minimal" />
);

export const DataLoadingFallback = () => (
  <LoadingFallback message="数据加载中..." variant="skeleton" />
);
