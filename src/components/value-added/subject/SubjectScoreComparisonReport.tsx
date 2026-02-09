"use client";

/**
 * 各学科分数增值对比报告
 * 横向对比行政班各学科的分数增值表现
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
import {
  BarChart,
  PieChart,
  TrendingUp,
  TrendingDown,
  School,
} from "lucide-react";
import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart as RechartsPie,
  Pie,
} from "recharts";
import type {
  ClassValueAdded,
  SubjectBalanceAnalysis,
} from "@/types/valueAddedTypes";
import { safeToFixed, safePercent, safeNumber } from "@/utils/formatUtils";

interface SubjectScoreComparisonReportProps {
  /** 班级增值数据 */
  classData: ClassValueAdded[];

  /** 学科均衡分析数据 */
  subjectBalanceData: SubjectBalanceAnalysis[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

export function SubjectScoreComparisonReport({
  classData,
  subjectBalanceData,
  loading = false,
}: SubjectScoreComparisonReportProps) {
  const [selectedClass, setSelectedClass] = useState<string>("");

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

  // 获取选中班级的均衡分析数据
  const selectedBalanceData = useMemo(() => {
    if (!selectedClass) return null;
    return subjectBalanceData.find((d) => d.class_name === selectedClass);
  }, [subjectBalanceData, selectedClass]);

  // 准备柱状图数据
  const barData = useMemo(() => {
    return selectedClassData
      .map((d) => ({
        subject: d.subject,
        value_added_rate: d.avg_score_value_added_rate,
        progress_ratio: d.progress_student_ratio,
        isPositive: d.avg_score_value_added_rate > 0,
      }))
      .sort((a, b) => b.value_added_rate - a.value_added_rate);
  }, [selectedClassData]);

  // 统计数据
  const statistics = useMemo(() => {
    if (selectedClassData.length === 0) return null;

    const avgValueAddedRate =
      selectedClassData.reduce(
        (sum, d) => sum + d.avg_score_value_added_rate,
        0
      ) / selectedClassData.length;
    const positiveSubjects = selectedClassData.filter(
      (d) => d.avg_score_value_added_rate > 0
    ).length;
    const totalSubjects = selectedClassData.length;
    const maxSubject = [...selectedClassData].sort(
      (a, b) => b.avg_score_value_added_rate - a.avg_score_value_added_rate
    )[0];
    const minSubject = [...selectedClassData].sort(
      (a, b) => a.avg_score_value_added_rate - b.avg_score_value_added_rate
    )[0];

    return {
      avgValueAddedRate: safeToFixed(avgValueAddedRate, 3),
      positiveSubjects,
      totalSubjects,
      positiveRate: ((positiveSubjects / totalSubjects) * 100).toFixed(1),
      maxSubject: {
        name: maxSubject.subject,
        rate: safeToFixed(maxSubject.avg_score_value_added_rate, 3),
      },
      minSubject: {
        name: minSubject.subject,
        rate: safeToFixed(minSubject.avg_score_value_added_rate, 3),
      },
    };
  }, [selectedClassData]);

  // 准备饼图数据
  const pieData = useMemo(() => {
    const positive = selectedClassData.filter(
      (d) => d.avg_score_value_added_rate > 0
    ).length;
    const negative = selectedClassData.filter(
      (d) => d.avg_score_value_added_rate < 0
    ).length;
    const neutral = selectedClassData.filter(
      (d) => d.avg_score_value_added_rate === 0
    ).length;

    return [
      { name: "增值", value: positive, color: "#B9FF66" },
      { name: "退步", value: negative, color: "#f87171" },
      { name: "持平", value: neutral, color: "#94a3b8" },
    ].filter((item) => item.value > 0);
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
          <CardDescription>选择行政班查看各学科分数增值对比</CardDescription>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均增值率</div>
              <div className="text-2xl font-bold">
                {statistics.avgValueAddedRate}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">增值科目占比</div>
              <div className="text-2xl font-bold" style={{ color: "#B9FF66" }}>
                {statistics.positiveRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                {statistics.positiveSubjects}/{statistics.totalSubjects}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">增值最高科目</div>
              <div className="text-lg font-bold" style={{ color: "#B9FF66" }}>
                {statistics.maxSubject.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {statistics.maxSubject.rate}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">需关注科目</div>
              <div className="text-lg font-bold" style={{ color: "#f87171" }}>
                {statistics.minSubject.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {statistics.minSubject.rate}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 图表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 柱状图 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              各学科分数增值率对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RechartsBar data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis
                  label={{
                    value: "增值率",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                />
                <Tooltip
                  formatter={(value: number) => `${(value * 100).toFixed(2)}%`}
                  labelFormatter={(label) => `科目: ${label}`}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Bar dataKey="value_added_rate" name="增值率">
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPositive ? "#B9FF66" : "#f87171"}
                    />
                  ))}
                </Bar>
              </RechartsBar>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 饼图 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              增值分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RechartsPie>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name} ${entry.value}`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 详细数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>各学科详细数据</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>科目</TableHead>
                <TableHead className="text-right">平均增值率</TableHead>
                <TableHead className="text-right">进步学生占比</TableHead>
                <TableHead className="text-right">平均Z分变化</TableHead>
                <TableHead className="text-right">巩固率</TableHead>
                <TableHead className="text-right">转化率</TableHead>
                <TableHead className="text-right">学生数</TableHead>
                <TableHead className="text-right">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedClassData
                .sort(
                  (a, b) =>
                    b.avg_score_value_added_rate - a.avg_score_value_added_rate
                )
                .map((subject) => (
                  <TableRow key={subject.subject}>
                    <TableCell className="font-medium">
                      {subject.subject}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          style={{
                            color:
                              subject.avg_score_value_added_rate > 0
                                ? "#B9FF66"
                                : subject.avg_score_value_added_rate < 0
                                  ? "#f87171"
                                  : undefined,
                            fontWeight:
                              subject.avg_score_value_added_rate !== 0
                                ? 600
                                : undefined,
                          }}
                        >
                          {safeToFixed(
                            subject.avg_score_value_added_rate * 100,
                            2
                          )}
                          %
                        </span>
                        {subject.avg_score_value_added_rate > 0 ? (
                          <TrendingUp
                            className="h-4 w-4"
                            style={{ color: "#B9FF66" }}
                          />
                        ) : subject.avg_score_value_added_rate < 0 ? (
                          <TrendingDown
                            className="h-4 w-4"
                            style={{ color: "#f87171" }}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {safeToFixed(subject.progress_student_ratio * 100, 1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {safeToFixed(subject.avg_z_score_change, 3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {safeToFixed(subject.consolidation_rate * 100, 1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {safeToFixed(subject.transformation_rate * 100, 1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {subject.total_students}
                    </TableCell>
                    <TableCell className="text-right">
                      {subject.avg_score_value_added_rate > 0.02 ? (
                        <Badge className="bg-green-500">优秀</Badge>
                      ) : subject.avg_score_value_added_rate > 0 ? (
                        <Badge variant="default">良好</Badge>
                      ) : subject.avg_score_value_added_rate > -0.02 ? (
                        <Badge variant="secondary">一般</Badge>
                      ) : (
                        <Badge variant="destructive">需关注</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 学科均衡分析 */}
      {selectedBalanceData && (
        <Card>
          <CardHeader>
            <CardTitle>学科发展均衡分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">总体增值率</div>
                <div className="text-xl font-bold">
                  {safeToFixed(
                    selectedBalanceData.total_score_value_added_rate * 100,
                    2
                  )}
                  %
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">学科偏离度</div>
                <div className="text-xl font-bold">
                  {safeToFixed(selectedBalanceData.subject_deviation, 3)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">均衡评分</div>
                <div className="text-xl font-bold">
                  {safeToFixed(selectedBalanceData.balance_score, 1)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">各科目偏离情况:</p>
              {selectedBalanceData.subjects.map((subject) => (
                <div
                  key={subject.subject}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded"
                >
                  <span className="font-medium">{subject.subject}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      增值率: {safeToFixed(subject.value_added_rate * 100, 2)}%
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        color:
                          Math.abs(subject.deviation_from_avg) > 0.05
                            ? "#f87171"
                            : "#B9FF66",
                        fontWeight:
                          Math.abs(subject.deviation_from_avg) > 0.05
                            ? 600
                            : undefined,
                      }}
                    >
                      偏离: {subject.deviation_from_avg > 0 ? "+" : ""}
                      {safeToFixed(subject.deviation_from_avg * 100, 2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 说明信息 */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold">报告说明:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>增值率</strong>
                :班级平均出口标准分相对入口标准分的增长比例
              </li>
              <li>
                <strong>进步学生占比</strong>:出口分高于入口分的学生比例
              </li>
              <li>
                <strong>Z分变化</strong>:班级平均Z分数的变化,反映相对位置的提升
              </li>
              <li>
                <strong>学科偏离度</strong>
                :各学科增值率与总体增值率的差异程度,值越小说明发展越均衡
              </li>
              <li>
                <strong>均衡评分</strong>:综合评价学科发展的均衡性,满分100分
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
