import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "dots" | "pulse";
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

/**
 * 统一的加载组件
 * 提供多种加载样式和尺寸选择
 */
export const Loading: React.FC<LoadingProps> = ({
  size = "md",
  variant = "spinner",
  text,
  className,
  fullScreen = false,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const renderSpinner = () => (
    <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "bg-primary rounded-full animate-pulse",
            size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
          )}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: "1s",
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={cn(
        "bg-primary/20 rounded-full animate-pulse",
        sizeClasses[size]
      )}
    />
  );

  const renderVariant = () => {
    switch (variant) {
      case "dots":
        return renderDots();
      case "pulse":
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-2",
        className
      )}
    >
      {renderVariant()}
      {text && (
        <p
          className={cn(
            "text-muted-foreground animate-pulse",
            textSizeClasses[size]
          )}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

/**
 * 页面级加载组件
 */
export const PageLoading: React.FC<{ text?: string }> = ({
  text = "加载中...",
}) => (
  <div className="flex justify-center items-center py-20">
    <Loading size="lg" text={text} />
  </div>
);

/**
 * 卡片级加载组件
 */
export const CardLoading: React.FC<{ text?: string }> = ({ text }) => (
  <div className="flex justify-center items-center py-10">
    <Loading size="md" text={text} />
  </div>
);

/**
 * 按钮级加载组件
 */
export const ButtonLoading: React.FC = () => (
  <Loading size="sm" className="mr-2" />
);

/**
 * 表格行加载骨架
 */
export const TableRowSkeleton: React.FC<{ columns: number }> = ({
  columns,
}) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
      </td>
    ))}
  </tr>
);

/**
 * 卡片加载骨架
 */
export const CardSkeleton: React.FC = () => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
  </div>
);

/**
 * 列表项加载骨架
 */
export const ListItemSkeleton: React.FC = () => (
  <div className="flex items-center space-x-3 p-3">
    <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  </div>
);

export default Loading;
