"use client";

/**
 * 分数段对比分析组件
 * 展示入口考试和出口考试的各等级人数分布对比
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

// ============================================
// 类型定义
// ============================================

/** 等级统计 */
interface GradeStats {
  count: number; // 人数
  percentage: number; // 比例（0-1）
}

/** 单科目分数段统计 */
export interface ScoreBandStats {
  subject: string; // 学科名称
  totalCount: number; // 分析人数
  avgScore: number; // 平均分
  avgScoreRank?: number; // 平均分排名（可选）

  // 各等级统计（A+, A, B+, B, C+, C）
  gradeStats: Record<string, GradeStats>;

  // 累计统计（A以上 = A+ + A）
  cumulativeStats?: Record<string, GradeStats>;
}

/** 变化统计 */
interface ChangeStats {
  countChange: number; // 人数变化
  percentageChange: number; // 比例变化
}

/** 分数段分析完整数据 */
export interface ScoreBandAnalysis {
  entryExam: ScoreBandStats[]; // 入口考试
  exitExam: ScoreBandStats[]; // 出口考试
  changes: Record<string, Record<string, ChangeStats>>; // 变化统计
}

// ============================================
// 组件参数
// ============================================

interface ScoreBandComparisonProps {
  data: ScoreBandAnalysis;
  showCumulative?: boolean; // 是否显示累计列（默认true）
  showRank?: boolean; // 是否显示排名列（默认true）
}

// ============================================
// 辅助函数
// ============================================

/** 格式化百分比 */
function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 渲染变化指示器 */
function renderChangeIndicator(change: number, type: "count" | "percentage") {
  if (change === 0) {
    return (
      <span className="text-gray-400 flex items-center gap-1">
        <Minus className="h-3 w-3" />
        {type === "count" ? "0" : "0%"}
      </span>
    );
  }

  const isPositive = change > 0;
  const displayValue =
    type === "count" ? Math.abs(change) : formatPercentage(Math.abs(change));

  return (
    <span
      className={`flex items-center gap-1 font-medium ${
        isPositive ? "text-green-600" : "text-red-600"
      }`}
    >
      {isPositive ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      {displayValue}
    </span>
  );
}

/** 获取变化背景色 */
function getChangeBgColor(change: number): string {
  if (change > 0) return "bg-green-50";
  if (change < 0) return "bg-red-50";
  return "";
}

// ============================================
// 主组件
// ============================================

export function ScoreBandComparison({
  data,
  showCumulative = true,
  showRank = true,
}: ScoreBandComparisonProps) {
  // 等级顺序（从高到低）
  const grades = ["A+", "A", "B+", "B", "C+", "C"];

  // 累计项定义（如果显示）- 按team-lead要求包含5个累计项
  const cumulativeKeys = showCumulative
    ? ["A+以上", "A以上", "B+以上", "B以上", "C+以上"]
    : [];

  /**
   * 渲染单个表格（入口或出口）
   */
  const renderTable = (
    stats: ScoreBandStats[],
    title: string,
    isExit: boolean
  ) => {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {title}
            <Badge variant={isExit ? "default" : "secondary"}>
              {stats.length} 个科目
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">学科</TableHead>
                  <TableHead className="text-right min-w-[60px]">
                    人数
                  </TableHead>
                  <TableHead className="text-right min-w-[70px]">
                    平均分
                  </TableHead>
                  {showRank && (
                    <TableHead className="text-right min-w-[80px]">
                      平均分排名
                    </TableHead>
                  )}

                  {/* 各等级列 */}
                  {grades.map((grade) => (
                    <TableHead
                      key={grade}
                      colSpan={2}
                      className="text-center border-l"
                    >
                      <div className="font-semibold">{grade}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        人数 / 比例
                      </div>
                    </TableHead>
                  ))}

                  {/* 累计列 */}
                  {cumulativeKeys.map((key) => (
                    <TableHead
                      key={key}
                      colSpan={2}
                      className="text-center border-l bg-blue-50"
                    >
                      <div className="font-semibold">{key}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        人数 / 比例
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {stats.map((subjectStats) => {
                  const subjectChanges = isExit
                    ? data.changes[subjectStats.subject]
                    : null;

                  return (
                    <TableRow key={subjectStats.subject}>
                      {/* 基本信息 */}
                      <TableCell className="font-medium">
                        {subjectStats.subject}
                      </TableCell>
                      <TableCell className="text-right">
                        {subjectStats.totalCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {subjectStats.avgScore.toFixed(1)}
                      </TableCell>
                      {showRank && (
                        <TableCell className="text-right">
                          {subjectStats.avgScoreRank ?? "-"}
                        </TableCell>
                      )}

                      {/* 各等级数据 */}
                      {grades.map((grade) => {
                        const gradeData = subjectStats.gradeStats[grade] || {
                          count: 0,
                          percentage: 0,
                        };
                        const change = subjectChanges?.[grade];
                        const bgColor = change
                          ? getChangeBgColor(change.countChange)
                          : "";

                        return (
                          <>
                            {/* 人数列 */}
                            <TableCell
                              key={`${grade}-count`}
                              className={`text-right border-l ${bgColor}`}
                            >
                              <div className="flex flex-col items-end">
                                <span>{gradeData.count}</span>
                                {isExit && change && (
                                  <span className="text-xs">
                                    {renderChangeIndicator(
                                      change.countChange,
                                      "count"
                                    )}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* 比例列 */}
                            <TableCell
                              key={`${grade}-percentage`}
                              className={`text-right ${bgColor}`}
                            >
                              {formatPercentage(gradeData.percentage)}
                            </TableCell>
                          </>
                        );
                      })}

                      {/* 累计数据 */}
                      {cumulativeKeys.map((key) => {
                        const cumulativeData = subjectStats.cumulativeStats?.[
                          key
                        ] || {
                          count: 0,
                          percentage: 0,
                        };
                        const change = subjectChanges?.[key];
                        const bgColor = change
                          ? getChangeBgColor(change.countChange)
                          : "";

                        return (
                          <>
                            {/* 累计人数 */}
                            <TableCell
                              key={`${key}-count`}
                              className={`text-right border-l bg-blue-50 ${bgColor}`}
                            >
                              <div className="flex flex-col items-end">
                                <span className="font-medium">
                                  {cumulativeData.count}
                                </span>
                                {isExit && change && (
                                  <span className="text-xs">
                                    {renderChangeIndicator(
                                      change.countChange,
                                      "count"
                                    )}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* 累计比例 */}
                            <TableCell
                              key={`${key}-percentage`}
                              className={`text-right bg-blue-50 ${bgColor}`}
                            >
                              <span className="font-medium">
                                {formatPercentage(cumulativeData.percentage)}
                              </span>
                            </TableCell>
                          </>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* 说明卡片 */}
      <Card className="bg-blue-50">
        <CardContent className="pt-4">
          <div className="text-sm space-y-2">
            <p className="font-semibold">分数段对比分析说明：</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>对比入口考试和出口考试各等级的人数分布变化</li>
              <li>
                <span className="text-green-600 font-medium">绿色↑</span>{" "}
                表示该等级人数增加
              </li>
              <li>
                <span className="text-red-600 font-medium">红色↓</span>{" "}
                表示该等级人数减少
              </li>
              <li>
                <strong>累计统计</strong>
                ：A+以上=A+，A以上=A++A，B+以上=A++A+B+，依此类推
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 入口考试表格 */}
      {renderTable(data.entryExam, "入口考试分数段分布", false)}

      {/* 出口考试表格（带变化高亮） */}
      {renderTable(data.exitExam, "出口考试分数段分布", true)}
    </div>
  );
}
