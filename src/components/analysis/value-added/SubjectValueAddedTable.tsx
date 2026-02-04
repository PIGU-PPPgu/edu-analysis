/**
 * 科目增值对比表
 * 展示各科目的增值情况对比
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpen, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectValueAddedMetrics } from "../services/valueAddedUtils";
import {
  calculateSubjectValueAdded,
  identifySubjectStrengths,
} from "../services/valueAddedUtils";
import type { ComparisonScope } from "@/types/valueAddedTypes";

interface SubjectValueAddedTableProps {
  baselineData: any[];
  targetData: any[];
  scope: ComparisonScope;
  className?: string;
}

const SubjectValueAddedTable: React.FC<SubjectValueAddedTableProps> = ({
  baselineData,
  targetData,
  scope,
  className,
}) => {
  // 计算科目增值
  const subjectMetrics = useMemo(() => {
    return calculateSubjectValueAdded(
      baselineData,
      targetData,
      scope,
      className
    );
  }, [baselineData, targetData, scope, className]);

  // 识别优势和薄弱科目
  const { strengths, weaknesses } = useMemo(() => {
    return identifySubjectStrengths(subjectMetrics);
  }, [subjectMetrics]);

  if (subjectMetrics.length === 0) {
    return null;
  }

  // 获取科目类型标签
  const getSubjectBadge = (subject: SubjectValueAddedMetrics) => {
    const isStrength = strengths.some((s) => s.subject === subject.subject);
    const isWeakness = weaknesses.some((w) => w.subject === subject.subject);

    if (isStrength) {
      return (
        <Badge className="bg-[#B9FF66] text-black border-2 border-black font-bold">
          优势科目
        </Badge>
      );
    } else if (isWeakness) {
      return (
        <Badge className="bg-orange-200 text-black border-2 border-black font-bold">
          薄弱科目
        </Badge>
      );
    }
    return null;
  };

  // 获取趋势图标
  const getTrendIcon = (improvement: number) => {
    if (improvement > 5) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (improvement < -5) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    } else {
      return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          科目增值分析
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-black bg-gray-50">
                <TableHead className="font-black text-black">科目</TableHead>
                <TableHead className="font-black text-black text-right">
                  基准均分
                </TableHead>
                <TableHead className="font-black text-black text-right">
                  目标均分
                </TableHead>
                <TableHead className="font-black text-black text-right">
                  平均进步
                </TableHead>
                <TableHead className="font-black text-black text-right">
                  进步率
                </TableHead>
                <TableHead className="font-black text-black text-right">
                  进步人数
                </TableHead>
                <TableHead className="font-black text-black text-center">
                  趋势
                </TableHead>
                <TableHead className="font-black text-black text-center">
                  类型
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjectMetrics.map((subject) => (
                <TableRow
                  key={subject.subject}
                  className={cn(
                    "hover:bg-gray-50 transition-colors",
                    strengths.some((s) => s.subject === subject.subject) &&
                      "bg-green-50",
                    weaknesses.some((w) => w.subject === subject.subject) &&
                      "bg-orange-50"
                  )}
                >
                  <TableCell className="font-bold text-black">
                    {subject.subjectName}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {subject.baselineAvg}
                  </TableCell>
                  <TableCell className="text-right font-medium text-black">
                    {subject.targetAvg}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-bold",
                        subject.avgImprovement > 0 && "text-green-600",
                        subject.avgImprovement < 0 && "text-red-600",
                        subject.avgImprovement === 0 && "text-gray-500"
                      )}
                    >
                      {subject.avgImprovement > 0 ? "+" : ""}
                      {subject.avgImprovement}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-medium",
                        subject.avgImprovementRate > 0 && "text-green-600",
                        subject.avgImprovementRate < 0 && "text-red-600",
                        subject.avgImprovementRate === 0 && "text-gray-500"
                      )}
                    >
                      {subject.avgImprovementRate > 0 ? "+" : ""}
                      {subject.avgImprovementRate}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {subject.improvedCount} / {subject.studentCount}
                    <span className="text-xs text-gray-500 ml-1">
                      ({subject.improvedRate}%)
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {getTrendIcon(subject.avgImprovement)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getSubjectBadge(subject)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 汇总统计 */}
        <div className="p-4 border-t-2 border-black bg-gray-50 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">优势科目</p>
            <p className="text-lg font-black text-green-600">
              {strengths.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">薄弱科目</p>
            <p className="text-lg font-black text-orange-600">
              {weaknesses.length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">整体均分进步</p>
            <p className="text-lg font-black text-black">
              {(
                subjectMetrics.reduce((sum, s) => sum + s.avgImprovement, 0) /
                subjectMetrics.length
              ).toFixed(1)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600 mb-1">整体进步率</p>
            <p className="text-lg font-black text-black">
              {(
                subjectMetrics.reduce(
                  (sum, s) => sum + s.avgImprovementRate,
                  0
                ) / subjectMetrics.length
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubjectValueAddedTable;
