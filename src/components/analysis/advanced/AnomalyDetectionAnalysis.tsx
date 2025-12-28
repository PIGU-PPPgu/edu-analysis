import React, { useMemo, memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Info,
  Download,
  Eye,
  Filter,
  BarChart3,
  Users,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  exam_title?: string;
  exam_date?: string;
}

interface AnomalyData {
  student_id: string;
  name: string;
  class_name?: string;
  subject: string;
  score: number;
  expected_score: number;
  deviation: number;
  z_score: number;
  anomaly_type:
    | "outlier_high"
    | "outlier_low"
    | "sudden_drop"
    | "sudden_rise"
    | "missing_pattern";
  severity: "high" | "medium" | "low";
  description: string;
}

interface AnomalyDetectionAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

// 计算Z分数
const calculateZScore = (
  value: number,
  mean: number,
  stdDev: number
): number => {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
};

// 计算标准差
const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length <= 1) return 0;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
};

// 增强异常检测算法 - 多维度异常检测，提升精度和减少误报
const detectAnomalies = (
  gradeData: GradeRecord[] | undefined
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];

  // 增强数据预处理
  const processedData = preprocessAnomalyData(gradeData);

  // 按科目和学生分组进行多维度分析
  const subjectGroups = groupDataForAnomalyDetection(processedData);

  // 多算法集成异常检测
  Object.entries(subjectGroups).forEach(([subject, records]) => {
    if (records.length < 5) return; // 提高最低样本要求

    // 1. 统计异常检测（增强版Z-Score）
    const statisticalAnomalies = detectStatisticalAnomalies(subject, records);

    // 2. 基于历史趋势的异常检测
    const trendAnomalies = detectTrendAnomalies(subject, records);

    // 3. 基于学生个人历史的异常检测
    const personalAnomalies = detectPersonalAnomalies(subject, records);

    // 4. 上下文感知异常检测（考试难度、时间等因素）
    const contextualAnomalies = detectContextualAnomalies(subject, records);

    // 5. 模式异常检测（识别异常模式）
    const patternAnomalies = detectPatternAnomalies(subject, records);

    // 集成所有检测结果并去重
    const allAnomalies = [
      ...statisticalAnomalies,
      ...trendAnomalies,
      ...personalAnomalies,
      ...contextualAnomalies,
      ...patternAnomalies,
    ];

    // 智能去重和置信度评分
    const deduplicatedAnomalies = deduplicateAndScore(allAnomalies);

    anomalies.push(...deduplicatedAnomalies);
  });

  return anomalies.sort(
    (a, b) => getAnomalyPriority(b) - getAnomalyPriority(a)
  );
};

// 数据预处理增强
const preprocessAnomalyData = (gradeData: GradeRecord[] | undefined) => {
  if (!gradeData || !Array.isArray(gradeData)) {
    return [];
  }

  return gradeData
    .filter(
      (record) => record.subject && record.score && !isNaN(Number(record.score))
    )
    .map((record) => ({
      ...record,
      score: Number(record.score),
      examDate: new Date(record.exam_date || Date.now()),
      normalizedScore: Number(record.score), // 后续可能需要根据总分标准化
    }))
    .sort((a, b) => a.examDate.getTime() - b.examDate.getTime());
};

// 分组数据用于异常检测
const groupDataForAnomalyDetection = (processedData: any[]) => {
  const groups: Record<string, any[]> = {};

  processedData.forEach((record) => {
    if (!groups[record.subject]) {
      groups[record.subject] = [];
    }
    groups[record.subject].push(record);
  });

  return groups;
};

