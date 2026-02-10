"use client";

/**
 * 班级增值评价报告组件
 * 展示班级分数和能力增值数据
 */

import { useState, useMemo, useRef, useEffect } from "react";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  X,
  AlertTriangle,
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
import { ValueAddedScatterPlot } from "../charts/ValueAddedScatterPlot";
import BoxPlotChart, {
  type BoxPlotData,
  calculateBoxPlotStats,
} from "@/components/analysis/charts/BoxPlotChart";
import { AIInsightsPanel } from "../ai/AIInsightsPanel";
import { AnomalyDetailView, type AnomalyDetail } from "../ai/AnomalyDetailView";
import type { ClassValueAdded } from "@/types/valueAddedTypes";

interface ClassValueAddedReportProps {
  /** 班级增值数据 */
  data: ClassValueAdded[];

  /** 科目名称 */
  subject: string;

  /** 是否显示加载状态 */
  loading?: boolean;

  /** 🔧 修复：初始显示的Tab（默认为"score"） */
  initialTab?:
    | "score"
    | "ability"
    | "distribution"
    | "scatter"
    | "anomaly"
    | "ai-insights"
    | "chart"
    | "all";
}

export function ClassValueAddedReport({
  data,
  subject,
  loading = false,
  initialTab = "score",
}: ClassValueAddedReportProps) {
  console.log("🔍 ClassValueAddedReport initialTab:", initialTab);

  // 🔧 P0修复：使用受控模式管理Tab状态
  type ReportTab = NonNullable<ClassValueAddedReportProps["initialTab"]>;
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);

  const [sortBy, setSortBy] = useState<keyof ClassValueAdded>(
    "avg_score_value_added_rate"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [classNameFilter, setClassNameFilter] = useState<string>("");
  const [quickPreset, setQuickPreset] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 20;

  // 🎯 异常值检测阈值（与@calc-architect确认）
  const ANOMALY_THRESHOLDS = {
    moderate: 0.2, // >20% 显示警告
    severe: 0.3, // >30% 显示严重警告
    negative_moderate: -0.15, // <-15% 显示警告
    negative_severe: -0.25, // <-25% 显示严重警告
  };

  // 🔧 P0修复：initialTab变化时重置activeTab
  useEffect(() => {
    console.log("🔍 useEffect: initialTab changed to", initialTab);
    setActiveTab(initialTab);
  }, [initialTab]);

  // 过滤条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubject, classNameFilter, quickPreset]);

  // 提取可用科目列表（总分置顶）
  const availableSubjects = useMemo(() => {
    const subjects = Array.from(new Set(data.map((d) => d.subject))).sort();

    // ✅ 总分置顶
    const totalIndex = subjects.indexOf("总分");
    if (totalIndex > -1) {
      subjects.splice(totalIndex, 1);
      subjects.unshift("总分");
    }

    return subjects;
  }, [data]);

  // 按科目筛选数据
  const filteredData = useMemo(() => {
    let result =
      selectedSubject === "all"
        ? data
        : data.filter((d) => d.subject === selectedSubject);

    // 班级名称筛选
    if (classNameFilter.trim()) {
      result = result.filter((d) =>
        d.class_name.toLowerCase().includes(classNameFilter.toLowerCase())
      );
    }

    // 快速预设筛选
    if (quickPreset === "excellent") {
      // 增值典范：增值率 > 10%
      result = result.filter((d) => d.avg_score_value_added_rate > 0.1);
    } else if (quickPreset === "concern") {
      // 需要关注：增值率 < 0%
      result = result.filter((d) => d.avg_score_value_added_rate < 0);
    } else if (quickPreset === "high") {
      // 高增值：增值率 > 5%
      result = result.filter((d) => d.avg_score_value_added_rate > 0.05);
    }

    return result;
  }, [data, selectedSubject, availableSubjects, classNameFilter, quickPreset]);

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
  // 生成异常数据（使用Z-score方法检测异常）
  const anomalyData = useMemo<AnomalyDetail[]>(() => {
    if (filteredData.length === 0) return [];

    const anomalies: AnomalyDetail[] = [];

    // 计算各指标的均值和标准差
    const calculateStats = (values: number[]) => {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
      const std = Math.sqrt(variance);
      return { mean, std };
    };

    // 增值率
    const valueAddedRates = filteredData
      .map((d) => d.avg_score_value_added_rate)
      .filter((v) => v !== undefined);
    const valueAddedStats = calculateStats(valueAddedRates);

    // 巩固率
    const consolidationRates = filteredData
      .map((d) => d.consolidation_rate)
      .filter((v) => v !== undefined);
    const consolidationStats = calculateStats(consolidationRates);

    // 转化率
    const transformationRates = filteredData
      .map((d) => d.transformation_rate)
      .filter((v) => v !== undefined);
    const transformationStats = calculateStats(transformationRates);

    // 检测每个班级的异常
    filteredData.forEach((classData) => {
      // 检测增值率异常
      if (classData.avg_score_value_added_rate !== undefined) {
        const zScore =
          (classData.avg_score_value_added_rate - valueAddedStats.mean) /
          (valueAddedStats.std || 1);
        if (Math.abs(zScore) > 2) {
          anomalies.push({
            id: `${classData.class_name}-value-added`,
            name: classData.class_name,
            className: classData.class_name,
            subject: selectedSubject === "all" ? "全科" : selectedSubject,
            reason: `增值率${classData.avg_score_value_added_rate > 0 ? "+" : ""}${(classData.avg_score_value_added_rate * 100).toFixed(1)}%，${zScore > 0 ? "显著高于" : "显著低于"}平均水平`,
            severity:
              Math.abs(zScore) > 3
                ? "high"
                : Math.abs(zScore) > 2.5
                  ? "medium"
                  : "low",
            value: classData.avg_score_value_added_rate,
            standardDeviation: zScore,
            type: "class",
          });
        }
      }

      // 检测巩固率异常
      if (classData.consolidation_rate !== undefined) {
        const zScore =
          (classData.consolidation_rate - consolidationStats.mean) /
          (consolidationStats.std || 1);
        if (zScore < -2) {
          // 只关注低巩固率
          anomalies.push({
            id: `${classData.class_name}-consolidation`,
            name: classData.class_name,
            className: classData.class_name,
            subject: selectedSubject === "all" ? "全科" : selectedSubject,
            reason: `巩固率${classData.consolidation_rate.toFixed(1)}%，优秀学生保持率不足`,
            severity: zScore < -3 ? "high" : zScore < -2.5 ? "medium" : "low",
            value: classData.consolidation_rate,
            standardDeviation: zScore,
            type: "class",
          });
        }
      }

      // 检测转化率异常
      if (classData.transformation_rate !== undefined) {
        const zScore =
          (classData.transformation_rate - transformationStats.mean) /
          (transformationStats.std || 1);
        if (zScore < -2) {
          // 只关注低转化率
          anomalies.push({
            id: `${classData.class_name}-transformation`,
            name: classData.class_name,
            className: classData.class_name,
            subject: selectedSubject === "all" ? "全科" : selectedSubject,
            reason: `转化率${classData.transformation_rate.toFixed(1)}%，后进生提升效果不佳`,
            severity: zScore < -3 ? "high" : zScore < -2.5 ? "medium" : "low",
            value: classData.transformation_rate,
            standardDeviation: zScore,
            type: "class",
          });
        }
      }
    });

    return anomalies;
  }, [filteredData, selectedSubject]);

  const boxPlotData = useMemo((): BoxPlotData[] => {
    if (filteredData.length === 0) return [];

    // 按科目分组（排除总分，避免数值范围差异过大压缩其他科目显示）
    const subjectGroups = new Map<string, ClassValueAdded[]>();
    filteredData.forEach((item) => {
      // 排除总分：总分数值范围（如660分）远大于单科（如100分），会压缩箱线图
      if (item.subject === "总分") return;

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
      {/* 筛选器和导出按钮 */}
      <div className="space-y-4">
        {/* 第一行：科目选择和导出 */}
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

        {/* 第二行：高级筛选 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 班级名称搜索 */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索班级名称..."
              value={classNameFilter}
              onChange={(e) => setClassNameFilter(e.target.value)}
              className="pl-8 pr-8"
            />
            {classNameFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2"
                onClick={() => setClassNameFilter("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 快速预设 */}
          <div className="flex gap-2">
            <Button
              variant={quickPreset === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickPreset("all")}
            >
              全部
            </Button>
            <Button
              variant={quickPreset === "excellent" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickPreset("excellent")}
            >
              <Award className="h-3 w-3 mr-1" />
              增值典范 (&gt;10%)
            </Button>
            <Button
              variant={quickPreset === "high" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickPreset("high")}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              高增值 (&gt;5%)
            </Button>
            <Button
              variant={quickPreset === "concern" ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickPreset("concern")}
            >
              <TrendingDown className="h-3 w-3 mr-1" />
              需要关注 (&lt;0%)
            </Button>
          </div>
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

      {/* 🚨 异常值警告 */}
      {summary &&
        (() => {
          const rate = summary.avgValueAddedRate;
          const absRate = Math.abs(rate);

          // 判断异常级别
          let alertVariant: "default" | "destructive" = "default";
          let alertTitle = "";
          let alertIcon = null;

          if (absRate >= ANOMALY_THRESHOLDS.severe) {
            alertVariant = "destructive";
            alertTitle =
              rate > 0
                ? `严重异常：增值率达到${(rate * 100).toFixed(1)}%`
                : `严重异常：增值率为${(rate * 100).toFixed(1)}%`;
            alertIcon = <AlertTriangle className="h-4 w-4" />;
          } else if (absRate >= ANOMALY_THRESHOLDS.moderate) {
            alertVariant = "default";
            alertTitle = `异常提醒：增值率达到${(rate * 100).toFixed(1)}%`;
            alertIcon = <AlertTriangle className="h-4 w-4 text-orange-500" />;
          } else if (rate <= ANOMALY_THRESHOLDS.negative_severe) {
            alertVariant = "destructive";
            alertTitle = `严重异常：增值率为${(rate * 100).toFixed(1)}%`;
            alertIcon = <AlertTriangle className="h-4 w-4" />;
          } else if (rate <= ANOMALY_THRESHOLDS.negative_moderate) {
            alertVariant = "default";
            alertTitle = `异常提醒：增值率为${(rate * 100).toFixed(1)}%`;
            alertIcon = <AlertTriangle className="h-4 w-4 text-orange-500" />;
          }

          if (!alertTitle) return null;

          const isSevere = alertVariant === "destructive";

          return (
            <Alert variant={alertVariant} className="border-2">
              <div className="flex items-start gap-3">
                {alertIcon}
                <div className="flex-1 space-y-3">
                  <AlertTitle className="text-base font-semibold mb-2">
                    {alertTitle}
                  </AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p className="text-sm">
                      {isSevere
                        ? "在统计学上属于极端异常（超过±3个标准差），强烈建议检查数据质量。"
                        : "这个数值超出正常范围（通常为±15%），建议检查数据质量。"}
                    </p>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold">可能原因：</p>
                      <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                        <li>
                          入口/出口考试难度差异{isSevere ? "过大" : "较大"}
                        </li>
                        <li>存在未标记的缺考学生（0分误当真实成绩）</li>
                        <li>
                          样本量{isSevere ? "过小" : "偏小"}（建议≥30人，当前
                          {summary.totalStudents}人）
                        </li>
                        {isSevere && <li>数据录入错误或异常值</li>}
                      </ul>
                    </div>

                    {isSevere && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold">建议行动：</p>
                        <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                          <li>查看数据质量报告，检查缺考率和0分占比</li>
                          <li>对比入口/出口考试的平均分和标准差</li>
                          <li>确认样本量是否足够（建议≥30人）</li>
                        </ol>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm"
                        onClick={() => {
                          toast.info(
                            "数据质量报告功能开发中，请先检查原始数据"
                          );
                        }}
                      >
                        查看数据质量报告 →
                      </Button>
                    </div>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          );
        })()}

      {/* 主数据表格 */}
      <Card>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ReportTab)}
        >
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="score">分数增值</TabsTrigger>
              <TabsTrigger value="ability">能力增值</TabsTrigger>
              <TabsTrigger value="distribution">分数分布</TabsTrigger>
              <TabsTrigger value="scatter">增值散点图</TabsTrigger>
              <TabsTrigger value="anomaly">异常检测</TabsTrigger>
              <TabsTrigger value="ai-insights">算法洞察</TabsTrigger>
              <TabsTrigger value="chart">三率对比</TabsTrigger>
              <TabsTrigger value="all">综合视图</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="score" className="p-6">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <p>无匹配结果</p>
                <p className="text-sm mt-2">请尝试调整筛选条件</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">排名</TableHead>
                    <TableHead>班级名称</TableHead>
                    {selectedSubject === "all" && <TableHead>科目</TableHead>}
                    <TableHead className="text-right">学生数</TableHead>
                    <TableHead className="text-right">入口分</TableHead>
                    <TableHead className="text-right">出口分</TableHead>
                    <TableHead className="text-right">入口位置分</TableHead>
                    <TableHead className="text-right">出口位置分</TableHead>
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
                          {classData.avg_score_standard_entry?.toFixed(2) ||
                            "-"}
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
            )}

            {filteredData.length > 0 && renderPagination()}
          </TabsContent>

          <TabsContent value="ability" className="p-6">
            {filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <p>无匹配结果</p>
                <p className="text-sm mt-2">请尝试调整筛选条件</p>
              </div>
            ) : (
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
                          <span className="font-medium">
                            #{actualIndex + 1}
                          </span>
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
            )}

            {filteredData.length > 0 && renderPagination()}
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

          {/* 📈 增值散点图标签页 */}
          <TabsContent value="scatter" className="p-6">
            <ValueAddedScatterPlot
              data={filteredData}
              type="class"
              title="班级增值效果散点分析"
              description="分析入口分与出口分的关系，识别增值效果显著的班级"
            />
          </TabsContent>

          {/* 异常检测标签页 */}
          <TabsContent value="anomaly" className="p-6">
            <AnomalyDetailView anomalies={anomalyData} loading={loading} />
          </TabsContent>

          {/* 算法洞察标签页 */}
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
        <div className="text-sm space-y-3">
          <div>
            <p className="font-semibold mb-2">指标说明：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>增值率</strong>
                ：学生在本学期的进步幅度，相对于同年级其他班级的表现。正值表示进步快于平均水平
              </li>
              <li>
                <strong>巩固率</strong>
                ：保持最高等级（A+，即前5%）的学生比例，衡量对优秀学生的保持能力
              </li>
              <li>
                <strong>转化率</strong>
                ：等级提升的学生比例，衡量对中低等学生的提升能力
              </li>
              <li>
                <strong>贡献率</strong>
                ：该班级对年级整体优秀人数增长的贡献百分比
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-blue-200">
            <p className="font-semibold mb-2">等级说明（按排名分布）：</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-12 h-5 bg-gradient-to-r from-green-500 to-green-600 rounded flex items-center justify-center text-white font-bold">
                  A+
                </span>
                <span className="text-muted-foreground">前5%（最优秀）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 h-5 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center text-white font-bold">
                  A
                </span>
                <span className="text-muted-foreground">5%-25%（优秀）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 h-5 bg-gradient-to-r from-purple-500 to-purple-600 rounded flex items-center justify-center text-white font-bold">
                  B+
                </span>
                <span className="text-muted-foreground">25%-50%（良好+）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 h-5 bg-gradient-to-r from-orange-500 to-orange-600 rounded flex items-center justify-center text-white font-bold">
                  B
                </span>
                <span className="text-muted-foreground">50%-75%（良好）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 h-5 bg-gradient-to-r from-red-500 to-red-600 rounded flex items-center justify-center text-white font-bold">
                  C+
                </span>
                <span className="text-muted-foreground">75%-95%（合格+）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 h-5 bg-gradient-to-r from-gray-500 to-gray-600 rounded flex items-center justify-center text-white font-bold">
                  C
                </span>
                <span className="text-muted-foreground">95%-100%（合格）</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 例如：A+ 表示该学生排名在全年级前5%，属于最优秀的学生群体
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
