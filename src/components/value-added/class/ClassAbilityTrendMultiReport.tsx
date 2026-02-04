"use client";

/**
 * 班级历次能力分析(多科)报告
 * 行政班各学科历次能力表现分析
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

interface ClassAbilityTrendMultiReportProps {
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

type MetricType = "consolidation" | "transformation" | "contribution";

export function ClassAbilityTrendMultiReport({
  loading: externalLoading = false,
}: ClassAbilityTrendMultiReportProps) {
  const [classes, setClasses] = useState<
    Array<{ class_name: string; subjects: string[] }>
  >([]);
  const [selectedClassName, setSelectedClassName] = useState<string>("");
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>("consolidation");
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
      data.ability_trend.forEach((point) => {
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
        const match = data.ability_trend.find(
          (p) => p.exam_id === exam.exam_id
        );
        if (match) {
          let value = 0;
          if (selectedMetric === "consolidation")
            value = (match.consolidation_rate || 0) * 100;
          else if (selectedMetric === "transformation")
            value = (match.transformation_rate || 0) * 100;
          else value = (match.contribution_rate || 0) * 100;
          row[subject] = value;
        } else {
          row[subject] = 0;
        }
      });
      return row;
    });
  }, [historicalDataMap, selectedMetric]);

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

  const metricLabels = {
    consolidation: "巩固率",
    transformation: "转化率",
    contribution: "贡献率",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            班级和指标选择
          </CardTitle>
          <CardDescription>
            选择行政班和能力指标查看各学科历次走势
          </CardDescription>
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
                {classes.map((classInfo) => (
                  <SelectItem
                    key={classInfo.class_name}
                    value={classInfo.class_name}
                  >
                    {classInfo.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">能力指标</label>
            <Select
              value={selectedMetric}
              onValueChange={(v: MetricType) => setSelectedMetric(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consolidation">巩固率</SelectItem>
                <SelectItem value="transformation">转化率</SelectItem>
                <SelectItem value="contribution">贡献率</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5" />
              各学科{metricLabels[selectedMetric]}走势对比
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
            <p className="font-semibold">能力指标说明:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>巩固率</strong>:入口和出口都保持在最高等级(A+)的学生比例
              </li>
              <li>
                <strong>转化率</strong>:等级相比入口有所提升的学生比例
              </li>
              <li>
                <strong>贡献率</strong>:对优秀学生增量的贡献程度
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
