import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface GradeDistributionChartProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
}

const mockData = [
  {
    name: "优秀",
    数量: 18,
    颜色: "#4ade80",
  },
  {
    name: "良好",
    数量: 25,
    颜色: "#60a5fa",
  },
  {
    name: "及格",
    数量: 12,
    颜色: "#facc15",
  },
  {
    name: "不及格",
    数量: 5,
    颜色: "#f87171",
  },
];

export default function GradeDistributionChart({
  className,
  data = mockData,
  title = "成绩等级分布",
  description = "作业成绩不同等级的数量分布"
}: GradeDistributionChartProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip 
              formatter={(value, name) => [`${value}份`, "数量"]} 
              labelFormatter={(label) => `${label}作业`}
            />
            <Legend />
            <Bar 
              dataKey="数量" 
              name="数量" 
              fill="#60a5fa"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 