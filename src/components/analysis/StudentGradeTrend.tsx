
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

// 模拟历史成绩数据
const mockHistoricalData = [
  {
    examName: "期初测试",
    date: "2023-02-15",
    scores: [
      { subject: "语文", score: 85 },
      { subject: "数学", score: 78 },
      { subject: "英语", score: 72 },
      { subject: "科学", score: 80 },
    ]
  },
  {
    examName: "第一次月考",
    date: "2023-03-20",
    scores: [
      { subject: "语文", score: 88 },
      { subject: "数学", score: 82 },
      { subject: "英语", score: 75 },
      { subject: "科学", score: 83 },
    ]
  },
  {
    examName: "期中考试",
    date: "2023-04-25",
    scores: [
      { subject: "语文", score: 92 },
      { subject: "数学", score: 88 },
      { subject: "英语", score: 76 },
      { subject: "科学", score: 85 },
    ]
  },
  {
    examName: "第二次月考",
    date: "2023-05-30",
    scores: [
      { subject: "语文", score: 94 },
      { subject: "数学", score: 91 },
      { subject: "英语", score: 81 },
      { subject: "科学", score: 87 },
    ]
  }
];

// 将数据转换为适合LineChart的格式
const transformDataForChart = (data) => {
  const subjects = ["语文", "数学", "英语", "科学"];
  const chartData = data.map(exam => {
    const examData = {
      name: exam.examName,
      date: exam.date,
    };
    
    exam.scores.forEach(scoreItem => {
      examData[scoreItem.subject] = scoreItem.score;
    });
    
    return examData;
  });
  
  return { chartData, subjects };
};

interface StudentGradeTrendProps {
  studentId: string;
  studentName: string;
}

const StudentGradeTrend: React.FC<StudentGradeTrendProps> = ({ studentId, studentName }) => {
  // 在实际应用中，应该通过API获取学生的历史成绩
  const { chartData, subjects } = transformDataForChart(mockHistoricalData);
  
  // 为每个科目分配不同的颜色
  const subjectColors = {
    "语文": "#8884d8",
    "数学": "#82ca9d",
    "英语": "#ffc658",
    "科学": "#ff8042"
  };
  
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
            "语文": { color: subjectColors["语文"] },
            "数学": { color: subjectColors["数学"] },
            "英语": { color: subjectColors["英语"] },
            "科学": { color: subjectColors["科学"] }
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
                    stroke={subjectColors[subject]}
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
