import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  StudentCard,
  SubmissionStatus,
} from "@/components/homework/StudentCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PenLine,
  Star,
  Save,
  X,
  Award,
  BrainCircuit,
  Sparkles,
  Check,
  Edit,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// 评分等级定义
const gradeOptions = [
  {
    value: 55,
    label: "不及格",
    color: "bg-red-500",
    borderColor: "border-red-500",
    description: "未掌握，需要重点帮助",
  },
  {
    value: 65,
    label: "及格",
    color: "bg-yellow-500",
    borderColor: "border-yellow-500",
    description: "勉强掌握，需要努力",
  },
  {
    value: 75,
    label: "一般",
    color: "bg-orange-500",
    borderColor: "border-orange-500",
    description: "部分掌握，需要巩固",
  },
  {
    value: 85,
    label: "良好",
    color: "bg-blue-500",
    borderColor: "border-blue-500",
    description: "基本掌握，有一定理解",
  },
  {
    value: 95,
    label: "优秀",
    color: "bg-green-500",
    borderColor: "border-green-500",
    description: "完全掌握，举一反三",
  },
];

// 添加未提交作业的特殊评分选项
const specialGradeOptions = [
  {
    value: 0,
    label: "未交",
    color: "bg-gray-500",
    borderColor: "border-gray-500",
    description: "学生未提交作业",
  },
  {
    value: 0,
    label: "缺勤",
    color: "bg-purple-500",
    borderColor: "border-purple-500",
    description: "学生缺勤",
  },
];

export type SubmissionWithStudent = {
  id: string;
  status: string;
  score?: number;
  students: {
    id: string;
    name: string;
    avatar?: string;
    class?: string;
  };
  submit_date?: string;
  submitted_at?: string;
  updated_at?: string;
  teacher_feedback?: string;
  knowledge_points_assessed?: boolean;
  knowledge_point_evaluation?: Array<{
    id: string;
    knowledge_point_id: string;
    mastery_level: number;
    knowledge_points?: {
      id: string;
      name: string;
    };
  }>;
  submission_knowledge_points?: Array<{
    id: string;
    knowledge_point_id: string;
    mastery_level: number;
    knowledge_points?: {
      id: string;
      name: string;
    };
  }>;
  student_knowledge_mastery?: Array<{
    id: string;
    knowledge_point_id: string;
    mastery_level: number;
    mastery_grade?: string;
    comments?: string;
    assessment_count?: number;
    knowledge_points?: {
      id: string;
      name: string;
      description?: string;
    };
  }>;
};

type KnowledgePoint = {
  id: string;
  name: string;
  description?: string;
};

interface GradeCardViewProps {
  submissions: SubmissionWithStudent[];
  knowledgePoints: KnowledgePoint[];
  onGraded: (
    submissionId: string,
    score: number,
    feedback: string,
    knowledgePointEvaluations: Array<{ id: string; masteryLevel: number }>,
    status?: string
  ) => void;
  onBatchGraded?: (
    submissionIds: string[],
    score: number,
    feedback: string
  ) => void;
  isSubmitting?: boolean;
  lastGradedSubmissionId?: string | null;
}

