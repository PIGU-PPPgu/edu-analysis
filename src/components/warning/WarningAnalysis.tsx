import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  AlertTriangle,
  BarChart3,
  UserRoundSearch,
  AlertCircle,
  Network,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Brain,
  Download,
  Share2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
  ClipboardList,
  ExternalLink,
  Filter,
  Calendar,
  BookOpen,
  Target,
  ToggleLeft,
  ToggleRight,
  Info,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getWarningStatistics,
  getRiskFactors,
  WarningStats,
} from "@/services/warningService";
import { formatNumber } from "@/utils/formatUtils";
import { requestCache } from "@/utils/cacheUtils";
import { useSession } from "@/hooks/useSession";
import { useUrlParams } from "@/hooks/useUrlParams";
import { validateWarningStatistics } from "@/utils/warningDataValidator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// 直接导入重量级组件
import WarningDashboard from "./WarningDashboard";
// 懒加载次要组件
const WarningList = lazy(() => import("./WarningList"));
const WarningRules = lazy(() => import("./WarningRules"));
const InterventionWorkflow = lazy(() => import("./InterventionWorkflow"));
const RiskClusterView = lazy(() => import("./RiskClusterView"));

// 加载占位符组件
const LoadingFallback = () => (
  <Card className="p-8 flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
      <p className="text-sm text-gray-500">加载中，请稍候...</p>
    </div>
  </Card>
);

// 空状态提示组件
const EmptyState = ({
  title,
  message,
  icon: Icon,
}: {
  title: string;
  message: string;
  icon: React.ElementType;
}) => (
  <Card className="bg-gray-50 border-dashed flex flex-col items-center justify-center p-10 text-center">
    <Icon className="h-12 w-12 text-gray-400 mb-4" />
    <h3 className="text-lg font-medium text-gray-700 mb-2">{title}</h3>
    <p className="text-sm text-gray-500 max-w-md mb-6">{message}</p>
  </Card>
);

// 分析模式类型
type AnalysisMode = "overall" | "exam-level";

// 筛选配置接口
interface FilterConfig {
  timeRange: "month" | "quarter" | "semester" | "year" | "custom";
  examTypes: string[];
  mixedAnalysis: boolean;
  analysisMode: "student" | "exam" | "subject";
  startDate?: string;
  endDate?: string;
}

