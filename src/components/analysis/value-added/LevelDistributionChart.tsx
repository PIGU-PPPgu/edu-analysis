/**
 * 段位分布图表组件
 * 使用柱状图展示9段的学生分布
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { ValueAddedMetrics } from "@/types/valueAddedTypes";

interface LevelDistributionChartProps {
  metrics: ValueAddedMetrics[];
}

const LevelDistributionChart: React.FC<LevelDistributionChartProps> = ({
  metrics,
}) => {
  // 计算段位分布数据
  const chartData = React.useMemo(() => {
    const distribution: Record<number, number> = {};

    // 初始化1-9段
    for (let i = 1; i <= 9; i++) {
      distribution[i] = 0;
    }

    // 统计
    metrics.forEach((metric) => {
      if (metric.level && metric.level >= 1 && metric.level <= 9) {
        distribution[metric.level]++;
      }
    });

    // 转换为图表数据格式
    return Object.entries(distribution).map(([level, count]) => ({
      segment: parseInt(level),
      count,
      percentage:
        metrics.length > 0
          ? ((count / metrics.length) * 100).toFixed(1)
          : "0.0",
    }));
  }, [metrics]);

  // 根据段位计算颜色（1-9递增透明度）
  const getColor = (segment: number) => {
    const opacity = 0.1 + (segment - 1) * 0.1;
    return `rgba(185, 255, 102, ${opacity})`;
  };

  if (metrics.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          段位分布统计
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full h-[300px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              {/* 网格线 */}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#191A23"
                opacity={0.1}
              />

              {/* X轴 */}
              <XAxis
                dataKey="segment"
                tickFormatter={(val) => `第${val}段`}
                tick={{ fill: "#191A23", fontSize: 12, fontWeight: "bold" }}
                axisLine={{ stroke: "#191A23", strokeWidth: 2 }}
                tickLine={false}
              />

              {/* Y轴 */}
              <YAxis
                label={{
                  value: "学生人数",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#191A23", fontWeight: "bold" },
                }}
                tick={{ fill: "#191A23", fontSize: 12, fontWeight: "bold" }}
                axisLine={{ stroke: "#191A23", strokeWidth: 2 }}
                tickLine={false}
              />

              {/* 悬停提示 */}
              <Tooltip
                cursor={{ fill: "#191A23", opacity: 0.05 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border-2 border-[#191A23] p-3 shadow-[4px_4px_0px_0px_#191A23]">
                        <p className="font-black text-[#191A23] mb-1">
                          第 {data.segment} 段
                        </p>
                        <p className="text-sm font-bold text-[#6B7280]">
                          学生人数:{" "}
                          <span className="text-[#191A23] text-lg">
                            {data.count}
                          </span>
                        </p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          占比: {data.percentage}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* 柱状图 */}
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColor(entry.segment)}
                    stroke="#191A23"
                    strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 说明信息 */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs">
          <div className="border-2 border-black p-3 bg-gray-50">
            <p className="font-black text-[#191A23] mb-1">第1-3段</p>
            <p className="text-gray-600">低分段</p>
            <p className="text-sm font-bold text-[#191A23] mt-1">
              {chartData.slice(0, 3).reduce((sum, item) => sum + item.count, 0)}{" "}
              人
            </p>
          </div>
          <div className="border-2 border-black p-3 bg-gray-50">
            <p className="font-black text-[#191A23] mb-1">第4-6段</p>
            <p className="text-gray-600">中分段</p>
            <p className="text-sm font-bold text-[#191A23] mt-1">
              {chartData.slice(3, 6).reduce((sum, item) => sum + item.count, 0)}{" "}
              人
            </p>
          </div>
          <div className="border-2 border-black p-3 bg-[#B9FF66]">
            <p className="font-black text-[#191A23] mb-1">第7-9段</p>
            <p className="text-gray-600">高分段</p>
            <p className="text-sm font-bold text-[#191A23] mt-1">
              {chartData.slice(6, 9).reduce((sum, item) => sum + item.count, 0)}{" "}
              人
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LevelDistributionChart;
