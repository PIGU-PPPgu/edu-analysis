/**
 * 趋势预测功能演示页面
 * 展示线性回归预测、移动平均、指数平滑等算法
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  RotateCcw,
  Info,
} from "lucide-react";
import {
  linearRegressionPredict,
  movingAveragePredict,
  exponentialSmoothingPredict,
  ensemblePredict,
  evaluatePredictionAccuracy,
  type TrendPredictionResult,
} from "@/services/ai/trendPrediction";
import TrendForecast from "@/components/analysis/value-added/TrendForecast";
import type { ValueAddedMetrics } from "@/types/valueAddedTypes";

export default function TrendPredictionDemo() {
  const [selectedStudent, setSelectedStudent] = useState<number>(0);
  const [futureSteps, setFutureSteps] = useState<number>(3);

  // 模拟学生数据
  const mockStudents: ValueAddedMetrics[] = [
    {
      studentId: "2023001",
      studentName: "张三",
      className: "高一(1)班",
      subject: "数学",
      baselineExam: {
        examId: "exam_1",
        examTitle: "期中考试",
        score: 650,
        rank: 15,
        level: "B+",
      },
      targetExam: {
        examId: "exam_2",
        examTitle: "期末考试",
        score: 680,
        rank: 10,
        level: "A",
      },
      scoreChange: 30,
      scoreChangeRate: 4.6,
      zScoreChange: 0.3,
      levelChange: 1,
    },
    {
      studentId: "2023002",
      studentName: "李四",
      className: "高一(1)班",
      subject: "数学",
      baselineExam: {
        examId: "exam_1",
        examTitle: "期中考试",
        score: 720,
        rank: 5,
        level: "A+",
      },
      targetExam: {
        examId: "exam_2",
        examTitle: "期末考试",
        score: 710,
        rank: 8,
        level: "A",
      },
      scoreChange: -10,
      scoreChangeRate: -1.4,
      zScoreChange: -0.1,
      levelChange: -1,
    },
    {
      studentId: "2023003",
      studentName: "王五",
      className: "高一(2)班",
      subject: "数学",
      baselineExam: {
        examId: "exam_1",
        examTitle: "期中考试",
        score: 580,
        rank: 45,
        level: "C+",
      },
      targetExam: {
        examId: "exam_2",
        examTitle: "期末考试",
        score: 620,
        rank: 28,
        level: "B",
      },
      scoreChange: 40,
      scoreChangeRate: 6.9,
      zScoreChange: 0.5,
      levelChange: 2,
    },
  ];

  // 生成历史数据序列（模拟多次考试）
  const generateHistoricalData = (student: ValueAddedMetrics) => {
    const baseScore = student.baselineExam.score;
    const targetScore = student.targetExam.score;
    const trend = targetScore - baseScore;

    // 生成5次考试数据，有一定的波动
    const historicalScores: number[] = [];
    for (let i = 0; i < 5; i++) {
      const progress = i / 4; // 0 to 1
      const noise = Math.random() * 20 - 10; // -10 to +10
      const score = baseScore + trend * progress + noise;
      historicalScores.push(Math.round(score));
    }

    return historicalScores;
  };

  // 当前学生的历史数据
  const historicalData = useMemo(
    () => generateHistoricalData(mockStudents[selectedStudent]),
    [selectedStudent]
  );

  // 计算预测结果
  const prediction = useMemo(
    () => linearRegressionPredict(historicalData, futureSteps),
    [historicalData, futureSteps]
  );

  const maPrediction = useMemo(
    () => movingAveragePredict(historicalData, 3, futureSteps),
    [historicalData, futureSteps]
  );

  const esPrediction = useMemo(
    () => exponentialSmoothingPredict(historicalData, 0.3, futureSteps),
    [historicalData, futureSteps]
  );

  const ensemble = useMemo(
    () => ensemblePredict(historicalData, futureSteps),
    [historicalData, futureSteps]
  );

  const accuracy = useMemo(
    () => evaluatePredictionAccuracy(historicalData, 2),
    [historicalData]
  );

  // 准备图表数据
  const chartData = useMemo(() => {
    const data: any[] = [];

    // 历史数据
    historicalData.forEach((score, index) => {
      data.push({
        exam: `考试${index + 1}`,
        actual: score,
        index: index,
      });
    });

    // 预测数据
    prediction.predictions.forEach((pred, index) => {
      data.push({
        exam: `预测${index + 1}`,
        predicted: pred.predicted,
        lowerBound: pred.lowerBound,
        upperBound: pred.upperBound,
        index: historicalData.length + index,
      });
    });

    // 添加移动平均预测
    maPrediction.forEach((pred, index) => {
      const existingIndex = historicalData.length + index;
      const existing = data.find((d) => d.index === existingIndex);
      if (existing) {
        existing.ma_predicted = pred.predicted;
      }
    });

    // 添加指数平滑预测
    esPrediction.forEach((pred, index) => {
      const existingIndex = historicalData.length + index;
      const existing = data.find((d) => d.index === existingIndex);
      if (existing) {
        existing.es_predicted = pred.predicted;
      }
    });

    return data;
  }, [historicalData, prediction, maPrediction, esPrediction]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="w-4 h-4" />;
      case "decreasing":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "text-green-600 bg-green-100 border-green-200";
      case "decreasing":
        return "text-red-600 bg-red-100 border-red-200";
      default:
        return "text-gray-600 bg-gray-100 border-gray-200";
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "上升趋势";
      case "decreasing":
        return "下降趋势";
      default:
        return "趋于稳定";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-black">
            📈 趋势预测功能演示
          </h1>
          <p className="text-gray-600 mt-2">
            基于历史成绩数据，使用机器学习算法预测学生未来表现
          </p>
        </div>
        <Button
          onClick={() => setSelectedStudent(Math.floor(Math.random() * 3))}
          variant="outline"
          className="border-2 border-black"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          切换学生
        </Button>
      </div>

      {/* 学生选择 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="font-black">选择演示学生</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockStudents.map((student, index) => (
              <Card
                key={student.studentId}
                className={`cursor-pointer transition-all border-2 ${
                  selectedStudent === index
                    ? "border-[#B9FF66] bg-[#B9FF66]/10 shadow-[3px_3px_0px_0px_#000]"
                    : "border-black hover:shadow-[2px_2px_0px_0px_#000]"
                }`}
                onClick={() => setSelectedStudent(index)}
              >
                <CardContent className="p-4">
                  <div className="font-black text-lg">
                    {student.studentName}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {student.className}
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">入口:</span>
                      <span className="font-bold">
                        {student.baselineExam.score}分
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">出口:</span>
                      <span className="font-bold">
                        {student.targetExam.score}分
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">增值:</span>
                      <span
                        className={`font-bold ${
                          student.scoreChange > 0
                            ? "text-green-600"
                            : student.scoreChange < 0
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        {student.scoreChange > 0 ? "+" : ""}
                        {student.scoreChange}分
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 预测结果总览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#000]">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">趋势方向</div>
            <div className="flex items-center gap-2">
              <Badge
                className={`border-2 border-black font-bold flex items-center gap-1 ${getTrendColor(prediction.trend)}`}
              >
                {getTrendIcon(prediction.trend)}
                {getTrendText(prediction.trend)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#000]">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">趋势强度</div>
            <div className="text-2xl font-black">
              {prediction.trendStrength === "strong"
                ? "强"
                : prediction.trendStrength === "moderate"
                  ? "中等"
                  : "弱"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#000]">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">拟合优度 (R²)</div>
            <div className="text-2xl font-black">
              {(prediction.rSquared * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#000]">
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">下次预测分数</div>
            <div className="text-2xl font-black text-[#B9FF66]">
              {Math.round(prediction.predictions[0].predicted)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图表 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="font-black flex items-center gap-2">
            <Play className="w-5 h-5" />
            成绩趋势与预测
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px]">
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
                  domain={["dataMin - 30", "dataMax + 30"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "2px solid black",
                    borderRadius: "0",
                    boxShadow: "3px 3px 0px 0px #000",
                  }}
                />
                <Legend />
                <ReferenceLine
                  x={historicalData.length - 0.5}
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{
                    value: "预测起点",
                    position: "top",
                    fill: "#FF6B6B",
                  }}
                />

                {/* 实际分数 */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#191A23"
                  strokeWidth={3}
                  dot={{
                    fill: "#191A23",
                    stroke: "#191A23",
                    strokeWidth: 2,
                    r: 6,
                  }}
                  name="实际分数"
                />

                {/* 线性回归预测 */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#B9FF66"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{
                    fill: "#B9FF66",
                    stroke: "#191A23",
                    strokeWidth: 2,
                    r: 6,
                  }}
                  name="线性回归预测"
                />

                {/* 移动平均预测 */}
                <Line
                  type="monotone"
                  dataKey="ma_predicted"
                  stroke="#4ECDC4"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 4 }}
                  name="移动平均预测"
                />

                {/* 指数平滑预测 */}
                <Line
                  type="monotone"
                  dataKey="es_predicted"
                  stroke="#FF6B6B"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 4 }}
                  name="指数平滑预测"
                />

                {/* 置信区间上界 */}
                <Line
                  type="monotone"
                  dataKey="upperBound"
                  stroke="#B9FF66"
                  strokeWidth={1}
                  dot={false}
                  name="置信区间上界"
                  opacity={0.3}
                />

                {/* 置信区间下界 */}
                <Line
                  type="monotone"
                  dataKey="lowerBound"
                  stroke="#B9FF66"
                  strokeWidth={1}
                  dot={false}
                  name="置信区间下界"
                  opacity={0.3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 算法说明 */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-blue-900 mb-2">
                  三种预测算法对比:
                </p>
                <ul className="space-y-1 text-blue-800">
                  <li>
                    <strong>线性回归</strong>
                    (绿色虚线): 基于最小二乘法拟合线性趋势，R²={" "}
                    {(prediction.rSquared * 100).toFixed(1)}%
                  </li>
                  <li>
                    <strong>移动平均</strong>(青色虚线):
                    使用最近3次成绩的平均值，适合短期预测
                  </li>
                  <li>
                    <strong>指数平滑</strong>(红色虚线):
                    赋予近期数据更高权重，α=0.3
                  </li>
                </ul>
                <p className="mt-2 text-xs text-blue-700">
                  💡 推荐: {ensemble.recommendation}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细预测数据 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
        <CardHeader className="bg-[#F3F3F3] border-b-2 border-black">
          <CardTitle className="font-black">详细预测结果</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#191A23] text-white">
                  <th className="border-2 border-black px-4 py-2 text-left font-black">
                    预测期数
                  </th>
                  <th className="border-2 border-black px-4 py-2 text-center font-black">
                    预测分数
                  </th>
                  <th className="border-2 border-black px-4 py-2 text-center font-black">
                    置信区间
                  </th>
                  <th className="border-2 border-black px-4 py-2 text-center font-black">
                    置信度
                  </th>
                </tr>
              </thead>
              <tbody>
                {prediction.predictions.map((pred, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border-2 border-black px-4 py-3 font-bold">
                      第 {index + 1} 次
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-center">
                      <span className="text-xl font-black text-[#B9FF66]">
                        {Math.round(pred.predicted)}
                      </span>{" "}
                      分
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-center text-sm">
                      [{Math.round(pred.lowerBound)},{" "}
                      {Math.round(pred.upperBound)}]
                    </td>
                    <td className="border-2 border-black px-4 py-3 text-center">
                      <Badge
                        className={`border-2 border-black font-bold ${
                          pred.confidence > 0.7
                            ? "bg-green-100 text-green-600"
                            : pred.confidence > 0.4
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {(pred.confidence * 100).toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 预测准确度评估 */}
      {accuracy.mae > 0 && (
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
          <CardHeader className="bg-[#FFE492] border-b-2 border-black">
            <CardTitle className="font-black">预测准确度评估</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white border-2 border-black">
                <div className="text-sm text-gray-600 mb-1">
                  平均绝对误差 (MAE)
                </div>
                <div className="text-2xl font-black">
                  {accuracy.mae.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">误差越小越准确</div>
              </div>
              <div className="p-4 bg-white border-2 border-black">
                <div className="text-sm text-gray-600 mb-1">
                  均方根误差 (RMSE)
                </div>
                <div className="text-2xl font-black">
                  {accuracy.rmse.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">对大误差更敏感</div>
              </div>
              <div className="p-4 bg-white border-2 border-black">
                <div className="text-sm text-gray-600 mb-1">
                  平均百分比误差 (MAPE)
                </div>
                <div className="text-2xl font-black">
                  {accuracy.mape.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">相对误差百分比</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 border-2 border-gray-200 rounded text-sm">
              <p className="font-bold mb-2">📝 评估说明：</p>
              <p className="text-gray-700">
                准确度评估基于历史数据的交叉验证。使用前N-2次数据训练模型，预测最后2次的成绩，然后与实际成绩对比计算误差。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TrendForecast组件演示 */}
      <div>
        <h2 className="text-2xl font-black mb-4">
          📊 完整组件演示 (TrendForecast)
        </h2>
        <TrendForecast metrics={mockStudents} topN={3} />
      </div>
    </div>
  );
}
