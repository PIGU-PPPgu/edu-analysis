"use client";

/**
 * 学科均衡分析报告组件
 * 展示班级学科发展的均衡性分析
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Target,
  Download,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { exportSubjectBalanceReportToExcel } from "@/services/reportExportService";
import { valueAddedPdfExporter } from "@/services/valueAddedPdfExporter";
import type { SubjectBalanceAnalysis } from "@/types/valueAddedTypes";
import {
  getBalanceLevel,
  identifyStrengthsAndWeaknesses,
  generateBalanceSuggestions,
} from "@/services/subjectBalanceService";
import { safeToFixed, safePercent, safeNumber } from "@/utils/formatUtils";

interface SubjectBalanceReportProps {
  /** 班级学科均衡数据 */
  data: SubjectBalanceAnalysis[];

  /** 是否显示加载状态 */
  loading?: boolean;
}

export function SubjectBalanceReport({
  data,
  loading = false,
}: SubjectBalanceReportProps) {
  const [selectedClass, setSelectedClass] =
    useState<SubjectBalanceAnalysis | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // 导出Excel
  const handleExport = () => {
    const result = exportSubjectBalanceReportToExcel(data);
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

    const className = data[0]?.class_name ?? "班级";

    try {
      toast.loading("正在生成PDF，请稍候...");
      await valueAddedPdfExporter.exportSubjectBalanceReport(
        reportRef.current,
        className
      );
      toast.success("PDF导出成功!");
    } catch (error) {
      console.error("PDF导出失败:", error);
      toast.error("PDF导出失败，请重试");
    }
  };

  // 按综合得分排序
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.balance_score - a.balance_score);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">加载中...</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <p>暂无学科均衡数据</p>
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

      {/* 班级列表或详情 */}
      {!selectedClass ? (
        <>
          {/* 统计摘要 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">班级总数</div>
              <div className="text-2xl font-bold">{data.length}</div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">平均偏离度</div>
              <div className="text-2xl font-bold">
                {(
                  data.reduce((sum, c) => sum + c.subject_deviation, 0) /
                  data.length
                ).toFixed(3)}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm text-muted-foreground">优秀班级</div>
              <div className="text-2xl font-bold">
                {
                  data.filter(
                    (c) =>
                      getBalanceLevel(c.subject_deviation).level === "excellent"
                  ).length
                }
              </div>
            </Card>
          </div>

          {/* 班级列表 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                班级学科均衡排名
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">排名</TableHead>
                    <TableHead>班级</TableHead>
                    <TableHead className="text-right">总分增值率</TableHead>
                    <TableHead className="text-right">学科偏离度</TableHead>
                    <TableHead className="text-right">均衡度评价</TableHead>
                    <TableHead className="text-right">综合得分</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.map((classData, index) => {
                    const balanceLevel = getBalanceLevel(
                      classData.subject_deviation
                    );
                    return (
                      <TableRow key={classData.class_name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <Award className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className="font-medium">#{index + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {classData.class_name}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            style={{
                              color:
                                classData.total_score_value_added_rate > 0
                                  ? "#B9FF66"
                                  : classData.total_score_value_added_rate < 0
                                    ? "#f87171"
                                    : undefined,
                              fontWeight:
                                classData.total_score_value_added_rate !== 0
                                  ? 600
                                  : undefined,
                            }}
                          >
                            {safeToFixed(
                              classData.total_score_value_added_rate,
                              3
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {safeToFixed(classData.subject_deviation, 3)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: balanceLevel.color,
                              color: balanceLevel.color,
                            }}
                          >
                            {balanceLevel.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {classData.balance_score.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClass(classData)}
                          >
                            查看详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <ClassBalanceDetail
          classData={selectedClass}
          onBack={() => setSelectedClass(null)}
        />
      )}

      {/* 说明文字 */}
      {!selectedClass && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950">
          <div className="text-sm space-y-2">
            <p className="font-semibold">指标说明：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>总分增值率</strong>：所有科目的平均增值率
              </li>
              <li>
                <strong>学科偏离度</strong>
                ：各科目增值率的标准差，数值越小表示学科发展越均衡
              </li>
              <li>
                <strong>综合得分</strong>：综合考虑总分增值和均衡度的评分
              </li>
              <li>
                <strong>均衡度评价</strong>
                ：根据偏离度划分为优秀(&lt;0.1)、良好(0.1-0.2)、一般(0.2-0.3)、需改进(&gt;0.3)
              </li>
            </ul>
          </div>
        </Card>
      )}
    </div>
  );
}

/**
 * 班级详情视图
 */
interface ClassBalanceDetailProps {
  classData: SubjectBalanceAnalysis;
  onBack: () => void;
  initialTab?: string;
}

