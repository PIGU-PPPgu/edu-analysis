"use client";

/**
 * 学生各学科分数增值对比报告
 * 使用雷达图和柱状图对比学生各学科的分数增值表现
 */

import { useState, useMemo } from "react";
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
  TrendingUp,
  TrendingDown,
  BarChart3,
  Radar,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import type { StudentValueAdded } from "@/types/valueAddedTypes";

interface StudentScoreMultiReportProps {
  /** 学生增值数据 */
  data: StudentValueAdded[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

export function StudentScoreMultiReport({
  data,
  loading = false,
}: StudentScoreMultiReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [chartType, setChartType] = useState<"radar" | "bar">("radar");

  // 按学生分组数据
  const studentGroups = useMemo(() => {
    const groups = new Map<string, StudentValueAdded[]>();

    data.forEach((record) => {
      const existing = groups.get(record.student_id) || [];
      groups.set(record.student_id, [...existing, record]);
    });

    return Array.from(groups.entries()).map(([studentId, records]) => {
      const firstRecord = records[0];
      return {
        student_id: studentId,
        student_name: firstRecord.student_name,
        class_name: firstRecord.class_name,
        subjects: records,
        avg_value_added_rate:
          records.reduce((sum, r) => sum + r.score_value_added_rate, 0) /
          records.length,
      };
    });
  }, [data]);

  // 筛选学生
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return studentGroups;

    const term = searchTerm.toLowerCase();
    return studentGroups.filter(
      (s) =>
        s.student_name.toLowerCase().includes(term) ||
        s.student_id.toLowerCase().includes(term) ||
        s.class_name.toLowerCase().includes(term)
    );
  }, [studentGroups, searchTerm]);

  // 获取选中学生的数据
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentGroups.find((s) => s.student_id === selectedStudentId);
  }, [selectedStudentId, studentGroups]);

  // 准备雷达图数据
  const radarData = useMemo(() => {
    if (!selectedStudent) return [];

    return selectedStudent.subjects.map((s) => ({
      subject: s.subject,
      增值率: Number((s.score_value_added_rate * 100).toFixed(2)),
      入口分: s.entry_score,
      出口分: s.exit_score,
    }));
  }, [selectedStudent]);

  // 准备柱状图数据
  const barData = useMemo(() => {
    if (!selectedStudent) return [];

    return selectedStudent.subjects.map((s) => ({
      subject: s.subject,
      value_added_rate: s.score_value_added_rate,
      score_value_added: s.score_value_added,
      isPositive: s.score_value_added > 0,
    }));
  }, [selectedStudent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无学生增值数据</p>
        <p className="text-sm mt-2">
          请先在"增值活动"标签页中创建活动并点击"开始计算"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 学生搜索和选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            学生选择
          </CardTitle>
          <CardDescription>选择学生查看其各学科分数增值对比</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索学生姓名、学号或班级..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setSearchTerm("")}>
              清除
            </Button>
          </div>

          <Select
            value={selectedStudentId || ""}
            onValueChange={setSelectedStudentId}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择学生" />
            </SelectTrigger>
            <SelectContent>
              {filteredStudents.slice(0, 100).map((student) => (
                <SelectItem key={student.student_id} value={student.student_id}>
                  {student.student_name} - {student.class_name} (平均增值率:{" "}
                  {safeToFixed(student.avg_value_added_rate, 3)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filteredStudents.length > 100 && (
            <p className="text-sm text-muted-foreground">
              仅显示前100个结果，请使用搜索功能缩小范围
            </p>
          )}
        </CardContent>
      </Card>

      {/* 学生详情和对比图表 */}
      {selectedStudent && (
        <>
          {/* 学生基本信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {selectedStudent.student_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.class_name} · 学号:{" "}
                      {selectedStudent.student_id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    平均增值率
                  </div>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    {safeToFixed(selectedStudent.avg_value_added_rate, 3)}
                    {selectedStudent.avg_value_added_rate > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 图表类型切换 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>各学科分数增值对比</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={chartType === "radar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("radar")}
                  >
                    <Radar className="h-4 w-4 mr-2" />
                    雷达图
                  </Button>
                  <Button
                    variant={chartType === "bar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setChartType("bar")}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    柱状图
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {chartType === "radar" ? (
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={90} domain={[-50, 50]} />
                    <RechartsRadar
                      name="增值率(%)"
                      dataKey="增值率"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis
                      label={{
                        value: "增值率",
                        angle: -90,
                        position: "insideLeft",
                      }}
                      tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `${(value * 100).toFixed(2)}%`
                      }
                      labelFormatter={(label) => `科目: ${label}`}
                    />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                    <Bar dataKey="value_added_rate" name="增值率">
                      {barData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isPositive ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* 详细数据表格 */}
          <Card>
            <CardHeader>
              <CardTitle>各学科详细数据</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>科目</TableHead>
                    <TableHead className="text-right">入口分</TableHead>
                    <TableHead className="text-right">出口分</TableHead>
                    <TableHead className="text-right">分数增值</TableHead>
                    <TableHead className="text-right">增值率</TableHead>
                    <TableHead className="text-right">入口等级</TableHead>
                    <TableHead className="text-right">出口等级</TableHead>
                    <TableHead className="text-right">等级变化</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStudent.subjects.map((subject) => (
                    <TableRow key={subject.subject}>
                      <TableCell className="font-medium">
                        {subject.subject}
                      </TableCell>
                      <TableCell className="text-right">
                        {safeToFixed(subject.entry_score, 1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {safeToFixed(subject.exit_score, 1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            subject.score_value_added > 0
                              ? "text-green-600 font-semibold"
                              : subject.score_value_added < 0
                                ? "text-red-600 font-semibold"
                                : ""
                          }
                        >
                          {subject.score_value_added > 0 ? "+" : ""}
                          {safeToFixed(subject.score_value_added, 1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            subject.score_value_added_rate > 0
                              ? "text-green-600 font-semibold"
                              : subject.score_value_added_rate < 0
                                ? "text-red-600 font-semibold"
                                : ""
                          }
                        >
                          {safeToFixed(subject.score_value_added_rate * 100, 2)}
                          %
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{subject.entry_level}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{subject.exit_level}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {subject.level_change > 0 ? (
                          <Badge className="bg-green-500">
                            +{subject.level_change}
                          </Badge>
                        ) : subject.level_change < 0 ? (
                          <Badge variant="destructive">
                            {subject.level_change}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">持平</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 说明信息 */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm space-y-2">
                <p className="font-semibold">图表说明：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>雷达图</strong>
                    ：直观展示学生各学科增值率的整体分布情况
                  </li>
                  <li>
                    <strong>柱状图</strong>
                    ：清晰对比各学科的增值率，绿色表示进步，红色表示退步
                  </li>
                  <li>
                    <strong>增值率</strong>：出口标准分相对入口标准分的增长比例
                  </li>
                  <li>
                    <strong>等级变化</strong>：基于百分位数的能力等级变化情况
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
