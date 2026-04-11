/**
 * 🎯 多考试数据对比和趋势分析仪表板
 *
 * 功能：
 * 1. 多考试选择和对比分析
 * 2. 班级整体趋势分析
 * 3. 学生个人趋势跟踪
 * 4. 考试难度和区分度分析
 * 5. 预测分析和建议生成
 */

import React, { useState, useEffect, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  LineChart,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  BookOpen,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Zap,
  Award,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
} from "recharts";
import { toast } from "sonner";
import {
  examComparisonService,
  type ExamInfo,
  type ExamComparisonResult,
  type StudentTrendResult,
  type ClassComparisonResult,
} from "@/services/examComparisonService";

interface MultiExamComparisonDashboardProps {
  className?: string;
}

const MultiExamComparisonDashboard: React.FC<
  MultiExamComparisonDashboardProps
> = ({ className = "" }) => {
  const [availableExams, setAvailableExams] = useState<ExamInfo[]>([]);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<
    ExamComparisonResult[]
  >([]);
  const [classComparison, setClassComparison] =
    useState<ClassComparisonResult | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [studentTrend, setStudentTrend] = useState<StudentTrendResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // 加载可用考试列表
  useEffect(() => {
    const loadExams = async () => {
      try {
        const exams = await examComparisonService.getAvailableExams();
        setAvailableExams(exams);
      } catch (error) {
        console.error("❌ [MultiExamComparison] 加载考试列表失败:", error);
        toast.error("加载考试列表失败");
      }
    };

    loadExams();
  }, []);

  // 执行多考试对比分析
  const handleCompareExams = async () => {
    if (selectedExams.length < 2) {
      toast.error("请至少选择两个考试进行对比");
      return;
    }

    setLoading(true);
    try {
      const results = await examComparisonService.compareExams(selectedExams);
      setComparisonResults(results);

      // 同时获取班级对比数据
      const classResults = await examComparisonService.compareClasses();
      setClassComparison(classResults);

      toast.success(`成功对比 ${results.length} 个考试`);
    } catch (error) {
      console.error("❌ [MultiExamComparison] 对比分析失败:", error);
      toast.error("对比分析失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取学生趋势分析
  const handleStudentTrendAnalysis = async (studentId: string) => {
    if (!studentId) return;

    setLoading(true);
    try {
      const trend = await examComparisonService.analyzeStudentTrend(studentId);
      setStudentTrend(trend);
      toast.success("学生趋势分析完成");
    } catch (error) {
      console.error("❌ [MultiExamComparison] 学生趋势分析失败:", error);
      toast.error("学生趋势分析失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取所有学生列表（从对比结果中提取）
  const allStudents = useMemo(() => {
    const students = new Map<string, string>();
    comparisonResults.forEach((result) => {
      result.topPerformers.forEach((performer) => {
        students.set(performer.studentId, performer.studentName);
      });
    });
    return Array.from(students.entries()).map(([id, name]) => ({ id, name }));
  }, [comparisonResults]);

  // 准备图表数据
  const chartData = useMemo(() => {
    return comparisonResults.map((result) => ({
      examTitle: result.examInfo.exam_title,
      examDate: result.examInfo.exam_date,
      totalParticipants: result.summary.totalParticipants,
      overallAverage: result.summary.overallAverage,
      trendDirection: result.summary.improvementTrend,
    }));
  }, [comparisonResults]);

  // 科目趋势数据
  const subjectTrendData = useMemo(() => {
    if (comparisonResults.length === 0) return [];

    const subjects = comparisonResults[0].subjectStats.map((s) => s.subject);
    return subjects.map((subject) => {
      const data = comparisonResults.map((result) => {
        const subjectData = result.subjectStats.find(
          (s) => s.subject === subject
        );
        return {
          examTitle: result.examInfo.exam_title,
          score: subjectData?.averageScore || 0,
        };
      });
      return { subject, data };
    });
  }, [comparisonResults]);

  // 渲染趋势图标
  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  // 渲染考试概览统计卡片
  const renderOverviewCards = () => {
    if (comparisonResults.length === 0) return null;

    const totalStudents =
      comparisonResults.reduce(
        (sum, result) => sum + result.summary.totalParticipants,
        0
      ) / comparisonResults.length;

    const avgScore =
      comparisonResults.reduce(
        (sum, result) => sum + result.summary.overallAverage,
        0
      ) / comparisonResults.length;

    const improvingCount = comparisonResults.filter(
      (result) => result.summary.improvementTrend === "improving"
    ).length;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {comparisonResults.length}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              对比考试数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {Math.round(totalStudents)}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              平均参与人数
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {avgScore.toFixed(1)}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              平均总分
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {improvingCount}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
              进步考试数
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-2xl font-black text-[#191A23] uppercase tracking-wide flex items-center">
            <div className="p-3 bg-[#191A23] rounded-full border-2 border-black mr-3">
              <BarChart className="h-6 w-6 text-white" />
            </div>
            多考试数据对比分析
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 考试选择 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                选择考试 ({selectedExams.length} 个)
              </label>
              <Select
                value=""
                onValueChange={(examId) => {
                  if (!selectedExams.includes(examId)) {
                    setSelectedExams([...selectedExams, examId]);
                  }
                }}
              >
                <SelectTrigger className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23]">
                  <SelectValue placeholder="添加考试..." />
                </SelectTrigger>
                <SelectContent>
                  {availableExams
                    .filter((exam) => !selectedExams.includes(exam.id))
                    .map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.exam_title} ({exam.exam_date})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* 已选考试标签 */}
              {selectedExams.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedExams.map((examId) => {
                    const exam = availableExams.find((e) => e.id === examId);
                    if (!exam) return null;
                    return (
                      <Badge
                        key={examId}
                        variant="outline"
                        className="cursor-pointer hover:bg-red-100"
                        onClick={() => {
                          setSelectedExams(
                            selectedExams.filter((id) => id !== examId)
                          );
                        }}
                      >
                        {exam.exam_title} ×
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 学生选择（用于个人趋势分析） */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                学生趋势分析
              </label>
              <Select
                value={selectedStudent}
                onValueChange={setSelectedStudent}
              >
                <SelectTrigger className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23]">
                  <SelectValue placeholder="选择学生..." />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">
                分析操作
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={handleCompareExams}
                  disabled={loading || selectedExams.length < 2}
                  className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] bg-[#B9FF66] text-[#191A23] hover:bg-[#B9FF66]/80"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  开始对比
                </Button>

                {selectedStudent && (
                  <Button
                    onClick={() => handleStudentTrendAnalysis(selectedStudent)}
                    disabled={loading}
                    variant="outline"
                    className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    个人趋势
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 结果展示区域 */}
      {comparisonResults.length > 0 && (
        <>
          {renderOverviewCards()}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 border-2 border-black">
              <TabsTrigger value="overview" className="font-bold">
                总体分析
              </TabsTrigger>
              <TabsTrigger value="trends" className="font-bold">
                趋势图表
              </TabsTrigger>
              <TabsTrigger value="subjects" className="font-bold">
                科目对比
              </TabsTrigger>
              <TabsTrigger value="classes" className="font-bold">
                班级分析
              </TabsTrigger>
            </TabsList>

            {/* 总体分析 */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {comparisonResults.map((result, index) => (
                  <Card
                    key={index}
                    className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280]"
                  >
                    <CardHeader className="bg-[#6B7280] border-b-2 border-black">
                      <CardTitle className="text-white font-black flex items-center justify-between">
                        <span>{result.examInfo.exam_title}</span>
                        {renderTrendIcon(result.summary.improvementTrend)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">参与人数</span>
                          <Badge variant="outline">
                            {result.summary.totalParticipants}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">平均分</span>
                          <Badge variant="outline">
                            {result.summary.overallAverage.toFixed(1)}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">班级数量</span>
                          <Badge variant="outline">
                            {result.classStats.length}
                          </Badge>
                        </div>

                        {/* 关键洞察 */}
                        {result.summary.keyInsights.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs font-medium text-gray-600 mb-1">
                              关键洞察:
                            </p>
                            <ul className="text-xs text-gray-700 space-y-1">
                              {result.summary.keyInsights
                                .slice(0, 2)
                                .map((insight, i) => (
                                  <li key={i} className="flex items-start">
                                    <span className="text-[#B9FF66] mr-1">
                                      •
                                    </span>
                                    {insight}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 趋势图表 */}
            <TabsContent value="trends" className="space-y-4">
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
                <CardHeader className="bg-[#6B7280] border-b-2 border-black">
                  <CardTitle className="text-white font-black uppercase tracking-wide flex items-center">
                    <LineChart className="h-5 w-5 mr-2" />
                    考试成绩趋势
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="examTitle"
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
                        <Line
                          type="monotone"
                          dataKey="overallAverage"
                          stroke="#B9FF66"
                          strokeWidth={3}
                          dot={{ fill: "#B9FF66", strokeWidth: 2, r: 5 }}
                          name="平均分"
                        />
                        <Line
                          type="monotone"
                          dataKey="totalParticipants"
                          stroke="#6B7280"
                          strokeWidth={3}
                          dot={{ fill: "#6B7280", strokeWidth: 2, r: 5 }}
                          name="参与人数"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 科目对比 */}
            <TabsContent value="subjects" className="space-y-4">
              {subjectTrendData.map((subjectData, index) => (
                <Card
                  key={index}
                  className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280]"
                >
                  <CardHeader className="bg-[#6B7280] border-b-2 border-black">
                    <CardTitle className="text-white font-black">
                      {subjectData.subject} 科目趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={subjectData.data}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#E5E7EB"
                          />
                          <XAxis
                            dataKey="examTitle"
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
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#B9FF66"
                            fill="#B9FF66"
                            fillOpacity={0.3}
                            strokeWidth={3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* 班级分析 */}
            <TabsContent value="classes" className="space-y-4">
              {classComparison && (
                <>
                  {/* 班级表现排名 */}
                  <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
                    <CardHeader className="bg-[#6B7280] border-b-2 border-black">
                      <CardTitle className="text-white font-black uppercase tracking-wide flex items-center">
                        <Award className="h-5 w-5 mr-2" />
                        班级表现排名
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {classComparison.classPerformance
                          .slice(0, 10)
                          .map((classData, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-gray-200"
                            >
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={index < 3 ? "default" : "outline"}
                                  className={`font-bold ${
                                    index === 0
                                      ? "bg-yellow-400 text-black"
                                      : index === 1
                                        ? "bg-gray-400 text-white"
                                        : index === 2
                                          ? "bg-orange-400 text-white"
                                          : ""
                                  }`}
                                >
                                  #{classData.rank}
                                </Badge>
                                <div>
                                  <p className="font-bold text-[#191A23]">
                                    {classData.className}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {classData.studentCount} 人 • 平均分{" "}
                                    {classData.averageScore.toFixed(1)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {renderTrendIcon(classData.trend)}
                                <Badge
                                  variant={
                                    classData.trend === "improving"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={
                                    classData.trend === "improving"
                                      ? "bg-green-500 text-white"
                                      : ""
                                  }
                                >
                                  {classData.trend === "improving"
                                    ? "进步中"
                                    : classData.trend === "declining"
                                      ? "需关注"
                                      : "稳定"}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 班级洞察 */}
                  {classComparison.insights.keyFindings.length > 0 && (
                    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
                      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                        <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center">
                          <Brain className="h-5 w-5 mr-2" />
                          关键发现
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          {classComparison.insights.keyFindings.map(
                            (finding, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-2"
                              >
                                <span className="text-[#B9FF66] font-bold">
                                  •
                                </span>
                                <p className="text-sm text-[#191A23] font-medium">
                                  {finding}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* 学生个人趋势分析结果 */}
      {studentTrend && (
        <Dialog
          open={!!studentTrend}
          onOpenChange={() => setStudentTrend(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                {studentTrend.studentInfo.studentName} - 个人趋势分析
              </DialogTitle>
              <DialogDescription>
                班级：{studentTrend.studentInfo.className} | 分析了{" "}
                {studentTrend.examHistory.length} 次考试
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* 趋势概览 */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold mb-2">
                      {renderTrendIcon(studentTrend.trendAnalysis.overallTrend)}
                    </div>
                    <p className="text-sm font-medium">总体趋势</p>
                    <p className="text-xs text-gray-600 capitalize">
                      {studentTrend.trendAnalysis.overallTrend}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold mb-2">
                      {studentTrend.trendAnalysis.bestExam.score}
                    </div>
                    <p className="text-sm font-medium">最佳成绩</p>
                    <p className="text-xs text-gray-600">
                      {studentTrend.trendAnalysis.bestExam.examTitle}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border border-gray-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold mb-2">
                      {studentTrend.predictions.riskLevel === "low"
                        ? "🟢"
                        : studentTrend.predictions.riskLevel === "medium"
                          ? "🟡"
                          : "🔴"}
                    </div>
                    <p className="text-sm font-medium">风险等级</p>
                    <p className="text-xs text-gray-600 capitalize">
                      {studentTrend.predictions.riskLevel}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 考试历史趋势图 */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="font-bold">成绩趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={studentTrend.examHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="examTitle" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="totalScore"
                          stroke="#B9FF66"
                          strokeWidth={2}
                          name="总分"
                        />
                        <Line
                          type="monotone"
                          dataKey="classRank"
                          stroke="#6B7280"
                          strokeWidth={2}
                          name="班级排名"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* 建议和预测 */}
              {studentTrend.predictions.recommendations.length > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="font-bold flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      建议和预测
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {studentTrend.predictions.recommendations.map(
                        (rec, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            <p className="text-sm">{rec}</p>
                          </div>
                        )
                      )}

                      {studentTrend.predictions.nextExamPrediction && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium">
                            📊 下次考试预测分数:{" "}
                            {studentTrend.predictions.nextExamPrediction.toFixed(
                              1
                            )}
                          </p>
                          <p className="text-xs text-gray-600">
                            置信区间:{" "}
                            {studentTrend.predictions.confidenceInterval[0].toFixed(
                              1
                            )}{" "}
                            -{" "}
                            {studentTrend.predictions.confidenceInterval[1].toFixed(
                              1
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 空状态 */}
      {comparisonResults.length === 0 && !loading && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-[#6B7280] rounded-full border-2 border-black mx-auto mb-6 w-fit">
              <Target className="h-16 w-16 text-white" />
            </div>
            <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
              开始多考试对比分析
            </p>
            <p className="text-[#191A23]/70 font-medium">
              选择至少两个考试，开始深度对比和趋势分析
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(MultiExamComparisonDashboard);
