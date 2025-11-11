/**
 * 高级成绩分析仪表板 - 修复版本 (方案A优化)
 * 渐进式展示，减少视觉拥挤，增加呼吸空间
 * 移除了有问题的依赖，保留核心功能
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  RefreshCw,
  Filter,
  Settings,
  LineChart,
  Radar,
  Layers,
  CheckCircle,
  Eye,
} from "lucide-react";

import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";

// 导入筛选组件
import ModernGradeFilters from "@/components/analysis/filters/ModernGradeFilters";

// 导入核心分析组件
import EnhancedSubjectCorrelationMatrix from "@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix";
import StudentTrendAnalysis from "@/components/analysis/advanced/StudentTrendAnalysis";
import MultiDimensionalRankingSystem from "@/components/analysis/advanced/MultiDimensionalRankingSystem";
import QuickInsightsPanel from "@/components/analysis/advanced/QuickInsightsPanel";

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("ranking");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedComplexity, setSelectedComplexity] = useState<
    "simple" | "advanced"
  >("simple");

  // 使用现代成绩分析上下文
  const {
    filteredGradeData,
    filteredWideGradeData,
    allGradeData,
    filter,
    setFilter,
    statistics,
    loading: contextLoading,
    error: contextError,
    examList,
    availableSubjects,
    availableClasses,
    availableGrades,
    availableExamTypes,
  } = useModernGradeAnalysis();

  // 确保数据安全性
  const safeGradeData = useMemo(() => {
    return Array.isArray(filteredGradeData) ? filteredGradeData : [];
  }, [filteredGradeData]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // 模拟数据刷新
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  // 筛选状态检查
  const hasActiveFilters = useMemo(() => {
    return !!(
      filter.examIds?.length ||
      filter.examTitles?.length ||
      filter.subjects?.length ||
      filter.classNames?.length ||
      filter.grades?.length ||
      filter.searchKeyword ||
      filter.scoreRange?.min !== undefined ||
      filter.scoreRange?.max !== undefined
    );
  }, [filter]);

  // 获取当前筛选的考试名称
  const getCurrentExamNames = useMemo(() => {
    const examNames: string[] = [];

    // 从examIds获取考试名称
    if (filter.examIds?.length) {
      const titlesFromIds = examList
        .filter((exam) => filter.examIds!.includes(exam.id))
        .map((exam) => exam.title);
      examNames.push(...titlesFromIds);
    }

    // 直接指定的考试标题
    if (filter.examTitles?.length) {
      examNames.push(...filter.examTitles);
    }

    return [...new Set(examNames)];
  }, [filter.examIds, filter.examTitles, examList]);

  if (contextError) {
    return (
      <div className="p-6">
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            数据加载失败: {contextError}。请刷新页面重试。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="min-h-screen bg-white flex">
        {/* 侧边筛选栏 - 使用ModernGradeFilters组件 */}
        {showSidebar && (
          <>
            {/* 移动端背景遮罩 */}
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />

            {/* 筛选栏 - 移动端为覆盖层，桌面端为侧边栏 */}
            <div className="fixed lg:static inset-y-0 left-0 z-50 w-80 lg:w-96 p-4 overflow-y-auto transform lg:transform-none transition-transform lg:transition-none">
              <ModernGradeFilters
                filter={filter}
                onFilterChange={setFilter}
                availableExams={examList.map((exam) => ({
                  id: exam.id,
                  title: exam.title,
                  type: exam.type,
                  date: exam.date,
                }))}
                availableSubjects={availableSubjects}
                availableClasses={availableClasses}
                availableGrades={availableGrades}
                availableExamTypes={availableExamTypes}
                totalCount={allGradeData.length}
                filteredCount={safeGradeData.length}
                onClose={() => setShowSidebar(false)}
                compact={false}
              />
            </div>
          </>
        )}

        {/* 主内容区域 - 方案A: 增加呼吸空间 p-6 → p-8 */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* 页头 */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="space-y-3">
                <h1 className="text-5xl font-black text-[#191A23] leading-tight">
                  高级分析
                  <span className="inline-block ml-3 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                    ADVANCED
                  </span>
                </h1>
                <p className="text-lg text-[#6B7280] font-medium max-w-2xl">
                  深度数据洞察和AI驱动的智能教学决策支持
                </p>
              </div>

              <div className="flex items-center space-x-3">
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
                  onClick={() =>
                    setSelectedComplexity(
                      selectedComplexity === "simple" ? "advanced" : "simple"
                    )
                  }
                  className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
                >
                  <Settings className="w-4 h-4" />
                  {selectedComplexity === "simple" ? "简化模式" : "高级模式"}
                </Button>

                <Button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center gap-2 border-2 border-black bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  刷新数据
                </Button>
              </div>
            </div>
          </div>

          {/* 筛选状态显示 */}
          {hasActiveFilters && (
            <div className="mb-6">
              <Card className="border-l-4 border-l-[#B9FF66] bg-[#B9FF66]/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-[#B9FF66]" />
                        <span className="font-medium text-gray-800">
                          当前筛选状态
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {getCurrentExamNames.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-[#B9FF66] text-[#B9FF66]"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            考试: {getCurrentExamNames.join(", ")}
                          </Badge>
                        )}

                        {filter.subjects?.length && (
                          <Badge
                            variant="outline"
                            className="border-blue-500 text-blue-700"
                          >
                            科目: {filter.subjects.join(", ")}
                          </Badge>
                        )}

                        {filter.classNames?.length && (
                          <Badge
                            variant="outline"
                            className="border-purple-500 text-purple-700"
                          >
                            班级: {filter.classNames.join(", ")}
                          </Badge>
                        )}

                        <Badge
                          variant="secondary"
                          className="bg-gray-100 text-gray-700"
                        >
                          显示 {safeGradeData.length} 条记录 (共{" "}
                          {allGradeData.length} 条)
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">筛选已应用 ✓</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 🔥 快速洞察面板 - 直击重点 */}
          <div className="mb-10">
            <QuickInsightsPanel
              gradeData={safeGradeData}
              wideGradeData={filteredWideGradeData}
              statistics={statistics}
            />
          </div>

          {/* 主要分析区域 */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] rounded-xl p-2 gap-2">
              <TabsTrigger
                value="ranking"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <Layers className="w-4 h-4 mr-2" />
                多维排名
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <LineChart className="w-4 h-4 mr-2" />
                趋势分析
              </TabsTrigger>
              <TabsTrigger
                value="correlations"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <Radar className="w-4 h-4 mr-2" />
                学科关联
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ranking" className="mt-8">
              <MultiDimensionalRankingSystem gradeData={safeGradeData} />
            </TabsContent>

            <TabsContent value="trends" className="mt-8">
              <StudentTrendAnalysis gradeData={safeGradeData} />
            </TabsContent>

            <TabsContent value="correlations" className="mt-8">
              <EnhancedSubjectCorrelationMatrix gradeData={safeGradeData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
