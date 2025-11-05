/**
 * 图表工具库 - 统一的图表数据处理和配置函数
 *
 * 提供Recharts和Nivo图表库的数据转换、配置生成等功能
 * 包括柱状图、线图、饼图、箱线图、热力图等常用图表类型
 */

import { BoxPlotData } from "./calculationUtils";

// ============================================================================
// 通用图表类型定义
// ============================================================================

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface MultiSeriesDataPoint {
  name: string;
  [seriesName: string]: string | number;
}

export interface ScatterDataPoint {
  x: number;
  y: number;
  label?: string;
  category?: string;
}

export interface HeatmapDataPoint {
  x: string;
  y: string;
  value: number;
  label?: string;
}

// ============================================================================
// 颜色配置
// ============================================================================

export const CHART_COLORS = {
  primary: "#3B82F6", // 蓝色 - 主色
  secondary: "#8B5CF6", // 紫色 - 辅助色
  success: "#10B981", // 绿色 - 成功/优秀
  warning: "#F59E0B", // 橙色 - 警告/中等
  danger: "#EF4444", // 红色 - 危险/低分
  info: "#06B6D4", // 青色 - 信息
  gray: "#6B7280", // 灰色 - 中性

  // 分数段颜色
  excellent: "#10B981", // 优秀 - 绿色
  good: "#3B82F6", // 良好 - 蓝色
  fair: "#F59E0B", // 中等 - 橙色
  poor: "#EF4444", // 不及格 - 红色

  // 多系列颜色组合
  series: [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
    "#14B8A6",
    "#F97316",
  ],
};

// ============================================================================
// 柱状图数据处理
// ============================================================================

/**
 * 转换分数段数据为柱状图格式
 */
export function formatScoreRangeData(
  data: { range: string; count: number; percentage: number }[]
): ChartDataPoint[] {
  return data.map((item) => ({
    name: item.range,
    value: item.count,
    percentage: item.percentage,
    fill: getScoreRangeColor(item.range),
  }));
}

/**
 * 转换班级对比数据为柱状图格式
 */
export function formatClassComparisonData(
  data: { className: string; averageScore: number; studentCount: number }[]
): ChartDataPoint[] {
  return data.map((item) => ({
    name: item.className,
    value: item.averageScore,
    count: item.studentCount,
    fill: CHART_COLORS.primary,
  }));
}

/**
 * 转换科目成绩数据为多系列柱状图格式
 */
export function formatSubjectScoresData(
  data: { studentName: string; [subject: string]: any }[]
): MultiSeriesDataPoint[] {
  return data.map((item) => {
    const result: MultiSeriesDataPoint = { name: item.studentName };
    Object.keys(item).forEach((key) => {
      if (key !== "studentName") {
        result[key] = item[key];
      }
    });
    return result;
  });
}

// ============================================================================
// 饼图数据处理
// ============================================================================

/**
 * 转换数据为饼图格式
 */
export function formatPieChartData(
  data: { name: string; value: number }[],
  options?: { showPercentage?: boolean }
): ChartDataPoint[] {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return data.map((item, index) => ({
    name: item.name,
    value: item.value,
    percentage: total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0,
    fill: CHART_COLORS.series[index % CHART_COLORS.series.length],
  }));
}

// ============================================================================
// 线图数据处理
// ============================================================================

/**
 * 转换趋势数据为线图格式
 */
export function formatTrendData(
  data: { period: string; value: number; change?: number }[]
): ChartDataPoint[] {
  return data.map((item) => ({
    name: item.period,
    value: item.value,
    change: item.change || 0,
    stroke:
      item.change && item.change > 0
        ? CHART_COLORS.success
        : item.change && item.change < 0
          ? CHART_COLORS.danger
          : CHART_COLORS.primary,
  }));
}

/**
 * 转换多学生趋势数据为多系列线图格式
 */
export function formatMultiStudentTrendData(
  data: { period: string; [studentName: string]: any }[]
): MultiSeriesDataPoint[] {
  return data.map((item) => {
    const result: MultiSeriesDataPoint = { name: item.period };
    Object.keys(item).forEach((key) => {
      if (key !== "period") {
        result[key] = item[key];
      }
    });
    return result;
  });
}

// ============================================================================
// 散点图数据处理
// ============================================================================

/**
 * 转换成绩分布数据为散点图格式
 */
export function formatScatterData(
  data: {
    studentName: string;
    subject1Score: number;
    subject2Score: number;
    className?: string;
  }[]
): ScatterDataPoint[] {
  return data.map((item) => ({
    x: item.subject1Score,
    y: item.subject2Score,
    label: item.studentName,
    category: item.className || "未知班级",
  }));
}

// ============================================================================
// 箱线图数据处理
// ============================================================================

/**
 * 转换箱线图数据为Nivo格式
 */
export function formatBoxPlotDataForNivo(data: BoxPlotData[]): any[] {
  return data.map((item) => ({
    group: item.subject,
    value: item.median,
    min: item.min,
    q1: item.q1,
    median: item.median,
    q3: item.q3,
    max: item.max,
    outliers: item.outliers,
  }));
}

/**
 * 转换箱线图数据为Recharts格式
 */
export function formatBoxPlotDataForRecharts(data: BoxPlotData[]): any[] {
  return data.map((item) => ({
    name: item.subject,
    min: item.min,
    q1: item.q1,
    median: item.median,
    q3: item.q3,
    max: item.max,
    outliers: item.outliers,
    fill: CHART_COLORS.primary,
  }));
}

// ============================================================================
// 热力图数据处理
// ============================================================================

/**
 * 转换相关性矩阵为热力图数据
 */
