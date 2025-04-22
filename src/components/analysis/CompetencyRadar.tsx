
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface CompetencyData {
  name: string;
  current: number;
  average: number;
  fullScore: number;
}

interface CompetencyRadarProps {
  data: CompetencyData[];
  title?: string;
  description?: string;
  className?: string;
}

const CompetencyRadar: React.FC<CompetencyRadarProps> = ({
  data,
  title = "能力维度分析",
  description = "学生多维度能力评估",
  className
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ChartContainer config={{
          current: { color: "#8884d8" },
          average: { color: "#82ca9d" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="当前成绩"
                dataKey="current"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
              <Radar
                name="班级平均"
                dataKey="average"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.6}
              />
              <Tooltip
                formatter={(value) => [`${value}分`, ""]}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default CompetencyRadar;
