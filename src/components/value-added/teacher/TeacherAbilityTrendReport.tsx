"use client";

/**
 * 教师历次能力走势报告
 * 追踪教师历次优秀率、贡献率、巩固率、转化率的变化
 */

import { useState, useEffect, useMemo } from "react";
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
  LineChart as LineChartIcon,
  User,
  Award,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  fetchTeachersWithHistory,
  fetchTeacherHistoricalData,
} from "@/services/historicalTrackingService";
import type { HistoricalTracking } from "@/types/valueAddedTypes";

interface TeacherAbilityTrendReportProps {
  /** 是否显示加载状态 */
  loading?: boolean;
}

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

export function TeacherAbilityTrendReport({
  loading: externalLoading = false,
}: TeacherAbilityTrendReportProps) {
  const [teachers, setTeachers] = useState<
    Array<{
      teacher_id: string;
      teacher_name: string;
      subjects: string[];
    }>
  >([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [historicalData, setHistoricalData] =
    useState<HistoricalTracking | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载教师列表
  useEffect(() => {
    async function loadTeachers() {
      setLoading(true);
      const data = await fetchTeachersWithHistory();
      setTeachers(data);

      if (data.length > 0) {
        setSelectedTeacherId(data[0].teacher_id);
        if (data[0].subjects.length > 0) {
          setSelectedSubject(data[0].subjects[0]);
        }
      }
      setLoading(false);
    }
    loadTeachers();
  }, []);

  // 加载选中教师的历史数据
  useEffect(() => {
    async function loadHistoricalData() {
      if (!selectedTeacherId || !selectedSubject) {
        setHistoricalData(null);
        return;
      }

      setLoading(true);
      const data = await fetchTeacherHistoricalData(
        selectedTeacherId,
        selectedSubject
      );
      setHistoricalData(data);
      setLoading(false);
    }

    loadHistoricalData();
  }, [selectedTeacherId, selectedSubject]);

  // 当前选中教师的科目列表
  const availableSubjects = useMemo(() => {
    const teacher = teachers.find((t) => t.teacher_id === selectedTeacherId);
    return teacher?.subjects || [];
  }, [teachers, selectedTeacherId]);

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!historicalData) return [];

    return historicalData.ability_trend.map((point, index) => ({
      exam: point.exam_title.slice(0, 8) + "...",
      fullExamTitle: point.exam_title,
      excellentRate: (point.excellent_rate || 0) * 100,
      consolidationRate: (point.consolidation_rate || 0) * 100,
      transformationRate: (point.transformation_rate || 0) * 100,
      contributionRate: (point.contribution_rate || 0) * 100,
      sequence: index + 1,
    }));
  }, [historicalData]);

  // 统计数据
  const statistics = useMemo(() => {
    if (!historicalData || historicalData.ability_trend.length === 0)
      return null;

    const trends = historicalData.ability_trend;
    const latest = trends[trends.length - 1];

    const avgExcellentRate =
      trends.reduce((sum, t) => sum + (t.excellent_rate || 0), 0) /
      trends.length;
    const avgConsolidationRate =
      trends.reduce((sum, t) => sum + (t.consolidation_rate || 0), 0) /
      trends.length;
    const avgTransformationRate =
      trends.reduce((sum, t) => sum + (t.transformation_rate || 0), 0) /
      trends.length;
    const avgContributionRate =
      trends.reduce((sum, t) => sum + (t.contribution_rate || 0), 0) /
      trends.length;

    return {
      totalExams: trends.length,
      latestExcellentRate: safeToFixed((latest.excellent_rate || 0) * 100, 1),
      latestConsolidationRate: safeToFixed(
        (latest.consolidation_rate || 0) * 100,
        1
      ),
      latestTransformationRate: safeToFixed(
        (latest.transformation_rate || 0) * 100,
        1
      ),
      latestContributionRate: safeToFixed(
        (latest.contribution_rate || 0) * 100,
        1
      ),
      avgExcellentRate: safeToFixed(avgExcellentRate * 100, 1),
      avgConsolidationRate: safeToFixed(avgConsolidationRate * 100, 1),
      avgTransformationRate: safeToFixed(avgTransformationRate * 100, 1),
      avgContributionRate: safeToFixed(avgContributionRate * 100, 1),
    };
  }, [historicalData]);

  if (externalLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无教师历史数据</p>
        <p className="text-sm mt-2">请先创建多个增值活动以积累历史数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 教师和科目选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            教师选择
          </CardTitle>
          <CardDescription>选择教师和科目查看历次能力走势</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">教师</label>
            <Select
              value={selectedTeacherId}
              onValueChange={setSelectedTeacherId}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择教师" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem
                    key={teacher.teacher_id}
                    value={teacher.teacher_id}
                  >
                    {teacher.teacher_name} ({teacher.subjects.join(", ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">科目</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 统计摘要 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-yellow-600" />
                <div className="text-sm text-muted-foreground">优秀率</div>
              </div>
              <div className="text-2xl font-bold">
                {statistics.latestExcellentRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                平均: {statistics.avgExcellentRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="h-4 w-4 text-green-600" />
                <div className="text-sm text-muted-foreground">巩固率</div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.latestConsolidationRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                平均: {statistics.avgConsolidationRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-muted-foreground">转化率</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.latestTransformationRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                平均: {statistics.avgTransformationRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-purple-600" />
                <div className="text-sm text-muted-foreground">贡献率</div>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {statistics.latestContributionRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                平均: {statistics.avgContributionRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 能力指标走势图 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              能力指标历次走势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="exam" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullExamTitle;
                    }
                    return value;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="excellentRate"
                  name="优秀率"
                  stroke="#eab308"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="consolidationRate"
                  name="巩固率"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="transformationRate"
                  name="转化率"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="contributionRate"
                  name="贡献率"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 详细数据表格 */}
      {historicalData && (
        <Card>
          <CardHeader>
            <CardTitle>历次考试能力详情</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>考试</TableHead>
                  <TableHead className="text-right">优秀率</TableHead>
                  <TableHead className="text-right">巩固率</TableHead>
                  <TableHead className="text-right">转化率</TableHead>
                  <TableHead className="text-right">贡献率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalData.ability_trend.map((point, index) => (
                  <TableRow key={point.exam_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">第{index + 1}次</Badge>
                        <span>{point.exam_title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-yellow-600 font-semibold">
                        {safeToFixed((point.excellent_rate || 0) * 100, 1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-green-600 font-semibold">
                        {safeToFixed((point.consolidation_rate || 0) * 100, 1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-blue-600 font-semibold">
                        {safeToFixed((point.transformation_rate || 0) * 100, 1)}
                        %
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-purple-600 font-semibold">
                        {safeToFixed((point.contribution_rate || 0) * 100, 1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 说明信息 */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold">能力指标说明:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>优秀率</strong>:出口等级为A+的学生比例
              </li>
              <li>
                <strong>巩固率</strong>:入口和出口都保持在最高等级(A+)的学生比例
              </li>
              <li>
                <strong>转化率</strong>:等级相比入口有所提升的学生比例
              </li>
              <li>
                <strong>贡献率</strong>:对优秀学生增量的贡献程度
              </li>
              <li>
                <strong>数据来源</strong>
                :基于已创建的增值活动,需要多次活动才能形成趋势
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
