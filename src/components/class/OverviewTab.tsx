import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  FileText,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Award,
  Target,
  BookOpen,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Brain,
  Clock,
  Activity,
  Zap,
  Eye,
  UserPlus,
  Calendar,
  GraduationCap,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ScoreDistribution from "@/components/analysis/statistics/ScoreDistribution";
import { toast } from "sonner";
import { getClassDetailedAnalysisData } from "@/services/classService";
import { showError } from "@/services/errorHandler";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Class {
  id: string;
  name: string;
  grade: string;
  created_at?: string;
  averageScore?: number;
  excellentRate?: number;
  studentCount?: number;
}

interface SubjectPerformance {
  subject: string;
  avgScore: number;
  trend: "up" | "down" | "stable";
  count: number; // 参与考试的学生数
}

interface ClassStats {
  studentCount: number;
  averageScore: number;
  excellentRate: number;
  passRate: number;
  warningCount: number;
  improvementTrend: "up" | "down" | "stable";
  subjectPerformance: SubjectPerformance[];
}

interface ExamData {
  exam_title: string;
  exam_date: string;
  avgScore: number;
  studentCount: number;
}

interface Props {
  selectedClass: Class;
}

// 科目名称映射
const SUBJECT_NAMES = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  politics: "政治",
  history: "历史",
  biology: "生物",
  geography: "地理",
};

