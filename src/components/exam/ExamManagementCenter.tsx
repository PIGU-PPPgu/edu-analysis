/**
 * 考试管理中心 - 完全重新设计
 * 基于项目UI设计风格和用户体验原则
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Download,
  BookOpen,
  Clock,
  Users,
  BarChart3,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Target,
  TrendingUp,
  Activity,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Award,
  Eye,
  PenTool,
  Layers,
  Settings,
  Shield,
  Settings2,
  PieChart,
  Brain,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { formatNumber } from "@/utils/formatUtils";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  useExamData,
  type UIExam as Exam,
  type UIExamType as ExamType,
  type UIExamStatistics as ExamStatistics,
} from "./hooks/useExamData";
import type { CreateExamInput, ExamSubjectScore } from "@/services/examService";
import ExamSubjectScoreDialog from "./ExamSubjectScoreDialog";
import ReportViewer from "@/components/analysis/reports/ReportViewer";
import ExamStatsTab from "./tabs/ExamStatsTab";
import ExamSettingsTab from "./tabs/ExamSettingsTab";
import ExamListTab from "./tabs/ExamListTab";

// 类型从 useExamData hook 导入，此处无需重复定义

const ExamManagementCenter: React.FC = () => {
  const navigate = useNavigate();

  // 数据访问通过 useExamData hook 统一管理
  const {
    exams,
    examTypes,
    statistics,
    academicTerms,
    currentTerm,
    isLoading,
    createExam,
    updateExam,
    deleteExam,
    duplicateExam,
    reloadAfterDelete,
    fetchSubjectScores,
    saveSubjectScores,
    setExams,
    setStatistics,
  } = useExamData();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  // 对话框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [isSubjectScoreDialogOpen, setIsSubjectScoreDialogOpen] =
    useState(false);
  const [selectedExamForScoreConfig, setSelectedExamForScoreConfig] =
    useState<Exam | null>(null);
  const [currentExamSubjectScores, setCurrentExamSubjectScores] = useState<
    ExamSubjectScore[]
  >([]);
  const [reportExamId, setReportExamId] = useState<string | null>(null);
  const [examForm, setExamForm] = useState<Partial<Exam>>({
    title: "",
    description: "",
    type: "",
    subjects: [],
    date: "",
    startTime: "",
    endTime: "",
    totalScore: 100,
    passingScore: 60,
    classes: [],
    status: "draft",
  });

  // 处理科目总分配置
  const handleSubjectScoreConfig = async (exam: Exam) => {
    setSelectedExamForScoreConfig(exam);
    try {
      const existingScores = await fetchSubjectScores(exam.id);
      setCurrentExamSubjectScores(existingScores);
      setIsSubjectScoreDialogOpen(true);
    } catch (error) {
      console.error("加载科目总分配置失败:", error);
      toast.error("加载科目总分配置失败");
      setCurrentExamSubjectScores([]);
      setIsSubjectScoreDialogOpen(true);
    }
  };

  // 保存科目总分配置
  const handleSaveSubjectScores = async (
    scores: ExamSubjectScore[]
  ): Promise<boolean> => {
    if (!selectedExamForScoreConfig) return false;

    const scoresWithoutId = scores.map((score) => ({
      exam_id: score.exam_id,
      subject_code: score.subject_code,
      subject_name: score.subject_name,
      total_score: score.total_score,
      passing_score: score.passing_score,
      excellent_score: score.excellent_score,
      is_required: score.is_required,
      weight: score.weight,
    }));

    const success = await saveSubjectScores(
      selectedExamForScoreConfig.id,
      scoresWithoutId
    );

    if (success) {
      setCurrentExamSubjectScores(scores);
      toast.success("科目总分配置已更新，相关分析将使用新的配置");
    }

    return success;
  };

  // 状态样式映射
  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800 border-gray-200",
      scheduled: "bg-blue-100 text-blue-800 border-blue-200",
      ongoing: "bg-[#B9FF66] text-black border-[#B9FF66]",
      completed: "bg-green-100 text-green-800 border-green-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    const labels = {
      draft: "草稿",
      scheduled: "已安排",
      ongoing: "进行中",
      completed: "已完成",
      cancelled: "已取消",
    };

    return (
      <Badge
        className={`${styles[status as keyof typeof styles]} border font-medium`}
      >
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  // 统计指标卡片组件
  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    color = "text-[#B9FF66]",
    trend,
  }: {
    title: string;
    value: number | string;
    change?: number;
    icon: React.ElementType;
    color?: string;
    trend?: "up" | "down" | "stable";
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-300 rounded-lg group">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-bold text-black mb-1">{title}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl font-bold text-black">
                  {typeof value === "number" ? formatNumber(value) : value}
                </p>
                {change !== undefined && (
                  <div className="flex items-center">
                    {trend === "up" && (
                      <ArrowUpRight className="h-4 w-4 text-black" />
                    )}
                    {trend === "down" && (
                      <ArrowDownRight className="h-4 w-4 text-black" />
                    )}
                    <span
                      className={`text-xs font-bold ml-1 ${
                        trend === "up"
                          ? "text-green-600"
                          : trend === "down"
                            ? "text-red-600"
                            : "text-black"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {change}%
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs font-medium text-black">
                较上期{" "}
                {trend === "up" ? "提升" : trend === "down" ? "下降" : "持平"}
              </div>
            </div>
            <div
              className={`p-3 rounded-lg bg-[#B9FF66] border-2 border-black transition-colors duration-300`}
            >
              <Icon className={`h-6 w-6 text-black`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  // 创建或编辑考试
  const handleCreateExam = async () => {
    if (!examForm.title || !examForm.type || !examForm.date) {
      toast.error("请填写必填字段");
      return;
    }

    try {
      if (editingExamId) {
        // 编辑模式
        const updateData = {
          title: examForm.title,
          type: examForm.type,
          date: examForm.date,
          subject: examForm.subjects?.[0], // 取第一个科目作为主科目
          description: examForm.description,
          start_time: examForm.startTime,
          end_time: examForm.endTime,
          total_score: examForm.totalScore,
          passing_score: examForm.passingScore,
          status: (examForm.status as "draft" | "scheduled") || "draft",
        };

        const updatedDbExam = await updateExam(editingExamId, updateData);

        if (updatedDbExam) {
          // 更新本地列表中的考试（hook 已返回 UIExam，无需再 mapExam）
          setExams((prev) =>
            prev.map((exam) =>
              exam.id === editingExamId ? updatedDbExam : exam
            )
          );

          toast.success(`考试"${examForm.title}"更新成功`);
        }
      } else {
        // 创建模式
        const createData: CreateExamInput = {
          title: examForm.title,
          type: examForm.type,
          date: examForm.date,
          subject: examForm.subjects?.[0], // 取第一个科目作为主科目
          description: examForm.description,
          start_time: examForm.startTime,
          end_time: examForm.endTime,
          total_score: examForm.totalScore,
          passing_score: examForm.passingScore,
          status: (examForm.status as "draft" | "scheduled") || "draft",
        };

        const newDbExam = await createExam(createData);

        if (newDbExam) {
          // hook 已返回 UIExam，直接添加到列表
          setExams((prev) => [newDbExam, ...prev]);

          // 更新统计信息
          setStatistics((prev) => ({
            ...prev,
            total: prev.total + 1,
            upcoming: prev.upcoming + 1,
          }));

          toast.success(`考试"${examForm.title}"创建成功`);
        }
      }

      // 重置表单和关闭对话框
      setIsCreateDialogOpen(false);
      setEditingExamId(null);
      setExamForm({
        title: "",
        description: "",
        type: "",
        subjects: [],
        date: "",
        startTime: "",
        endTime: "",
        totalScore: 100,
        passingScore: 60,
        classes: [],
        status: "draft",
      });
    } catch (error) {
      console.error(editingExamId ? "更新考试失败:" : "创建考试失败:", error);
      toast.error(
        editingExamId ? "更新考试失败，请重试" : "创建考试失败，请重试"
      );
    }
  };

  // 跳转到分析页面
  const handleAnalysisNavigation = (exam: Exam) => {
    console.log("🚀 跳转到分析页面:", { exam });
    console.log("📊 考试数据详情:", {
      id: exam.id,
      title: exam.title,
      date: exam.date,
      type: exam.type,
    });

    // 使用考试标题作为主要筛选条件，因为grade_data表使用exam_title字段
    const params = new URLSearchParams({
      examId: exam.id,
      examTitle: exam.title,
      examDate: exam.date,
      examType: exam.type,
      // 添加考试标题作为筛选依据
      filterByTitle: "true",
    });

    const fullUrl = `/analysis/${exam.id}?${params.toString()}`;

    console.log("🔗 完整URL:", fullUrl);
    console.log("🔗 URL参数字符串:", params.toString());
    console.log("🔗 即将跳转到:", fullUrl);

    // 直接跳转，不使用setTimeout
    navigate(fullUrl);

    toast.success("正在跳转到分析...", {
      description: `已选择考试: ${exam.title}`,
      duration: 2000,
    });
  };

  // 调试功能：输出可用数据概览
  const handleDebugDataOverview = () => {
    console.log("🔍 === 数据调试概览 ===");
    console.log("📊 考试数据:", exams.length, "个考试");
    if (exams.length > 0) {
      console.log("📋 考试样本:");
      exams.slice(0, 3).forEach((exam, index) => {
        console.log(`  ${index + 1}. id: ${exam.id}, title: "${exam.title}"`);
      });
    }
    console.log("📈 统计数据:", statistics);
    console.log(
      "🔗 所有考试标题列表:",
      exams.map((e) => e.title)
    );

    toast.info("调试信息已输出到控制台", {
      description: `发现 ${exams.length} 个考试`,
      duration: 3000,
    });
  };

  // 批量操作
  const handleBatchAction = async (action: string) => {
    if (selectedExams.length === 0) {
      toast.error("请先选择要操作的考试");
      return;
    }

    switch (action) {
      case "delete":
        try {
          const success = await Promise.all(
            selectedExams.map((examId) => deleteExam(examId))
          );

          if (success.every((s) => s)) {
            setExams((prev) =>
              prev.filter((e) => !selectedExams.includes(e.id))
            );
            setStatistics((prev) => ({
              ...prev,
              total: prev.total - selectedExams.length,
            }));
            setSelectedExams([]);
            toast.success(`成功删除${selectedExams.length}个考试`);
          }
        } catch (error) {
          console.error("批量删除失败:", error);
          toast.error("批量删除失败");
        }
        break;
      case "export":
        try {
          // 如果没有选中考试，导出所有考试
          const examsToExport =
            selectedExams.length > 0
              ? exams.filter((e) => selectedExams.includes(e.id))
              : exams;

          if (examsToExport.length === 0) {
            toast.error("没有可导出的考试数据");
            return;
          }

          // 生成CSV格式的数据
          const csvHeaders = [
            "考试ID",
            "考试标题",
            "考试类型",
            "考试日期",
            "状态",
            "科目",
            "创建者",
            "创建时间",
          ];

          const csvData = examsToExport.map((exam) => [
            exam.id,
            exam.title,
            exam.type,
            exam.date,
            exam.status,
            exam.subjects.join(", "),
            exam.createdBy || "系统",
            new Date(exam.createdAt).toLocaleDateString(),
          ]);

          // 创建CSV内容
          const csvContent = [
            csvHeaders.join(","),
            ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
          ].join("\n");

          // 创建并下载文件
          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          const link = document.createElement("a");
          if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
              "download",
              `考试数据_${new Date().toISOString().split("T")[0]}.csv`
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }

          toast.success(`成功导出${examsToExport.length}个考试的数据`, {
            description: "文件已保存到下载文件夹",
          });
        } catch (error) {
          console.error("导出数据失败:", error);
          toast.error("导出数据失败，请重试");
        }
        break;
    }
  };

  // 快速操作
  const handleQuickAction = async (exam: Exam, action: string) => {
    switch (action) {
      case "edit":
        // 填充表单数据用于编辑
        setEditingExamId(exam.id);
        setExamForm({
          title: exam.title,
          description: exam.description,
          type: exam.type,
          subjects: exam.subjects,
          date: exam.date,
          startTime: exam.startTime,
          endTime: exam.endTime,
          totalScore: exam.totalScore,
          passingScore: exam.passingScore,
          classes: exam.classes,
          status: exam.status,
        });
        setIsCreateDialogOpen(true);
        toast.success(`准备编辑考试: ${exam.title}`, {
          description: "表单已填充现有数据，可直接修改",
        });
        break;
      case "duplicate":
        try {
          const duplicatedDbExam = await duplicateExam(exam.id);
          if (duplicatedDbExam) {
            // hook 已返回 UIExam，直接使用
            setExams((prev) => [duplicatedDbExam, ...prev]);
            setStatistics((prev) => ({
              ...prev,
              total: prev.total + 1,
              upcoming: prev.upcoming + 1,
            }));
          }
        } catch (error) {
          console.error("复制考试失败:", error);
        }
        break;

      case "warning-analysis":
        // 跳转到预警分析，带上考试筛选条件
        const queryParams = new URLSearchParams();
        queryParams.set("exam", exam.title);
        if (exam.date) queryParams.set("date", exam.date);
        queryParams.set("from", "exam-management");

        window.location.href = `/warning-analysis?${queryParams.toString()}`;
        toast.info(`正在跳转到预警分析，筛选条件: ${exam.title}`);
        break;
      case "delete":
        try {
          const success = await deleteExam(exam.id);
          if (success) {
            console.log("🔄 删除成功，重新加载数据...");
            await reloadAfterDelete();
            toast.success(`考试"${exam.title}"删除成功`);
          }
        } catch (error) {
          console.error("删除考试失败:", error);
          toast.error("删除考试失败，请重试");
        }
        break;
      case "view":
        // 显示考试详情的详细信息
        const examDetails = [
          `考试标题: ${exam.title}`,
          `考试类型: ${exam.type}`,
          `考试日期: ${exam.date}`,
          `状态: ${exam.status}`,
          `科目: ${exam.subjects.join(", ")}`,
          exam.startTime ? `时间: ${exam.startTime} - ${exam.endTime}` : "",
          exam.totalScore ? `总分: ${exam.totalScore}分` : "",
          exam.passingScore ? `及格分: ${exam.passingScore}分` : "",
          `创建时间: ${new Date(exam.createdAt).toLocaleString()}`,
          exam.createdBy ? `创建者: ${exam.createdBy}` : "",
        ].filter(Boolean);

        toast.success("考试详情", {
          description: examDetails.slice(0, 3).join(" | "),
          duration: 5000,
        });

        console.log("📋 考试详细信息:", {
          基本信息: {
            ID: exam.id,
            标题: exam.title,
            类型: exam.type,
            日期: exam.date,
            状态: exam.status,
          },
          详细设置: {
            科目: exam.subjects,
            开始时间: exam.startTime,
            结束时间: exam.endTime,
            总分: exam.totalScore,
            及格分: exam.passingScore,
            班级: exam.classes,
          },
          管理信息: {
            创建者: exam.createdBy,
            创建时间: exam.createdAt,
            更新时间: exam.updatedAt,
          },
        });
        break;
      case "analysis":
      case "basic-analysis":
      case "advanced-analysis":
        handleAnalysisNavigation(exam);
        break;
      case "subject-score-config":
        handleSubjectScoreConfig(exam);
        break;
      case "generate-report":
        setReportExamId(exam.id);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* 页面头部 */}
        <motion.div
          className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-[#B9FF66] text-black">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  考试管理中心
                </h1>
                <p className="text-gray-500 text-lg">
                  统一管理所有考试安排、监控和分析
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {selectedExams.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200"
              >
                <span className="text-sm font-medium text-blue-800">
                  已选择 {selectedExams.length} 个考试
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-100"
                  onClick={() => handleBatchAction("export")}
                >
                  <Download className="h-3 w-3" />
                  批量导出
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-red-600 border-red-300 hover:bg-red-100"
                  onClick={() => handleBatchAction("delete")}
                >
                  <Trash2 className="h-3 w-3" />
                  批量删除
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedExams([])}
                >
                  取消选择
                </Button>
              </motion.div>
            )}

            <Button
              variant="outline"
              className="gap-2 hover:shadow-md transition-all duration-200"
              onClick={() => handleBatchAction("export")}
            >
              <Download className="h-4 w-4" />
              导出数据
            </Button>
            <Button
              variant="outline"
              onClick={handleDebugDataOverview}
              className="gap-2 hover:shadow-md transition-all duration-200 text-blue-600 border-blue-300"
            >
              <Settings2 className="h-4 w-4" />
              调试信息
            </Button>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="gap-2 bg-[#B9FF66] text-black hover:bg-[#A3E85A] hover:shadow-lg transition-all duration-200 font-medium"
            >
              <Plus className="h-4 w-4" />
              创建考试
            </Button>
          </div>
        </motion.div>

        {/* 统计指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="总考试数"
            value={statistics.total}
            change={8.5}
            trend="up"
            icon={Calendar}
            color="text-[#B9FF66]"
          />
          <StatCard
            title="即将开始"
            value={statistics.upcoming}
            change={-2.1}
            trend="down"
            icon={Clock}
            color="text-blue-500"
          />
          <StatCard
            title="进行中"
            value={statistics.ongoing}
            change={0}
            trend="stable"
            icon={Activity}
            color="text-orange-500"
          />
          <StatCard
            title="平均分"
            value={statistics.averageScore.toFixed(1)}
            change={statistics.improvementRate}
            trend="up"
            icon={TrendingUp}
            color="text-green-500"
          />
        </div>

        {/* 主要内容区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200 rounded-xl p-1">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black rounded-lg font-medium transition-all duration-200"
              >
                <Eye className="h-4 w-4 mr-2" />
                仪表盘
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black rounded-lg font-medium transition-all duration-200"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                考试列表
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black rounded-lg font-medium transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                数据分析
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black rounded-lg font-medium transition-all duration-200"
              >
                <Settings className="h-4 w-4 mr-2" />
                设置管理
              </TabsTrigger>
            </TabsList>

            {/* 仪表盘标签页 */}
            <TabsContent value="dashboard" className="space-y-6 mt-6">
              {/* 快速操作面板 */}
              <Card className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-300 rounded-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg font-bold text-black">
                    <Zap className="h-5 w-5 text-black" />
                    快速操作
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Button
                      className="flex flex-col items-center gap-2 h-auto py-4 bg-[#B9FF66] text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-[#A3E85A] hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-200 font-bold"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-sm font-bold">创建考试</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-200 font-bold"
                      onClick={() => handleBatchAction("export")}
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-sm font-bold">导出数据</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-200 font-bold"
                      onClick={() => setActiveTab("analytics")}
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span className="text-sm font-bold">数据分析</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] transition-all duration-200 font-bold"
                      onClick={() => setActiveTab("settings")}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-sm font-bold">考试设置</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 最近考试 */}
              <Card className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-300 rounded-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-black" />
                      <span className="font-bold text-black">最近考试</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] font-bold"
                    >
                      <Eye className="h-4 w-4" />
                      查看全部
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {exams.slice(0, 3).map((exam, index) => (
                      <motion.div
                        key={exam.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        onClick={() => handleQuickAction(exam, "view")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {examTypes.find((t) => t.name === exam.type)
                              ?.emoji || "📝"}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-800">
                              {exam.title}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {exam.date} • {exam.subjects.join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(exam.status)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 考试列表标签页 */}
            <TabsContent value="list" className="mt-6">
              <ExamListTab
                exams={exams}
                examTypes={examTypes}
                academicTerms={academicTerms}
                currentTerm={currentTerm}
                isLoading={isLoading}
                selectedExams={selectedExams}
                onSelectedExamsChange={setSelectedExams}
                onQuickAction={handleQuickAction}
                onBatchAction={handleBatchAction}
                onOpenCreate={() => setIsCreateDialogOpen(true)}
              />
            </TabsContent>

            {/* 数据分析标签页 */}
            <TabsContent value="analytics" className="mt-6">
              <ExamStatsTab
                statistics={statistics}
                examTypes={examTypes}
                exams={exams}
              />
            </TabsContent>

            {/* 设置管理标签页 */}
            <TabsContent value="settings" className="space-y-6 mt-6">
              <ExamSettingsTab examTypes={examTypes} exams={exams} />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* 创建考试对话框 */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {editingExamId ? "编辑考试" : "创建新考试"}
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                {editingExamId
                  ? "修改考试信息，更新后将立即生效"
                  : "填写考试的基本信息，创建后可以继续完善详细设置"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-gray-700"
                  >
                    考试标题 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={examForm.title}
                    onChange={(e) =>
                      setExamForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="例：期中数学考试"
                    className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="type"
                    className="text-sm font-medium text-gray-700"
                  >
                    考试类型 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={examForm.type}
                    onValueChange={(value) =>
                      setExamForm((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="选择考试类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          <div className="flex items-center gap-2">
                            <span>{type.emoji}</span>
                            <span>{type.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700"
                >
                  考试描述
                </Label>
                <Textarea
                  id="description"
                  value={examForm.description}
                  onChange={(e) =>
                    setExamForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="简要描述考试内容和要求..."
                  rows={3}
                  className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="date"
                    className="text-sm font-medium text-gray-700"
                  >
                    考试日期 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={examForm.date}
                    onChange={(e) =>
                      setExamForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="startTime"
                    className="text-sm font-medium text-gray-700"
                  >
                    开始时间
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={examForm.startTime}
                    onChange={(e) =>
                      setExamForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                    className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="endTime"
                    className="text-sm font-medium text-gray-700"
                  >
                    结束时间
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={examForm.endTime}
                    onChange={(e) =>
                      setExamForm((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                    className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="totalScore"
                    className="text-sm font-medium text-gray-700"
                  >
                    总分
                  </Label>
                  <Input
                    id="totalScore"
                    type="number"
                    value={examForm.totalScore}
                    onChange={(e) =>
                      setExamForm((prev) => ({
                        ...prev,
                        totalScore: Number(e.target.value),
                      }))
                    }
                    min="1"
                    className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="passingScore"
                    className="text-sm font-medium text-gray-700"
                  >
                    及格分
                  </Label>
                  <Input
                    id="passingScore"
                    type="number"
                    value={examForm.passingScore}
                    onChange={(e) =>
                      setExamForm((prev) => ({
                        ...prev,
                        passingScore: Number(e.target.value),
                      }))
                    }
                    min="1"
                    className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingExamId(null);
                  setExamForm({
                    title: "",
                    description: "",
                    type: "",
                    subjects: [],
                    date: "",
                    startTime: "",
                    endTime: "",
                    totalScore: 100,
                    passingScore: 60,
                    classes: [],
                    status: "draft",
                  });
                }}
                className="hover:shadow-md transition-all duration-200"
              >
                取消
              </Button>
              <Button
                onClick={handleCreateExam}
                disabled={!examForm.title || !examForm.type || !examForm.date}
                className="bg-[#B9FF66] text-black hover:bg-[#A3E85A] hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {editingExamId ? (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    更新考试
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    创建考试
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 科目总分设置对话框 */}
        {selectedExamForScoreConfig && (
          <ExamSubjectScoreDialog
            open={isSubjectScoreDialogOpen}
            onOpenChange={setIsSubjectScoreDialogOpen}
            examId={selectedExamForScoreConfig.id}
            examTitle={selectedExamForScoreConfig.title}
            onSave={handleSaveSubjectScores}
            initialScores={currentExamSubjectScores}
          />
        )}

        {/* 分析报告查看器 */}
        {reportExamId && (
          <Dialog
            open={!!reportExamId}
            onOpenChange={() => setReportExamId(null)}
          >
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sr-only">
                <DialogTitle>分析报告</DialogTitle>
              </DialogHeader>
              <ReportViewer
                examId={reportExamId}
                onClose={() => setReportExamId(null)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default ExamManagementCenter;
