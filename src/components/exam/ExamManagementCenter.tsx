/**
 * 考试管理中心 - 完全重新设计
 * 基于项目UI设计风格和用户体验原则
 */

import React, { useState, useEffect, useMemo } from "react";
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
  getExams,
  getExamTypes,
  createExam,
  updateExam,
  deleteExam,
  duplicateExam,
  getExamOverviewStatistics,
  type Exam as DBExam,
  type ExamType as DBExamType,
  type CreateExamInput,
} from "@/services/examService";

// 本地类型定义（用于UI展示）
interface Exam extends Omit<DBExam, "subject" | "status"> {
  description?: string;
  typeInfo?: ExamType;
  subjects: string[];
  startTime?: string;
  endTime?: string;
  duration?: number;
  totalScore?: number;
  passingScore?: number;
  classes: string[];
  status: "draft" | "scheduled" | "ongoing" | "completed" | "cancelled";
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  participantCount?: number;
  completionRate?: number;
  averageScore?: number;
  tags?: string[];
}

// 本地考试类型定义（用于UI展示）
interface ExamType {
  id: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  isDefault: boolean;
}

// 考试统计信息
interface ExamStatistics {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  averageParticipation: number;
  averageScore: number;
  improvementRate: number;
  riskExams: number;
}

const ExamManagementCenter: React.FC = () => {
  const navigate = useNavigate();

  // 状态管理
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [statistics, setStatistics] = useState<ExamStatistics>({
    total: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    cancelled: 0,
    averageParticipation: 0,
    averageScore: 0,
    improvementRate: 0,
    riskExams: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

  // 筛选和搜索
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  // 对话框状态
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
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

  // 考试类型映射（将数据库类型转换为UI类型）
  const mapExamType = (dbType: DBExamType): ExamType => {
    const typeMap: Record<string, { color: string; emoji: string }> = {
      期中考试: { color: "#3B82F6", emoji: "📝" },
      期末考试: { color: "#EF4444", emoji: "🎯" },
      月考: { color: "#10B981", emoji: "📊" },
      小测: { color: "#F59E0B", emoji: "📋" },
      模拟考试: { color: "#8B5CF6", emoji: "🎪" },
      随堂测验: { color: "#06B6D4", emoji: "⚡" },
    };

    const typeInfo = typeMap[dbType.type_name] || {
      color: "#6B7280",
      emoji: "📄",
    };

    return {
      id: dbType.id,
      name: dbType.type_name,
      description: dbType.description || "",
      color: typeInfo.color,
      emoji: typeInfo.emoji,
      isDefault: dbType.is_system,
    };
  };

  // 数据库考试转换为UI考试
  const mapExam = (dbExam: DBExam): Exam => {
    return {
      ...dbExam,
      subjects: dbExam.subject ? [dbExam.subject] : [],
      status: "scheduled" as const, // 默认状态，实际需要基于日期判断
      createdBy: dbExam.created_by || "系统",
      createdAt: dbExam.created_at,
      updatedAt: dbExam.updated_at,
      classes: [], // 需要从其他表获取
      tags: [], // 需要从其他表获取
      typeInfo: examTypes.find((t) => t.name === dbExam.type),
    };
  };

  // 科目和班级选项
  const subjectOptions = [
    "语文",
    "数学",
    "英语",
    "物理",
    "化学",
    "生物",
    "政治",
    "历史",
    "地理",
    "信息技术",
    "体育",
    "美术",
    "音乐",
  ];

  const classOptions = [
    "高一(1)班",
    "高一(2)班",
    "高一(3)班",
    "高一(4)班",
    "高二(1)班",
    "高二(2)班",
    "高二(3)班",
    "高二(4)班",
    "高三(1)班",
    "高三(2)班",
    "高三(3)班",
    "高三(4)班",
  ];

  // 真实数据加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {
        // 并行加载考试类型和考试数据
        const [dbExamTypes, dbExams, overviewStats] = await Promise.all([
          getExamTypes(),
          getExams(),
          getExamOverviewStatistics(),
        ]);

        // 转换考试类型
        const mappedExamTypes = dbExamTypes.map(mapExamType);
        setExamTypes(mappedExamTypes);

        // 转换考试数据
        const mappedExams = dbExams.map(mapExam);
        setExams(mappedExams);

        // 设置统计信息
        if (overviewStats) {
          setStatistics(overviewStats);
        }
      } catch (error) {
        console.error("加载数据失败:", error);
        toast.error("加载数据失败，请重试");

        // 设置默认值以避免崩溃
        setExamTypes([]);
        setExams([]);
        setStatistics({
          total: 0,
          upcoming: 0,
          ongoing: 0,
          completed: 0,
          cancelled: 0,
          averageParticipation: 0,
          averageScore: 0,
          improvementRate: 0,
          riskExams: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 筛选后的考试列表
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesSearch =
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.subjects.some((s) =>
          s.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesStatus =
        statusFilter === "all" || exam.status === statusFilter;
      const matchesType = typeFilter === "all" || exam.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [exams, searchTerm, statusFilter, typeFilter]);

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
      <Card className="overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl group">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-3xl font-bold text-gray-800">
                  {typeof value === "number" ? formatNumber(value) : value}
                </p>
                {change !== undefined && (
                  <div className="flex items-center">
                    {trend === "up" && (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    )}
                    {trend === "down" && (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-medium ml-1 ${
                        trend === "up"
                          ? "text-green-600"
                          : trend === "down"
                            ? "text-red-600"
                            : "text-gray-500"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {change}%
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500">
                较上期{" "}
                {trend === "up" ? "提升" : trend === "down" ? "下降" : "持平"}
              </div>
            </div>
            <div
              className={`p-3 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors duration-300`}
            >
              <Icon className={`h-6 w-6 ${color}`} />
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
          // 更新本地列表中的考试
          const updatedExam = mapExam(updatedDbExam);
          setExams((prev) =>
            prev.map((exam) => (exam.id === editingExamId ? updatedExam : exam))
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
          // 转换为UI格式并添加到列表
          const newExam = mapExam(newDbExam);
          setExams((prev) => [newExam, ...prev]);

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
  const handleAnalysisNavigation = (
    exam: Exam,
    analysisType: "basic" | "advanced"
  ) => {
    console.log("🚀 跳转到分析页面:", { exam, analysisType });
    console.log("📊 考试数据详情:", {
      id: exam.id,
      title: exam.title,
      date: exam.date,
      type: exam.type,
    });

    // 使用考试标题作为主要筛选条件，因为grade_data_new表使用exam_title字段
    const params = new URLSearchParams({
      examId: exam.id,
      examTitle: exam.title,
      examDate: exam.date,
      examType: exam.type,
      // 添加考试标题作为筛选依据
      filterByTitle: "true",
    });

    const route =
      analysisType === "basic" ? "/grade-analysis" : "/advanced-analysis";
    const fullUrl = `${route}?${params.toString()}`;

    console.log("🔗 完整URL:", fullUrl);
    console.log("🔗 URL参数字符串:", params.toString());
    console.log("🔗 即将跳转到:", fullUrl);

    // 直接跳转，不使用setTimeout
    navigate(fullUrl);

    toast.success(
      `正在跳转到${analysisType === "basic" ? "基础" : "高级"}分析...`,
      {
        description: `已选择考试: ${exam.title}`,
        duration: 2000,
      }
    );
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
            const duplicatedExam = mapExam(duplicatedDbExam);
            setExams((prev) => [duplicatedExam, ...prev]);
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
      case "delete":
        try {
          const success = await deleteExam(exam.id);
          if (success) {
            // 重新从数据库加载数据，确保数据同步
            console.log("🔄 删除成功，重新加载数据...");
            const [dbExamTypes, dbExams, overviewStats] = await Promise.all([
              getExamTypes(),
              getExams(),
              getExamOverviewStatistics(),
            ]);

            const mappedExamTypes = dbExamTypes.map(mapExamType);
            setExamTypes(mappedExamTypes);

            const mappedExams = dbExams.map(mapExam);
            setExams(mappedExams);

            if (overviewStats) {
              setStatistics(overviewStats);
            }

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
      case "basic-analysis":
        handleAnalysisNavigation(exam, "basic");
        break;
      case "advanced-analysis":
        handleAnalysisNavigation(exam, "advanced");
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
              <Card className="border border-gray-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-[#B9FF66]" />
                    快速操作
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Button
                      className="flex flex-col items-center gap-2 h-auto py-4 bg-[#B9FF66] text-black hover:bg-[#A3E85A] transition-all duration-200"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-sm font-medium">创建考试</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4 hover:shadow-md transition-all duration-200"
                      onClick={() => handleBatchAction("export")}
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-sm font-medium">导出数据</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4 hover:shadow-md transition-all duration-200"
                      onClick={() => setActiveTab("analytics")}
                    >
                      <BarChart3 className="h-5 w-5" />
                      <span className="text-sm font-medium">数据分析</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4 hover:shadow-md transition-all duration-200"
                      onClick={() => setActiveTab("settings")}
                    >
                      <Settings className="h-5 w-5" />
                      <span className="text-sm font-medium">考试设置</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 最近考试 */}
              <Card className="border border-gray-200 bg-white hover:shadow-lg transition-all duration-300 rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[#B9FF66]" />
                      最近考试
                    </div>
                    <Button variant="outline" size="sm" className="gap-1">
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
            <TabsContent value="list" className="space-y-6 mt-6">
              {/* 搜索和筛选 */}
              <Card className="border border-gray-200 bg-white rounded-xl">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="搜索考试标题、描述或科目..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="w-32 border-gray-200">
                          <SelectValue placeholder="状态" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部状态</SelectItem>
                          <SelectItem value="draft">草稿</SelectItem>
                          <SelectItem value="scheduled">已安排</SelectItem>
                          <SelectItem value="ongoing">进行中</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-32 border-gray-200">
                          <SelectValue placeholder="类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">全部类型</SelectItem>
                          {examTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.emoji} {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 hover:shadow-md transition-all duration-200"
                      >
                        <RefreshCw className="h-4 w-4" />
                        刷新
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 考试卡片列表 */}
              <div className="grid gap-4">
                <AnimatePresence>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#B9FF66] mr-2" />
                      <span className="text-gray-500">加载考试数据中...</span>
                    </div>
                  ) : filteredExams.length === 0 ? (
                    <Card className="border border-gray-200 bg-white rounded-xl">
                      <CardContent className="p-12 text-center">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-600 mb-2">
                          暂无考试数据
                        </h3>
                        <p className="text-gray-500 mb-4">
                          {searchTerm ||
                          statusFilter !== "all" ||
                          typeFilter !== "all"
                            ? "没有找到符合条件的考试，请调整筛选条件"
                            : "还没有创建任何考试，点击上方按钮开始创建"}
                        </p>
                        {!searchTerm &&
                          statusFilter === "all" &&
                          typeFilter === "all" && (
                            <Button
                              onClick={() => setIsCreateDialogOpen(true)}
                              className="bg-[#B9FF66] text-black hover:bg-[#A3E85A]"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              创建第一个考试
                            </Button>
                          )}
                      </CardContent>
                    </Card>
                  ) : (
                    filteredExams.map((exam, index) => (
                      <motion.div
                        key={exam.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card
                          className={`border-2 transition-all duration-300 rounded-xl group ${
                            selectedExams.includes(exam.id)
                              ? "border-[#B9FF66] bg-[#B9FF66]/5 shadow-lg"
                              : "border-gray-200 bg-white hover:shadow-lg hover:border-gray-300"
                          }`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                {/* 选择框 */}
                                <div className="mt-1">
                                  <input
                                    type="checkbox"
                                    checked={selectedExams.includes(exam.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedExams((prev) => [
                                          ...prev,
                                          exam.id,
                                        ]);
                                      } else {
                                        setSelectedExams((prev) =>
                                          prev.filter((id) => id !== exam.id)
                                        );
                                      }
                                    }}
                                    className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                                  />
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="text-2xl">
                                      {examTypes.find(
                                        (t) => t.name === exam.type
                                      )?.emoji || "📝"}
                                    </div>
                                    <div>
                                      <h3 className="text-xl font-semibold text-gray-800 group-hover:text-[#B9FF66] transition-colors duration-200">
                                        {exam.title}
                                      </h3>
                                      <div className="flex items-center gap-2 mt-1">
                                        {getStatusBadge(exam.status)}
                                        <Badge
                                          variant="outline"
                                          className="border-gray-300"
                                        >
                                          {exam.type}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {exam.description && (
                                    <p className="text-gray-600 mb-4">
                                      {exam.description}
                                    </p>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-700">
                                        {exam.date}
                                      </span>
                                    </div>

                                    {exam.startTime && (
                                      <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">
                                          {exam.startTime} - {exam.endTime}
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                      <BookOpen className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-700">
                                        {exam.subjects.join(", ")}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-700">
                                        {exam.participantCount ||
                                          exam.classes.length}{" "}
                                        参与者
                                      </span>
                                    </div>
                                  </div>

                                  {exam.status === "completed" &&
                                    exam.averageScore && (
                                      <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 rounded-lg">
                                        <Award className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-800">
                                          平均分:{" "}
                                          <strong>
                                            {exam.averageScore.toFixed(1)}
                                          </strong>{" "}
                                          | 完成率:{" "}
                                          <strong>
                                            {exam.completionRate?.toFixed(1)}%
                                          </strong>
                                        </span>
                                      </div>
                                    )}

                                  {exam.tags && exam.tags.length > 0 && (
                                    <div className="flex gap-1 mt-3">
                                      {exam.tags.map((tag) => (
                                        <Badge
                                          key={tag}
                                          variant="secondary"
                                          className="text-xs bg-gray-100 text-gray-700"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-4">
                                {/* 分析按钮组 */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 hover:shadow-md transition-all duration-200 hover:border-[#B9FF66] hover:text-[#B9FF66]"
                                    onClick={() =>
                                      handleQuickAction(exam, "basic-analysis")
                                    }
                                  >
                                    <BarChart3 className="h-4 w-4" />
                                    基础分析
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 hover:shadow-md transition-all duration-200 hover:border-[#B9FF66] hover:text-[#B9FF66]"
                                    onClick={() =>
                                      handleQuickAction(
                                        exam,
                                        "advanced-analysis"
                                      )
                                    }
                                  >
                                    <TrendingUp className="h-4 w-4" />
                                    高级分析
                                  </Button>
                                </div>

                                {exam.status === "completed" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1 hover:shadow-md transition-all duration-200"
                                    onClick={() =>
                                      handleQuickAction(exam, "view")
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                    查看详情
                                  </Button>
                                )}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="hover:bg-gray-100"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleQuickAction(exam, "edit")
                                      }
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      编辑考试
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleQuickAction(exam, "view")
                                      }
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      查看详情
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleQuickAction(exam, "duplicate")
                                      }
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      复制考试
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (
                                          confirm(
                                            `确定要删除考试"${exam.title}"吗？此操作不可撤销。`
                                          )
                                        ) {
                                          handleQuickAction(exam, "delete");
                                        }
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      删除考试
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </TabsContent>

            {/* 数据分析标签页 */}
            <TabsContent value="analytics" className="space-y-6 mt-6">
              {/* 考试统计概览 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          考试数量分布
                        </p>
                        <p className="text-2xl font-bold">{statistics.total}</p>
                        <p className="text-xs text-blue-600 flex items-center mt-1">
                          <Activity className="h-3 w-3 mr-1" />
                          活跃考试管理
                        </p>
                      </div>
                      <Calendar className="h-8 w-8 text-[#B9FF66]" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          平均参与率
                        </p>
                        <p className="text-2xl font-bold">
                          {statistics.averageParticipation.toFixed(1)}%
                        </p>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                          <Users className="h-3 w-3 mr-1" />
                          学生参与度高
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          平均成绩
                        </p>
                        <p className="text-2xl font-bold">
                          {statistics.averageScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-purple-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          整体表现良好
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          改进率
                        </p>
                        <p className="text-2xl font-bold">
                          +{statistics.improvementRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          持续提升
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 考试类型分析 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-[#B9FF66]" />
                      考试类型分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {examTypes.map((type, index) => (
                        <div
                          key={type.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{type.emoji}</span>
                            <span className="font-medium">{type.name}</span>
                          </div>
                          <Badge variant="outline">
                            {exams.filter((e) => e.type === type.name).length}{" "}
                            个
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      考试状态分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">即将开始</span>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {statistics.upcoming} 个
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-orange-600" />
                          <span className="font-medium">进行中</span>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800">
                          {statistics.ongoing} 个
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <span className="font-medium">已完成</span>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {statistics.completed} 个
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 数据洞察 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    数据洞察与建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-800">优势表现</h4>
                      </div>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• 考试参与率保持在高水平</li>
                        <li>• 学生整体成绩呈上升趋势</li>
                        <li>• 考试安排合理，时间分布均匀</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <h4 className="font-medium text-orange-800">关注点</h4>
                      </div>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• 部分考试类型分布不均</li>
                        <li>• 需要增加形成性评估</li>
                        <li>• 考试难度需要进一步调整</li>
                      </ul>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-5 w-5 text-blue-600" />
                        <h4 className="font-medium text-blue-800">改进建议</h4>
                      </div>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• 增加小测频次，及时反馈</li>
                        <li>• 优化考试时间安排</li>
                        <li>• 建立考试数据档案系统</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 设置管理标签页 */}
            <TabsContent value="settings" className="space-y-6 mt-6">
              {/* 考试类型管理 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-[#B9FF66]" />
                      考试类型管理
                    </div>
                    <Button
                      size="sm"
                      className="bg-[#B9FF66] text-black hover:bg-[#A3E85A]"
                      onClick={() => toast.success("添加考试类型功能开发中")}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加类型
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {examTypes.map((type) => (
                      <div
                        key={type.id}
                        className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{type.emoji}</span>
                            <span className="font-medium">{type.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                toast.success(`编辑${type.name}功能开发中`)
                              }
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {!type.isDefault && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  toast.success(`删除${type.name}功能开发中`)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          {type.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge
                            variant={type.isDefault ? "default" : "secondary"}
                          >
                            {type.isDefault ? "系统默认" : "自定义"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {exams.filter((e) => e.type === type.name).length}{" "}
                            个考试
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 评分设置 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-500" />
                      评分标准设置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultTotalScore">默认总分</Label>
                      <Input
                        id="defaultTotalScore"
                        type="number"
                        defaultValue="100"
                        className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passingScore">及格分数</Label>
                      <Input
                        id="passingScore"
                        type="number"
                        defaultValue="60"
                        className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="excellentScore">优秀分数</Label>
                      <Input
                        id="excellentScore"
                        type="number"
                        defaultValue="90"
                        className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                      />
                    </div>
                    <Button
                      className="w-full bg-blue-500 hover:bg-blue-600"
                      onClick={() => toast.success("评分标准保存功能开发中")}
                    >
                      保存设置
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      考试时间设置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultDuration">
                        默认考试时长（分钟）
                      </Label>
                      <Input
                        id="defaultDuration"
                        type="number"
                        defaultValue="120"
                        className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bufferTime">考试间隔时间（分钟）</Label>
                      <Input
                        id="bufferTime"
                        type="number"
                        defaultValue="30"
                        className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="advanceNotice">
                        提前通知时间（小时）
                      </Label>
                      <Input
                        id="advanceNotice"
                        type="number"
                        defaultValue="24"
                        className="border-gray-200 focus:border-[#B9FF66] focus:ring-[#B9FF66]"
                      />
                    </div>
                    <Button
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={() => toast.success("时间设置保存功能开发中")}
                    >
                      保存设置
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* 通知设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-purple-500" />
                    通知设置
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">考试提醒</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">考试前提醒</p>
                            <p className="text-sm text-gray-600">
                              在考试开始前发送提醒
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">成绩发布通知</p>
                            <p className="text-sm text-gray-600">
                              成绩公布时自动通知
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">系统通知</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">考试创建通知</p>
                            <p className="text-sm text-gray-600">
                              新考试创建时通知相关人员
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">异常情况预警</p>
                            <p className="text-sm text-gray-600">
                              检测到异常时发送预警
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="w-4 h-4 text-[#B9FF66] bg-gray-100 border-gray-300 rounded focus:ring-[#B9FF66] focus:ring-2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button
                      className="bg-purple-500 hover:bg-purple-600"
                      onClick={() => toast.success("通知设置保存功能开发中")}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      保存通知设置
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 数据管理 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-green-500" />
                    数据管理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => toast.success("数据导出功能开发中")}
                    >
                      <Download className="h-5 w-5" />
                      <span>导出考试数据</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => toast.success("数据备份功能开发中")}
                    >
                      <RefreshCw className="h-5 w-5" />
                      <span>备份数据</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => toast.success("数据清理功能开发中")}
                    >
                      <Trash2 className="h-5 w-5" />
                      <span>数据清理</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
      </div>
    </div>
  );
};

export default ExamManagementCenter;
