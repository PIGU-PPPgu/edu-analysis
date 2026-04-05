/**
 * 完整分析仪表板 - 安全版本 (方案A优化)
 * 渐进式展示，减少视觉拥挤，增加呼吸空间
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Users,
  PieChart,
  AlertTriangle,
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
import DataDetailsTab from "./tabs/DataDetailsTab";

import { Card, CardContent } from "@/components/ui/card";
import SubjectCorrelationAnalysis from "@/components/analysis/advanced/SubjectCorrelationAnalysis";
import ClassComparisonChart from "@/components/analysis/comparison/ClassComparisonChart";
import ClassBoxPlotChart from "@/components/analysis/comparison/ClassBoxPlotChart";
import { LearningBehaviorAnalysis } from "@/components/analysis/advanced/LearningBehaviorAnalysis";
import ContributionAnalysis from "@/components/analysis/advanced/ContributionAnalysis";
import EnhancedSubjectCorrelationMatrix from "@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix";
import StudentTrendAnalysis from "@/components/analysis/advanced/StudentTrendAnalysis";
import MultiDimensionalRankingSystem from "@/components/analysis/advanced/MultiDimensionalRankingSystem";
import ChartGallery from "@/components/analysis/charts/ChartGallery";
import type { WideGradeRecord } from "@/components/analysis/advanced/trend/trendUtils";

const CompleteAnalyticsDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const [showSidebar, setShowSidebar] = useState(false);
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

  const handleExamEdit = (examId: string) => {
    navigate(`/exam-management`);
    toast.info("请在考试管理页面编辑考试信息");
  };

  const handleExamAdd = () => {
    navigate(`/exam-management`);
    toast.info("请在考试管理页面创建新考试");
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
        {/* 侧边筛选栏：桌面端 inline 占位，移动端 overlay */}
        <div
          className={cn(
            "transition-all duration-300 flex-shrink-0",
            // 桌面端：始终占位，通过宽度控制显隐
            "lg:block",
            showSidebar ? "lg:w-96" : "lg:w-0 lg:overflow-hidden",
            // 移动端：overlay 模式
            showSidebar ? "block" : "hidden lg:block"
          )}
        >
          {/* 移动端遮罩 */}
          <div
            className={cn(
              "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity",
              showSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 lg:z-auto w-80 lg:w-96 h-screen bg-[#F8F8F8] border-r-2 border-black p-6 overflow-y-auto">
            <ModernGradeFilters
              filter={filter}
              onFilterChange={setFilter}
              availableExams={examList}
              availableSubjects={availableSubjects}
              availableClasses={availableClasses}
              availableGrades={availableGrades}
              availableExamTypes={availableExamTypes}
              totalCount={allGradeData.length}
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
              <TabsList className="grid w-fit grid-cols-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <Eye className="w-5 h-5" />
                  <span>概览</span>
                </TabsTrigger>
                <TabsTrigger
                  value="data-analysis"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>数据分析</span>
                </TabsTrigger>
                <TabsTrigger
                  value="student-analysis"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <Users className="w-5 h-5" />
                  <span>学生对比</span>
                </TabsTrigger>
                <TabsTrigger
                  value="chart-gallery"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <PieChart className="w-5 h-5" />
                  <span>图表</span>
                </TabsTrigger>
                <TabsTrigger
                  value="ai-analysis"
                  className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
                >
                  <Brain className="w-5 h-5" />
                  <span>AI分析</span>
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

            <TabsContent value="data-analysis" className="space-y-6">
              <EnhancedSubjectCorrelationMatrix
                gradeData={((wideGradeData || []) as WideGradeRecord[]).slice(
                  0,
                  2000
                )}
                title="科目相关性分析"
                className="w-full"
                showHeatMap={true}
                filterSignificance="all"
              />
              <StudentTrendAnalysis
                gradeData={((wideGradeData || []) as WideGradeRecord[]).slice(
                  0,
                  3000
                )}
                className="w-full"
              />
              <MultiDimensionalRankingSystem
                gradeData={((wideGradeData || []) as WideGradeRecord[]).slice(
                  0,
                  1000
                )}
                className="w-full"
              />
              <SubjectCorrelationAnalysis
                gradeData={filteredGradeData}
                className=""
              />
            </TabsContent>

            <TabsContent value="student-analysis" className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ClassComparisonChart
                  data={comparisonGradeData}
                  filterState={{ selectedClasses: [], viewMode: "all" }}
                  className=""
                />
                <ClassBoxPlotChart
                  gradeData={comparisonGradeData}
                  className=""
                />
              </div>
              <LearningBehaviorAnalysis gradeData={wideGradeData || []} />
              <ContributionAnalysis
                gradeData={filteredGradeData}
                title="学生科目贡献度分析"
                className=""
              />
            </TabsContent>

            <TabsContent value="chart-gallery" className="space-y-6">
              {filteredGradeData.length > 5000 && (
                <Card className="border-l-4 border-l-orange-500 bg-orange-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-semibold text-orange-800">
                          数据量较大 (
                          {filteredGradeData.length.toLocaleString()} 条记录)
                        </p>
                        <p className="text-sm text-orange-600">
                          为保证性能，图表将只显示前 5,000
                          条数据。建议使用筛选功能缩小数据范围以获得更准确的分析。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              <ChartGallery
                gradeData={filteredGradeData.slice(0, 5000)}
                className=""
              />
            </TabsContent>

            <TabsContent value="ai-analysis">
              <AIAnalysisTab filteredGradeData={filteredGradeData} />
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
