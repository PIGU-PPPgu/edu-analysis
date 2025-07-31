/**
 * 骨架屏组件
 * Master-Frontend + Master-UX-Experience 协同优化成果
 * 基于 Positivus 设计系统的加载状态
 */

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

// 基础骨架元素
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded-md",
        "bg-gradient-animation",
        className
      )}
      style={{
        backgroundSize: "200% 100%",
        animation: "shimmer 2s infinite ease-in-out",
      }}
    />
  );
};

// Positivus 风格的统计卡片骨架
export const StatCardSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div
      className={cn(
        "border-2 border-black bg-white shadow-[6px_6px_0px_0px_#B9FF66] p-6 space-y-4",
        className
      )}
    >
      {/* 图标和标题行 */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-10 h-10 rounded-full border-2 border-black" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* 主要数值 */}
      <Skeleton className="h-10 w-16" />

      {/* 趋势指示器 */}
      <div className="flex items-center gap-1">
        <Skeleton className="h-6 w-12 rounded-full border-2 border-black" />
      </div>

      {/* 副标题 */}
      <Skeleton className="h-3 w-32" />
    </div>
  );
};

// 图表骨架
export const ChartSkeleton: React.FC<{
  className?: string;
  height?: number;
  title?: string;
}> = ({ className, height = 300, title }) => {
  return (
    <div
      className={cn(
        "border-2 border-black bg-white shadow-[6px_6px_0px_0px_#B9FF66]",
        className
      )}
    >
      {/* 标题栏 */}
      <div className="bg-[#B9FF66] border-b-2 border-black p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          {title ? (
            <span className="text-black font-black">{title}</span>
          ) : (
            <Skeleton className="h-5 w-40" />
          )}
        </div>
      </div>

      {/* 图表区域 */}
      <div className="p-6">
        <div className="flex items-end justify-center gap-2" style={{ height }}>
          {/* 模拟柱状图 */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="w-8 bg-gradient-to-t from-gray-300 to-gray-200"
              style={{
                height: `${Math.random() * 0.7 + 0.3}`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* X轴标签 */}
        <div className="flex justify-between mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-12" />
          ))}
        </div>
      </div>
    </div>
  );
};

// 数据表格骨架
export const TableSkeleton: React.FC<{
  className?: string;
  rows?: number;
  columns?: number;
}> = ({ className, rows = 5, columns = 6 }) => {
  return (
    <div
      className={cn(
        "border-2 border-black bg-white shadow-[6px_6px_0px_0px_#B9FF66]",
        className
      )}
    >
      {/* 表头 */}
      <div className="bg-gray-50 border-b-2 border-black p-4">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>

      {/* 表格行 */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className="h-4 w-full"
                  style={{
                    animationDelay: `${(rowIndex * columns + colIndex) * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 智能加载状态组件
export const IntelligentLoadingState: React.FC<{
  type: "stats" | "chart" | "table" | "analysis";
  title?: string;
  subtitle?: string;
  className?: string;
}> = ({ type, title, subtitle, className }) => {
  const renderSkeleton = () => {
    switch (type) {
      case "stats":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        );

      case "chart":
        return <ChartSkeleton title={title} />;

      case "table":
        return <TableSkeleton />;

      case "analysis":
        return (
          <div className="space-y-6">
            <ChartSkeleton title="分析图表" height={250} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>
        );

      default:
        return <Skeleton className="h-32 w-full" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 加载标题 */}
      {title && (
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-[#191A23]">{title}</h3>
          {subtitle && (
            <p className="text-sm text-[#6B7280] font-medium">{subtitle}</p>
          )}
        </div>
      )}

      {/* 骨架内容 */}
      {renderSkeleton()}

      {/* 智能加载提示 */}
      <div className="flex items-center justify-center space-x-2 py-4">
        <div
          className="w-3 h-3 bg-[#B9FF66] rounded-full animate-bounce border-2 border-black"
          style={{ animationDelay: "0ms" }}
        />
        <div
          className="w-3 h-3 bg-[#B9FF66] rounded-full animate-bounce border-2 border-black"
          style={{ animationDelay: "150ms" }}
        />
        <div
          className="w-3 h-3 bg-[#B9FF66] rounded-full animate-bounce border-2 border-black"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
};

// 添加全局样式
const style = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.bg-gradient-animation {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite ease-in-out;
}
`;

// 注入样式（在实际项目中应该放在CSS文件中）
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = style;
  document.head.appendChild(styleElement);
}
