/**
 * 成绩分析Dashboard对比测试页面
 * 帮助识别和清理重复的分析界面
 */

import React, { useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/shared/Navbar";
import { ModernGradeAnalysisProvider } from "@/contexts/ModernGradeAnalysisContext";
import { GradeAnalysisProvider } from "@/contexts/GradeAnalysisContext";
import { Eye, AlertTriangle, FileText, CheckCircle } from "lucide-react";

// 懒加载稳定的Dashboard组件 - 只保留两个核心组件
const CompleteAnalyticsDashboardSafe = React.lazy(
  () =>
    import("@/components/analysis/dashboard/CompleteAnalyticsDashboard_Safe")
);

const AdvancedAnalyticsDashboardFixed = React.lazy(
  () =>
    import("@/components/analysis/dashboard/AdvancedAnalyticsDashboard_Fixed")
);

// 已删除的Dashboard信息（避免混乱）
const deletedDashboards = [
  "UnifiedAnalyticsDashboard - 统一分析仪表板（实验性功能）",
  "ModernGradeAnalysisDashboard - 现代成绩分析仪表板",
  "ModernGradeAnalysisDashboard_Safe - 现代成绩分析仪表板（安全版本）",
  "CorrelationAnalysisDashboard - 相关性分析仪表板",
  "EnhancedGradeAnalysisDashboard - 增强成绩分析仪表板",
  "AdvancedAnalyticsDashboard (Original) - 原始高级分析仪表板",
  "CompleteAnalyticsDashboard (Original) - 原始完整分析仪表板",
];

// Dashboard配置信息 - 仅包含保留的两个核心组件
const dashboards = [
  {
    id: "complete-safe",
    name: "CompleteAnalyticsDashboard_Safe",
    path: "@/components/analysis/dashboard/CompleteAnalyticsDashboard_Safe",
    component: CompleteAnalyticsDashboardSafe,
    status: "active",
    usage: "当前被 /grade-analysis 使用",
    description:
      "完整分析仪表板（安全版本）- 基础成绩分析页面，使用ModernGradeAnalysisProvider",
  },
  {
    id: "advanced-fixed",
    name: "AdvancedAnalyticsDashboard_Fixed",
    path: "@/components/analysis/dashboard/AdvancedAnalyticsDashboard_Fixed",
    component: AdvancedAnalyticsDashboardFixed,
    status: "active",
    usage: "当前被 /advanced-analysis 使用",
    description:
      "高级分析仪表板（修复版本）- 移除了有问题的依赖，使用UnifiedAppContext",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "duplicate":
      return "bg-red-100 text-red-800";
    case "unused":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-blue-100 text-blue-800";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <CheckCircle className="w-4 h-4" />;
    case "duplicate":
      return <AlertTriangle className="w-4 h-4" />;
    case "unused":
      return <FileText className="w-4 h-4" />;
    default:
      return <Eye className="w-4 h-4" />;
  }
};

const DashboardPreview: React.FC<{ dashboard: (typeof dashboards)[0] }> = ({
  dashboard,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Component = dashboard.component;

  // 需要ModernGradeAnalysisProvider的组件
  const needsModernProvider = (id: string) => {
    return ["complete-safe"].includes(id);
  };

  // 使用UnifiedAppContext的组件
  const usesUnifiedContext = (id: string) => {
    return ["advanced-fixed"].includes(id);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {dashboard.name}
          </CardTitle>
          <Badge className={getStatusColor(dashboard.status)}>
            {getStatusIcon(dashboard.status)}
            <span className="ml-1 capitalize">{dashboard.status}</span>
          </Badge>
        </div>
        <p className="text-xs text-gray-500">{dashboard.path}</p>
        <p className="text-xs text-blue-600">{dashboard.usage}</p>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 mb-3">{dashboard.description}</p>

        {needsModernProvider(dashboard.id) && (
          <Alert className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ℹ️ 此组件使用ModernGradeAnalysisProvider
            </AlertDescription>
          </Alert>
        )}

        {usesUnifiedContext(dashboard.id) && (
          <Alert className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ℹ️ 此组件使用UnifiedAppContext (统一上下文)
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={() => setShowPreview(!showPreview)}
          variant={showPreview ? "destructive" : "default"}
          size="sm"
          className="w-full mb-2"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? "隐藏预览" : "显示预览"}
        </Button>

        {showPreview && (
          <div className="border rounded-lg p-2 bg-gray-50 max-h-96 overflow-hidden">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">加载中...</span>
                </div>
              }
            >
              <div className="transform scale-50 origin-top-left w-[200%] h-[200%] overflow-hidden">
                {error ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>组件加载失败: {error}</AlertDescription>
                  </Alert>
                ) : (
                  <ErrorBoundary
                    onError={(error) => setError(error.message)}
                    dashboard={dashboard}
                  >
                    <div className="pointer-events-none">
                      {needsModernProvider(dashboard.id) ? (
                        <SafeDashboardWrapper>
                          <GradeAnalysisProvider>
                            <ModernGradeAnalysisProvider>
                              <Component />
                            </ModernGradeAnalysisProvider>
                          </GradeAnalysisProvider>
                        </SafeDashboardWrapper>
                      ) : usesUnifiedContext(dashboard.id) ? (
                        <SafeDashboardWrapper>
                          <Component />
                        </SafeDashboardWrapper>
                      ) : (
                        <SafeDashboardWrapper>
                          <GradeAnalysisProvider>
                            <Component />
                          </GradeAnalysisProvider>
                        </SafeDashboardWrapper>
                      )}
                    </div>
                  </ErrorBoundary>
                )}
              </div>
            </Suspense>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 安全包装器组件 - 提供默认数据和错误处理
const SafeDashboardWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      // 忽略非组件相关错误
      if (
        error.error?.message?.includes("ResizeObserver") ||
        error.error?.message?.includes("Script error")
      ) {
        return;
      }
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          组件渲染失败，可能需要特定的数据环境
        </AlertDescription>
      </Alert>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>组件需要特定的数据环境才能正常显示</AlertDescription>
      </Alert>
    );
  }
};

// 错误边界组件
class ErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    onError: (error: Error) => void;
    dashboard: any;
  },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {this.props.dashboard.name} 渲染失败
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// 删除的Dashboard信息卡片
const DeletedDashboardCard: React.FC<{ dashboardName: string }> = ({
  dashboardName,
}) => {
  return (
    <Card className="h-full border-gray-300 bg-gray-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">
            {dashboardName.split(" - ")[0]}
          </CardTitle>
          <Badge className="bg-gray-100 text-gray-600">
            <CheckCircle className="w-4 h-4" />
            <span className="ml-1">已删除</span>
          </Badge>
        </div>
        <p className="text-xs text-gray-400">{dashboardName.split(" - ")[1]}</p>
      </CardHeader>

      <CardContent className="pt-0">
        <Alert className="mb-3">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            此组件已被删除以避免混乱，功能已整合到保留的两个核心Dashboard中。
          </AlertDescription>
        </Alert>

        <Button disabled size="sm" className="w-full" variant="outline">
          <CheckCircle className="w-4 h-4 mr-2" />
          已清理
        </Button>
      </CardContent>
    </Card>
  );
};

const AnalysisDashboardComparison: React.FC = () => {
  const activeDashboards = dashboards.filter((d) => d.status === "active");
  const duplicateDashboards = dashboards.filter(
    (d) => d.status === "duplicate"
  );
  const unusedDashboards = dashboards.filter((d) => d.status === "unused");
  const deletedCount = deletedDashboards.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            成绩分析Dashboard对比测试
          </h1>
          <p className="text-gray-600 mb-4">
            查看所有成绩分析相关的Dashboard组件，识别重复和未使用的组件
          </p>

          <Alert className="mb-4">
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>使用说明：</strong>{" "}
              点击"显示预览"按钮查看每个Dashboard的实际效果。
              绿色标签表示正在使用，红色表示重复，灰色表示未使用。
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-green-600">
                      {activeDashboards.length}
                    </p>
                    <p className="text-gray-600">正在使用</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-blue-600">
                      {deletedCount}
                    </p>
                    <p className="text-gray-600">已删除</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-orange-600">
                      {duplicateDashboards.length}
                    </p>
                    <p className="text-gray-600">重复组件</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-gray-600" />
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-600">
                      {unusedDashboards.length}
                    </p>
                    <p className="text-gray-600">未使用</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="active">
              正在使用 ({activeDashboards.length})
            </TabsTrigger>
            <TabsTrigger value="deleted">已删除 ({deletedCount})</TabsTrigger>
            <TabsTrigger value="duplicate">
              重复组件 ({duplicateDashboards.length})
            </TabsTrigger>
            <TabsTrigger value="unused">
              未使用 ({unusedDashboards.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeDashboards.map((dashboard) => (
                <DashboardPreview key={dashboard.id} dashboard={dashboard} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="deleted" className="mt-6">
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>已删除组件：</strong>{" "}
                这些组件已被删除以避免混乱，它们的功能已经整合到保留的两个核心Dashboard中。
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {deletedDashboards.map((dashboardName, index) => (
                <DeletedDashboardCard
                  key={index}
                  dashboardName={dashboardName}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="duplicate" className="mt-6">
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>重复组件警告：</strong>{" "}
                这些组件与其他组件功能重复，建议删除以避免混淆。
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {duplicateDashboards.map((dashboard) => (
                <DashboardPreview key={dashboard.id} dashboard={dashboard} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="unused" className="mt-6">
            <Alert className="mb-4">
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>未使用组件：</strong>{" "}
                这些组件当前没有被路由使用，可以考虑删除或添加到路由中。
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {unusedDashboards.map((dashboard) => (
                <DashboardPreview key={dashboard.id} dashboard={dashboard} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>清理总结</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">
                  ✅ 保留的核心组件：
                </h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>
                    <code>CompleteAnalyticsDashboard_Safe</code> -
                    /grade-analysis 路由使用（基础分析）
                  </li>
                  <li>
                    <code>AdvancedAnalyticsDashboard_Fixed</code> -
                    /advanced-analysis 路由使用（高级分析）
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-blue-600 mb-2">
                  ✅ 已完成的清理：
                </h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>
                    ✅ 删除了 {deletedCount} 个重复或未使用的Dashboard组件
                  </li>
                  <li>
                    ✅ 修复了 LearningBehaviorAnalysis 和 PredictiveAnalysis
                    组件的导出问题
                  </li>
                  <li>✅ 简化了Context Provider配置</li>
                  <li>✅ 避免了多个Dashboard造成的混乱</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-600 mb-2">
                  📋 系统状态：
                </h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>
                    现在只保留 {activeDashboards.length} 个核心Dashboard组件
                  </li>
                  <li>每个组件都有明确的用途和路由配置</li>
                  <li>已优化Context Provider配置以减少依赖问题</li>
                  <li>测试页面可用于验证组件正常工作</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalysisDashboardComparison;
