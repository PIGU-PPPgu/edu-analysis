"use client";

/**
 * 学生各学科能力增值对比报告
 * 使用雷达图和可视化展示对比学生各学科的能力等级变化
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
  Radar,
  Grid3x3,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { StudentValueAdded, AbilityLevel } from "@/types/valueAddedTypes";

interface StudentAbilityMultiReportProps {
  /** 学生增值数据 */
  data: StudentValueAdded[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

// 等级颜色映射
const LEVEL_COLORS: Record<AbilityLevel, string> = {
  "A+": "#16a34a",
  A: "#22c55e",
  "B+": "#84cc16",
  B: "#eab308",
  "C+": "#f97316",
  C: "#ef4444",
};

// 等级数值映射(用于雷达图)
const LEVEL_VALUES: Record<AbilityLevel, number> = {
  "A+": 6,
  A: 5,
  "B+": 4,
  B: 3,
  "C+": 2,
  C: 1,
};

const safeToFixed = (value: any, decimals: number = 2): string => {
  if (value == null || value === undefined || isNaN(Number(value))) {
    return "0." + "0".repeat(decimals);
  }
  return Number(value).toFixed(decimals);
};

export function StudentAbilityMultiReport({
  data,
  loading = false,
}: StudentAbilityMultiReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null
  );
  const [viewMode, setViewMode] = useState<"radar" | "grid">("radar");

  // 按学生分组数据
  const studentGroups = useMemo(() => {
    const groups = new Map<string, StudentValueAdded[]>();

    data.forEach((record) => {
      const existing = groups.get(record.student_id) || [];
      groups.set(record.student_id, [...existing, record]);
    });

    return Array.from(groups.entries()).map(([studentId, records]) => {
      const firstRecord = records[0];
      const consolidatedCount = records.filter((r) => r.is_consolidated).length;
      const transformedCount = records.filter((r) => r.is_transformed).length;
      const regressedCount = records.filter((r) => r.level_change < 0).length;

      return {
        student_id: studentId,
        student_name: firstRecord.student_name,
        class_name: firstRecord.class_name,
        subjects: records,
        consolidatedCount,
        transformedCount,
        regressedCount,
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
      入口等级: LEVEL_VALUES[s.entry_level],
      出口等级: LEVEL_VALUES[s.exit_level],
    }));
  }, [selectedStudent]);

  // 计算统计数据
  const statistics = useMemo(() => {
    if (!selectedStudent) return null;

    const subjects = selectedStudent.subjects;
    const totalSubjects = subjects.length;
    const avgLevelChange =
      subjects.reduce((sum, s) => sum + s.level_change, 0) / totalSubjects;

    return {
      totalSubjects,
      consolidatedCount: selectedStudent.consolidatedCount,
      transformedCount: selectedStudent.transformedCount,
      regressedCount: selectedStudent.regressedCount,
      avgLevelChange: safeToFixed(avgLevelChange, 2),
      consolidationRate: (
        (selectedStudent.consolidatedCount / totalSubjects) *
        100
      ).toFixed(1),
      transformationRate: (
        (selectedStudent.transformedCount / totalSubjects) *
        100
      ).toFixed(1),
    };
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
          <CardDescription>
            选择学生查看其各学科能力等级增值对比
          </CardDescription>
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
              {/* P1修复：搜索时显示全部结果，未搜索时限制100条避免卡顿 */}
              {(searchTerm
                ? filteredStudents
                : filteredStudents.slice(0, 100)
              ).map((student) => (
                <SelectItem key={student.student_id} value={student.student_id}>
                  {student.student_name} - {student.class_name}
                  (巩固{student.consolidatedCount} / 转化
                  {student.transformedCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!searchTerm && filteredStudents.length > 100 && (
            <p className="text-sm text-muted-foreground">
              共{filteredStudents.length}
              个学生，当前显示前100个。请使用搜索功能查找特定学生。
            </p>
          )}
          {searchTerm && filteredStudents.length === 0 && (
            <p className="text-sm text-muted-foreground">
              未找到匹配的学生，请尝试其他关键词
            </p>
          )}
        </CardContent>
      </Card>

      {/* 学生详情和对比图表 */}
      {selectedStudent && statistics && (
        <>
          {/* 学生基本信息和统计 */}
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
              </div>
            </CardHeader>
          </Card>

          {/* 统计摘要 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">科目总数</div>
                <div className="text-2xl font-bold">
                  {statistics.totalSubjects}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">巩固科目</div>
                <div className="text-2xl font-bold text-green-600">
                  {statistics.consolidatedCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  {statistics.consolidationRate}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">转化科目</div>
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.transformedCount}
                </div>
                <div className="text-xs text-muted-foreground">
                  {statistics.transformationRate}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">退步科目</div>
                <div className="text-2xl font-bold text-red-600">
                  {statistics.regressedCount}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 视图切换和可视化 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>各学科能力等级对比</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "radar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("radar")}
                  >
                    <Radar className="h-4 w-4 mr-2" />
                    雷达图
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4 mr-2" />
                    网格图
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "radar" ? (
                <div>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={90} domain={[0, 6]} />
                      <RechartsRadar
                        name="入口等级"
                        dataKey="入口等级"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                      <RechartsRadar
                        name="出口等级"
                        dataKey="出口等级"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.3}
                      />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    <p>等级数值: C=1, C+=2, B=3, B+=4, A=5, A+=6</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedStudent.subjects.map((subject) => (
                    <Card key={subject.subject} className="p-4">
                      <div className="font-semibold mb-3 text-center">
                        {subject.subject}
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            入口
                          </span>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${LEVEL_COLORS[subject.entry_level]}20`,
                              borderColor: LEVEL_COLORS[subject.entry_level],
                              color: LEVEL_COLORS[subject.entry_level],
                            }}
                          >
                            {subject.entry_level}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-center">
                          {subject.level_change > 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : subject.level_change < 0 ? (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          ) : (
                            <div className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            出口
                          </span>
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: `${LEVEL_COLORS[subject.exit_level]}20`,
                              borderColor: LEVEL_COLORS[subject.exit_level],
                              color: LEVEL_COLORS[subject.exit_level],
                            }}
                          >
                            {subject.exit_level}
                          </Badge>
                        </div>
                        <div className="text-center">
                          {subject.is_consolidated && (
                            <Badge className="bg-green-500 text-xs">巩固</Badge>
                          )}
                          {subject.is_transformed && (
                            <Badge className="bg-blue-500 text-xs">转化</Badge>
                          )}
                          {subject.level_change < 0 && (
                            <Badge variant="destructive" className="text-xs">
                              退步
                            </Badge>
                          )}
                          {subject.level_change === 0 &&
                            !subject.is_consolidated && (
                              <Badge variant="secondary" className="text-xs">
                                保持
                              </Badge>
                            )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 详细数据表格 */}
          <Card>
            <CardHeader>
              <CardTitle>各学科能力详情</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>科目</TableHead>
                    <TableHead className="text-right">入口等级</TableHead>
                    <TableHead className="text-right">出口等级</TableHead>
                    <TableHead className="text-right">等级变化</TableHead>
                    <TableHead className="text-right">能力状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedStudent.subjects.map((subject) => (
                    <TableRow key={subject.subject}>
                      <TableCell className="font-medium">
                        {subject.subject}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: `${LEVEL_COLORS[subject.entry_level]}20`,
                            borderColor: LEVEL_COLORS[subject.entry_level],
                            color: LEVEL_COLORS[subject.entry_level],
                          }}
                        >
                          {subject.entry_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: `${LEVEL_COLORS[subject.exit_level]}20`,
                            borderColor: LEVEL_COLORS[subject.exit_level],
                            color: LEVEL_COLORS[subject.exit_level],
                          }}
                        >
                          {subject.exit_level}
                        </Badge>
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
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {subject.is_consolidated && (
                          <Badge className="bg-green-500">巩固</Badge>
                        )}
                        {subject.is_transformed && (
                          <Badge className="bg-blue-500">转化</Badge>
                        )}
                        {!subject.is_consolidated &&
                          !subject.is_transformed &&
                          subject.level_change === 0 && (
                            <Badge variant="secondary">保持</Badge>
                          )}
                        {subject.level_change < 0 && (
                          <Badge variant="destructive">退步</Badge>
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
                <p className="font-semibold">能力等级说明:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>
                    <strong>雷达图</strong>
                    :直观展示各学科入口和出口等级的整体分布
                  </li>
                  <li>
                    <strong>网格图</strong>:清晰展示每个学科的等级变化情况
                  </li>
                  <li>
                    <strong>巩固</strong>:入口和出口都保持在最高等级(A+)
                  </li>
                  <li>
                    <strong>转化</strong>:等级相比入口有所提升
                  </li>
                  <li>
                    <strong>保持</strong>:等级没有变化但不是最高等级
                  </li>
                  <li>
                    <strong>退步</strong>:等级相比入口有所下降
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
