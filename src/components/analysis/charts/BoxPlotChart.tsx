/**
 * 📊 箱线图组件 - 性能优化版
 * Phase 1.3: 使用 React.memo 和 useMemo 优化渲染性能
 * 使用自定义SVG绘制，避免Recharts复杂性
 *
 * 优化措施：
 * 1. React.memo 包装组件，避免父组件重渲染时的不必要更新
 * 2. useMemo 缓存 SVG 配置、坐标计算等昂贵操作
 * 3. 深度比较 props，只在数据真正变化时重渲染
 */

import React, { useMemo, memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";

export interface BoxPlotData {
  subject: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  outliers: number[];
  count: number;
  fullScore: number;
}

interface BoxPlotChartProps {
  data: BoxPlotData[];
  title?: string;
  height?: number;
  showOutliers?: boolean;
  showMean?: boolean;
  normalizeByPercent?: boolean;
}

// 计算箱线图数据的工具函数
export function calculateBoxPlotStats(
  scores: number[],
  fullScore: number = 100
): Omit<BoxPlotData, "subject"> {
  if (scores.length === 0) {
    return {
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
      mean: 0,
      outliers: [],
      count: 0,
      fullScore,
    };
  }

  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;

  const q1Index = Math.floor(n * 0.25);
  const medianIndex = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index];
  const median =
    n % 2 === 0
      ? (sorted[medianIndex - 1] + sorted[medianIndex]) / 2
      : sorted[medianIndex];
  const q3 = sorted[q3Index];

  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = sorted.filter((s) => s < lowerBound || s > upperBound);
  const nonOutliers = sorted.filter((s) => s >= lowerBound && s <= upperBound);
  const min = nonOutliers.length > 0 ? nonOutliers[0] : sorted[0];
  const max =
    nonOutliers.length > 0
      ? nonOutliers[nonOutliers.length - 1]
      : sorted[n - 1];

  const mean = scores.reduce((a, b) => a + b, 0) / n;

  return {
    min,
    q1,
    median,
    q3,
    max,
    mean,
    outliers,
    count: n,
    fullScore,
  };
}

