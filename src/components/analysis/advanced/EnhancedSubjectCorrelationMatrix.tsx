import React, { useMemo, memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Grid,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Download,
  BarChart3,
  Zap,
  Filter,
  Eye,
} from "lucide-react";

// Wide-table数据接口（基于新的grade_data表结构）
interface WideGradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  chinese_score?: number;
  chinese_grade?: string;
  math_score?: number;
  math_grade?: string;
  english_score?: number;
  english_grade?: string;
  physics_score?: number;
  physics_grade?: string;
  chemistry_score?: number;
  chemistry_grade?: string;
  biology_score?: number;
  biology_grade?: string;
  history_score?: number;
  history_grade?: string;
  geography_score?: number;
  geography_grade?: string;
  politics_score?: number;
  politics_grade?: string;
  total_score?: number;
  class_rank?: number;
  grade_rank?: number;
  school_rank?: number;
  exam_id?: string;
  exam_title?: string;
  exam_date?: string;
}

interface EnhancedCorrelationData {
  subject1: string;
  subject2: string;
  correlation: number;
  pValue: number;
  sampleSize: number;
  significance: "high" | "medium" | "low" | "none";
  covariance: number;
  meanScore1: number;
  meanScore2: number;
  stdDev1: number;
  stdDev2: number;
  confidence95Lower: number;
  confidence95Upper: number;
}

interface EnhancedSubjectCorrelationMatrixProps {
  gradeData: WideGradeRecord[];
  title?: string;
  className?: string;
  showHeatMap?: boolean;
  filterSignificance?: "all" | "significant" | "strong";
}

// 科目配置 - Wide-table原生支持
const SUBJECT_CONFIG = {
  语文: {
    scoreField: "chinese_score",
    gradeField: "chinese_grade",
    color: "#6B7280",
  },
  数学: {
    scoreField: "math_score",
    gradeField: "math_grade",
    color: "#000000",
  },
  英语: {
    scoreField: "english_score",
    gradeField: "english_grade",
    color: "#6B7280",
  },
  物理: {
    scoreField: "physics_score",
    gradeField: "physics_grade",
    color: "#191A23",
  },
  化学: {
    scoreField: "chemistry_score",
    gradeField: "chemistry_grade",
    color: "#6B7280",
  },
  生物: {
    scoreField: "biology_score",
    gradeField: "biology_grade",
    color: "#000000",
  },
  历史: {
    scoreField: "history_score",
    gradeField: "history_grade",
    color: "#6B7280",
  },
  地理: {
    scoreField: "geography_score",
    gradeField: "geography_grade",
    color: "#191A23",
  },
  政治: {
    scoreField: "politics_score",
    gradeField: "politics_grade",
    color: "#6B7280",
  },
} as const;

// 高级皮尔逊相关系数计算（包含置信区间）
const calculateAdvancedCorrelation = (
  x: number[],
  y: number[]
): Omit<EnhancedCorrelationData, "subject1" | "subject2"> => {
  if (x.length !== y.length || x.length < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: 0,
      significance: "none",
      covariance: 0,
      meanScore1: 0,
      meanScore2: 0,
      stdDev1: 0,
      stdDev2: 0,
      confidence95Lower: 0,
      confidence95Upper: 0,
    };
  }

  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  // 计算方差和协方差
  let sumXX = 0,
    sumYY = 0,
    sumXY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXX += dx * dx;
    sumYY += dy * dy;
    sumXY += dx * dy;
  }

  const varX = sumXX / (n - 1);
  const varY = sumYY / (n - 1);
  const covariance = sumXY / (n - 1);
  const stdDevX = Math.sqrt(varX);
  const stdDevY = Math.sqrt(varY);

  const correlation =
    stdDevX * stdDevY === 0 ? 0 : covariance / (stdDevX * stdDevY);

  // Fisher's Z transformation for confidence interval
  const fisherZ = 0.5 * Math.log((1 + correlation) / (1 - correlation));
  const seZ = 1 / Math.sqrt(n - 3);
  const zCritical = 1.96; // 95% confidence

  const zLower = fisherZ - zCritical * seZ;
  const zUpper = fisherZ + zCritical * seZ;

  const confidence95Lower =
    (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
  const confidence95Upper =
    (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);

  // t-test for p-value
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const df = n - 2;
  let pValue = 1;

  if (df > 0 && !isNaN(t) && isFinite(t)) {
    // 简化的t分布p值近似
    const absT = Math.abs(t);
    if (absT > 3) pValue = 0.001;
    else if (absT > 2.576) pValue = 0.01;
    else if (absT > 1.96) pValue = 0.05;
    else if (absT > 1.645) pValue = 0.1;
    else pValue = 0.2;
  }

  const getSignificance = (): "high" | "medium" | "low" | "none" => {
    const absCorr = Math.abs(correlation);
    if (pValue > 0.05) return "none";
    if (absCorr >= 0.7) return "high";
    if (absCorr >= 0.4) return "medium";
    if (absCorr >= 0.2) return "low";
    return "none";
  };

  return {
    correlation,
    pValue,
    sampleSize: n,
    significance: getSignificance(),
    covariance,
    meanScore1: meanX,
    meanScore2: meanY,
    stdDev1: stdDevX,
    stdDev2: stdDevY,
    confidence95Lower,
    confidence95Upper,
  };
};

