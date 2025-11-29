/**
 * 📈 排名趋势面积图
 * 显示学生在多次考试中的排名变化趋势
 */

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface RankTrendData {
  examTitle: string;
  examDate: string;
  classRank: number;
  gradeRank?: number;
  schoolRank?: number;
  totalStudents: number;
}

interface RankTrendAreaChartProps {
  data: RankTrendData[];
  title?: string;
  height?: number;
  showGradeRank?: boolean;
  showSchoolRank?: boolean;
}

const RankTrendAreaChart: React.FC<RankTrendAreaChartProps> = ({
  data,
  title,
  height = 400,
  showGradeRank = true,
  showSchoolRank = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[#191A23]/50">
        暂无排名趋势数据
      </div>
    );
  }

  // 反转Y轴：排名越小越好，所以要在图表中显示在上方
  const maxRank = Math.max(
    ...data.map((d) =>
      Math.max(d.classRank || 0, d.gradeRank || 0, d.schoolRank || 0)
    )
  );

  return (
    <div className="w-full">
      {title && (
        <h3 className="font-bold text-lg text-[#191A23] mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            <linearGradient id="colorClassRank" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B9FF66" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#B9FF66" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorGradeRank" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorSchoolRank" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4ECDC4" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#4ECDC4" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#191A23" opacity={0.1} />

          <XAxis
            dataKey="examTitle"
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#191A23"
            style={{ fontSize: "12px", fontWeight: "600" }}
          />

          <YAxis
            reversed={true}
            domain={[1, maxRank + 5]}
            label={{
              value: "排名（数值越小越好）",
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
            formatter={(value: any, name: string) => {
              const labels: Record<string, string> = {
                classRank: "班级排名",
                gradeRank: "年级排名",
                schoolRank: "学校排名",
              };
              return [`第 ${value} 名`, labels[name] || name];
            }}
          />

          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="square"
            formatter={(value) => {
              const labels: Record<string, string> = {
                classRank: "班级排名",
                gradeRank: "年级排名",
                schoolRank: "学校排名",
              };
              return labels[value] || value;
            }}
          />

          <Area
            type="monotone"
            dataKey="classRank"
            stroke="#B9FF66"
            strokeWidth={3}
            fill="url(#colorClassRank)"
            name="classRank"
          />

          {showGradeRank && (
            <Area
              type="monotone"
              dataKey="gradeRank"
              stroke="#FF6B6B"
              strokeWidth={3}
              fill="url(#colorGradeRank)"
              name="gradeRank"
            />
          )}

          {showSchoolRank && (
            <Area
              type="monotone"
              dataKey="schoolRank"
              stroke="#4ECDC4"
              strokeWidth={3}
              fill="url(#colorSchoolRank)"
              name="schoolRank"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 text-sm text-[#191A23]/70 text-center">
        💡 提示：图表中数值越低（越靠上）表示排名越好
      </div>
    </div>
  );
};

export default RankTrendAreaChart;
