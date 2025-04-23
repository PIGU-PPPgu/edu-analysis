
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { db } from "@/utils/dbUtils";

type RiskFactor = {
  factor: string;
  value: number;
};

const RiskFactorChart = () => {
  const { data: riskFactors, isLoading, error } = useQuery({
    queryKey: ['riskFactors'],
    queryFn: async () => {
      const result = await db.getRiskFactors();
      return result;
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

