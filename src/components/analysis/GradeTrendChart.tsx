import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface GradeTrendChartProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
}

const mockData = [
  {
    name: "作业1",
    平均分: 85,
    提交率: 95,
  },
  {
    name: "作业2",
    平均分: 82,
    提交率: 90,
  },
  {
    name: "作业3",
    平均分: 88,
    提交率: 85,
  },
  {
    name: "作业4",
    平均分: 90,
    提交率: 88,
  },
  {
    name: "作业5",
    平均分: 86,
    提交率: 92,
  }
];

export default function GradeTrendChart({
  className,
  data = mockData,
  title = "作业成绩趋势",
  description = "各次作业的平均分和提交率走势"
}: GradeTrendChartProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" domain={[0, 100]} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
            <Tooltip 
              formatter={(value, name) => {
                if (name === "平均分") return [`${value}分`, "平均分"];
                if (name === "提交率") return [`${value}%`, "提交率"];
                return [value, name];
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="平均分" 
              stroke="#4ade80" 
              yAxisId="left"
              activeDot={{ r: 8 }} 
              name="平均分" 
            />
            <Line 
              type="monotone" 
              dataKey="提交率" 
              stroke="#60a5fa" 
              yAxisId="right"
              activeDot={{ r: 8 }} 
              name="提交率" 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 