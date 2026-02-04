"use client";

/**
 * 各学科能力增值对比报告
 * 横向对比行政班各学科的能力增值表现
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, School, Award, Target, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { ClassValueAdded } from "@/types/valueAddedTypes";

interface SubjectAbilityComparisonReportProps {
  /** 班级增值数据 */
  classData: ClassValueAdded[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

export function SubjectAbilityComparisonReport({
  classData,
  loading = false,
}: SubjectAbilityComparisonReportProps) {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [chartType, setChartType] = useState<"bar" | "radar">("bar");

  // 提取可用班级列表
  const availableClasses = useMemo(() => {
    const classes = Array.from(
      new Set(classData.map((d) => d.class_name))
    ).sort();
    return classes;
  }, [classData]);

  // 自动选择第一个班级
  useMemo(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  // 获取选中班级的数据
  const selectedClassData = useMemo(() => {
    if (!selectedClass) return [];
    return classData.filter((d) => d.class_name === selectedClass);
  }, [classData, selectedClass]);

  // 准备柱状图数据
  const barData = useMemo(() => {
    return selectedClassData.map((d) => ({
      subject: d.subject,
      consolidation_rate: d.consolidation_rate * 100,
      transformation_rate: d.transformation_rate * 100,
      contribution_rate: d.contribution_rate * 100,
    }));
  }, [selectedClassData]);

  // 准备雷达图数据
  const radarData = useMemo(() => {
    return selectedClassData.map((d) => ({
      subject: d.subject,
      巩固率: d.consolidation_rate * 100,
      转化率: d.transformation_rate * 100,
      贡献率: d.contribution_rate * 100,
    }));
  }, [selectedClassData]);

  // 统计数据
  const statistics = useMemo(() => {
    if (selectedClassData.length === 0) return null;

    const avgConsolidation =
      selectedClassData.reduce((sum, d) => sum + d.consolidation_rate, 0) /
      selectedClassData.length;
    const avgTransformation =
      selectedClassData.reduce((sum, d) => sum + d.transformation_rate, 0) /
      selectedClassData.length;
    const avgContribution =
      selectedClassData.reduce((sum, d) => sum + d.contribution_rate, 0) /
      selectedClassData.length;

    const maxConsolidation = [...selectedClassData].sort(
      (a, b) => b.consolidation_rate - a.consolidation_rate
    )[0];
    const maxTransformation = [...selectedClassData].sort(
      (a, b) => b.transformation_rate - a.transformation_rate
    )[0];
    const maxContribution = [...selectedClassData].sort(
      (a, b) => b.contribution_rate - a.contribution_rate
    )[0];

    return {
      avgConsolidation: safeToFixed(avgConsolidation * 100, 1),
      avgTransformation: safeToFixed(avgTransformation * 100, 1),
      avgContribution: safeToFixed(avgContribution * 100, 1),
      maxConsolidation: {
        subject: maxConsolidation.subject,
        rate: safeToFixed(maxConsolidation.consolidation_rate * 100, 1),
      },
      maxTransformation: {
        subject: maxTransformation.subject,
        rate: safeToFixed(maxTransformation.transformation_rate * 100, 1),
      },
      maxContribution: {
        subject: maxContribution.subject,
        rate: safeToFixed(maxContribution.contribution_rate * 100, 1),
      },
    };
  }, [selectedClassData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (classData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无班级增值数据</p>
        <p className="text-sm mt-2">
          请先在"增值活动"标签页中创建活动并点击"开始计算"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 班级选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            班级选择
          </CardTitle>
          <CardDescription>选择行政班查看各学科能力增值对比</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent>
              {availableClasses.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 统计摘要 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-green-600" />
                <div className="text-sm text-muted-foreground">平均巩固率</div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.avgConsolidation}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                最高: {statistics.maxConsolidation.subject} (
                {statistics.maxConsolidation.rate}%)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-muted-foreground">平均转化率</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.avgTransformation}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                最高: {statistics.maxTransformation.subject} (
                {statistics.maxTransformation.rate}%)
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-600" />
                <div className="text-sm text-muted-foreground">平均贡献率</div>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {statistics.avgContribution}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                最高: {statistics.maxContribution.subject} (
                {statistics.maxContribution.rate}%)
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 图表切换和展示 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              各学科能力增值对比
            </CardTitle>
            <div className="flex gap-2">
              <Badge
                variant={chartType === "bar" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setChartType("bar")}
              >
                柱状图
              </Badge>
              <Badge
                variant={chartType === "radar" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setChartType("radar")}
              >
                雷达图
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartType === "bar" ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis
                  label={{
                    value: "百分比(%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Bar
                  dataKey="consolidation_rate"
                  name="巩固率"
                  fill="#22c55e"
                />
                <Bar
                  dataKey="transformation_rate"
                  name="转化率"
                  fill="#3b82f6"
                />
                <Bar dataKey="contribution_rate" name="贡献率" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="巩固率"
                  dataKey="巩固率"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                />
                <Radar
                  name="转化率"
                  dataKey="转化率"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Radar
                  name="贡献率"
                  dataKey="贡献率"
                  stroke="#a855f7"
                  fill="#a855f7"
                  fillOpacity={0.3}
                />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 详细数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>各学科能力增值详情</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>科目</TableHead>
                <TableHead className="text-right">巩固率</TableHead>
                <TableHead className="text-right">转化率</TableHead>
                <TableHead className="text-right">贡献率</TableHead>
                <TableHead className="text-right">入口优秀数</TableHead>
                <TableHead className="text-right">出口优秀数</TableHead>
                <TableHead className="text-right">优秀增量</TableHead>
                <TableHead className="text-right">学生数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedClassData.map((subject) => (
                <TableRow key={subject.subject}>
                  <TableCell className="font-medium">
                    {subject.subject}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-green-600 font-semibold">
                      {safeToFixed(subject.consolidation_rate * 100, 1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-blue-600 font-semibold">
                      {safeToFixed(subject.transformation_rate * 100, 1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-purple-600 font-semibold">
                      {safeToFixed(subject.contribution_rate * 100, 1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {subject.entry_excellent_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {subject.exit_excellent_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        subject.excellent_gain > 0
                          ? "text-green-600 font-semibold"
                          : subject.excellent_gain < 0
                            ? "text-red-600 font-semibold"
                            : ""
                      }
                    >
                      {subject.excellent_gain > 0 ? "+" : ""}
                      {subject.excellent_gain}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {subject.total_students}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 说明信息 */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold">能力指标说明:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>巩固率</strong>:
                入口和出口都保持在最高等级(A+)的学生比例
              </li>
              <li>
                <strong>转化率</strong>: 等级相比入口有所提升的学生比例
              </li>
              <li>
                <strong>贡献率</strong>: 对优秀学生增量的贡献程度
              </li>
              <li>
                <strong>优秀增量</strong>: 出口优秀人数相比入口优秀人数的变化
              </li>
              <li>
                <strong>综合评价</strong>:
                巩固率、转化率、贡献率越高,说明该学科教学质量越好
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
