import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Clock,
  Database,
  Zap,
  MemoryStick,
  HardDrive,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: "good" | "warning" | "poor";
  description: string;
  trend?: "up" | "down" | "stable";
}

interface PerformanceData {
  loadTime: number;
  memoryUsage: number;
  databaseQueries: number;
  networkLatency: number;
  cacheHitRate: number;
  errorRate: number;
  timestamp: Date;
}

interface PerformanceMonitorProps {
  onOptimize?: () => void;
  className?: string;
  showAdvanced?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  onOptimize,
  className,
  showAdvanced = false,
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  // 性能基准值
  const benchmarks = {
    loadTime: { good: 2000, warning: 4000 }, // ms
    memoryUsage: { good: 50, warning: 80 }, // MB
    databaseQueries: { good: 10, warning: 25 }, // 每秒
    networkLatency: { good: 100, warning: 300 }, // ms
    cacheHitRate: { good: 80, warning: 60 }, // %
    errorRate: { good: 1, warning: 5 }, // %
  };

  // 获取性能状态
  const getStatus = (
    value: number,
    metric: keyof typeof benchmarks
  ): "good" | "warning" | "poor" => {
    const benchmark = benchmarks[metric];
    if (metric === "cacheHitRate") {
      // 缓存命中率越高越好
      if (value >= benchmark.good) return "good";
      if (value >= benchmark.warning) return "warning";
      return "poor";
    } else {
      // 其他指标越低越好
      if (value <= benchmark.good) return "good";
      if (value <= benchmark.warning) return "warning";
      return "poor";
    }
  };

  // 模拟性能数据收集
  const collectPerformanceData = async (): Promise<PerformanceData> => {
    // 模拟真实的性能指标采集
    const loadTime = performance.now() + Math.random() * 3000;
    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024
      : 30 + Math.random() * 50;

    return {
      loadTime,
      memoryUsage,
      databaseQueries: 5 + Math.random() * 20,
      networkLatency: 50 + Math.random() * 400,
      cacheHitRate: 60 + Math.random() * 35,
      errorRate: Math.random() * 8,
      timestamp: new Date(),
    };
  };

  // 更新性能指标
  const updateMetrics = (data: PerformanceData) => {
    const metrics: PerformanceMetric[] = [
      {
        name: "页面加载时间",
        value: data.loadTime,
        unit: "ms",
        status: getStatus(data.loadTime, "loadTime"),
        description: "页面完全加载所需时间",
      },
      {
        name: "内存使用量",
        value: data.memoryUsage,
        unit: "MB",
        status: getStatus(data.memoryUsage, "memoryUsage"),
        description: "JavaScript堆内存使用量",
      },
      {
        name: "数据库查询",
        value: data.databaseQueries,
        unit: "/s",
        status: getStatus(data.databaseQueries, "databaseQueries"),
        description: "每秒数据库查询次数",
      },
      {
        name: "网络延迟",
        value: data.networkLatency,
        unit: "ms",
        status: getStatus(data.networkLatency, "networkLatency"),
        description: "网络请求平均延迟",
      },
      {
        name: "缓存命中率",
        value: data.cacheHitRate,
        unit: "%",
        status: getStatus(data.cacheHitRate, "cacheHitRate"),
        description: "数据缓存命中比例",
      },
      {
        name: "错误率",
        value: data.errorRate,
        unit: "%",
        status: getStatus(data.errorRate, "errorRate"),
        description: "系统错误发生比例",
      },
    ];

    setCurrentMetrics(metrics);

    // 计算总体评分
    const score = metrics.reduce((total, metric) => {
      const weight = 1 / metrics.length;
      let metricScore = 100;

      if (metric.status === "warning") metricScore = 70;
      else if (metric.status === "poor") metricScore = 30;

      return total + metricScore * weight;
    }, 0);

    setOverallScore(Math.round(score));
  };

  // 开始监控
  const startMonitoring = () => {
    setIsMonitoring(true);

    // 立即收集一次数据
    collectPerformanceData().then((data) => {
      setPerformanceData((prev) => [...prev, data].slice(-20)); // 保留最近20个数据点
      updateMetrics(data);
    });

    // 定期收集数据
    intervalRef.current = setInterval(async () => {
      const data = await collectPerformanceData();
      setPerformanceData((prev) => [...prev, data].slice(-20));
      updateMetrics(data);
    }, 5000); // 每5秒收集一次
  };

