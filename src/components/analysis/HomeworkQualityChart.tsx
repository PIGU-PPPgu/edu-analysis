import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";

interface HomeworkQualityChartProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
}

const mockData = [
  {
    subject: "内容完整性",
    A: 90,
    B: 75,
    fullMark: 100,
  },
  {
    subject: "理解深度",
    A: 85,
    B: 80,
    fullMark: 100,
  },
  {
    subject: "创新性",
    A: 65,
    B: 85,
    fullMark: 100,
  },
  {
    subject: "技术应用",
    A: 95,
    B: 70,
    fullMark: 100,
  },
  {
    subject: "表达清晰度",
    A: 80,
    B: 90,
    fullMark: 100,
  },
];

export default function HomeworkQualityChart({
  className,
  data = mockData,
  title = "作业质量分析",
  description = "高质量作业与平均水平作业在各维度的对比分析"
}: HomeworkQualityChartProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} />
            <Radar
              name="高质量作业"
              dataKey="A"
              stroke="#4ade80"
              fill="#4ade80"
              fillOpacity={0.5}
            />
            <Radar
              name="平均水平"
              dataKey="B"
              stroke="#60a5fa"
              fill="#60a5fa"
              fillOpacity={0.5}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 