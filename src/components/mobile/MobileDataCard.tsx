/**
 * 📱 移动端数据卡片组件
 * 提供移动端友好的数据展示替代表格的卡片布局
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSimpleTouch } from "@/hooks/use-touch";
import { useViewport } from "@/hooks/use-viewport";
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Star,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  Calendar,
  BookOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 数据字段类型
export interface DataField {
  key: string;
  label: string;
  value: any;
  type?:
    | "text"
    | "number"
    | "badge"
    | "progress"
    | "trend"
    | "date"
    | "avatar"
    | "action";
  priority?: "high" | "medium" | "low"; // 显示优先级
  format?: (value: any) => string;
  color?: string;
  icon?: React.ReactNode;
}

// 卡片数据接口
export interface CardData {
  id: string | number;
  title?: string;
  subtitle?: string;
  avatar?: string;
  badge?: {
    text: string;
    variant?: "default" | "success" | "warning" | "error" | "info";
  };
  fields: DataField[];
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive";
  }>;
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    status?: string;
    tags?: string[];
  };
}

// 移动端数据卡片属性
export interface MobileDataCardProps {
  data: CardData;
  className?: string;
  variant?: "default" | "compact" | "detailed" | "minimal";
  showActions?: boolean;
  expandable?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onTap?: () => void;
  onLongPress?: () => void;
  maxVisibleFields?: number; // 默认显示的字段数量
}

// Badge 颜色映射
const BADGE_VARIANTS = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

// 渲染不同类型的字段值
const renderFieldValue = (field: DataField): React.ReactNode => {
  const { value, type, format, color, icon } = field;

  if (format) {
    return format(value);
  }

  switch (type) {
    case "badge":
      return (
        <Badge
          variant="outline"
          className={cn(color && `bg-${color}-100 text-${color}-800`)}
        >
          {value}
        </Badge>
      );

    case "progress":
      const percentage = Math.max(0, Math.min(100, value));
      return (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full",
                color ? `bg-${color}-500` : "bg-blue-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium">{percentage}%</span>
        </div>
      );

    case "trend":
      const isPositive = value > 0;
      return (
        <div
          className={cn(
            "flex items-center space-x-1",
            isPositive ? "text-green-600" : "text-red-600"
          )}
        >
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="font-medium">{Math.abs(value)}%</span>
        </div>
      );

    case "date":
      const date = value instanceof Date ? value : new Date(value);
      return (
        <div className="flex items-center space-x-1 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{date.toLocaleDateString()}</span>
        </div>
      );

    case "avatar":
      return (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            {value?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <span>{value}</span>
        </div>
      );

    case "number":
      return (
        <span className={cn("font-mono", color && `text-${color}-600`)}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      );

    default:
      return (
        <span className={cn(color && `text-${color}-600`)}>
          {icon && <span className="mr-1">{icon}</span>}
          {value}
        </span>
      );
  }
};

export const MobileDataCard: React.FC<MobileDataCardProps> = ({
  data,
  className,
  variant = "default",
  showActions = true,
  expandable = true,
  selectable = false,
  selected = false,
  onSelect,
  onTap,
  onLongPress,
  maxVisibleFields = 3,
}) => {
  const { isMobile } = useViewport();
  const [isExpanded, setIsExpanded] = useState(false);

  // 触摸处理
  const { touchHandlers, isPressed } = useSimpleTouch(() => {
    if (onTap) {
      onTap();
    } else if (selectable) {
      onSelect?.(!selected);
    }
  }, onLongPress);

  // 字段按优先级排序
  const sortedFields = [...data.fields].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority || "medium"];
    const bPriority = priorityOrder[b.priority || "medium"];
    return aPriority - bPriority;
  });

  // 显示的字段
  const visibleFields = isExpanded
    ? sortedFields
    : sortedFields.slice(0, maxVisibleFields);

  const hasMoreFields = sortedFields.length > maxVisibleFields;

  // 渲染标题区域
  const renderHeader = () => {
    if (variant === "minimal") return null;

    return (
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {data.title && (
              <h3 className="font-semibold text-lg truncate">{data.title}</h3>
            )}
            {data.subtitle && (
              <p className="text-sm text-gray-600 truncate mt-1">
                {data.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2 ml-3">
            {data.badge && (
              <Badge
                className={BADGE_VARIANTS[data.badge.variant || "default"]}
              >
                {data.badge.text}
              </Badge>
            )}

            {selectable && (
              <div
                className={cn(
                  "w-5 h-5 border-2 rounded border-gray-300 flex items-center justify-center",
                  selected && "bg-blue-600 border-blue-600"
                )}
              >
                {selected && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
    );
  };

  // 渲染字段
  const renderFields = () => {
    if (variant === "compact") {
      // 紧凑模式：水平排列关键字段
      const keyFields = visibleFields.slice(0, 2);
      return (
        <div className="grid grid-cols-2 gap-4">
          {keyFields.map((field) => (
            <div key={field.key} className="text-center">
              <div className="text-sm text-gray-600 mb-1">{field.label}</div>
              <div className="font-medium">{renderFieldValue(field)}</div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {visibleFields.map((field) => (
          <div key={field.key} className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600 min-w-0 flex-1">
              {field.icon && field.icon}
              <span className="truncate">{field.label}</span>
            </div>
            <div className="ml-3 text-right">{renderFieldValue(field)}</div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染操作区域
  const renderActions = () => {
    if (!showActions) return null;

    const hasExpandToggle = expandable && hasMoreFields;
    const hasDropdownActions = data.actions && data.actions.length > 0;

    if (!hasExpandToggle && !hasDropdownActions) return null;

    return (
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
        {hasExpandToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-600 hover:text-blue-700"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                展开 ({sortedFields.length - maxVisibleFields} 项)
              </>
            )}
          </Button>
        )}

        <div className="flex-1" />

        {hasDropdownActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {data.actions?.map((action, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={action.onClick}
                  className={cn(
                    action.variant === "destructive" &&
                      "text-red-600 focus:text-red-600"
                  )}
                >
                  {action.icon && <span className="mr-2">{action.icon}</span>}
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  // 渲染元数据
  const renderMetadata = () => {
    if (!data.metadata || variant === "minimal" || variant === "compact") {
      return null;
    }

    const { status, tags, updatedAt } = data.metadata;

    return (
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 mt-2 border-t border-gray-50">
        <div className="flex items-center space-x-2">
          {status && (
            <span className="px-2 py-1 bg-gray-100 rounded-full">{status}</span>
          )}
          {tags && tags.length > 0 && <span>#{tags[0]}</span>}
        </div>

        {updatedAt && <span>{new Date(updatedAt).toLocaleDateString()}</span>}
      </div>
    );
  };

  const cardClassName = cn(
    "transition-all duration-200 cursor-pointer",
    "hover:shadow-md active:shadow-sm",
    isPressed && "scale-[0.99] shadow-sm",
    selected && "ring-2 ring-blue-500 shadow-md",
    variant === "minimal" && "shadow-none border-0 bg-transparent",
    className
  );

  return (
    <Card className={cardClassName} {...touchHandlers}>
      {renderHeader()}

      <CardContent
        className={cn(
          variant === "minimal" ? "p-4" : "",
          data.title || data.subtitle ? "" : "pt-6"
        )}
      >
        {renderFields()}
        {renderActions()}
        {renderMetadata()}
      </CardContent>
    </Card>
  );
};

// 成绩数据卡片的预设组件
export const GradeDataCard: React.FC<{
  gradeData: {
    id: string;
    name: string;
    student_id: string;
    class_name: string;
    subject: string;
    score: number;
    grade_level?: string;
    exam_name?: string;
    exam_date?: string;
  };
  onSelect?: (selected: boolean) => void;
  selected?: boolean;
}> = ({ gradeData, onSelect, selected }) => {
  // 转换成绩数据为卡片格式
  const cardData: CardData = {
    id: gradeData.id,
    title: gradeData.name,
    subtitle: `${gradeData.student_id} • ${gradeData.class_name}`,
    badge: {
      text: `${gradeData.score}分`,
      variant:
        gradeData.score >= 90
          ? "success"
          : gradeData.score >= 80
            ? "info"
            : gradeData.score >= 60
              ? "warning"
              : "error",
    },
    fields: [
      {
        key: "subject",
        label: "科目",
        value: gradeData.subject,
        icon: <BookOpen className="w-4 h-4" />,
        priority: "high",
      },
      {
        key: "score",
        label: "分数",
        value: gradeData.score,
        type: "number",
        color:
          gradeData.score >= 80
            ? "green"
            : gradeData.score >= 60
              ? "yellow"
              : "red",
        priority: "high",
      },
      ...(gradeData.grade_level
        ? [
            {
              key: "grade_level",
              label: "等级",
              value: gradeData.grade_level,
              type: "badge" as const,
              priority: "medium" as const,
            },
          ]
        : []),
      ...(gradeData.exam_name
        ? [
            {
              key: "exam_name",
              label: "考试",
              value: gradeData.exam_name,
              priority: "medium" as const,
            },
          ]
        : []),
      ...(gradeData.exam_date
        ? [
            {
              key: "exam_date",
              label: "日期",
              value: gradeData.exam_date,
              type: "date" as const,
              priority: "low" as const,
            },
          ]
        : []),
    ],
  };

  return (
    <MobileDataCard
      data={cardData}
      selectable={!!onSelect}
      selected={selected}
      onSelect={onSelect}
      maxVisibleFields={3}
    />
  );
};

// 卡片列表容器
export const MobileCardList: React.FC<{
  children: React.ReactNode;
  className?: string;
  spacing?: "tight" | "normal" | "loose";
}> = ({ children, className, spacing = "normal" }) => {
  const spacingConfig = {
    tight: "space-y-2",
    normal: "space-y-4",
    loose: "space-y-6",
  };

  return (
    <div className={cn("w-full", spacingConfig[spacing], className)}>
      {children}
    </div>
  );
};