// 统计异常检测（增强版）
const detectStatisticalAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];
  const scores = records.map((r) => r.score);

  // 多种统计方法
  const stats = calculateEnhancedStatistics(scores);

  records.forEach((record) => {
    // 修正的Z-Score（使用中位数绝对偏差）
    const modifiedZScore = calculateModifiedZScore(
      record.score,
      stats.median,
      stats.mad
    );

    // IQR方法
    const iqrAnomaly = detectIQRAnomaly(record.score, stats.q1, stats.q3);

    // 综合判断
    if (Math.abs(modifiedZScore) > 3.5 || iqrAnomaly.isAnomaly) {
      const severity =
        Math.abs(modifiedZScore) > 4.5
          ? "high"
          : Math.abs(modifiedZScore) > 3.5
            ? "medium"
            : "low";

      anomalies.push({
        student_id: record.student_id,
        name: record.name,
        class_name: record.class_name,
        subject,
        score: record.score,
        expected_score: stats.mean,
        deviation: record.score - stats.mean,
        z_score: modifiedZScore,
        anomaly_type:
          record.score > stats.mean ? "outlier_high" : "outlier_low",
        severity,
        description: `${subject}成绩统计异常 (修正Z-Score: ${modifiedZScore.toFixed(2)})`,
      });
    }
  });

  return anomalies;
};

// 趋势异常检测
const detectTrendAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];

  // 按学生分组，分析个人趋势
  const studentGroups = groupRecordsByStudent(records);

  Object.entries(studentGroups).forEach(([studentId, studentRecords]) => {
    if (studentRecords.length < 3) return;

    const sortedRecords = studentRecords.sort(
      (a, b) => a.examDate.getTime() - b.examDate.getTime()
    );
    const scores = sortedRecords.map((r) => r.score);

    // 计算趋势
    const trend = calculateTrendSlope(scores);
    const recentChange = calculateRecentChange(scores);

    // 检测急剧变化
    if (Math.abs(recentChange) > 20) {
      // 最近分数变化超过20分
      const latestRecord = sortedRecords[sortedRecords.length - 1];

      anomalies.push({
        student_id: latestRecord.student_id,
        name: latestRecord.name,
        class_name: latestRecord.class_name,
        subject,
        score: latestRecord.score,
        expected_score: scores[scores.length - 2], // 上一次成绩作为期望
        deviation: recentChange,
        z_score: recentChange / 10, // 简化的趋势Z-Score
        anomaly_type: recentChange > 0 ? "sudden_rise" : "sudden_drop",
        severity: Math.abs(recentChange) > 30 ? "high" : "medium",
        description: `${subject}成绩出现${recentChange > 0 ? "急剧上升" : "急剧下降"}趋势 (变化: ${recentChange.toFixed(1)}分)`,
      });
    }
  });

  return anomalies;
};

// 个人历史异常检测
const detectPersonalAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];
  const studentGroups = groupRecordsByStudent(records);

  Object.entries(studentGroups).forEach(([studentId, studentRecords]) => {
    if (studentRecords.length < 4) return;

    const scores = studentRecords.map((r) => r.score);
    const personalStats = calculateEnhancedStatistics(scores);

    // 检测与个人历史的偏差
    studentRecords.forEach((record) => {
      const personalZScore = calculateModifiedZScore(
        record.score,
        personalStats.median,
        personalStats.mad
      );

      if (Math.abs(personalZScore) > 2.5) {
        anomalies.push({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subject,
          score: record.score,
          expected_score: personalStats.mean,
          deviation: record.score - personalStats.mean,
          z_score: personalZScore,
          anomaly_type:
            record.score > personalStats.mean ? "sudden_rise" : "sudden_drop",
          severity: Math.abs(personalZScore) > 3.0 ? "high" : "medium",
          description: `${subject}成绩与个人历史表现差异较大 (个人Z-Score: ${personalZScore.toFixed(2)})`,
        });
      }
    });
  });

  return anomalies;
};

