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

// 预警分析组件
const WarningAnalysis = () => {
  const { session } = useSession();
  const { params, isFromAnomalyDetection, hasExamFilter } = useUrlParams();
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
      // 根据URL参数构建缓存键，确保不同筛选条件有不同缓存
      const cacheKey = `warning_statistics_${JSON.stringify(params)}`;
      const statistics = await requestCache.get(
        cacheKey,
        async () => {
          try {
            console.log("获取预警统计数据，参数:", params);
            const rawData = await getWarningStatistics();

            // 使用校验器确保数据格式正确
            const validatedData = WarningDataValidator.normalizeWarningStats(rawData);
            
            console.log("预警数据校验和格式化完成:", validatedData);
            return validatedData;
          } catch (error) {
            console.error("获取预警统计数据失败:", error);
            // 返回默认数据而不是null
            return WarningDataValidator.createDefaultWarningStats();
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
          riskByClass: statistics.risk_factors.length > 0 ? 
            statistics.risk_factors.slice(0, 5).map((factor, index) => ({
              className: factor.factor,
              studentCount: Math.floor(factor.count * 3.5), // 估算总学生数
              atRiskCount: factor.count,
            })) : [
              { className: "暂无数据", studentCount: 0, atRiskCount: 0 }
            ],
          commonRiskFactors: statistics.risk_factors.map((factor) => ({
            factor: factor.factor,
            count: factor.count,
            percentage: factor.percentage,
          })),
        };

        setStats(statistics);
        
        // 记录数据来源和筛选状态
        const dataSource = isFromAnomalyDetection ? "异常检测系统" : "预警系统";
        const filterInfo = hasExamFilter ? `筛选条件: ${params.exam}` : "全部数据";
        
        console.log(`预警数据加载完成 [来源: ${dataSource}, ${filterInfo}]`, dashboardStats);
        
        // 显示适当的提示信息
        if (statistics.students.total > 0) {
          const message = isFromAnomalyDetection 
            ? `已从异常检测系统加载 ${statistics.students.total} 名学生的预警数据`
            : `预警数据已更新 (${statistics.students.total} 名学生)`;
          toast.success(message);
        } else {
          toast.info("暂无预警数据，显示默认统计信息");
        }
    } catch (error) {
      console.error("获取预警数据失败:", error);
      toast.error("获取预警数据失败");
    } finally {
      setLoadingData(false);
    }
  };

  // 仅在组件首次挂载和当前选项卡切换时加载数据
  useEffect(() => {
    // 只有当前标签页才加载数据
    if (activeTab === "dashboard" && !tabsLoaded.dashboard) {
      fetchWarningData();
      setTabsLoaded((prev) => ({ ...prev, dashboard: true }));
    }

    // 如果切换到 AI 分析标签，确保已加载数据
    if (activeTab === "ai" && !tabsLoaded.ai) {
      if (!tabsLoaded.dashboard) {
        fetchWarningData();
      }
      setTabsLoaded((prev) => ({ ...prev, ai: true }));
    }
  }, [activeTab, tabsLoaded.dashboard, tabsLoaded.ai]);

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
      {/* 标题和工具栏 */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">预警分析</h1>
            {isFromAnomalyDetection && (
              <Badge className="bg-[#9C88FF] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]">
                来自异常检测
              </Badge>
            )}
          </div>
          <p className="text-gray-500 mt-1">
            分析学生预警数据，发现潜在问题并制定干预措施
            {hasExamFilter && params.exam && (
              <span className="text-[#B9FF66] font-bold ml-2">
                · 当前筛选: {params.exam}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchWarningData}
            disabled={loadingData}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loadingData ? "animate-spin" : ""}`}
            />
            {loadingData ? "加载中" : "刷新数据"}
          </Button>
        </div>
      </div>

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
                riskByClass: statistics.risk_factors.length > 0 ? 
                  statistics.risk_factors.slice(0, 5).map((factor, index) => ({
                    className: factor.factor,
                    studentCount: Math.floor(factor.count * 3.5), // 估算总学生数
                    atRiskCount: factor.count,
                  })) : [
                    { className: "暂无数据", studentCount: 0, atRiskCount: 0 }
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
