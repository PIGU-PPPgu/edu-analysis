"use client";

/**
 * 全年级班级对比分析报告
 * 显示同一科目下所有班级的历次分数走势，支持班级筛选
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { School, TrendingUp, Filter } from "lucide-react";
import {
  fetchClassesWithHistory,
  fetchGradeHistoricalData,
} from "@/services/historicalTrackingService";
import type { HistoricalTracking } from "@/types/valueAddedTypes";

interface ClassScoreTrendGradeReportProps {
  loading?: boolean;
}

// 为每个班级分配不同颜色
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
];

export function ClassScoreTrendGradeReport({
  loading: externalLoading = false,
}: ClassScoreTrendGradeReportProps) {
  const [classes, setClasses] = useState<
    Array<{
      class_name: string;
      subjects: string[];
    }>
  >([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [gradeData, setGradeData] = useState<
    Record<string, HistoricalTracking>
  >({});
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  // 加载班级列表
  useEffect(() => {
    async function loadClasses() {
      setLoading(true);
      const data = await fetchClassesWithHistory();
      setClasses(data);

      if (data.length > 0 && data[0].subjects.length > 0) {
        setSelectedSubject(data[0].subjects[0]);
        // 默认选中所有班级
        setSelectedClasses(new Set(data.map((c) => c.class_name)));
      }
      setLoading(false);
    }
    loadClasses();
  }, []);

  // 获取所有科目（取并集）
  const availableSubjects = useMemo(() => {
    const subjectSet = new Set<string>();
    classes.forEach((c) =>
      c.subjects.forEach((s) => {
        if (s && s.trim()) subjectSet.add(s);
      })
    );
    return Array.from(subjectSet);
  }, [classes]);

  // 加载选中科目的所有班级数据
  useEffect(() => {
    async function loadGradeData() {
      if (!selectedSubject || classes.length === 0) {
        setGradeData({});
        return;
      }

      setLoading(true);
      const dataMap: Record<string, HistoricalTracking> = {};

      // 并行加载所有班级的数据
      await Promise.all(
        classes.map(async (classInfo) => {
          if (classInfo.subjects.includes(selectedSubject)) {
            const data = await fetchGradeHistoricalData(
              classInfo.class_name,
              selectedSubject
            );
            if (data && data.score_trend.length > 0) {
              dataMap[classInfo.class_name] = data;
            }
          }
        })
      );

      setGradeData(dataMap);
      setLoading(false);
    }

    loadGradeData();
  }, [selectedSubject, classes]);

  // 准备图表数据（合并所有班级的历次数据）
  const chartData = useMemo(() => {
    const classesWithData = Object.entries(gradeData).filter(([className]) =>
      selectedClasses.has(className)
    );

    if (classesWithData.length === 0) return [];

    // 收集所有考试时间点
    const examTitles = new Set<string>();
    classesWithData.forEach(([, data]) => {
      data.score_trend.forEach((point) => examTitles.add(point.exam_title));
    });

    // 为每个考试时间点构建数据
    return Array.from(examTitles).map((examTitle) => {
      const dataPoint: any = {
        exam: examTitle.slice(0, 10) + (examTitle.length > 10 ? "..." : ""),
        fullExamTitle: examTitle,
      };

      // 为每个选中的班级添加数据
      classesWithData.forEach(([className, data]) => {
        const point = data.score_trend.find((p) => p.exam_title === examTitle);
        if (point) {
          dataPoint[className] = point.avg_score;
          dataPoint[`${className}_增值率`] = point.value_added_rate * 100;
        }
      });

      return dataPoint;
    });
  }, [gradeData, selectedClasses]);

  // 班级筛选处理
  const handleClassToggle = (className: string, checked: boolean) => {
    const newSelected = new Set(selectedClasses);
    if (checked) {
      newSelected.add(className);
    } else {
      newSelected.delete(className);
    }
    setSelectedClasses(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedClasses(new Set(Object.keys(gradeData)));
  };

  const handleDeselectAll = () => {
    setSelectedClasses(new Set());
  };

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

  const classesWithData = Object.keys(gradeData);

  return (
    <div className="space-y-6">
      {/* 科目选择和筛选 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            全年级班级对比分析
          </CardTitle>
          <CardDescription>选择科目，对比所有班级的历次表现</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {classesWithData.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilter(!showFilter)}
              >
                <Filter className="h-4 w-4 mr-2" />
                筛选班级 ({selectedClasses.size}/{classesWithData.length})
              </Button>
              {showFilter && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    全选
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                    全不选
                  </Button>
                </>
              )}
            </div>
          )}

          {/* 班级筛选器 */}
          {showFilter && classesWithData.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {classesWithData.map((className, index) => (
                    <div key={className} className="flex items-center gap-2">
                      <Checkbox
                        id={`class-${className}`}
                        checked={selectedClasses.has(className)}
                        onCheckedChange={(checked) =>
                          handleClassToggle(className, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`class-${className}`}
                        className="text-sm cursor-pointer flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        {className}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 统计概览 */}
      {selectedClasses.size > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">对比班级数</div>
              <div className="text-2xl font-bold">{selectedClasses.size}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">考试次数</div>
              <div className="text-2xl font-bold">{chartData.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">最高平均分</div>
              <div className="text-2xl font-bold">
                {chartData.length > 0
                  ? Math.max(
                      ...Array.from(selectedClasses).flatMap((className) =>
                        chartData
                          .map((d) => d[className])
                          .filter((v) => v != null)
                      )
                    ).toFixed(1)
                  : "-"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">最低平均分</div>
              <div className="text-2xl font-bold">
                {chartData.length > 0
                  ? Math.min(
                      ...Array.from(selectedClasses).flatMap((className) =>
                        chartData
                          .map((d) => d[className])
                          .filter((v) => v != null)
                      )
                    ).toFixed(1)
                  : "-"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 平均分走势对比图 */}
      {chartData.length > 0 && selectedClasses.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              班级平均分走势对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
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
                {Array.from(selectedClasses).map((className, index) => (
                  <Line
                    key={className}
                    type="monotone"
                    dataKey={className}
                    name={className}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 增值率走势对比图 */}
      {chartData.length > 0 && selectedClasses.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              班级增值率走势对比
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
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullExamTitle;
                    }
                    return value;
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                {Array.from(selectedClasses).map((className, index) => (
                  <Line
                    key={className}
                    type="monotone"
                    dataKey={`${className}_增值率`}
                    name={`${className} 增值率`}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
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
                <strong>平均分走势</strong>: 显示各班级历次考试的平均分变化
              </li>
              <li>
                <strong>增值率走势</strong>:
                显示各班级的相对增长情况（相对于入口水平）
              </li>
              <li>
                <strong>班级筛选</strong>: 点击"筛选班级"可以选择要对比的班级
              </li>
              <li>
                <strong>颜色标识</strong>: 每个班级使用不同颜色的线条表示
              </li>
              <li>
                <strong>数据来源</strong>:
                基于已创建的增值活动，需要多次活动才能形成趋势
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
