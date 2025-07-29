/**
 * 🚀 第6周增强性能仪表板
 * 实时监控应用性能，提供性能建议和优化方案
 */

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription } from "../ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  usePerformanceDashboard,
  BundleAnalyzer,
  PerformanceAlert,
  globalPerformanceOptimizer,
  PERFORMANCE_CONFIG,
} from "../../utils/performanceOptimizer";
import { useRenderPerformance } from "../../utils/performanceOptimizer";

interface PerformanceRecommendation {
  type: "critical" | "warning" | "info";
  category: "component" | "network" | "memory" | "bundle";
  message: string;
  solution: string;
}

export const EnhancedPerformanceDashboard: React.FC = () => {
  useRenderPerformance("EnhancedPerformanceDashboard");

  const {
    metrics,
    stats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
  } = usePerformanceDashboard();

  const [alerts, setAlerts] = useState(PerformanceAlert.getAlerts());
  const [bundleAnalysis, setBundleAnalysis] = useState(
    BundleAnalyzer.getAnalysis()
  );
  const [recommendations, setRecommendations] = useState<
    PerformanceRecommendation[]
  >([]);

  // 实时更新告警
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(PerformanceAlert.getAlerts());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 生成性能建议
  useEffect(() => {
    if (!stats) return;

    const newRecommendations: PerformanceRecommendation[] = [];

    // 基于统计数据生成建议
    if (stats.slowRenders > 5) {
      newRecommendations.push({
        type: "critical",
        category: "component",
        message: `发现${stats.slowRenders}个慢组件`,
        solution: "使用React.memo()、useMemo()和useCallback()优化组件渲染",
      });
    }

    if (stats.currentMemory > 100) {
      newRecommendations.push({
        type: "warning",
        category: "memory",
        message: `内存使用过高: ${stats.currentMemory.toFixed(2)}MB`,
        solution: "清理未使用的变量，实现虚拟化列表，使用懒加载",
      });
    }

    if (stats.avgRenderTime > PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD_MS) {
      newRecommendations.push({
        type: "warning",
        category: "component",
        message: `平均渲染时间过长: ${stats.avgRenderTime.toFixed(2)}ms`,
        solution: "优化组件结构，减少不必要的渲染，使用代码分割",
      });
    }

    // Bundle 分析建议
    if (bundleAnalysis.totalSize > 2) {
      newRecommendations.push({
        type: "warning",
        category: "bundle",
        message: `Bundle过大: ${bundleAnalysis.totalSize.toFixed(2)}MB`,
        solution: "实现代码分割，移除未使用的依赖，启用tree-shaking",
      });
    }

    setRecommendations(newRecommendations);
  }, [stats, bundleAnalysis]);

  // 准备图表数据
  const chartData = useMemo(() => {
    return metrics.slice(-20).map((metric, index) => ({
      name: `${index + 1}`,
      renderTime: metric.renderTime,
      memoryMB: metric.memoryUsage / 1024 / 1024,
      component: metric.componentName,
    }));
  }, [metrics]);

  // 组件渲染时间分布
  const componentStats = useMemo(() => {
    const componentMap = new Map<
      string,
      { total: number; count: number; max: number }
    >();

    metrics.forEach((metric) => {
      const current = componentMap.get(metric.componentName) || {
        total: 0,
        count: 0,
        max: 0,
      };
      current.total += metric.renderTime;
      current.count += 1;
      current.max = Math.max(current.max, metric.renderTime);
      componentMap.set(metric.componentName, current);
    });

    return Array.from(componentMap.entries())
      .map(([name, data]) => ({
        name,
        avgTime: data.total / data.count,
        maxTime: data.max,
        count: data.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10);
  }, [metrics]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🚀 性能监控仪表板</h1>
        <div className="space-x-2">
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
          >
            {isMonitoring ? "停止监控" : "开始监控"}
          </Button>
          <Button onClick={clearMetrics} variant="outline">
            清空数据
          </Button>
        </div>
      </div>

      {/* 关键性能指标 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">监控组件数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComponents}</div>
              <Badge
                variant={stats.slowRenders > 0 ? "destructive" : "default"}
              >
                {stats.slowRenders} 慢组件
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">平均渲染时间</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgRenderTime.toFixed(2)}ms
              </div>
              <Progress
                value={Math.min(
                  (stats.avgRenderTime /
                    PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD_MS) *
                    100,
                  100
                )}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">内存使用</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.currentMemory.toFixed(2)}MB
              </div>
              <div className="text-sm text-muted-foreground">
                峰值: {stats.peakMemory.toFixed(2)}MB
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bundle大小</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bundleAnalysis.totalSize.toFixed(2)}MB
              </div>
              <Badge
                variant={
                  bundleAnalysis.totalSize > 2 ? "destructive" : "default"
                }
              >
                {bundleAnalysis.chunks.length} chunks
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 性能警告 */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚠️ 性能警告
              <Badge variant="destructive">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {alerts.slice(-5).map((alert, index) => (
                <Alert key={index}>
                  <AlertDescription>
                    <span className="font-medium">[{alert.type}]</span>{" "}
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 详细分析标签页 */}
      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="charts">性能图表</TabsTrigger>
          <TabsTrigger value="components">组件分析</TabsTrigger>
          <TabsTrigger value="bundle">Bundle分析</TabsTrigger>
          <TabsTrigger value="recommendations">优化建议</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4">
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>渲染时间趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="renderTime"
                        stroke="#8884d8"
                        name="渲染时间(ms)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>内存使用趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="memoryMB"
                        stroke="#82ca9d"
                        name="内存(MB)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="components">
          <Card>
            <CardHeader>
              <CardTitle>组件性能排行</CardTitle>
            </CardHeader>
            <CardContent>
              {componentStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={componentStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgTime" fill="#8884d8" name="平均时间(ms)" />
                    <Bar dataKey="maxTime" fill="#ff7c7c" name="最大时间(ms)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  暂无组件性能数据
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundle">
          <Card>
            <CardHeader>
              <CardTitle>Bundle 分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-lg font-semibold">
                  总大小: {bundleAnalysis.totalSize.toFixed(2)} MB
                </div>

                {bundleAnalysis.chunks.length > 0 ? (
                  <div className="space-y-2">
                    {bundleAnalysis.chunks.map((chunk, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-2 bg-secondary rounded"
                      >
                        <span className="font-medium">{chunk.name}</span>
                        <div className="flex items-center gap-2">
                          <span>{chunk.size.toFixed(2)} KB</span>
                          <Badge
                            variant={
                              chunk.size > 500 ? "destructive" : "default"
                            }
                          >
                            {chunk.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Bundle分析数据将在构建后显示
                  </div>
                )}

                {bundleAnalysis.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">优化建议:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {bundleAnalysis.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="space-y-4">
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <Alert key={index}>
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            rec.type === "critical"
                              ? "destructive"
                              : rec.type === "warning"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {rec.type}
                        </Badge>
                        <Badge variant="outline">{rec.category}</Badge>
                      </div>
                      <div className="font-medium">{rec.message}</div>
                      <div className="text-sm text-muted-foreground">
                        💡 建议: {rec.solution}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-green-600 text-lg">
                    ✅ 性能表现良好！
                  </div>
                  <div className="text-muted-foreground mt-2">
                    当前没有发现需要优化的问题
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
