/**
 * 学情诊断面板
 * 基于增值趋势分析学生学习状态
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Activity,
  Minus,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import type { ValueAddedMetrics } from "@/types/valueAddedTypes";

// 学情诊断状态类型
export type DiagnosisStatus =
  | "steady_improvement"
  | "fluctuating_improvement"
  | "high_stagnation"
  | "fluctuating_decline"
  | "continuous_decline";

// 诊断状态配置
const DIAGNOSIS_CONFIG = {
  steady_improvement: {
    label: "稳步提升",
    icon: TrendingUp,
    style: "bg-[#B9FF66] hover:bg-[#a3e65a] text-[#191A23]",
    suggestion: "保持当前学习节奏，继续巩固优势学科",
  },
  fluctuating_improvement: {
    label: "波动提升",
    icon: Activity,
    style: "bg-[#D1FAE5] hover:bg-[#bbf7d0] text-[#191A23]",
    suggestion: "整体向好，但需关注学习稳定性，减少波动",
  },
  high_stagnation: {
    label: "高分停滞",
    icon: Minus,
    style: "bg-[#FDE047] hover:bg-[#facc15] text-[#191A23]",
    suggestion: "成绩保持高位但缺乏突破，建议尝试更高难度题目",
  },
  fluctuating_decline: {
    label: "波动下滑",
    icon: TrendingDown,
    style: "bg-[#FDBA74] hover:bg-[#fb923c] text-[#191A23]",
    suggestion: "出现退步迹象，需要及时调整学习方法和心态",
  },
  continuous_decline: {
    label: "持续下滑",
    icon: AlertTriangle,
    style: "bg-[#FCA5A5] hover:bg-[#f87171] text-[#191A23]",
    suggestion: "成绩持续下降，建议尽快与老师沟通，制定针对性辅导计划",
  },
};

interface DiagnosticBadgeProps {
  status: DiagnosisStatus;
  className?: string;
}

export const DiagnosticBadge: React.FC<DiagnosticBadgeProps> = ({
  status,
  className,
}) => {
  const { label, icon: Icon, style } = DIAGNOSIS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-2 border-[#191A23] px-3 py-1 gap-2 text-sm font-black shadow-[2px_2px_0px_0px_#191A23]",
        style,
        className
      )}
    >
      <Icon className="w-4 h-4 stroke-[3]" />
      {label}
    </Badge>
  );
};

// 诊断逻辑：根据增值指标判断学习状态
export function diagnoseStudent(metric: ValueAddedMetrics): DiagnosisStatus {
  const { improvementScore, targetExam } = metric;
  const currentScore = targetExam.score;

  // 高分线（假设满分的80%以上为高分）
  const isHighScore = currentScore >= 400; // 可根据实际满分调整

  // 分类逻辑
  if (improvementScore > 20) {
    // 大幅进步
    return "steady_improvement";
  } else if (improvementScore > 5) {
    // 小幅进步
    return "fluctuating_improvement";
  } else if (Math.abs(improvementScore) <= 5) {
    // 持平
    return isHighScore ? "high_stagnation" : "fluctuating_improvement";
  } else if (improvementScore > -20) {
    // 小幅退步
    return "fluctuating_decline";
  } else {
    // 大幅退步
    return "continuous_decline";
  }
}

interface LearningDiagnosisPanelProps {
  metrics: ValueAddedMetrics[];
}

const LearningDiagnosisPanel: React.FC<LearningDiagnosisPanelProps> = ({
  metrics,
}) => {
  // 统计各状态的学生人数
  const statusDistribution = React.useMemo(() => {
    const distribution: Record<DiagnosisStatus, ValueAddedMetrics[]> = {
      steady_improvement: [],
      fluctuating_improvement: [],
      high_stagnation: [],
      fluctuating_decline: [],
      continuous_decline: [],
    };

    metrics.forEach((metric) => {
      const status = diagnoseStudent(metric);
      distribution[status].push(metric);
    });

    return distribution;
  }, [metrics]);

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          学情诊断分析
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {(Object.keys(DIAGNOSIS_CONFIG) as DiagnosisStatus[]).map(
            (status) => {
              const students = statusDistribution[status];
              const count = students.length;
              const percentage =
                metrics.length > 0
                  ? ((count / metrics.length) * 100).toFixed(1)
                  : "0.0";

              if (count === 0) return null;

              const {
                label,
                icon: Icon,
                style,
                suggestion,
              } = DIAGNOSIS_CONFIG[status];

              return (
                <div
                  key={status}
                  className="border-2 border-black p-4 shadow-[2px_2px_0px_0px_#000]"
                >
                  {/* 标题行 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 border-2 border-black", style)}>
                        <Icon className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-black">
                          {label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {count} 人 · 占比 {percentage}%
                        </p>
                      </div>
                    </div>
                    <DiagnosticBadge status={status} />
                  </div>

                  {/* 建议 */}
                  <div className="bg-gray-50 border-l-4 border-[#191A23] p-3 text-sm text-gray-700">
                    <span className="font-bold">建议：</span>
                    {suggestion}
                  </div>

                  {/* 学生列表（最多显示5个） */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {students.slice(0, 5).map((student) => (
                      <Badge
                        key={student.studentId}
                        variant="outline"
                        className="border border-gray-300 text-gray-700"
                      >
                        {student.studentName}
                      </Badge>
                    ))}
                    {students.length > 5 && (
                      <Badge
                        variant="outline"
                        className="border border-gray-300 text-gray-500"
                      >
                        +{students.length - 5} 人
                      </Badge>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* 说明 */}
        <div className="mt-6 text-xs text-gray-500 border-t-2 border-gray-200 pt-4">
          <p className="font-bold mb-2">诊断说明：</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>稳步提升：进步分数大于20分</li>
            <li>波动提升：进步分数在5-20分之间</li>
            <li>高分停滞：分数高位但进步幅度小于5分</li>
            <li>波动下滑：退步分数在-5到-20分之间</li>
            <li>持续下滑：退步分数超过20分</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningDiagnosisPanel;
