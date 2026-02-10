"use client";

/**
 * 增强版教师增值评价报告
 * 包含筛选功能和双向条形图展示
 */

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { GradeLevelExplanation } from "@/components/common/GradeLevelExplanation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Cell,
  ReferenceLine,
} from "recharts";
import {
  Filter,
  Award,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Search,
} from "lucide-react";
import type { TeacherValueAdded } from "@/types/valueAddedTypes";

interface EnhancedTeacherValueAddedReportProps {
  data: TeacherValueAdded[];
  loading?: boolean;
}

export function EnhancedTeacherValueAddedReport({
  data,
  loading = false,
}: EnhancedTeacherValueAddedReportProps) {
  // 筛选条件
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchTeacher, setSearchTeacher] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // 获取所有科目
  const subjects = useMemo(() => {
    const subjectSet = new Set(data.map((d) => d.subject));
    return Array.from(subjectSet).sort();
  }, [data]);

  // 获取所有班级
  const classes = useMemo(() => {
    const classSet = new Set<string>();
    data.forEach((d) => {
      if (d.class_name) {
        classSet.add(d.class_name);
      }
    });
    return Array.from(classSet).sort();
  }, [data]);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 科目筛选
      if (selectedSubject !== "all" && item.subject !== selectedSubject) {
        return false;
      }

      // 班级筛选
      if (selectedClass !== "all") {
        if (item.class_name !== selectedClass) {
          return false;
        }
      }

      // 教师姓名搜索
      if (searchTeacher && !item.teacher_name.includes(searchTeacher)) {
        return false;
      }

      return true;
    });
  }, [data, selectedSubject, selectedClass, searchTeacher]);

  // 准备双向条形图数据
  const chartData = useMemo(() => {
    return filteredData
      .map((item) => ({
        name: item.teacher_name,
        subject: item.subject,
        valueAddedRate: Number(
          (item.avg_score_value_added_rate * 100).toFixed(2)
        ),
        avgScore: item.avg_score_exit,
        studentCount: item.total_students,
        classes: item.class_name || "",
      }))
      .sort((a, b) => b.valueAddedRate - a.valueAddedRate)
      .slice(0, 15); // 只显示前15个教师
  }, [filteredData]);

  // 统计数据
  const statistics = useMemo(() => {
    if (filteredData.length === 0) return null;

    const positiveCount = filteredData.filter(
      (d) => d.avg_score_value_added_rate > 0
    ).length;
    const totalValueAdded = filteredData.reduce(
      (sum, d) => sum + d.avg_score_value_added_rate,
      0
    );
    const avgValueAdded = totalValueAdded / filteredData.length;

    return {
      total: filteredData.length,
      positiveCount,
      negativeCount: filteredData.length - positiveCount,
      avgValueAdded: (avgValueAdded * 100).toFixed(2),
      positiveRate: ((positiveCount / filteredData.length) * 100).toFixed(1),
    };
  }, [filteredData]);

  // 重置筛选
  const handleReset = () => {
    setSelectedSubject("all");
    setSelectedClass("all");
    setSearchTeacher("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 筛选器 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                筛选条件
              </CardTitle>
              <CardDescription>选择科目、班级或搜索教师姓名</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "收起" : "展开"}筛选
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>科目</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
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

              <div className="space-y-2">
                <Label>班级</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班级</SelectItem>
                    {classes.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>教师姓名</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索教师..."
                    value={searchTeacher}
                    onChange={(e) => setSearchTeacher(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleReset}>
                重置筛选
              </Button>
              <Badge variant="secondary">
                已筛选 {filteredData.length} / {data.length} 位教师
              </Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 统计概览 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">教师总数</div>
              <div className="text-2xl font-bold">{statistics.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">平均增值率</div>
              <div
                className={`text-2xl font-bold ${
                  parseFloat(statistics.avgValueAdded) > 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {statistics.avgValueAdded}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                正增值教师
              </div>
              <div className="text-2xl font-bold text-green-600">
                {statistics.positiveCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                负增值教师
              </div>
              <div className="text-2xl font-bold text-red-600">
                {statistics.negativeCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 双向条形图 */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              教师增值率对比
            </CardTitle>
            <CardDescription>
              正值表示增值，负值表示减值（显示前15名）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer
              width="100%"
              height={Math.max(400, chartData.length * 40)}
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${value}%`} />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                  labelFormatter={(label) => {
                    const item = chartData.find((d) => d.name === label);
                    return (
                      <div>
                        <div className="font-semibold">{label}</div>
                        {item && (
                          <div className="text-xs text-muted-foreground">
                            <div>{item.subject}</div>
                            <div>班级: {item.classes}</div>
                            <div>学生数: {item.studentCount}</div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend />
                <ReferenceLine x={0} stroke="#666" strokeWidth={2} />
                <Bar
                  dataKey="valueAddedRate"
                  name="增值率(%)"
                  radius={[0, 4, 4, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.valueAddedRate > 0 ? "#B9FF66" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 数据表格 */}
      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <p>没有符合条件的数据</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="mt-4"
            >
              重置筛选
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>详细数据表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">教师</th>
                    <th className="text-left py-3 px-4">科目</th>
                    <th className="text-left py-3 px-4">所教班级</th>
                    <th className="text-right py-3 px-4">学生数</th>
                    <th className="text-right py-3 px-4">平均分</th>
                    <th className="text-right py-3 px-4">增值率</th>
                    <th className="text-right py-3 px-4">优秀率</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 50).map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">
                        {item.teacher_name}
                      </td>
                      <td className="py-3 px-4">{item.subject}</td>
                      <td className="py-3 px-4 text-sm">
                        {item.class_name ? (
                          <Badge variant="outline">{item.class_name}</Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.total_students}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.avg_score_exit?.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={
                            item.avg_score_value_added_rate > 0
                              ? "text-green-600 font-semibold"
                              : item.avg_score_value_added_rate < 0
                                ? "text-red-600 font-semibold"
                                : ""
                          }
                        >
                          {(item.avg_score_value_added_rate * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.exit_excellent_rate != null
                          ? `${(item.exit_excellent_rate * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredData.length > 50 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                显示前50条记录，共 {filteredData.length} 条
              </p>
            )}
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
                <strong>增值率</strong>:
                出口标准分相对入口标准分的增长比例，正值表示学生进步
              </li>
              <li>
                <strong>双向条形图</strong>: 蓝色表示正增值，红色表示负增值
              </li>
              <li>
                <strong>所教班级</strong>: 教师可能同时教多个班级
              </li>
              <li>
                <strong>筛选功能</strong>: 可按科目、班级或教师姓名筛选
              </li>
            </ul>
          </div>
          <GradeLevelExplanation className="mt-4" />
        </CardContent>
      </Card>
    </div>
  );
}
