"use client";

/**
 * 教师增值评价报告组件
 * 展示教师分数和能力增值数据
 */

import { useState, useMemo, useRef } from "react";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  Users,
  Download,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportTeacherReportToExcel } from "@/services/reportExportService";
import { valueAddedPdfExporter } from "@/services/valueAddedPdfExporter";
import { AIInsightsPanel } from "../ai/AIInsightsPanel";
import type { TeacherValueAdded } from "@/types/valueAddedTypes";

interface TeacherValueAddedReportProps {
  /** 教师增值数据 */
  data: TeacherValueAdded[];

  /** 科目名称 */
  subject: string;

  /** 是否显示加载状态 */
  loading?: boolean;
}

export function TeacherValueAddedReport({
  data,
  subject,
  loading = false,
}: TeacherValueAddedReportProps) {
  const [sortBy, setSortBy] = useState<keyof TeacherValueAdded>(
    "avg_score_value_added_rate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const reportRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 20;

  // 导出Excel
  const handleExport = () => {
    const result = exportTeacherReportToExcel(data, { subject });
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

    const teacherName = data[0]?.teacher_name ?? "全部教师";

    try {
      toast.loading("正在生成PDF，请稍候...");
      await valueAddedPdfExporter.exportTeacherReport(
        reportRef.current,
        teacherName,
        subject
      );
      toast.success("PDF导出成功!");
    } catch (error) {
      console.error("PDF导出失败:", error);
      toast.error("PDF导出失败，请重试");
    }
  };

  // 排序后的数据
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortBy] as number;
      const bValue = b[sortBy] as number;

      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });
  }, [data, sortBy, sortOrder]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, PAGE_SIZE]);

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);

  // 切换排序时重置到第一页
  const handleSort = (column: keyof TeacherValueAdded) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // 渲染分页组件
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={
                currentPage === 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              return (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 1
              );
            })
            .map((page, index, array) => {
              const showEllipsis = index > 0 && page - array[index - 1] > 1;
              return (
                <React.Fragment key={page}>
                  {showEllipsis && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      isActive={page === currentPage}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              );
            })}

          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // 统计摘要
  const summary = useMemo(() => {
    if (data.length === 0) return null;

    const totalStudents = data.reduce((sum, t) => sum + t.total_students, 0);
    const avgValueAddedRate =
      data.reduce((sum, t) => sum + t.avg_score_value_added_rate, 0) /
      data.length;
    const avgConsolidationRate =
      data.reduce((sum, t) => sum + t.consolidation_rate, 0) / data.length;
    const avgTransformationRate =
      data.reduce((sum, t) => sum + t.transformation_rate, 0) / data.length;

    return {
      totalTeachers: data.length,
      totalStudents,
      avgValueAddedRate,
      avgConsolidationRate,
      avgTransformationRate,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无教师增值数据</p>
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

      {/* 统计摘要 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">教师总数</div>
            <div className="text-2xl font-bold">{summary.totalTeachers}</div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-muted-foreground">学生总数</div>
            <div className="text-2xl font-bold">{summary.totalStudents}</div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-muted-foreground">平均增值率</div>
            <div className="text-2xl font-bold flex items-center gap-2">
              {summary.avgValueAddedRate.toFixed(3)}
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
            <div className="text-sm text-muted-foreground">平均转化率</div>
            <div className="text-2xl font-bold">
              {(summary.avgTransformationRate * 100).toFixed(1)}%
            </div>
          </Card>
        </div>
      )}

      {/* 主数据表格 */}
      <Card>
        <Tabs defaultValue="score">
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="score">分数增值</TabsTrigger>
              <TabsTrigger value="ability">能力增值</TabsTrigger>
              <TabsTrigger value="ai-insights">✨ AI洞察</TabsTrigger>
              <TabsTrigger value="all">综合视图</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="score" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">排名</TableHead>
                  <TableHead>教师姓名</TableHead>
                  <TableHead>所教班级</TableHead>
                  <TableHead className="text-right">学生数</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("avg_score_value_added_rate")}
                  >
                    平均增值率
                  </TableHead>
                  <TableHead className="text-right">进步比例</TableHead>
                  <TableHead className="text-right">Z分变化</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((teacher, index) => {
                  const actualIndex = (currentPage - 1) * PAGE_SIZE + index;
                  return (
                    <TableRow key={teacher.teacher_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {teacher.rank_in_subject === 1 && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">
                            #{actualIndex + 1}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {teacher.teacher_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.class_names &&
                          teacher.class_names.length > 0 ? (
                            teacher.class_names.map(
                              (className: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {className}
                                </Badge>
                              )
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {teacher.total_students}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={
                              teacher.avg_score_value_added_rate > 0
                                ? "text-green-600 font-semibold"
                                : teacher.avg_score_value_added_rate < 0
                                  ? "text-red-600 font-semibold"
                                  : ""
                            }
                          >
                            {teacher.avg_score_value_added_rate.toFixed(3)}
                          </span>
                          {teacher.avg_score_value_added_rate > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : teacher.avg_score_value_added_rate < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(teacher.progress_student_ratio * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {teacher.avg_z_score_change.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {renderPagination()}
          </TabsContent>

          <TabsContent value="ability" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">排名</TableHead>
                  <TableHead>教师姓名</TableHead>
                  <TableHead>所教班级</TableHead>
                  <TableHead className="text-right">学生数</TableHead>
                  <TableHead className="text-right">巩固率</TableHead>
                  <TableHead className="text-right">转化率</TableHead>
                  <TableHead className="text-right">贡献率</TableHead>
                  <TableHead className="text-right">优秀增量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((teacher, index) => {
                  const actualIndex = (currentPage - 1) * PAGE_SIZE + index;
                  return (
                    <TableRow key={teacher.teacher_id}>
                      <TableCell>
                        <span className="font-medium">#{actualIndex + 1}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {teacher.teacher_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {teacher.class_names &&
                          teacher.class_names.length > 0 ? (
                            teacher.class_names.map(
                              (className: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {className}
                                </Badge>
                              )
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {teacher.total_students}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            teacher.consolidation_rate > 0.7
                              ? "default"
                              : "secondary"
                          }
                        >
                          {(teacher.consolidation_rate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            teacher.transformation_rate > 0.3
                              ? "default"
                              : "secondary"
                          }
                        >
                          {(teacher.transformation_rate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(teacher.contribution_rate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            teacher.excellent_gain > 0
                              ? "text-green-600 font-semibold"
                              : teacher.excellent_gain < 0
                                ? "text-red-600 font-semibold"
                                : ""
                          }
                        >
                          {teacher.excellent_gain > 0 ? "+" : ""}
                          {teacher.excellent_gain}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {renderPagination()}
          </TabsContent>

          {/* ✅ AI智能洞察标签页 */}
          <TabsContent value="ai-insights" className="p-6">
            <AIInsightsPanel
              data={sortedData}
              context={{
                subject: subject === "全科" ? undefined : subject,
              }}
              maxInsights={8}
            />
          </TabsContent>

          <TabsContent value="all" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>教师姓名</TableHead>
                  <TableHead>所教班级</TableHead>
                  <TableHead className="text-right">学生数</TableHead>
                  <TableHead className="text-right">增值率</TableHead>
                  <TableHead className="text-right">进步比例</TableHead>
                  <TableHead className="text-right">巩固率</TableHead>
                  <TableHead className="text-right">转化率</TableHead>
                  <TableHead className="text-right">优秀增量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((teacher) => (
                  <TableRow key={teacher.teacher_id}>
                    <TableCell className="font-medium">
                      {teacher.teacher_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {teacher.class_names &&
                        teacher.class_names.length > 0 ? (
                          teacher.class_names.map(
                            (className: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {className}
                              </Badge>
                            )
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            -
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {teacher.total_students}
                    </TableCell>
                    <TableCell className="text-right">
                      {teacher.avg_score_value_added_rate.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(teacher.progress_student_ratio * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {(teacher.consolidation_rate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {(teacher.transformation_rate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {teacher.excellent_gain > 0 ? "+" : ""}
                      {teacher.excellent_gain}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {renderPagination()}
          </TabsContent>
        </Tabs>
      </Card>

      {/* 说明文字 */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950">
        <div className="text-sm space-y-2">
          <p className="font-semibold">指标说明：</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <strong>增值率</strong>
              ：出口标准分相对入口标准分的变化，数值越大表示教学效果越好
            </li>
            <li>
              <strong>巩固率</strong>
              ：保持最高等级（A+）的学生比例，衡量对优秀学生的保持能力
            </li>
            <li>
              <strong>转化率</strong>
              ：等级提升的学生比例，衡量对中低等学生的提升能力
            </li>
            <li>
              <strong>贡献率</strong>：该教师对本学科优秀人数增长的贡献百分比
            </li>
            <li>
              <strong>优秀增量</strong>
              ：出口相比入口优秀（A+/A）学生的净增加人数
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
