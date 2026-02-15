/**
 * 趋势预测组件
 * 基于线性回归预测学生未来成绩趋势
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ValueAddedMetrics } from "@/types/valueAddedTypes";
import {
  forecastStudentScore,
  getTopImprovers,
  getBottomImprovers,
} from "../services/valueAddedUtils";

interface TrendForecastProps {
  metrics: ValueAddedMetrics[];
  topN?: number;
  historicalScores?: Map<
    string,
    Array<{ exam: string; score: number; date: string }>
  >;
}

const TrendForecast: React.FC<TrendForecastProps> = ({
  metrics,
  topN = 5,
  historicalScores,
}) => {
  // 获取进步最大和退步最大的学生
  const topStudents = useMemo(() => {
    return getTopImprovers(metrics, topN);
  }, [metrics, topN]);

  const bottomStudents = useMemo(() => {
    return getBottomImprovers(metrics, topN);
  }, [metrics, topN]);

  const studentsToForecast = useMemo(() => {
    return [...topStudents, ...bottomStudents];
  }, [topStudents, bottomStudents]);

  // 为每个学生生成预测
  const forecasts = useMemo(() => {
    return studentsToForecast.map((student) => {
      const forecast = forecastStudentScore(student);

      // 获取该学生的历史成绩
      const history = historicalScores?.get(student.studentId) || [];

      let chartData;

      if (history.length >= 3) {
        // 使用历史数据生成多点图表（更有说服力）
        chartData = [
          ...history.map((h, index) => ({
            exam: h.exam,
            score: h.score,
            type: "actual" as const,
            order: index,
          })),
          // 基于历史数据的线性回归预测
          {
            exam: "预测",
            score: forecast.predictedScore,
            type: "predicted" as const,
            order: history.length,
          },
        ];
      } else {
        // 历史数据不足时，使用原来的两点逻辑
        chartData = [
          {
            exam: "基准",
            score: student.baselineExam.score,
            type: "actual" as const,
            order: 0,
          },
          {
            exam: "目标",
            score: student.targetExam.score,
            type: "actual" as const,
            order: 1,
          },
          {
            exam: "预测",
            score: forecast.predictedScore,
            type: "predicted" as const,
            order: 2,
          },
        ];
      }

      return {
        student,
        forecast,
        chartData,
        hasHistoricalData: history.length >= 3,
      };
    });
  }, [studentsToForecast, historicalScores]);

  if (metrics.length === 0) {
    return null;
  }

  // 获取趋势图标和颜色
  const getTrendDisplay = (trend: string, trendStrength: string) => {
    const icons = {
      improving: <TrendingUp className="w-4 h-4" />,
      declining: <TrendingDown className="w-4 h-4" />,
      stable: <Minus className="w-4 h-4" />,
    };

    const colors = {
      improving: "text-green-600 bg-green-100",
      declining: "text-red-600 bg-red-100",
      stable: "text-gray-600 bg-gray-100",
    };

    const labels = {
      improving: "上升趋势",
      declining: "下降趋势",
      stable: "趋于稳定",
    };

    const strengthLabels = {
      strong: "强",
      moderate: "中",
      weak: "弱",
    };

    return {
      icon: icons[trend as keyof typeof icons],
      color: colors[trend as keyof typeof colors],
      label: labels[trend as keyof typeof labels],
      strength: strengthLabels[trendStrength as keyof typeof strengthLabels],
    };
  };

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <Activity className="w-5 h-5" />
          趋势预测分析（基于历史多点线性拟合）
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {forecasts.map(
            ({ student, forecast, chartData, hasHistoricalData }) => {
              const trendDisplay = getTrendDisplay(
                forecast.trend,
                forecast.trendStrength
              );

              return (
                <Card
                  key={student.studentId}
                  className="border-2 border-black shadow-[2px_2px_0px_0px_#000]"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-black text-black flex items-center gap-2">
                          {student.studentName}
                          {hasHistoricalData && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-50 border-blue-300"
                            >
                              {chartData.length - 1}次考试数据
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-gray-600 mt-1">
                          {student.className}
                          {hasHistoricalData && (
                            <span className="ml-2 text-blue-600">
                              · 多点线性拟合
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "border-2 border-black font-bold flex items-center gap-1",
                          trendDisplay.color
                        )}
                      >
                        {trendDisplay.icon}
                        {trendDisplay.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 趋势图表 */}
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#191A23"
                            opacity={0.1}
                          />
                          <XAxis
                            dataKey="exam"
                            tick={{
                              fill: "#191A23",
                              fontSize: 12,
                              fontWeight: "bold",
                            }}
                            axisLine={{ stroke: "#191A23", strokeWidth: 2 }}
                          />
                          <YAxis
                            tick={{
                              fill: "#191A23",
                              fontSize: 12,
                              fontWeight: "bold",
                            }}
                            axisLine={{ stroke: "#191A23", strokeWidth: 2 }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white border-2 border-black p-2 shadow-[3px_3px_0px_0px_#000]">
                                    <p className="font-black text-xs">
                                      {data.exam}
                                    </p>
                                    <p className="font-bold text-sm">
                                      分数: {data.score}
                                    </p>
                                    {data.type === "predicted" && (
                                      <p className="text-xs text-gray-600">
                                        预测值
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#B9FF66"
                            strokeWidth={3}
                            dot={{
                              fill: "#191A23",
                              stroke: "#191A23",
                              strokeWidth: 2,
                              r: 5,
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 预测数据 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-2 bg-gray-50 border border-black">
                        <p className="text-xs text-gray-600 mb-1">基准分</p>
                        <p className="text-lg font-black text-black">
                          {student.baselineExam.score}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 border border-black">
                        <p className="text-xs text-gray-600 mb-1">目标分</p>
                        <p className="text-lg font-black text-black">
                          {student.targetExam.score}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "text-center p-2 border-2 border-black",
                          forecast.trend === "improving" && "bg-green-100",
                          forecast.trend === "declining" && "bg-red-100",
                          forecast.trend === "stable" && "bg-gray-100"
                        )}
                      >
                        <p className="text-xs text-gray-600 mb-1">预测分</p>
                        <p className="text-lg font-black text-black">
                          {forecast.predictedScore}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 border border-black">
                        <p className="text-xs text-gray-600 mb-1">置信度</p>
                        <p className="text-lg font-black text-black">
                          {forecast.confidence}%
                        </p>
                      </div>
                    </div>

                    {/* 趋势说明 */}
                    <div className="text-xs bg-blue-50 border-2 border-blue-200 p-3 rounded">
                      <p className="font-bold text-blue-900 mb-1">预测说明：</p>
                      <p className="text-blue-800">
                        基于两次考试成绩，预测学生呈现
                        <span className="font-bold"> {trendDisplay.label}</span>
                        （强度：{trendDisplay.strength}）， 下次考试预计得分约为
                        <span className="font-bold">
                          {" "}
                          {forecast.predictedScore} 分
                        </span>
                        ，预测置信度为
                        <span className="font-bold">
                          {" "}
                          {forecast.confidence}%
                        </span>
                        。
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>

        {/* 说明 */}
        <div className="mt-6 text-xs text-gray-500 border-t-2 border-gray-200 pt-4">
          <p className="font-bold mb-2">预测方法：</p>
          <ul className="list-disc list-inside space-y-1">
            <li>基于线性回归模型，使用两次考试成绩预测趋势</li>
            <li>趋势判断：进步&gt;5分为上升，退步&gt;5分为下降，否则稳定</li>
            <li>置信度基于R²值计算，反映预测的可靠性（数据越多越准确）</li>
            <li>预测仅供参考，实际成绩受多种因素影响</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendForecast;
