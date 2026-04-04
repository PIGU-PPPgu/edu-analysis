/**
 * 完整分析仪表板 - 安全版本 (方案A优化)
 * 渐进式展示，减少视觉拥挤，增加呼吸空间
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Filter,
  Settings,
  RefreshCw,
  Eye,
  Brain,
  BarChart3,
  FileText,
} from "lucide-react";
import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";
import ModernGradeFilters from "@/components/analysis/filters/ModernGradeFilters";
import ErrorBoundary from "@/components/performance/ErrorBoundary";
import { toast } from "sonner";
import { IntelligentLoadingState } from "@/components/ui/SkeletonCard";
import { ExamSpecificSubjectSettings } from "@/components/analysis/settings/ExamSpecificSubjectSettings";
import FloatingChatAssistant from "@/components/ai/FloatingChatAssistant";
import type { GradeRecord as LegacyGradeRecord } from "@/types/grade";

import OverviewTab from "./tabs/OverviewTab";
import AIAnalysisTab from "./tabs/AIAnalysisTab";
import DeepAnalysisTab from "./tabs/DeepAnalysisTab";
import DataDetailsTab from "./tabs/DataDetailsTab";

const CompleteAnalyticsDashboard: React.FC = () => {
  const {
    allGradeData,
    wideGradeData,
    filteredGradeData,
    examList,
    statistics,
    filter,
    setFilter,
    loading,
    error,
    availableSubjects,
    availableClasses,
    availableGrades,
    availableExamTypes,
    refreshData,
  } = useModernGradeAnalysis();

  const [activeTab, setActiveTab] = useState("overview");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSubjectSettings, setShowSubjectSettings] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const comparisonGradeData = useMemo(
    () =>
      filteredGradeData.map((record) => ({
        ...record,
        student_name: record.name,
        class_name: record.class_name || "",
        subject: record.subject || "总分",
        score: record.score ?? record.total_score ?? 0,
      })) as LegacyGradeRecord[],
    [filteredGradeData]
  );

  const handleSubjectSettingsSave = () => {
    if (!isMountedRef.current) return;
    refreshData();
    toast.success("科目配置已保存，数据已更新");
  };

  const handleExamDelete = async (examId: string) => {
    try {
      const { deleteExam } = await import("@/services/examService");
      const ok = await deleteExam(examId);
      if (ok) await refreshData();
    } catch (error) {
      console.error("删除考试失败", error);
      toast.error("删除考试失败");
    }
  };

  const handleExamEdit = async (examId: string) => {
    try {
      const exam = examList.find((e) => e.id === examId);
      const newTitle = window.prompt("更新考试名称", exam?.title || "");
      if (newTitle === null || newTitle.trim() === "") return;
      const { updateExam } = await import("@/services/examService");
      const updated = await updateExam(examId, { title: newTitle.trim() });
      if (updated) {
        await refreshData();
        toast.success("考试已更新");
      }
    } catch (error) {
      console.error("更新考试失败", error);
      toast.error("更新考试失败");
    }
  };

  const handleExamAdd = async () => {
    try {
      const title = window.prompt("请输入考试名称");
      if (!title || !title.trim()) return;
      const date =
        window.prompt("请输入考试日期（YYYY-MM-DD，可选）") || undefined;
      const type = window.prompt("请输入考试类型（可选）") || undefined;
      const { createExam } = await import("@/services/examService");
      const created = await createExam({
        title: title.trim(),
        type: type?.trim() || undefined,
        date: date?.trim() || undefined,
        subject: undefined,
      });
      if (created) await refreshData();
    } catch (error) {
      console.error("新增考试失败", error);
      toast.error("新增考试失败");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="flex bg-white min-h-screen">
          <div className="w-96 bg-[#F8F8F8] border-r-2 border-black p-6">
            <IntelligentLoadingState
              type="stats"
              title="加载筛选选项"
              subtitle="正在加载考试和班级数据..."
            />
          </div>
          <div className="flex-1 space-y-10 p-8">
            <div className="space-y-3">
              <h1 className="text-5xl font-black text-[#191A23] leading-tight">
                基础分析
                <span className="inline-block ml-3 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                  BASIC
                </span>
              </h1>
              <p className="text-lg text-[#6B7280] font-medium">
                正在智能分析成绩数据，请稍候...
              </p>
            </div>
            <IntelligentLoadingState
              type="stats"
              title="正在计算核心指标"
              subtitle="平均分、及格率、学困生预警等统计数据"
            />
            <IntelligentLoadingState
              type="chart"
              title="正在生成可视化图表"
              subtitle="成绩分布、趋势分析、相关性热力图等"
            />
            <IntelligentLoadingState
              type="analysis"
              title="正在进行AI智能分析"
              subtitle="教学洞察、改进建议、学困生识别等"
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="max-w-2xl mx-auto border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-bold">{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="ml-4 border-2 border-black bg-[#6B7280] text-white font-bold hover:bg-[#6B7280]"
          >
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex bg-white min-h-screen">
        {/* 侧边筛选栏 */}
        <div
          className={cn(
            "transition-all duration-300",
            showSidebar ? "block" : "hidden"
          )}
        >
          <div
            className={cn(
              "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
              showSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed lg:static inset-y-0 left-0 z-50 w-80 lg:w-96 bg-[#F8F8F8] border-r-2 border-black p-6 overflow-y-auto transform lg:transform-none transition-transform lg:transition-none">
            <ModernGradeFilters
              filter={filter}
              onFilterChange={setFilter}
              availableExams={examList}
              availableSubjects={availableSubjects}
              availableClasses={availableClasses}
              availableGrades={availableGrades}
              availableExamTypes={availableExamTypes}
              totalCount={filteredGradeData.length}
              filteredCount={filteredGradeData.length}
              onExamDelete={handleExamDelete}
              onExamEdit={handleExamEdit}
              onExamAdd={handleExamAdd}
              onClose={() => setShowSidebar(false)}
              compact={false}
            />
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 space-y-12 p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-black text-[#191A23] leading-tight">
                基础分析
                <span className="inline-block ml-3 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                  BASIC
                </span>
              </h1>
              <p className="text-lg text-[#6B7280] font-medium max-w-2xl">
                系统化的成绩分析，包含统计概览和基础AI辅助功能
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setShowSidebar(!showSidebar)}
                className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {showSidebar ? "隐藏筛选栏" : "显示筛选栏"}
                </span>
                <span className="sm:hidden">筛选</span>
              </Button>
              <Button
                onClick={() => setShowSubjectSettings(true)}
                className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">科目设置</span>
                <span className="sm:hidden">设置</span>
              </Button>
              <Button
                onClick={refreshData}
                className="flex items-center gap-2 border-2 border-black bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </Button>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-8"
          >
            <div className="overflow-x-auto">
              <TabsList className="grid w-fit grid-cols-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <Eye className="w-5 h-5" />
                  <span>概览</span>
                </TabsTrigger>
                <TabsTrigger
                  value="ai-analysis"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <Brain className="w-5 h-5" />
                  <span>AI分析</span>
                </TabsTrigger>
                <TabsTrigger
                  value="deep-analysis"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>深度分析</span>
                </TabsTrigger>
                <TabsTrigger
                  value="data-details"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <FileText className="w-5 h-5" />
                  <span>数据详情</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview">
              <OverviewTab
                statistics={statistics}
                filteredGradeData={filteredGradeData}
              />
            </TabsContent>

            <TabsContent value="ai-analysis">
              <AIAnalysisTab filteredGradeData={filteredGradeData} />
            </TabsContent>

            <TabsContent value="deep-analysis">
              <DeepAnalysisTab
                filteredGradeData={filteredGradeData}
                wideGradeData={wideGradeData || []}
                comparisonGradeData={comparisonGradeData}
              />
            </TabsContent>

            <TabsContent value="data-details">
              <DataDetailsTab
                filteredGradeData={filteredGradeData}
                loading={loading}
                examIds={filter.examIds}
                classFilter={filter.classNames}
                subjectFilter={filter.subjects}
              />
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-4 border-t border-[#6B7280]">
            <p className="text-xs text-[#6B7280] text-center leading-relaxed">
              增强功能说明：科目相关性分析使用95%置信区间；个人趋势分析支持线性回归预测；多维度排名包含学术、稳定性、进步性、均衡性四个维度。数据基于Wide-Table结构优化，提供更快的查询性能。
            </p>
          </div>

          <ExamSpecificSubjectSettings
            isOpen={showSubjectSettings}
            onClose={() => setShowSubjectSettings(false)}
            onSave={handleSubjectSettingsSave}
            currentExamId={
              filter.examIds?.length === 1 ? filter.examIds[0] : undefined
            }
            currentExamName={
              filter.examIds?.length === 1
                ? examList.find((exam) => exam.id === filter.examIds[0])?.title
                : undefined
            }
          />

          <FloatingChatAssistant defaultMinimized={true} />
        </div>
      </div>
    </div>
  );
};

export default CompleteAnalyticsDashboard;
