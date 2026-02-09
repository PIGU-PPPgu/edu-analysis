"use client";

/**
 * 学生个人增值报告组件
 * 展示单个学生的增值详情和历史追踪
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  User,
  Award,
  Target,
  LineChart,
  Download,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportStudentReportToExcel } from "@/services/reportExportService";
import { valueAddedPdfExporter } from "@/services/valueAddedPdfExporter";
import type { StudentValueAdded } from "@/types/valueAddedTypes";
import { safeToFixed, safePercent, safeNumber } from "@/utils/formatUtils";

interface StudentValueAddedReportProps {
  /** 所有学生的增值数据 */
  data: StudentValueAdded[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

export function StudentValueAddedReport({
  data,
  loading = false,
}: StudentValueAddedReportProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] =
    useState<StudentValueAdded | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // 导出Excel
  const handleExport = () => {
    const result = exportStudentReportToExcel(data);
    if (result.success) {
      toast.success(`报告已导出: ${result.fileName}`);
    } else {
      toast.error(`导出失败: ${result.error}`);
    }
  };

  // 导出PDF
  const handleExportPDF = async () => {
    if (!reportRef.current) {
      toast.error("报告元素未找到");
      return;
    }

    const studentName = data[0]?.student_name ?? "学生";

    try {
      toast.loading("正在生成PDF，请稍候...");
      await valueAddedPdfExporter.exportStudentReport(
        reportRef.current,
        studentName
      );
      toast.success("PDF导出成功!");
    } catch (error) {
      console.error("PDF导出失败:", error);
      toast.error("PDF导出失败，请重试");
    }
  };

  // 筛选学生列表
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return data;

    const term = searchTerm.toLowerCase();
    return data.filter(
      (s) =>
        s.student_name.toLowerCase().includes(term) ||
        s.student_id.toLowerCase().includes(term) ||
        s.class_name.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  // 按学科分组学生数据
  const studentsBySubject = useMemo(() => {
    if (!selectedStudent) return {};

    const allSubjectData = data.filter(
      (s) => s.student_id === selectedStudent.student_id
    );
    const grouped: Record<string, StudentValueAdded> = {};

    allSubjectData.forEach((d) => {
      grouped[d.subject] = d;
    });

    return grouped;
  }, [selectedStudent, data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无学生增值数据</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* 导出按钮 */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleExportPDF} variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          导出PDF
        </Button>
        <Button onClick={handleExport} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          导出Excel
        </Button>
      </div>

      {/* 学生搜索 */}
      <Card>
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* 学生列表或详情 */}
      {!selectedStudent ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              学生列表
              <Badge variant="outline">{filteredStudents.length}人</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead className="text-right">增值率</TableHead>
                  <TableHead className="text-right">等级变化</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.slice(0, 50).map((student, index) => (
                  <TableRow
                    key={`${student.student_id}-${student.subject}-${index}`}
                  >
                    <TableCell className="font-medium">
                      {student.student_name}
                    </TableCell>
                    <TableCell>{student.student_id}</TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell>{student.subject}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          style={{
                            color:
                              student.score_value_added_rate > 0
                                ? "#B9FF66"
                                : student.score_value_added_rate < 0
                                  ? "#f87171"
                                  : undefined,
                            fontWeight:
                              student.score_value_added_rate !== 0
                                ? 600
                                : undefined,
                          }}
                        >
                          {safeToFixed(student.score_value_added_rate, 3)}
                        </span>
                        {student.score_value_added_rate > 0 ? (
                          <TrendingUp
                            className="h-4 w-4"
                            style={{ color: "#B9FF66" }}
                          />
                        ) : student.score_value_added_rate < 0 ? (
                          <TrendingDown
                            className="h-4 w-4"
                            style={{ color: "#f87171" }}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <LevelChangeBadge
                        entryLevel={student.entry_level}
                        exitLevel={student.exit_level}
                        levelChange={student.level_change}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStudent(student)}
                      >
                        查看详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredStudents.length > 50 && (
              <div className="text-center text-sm text-muted-foreground mt-4">
                仅显示前50条结果，请使用搜索功能查找特定学生
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <StudentDetailView
          student={selectedStudent}
          subjectData={studentsBySubject}
          onBack={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}

/**
 * 学生详情视图
 */
interface StudentDetailViewProps {
  student: StudentValueAdded;
  subjectData: Record<string, StudentValueAdded>;
  onBack: () => void;
  initialTab?: string;
}

function StudentDetailView({
  student,
  subjectData,
  onBack,
  initialTab = "scores",
}: StudentDetailViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const subjects = Object.keys(subjectData);

  // 同步外部 initialTab 变化
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // 计算总体统计
  const summary = useMemo(() => {
    const allSubjects = Object.values(subjectData);
    const avgValueAddedRate =
      allSubjects.reduce((sum, s) => sum + s.score_value_added_rate, 0) /
      allSubjects.length;
    const improvedCount = allSubjects.filter(
      (s) => s.score_value_added > 0
    ).length;
    const consolidatedCount = allSubjects.filter(
      (s) => s.is_consolidated
    ).length;
    const transformedCount = allSubjects.filter((s) => s.is_transformed).length;

    return {
      avgValueAddedRate,
      improvedCount,
      consolidatedCount,
      transformedCount,
      totalSubjects: allSubjects.length,
    };
  }, [subjectData]);

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="outline" onClick={onBack}>
        ← 返回列表
      </Button>

      {/* 学生基本信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {student.student_name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {student.class_name} · 学号: {student.student_id}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">平均增值率</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {safeToFixed(summary.avgValueAddedRate, 3)}
            {summary.avgValueAddedRate > 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : summary.avgValueAddedRate < 0 ? (
              <TrendingDown className="h-5 w-5 text-red-500" />
            ) : (
              <Minus className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">进步科目</div>
          <div className="text-2xl font-bold">
            {summary.improvedCount}/{summary.totalSubjects}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">巩固科目</div>
          <div className="text-2xl font-bold">{summary.consolidatedCount}</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">转化科目</div>
          <div className="text-2xl font-bold">{summary.transformedCount}</div>
        </Card>
      </div>

      {/* 各科目详情 */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="scores">分数增值</TabsTrigger>
              <TabsTrigger value="levels">等级变化</TabsTrigger>
              <TabsTrigger value="comparison">科目对比</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scores" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目</TableHead>
                  <TableHead className="text-right">入口分数</TableHead>
                  <TableHead className="text-right">出口分数</TableHead>
                  <TableHead className="text-right">分数增值</TableHead>
                  <TableHead className="text-right">增值率</TableHead>
                  <TableHead className="text-right">Z分变化</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => {
                  const data = subjectData[subject];
                  return (
                    <TableRow key={subject}>
                      <TableCell className="font-medium">{subject}</TableCell>
                      <TableCell className="text-right">
                        {safeToFixed(data.entry_score, 1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {safeToFixed(data.exit_score, 1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          style={{
                            color:
                              data.score_value_added > 0
                                ? "#B9FF66"
                                : data.score_value_added < 0
                                  ? "#f87171"
                                  : undefined,
                            fontWeight:
                              data.score_value_added !== 0 ? 600 : undefined,
                          }}
                        >
                          {data.score_value_added > 0 ? "+" : ""}
                          {safeToFixed(data.score_value_added, 1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {safeToFixed(data.score_value_added_rate, 3)}
                      </TableCell>
                      <TableCell className="text-right">
                        {safeToFixed(
                          (data.exit_z_score || 0) - (data.entry_z_score || 0),
                          3
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="levels" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目</TableHead>
                  <TableHead className="text-right">入口等级</TableHead>
                  <TableHead className="text-right">出口等级</TableHead>
                  <TableHead className="text-right">等级变化</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => {
                  const data = subjectData[subject];
                  return (
                    <TableRow key={subject}>
                      <TableCell className="font-medium">{subject}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{data.entry_level}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{data.exit_level}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <LevelChangeBadge
                          entryLevel={data.entry_level}
                          exitLevel={data.exit_level}
                          levelChange={data.level_change}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {data.is_consolidated && (
                          <Badge variant="default" className="bg-green-500">
                            巩固
                          </Badge>
                        )}
                        {data.is_transformed && (
                          <Badge variant="default" className="bg-blue-500">
                            转化
                          </Badge>
                        )}
                        {!data.is_consolidated &&
                          !data.is_transformed &&
                          data.level_change === 0 && (
                            <Badge variant="secondary">保持</Badge>
                          )}
                        {data.level_change < 0 && (
                          <Badge variant="destructive">退步</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="comparison" className="p-6">
            <div className="space-y-4">
              {subjects.map((subject) => {
                const data = subjectData[subject];
                const maxRate = 0.5; // 用于计算进度条宽度
                const percentage = Math.min(
                  (Math.abs(data.score_value_added_rate) / maxRate) * 100,
                  100
                );

                return (
                  <div key={subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{subject}</span>
                      <span
                        style={{
                          color:
                            data.score_value_added_rate > 0
                              ? "#B9FF66"
                              : data.score_value_added_rate < 0
                                ? "#f87171"
                                : undefined,
                          fontWeight:
                            data.score_value_added_rate !== 0 ? 600 : undefined,
                        }}
                      >
                        {safeToFixed(data.score_value_added_rate, 3)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          data.score_value_added_rate > 0
                            ? "bg-green-500"
                            : data.score_value_added_rate < 0
                              ? "bg-red-500"
                              : "bg-gray-400"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* 说明文字 */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950">
        <div className="text-sm space-y-2">
          <p className="font-semibold">评价说明：</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <strong>巩固</strong>：入口和出口都保持在最高等级（A+）
            </li>
            <li>
              <strong>转化</strong>：等级相比入口有所提升
            </li>
            <li>
              <strong>保持</strong>：等级没有变化但不是最高等级
            </li>
            <li>
              <strong>退步</strong>：等级相比入口有所下降
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

/**
 * 等级变化徽章
 */
interface LevelChangeBadgeProps {
  entryLevel: string;
  exitLevel: string;
  levelChange: number;
}

function LevelChangeBadge({
  entryLevel,
  exitLevel,
  levelChange,
}: LevelChangeBadgeProps) {
  if (levelChange > 0) {
    return (
      <Badge variant="default" className="bg-green-500">
        {entryLevel} → {exitLevel} ↑
      </Badge>
    );
  }

  if (levelChange < 0) {
    return (
      <Badge variant="destructive">
        {entryLevel} → {exitLevel} ↓
      </Badge>
    );
  }

  return <Badge variant="secondary">{entryLevel} (保持)</Badge>;
}