const OverviewTab: React.FC<Props> = ({ selectedClass }) => {
  const className = selectedClass.name;
  const classGrade = selectedClass.grade;
  const [isLoading, setIsLoading] = useState(false);
  const [scoreDistributionData, setScoreDistributionData] = useState<any[]>([]);

  // 考试对比相关状态
  const [availableExams, setAvailableExams] = useState<ExamData[]>([]);
  const [selectedExam1, setSelectedExam1] = useState<string>("");
  const [selectedExam2, setSelectedExam2] = useState<string>("");
  const [comparisonData, setComparisonData] = useState<any>(null);

  // Enhanced class statistics
  const [classStats, setClassStats] = useState<ClassStats>({
    studentCount: 0,
    averageScore: 0,
    excellentRate: 0,
    passRate: 0,
    warningCount: 0,
    improvementTrend: "stable",
    subjectPerformance: [],
  });

  // 获取班级所有考试列表
  const fetchAvailableExams = async () => {
    try {
      const { data: examsData, error } = await supabase
        .from("grade_data_new")
        .select("exam_title, exam_date, total_score")
        .eq("class_name", className)
        .order("exam_date", { ascending: false });

      if (error) {
        console.error("获取考试列表失败:", error);
        return;
      }

      // 按考试分组统计
      const examMap = new Map<
        string,
        { totalScore: number; count: number; date: string }
      >();

      examsData?.forEach((record: any) => {
        const examKey = record.exam_title;
        if (!examMap.has(examKey)) {
          examMap.set(examKey, {
            totalScore: 0,
            count: 0,
            date: record.exam_date,
          });
        }
        const examInfo = examMap.get(examKey)!;
        examInfo.totalScore += record.total_score || 0;
        examInfo.count += 1;
      });

      const exams: ExamData[] = Array.from(examMap.entries()).map(
        ([title, info]) => ({
          exam_title: title,
          exam_date: info.date,
          avgScore: info.totalScore / info.count,
          studentCount: info.count,
        })
      );

      setAvailableExams(exams);

      // 自动选择最近两次考试
      // exams[0]是最近一次,exams[1]是上一次
      if (exams.length >= 2) {
        setSelectedExam1(exams[1].exam_title); // 上一次考试
        setSelectedExam2(exams[0].exam_title); // 最近一次考试
      } else if (exams.length === 1) {
        // 只有一次考试时,不进行对比
        setSelectedExam1("");
        setSelectedExam2("");
      }
    } catch (error) {
      console.error("获取考试列表时出错:", error);
    }
  };

  // 获取增强的班级统计数据
  const fetchEnhancedClassStats = async () => {
    try {
      // 获取班级预警学生数量
      const { data: warningData } = await supabase
        .from("warning_records")
        .select(
          `
          student_id,
          students!inner(class_name)
        `
        )
        .eq("status", "active");

      const classWarnings =
        warningData?.filter(
          (warning: any) => warning.students?.class_name === className
        ) || [];

      // 获取班级学生成绩数据
      const { data: gradeData } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("class_name", className)
        .order("exam_date", { ascending: false });

      if (!gradeData || gradeData.length === 0) {
        setClassStats({
          studentCount: selectedClass.studentCount || 0,
          averageScore: selectedClass.averageScore || 0,
          excellentRate: selectedClass.excellentRate || 0,
          passRate: 0,
          warningCount: classWarnings.length,
          improvementTrend: "stable",
          subjectPerformance: [],
        });
        return;
      }

      // 计算及格率
      const passingGrades = gradeData.filter(
        (grade: any) => grade.total_score >= 60
      );
      const passRate = (passingGrades.length / gradeData.length) * 100;

      // 计算趋势（比较最近两次考试的平均分）- 修复:按考试分组而不是按记录数
      const examGroups = new Map<string, number[]>();
      gradeData.forEach((g: any) => {
        if (!examGroups.has(g.exam_title)) {
          examGroups.set(g.exam_title, []);
        }
        if (g.total_score !== null && g.total_score !== undefined) {
          examGroups.get(g.exam_title)!.push(g.total_score);
        }
      });

      // 获取按时间排序的考试列表(已经按exam_date倒序)
      const sortedExams = Array.from(examGroups.entries());

      let improvementTrend: "up" | "down" | "stable" = "stable";
      if (sortedExams.length >= 2) {
        const recentScores = sortedExams[0][1]; // 最近一次考试的所有分数
        const olderScores = sortedExams[1][1]; // 上一次考试的所有分数

        const recentAvg =
          recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
        const olderAvg =
          olderScores.reduce((sum, s) => sum + s, 0) / olderScores.length;

        if (recentAvg > olderAvg + 2) improvementTrend = "up";
        else if (recentAvg < olderAvg - 2) improvementTrend = "down";
      }

      // 计算各科目表现（使用真实数据）
      const subjectKeys = [
        "chinese",
        "math",
        "english",
        "physics",
        "chemistry",
        "politics",
        "history",
        "biology",
        "geography",
      ] as const;
      const subjectPerformance: SubjectPerformance[] = [];

      for (const key of subjectKeys) {
        const scoreField = `${key}_score`;
        const scores = gradeData
          .map((g: any) => g[scoreField])
          .filter(
            (score: any) => score !== null && score !== undefined && score > 0
          );

        if (scores.length > 0) {
          const avgScore =
            scores.reduce((sum: number, score: number) => sum + score, 0) /
            scores.length;

          // 计算该科目的趋势 - 修复:使用按考试分组的数据
          let trend: "up" | "down" | "stable" = "stable";
          if (sortedExams.length >= 2) {
            // 从最近两次考试的原始记录中提取该科目分数
            const recentExamTitle = sortedExams[0][0];
            const olderExamTitle = sortedExams[1][0];

            const recentSubjectScores = gradeData
              .filter((g: any) => g.exam_title === recentExamTitle)
              .map((g: any) => g[scoreField])
              .filter((s: any) => s !== null && s !== undefined && s > 0);

            const olderSubjectScores = gradeData
              .filter((g: any) => g.exam_title === olderExamTitle)
              .map((g: any) => g[scoreField])
              .filter((s: any) => s !== null && s !== undefined && s > 0);

            if (
              recentSubjectScores.length > 0 &&
              olderSubjectScores.length > 0
            ) {
              const recentSubjectAvg =
                recentSubjectScores.reduce(
                  (sum: number, s: number) => sum + s,
                  0
                ) / recentSubjectScores.length;
              const olderSubjectAvg =
                olderSubjectScores.reduce(
                  (sum: number, s: number) => sum + s,
                  0
                ) / olderSubjectScores.length;

              if (recentSubjectAvg > olderSubjectAvg + 2) trend = "up";
              else if (recentSubjectAvg < olderSubjectAvg - 2) trend = "down";
            }
          }

          subjectPerformance.push({
            subject: SUBJECT_NAMES[key],
            avgScore,
            trend,
            count: scores.length,
          });
        }
      }

      setClassStats({
        studentCount: selectedClass.studentCount || 0,
        averageScore: selectedClass.averageScore || 0,
        excellentRate: selectedClass.excellentRate || 0,
        passRate,
        warningCount: classWarnings.length,
        improvementTrend,
        subjectPerformance,
      });
    } catch (error) {
      console.error("获取增强班级统计数据失败:", error);
      setClassStats({
        studentCount: selectedClass.studentCount || 0,
        averageScore: selectedClass.averageScore || 0,
        excellentRate: selectedClass.excellentRate || 0,
        passRate: 0,
        warningCount: 0,
        improvementTrend: "stable",
        subjectPerformance: [],
      });
    }
  };

  // 获取考试对比数据
  const fetchExamComparison = async () => {
    if (!selectedExam1 || !selectedExam2) return;
    if (selectedExam1 === selectedExam2) {
      // 相同考试不进行对比
      setComparisonData(null);
      return;
    }

    try {
      // 获取两次考试的数据
      const { data: exam1Data, error: error1 } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("class_name", className)
        .eq("exam_title", selectedExam1);

      if (error1) {
        console.error("获取考试1数据失败:", error1);
        toast.error(`获取"${selectedExam1}"考试数据失败`);
        return;
      }

      const { data: exam2Data, error: error2 } = await supabase
        .from("grade_data_new")
        .select("*")
        .eq("class_name", className)
        .eq("exam_title", selectedExam2);

      if (error2) {
        console.error("获取考试2数据失败:", error2);
        toast.error(`获取"${selectedExam2}"考试数据失败`);
        return;
      }

      if (!exam1Data || !exam2Data) return;

      // 计算各科目对比
      const subjectKeys = [
        "chinese",
        "math",
        "english",
        "physics",
        "chemistry",
        "politics",
        "history",
        "biology",
        "geography",
      ] as const;
      const comparison: any[] = [];

      for (const key of subjectKeys) {
        const scoreField = `${key}_score`;

        const exam1Scores = exam1Data
          .map((g: any) => g[scoreField])
          .filter((s: any) => s !== null && s !== undefined && s > 0);
        const exam2Scores = exam2Data
          .map((g: any) => g[scoreField])
          .filter((s: any) => s !== null && s !== undefined && s > 0);

        if (exam1Scores.length > 0 && exam2Scores.length > 0) {
          const avg1 =
            exam1Scores.reduce((sum: number, s: number) => sum + s, 0) /
            exam1Scores.length;
          const avg2 =
            exam2Scores.reduce((sum: number, s: number) => sum + s, 0) /
            exam2Scores.length;

          comparison.push({
            subject: SUBJECT_NAMES[key],
            exam1Avg: avg1, // 上一次考试
            exam2Avg: avg2, // 最近一次考试
            diff: avg2 - avg1, // 最近 - 上次 = 进步值
          });
        }
      }

      setComparisonData(comparison);
    } catch (error) {
      console.error("获取考试对比数据失败:", error);
    }
  };

  // 获取班级详细分析数据
  useEffect(() => {
    if (selectedClass && selectedClass.id) {
      setIsLoading(true);

      Promise.all([
        getClassDetailedAnalysisData(selectedClass.id),
        fetchEnhancedClassStats(),
        fetchAvailableExams(),
      ])
        .then(([data]) => {
          if (
            data.scoreDistributionData &&
            data.scoreDistributionData.length > 0
          ) {
            setScoreDistributionData(data.scoreDistributionData);
          }
        })
        .catch((error) => {
          console.error("获取班级详细分析数据失败:", error);
          showError(error, {
            operation: "获取班级详细分析数据",
            classId: selectedClass.id,
          });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedClass.id]);

  // 当选择的考试改变时，更新对比数据
  useEffect(() => {
    if (selectedExam1 && selectedExam2) {
      fetchExamComparison();
    }
  }, [selectedExam1, selectedExam2]);

  return (
    <div className="space-y-6">
      {/* 核心统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 学生总数 */}
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  学生总数
                </p>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {classStats.studentCount}
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs border-[#B9FF66] text-[#5E9622]"
                >
                  {selectedClass.grade || "未设置"}年级
                </Badge>
              </div>
              <div className="h-14 w-14 bg-[#B9FF66] rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="h-7 w-7 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 班级平均分 */}
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  班级平均分
                </p>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {classStats.averageScore.toFixed(1)}
                  </div>
                  {classStats.improvementTrend === "up" && (
                    <TrendingUp className="h-5 w-5 text-[#5E9622]" />
                  )}
                  {classStats.improvementTrend === "down" && (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  {classStats.improvementTrend === "stable" && (
                    <Minus className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <Badge
                  className={`text-xs ${
                    classStats.improvementTrend === "up"
                      ? "bg-[#B9FF66] text-black hover:bg-[#A8F055]"
                      : classStats.improvementTrend === "down"
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-gray-500 hover:bg-gray-600 text-white"
                  }`}
                >
                  {classStats.improvementTrend === "up"
                    ? "上升趋势 ↑"
                    : classStats.improvementTrend === "down"
                      ? "下降趋势 ↓"
                      : "保持稳定 →"}
                </Badge>
              </div>
              <div className="h-14 w-14 bg-[#B9FF66] rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="h-7 w-7 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 优秀率 */}
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  优秀率
                </p>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {classStats.excellentRate.toFixed(1)}%
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs border-[#B9FF66] text-[#5E9622]"
                >
                  及格率: {classStats.passRate.toFixed(1)}%
                </Badge>
              </div>
              <div className="h-14 w-14 bg-[#B9FF66] rounded-2xl flex items-center justify-center shadow-lg">
                <Award className="h-7 w-7 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预警学生 */}
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  预警学生
                </p>
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {classStats.warningCount}
                </div>
                <Badge
                  className={`text-xs ${
                    classStats.warningCount === 0
                      ? "bg-[#B9FF66] text-black hover:bg-[#A8F055]"
                      : classStats.warningCount <= 3
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                        : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                >
                  {classStats.warningCount === 0 ? "全员健康 ✓" : "需要关注 !"}
                </Badge>
              </div>
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg ${
                  classStats.warningCount === 0
                    ? "bg-[#B9FF66]"
                    : "bg-orange-500"
                }`}
              >
                {classStats.warningCount === 0 ? (
                  <CheckCircle className="h-7 w-7 text-black" />
                ) : (
                  <AlertTriangle className="h-7 w-7 text-white" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 科目表现 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <BookOpen className="h-5 w-5 mr-2 text-[#5E9622]" />
            各科目表现
          </CardTitle>
          <CardDescription className="text-xs">
            基于真实成绩数据的科目平均分统计
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {classStats.subjectPerformance.length > 0 ? (
              classStats.subjectPerformance.map((subject, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-[#B9FF66]/10 rounded-lg border-2 border-black hover:shadow-[2px_2px_0px_0px_#000] transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        subject.avgScore >= 85
                          ? "bg-[#B9FF66]"
                          : subject.avgScore >= 75
                            ? "bg-[#B9FF66]/70"
                            : subject.avgScore >= 65
                              ? "bg-yellow-400"
                              : "bg-red-400"
                      }`}
                    >
                      <BookOpen className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                        {subject.subject}
                      </span>
                      <span className="text-xs text-gray-500">
                        {subject.count}条记录
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {subject.avgScore.toFixed(1)}
                    </span>
                    {subject.trend === "up" && (
                      <TrendingUp className="h-5 w-5 text-[#5E9622]" />
                    )}
                    {subject.trend === "down" && (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                    {subject.trend === "stable" && (
                      <Minus className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">暂无科目数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 考试对比 */}
      {availableExams.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
                  考试成绩对比
                </CardTitle>
                <CardDescription className="mt-1">
                  选择两次考试进行对比分析
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 考试选择器 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="inline-flex items-center gap-2">
                    上一次考试
                    <Badge variant="outline" className="text-xs">
                      对比基准
                    </Badge>
                  </span>
                </label>
                <Select value={selectedExam1} onValueChange={setSelectedExam1}>
                  <SelectTrigger className="border-2 border-blue-200 dark:border-blue-800">
                    <SelectValue placeholder="选择考试" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExams.map((exam) => (
                      <SelectItem key={exam.exam_title} value={exam.exam_title}>
                        {exam.exam_title} (
                        {new Date(exam.exam_date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="inline-flex items-center gap-2">
                    最近一次考试
                    <Badge variant="default" className="text-xs bg-green-500">
                      当前成绩
                    </Badge>
                  </span>
                </label>
                <Select value={selectedExam2} onValueChange={setSelectedExam2}>
                  <SelectTrigger className="border-2 border-green-200 dark:border-green-800">
                    <SelectValue placeholder="选择考试" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExams.map((exam) => (
                      <SelectItem key={exam.exam_title} value={exam.exam_title}>
                        {exam.exam_title} (
                        {new Date(exam.exam_date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 相同考试警告 */}
            {selectedExam1 &&
              selectedExam2 &&
              selectedExam1 === selectedExam2 && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    您选择了相同的考试,无法进行对比分析。请选择不同的考试。
                  </span>
                </div>
              )}

            {/* 对比结果 */}
            {comparisonData &&
              comparisonData.length > 0 &&
              selectedExam1 !== selectedExam2 && (
                <>
                  {/* 总体对比概况 */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          总体表现
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {comparisonData.filter((i: any) => i.diff > 0).length}
                          科进步 ·
                          {comparisonData.filter((i: any) => i.diff < 0).length}
                          科退步 ·
                          {
                            comparisonData.filter((i: any) => i.diff === 0)
                              .length
                          }
                          科持平
                        </p>
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-3xl font-bold ${
                            comparisonData.filter((i: any) => i.diff > 0)
                              .length >
                            comparisonData.filter((i: any) => i.diff < 0).length
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {comparisonData.filter((i: any) => i.diff > 0)
                            .length >
                          comparisonData.filter((i: any) => i.diff < 0).length
                            ? "↗"
                            : "↘"}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">整体趋势</p>
                      </div>
                    </div>
                  </div>

                  {/* 各科目详细对比 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {comparisonData.map((item: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          item.diff > 2
                            ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                            : item.diff < -2
                              ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {item.subject}
                          </span>
                          {Math.abs(item.diff) > 5 && (
                            <Badge
                              variant={
                                item.diff > 0 ? "default" : "destructive"
                              }
                              className="text-xs"
                            >
                              {item.diff > 0 ? "显著进步" : "需要关注"}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                              上次:
                            </span>
                            <span className="font-medium text-blue-700 dark:text-blue-400">
                              {item.exam1Avg.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">
                              最近:
                            </span>
                            <span className="font-medium text-green-700 dark:text-green-400">
                              {item.exam2Avg.toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              变化:
                            </span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-lg font-bold ${
                                  item.diff > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : item.diff < 0
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-gray-600"
                                }`}
                              >
                                {item.diff > 0 ? "+" : ""}
                                {item.diff.toFixed(1)}
                              </span>
                              {item.diff > 0 && (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              )}
                              {item.diff < 0 && (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                              )}
                              {item.diff === 0 && (
                                <Minus className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
          </CardContent>
        </Card>
      )}

      {/* 成绩分布概览 - 增强版 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-[#5E9622]" />
              成绩分布概览
            </div>
            {scoreDistributionData && scoreDistributionData.length > 0 && (
              <Badge
                variant="outline"
                className="text-xs border-[#B9FF66] text-[#5E9622]"
              >
                <Users className="h-3 w-3 mr-1 inline" />
                {scoreDistributionData.reduce(
                  (sum: number, item: any) => sum + (item.count || 0),
                  0
                )}{" "}
                人次
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="mt-1">
            班级成绩的整体分布情况 · 各分数段人数统计与占比分析
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scoreDistributionData && scoreDistributionData.length > 0 ? (
            (() => {
              // 提前计算总数,避免重复计算
              const totalStudents = scoreDistributionData.reduce(
                (sum: number, i: any) => sum + (i.count || 0),
                0
              );
              const excellentCount =
                scoreDistributionData.find((i: any) =>
                  i.range.includes("90-100")
                )?.count || 0;
              const failingCount =
                scoreDistributionData.find((i: any) => i.range.includes("<60"))
                  ?.count || 0;
              const passingCount = totalStudents - failingCount;

              const excellentRate =
                totalStudents > 0 ? (excellentCount / totalStudents) * 100 : 0;
              const passRate =
                totalStudents > 0 ? (passingCount / totalStudents) * 100 : 0;
              const failingRate =
                totalStudents > 0 ? (failingCount / totalStudents) * 100 : 0;

              return (
                <div className="space-y-6">
                  {/* 视觉化分数段分布 - 响应式优化 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {scoreDistributionData.map((item: any, index: number) => {
                      const percentage =
                        totalStudents > 0
                          ? (item.count / totalStudents) * 100
                          : 0;

                      return (
                        <div
                          key={index}
                          className="relative overflow-hidden rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg cursor-pointer"
                          style={{ borderColor: item.color }}
                        >
                          {/* 背景高度条 */}
                          <div
                            className="absolute bottom-0 left-0 right-0 opacity-10 transition-all"
                            style={{
                              backgroundColor: item.color,
                              height: `${Math.max(percentage, 5)}%`,
                            }}
                          />

                          {/* 内容 */}
                          <div className="relative p-4 text-center">
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              {item.range}
                            </div>
                            <div
                              className="text-3xl font-bold mb-1"
                              style={{ color: item.color }}
                            >
                              {item.count}
                            </div>
                            <div className="text-xs text-gray-500">
                              {percentage.toFixed(1)}%
                            </div>

                            {/* 优秀/及格徽章 */}
                            {item.range.includes("90-100") &&
                              item.count > 0 && (
                                <Badge className="mt-2 text-xs bg-green-500">
                                  优秀
                                </Badge>
                              )}
                            {item.range.includes("<60") && item.count > 0 && (
                              <Badge className="mt-2 text-xs bg-red-500">
                                需关注
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 详细分析卡片 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 优秀率 */}
                    <div className="p-4 rounded-lg bg-[#B9FF66]/10 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          优秀率
                        </span>
                        <Award className="h-4 w-4 text-[#5E9622]" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {excellentRate.toFixed(1)}%
                      </div>
                      <Progress value={excellentRate} className="mt-2 h-2" />
                    </div>

                    {/* 及格率 */}
                    <div className="p-4 rounded-lg bg-[#B9FF66]/10 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          及格率
                        </span>
                        <CheckCircle className="h-4 w-4 text-[#5E9622]" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {passRate.toFixed(1)}%
                      </div>
                      <Progress value={passRate} className="mt-2 h-2" />
                    </div>

                    {/* 待提升 */}
                    <div className="p-4 rounded-lg bg-orange-50 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          待提升
                        </span>
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {failingCount}人
                      </div>
                      <Progress value={failingRate} className="mt-2 h-2" />
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-center h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                <p className="font-semibold text-lg mb-1">暂无成绩分布数据</p>
                <p className="text-sm">成绩数据加载中或暂无考试记录</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-[#5E9622]" />
            快捷操作
          </CardTitle>
          <CardDescription>快速访问班级相关功能和管理工具</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              asChild
              variant="outline"
              className="h-auto p-6 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:bg-[#B9FF66] transition-all group bg-white"
            >
              <Link
                to={`/student-management?classId=${selectedClass.id}&className=${encodeURIComponent(className)}`}
                className="flex flex-col items-center gap-3"
              >
                <div className="h-12 w-12 bg-[#B9FF66]/20 rounded-xl flex items-center justify-center group-hover:bg-[#B9FF66] transition-colors">
                  <Users className="h-6 w-6 text-[#5E9622] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-base mb-1">学生管理</div>
                  <div className="text-xs text-gray-500">查看学生详情</div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-auto p-6 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:bg-[#B9FF66] transition-all group bg-white"
            >
              <Link
                to={`/student-portrait?classId=${selectedClass.id}&className=${encodeURIComponent(className)}`}
                className="flex flex-col items-center gap-3"
              >
                <div className="h-12 w-12 bg-[#B9FF66]/20 rounded-xl flex items-center justify-center group-hover:bg-[#B9FF66] transition-colors">
                  <Brain className="h-6 w-6 text-[#5E9622] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-base mb-1">学生画像</div>
                  <div className="text-xs text-gray-500">AI智能分析</div>
                </div>
              </Link>
            </Button>

            {classStats.warningCount > 0 && (
              <Button
                asChild
                variant="outline"
                className="h-auto p-6 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:bg-orange-100 transition-all group bg-white"
              >
                <Link
                  to={`/warning-analysis?classId=${selectedClass.id}&className=${encodeURIComponent(className)}`}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <AlertTriangle className="h-6 w-6 text-orange-600 group-hover:text-orange-700 transition-colors" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-base mb-1 text-orange-600">
                      预警分析
                    </div>
                    <div className="text-xs text-orange-500">
                      {classStats.warningCount}名学生需关注
                    </div>
                  </div>
                </Link>
              </Button>
            )}

            <Button
              asChild
              variant="outline"
              className="h-auto p-6 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:bg-[#B9FF66] transition-all group bg-white"
            >
              <Link
                to={`/homework-management?classId=${selectedClass.id}&className=${encodeURIComponent(className)}`}
                className="flex flex-col items-center gap-3"
              >
                <div className="h-12 w-12 bg-[#B9FF66]/20 rounded-xl flex items-center justify-center group-hover:bg-[#B9FF66] transition-colors">
                  <FileText className="h-6 w-6 text-[#5E9622] group-hover:text-black transition-colors" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-base mb-1">作业管理</div>
                  <div className="text-xs text-gray-500">布置与批改</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
