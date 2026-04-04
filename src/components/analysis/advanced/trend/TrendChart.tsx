import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import { SUBJECT_CONFIG, type StudentTrendData } from "./trendUtils";

interface TrendChartProps {
  chartData: (StudentTrendData & { examIndex: number; examLabel: string })[];
  radarData: { subject: string; score: number; fullMark: number }[];
  viewMode: "line" | "area" | "radar";
}

const tooltipStyle = {
  border: "2px solid #191A23",
  borderRadius: "8px",
  backgroundColor: "white",
  boxShadow: "4px 4px 0px 0px #191A23",
};

const TrendChart: React.FC<TrendChartProps> = ({
  chartData,
  radarData,
  viewMode,
}) => {
  return (
    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
      <CardHeader className="bg-[#6B7280] border-b-2 border-black">
        <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
          <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          成绩趋势可视化
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-64 sm:h-80 lg:h-96 flex items-center">
          {viewMode === "line" && (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="examLabel" stroke="#191A23" fontWeight="bold" />
                <YAxis stroke="#191A23" fontWeight="bold" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {Object.entries(SUBJECT_CONFIG).map(([subject, config]) => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={config.field}
                    stroke={config.color}
                    strokeWidth={3}
                    dot={{ fill: config.color, strokeWidth: 2, r: 5 }}
                    name={subject}
                  />
                ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          )}
          {viewMode === "area" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="examLabel" stroke="#191A23" fontWeight="bold" />
                <YAxis stroke="#191A23" fontWeight="bold" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="totalScore"
                  stroke="#B9FF66"
                  fill="#B9FF66"
                  fillOpacity={0.3}
                  strokeWidth={3}
                  name="总分"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {viewMode === "radar" && radarData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E5E7EB" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#191A23", fontWeight: "bold" }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#191A23" }} />
                <Radar
                  name="最新成绩"
                  dataKey="score"
                  stroke="#B9FF66"
                  fill="#B9FF66"
                  fillOpacity={0.3}
                  strokeWidth={3}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendChart;
