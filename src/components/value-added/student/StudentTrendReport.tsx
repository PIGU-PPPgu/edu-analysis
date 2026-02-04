"use client";

/**
 * 单科学生历次表现报告
 * 追踪学生单科历次原始分、标准分、等级变化
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  Search,
  User,
  LineChart as LineChartIcon,
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
import { fetchStudentHistoricalData } from "@/services/historicalTrackingService";
import type { HistoricalTracking } from "@/types/valueAddedTypes";

interface StudentTrendReportProps {
  loading?: boolean;
}

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value)))
    return "0." + "0".repeat(decimals);
  return Number(value).toFixed(decimals);
};

export function StudentTrendReport({
  loading: externalLoading = false,
}: StudentTrendReportProps) {
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [historicalData, setHistoricalData] =
    useState<HistoricalTracking | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!studentId || !subject) return;
    setLoading(true);
    const data = await fetchStudentHistoricalData(studentId, subject);
    setHistoricalData(data);
    setLoading(false);
  };

  const chartData = useMemo(() => {
    if (!historicalData) return [];
    return historicalData.score_trend.map((point, index) => ({
      exam: point.exam_title.slice(0, 8) + "...",
      fullExamTitle: point.exam_title,
      avgScore: point.avg_score,
      zScore: point.z_score,
      valueAddedRate: point.value_added_rate * 100,
      sequence: index + 1,
    }));
  }, [historicalData]);

  const statistics = useMemo(() => {
    if (!historicalData || historicalData.score_trend.length === 0) return null;
    const trends = historicalData.score_trend;
    const latest = trends[trends.length - 1];
    const previous = trends.length > 1 ? trends[trends.length - 2] : null;
    const avgScoreChange = previous ? latest.avg_score - previous.avg_score : 0;
    const avgValueAddedRate =
      trends.reduce((sum, t) => sum + t.value_added_rate, 0) / trends.length;

    return {
      totalExams: trends.length,
      latestAvgScore: safeToFixed(latest.avg_score, 1),
      latestValueAddedRate: safeToFixed(latest.value_added_rate * 100, 2),
      avgScoreChange: safeToFixed(avgScoreChange, 1),
      avgValueAddedRate: safeToFixed(avgValueAddedRate * 100, 2),
    };
  }, [historicalData]);

  if (externalLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            学生查询
          </CardTitle>
          <CardDescription>输入学号和科目查询学生历次表现</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">学号</label>
              <Input
                placeholder="输入学号"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">科目</label>
              <Input
                placeholder="输入科目(如:数学)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                查询
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <div className="text-sm text-muted-foreground">最新得分</div>
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
                className={`text-2xl font-bold ${parseFloat(statistics.latestValueAddedRate) > 0 ? "text-green-600" : "text-red-600"}`}
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
            </CardContent>
          </Card>
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5" />
                得分走势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam" />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value, payload) =>
                      payload?.[0]?.payload?.fullExamTitle || value
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    name="得分"
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
              <CardTitle>历次详细数据</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>考试</TableHead>
                    <TableHead className="text-right">得分</TableHead>
                    <TableHead className="text-right">Z分数</TableHead>
                    <TableHead className="text-right">增值率</TableHead>
                    <TableHead className="text-right">班级排名</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalData?.score_trend.map((point, index) => (
                    <TableRow key={point.exam_id}>
                      <TableCell>
                        <Badge variant="outline">第{index + 1}次</Badge>{" "}
                        {point.exam_title}
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
        </>
      )}

      {!historicalData && !loading && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>请输入学号和科目进行查询</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
