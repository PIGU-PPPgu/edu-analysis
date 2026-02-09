"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import type { ClassValueAdded } from "@/types/valueAddedTypes";

interface EnhancedClassValueAddedReportProps {
  data: ClassValueAdded[];
  loading?: boolean;
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));
const toPercentValue = (ratio: number | undefined, digits = 1) =>
  Number(((ratio ?? 0) * 100).toFixed(digits));

export function EnhancedClassValueAddedReport({
  data,
  loading = false,
}: EnhancedClassValueAddedReportProps) {
  // 1. 科目筛选
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const subjects = useMemo(() => {
    return Array.from(new Set(data.map((item) => item.subject))).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedSubject === "all") return data;
    return data.filter((item) => item.subject === selectedSubject);
  }, [data, selectedSubject]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort(
      (a, b) => b.avg_score_value_added_rate - a.avg_score_value_added_rate
    );
  }, [filteredData]);

  // 2. 统计卡片
  const statistics = useMemo(() => {
    if (filteredData.length === 0) return null;

    const totalStudents = filteredData.reduce(
      (sum, item) => sum + item.total_students,
      0
    );
    const avgValueAddedRate =
      filteredData.reduce(
        (sum, item) => sum + item.avg_score_value_added_rate,
        0
      ) / filteredData.length;
    const positiveCount = filteredData.filter(
      (item) => item.avg_score_value_added_rate > 0
    ).length;

    return {
      totalClasses: filteredData.length,
      totalStudents,
      avgValueAddedRate,
      positiveCount,
      negativeCount: filteredData.length - positiveCount,
    };
  }, [filteredData]);

  // 4. 图表1：增值率双向条形图
  const valueAddedChartData = useMemo(() => {
    return sortedData.map((item) => {
      const rate = Number((item.avg_score_value_added_rate * 100).toFixed(2));
      return {
        className: item.class_name,
        subject: item.subject,
        positiveRate: rate > 0 ? rate : 0,
        negativeRate: rate < 0 ? rate : 0,
        totalStudents: item.total_students,
      };
    });
  }, [sortedData]);

  // 5. 图表2：入口出口标准分对比
  const standardScoreChartData = useMemo(() => {
    return sortedData.map((item) => ({
      className: item.class_name,
      entryStandardScore: Number(
        (item.avg_score_standard_entry ?? 0).toFixed(2)
      ),
      exitStandardScore: Number((item.avg_score_standard_exit ?? 0).toFixed(2)),
    }));
  }, [sortedData]);

  // 6. 图表3：进步人数占比堆叠条形图
  const progressChartData = useMemo(() => {
    return sortedData.map((item) => {
      const progressRate = clampPercent(
        toPercentValue(item.progress_student_ratio, 1)
      );
      return {
        className: item.class_name,
        progressRate,
        nonProgressRate: Number((100 - progressRate).toFixed(1)),
      };
    });
  }, [sortedData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选 */}
      <Card>
        <CardHeader>
          <CardTitle>班级分数增值报告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full md:w-72">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部科目</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              💡 <strong>提示</strong>
              ：请筛选科目查看各班各科增值情况，便于对比分析
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 统计概览 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">班级总数</div>
              <div className="text-2xl font-bold">
                {statistics.totalClasses}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">学生总数</div>
              <div className="text-2xl font-bold">
                {statistics.totalStudents}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均增值率</div>
              <div
                className="text-2xl font-bold"
                style={{
                  color:
                    statistics.avgValueAddedRate >= 0 ? "#B9FF66" : "#F7931E",
                }}
              >
                {(statistics.avgValueAddedRate * 100).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">
                正/负增值班级数
              </div>
              <div className="text-2xl font-bold">
                <span style={{ color: "#B9FF66" }}>
                  {statistics.positiveCount}
                </span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span style={{ color: "#F7931E" }}>
                  {statistics.negativeCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {sortedData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            没有符合条件的数据
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 图表1：增值率双向条形图 */}
          <Card>
            <CardHeader>
              <CardTitle>增值率对比图（正负分开）</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer
                width="100%"
                height={Math.max(360, valueAddedChartData.length * 34)}
              >
                <BarChart
                  data={valueAddedChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="className" width={80} />
                  <Tooltip
                    formatter={(v: number) => `${Number(v).toFixed(2)}%`}
                  />
                  <Legend />
                  <ReferenceLine x={0} stroke="#64748b" strokeWidth={2} />
                  <Bar
                    dataKey="positiveRate"
                    name="正增值(%)"
                    fill="#B9FF66"
                    stackId="valueAdded"
                  />
                  <Bar
                    dataKey="negativeRate"
                    name="负增值(%)"
                    fill="#F7931E"
                    stackId="valueAdded"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 图表2：入口出口标准分对比 */}
          <Card>
            <CardHeader>
              <CardTitle>入口/出口标准分对比图</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer
                width="100%"
                height={Math.max(360, standardScoreChartData.length * 34)}
              >
                <BarChart
                  data={standardScoreChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="className" width={80} />
                  <Tooltip formatter={(v: number) => Number(v).toFixed(2)} />
                  <Legend />
                  <Bar
                    dataKey="entryStandardScore"
                    name="入口标准分"
                    fill="#191A23"
                  />
                  <Bar
                    dataKey="exitStandardScore"
                    name="出口标准分"
                    fill="#B9FF66"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 图表3：进步人数占比 */}
          <Card>
            <CardHeader>
              <CardTitle>进步人数占比堆叠图</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer
                width="100%"
                height={Math.max(360, progressChartData.length * 34)}
              >
                <BarChart
                  data={progressChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="className" width={80} />
                  <Tooltip
                    formatter={(v: number) => `${Number(v).toFixed(1)}%`}
                  />
                  <Legend />
                  <Bar
                    dataKey="progressRate"
                    name="进步人数占比"
                    fill="#B9FF66"
                    stackId="progress"
                  />
                  <Bar
                    dataKey="nonProgressRate"
                    name="未进步人数占比"
                    fill="#191A23"
                    stackId="progress"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 明细表格 */}
          <Card>
            <CardHeader>
              <CardTitle>班级增值明细数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">排名</th>
                      <th className="text-left py-3 px-4">班级名</th>
                      <th className="text-left py-3 px-4">科目</th>
                      <th className="text-right py-3 px-4">学生数</th>
                      <th className="text-right py-3 px-4">入口分</th>
                      <th className="text-right py-3 px-4">出口分</th>
                      <th className="text-right py-3 px-4">增值率</th>
                      <th className="text-right py-3 px-4">进步人数占比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((item, index) => (
                      <tr
                        key={`${item.class_name}-${item.subject}-${index}`}
                        className="border-b hover:bg-muted/50"
                      >
                        <td className="py-3 px-4 font-medium">#{index + 1}</td>
                        <td className="py-3 px-4 font-medium">
                          {item.class_name}
                        </td>
                        <td className="py-3 px-4">{item.subject}</td>
                        <td className="py-3 px-4 text-right">
                          {item.total_students}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.avg_score_entry != null
                            ? item.avg_score_entry.toFixed(1)
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.avg_score_exit != null
                            ? item.avg_score_exit.toFixed(1)
                            : "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span
                              style={{
                                color:
                                  item.avg_score_value_added_rate > 0
                                    ? "#B9FF66"
                                    : item.avg_score_value_added_rate < 0
                                      ? "#F7931E"
                                      : undefined,
                                fontWeight:
                                  item.avg_score_value_added_rate !== 0
                                    ? 600
                                    : undefined,
                              }}
                            >
                              {(item.avg_score_value_added_rate * 100).toFixed(
                                2
                              )}
                              %
                            </span>
                            {item.avg_score_value_added_rate > 0 ? (
                              <TrendingUp
                                className="h-3 w-3"
                                style={{ color: "#B9FF66" }}
                              />
                            ) : item.avg_score_value_added_rate < 0 ? (
                              <TrendingDown
                                className="h-3 w-3"
                                style={{ color: "#F7931E" }}
                              />
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {toPercentValue(
                            item.progress_student_ratio,
                            1
                          ).toFixed(1)}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* 报告解读 */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            报告解读指南
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-2">📊 如何解读增值率</h4>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>
                  • <strong style={{ color: "#B9FF66" }}>正增值（绿色）</strong>
                  ：班级出口表现优于入口表现，说明教学效果良好
                </li>
                <li>
                  • <strong style={{ color: "#F7931E" }}>负增值（橙色）</strong>
                  ：班级出口表现不如入口表现，需要分析原因并改进
                </li>
                <li>
                  •{" "}
                  <strong>
                    增值率 = (出口标准分 - 入口标准分) / 入口标准分
                  </strong>
                  ，反映班级整体进步幅度
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">
                🎯 进步人数占比的意义
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>
                  • 表示班级中<strong>出口成绩优于入口成绩的学生比例</strong>
                </li>
                <li>• 高占比（≥60%）说明班级整体教学效果显著</li>
                <li>• 低占比（&lt;40%）提示需要关注教学方法和学生个体差异</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">
                💡 如何使用这份报告
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                <li>
                  1. <strong>横向对比</strong>
                  ：对比不同班级同一科目的增值情况，找出优秀班级经验
                </li>
                <li>
                  2. <strong>纵向分析</strong>
                  ：结合入口分和出口分，分析班级学生基础和最终成果
                </li>
                <li>
                  3. <strong>重点关注</strong>
                  ：负增值班级需要深入分析原因，正增值高的班级值得推广经验
                </li>
                <li>
                  4.{" "}
                  <strong>
                    筛选科目查看：切换不同科目，可以发现各班在不同学科的增值表现
                  </strong>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                💭 <strong>提示</strong>：标准分为空时图表按 0
                展示，建议结合明细表格共同判断。增值评价是过程性评价，应结合多次考试数据综合分析。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
