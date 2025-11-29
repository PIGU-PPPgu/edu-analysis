/**
 * 📊 排名分布图
 * 按段位显示学生排名分布（年级前50、50-100、100-250等）
 */

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

export interface RankSegment {
  segment: string;
  range: string;
  count: number;
  percentage: number;
}

interface RankDistributionChartProps {
  data: RankSegment[];
  title?: string;
  height?: number;
}

const RankDistributionChart: React.FC<RankDistributionChartProps> = ({
  data,
  title,
  height = 400,
}) => {
  // 系统Neobrutalism配色 + 渐变
  const colors = [
    "#B9FF66", // 前50: 优秀 - 荧光绿
    "#4ECDC4", // 50-100: 良好 - 青色
    "#FFD93D", // 100-250: 中上 - 黄色
    "#FFA726", // 250-350: 中等 - 橙色（系统黄色加深）
    "#FF6B6B", // 350-600: 中下 - 红色
    "#E53935", // 600+: 待提高 - 深红色（系统红色加深）
  ];

  const totalCount = useMemo(() => {
    return data.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无排名数据
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-bold text-lg text-[#191A23] mb-4">{title}</h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#191A23" opacity={0.1} />

          <XAxis
            dataKey="segment"
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#191A23"
            style={{ fontSize: "13px", fontWeight: "600" }}
          />

          <YAxis
            label={{
              value: "人数",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: "14px", fontWeight: "bold" },
            }}
            stroke="#191A23"
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
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload;
              return (
                <div
                  className="bg-white border-2 border-[#191A23] rounded-lg p-3"
                  style={{ boxShadow: "4px 4px 0px 0px #191A23" }}
                >
                  <p className="font-bold text-[#191A23] mb-1">
                    {data.segment}
                  </p>
                  <p className="text-sm text-[#191A23]/70 mb-1">
                    排名段: {data.range}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">人数:</span> {data.count} 人
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">占比:</span>{" "}
                    {data.percentage.toFixed(1)}%
                  </p>
                </div>
              );
            }}
          />

          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
            stroke="#191A23"
            strokeWidth={2}
          >
            <LabelList
              dataKey="count"
              position="top"
              style={{ fontSize: "14px", fontWeight: "700", fill: "#191A23" }}
              formatter={(value: number) => `${value}人`}
            />
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {data.map((item, index) => (
          <div
            key={index}
            className="p-3 rounded-lg border-2 border-[#191A23]"
            style={{ backgroundColor: colors[index % colors.length] }}
          >
            <div className="text-xs font-bold text-[#191A23] mb-1">
              {item.segment}
            </div>
            <div className="text-xs text-[#191A23]/70 mb-1">{item.range}</div>
            <div className="text-xl font-black text-[#191A23]">
              {item.count}人
            </div>
            <div className="text-xs text-[#191A23]/70">
              {item.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-4 text-sm text-[#191A23]/70">
        总计: {totalCount} 人
      </div>
    </div>
  );
};

export default RankDistributionChart;