// 预警分析组件
const WarningAnalysis = () => {
  const { session } = useSession();
  const { params, isFromAnomalyDetection, hasExamFilter } = useUrlParams();

  // 分析模式状态 - 根据URL参数决定初始模式
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(
    isFromAnomalyDetection && hasExamFilter ? "exam-level" : "overall"
  );

  const [activeTab, setActiveTab] = useState("dashboard");
  const [loadingData, setLoadingData] = useState(false);
  const [selectedWarningId, setSelectedWarningId] = useState<string | null>(
    null
  );
  const [tabsLoaded, setTabsLoaded] = useState<Record<string, boolean>>({
    dashboard: false,
    list: false,
    rules: false,
    intervention: false,
    clusters: false,
    ai: false,
  });

  // 筛选配置状态
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    timeRange: "semester",
    examTypes: ["月考", "期中考试", "期末考试", "模拟考试"],
    mixedAnalysis: true,
    analysisMode: "student",
    startDate: undefined,
    endDate: undefined,
  });

  // 初始化预警统计数据状态
  const [stats, setStats] = useState<WarningStats>({
    students: { total: 0, at_risk: 0, trend: "unchanged" },
    classes: { total: 0, at_risk: 0, trend: "unchanged" },
    warnings: {
      total: 0,
      by_type: [],
      by_severity: [
        { severity: "high", count: 0, percentage: 0, trend: "unchanged" },
        { severity: "medium", count: 0, percentage: 0, trend: "unchanged" },
        { severity: "low", count: 0, percentage: 0, trend: "unchanged" },
      ],
      trend: "unchanged",
    },
    risk_factors: [],
  });

  // 获取预警数据（缓存版本）
  const fetchWarningData = async () => {
    setLoadingData(true);
    try {
      // 根据分析模式和筛选条件构建缓存键
      const cacheKey =
        analysisMode === "exam-level"
          ? `exam_warning_${JSON.stringify(params)}`
          : `overall_warning_${JSON.stringify({ ...params, ...filterConfig })}`;

      const statistics = await requestCache.get(
        cacheKey,
        async () => {
          try {
            if (analysisMode === "exam-level") {
              console.log("获取考试级预警数据，参数:", params);
              // TODO: 调用考试级预警分析API
              const rawData = await getWarningStatistics(); // 临时使用现有API

              // 为考试级分析添加额外的上下文信息
              const examLevelData = {
                ...rawData,
                exam_context: {
                  exam_title: params.exam || "未知考试",
                  exam_date: params.date,
                  is_from_anomaly: isFromAnomalyDetection,
                  filter_applied: hasExamFilter,
                },
              };

              return examLevelData;
            } else {
              console.log("获取整体预警数据，筛选条件:", filterConfig);
              // TODO: 调用整体预警分析API，传入筛选条件
              const rawData = await getWarningStatistics(); // 临时使用现有API

              return {
                ...rawData,
                filter_context: {
                  time_range: filterConfig.timeRange,
                  exam_types: filterConfig.examTypes,
                  mixed_analysis: filterConfig.mixedAnalysis,
                  analysis_mode: filterConfig.analysisMode,
                },
              };
            }
          } catch (error) {
            console.error("获取预警统计数据失败:", error);
            // 返回默认数据而不是null
            return {
              students: { total: 0, at_risk: 0, trend: "unchanged" },
              classes: { total: 0, at_risk: 0, trend: "unchanged" },
              warnings: {
                total: 0,
                by_type: [],
                by_severity: [
                  {
                    severity: "high",
                    count: 0,
                    percentage: 0,
                    trend: "unchanged",
                  },
                  {
                    severity: "medium",
                    count: 0,
                    percentage: 0,
                    trend: "unchanged",
                  },
                  {
                    severity: "low",
                    count: 0,
                    percentage: 0,
                    trend: "unchanged",
                  },
                ],
                trend: "unchanged",
              },
              risk_factors: [],
            };
          }
        },
        10 * 60 * 1000
      ); // 10分钟缓存

      if (statistics) {
        // 将数据转换为WarningDashboard需要的格式
        const dashboardStats = {
          totalStudents: statistics.students.total,
          atRiskStudents: statistics.students.at_risk,
          highRiskStudents:
            statistics.warnings.by_severity.find((s) => s.severity === "high")
              ?.count || 0,
          warningsByType: statistics.warnings.by_type.map((type) => ({
            type: type.type,
            count: type.count,
            percentage: type.percentage,
            trend: type.trend,
          })),
          riskByClass:
            statistics.risk_factors.length > 0
              ? statistics.risk_factors.slice(0, 5).map((factor, index) => ({
                  className: factor.factor,
                  studentCount: Math.floor(factor.count * 3.5), // 估算总学生数
                  atRiskCount: factor.count,
                }))
              : [{ className: "暂无数据", studentCount: 0, atRiskCount: 0 }],
          commonRiskFactors: statistics.risk_factors.map((factor) => ({
            factor: factor.factor,
            count: factor.count,
            percentage: factor.percentage,
          })),
        };

        setStats(statistics);

        // 记录数据来源和筛选状态
        const modeText =
          analysisMode === "exam-level" ? "考试级分析" : "整体分析";
        const dataSource = isFromAnomalyDetection ? "异常检测系统" : "预警系统";
        const filterInfo =
          analysisMode === "exam-level"
            ? `考试: ${params.exam || "未指定"}`
            : `类型: ${filterConfig.examTypes.join(", ")}`;

        console.log(
          `预警数据加载完成 [模式: ${modeText}, 来源: ${dataSource}, ${filterInfo}]`,
          dashboardStats
        );

        // 显示适当的提示信息
        if (statistics.students.total > 0) {
          const message =
            analysisMode === "exam-level"
              ? `考试级预警分析已加载 (${params.exam}, ${statistics.students.total} 名学生)`
              : `整体预警分析已更新 (${statistics.students.total} 名学生, ${filterConfig.examTypes.length} 种考试类型)`;
          toast.success(message);
        } else {
          const emptyMessage =
            analysisMode === "exam-level"
              ? "该考试暂无预警数据"
              : "当前筛选条件下暂无预警数据";
          toast.info(emptyMessage);
        }
      }
    } catch (error) {
      console.error("获取预警数据失败:", error);
      toast.error("获取预警数据失败");
    } finally {
      setLoadingData(false);
    }
  };

  // 监听分析模式和筛选条件变化，重新加载数据
  useEffect(() => {
    if (activeTab === "dashboard" && !tabsLoaded.dashboard) {
      fetchWarningData();
      setTabsLoaded((prev) => ({ ...prev, dashboard: true }));
    }

    if (activeTab === "ai" && !tabsLoaded.ai) {
      if (!tabsLoaded.dashboard) {
        fetchWarningData();
      }
      setTabsLoaded((prev) => ({ ...prev, ai: true }));
    }
  }, [activeTab, tabsLoaded.dashboard, tabsLoaded.ai]);

  // 当分析模式或筛选条件改变时，重新加载数据
  useEffect(() => {
    if (tabsLoaded.dashboard) {
      fetchWarningData();
    }
  }, [analysisMode, filterConfig]);

  // 模式切换处理
  const handleModeSwitch = (newMode: AnalysisMode) => {
    setAnalysisMode(newMode);

    // 重置部分状态
    setTabsLoaded((prev) => ({ ...prev, dashboard: false }));

    const modeText =
      newMode === "exam-level" ? "考试级预警分析" : "整体预警分析";
    toast.info(`已切换到${modeText}模式`);
  };

  // 筛选配置更新处理
  const handleFilterChange = <K extends keyof FilterConfig>(
    key: K,
    value: FilterConfig[K]
  ) => {
    setFilterConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 考试类型切换处理
  const toggleExamType = (examType: string) => {
    setFilterConfig((prev) => ({
      ...prev,
      examTypes: prev.examTypes.includes(examType)
        ? prev.examTypes.filter((type) => type !== examType)
        : [...prev.examTypes, examType],
    }));
  };

  // 处理预警记录选择
  const handleWarningSelect = (warningId: string) => {
    setSelectedWarningId(warningId);
    setActiveTab("intervention"); // 自动切换到干预工作流标签
  };

  // 处理选项卡切换
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* 标题和模式切换 */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {analysisMode === "exam-level"
                  ? "考试级预警分析"
                  : "预警分析中心"}
              </h1>
              {isFromAnomalyDetection && (
                <Badge className="bg-[#9C88FF] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]">
                  来自异常检测
                </Badge>
              )}
              {analysisMode === "exam-level" && (
                <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]">
                  考试级分析
                </Badge>
              )}
            </div>

            {/* 模式切换按钮 */}
            <div className="flex items-center gap-2 ml-auto">
              <Label className="text-sm font-medium">分析模式：</Label>
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg border border-gray-200">
                <Button
                  size="sm"
                  variant={analysisMode === "overall" ? "default" : "ghost"}
                  onClick={() => handleModeSwitch("overall")}
                  className={`h-8 px-3 text-sm font-medium ${
                    analysisMode === "overall"
                      ? "bg-white border border-gray-300 shadow-sm"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  整体分析
                </Button>
                <Button
                  size="sm"
                  variant={analysisMode === "exam-level" ? "default" : "ghost"}
                  onClick={() => handleModeSwitch("exam-level")}
                  className={`h-8 px-3 text-sm font-medium ${
                    analysisMode === "exam-level"
                      ? "bg-white border border-gray-300 shadow-sm"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <Target className="h-4 w-4 mr-1" />
                  考试级分析
                </Button>
              </div>
            </div>
          </div>

          <p className="text-gray-500 mt-1">
            {analysisMode === "exam-level"
              ? `分析特定考试的预警数据，识别异常表现并制定针对性干预措施`
              : `分析学生整体预警数据，发现长期问题并制定系统性干预措施`}
            {hasExamFilter && params.exam && (
              <span className="text-[#B9FF66] font-bold ml-2">
                · 当前考试: {params.exam}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 筛选器面板 - 仅在整体分析模式下显示 */}
      {analysisMode === "overall" && (
        <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66]/20 border-b-2 border-black">
            <CardTitle className="flex items-center gap-2 text-[#191A23] font-black">
              <Filter className="h-5 w-5" />
              分析筛选器
              <Badge className="bg-white text-[#191A23] border-2 border-black text-xs">
                {filterConfig.examTypes.length} 种考试类型
              </Badge>
            </CardTitle>
            <CardDescription className="text-[#191A23]/70">
              配置分析范围和维度，获取更精准的预警洞察
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 时间范围选择 */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  时间范围
                </Label>
                <Select
                  value={filterConfig.timeRange}
                  onValueChange={(value: any) =>
                    handleFilterChange("timeRange", value)
                  }
                >
                  <SelectTrigger className="border-2 border-black">
                    <SelectValue placeholder="选择时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">最近一个月</SelectItem>
                    <SelectItem value="quarter">最近三个月</SelectItem>
                    <SelectItem value="semester">本学期</SelectItem>
                    <SelectItem value="year">本学年</SelectItem>
                    <SelectItem value="custom">自定义范围</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 分析维度选择 */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  分析维度
                </Label>
                <Select
                  value={filterConfig.analysisMode}
                  onValueChange={(value: any) =>
                    handleFilterChange("analysisMode", value)
                  }
                >
                  <SelectTrigger className="border-2 border-black">
                    <SelectValue placeholder="选择分析维度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">按学生分析</SelectItem>
                    <SelectItem value="exam">按考试分析</SelectItem>
                    <SelectItem value="subject">按科目分析</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 混合分析选项 */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  分析选项
                </Label>
                <div className="flex items-center space-x-3 p-3 border-2 border-black rounded-lg bg-gray-50">
                  <Switch
                    checked={filterConfig.mixedAnalysis}
                    onCheckedChange={(checked) =>
                      handleFilterChange("mixedAnalysis", checked)
                    }
                  />
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-[#191A23]">
                      混合分析
                    </Label>
                    <p className="text-xs text-[#191A23]/70">
                      将不同类型考试的数据混合分析
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 考试类型选择 */}
            <div className="mt-6 space-y-3">
              <Label className="text-sm font-bold text-[#191A23] flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                考试类型筛选
                <Badge className="bg-[#B9FF66] text-[#191A23] border border-black text-xs">
                  已选择 {filterConfig.examTypes.length} 种
                </Badge>
              </Label>
              <div className="flex flex-wrap gap-2">
                {[
                  "月考",
                  "期中考试",
                  "期末考试",
                  "模拟考试",
                  "单元测试",
                  "诊断考试",
                ].map((examType) => (
                  <Button
                    key={examType}
                    size="sm"
                    variant={
                      filterConfig.examTypes.includes(examType)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => toggleExamType(examType)}
                    className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] ${
                      filterConfig.examTypes.includes(examType)
                        ? "bg-[#B9FF66] text-[#191A23] hover:bg-[#A8E055]"
                        : "bg-white text-[#191A23] hover:bg-gray-50"
                    }`}
                  >
                    {examType}
                    {filterConfig.examTypes.includes(examType) && (
                      <div className="ml-1 w-2 h-2 bg-[#191A23] rounded-full" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 考试级分析的上下文信息 */}
      {analysisMode === "exam-level" && (
        <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#9C88FF] rounded-full border-2 border-black">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#191A23]">
                    {params.exam || "当前考试"}
                  </h3>
                  <p className="text-sm text-[#191A23]/70">
                    {params.date && `考试日期: ${params.date}`}
                    {isFromAnomalyDetection && " · 来源: 异常检测系统"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleModeSwitch("overall")}
                  className="border-2 border-black bg-white hover:bg-gray-50 text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  切换到整体分析
                </Button>
                <Button
                  variant="outline"
                  onClick={fetchWarningData}
                  disabled={loadingData}
                  className="border-2 border-black bg-white hover:bg-gray-50 text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23]"
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${loadingData ? "animate-spin" : ""}`}
                  />
                  {loadingData ? "加载中" : "刷新数据"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 整体分析模式的工具栏 */}
      {analysisMode === "overall" && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={fetchWarningData}
            disabled={loadingData}
            className="border-2 border-black bg-white hover:bg-gray-50 text-[#191A23] font-bold shadow-[2px_2px_0px_0px_#191A23]"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loadingData ? "animate-spin" : ""}`}
            />
            {loadingData ? "加载中" : "刷新数据"}
          </Button>
        </div>
      )}

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-6 w-full mb-6">
          <TabsTrigger
            value="dashboard"
            className="flex items-center space-x-2"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>总览</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>预警列表</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>预警规则</span>
          </TabsTrigger>
          <TabsTrigger
            value="intervention"
            className="flex items-center space-x-2"
          >
            <ClipboardList className="h-4 w-4" />
            <span>干预流程</span>
          </TabsTrigger>
          <TabsTrigger value="clusters" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>风险聚类</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>AI分析</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<LoadingFallback />}>
          <TabsContent value="dashboard">
            <WarningDashboard
              factorStats={stats.risk_factors}
              levelStats={stats.warnings.by_severity.map((s) => ({
                level: s.severity,
                count: s.count,
                percentage: s.percentage,
              }))}
              warningData={{
                totalStudents: stats.students.total,
                atRiskStudents: stats.students.at_risk,
                highRiskStudents:
                  stats.warnings.by_severity.find((s) => s.severity === "high")
                    ?.count || 0,
                warningsByType: stats.warnings.by_type.map((type) => ({
                  type: type.type,
                  count: type.count,
                  percentage: type.percentage,
                  trend: type.trend,
                })),
                riskByClass:
                  stats.risk_factors.length > 0
                    ? stats.risk_factors.slice(0, 5).map((factor, index) => ({
                        className: factor.factor,
                        studentCount: Math.floor(factor.count * 3.5), // 估算总学生数
                        atRiskCount: factor.count,
                      }))
                    : [
                        {
                          className: "暂无数据",
                          studentCount: 0,
                          atRiskCount: 0,
                        },
                      ],
                commonRiskFactors: stats.risk_factors.map((factor) => ({
                  factor: factor.factor,
                  count: factor.count,
                  percentage: factor.percentage,
                })),
              }}
              isLoading={loadingData}
            />
          </TabsContent>

          <TabsContent value="list">
            {activeTab === "list" && (
              <WarningList onWarningSelect={handleWarningSelect} />
            )}
          </TabsContent>

          <TabsContent value="rules">
            {activeTab === "rules" && <WarningRules />}
          </TabsContent>

          <TabsContent value="intervention">
            {activeTab === "intervention" &&
              (selectedWarningId ? (
                <InterventionWorkflow
                  warningRecord={{
                    id: selectedWarningId,
                    student_id: "",
                    rule_id: null,
                    details: {},
                    status: "active",
                    created_at: "",
                  }}
                />
              ) : (
                <EmptyState
                  title="请选择预警记录"
                  message="请从预警列表中选择一条预警记录，开始制定干预方案。"
                  icon={ClipboardList}
                />
              ))}
          </TabsContent>

          <TabsContent value="clusters">
            {activeTab === "clusters" && <RiskClusterView />}
          </TabsContent>

          <TabsContent value="ai">
            {activeTab === "ai" && (
              <div className="grid grid-cols-1 gap-6">
                <Card className="mb-6">
                  <CardHeader className="bg-[#f8fff0]">
                    <CardTitle className="flex items-center">
                      <Brain className="h-5 w-5 mr-2 text-[#c0ff3f]" />
                      AI智能分析
                    </CardTitle>
                    <CardDescription>
                      利用AI算法深度分析学生预警数据，挖掘潜在规律并提供干预建议
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                      <Card className="overflow-hidden border-none shadow-sm">
                        <CardHeader className="p-4 bg-blue-50">
                          <CardTitle className="text-base font-medium">
                            风险学生聚类分析
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-500 mb-4">
                            AI将分析各种维度的数据，将风险学生分为不同聚类，帮助您发现潜在模式。
                          </p>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActiveTab("clusters")}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            查看聚类分析结果
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-none shadow-sm">
                        <CardHeader className="p-4 bg-amber-50">
                          <CardTitle className="text-base font-medium">
                            预警因素分析
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-500 mb-4">
                            分析影响学生风险的关键因素，量化各因素权重并提供针对性建议。
                          </p>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActiveTab("dashboard")}
                          >
                            <BarChart3 className="h-4 w-4 mr-2" />
                            查看风险因素分布
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="overflow-hidden border-none shadow-sm">
                        <CardHeader className="p-4 bg-green-50">
                          <CardTitle className="text-base font-medium">
                            干预策略推荐
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-500 mb-4">
                            针对不同风险类型的学生，AI会推荐最有效的干预策略和方法。
                          </p>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setActiveTab("intervention")}
                          >
                            <ClipboardList className="h-4 w-4 mr-2" />
                            查看干预流程
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="mt-8">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            风险聚类可视化
                          </CardTitle>
                          <CardDescription>
                            AI根据多维特征对学生风险状态进行聚类分析
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="min-h-[300px]">
                          <Suspense fallback={<LoadingFallback />}>
                            <RiskClusterView simplified />
                          </Suspense>
                        </CardContent>
                        <CardFooter className="flex justify-end border-t pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("clusters")}
                          >
                            查看完整聚类分析
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            AI预警趋势预测
                          </CardTitle>
                          <CardDescription>
                            基于历史数据预测未来预警趋势
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 min-h-[200px] flex items-center justify-center">
                          <div className="text-center">
                            <TrendingUp className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">
                              此功能即将推出，敬请期待
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            预警干预效果评估
                          </CardTitle>
                          <CardDescription>
                            评估已实施干预措施的效果
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 min-h-[200px] flex items-center justify-center">
                          <div className="text-center">
                            <Network className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500">
                              此功能即将推出，敬请期待
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
};

export default WarningAnalysis;
