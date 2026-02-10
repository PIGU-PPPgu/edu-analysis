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
} from "recharts";
import type {
  ClassValueAdded,
  TeacherValueAdded,
} from "@/types/valueAddedTypes";

/**
 * 获取唯一标识键（组合键，避免重名问题）
 */
function getUniqueKey(
  item: ClassValueAdded | TeacherValueAdded,
  type: "class" | "teacher"
): string {
  if (type === "class") {
    const classItem = item as ClassValueAdded;
    return `${classItem.class_name}-${classItem.subject}`;
  }
  const teacherItem = item as TeacherValueAdded;
  return `${teacherItem.teacher_name}-${teacherItem.subject}`;
}

export interface ThreeRatesClickData {
  name: string;
  consolidation: number;
  transformation: number;
  contribution: number;
  rawData: ClassValueAdded | TeacherValueAdded;
}

interface ThreeRatesComparisonProps {
  data: (ClassValueAdded | TeacherValueAdded)[];
  type: "class" | "teacher";
  onItemClick?: (data: ThreeRatesClickData) => void;
}

export function ThreeRatesComparison({
  data,
  type,
  onItemClick,
}: ThreeRatesComparisonProps) {
  const [showAllHeatmap, setShowAllHeatmap] = useState(false);
  const HEATMAP_PAGE_SIZE = 10;

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>三率对比分析</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">暂无数据</p>
        </CardContent>
      </Card>
    );
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
              acc[name] = item.consolidation_rate * 100; // 保持数值，交给图表格式化
              return acc;
            },
            {} as Record<string, number>
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
              acc[name] = item.transformation_rate * 100; // 保持数值
              return acc;
            },
            {} as Record<string, number>
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
              const contributionNormalized =
                (item.contribution_rate + 0.5) * 100;
              acc[name] = contributionNormalized; // 保持数值
              return acc;
            },
            {} as Record<string, number>
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
        uniqueKey: getUniqueKey(item, type), // 添加唯一键
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

  // 颜色配置 - 使用Tableau10配色方案（更具区分度）
  const colors = [
    "#4E79A7", // 蓝色
    "#F28E2B", // 橙色
    "#E15759", // 红色
    "#76B7B2", // 青色
    "#59A14F", // 绿色
    "#EDC948", // 黄色
    "#B07AA1", // 紫色
    "#FF9DA7", // 粉色
    "#9C755F", // 棕色
    "#BAB0AC", // 灰色
  ];

  // 统一的点击处理函数
  const handleBarClick = (clickData: any) => {
    if (!onItemClick) return;
    const payload = clickData as any;
    // 使用唯一键查找，避免重名问题
    const rawDataItem = data.find(
      (item) => getUniqueKey(item, type) === payload.uniqueKey
    );
    if (!rawDataItem) return;
    onItemClick({
      name: payload.fullName,
      consolidation: payload.consolidation,
      transformation: payload.transformation,
      contribution: payload.contribution,
      rawData: rawDataItem,
    });
  };

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
                <PolarGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 14, fontWeight: 600, fill: "#374151" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(value) => `${value}%`}
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
                      fillOpacity={0.25}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  );
                })}
                <Legend
                  wrapperStyle={{
                    paddingTop: "20px",
                  }}
                  iconType="circle"
                />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "2px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  labelStyle={{
                    fontWeight: 600,
                    color: "#111827",
                  }}
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
                  onClick={handleBarClick}
                  style={{ cursor: "pointer" }}
                />
                <Bar
                  dataKey="transformation"
                  name="转化率"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                  style={{ cursor: "pointer" }}
                />
                <Bar
                  dataKey="contribution"
                  name="贡献率"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                  style={{ cursor: "pointer" }}
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
                key={item.uniqueKey}
                className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  if (!onItemClick) return;
                  // 使用唯一键查找，避免重名问题
                  const rawDataItem = data.find(
                    (dataItem) =>
                      getUniqueKey(dataItem, type) === item.uniqueKey
                  );
                  if (!rawDataItem) return;
                  onItemClick({
                    name: item.fullName,
                    consolidation: item.consolidation,
                    transformation: item.transformation,
                    contribution: item.contribution,
                    rawData: rawDataItem,
                  });
                }}
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

      {/* 说明文字 */}
      <Card className="lg:col-span-2 bg-blue-50 dark:bg-blue-950">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              📊 指标说明
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>
                <strong>巩固率</strong>：保持最高等级（A+）的学生比例
              </li>
              <li>
                <strong>转化率</strong>：等级提升的学生比例
              </li>
              <li>
                <strong>贡献率</strong>：对优秀人数增长的贡献百分比
              </li>
            </ul>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic pt-2 border-t border-blue-200 dark:border-blue-800">
              ℹ️
              各科目数据独立计算，不提供跨科目聚合。如需查看整体表现，请使用"总分增值"功能。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
