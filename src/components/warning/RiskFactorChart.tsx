
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const riskFactors = [
  { subject: "出勤率", value: 80, fullMark: 100 },
  { subject: "作业完成", value: 65, fullMark: 100 },
  { subject: "考试成绩", value: 45, fullMark: 100 },
  { subject: "课堂参与", value: 70, fullMark: 100 },
  { subject: "学习态度", value: 85, fullMark: 100 },
];

const RiskFactorChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>风险因素分析</CardTitle>
        <CardDescription>多维度评估学生风险因素</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={riskFactors}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <Radar
                name="风险指数"
                dataKey="value"
                stroke="#B9FF66"
                fill="#B9FF66"
                fillOpacity={0.5}
              />
              <Tooltip formatter={(value) => `${value}分`} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default RiskFactorChart;