  // 停止监控
  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  // 性能优化建议
  const getOptimizationSuggestions = (): string[] => {
    const suggestions: string[] = [];

    currentMetrics.forEach((metric) => {
      if (metric.status === "poor" || metric.status === "warning") {
        switch (metric.name) {
          case "页面加载时间":
            suggestions.push("启用代码分割和懒加载");
            suggestions.push("优化图片和静态资源压缩");
            break;
          case "内存使用量":
            suggestions.push("检查内存泄漏，优化组件卸载");
            suggestions.push("使用React.memo减少不必要的重渲染");
            break;
          case "数据库查询":
            suggestions.push("优化SQL查询，添加适当索引");
            suggestions.push("实现查询结果缓存");
            break;
          case "网络延迟":
            suggestions.push("使用CDN加速静态资源");
            suggestions.push("实现接口响应缓存");
            break;
          case "缓存命中率":
            suggestions.push("优化缓存策略和失效时间");
            suggestions.push("增加常用数据的预缓存");
            break;
          case "错误率":
            suggestions.push("完善错误处理和重试机制");
            suggestions.push("增加系统健康检查");
            break;
        }
      }
    });

    return [...new Set(suggestions)]; // 去重
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "poor":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取指标图标
  const getMetricIcon = (name: string) => {
    switch (name) {
      case "页面加载时间":
        return <Clock className="h-4 w-4" />;
      case "内存使用量":
        return <MemoryStick className="h-4 w-4" />;
      case "数据库查询":
        return <Database className="h-4 w-4" />;
      case "网络延迟":
        return <Wifi className="h-4 w-4" />;
      case "缓存命中率":
        return <HardDrive className="h-4 w-4" />;
      case "错误率":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const suggestions = getOptimizationSuggestions();

  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-white to-gray-50 shadow-lg border-0",
        className
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-600" />
            性能监控
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                overallScore >= 80
                  ? "default"
                  : overallScore >= 60
                    ? "secondary"
                    : "destructive"
              }
            >
              评分: {overallScore}/100
            </Badge>
            <Button
              variant={isMonitoring ? "destructive" : "default"}
              size="sm"
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
            >
              {isMonitoring ? "停止监控" : "开始监控"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 总体性能评分 */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-bold">
            <span
              className={cn(
                overallScore >= 80
                  ? "text-green-600"
                  : overallScore >= 60
                    ? "text-yellow-600"
                    : "text-red-600"
              )}
            >
              {overallScore}
            </span>
            <span className="text-lg text-gray-500">/100</span>
          </div>
          <Progress
            value={overallScore}
            className={cn(
              "h-3",
              overallScore >= 80
                ? "[&>div]:bg-green-500"
                : overallScore >= 60
                  ? "[&>div]:bg-yellow-500"
                  : "[&>div]:bg-red-500"
            )}
          />
          <p className="text-sm text-gray-600">
            {overallScore >= 80
              ? "性能优秀"
              : overallScore >= 60
                ? "性能良好，有优化空间"
                : "需要优化性能"}
          </p>
        </div>

        {/* 性能指标 */}
        {currentMetrics.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentMetrics.map((metric, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border-2 transition-colors",
                  metric.status === "good"
                    ? "border-green-200 bg-green-50"
                    : metric.status === "warning"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-red-200 bg-red-50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getMetricIcon(metric.name)}
                    <span className="text-sm font-medium">{metric.name}</span>
                  </div>
                  {getStatusIcon(metric.status)}
                </div>

                <div className="text-2xl font-bold mb-1">
                  {metric.value.toFixed(
                    metric.name === "页面加载时间" || metric.name === "网络延迟"
                      ? 0
                      : 1
                  )}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {metric.unit}
                  </span>
                </div>

                <p className="text-xs text-gray-600">{metric.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* 优化建议 */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-700">优化建议</span>
            </div>
            <div className="grid gap-2">
              {suggestions
                .slice(0, showAdvanced ? suggestions.length : 3)
                .map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-700">{suggestion}</span>
                  </div>
                ))}
            </div>

            {suggestions.length > 3 && !showAdvanced && (
              <p className="text-xs text-gray-500 text-center">
                还有 {suggestions.length - 3} 条建议...
              </p>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          {onOptimize && (
            <Button onClick={onOptimize} className="flex-1">
              <Zap className="w-4 h-4 mr-2" />
              应用优化
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setPerformanceData([]);
              setCurrentMetrics([]);
              setOverallScore(0);
            }}
          >
            清除数据
          </Button>
        </div>

        {/* 实时状态 */}
        {isMonitoring && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>正在实时监控性能...</span>
          </div>
        )}

        {/* 数据历史图表区域预留 */}
        {showAdvanced && performanceData.length > 1 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              性能趋势
            </h4>
            <p className="text-sm text-gray-600">
              已收集 {performanceData.length} 个数据点
            </p>
            {/* 这里可以集成图表库显示历史趋势 */}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;
