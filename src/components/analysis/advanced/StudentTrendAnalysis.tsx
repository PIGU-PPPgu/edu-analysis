import React, { useMemo, memo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  Target,
  BarChart3,
  LineChart,
  Download,
  AlertTriangle,
  Award,
  Eye,
  Filter,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

// Wide-table数据接口
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

interface StudentTrendData {
  examTitle: string;
  examDate: string;
  totalScore: number;
  classRank: number;
  gradeRank: number;
  chinese: number;
  math: number;
  english: number;
  physics?: number;
  chemistry?: number;
  biology?: number;
  history?: number;
  geography?: number;
  politics?: number;
}

interface TrendAnalysisResult {
  subject: string;
  trend: "improving" | "declining" | "stable";
  slope: number;
  correlation: number;
  averageScore: number;
  latestScore: number;
  bestScore: number;
  worstScore: number;
  improvement: number;
  volatility: number;
}

interface StudentTrendAnalysisProps {
  gradeData: WideGradeRecord[];
  className?: string;
}

// 科目配置
const SUBJECT_CONFIG = {
  语文: { field: "chinese", color: "#6B7280", fullScore: 100 },
  数学: { field: "math", color: "#000000", fullScore: 100 },
  英语: { field: "english", color: "#6B7280", fullScore: 100 },
  物理: { field: "physics", color: "#191A23", fullScore: 100 },
  化学: { field: "chemistry", color: "#B9FF66", fullScore: 100 },
  生物: { field: "biology", color: "#000000", fullScore: 100 },
  历史: { field: "history", color: "#6B7280", fullScore: 100 },
  地理: { field: "geography", color: "#191A23", fullScore: 100 },
  政治: { field: "politics", color: "#6B7280", fullScore: 100 },
} as const;

// 计算线性回归和趋势分析
const calculateTrendAnalysis = (
  scores: number[]
): { slope: number; correlation: number; volatility: number } => {
  if (scores.length < 2) return { slope: 0, correlation: 0, volatility: 0 };

  const n = scores.length;
  const x = Array.from({ length: n }, (_, i) => i + 1);
  const y = scores;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  const meanY = sumY / n;
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );
  const correlation = denominator === 0 ? 0 : numerator / denominator;

  // 计算波动性（标准差）
  const variance =
    y.reduce((sum, score) => sum + Math.pow(score - meanY, 2), 0) / n;
  const volatility = Math.sqrt(variance);

  return { slope, correlation, volatility };
};

// 处理学生趋势数据
const processStudentTrendData = (
  gradeData: WideGradeRecord[],
  studentId: string
): StudentTrendData[] => {
  const studentRecords = gradeData
    .filter((record) => record.student_id === studentId)
    .sort(
      (a, b) =>
        new Date(a.exam_date || "").getTime() -
        new Date(b.exam_date || "").getTime()
    );

  return studentRecords.map((record) => ({
    examTitle: record.exam_title || "未知考试",
    examDate: record.exam_date || "",
    totalScore: record.total_score || 0,
    classRank: record.class_rank || 0,
    gradeRank: record.grade_rank || 0,
    chinese: record.chinese_score || 0,
    math: record.math_score || 0,
    english: record.english_score || 0,
    physics: record.physics_score,
    chemistry: record.chemistry_score,
    biology: record.biology_score,
    history: record.history_score,
    geography: record.geography_score,
    politics: record.politics_score,
  }));
};

// 分析所有科目趋势
const analyzeAllSubjectTrends = (
  trendData: StudentTrendData[]
): TrendAnalysisResult[] => {
  if (trendData.length < 2) return [];

  const results: TrendAnalysisResult[] = [];

  Object.entries(SUBJECT_CONFIG).forEach(([subject, config]) => {
    const scores = trendData
      .map((data) => data[config.field as keyof StudentTrendData] as number)
      .filter((score) => score > 0);

    if (scores.length < 2) return;

    const { slope, correlation, volatility } = calculateTrendAnalysis(scores);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const latestScore = scores[scores.length - 1];
    const bestScore = Math.max(...scores);
    const worstScore = Math.min(...scores);
    const improvement = latestScore - scores[0];

    let trend: "improving" | "declining" | "stable" = "stable";
    if (slope > 1 && correlation > 0.3) trend = "improving";
    else if (slope < -1 && correlation < -0.3) trend = "declining";

    results.push({
      subject,
      trend,
      slope,
      correlation,
      averageScore,
      latestScore,
      bestScore,
      worstScore,
      improvement,
      volatility,
    });
  });

  return results.sort((a, b) => Math.abs(b.slope) - Math.abs(a.slope));
};

