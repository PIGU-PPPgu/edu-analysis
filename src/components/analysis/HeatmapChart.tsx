
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, Tooltip, XAxis, YAxis, Scatter, ScatterChart, Cell, ZAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

// Mock data for the heatmap
const generateMockData = () => {
  const subjects = ["语文", "数学", "英语", "物理", "化学", "生物"];
  const classes = ["高二(1)班", "高二(2)班", "高二(3)班", "高二(4)班"];
  
  const data = [];
  for (const subject of subjects) {
    for (const className of classes) {
      // Random score between 70 and 95
      const avgScore = 70 + Math.floor(Math.random() * 25);
      const studentCount = 30 + Math.floor(Math.random() * 15);
      
      data.push({
        subject,
        className,
        avgScore,
        studentCount,
        z: avgScore
      });
    }
  }
  
  return data;
};

const mockHeatmapData = generateMockData();

// Calculate score to color mapping
const getColorByScore = (score: number) => {
  // Color gradient from red (lower scores) to green (higher scores)
  if (score >= 90) return "#B9FF66"; // Green for excellent
  if (score >= 85) return "#8AE234";
  if (score >= 80) return "#FCE94F"; // Yellow for good
  if (score >= 75) return "#FCAF3E";
  if (score >= 70) return "#FF8042"; // Orange for average
  return "#FF6347"; // Red for below average
};

interface HeatmapChartProps {
  title?: string;
  description?: string;
}

const HeatmapChart: React.FC<HeatmapChartProps> = ({ 
  title = "学科班级热力图", 
  description = "各班级在不同学科的平均分布表现" 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ChartContainer config={{
          heatmap: { color: "#8884d8" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
            >
              <XAxis 
                dataKey="subject" 
                name="科目" 
                allowDuplicatedCategory={false}
                interval={0}
                angle={-45} 
                textAnchor="end"
              />
              <YAxis 
                dataKey="className" 
                name="班级" 
                allowDuplicatedCategory={false}
                width={80}
              />
              <ZAxis 
                dataKey="z" 
                range={[100, 500]} 
                name="平均分" 
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name, props) => {
                  if (name === "平均分") {
                    return [`${value} 分`, name];
                  }
                  return [value, name];
                }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-md border bg-background p-2 shadow-md">
                        <p className="font-bold">{data.className} - {data.subject}</p>
                        <p>平均分: <span className="font-semibold">{data.avgScore}</span></p>
                        <p>学生数: <span className="font-semibold">{data.studentCount}</span></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter data={mockHeatmapData} shape="square">
                {mockHeatmapData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getColorByScore(entry.avgScore)} 
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
