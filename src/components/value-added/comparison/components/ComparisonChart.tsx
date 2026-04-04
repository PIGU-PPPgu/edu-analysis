"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, BookOpen } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Cell,
} from "recharts";
import type {
  TimePeriodData,
  ClassComparisonData,
  SubjectComparisonData,
  TeacherComparisonData,
} from "@/services/comparisonAnalysisService";
import type { ComparisonType } from "./ComparisonFilters";

interface ComparisonChartProps {
  comparisonType: ComparisonType;
  timeData: TimePeriodData[];
  classData: ClassComparisonData[];
  subjectData: SubjectComparisonData[];
  teacherData: TeacherComparisonData[];
  classComparisonTab: string;
  onClassTabChange: (v: string) => void;
}

export function ComparisonChart({
  comparisonType,
  timeData,
  classData,
  subjectData,
  teacherData,
  classComparisonTab,
  onClassTabChange,
}: ComparisonChartProps) {
  if (comparisonType === "time") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            时间趋势对比
          </CardTitle>
          <CardDescription>对比不同时间段的增值表现变化趋势</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">增值率趋势</h4>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "增值率(%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "平均分",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="valueAddedRate"
                  name="增值率"
                  fill="hsl(var(--chart-1))"
                >
                  {timeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.valueAddedRate >= 12
                          ? "#B9FF66"
                          : "hsl(var(--chart-1))"
                      }
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgScore"
                  name="平均分"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">巩固率 vs 转化率趋势</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consolidationRate"
                  name="巩固率"
                  stroke="hsl(var(--chart-gray))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="transformationRate"
                  name="转化率"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comparisonType === "class") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            班级横向对比
          </CardTitle>
          <CardDescription>
            对比各班级的增值表现，识别优秀班级和需要关注的班级
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={classComparisonTab} onValueChange={onClassTabChange}>
            <TabsList>
              <TabsTrigger value="value-added-rate">增值率对比</TabsTrigger>
              <TabsTrigger value="score-comparison">
                入口/出口分对比
              </TabsTrigger>
            </TabsList>
            <TabsContent value="value-added-rate" className="mt-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={classData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    label={{
                      value: "增值率(%)",
                      position: "insideBottom",
                      offset: -5,
                    }}
                  />
                  <YAxis type="category" dataKey="className" width={80} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine
                    x={12}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="3 3"
                    label="平均水平"
                  />
                  <Bar
                    dataKey="valueAddedRate"
                    name="增值率"
                    fill="hsl(var(--chart-1))"
                  >
                    {classData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.valueAddedRate >= 12
                            ? "#B9FF66"
                            : entry.valueAddedRate >= 10
                              ? "#3b82f6"
                              : "hsl(var(--chart-1))"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
            <TabsContent value="score-comparison" className="mt-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={classData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="className" />
                  <YAxis
                    label={{
                      value: "平均分",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="entryScore"
                    name="入口分"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="exitScore"
                    name="出口分"
                    fill="#B9FF66"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  if (comparisonType === "subject") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            学科横向对比
          </CardTitle>
          <CardDescription>
            对比各学科的增值表现，识别优势和薄弱学科
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">各学科增值率对比</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  label={{
                    value: "增值率(%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip />
                <Legend />
                <ReferenceLine
                  y={12}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label="平均水平"
                />
                <Bar
                  dataKey="valueAddedRate"
                  name="增值率"
                  fill="hsl(var(--chart-1))"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">入口分 vs 出口分对比</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="entryScore"
                  name="入口分"
                  stroke="hsl(var(--chart-gray))"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="exitScore"
                  name="出口分"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comparisonType === "teacher") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            教师横向对比
          </CardTitle>
          <CardDescription>对比同科目不同教师的增值表现</CardDescription>
        </CardHeader>
        <CardContent>
          <h4 className="text-sm font-semibold mb-3">教师综合能力对比</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teacherData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="valueAddedRate"
                name="增值率"
                fill="hsl(var(--chart-1))"
              />
              <Bar
                dataKey="consolidationRate"
                name="巩固率"
                fill="hsl(var(--chart-2))"
              />
              <Bar
                dataKey="transformationRate"
                name="转化率"
                fill="hsl(var(--chart-3))"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  return null;
}