const StudentTrendAnalysis: React.FC<StudentTrendAnalysisProps> = ({
  gradeData,
  className = "",
}) => {
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [viewMode, setViewMode] = useState<"line" | "area" | "radar">("line");
  // 🆕 趋势分析详情分页状态
  const [analysisPage, setAnalysisPage] = useState(0);
  const [analysisPageSize] = useState(6); // 每页显示6个科目分析

  // 获取所有学生列表
  const studentOptions = useMemo(() => {
    const students = new Map<string, string>();
    gradeData.forEach((record) => {
      students.set(record.student_id, record.name);
    });
    return Array.from(students.entries()).map(([id, name]) => ({ id, name }));
  }, [gradeData]);

  // 处理选中学生的趋势数据
  const studentTrendData = useMemo(() => {
    if (!selectedStudent) return [];
    return processStudentTrendData(gradeData, selectedStudent);
  }, [gradeData, selectedStudent]);

  // 分析结果
  const trendAnalysis = useMemo(() => {
    return analyzeAllSubjectTrends(studentTrendData);
  }, [studentTrendData]);

  // 🆕 分页的趋势分析数据
  const totalAnalysisPages = Math.ceil(trendAnalysis.length / analysisPageSize);
  const paginatedAnalysis = useMemo(() => {
    const startIndex = analysisPage * analysisPageSize;
    return trendAnalysis.slice(startIndex, startIndex + analysisPageSize);
  }, [trendAnalysis, analysisPage, analysisPageSize]);

  // 🆕 当学生变化时重置分页
  useEffect(() => {
    setAnalysisPage(0);
  }, [selectedStudent]);

  // 准备图表数据
  const chartData = useMemo(() => {
    return studentTrendData.map((data, index) => ({
      ...data,
      examIndex: index + 1,
      examLabel: `考试${index + 1}`,
    }));
  }, [studentTrendData]);

  // 雷达图数据
  const radarData = useMemo(() => {
    if (studentTrendData.length === 0) return [];
    const latestData = studentTrendData[studentTrendData.length - 1];

    return Object.entries(SUBJECT_CONFIG)
      .filter(
        ([_, config]) => latestData[config.field as keyof StudentTrendData]
      )
      .map(([subject, config]) => ({
        subject,
        score: latestData[config.field as keyof StudentTrendData] as number,
        fullMark: config.fullScore,
      }));
  }, [studentTrendData]);

  // 导出数据
  const handleExportData = () => {
    if (!selectedStudent || studentTrendData.length === 0) return;

    const csvContent = [
      [
        "考试",
        "日期",
        "总分",
        "班级排名",
        "年级排名",
        ...Object.keys(SUBJECT_CONFIG),
      ],
      ...studentTrendData.map((data) => [
        data.examTitle,
        data.examDate,
        data.totalScore.toString(),
        data.classRank.toString(),
        data.gradeRank.toString(),
        ...Object.values(SUBJECT_CONFIG).map((config) =>
          (data[config.field as keyof StudentTrendData] || 0).toString()
        ),
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
    link.setAttribute(
      "download",
      `${studentOptions.find((s) => s.id === selectedStudent)?.name || "学生"}_成绩趋势分析.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (studentOptions.length === 0) {
    return (
      <Card
        className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}
      >
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#6B7280] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <User className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
            暂无学生数据
          </p>
          <p className="text-[#191A23]/70 font-medium">
            请先导入学生成绩数据进行趋势分析
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <LineChart className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                  个人成绩趋势分析
                </CardTitle>
                <p className="text-[#191A23]/80 font-medium mt-1">
                  多维度跟踪学生学习轨迹 • 智能趋势预测 • 个性化提升建议
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 学生选择 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                选择学生
              </label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23]">
                  <SelectValue placeholder="请选择学生" />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 视图模式 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                视图模式
              </label>
              <div className="flex gap-2">
                {[
                  { value: "line", label: "折线图", icon: LineChart },
                  { value: "area", label: "面积图", icon: BarChart3 },
                  { value: "radar", label: "雷达图", icon: Target },
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    onClick={() => setViewMode(value as any)}
                    className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] transition-all ${
                      viewMode === value
                        ? "bg-[#B9FF66] text-[#191A23] translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_0px_#191A23]"
                        : "bg-white text-[#191A23] hover:bg-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedStudent && studentTrendData.length > 0 && (
        <>
          {/* 概览统计 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {studentTrendData.length}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                  考试次数
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {studentTrendData[studentTrendData.length - 1]?.totalScore ||
                    0}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                  最新总分
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {trendAnalysis.filter((t) => t.trend === "improving").length}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                  进步科目数
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-[#191A23] mb-2">
                  {studentTrendData[studentTrendData.length - 1]?.classRank ||
                    0}
                </div>
                <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
                  班级排名
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 趋势图表 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
            <CardHeader className="bg-[#6B7280] border-b-2 border-black">
              <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
                <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                成绩趋势可视化
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 sm:h-80 lg:h-96 flex items-center">
                {viewMode === "line" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="examLabel"
                        stroke="#191A23"
                        fontWeight="bold"
                      />
                      <YAxis stroke="#191A23" fontWeight="bold" />
                      <Tooltip
                        contentStyle={{
                          border: "2px solid #191A23",
                          borderRadius: "8px",
                          backgroundColor: "white",
                          boxShadow: "4px 4px 0px 0px #191A23",
                        }}
                      />
                      <Legend />
                      {Object.entries(SUBJECT_CONFIG).map(
                        ([subject, config]) => (
                          <Line
                            key={subject}
                            type="monotone"
                            dataKey={config.field}
                            stroke={config.color}
                            strokeWidth={3}
                            dot={{ fill: config.color, strokeWidth: 2, r: 5 }}
                            name={subject}
                          />
                        )
                      )}
                    </RechartsLineChart>
                  </ResponsiveContainer>
                )}

                {viewMode === "area" && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="examLabel"
                        stroke="#191A23"
                        fontWeight="bold"
                      />
                      <YAxis stroke="#191A23" fontWeight="bold" />
                      <Tooltip
                        contentStyle={{
                          border: "2px solid #191A23",
                          borderRadius: "8px",
                          backgroundColor: "white",
                          boxShadow: "4px 4px 0px 0px #191A23",
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="totalScore"
                        stroke="#B9FF66"
                        fill="#B9FF66"
                        fillOpacity={0.3}
                        strokeWidth={3}
                        name="总分"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}

                {viewMode === "radar" && radarData.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#E5E7EB" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#191A23", fontWeight: "bold" }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        tick={{ fill: "#191A23" }}
                      />
                      <Radar
                        name="最新成绩"
                        dataKey="score"
                        stroke="#B9FF66"
                        fill="#B9FF66"
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 趋势分析详情 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
            <CardHeader className="bg-[#6B7280] border-b-2 border-black">
              <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
                <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                科目趋势分析
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* 🆕 分页控制区域 */}
              {totalAnalysisPages > 1 && (
                <div className="flex justify-between items-center p-4 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg mb-4">
                  <div>
                    <p className="text-sm font-bold text-[#191A23]">
                      显示 {analysisPage * analysisPageSize + 1} -{" "}
                      {Math.min(
                        (analysisPage + 1) * analysisPageSize,
                        trendAnalysis.length
                      )}{" "}
                      / {trendAnalysis.length} 个科目分析
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        setAnalysisPage(Math.max(0, analysisPage - 1))
                      }
                      disabled={analysisPage === 0}
                      className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none disabled:shadow-[2px_2px_0px_0px_#191A23]"
                    >
                      上一页
                    </Button>
                    <span className="text-sm font-bold text-[#191A23] min-w-[4rem] text-center">
                      {analysisPage + 1} / {totalAnalysisPages}
                    </span>
                    <Button
                      onClick={() =>
                        setAnalysisPage(
                          Math.min(totalAnalysisPages - 1, analysisPage + 1)
                        )
                      }
                      disabled={analysisPage >= totalAnalysisPages - 1}
                      className="px-3 py-1 h-8 bg-white border-2 border-black text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] disabled:opacity-50 disabled:transform-none disabled:shadow-[2px_2px_0px_0px_#191A23]"
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {paginatedAnalysis.map((analysis, index) => (
                  <Card
                    key={index}
                    className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23]"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-full border-2 border-black ${
                              analysis.trend === "improving"
                                ? "bg-[#B9FF66]"
                                : analysis.trend === "declining"
                                  ? "bg-[#6B7280]"
                                  : "bg-white"
                            }`}
                          >
                            {analysis.trend === "improving" ? (
                              <TrendingUp className="w-5 h-5 text-[#191A23]" />
                            ) : analysis.trend === "declining" ? (
                              <TrendingDown className="w-5 h-5 text-white" />
                            ) : (
                              <Target className="w-5 h-5 text-[#191A23]" />
                            )}
                          </div>
                          <div>
                            <p className="font-black text-[#191A23] text-lg">
                              {analysis.subject}
                            </p>
                            <p className="text-sm font-medium text-[#191A23]/70">
                              平均分: {analysis.averageScore.toFixed(1)} | 最新:{" "}
                              {analysis.latestScore} | 变化:{" "}
                              {analysis.improvement > 0 ? "+" : ""}
                              {analysis.improvement.toFixed(1)}分
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge
                            className={`font-bold shadow-[2px_2px_0px_0px_#191A23] border-2 border-black ${
                              analysis.trend === "improving"
                                ? "bg-[#B9FF66] text-[#191A23]"
                                : analysis.trend === "declining"
                                  ? "bg-[#6B7280] text-white"
                                  : "bg-[#6B7280] text-white"
                            }`}
                          >
                            {analysis.trend === "improving"
                              ? "进步中"
                              : analysis.trend === "declining"
                                ? "需关注"
                                : "稳定"}
                          </Badge>
                          <div className="text-right">
                            <p className="text-lg font-black text-[#191A23]">
                              {analysis.latestScore}
                            </p>
                            <p className="text-xs text-[#191A23]/60">
                              当前分数
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selectedStudent && studentTrendData.length === 0 && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-[#6B7280] rounded-full border-2 border-black mx-auto mb-6 w-fit">
              <AlertTriangle className="h-16 w-16 text-white" />
            </div>
            <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
              该学生暂无考试数据
            </p>
            <p className="text-[#191A23]/70 font-medium">
              请确保该学生至少参加了一次考试
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(StudentTrendAnalysis);
