/**
 * 完整分析仪表板 - 安全版本
 * 集成所有确认可用的高级分析组件，应用4色设计系统
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  BookOpen,
  Target,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Download,
  RefreshCw,
  Filter,
  Search,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Grid,
  Activity,
  Brain,
  Radar,
  Zap,
  Eye,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  ScatterChart,
  Scatter,
} from "recharts";

import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";
import ModernGradeFilters from "@/components/analysis/filters/ModernGradeFilters";
import SimpleGradeDataTable from "@/components/analysis/SimpleGradeDataTable";
import OptimizedDataTable from "@/components/performance/OptimizedDataTable";
import ErrorBoundary from "@/components/performance/ErrorBoundary";
import { toast } from "sonner";
import { IntelligentLoadingState } from "@/components/ui/SkeletonCard";

// 导入确认存在的高级分析组件 - 包含我们已改造的Positivus风格组件
import SubjectCorrelationAnalysis from "@/components/analysis/advanced/SubjectCorrelationAnalysis";
import ClassComparisonChart from "@/components/analysis/comparison/ClassComparisonChart";
import ClassBoxPlotChart from "@/components/analysis/comparison/ClassBoxPlotChart";
import { PredictiveAnalysis } from "@/components/analysis/advanced/PredictiveAnalysis";
import AnomalyDetectionAnalysis from "@/components/analysis/advanced/AnomalyDetectionAnalysis";
import StatisticsOverview from "@/components/analysis/statistics/StatisticsOverview";
import { LearningBehaviorAnalysis } from "@/components/analysis/advanced/LearningBehaviorAnalysis";
import CrossAnalysis from "@/components/analysis/advanced/CrossAnalysis";
import ContributionAnalysis from "@/components/analysis/advanced/ContributionAnalysis";
import AIGradePatternAnalysis from "@/components/analysis/ai/AIGradePatternAnalysis";
import AIPersonalizedRecommendations from "@/components/analysis/ai/AIPersonalizedRecommendations";
import ClassAIAnalysis from "@/components/analysis/ai/ClassAIAnalysis";
import ClassAIDiagnostician from "@/components/analysis/ai/ClassAIDiagnostician";
import StudentAIAdvisor from "@/components/analysis/ai/StudentAIAdvisor";
import GradeLevelDistribution from "@/components/analysis/charts/GradeLevelDistribution";
// 新增强组件
import EnhancedSubjectCorrelationMatrix from "@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix";
import StudentTrendAnalysis from "@/components/analysis/advanced/StudentTrendAnalysis";
import MultiDimensionalRankingSystem from "@/components/analysis/advanced/MultiDimensionalRankingSystem";
import ChartGallery from "@/components/analysis/charts/ChartGallery";
import FloatingChatAssistant from "@/components/ai/FloatingChatAssistant";
import { ExamSpecificSubjectSettings } from "@/components/analysis/settings/ExamSpecificSubjectSettings";

// 严格4色设计系统：绿、黑、白、灰
const SIMPLE_COLORS = {
  green: "#B9FF66",
  black: "#191A23",
  white: "#FFFFFF",
  gray: "#6B7280",
};

const CHART_COLORS = {
  primary: "#B9FF66",
  secondary: "#191A23",
  accent: "#6B7280",
  background: "#FFFFFF",
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "green" | "black" | "white" | "gray";
  className?: string;
}

// Positivus风格统计卡片
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "green",
  className,
}) => {
  const colorClasses = {
    green: "bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]",
    black: "bg-white border-2 border-black shadow-[6px_6px_0px_0px_#191A23]",
    gray: "bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]",
    white: "bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]",
  };

  const iconBgClasses = {
    green: "bg-[#B9FF66]",
    black: "bg-[#191A23]",
    gray: "bg-[#6B7280]",
    white: "bg-white",
  };

  const iconColorClasses = {
    green: "text-black",
    black: "text-white",
    gray: "text-white",
    white: "text-black",
  };

  return (
    <Card
      className={cn(
        "transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_currentColor]",
        colorClasses[color],
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "p-2 rounded-full border-2 border-black",
                  iconBgClasses[color]
                )}
              >
                <Icon className={cn("w-5 h-5", iconColorClasses[color])} />
              </div>
              <p className="text-base font-bold text-black uppercase tracking-wide">
                {title}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-black leading-none">
                {value}
              </h3>
              {trend && trendValue && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-sm font-bold",
                    trend === "up" && "bg-[#B9FF66] text-black",
                    trend === "down" && "bg-[#6B7280] text-white",
                    trend === "neutral" && "bg-white text-black"
                  )}
                >
                  {trend === "up" && <ArrowUpRight className="w-4 h-4" />}
                  {trend === "down" && <ArrowDownRight className="w-4 h-4" />}
                  {trend === "neutral" && <Minus className="w-4 h-4" />}
                  <span className="uppercase tracking-wide">{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-[#6B7280] font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 热力图组件
const CorrelationHeatmap: React.FC<{ data: any[] }> = ({ data }) => {
  const generateHeatmapData = () => {
    const subjects = ["语文", "数学", "英语", "物理", "化学"];
    const heatmapData = [];

    for (let i = 0; i < subjects.length; i++) {
      for (let j = 0; j < subjects.length; j++) {
        heatmapData.push({
          x: subjects[i],
          y: subjects[j],
          correlation: i === j ? 1 : Math.random() * 0.8 + 0.2,
        });
      }
    }
    return heatmapData;
  };

  const heatmapData = generateHeatmapData();

  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <Grid className="w-5 h-5" />
          科目相关性热力图
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {heatmapData.map((cell, index) => (
            <div
              key={index}
              className="aspect-square border border-black flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: `rgba(185, 255, 102, ${cell.correlation})`,
                color: cell.correlation > 0.5 ? "#191A23" : "#6B7280",
              }}
            >
              {cell.correlation.toFixed(2)}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between text-sm">
          <span className="font-bold text-[#191A23]">弱相关</span>
          <span className="font-bold text-[#191A23]">强相关</span>
        </div>
      </CardContent>
    </Card>
  );
};

// 趋势分析组件
const TrendAnalysis: React.FC<{ data: any[] }> = ({ data }) => {
  const trendData = useMemo(() => {
    const months = ["1月", "2月", "3月", "4月", "5月", "6月"];
    return months.map((month) => ({
      month,
      avgScore: Math.random() * 20 + 70,
      passRate: Math.random() * 30 + 70,
      excellentRate: Math.random() * 20 + 15,
    }));
  }, []);

  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          成绩趋势分析
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fontWeight: "bold" }}
            />
            <YAxis tick={{ fontSize: 12, fontWeight: "bold" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "2px solid black",
                borderRadius: "8px",
                boxShadow: "4px 4px 0px 0px #191A23",
              }}
            />
            <Line
              type="monotone"
              dataKey="avgScore"
              stroke="#B9FF66"
              strokeWidth={3}
            />
            <Line
              type="monotone"
              dataKey="passRate"
              stroke="#6B7280"
              strokeWidth={3}
            />
            <Line
              type="monotone"
              dataKey="excellentRate"
              stroke="#191A23"
              strokeWidth={3}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// 散点图分析
const ScatterAnalysis: React.FC<{ data: any[] }> = ({ data }) => {
  const scatterData = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      math: Math.random() * 40 + 60,
      chinese: Math.random() * 40 + 60,
      student: `学生${i + 1}`,
    }));
  }, []);

  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
      <CardHeader className="bg-[#6B7280] border-b-2 border-black">
        <CardTitle className="text-white font-black flex items-center gap-2">
          <Activity className="w-5 h-5" />
          数学vs语文散点图
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart data={scatterData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="math"
              name="数学分数"
              tick={{ fontSize: 12, fontWeight: "bold" }}
            />
            <YAxis
              dataKey="chinese"
              name="语文分数"
              tick={{ fontSize: 12, fontWeight: "bold" }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "white",
                border: "2px solid black",
                borderRadius: "8px",
                boxShadow: "4px 4px 0px 0px #6B7280",
              }}
            />
            <Scatter dataKey="chinese" fill="#6B7280" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

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

  // 科目设置功能
  const handleSubjectSettingsSave = () => {
    // 刷新数据以使用新的及格率配置
    refreshData();

    toast.success("科目配置已保存，数据已更新");
  };

  // 考试管理功能
  const handleExamDelete = async (examId: string) => {
    try {
      // 这里应该调用examService的删除功能
      toast.success("考试删除功能将在后续版本中实现");
    } catch (error) {
      toast.error("删除考试失败");
    }
  };

  const handleExamEdit = (examId: string) => {
    toast.info("考试编辑功能将在后续版本中实现");
  };

  const handleExamAdd = () => {
    toast.info("新增考试功能将在后续版本中实现");
  };

  if (loading) {
    return (
      <div className="flex bg-white min-h-screen">
        {/* 侧边栏骨架屏 */}
        <div className="w-96 bg-[#F8F8F8] border-r-2 border-black p-6">
          <IntelligentLoadingState
            type="stats"
            title="加载筛选选项"
            subtitle="正在加载考试和班级数据..."
          />
        </div>

        {/* 主内容区域骨架屏 */}
        <div className="flex-1 space-y-10 p-8">
          {/* 页面标题 */}
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

          {/* 统计卡片骨架屏 */}
          <IntelligentLoadingState
            type="stats"
            title="正在计算核心指标"
            subtitle="平均分、及格率、学困生预警等统计数据"
          />

          {/* 图表骨架屏 */}
          <IntelligentLoadingState
            type="chart"
            title="正在生成可视化图表"
            subtitle="成绩分布、趋势分析、相关性热力图等"
          />

          {/* 分析骨架屏 */}
          <IntelligentLoadingState
            type="analysis"
            title="正在进行AI智能分析"
            subtitle="教学洞察、改进建议、学困生识别等"
          />
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
    <div className="flex bg-white min-h-screen">
      {/* 侧边筛选栏 - 增加宽度以避免选项挤压 */}
      {showSidebar && (
        <>
          {/* 移动端背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />

          {/* 筛选栏 - 移动端为覆盖层，桌面端为侧边栏 */}
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
        </>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 space-y-10 p-8">
        {/* Positivus风格页面标题 */}
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
              className="flex items-center gap-2 border-2 border-black bg-[#F7931E] hover:bg-[#F7931E] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
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

        {/* 简化的主导航 - 移到指标卡片上方 */}
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
                className="flex items-center gap-2 data-[state=active]:bg-[#F7931E] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
              >
                <BarChart3 className="w-5 h-5" />
                <span>深度分析</span>
              </TabsTrigger>
              <TabsTrigger
                value="data-details"
                className="flex items-center gap-2 data-[state=active]:bg-[#9C88FF] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
              >
                <FileText className="w-5 h-5" />
                <span>数据详情</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 概览页面 - 一目了然的等级分布 */}
          <TabsContent value="overview" className="space-y-6">
            {/* 关键指标卡片区域 - 只在概览页面显示 */}
            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard
                  title="平均分"
                  value={`${Math.round(statistics.totalScoreStats?.avgScore || 0)}分`}
                  subtitle={`比上次${statistics.scoreComparison > 0 ? "提高" : "下降"} ${Math.abs(statistics.scoreComparison || 0).toFixed(1)}分`}
                  icon={BarChart3}
                  trend={
                    statistics.scoreComparison > 0
                      ? "up"
                      : statistics.scoreComparison < 0
                        ? "down"
                        : "neutral"
                  }
                  trendValue={`${statistics.scoreComparison > 0 ? "+" : ""}${(statistics.scoreComparison || 0).toFixed(1)}`}
                  color="green"
                />

                <StatCard
                  title="及格率"
                  value={`${Math.round(statistics.totalScoreStats?.passRate || 0)}%`}
                  subtitle={`优秀率 ${Math.round(statistics.totalScoreStats?.excellentRate || 0)}%`}
                  icon={CheckCircle}
                  trend={
                    statistics.passRateComparison > 0
                      ? "up"
                      : statistics.passRateComparison < 0
                        ? "down"
                        : "neutral"
                  }
                  trendValue={`${statistics.passRateComparison > 0 ? "+" : ""}${(statistics.passRateComparison || 0).toFixed(1)}%`}
                  color="black"
                />

                <StatCard
                  title="学困生预警"
                  value={statistics.atRiskStudents || 0}
                  subtitle={`共 ${statistics.totalStudents} 名学生`}
                  icon={AlertTriangle}
                  color="gray"
                />

                <StatCard
                  title="最佳科目"
                  value={statistics.topSubject || "暂无"}
                  subtitle={`平均分 ${Math.round(statistics.topSubjectScore || 0)} 分`}
                  icon={Award}
                  color="white"
                />
              </div>
            )}
            {/* 核心内容：成绩等级分布 */}
            <GradeLevelDistribution
              gradeData={filteredGradeData}
              className=""
            />

            {/* 智能教学洞察区域 */}
            <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
              <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  智能教学洞察与建议
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 教学亮点 */}
                  <div className="p-4 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg">
                    <h4 className="font-black text-[#191A23] mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      教学亮点
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#B9FF66] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          {statistics?.topSubject || "数学"}{" "}
                          科目表现优异，平均分达{" "}
                          {statistics?.topSubjectScore?.toFixed(1) || "85.2"} 分
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#B9FF66] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          整体及格率{" "}
                          {statistics?.totalScoreStats?.passRate?.toFixed(1) ||
                            "78.5"}
                          %，表现良好
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* 改进建议 */}
                  <div className="p-4 bg-[#6B7280]/20 border-2 border-[#6B7280] rounded-lg">
                    <h4 className="font-black text-[#191A23] mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      改进建议
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#6B7280] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          关注 {statistics?.atRiskStudents || 0}{" "}
                          名学困生，建议个性化辅导
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#6B7280] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          加强薄弱科目教学，提升整体均衡性
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* 学困生预警 */}
                  <div className="p-4 bg-[#6B7280]/20 border-2 border-[#6B7280] rounded-lg">
                    <h4 className="font-black text-[#191A23] mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      学困生预警
                    </h4>
                    <div className="space-y-2">
                      {filteredGradeData
                        .filter((record) => {
                          const score = record.score || record.total_score;
                          return score && score < 60;
                        })
                        .slice(0, 3)
                        .map((record, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-[#6B7280]/10 border border-[#6B7280] rounded text-xs"
                          >
                            <span className="font-bold text-[#191A23]">
                              {record.name}
                            </span>
                            <Badge className="bg-[#6B7280] text-white border border-black font-bold">
                              {record.score || record.total_score}分
                            </Badge>
                          </div>
                        ))}
                      {filteredGradeData.filter((record) => {
                        const score = record.score || record.total_score;
                        return score && score < 60;
                      }).length === 0 && (
                        <div className="text-center py-2">
                          <CheckCircle className="w-6 h-6 text-[#B9FF66] mx-auto mb-1" />
                          <p className="text-xs font-bold text-[#191A23]">
                            暂无学困生
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI智能分析页面 - 按用户角色重组 */}
          <TabsContent value="ai-analysis" className="space-y-6">
            {/* 班级AI诊断师 - 我的班级怎么样？ */}
            <ClassAIDiagnostician gradeData={filteredGradeData} className="" />

            {/* 学生AI顾问 - 我的学生需要什么？ */}
            <StudentAIAdvisor gradeData={filteredGradeData} className="" />
          </TabsContent>

          {/* 深度分析页面 - 重构为子模块导航 */}
          <TabsContent value="deep-analysis" className="space-y-8">
            <Tabs defaultValue="data-analysis" className="w-full">
              <div className="overflow-x-auto">
                <TabsList className="grid w-fit grid-cols-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
                  <TabsTrigger
                    value="data-analysis"
                    className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    数据分析
                  </TabsTrigger>
                  <TabsTrigger
                    value="student-analysis"
                    className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-2"
                  >
                    <Users className="w-4 h-4" />
                    学生对比
                  </TabsTrigger>
                  <TabsTrigger
                    value="chart-gallery"
                    className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-2"
                  >
                    <PieChart className="w-4 h-4" />
                    图表展示
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 数据分析模块 */}
              <TabsContent value="data-analysis" className="space-y-6">
                {/* 增强版科目相关性矩阵 */}
                <EnhancedSubjectCorrelationMatrix
                  gradeData={wideGradeData || []}
                  title="科目相关性分析"
                  className="w-full"
                  showHeatMap={true}
                  filterSignificance="all"
                />

                {/* 个人趋势分析 */}
                <StudentTrendAnalysis
                  gradeData={wideGradeData || []}
                  className="w-full"
                />

                {/* 多维度班级排名系统 */}
                <MultiDimensionalRankingSystem
                  gradeData={wideGradeData || []}
                  className="w-full"
                />

                {/* 传统相关性分析（保持兼容） */}
                <SubjectCorrelationAnalysis
                  gradeData={filteredGradeData}
                  className=""
                />
              </TabsContent>

              {/* 学生对比模块 */}
              <TabsContent value="student-analysis" className="space-y-6">
                {/* 班级对比分析 */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <ClassComparisonChart
                    data={filteredGradeData}
                    filterState={{
                      selectedClasses: [],
                      selectedSubjects: [],
                    }}
                    className=""
                  />
                  <ClassBoxPlotChart
                    gradeData={filteredGradeData}
                    className=""
                  />
                </div>

                {/* 学习行为分析 */}
                <LearningBehaviorAnalysis />

                {/* 学生贡献度分析 */}
                <ContributionAnalysis
                  gradeData={filteredGradeData}
                  title="学生科目贡献度分析"
                  className=""
                />
              </TabsContent>

              {/* 图表展示模块 */}
              <TabsContent value="chart-gallery" className="space-y-6">
                <ChartGallery gradeData={filteredGradeData} className="" />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* 数据详情页面 - 统计概览和优化数据表格 */}
          <TabsContent value="data-details" className="space-y-6">
            <ErrorBoundary
              componentName="StatisticsOverview"
              enableRecovery={true}
              showErrorDetails={true}
            >
              <StatisticsOverview
                examId={
                  filter.exams?.length === 1 ? filter.exams[0] : undefined
                }
                classFilter={filter.classes}
                subjectFilter={filter.subjects}
                className=""
              />
            </ErrorBoundary>

            <ErrorBoundary
              componentName="OptimizedDataTable"
              enableRecovery={true}
              showErrorDetails={true}
            >
              <OptimizedDataTable
                data={filteredGradeData}
                columns={[
                  {
                    key: "name",
                    title: "姓名",
                    dataIndex: "name",
                    width: 120,
                    sortable: true,
                    fixed: "left",
                  },
                  {
                    key: "class_name",
                    title: "班级",
                    dataIndex: "class_name",
                    width: 100,
                    sortable: true,
                    filterable: true,
                  },
                  {
                    key: "subject",
                    title: "科目",
                    dataIndex: "subject",
                    width: 80,
                    sortable: true,
                    filterable: true,
                  },
                  {
                    key: "score",
                    title: "分数",
                    dataIndex: "score",
                    width: 80,
                    sortable: true,
                    align: "center",
                    render: (value: number) => (
                      <Badge
                        className={cn(
                          "font-bold border-2 border-black",
                          value >= 90
                            ? "bg-[#B9FF66] text-black"
                            : value >= 80
                              ? "bg-[#6B7280] text-white"
                              : value >= 60
                                ? "bg-[#F59E0B] text-white"
                                : "bg-[#EF4444] text-white"
                        )}
                      >
                        {value}分
                      </Badge>
                    ),
                  },
                  {
                    key: "exam_title",
                    title: "考试",
                    dataIndex: "exam_title",
                    width: 150,
                    sortable: true,
                    ellipsis: true,
                  },
                  {
                    key: "exam_date",
                    title: "考试日期",
                    dataIndex: "exam_date",
                    width: 120,
                    sortable: true,
                    render: (value: string) =>
                      value ? new Date(value).toLocaleDateString() : "-",
                  },
                  {
                    key: "exam_type",
                    title: "考试类型",
                    dataIndex: "exam_type",
                    width: 100,
                    filterable: true,
                    render: (value: string) => (
                      <Badge
                        variant="outline"
                        className="border-2 border-black font-bold"
                      >
                        {value || "常规"}
                      </Badge>
                    ),
                  },
                ]}
                config={{
                  virtual: filteredGradeData.length > 1000, // 大数据时启用虚拟滚动
                  itemHeight: 60,
                  pageSize: 50,
                  showPagination: true,
                  showSearch: true,
                  showFilter: true,
                  showColumnSettings: true,
                  searchKeys: ["name", "class_name", "subject", "exam_title"],
                  stickyHeader: true,
                  bordered: true,
                  striped: true,
                  compact: false,
                }}
                title="成绩数据详情"
                showExport={true}
                loading={loading}
                emptyText="暂无成绩数据"
                rowKey="id"
                onRowClick={(record) => {
                  toast.info(
                    `查看 ${record.name} 的 ${record.subject} 成绩: ${record.score}分`
                  );
                }}
                className=""
              />
            </ErrorBoundary>
          </TabsContent>
        </Tabs>

        {/* 帮助说明 - 小字体放置底部 */}
        <div className="mt-8 pt-4 border-t border-[#6B7280]">
          <p className="text-xs text-[#6B7280] text-center leading-relaxed">
            增强功能说明：科目相关性分析使用95%置信区间；个人趋势分析支持线性回归预测；多维度排名包含学术、稳定性、进步性、均衡性四个维度。
            数据基于Wide-Table结构优化，提供更快的查询性能。
          </p>
        </div>

        {/* 考试特定科目配置模态框 */}
        <ExamSpecificSubjectSettings
          isOpen={showSubjectSettings}
          onClose={() => setShowSubjectSettings(false)}
          onSave={handleSubjectSettingsSave}
          currentExamId={
            filter.exams?.length === 1 ? filter.exams[0] : undefined
          }
          currentExamName={
            filter.exams?.length === 1
              ? examList.find((exam) => exam.id === filter.exams[0])?.title
              : undefined
          }
        />

        {/* 浮动AI聊天助手 */}
        <FloatingChatAssistant defaultMinimized={true} />
      </div>
    </div>
  );
};

export default CompleteAnalyticsDashboard;
