"use client";

/**
 * 班级历次分数分析(单科)报告
 * 追踪教学班单科目历次得分表现
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
  School,
  TrendingUp,
  TrendingDown,
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
  ReferenceLine,
} from "recharts";
import {
  fetchClassesWithHistory,
  fetchClassHistoricalData,
} from "@/services/historicalTrackingService";
import type { HistoricalTracking } from "@/types/valueAddedTypes";

interface ClassScoreTrendSingleReportProps {
  /** 是否显示加载状态 */
  loading?: boolean;
}

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

export function ClassScoreTrendSingleReport({
  loading: externalLoading = false,
}: ClassScoreTrendSingleReportProps) {
  const [classes, setClasses] = useState<
    Array<{
      class_name: string;
      subjects: string[];
    }>
  >([]);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [historicalData, setHistoricalData] =
    useState<HistoricalTracking | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载班级列表
  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      const data = await fetchClassesWithHistory();
      setClasses(data);

      if (data.length > 0) {
        setSelectedClassName(data[0].class_name);
        if (data[0].subjects.length > 0) {
          setSelectedSubject(data[0].subjects[0]);
        }
      }
      setLoading(false);
    }
    loadClasses();
  }, []);

  // 加载选中班级的历史数据
  useEffect(() => {
    async function loadHistoricalData() {
      if (!selectedClassName || !selectedSubject) {
        setHistoricalData(null);
        return;
      }

      setLoading(true);
      const data = await fetchClassHistoricalData(
        selectedClassName,
        selectedSubject
      );
      setHistoricalData(data);
      setLoading(false);
    }

    loadHistoricalData();
  }, [selectedClassName, selectedSubject]);

  // 当前选中班级的科目列表
  const availableSubjects = useMemo(() => {
    const classInfo = classes.find((c) => c.class_name === selectedClassName);
    return classInfo?.subjects || [];
  }, [classes, selectedClassName]);

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

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无班级历史数据</p>
        <p className="text-sm mt-2">请先创建多个增值活动以积累历史数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 班级和科目选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            班级和科目选择
          </CardTitle>
          <CardDescription>选择班级和科目查看历次分数走势</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">班级</label>
            <Select
              value={selectedClassName}
              onValueChange={setSelectedClassName}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择班级" />
              </SelectTrigger>
              <SelectContent>
                {classes
                  .filter((c) => c.class_name && c.class_name.trim())
                  .map((classInfo) => (
                    <SelectItem
                      key={classInfo.class_name}
                      value={classInfo.class_name}
                    >
                      {classInfo.class_name} (
                      {classInfo.subjects
                        .filter((s) => s && s.trim())
                        .join(", ")}
                      )
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
                {availableSubjects
                  .filter((subject) => subject && subject.trim())
                  .map((subject) => (
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
                <LineChartIcon className="h-5 w-5" />
                平均分走势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
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
                </LineChart>
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
                <LineChart data={chartData}>
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
                </LineChart>
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
                  <TableHead className="text-right">年级排名</TableHead>
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
                <strong>平均分</strong>:班级学生的出口平均分
              </li>
              <li>
                <strong>Z分变化</strong>:班级平均Z分数的变化,反映相对位置提升
              </li>
              <li>
                <strong>增值率</strong>:出口标准分相对入口标准分的增长比例
              </li>
              <li>
                <strong>年级排名</strong>:该班在年级中的排名位置
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
