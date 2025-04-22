
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, BoxPlot, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface ScoreBoxPlotProps {
  data: {
    subject: string;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
  }[];
  title?: string;
  description?: string;
}

const ScoreBoxPlot: React.FC<ScoreBoxPlotProps> = ({
  data,
  title = "成绩分布箱线图",
  description = "各科目成绩分布统计"
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ChartContainer config={{
          boxPlot: { color: "#B9FF66" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="subject" 
                angle={-45} 
                textAnchor="end"
                interval={0}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value: number) => [`${value} 分`, ""]}
                labelFormatter={(label: string) => `科目: ${label}`}
              />
              <BoxPlot
                dataKey={["min", "q1", "median", "q3", "max"]}
                fill="#B9FF66"
                stroke="#8884d8"
                opacity={0.7}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ScoreBoxPlot;
