/**
 * 预警趋势分析图表 - 性能优化版
 * Phase 1.3: 使用 React.memo 和 useMemo 优化渲染性能
 *
 * 优化措施：
 * 1. React.memo 包装子组件和主组件，避免不必要的重渲染
 * 2. useMemo 缓存计算密集型数据处理和图表渲染
 * 3. useCallback 缓存事件处理函数
 * 4. 工具函数和配置移到组件外部
 * 5. 自定义比较函数实现精确的 props 比较
 */

import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Brush,
  ComposedChart,
  Bar,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  BarChart3,
  Activity,
  AlertTriangle,
  Info,
} from "lucide-react";

interface TrendDataPoint {
  date: string;
  totalWarnings: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  gradeRelated: number;
  behaviorRelated: number;
  attendanceRelated: number;
  progressRate: number;
  predictionAccuracy?: number;
}

interface WarningTrendChartProps {
  data?: TrendDataPoint[];
  className?: string;
  showPrediction?: boolean;
  showComparison?: boolean;
  enableRealTime?: boolean;
  refreshInterval?: number;
  onDataRefresh?: () => void;
}

// 时间范围选项
const timeRangeOptions = [
  { value: "7d", label: "最近7天" },
  { value: "30d", label: "最近30天" },
  { value: "90d", label: "最近90天" },
  { value: "6m", label: "最近6个月" },
  { value: "1y", label: "最近1年" },
];

// 图表类型选项
const chartTypeOptions = [
  { value: "line", label: "趋势线图", icon: Activity },
  { value: "area", label: "面积图", icon: BarChart3 },
  { value: "composed", label: "混合图表", icon: TrendingUp },
];

// 清理和验证趋势数据
const sanitizeTrendData = (data: TrendDataPoint[]): TrendDataPoint[] => {
  if (!data || !Array.isArray(data)) return [];

  return data
    .filter((point) => point && typeof point === "object")
    .map((point) => {
      const safeNumber = (value: any): number => {
        if (value === null || value === undefined) return 0;
        const num = Number(value);
        return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num);
      };

      return {
        date: point.date || new Date().toISOString().split("T")[0],
        totalWarnings: safeNumber(point.totalWarnings),
        highSeverity: safeNumber(point.highSeverity),
        mediumSeverity: safeNumber(point.mediumSeverity),
        lowSeverity: safeNumber(point.lowSeverity),
        gradeRelated: safeNumber(point.gradeRelated),
        behaviorRelated: safeNumber(point.behaviorRelated),
        attendanceRelated: safeNumber(point.attendanceRelated),
        progressRate: safeNumber(point.progressRate),
        predictionAccuracy: safeNumber(point.predictionAccuracy),
      };
    });
};

const generateMockTrendData = (): TrendDataPoint[] => {
  const data: TrendDataPoint[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // 基于实际数据模式生成合理的历史趋势，避免使用随机数
    const baseWarnings = 1; // 基于真实活跃预警数量
    const trend = Math.sin(i / 7) * 0.5; // 更平缓的趋势变化
    const totalWarnings = Math.max(0, Math.round(baseWarnings + trend));

    data.push({
      date: date.toISOString().split("T")[0],
      totalWarnings,
      // 基于固定比例分配，保持数据一致性
      highSeverity: Math.round(totalWarnings * 0.2),
      mediumSeverity: Math.round(totalWarnings * 0.5),
      lowSeverity: Math.round(totalWarnings * 0.3),
      gradeRelated: Math.round(totalWarnings * 0.6), // 根据真实数据，学业预警占主要比例
      behaviorRelated: Math.round(totalWarnings * 0.2),
      attendanceRelated: Math.round(totalWarnings * 0.2),
      progressRate: 85.5, // 固定的合理进度率
      predictionAccuracy: 88.2, // 固定的预测准确率
    });
  }

  return data;
};