export default function GradeCardView({
  submissions,
  knowledgePoints,
  onGraded,
  onBatchGraded,
  isSubmitting = false,
  lastGradedSubmissionId,
}: GradeCardViewProps) {
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionWithStudent | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState("");
  const [kpEvaluations, setKpEvaluations] = useState<
    Array<{ id: string; masteryLevel: number }>
  >([]);
  const [quickGradeMode, setQuickGradeMode] = useState(false);
  const [activeTab, setActiveTab] = useState("grades");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [customKnowledgePoint, setCustomKnowledgePoint] = useState("");
  const [hoverSubmission, setHoverSubmission] = useState<string | null>(null);
  const [shouldAddKnowledgePoints, setShouldAddKnowledgePoints] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 添加新的"标记状态"模式
  const [statusMarkMode, setStatusMarkMode] = useState(false);
  const [currentStatusToMark, setCurrentStatusToMark] = useState<
    "not_submitted" | "absent"
  >("not_submitted");

  // 容器引用，用于注册事件监听
  const containerRef = useRef<HTMLDivElement>(null);

  // 添加对自定义事件的监听
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleOpenGradeDialogEvent = (event: CustomEvent) => {
      const { submission } = event.detail;
      if (submission) {
        handleOpenGradeDialog(submission);
      }
    };

    // 添加事件监听
    container.addEventListener(
      "openGradeDialog",
      handleOpenGradeDialogEvent as EventListener
    );

    // 清理事件监听
    return () => {
      container.removeEventListener(
        "openGradeDialog",
        handleOpenGradeDialogEvent as EventListener
      );
    };
  }, [submissions]); // 当submissions变化时重新注册监听

  // Initialize grading dialog - **Now fetches fresh data**
  const handleOpenGradeDialog = async (submission: SubmissionWithStudent) => {
    setSelectedSubmission(submission);
    setGradeDialogOpen(true); // Open dialog immediately
    setIsLoading(true); // Show loading state inside dialog

    try {
      // Fetch the latest submission data directly from Supabase
      console.log(`Fetching latest data for submission ID: ${submission.id}`);
      const { data: freshSubmissionData, error } = await supabase
        .from("homework_submissions")
        .select(
          `
          score,
          status,
          teacher_feedback,
          student_knowledge_mastery (*, 
            knowledge_points (id, name, description)
          )
        `
        )
        .eq("id", submission.id)
        .single();

      if (error) {
        console.error("加载详情错误:", error);
        toast.error("无法获取最新的提交详情", {
          description: "加载数据失败",
        });
        return;
      }

      console.log("Fetched fresh submission data:", freshSubmissionData);

      // Use the fresh data to set the dialog state
      setScore(
        freshSubmissionData.score !== null &&
          freshSubmissionData.score !== undefined
          ? freshSubmissionData.score
          : 85
      );
      setFeedback(freshSubmissionData.teacher_feedback || "");

      const evaluations = freshSubmissionData.student_knowledge_mastery || [];

      if (evaluations.length > 0) {
        console.log("Processing fresh KP evaluations:", evaluations.length);
        const mappedEvaluations = evaluations.map((kp) => ({
          // Ensure kp and kp.knowledge_points exist before accessing properties
          id: kp.knowledge_points?.id || kp.knowledge_point_id, // Use nested KP id first, fallback to direct id
          masteryLevel: kp.mastery_level,
        }));
        console.log("Mapped fresh KP evaluations:", mappedEvaluations);
        setKpEvaluations(mappedEvaluations);
        setShouldAddKnowledgePoints(true);
      } else {
        console.log("No KP evaluations found in fresh data.");
        setKpEvaluations([]);
        setShouldAddKnowledgePoints(false);
      }
    } catch (error) {
      console.error("打开评分对话框时发生错误:", error);
      toast.error("打开评分对话框时发生错误", {
        description: "加载错误",
      });
    } finally {
      setIsLoading(false); // Hide loading state
    }
  };

  // 快速评分处理
  const handleQuickGrade = (
    submission: SubmissionWithStudent,
    gradeValue: number,
    status?: string
  ) => {
    // 准备知识点评估数据（使用默认值或现有值）
    let evaluations = [];

    if (
      submission.knowledge_point_evaluation &&
      submission.knowledge_point_evaluation.length > 0
    ) {
      evaluations = submission.knowledge_point_evaluation.map((kp) => ({
        id: kp.knowledge_point_id,
        masteryLevel: kp.mastery_level,
      }));
    }

    // 根据评分自动生成反馈
    let gradeFeedback = getAutoFeedback(gradeValue);

    // 特殊处理未提交和缺勤状态
    if (status === "not_submitted") {
      gradeFeedback = "学生未提交作业。";
    } else if (status === "absent") {
      gradeFeedback = "学生缺勤。";
    } else if (gradeValue > 0) {
      // 如果有分数，确保状态为已批改
      status = "graded";
    }

    console.log(
      `快速评分: 学生=${submission.students.name}, 分数=${gradeValue}, 状态=${status || "graded"}`
    );

    // 提交评分
    onGraded(
      submission.id,
      gradeValue,
      gradeFeedback,
      evaluations,
      status || (gradeValue > 0 ? "graded" : undefined) // 确保有分数时状态为"graded"
    );

    // 显示成功提示
    toast({
      title: "批改成功",
      description: status
        ? `已将 ${submission.students.name} 的作业标记为${status === "absent" ? "缺勤" : "未交"}`
        : `已将 ${submission.students.name} 的作业评为${getGradeLabel(gradeValue)}（${gradeValue}分）`,
    });
  };

  // 批量评分
  const handleBatchGrade = (gradeValue: number) => {
    if (selectedSubmissions.length === 0) {
      toast({
        title: "未选择学生",
        description: "请先选择需要批量评分的学生",
        variant: "destructive",
      });
      return;
    }

    // 根据评分自动生成反馈
    const gradeFeedback = getAutoFeedback(gradeValue);

    // 如果有批量评分回调函数
    if (onBatchGraded) {
      onBatchGraded(selectedSubmissions, gradeValue, gradeFeedback);
    } else {
      // 逐个提交评分
      selectedSubmissions.forEach((submissionId) => {
        const submission = submissions.find((s) => s.id === submissionId);
        if (submission) {
          onGraded(
            submissionId,
            gradeValue,
            gradeFeedback,
            [] // 批量评分不处理知识点
          );
        }
      });
    }

    // 清空选择
    setSelectedSubmissions([]);

    // 显示成功提示
    toast({
      title: "批量评分成功",
      description: `已批量评分 ${selectedSubmissions.length} 名学生为${getGradeLabel(gradeValue)}（${gradeValue}分）`,
    });
  };

  // 根据评分获取对应标签
  const getGradeLabel = (value: number) => {
    const option = gradeOptions.find(
      (opt) => value >= opt.value - 5 && value < opt.value + 5
    );
    return option ? option.label : "未评级";
  };

  // 根据评分获取对应颜色
  const getGradeColor = (value: number) => {
    const option = gradeOptions.find(
      (opt) => value >= opt.value - 5 && value < opt.value + 5
    );
    return option ? option.color : "";
  };

  // 根据评分获取边框颜色
  const getGradeBorderColor = (value: number) => {
    const option = gradeOptions.find(
      (opt) => value >= opt.value - 5 && value < opt.value + 5
    );
    return option ? option.borderColor : "";
  };

  // 自动生成反馈文本
  const getAutoFeedback = (value: number) => {
    const templates = [
      "作业完成度高，思路清晰，概念理解准确。知识点掌握很好，逻辑性强，值得表扬！",
      "知识点掌握良好，书写整洁，有些小细节可以进一步完善。总体表现不错！",
      "基本理解了知识点，但还需要多练习巩固。书写较为整洁，但解题思路需要进一步梳理。",
      "作业有一定完成度，但概念理解不够清晰，需要加强基础知识学习。建议多做习题。",
      "作业完成度不高，基础知识薄弱，建议重新复习相关章节，并做好笔记。需要加强练习。",
    ];

    let index = 0;
    if (value >= 90) index = 0;
    else if (value >= 80) index = 1;
    else if (value >= 70) index = 2;
    else if (value >= 60) index = 3;
    else index = 4;

    return templates[index];
  };

  // 提交评分
  const handleSubmitGrade = () => {
    if (!selectedSubmission) return;

    // 确定提交哪些知识点评估
    const evaluationsToSubmit = shouldAddKnowledgePoints ? kpEvaluations : [];

    // 根据分数确定状态
    const submissionStatus = score > 0 ? "graded" : selectedSubmission.status;
    console.log(
      `详细评分: 学生=${selectedSubmission.students.name}, 分数=${score}, 状态=${submissionStatus}`
    );

    onGraded(
      selectedSubmission.id,
      score,
      feedback,
      evaluationsToSubmit,
      submissionStatus // 使用根据分数确定的状态
    );

    setGradeDialogOpen(false);

    // 显示成功提示
    toast({
      title: "批改成功",
      description: `已将 ${selectedSubmission.students.name} 的作业评为${getGradeLabel(score)}（${score}分）`,
    });
  };

  // 更新知识点掌握度
  const handleMasteryChange = (id: string, value: number) => {
    setKpEvaluations((prev) =>
      prev.map((kp) => (kp.id === id ? { ...kp, masteryLevel: value } : kp))
    );
  };

  // 添加自定义知识点
  const handleAddCustomKnowledgePoint = () => {
    if (!customKnowledgePoint.trim()) return;

    // 创建一个唯一ID
    const customId = `custom-${Date.now()}`;

    // 先尝试查找现有知识点是否有相似的
    const similarKnowledgePoint = knowledgePoints.find(
      (kp) =>
        kp.name.toLowerCase().includes(customKnowledgePoint.toLowerCase()) ||
        customKnowledgePoint.toLowerCase().includes(kp.name.toLowerCase())
    );

    if (similarKnowledgePoint) {
      // 如果找到相似知识点，提示用户并使用现有知识点
      toast({
        title: "找到相似知识点",
        description: `系统将使用已有知识点 "${similarKnowledgePoint.name}" 替代自定义知识点`,
        duration: 5000,
      });

      // 检查该知识点是否已添加
      const isAlreadyAdded = kpEvaluations.some(
        (e) => e.id === similarKnowledgePoint.id
      );

      if (!isAlreadyAdded) {
        setKpEvaluations((prev) => [
          ...prev,
          {
            id: similarKnowledgePoint.id,
            masteryLevel: 70,
          },
        ]);
      }
    } else {
      // 添加自定义知识点
      const newKp = {
        id: customId,
        masteryLevel: 70,
      };

      setKpEvaluations((prev) => [...prev, newKp]);

      toast({
        title: "添加成功",
        description: `已添加自定义知识点: ${customKnowledgePoint}`,
      });
    }

    // 清空输入框
    setCustomKnowledgePoint("");
  };

  // 移除知识点评估
  const handleRemoveKnowledgePoint = (id: string) => {
    setKpEvaluations((prev) => prev.filter((kp) => kp.id !== id));
  };

  // 切换选择学生
  const toggleSelectSubmission = (submissionId: string) => {
    setSelectedSubmissions((prev) => {
      if (prev.includes(submissionId)) {
        return prev.filter((id) => id !== submissionId);
      } else {
        return [...prev, submissionId];
      }
    });
  };

  // 选择所有学生
  const selectAllSubmissions = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissions.map((s) => s.id));
    }
  };

  // 处理卡片鼠标悬停，显示快速评分选项
  const handleCardMouseEnter = (submissionId: string) => {
    if (quickGradeMode) {
      setHoverSubmission(submissionId);
    }
  };

  // 处理卡片鼠标离开
  const handleCardMouseLeave = () => {
    setHoverSubmission(null);
  };

  // 获取知识点名称
  const getKnowledgePointName = (id: string) => {
    // 查找是否是预定义知识点
    const kp = knowledgePoints.find((k) => k.id === id);
    if (kp) return kp.name;

    // 查找是否是自定义知识点
    if (id.startsWith("custom-")) {
      // 从ID中提取时间戳部分
      const timestamp = id.replace("custom-", "");
      // 如果是当前会话添加的自定义知识点，尝试在会话存储中查找
      const sessionCustomKp = sessionStorage.getItem(`custom_kp_${timestamp}`);
      if (sessionCustomKp) return `${sessionCustomKp}`;

      return `自定义知识点 #${timestamp.slice(-4)}`;
    }

    return "未知知识点";
  };

  // 在处理添加自定义知识点时保存到sessionStorage
  useEffect(() => {
    if (customKnowledgePoint && customKnowledgePoint.trim()) {
      const customId = `custom-${Date.now()}`;
      sessionStorage.setItem(
        `custom_kp_${customId.replace("custom-", "")}`,
        customKnowledgePoint
      );
    }
  }, [kpEvaluations]);

  // 添加处理状态标记的函数
  const handleStatusMark = (
    submission: SubmissionWithStudent,
    status: "not_submitted" | "absent"
  ) => {
    // 如果作业有分数，需要先清除分数
    const score = 0; // 标记状态时始终使用0分

    // 准备自动生成反馈
    let statusFeedback =
      status === "not_submitted" ? "学生未提交作业。" : "学生请假缺勤。";

    console.log(
      `标记状态: 学生=${submission.students.name}, 状态=${status}, 分数=${score}`
    );

    // 提交评分 (使用0分)
    onGraded(
      submission.id,
      score,
      statusFeedback,
      [], // 不需要知识点评估
      status // 传递状态
    );

    // 显示成功提示
    toast({
      title: "状态已标记",
      description: `已将 ${submission.students.name} 标记为${status === "absent" ? "请假" : "未交"}`,
    });
  };

  // 批量标记状态
  const handleBatchStatusMark = (status: "not_submitted" | "absent") => {
    if (selectedSubmissions.length === 0) {
      toast({
        title: "未选择学生",
        description: "请先选择需要标记的学生",
        variant: "destructive",
      });
      return;
    }

    // 对于状态标记，始终使用0分
    const score = 0;

    // 根据状态自动生成反馈
    const statusFeedback =
      status === "not_submitted" ? "学生未提交作业。" : "学生请假缺勤。";

    console.log(
      `批量标记状态: ${selectedSubmissions.length}名学生, 状态=${status}, 分数=${score}`
    );

    // 如果有批量评分回调函数
    if (onBatchGraded) {
      onBatchGraded(selectedSubmissions, score, statusFeedback);
    } else {
      // 逐个提交评分
      selectedSubmissions.forEach((submissionId) => {
        const submission = submissions.find((s) => s.id === submissionId);
        if (submission) {
          onGraded(
            submissionId,
            score,
            statusFeedback,
            [], // 不处理知识点
            status
          );
        }
      });
    }

    // 清空选择
    setSelectedSubmissions([]);

    // 显示成功提示
    toast({
      title: "批量标记成功",
      description: `已将 ${selectedSubmissions.length} 名学生标记为${status === "absent" ? "请假" : "未交"}`,
    });
  };

  return (
    <div className="space-y-6" ref={containerRef} data-grade-card-view>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">学生作业批改</h3>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">快速评分</span>
            <button
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                quickGradeMode ? "bg-primary" : "bg-muted"
              )}
              onClick={() => {
                setQuickGradeMode(!quickGradeMode);
                if (statusMarkMode) setStatusMarkMode(false); // 关闭状态标记模式
              }}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                  quickGradeMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">批量模式</span>
            <button
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                batchMode ? "bg-primary" : "bg-muted"
              )}
              onClick={() => setBatchMode(!batchMode)}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                  batchMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* 添加标记状态开关 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">标记状态</span>
            <button
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                statusMarkMode ? "bg-primary" : "bg-muted"
              )}
              onClick={() => {
                setStatusMarkMode(!statusMarkMode);
                if (quickGradeMode) setQuickGradeMode(false); // 关闭快速评分模式
              }}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                  statusMarkMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* 当标记状态模式打开时，显示状态选择器 */}
          {statusMarkMode && (
            <div className="flex items-center gap-2 ml-4 bg-muted p-1 rounded-md">
              <Button
                size="sm"
                variant={
                  currentStatusToMark === "not_submitted"
                    ? "default"
                    : "outline"
                }
                className="h-8 text-xs"
                onClick={() => setCurrentStatusToMark("not_submitted")}
              >
                标记未交
              </Button>
              <Button
                size="sm"
                variant={
                  currentStatusToMark === "absent" ? "default" : "outline"
                }
                className="h-8 text-xs"
                onClick={() => setCurrentStatusToMark("absent")}
              >
                标记请假
              </Button>
            </div>
          )}
        </div>

        {batchMode && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllSubmissions}>
              {selectedSubmissions.length === submissions.length
                ? "取消全选"
                : "全选"}
            </Button>
            <span className="text-sm text-muted-foreground">
              已选择 {selectedSubmissions.length} 名学生
            </span>
          </div>
        )}
      </div>

      {/* 添加批量标记状态按钮区域 */}
      {batchMode && statusMarkMode && selectedSubmissions.length > 0 && (
        <div className="bg-muted p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">批量标记状态</h4>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-gray-500 text-white hover:bg-gray-600"
                onClick={() => handleBatchStatusMark("not_submitted")}
              >
                标记为未交
              </Button>
              <Button
                size="sm"
                className="bg-purple-500 text-white hover:bg-purple-600"
                onClick={() => handleBatchStatusMark("absent")}
              >
                标记为请假
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 批量评分按钮（原有代码） */}
      {batchMode && !statusMarkMode && selectedSubmissions.length > 0 && (
        <div className="bg-muted p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">批量评分</h4>
            <div className="flex gap-1">
              {gradeOptions.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  className={cn("text-white", option.color)}
                  onClick={() => handleBatchGrade(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {submissions.map((submission) => {
          // Check knowledge point evaluation status
          const hasEval =
            submission.knowledge_points_assessed === true ||
            !!(
              (submission.student_knowledge_mastery &&
                submission.student_knowledge_mastery.length > 0) ||
              (submission.knowledge_point_evaluation &&
                submission.knowledge_point_evaluation.length > 0) ||
              (submission.submission_knowledge_points &&
                submission.submission_knowledge_points.length > 0)
            );

          // Check if this is the last graded submission
          const isLastGraded = submission.id === lastGradedSubmissionId;

          return (
            <div
              key={submission.id}
              data-submission-id={submission.id}
              className={cn(
                "relative transition-all duration-200",
                batchMode && "cursor-pointer hover:shadow-md",
                batchMode &&
                  selectedSubmissions.includes(submission.id) &&
                  "ring-2 ring-primary bg-primary/5"
              )}
              onMouseEnter={() => handleCardMouseEnter(submission.id)}
              onMouseLeave={handleCardMouseLeave}
              onClick={() => {
                if (batchMode) {
                  toggleSelectSubmission(submission.id);
                } else if (statusMarkMode) {
                  // 当状态标记模式开启时，点击卡片直接标记状态
                  handleStatusMark(submission, currentStatusToMark);
                }
              }}
            >
              {batchMode && (
                <>
                  <Checkbox
                    checked={selectedSubmissions.includes(submission.id)}
                    onCheckedChange={() =>
                      toggleSelectSubmission(submission.id)
                    }
                    className="absolute top-2 left-2 z-10 bg-white"
                  />
                  {selectedSubmissions.includes(submission.id) && (
                    <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-t-primary border-l-[20px] border-l-transparent transform rotate-0"></div>
                  )}
                </>
              )}

              {/* 添加状态标识 - 增强视觉效果 */}
              {submission.status === "not_submitted" && (
                <div className="absolute top-0 right-0 z-10">
                  <Badge className="bg-gray-500 text-white font-medium px-3 py-1 rounded-bl-md rounded-tr-md">
                    未交
                  </Badge>
                </div>
              )}
              {submission.status === "absent" && (
                <div className="absolute top-0 right-0 z-10">
                  <Badge className="bg-purple-500 text-white font-medium px-3 py-1 rounded-bl-md rounded-tr-md">
                    请假
                  </Badge>
                </div>
              )}

              <StudentCard
                student={submission.students}
                status={mapSubmissionStatus(submission.status, submission)}
                score={submission.score}
                onClick={() =>
                  !batchMode &&
                  !statusMarkMode &&
                  handleOpenGradeDialog(submission)
                }
                selected={selectedSubmissions.includes(submission.id)}
                hasKnowledgePointEvaluation={hasEval}
                isLastGraded={isLastGraded}
              />
              {/* 快速评分按钮逻辑 */}
              {quickGradeMode &&
                hoverSubmission === submission.id &&
                !batchMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <div className="flex flex-wrap gap-2 justify-center max-w-[90%]">
                      {/* 根据提交状态决定显示常规评分选项还是特殊评分选项 */}
                      {submission.status === "not_submitted" ||
                      submission.status === "pending" ? (
                        // 未提交作业的学生显示特殊评分选项
                        <>
                          {specialGradeOptions.map((opt) => (
                            <Button
                              key={opt.label}
                              size="sm"
                              className={cn(
                                "px-3 py-2 h-auto",
                                opt.color,
                                "text-white font-medium hover:opacity-90",
                                submission.score === opt.value &&
                                  submission.status ===
                                    (opt.label === "未交"
                                      ? "not_submitted"
                                      : "absent")
                                  ? "ring-2 ring-white"
                                  : ""
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                // 特殊处理未交/缺勤的情况
                                handleQuickGrade(
                                  submission,
                                  opt.value,
                                  opt.label === "缺勤"
                                    ? "absent"
                                    : "not_submitted"
                                );
                              }}
                              title={`标记为${opt.label}`}
                            >
                              {opt.label}
                            </Button>
                          ))}
                          {/* 仍然提供常规评分选项，但放在特殊选项之后 */}
                          {gradeOptions.map((opt) => (
                            <Button
                              key={opt.value}
                              size="sm"
                              className={cn(
                                "px-3 py-2 h-auto",
                                opt.color,
                                "text-white font-medium hover:opacity-90",
                                submission.score === opt.value
                                  ? "ring-2 ring-white"
                                  : ""
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickGrade(submission, opt.value);
                              }}
                              title={`评为 ${opt.label} (${opt.value}分)`}
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </>
                      ) : (
                        // 已提交作业的学生只显示常规评分选项
                        gradeOptions.map((opt) => (
                          <Button
                            key={opt.value}
                            size="sm"
                            className={cn(
                              "px-3 py-2 h-auto",
                              opt.color,
                              "text-white font-medium hover:opacity-90",
                              submission.score === opt.value
                                ? "ring-2 ring-white"
                                : ""
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickGrade(submission, opt.value);
                            }}
                            title={`评为 ${opt.label} (${opt.value}分)`}
                          >
                            {opt.label}
                          </Button>
                        ))
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="px-3 py-2 h-auto bg-white text-gray-800 hover:bg-gray-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGradeDialog(submission);
                        }}
                        title="详细评分"
                      >
                        详细评分
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* 评分对话框 */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <PenLine className="h-5 w-5 mr-2" />
              快速批改学生作业
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            // Show loading indicator while fetching fresh data
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              <p className="ml-3 text-muted-foreground">正在加载最新数据...</p>
            </div>
          ) : selectedSubmission ? (
            // Render dialog content only when not loading and submission is selected
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-2 py-1">
                    学生: {selectedSubmission.students.name}
                  </Badge>
                  {selectedSubmission.submit_date && (
                    <Badge variant="outline" className="px-2 py-1">
                      提交日期: {selectedSubmission.submit_date}
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="px-2 py-1">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  快速模式
                </Badge>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="grades">
                    <Star className="h-4 w-4 mr-2" />
                    评分
                  </TabsTrigger>
                  <TabsTrigger value="kp">
                    <BrainCircuit className="h-4 w-4 mr-2" />
                    知识点评估
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="grades" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>分数评定</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score}
                            onChange={(e) => setScore(Number(e.target.value))}
                            className="w-16 text-center"
                          />
                          <Badge>{getGradeLabel(score)}</Badge>
                        </div>
                      </div>

                      <div className="pt-4 pb-2">
                        <div className="flex justify-between mb-2">
                          {gradeOptions.map((option) => (
                            <div
                              key={option.value}
                              className="flex flex-col items-center"
                            >
                              <Badge
                                className={cn(
                                  "cursor-pointer",
                                  score >= option.value - 5 &&
                                    score < option.value + 5
                                    ? option.color + " text-white"
                                    : "bg-muted"
                                )}
                                onClick={() => setScore(option.value)}
                              >
                                {option.label}
                              </Badge>
                              <span className="text-xs text-center mt-1">
                                {option.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <Slider
                          value={[score]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) => setScore(value)}
                          className="mt-6"
                        />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>不及格</span>
                          <span>及格</span>
                          <span>一般</span>
                          <span>良好</span>
                          <span>优秀</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>教师反馈</Label>
                      <Textarea
                        placeholder="请输入对该学生作业的评语和建议..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setFeedback(
                              (prev) => prev + "概念理解准确，答案完整。"
                            )
                          }
                        >
                          概念理解准确
                        </Badge>
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setFeedback((prev) => prev + "书写工整，条理清晰。")
                          }
                        >
                          书写工整
                        </Badge>
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setFeedback((prev) => prev + "计算过程规范。")
                          }
                        >
                          计算规范
                        </Badge>
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setFeedback((prev) => prev + "需要加强基础知识。")
                          }
                        >
                          加强基础
                        </Badge>
                        <Badge
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() =>
                            setFeedback(
                              (prev) => prev + "思路不够清晰，需要多加练习。"
                            )
                          }
                        >
                          思路不清
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="kp" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="add-knowledge-points"
                        checked={shouldAddKnowledgePoints}
                        onCheckedChange={(checked) => {
                          setShouldAddKnowledgePoints(!!checked);
                          if (checked && kpEvaluations.length === 0) {
                            // 默认添加所有知识点，初始掌握度为70%
                            setKpEvaluations(
                              knowledgePoints.map((kp) => ({
                                id: kp.id,
                                masteryLevel: 70,
                              }))
                            );
                          }
                        }}
                      />
                      <Label htmlFor="add-knowledge-points">
                        添加知识点评估
                      </Label>
                    </div>

                    {shouldAddKnowledgePoints && (
                      <>
                        <div className="flex justify-between items-center">
                          <Label>知识点掌握度评估</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={customKnowledgePoint}
                              onChange={(e) =>
                                setCustomKnowledgePoint(e.target.value)
                              }
                              placeholder="添加自定义知识点..."
                              className="w-48"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleAddCustomKnowledgePoint}
                              disabled={!customKnowledgePoint.trim()}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              添加
                            </Button>
                          </div>
                        </div>

                        {kpEvaluations.length > 0 ? (
                          <div className="space-y-4 mt-4">
                            {kpEvaluations.map((evaluation) => (
                              <div
                                key={evaluation.id}
                                className="space-y-2 border p-3 rounded-md"
                              >
                                <div className="flex justify-between items-center">
                                  <Label className="text-sm font-medium flex items-center gap-1">
                                    <BrainCircuit className="h-3 w-3" />
                                    {getKnowledgePointName(evaluation.id)}
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={cn(
                                        evaluation.masteryLevel >= 90
                                          ? "bg-green-500 text-white"
                                          : evaluation.masteryLevel >= 80
                                            ? "bg-blue-500 text-white"
                                            : evaluation.masteryLevel >= 70
                                              ? "bg-orange-500 text-white"
                                              : evaluation.masteryLevel >= 60
                                                ? "bg-yellow-500 text-white"
                                                : "bg-red-500 text-white"
                                      )}
                                    >
                                      {evaluation.masteryLevel}%
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveKnowledgePoint(
                                          evaluation.id
                                        )
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs">不熟悉</span>
                                  <Slider
                                    value={[evaluation.masteryLevel]}
                                    min={0}
                                    max={100}
                                    step={5}
                                    onValueChange={([value]) =>
                                      handleMasteryChange(evaluation.id, value)
                                    }
                                    className="flex-1"
                                  />
                                  <span className="text-xs">精通</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground">
                              没有关联的知识点，请添加
                            </p>
                          </div>
                        )}

                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-2">
                            可添加的知识点：
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {knowledgePoints.map((kp) => {
                              const isAdded = kpEvaluations.some(
                                (e) => e.id === kp.id
                              );
                              return (
                                <Badge
                                  key={kp.id}
                                  variant={isAdded ? "secondary" : "outline"}
                                  className={cn(
                                    "cursor-pointer",
                                    isAdded
                                      ? "opacity-50"
                                      : "hover:bg-secondary"
                                  )}
                                  onClick={() => {
                                    if (!isAdded) {
                                      setKpEvaluations((prev) => [
                                        ...prev,
                                        { id: kp.id, masteryLevel: 70 },
                                      ]);
                                    }
                                  }}
                                >
                                  {!isAdded && (
                                    <Plus className="h-3 w-3 mr-1" />
                                  )}
                                  {kp.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // Optional: Handle case where submission is null after loading (should not happen ideally)
            <div className="text-center py-10 text-muted-foreground">
              无法加载学生信息。
            </div>
          )}

          {!isLoading && (
            // Keep Footer outside the conditional content, but hide while loading
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setGradeDialogOpen(false)}
              >
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
              <Button onClick={handleSubmitGrade} disabled={isSubmitting}>
                {" "}
                {/* Disable save if parent is submitting */}
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? "保存中..." : "保存评分"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 需要确保 mapSubmissionStatus 函数存在
function mapSubmissionStatus(
  status: string,
  submission?: SubmissionWithStudent
): SubmissionStatus {
  console.log(
    `GradeCardView-映射提交状态: ${status}`,
    submission?.score ? `(分数: ${submission.score})` : ""
  );

  // 特殊处理：如果submission有分数，无论状态如何都应该显示为已批改
  if (submission && submission.score) {
    console.log(
      `检测到分数(${submission.score})但状态为"${status}"，强制映射为"graded"`
    );
    return "graded";
  }

  // Based on the possible statuses from the backend/interface
  switch (status?.toLowerCase()) {
    case "graded":
      return "graded";
    case "submitted":
      return "submitted";
    case "pending":
      return "pending"; // Assuming pending means not submitted yet
    // Add mappings for other potential statuses like 'late', 'absent'
    case "late":
      return "late";
    case "absent":
      return "absent";
    case "not_submitted":
      return "not_submitted";
    default:
      console.warn(`GradeCardView-未知状态: ${status}，默认设为未提交`);
      return "not_submitted"; // Default or if status is null/undefined
  }
}

// Helper function (if not already defined)
function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-500";
  if (score >= 80) return "text-blue-500";
  if (score >= 70) return "text-orange-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
}
