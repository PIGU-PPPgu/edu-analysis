/**
 * 🚀 性能监控仪表板
 * 实时监控组件渲染性能、内存使用、错误追踪
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  Activity,
  BarChart3,
  Clock,
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Eye,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  usePerformanceDashboard,
  PERFORMANCE_CONFIG,
} from "@/utils/performanceOptimizer";

// 性能等级配色
const PERFORMANCE_COLORS = {
  excellent: "#B9FF66", // 绿色 - 优秀
  good: "#6B7280", // 灰色 - 良好
  warning: "#F59E0B", // 橙色 - 警告
  critical: "#EF4444", // 红色 - 严重
  background: "#FFFFFF", // 白色背景
  border: "#191A23", // 黑色边框
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  status?: "excellent" | "good" | "warning" | "critical";
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  status = "good",
  className,
}) => {
  const statusColors = {
    excellent: "shadow-[6px_6px_0px_0px_#B9FF66] border-[#B9FF66]",
    good: "shadow-[6px_6px_0px_0px_#6B7280] border-[#6B7280]",
    warning: "shadow-[6px_6px_0px_0px_#F59E0B] border-[#F59E0B]",
    critical: "shadow-[6px_6px_0px_0px_#EF4444] border-[#EF4444]",
  };

  const iconBgColors = {
    excellent: "bg-[#B9FF66] text-black",
    good: "bg-[#6B7280] text-white",
    warning: "bg-[#F59E0B] text-white",
    critical: "bg-[#EF4444] text-white",
  };

  return (
    <Card
      className={cn(
        "bg-white border-2 border-black transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]",
        statusColors[status],
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
                  iconBgColors[status]
                )}
              >
                <Icon className="w-5 h-5" />
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
                    trend === "up" &&
                      status === "critical" &&
                      "bg-[#EF4444] text-white",
                    trend === "up" &&
                      status === "warning" &&
                      "bg-[#F59E0B] text-white",
                    trend === "up" &&
                      status !== "critical" &&
                      status !== "warning" &&
                      "bg-[#B9FF66] text-black",
                    trend === "down" && "bg-[#6B7280] text-white",
                    trend === "neutral" && "bg-white text-black"
                  )}
                >
                  {trend === "up" && <TrendingUp className="w-4 h-4" />}
                  {trend === "down" && <TrendingDown className="w-4 h-4" />}
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

const PerformanceDashboard: React.FC = () => {
  const {
    metrics,
    stats,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
  } = usePerformanceDashboard();

  const [realTimeData, setRealTimeData] = useState<
    Array<{
      time: string;
      renderTime: number;
      memory: number;
    }>
  >([]);

  // 实时数据更新
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const latest = metrics[metrics.length - 1];
      if (latest) {
        setRealTimeData((prev) => {
          const newData = [
            ...prev,
            {
              time: new Date(latest.timestamp).toLocaleTimeString(),
              renderTime: latest.renderTime,
              memory: latest.memoryUsage / 1024 / 1024, // 转为MB
            },
          ];
          return newData.slice(-20); // 只保留最近20个数据点
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, metrics]);

  // 计算性能状态
  const getPerformanceStatus = (
    value: number,
    thresholds: { good: number; warning: number }
  ) => {
    if (value <= thresholds.good) return "excellent";
    if (value <= thresholds.warning) return "good";
    if (value <= thresholds.warning * 2) return "warning";
    return "critical";
  };

  // 组件性能分析
  const componentStats = React.useMemo(() => {
    if (!metrics.length) return [];

    const componentGroups = metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.componentName]) {
          acc[metric.componentName] = [];
        }
        acc[metric.componentName].push(metric);
        return acc;
      },
      {} as Record<string, typeof metrics>
    );

    return Object.entries(componentGroups)
      .map(([name, componentMetrics]) => ({
        name,
        avgRenderTime:
          componentMetrics.reduce((sum, m) => sum + m.renderTime, 0) /
          componentMetrics.length,
        totalRenders: componentMetrics.length,
        slowRenders: componentMetrics.filter(
          (m) => m.renderTime > PERFORMANCE_CONFIG.SLOW_RENDER_THRESHOLD_MS
        ).length,
        maxRenderTime: Math.max(...componentMetrics.map((m) => m.renderTime)),
      }))
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime);
  }, [metrics]);

  const exportData = () => {
    const data = {
      stats,
      metrics,
      componentStats,
      realTimeData,
      exportTime: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 p-6">
      {/* 页面标题和控制 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-[#191A23] leading-tight">
            性能监控
            <span className="inline-block ml-3 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
              DASHBOARD
            </span>
          </h1>
          <p className="text-lg text-[#6B7280] font-medium max-w-2xl">
            实时监控系统性能，优化用户体验
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={cn(
              "flex items-center gap-2 border-2 border-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all",
              isMonitoring
                ? "bg-[#EF4444] hover:bg-[#EF4444] text-white"
                : "bg-[#B9FF66] hover:bg-[#B9FF66] text-black"
            )}
          >
            {isMonitoring ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isMonitoring ? "停止监控" : "开始监控"}
          </Button>

          <Button
            onClick={clearMetrics}
            variant="outline"
            className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            清空数据
          </Button>

          <Button
            onClick={exportData}
            variant="outline"
            className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
          >
            <Download className="w-4 h-4" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 监控状态提示 */}
      {!isMonitoring && (
        <Alert className="border-2 border-[#F59E0B] bg-[#F59E0B]/10">
          <Eye className="h-4 w-4" />
          <AlertDescription className="font-medium">
            性能监控已停止。点击"开始监控"来实时追踪系统性能指标。
          </AlertDescription>
        </Alert>
      )}

      {/* 核心指标卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="平均渲染时间"
            value={`${stats.avgRenderTime.toFixed(2)}ms`}
            subtitle={`最大: ${stats.maxRenderTime.toFixed(2)}ms`}
            icon={Clock}
            status={getPerformanceStatus(stats.avgRenderTime, {
              good: 16,
              warning: 50,
            })}
            trend={
              stats.avgRenderTime > 50
                ? "up"
                : stats.avgRenderTime < 16
                  ? "down"
                  : "neutral"
            }
            trendValue={stats.avgRenderTime > 16 ? "需要优化" : "表现良好"}
          />

          <StatCard
            title="内存使用"
            value={`${stats.currentMemory.toFixed(1)}MB`}
            subtitle={`峰值: ${stats.peakMemory.toFixed(1)}MB`}
            icon={MemoryStick}
            status={getPerformanceStatus(stats.currentMemory, {
              good: 50,
              warning: 100,
            })}
            trend={stats.currentMemory > 100 ? "up" : "neutral"}
            trendValue={stats.currentMemory > 100 ? "内存偏高" : "正常"}
          />

          <StatCard
            title="慢渲染次数"
            value={stats.slowRenders}
            subtitle={`总组件: ${stats.totalComponents}`}
            icon={AlertTriangle}
            status={
              stats.slowRenders === 0
                ? "excellent"
                : stats.slowRenders < 5
                  ? "good"
                  : "warning"
            }
            trend={stats.slowRenders > 0 ? "up" : "down"}
            trendValue={stats.slowRenders > 0 ? "需要关注" : "表现优秀"}
          />

          <StatCard
            title="性能评分"
            value={(() => {
              const score = Math.max(
                0,
                100 - stats.avgRenderTime * 2 - stats.slowRenders * 10
              );
              return `${Math.round(score)}分`;
            })()}
            subtitle="综合性能评估"
            icon={Zap}
            status={(() => {
              const score =
                100 - stats.avgRenderTime * 2 - stats.slowRenders * 10;
              return getPerformanceStatus(100 - score, {
                good: 10,
                warning: 30,
              });
            })()}
          />
        </div>
      )}

      {/* 实时性能图表 */}
      {realTimeData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 渲染时间趋势 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
            <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
              <CardTitle className="text-black font-black flex items-center gap-2">
                <Activity className="w-5 h-5" />
                实时渲染性能
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={realTimeData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12, fontWeight: "bold" }}
                    tickLine={{ stroke: "#191A23" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fontWeight: "bold" }}
                    tickLine={{ stroke: "#191A23" }}
                  />
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
                    dataKey="renderTime"
                    stroke="#B9FF66"
                    strokeWidth={3}
                    dot={{ fill: "#B9FF66", strokeWidth: 2, stroke: "#191A23" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 内存使用趋势 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
            <CardHeader className="bg-[#6B7280] border-b-2 border-black">
              <CardTitle className="text-white font-black flex items-center gap-2">
                <MemoryStick className="w-5 h-5" />
                内存使用趋势
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={realTimeData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12, fontWeight: "bold" }}
                    tickLine={{ stroke: "#191A23" }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fontWeight: "bold" }}
                    tickLine={{ stroke: "#191A23" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "2px solid black",
                      borderRadius: "8px",
                      boxShadow: "4px 4px 0px 0px #6B7280",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#6B7280"
                    strokeWidth={3}
                    dot={{ fill: "#6B7280", strokeWidth: 2, stroke: "#191A23" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 组件性能排行 */}
      {componentStats.length > 0 && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#191A23]">
          <CardHeader className="bg-[#191A23] border-b-2 border-black">
            <CardTitle className="text-white font-black flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              组件性能排行
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {componentStats.slice(0, 10).map((component, index) => (
                <div
                  key={component.name}
                  className="flex items-center justify-between p-4 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#B9FF66]"
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      className={cn(
                        "font-bold text-lg px-3 py-1 border-2 border-black",
                        index < 3
                          ? "bg-[#EF4444] text-white"
                          : "bg-[#B9FF66] text-black"
                      )}
                    >
                      #{index + 1}
                    </Badge>
                    <div>
                      <h4 className="font-bold text-black">{component.name}</h4>
                      <p className="text-sm text-[#6B7280]">
                        {component.totalRenders} 次渲染，{component.slowRenders}{" "}
                        次慢渲染
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-black">
                      {component.avgRenderTime.toFixed(2)}ms
                    </p>
                    <p className="text-sm text-[#6B7280]">
                      最大: {component.maxRenderTime.toFixed(2)}ms
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 无数据状态 */}
      {!stats && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-12 text-center">
            <Activity className="w-16 h-16 text-[#6B7280] mx-auto mb-4" />
            <h3 className="text-2xl font-black text-black mb-2">
              暂无性能数据
            </h3>
            <p className="text-[#6B7280] font-medium mb-6">
              开始监控以收集系统性能指标
            </p>
            <Button
              onClick={startMonitoring}
              className="bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
            >
              <Play className="w-4 h-4 mr-2" />
              开始性能监控
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceDashboard;
