/**
 * 📐 学科均衡度雷达图
 * 显示学生各科目得分率，直观展示偏科情况
 */

import React from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface SubjectScore {
  subject: string;
  scoreRate: number; // 得分率（0-100）
  fullScore: number;
  actualScore: number;
}

interface SBIRadarChartProps {
  data: SubjectScore[];
  title?: string;
  height?: number;
  sbiValue?: number;
}

const SBIRadarChart: React.FC<SBIRadarChartProps> = ({
  data,
  title,
  height = 400,
  sbiValue,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无科目数据
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-[#191A23]">{title}</h3>
          {sbiValue !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#191A23]/70">
                学科均衡度(SBI):
              </span>
              <span
                className={`text-2xl font-black ${
                  sbiValue >= 80
                    ? "text-green-600"
                    : sbiValue >= 60
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {sbiValue.toFixed(1)}
              </span>
              <span className="text-sm text-[#191A23]/70">/ 100</span>
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid stroke="#191A23" strokeOpacity={0.3} />

          <PolarAngleAxis
            dataKey="subject"
            stroke="#191A23"
            style={{ fontSize: "14px", fontWeight: "600" }}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
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
                    {data.subject}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">得分:</span>{" "}
                    {data.actualScore} / {data.fullScore}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">得分率:</span>{" "}
                    {data.scoreRate.toFixed(1)}%
                  </p>
                </div>
              );
            }}
          />

          <Radar
            name="得分率(%)"
            dataKey="scoreRate"
            stroke="#B9FF66"
            fill="#B9FF66"
            fillOpacity={0.6}
            strokeWidth={3}
          />

          <Legend />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700 font-medium mb-2">
          💡 学科均衡度解读：
        </p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 雷达图越接近正多边形，学科发展越均衡</li>
          <li>• SBI ≥ 80：学科发展非常均衡</li>
          <li>• SBI 60-80：较为均衡，个别科目需加强</li>
          <li>• SBI {"<"} 60：存在明显偏科，需重点关注薄弱科目</li>
        </ul>
      </div>
    </div>
  );
};

export default SBIRadarChart;