// 上下文感知异常检测
const detectContextualAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];

  // 按考试类型分组分析
  const examTypeGroups = groupRecordsByExamType(records);

  Object.entries(examTypeGroups).forEach(([examType, typeRecords]) => {
    if (typeRecords.length < 3) return;

    const scores = typeRecords.map((r) => r.score);
    const typeStats = calculateEnhancedStatistics(scores);

    typeRecords.forEach((record) => {
      const contextualZScore = calculateModifiedZScore(
        record.score,
        typeStats.median,
        typeStats.mad
      );

      if (Math.abs(contextualZScore) > 3.0) {
        anomalies.push({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subject,
          score: record.score,
          expected_score: typeStats.mean,
          deviation: record.score - typeStats.mean,
          z_score: contextualZScore,
          anomaly_type:
            record.score > typeStats.mean ? "outlier_high" : "outlier_low",
          severity: Math.abs(contextualZScore) > 4.0 ? "high" : "medium",
          description: `${subject}在${examType}类型考试中表现异常 (上下文Z-Score: ${contextualZScore.toFixed(2)})`,
        });
      }
    });
  });

  return anomalies;
};

// 模式异常检测
const detectPatternAnomalies = (
  subject: string,
  records: any[]
): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];

  // 检测连续低分模式
  const studentGroups = groupRecordsByStudent(records);

  Object.entries(studentGroups).forEach(([studentId, studentRecords]) => {
    if (studentRecords.length < 3) return;

    const sortedRecords = studentRecords.sort(
      (a, b) => a.examDate.getTime() - b.examDate.getTime()
    );
    const scores = sortedRecords.map((r) => r.score);

    // 检测连续低分（连续3次低于60分）
    const consecutiveLowScores = findConsecutiveLowScores(scores, 60, 3);
    if (consecutiveLowScores.length > 0) {
      const latestRecord = sortedRecords[sortedRecords.length - 1];

      anomalies.push({
        student_id: latestRecord.student_id,
        name: latestRecord.name,
        class_name: latestRecord.class_name,
        subject,
        score: latestRecord.score,
        expected_score: 60,
        deviation: latestRecord.score - 60,
        z_score: -2.0, // 固定的模式异常分数
        anomaly_type: "missing_pattern",
        severity: "high",
        description: `${subject}出现连续低分模式，需要重点关注`,
      });
    }
  });

  return anomalies;
};

// 辅助函数实现

const calculateEnhancedStatistics = (scores: number[]) => {
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = scores.reduce((sum, score) => sum + score, 0) / n;
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];

  // 中位数绝对偏差
  const mad =
    scores.reduce((sum, score) => sum + Math.abs(score - median), 0) / n;

  return { mean, median, q1, q3, mad };
};

const calculateModifiedZScore = (
  value: number,
  median: number,
  mad: number
) => {
  if (mad === 0) return 0;
  return (0.6745 * (value - median)) / mad;
};

const detectIQRAnomaly = (value: number, q1: number, q3: number) => {
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return {
    isAnomaly: value < lowerBound || value > upperBound,
    bound: value < lowerBound ? "lower" : "upper",
  };
};

const groupRecordsByStudent = (records: any[]): Record<string, any[]> => {
  return records.reduce(
    (acc, record) => {
      if (!acc[record.student_id]) {
        acc[record.student_id] = [];
      }
      acc[record.student_id].push(record);
      return acc;
    },
    {} as Record<string, any[]>
  );
};

const groupRecordsByExamType = (records: any[]): Record<string, any[]> => {
  return records.reduce(
    (acc, record) => {
      const examType = record.exam_type || "regular";
      if (!acc[examType]) {
        acc[examType] = [];
      }
      acc[examType].push(record);
      return acc;
    },
    {} as Record<string, any[]>
  );
};

const calculateTrendSlope = (scores: number[]) => {
  if (scores.length < 2) return 0;

  const n = scores.length;
  const x = Array.from({ length: n }, (_, i) => i);

  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = scores.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * scores[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);

  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
};

const calculateRecentChange = (scores: number[]) => {
  if (scores.length < 2) return 0;
  return scores[scores.length - 1] - scores[scores.length - 2];
};

