"use client";

/**
 * 班级增值评价报告组件
 * 展示班级分数和能力增值数据
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
  Download,
  FileDown,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { exportClassReportToExcel } from "@/services/reportExportService";
import { valueAddedPdfExporter } from "@/services/valueAddedPdfExporter";
import { ThreeRatesComparison } from "../charts/ThreeRatesComparison";
import BoxPlotChart, {
  type BoxPlotData,
  calculateBoxPlotStats,
} from "@/components/analysis/charts/BoxPlotChart";
import { AIInsightsPanel } from "../ai/AIInsightsPanel";
import type { ClassValueAdded } from "@/types/valueAddedTypes";

interface ClassValueAddedReportProps {
  /** 班级增值数据 */
  data: ClassValueAdded[];

  /** 科目名称 */
  subject: string;

  /** 是否显示加载状态 */
  loading?: boolean;
}

export function ClassValueAddedReport({
  data,
  subject,
  loading = false,
}: ClassValueAddedReportProps) {
  const [sortBy, setSortBy] = useState<keyof ClassValueAdded>(
    "avg_score_value_added_rate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 20;

  // 提取可用科目列表
  const availableSubjects = useMemo(() => {
    const subjects = Array.from(new Set(data.map((d) => d.subject))).sort();
    console.log("🔍 [ClassValueAddedReport] Available subjects:", subjects);
    return subjects;
  }, [data]);

  // 按科目筛选数据
  const filteredData = useMemo(() => {
    const result =
      selectedSubject === "all"
        ? data
        : data.filter((d) => d.subject === selectedSubject);

    console.log("🔍 [ClassValueAddedReport] Data:", {
      totalRecords: data.length,
      availableSubjects,
      selectedSubject,
      filteredCount: result.length,
      sampleData: result.slice(0, 2),
    });

    return result;
  }, [data, selectedSubject, availableSubjects]);

  // 导出Excel
  const handleExport = () => {
    const result = exportClassReportToExcel(filteredData, {
      subject: selectedSubject,
    });
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

    const className = filteredData.length > 0 ? "全部班级" : "班级";

    try {
      toast.loading("正在生成PDF，请稍候...");
      await valueAddedPdfExporter.exportClassReport(
        reportRef.current,
        className,
        selectedSubject
      );
      toast.success("PDF导出成功!");
    } catch (error) {
      console.error("PDF导出失败:", error);
      toast.error("PDF导出失败，请重试");
    }
  };

  // 排序后的数据
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortBy] as number;
      const bValue = b[sortBy] as number;

      return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
    });
  }, [filteredData, sortBy, sortOrder]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, PAGE_SIZE]);

  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);

  // 切换排序时重置到第一页
  const handleSort = (column: keyof ClassValueAdded) => {
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
    if (filteredData.length === 0) return null;

    const totalStudents = filteredData.reduce(
      (sum, c) => sum + c.total_students,
      0
    );
    const avgValueAddedRate =
      filteredData.reduce((sum, c) => sum + c.avg_score_value_added_rate, 0) /
      filteredData.length;
    const avgConsolidationRate =
      filteredData.reduce((sum, c) => sum + c.consolidation_rate, 0) /
      filteredData.length;
    const avgTransformationRate =
      filteredData.reduce((sum, c) => sum + c.transformation_rate, 0) /
      filteredData.length;

    return {
      totalStudents,
      avgValueAddedRate,
      avgConsolidationRate,
      avgTransformationRate,
    };
  }, [filteredData]);

  // ✅ BoxPlot数据准备 - 按科目展示分数分布
  const boxPlotData = useMemo((): BoxPlotData[] => {
    if (filteredData.length === 0) return [];

    // 按科目分组
    const subjectGroups = new Map<string, ClassValueAdded[]>();
    filteredData.forEach((item) => {
      if (!subjectGroups.has(item.subject)) {
        subjectGroups.set(item.subject, []);
      }
      subjectGroups.get(item.subject)!.push(item);
    });

    // 为每个科目计算箱线图数据
    return Array.from(subjectGroups.entries()).map(([subject, classes]) => {
      // 提取出口分数数组
      const exitScores = classes
        .map((c) => c.avg_score_exit)
        .filter((score) => score != null && !isNaN(score));

      // 假设满分为100
      const fullScore = 100;
      const stats = calculateBoxPlotStats(exitScores, fullScore);

      return {
        subject,
        ...stats,
      };
    });
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无班级增值数据</p>
        <p className="text-sm mt-2">
          请先在"增值活动"标签页中创建活动并点击"开始计算"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* 科目选择器和导出按钮 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部科目</SelectItem>
              {availableSubjects.map((subj) => (
                <SelectItem key={subj} value={subj}>
                  {subj}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline">{filteredData.length} 条记录</Badge>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileDown className="h-4 w-4 mr-2" />
            导出PDF
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出Excel
          </Button>
        </div>
      </div>

      {/* 统计摘要 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">总学生数</div>
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
            <div className="text-sm text-muted-foreground">平均巩固率</div>
            <div className="text-2xl font-bold">
              {(summary.avgConsolidationRate * 100).toFixed(1)}%
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
              <TabsTrigger value="distribution">📊 分数分布</TabsTrigger>
              <TabsTrigger value="ai-insights">✨ AI洞察</TabsTrigger>
              <TabsTrigger value="chart">三率对比</TabsTrigger>
              <TabsTrigger value="all">综合视图</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="score" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">排名</TableHead>
                  <TableHead>班级名称</TableHead>
                  {selectedSubject === "all" && <TableHead>科目</TableHead>}
                  <TableHead className="text-right">学生数</TableHead>
                  <TableHead className="text-right">入口分</TableHead>
                  <TableHead className="text-right">出口分</TableHead>
                  <TableHead className="text-right">入口标准分</TableHead>
                  <TableHead className="text-right">出口标准分</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted"
                    onClick={() => handleSort("avg_score_value_added_rate")}
                  >
                    增值率
                  </TableHead>
                  <TableHead className="text-right">进步比例</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((classData, index) => {
                  const actualIndex = (currentPage - 1) * PAGE_SIZE + index;
                  return (
                    <TableRow
                      key={`${classData.class_name}-${classData.subject}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {classData.rank_in_grade === 1 && (
                            <Award className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="font-medium">
                            #{actualIndex + 1}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {classData.class_name}
                      </TableCell>
                      {selectedSubject === "all" && (
                        <TableCell>
                          <Badge variant="outline">{classData.subject}</Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {classData.total_students}
                      </TableCell>
                      <TableCell className="text-right">
                        {classData.avg_score_entry?.toFixed(2) || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {classData.avg_score_exit?.toFixed(2) || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {classData.avg_score_standard_entry?.toFixed(2) || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {classData.avg_score_standard_exit?.toFixed(2) || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={
                              classData.avg_score_value_added_rate > 0
                                ? "text-green-600 font-semibold"
                                : classData.avg_score_value_added_rate < 0
                                  ? "text-red-600 font-semibold"
                                  : ""
                            }
                          >
                            {(
                              classData.avg_score_value_added_rate * 100
                            ).toFixed(2)}
                            %
                          </span>
                          {classData.avg_score_value_added_rate > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : classData.avg_score_value_added_rate < 0 ? (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {(classData.progress_student_ratio * 100).toFixed(1)}%
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
                  <TableHead>班级名称</TableHead>
                  {selectedSubject === "all" && <TableHead>科目</TableHead>}
                  <TableHead className="text-right">学生数</TableHead>
                  <TableHead className="text-right">巩固率</TableHead>
                  <TableHead className="text-right">转化率</TableHead>
                  <TableHead className="text-right">贡献率</TableHead>
                  <TableHead className="text-right">优秀增量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((classData, index) => {
                  const actualIndex = (currentPage - 1) * PAGE_SIZE + index;
                  return (
                    <TableRow
                      key={`${classData.class_name}-${classData.subject}-ability`}
                    >
                      <TableCell>
                        <span className="font-medium">#{actualIndex + 1}</span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {classData.class_name}
                      </TableCell>
                      {selectedSubject === "all" && (
                        <TableCell>
                          <Badge variant="outline">{classData.subject}</Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        {classData.total_students}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            classData.consolidation_rate > 0.7
                              ? "default"
                              : "secondary"
                          }
                        >
                          {(classData.consolidation_rate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            classData.transformation_rate > 0.3
                              ? "default"
                              : "secondary"
                          }
                        >
                          {(classData.transformation_rate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(classData.contribution_rate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            classData.excellent_gain > 0
                              ? "text-green-600 font-semibold"
                              : classData.excellent_gain < 0
                                ? "text-red-600 font-semibold"
                                : ""
                          }
                        >
                          {classData.excellent_gain > 0 ? "+" : ""}
                          {classData.excellent_gain}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {renderPagination()}
          </TabsContent>

          {/* ✅ 新增：分数分布箱线图标签页 */}
          <TabsContent value="distribution" className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">班级分数分布对比</h3>
                <p className="text-sm text-muted-foreground">
                  箱线图展示各科目班级平均分的分布情况，包括中位数、四分位数和离群值
                </p>
              </div>

              {boxPlotData.length > 0 ? (
                <BoxPlotChart
                  data={boxPlotData}
                  title={
                    selectedSubject === "all"
                      ? "各科目分数分布"
                      : `${selectedSubject} 分数分布`
                  }
                  height={400}
                  showOutliers={true}
                  showMean={true}
                  normalizeByPercent={false}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  暂无分数分布数据
                </div>
              )}

              <Card className="p-4 bg-amber-50 dark:bg-amber-950">
                <div className="text-sm space-y-2">
                  <p className="font-semibold">箱线图说明：</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      <strong>箱体</strong>
                      ：表示25%-75%分位区间（中间50%的数据）
                    </li>
                    <li>
                      <strong>中线</strong>：表示中位数（50%分位数）
                    </li>
                    <li>
                      <strong>均值点</strong>：红色菱形表示平均分
                    </li>
                    <li>
                      <strong>须线</strong>：表示非离群值的最大/最小范围
                    </li>
                    <li>
                      <strong>离群值</strong>：圆点表示异常高/低的分数
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* ✅ AI智能洞察标签页 */}
          <TabsContent value="ai-insights" className="p-6">
            <AIInsightsPanel
              data={filteredData}
              context={{
                subject:
                  selectedSubject === "all" ? undefined : selectedSubject,
                className: filteredData.length > 0 ? "多个班级" : undefined,
              }}
              maxInsights={8}
            />
          </TabsContent>

          <TabsContent value="chart" className="p-6">
            <ThreeRatesComparison data={sortedData} type="class" />
          </TabsContent>

          <TabsContent value="all" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>班级名称</TableHead>
                  <TableHead className="text-right">学生数</TableHead>
                  <TableHead className="text-right">增值率</TableHead>
                  <TableHead className="text-right">进步比例</TableHead>
                  <TableHead className="text-right">巩固率</TableHead>
                  <TableHead className="text-right">转化率</TableHead>
                  <TableHead className="text-right">优秀增量</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((classData) => (
                  <TableRow key={classData.class_name}>
                    <TableCell className="font-medium">
                      {classData.class_name}
                    </TableCell>
                    <TableCell className="text-right">
                      {classData.total_students}
                    </TableCell>
                    <TableCell className="text-right">
                      {classData.avg_score_value_added_rate.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(classData.progress_student_ratio * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {(classData.consolidation_rate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {(classData.transformation_rate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {classData.excellent_gain > 0 ? "+" : ""}
                      {classData.excellent_gain}
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
              ：出口标准分相对入口标准分的变化，数值越大表示进步越明显
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
              <strong>贡献率</strong>：该班级对年级整体优秀人数增长的贡献百分比
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