// Wide-table专用相关性矩阵计算（性能优化）
const calculateWideTableCorrelationMatrix = (
  gradeData: WideGradeRecord[]
): EnhancedCorrelationData[] => {
  const subjects = Object.keys(SUBJECT_CONFIG) as Array<
    keyof typeof SUBJECT_CONFIG
  >;
  const correlations: EnhancedCorrelationData[] = [];

  // 预处理数据 - 为每个科目提取有效分数
  const subjectScores = subjects.reduce(
    (acc, subject) => {
      const scoreField = SUBJECT_CONFIG[subject]
        .scoreField as keyof WideGradeRecord;
      const scores = gradeData
        .map((record) => ({
          studentId: record.student_id,
          score: record[scoreField] as number | undefined,
        }))
        .filter(
          (item) =>
            item.score !== null &&
            item.score !== undefined &&
            !isNaN(item.score)
        )
        .map((item) => ({ studentId: item.studentId, score: item.score! }));

      acc[subject] = scores;
      return acc;
    },
    {} as Record<string, Array<{ studentId: string; score: number }>>
  );

  // 计算每对科目的相关性（Wide-table优势：一次性处理所有科目）
  for (let i = 0; i < subjects.length; i++) {
    for (let j = i + 1; j < subjects.length; j++) {
      const subject1 = subjects[i];
      const subject2 = subjects[j];

      const scores1Map = new Map(
        subjectScores[subject1].map((item) => [item.studentId, item.score])
      );
      const scores2Map = new Map(
        subjectScores[subject2].map((item) => [item.studentId, item.score])
      );

      // 找到同时有两个科目成绩的学生
      const commonStudentIds = Array.from(scores1Map.keys()).filter((id) =>
        scores2Map.has(id)
      );

      if (commonStudentIds.length < 3) continue;

      const scores1 = commonStudentIds.map((id) => scores1Map.get(id)!);
      const scores2 = commonStudentIds.map((id) => scores2Map.get(id)!);

      const analysis = calculateAdvancedCorrelation(scores1, scores2);

      correlations.push({
        subject1,
        subject2,
        ...analysis,
      });
    }
  }

  return correlations.sort(
    (a, b) => Math.abs(b.correlation) - Math.abs(a.correlation)
  );
};

