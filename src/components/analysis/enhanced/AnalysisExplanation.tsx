/**
 * 分析解释组件
 * 为复杂指标提供交互式解释和可视化说明
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  Info,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  BookOpen,
  Lightbulb,
  Eye,
  ArrowRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface MetricExplanation {
  metric: string;
  value: string | number;
  definition: string;
  interpretation: string;
  example?: string;
  visual?: React.ReactNode;
  goodRange?: { min: number; max: number };
  currentStatus?: "excellent" | "good" | "average" | "poor";
  suggestions?: string[];
}

interface AnalysisExplanationProps {
  explanation: MetricExplanation;
  size?: "sm" | "md" | "lg";
  showInline?: boolean;
  className?: string;
}

const statusConfig = {
  excellent: {
    color: "#B9FF66",
    icon: CheckCircle,
    label: "优秀",
  },
  good: {
    color: "#10B981",
    icon: CheckCircle,
    label: "良好",
  },
  average: {
    color: "#F59E0B",
    icon: AlertCircle,
    label: "一般",
  },
  poor: {
    color: "#EF4444",
    icon: XCircle,
    label: "需要关注",
  },
};

export const AnalysisExplanation: React.FC<AnalysisExplanationProps> = ({
  explanation,
  size = "md",
  showInline = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  const currentStatusConfig = explanation.currentStatus
    ? statusConfig[explanation.currentStatus]
    : null;

  const ExplanationContent = () => (
    <div className="space-y-4 p-1">
      {/* 定义 */}
      <div className="space-y-2">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          什么是{explanation.metric}？
        </h4>
        <p className="text-sm text-[#6B7280]">{explanation.definition}</p>
      </div>

      {/* 当前值和状态 */}
      <div className="p-3 bg-[#F8F8F8] rounded-lg border-2 border-black">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">当前值</span>
          <span className="text-2xl font-black">{explanation.value}</span>
        </div>
        {currentStatusConfig && (
          <div className="flex items-center gap-2">
            <currentStatusConfig.icon
              className="h-4 w-4"
              style={{ color: currentStatusConfig.color }}
            />
            <span
              className="text-sm font-bold"
              style={{ color: currentStatusConfig.color }}
            >
              {currentStatusConfig.label}
            </span>
          </div>
        )}
        {explanation.goodRange && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-[#6B7280] mb-1">
              <span>最小值: {explanation.goodRange.min}</span>
              <span>最大值: {explanation.goodRange.max}</span>
            </div>
            <Progress
              value={
                ((Number(explanation.value) - explanation.goodRange.min) /
                  (explanation.goodRange.max - explanation.goodRange.min)) *
                100
              }
              className="h-2"
            />
          </div>
        )}
      </div>

      {/* 解释说明 */}
      <div className="space-y-2">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          如何理解？
        </h4>
        <p className="text-sm text-[#6B7280]">{explanation.interpretation}</p>
      </div>

      {/* 示例 */}
      {explanation.example && (
        <div className="p-3 bg-[#FFF9E6] rounded-lg border-2 border-[#F59E0B]">
          <h4 className="font-bold text-sm flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4" />
            举个例子
          </h4>
          <p className="text-sm text-[#6B7280]">{explanation.example}</p>
        </div>
      )}

      {/* 可视化 */}
      {explanation.visual && (
        <div className="p-3 bg-white rounded-lg border-2 border-black">
          {explanation.visual}
        </div>
      )}

      {/* 建议 */}
      {explanation.suggestions && explanation.suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            改进建议
          </h4>
          <ul className="space-y-1">
            {explanation.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-[#6B7280]"
              >
                <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (showInline) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 p-2 bg-[#F8F8F8] rounded-lg border-2 border-black",
          className
        )}
      >
        <span className="font-semibold text-sm">{explanation.metric}:</span>
        <span className="font-black">{explanation.value}</span>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-[#B9FF66] transition-colors"
            >
              <HelpCircle className={sizeClasses[size]} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-96 border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]"
            side="top"
            align="start"
          >
            <ExplanationContent />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full hover:bg-[#B9FF66] transition-all hover:scale-110",
                  size === "sm" && "h-6 w-6",
                  size === "md" && "h-8 w-8",
                  size === "lg" && "h-10 w-10",
                  className
                )}
              >
                <HelpCircle className={sizeClasses[size]} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-96 border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]"
              side="right"
              align="start"
            >
              <ExplanationContent />
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent>
          <p>点击了解{explanation.metric}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// 预设的常用指标解释
export const commonMetricExplanations: Record<
  string,
  Partial<MetricExplanation>
> = {
  standardDeviation: {
    metric: "标准差",
    definition:
      "标准差是衡量数据分散程度的统计量，表示数据相对于平均值的离散程度。",
    interpretation:
      "标准差越大，说明成绩分布越分散，学生之间的差异越大；标准差越小，说明成绩分布越集中，学生水平较为接近。",
    example:
      "如果平均分是80分，标准差是10分，那么大约68%的学生成绩在70-90分之间。",
    goodRange: { min: 5, max: 15 },
  },
  coefficientOfVariation: {
    metric: "变异系数",
    definition:
      "变异系数是标准差与平均值的比值，用百分比表示，用于比较不同数据集的离散程度。",
    interpretation:
      "变异系数消除了平均值大小的影响，使得不同科目或不同考试之间的成绩分散程度可以直接比较。",
    example:
      "数学平均分90分，标准差9分，变异系数10%；语文平均分80分，标准差8分，变异系数10%。虽然标准差不同，但相对离散程度相同。",
    goodRange: { min: 10, max: 25 },
  },
  skewness: {
    metric: "偏度",
    definition: "偏度衡量数据分布的对称性，反映成绩分布是否偏向高分或低分。",
    interpretation:
      "正偏（>0）表示低分学生较多，负偏（<0）表示高分学生较多，接近0表示分布较为对称。",
    example:
      "偏度为0.8表示有较多学生得分偏低，可能需要加强基础教学；偏度为-0.8表示大部分学生表现良好，但可能缺乏挑战性。",
    goodRange: { min: -0.5, max: 0.5 },
  },
  kurtosis: {
    metric: "峰度",
    definition:
      "峰度描述数据分布的尖锐程度，反映极端值（特别高分或特别低分）出现的频率。",
    interpretation:
      "正峰度表示有更多极端值，成绩分化明显；负峰度表示成绩分布较为平均，极端值较少。",
    example:
      "高峰度可能意味着班级中既有学霸也有学困生，需要分层教学；低峰度说明学生水平较为均衡。",
    goodRange: { min: -1, max: 1 },
  },
  trend: {
    metric: "趋势",
    definition: "趋势反映数据随时间的变化方向和幅度，帮助预测未来表现。",
    interpretation:
      "上升趋势表示进步，下降趋势需要关注，平稳趋势表示状态稳定。",
    example:
      "连续三次考试成绩分别为75、80、85分，呈现明显上升趋势，说明学习方法有效。",
  },
  correlation: {
    metric: "相关性",
    definition: "相关性衡量两个变量之间的线性关系强度，取值范围为-1到1。",
    interpretation:
      "接近1表示强正相关，接近-1表示强负相关，接近0表示无线性相关。",
    example:
      "数学和物理成绩相关性0.8，说明数学好的学生物理也往往较好；语文和数学相关性0.2，说明两科目相对独立。",
    goodRange: { min: -1, max: 1 },
  },
};

export default AnalysisExplanation;