function ClassBalanceDetail({
  classData,
  onBack,
  initialTab = "table",
}: ClassBalanceDetailProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const balanceLevel = getBalanceLevel(classData.subject_deviation);
  const { strengths, weaknesses } = identifyStrengthsAndWeaknesses(
    classData.subjects
  );
  const suggestions = generateBalanceSuggestions(classData);

  // 同步外部 initialTab 变化
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <Button variant="outline" onClick={onBack}>
        ← 返回列表
      </Button>

      {/* 班级信息卡片 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">{classData.class_name}</CardTitle>
            <Badge
              variant="outline"
              className="text-lg px-4 py-1"
              style={{
                borderColor: balanceLevel.color,
                color: balanceLevel.color,
              }}
            >
              {balanceLevel.label}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 核心指标 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">总分增值率</div>
          <div className="text-2xl font-bold flex items-center gap-2">
            {safeToFixed(classData.total_score_value_added_rate, 3)}
            {classData.total_score_value_added_rate > 0 ? (
              <TrendingUp className="h-5 w-5" style={{ color: "#B9FF66" }} />
            ) : classData.total_score_value_added_rate < 0 ? (
              <TrendingDown className="h-5 w-5" style={{ color: "#f87171" }} />
            ) : null}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">学科偏离度</div>
          <div className="text-2xl font-bold">
            {classData.subject_deviation.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            数值越小越均衡
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground">综合得分</div>
          <div className="text-2xl font-bold">
            {classData.balance_score.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            排名: #{classData.total_rank}
          </div>
        </Card>
      </div>

      {/* 各科目详情 */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b px-6 pt-4">
            <TabsList>
              <TabsTrigger value="table">数据表格</TabsTrigger>
              <TabsTrigger value="chart">可视化图表</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="table" className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>科目</TableHead>
                  <TableHead className="text-right">增值率</TableHead>
                  <TableHead className="text-right">偏离平均值</TableHead>
                  <TableHead className="text-right">年级排名</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classData.subjects.map((subject) => {
                  const isStrength = strengths.some(
                    (s) => s.subject === subject.subject
                  );
                  const isWeakness = weaknesses.some(
                    (s) => s.subject === subject.subject
                  );

                  return (
                    <TableRow key={subject.subject}>
                      <TableCell className="font-medium">
                        {subject.subject}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          style={{
                            color:
                              subject.value_added_rate > 0
                                ? "#B9FF66"
                                : subject.value_added_rate < 0
                                  ? "#f87171"
                                  : undefined,
                            fontWeight:
                              subject.value_added_rate !== 0 ? 600 : undefined,
                          }}
                        >
                          {safeToFixed(subject.value_added_rate, 3)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          style={{
                            color:
                              subject.deviation_from_avg > 0
                                ? "#B9FF66"
                                : subject.deviation_from_avg < 0
                                  ? "#f87171"
                                  : undefined,
                          }}
                        >
                          {subject.deviation_from_avg > 0 ? "+" : ""}
                          {safeToFixed(subject.deviation_from_avg, 3)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {subject.rank ? `#${subject.rank}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {isStrength && (
                          <Badge variant="default" className="bg-green-500">
                            优势
                          </Badge>
                        )}
                        {isWeakness && (
                          <Badge variant="destructive">弱势</Badge>
                        )}
                        {!isStrength && !isWeakness && (
                          <Badge variant="secondary">一般</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="chart" className="p-6">
            <div className="space-y-4">
              {classData.subjects.map((subject) => {
                const maxRate = 0.5;
                const percentage = Math.min(
                  (Math.abs(subject.value_added_rate) / maxRate) * 100,
                  100
                );

                return (
                  <div key={subject.subject} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{subject.subject}</span>
                      <span
                        style={{
                          color:
                            subject.value_added_rate > 0
                              ? "#B9FF66"
                              : subject.value_added_rate < 0
                                ? "#f87171"
                                : undefined,
                          fontWeight:
                            subject.value_added_rate !== 0 ? 600 : undefined,
                        }}
                      >
                        {safeToFixed(subject.value_added_rate, 3)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          subject.value_added_rate > 0
                            ? "bg-green-500"
                            : subject.value_added_rate < 0
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

      {/* 优势和弱势科目 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-green-200 bg-green-50 dark:bg-green-950">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              优势科目
            </h3>
          </div>
          {strengths.length > 0 ? (
            <ul className="space-y-1">
              {strengths.map((s) => (
                <li
                  key={s.subject}
                  className="text-sm text-green-800 dark:text-green-200"
                >
                  • {s.subject}：增值率 {safeToFixed(s.value_added_rate, 3)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-700 dark:text-green-300">
              暂无明显优势科目
            </p>
          )}
        </Card>

        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900 dark:text-red-100">
              弱势科目
            </h3>
          </div>
          {weaknesses.length > 0 ? (
            <ul className="space-y-1">
              {weaknesses.map((s) => (
                <li
                  key={s.subject}
                  className="text-sm text-red-800 dark:text-red-200"
                >
                  • {s.subject}：增值率 {safeToFixed(s.value_added_rate, 3)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-red-700 dark:text-red-300">
              暂无明显弱势科目
            </p>
          )}
        </Card>
      </div>

      {/* 改进建议 */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            改进建议
          </h3>
        </div>
        <ul className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              className="text-sm text-blue-800 dark:text-blue-200"
            >
              {index + 1}. {suggestion}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