// 获取相关性颜色和样式 - 使用4色系统
const getCorrelationStyle = (correlation: number, significance: string) => {
  if (significance === "none") {
    return {
      bg: "bg-white",
      text: "text-[#6B7280]",
      border: "border-[#6B7280]",
      intensity: "low",
    };
  }

  const absCorr = Math.abs(correlation);
  const isPositive = correlation > 0;

  if (isPositive) {
    if (absCorr >= 0.7)
      return {
        bg: "bg-[#B9FF66]",
        text: "text-[#191A23]",
        border: "border-black",
        intensity: "high",
      };
    if (absCorr >= 0.4)
      return {
        bg: "bg-[#B9FF66]/70",
        text: "text-[#191A23]",
        border: "border-black",
        intensity: "medium",
      };
    return {
      bg: "bg-[#B9FF66]/40",
      text: "text-[#191A23]",
      border: "border-black",
      intensity: "low",
    };
  } else {
    if (absCorr >= 0.7)
      return {
        bg: "bg-[#6B7280]",
        text: "text-white",
        border: "border-black",
        intensity: "high",
      };
    if (absCorr >= 0.4)
      return {
        bg: "bg-[#6B7280]/70",
        text: "text-white",
        border: "border-black",
        intensity: "medium",
      };
    return {
      bg: "bg-[#6B7280]/40",
      text: "text-[#191A23]",
      border: "border-black",
      intensity: "low",
    };
  }
};

const EnhancedSubjectCorrelationMatrix: React.FC<
  EnhancedSubjectCorrelationMatrixProps
