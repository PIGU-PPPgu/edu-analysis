/**
 * 📊 成绩-排名组合图
 * 双Y轴显示分数和排名的关系（适合单个学生的历史趋势）
 */

import React from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface ScoreRankComboData {
  examTitle: string;
  examDate: string;
  score: number;
  rank: number;
  maxScore: number;
  totalStudents: number;
}

interface ScoreRankComboChartProps {
  data: ScoreRankComboData[];
  title?: string;
  height?: number;
  studentName?: string;
}

const ScoreRankComboChart: React.FC<ScoreRankComboChartProps> = ({
  data,
  title,
  height = 400,
  studentName,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无历史数据
      </div>
    );
  }

  const maxScore = Math.max(...data.map((d) => d.maxScore));
  const maxRank = Math.max(...data.map((d) => d.totalStudents));

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-bold text-lg text-[#191A23] mb-2">{title}</h3>
      )}
      {studentName && (
        <p className="text-sm text-[#191A23]/70 mb-4">学生: {studentName}</p>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 60, bottom: 60, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#191A23" opacity={0.1} />

          <XAxis
            dataKey="examTitle"
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#191A23"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          {/* 左Y轴：分数 */}
          <YAxis
            yAxisId="left"
            domain={[0, maxScore + 10]}
            label={{
              value: "分数",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: "14px", fontWeight: "bold" },
            }}
            stroke="#B9FF66"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          {/* 右Y轴：排名（反转） */}
          <YAxis
            yAxisId="right"
            orientation="right"
            reversed={true}
            domain={[1, maxRank + 2]}
            label={{
              value: "班级排名",
              angle: 90,
              position: "insideRight",
              style: { fontSize: "14px", fontWeight: "bold" },
            }}
            stroke="#FF6B6B"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "2px solid #191A23",
              borderRadius: "8px",
              boxShadow: "4px 4px 0px 0px #191A23",
            }}
            labelStyle={{ fontWeight: "bold", color: "#191A23" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div
                  className="bg-white border-2 border-[#191A23] rounded-lg p-3"
                  style={{ boxShadow: "4px 4px 0px 0px #191A23" }}
                >
                  <p className="font-bold text-[#191A23] mb-1">{label}</p>
                  <p className="text-sm text-[#191A23]/70 mb-2">
                    {data.examDate}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">分数:</span> {data.score} /{" "}
                    {data.maxScore}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">班级排名:</span> 第{" "}
                    {data.rank} 名
                  </p>
                  <p className="text-sm text-[#191A23]/70">
                    全班 {data.totalStudents} 人
                  </p>
                </div>
              );
            }}
          />

          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />

          <Bar
            yAxisId="left"
            dataKey="score"
            fill="#B9FF66"
            stroke="#191A23"
            strokeWidth={2}
            name="分数"
            radius={[8, 8, 0, 0]}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="rank"
            stroke="#FF6B6B"
            strokeWidth={3}
            name="班级排名"
            dot={{
              fill: "#FF6B6B",
              stroke: "#191A23",
              strokeWidth: 2,
              r: 6,
            }}
            activeDot={{
              r: 8,
              stroke: "#191A23",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-4 text-sm text-[#191A23]/70 text-center">
        💡 柱状图越高分数越好，折线越低排名越好
      </div>
    </div>
  );
};

export default ScoreRankComboChart;