// 🚀 优化: 数据系列配置移到组件外部
const DATA_SERIES_CONFIG = [
  {
    key: "totalWarnings",
    name: "总预警数",
    color: "#3b82f6",
    visible: true,
    type: "line",
  },
  {
    key: "highSeverity",
    name: "高危预警",
    color: "#ef4444",
    visible: true,
    type: "line",
  },
  {
    key: "mediumSeverity",
    name: "中危预警",
    color: "#f59e0b",
    visible: true,
    type: "line",
  },
  {
    key: "lowSeverity",
    name: "低危预警",
    color: "#10b981",
    visible: false,
    type: "line",
  },
  {
    key: "gradeRelated",
    name: "成绩相关",
    color: "#8b5cf6",
    visible: false,
    type: "bar",
  },
  {
    key: "behaviorRelated",
    name: "行为相关",
    color: "#06b6d4",
    visible: false,
    type: "bar",
  },
  {
    key: "progressRate",
    name: "改善率",
    color: "#84cc16",
    visible: false,
    type: "line",
  },
];

// 🚀 优化: 使用 memo 包装 CustomTooltip 组件
const CustomTooltip = memo<any>(({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg text-sm max-w-xs">
        <p className="font-medium text-gray-800 mb-2">{`日期: ${label}`}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-700">{entry.name}:</span>
              </div>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = "CustomTooltip";

// 🚀 优化: 使用 memo 包装 TrendIndicator 组件
const TrendIndicator = memo<{
  current: number;
  previous: number;
  label: string;
  format?: "number" | "percentage";
}>(({ current, previous, label, format = "number" }) => {
  const change = current - previous;
  const percentChange = previous !== 0 ? (change / previous) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  const formatValue = (value: number) => {
    if (format === "percentage") return `${value.toFixed(1)}%`;
    return value.toString();
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-lg font-semibold">{formatValue(current)}</p>
      </div>
      <div className="flex items-center gap-1">
        {!isNeutral && (
          <>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span
              className={`text-sm font-medium ${
                isPositive ? "text-red-600" : "text-green-600"
              }`}
            >
              {Math.abs(percentChange).toFixed(1)}%
            </span>
          </>
        )}
      </div>
    </div>
  );
});
TrendIndicator.displayName = "TrendIndicator";

// 🚀 优化: 使用 memo 包装主组件
const WarningTrendChart = memo<WarningTrendChartProps>(
  ({
    data,
    className,
    showPrediction = false,
    showComparison = true,
    enableRealTime = false,
    refreshInterval = 30000,
    onDataRefresh,
  }) => {
    // 状态管理
    const [chartData, setChartData] = useState<TrendDataPoint[]>(
      sanitizeTrendData(data || generateMockTrendData())
    );
    const [timeRange, setTimeRange] = useState("90d"); // 改为90天以显示现有数据
    const [chartType, setChartType] = useState<"line" | "area" | "composed">(
      "line"
    );
    const [showGrid, setShowGrid] = useState(true);
    const [showLegend, setShowLegend] = useState(true);
    const [seriesVisibility, setSeriesVisibility] = useState<
      Record<string, boolean>
    >(Object.fromEntries(DATA_SERIES_CONFIG.map((s) => [s.key, s.visible])));
    const [brushRange, setBrushRange] = useState<[number, number]>([0, 100]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 🚀 优化: 过滤数据使用 useMemo 缓存
    const filteredData = useMemo(() => {
      if (!chartData || chartData.length === 0) return [];

      // 验证 brushRange 值，避免 NaN
      const validBrushRange = [
        isNaN(brushRange[0]) ? 0 : Math.max(0, Math.min(100, brushRange[0])),
        isNaN(brushRange[1]) ? 100 : Math.max(0, Math.min(100, brushRange[1])),
      ];

      // 确保范围计算的安全性
      const safeStartPercentage = Math.max(
        0,
        Math.min(100, validBrushRange[0])
      );
      const safeEndPercentage = Math.max(0, Math.min(100, validBrushRange[1]));

      const startIndex = Math.max(
        0,
        Math.min(
          chartData.length - 1,
          Math.floor((chartData.length * safeStartPercentage) / 100)
        )
      );
      const endIndex = Math.max(
        startIndex,
        Math.min(
          chartData.length,
          Math.ceil((chartData.length * safeEndPercentage) / 100)
        )
      );

      const slicedData = chartData.slice(startIndex, endIndex);

      // 确保至少有一个数据点
      if (slicedData.length === 0 && chartData.length > 0) {
        return sanitizeTrendData([chartData[0]]);
      }

      return sanitizeTrendData(slicedData);
    }, [chartData, brushRange]);

    // 🚀 优化: 计算趋势指标使用 useMemo 缓存
    const trendMetrics = useMemo(() => {
      if (!filteredData || filteredData.length < 2) return null;

      const recent = filteredData[filteredData.length - 1];
      const previous = filteredData[filteredData.length - 2];

      if (!recent || !previous) return null;

      return {
        totalWarnings: {
          current: isNaN(recent.totalWarnings) ? 0 : recent.totalWarnings || 0,
          previous: isNaN(previous.totalWarnings)
            ? 0
            : previous.totalWarnings || 0,
        },
        highSeverity: {
          current: isNaN(recent.highSeverity) ? 0 : recent.highSeverity || 0,
          previous: isNaN(previous.highSeverity)
            ? 0
            : previous.highSeverity || 0,
        },
        progressRate: {
          current: isNaN(recent.progressRate) ? 0 : recent.progressRate || 0,
          previous: isNaN(previous.progressRate)
            ? 0
            : previous.progressRate || 0,
        },
      };
    }, [filteredData]);

    // 🚀 优化: 切换系列可见性使用 useCallback 缓存
    const toggleSeriesVisibility = useCallback((key: string) => {
      setSeriesVisibility((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }, []);

    // 🚀 优化: 刷新数据使用 useCallback 缓存
    const handleRefresh = useCallback(async () => {
      setIsRefreshing(true);
      try {
        // 模拟API调用
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (onDataRefresh) {
          onDataRefresh();
        } else {
          // 生成新的模拟数据
          setChartData(sanitizeTrendData(generateMockTrendData()));
        }
      } finally {
        setIsRefreshing(false);
      }
    }, [onDataRefresh]);

    // 处理外部数据变化
    useEffect(() => {
      if (data) {
        setChartData(sanitizeTrendData(data));
      }
    }, [data]);

    // 🚀 优化: 导出数据使用 useCallback 缓存
    const handleExport = useCallback(() => {
      const csvContent = [
        ["日期", "总预警数", "高危预警", "中危预警", "低危预警", "改善率"].join(
          ","
        ),
        ...filteredData.map((item) =>
          [
            item.date,
            item.totalWarnings,
            item.highSeverity,
            item.mediumSeverity,
            item.lowSeverity,
            item.progressRate,
          ].join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `预警趋势数据_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, [filteredData]);

    // 🚀 优化: 渲染图表内容使用 useMemo 缓存
    const renderChart = useMemo(() => {
      const seriesConfig = DATA_SERIES_CONFIG.filter(
        (s) => seriesVisibility[s.key]
      );

      switch (chartType) {
        case "area":
          return (
            <AreaChart data={filteredData}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {seriesConfig.map((series) => (
                <Area
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stackId="1"
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.6}
                  name={series.name}
                />
              ))}
            </AreaChart>
          );

        case "composed":
          return (
            <ComposedChart data={filteredData}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {seriesConfig.map((series) =>
                series.type === "line" ? (
                  <Line
                    key={series.key}
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name={series.name}
                  />
                ) : (
                  <Bar
                    key={series.key}
                    dataKey={series.key}
                    fill={series.color}
                    name={series.name}
                  />
                )
              )}
            </ComposedChart>
          );

        default:
          return (
            <LineChart data={filteredData}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("zh-CN", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              {seriesConfig.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name={series.name}
                />
              ))}
              {/* 添加趋势基准线 */}
              {chartData && chartData.length > 0 && (
                <ReferenceLine
                  y={
                    chartData.reduce(
                      (sum, item) => sum + (item.totalWarnings || 0),
                      0
                    ) / chartData.length
                  }
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  label="平均值"
                />
              )}
            </LineChart>
          );
      }
    }, [
      filteredData,
      chartType,
      seriesVisibility,
      showGrid,
      showLegend,
      chartData,
    ]);

    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">
                预警趋势分析
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  刷新
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  导出
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 控制面板 */}
            <div className="space-y-4 mb-6">
              {/* 图表配置 */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeRangeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={chartType} onValueChange={setChartType as any}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {chartTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                    <label className="text-sm">网格</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showLegend}
                      onCheckedChange={setShowLegend}
                    />
                    <label className="text-sm">图例</label>
                  </div>
                </div>
              </div>

              {/* 数据系列控制 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">数据系列</h4>
                <div className="flex flex-wrap gap-2">
                  {DATA_SERIES_CONFIG.map((series) => (
                    <Button
                      key={series.key}
                      variant={
                        seriesVisibility[series.key] ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleSeriesVisibility(series.key)}
                      className="h-8"
                    >
                      <div
                        className="w-3 h-3 rounded mr-2"
                        style={{ backgroundColor: series.color }}
                      />
                      {seriesVisibility[series.key] ? (
                        <Eye className="h-3 w-3 mr-1" />
                      ) : (
                        <EyeOff className="h-3 w-3 mr-1" />
                      )}
                      {series.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 时间范围滑块 */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">时间范围</h4>
                <Slider
                  value={brushRange}
                  onValueChange={setBrushRange}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>
                    {(() => {
                      if (!chartData || chartData.length === 0) return "";
                      const validBrushStart = isNaN(brushRange[0])
                        ? 0
                        : brushRange[0];
                      const startIndex = Math.max(
                        0,
                        Math.min(
                          chartData.length - 1,
                          Math.floor((chartData.length * validBrushStart) / 100)
                        )
                      );
                      return chartData[startIndex]?.date || "";
                    })()}
                  </span>
                  <span>
                    {(() => {
                      if (!chartData || chartData.length === 0) return "";
                      const validBrushEnd = isNaN(brushRange[1])
                        ? 100
                        : brushRange[1];
                      const endIndex = Math.max(
                        0,
                        Math.min(
                          chartData.length - 1,
                          Math.ceil((chartData.length * validBrushEnd) / 100) -
                            1
                        )
                      );
                      return chartData[endIndex]?.date || "";
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* 趋势指标 */}
            {trendMetrics && showComparison && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <TrendIndicator
                  current={trendMetrics.totalWarnings.current}
                  previous={trendMetrics.totalWarnings.previous}
                  label="总预警数"
                />
                <TrendIndicator
                  current={trendMetrics.highSeverity.current}
                  previous={trendMetrics.highSeverity.previous}
                  label="高危预警"
                />
                <TrendIndicator
                  current={trendMetrics.progressRate.current}
                  previous={trendMetrics.progressRate.previous}
                  label="改善率"
                  format="percentage"
                />
              </div>
            )}

            {/* 主图表 */}
            <div className="h-[400px]">
              {filteredData && filteredData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart}
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">暂无趋势数据</p>
                    <p className="text-sm text-gray-400 mt-1">
                      请检查数据源或稍后再试
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 缩略图 */}
            {chartData && chartData.length > 0 && (
              <div className="mt-4 h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis hide />
                    <YAxis hide />
                    <Line
                      type="monotone"
                      dataKey="totalWarnings"
                      stroke="#3b82f6"
                      strokeWidth={1}
                      dot={false}
                    />
                    {chartData.length > 1 && (
                      <Brush
                        dataKey="date"
                        height={30}
                        stroke="#3b82f6"
                        startIndex={(() => {
                          if (!chartData || chartData.length === 0) return 0;
                          const validBrushStart = isNaN(brushRange[0])
                            ? 0
                            : brushRange[0];
                          const calculatedIndex = Math.floor(
                            (chartData.length * validBrushStart) / 100
                          );
                          return Math.max(
                            0,
                            Math.min(chartData.length - 1, calculatedIndex)
                          );
                        })()}
                        endIndex={(() => {
                          if (!chartData || chartData.length === 0) return 0;
                          const validBrushEnd = isNaN(brushRange[1])
                            ? 100
                            : brushRange[1];
                          const calculatedIndex = Math.ceil(
                            (chartData.length * validBrushEnd) / 100
                          );
                          return Math.max(
                            0,
                            Math.min(chartData.length - 1, calculatedIndex)
                          );
                        })()}
                        onChange={(range) => {
                          if (
                            range &&
                            typeof range.startIndex === "number" &&
                            typeof range.endIndex === "number" &&
                            !isNaN(range.startIndex) &&
                            !isNaN(range.endIndex) &&
                            chartData &&
                            chartData.length > 0
                          ) {
                            const safeStartIndex = Math.max(
                              0,
                              Math.min(chartData.length - 1, range.startIndex)
                            );
                            const safeEndIndex = Math.max(
                              0,
                              Math.min(chartData.length - 1, range.endIndex)
                            );

                            const newRangeStart =
                              (safeStartIndex / chartData.length) * 100;
                            const newRangeEnd =
                              (safeEndIndex / chartData.length) * 100;

                            if (!isNaN(newRangeStart) && !isNaN(newRangeEnd)) {
                              setBrushRange([
                                Math.max(0, Math.min(100, newRangeStart)),
                                Math.max(0, Math.min(100, newRangeEnd)),
                              ]);
                            }
                          }
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* 状态信息 */}
            <div className="mt-4 pt-4 border-t text-xs text-gray-500 flex justify-between items-center">
              <span className="flex items-center">
                <Info className="h-3.5 w-3.5 mr-1" />
                显示 {filteredData?.length || 0} 个数据点
                {filteredData && filteredData.length > 0 && (
                  <span>
                    ，范围: {filteredData[0]?.date} -{" "}
                    {filteredData[filteredData.length - 1]?.date}
                  </span>
                )}
              </span>
              <span className="flex items-center">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                {enableRealTime && `实时更新 (${refreshInterval / 1000}s)`}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 🚀 优化: 自定义比较函数，精确控制重渲染
    // 比较数据长度
    if ((prevProps.data?.length || 0) !== (nextProps.data?.length || 0)) {
      return false;
    }

    // 比较配置选项
    if (
      prevProps.className !== nextProps.className ||
      prevProps.showPrediction !== nextProps.showPrediction ||
      prevProps.showComparison !== nextProps.showComparison ||
      prevProps.enableRealTime !== nextProps.enableRealTime ||
      prevProps.refreshInterval !== nextProps.refreshInterval ||
      prevProps.onDataRefresh !== nextProps.onDataRefresh
    ) {
      return false;
    }

    // 深度比较数据数组
    if (prevProps.data && nextProps.data) {
      const dataChanged = prevProps.data.some((prevItem, index) => {
        const nextItem = nextProps.data![index];
        if (!nextItem) return true;
        return (
          prevItem.date !== nextItem.date ||
          prevItem.totalWarnings !== nextItem.totalWarnings ||
          prevItem.highSeverity !== nextItem.highSeverity ||
          prevItem.mediumSeverity !== nextItem.mediumSeverity ||
          prevItem.lowSeverity !== nextItem.lowSeverity ||
          prevItem.gradeRelated !== nextItem.gradeRelated ||
          prevItem.behaviorRelated !== nextItem.behaviorRelated ||
          prevItem.attendanceRelated !== nextItem.attendanceRelated ||
          prevItem.progressRate !== nextItem.progressRate
        );
      });
      if (dataChanged) return false;
    }

    // Props 相同，不重渲染
    return true;
  }
);

WarningTrendChart.displayName = "WarningTrendChart";

export default WarningTrendChart;
