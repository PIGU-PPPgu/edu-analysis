"use client";

/**
 * 班级历次分数分析(多科)报告
 * 行政班各学科历次得分表现分析
 */

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { School, LineChart as LineChartIcon } from "lucide-react";
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
  fetchClassesWithHistory,
  fetchClassHistoricalData,
} from "@/services/historicalTrackingService";
import type { HistoricalTracking } from "@/types/valueAddedTypes";

interface ClassScoreTrendMultiReportProps {
  loading?: boolean;
}

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

export function ClassScoreTrendMultiReport({
  loading: externalLoading = false,
}: ClassScoreTrendMultiReportProps) {
  const [classes, setClasses] = useState<
    Array<{ class_name: string; subjects: string[] }>
  >([]);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [historicalDataMap, setHistoricalDataMap] = useState<
    Map<string, HistoricalTracking>
  >(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      const data = await fetchClassesWithHistory();
      setClasses(data);
      if (data.length > 0) setSelectedClassName(data[0].class_name);
      setLoading(false);
    }
    loadClasses();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAllSubjects() {
      if (!selectedClassName) return;
      const classInfo = classes.find((c) => c.class_name === selectedClassName);
      if (!classInfo) return;

      setLoading(true);
      const map = new Map<string, HistoricalTracking>();

      // 并行加载所有科目数据
      await Promise.all(
        classInfo.subjects.map(async (subject) => {
          const data = await fetchClassHistoricalData(
            selectedClassName,
            subject
          );
          if (data && !cancelled) map.set(subject, data);
        })
      );

      if (!cancelled) {
        setHistoricalDataMap(map);
        setLoading(false);
      }
    }

    loadAllSubjects();
    return () => {
      cancelled = true;
    };
  }, [selectedClassName, classes]);

  // 按exam_id对齐数据（修复索引对齐问题）
  const chartData = useMemo(() => {
    if (historicalDataMap.size === 0) return [];

    // 收集所有唯一的考试
    const examMap = new Map<
      string,
      { exam_id: string; exam: string; fullExamTitle: string }
    >();
    historicalDataMap.forEach((data) => {
      data.score_trend.forEach((point) => {
        if (!examMap.has(point.exam_id)) {
          examMap.set(point.exam_id, {
            exam_id: point.exam_id,
            exam: point.exam_title.slice(0, 8) + "...",
            fullExamTitle: point.exam_title,
          });
        }
      });
    });

    // 按exam_id对齐各科目数据
    return Array.from(examMap.values()).map((exam) => {
      const row: Record<string, number | string> = { ...exam };
      historicalDataMap.forEach((data, subject) => {
        const match = data.score_trend.find((p) => p.exam_id === exam.exam_id);
        row[subject] = match ? match.value_added_rate * 100 : 0;
      });
      return row;
    });
  }, [historicalDataMap]);

  if (externalLoading || loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无班级历史数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            班级选择
          </CardTitle>
          <CardDescription>选择行政班查看各学科历次分数走势</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedClassName}
            onValueChange={setSelectedClassName}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((classInfo) => (
                <SelectItem
                  key={classInfo.class_name}
                  value={classInfo.class_name}
                >
                  {classInfo.class_name} ({classInfo.subjects.length}个科目)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              各学科增值率走势对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="exam" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                  labelFormatter={(value, payload) =>
                    payload?.[0]?.payload?.fullExamTitle || value
                  }
                />
                <Legend />
                {Array.from(historicalDataMap.keys()).map((subject, index) => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold">报告说明:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>多科对比</strong>:横向对比行政班各学科的历次增值率走势
              </li>
              <li>
                <strong>增值率</strong>:出口标准分相对入口标准分的增长比例
              </li>
              <li>
                <strong>应用场景</strong>:发现学科间差异,识别需要重点关注的科目
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
