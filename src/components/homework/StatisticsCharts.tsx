import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// 知识点掌握度等级配置
const MASTERY_LEVELS = [
  { name: "优秀 (A)", range: [90, 100], color: "#10b981" },
  { name: "良好 (B)", range: [80, 89], color: "#3b82f6" },
  { name: "中等 (C)", range: [60, 79], color: "#f59e0b" },
  { name: "及格 (D)", range: [40, 59], color: "#f97316" },
  { name: "不及格 (E)", range: [0, 39], color: "#ef4444" },
];

interface KnowledgePoint {
  id: string;
  name: string;
  masteryLevel: number;
}

interface KnowledgeMasteryDistribution {
  level: string;
  count: number;
  percentage: number;
}

interface StatisticsChartsProps {
  knowledgePoints?: KnowledgePoint[];
  className?: string;
}

export const StatisticsCharts: React.FC<StatisticsChartsProps> = ({
  knowledgePoints = [],
  className = "",
}) => {
  // 计算知识点掌握度分布
  const calculateMasteryDistribution = (): KnowledgeMasteryDistribution[] => {
    if (!knowledgePoints || knowledgePoints.length === 0) {
      return [];
    }

    const distribution = MASTERY_LEVELS.map((level) => ({
      level: level.name,
      count: 0,
      percentage: 0,
      color: level.color,
    }));

    knowledgePoints.forEach((kp) => {
      const masteryLevel = kp.masteryLevel || 0;
      const levelIndex = MASTERY_LEVELS.findIndex(
        (l) => masteryLevel >= l.range[0] && masteryLevel <= l.range[1]
      );
      if (levelIndex !== -1) {
        distribution[levelIndex].count++;
      }
    });

    const total = knowledgePoints.length;
    distribution.forEach((item) => {
      item.percentage = total > 0 ? (item.count / total) * 100 : 0;
    });

    return distribution.filter((item) => item.count > 0);
  };

  // 准备雷达图数据
  const prepareRadarData = () => {
    if (!knowledgePoints || knowledgePoints.length === 0) {
      return [];
    }

    return knowledgePoints.slice(0, 8).map((kp) => ({
      subject: kp.name.length > 10 ? kp.name.substring(0, 10) + "..." : kp.name,
      掌握度: kp.masteryLevel || 0,
      fullMark: 100,
    }));
  };

  // 准备柱状图数据（按等级分组统计知识点数量）
  const prepareBarChartData = () => {
    const distribution = calculateMasteryDistribution();
    return distribution.map((item) => ({
      level: item.level.replace(/ \([A-E]\)/, ""), // 移除括号内的字母
      数量: item.count,
      百分比: item.percentage,
      color: item.color,
    }));
  };

  const masteryDistribution = calculateMasteryDistribution();
  const radarData = prepareRadarData();
  const barChartData = prepareBarChartData();

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 第一行：饼图和雷达图 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 知识点掌握度分布饼图 */}
        <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="bg-[#B9FF66] border-b-4 border-black">
            <CardTitle className="text-xl font-black">
              知识点掌握度分布
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {masteryDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={masteryDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    strokeWidth={3}
                    stroke="#000"
                  >
                    {masteryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "3px solid black",
                      borderRadius: "0",
                      boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)",
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value} 个知识点 (${props.payload.percentage.toFixed(1)}%)`,
                      props.payload.level,
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) =>
                      `${entry.payload.level}: ${entry.payload.count}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>暂无知识点数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 知识点掌握度雷达图 */}
        <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader className="bg-[#B9FF66] border-b-4 border-black">
            <CardTitle className="text-xl font-black">知识点能力雷达</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="80%"
                  data={radarData}
                >
                  <PolarGrid stroke="#000" strokeWidth={2} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "#666", fontSize: 10 }}
                  />
                  <Radar
                    name="掌握度"
                    dataKey="掌握度"
                    stroke="#5E9622"
                    strokeWidth={3}
                    fill="#B9FF66"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "3px solid black",
                      borderRadius: "0",
                      boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)",
                    }}
                    formatter={(value: number) => [`${value}%`, "掌握度"]}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                <div className="text-4xl mb-2">🎯</div>
                <p>暂无知识点数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 第二行：柱状图 */}
      <Card className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <CardHeader className="bg-[#B9FF66] border-b-4 border-black">
          <CardTitle className="text-xl font-black">
            掌握度等级分布统计
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#000"
                  strokeWidth={2}
                />
                <XAxis
                  dataKey="level"
                  tick={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
                  stroke="#000"
                  strokeWidth={2}
                />
                <YAxis
                  tick={{ fill: "#000", fontWeight: "bold", fontSize: 12 }}
                  stroke="#000"
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    border: "3px solid black",
                    borderRadius: "0",
                    boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${value} 个 (${props.payload.百分比.toFixed(1)}%)`,
                    "知识点数量",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="数量"
                  fill="#B9FF66"
                  stroke="#000"
                  strokeWidth={2}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>暂无知识点数据</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsCharts;