> = ({
  gradeData,
  title = "增强版科目相关性矩阵",
  className = "",
  showHeatMap = true,
  filterSignificance = "all",
}) => {
  // 🆕 分页状态管理
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(6); // 每页显示6个相关性分析结果

  const correlations = useMemo(
    () => calculateWideTableCorrelationMatrix(gradeData),
    [gradeData]
  );

  const filteredCorrelations = useMemo(() => {
    switch (filterSignificance) {
      case "significant":
        return correlations.filter((c) => c.pValue <= 0.05);
      case "strong":
        return correlations.filter((c) => c.significance === "high");
      default:
        return correlations;
    }
  }, [correlations, filterSignificance]);

  // 🆕 分页数据计算
  const totalPages = Math.ceil(filteredCorrelations.length / pageSize);
  const paginatedCorrelations = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return filteredCorrelations.slice(startIndex, startIndex + pageSize);
  }, [filteredCorrelations, currentPage, pageSize]);

  // 🆕 重置页面当筛选条件变化时
  useEffect(() => {
    setCurrentPage(0);
  }, [filterSignificance]);

  const availableSubjects = useMemo(() => {
    const subjectSet = new Set<string>();
    correlations.forEach((corr) => {
      subjectSet.add(corr.subject1);
      subjectSet.add(corr.subject2);
    });
    return Array.from(subjectSet);
  }, [correlations]);

  const strongCorrelations = correlations.filter(
    (c) => c.significance === "high"
  );
  const averageCorrelation =
    correlations.length > 0
      ? correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) /
        correlations.length
      : 0;

  // 导出增强数据
  const handleExportData = () => {
    const csvContent = [
      [
        "科目1",
        "科目2",
        "相关系数",
        "置信区间下限",
        "置信区间上限",
        "P值",
        "样本量",
        "显著性",
        "协方差",
        "科目1均分",
        "科目2均分",
        "科目1标准差",
        "科目2标准差",
      ],
      ...filteredCorrelations.map((c) => [
        c.subject1,
        c.subject2,
        c.correlation.toFixed(4),
        c.confidence95Lower.toFixed(4),
        c.confidence95Upper.toFixed(4),
        c.pValue.toFixed(4),
        c.sampleSize.toString(),
        c.significance === "high"
          ? "强相关"
          : c.significance === "medium"
            ? "中等相关"
            : c.significance === "low"
              ? "弱相关"
              : "无显著相关",
        c.covariance.toFixed(4),
        c.meanScore1.toFixed(2),
        c.meanScore2.toFixed(2),
        c.stdDev1.toFixed(2),
        c.stdDev2.toFixed(2),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "增强版科目相关性矩阵.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (availableSubjects.length < 2) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#F7931E] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#F7931E] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <Grid className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            数据不足
          </p>
          <p className="text-[#191A23]/70 font-medium">
            需要至少2个科目的成绩数据进行相关性分析
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Positivus风格标题和控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                  {title}
                </CardTitle>
                <p className="text-[#191A23]/80 font-medium mt-1">
                  分析 {availableSubjects.length} 个科目 |{" "}
                  {filteredCorrelations.length} 个科目对 | 平均相关性{" "}
                  {averageCorrelation.toFixed(3)}
                  {totalPages > 1 && ` | 第${currentPage + 1}/${totalPages}页`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge className="bg-[#6B7280] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wide">
                <TrendingUp className="h-4 w-4 mr-2" />
                强相关 {strongCorrelations.length} 对
              </Badge>
              <Button
                onClick={handleExportData}
                className="border-2 border-black bg-[#191A23] hover:bg-[#0F1015] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
              >
                <Download className="h-4 w-4 mr-2" />
                导出增强数据
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 增强版统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {availableSubjects.length}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              分析科目数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {filteredCorrelations.length}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              分析科目对
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {strongCorrelations.length}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              强相关对数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {averageCorrelation.toFixed(3)}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              平均相关性
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-2xl font-black text-[#191A23] mb-2">95%</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              置信区间
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 增强版相关性矩阵详情 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
        <CardHeader className="bg-[#6B7280] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            增强版相关性分析矩阵
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* 🆕 分页控制区域 */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg">
                <div>
                  <p className="text-sm font-bold text-[#191A23]">
                    显示 {currentPage * pageSize + 1} -{" "}
                    {Math.min(
                      (currentPage + 1) * pageSize,
                      filteredCorrelations.length
                    )}{" "}
                    / {filteredCorrelations.length} 个科目对
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none disabled:shadow-[2px_2px_0px_0px_#191A23]"
                  >
                    上一页
                  </Button>
                  <span className="text-sm font-bold text-[#191A23] min-w-[4rem] text-center">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                    }
                    disabled={currentPage >= totalPages - 1}
                    className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none disabled:shadow-[2px_2px_0px_0px_#191A23]"
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}

            {paginatedCorrelations.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-[#6B7280] rounded-full border-2 border-black mx-auto mb-6 w-fit">
                  <Filter className="h-12 w-12 text-white" />
                </div>
                <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">
                  当前筛选条件下暂无数据
                </p>
                <p className="text-[#191A23]/70 font-medium">
                  请调整筛选条件或检查数据完整性
                </p>
              </div>
            ) : (
              paginatedCorrelations.map((corr, index) => {
                const style = getCorrelationStyle(
                  corr.correlation,
                  corr.significance
                );
                return (
                  <Card
                    key={index}
                    className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#191A23]"
                  >
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 基础信息 */}
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 rounded-full border-2 border-black ${
                              corr.correlation > 0.1
                                ? "bg-[#B9FF66]"
                                : corr.correlation < -0.1
                                  ? "bg-[#6B7280]"
                                  : "bg-white"
                            }`}
                          >
                            {corr.correlation > 0.1 ? (
                              <TrendingUp className="w-6 h-6 text-[#191A23]" />
                            ) : corr.correlation < -0.1 ? (
                              <TrendingDown className="w-6 h-6 text-white" />
                            ) : (
                              <Minus className="w-6 h-6 text-[#191A23]" />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-[#191A23] text-xl mb-1">
                              {corr.subject1} ↔ {corr.subject2}
                            </p>
                            <div className="flex items-center gap-2">
                              <div
                                className={`px-3 py-1 rounded-lg text-lg font-black shadow-[2px_2px_0px_0px_#191A23] border-2 ${style.border} ${style.bg} ${style.text}`}
                              >
                                {corr.correlation.toFixed(3)}
                              </div>
                              <Badge
                                className={`font-bold shadow-[2px_2px_0px_0px_#191A23] border-2 border-black ${
                                  corr.significance === "high"
                                    ? "bg-[#B9FF66] text-[#191A23]"
                                    : corr.significance === "medium"
                                      ? "bg-[#6B7280] text-white"
                                      : corr.significance === "low"
                                        ? "bg-[#6B7280] text-white"
                                        : "bg-[#6B7280] text-white"
                                }`}
                              >
                                {corr.significance === "high"
                                  ? "强相关"
                                  : corr.significance === "medium"
                                    ? "中等相关"
                                    : corr.significance === "low"
                                      ? "弱相关"
                                      : "无显著相关"}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* 统计详情 */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg">
                            <p className="font-bold text-[#191A23] mb-1">
                              统计检验
                            </p>
                            <p className="text-[#191A23]/80">
                              p值: {corr.pValue.toFixed(4)}
                            </p>
                            <p className="text-[#191A23]/80">
                              样本: {corr.sampleSize}名学生
                            </p>
                          </div>
                          <div className="p-3 bg-white border-2 border-[#6B7280] rounded-lg">
                            <p className="font-bold text-[#191A23] mb-1">
                              置信区间
                            </p>
                            <p className="text-[#191A23]/80">
                              下限: {corr.confidence95Lower.toFixed(3)}
                            </p>
                            <p className="text-[#191A23]/80">
                              上限: {corr.confidence95Upper.toFixed(3)}
                            </p>
                          </div>
                        </div>

                        {/* 描述性统计 */}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="p-3 bg-white border-2 border-[#6B7280] rounded-lg">
                            <p className="font-bold text-[#191A23] mb-1">
                              {corr.subject1}
                            </p>
                            <p className="text-[#191A23]/80">
                              均分: {corr.meanScore1.toFixed(1)}
                            </p>
                            <p className="text-[#191A23]/80">
                              标准差: {corr.stdDev1.toFixed(1)}
                            </p>
                          </div>
                          <div className="p-3 bg-white border-2 border-[#6B7280] rounded-lg">
                            <p className="font-bold text-[#191A23] mb-1">
                              {corr.subject2}
                            </p>
                            <p className="text-[#191A23]/80">
                              均分: {corr.meanScore2.toFixed(1)}
                            </p>
                            <p className="text-[#191A23]/80">
                              标准差: {corr.stdDev2.toFixed(1)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 智能洞察分析 */}
      {strongCorrelations.length > 0 && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
              <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                <Eye className="h-5 w-5 text-white" />
              </div>
              智能洞察与教学建议
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {strongCorrelations.slice(0, 3).map((corr, index) => (
                <Card
                  key={index}
                  className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]"
                >
                  <CardContent className="p-6 bg-[#B9FF66]/20">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <p className="font-black text-[#191A23] text-xl mb-3">
                          {corr.subject1} 与 {corr.subject2} 强
                          {corr.correlation > 0 ? "正" : "负"}相关
                        </p>
                        <p className="font-medium text-[#191A23] leading-relaxed mb-3">
                          相关系数:{" "}
                          <span className="font-black text-[#191A23]">
                            {corr.correlation.toFixed(3)}
                          </span>
                          (95%置信区间: {corr.confidence95Lower.toFixed(3)} -{" "}
                          {corr.confidence95Upper.toFixed(3)})
                        </p>
                        <p className="font-medium text-[#191A23] leading-relaxed">
                          这意味着学生在{" "}
                          <span className="font-bold">{corr.subject1}</span>{" "}
                          上的表现与{" "}
                          <span className="font-bold">{corr.subject2}</span>{" "}
                          上的表现
                          <span className="font-black">
                            {corr.correlation > 0
                              ? "呈现强正向关联"
                              : "呈现强反向关联"}
                          </span>
                        </p>
                      </div>

                      <div className="p-4 bg-white/50 border-2 border-[#191A23] rounded-lg">
                        <p className="font-black text-[#191A23] mb-2">
                          教学建议
                        </p>
                        <ul className="space-y-1 text-sm text-[#191A23]/80">
                          {corr.correlation > 0 ? (
                            <>
                              <li>• 可以设计跨学科整合教学方案</li>
                              <li>• 在强势科目带动弱势科目学习</li>
                              <li>• 关注同时在两科目表现不佳的学生</li>
                            </>
                          ) : (
                            <>
                              <li>• 分析两科目间可能的学习时间冲突</li>
                              <li>• 平衡两科目的学习投入比例</li>
                              <li>• 针对性提供学习策略指导</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(EnhancedSubjectCorrelationMatrix);
