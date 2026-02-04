"use client";

/**
 * 历次追踪仪表板
 * 展示学生/班级/教师在多次考试中的增值变化趋势
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Users,
  BookOpen,
  Target,
} from "lucide-react";

interface TrackingDataPoint {
  exam_title: string;
  exam_date: string;
  sequence_order: number;
  value_added_rate: number;
  consolidation_rate: number;
  transformation_rate: number;
  contribution_rate: number;
  avg_z_score_change: number;
  rank: number;
  total_count: number;
}

interface TrackingSubject {
  subject_name: string;
  data: TrackingDataPoint[];
}

interface TrackingDashboardProps {
  entityType: "class" | "teacher" | "student";
  entityName: string;
  seriesName: string;
  subjects?: TrackingSubject[];
}

export function TrackingDashboard({
  entityType,
  entityName,
  seriesName,
  subjects = [],
}: TrackingDashboardProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>(
    subjects.length > 0 ? subjects[0].subject_name : ""
  );

  // 获取当前选中科目的数据
  const currentSubject = subjects.find(
    (s) => s.subject_name === selectedSubject
  );

  // 如果没有数据，显示空状态
  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <TrendingUp className="h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-semibold text-muted-foreground">
                暂无历次追踪数据
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                请先在"考试系列管理"中创建考试系列，并关联多次考试数据
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 实体类型的中文名称
  const entityTypeLabel = {
    class: "班级",
    teacher: "教师",
    student: "学生",
  }[entityType];

  // 实体类型的图标
  const EntityIcon = {
    class: Users,
    teacher: Award,
    student: BookOpen,
  }[entityType];

  // 计算整体趋势
  const calculateTrend = () => {
    if (!currentSubject || currentSubject.data.length < 2) {
      return { trend: "stable", value: 0 };
    }

    const firstValue = currentSubject.data[1].value_added_rate;
    const lastValue =
      currentSubject.data[currentSubject.data.length - 1].value_added_rate;
    const change = lastValue - firstValue;

    if (change > 0.05) return { trend: "up", value: change };
    if (change < -0.05) return { trend: "down", value: change };
    return { trend: "stable", value: change };
  };

  const trend = calculateTrend();

  return (
    <div className="space-y-6">
      {/* 头部信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <EntityIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {entityTypeLabel}历次追踪: {entityName}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  考试序列: {seriesName}
                </p>
              </div>
            </div>

            {/* 科目选择 */}
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem
                    key={subject.subject_name}
                    value={subject.subject_name}
                  >
                    {subject.subject_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* 整体趋势卡片 */}
      {currentSubject && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">整体趋势</div>
                  <div className="flex items-center gap-2 mt-2">
                    {trend.trend === "up" && (
                      <>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        <span className="text-2xl font-bold text-green-600">
                          上升
                        </span>
                      </>
                    )}
                    {trend.trend === "down" && (
                      <>
                        <TrendingDown className="h-5 w-5 text-red-600" />
                        <span className="text-2xl font-bold text-red-600">
                          下降
                        </span>
                      </>
                    )}
                    {trend.trend === "stable" && (
                      <>
                        <Minus className="h-5 w-5 text-gray-600" />
                        <span className="text-2xl font-bold text-gray-600">
                          稳定
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {(trend.value * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    增值率变化
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">当前排名</div>
              <div className="text-3xl font-bold mt-2">
                {currentSubject.data[currentSubject.data.length - 1].rank}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                共{" "}
                {
                  currentSubject.data[currentSubject.data.length - 1]
                    .total_count
                }{" "}
                名
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">最新增值率</div>
              <div className="text-3xl font-bold mt-2">
                {(
                  currentSubject.data[currentSubject.data.length - 1]
                    .value_added_rate * 100
                ).toFixed(1)}
                %
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {currentSubject.data[currentSubject.data.length - 1].exam_title}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">考试次数</div>
              <div className="text-3xl font-bold mt-2">
                {currentSubject.data.length}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                历次追踪分析
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 图表区域 */}
      {currentSubject && (
        <Card>
          <CardContent className="p-6">
            <Tabs defaultValue="value-added">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="value-added">增值率</TabsTrigger>
                <TabsTrigger value="metrics">核心指标</TabsTrigger>
                <TabsTrigger value="rank">排名变化</TabsTrigger>
                <TabsTrigger value="comparison">对比分析</TabsTrigger>
              </TabsList>

              {/* 增值率趋势图 */}
              <TabsContent value="value-added" className="space-y-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={currentSubject.data}>
                      <defs>
                        <linearGradient
                          id="valueAddedGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam_title" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          `${(value * 100).toFixed(0)}%`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          `${(value * 100).toFixed(2)}%`
                        }
                        labelStyle={{ color: "#000" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value_added_rate"
                        stroke="#3b82f6"
                        fill="url(#valueAddedGradient)"
                        strokeWidth={3}
                        name="增值率"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              {/* 核心指标图 */}
              <TabsContent value="metrics" className="space-y-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentSubject.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam_title" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          `${(value * 100).toFixed(0)}%`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          `${(value * 100).toFixed(2)}%`
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="consolidation_rate"
                        stroke="#10b981"
                        strokeWidth={2}
                        name="巩固率"
                      />
                      <Line
                        type="monotone"
                        dataKey="transformation_rate"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        name="转化率"
                      />
                      <Line
                        type="monotone"
                        dataKey="contribution_rate"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        name="贡献率"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              {/* 排名变化图 */}
              <TabsContent value="rank" className="space-y-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentSubject.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam_title" tick={{ fontSize: 12 }} />
                      <YAxis
                        reversed
                        tick={{ fontSize: 12 }}
                        domain={[1, "dataMax"]}
                        label={{
                          value: "排名（越小越好）",
                          angle: -90,
                          position: "insideLeft",
                        }}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="rank"
                        stroke="#ef4444"
                        strokeWidth={3}
                        name="排名"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              {/* 对比分析 */}
              <TabsContent value="comparison" className="space-y-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentSubject.data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="exam_title" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) =>
                          `${(value * 100).toFixed(0)}%`
                        }
                      />
                      <Tooltip
                        formatter={(value: number) =>
                          `${(value * 100).toFixed(2)}%`
                        }
                      />
                      <Legend />
                      <Bar
                        dataKey="value_added_rate"
                        fill="#3b82f6"
                        name="增值率"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 详细数据表格 */}
      {currentSubject && (
        <Card>
          <CardHeader>
            <CardTitle>详细数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold">考试</th>
                    <th className="pb-2 font-semibold">日期</th>
                    <th className="pb-2 font-semibold">增值率</th>
                    <th className="pb-2 font-semibold">巩固率</th>
                    <th className="pb-2 font-semibold">转化率</th>
                    <th className="pb-2 font-semibold">贡献率</th>
                    <th className="pb-2 font-semibold">排名</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSubject.data.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 font-medium">{item.exam_title}</td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(item.exam_date).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            item.value_added_rate > 0.1
                              ? "default"
                              : "secondary"
                          }
                        >
                          {(item.value_added_rate * 100).toFixed(2)}%
                        </Badge>
                      </td>
                      <td className="py-3">
                        {(item.consolidation_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-3">
                        {(item.transformation_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-3">
                        <span
                          className={
                            item.contribution_rate > 0
                              ? "text-green-600"
                              : item.contribution_rate < 0
                                ? "text-red-600"
                                : ""
                          }
                        >
                          {(item.contribution_rate * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline">
                          {item.rank}/{item.total_count}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TrackingDashboard;
