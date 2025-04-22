
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type RiskFactor = {
  factor: string;
  value: number;
};

const RiskFactorChart = () => {
  // Use mock data instead of database query for now
  const mockRiskFactors: RiskFactor[] = [
    { factor: "出勤率", value: 85 },
    { factor: "作业完成", value: 75 },
    { factor: "考试成绩", value: 65 },
    { factor: "课堂参与", value: 70 },
    { factor: "学习态度", value: 80 }
  ];

  const { data: riskFactors, isLoading, error } = useQuery({
    queryKey: ['riskFactors'],
    queryFn: async () => {
      // Simulate API call
      return new Promise<RiskFactor[]>((resolve) => {
        setTimeout(() => {
          resolve(mockRiskFactors);
        }, 500);
      });
    }
  });

  if (error) {
    toast.error("获取风险因素数据失败");
    return null;
  }

  if (isLoading) {
    return <div>加载中...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>风险因素分析</CardTitle>
        <CardDescription>多维度评估学生风险因素</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ChartContainer>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={riskFactors as RiskFactor[]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="factor" />
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
