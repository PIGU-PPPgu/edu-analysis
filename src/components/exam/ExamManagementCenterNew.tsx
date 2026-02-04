/**
 * 重构后的考试管理中心
 * 基于统一数据架构和模块化组件设计
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Download,
  Trash2,
  RefreshCw,
  BarChart3,
  List,
  Settings as SettingsIcon,
} from "lucide-react";

// 导入统一数据服务
import { examDataService } from "@/services/domains/ExamDataService";
import { domainServices } from "@/services/domains";

// 导入原有服务作为备用
import {
  getExamTypes,
  getAcademicTerms,
  getCurrentAcademicTerm,
  getExamSubjectScores,
  saveExamSubjectScores,
  getExamActiveSubjects,
  duplicateExam as originalDuplicateExam,
  type CreateExamInput,
} from "@/services/examService";
import { supabase } from "@/integrations/supabase/client";
import { buildDerivedExams } from "@/contexts/ModernGradeAnalysisContext";

// 导入子组件
import {
  ExamStatsOverview,
  ExamFiltersComponent,
  ExamList,
  ExamDialog,
  SubjectScoreDialog,
} from "./components";

// 导入类型
import {
  Exam,
  ExamType,
  AcademicTerm,
  ExamStatistics,
  ExamFilters,
  ExamFormData,
  DialogStates,
  ExamSubjectScore,
  EXAM_TYPE_MAP,
} from "./types";

const ExamManagementCenterNew: React.FC = () => {
  const navigate = useNavigate();

  // 数据状态
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);
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

  // UI状态
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // 筛选状态
  const [filters, setFilters] = useState<ExamFilters>({
    searchTerm: "",
    statusFilter: "all",
    typeFilter: "all",
    selectedTermId: "all",
  });

  // 对话框状态
  const [dialogStates, setDialogStates] = useState<DialogStates>({
    isCreateDialogOpen: false,
    editingExamId: null,
    isSubjectScoreDialogOpen: false,
    selectedExamForScoreConfig: null,
  });

  // 科目分数配置状态
  const [currentExamSubjectScores, setCurrentExamSubjectScores] = useState<
    ExamSubjectScore[]
  >([]);
  const [availableSubjects, setAvailableSubjects] = useState<
    Array<{ code: string; name: string; configured: boolean }>
  >([]);

  // 数据库考试转换为UI考试
  const mapExam = (dbExam: any): Exam => {
    return {
      ...dbExam,
      subjects: dbExam.subject ? [dbExam.subject] : [],
      status: determineExamStatus(dbExam),
      createdBy: dbExam.created_by || "系统",
      createdAt: dbExam.created_at,
      updatedAt: dbExam.updated_at,
      classes: [], // 需要从其他表获取
      tags: [], // 需要从其他表获取
      participantCount: 0, // 将在加载后异步更新
      typeInfo: examTypes.find((t) => t.name === dbExam.type),
    };
  };

  // 考试类型映射
  const mapExamType = (dbType: any): ExamType => {
    const typeInfo = EXAM_TYPE_MAP[dbType.type_name] || {
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

  // 确定考试状态
  const determineExamStatus = (
    exam: any
  ): "draft" | "scheduled" | "ongoing" | "completed" | "cancelled" => {
    // 简化的状态判断逻辑，实际应该基于日期和时间
    return "scheduled";
  };

  // 兜底：从 grade_data 派生考试列表
  const loadDerivedExamsFromGrades = async (): Promise<Exam[]> => {
    try {
      const { data, error } = await supabase
        .from("grade_data")
        .select(
          "exam_id, exam_title, exam_type, exam_date, created_at, updated_at"
        )
        .limit(500);

      if (error) {
        console.warn("[ExamManagementCenterNew] 派生考试失败:", error);
        return [];
      }

      const derived = buildDerivedExams(data || []);
      return derived.map(mapExam);
    } catch (err) {
      console.warn("[ExamManagementCenterNew] 派生考试异常:", err);
      return [];
    }
  };

  // 加载考试列表
  const loadExams = async () => {
    try {
      setIsLoading(true);
      console.log("[ExamManagementCenter] 使用新数据服务加载考试列表");

      // 构建筛选条件
      const filter = {
        searchTerm: filters.searchTerm,
        statusFilter:
          filters.statusFilter !== "all" ? filters.statusFilter : undefined,
        typeFilter:
          filters.typeFilter !== "all" ? filters.typeFilter : undefined,
        termId:
          filters.selectedTermId !== "all" ? filters.selectedTermId : undefined,
        dateRange: filters.dateRange,
        limit: 100,
      };

      // 使用新的统一数据服务
      const examData = await examDataService.getExams(filter);
      let mappedExams = examData.map(mapExam).sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : 0;
        const bDate = b.date ? new Date(b.date).getTime() : 0;
        if (bDate !== aDate) return bDate - aDate;
        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bCreated - aCreated;
      });

      if (mappedExams.length === 0) {
        const derived = await loadDerivedExamsFromGrades();
        const mergedMap = new Map(mappedExams.map((exam) => [exam.id, exam]));
        derived.forEach((exam) => {
          if (!mergedMap.has(exam.id)) {
            mergedMap.set(exam.id, exam);
          }
        });
        mappedExams = Array.from(mergedMap.values());
        if (derived.length > 0) {
          toast.info("已从成绩数据推断考试列表（exams 表为空）");
        }
      }

      // 异步更新参与人数
      const examsWithParticipants = await Promise.all(
        mappedExams.map(async (exam) => {
          try {
            const participantCount =
              await examDataService.getExamParticipantCount(exam.id);
            return { ...exam, participantCount };
          } catch (error) {
            console.warn(
              `[ExamManagementCenter] 获取考试 ${exam.id} 参与人数失败:`,
              error
            );
            return exam;
          }
        })
      );

      setExams(examsWithParticipants);

      // 更新统计信息
      updateStatistics(examsWithParticipants);

      console.log(
        `[ExamManagementCenter] 成功加载 ${examsWithParticipants.length} 个考试`
      );
    } catch (error) {
      console.error("[ExamManagementCenter] 加载考试列表失败:", error);
      toast.error("加载考试列表失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 更新统计信息
  const updateStatistics = (examList: Exam[]) => {
    const stats: ExamStatistics = {
      total: examList.length,
      upcoming: examList.filter((e) => e.status === "scheduled").length,
      ongoing: examList.filter((e) => e.status === "ongoing").length,
      completed: examList.filter((e) => e.status === "completed").length,
      cancelled: examList.filter((e) => e.status === "cancelled").length,
      averageParticipation:
        examList.length > 0
          ? examList.reduce((sum, e) => sum + (e.participantCount || 0), 0) /
            examList.length
          : 0,
      averageScore: 75, // 需要从实际数据计算
      improvementRate: 5.2, // 需要从实际数据计算
      riskExams: examList.filter((e) => (e.participantCount || 0) < 10).length,
    };
    setStatistics(stats);
  };

  // 加载基础数据
  const loadBaseData = async () => {
    try {
      const [typesData, termsData, currentTermData] = await Promise.all([
        getExamTypes(),
        getAcademicTerms(),
        getCurrentAcademicTerm(),
      ]);

      setExamTypes(typesData.map(mapExamType));
      setAcademicTerms(termsData);
      setCurrentTerm(currentTermData);

      // 如果没有选择学期，默认选择当前学期
      if (filters.selectedTermId === "all" && currentTermData) {
        setFilters((prev) => ({
          ...prev,
          selectedTermId: currentTermData.id,
        }));
      }
    } catch (error) {
      console.error("[ExamManagementCenter] 加载基础数据失败:", error);
      toast.error("加载基础数据失败");
    }
  };

  // 创建/更新考试
  const handleSaveExam = async (examData: ExamFormData) => {
    try {
      setIsLoading(true);
      console.log("[ExamManagementCenter] 保存考试:", examData.title);

      if (dialogStates.editingExamId) {
        // 更新考试
        const updatedExam = await examDataService.updateExam(
          dialogStates.editingExamId,
          examData
        );
        if (updatedExam) {
          toast.success("考试更新成功");
          await loadExams(); // 重新加载列表
        }
      } else {
        // 创建考试
        const createPayload: CreateExamInput = {
          ...examData,
          status: examData.status === "scheduled" ? "scheduled" : "draft",
        };
        const newExam = await examDataService.createExam(createPayload);
        if (newExam) {
          toast.success("考试创建成功");
          await loadExams(); // 重新加载列表
        }
      }

      // 关闭对话框
      setDialogStates((prev) => ({
        ...prev,
        isCreateDialogOpen: false,
        editingExamId: null,
      }));
    } catch (error) {
      console.error("[ExamManagementCenter] 保存考试失败:", error);
      toast.error("保存考试失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 删除考试
  const handleDeleteExam = async (examId: string) => {
    try {
      console.log("[ExamManagementCenter] 删除考试:", examId);

      const success = await examDataService.deleteExam(examId);
      if (success) {
        toast.success("考试删除成功");
        setSelectedExams((prev) => prev.filter((id) => id !== examId));
        await loadExams(); // 重新加载列表
      }
    } catch (error) {
      console.error("[ExamManagementCenter] 删除考试失败:", error);
      toast.error("删除考试失败");
    }
  };

  // 复制考试
  const handleDuplicateExam = async (exam: Exam) => {
    try {
      console.log("[ExamManagementCenter] 复制考试:", exam.title);

      const duplicatedExam = await examDataService.duplicateExam(exam.id);
      if (duplicatedExam) {
        toast.success("考试复制成功");
        await loadExams(); // 重新加载列表
      }
    } catch (error) {
      console.error("[ExamManagementCenter] 复制考试失败:", error);
      toast.error("复制考试失败");
    }
  };

  // 配置科目分数
  const handleConfigureSubjectScores = async (exam: Exam) => {
    try {
      console.log("[ExamManagementCenter] 配置科目分数:", exam.title);

      // 获取当前配置
      const [currentScores, activeSubjects] = await Promise.all([
        getExamSubjectScores(exam.id),
        getExamActiveSubjects(exam.id),
      ]);

      setCurrentExamSubjectScores(currentScores);
      setAvailableSubjects(activeSubjects.configuredSubjects || []);

      setDialogStates((prev) => ({
        ...prev,
        isSubjectScoreDialogOpen: true,
        selectedExamForScoreConfig: exam,
      }));
    } catch (error) {
      console.error("[ExamManagementCenter] 获取科目配置失败:", error);
      toast.error("获取科目配置失败");
    }
  };

  // 保存科目分数配置
  const handleSaveSubjectScores = async (scores: ExamSubjectScore[]) => {
    try {
      console.log("[ExamManagementCenter] 保存科目分数配置");

      if (!dialogStates.selectedExamForScoreConfig) {
        toast.error("未选择考试，无法保存科目配置");
        return;
      }

      await saveExamSubjectScores(
        dialogStates.selectedExamForScoreConfig.id,
        scores
      );
      toast.success("科目分数配置保存成功");

      setDialogStates((prev) => ({
        ...prev,
        isSubjectScoreDialogOpen: false,
        selectedExamForScoreConfig: null,
      }));
    } catch (error) {
      console.error("[ExamManagementCenter] 保存科目配置失败:", error);
      toast.error("保存科目配置失败");
    }
  };

  // 导出考试
  const handleExportExam = (exam: Exam) => {
    console.log("[ExamManagementCenter] 导出考试:", exam.title);
    toast.info("导出功能开发中...");
  };

  // 编辑考试
  const handleEditExam = (exam: Exam) => {
    setDialogStates((prev) => ({
      ...prev,
      isCreateDialogOpen: true,
      editingExamId: exam.id,
    }));
  };

  // 过滤考试列表
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // 搜索条件
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (
          !exam.title.toLowerCase().includes(searchLower) &&
          !exam.description?.toLowerCase().includes(searchLower) &&
          !exam.type.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // 状态筛选
      if (
        filters.statusFilter !== "all" &&
        exam.status !== filters.statusFilter
      ) {
        return false;
      }

      // 类型筛选
      if (filters.typeFilter !== "all" && exam.type !== filters.typeFilter) {
        return false;
      }

      return true;
    });
  }, [exams, filters]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadBaseData();
  }, []);

  // 筛选条件变化时重新加载
  useEffect(() => {
    if (examTypes.length > 0) {
      loadExams();
    }
  }, [filters, examTypes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">📝</div>
              考试管理中心
            </h1>
            <p className="text-gray-600 mt-2">
              统一管理所有考试，支持创建、编辑、统计分析和成绩配置
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => domainServices.clearAllCaches()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新缓存
            </Button>
            <Button
              onClick={() =>
                setDialogStates((prev) => ({
                  ...prev,
                  isCreateDialogOpen: true,
                  editingExamId: null,
                }))
              }
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              创建考试
            </Button>
          </div>
        </div>

        {/* 主要内容 */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              概览统计
            </TabsTrigger>
            <TabsTrigger value="exams" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              考试管理
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              系统设置
            </TabsTrigger>
          </TabsList>

          {/* 概览统计 */}
          <TabsContent value="dashboard">
            <ExamStatsOverview statistics={statistics} isLoading={isLoading} />

            {/* 最近考试预览 */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>最近考试</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredExams.slice(0, 5).map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{exam.typeInfo?.emoji}</span>
                        <div>
                          <h4 className="font-medium">{exam.title}</h4>
                          <p className="text-sm text-gray-600">
                            {exam.date} | {exam.participantCount}人参与
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">{exam.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 考试管理 */}
          <TabsContent value="exams">
            <div className="space-y-6">
              {/* 筛选器 */}
              <ExamFiltersComponent
                filters={filters}
                onFiltersChange={setFilters}
                examTypes={examTypes}
                academicTerms={academicTerms}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              />

              {/* 考试列表 */}
              <ExamList
                exams={filteredExams}
                selectedExams={selectedExams}
                onSelectionChange={setSelectedExams}
                onEditExam={handleEditExam}
                onDeleteExam={handleDeleteExam}
                onDuplicateExam={handleDuplicateExam}
                onConfigureSubjectScores={handleConfigureSubjectScores}
                onExportExam={handleExportExam}
                isLoading={isLoading}
              />
            </div>
          </TabsContent>

          {/* 系统设置 */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>系统设置</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">系统设置功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 对话框 */}
        <ExamDialog
          open={dialogStates.isCreateDialogOpen}
          onOpenChange={(open) =>
            setDialogStates((prev) => ({
              ...prev,
              isCreateDialogOpen: open,
              editingExamId: open ? prev.editingExamId : null,
            }))
          }
          exam={
            dialogStates.editingExamId
              ? exams.find((e) => e.id === dialogStates.editingExamId)
              : null
          }
          examTypes={examTypes}
          academicTerms={academicTerms}
          onSave={handleSaveExam}
          isLoading={isLoading}
        />

        <SubjectScoreDialog
          open={dialogStates.isSubjectScoreDialogOpen}
          onOpenChange={(open) =>
            setDialogStates((prev) => ({
              ...prev,
              isSubjectScoreDialogOpen: open,
              selectedExamForScoreConfig: open
                ? prev.selectedExamForScoreConfig
                : null,
            }))
          }
          exam={dialogStates.selectedExamForScoreConfig}
          currentScores={currentExamSubjectScores}
          availableSubjects={availableSubjects}
          onSave={handleSaveSubjectScores}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default ExamManagementCenterNew;
