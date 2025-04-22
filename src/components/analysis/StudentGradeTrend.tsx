
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface StudentGradeTrendProps {
  studentId: string;
  studentName: string;
}

const StudentGradeTrend: React.FC<StudentGradeTrendProps> = ({ studentId, studentName }) => {
  // 使用空数组替代模拟数据
  const chartData = [];
  const subjects = [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">成绩趋势分析</CardTitle>
        <CardDescription>
          {studentName} 同学的各科目成绩变化趋势
        </CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {chartData.length > 0 ? (
          <ChartContainer config={{
            "语文": { color: "#8884d8" },
            "数学": { color: "#82ca9d" },
            "英语": { color: "#ffc658" },
            "科学": { color: "#ff8042" }
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Legend />
                {subjects.map(subject => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subject}
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">暂无历史成绩数据</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentGradeTrend;