const findConsecutiveLowScores = (
  scores: number[],
  threshold: number,
  count: number
) => {
  const consecutive = [];
  let current = 0;

  for (let i = 0; i < scores.length; i++) {
    if (scores[i] < threshold) {
      current++;
      if (current >= count) {
        consecutive.push({ start: i - count + 1, end: i });
      }
    } else {
      current = 0;
    }
  }

  return consecutive;
};

const deduplicateAndScore = (anomalies: AnomalyData[]) => {
  // 按学生和科目去重，保留最高优先级的异常
  const deduped = new Map<string, AnomalyData>();

  anomalies.forEach((anomaly) => {
    const key = `${anomaly.student_id}-${anomaly.subject}`;
    const existing = deduped.get(key);

    if (
      !existing ||
      getAnomalyPriority(anomaly) > getAnomalyPriority(existing)
    ) {
      deduped.set(key, anomaly);
    }
  });

  return Array.from(deduped.values());
};

const getAnomalyPriority = (anomaly: AnomalyData) => {
  const severityWeight = { high: 3, medium: 2, low: 1 };
  const typeWeight = {
    outlier_high: 1.2,
    outlier_low: 1.5,
    sudden_drop: 1.4,
    sudden_rise: 1.1,
    missing_pattern: 1.6,
  };

  return (
    Math.abs(anomaly.z_score) *
    severityWeight[anomaly.severity] *
    typeWeight[anomaly.anomaly_type]
  );
};

// 获取Positivus风格异常类型的颜色和图标
const getAnomalyStyle = (
  type: AnomalyData["anomaly_type"],
  severity: AnomalyData["severity"]
) => {
  const baseStyles = {
    outlier_high: {
      color: "text-[#191A23]",
      bg: "bg-[#B9FF66]/20",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingUp,
    },
    outlier_low: {
      color: "text-white",
      bg: "bg-[#B9FF66]/20",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingDown,
    },
    sudden_rise: {
      color: "text-[#191A23]",
      bg: "bg-[#B9FF66]/10",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingUp,
    },
    sudden_drop: {
      color: "text-white",
      bg: "bg-[#B9FF66]/20",
      border: "border-[#B9FF66] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#B9FF66]",
      icon: TrendingDown,
    },
    missing_pattern: {
      color: "text-[#191A23]",
      bg: "bg-[#9C88FF]/20",
      border: "border-[#9C88FF] border-2",
      cardStyle: "shadow-[4px_4px_0px_0px_#9C88FF]",
      icon: AlertCircle,
    },
  };

  return baseStyles[type] || baseStyles.missing_pattern;
};

