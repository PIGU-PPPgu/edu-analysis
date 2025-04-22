
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Area, Line, ReferenceLine } from "recharts";
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
    <Card className="transition-all hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[320px] pt-4">
        <ChartContainer>
          <ResponsiveContainer width="100%" height={320} minWidth={300}>
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
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value} 分`, ""]}
                labelFormatter={(label: string) => `科目: ${label}`}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              
              {/* 箱体区域（Q1到Q3） */}
              <Area 
                dataKey="q1" 
                stackId="1" 
                stroke="none" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.2}
              />
              <Area 
                dataKey="q3" 
                stackId="1" 
                stroke="none" 
                fill="hsl(var(--primary))" 
                fillOpacity={0} 
              />
              
              {/* 中位线 */}
              <Line 
                dataKey="median" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
              />
              
              {/* 最大值和最小值线 */}
              {data.map((entry, index) => (
                <React.Fragment key={index}>
                  <ReferenceLine 
                    segment={[
                      { x: index, y: entry.min },
                      { x: index, y: entry.q1 }
                    ]} 
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                  <ReferenceLine 
                    segment={[
                      { x: index, y: entry.q3 },
                      { x: index, y: entry.max }
                    ]} 
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                </React.Fragment>
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ScoreBoxPlot;
