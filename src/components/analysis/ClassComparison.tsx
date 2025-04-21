
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

// 模拟对比数据
const mockComparisonData = [
  { subject: "语文", studentScore: 92, classAvg: 85.6, gradeAvg: 83.2 },
  { subject: "数学", studentScore: 88, classAvg: 82.3, gradeAvg: 80.5 },
  { subject: "英语", studentScore: 76, classAvg: 79.2, gradeAvg: 77.8 },
  { subject: "科学", studentScore: 85, classAvg: 81.4, gradeAvg: 80.1 },
  { subject: "音乐", studentScore: 96, classAvg: 90.2, gradeAvg: 89.5 },
  { subject: "体育", studentScore: 90, classAvg: 88.7, gradeAvg: 87.3 }
];

interface ClassComparisonProps {
  studentId: string;
  studentName: string;
}

const ClassComparison: React.FC<ClassComparisonProps> = ({ studentId, studentName }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">班级对比分析</CardTitle>
        <CardDescription>
          {studentName} 同学与班级、年级平均水平对比
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] flex items-center justify-center">
        <ChartContainer config={{
          studentScore: { color: "#B9FF66" },
          classAvg: { color: "#8884d8" },
          gradeAvg: { color: "#82ca9d" }
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={mockComparisonData}
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
      </CardContent>
    </Card>
  );
};

export default ClassComparison;
