/**
 * 🔷 API-SBI散点图
 * 展示学业表现指数(API)与学科均衡度(SBI)的关系
 */

import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  ReferenceLine,
  Cell,
} from "recharts";

export interface StudentMetric {
  studentId: string;
  studentName: string;
  className?: string;
  api: number; // 学业表现指数 0-100
  sbi: number; // 学科均衡度 0-100
  score: number; // 总分
}

interface APISBIScatterChartProps {
  data: StudentMetric[];
  title?: string;
  height?: number;
}

const APISBIScatterChart: React.FC<APISBIScatterChartProps> = ({
  data,
  title,
  height = 500,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无数据
      </div>
    );
  }

  // 根据API和SBI分类
  const getColor = (api: number, sbi: number) => {
    if (api >= 70 && sbi >= 70) return "#B9FF66"; // 优秀且均衡
    if (api >= 70 && sbi < 70) return "#FFD93D"; // 优秀但偏科
    if (api < 70 && sbi >= 70) return "#4ECDC4"; // 均衡但成绩待提高
    return "#FF6B6B"; // 需重点关注
  };

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
            dataKey="api"
            name="API"
            domain={[0, 100]}
            label={{
              value: "学业表现指数 (API)",
              position: "insideBottom",
              offset: -10,
              style: { fontSize: "14px", fontWeight: "bold" },
            }}
            stroke="#191A23"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          <YAxis
            type="number"
            dataKey="sbi"
            name="SBI"
            domain={[0, 100]}
            label={{
              value: "学科均衡度 (SBI)",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: "14px", fontWeight: "bold" },
            }}
            stroke="#191A23"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          <ZAxis type="number" dataKey="score" range={[100, 400]} name="总分" />

          {/* 参考线：API=70 和 SBI=70 */}
          <ReferenceLine
            x={70}
            stroke="#191A23"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={70}
            stroke="#191A23"
            strokeDasharray="5 5"
            strokeOpacity={0.5}
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
                  <p className="font-bold text-[#191A23] mb-1">
                    {data.studentName}
                  </p>
                  {data.className && (
                    <p className="text-sm text-[#191A23]/70 mb-2">
                      {data.className}
                    </p>
                  )}
                  <p className="text-sm">
                    <span className="font-semibold">API:</span>{" "}
                    {data.api.toFixed(1)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">SBI:</span>{" "}
                    {data.sbi.toFixed(1)}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">总分:</span>{" "}
                    {data.score.toFixed(1)}
                  </p>
                </div>
              );
            }}
          />

          <Scatter name="学生" data={data} stroke="#191A23" strokeWidth={2}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getColor(entry.api, entry.sbi)}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* 四象限解读 */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div
          className="p-4 rounded-lg border-2 border-[#191A23]"
          style={{ backgroundColor: "#B9FF66" }}
        >
          <div className="font-bold text-[#191A23] mb-1">
            🌟 优秀且均衡 (API≥70, SBI≥70)
          </div>
          <div className="text-sm text-[#191A23]/70">
            成绩优秀，学科发展均衡，继续保持
          </div>
        </div>
        <div
          className="p-4 rounded-lg border-2 border-[#191A23]"
          style={{ backgroundColor: "#FFD93D" }}
        >
          <div className="font-bold text-[#191A23] mb-1">
            ⚠️ 优秀但偏科 (API≥70, SBI小于70)
          </div>
          <div className="text-sm text-[#191A23]/70">
            总体成绩好，但需关注薄弱科目
          </div>
        </div>
        <div
          className="p-4 rounded-lg border-2 border-[#191A23]"
          style={{ backgroundColor: "#4ECDC4" }}
        >
          <div className="font-bold text-[#191A23] mb-1">
            📐 均衡但待提高 (API小于70, SBI≥70)
          </div>
          <div className="text-sm text-[#191A23]/70">
            学科均衡，需整体提升学习效率
          </div>
        </div>
        <div
          className="p-4 rounded-lg border-2 border-[#191A23]"
          style={{ backgroundColor: "#FF6B6B" }}
        >
          <div className="font-bold text-[#191A23] mb-1">
            🚨 需重点关注 (API小于70, SBI小于70)
          </div>
          <div className="text-sm text-[#191A23]/70">
            成绩和均衡度都需改善，需针对性辅导
          </div>
        </div>
      </div>
    </div>
  );
};

export default APISBIScatterChart;
