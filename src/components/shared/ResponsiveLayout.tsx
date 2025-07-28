import React, { useState, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

// 响应式容器
interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = "xl",
  padding = "md",
  className,
}) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-7xl",
    "2xl": "max-w-2xl",
    full: "max-w-full",
  };

  const paddingClasses = {
    none: "",
    sm: "px-2 py-2",
    md: "px-4 py-6",
    lg: "px-6 py-8",
  };

  return (
    <div
      className={cn(
        "mx-auto w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

// 响应式网格
interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: "sm" | "md" | "lg";
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { default: 1, md: 2, lg: 3 },
  gap = "md",
  className,
}) => {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  const getGridCols = () => {
    const classes = ["grid"];

    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);

    return classes.join(" ");
  };

  return (
    <div className={cn(getGridCols(), gapClasses[gap], className)}>
      {children}
    </div>
  );
};

// 移动端友好的卡片
interface MobileCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  title,
  description,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const isMobile = useIsMobile();

  return (
    <Card className={cn("w-full", className)}>
      {(title || description) && (
        <CardHeader className={cn("pb-3", isMobile && "px-4 py-3")}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <CardTitle
                  className={cn(
                    "text-lg font-semibold",
                    isMobile && "text-base"
                  )}
                >
                  {title}
                </CardTitle>
              )}
              {description && (
                <p
                  className={cn(
                    "text-sm text-gray-600 mt-1",
                    isMobile && "text-xs"
                  )}
                >
                  {description}
                </p>
              )}
            </div>

            {collapsible && isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-2"
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </CardHeader>
      )}

      {(!collapsible || !isMobile || !isCollapsed) && (
        <CardContent className={cn("pt-0", isMobile && "px-4 pb-4")}>
          {children}
        </CardContent>
      )}
    </Card>
  );
};

// 响应式表格包装器
interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  children,
  className,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={cn("w-full", className)}>
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-auto", className)}>{children}</div>
  );
};

// 移动端导航菜单
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* 菜单内容 */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">菜单</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto h-full pb-20">{children}</div>
      </div>
    </>
  );
};

// 响应式按钮组
interface ResponsiveButtonGroupProps {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical" | "auto";
  className?: string;
}

export const ResponsiveButtonGroup: React.FC<ResponsiveButtonGroupProps> = ({
  children,
  orientation = "auto",
  className,
}) => {
  const isMobile = useIsMobile();

  const getOrientation = () => {
    if (orientation === "auto") {
      return isMobile ? "vertical" : "horizontal";
    }
    return orientation;
  };

  const actualOrientation = getOrientation();

  return (
    <div
      className={cn(
        "flex",
        actualOrientation === "vertical"
          ? "flex-col space-y-2"
          : "flex-row space-x-2",
        isMobile && "w-full",
        className
      )}
    >
      {React.Children.map(children, (child, index) => (
        <div
          className={cn(
            isMobile && actualOrientation === "vertical" && "w-full"
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

// 响应式侧边栏
interface ResponsiveSidebarProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  title?: string;
  className?: string;
}

export const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({
  children,
  isOpen,
  onToggle,
  title,
  className,
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileMenu isOpen={isOpen} onClose={onToggle}>
        {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
        {children}
      </MobileMenu>
    );
  }

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-in-out bg-white border-r",
        isOpen ? "w-64" : "w-16",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          {isOpen && title && (
            <h3 className="text-lg font-semibold">{title}</h3>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {isOpen && <div className="space-y-2">{children}</div>}
      </div>
    </div>
  );
};

// 响应式模态框
interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

export const ResponsiveModal: React.FC<ResponsiveModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className,
}) => {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    full: "max-w-full",
  };

  if (isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={onClose}
        />
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-lg max-h-[90vh] overflow-hidden">
            {title && (
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{title}</h2>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            )}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-4rem)]">
              {children}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            "bg-white rounded-lg shadow-lg w-full",
            sizeClasses[size],
            className
          )}
        >
          {title && (
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{title}</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
          <div className="p-6">{children}</div>
        </div>
      </div>
    </>
  );
};
