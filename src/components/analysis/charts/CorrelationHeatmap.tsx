/**
 * 📊 科目相关性热力图组件
 * 展示科目成绩之间的相关性强度
 */

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export interface CorrelationData {
  subject1: string; // 科目1
  subject2: string; // 科目2
  correlation: number; // 相关系数 (-1 到 1)
}

interface CorrelationHeatmapProps {
  data: CorrelationData[];
  subjects: string[]; // 科目列表（顺序）
  title?: string;
  threshold?: number; // 强相关阈值（默认0.7）
  width?: number;
  height?: number;
}

const CorrelationHeatmap: React.FC<CorrelationHeatmapProps> = ({
  data,
  subjects,
  title,
  threshold = 0.7,
  width = 800,
  height = 600,
}) => {
  // 构建相关性矩阵
  const matrix: Record<string, Record<string, number>> = {};
  subjects.forEach((s1) => {
    matrix[s1] = {};
    subjects.forEach((s2) => {
      matrix[s1][s2] = 1; // 默认自相关为1
    });
  });

  // 填充数据
  data.forEach((item) => {
    matrix[item.subject1][item.subject2] = item.correlation;
    matrix[item.subject2][item.subject1] = item.correlation; // 对称
  });

  // 计算单元格大小
  const cellSize = Math.min(
    (width - 100) / subjects.length,
    (height - 100) / subjects.length
  );

  // 获取相关性对应的颜色（红-白-蓝渐变）
  const getColor = (correlation: number): string => {
    if (correlation === 1) return "#4A90E2"; // 自相关为蓝色

    const absCorr = Math.abs(correlation);

    if (correlation > 0) {
      // 正相关：白色到深蓝色
      const intensity = Math.floor(255 - absCorr * 155); // 100-255范围
      return `rgb(${intensity}, ${intensity}, 255)`;
    } else {
      // 负相关：白色到深红色
      const intensity = Math.floor(255 - absCorr * 155);
      return `rgb(255, ${intensity}, ${intensity})`;
    }
  };

  // 获取文本颜色（根据背景色深度）
  const getTextColor = (correlation: number): string => {
    return Math.abs(correlation) > 0.5 ? "#ffffff" : "#191A23";
  };

  // 格式化相关系数
  const formatCorrelation = (value: number): string => {
    if (value === 1) return "1.00";
    return value.toFixed(2);
  };

  if (subjects.length === 0 || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        暂无相关性数据
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-bold text-lg text-[#191A23] mb-4">{title}</h3>
      )}
      <Card className="border-2 border-[#191A23]">
        <CardContent className="p-6">
          {/* SVG热力图 */}
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="mx-auto"
          >
            {/* 纵轴标签（左侧） */}
            {subjects.map((subject, i) => (
              <text
                key={`ylabel-${i}`}
                x={80}
                y={100 + i * cellSize + cellSize / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#191A23"
                fontSize={12}
                fontWeight="medium"
              >
                {subject}
              </text>
            ))}

            {/* 横轴标签（顶部） */}
            {subjects.map((subject, i) => (
              <text
                key={`xlabel-${i}`}
                x={100 + i * cellSize + cellSize / 2}
                y={80}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#191A23"
                fontSize={12}
                fontWeight="medium"
                transform={`rotate(-45, ${100 + i * cellSize + cellSize / 2}, 80)`}
              >
                {subject}
              </text>
            ))}

            {/* 热力图单元格 */}
            {subjects.map((s1, i) =>
              subjects.map((s2, j) => {
                const correlation = matrix[s1][s2];
                const x = 100 + j * cellSize;
                const y = 100 + i * cellSize;

                return (
                  <g key={`cell-${i}-${j}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      fill={getColor(correlation)}
                      stroke="#191A23"
                      strokeWidth={1}
                      className="transition-opacity hover:opacity-80"
                    >
                      <title>
                        {s1} vs {s2}: {formatCorrelation(correlation)}
                      </title>
                    </rect>
                    {/* 相关系数文本 */}
                    <text
                      x={x + cellSize / 2}
                      y={y + cellSize / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={getTextColor(correlation)}
                      fontSize={10}
                      fontWeight={
                        Math.abs(correlation) >= threshold ? "bold" : "normal"
                      }
                    >
                      {formatCorrelation(correlation)}
                    </text>
                    {/* 强相关标记 */}
                    {Math.abs(correlation) >= threshold &&
                      correlation !== 1 && (
                        <circle
                          cx={x + cellSize - 8}
                          cy={y + 8}
                          r={4}
                          fill="#FFD700"
                          stroke="#191A23"
                          strokeWidth={1}
                        >
                          <title>
                            强相关 ({formatCorrelation(correlation)})
                          </title>
                        </circle>
                      )}
                  </g>
                );
              })
            )}
          </svg>

          {/* 图例 */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-center gap-6">
              {/* 颜色图例 */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[rgb(255,100,100)] border-2 border-[#191A23]"></div>
                <span className="text-sm">强负相关 (-1.0)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white border-2 border-[#191A23]"></div>
                <span className="text-sm">无相关 (0.0)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[rgb(100,100,255)] border-2 border-[#191A23]"></div>
                <span className="text-sm">强正相关 (+1.0)</span>
              </div>
            </div>

            {/* 强相关标记说明 */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FFD700] border border-[#191A23]"></div>
                <span>强相关（|r| ≥ {threshold}）</span>
              </div>
            </div>

            {/* 解读说明 */}
            <div className="text-xs text-gray-500 text-center mt-4 p-3 bg-gray-50 rounded-lg">
              <p>
                <strong>相关系数解读：</strong>
                +1表示完全正相关（成绩同向变化），
                -1表示完全负相关（成绩反向变化）， 0表示无线性关系。 |r| ≥{" "}
                {threshold} 表示强相关关系。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorrelationHeatmap;

/**
 * 从成绩数据计算科目间相关性
 */
export function calculateSubjectCorrelations(
  gradeData: any[],
  subjects: string[]
): CorrelationData[] {
  const correlations: CorrelationData[] = [];

  // 计算每对科目的相关系数
  for (let i = 0; i < subjects.length; i++) {
    for (let j = i; j < subjects.length; j++) {
      const subject1 = subjects[i];
      const subject2 = subjects[j];

      // 提取两个科目的成绩
      const scores1 = gradeData
        .map((r) => parseFloat(r[`${getSubjectKey(subject1)}_score`]))
        .filter((s) => !isNaN(s) && s > 0);

      const scores2 = gradeData
        .map((r) => parseFloat(r[`${getSubjectKey(subject2)}_score`]))
        .filter((s) => !isNaN(s) && s > 0);

      // 确保数据长度一致
      const length = Math.min(scores1.length, scores2.length);
      if (length < 2) continue;

      // 计算皮尔逊相关系数
      const correlation = calculatePearsonCorrelation(
        scores1.slice(0, length),
        scores2.slice(0, length)
      );

      correlations.push({
        subject1,
        subject2,
        correlation,
      });
    }
  }

  return correlations;
}

/**
 * 计算皮尔逊相关系数
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  if (denomX === 0 || denomY === 0) return 0;

  return numerator / Math.sqrt(denomX * denomY);
}

/**
 * 获取科目在数据中的键名
 */
function getSubjectKey(subjectName: string): string {
  const subjectMap: Record<string, string> = {
    语文: "chinese",
    数学: "math",
    英语: "english",
    物理: "physics",
    化学: "chemistry",
    政治: "politics",
    历史: "history",
    生物: "biology",
    地理: "geography",
  };

  return subjectMap[subjectName] || subjectName.toLowerCase();
}
