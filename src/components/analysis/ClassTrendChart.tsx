
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

// 模拟班级成绩趋势数据
const generateTrendData = (className: string) => {
  const examTypes = ["期初测试", "第一次月考", "期中考试", "第二次月考", "期末考试"];
  
  return examTypes.map((exam, index) => {
    // 基础分数，随着考试逐渐提高
    const baseScore = 75 + (index * 2); 
    // 随机浮动
    const randomVariation = Math.random() * 5 - 2.5;
    
    return {
      examName: exam,
      classAvg: Math.min(99, Math.max(70, baseScore + randomVariation)).toFixed(1),
      gradeAvg: Math.min(99, Math.max(70, baseScore - 1 + (Math.random() * 4 - 2))).toFixed(1),
    };
  });
};

interface ClassTrendChartProps {
  className: string;
}

const ClassTrendChart: React.FC<ClassTrendChartProps> = ({ className }) => {
  const trendData = generateTrendData(className);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>班级成绩趋势</CardTitle>
        <CardDescription>{className}与年级平均分对比趋势</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ChartContainer config={{
          classAvg: { color: "#B9FF66" },
          gradeAvg: { color: "#8884d8" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={trendData}
              margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="examName" />
              <YAxis domain={[70, 100]} />
              <Tooltip 
                formatter={(value) => [`${value} 分`, ""]}
                labelFormatter={(label) => `考试: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="classAvg" 
                name={`${className}平均分`} 
                stroke="#B9FF66" 
                strokeWidth={2} 
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }} 
              />
              <Line 
                type="monotone" 
                dataKey="gradeAvg" 
                name="年级平均分" 
                stroke="#8884d8" 
                strokeWidth={2} 
                dot={{ r: 4 }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default ClassTrendChart;
