
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface SubjectData {
  subject: string;
  average: number;
}

interface Props {
  data: SubjectData[];
}

const SubjectAverages: React.FC<Props> = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const handleMouseOver = (data: any, index: number) => {
    setActiveIndex(index);
  };
  
  const handleMouseLeave = () => {
    setActiveIndex(null);
  };
  
  const colors = ["#8884d8", "#B9FF66", "#ffc658", "#ff8042", "#82ca9d", "#a4de6c"];
  
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>各科平均分对比</CardTitle>
        <CardDescription>各科目的平均得分情况</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ChartContainer config={{
          average: { color: "#8884d8" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" angle={-45} textAnchor="end" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => [`${value} 分`, "平均分"]}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              <Legend />
              <Bar 
                dataKey="average" 
                name="平均分" 
                onMouseOver={handleMouseOver}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={activeIndex === index ? "#B9FF66" : colors[index % colors.length]} 
                    cursor="pointer"
                    fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default SubjectAverages;
