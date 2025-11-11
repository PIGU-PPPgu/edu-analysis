/**
 * 🔥 快速洞察面板
 * 直接呈现最重要的3-5个关键发现，解决"看不到重点"问题
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Target,
  TrendingUp,
  TrendingDown,
  Link2,
  AlertTriangle,
  Award,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickInsightsPanelProps {
  gradeData: any[];
  wideGradeData?: any[];
  statistics?: any;
  className?: string;
}

interface Insight {
  id: string;
  icon: React.ElementType;
  type: "warning" | "success" | "info" | "trend";
  message: string;
  data?: string;
  action?: string;
}

export const QuickInsightsPanel: React.FC<QuickInsightsPanelProps> = ({
  gradeData,
  wideGradeData = [],
  statistics,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // 🧮 计算关键洞察
  const insights = useMemo<Insight[]>(() => {
    const results: Insight[] = [];

    if (!gradeData || gradeData.length === 0) {
      return [
        {
          id: "no-data",
          icon: AlertTriangle,
          type: "warning",
          message: "暂无考试数据，请先选择考试",
          data: "",
        },
      ];
    }

    // 1️⃣ 班级平均分低于阈值预警（关键优先级最高）
    if (wideGradeData.length > 0) {
      // 按班级分组计算平均分
      const classSummary: Record<
        string,
        { totalScore: number; count: number }
      > = {};

      wideGradeData.forEach((record) => {
        if (
          record.class_name &&
          record.total_score !== null &&
          record.total_score !== undefined
        ) {
          if (!classSummary[record.class_name]) {
            classSummary[record.class_name] = { totalScore: 0, count: 0 };
          }
          classSummary[record.class_name].totalScore += parseFloat(
            record.total_score
          );
          classSummary[record.class_name].count += 1;
        }
      });

      const lowPerformingClasses = Object.entries(classSummary)
        .map(([className, data]) => ({
          className,
          avgScore: data.totalScore / data.count,
        }))
        .filter((cls) => cls.avgScore < 75)
        .sort((a, b) => a.avgScore - b.avgScore);

      if (lowPerformingClasses.length > 0) {
        results.push({
          id: "low-class-avg",
          icon: Target,
          type: "warning",
          message: `${lowPerformingClasses.length} 个班级平均分低于75分`,
          data: lowPerformingClasses
            .slice(0, 3)
            .map((cls) => `${cls.className}(${cls.avgScore.toFixed(1)}分)`)
            .join("、"),
          action: "需要重点关注这些班级的教学质量",
        });
      }
    }

    // 2️⃣ 成绩趋势变化（对比上次考试）
    if (statistics?.scoreComparison !== undefined) {
      const comparison = statistics.scoreComparison;
      const absChange = Math.abs(comparison);

      if (absChange >= 3) {
        // 显著变化（≥3分）
        results.push({
          id: "score-trend",
          icon: comparison > 0 ? TrendingUp : TrendingDown,
          type: comparison > 0 ? "success" : "warning",
          message:
            comparison > 0
              ? `整体成绩较上次提升 ${absChange.toFixed(1)} 分`
              : `整体成绩较上次下降 ${absChange.toFixed(1)} 分`,
          data: `当前平均分: ${statistics.totalScoreStats?.avgScore?.toFixed(1) || "N/A"} 分`,
          action:
            comparison > 0
              ? "保持当前教学策略并分享经验"
              : "需要分析原因并调整教学方法",
        });
      }
    }

    // 3️⃣ 科目相关性发现（简化计算）
    if (wideGradeData.length > 20) {
      // 计算数学和物理的相关性
      const mathPhysicsData = wideGradeData
        .filter(
          (r) =>
            r.math_score !== null &&
            r.math_score !== undefined &&
            r.physics_score !== null &&
            r.physics_score !== undefined
        )
        .map((r) => ({
          math: parseFloat(r.math_score),
          physics: parseFloat(r.physics_score),
        }));

      if (mathPhysicsData.length > 10) {
        const correlation = calculateCorrelation(
          mathPhysicsData.map((d) => d.math),
          mathPhysicsData.map((d) => d.physics)
        );

        if (correlation > 0.7) {
          results.push({
            id: "subject-correlation",
            icon: Link2,
            type: "info",
            message: `数学和物理高度相关 (r=${correlation.toFixed(2)})`,
            data: `基于 ${mathPhysicsData.length} 名学生的成绩数据`,
            action: "建议加强跨学科联合教学",
          });
        }
      }
    }

    // 4️⃣ 学困生预警（连续低分学生）
    if (statistics?.atRiskStudents && statistics.atRiskStudents > 0) {
      results.push({
        id: "at-risk-students",
        icon: AlertTriangle,
        type: "warning",
        message: `${statistics.atRiskStudents} 名学生需要个性化辅导`,
        data: `成绩低于及格线，存在学习困难`,
        action: "建议安排一对一辅导或小组补课",
      });
    }

    // 5️⃣ 表现优异班级（高光时刻）
    if (wideGradeData.length > 0) {
      const classSummary: Record<
        string,
        { totalScore: number; count: number }
      > = {};

      wideGradeData.forEach((record) => {
        if (
          record.class_name &&
          record.total_score !== null &&
          record.total_score !== undefined
        ) {
          if (!classSummary[record.class_name]) {
            classSummary[record.class_name] = { totalScore: 0, count: 0 };
          }
          classSummary[record.class_name].totalScore += parseFloat(
            record.total_score
          );
          classSummary[record.class_name].count += 1;
        }
      });

      const topClass = Object.entries(classSummary)
        .map(([className, data]) => ({
          className,
          avgScore: data.totalScore / data.count,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)[0];

      if (topClass && topClass.avgScore >= 80) {
        results.push({
          id: "top-class",
          icon: Award,
          type: "success",
          message: `${topClass.className} 表现优异`,
          data: `平均分: ${topClass.avgScore.toFixed(1)} 分`,
          action: "建议分享该班级的成功教学经验",
        });
      }
    }

    // 如果洞察不足5个，添加一些基础统计信息
    if (results.length < 3 && statistics) {
      if (statistics.totalScoreStats?.passRate) {
        results.push({
          id: "pass-rate",
          icon: BarChart3,
          type: "info",
          message: `整体及格率 ${statistics.totalScoreStats.passRate.toFixed(1)}%`,
          data: `优秀率 ${statistics.totalScoreStats.excellentRate?.toFixed(1) || "N/A"}%`,
        });
      }
    }

    return results.slice(0, 5); // 最多5个洞察
  }, [gradeData, wideGradeData, statistics]);

  // 皮尔逊相关系数计算
  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "warning":
        return "bg-red-50 border-red-300 text-red-800";
      case "success":
        return "bg-[#B9FF66]/20 border-[#B9FF66] text-black";
      case "info":
        return "bg-blue-50 border-blue-300 text-blue-800";
      case "trend":
        return "bg-gray-50 border-gray-300 text-gray-800";
      default:
        return "bg-gray-50 border-gray-300 text-gray-800";
    }
  };

  return (
    <Card
      className={cn(
        "border-2 border-black shadow-[6px_6px_0px_0px_#191A23] transition-all",
        className
      )}
    >
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-black font-black flex items-center gap-3 text-2xl">
            <div className="p-2 bg-white rounded-full border-2 border-black">
              <Target className="w-6 h-6 text-black" />
            </div>
            <span className="uppercase tracking-wide">🔥 快速洞察</span>
            <Badge className="bg-white text-black border-2 border-black font-bold text-xs">
              核心发现
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-2 border-black bg-white hover:bg-gray-50 text-black font-bold shadow-[2px_2px_0px_0px_#191A23] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                展开
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-6 space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">暂无洞察数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div
                    key={insight.id}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all hover:shadow-[2px_2px_0px_0px_#191A23]",
                      getInsightColor(insight.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center">
                          <Icon className="w-4 h-4 text-black" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base">
                            {index + 1}.
                          </span>
                          <p className="font-bold text-base leading-tight">
                            {insight.message}
                          </p>
                        </div>
                        {insight.data && (
                          <p className="text-sm font-medium opacity-80 ml-5">
                            {insight.data}
                          </p>
                        )}
                        {insight.action && (
                          <div className="flex items-start gap-2 ml-5 mt-2">
                            <div className="w-1.5 h-1.5 bg-black rounded-full mt-1.5 flex-shrink-0"></div>
                            <p className="text-sm font-semibold italic">
                              {insight.action}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-4 border-t border-gray-300">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              💡 以上洞察基于当前筛选的{" "}
              <span className="font-bold text-black">
                {wideGradeData.length}
              </span>{" "}
              条成绩记录自动生成，建议结合具体情况制定教学策略
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default QuickInsightsPanel;
