import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, Scatter, ScatterChart, Cell, ZAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

  // Color gradient from red (lower scores) to green (higher scores)
const getColorByValue = (value: number) => {
  if (value >= 90) return "#B9FF66"; // Green for excellent
  if (value >= 85) return "#8AE234";
  if (value >= 80) return "#FCE94F"; // Yellow for good
  if (value >= 75) return "#FCAF3E";
  if (value >= 70) return "#FF8042"; // Orange for average
  return "#FF6347"; // Red for below average or other cases
};

interface HeatmapDataItem {
  x: string; // Represents the metric (e.g., '平均分', '优秀率')
  y: string; // Represents the class name
  value: number; // The actual value for the heatmap cell
  // Optional: include other relevant data if needed for tooltip or other features
  [key: string]: any; 
}

interface HeatmapChartProps {
  chartData: HeatmapDataItem[]; // Changed from optional to required, or provide default
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  valueUnit?: string; // e.g., "分", "%"
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({ 
  chartData,
  title = "班级指标热力图", 
  description = "各班级在不同关键指标上的表现分布",
  xAxisLabel = "指标",
  yAxisLabel = "班级",
  valueUnit = ""
}) => {
  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-muted-foreground">暂无数据可供显示。</p>
        </CardContent>
      </Card>
    );
  }

  // Dynamically get unique x and y categories for axes
  const xCategories = Array.from(new Set(chartData.map(item => item.x)));
  const yCategories = Array.from(new Set(chartData.map(item => item.y)));


  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px] md:h-[500px]"> 
        <ChartContainer config={{
          heatmap: { color: "#8884d8" } // This config might not be used directly by Scatter
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 30, bottom: 80, left: 80 }} // Adjusted margins for labels
            >
              <XAxis 
                type="category" // Important for discrete categories
                dataKey="x" 
                name={xAxisLabel}
                allowDuplicatedCategory={false}
                interval={0}
                angle={-45} 
                textAnchor="end"
                height={60} // Adjust height for rotated labels
                label={{ value: xAxisLabel, position: 'insideBottom', offset: -60 }}
                domain={xCategories} // Specify domain for proper ordering/display
                ticks={xCategories.map(cat => ({ value: cat, label: cat }))} // Ensure all categories are shown
              />
              <YAxis 
                type="category" // Important for discrete categories
                dataKey="y" 
                name={yAxisLabel}
                allowDuplicatedCategory={false}
                width={100} // Adjust width for labels
                interval={0}
                label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                domain={yCategories} // Specify domain
                ticks={yCategories.map(cat => ({ value: cat, label: cat }))} // Ensure all categories are shown
              />
              <ZAxis 
                dataKey="value" // ZAxis is used for the 'size' of the scatter points, but here color represents value.
                range={[100, 500]} // This might be less relevant if color is primary encoding
                name="数值" 
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as HeatmapDataItem;
                    return (
                      <div className="rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
                        <p className="font-bold">{item.y} - {item.x}</p>
                        <p>数值: <span className="font-semibold">{item.value.toFixed(1)}{valueUnit}</span></p>
                        {/* You can add more details from item if they exist */}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={chartData} shape="square">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorByValue(entry.value)} 
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default HeatmapChart;
