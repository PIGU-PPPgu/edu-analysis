import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Percent,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Award,
  BookOpen,
  BarChart3,
  GraduationCap,
  Sparkles,
  Bot,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";
import {
  calculateBasicStatistics,
  calculateRates,
  groupBy,
  type BasicStatistics,
} from "@/components/analysis/services/calculationUtils";
import { examSpecificPassRateCalculator } from "@/services/examSpecificPassRateCalculator";
import {
  UnifiedDataService,
  type GradeRecord,
} from "@/components/analysis/services/unifiedDataService";
import {
  AIInsightsPanel,
  AIInsightsMini,
} from "@/components/analysis/ai/AIInsightsPanel";

// ============================================================================
// 类型定义
// ============================================================================

export interface StatisticsOverviewProps {
  /** 考试ID（可选，如果未提供将使用当前选择的考试） */
  examId?: string;
  /** 班级筛选（可选） */
  classFilter?: string[];
  /** 科目筛选（可选） */
  subjectFilter?: string[];
  /** 是否显示AI分析结果 */
  showAIAnalysis?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

interface ClassStatistics {
  className: string;
  studentCount: number;
  averageScore: number;
  statistics: BasicStatistics;
  rates: {
    passRate: number;
    goodRate: number;
    excellentRate: number;
  };
}

interface PerformanceLevel {
  level: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据平均分判断整体表现水平（Positivus风格色彩系统）
 */
const getPerformanceLevel = (average: number): PerformanceLevel => {
  if (average >= 90) {
    return {
      level: "优秀",
      color: "bg-[#B9FF66]",
      textColor: "text-[#191A23]",
      bgColor: "bg-[#B9FF66]/20",
      borderColor: "border-[#B9FF66]",
    };
  }
  if (average >= 80) {
    return {
      level: "良好",
      color: "bg-[#B9FF66]",
      textColor: "text-white",
      bgColor: "bg-[#B9FF66]/20",
      borderColor: "border-[#B9FF66]",
    };
  }
  if (average >= 70) {
    return {
      level: "中等",
      color: "bg-[#9C88FF]",
      textColor: "text-white",
      bgColor: "bg-[#9C88FF]/20",
      borderColor: "border-[#9C88FF]",
    };
  }
  if (average >= 60) {
    return {
      level: "及格",
      color: "bg-[#FED7D7]",
      textColor: "text-[#191A23]",
      bgColor: "bg-[#FED7D7]/20",
      borderColor: "border-[#FED7D7]",
    };
  }
  return {
    level: "待提高",
    color: "bg-[#B9FF66]",
    textColor: "text-white",
    bgColor: "bg-[#B9FF66]/20",
    borderColor: "border-[#B9FF66]",
  };
};

/**
 * 格式化数字显示
 */
const formatNumber = (num: number, decimals: number = 1): string => {
  // 处理无效数值
  if (typeof num !== "number" || isNaN(num)) {
    return "0.0";
  }

  return Number(num).toFixed(decimals);
};

/**
 * 格式化百分比显示
 */
const formatPercentage = (num: number): string => {
  // 处理无效数值
  if (typeof num !== "number" || isNaN(num)) {
    return "0.0%";
  }

  return `${formatNumber(num, 1)}%`;
};

// ============================================================================
// 加载状态组件
// ============================================================================

const StatisticsOverviewSkeleton = () => (
  <div className="space-y-6">
    <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black pb-3">
        <div className="w-48 h-6 bg-[#191A23]/20 rounded-lg animate-pulse" />
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-20 h-6 bg-[#191A23]/20 rounded-lg animate-pulse" />
          <div className="w-32 h-6 bg-[#191A23]/20 rounded-lg animate-pulse" />
          <div className="w-24 h-6 bg-[#191A23]/20 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-2 border-black text-center p-4">
              <div className="w-16 h-8 bg-[#191A23]/20 rounded-lg animate-pulse mx-auto mb-2" />
              <div className="w-12 h-4 bg-[#191A23]/20 rounded-lg animate-pulse mx-auto" />
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================================================
// 主组件
// ============================================================================

const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({
  examId,
  classFilter,
  subjectFilter,
  showAIAnalysis = false,
  className = "",
}) => {
  const { filteredGradeData, statistics, loading, error } =
    useModernGradeAnalysis();

  // AI洞察相关状态
  const [showAIInsights, setShowAIInsights] = React.useState(false);
  const [aiInsightsData, setAiInsightsData] = React.useState<any[]>([]);

  // 使用filteredGradeData作为数据源，无需额外过滤

  // 计算整体统计数据
  const overallStatistics = useMemo(() => {
    console.log("📊 StatisticsOverview: 开始计算整体统计数据");
    console.log("📊 filteredGradeData长度:", filteredGradeData?.length || 0);

    if (!filteredGradeData || filteredGradeData.length === 0) {
      console.log("⚠️ StatisticsOverview: 没有数据");
      return {
        statistics: calculateBasicStatistics([]),
        rates: { passRate: 0, goodRate: 0, excellentRate: 0 },
        totalStudents: 0,
        totalRecords: 0,
      };
    }

    // 过滤数据
    let filteredData = filteredGradeData;

    if (classFilter && classFilter.length > 0) {
      filteredData = filteredData.filter((record) =>
        classFilter.includes(record.class_name || "")
      );
    }

    if (subjectFilter && subjectFilter.length > 0) {
      filteredData = filteredData.filter((record) =>
        subjectFilter.includes(record.subject || "")
      );
    }

    console.log("📊 过滤后数据长度:", filteredData.length);

    // 🎯 关键修复：只使用总分记录进行统计
    const totalScoreRecords = filteredData.filter(
      (record) => record.subject === "总分"
    );
    console.log("📊 总分记录数:", totalScoreRecords.length);

    if (totalScoreRecords.length === 0) {
      console.log("⚠️ StatisticsOverview: 没有总分数据");
      return {
        statistics: calculateBasicStatistics([]),
        rates: { passRate: 0, goodRate: 0, excellentRate: 0 },
        totalStudents: 0,
        totalRecords: 0,
      };
    }

    // 提取总分数据
    const totalScores: number[] = [];
    totalScoreRecords.forEach((record) => {
      if (
        typeof record.score === "number" &&
        !isNaN(record.score) &&
        record.score > 0
      ) {
        totalScores.push(record.score);
      }
    });

    console.log("📊 有效总分数量:", totalScores.length);
    console.log("📊 总分样本:", totalScores.slice(0, 5));

    const statistics = calculateBasicStatistics(totalScores);
    // 使用考试特定的及格率配置
    const rates = {
      passRate: examSpecificPassRateCalculator.calculatePassRate(
        totalScores,
        "总分",
        examId
      ),
      goodRate: examSpecificPassRateCalculator.calculatePassRate(
        totalScores,
        "总分",
        examId
      ),
      excellentRate: examSpecificPassRateCalculator.calculateExcellentRate(
        totalScores,
        "总分",
        examId
      ),
    };

    console.log("📊 计算结果 - 平均分:", statistics.average);
    console.log("📊 计算结果 - 及格率:", rates.passRate);

    return {
      statistics,
      rates,
      totalStudents: totalScores.length, // 有总分的学生数量
      totalRecords: filteredData.length,
    };
  }, [filteredGradeData, classFilter, subjectFilter]);

  // 计算班级统计数据
  const classStatistics = useMemo((): ClassStatistics[] => {
    console.log("📊 StatisticsOverview: 开始计算班级统计数据");

    if (!filteredGradeData || filteredGradeData.length === 0) return [];

    // 🎯 关键修复：只使用总分记录
    const totalScoreRecords = filteredGradeData.filter(
      (record) => record.subject === "总分"
    );

    if (totalScoreRecords.length === 0) {
      console.log("⚠️ StatisticsOverview: 班级统计没有总分数据");
      return [];
    }

    // 按班级分组
    const classByName = groupBy(
      totalScoreRecords,
      (record) => record.class_name || "未知班级"
    );

    return Object.entries(classByName)
      .map(([className, records]) => {
        const scores: number[] = [];

        records.forEach((record) => {
          if (
            typeof record.score === "number" &&
            !isNaN(record.score) &&
            record.score > 0
          ) {
            scores.push(record.score);
          }
        });

        console.log(`📊 班级 ${className}: ${scores.length} 个总分记录`);

        const statistics = calculateBasicStatistics(scores);
        // 使用考试特定的及格率配置
        const rates = {
          passRate: examSpecificPassRateCalculator.calculatePassRate(
            scores,
            "总分",
            examId
          ),
          goodRate: examSpecificPassRateCalculator.calculatePassRate(
            scores,
            "总分",
            examId
          ),
          excellentRate: examSpecificPassRateCalculator.calculateExcellentRate(
            scores,
            "总分",
            examId
          ),
        };

        return {
          className,
          studentCount: scores.length,
          averageScore: statistics.average,
          statistics,
          rates,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore); // 按平均分排序
  }, [filteredGradeData]);

  // 计算表现水平
  const performanceLevel = useMemo(
    () => getPerformanceLevel(overallStatistics.statistics.average),
    [overallStatistics.statistics.average]
  );

  // 准备AI洞察数据
  React.useEffect(() => {
    if (filteredGradeData && filteredGradeData.length > 0) {
      // 转换数据格式以供AI分析
      const totalScoreData = filteredGradeData
        .filter((record) => record.subject === "总分")
        .map((record) => ({
          student_id: record.student_id,
          student_name: record.name,
          class_name: record.class_name,
          total_score: record.score,
          exam_id: examId,
        }));
      setAiInsightsData(totalScoreData);
    }
  }, [filteredGradeData, examId]);

  // 加载状态
  if (loading) {
    return <StatisticsOverviewSkeleton />;
  }

  // Positivus风格错误状态
  if (error) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <AlertTriangle className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            加载统计数据失败
          </p>
          <p className="text-[#191A23]/70 font-medium">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // Positivus风格无数据状态
  if (overallStatistics.totalRecords === 0) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <BarChart3 className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            暂无成绩数据
          </p>
          <p className="text-[#191A23]/70 font-medium">
            请先导入成绩数据或调整筛选条件
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Positivus风格整体表现概览卡片 */}
      <Card
        className={`bg-white ${performanceLevel.borderColor} border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]`}
      >
        <CardHeader
          className={`${performanceLevel.bgColor} border-b-2 border-black pb-4`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                整体表现概览
              </CardTitle>
            </div>
            {/* AI洞察按钮 */}
            {showAIAnalysis && aiInsightsData.length > 0 && (
              <Button
                onClick={() => setShowAIInsights(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI 智能分析
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Positivus风格表现水平和基础信息 */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <Badge
                className={`${performanceLevel.color} ${performanceLevel.textColor} border-2 border-black font-black px-4 py-2 shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wide`}
              >
                {performanceLevel.level}
              </Badge>
              <div className="text-lg font-black text-[#191A23]">
                平均分:{" "}
                <span className="text-[#B9FF66]">
                  {formatNumber(overallStatistics.statistics.average)}
                </span>
                分
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 font-bold text-[#191A23]">
              <div className="flex items-center gap-2 bg-[#B9FF66]/20 px-3 py-2 rounded-lg border-2 border-[#B9FF66]">
                <Users className="h-5 w-5 text-[#191A23]" />共{" "}
                {overallStatistics.totalStudents} 名学生
              </div>
              {classStatistics.length > 1 && (
                <div className="flex items-center gap-2 bg-[#B9FF66]/20 px-3 py-2 rounded-lg border-2 border-[#B9FF66]">
                  <GraduationCap className="h-5 w-5 text-[#191A23]" />
                  {classStatistics.length} 个班级
                </div>
              )}
            </div>
          </div>

          {/* Positivus风格关键指标网格 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {formatNumber(overallStatistics.statistics.max)}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-[#B9FF66]" />
                  最高分
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {formatNumber(overallStatistics.statistics.min)}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide flex items-center justify-center gap-1">
                  <TrendingDown className="h-4 w-4 text-[#B9FF66]" />
                  最低分
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {formatPercentage(overallStatistics.rates.passRate)}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide flex items-center justify-center gap-1">
                  <Target className="h-4 w-4 text-[#B9FF66]" />
                  及格率
                </div>
                <div className="w-full bg-[#F3F3F3] rounded-full h-2 mt-3 border border-black">
                  <div
                    className="bg-[#B9FF66] h-full rounded-full transition-all duration-500 border-r border-black"
                    style={{ width: `${overallStatistics.rates.passRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#9C88FF]">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {formatPercentage(overallStatistics.rates.excellentRate)}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide flex items-center justify-center gap-1">
                  <Award className="h-4 w-4 text-[#9C88FF]" />
                  优秀率
                </div>
                <div className="w-full bg-[#F3F3F3] rounded-full h-2 mt-3 border border-black">
                  <div
                    className="bg-[#9C88FF] h-full rounded-full transition-all duration-500 border-r border-black"
                    style={{
                      width: `${overallStatistics.rates.excellentRate}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格班级表现对比 */}
      {classStatistics.length > 1 && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                  班级表现对比
                </CardTitle>
              </div>
              <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] w-fit uppercase tracking-wide">
                {classStatistics.length} 个班级
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {classStatistics.slice(0, 5).map((classData, index) => (
                <Card
                  key={classData.className}
                  className={`border-2 border-black transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] ${
                    index === 0
                      ? "bg-[#B9FF66]/20 shadow-[4px_4px_0px_0px_#B9FF66] hover:shadow-[6px_6px_0px_0px_#B9FF66]"
                      : "bg-[#F3F3F3] shadow-[4px_4px_0px_0px_#191A23] hover:shadow-[6px_6px_0px_0px_#191A23]"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {index === 0 && (
                          <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black">
                            <Award className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <div className="font-black text-[#191A23] text-lg">
                            {classData.className}
                          </div>
                          <div className="font-medium text-[#191A23]/70">
                            {classData.studentCount} 名学生
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="font-black text-[#191A23] text-xl mb-1">
                          {formatNumber(classData.averageScore)}分
                        </div>
                        <Badge className="bg-[#9C88FF] text-white border-2 border-black font-bold">
                          及格率 {formatPercentage(classData.rates.passRate)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {classStatistics.length > 5 && (
                <div className="text-center pt-4">
                  <Button className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide">
                    查看全部 {classStatistics.length} 个班级
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Positivus风格数据质量提示 */}
      {overallStatistics.statistics.standardDeviation > 20 && (
        <Card className="bg-white border-2 border-[#B9FF66] shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 bg-[#B9FF66]/20">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-black text-[#191A23] text-lg mb-2 uppercase tracking-wide">
                  数据质量提示
                </div>
                <p className="font-medium text-[#191A23] leading-relaxed">
                  成绩分布较为分散（标准差:{" "}
                  <span className="font-black text-[#B9FF66]">
                    {formatNumber(
                      overallStatistics.statistics.standardDeviation
                    )}
                  </span>
                  ）， 建议关注学习困难学生的辅导需求。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI洞察对话框 */}
      <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Brain className="h-6 w-6 text-purple-600" />
              AI 智能分析结果
            </DialogTitle>
            <DialogDescription>基于当前数据的深度分析和洞察</DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <AIInsightsPanel
              data={aiInsightsData}
              context={{
                examId: examId,
                className: classFilter?.[0],
              }}
              autoAnalyze={true}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 嵌入式AI洞察提示 */}
      {showAIAnalysis && aiInsightsData.length > 0 && (
        <div className="mt-4">
          <AIInsightsMini
            data={aiInsightsData}
            context={{ examId }}
            onInsightClick={() => setShowAIInsights(true)}
          />
        </div>
      )}
    </div>
  );
};

export default StatisticsOverview;