const BoxPlotChart = memo<BoxPlotChartProps>(
  ({
    data,
    title,
    height = 400,
    showOutliers = true,
    showMean = true,
    normalizeByPercent = false,
  }) => {
    // 去重和验证
    const validatedData = useMemo(() => {
      if (!data || data.length === 0) return [];

      const seen = new Set<string>();
      const result: BoxPlotData[] = [];

      data.forEach((item) => {
        if (!item.subject || seen.has(item.subject)) return;
        seen.add(item.subject);
        result.push(item);
      });

      console.log(
        "📊 BoxPlotChart (性能优化版) - 数据验证完成:",
        result.length,
        "个科目"
      );
      return result;
    }, [data]);

    // 计算Y轴范围
    const { yMin, yMax } = useMemo(() => {
      if (normalizeByPercent) {
        return { yMin: 0, yMax: 105 };
      }

      let min = Infinity;
      let max = -Infinity;

      validatedData.forEach((item) => {
        min = Math.min(min, item.min, ...item.outliers);
        max = Math.max(max, item.max, ...item.outliers, item.fullScore);
      });

      const padding = (max - min) * 0.1;
      return { yMin: Math.max(0, min - padding), yMax: max + padding };
    }, [validatedData, normalizeByPercent]);

    // 🚀 优化: 使用 useMemo 缓存 SVG 配置，避免每次渲染都重新计算
    const svgConfig = useMemo(() => {
      const chartWidth = Math.max(800, validatedData.length * 150);
      const chartHeight = height - 60;
      const plotWidth = chartWidth - 120;
      const plotHeight = chartHeight - 60;
      const leftMargin = 80;
      const topMargin = 30;
      const boxWidth = 60;

      return {
        chartWidth,
        chartHeight,
        plotWidth,
        plotHeight,
        leftMargin,
        topMargin,
        boxWidth,
      };
    }, [validatedData.length, height]);

    // 🚀 优化: 使用 useCallback 缓存坐标转换函数
    const toPercent = useCallback(
      (value: number, fullScore: number) =>
        normalizeByPercent ? (value / fullScore) * 100 : value,
      [normalizeByPercent]
    );

    const scaleY = useCallback(
      (value: number) => {
        const normalized = (value - yMin) / (yMax - yMin);
        return (
          svgConfig.plotHeight -
          normalized * svgConfig.plotHeight +
          svgConfig.topMargin
        );
      },
      [yMin, yMax, svgConfig.plotHeight, svgConfig.topMargin]
    );

    const getXPosition = useCallback(
      (index: number) => {
        const spacing = svgConfig.plotWidth / validatedData.length;
        return svgConfig.leftMargin + spacing * index + spacing / 2;
      },
      [svgConfig.plotWidth, svgConfig.leftMargin, validatedData.length]
    );

    // 🚀 优化: 使用 useMemo 缓存 Y 轴刻度数据
    const yAxisTicks = useMemo(() => {
      return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
        ratio,
        value: yMin + (yMax - yMin) * ratio,
      }));
    }, [yMin, yMax]);

    if (validatedData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-[#191A23]/50">
          暂无数据
        </div>
      );
    }

    return (
      <div className="w-full">
        {title && (
          <h3 className="font-bold text-lg text-[#191A23] mb-4">{title}</h3>
        )}

        <div className="w-full overflow-x-auto flex justify-center">
          <svg
            width={svgConfig.chartWidth}
            height={height}
            className="border border-gray-200 mx-auto"
          >
            {/* Y轴 */}
            <line
              x1={svgConfig.leftMargin}
              y1={svgConfig.topMargin}
              x2={svgConfig.leftMargin}
              y2={svgConfig.plotHeight + svgConfig.topMargin}
              stroke="#191A23"
              strokeWidth={2}
            />

            {/* Y轴刻度和标签 */}
            {yAxisTicks.map((tick, i) => {
              const y = scaleY(tick.value);
              return (
                <g key={i}>
                  <line
                    x1={svgConfig.leftMargin - 5}
                    y1={y}
                    x2={svgConfig.leftMargin}
                    y2={y}
                    stroke="#191A23"
                    strokeWidth={1}
                  />
                  <text
                    x={svgConfig.leftMargin - 10}
                    y={y + 5}
                    textAnchor="end"
                    fontSize="14"
                    fill="#191A23"
                    fontWeight="bold"
                  >
                    {tick.value.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Y轴标签 */}
            <text
              x={25}
              y={svgConfig.plotHeight / 2 + svgConfig.topMargin}
              textAnchor="middle"
              fontSize="16"
              fill="#191A23"
              fontWeight="bold"
              transform={`rotate(-90, 25, ${
                svgConfig.plotHeight / 2 + svgConfig.topMargin
              })`}
            >
              {normalizeByPercent ? "百分比(%)" : "分数"}
            </text>

            {/* 网格线 */}
            {yAxisTicks.map((tick, i) => {
              const y = scaleY(tick.value);
              return (
                <line
                  key={i}
                  x1={svgConfig.leftMargin}
                  y1={y}
                  x2={svgConfig.leftMargin + svgConfig.plotWidth}
                  y2={y}
                  stroke="#191A23"
                  strokeOpacity={0.1}
                  strokeDasharray="3 3"
                />
              );
            })}

            {/* 绘制箱线图 */}
            {validatedData.map((item, index) => {
              const x = getXPosition(index);
              const fullScore = item.fullScore || 100;

              const minY = scaleY(toPercent(item.min, fullScore));
              const q1Y = scaleY(toPercent(item.q1, fullScore));
              const medianY = scaleY(toPercent(item.median, fullScore));
              const q3Y = scaleY(toPercent(item.q3, fullScore));
              const maxY = scaleY(toPercent(item.max, fullScore));
              const meanY = scaleY(toPercent(item.mean, fullScore));

              return (
                <g key={item.subject}>
                  {/* 须线 (whiskers) */}
                  <line
                    x1={x}
                    y1={minY}
                    x2={x}
                    y2={maxY}
                    stroke="#191A23"
                    strokeWidth={2}
                  />

                  {/* 最小值横线 */}
                  <line
                    x1={x - 10}
                    y1={minY}
                    x2={x + 10}
                    y2={minY}
                    stroke="#191A23"
                    strokeWidth={2}
                  />

                  {/* 最大值横线 */}
                  <line
                    x1={x - 10}
                    y1={maxY}
                    x2={x + 10}
                    y2={maxY}
                    stroke="#191A23"
                    strokeWidth={2}
                  />

                  {/* 箱体 (Q1-Q3) */}
                  <rect
                    x={x - svgConfig.boxWidth / 2}
                    y={q3Y}
                    width={svgConfig.boxWidth}
                    height={q1Y - q3Y}
                    fill="#B9FF66"
                    stroke="#191A23"
                    strokeWidth={2}
                  />

                  {/* 中位数线 */}
                  <line
                    x1={x - svgConfig.boxWidth / 2}
                    y1={medianY}
                    x2={x + svgConfig.boxWidth / 2}
                    y2={medianY}
                    stroke="#191A23"
                    strokeWidth={4}
                  />

                  {/* 平均值点 */}
                  {showMean && (
                    <circle
                      cx={x}
                      cy={meanY}
                      r={5}
                      fill="#FF6B6B"
                      stroke="#191A23"
                      strokeWidth={2}
                    />
                  )}

                  {/* 异常值 */}
                  {showOutliers &&
                    item.outliers.map((outlier, oi) => {
                      const outlierY = scaleY(toPercent(outlier, fullScore));
                      return (
                        <circle
                          key={oi}
                          cx={x}
                          cy={outlierY}
                          r={4}
                          fill="#FF6B6B"
                        />
                      );
                    })}

                  {/* X轴标签 */}
                  <text
                    x={x}
                    y={svgConfig.plotHeight + svgConfig.topMargin + 25}
                    textAnchor="middle"
                    fontSize="14"
                    fill="#191A23"
                    fontWeight="bold"
                  >
                    {item.subject}
                  </text>

                  {/* Tooltip触发区域（透明矩形） */}
                  <rect
                    x={x - svgConfig.boxWidth / 2 - 10}
                    y={maxY - 10}
                    width={svgConfig.boxWidth + 20}
                    height={minY - maxY + 20}
                    fill="transparent"
                    stroke="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      const tooltip = document.getElementById(
                        `tooltip-${index}`
                      );
                      if (tooltip) tooltip.style.display = "block";
                    }}
                    onMouseLeave={(e) => {
                      const tooltip = document.getElementById(
                        `tooltip-${index}`
                      );
                      if (tooltip) tooltip.style.display = "none";
                    }}
                  />
                </g>
              );
            })}

            {/* Tooltip (SVG foreignObject) */}
            {validatedData.map((item, index) => {
              const x = getXPosition(index);
              // 智能定位：左边科目tooltip显示在右边，右边科目tooltip显示在左边
              const isLeftSide = index < validatedData.length / 2;
              const tooltipX = isLeftSide ? x + 40 : x - 290;
              const tooltipY = svgConfig.topMargin + 20;

              return (
                <foreignObject
                  key={`tooltip-${index}`}
                  id={`tooltip-${index}`}
                  x={tooltipX}
                  y={tooltipY}
                  width={260}
                  height={320}
                  style={{ display: "none", pointerEvents: "none" }}
                >
                  <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#191A23] p-3">
                    <CardContent className="p-0">
                      <p className="font-black text-[#191A23] mb-2 text-lg">
                        {item.subject}
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="grid grid-cols-2 gap-x-4">
                          <span className="text-[#191A23]/70">样本数:</span>
                          <span className="font-bold text-[#191A23]">
                            {item.count}人
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <span className="text-[#191A23]/70">满分:</span>
                          <span className="font-bold text-[#191A23]">
                            {item.fullScore}分
                          </span>
                        </div>
                        <hr className="my-2 border-[#191A23]/20" />
                        <div className="grid grid-cols-2 gap-x-4">
                          <span className="text-[#191A23]/70">最高分:</span>
                          <span className="font-bold text-[#B9FF66]">
                            {item.max.toFixed(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <span className="text-[#191A23]/70">Q3 (75%):</span>
                          <span className="font-bold text-[#191A23]">
                            {item.q3.toFixed(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <span className="text-[#191A23]/70">中位数:</span>
                          <span className="font-bold text-[#191A23]">
                            {item.median.toFixed(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <span className="text-[#191A23]/70">Q1 (25%):</span>
                          <span className="font-bold text-[#191A23]">
                            {item.q1.toFixed(1)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                          <span className="text-[#191A23]/70">最低分:</span>
                          <span className="font-bold text-[#FF6B6B]">
                            {item.min.toFixed(1)}
                          </span>
                        </div>
                        {showMean && (
                          <>
                            <hr className="my-2 border-[#191A23]/20" />
                            <div className="grid grid-cols-2 gap-x-4">
                              <span className="text-[#191A23]/70">平均分:</span>
                              <span className="font-bold text-[#191A23]">
                                {item.mean.toFixed(1)}
                              </span>
                            </div>
                          </>
                        )}
                        {item.outliers && item.outliers.length > 0 && (
                          <>
                            <hr className="my-2 border-[#191A23]/20" />
                            <div className="text-[#FF6B6B]">
                              异常值: {item.outliers.length}个
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </foreignObject>
              );
            })}
          </svg>
        </div>

        {/* 图例说明 */}
        <div className="flex justify-center gap-8 mt-6 text-base">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#B9FF66] border-2 border-[#191A23]"></div>
            <span className="text-[#191A23] font-semibold">箱体 (Q1-Q3)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-[#191A23]"></div>
            <span className="text-[#191A23] font-semibold">中位数</span>
          </div>
          {showMean && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FF6B6B] border-2 border-[#191A23]"></div>
              <span className="text-[#191A23] font-semibold">平均值</span>
            </div>
          )}
          {showOutliers && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FF6B6B]"></div>
              <span className="text-[#191A23] font-semibold">异常值</span>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数：只在真正需要更新的时候重新渲染
    // 1. 比较数据长度
    if (prevProps.data.length !== nextProps.data.length) {
      return false;
    }

    // 2. 比较配置选项
    if (
      prevProps.title !== nextProps.title ||
      prevProps.height !== nextProps.height ||
      prevProps.showOutliers !== nextProps.showOutliers ||
      prevProps.showMean !== nextProps.showMean ||
      prevProps.normalizeByPercent !== nextProps.normalizeByPercent
    ) {
      return false;
    }

    // 3. 深度比较数据数组 - 检查每个箱线图的关键统计值
    const dataChanged = prevProps.data.some((prevItem, index) => {
      const nextItem = nextProps.data[index];
      if (!nextItem) return true;

      return (
        prevItem.subject !== nextItem.subject ||
        prevItem.min !== nextItem.min ||
        prevItem.q1 !== nextItem.q1 ||
        prevItem.median !== nextItem.median ||
        prevItem.q3 !== nextItem.q3 ||
        prevItem.max !== nextItem.max ||
        prevItem.mean !== nextItem.mean ||
        prevItem.count !== nextItem.count ||
        prevItem.fullScore !== nextItem.fullScore ||
        prevItem.outliers.length !== nextItem.outliers.length
      );
    });

    if (dataChanged) {
      return false;
    }

    // 如果所有条件都满足，返回 true 表示不需要重新渲染
    return true;
  }
);

BoxPlotChart.displayName = "BoxPlotChart";

export default BoxPlotChart;
