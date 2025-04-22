
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface ClassComparisonProps {
  studentId: string;
  studentName: string;
}

const ClassComparison: React.FC<ClassComparisonProps> = ({ studentId, studentName }) => {
  // 使用空数组替代模拟数据
  const comparisonData = [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">班级对比分析</CardTitle>
        <CardDescription>
          {studentName} 同学与班级、年级平均水平对比
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] flex items-center justify-center">
        {comparisonData.length > 0 ? (
          <ChartContainer config={{
            studentScore: { color: "#B9FF66" },
            classAvg: { color: "#8884d8" },
            gradeAvg: { color: "#82ca9d" }
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" angle={-45} textAnchor="end" interval={0} />
                <YAxis domain={[60, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ bottom: -5 }} />
                <Bar dataKey="studentScore" name="学生分数" fill="#B9FF66" />
                <Bar dataKey="classAvg" name="班级平均" fill="#8884d8" />
                <Bar dataKey="gradeAvg" name="年级平均" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <p className="text-gray-500">暂无对比数据</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ClassComparison;
