/**
 * 高级成绩分析仪表板 - 修复版本 (方案A优化)
 * 渐进式展示，减少视觉拥挤，增加呼吸空间
 * 移除了有问题的依赖，保留核心功能
 */

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import ModernGradeFilters from "@/components/analysis/filters/ModernGradeFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  Target,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Brain,
  Activity,
  LineChart,
  PieChart,
  BarChart,
  Radar,
  Layers,
  Info,
  User,
  UserCog,
  Sparkles,
  CheckCircle,
  X,
  Eye,
  ChevronDown,
  BookOpen,
} from "lucide-react";

import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";

// 导入核心分析组件
import PredictiveAnalysis from "@/components/analysis/advanced/PredictiveAnalysis";
import AnomalyDetectionAnalysis from "@/components/analysis/advanced/AnomalyDetectionAnalysis";
import EnhancedSubjectCorrelationMatrix from "@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix";
import StudentTrendAnalysis from "@/components/analysis/advanced/StudentTrendAnalysis";
import MultiDimensionalRankingSystem from "@/components/analysis/advanced/MultiDimensionalRankingSystem";
import ChartGallery from "@/components/analysis/charts/ChartGallery";
import LearningBehaviorAnalysis from "@/components/analysis/advanced/LearningBehaviorAnalysis";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  color?: "primary" | "secondary";
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = "primary",
}) => {
  const colorClasses = {
    primary: {
      bg: "bg-[#B9FF66]",
      border: "border-[#191A23]",
      text: "text-[#191A23]",
      iconBg: "bg-[#191A23]",
      iconText: "text-[#B9FF66]",
      accent: "text-[#191A23]",
    },
    secondary: {
      bg: "bg-white",
      border: "border-[#191A23]",
      text: "text-[#191A23]",
      iconBg: "bg-[#F3F3F3]",
      iconText: "text-[#191A23]",
      accent: "text-[#191A23]",
    },
  };

  const styles = colorClasses[color];

  const trendIcon =
    trend === "up" ? (
      <TrendingUp className="w-5 h-5 text-green-600" />
    ) : trend === "down" ? (
      <TrendingUp className="w-5 h-5 text-red-600 rotate-180" />
    ) : null;

  // 方案A: 减轻视觉装饰
  return (
    <Card
      className={`${styles.bg} border-2 border-[#191A23] shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p
              className={`text-xs font-black uppercase tracking-wider ${styles.text} opacity-70 mb-2`}
            >
              {title}
            </p>
            <div className="flex items-baseline gap-3 mb-2">
              <p
                className={`text-4xl font-black ${styles.text} tracking-tight`}
              >
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {trendIcon}
            </div>
            {subtitle && (
              <p className={`text-xs font-bold ${styles.text} opacity-60`}>
                {subtitle}
              </p>
            )}
          </div>

          {icon && (
            <div
              className={`p-3 ${styles.iconBg} rounded-md border-2 border-[#191A23] shadow-[2px_2px_0px_0px_#191A23]`}
            >
              <div className={`w-5 h-5 ${styles.iconText}`}>{icon}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// 模拟数据生成器
const generateMockData = () => {
  return {
    classAverages: {
      current: 78.5,
      previous: 76.2,
      trend: "up" as const,
    },
    riskStudents: {
      high: 3,
      medium: 7,
      total: 10,
    },
    subjectPerformance: [
      { subject: "数学", average: 82, trend: "up" },
      { subject: "语文", average: 79, trend: "neutral" },
      { subject: "英语", average: 75, trend: "down" },
    ],
  };
};

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedComplexity, setSelectedComplexity] = useState<
    "simple" | "advanced"
  >("simple");

  // 使用现代成绩分析上下文
  const {
    filteredGradeData,
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

  // 生成模拟数据
  const mockData = useMemo(() => generateMockData(), []);

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
        {/* 侧边筛选栏 */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-80 bg-[#F3F3F3] border-r-2 border-[#191A23] p-6 overflow-y-auto transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
            showSidebar ? "translate-x-0" : "-translate-x-full lg:hidden"
          )}
        >
          {/* 移动端关闭按钮由 ModernGradeFilters 内部处理或通过点击遮罩关闭 */}

          <ModernGradeFilters
            filter={filter}
            onFilterChange={setFilter}
            availableExams={examList}
            availableSubjects={availableSubjects}
            availableClasses={availableClasses}
            availableGrades={availableGrades}
            availableExamTypes={availableExamTypes}
            totalCount={allGradeData.length}
            filteredCount={safeGradeData.length}
            onClose={() => setShowSidebar(false)}
            compact={false}
            className="h-full shadow-none border-none bg-transparent hover:shadow-none hover:translate-x-0 hover:translate-y-0 p-0"
          />
        </div>

        {/* 移动端背景遮罩 */}
        {showSidebar && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* 主内容区域 - 方案A: 增加呼吸空间 p-6 → p-8 */}
        <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
          {/* 页头 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-[#191A23] leading-tight tracking-tight">
                  高级分析中心
                </h1>
                <p className="text-lg font-medium text-gray-500 max-w-2xl flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#B9FF66] rounded-full inline-block"></span>
                  深度数据洞察与智能决策支持系统
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="h-10 px-4 bg-white text-[#191A23] border-2 border-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-gray-50 transition-all"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">
                    {showSidebar ? "收起筛选" : "展开筛选"}
                  </span>
                </Button>

                <Button
                  onClick={() =>
                    setSelectedComplexity(
                      selectedComplexity === "simple" ? "advanced" : "simple"
                    )
                  }
                  className="h-10 px-4 bg-white text-[#191A23] border-2 border-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-gray-50 transition-all"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {selectedComplexity === "simple" ? "精简视图" : "专家视图"}
                </Button>

                <Button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="h-10 px-6 bg-[#B9FF66] text-[#191A23] border-2 border-[#191A23] font-black shadow-[4px_4px_0px_0px_#191A23] hover:shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-[#a3e659] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                  />
                  刷新
                </Button>
              </div>
            </div>
          </div>

          {/* 筛选状态显示 - 优化版 */}
          {hasActiveFilters && (
            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="bg-white border-2 border-[#191A23] shadow-[4px_4px_0px_0px_#B9FF66] rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-[#191A23] font-bold">
                    <div className="w-8 h-8 bg-[#B9FF66] rounded-full border-2 border-[#191A23] flex items-center justify-center">
                      <Filter className="w-4 h-4" />
                    </div>
                    <span>已应用筛选:</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getCurrentExamNames.length > 0 && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-[#F3F3F3] border border-[#191A23] rounded-md text-sm font-bold text-[#191A23]">
                        <BookOpen className="w-3 h-3 text-gray-500" />
                        考试: {getCurrentExamNames.join(", ")}
                      </div>
                    )}

                    {filter.subjects?.length && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-[#F3F3F3] border border-[#191A23] rounded-md text-sm font-bold text-[#191A23]">
                        <Layers className="w-3 h-3 text-gray-500" />
                        科目: {filter.subjects.join(", ")}
                      </div>
                    )}

                    {filter.classNames?.length && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-[#F3F3F3] border border-[#191A23] rounded-md text-sm font-bold text-[#191A23]">
                        <User className="w-3 h-3 text-gray-500" />
                        班级: {filter.classNames.join(", ")}
                      </div>
                    )}

                    {(filter.scoreRange?.min !== undefined ||
                      filter.scoreRange?.max !== undefined) && (
                      <div className="flex items-center gap-1 px-3 py-1 bg-[#F3F3F3] border border-[#191A23] rounded-md text-sm font-bold text-[#191A23]">
                        <Target className="w-3 h-3 text-gray-500" />
                        分数: {filter.scoreRange.min || 0} -{" "}
                        {filter.scoreRange.max || 100}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                  <CheckCircle className="w-4 h-4 text-[#B9FF66]" />
                  <span>找到 {safeGradeData.length} 条匹配记录</span>
                </div>
              </div>
            </div>
          )}

          {/* 方案A: 高级分析统计卡片 - 增加间距 gap-6 → gap-8, mb-8 → mb-10 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <StatCard
              title="总分平均分"
              value={
                statistics?.totalScoreStats.hasData
                  ? statistics.totalScoreStats.avgScore.toFixed(1)
                  : "暂无数据"
              }
              subtitle={
                statistics?.totalScoreStats.hasData
                  ? `基于 ${statistics.totalScoreStats.studentCount} 名学生`
                  : "等待数据加载"
              }
              trend={
                statistics?.scoreComparison && statistics.scoreComparison > 0
                  ? "up"
                  : statistics?.scoreComparison &&
                      statistics.scoreComparison < 0
                    ? "down"
                    : "neutral"
              }
              icon={<Target className="w-6 h-6" />}
              color="primary"
            />

            <StatCard
              title="学困预警"
              value={statistics?.atRiskStudents || 0}
              subtitle={`需要重点关注的学生数量`}
              icon={<AlertCircle className="w-6 h-6" />}
              color="secondary"
            />

            <StatCard
              title="数据完整性"
              value={`${Math.round((safeGradeData.length / (allGradeData.length || 1)) * 100)}%`}
              subtitle={`${safeGradeData.length} / ${allGradeData.length} 条记录`}
              icon={<BarChart className="w-6 h-6" />}
              color="primary"
            />

            <StatCard
              title="优势科目"
              value={statistics?.topSubject || "分析中"}
              subtitle={
                statistics?.topSubjectScore
                  ? `平均分 ${statistics.topSubjectScore.toFixed(1)}`
                  : "等待计算"
              }
              icon={<Sparkles className="w-6 h-6" />}
              color="primary"
            />
          </div>

          {/* 主要分析区域 */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] rounded-xl p-2 gap-2">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <Activity className="w-4 h-4 mr-2" />
                概览
              </TabsTrigger>
              <TabsTrigger
                value="trends"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <LineChart className="w-4 h-4 mr-2" />
                趋势
              </TabsTrigger>
              <TabsTrigger
                value="correlations"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <Radar className="w-4 h-4 mr-2" />
                相关性
              </TabsTrigger>
              <TabsTrigger
                value="predictions"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                预测
              </TabsTrigger>
              <TabsTrigger
                value="behavior"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <User className="w-4 h-4 mr-2" />
                行为
              </TabsTrigger>
              <TabsTrigger
                value="charts"
                className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:shadow-[2px_2px_0px_0px_#191A23] font-bold text-[#191A23] hover:bg-[#B9FF66]/20 transition-all duration-200 rounded-lg"
              >
                <PieChart className="w-4 h-4 mr-2" />
                图表
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="bg-white border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden">
                  <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                    <CardTitle className="flex items-center text-[#191A23] font-black uppercase tracking-wide">
                      <Layers className="w-5 h-5 mr-2" />
                      多维度排名系统
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <MultiDimensionalRankingSystem gradeData={safeGradeData} />
                  </CardContent>
                </Card>

                <Card className="bg-white border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden">
                  <CardHeader className="bg-[#191A23] border-b-2 border-black">
                    <CardTitle className="flex items-center text-white font-black uppercase tracking-wide">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      异常检测分析
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <AnomalyDetectionAnalysis gradeData={safeGradeData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="mt-8">
              <Card className="bg-white border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="flex items-center text-[#191A23] font-black uppercase tracking-wide">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    学生成绩趋势分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <StudentTrendAnalysis gradeData={safeGradeData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlations" className="mt-8">
              <Card className="bg-white border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="flex items-center text-[#191A23] font-black uppercase tracking-wide">
                    <Radar className="w-5 h-5 mr-2" />
                    科目相关性矩阵
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <EnhancedSubjectCorrelationMatrix gradeData={safeGradeData} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="predictions" className="mt-8">
              <Card className="bg-white border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="flex items-center text-[#191A23] font-black uppercase tracking-wide">
                    <Brain className="w-5 h-5 mr-2" />
                    AI 预测分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <PredictiveAnalysis />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behavior" className="mt-8">
              <Card className="bg-white border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="flex items-center text-[#191A23] font-black uppercase tracking-wide">
                    <UserCog className="w-5 h-5 mr-2" />
                    学习行为分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <LearningBehaviorAnalysis />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="charts" className="mt-8">
              <Card className="bg-white border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="flex items-center text-[#191A23] font-black uppercase tracking-wide">
                    <PieChart className="w-5 h-5 mr-2" />
                    图表画廊
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ChartGallery gradeData={safeGradeData} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