// 获取Positivus风格严重程度的样式
const getSeverityBadge = (severity: AnomalyData["severity"]) => {
  switch (severity) {
    case "high":
      return (
        <Badge className="bg-[#B9FF66] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          高风险
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-[#B9FF66] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          中风险
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          低风险
        </Badge>
      );
    default:
      return (
        <Badge className="bg-[#F3F3F3] text-[#191A23] border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">
          未知
        </Badge>
      );
  }
};

const AnomalyDetectionAnalysis: React.FC<AnomalyDetectionAnalysisProps> = ({
  gradeData,
  title = "成绩异常检测",
  className = "",
}) => {
  // 🆕 分页状态管理
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(5); // 每页显示5个异常

  const anomalies = useMemo(() => detectAnomalies(gradeData), [gradeData]);

  // 🆕 分页的异常数据
  const totalPages = Math.ceil(anomalies.length / pageSize);
  const paginatedAnomalies = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return anomalies.slice(startIndex, startIndex + pageSize);
  }, [anomalies, currentPage, pageSize]);

  // 🆕 重置页面当异常数据变化时
  useEffect(() => {
    setCurrentPage(0);
  }, [anomalies.length]);

  const subjects = useMemo(() => {
    if (!gradeData || !Array.isArray(gradeData)) {
      return [];
    }
    return Array.from(
      new Set(gradeData.map((record) => record.subject).filter(Boolean))
    );
  }, [gradeData]);

  // 统计数据
  const stats = useMemo(() => {
    if (!gradeData || !Array.isArray(gradeData)) {
      return {
        totalStudents: 0,
        totalRecords: 0,
        anomalyRate: 0,
      };
    }
    const totalStudents = new Set(gradeData.map((r) => r.student_id)).size;
    const affectedStudents = new Set(anomalies.map((a) => a.student_id)).size;
    const highRiskCount = anomalies.filter((a) => a.severity === "high").length;
    const mediumRiskCount = anomalies.filter(
      (a) => a.severity === "medium"
    ).length;

    return {
      totalStudents,
      affectedStudents,
      affectedRate:
        totalStudents > 0 ? (affectedStudents / totalStudents) * 100 : 0,
      highRiskCount,
      mediumRiskCount,
      totalAnomalies: anomalies.length,
    };
  }, [anomalies, gradeData]);

  // 按科目统计异常
  const subjectAnomalies = useMemo(() => {
    const subjectStats = subjects.map((subject) => {
      const subjectAnomaliesCount = anomalies.filter(
        (a) => a.subject === subject
      ).length;
      const subjectStudentsCount = new Set(
        gradeData.filter((r) => r.subject === subject).map((r) => r.student_id)
      ).size;

      return {
        subject,
        anomalies: subjectAnomaliesCount,
        students: subjectStudentsCount,
        rate:
          subjectStudentsCount > 0
            ? (subjectAnomaliesCount / subjectStudentsCount) * 100
            : 0,
      };
    });

    return subjectStats.sort((a, b) => b.rate - a.rate);
  }, [anomalies, subjects, gradeData]);

  // 🆕 跳转到预警分析界面
  const handleJumpToWarningAnalysis = () => {
    // 获取当前考试信息用于筛选
    const currentExam = gradeData?.[0]?.exam_title || "";
    const examDate = gradeData?.[0]?.exam_date || "";

    // 构造查询参数，自动筛选当前考试
    const queryParams = new URLSearchParams();
    if (currentExam) queryParams.set("exam", currentExam);
    if (examDate) queryParams.set("date", examDate);
    queryParams.set("from", "anomaly-detection"); // 标记来源

    // 跳转到预警分析页面，筛选器将自动配置为专注当前考试
    window.location.href = `/warning-analysis?${queryParams.toString()}`;
  };

  // 导出异常数据
  const handleExportData = () => {
    const csvContent = [
      [
        "学号",
        "姓名",
        "班级",
        "科目",
        "实际分数",
        "预期分数",
        "偏差",
        "Z分数",
        "异常类型",
        "风险等级",
        "描述",
      ],
      ...anomalies.map((a) => [
        a.student_id,
        a.name,
        a.class_name || "",
        a.subject,
        a.score.toString(),
        a.expected_score.toFixed(2),
        a.deviation.toFixed(2),
        a.z_score.toFixed(3),
        a.anomaly_type === "outlier_high"
          ? "异常偏高"
          : a.anomaly_type === "outlier_low"
            ? "异常偏低"
            : a.anomaly_type === "sudden_rise"
              ? "突然上升"
              : a.anomaly_type === "sudden_drop"
                ? "突然下降"
                : "其他异常",
        a.severity === "high"
          ? "高风险"
          : a.severity === "medium"
            ? "中风险"
            : "低风险",
        a.description,
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
    link.setAttribute("download", "成绩异常检测报告.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (subjects.length === 0) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <AlertTriangle className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            暂无成绩数据
          </p>
          <p className="text-[#191A23]/70 font-medium">
            请先导入学生成绩数据进行异常检测
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
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                  {title}
                </CardTitle>
                <p className="text-white/90 font-medium mt-1">
                  检测 {stats.totalStudents} 名学生在 {subjects.length}{" "}
                  个科目中的异常表现
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge className="bg-[#B9FF66] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {stats.totalAnomalies} 个异常
              </Badge>
              {/* 🆕 跳转到预警分析按钮 */}
              {stats.totalAnomalies > 0 && (
                <Button
                  onClick={handleJumpToWarningAnalysis}
                  className="border-2 border-black bg-[#9C88FF] hover:bg-[#8B77E8] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  转到预警分析
                </Button>
              )}
              <Button
                onClick={handleExportData}
                className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
              >
                <Download className="h-4 w-4 mr-2" />
                导出报告
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Positivus风格分析说明 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
        <CardHeader className="bg-[#9C88FF] border-b-2 border-black py-4">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Info className="h-4 w-4 text-white" />
            </div>
            异常检测说明
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#9C88FF]/10 border-2 border-[#9C88FF] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">检测方法</p>
              <p className="text-sm text-[#191A23]/80">
                基于Z分数统计方法，识别偏离正常范围的成绩
              </p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">异常阈值</p>
              <p className="text-sm text-[#191A23]/80">
                Z分数绝对值 &gt; 2.5 为异常，&gt; 3.0 为极端异常
              </p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">风险等级</p>
              <p className="text-sm text-[#191A23]/80">
                高风险需要立即关注，中风险建议跟进
              </p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">应用建议</p>
              <p className="text-sm text-[#191A23]/80">
                结合学生具体情况分析，避免单纯依赖数据判断
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#9C88FF]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.totalStudents}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              总学生数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.affectedStudents}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              异常学生数
            </div>
            <div className="text-xs font-medium text-[#191A23]/70 mt-1">
              ({stats.affectedRate.toFixed(1)}%)
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.highRiskCount}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              高风险异常
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {stats.mediumRiskCount}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              中风险异常
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positivus风格科目异常统计 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            各科目异常统计
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-48 sm:h-64 lg:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAnomalies}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#191A23"
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="subject"
                  stroke="#191A23"
                  fontSize={12}
                  fontWeight="bold"
                />
                <YAxis stroke="#191A23" fontSize={12} fontWeight="bold" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid #191A23",
                    borderRadius: "8px",
                    boxShadow: "4px 4px 0px 0px #191A23",
                    fontWeight: "bold",
                  }}
                  formatter={(value: any, name: string) => [
                    name === "anomalies"
                      ? `${value} 个异常`
                      : `${value} 名学生`,
                    name === "anomalies" ? "异常数量" : "学生总数",
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontWeight: "bold", color: "#191A23" }}
                />
                <Bar
                  dataKey="anomalies"
                  fill="#B9FF66"
                  name="异常数量"
                  stroke="#191A23"
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="students"
                  fill="#B9FF66"
                  name="学生总数"
                  stroke="#191A23"
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格异常详情列表 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
        <CardHeader className="bg-[#9C88FF] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Eye className="h-5 w-5 text-white" />
            </div>
            异常详情列表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* 🆕 分页控制区域 */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 bg-[#9C88FF]/20 border-2 border-[#9C88FF] rounded-lg mb-4">
              <div>
                <p className="text-sm font-bold text-[#191A23]">
                  显示 {currentPage * pageSize + 1} -{" "}
                  {Math.min((currentPage + 1) * pageSize, anomalies.length)} /{" "}
                  {anomalies.length} 个异常
                </p>
                {stats.totalAnomalies > pageSize && (
                  <p className="text-xs text-[#191A23]/70 mt-1">
                    💡 检测到较多异常，建议跳转到预警分析进行深度处理
                  </p>
                )}
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

          <div className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-6 w-fit">
                  <AlertTriangle className="h-12 w-12 text-white" />
                </div>
                <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">
                  未检测到异常成绩
                </p>
                <p className="text-[#191A23]/70 font-medium">
                  所有学生成绩都在正常范围内
                </p>
              </div>
            ) : (
              paginatedAnomalies.map((anomaly, index) => {
                const style = getAnomalyStyle(
                  anomaly.anomaly_type,
                  anomaly.severity
                );
                const IconComponent = style.icon;

                return (
                  <Card
                    key={index}
                    className={`${style.border} ${style.cardStyle} transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]`}
                  >
                    <CardContent className={`p-4 ${style.bg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-full border-2 border-black ${
                              anomaly.anomaly_type === "outlier_high"
                                ? "bg-[#B9FF66]"
                                : anomaly.anomaly_type === "outlier_low"
                                  ? "bg-[#B9FF66]"
                                  : anomaly.anomaly_type === "sudden_rise"
                                    ? "bg-[#B9FF66]"
                                    : anomaly.anomaly_type === "sudden_drop"
                                      ? "bg-[#B9FF66]"
                                      : "bg-[#9C88FF]"
                            }`}
                          >
                            <IconComponent
                              className={`w-5 h-5 ${
                                anomaly.anomaly_type === "outlier_low" ||
                                anomaly.anomaly_type === "sudden_drop"
                                  ? "text-white"
                                  : "text-[#191A23]"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-black text-[#191A23] text-lg">
                              {anomaly.name} ({anomaly.student_id})
                            </p>
                            <p className="text-sm font-medium text-[#191A23]/80">
                              {anomaly.class_name} • {anomaly.subject} • 实际:{" "}
                              <span className="font-bold text-[#B9FF66]">
                                {anomaly.score}分
                              </span>{" "}
                              • 预期:{" "}
                              <span className="font-bold text-[#9C88FF]">
                                {anomaly.expected_score.toFixed(1)}分
                              </span>
                            </p>
                            <p className="text-sm font-medium text-[#191A23] mt-2 leading-relaxed">
                              {anomaly.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-black text-[#191A23] px-3 py-1 bg-white rounded-lg border-2 border-black">
                              Z分数: {anomaly.z_score.toFixed(2)}
                            </div>
                            <div className="text-xs font-bold text-[#191A23]/70 mt-1">
                              偏差: {anomaly.deviation > 0 ? "+" : ""}
                              {anomaly.deviation.toFixed(1)}分
                            </div>
                          </div>
                          {getSeverityBadge(anomaly.severity)}
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

      {/* 🆕 简化的快速行动指南 */}
      {stats.totalAnomalies > 0 && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
                <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                  <Users className="h-5 w-5 text-white" />
                </div>
                快速处理建议
              </CardTitle>
              {/* 🆕 右侧跳转提示 */}
              <Button
                onClick={handleJumpToWarningAnalysis}
                size="sm"
                className="border-2 border-black bg-[#9C88FF] hover:bg-[#8B77E8] text-white font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
              >
                详细处理
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.highRiskCount > 0 && (
                <div className="p-4 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg">
                  <p className="font-black text-[#191A23] mb-2">
                    🚨 高风险: {stats.highRiskCount} 个
                  </p>
                  <p className="text-sm text-[#191A23]/80">
                    需要立即关注和干预处理
                  </p>
                </div>
              )}

              {stats.mediumRiskCount > 0 && (
                <div className="p-4 bg-[#9C88FF]/20 border-2 border-[#9C88FF] rounded-lg">
                  <p className="font-black text-[#191A23] mb-2">
                    ⚠️ 中风险: {stats.mediumRiskCount} 个
                  </p>
                  <p className="text-sm text-[#191A23]/80">
                    建议持续关注和跟进
                  </p>
                </div>
              )}

              <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg md:col-span-2">
                <p className="font-black text-[#191A23] mb-2 flex items-center gap-2">
                  💡 建议操作
                  <Badge className="bg-[#9C88FF] text-white border-2 border-black text-xs font-bold">
                    点击上方"详细处理"进行深度分析
                  </Badge>
                </p>
                <p className="text-sm text-[#191A23]/80">
                  结合学生具体情况分析，建议跳转到预警分析界面进行完整的学生预警管理和干预措施制定
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(AnomalyDetectionAnalysis);
