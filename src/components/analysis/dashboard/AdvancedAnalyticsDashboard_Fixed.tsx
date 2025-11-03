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
      border: "border-[#B9FF66]",
      text: "text-[#191A23]",
      iconBg: "bg-[#191A23]",
      iconText: "text-[#B9FF66]",
      accent: "text-[#191A23]",
    },
    secondary: {
      bg: "bg-[#6B7280]",
      border: "border-[#6B7280]",
      text: "text-white",
      iconBg: "bg-white",
      iconText: "text-[#6B7280]",
      accent: "text-white",
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
      className={`${styles.bg} border border-black shadow-[4px_4px_0px_0px_#191A23] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] rounded-xl overflow-hidden`}
    >
      <CardContent className="p-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p
              className={`text-sm font-black uppercase tracking-wide ${styles.text} opacity-80 mb-2`}
            >
              {title}
            </p>
            <div className="flex items-baseline gap-3 mb-2">
              <p className={`text-4xl font-black ${styles.text}`}>
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
              {trendIcon}
            </div>
            {subtitle && (
              <p className={`text-sm font-medium ${styles.text} opacity-70`}>
                {subtitle}
              </p>
            )}
          </div>

          {icon && (
            <div
              className={`p-3 ${styles.iconBg} rounded-full border-2 border-black shadow-[3px_3px_0px_0px_#191A23]`}
            >
              <div className={`w-6 h-6 ${styles.iconText}`}>{icon}</div>
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
    <div className="min-h-screen bg-white flex px-8">
      {/* 侧边筛选栏 */}
      {showSidebar && (
        <>
          {/* 移动端背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />

          {/* 筛选栏 - 移动端为覆盖层，桌面端为侧边栏 */}
          <div className="fixed lg:static inset-y-0 left-0 z-50 w-80 bg-[#F8F8F8] border-r-2 border-black shadow-[4px_0px_0px_0px_#191A23] p-6 overflow-y-auto transform lg:transform-none transition-transform lg:transition-none">
            {/* 筛选栏标题 */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#B9FF66] rounded-full border-2 border-black">
                  <Filter className="w-5 h-5 text-[#191A23]" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#191A23] uppercase tracking-wide">
                    筛选条件
                  </h2>
                  <p className="text-sm text-gray-600">
                    {safeGradeData.length} / {allGradeData.length} 条记录
                  </p>
                </div>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-[#191A23]" />
                <input
                  type="text"
                  placeholder="搜索学生、班级..."
                  value={filter.searchKeyword || ""}
                  onChange={(e) =>
                    setFilter({ ...filter, searchKeyword: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] placeholder:text-[#191A23]/60 focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] focus:shadow-[2px_2px_0px_0px_#B9FF66] transition-all"
                />
              </div>
            </div>

            {/* 🔧 考试选择（带搜索） */}
            <div className="mb-6">
              <label className="block text-sm font-black text-[#191A23] uppercase tracking-wide mb-3">
                考试
                {examList.length > 10 && (
                  <span className="text-xs font-normal text-gray-500 normal-case ml-2">
                    ({examList.length} 个选项)
                  </span>
                )}
              </label>
              {examList.length > 10 ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-[#191A23]" />
                    <input
                      type="text"
                      placeholder="搜索考试标题..."
                      className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] placeholder:text-[#191A23]/60 focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] transition-all text-sm"
                      onChange={(e) => {
                        const searchTerm = e.target.value.toLowerCase();
                        // 这里实现考试搜索逻辑
                      }}
                    />
                  </div>
                  <select
                    value={filter.examIds?.[0] || ""}
                    onChange={(e) =>
                      setFilter({
                        ...filter,
                        examIds: e.target.value ? [e.target.value] : undefined,
                      })
                    }
                    className="w-full p-3 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] transition-all"
                    size={Math.min(6, examList.length)}
                  >
                    <option value="">全部考试</option>
                    {examList.map((exam) => (
                      <option key={exam.id} value={exam.id}>
                        {exam.title} ({exam.type})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  value={filter.examIds?.[0] || ""}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      examIds: e.target.value ? [e.target.value] : undefined,
                    })
                  }
                  className="w-full p-3 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] transition-all"
                >
                  <option value="">全部考试</option>
                  {examList.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.title} ({exam.type})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 科目选择 */}
            <div className="mb-6">
              <label className="block text-sm font-black text-[#191A23] uppercase tracking-wide mb-3">
                科目
              </label>
              <select
                value={filter.subjects?.[0] || ""}
                onChange={(e) =>
                  setFilter({
                    ...filter,
                    subjects: e.target.value ? [e.target.value] : undefined,
                  })
                }
                className="w-full p-3 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] focus:border-[#F7931E] focus:ring-2 focus:ring-[#F7931E] transition-all"
              >
                <option value="">全部科目</option>
                {availableSubjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* 🔧 班级选择（带搜索） */}
            <div className="mb-6">
              <label className="block text-sm font-black text-[#191A23] uppercase tracking-wide mb-3">
                班级
                {availableClasses.length > 10 && (
                  <span className="text-xs font-normal text-gray-500 normal-case ml-2">
                    ({availableClasses.length} 个选项)
                  </span>
                )}
              </label>
              {availableClasses.length > 10 ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-[#191A23]" />
                    <input
                      type="text"
                      placeholder="搜索班级名称..."
                      className="w-full pl-10 pr-4 py-2 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] placeholder:text-[#191A23]/60 focus:border-[#9C88FF] focus:ring-2 focus:ring-[#9C88FF] transition-all text-sm"
                    />
                  </div>
                  <select
                    value={filter.classNames?.[0] || ""}
                    onChange={(e) =>
                      setFilter({
                        ...filter,
                        classNames: e.target.value
                          ? [e.target.value]
                          : undefined,
                      })
                    }
                    className="w-full p-3 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] focus:border-[#9C88FF] focus:ring-2 focus:ring-[#9C88FF] transition-all"
                    size={Math.min(6, availableClasses.length)}
                  >
                    <option value="">全部班级</option>
                    {availableClasses.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <select
                  value={filter.classNames?.[0] || ""}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      classNames: e.target.value ? [e.target.value] : undefined,
                    })
                  }
                  className="w-full p-3 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] focus:border-[#9C88FF] focus:ring-2 focus:ring-[#9C88FF] transition-all"
                >
                  <option value="">全部班级</option>
                  {availableClasses.map((className) => (
                    <option key={className} value={className}>
                      {className}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 分数范围 */}
            <div className="mb-6">
              <label className="block text-sm font-black text-[#191A23] uppercase tracking-wide mb-3">
                分数范围
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="最低分"
                  value={filter.scoreRange?.min || ""}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      scoreRange: {
                        ...filter.scoreRange,
                        min: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className="w-full p-3 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] transition-all"
                />
                <input
                  type="number"
                  placeholder="最高分"
                  value={filter.scoreRange?.max || ""}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      scoreRange: {
                        ...filter.scoreRange,
                        max: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className="w-full p-3 bg-white border-2 border-black rounded-lg font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] transition-all"
                />
              </div>
            </div>

            {/* 清除筛选按钮 */}
            <button
              onClick={() => setFilter({})}
              className="w-full p-3 bg-[#6B7280] text-white border-2 border-black rounded-lg font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              清除所有筛选
            </button>
          </div>
        </>
      )}

      {/* 主内容区域 - 方案A: 增加呼吸空间, 最外层已有px-8 */}
      <div className="flex-1 px-8 py-8 overflow-y-auto">
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
                : statistics?.scoreComparison && statistics.scoreComparison < 0
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                <CardHeader className="bg-[#6B7280] border-b-2 border-black">
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
                <PredictiveAnalysis gradeData={safeGradeData} />
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
                <LearningBehaviorAnalysis gradeData={safeGradeData} />
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
  );
};

export default AdvancedAnalyticsDashboard;
