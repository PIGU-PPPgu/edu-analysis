"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "recharts";
import type { ClassValueAdded } from "@/types/valueAddedTypes";

interface ClassAbilityReportProps {
  data: ClassValueAdded[];
  subject: string;
  loading?: boolean;
}

const normalizeSubject = (value: string) => {
  if (!value) return "all";
  if (["all", "全部", "全科", "全部科目"].includes(value)) return "all";
  return value;
};

const toPercentValue = (ratio: number | undefined, digits = 1) =>
  Number(((ratio ?? 0) * 100).toFixed(digits));

const getExitExcellentRate = (item: ClassValueAdded) => {
  const explicitRate = (
    item as ClassValueAdded & { exit_excellent_rate?: number }
  ).exit_excellent_rate;

  if (typeof explicitRate === "number") return explicitRate;

  if (item.total_students > 0) {
    return (item.exit_excellent_count ?? 0) / item.total_students;
  }

  return 0;
};

const getAbilityScore = (item: ClassValueAdded) => {
  return (
    (getExitExcellentRate(item) +
      (item.consolidation_rate ?? 0) +
      (item.transformation_rate ?? 0) +
      (item.contribution_rate ?? 0)) /
    4
  );
};

export function ClassAbilityReport({
  data,
  subject,
  loading = false,
}: ClassAbilityReportProps) {
  // 1. 科目筛选
  const [selectedSubject, setSelectedSubject] = useState<string>(() =>
    normalizeSubject(subject)
  );

  const subjects = useMemo(() => {
    return Array.from(new Set(data.map((item) => item.subject))).sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (selectedSubject === "all") return data;
    return data.filter((item) => item.subject === selectedSubject);
  }, [data, selectedSubject]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort(
      (a, b) => getAbilityScore(b) - getAbilityScore(a)
    );
  }, [filteredData]);

  // 2. 统计卡片
  const statistics = useMemo(() => {
    if (filteredData.length === 0) return null;

    const avgExcellentRate =
      filteredData.reduce((sum, item) => sum + getExitExcellentRate(item), 0) /
      filteredData.length;
    const avgConsolidationRate =
      filteredData.reduce(
        (sum, item) => sum + (item.consolidation_rate ?? 0),
        0
      ) / filteredData.length;
    const avgTransformationRate =
      filteredData.reduce(
        (sum, item) => sum + (item.transformation_rate ?? 0),
        0
      ) / filteredData.length;
    const avgContributionRate =
      filteredData.reduce(
        (sum, item) => sum + (item.contribution_rate ?? 0),
        0
      ) / filteredData.length;

    return {
      avgExcellentRate,
      avgConsolidationRate,
      avgTransformationRate,
      avgContributionRate,
    };
  }, [filteredData]);

  // 4. 图表：能力指标对比堆叠条形图
  const chartData = useMemo(() => {
    return sortedData.map((item) => ({
      className: item.class_name,
      excellentRate: toPercentValue(getExitExcellentRate(item), 1),
      consolidationRate: toPercentValue(item.consolidation_rate, 1),
      transformationRate: toPercentValue(item.transformation_rate, 1),
      contributionRate: toPercentValue(item.contribution_rate, 1),
    }));
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
          <CardTitle>班级能力增值报告</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full md:w-72">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="选择科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部科目</SelectItem>
                {subjects.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均优秀率</div>
              <div className="text-2xl font-bold text-blue-600">
                {(statistics.avgExcellentRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均巩固率</div>
              <div className="text-2xl font-bold text-green-600">
                {(statistics.avgConsolidationRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均转化率</div>
              <div className="text-2xl font-bold text-orange-600">
                {(statistics.avgTransformationRate * 100).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均贡献率</div>
              <div className="text-2xl font-bold text-purple-600">
                {(statistics.avgContributionRate * 100).toFixed(1)}%
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
          {/* 3. 核心表格 */}
          <Card>
            <CardHeader>
              <CardTitle>班级能力指标明细</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">排名</th>
                      <th className="text-left py-3 px-4">班级名</th>
                      <th className="text-right py-3 px-4">学生数</th>
                      <th className="text-right py-3 px-4">优秀率</th>
                      <th className="text-right py-3 px-4">巩固率</th>
                      <th className="text-right py-3 px-4">转化率</th>
                      <th className="text-right py-3 px-4">贡献率</th>
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
                        <td className="py-3 px-4 text-right">
                          {item.total_students}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {toPercentValue(
                            getExitExcellentRate(item),
                            1
                          ).toFixed(1)}
                          %
                        </td>
                        <td className="py-3 px-4 text-right">
                          {toPercentValue(item.consolidation_rate, 1).toFixed(
                            1
                          )}
                          %
                        </td>
                        <td className="py-3 px-4 text-right">
                          {toPercentValue(item.transformation_rate, 1).toFixed(
                            1
                          )}
                          %
                        </td>
                        <td className="py-3 px-4 text-right">
                          {toPercentValue(item.contribution_rate, 1).toFixed(1)}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 4. 能力指标对比堆叠条形图 */}
          <Card>
            <CardHeader>
              <CardTitle>能力指标对比堆叠条形图</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer
                width="100%"
                height={Math.max(360, chartData.length * 36)}
              >
                <BarChart
                  data={chartData}
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
                    dataKey="excellentRate"
                    name="优秀率"
                    fill="#3b82f6"
                    stackId="ability"
                  />
                  <Bar
                    dataKey="consolidationRate"
                    name="巩固率"
                    fill="#22c55e"
                    stackId="ability"
                  />
                  <Bar
                    dataKey="transformationRate"
                    name="转化率"
                    fill="#f59e0b"
                    stackId="ability"
                  />
                  <Bar
                    dataKey="contributionRate"
                    name="贡献率"
                    fill="#a855f7"
                    stackId="ability"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* 5. 帮助说明 */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="p-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold">指标说明：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>优秀率</strong>：班级出口阶段优秀学生占比（优先使用
                <code className="mx-1">exit_excellent_rate</code>字段）。
              </li>
              <li>
                <strong>巩固率</strong>：入口优势学生在出口阶段保持优势的比例。
              </li>
              <li>
                <strong>转化率</strong>：入口薄弱学生在出口阶段实现提升的比例。
              </li>
              <li>
                <strong>贡献率</strong>：班级对整体能力提升的综合贡献程度。
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
