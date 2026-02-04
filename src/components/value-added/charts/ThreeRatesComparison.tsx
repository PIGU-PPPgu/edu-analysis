"use client";

/**
 * 增值三率对比图
 * 直观展示巩固率、转化率、贡献率
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import type {
  ClassValueAdded,
  TeacherValueAdded,
} from "@/types/valueAddedTypes";

interface ThreeRatesComparisonProps {
  data: (ClassValueAdded | TeacherValueAdded)[];
  type: "class" | "teacher";
}

export function ThreeRatesComparison({
  data,
  type,
}: ThreeRatesComparisonProps) {
  const [showAllHeatmap, setShowAllHeatmap] = useState(false);
  const HEATMAP_PAGE_SIZE = 10;

  if (data.length === 0) {
    return null;
  }

  // 准备雷达图数据 - 取前5名 (使用 useMemo 优化)
  const { radarData, topData } = useMemo(() => {
    const top = data.slice(0, Math.min(5, data.length));
    return {
      topData: top,
      radarData: [
        {
          metric: "巩固率",
          ...top.reduce(
            (acc, item) => {
              const name =
                type === "class"
                  ? (item as ClassValueAdded).class_name
                  : (item as TeacherValueAdded).teacher_name;
              acc[name] = (item.consolidation_rate * 100).toFixed(1);
              return acc;
            },
            {} as Record<string, string>
          ),
        },
        {
          metric: "转化率",
          ...top.reduce(
            (acc, item) => {
              const name =
                type === "class"
                  ? (item as ClassValueAdded).class_name
                  : (item as TeacherValueAdded).teacher_name;
              acc[name] = (item.transformation_rate * 100).toFixed(1);
              return acc;
            },
            {} as Record<string, string>
          ),
        },
        {
          metric: "贡献率",
          ...top.reduce(
            (acc, item) => {
              const name =
                type === "class"
                  ? (item as ClassValueAdded).class_name
                  : (item as TeacherValueAdded).teacher_name;
              // 贡献率可能为负，转换为0-100区间
              const contributionNormalized = (
                (item.contribution_rate + 0.5) *
                100
              ).toFixed(1);
              acc[name] = contributionNormalized;
              return acc;
            },
            {} as Record<string, string>
          ),
        },
      ],
    };
  }, [data, type]);

  // 准备柱状图数据 - 展示所有数据 (使用 useMemo 优化)
  const barData = useMemo(() => {
    return data.map((item) => {
      const name =
        type === "class"
          ? (item as ClassValueAdded).class_name
          : (item as TeacherValueAdded).teacher_name;

      return {
        name: name.length > 10 ? name.substring(0, 10) + "..." : name,
        fullName: name,
        consolidation: item.consolidation_rate * 100,
        transformation: item.transformation_rate * 100,
        contribution: item.contribution_rate * 100,
        valueAdded: item.avg_score_value_added_rate * 100,
      };
    });
  }, [data, type]);

  // 热力图分页显示数据
  const displayedHeatmapData = useMemo(() => {
    return showAllHeatmap ? barData : barData.slice(0, HEATMAP_PAGE_SIZE);
  }, [barData, showAllHeatmap]);

  // 颜色配置
  const colors = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 雷达图 - Top 5 对比 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            三率雷达对比 (Top {topData.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 14, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                />
                {topData.map((item, index) => {
                  const name =
                    type === "class"
                      ? (item as ClassValueAdded).class_name
                      : (item as TeacherValueAdded).teacher_name;
                  return (
                    <Radar
                      key={name}
                      name={name}
                      dataKey={name}
                      stroke={colors[index % colors.length]}
                      fill={colors[index % colors.length]}
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  );
                })}
                <Legend />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 分组柱状图 - 全部对比 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">三率柱状对比 (全部)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "百分比 (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullName;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Bar
                  dataKey="consolidation"
                  name="巩固率"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="transformation"
                  name="转化率"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="contribution"
                  name="贡献率"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 热力图式的指标卡片 */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">核心指标热力图</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {displayedHeatmapData.map((item, index) => (
              <div
                key={item.fullName}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-lg">{item.fullName}</span>
                  <span className="text-sm text-muted-foreground">
                    增值率: {item.valueAdded.toFixed(2)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* 巩固率 */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      巩固率
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-green-500 transition-all"
                        style={{ width: `${item.consolidation}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                        {item.consolidation.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* 转化率 */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      转化率
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-500 transition-all"
                        style={{ width: `${item.transformation}%` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                        {item.transformation.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* 贡献率 */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      贡献率
                    </div>
                    <div className="relative h-8 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 transition-all ${
                          item.contribution >= 0 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{
                          width: `${Math.abs(item.contribution)}%`,
                          ...(item.contribution < 0 && {
                            right: 0,
                            left: "auto",
                          }),
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                        {item.contribution.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 显示更多按钮 */}
          {barData.length > HEATMAP_PAGE_SIZE && (
            <div className="flex justify-center mt-4">
              <Button
                variant="outline"
                onClick={() => setShowAllHeatmap(!showAllHeatmap)}
              >
                {showAllHeatmap
                  ? "收起"
                  : `显示更多 (${barData.length - HEATMAP_PAGE_SIZE} 条)`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
