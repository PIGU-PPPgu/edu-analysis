/**
 * 班级历史趋势分析组件 - 显示班级历次考试的变化趋势
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExamTrend {
  examTitle: string;
  examDate: string;
  averageScore: number;
  passRate: number;
  excellentRate: number;
  studentCount: number;
  highestScore: number;
  lowestScore: number;
}

interface ClassTrendAnalysisProps {
  className: string;
  limit?: number; // 显示最近几次考试，默认5次
}

export function ClassTrendAnalysis({
  className,
  limit = 5,
}: ClassTrendAnalysisProps) {
  const [trends, setTrends] = useState<ExamTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [improvementRate, setImprovementRate] = useState<number | null>(null);

  useEffect(() => {
    loadTrendData();
  }, [className, limit]);

  const loadTrendData = async () => {
    if (!className) return;

    setIsLoading(true);
    try {
      // 1. 获取该班级最近的考试记录
      const { data: exams, error: examsError } = await supabase
        .from("grade_data")
        .select("exam_id, exam_title, exam_date")
        .eq("class_name", className)
        .not("exam_date", "is", null)
        .order("exam_date", { ascending: false });

      if (examsError) {
        console.error("获取考试列表失败:", examsError);
        return;
      }

      if (!exams || exams.length === 0) {
        return;
      }

      // 2. 去重并取最近的N次考试
      const uniqueExams = Array.from(
        new Map(exams.map((e: any) => [e.exam_id, e])).values()
      ).slice(0, limit);

      // 3. 获取每次考试的统计数据
      const trendData: ExamTrend[] = [];

      for (const exam of uniqueExams) {
        const { data: grades, error } = await supabase
          .from("grade_data")
          .select("total_score")
          .eq("class_name", className)
          .eq("exam_id", exam.exam_id)
          .not("total_score", "is", null);

        if (error || !grades || grades.length === 0) continue;

        const scores = grades.map((g: any) => g.total_score);
        const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const passCount = scores.filter((s) => s >= 60).length;
        const excellentCount = scores.filter((s) => s >= 85).length;

        trendData.push({
          examTitle: exam.exam_title || "未命名考试",
          examDate: new Date(exam.exam_date).toLocaleDateString("zh-CN"),
          averageScore: Math.round(average * 10) / 10,
          passRate: Math.round((passCount / scores.length) * 100),
          excellentRate: Math.round((excellentCount / scores.length) * 100),
          studentCount: scores.length,
          highestScore: Math.max(...scores),
          lowestScore: Math.min(...scores),
        });
      }

      // 4. 按时间正序排列（从远到近）
      trendData.reverse();

      // 5. 计算整体进步率
      if (trendData.length >= 2) {
        const latest = trendData[trendData.length - 1];
        const first = trendData[0];
        const rate =
          ((latest.averageScore - first.averageScore) / first.averageScore) *
          100;
        setImprovementRate(Math.round(rate * 10) / 10);
      }

      setTrends(trendData);
    } catch (error) {
      console.error("加载趋势数据异常:", error);
      toast.error("加载趋势数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  const getTrendIcon = () => {
    if (improvementRate === null) return null;
    if (improvementRate > 0)
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (improvementRate < 0)
      return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (improvementRate === null) return "text-gray-600";
    if (improvementRate > 0) return "text-green-600";
    if (improvementRate < 0) return "text-red-600";
    return "text-gray-600";
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>历史趋势分析</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>暂无历史考试数据</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>历史趋势分析</span>
          {improvementRate !== null && (
            <Badge
              variant="outline"
              className={`flex items-center space-x-1 ${getTrendColor()}`}
            >
              {getTrendIcon()}
              <span>
                {improvementRate > 0 ? "+" : ""}
                {improvementRate}%
              </span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 平均分趋势线 */}
        <div>
          <h3 className="text-sm font-medium mb-4">平均分趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trends}>
              <defs>
                <linearGradient id="colorAverage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="examDate" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="averageScore"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorAverage)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 及格率和优秀率趋势 */}
        <div>
          <h3 className="text-sm font-medium mb-4">及格率与优秀率趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="examDate" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="passRate"
                stroke="#10b981"
                strokeWidth={2}
                name="及格率(%)"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="excellentRate"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="优秀率(%)"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 最高分和最低分趋势 */}
        <div>
          <h3 className="text-sm font-medium mb-4">分数区间趋势</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="examDate" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="highestScore"
                stroke="#f59e0b"
                strokeWidth={2}
                name="最高分"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="lowestScore"
                stroke="#ef4444"
                strokeWidth={2}
                name="最低分"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="averageScore"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="平均分"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 数据详情表格 */}
        <div>
          <h3 className="text-sm font-medium mb-4">历次考试详情</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">考试</th>
                  <th className="px-4 py-2 text-left">日期</th>
                  <th className="px-4 py-2 text-right">平均分</th>
                  <th className="px-4 py-2 text-right">及格率</th>
                  <th className="px-4 py-2 text-right">优秀率</th>
                  <th className="px-4 py-2 text-right">最高分</th>
                  <th className="px-4 py-2 text-right">最低分</th>
                </tr>
              </thead>
              <tbody>
                {trends.map((trend, index) => (
                  <tr
                    key={index}
                    className={`border-t ${
                      index === trends.length - 1
                        ? "bg-blue-50 font-medium"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-2">{trend.examTitle}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {trend.examDate}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {trend.averageScore}
                    </td>
                    <td className="px-4 py-2 text-right">{trend.passRate}%</td>
                    <td className="px-4 py-2 text-right">
                      {trend.excellentRate}%
                    </td>
                    <td className="px-4 py-2 text-right text-orange-600">
                      {trend.highestScore}
                    </td>
                    <td className="px-4 py-2 text-right text-red-600">
                      {trend.lowestScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
