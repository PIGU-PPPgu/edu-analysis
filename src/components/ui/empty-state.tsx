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
        "flex flex-col items-center justify-center text-center",
        currentSize.container,
        className
      )}
    >
      {Icon && (
        <div className="mb-4">
          <Icon className={cn("text-muted-foreground/50", currentSize.icon)} />
        </div>
      )}

      <h3 className={cn("font-semibold text-gray-900 mb-2", currentSize.title)}>
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            "text-muted-foreground mb-6 max-w-md",
            currentSize.description
          )}
        >
          {description}
        </p>
      )}

      {action && (
        <Button onClick={action.onClick} variant={action.variant || "default"}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
