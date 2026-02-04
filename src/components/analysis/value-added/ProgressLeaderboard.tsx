/**
 * 进步榜单组件
 * 显示进步前10名和退步后10名
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
import { Trophy, TrendingDown, TrendingUp, AlertCircle } from "lucide-react";
import type { ValueAddedMetrics } from "@/types/valueAddedTypes";
import {
  getTopImprovers,
  getBottomImprovers,
} from "../services/valueAddedUtils";

interface ProgressLeaderboardProps {
  metrics: ValueAddedMetrics[];
  loading?: boolean;
  topN?: number;
}

const ProgressLeaderboard: React.FC<ProgressLeaderboardProps> = ({
  metrics,
  loading = false,
  topN = 10,
}) => {
  // 计算进步榜和退步榜
  const topImprovers = useMemo(
    () => getTopImprovers(metrics, topN),
    [metrics, topN]
  );

  const bottomImprovers = useMemo(
    () => getBottomImprovers(metrics, topN),
    [metrics, topN]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-black">
          <CardContent className="p-12 text-center text-gray-500">
            <div className="animate-spin text-4xl">⏳</div>
            <p className="mt-4">正在计算...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (metrics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 进步之星 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-black font-black flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            进步之星（前{topN}名）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black bg-gray-50">
                  <TableHead className="font-black text-black">排名</TableHead>
                  <TableHead className="font-black text-black">姓名</TableHead>
                  <TableHead className="font-black text-black">班级</TableHead>
                  <TableHead className="font-black text-black text-right">
                    基准分
                  </TableHead>
                  <TableHead className="font-black text-black text-right">
                    目标分
                  </TableHead>
                  <TableHead className="font-black text-black text-right">
                    进步分
                  </TableHead>
                  <TableHead className="font-black text-black text-right">
                    进步率
                  </TableHead>
                  <TableHead className="font-black text-black text-center">
                    段位
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topImprovers.length > 0 ? (
                  topImprovers.map((student, index) => {
                    // 前三名使用数字标识
                    const rankDisplay = index < 3 ? `#${index + 1}` : index + 1;

                    return (
                      <TableRow
                        key={student.studentId}
                        className="hover:bg-green-50 transition-colors"
                      >
                        <TableCell className="font-bold text-lg">
                          {rankDisplay}
                        </TableCell>
                        <TableCell className="font-medium">
                          {student.studentName}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {student.className}
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {student.baselineExam.score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {student.targetExam.score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 font-bold flex items-center justify-end gap-1">
                            <TrendingUp className="w-4 h-4" />+
                            {student.improvementScore.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 font-medium">
                            +{student.improvementRate.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {student.level && (
                            <Badge className="bg-[#B9FF66] text-black border border-black font-bold">
                              {student.levelLabel}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      暂无进步数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 需要关注 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
        <CardHeader className="bg-orange-100 border-b-2 border-black">
          <CardTitle className="text-black font-black flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            需要关注（后{topN}名）
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black bg-gray-50">
                  <TableHead className="font-black text-black">排名</TableHead>
                  <TableHead className="font-black text-black">姓名</TableHead>
                  <TableHead className="font-black text-black">班级</TableHead>
                  <TableHead className="font-black text-black text-right">
                    基准分
                  </TableHead>
                  <TableHead className="font-black text-black text-right">
                    目标分
                  </TableHead>
                  <TableHead className="font-black text-black text-right">
                    变化
                  </TableHead>
                  <TableHead className="font-black text-black text-right">
                    变化率
                  </TableHead>
                  <TableHead className="font-black text-black text-center">
                    段位
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bottomImprovers.length > 0 ? (
                  bottomImprovers.map((student, index) => {
                    const isRegression = student.improvementScore < 0;
                    const isStable = student.improvementScore === 0;

                    return (
                      <TableRow
                        key={student.studentId}
                        className="hover:bg-red-50 transition-colors"
                      >
                        <TableCell className="font-bold">{index + 1}</TableCell>
                        <TableCell className="font-medium">
                          {student.studentName}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {student.className}
                        </TableCell>
                        <TableCell className="text-right text-gray-700">
                          {student.baselineExam.score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {student.targetExam.score.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-bold flex items-center justify-end gap-1 ${
                              isRegression
                                ? "text-red-600"
                                : isStable
                                  ? "text-gray-500"
                                  : "text-green-600"
                            }`}
                          >
                            {isRegression ? (
                              <>
                                <TrendingDown className="w-4 h-4" />
                                {student.improvementScore.toFixed(1)}
                              </>
                            ) : isStable ? (
                              "0.0"
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4" />+
                                {student.improvementScore.toFixed(1)}
                              </>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              isRegression
                                ? "text-red-600"
                                : isStable
                                  ? "text-gray-500"
                                  : "text-green-600"
                            }`}
                          >
                            {isRegression
                              ? student.improvementRate.toFixed(1)
                              : isStable
                                ? "0.0"
                                : `+${student.improvementRate.toFixed(1)}`}
                            %
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {student.level && (
                            <Badge
                              className={`border border-black font-bold ${
                                isRegression
                                  ? "bg-orange-200 text-black"
                                  : "bg-gray-200 text-black"
                              }`}
                            >
                              {student.levelLabel}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      暂无数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressLeaderboard;
