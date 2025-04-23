
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Rectangle, Line, ReferenceLine } from "recharts";
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

// Custom Box plot component for Recharts
const BoxPlot = (props: any) => {
  const { x, y, width, height, q1, q3, median, min, max } = props;
  const boxWidth = width * 0.6; // Box width as 60% of the column width
  const boxX = x + (width - boxWidth) / 2; // Center box in column
  
  return (
    <g>
      {/* Box from Q1 to Q3 */}
      <Rectangle
        x={boxX}
        y={y(q3)}
        width={boxWidth}
        height={y(q1) - y(q3)}
        fill="hsl(var(--primary))"
        fillOpacity={0.4}
        stroke="hsl(var(--primary))"
        strokeWidth={1}
      />
      
      {/* Median line */}
      <line
        x1={boxX}
        y1={y(median)}
        x2={boxX + boxWidth}
        y2={y(median)}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
      />
      
      {/* Min whisker */}
      <line
        x1={x + width / 2}
        y1={y(min)}
        x2={x + width / 2}
        y2={y(q1)}
        stroke="hsl(var(--primary))"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      
      {/* Min whisker cap */}
      <line
        x1={boxX - boxWidth * 0.1}
        y1={y(min)}
        x2={boxX + boxWidth * 1.1}
        y2={y(min)}
        stroke="hsl(var(--primary))"
        strokeWidth={1}
      />
      
      {/* Max whisker */}
      <line
        x1={x + width / 2}
        y1={y(q3)}
        x2={x + width / 2}
        y2={y(max)}
        stroke="hsl(var(--primary))"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      
      {/* Max whisker cap */}
      <line
        x1={boxX - boxWidth * 0.1}
        y1={y(max)}
        x2={boxX + boxWidth * 1.1}
        y2={y(max)}
        stroke="hsl(var(--primary))"
        strokeWidth={1}
      />
    </g>
  );
};

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
              
              {data.map((entry, index) => (
                <BoxPlot
                  key={`boxplot-${index}`}
                  x={index * 100} // This value is auto calculated by chart
                  y={(value: number) => value} // This converts score to y position
                  width={50} // Approximate width of each bar
                  q1={entry.q1}
                  q3={entry.q3}
                  median={entry.median}
                  min={entry.min}
                  max={entry.max}
                />
              ))}
              
              {/* Median line */}
              <Line 
                dataKey="median" 
                stroke="hsl(var(--primary))"
                strokeWidth={0} // Hide the actual line but keep for tooltip
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ScoreBoxPlot;
