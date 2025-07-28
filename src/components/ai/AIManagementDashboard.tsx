/**
 * 🤖 AI管理仪表板
 * 提供AI多提供商管理、成本监控和性能分析的统一界面
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  Activity,
  Zap,
  AlertTriangle,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Database,
  Gauge,
} from "lucide-react";
import {
  enhancedAIService,
  getAIStatistics,
} from "@/services/ai/enhancedAIService";
import { aiCostManager } from "@/services/ai/core/aiCostManager";
import { aiRouter } from "@/services/ai/core/aiRouter";
import { aiCacheManager } from "@/services/ai/core/aiCache";
import { toast } from "sonner";

// 统计数据接口
interface DashboardStats {
  cost: any;
  cache: any;
  providers: any[];
  summary: {
    totalRequests: number;
    totalCost: number;
    avgLatency: number;
    cacheHitRate: number;
    costSavings: number;
  };
}

export const AIManagementDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // 加载统计数据
  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getAIStatistics();
      setStats(data);
    } catch (error) {
      console.error("加载AI统计数据失败:", error);
      toast.error("加载统计数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();

    // 定时刷新
    const interval = setInterval(loadStats, 30000); // 30秒刷新一次
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载AI管理数据...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">暂无AI统计数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI管理中心</h1>
          <p className="text-gray-600">多提供商管理、成本优化和性能监控</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadStats}>
            刷新数据
          </Button>
          <Button
            variant="outline"
            onClick={() => enhancedAIService.clearCache()}
          >
            清空缓存
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 总成本 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总成本</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.summary.totalCost.toFixed(4)}
            </div>
            <p className="text-xs text-gray-600">
              累计 {stats.summary.totalRequests} 次请求
            </p>
          </CardContent>
        </Card>

        {/* 平均延迟 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均延迟</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.summary.avgLatency.toFixed(0)}ms
            </div>
            <p className="text-xs text-gray-600">响应速度指标</p>
          </CardContent>
        </Card>

        {/* 缓存命中率 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">缓存命中率</CardTitle>
            <Database className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.summary.cacheHitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              节省成本 ${stats.summary.costSavings.toFixed(4)}
            </p>
          </CardContent>
        </Card>

        {/* 活跃提供商 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃提供商</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.providers.filter((p) => p.isAvailable).length}
            </div>
            <p className="text-xs text-gray-600">
              / {stats.providers.length} 个提供商
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 详细面板 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="cost">成本分析</TabsTrigger>
          <TabsTrigger value="providers">提供商状态</TabsTrigger>
          <TabsTrigger value="cache">缓存管理</TabsTrigger>
          <TabsTrigger value="settings">配置管理</TabsTrigger>
        </TabsList>

        {/* 概览面板 */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 成本趋势 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  成本趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.cost.timeSeriesData
                    ?.slice(-7)
                    .map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm text-gray-600">
                          {item.date}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">
                            ${item.cost.toFixed(4)}
                          </span>
                          <Badge variant="outline">{item.requests}次</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* 热门提供商 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  提供商使用排行
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.cost.topProviders?.map(
                    (provider: any, index: number) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            {provider.providerId}
                          </span>
                          <span className="text-sm text-gray-600">
                            ${provider.cost.toFixed(4)} (
                            {provider.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={provider.percentage} className="h-2" />
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 成本分析面板 */}
        <TabsContent value="cost" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 预算状态 */}
            <Card>
              <CardHeader>
                <CardTitle>预算监控</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiCostManager.getBudgets().map((budget) => {
                    const usage = 65; // 模拟使用率
                    return (
                      <div key={budget.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{budget.name}</span>
                          <Badge
                            variant={
                              usage > 90
                                ? "destructive"
                                : usage > 70
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {usage.toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress value={usage} className="h-2" />
                        <p className="text-xs text-gray-600">
                          ${((budget.limit * usage) / 100).toFixed(2)} / $
                          {budget.limit}
                        </p>
                      </div>
                    );
                  })}

                  {aiCostManager.getBudgets().length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      暂无预算配置
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 成本分解 */}
            <Card>
              <CardHeader>
                <CardTitle>成本构成</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.cost.topModels?.map((model: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm">{model.modelId}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          ${model.cost.toFixed(4)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {model.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 告警信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
                  成本告警
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiCostManager.getActiveAlerts().map((alert) => (
                    <div key={alert.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">{alert.message}</p>
                          <p className="text-xs text-gray-600">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            alert.severity === "critical"
                              ? "destructive"
                              : alert.severity === "error"
                                ? "destructive"
                                : alert.severity === "warning"
                                  ? "secondary"
                                  : "default"
                          }
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {aiCostManager.getActiveAlerts().length === 0 && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">暂无告警</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 提供商状态面板 */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {stats.providers.map((provider: any) => (
              <Card key={provider.providerId}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {provider.providerId}
                    </CardTitle>
                    <Badge
                      variant={provider.isAvailable ? "default" : "destructive"}
                    >
                      {provider.isAvailable ? "在线" : "离线"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 性能指标 */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">延迟</span>
                      <div className="font-medium">
                        {provider.latency.toFixed(0)}ms
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">成功率</span>
                      <div className="font-medium">
                        {provider.successRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* 健康状态条 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>健康度</span>
                      <span>{provider.successRate.toFixed(0)}%</span>
                    </div>
                    <Progress value={provider.successRate} className="h-2" />
                  </div>

                  {/* 负载状态 */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>当前负载</span>
                      <span>{provider.currentLoad.toFixed(0)}%</span>
                    </div>
                    <Progress value={provider.currentLoad} className="h-2" />
                  </div>

                  {/* 最近状态 */}
                  <div className="text-xs text-gray-600">
                    最后检查:{" "}
                    {new Date(provider.lastHealthCheck).toLocaleTimeString()}
                  </div>

                  {provider.consecutiveFailures > 0 && (
                    <div className="flex items-center text-xs text-red-600">
                      <XCircle className="h-3 w-3 mr-1" />
                      连续失败 {provider.consecutiveFailures} 次
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 缓存管理面板 */}
        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 缓存统计 */}
            <Card>
              <CardHeader>
                <CardTitle>缓存统计</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">总条目数</span>
                    <div className="text-lg font-medium">
                      {stats.cache.totalEntries}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">总大小</span>
                    <div className="text-lg font-medium">
                      {(stats.cache.totalSize / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">命中率</span>
                    <div className="text-lg font-medium text-green-600">
                      {stats.cache.hitRate.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">失误率</span>
                    <div className="text-lg font-medium text-red-600">
                      {stats.cache.missRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>缓存命中率</span>
                    <span>{stats.cache.hitRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={stats.cache.hitRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* 热门缓存键 */}
            <Card>
              <CardHeader>
                <CardTitle>热门缓存</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.cache.topKeys?.map((item: any, index: number) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 border rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.key}
                        </p>
                        <p className="text-xs text-gray-600">
                          {item.hits} 次命中
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          ${item.cost.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 缓存操作 */}
          <Card>
            <CardHeader>
              <CardTitle>缓存操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => enhancedAIService.clearCache()}
                >
                  清空所有缓存
                </Button>
                <Button
                  variant="outline"
                  onClick={() => enhancedAIService.clearCache(["ai-response"])}
                >
                  清空AI响应缓存
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    enhancedAIService.setCachePolicy("快速响应策略")
                  }
                >
                  快速响应模式
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    enhancedAIService.setCachePolicy("长期缓存策略")
                  }
                >
                  长期缓存模式
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置管理面板 */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 路由策略 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  路由策略
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">当前策略</div>
                  <Badge variant="default">
                    {aiRouter.getCurrentStrategy().name}
                  </Badge>
                  <p className="text-xs text-gray-600">
                    {aiRouter.getCurrentStrategy().description}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">可用策略</div>
                  <div className="grid grid-cols-2 gap-2">
                    {aiRouter.getAvailableStrategies().map((strategy) => (
                      <Button
                        key={strategy.type}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          enhancedAIService.setRouterStrategy(strategy.type)
                        }
                        className="text-left"
                      >
                        {strategy.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 系统状态 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Gauge className="h-5 w-5 mr-2" />
                  系统状态
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>成本管理</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>智能路由</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>缓存系统</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>监控告警</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={async () => {
                    const exported = await enhancedAIService.exportStatistics();
                    const blob = new Blob([JSON.stringify(exported, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `ai-statistics-${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                    toast.success("统计数据已导出");
                  }}
                >
                  导出统计数据
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
