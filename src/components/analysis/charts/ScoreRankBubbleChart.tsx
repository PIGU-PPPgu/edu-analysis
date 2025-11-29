/**
 * 🫧 成绩-排名气泡图
 * 显示分数、排名、人数的三维关系
 */

import React, { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from "recharts";

export interface BubbleDataPoint {
  studentName?: string;
  score: number;
  rank: number;
  count?: number; // 气泡大小（该分数段的人数）
  className?: string;
}

interface ScoreRankBubbleChartProps {
  data: BubbleDataPoint[];
  title?: string;
  height?: number;
  maxScore?: number;
}

const ScoreRankBubbleChart: React.FC<ScoreRankBubbleChartProps> = ({
  data,
  title,
  height = 500,
  maxScore = 100,
}) => {
  // 按班级分组数据
  const groupedData = useMemo(() => {
    const groups = new Map<string, BubbleDataPoint[]>();

    data.forEach((point) => {
      const className = point.className || "全部学生";
      if (!groups.has(className)) {
        groups.set(className, []);
      }
      groups.get(className)!.push(point);
    });

    return Array.from(groups.entries()).map(([className, points]) => ({
      className,
      data: points,
    }));
  }, [data]);

  // 颜色映射
  const colors = [
    "#B9FF66",
    "#FF6B6B",
    "#4ECDC4",
    "#FFD93D",
    "#A78BFA",
    "#FB923C",
  ];

  const maxRank = Math.max(...data.map((d) => d.rank));

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无数据
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-bold text-lg text-[#191A23] mb-4">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#191A23" opacity={0.1} />

          <XAxis
            type="number"
            dataKey="rank"
            name="排名"
            reversed={true}
            domain={[1, maxRank + 2]}
            label={{
              value: "班级排名（数值越小越好）",
              position: "insideBottom",
              offset: -10,
              style: { fontSize: "14px", fontWeight: "bold" },
            }}
            stroke="#191A23"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          <YAxis
            type="number"
            dataKey="score"
            name="分数"
            domain={[0, maxScore + 10]}
            label={{
              value: "总分",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: "14px", fontWeight: "bold" },
            }}
            stroke="#191A23"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          <ZAxis
            type="number"
            dataKey="count"
            range={[100, 1000]}
            name="人数"
          />

          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              backgroundColor: "white",
              border: "2px solid #191A23",
              borderRadius: "8px",
              boxShadow: "4px 4px 0px 0px #191A23",
            }}
            labelStyle={{ fontWeight: "bold", color: "#191A23" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div
                  className="bg-white border-2 border-[#191A23] rounded-lg p-3"
                  style={{ boxShadow: "4px 4px 0px 0px #191A23" }}
                >
                  {data.studentName && (
                    <p className="font-bold text-[#191A23] mb-1">
                      {data.studentName}
                    </p>
                  )}
                  {data.className && (
                    <p className="text-sm text-[#191A23]/70">
                      {data.className}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-semibold">分数:</span> {data.score}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">排名:</span> 第 {data.rank}{" "}
                    名
                  </p>
                  {data.count && (
                    <p className="text-sm">
                      <span className="font-semibold">人数:</span> {data.count}{" "}
                      人
                    </p>
                  )}
                </div>
              );
            }}
          />

          <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />

          {groupedData.map((group, index) => (
            <Scatter
              key={group.className}
              name={group.className}
              data={group.data}
              fill={colors[index % colors.length]}
              stroke="#191A23"
              strokeWidth={2}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="text-[#191A23]/70">气泡大小 = 该分数段人数</div>
        </div>
      </div>
    </div>
  );
};

export default ScoreRankBubbleChart;
