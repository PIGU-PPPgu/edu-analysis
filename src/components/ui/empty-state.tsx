import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * 空状态组件
 * 用于显示无数据时的友好提示
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}) => {
  const sizeClasses = {
    sm: {
      container: "py-8",
      icon: "h-12 w-12",
      title: "text-lg",
      description: "text-sm",
    },
    md: {
      container: "py-12",
      icon: "h-16 w-16",
      title: "text-xl",
      description: "text-base",
    },
    lg: {
      container: "py-20",
      icon: "h-20 w-20",
      title: "text-2xl",
      description: "text-lg",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100/50",
        currentSize.container,
        className
      )}
    >
      {Icon && (
        <div className="mb-4 p-4 bg-white rounded-full shadow-sm border border-gray-100">
          <Icon className={cn("text-gray-400", currentSize.icon)} />
        </div>
      )}

      <h3 className={cn("font-bold text-gray-900 mb-2", currentSize.title)}>
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-gray-500 mb-6 max-w-md leading-relaxed",
            currentSize.description
          )}
        >
          {description}
        </p>
      )}

      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || "default"}
          className={cn(
            action.variant === "outline"
              ? "bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-700"
              : "bg-[#B9FF66] text-black hover:bg-[#B9FF66]/90 font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          )}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
