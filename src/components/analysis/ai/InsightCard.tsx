/**
 * AI洞察卡片组件
 * 用于展示单个AI洞察的内容
 */

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Target,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
  Filter,
  Bell,
  Zap,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AIInsight,
  InsightType,
  InsightPriority,
  InsightSentiment,
} from "@/types/aiInsights";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: AIInsight;
  onAction?: (actionId: string, actionData?: any) => void;
  className?: string;
}

// 洞察类型图标映射
const insightIcons: Record<InsightType, React.ElementType> = {
  [InsightType.TREND]: TrendingUp,
  [InsightType.ANOMALY]: AlertTriangle,
  [InsightType.PATTERN]: BarChart3,
  [InsightType.ACHIEVEMENT]: Sparkles,
  [InsightType.WARNING]: AlertTriangle,
  [InsightType.SUGGESTION]: Target,
  [InsightType.COMPARISON]: BarChart3,
};

// 洞察类型颜色映射
const insightColors: Record<InsightType, string> = {
  [InsightType.TREND]: "bg-blue-100 text-blue-800 border-blue-200",
  [InsightType.ANOMALY]: "bg-red-100 text-red-800 border-red-200",
  [InsightType.PATTERN]: "bg-purple-100 text-purple-800 border-purple-200",
  [InsightType.ACHIEVEMENT]: "bg-green-100 text-green-800 border-green-200",
  [InsightType.WARNING]: "bg-orange-100 text-orange-800 border-orange-200",
  [InsightType.SUGGESTION]: "bg-indigo-100 text-indigo-800 border-indigo-200",
  [InsightType.COMPARISON]: "bg-cyan-100 text-cyan-800 border-cyan-200",
};

// 优先级标签
const priorityLabels: Record<
  InsightPriority,
  { label: string; color: string }
> = {
  [InsightPriority.HIGH]: { label: "重要", color: "bg-red-500" },
  [InsightPriority.MEDIUM]: { label: "一般", color: "bg-yellow-500" },
  [InsightPriority.LOW]: { label: "参考", color: "bg-gray-400" },
};

// 情感倾向图标
const sentimentIcons = {
  [InsightSentiment.POSITIVE]: "😊",
  [InsightSentiment.NEUTRAL]: "😐",
  [InsightSentiment.NEGATIVE]: "😟",
};

// 动作类型图标
const actionIcons = {
  navigate: ExternalLink,
  filter: Filter,
  export: Download,
  notify: Bell,
  custom: Zap,
};

export const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onAction,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = insightIcons[insight.type];
  const colorClass = insightColors[insight.type];

  const handleAction = (actionId: string, actionData?: any) => {
    if (onAction) {
      onAction(actionId, actionData);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "overflow-hidden hover:shadow-lg transition-shadow",
          className
        )}
      >
        <div className={cn("p-4 border-l-4", colorClass.split(" ")[2])}>
          {/* 头部 */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3">
              <div className={cn("p-2 rounded-lg", colorClass)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {insight.title}
                  </h3>
                  <span className="text-lg">
                    {sentimentIcons[insight.sentiment]}
                  </span>
                  {insight.priority === InsightPriority.HIGH && (
                    <Badge variant="destructive" className="h-5 text-xs">
                      {priorityLabels[insight.priority].label}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{insight.description}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* 指标展示 */}
          {insight.metric && (
            <div className="flex items-center space-x-4 mb-3">
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-gray-900">
                  {insight.metric.value}
                </span>
                {insight.metric.unit && (
                  <span className="text-sm text-gray-500">
                    {insight.metric.unit}
                  </span>
                )}
              </div>
              {insight.metric.trend && (
                <div className="flex items-center space-x-1">
                  {insight.metric.trend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : insight.metric.trend === "down" ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <span className="h-4 w-4 text-gray-400">→</span>
                  )}
                  {insight.metric.changePercent && (
                    <span
                      className={cn(
                        "text-sm font-medium",
                        insight.metric.trend === "up"
                          ? "text-green-600"
                          : insight.metric.trend === "down"
                            ? "text-red-600"
                            : "text-gray-600"
                      )}
                    >
                      {insight.metric.changePercent > 0 ? "+" : ""}
                      {insight.metric.changePercent}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 置信度指示器 */}
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-xs text-gray-500">置信度</span>
            <div className="flex-1 max-w-[100px]">
              <Progress value={insight.confidence * 100} className="h-2" />
            </div>
            <span className="text-xs text-gray-600">
              {(insight.confidence * 100).toFixed(0)}%
            </span>
          </div>

          {/* 展开内容 */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-gray-200">
                  {/* 详细说明 */}
                  {insight.detail && (
                    <div className="mb-3">
                      <div className="flex items-center space-x-1 mb-1">
                        <Info className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          详细说明
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 pl-5">
                        {insight.detail}
                      </p>
                    </div>
                  )}

                  {/* 影响范围 */}
                  {insight.affectedStudents && (
                    <div className="mb-3">
                      <span className="text-sm text-gray-500">
                        影响学生数：
                        <span className="font-medium text-gray-700 ml-1">
                          {insight.affectedStudents}人
                        </span>
                      </span>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {insight.actions && insight.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {insight.actions.map((action) => {
                        const ActionIcon = actionIcons[action.actionType];
                        return (
                          <Button
                            key={action.id}
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAction(action.id, action.actionData)
                            }
                            className="text-xs"
                          >
                            <ActionIcon className="h-3 w-3 mr-1" />
                            {action.label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};

export default InsightCard;
