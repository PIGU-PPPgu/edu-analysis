"use client";

/**
 * 教师历次分数走势报告
 * 追踪教师历次均分、标准分、分数增值率的变化趋势
 */

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GradeLevelExplanation } from "@/components/common/GradeLevelExplanation";
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
import { LineChart, User, TrendingUp, TrendingDown, Award } from "lucide-react";
import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  fetchTeachersWithHistory,
  fetchTeacherHistoricalData,
} from "@/services/historicalTrackingService";
import type { HistoricalTracking } from "@/types/valueAddedTypes";

interface TeacherScoreTrendReportProps {
  /** 是否显示加载状态 */
  loading?: boolean;
}

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

export function TeacherScoreTrendReport({
  loading: externalLoading = false,
}: TeacherScoreTrendReportProps) {
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

  // 🔧 P0修复：教师切换时自动同步科目选择
  useEffect(() => {
    const teacher = teachers.find((t) => t.teacher_id === selectedTeacherId);
    if (teacher && teacher.subjects.length > 0) {
      // 如果当前选中的科目不在新教师的科目列表中，自动切换到第一个可用科目
      if (!teacher.subjects.includes(selectedSubject)) {
        setSelectedSubject(teacher.subjects[0]);
      }
    }
  }, [selectedTeacherId, teachers, selectedSubject]);

  // 当前选中教师的科目列表
  const availableSubjects = useMemo(() => {
    const teacher = teachers.find((t) => t.teacher_id === selectedTeacherId);
    return teacher?.subjects || [];
  }, [teachers, selectedTeacherId]);

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!historicalData) return [];

    return historicalData.score_trend.map((point, index) => ({
      exam: point.exam_title.slice(0, 8) + "...",
      fullExamTitle: point.exam_title,
      avgScore: point.avg_score,
      zScore: point.z_score,
      valueAddedRate: point.value_added_rate * 100,
      rank: point.rank,
      sequence: index + 1,
    }));
  }, [historicalData]);

  // 统计数据
  const statistics = useMemo(() => {
    if (!historicalData || historicalData.score_trend.length === 0) return null;

    const trends = historicalData.score_trend;
    const latest = trends[trends.length - 1];
    const previous = trends.length > 1 ? trends[trends.length - 2] : null;

    const avgScoreChange = previous ? latest.avg_score - previous.avg_score : 0;
    const avgValueAddedRate =
      trends.reduce((sum, t) => sum + t.value_added_rate, 0) / trends.length;
    const positiveCount = trends.filter((t) => t.value_added_rate > 0).length;

    return {
      totalExams: trends.length,
      latestAvgScore: safeToFixed(latest.avg_score, 1),
      latestValueAddedRate: safeToFixed(latest.value_added_rate * 100, 2),
      avgScoreChange: safeToFixed(avgScoreChange, 1),
      avgValueAddedRate: safeToFixed(avgValueAddedRate * 100, 2),
      positiveRate: ((positiveCount / trends.length) * 100).toFixed(1),
      latestRank: latest.rank,
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
          <CardDescription>选择教师和科目查看历次分数走势</CardDescription>
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
              <div className="text-sm text-muted-foreground">考试次数</div>
              <div className="text-2xl font-bold">{statistics.totalExams}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">最新平均分</div>
              <div className="text-2xl font-bold">
                {statistics.latestAvgScore}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                {parseFloat(statistics.avgScoreChange) > 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-green-600">
                      +{statistics.avgScoreChange}
                    </span>
                  </>
                ) : parseFloat(statistics.avgScoreChange) < 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span className="text-red-600">
                      {statistics.avgScoreChange}
                    </span>
                  </>
                ) : (
                  <span>持平</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">最新增值率</div>
              <div
                className={`text-2xl font-bold ${
                  parseFloat(statistics.latestValueAddedRate) > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {statistics.latestValueAddedRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均增值率</div>
              <div className="text-2xl font-bold">
                {statistics.avgValueAddedRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                增值占比: {statistics.positiveRate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 走势图 */}
      {chartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                平均分走势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLine data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam" />
                  <YAxis />
                  <Tooltip
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
                    dataKey="avgScore"
                    name="平均分"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </RechartsLine>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                分数增值率走势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLine data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullExamTitle;
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="valueAddedRate"
                    name="增值率(%)"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </RechartsLine>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* 详细数据表格 */}
      {historicalData && (
        <Card>
          <CardHeader>
            <CardTitle>历次考试详细数据</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>考试</TableHead>
                  <TableHead className="text-right">平均分</TableHead>
                  <TableHead className="text-right">Z分变化</TableHead>
                  <TableHead className="text-right">增值率</TableHead>
                  <TableHead className="text-right">排名</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalData.score_trend.map((point, index) => (
                  <TableRow key={point.exam_id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">第{index + 1}次</Badge>
                        <span>{point.exam_title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {safeToFixed(point.avg_score, 1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          point.z_score > 0
                            ? "text-green-600"
                            : point.z_score < 0
                              ? "text-red-600"
                              : ""
                        }
                      >
                        {point.z_score > 0 ? "+" : ""}
                        {safeToFixed(point.z_score, 3)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          point.value_added_rate > 0
                            ? "text-green-600 font-semibold"
                            : point.value_added_rate < 0
                              ? "text-red-600 font-semibold"
                              : ""
                        }
                      >
                        {safeToFixed(point.value_added_rate * 100, 2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {point.rank ? (
                        <Badge variant="secondary">#{point.rank}</Badge>
                      ) : (
                        "-"
                      )}
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
            <p className="font-semibold">报告说明:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>平均分</strong>:教师所教班级学生的出口平均分
              </li>
              <li>
                <strong>Z分变化</strong>:班级平均Z分数的变化,反映相对位置提升
              </li>
              <li>
                <strong>增值率</strong>:出口标准分相对入口标准分的增长比例
              </li>
              <li>
                <strong>数据来源</strong>
                :基于已创建的增值活动,需要多次活动才能形成趋势
              </li>
            </ul>
          </div>
          <GradeLevelExplanation className="mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