export function formatCorrelationHeatmap(correlationMatrix: {
  [subject1: string]: { [subject2: string]: number };
}): HeatmapDataPoint[] {
  const data: HeatmapDataPoint[] = [];

  Object.keys(correlationMatrix).forEach((subject1) => {
    Object.keys(correlationMatrix[subject1]).forEach((subject2) => {
      data.push({
        x: subject1,
        y: subject2,
        value: correlationMatrix[subject1][subject2],
        label: `${subject1} vs ${subject2}: ${correlationMatrix[subject1][subject2].toFixed(2)}`,
      });
    });
  });

  return data;
}

/**
 * 转换班级成绩热力图数据
 */
export function formatClassGradeHeatmap(
  data: { className: string; subject: string; averageScore: number }[]
): HeatmapDataPoint[] {
  return data.map((item) => ({
    x: item.className,
    y: item.subject,
    value: item.averageScore,
    label: `${item.className} ${item.subject}: ${item.averageScore}分`,
  }));
}

// ============================================================================
// 雷达图数据处理
// ============================================================================

/**
 * 转换学生能力雷达图数据
 */
export function formatRadarData(
  data: { ability: string; score: number; fullScore?: number }[]
): any[] {
  return data.map((item) => ({
    ability: item.ability,
    score: item.score,
    fullScore: item.fullScore || 100,
    percentage: item.fullScore
      ? (item.score / item.fullScore) * 100
      : item.score,
  }));
}

// ============================================================================
// 图表配置生成
// ============================================================================

/**
 * 生成Recharts通用配置
 */
export function getRechartsConfig(type: "bar" | "line" | "pie" | "area") {
  const baseConfig = {
    margin: { top: 20, right: 30, left: 20, bottom: 5 },
    className: "w-full h-full",
  };

  switch (type) {
    case "bar":
      return {
        ...baseConfig,
        barCategoryGap: "20%",
        barGap: 10,
      };
    case "line":
      return {
        ...baseConfig,
        strokeWidth: 2,
        dot: { r: 4 },
        activeDot: { r: 6 },
      };
    case "pie":
      return {
        ...baseConfig,
        innerRadius: 0,
        outerRadius: 80,
        paddingAngle: 2,
        dataKey: "value",
      };
    case "area":
      return {
        ...baseConfig,
        strokeWidth: 2,
        fillOpacity: 0.6,
      };
    default:
      return baseConfig;
  }
}

/**
 * 生成Nivo通用配置
 */
export function getNivoConfig(
  type: "bar" | "line" | "pie" | "heatmap" | "boxplot"
) {
  const baseConfig = {
    margin: { top: 50, right: 110, bottom: 50, left: 60 },
    colors: CHART_COLORS.series,
    theme: {
      axis: {
        fontSize: 12,
        textColor: "#374151",
      },
      grid: {
        line: {
          stroke: "#E5E7EB",
          strokeWidth: 1,
        },
      },
    },
  };

  switch (type) {
    case "bar":
      return {
        ...baseConfig,
        padding: 0.3,
        valueScale: { type: "linear" },
        indexScale: { type: "band", round: true },
      };
    case "line":
      return {
        ...baseConfig,
        pointSize: 6,
        pointBorderWidth: 2,
        pointBorderColor: { from: "serieColor" },
        enablePointLabel: false,
        useMesh: true,
      };
    case "heatmap":
      return {
        ...baseConfig,
        forceSquare: true,
        cellOpacity: 1,
        cellBorderColor: { from: "color", modifiers: [["darker", 0.4]] },
        labelTextColor: { from: "color", modifiers: [["darker", 1.8]] },
      };
    case "boxplot":
      return {
        ...baseConfig,
        whiskerEndSize: 0.6,
        whiskerWidth: 2,
        boxWidth: 0.8,
      };
    default:
      return baseConfig;
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据分数段获取颜色
 */
export function getScoreRangeColor(range: string): string {
  switch (range) {
    case "优秀":
      return CHART_COLORS.excellent;
    case "良好":
      return CHART_COLORS.good;
    case "及格":
      return CHART_COLORS.fair;
    case "不及格":
      return CHART_COLORS.poor;
    default:
      return CHART_COLORS.gray;
  }
}

/**
 * 根据变化趋势获取颜色
 */
export function getTrendColor(change: number): string {
  if (change > 0) return CHART_COLORS.success;
  if (change < 0) return CHART_COLORS.danger;
  return CHART_COLORS.gray;
}

/**
 * 格式化图表标签
 */
export function formatChartLabel(
  value: any,
  type: "percentage" | "score" | "count" = "score"
): string {
  switch (type) {
    case "percentage":
      return `${value}%`;
    case "score":
      return `${value}分`;
    case "count":
      return `${value}人`;
    default:
      return String(value);
  }
}

/**
 * 生成图表响应式配置
 */
export function getResponsiveConfig(containerWidth: number) {
  if (containerWidth < 640) {
    // 移动端
    return {
      margin: { top: 20, right: 20, left: 20, bottom: 20 },
      fontSize: 10,
      showLabels: false,
    };
  } else if (containerWidth < 1024) {
    // 平板端
    return {
      margin: { top: 30, right: 50, left: 30, bottom: 30 },
      fontSize: 11,
      showLabels: true,
    };
  } else {
    // 桌面端
    return {
      margin: { top: 40, right: 60, left: 40, bottom: 40 },
      fontSize: 12,
      showLabels: true,
    };
  }
}

/**
 * 数据预处理 - 清理和验证
 */
export function preprocessChartData<T>(data: T[]): T[] {
  return data.filter(
    (item) => item !== null && item !== undefined && typeof item === "object"
  );
}

/**
 * 图表数据导出为CSV
 */
export function exportChartDataToCSV(
  data: any[],
  filename: string = "chart-data.csv"
): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) =>
          typeof row[header] === "string" ? `"${row[header]}"` : row[header]
        )
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
