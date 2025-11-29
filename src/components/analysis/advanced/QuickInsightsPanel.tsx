/**
 * 🔥 快速洞察面板 - 增强版
 * 展示15-20条关键发现，分类展示，解决"看不到重点"问题
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
  Layers,
  BookOpen,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReportViewer from "@/components/analysis/reports/ReportViewer";

interface QuickInsightsPanelProps {
  gradeData: any[];
  wideGradeData?: any[];
  statistics?: any;
  className?: string;
}

type InsightType = "warning" | "success" | "info" | "trend";
type SeverityType = "high" | "medium" | "low";

interface Insight {
  id: string;
  icon: React.ElementType;
  type: InsightType;
  severity: SeverityType;
  message: string;
  data?: string;
  action?: string;
  relatedChart?: string; // 关联的图表组件
}

interface InsightCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  insights: Insight[];
  defaultOpen: boolean;
}

export const QuickInsightsPanel: React.FC<QuickInsightsPanelProps> = ({
  gradeData,
  wideGradeData = [],
  statistics,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(["core-findings"])
  );

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

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

  // 🧮 计算分类洞察
  const categories = useMemo<InsightCategory[]>(() => {
    if (!gradeData || gradeData.length === 0) {
      return [];
    }

    const coreFindings: Insight[] = [];
    const classAnalysis: Insight[] = [];
    const subjectAnalysis: Insight[] = [];
    const warningsAlerts: Insight[] = [];

    // === 核心发现 ===

    // 1. 整体表现
    if (wideGradeData.length > 0) {
      const totalScores = wideGradeData
        .map((r) => parseFloat(r.total_score))
        .filter((s) => !isNaN(s));

      if (totalScores.length > 0) {
        const avgScore =
          totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
        const passRate =
          (totalScores.filter((s) => s >= 60).length / totalScores.length) *
          100;
        const excellentRate =
          (totalScores.filter((s) => s >= 90).length / totalScores.length) *
          100;

        const performanceType: InsightType =
          passRate >= 85 ? "success" : passRate >= 70 ? "info" : "warning";
        const severity: SeverityType =
          passRate >= 85 ? "low" : passRate >= 70 ? "medium" : "high";

        coreFindings.push({
          id: "overall-performance",
          icon: Activity,
          type: performanceType,
          severity,
          message: `整体表现${passRate >= 85 ? "优秀" : passRate >= 70 ? "良好" : "需改进"}`,
          data: `平均分${avgScore.toFixed(1)}分，及格率${passRate.toFixed(1)}%，优秀率${excellentRate.toFixed(1)}%`,
          relatedChart: "ScoreDistributionChart",
        });
      }
    }

    // 2. 成绩趋势
    if (statistics?.scoreComparison !== undefined) {
      const comparison = statistics.scoreComparison;
      const absChange = Math.abs(comparison);

      if (absChange >= 1) {
        coreFindings.push({
          id: "score-trend",
          icon: comparison > 0 ? TrendingUp : TrendingDown,
          type: comparison > 0 ? "success" : "warning",
          severity: absChange > 5 ? "high" : absChange > 3 ? "medium" : "low",
          message:
            comparison > 0
              ? `整体成绩较上次提升 ${absChange.toFixed(1)} 分`
              : `整体成绩较上次下降 ${absChange.toFixed(1)} 分`,
          data: `当前平均分: ${statistics.totalScoreStats?.avgScore?.toFixed(1) || "N/A"} 分`,
          action:
            comparison > 0
              ? "保持当前教学策略并分享经验"
              : "需要分析原因并调整教学方法",
          relatedChart: "TrendChart",
        });
      }
    }

    // 3. 学困生预警
    if (wideGradeData.length > 0) {
      const failedStudents = wideGradeData.filter(
        (r) => parseFloat(r.total_score) < 60
      );
      if (failedStudents.length > 0) {
        const failureRate =
          (failedStudents.length / wideGradeData.length) * 100;
        coreFindings.push({
          id: "at-risk-students",
          icon: AlertTriangle,
          type: "warning",
          severity:
            failureRate > 20 ? "high" : failureRate > 10 ? "medium" : "low",
          message: `${failedStudents.length} 名学生需要个性化辅导`,
          data: `不及格率 ${failureRate.toFixed(1)}%`,
          action: "建议安排一对一辅导或小组补课",
        });
      }
    }

    // === 班级分析 ===

    if (wideGradeData.length > 0) {
      // 计算班级统计
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

      const classStats = Object.entries(classSummary)
        .map(([className, data]) => ({
          className,
          avgScore: data.totalScore / data.count,
          count: data.count,
        }))
        .sort((a, b) => b.avgScore - a.avgScore);

      if (classStats.length > 0) {
        // 1. 表现最优班级
        const topClass = classStats[0];
        if (topClass.avgScore >= 75) {
          classAnalysis.push({
            id: "top-class",
            icon: Award,
            type: "success",
            severity: "low",
            message: `${topClass.className} 表现最优`,
            data: `平均分 ${topClass.avgScore.toFixed(1)} 分 (${topClass.count}人)`,
            action: "建议分享该班级的成功教学经验",
            relatedChart: "ClassComparisonChart",
          });
        }

        // 2. 表现最差班级
        const bottomClass = classStats[classStats.length - 1];
        if (bottomClass.avgScore < 75) {
          classAnalysis.push({
            id: "bottom-class",
            icon: Target,
            type: "warning",
            severity: bottomClass.avgScore < 65 ? "high" : "medium",
            message: `${bottomClass.className} 需要重点关注`,
            data: `平均分 ${bottomClass.avgScore.toFixed(1)} 分 (${bottomClass.count}人)`,
            action: "需要分析原因并加强教学指导",
            relatedChart: "ClassComparisonChart",
          });
        }

        // 3. 班级差距
        if (classStats.length > 1) {
          const gap = topClass.avgScore - bottomClass.avgScore;
          if (gap > 5) {
            classAnalysis.push({
              id: "class-gap",
              icon: Layers,
              type: gap > 15 ? "warning" : "info",
              severity: gap > 15 ? "high" : gap > 10 ? "medium" : "low",
              message: `班级间差异${gap > 15 ? "显著" : "存在"}`,
              data: `最高与最低班级相差 ${gap.toFixed(1)} 分`,
              action: gap > 15 ? "需要平衡各班级教学质量" : "继续保持均衡发展",
              relatedChart: "ClassComparisonChart",
            });
          }
        }

        // 4. 低于阈值的班级
        const lowPerformingClasses = classStats.filter(
          (cls) => cls.avgScore < 75
        );
        if (lowPerformingClasses.length > 0) {
          classAnalysis.push({
            id: "low-performing-classes",
            icon: AlertCircle,
            type: "warning",
            severity: lowPerformingClasses.length > 2 ? "high" : "medium",
            message: `${lowPerformingClasses.length} 个班级平均分低于75分`,
            data: lowPerformingClasses
              .slice(0, 3)
              .map((cls) => `${cls.className}(${cls.avgScore.toFixed(1)}分)`)
              .join("、"),
            action: "需要重点关注这些班级的教学质量",
            relatedChart: "ClassComparisonChart",
          });
        }

        // 5. 班级人数分布
        const avgClassSize =
          classStats.reduce((sum, cls) => sum + cls.count, 0) /
          classStats.length;
        const imbalancedClasses = classStats.filter(
          (cls) => Math.abs(cls.count - avgClassSize) > avgClassSize * 0.3
        );
        if (imbalancedClasses.length > 0) {
          classAnalysis.push({
            id: "class-size-imbalance",
            icon: Users,
            type: "info",
            severity: "low",
            message: `${imbalancedClasses.length} 个班级人数与平均值差异较大`,
            data: `平均班级人数 ${avgClassSize.toFixed(0)} 人`,
          });
        }
      }
    }

    // === 科目分析 ===

    if (wideGradeData.length > 0) {
      const subjects = [
        { key: "chinese", name: "语文" },
        { key: "math", name: "数学" },
        { key: "english", name: "英语" },
        { key: "physics", name: "物理" },
        { key: "chemistry", name: "化学" },
        { key: "politics", name: "政治" },
        { key: "history", name: "历史" },
        { key: "biology", name: "生物" },
        { key: "geography", name: "地理" },
      ];

      const subjectStats = subjects
        .map((subject) => {
          const scores = wideGradeData
            .map((r) => parseFloat(r[`${subject.key}_score`]))
            .filter((s) => !isNaN(s));

          if (scores.length === 0) return null;

          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          const passRate =
            (scores.filter((s) => s >= 60).length / scores.length) * 100;

          return {
            subject: subject.name,
            key: subject.key,
            avgScore,
            passRate,
          };
        })
        .filter((s) => s !== null);

      if (subjectStats.length > 0) {
        // 1. 最强科目
        const topSubject = subjectStats.reduce((prev, curr) =>
          curr.avgScore > prev.avgScore ? curr : prev
        );
        subjectAnalysis.push({
          id: "top-subject",
          icon: Award,
          type: "success",
          severity: "low",
          message: `${topSubject.subject}表现最好`,
          data: `平均分 ${topSubject.avgScore.toFixed(1)} 分，及格率 ${topSubject.passRate.toFixed(1)}%`,
          relatedChart: "SubjectRadarChart",
        });

        // 2. 最弱科目
        const bottomSubject = subjectStats.reduce((prev, curr) =>
          curr.avgScore < prev.avgScore ? curr : prev
        );
        if (bottomSubject.avgScore < 75) {
          subjectAnalysis.push({
            id: "bottom-subject",
            icon: BookOpen,
            type: "warning",
            severity: bottomSubject.avgScore < 65 ? "high" : "medium",
            message: `${bottomSubject.subject}需要加强`,
            data: `平均分 ${bottomSubject.avgScore.toFixed(1)} 分，及格率 ${bottomSubject.passRate.toFixed(1)}%`,
            action: "建议增加该科目的教学时间和强度",
            relatedChart: "SubjectRadarChart",
          });
        }

        // 3. 科目差距
        const subjectGap = topSubject.avgScore - bottomSubject.avgScore;
        if (subjectGap > 10) {
          subjectAnalysis.push({
            id: "subject-gap",
            icon: BarChart3,
            type: "info",
            severity: subjectGap > 20 ? "high" : "medium",
            message: `科目间差异较大`,
            data: `${topSubject.subject}与${bottomSubject.subject}相差 ${subjectGap.toFixed(1)} 分`,
            action: "建议平衡各科目的教学资源分配",
          });
        }

        // 4. 及格率低的科目
        const lowPassRateSubjects = subjectStats.filter((s) => s.passRate < 70);
        if (lowPassRateSubjects.length > 0) {
          subjectAnalysis.push({
            id: "low-pass-rate-subjects",
            icon: XCircle,
            type: "warning",
            severity: lowPassRateSubjects.length > 2 ? "high" : "medium",
            message: `${lowPassRateSubjects.length} 个科目及格率低于70%`,
            data: lowPassRateSubjects
              .map((s) => `${s.subject}(${s.passRate.toFixed(1)}%)`)
              .join("、"),
            action: "需要针对性加强薄弱科目教学",
          });
        }

        // 5. 学科相关性（数学与物理）
        if (wideGradeData.length > 20) {
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

            if (Math.abs(correlation) > 0.6) {
              subjectAnalysis.push({
                id: "subject-correlation-math-physics",
                icon: Link2,
                type: "info",
                severity: "low",
                message: `数学和物理${correlation > 0 ? "正" : "负"}相关 (r=${correlation.toFixed(2)})`,
                data: `基于 ${mathPhysicsData.length} 名学生的成绩数据`,
                action:
                  correlation > 0
                    ? "建议加强跨学科联合教学"
                    : "需要关注学科教学的独立性",
                relatedChart: "CorrelationMatrix",
              });
            }
          }
        }
      }
    }

    // === 预警和提醒 ===

    // 1. 优秀生培养
    if (wideGradeData.length > 0) {
      const excellentStudents = wideGradeData.filter(
        (r) => parseFloat(r.total_score) >= 90
      );
      if (excellentStudents.length > 0) {
        const excellentRate =
          (excellentStudents.length / wideGradeData.length) * 100;
        warningsAlerts.push({
          id: "excellent-students",
          icon: CheckCircle2,
          type: "success",
          severity: "low",
          message: `${excellentStudents.length} 名优秀生`,
          data: `优秀率 ${excellentRate.toFixed(1)}%`,
          action:
            excellentRate < 10
              ? "建议加强优秀生培养"
              : "继续保持优秀生培养工作",
        });
      }
    }

    // 2. 数据完整性检查
    if (wideGradeData.length > 0) {
      const missingDataCount = wideGradeData.filter(
        (r) => r.total_score === null || r.total_score === undefined
      ).length;
      if (missingDataCount > 0) {
        warningsAlerts.push({
          id: "missing-data",
          icon: AlertTriangle,
          type: "warning",
          severity: "medium",
          message: `${missingDataCount} 条成绩记录缺失`,
          action: "请检查数据完整性",
        });
      }
    }

    // 返回分类
    return [
      {
        id: "core-findings",
        title: "🎯 核心发现",
        icon: Target,
        insights: coreFindings,
        defaultOpen: true,
      },
      {
        id: "class-analysis",
        title: "📊 班级分析",
        icon: Users,
        insights: classAnalysis,
        defaultOpen: false,
      },
      {
        id: "subject-analysis",
        title: "📚 科目分析",
        icon: BookOpen,
        insights: subjectAnalysis,
        defaultOpen: false,
      },
      {
        id: "warnings-alerts",
        title: "⚠️ 预警提醒",
        icon: AlertTriangle,
        insights: warningsAlerts,
        defaultOpen: false,
      },
    ].filter((category) => category.insights.length > 0);
  }, [gradeData, wideGradeData, statistics]);

  const totalInsights = categories.reduce(
    (sum, cat) => sum + cat.insights.length,
    0
  );

  const getInsightColor = (type: InsightType) => {
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

  const getSeverityBadge = (severity: SeverityType) => {
    switch (severity) {
      case "high":
        return (
          <Badge className="bg-red-500 text-white border-0 text-xs">
            🔴 高
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-500 text-white border-0 text-xs">
            🟡 中
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-green-500 text-white border-0 text-xs">
            🟢 低
          </Badge>
        );
    }
  };

  return (
    <>
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
                {totalInsights} 条发现
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReportDialog(true)}
                className="border-2 border-black bg-white hover:bg-[#B9FF66] text-black font-bold shadow-[2px_2px_0px_0px_#191A23] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
              >
                <FileText className="w-4 h-4 mr-1" />
                完整报告
              </Button>
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
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="p-6 space-y-4">
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">暂无考试数据，请先选择考试</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => {
                  const CategoryIcon = category.icon;
                  const isOpen = openCategories.has(category.id);

                  return (
                    <Collapsible
                      key={category.id}
                      open={isOpen}
                      onOpenChange={() => toggleCategory(category.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between border-2 border-black bg-white hover:bg-gray-50 font-bold shadow-[2px_2px_0px_0px_#191A23] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <CategoryIcon className="w-5 h-5" />
                            <span className="text-base">{category.title}</span>
                            <Badge variant="secondary" className="font-bold">
                              {category.insights.length}
                            </Badge>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="mt-3 space-y-3">
                        {category.insights.map((insight, index) => {
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
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-base">
                                      {index + 1}.
                                    </span>
                                    <p className="font-bold text-base leading-tight flex-1">
                                      {insight.message}
                                    </p>
                                    {getSeverityBadge(insight.severity)}
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
                                  {insight.relatedChart && (
                                    <p className="text-xs text-gray-500 ml-5 mt-1">
                                      💡 相关图表: {insight.relatedChart}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-gray-300">
              <p className="text-xs text-gray-600 text-center leading-relaxed">
                💡 以上{" "}
                <span className="font-bold text-black">{totalInsights}</span>{" "}
                条洞察基于当前筛选的{" "}
                <span className="font-bold text-black">
                  {wideGradeData.length}
                </span>{" "}
                条成绩记录自动生成，建议结合具体情况制定教学策略
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 完整报告对话框 */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 border-2 border-black shadow-[6px_6px_0px_0px_#191A23]">
          <ReportViewer onClose={() => setShowReportDialog(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickInsightsPanel;
