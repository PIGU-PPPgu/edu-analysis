/**
 * 高级分析性能监控组件
 * 实时监控渲染性能、内存使用并提供优化建议
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Zap,
  Cpu,
  HardDrive,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  RefreshCw,
  Settings,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  usePerformanceOptimizer,
  PerformanceMetrics,
} from "@/services/performance/advancedAnalysisOptimizer";

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalysisPerformanceMonitorProps {
  onExportReport?: (report: any) => void;
  compactMode?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface HistoricalMetrics {
  timestamp: number;
  fps: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

const AnalysisPerformanceMonitor: React.FC<AnalysisPerformanceMonitorProps> = ({
  onExportReport,
  compactMode = false,
  autoRefresh = true,
  refreshInterval = 1000,
}) => {
  const optimizer = usePerformanceOptimizer();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    computeTime: 0,
    memoryUsage: 0,
    fps: 60,
    cacheHitRate: 0,
    workerUtilization: 0,
  });
  const [history, setHistory] = useState<HistoricalMetrics[]>([]);
  const [isExpanded, setIsExpanded] = useState(!compactMode);
  const [showDetails, setShowDetails] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const maxHistoryPoints = 60; // 保留60个历史点

  // 更新性能指标
  const updateMetrics = useCallback(() => {
    const currentMetrics = optimizer.getMetrics();
    setMetrics(currentMetrics);

    // 更新历史记录
    setHistory((prev) => {
      const newPoint: HistoricalMetrics = {
        timestamp: Date.now(),
        fps: currentMetrics.fps,
        renderTime: currentMetrics.renderTime,
        memoryUsage: currentMetrics.memoryUsage,
        cacheHitRate: currentMetrics.cacheHitRate * 100,
      };

      const updated = [...prev, newPoint];
      return updated.slice(-maxHistoryPoints);
    });
  }, [optimizer]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      updateMetrics();
      intervalRef.current = setInterval(updateMetrics, refreshInterval);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, updateMetrics]);

  // 获取性能等级
  const getPerformanceGrade = useCallback((): {
    grade: string;
    color: string;
    status: string;
  } => {
    const score =
      (metrics.fps >= 50 ? 25 : metrics.fps / 2) +
      (metrics.renderTime <= 16
        ? 25
        : Math.max(0, 25 - metrics.renderTime / 4)) +
      (metrics.memoryUsage <= 50
        ? 25
        : Math.max(0, 25 - metrics.memoryUsage / 4)) +
      (metrics.cacheHitRate >= 0.7 ? 25 : metrics.cacheHitRate * 35.7);

    if (score >= 90)
      return { grade: "A+", color: "text-green-600", status: "优秀" };
    if (score >= 80)
      return { grade: "A", color: "text-green-500", status: "良好" };
    if (score >= 70)
      return { grade: "B", color: "text-blue-500", status: "正常" };
    if (score >= 60)
      return { grade: "C", color: "text-yellow-500", status: "一般" };
    return { grade: "D", color: "text-red-500", status: "需优化" };
  }, [metrics]);

  // FPS图表配置
  const fpsChartData = {
    labels: history.map((_, index) => index.toString()),
    datasets: [
      {
        label: "FPS",
        data: history.map((h) => h.fps),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const fpsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: {
        display: false,
        min: 0,
        max: 60,
      },
    },
  };

  // 内存使用图表配置
  const memoryChartData = {
    labels: ["已使用", "可用"],
    datasets: [
      {
        data: [metrics.memoryUsage, Math.max(0, 100 - metrics.memoryUsage)],
        backgroundColor: ["rgb(239, 68, 68)", "rgb(229, 231, 235)"],
        borderWidth: 0,
      },
    ],
  };

  const memoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  // 导出性能报告
  const handleExportReport = useCallback(() => {
    const report = optimizer.generatePerformanceReport();
    const exportData = {
      ...report,
      timestamp: new Date().toISOString(),
      history: history,
    };

    if (onExportReport) {
      onExportReport(exportData);
    } else {
      // 默认下载为JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `performance-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [optimizer, history, onExportReport]);

  const performanceGrade = getPerformanceGrade();

  // 紧凑模式
  if (compactMode && !isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <Card
          className="cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
          onClick={() => setIsExpanded(true)}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className={`text-2xl font-bold ${performanceGrade.color}`}>
                {performanceGrade.grade}
              </div>
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">{metrics.fps} FPS</span>
              </div>
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {metrics.memoryUsage.toFixed(1)} MB
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={compactMode ? "fixed bottom-4 right-4 z-50 w-96" : "w-full"}
    >
      <Card className="shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            性能监控
            <Badge
              variant={
                performanceGrade.status === "优秀" ? "default" : "secondary"
              }
            >
              {performanceGrade.status}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {compactMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                收起
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={updateMetrics}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 性能评分 */}
          <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className={`text-5xl font-bold ${performanceGrade.color}`}>
                {performanceGrade.grade}
              </div>
              <p className="text-sm text-gray-600 mt-1">性能评级</p>
            </div>
          </div>

          {/* 核心指标 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">帧率</span>
                <span className="text-sm font-medium">{metrics.fps} FPS</span>
              </div>
              <div className="h-16">
                <Line data={fpsChartData} options={fpsChartOptions} />
              </div>
              <div className="flex items-center gap-1">
                {metrics.fps >= 50 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={`text-xs ${metrics.fps >= 50 ? "text-green-600" : "text-red-600"}`}
                >
                  {metrics.fps >= 50 ? "流畅" : "卡顿"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">内存使用</span>
                <span className="text-sm font-medium">
                  {metrics.memoryUsage.toFixed(1)} MB
                </span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
              <div className="flex items-center gap-1">
                {metrics.memoryUsage < 100 ? (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                )}
                <span
                  className={`text-xs ${metrics.memoryUsage < 100 ? "text-green-600" : "text-yellow-600"}`}
                >
                  {metrics.memoryUsage < 100 ? "正常" : "偏高"}
                </span>
              </div>
            </div>
          </div>

          {/* 详细指标 */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-3 border-t"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">渲染时间</span>
                    <span className="text-sm font-medium">
                      {metrics.renderTime.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">计算时间</span>
                    <span className="text-sm font-medium">
                      {metrics.computeTime.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">缓存命中率</span>
                    <span className="text-sm font-medium">
                      {(metrics.cacheHitRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Worker负载</span>
                    <span className="text-sm font-medium">
                      {(metrics.workerUtilization * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 性能建议 */}
          {performanceGrade.status !== "优秀" && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {metrics.fps < 30 && "帧率较低，建议减少渲染复杂度。"}
                {metrics.memoryUsage > 100 && "内存使用较高，建议清理缓存。"}
                {metrics.renderTime > 50 && "渲染时间过长，建议使用虚拟化。"}
              </AlertDescription>
            </Alert>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-1" />
              导出报告
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => optimizer.dispose()}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AnalysisPerformanceMonitor;
