
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import ExamSelector from "./ExamSelector";

// 模拟考试数据
const mockExams = [
  { id: "exam1", name: "期中考试", date: "2024-10-15" },
  { id: "exam2", name: "月考一", date: "2024-11-20" },
  { id: "exam3", name: "期末考试", date: "2025-01-15" },
  { id: "exam4", name: "模拟考试一", date: "2025-02-20" },
  { id: "exam5", name: "模拟考试二", date: "2025-03-15" },
];

// 生成模拟成绩数据
const generateScoreData = (examIds: string[]) => {
  const subjects = ["语文", "数学", "英语", "物理", "化学", "生物"];
  return subjects.map(subject => {
    const data: { subject: string; [key: string]: number | string } = { subject };
    examIds.forEach(examId => {
      data[examId] = Math.floor(70 + Math.random() * 30);
    });
    return data;
  });
};

const ExamComparison: React.FC = () => {
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const scoreData = generateScoreData(selectedExams);

  const colors = ["#B9FF66", "#8884d8", "#82ca9d", "#ffc658"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>考试成绩对比分析</CardTitle>
        <CardDescription>选择考试进行成绩趋势对比</CardDescription>
        <ExamSelector
          exams={mockExams}
          selectedExams={selectedExams}
          onChange={setSelectedExams}
          maxSelections={4}
        />
      </CardHeader>
      <CardContent className="h-[320px]">
        {selectedExams.length > 0 ? (
          <ChartContainer config={{
            exam: { color: "#B9FF66" }
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={scoreData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="subject" 
                  angle={-45} 
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value: number) => [`${value} 分`, ""]}
                  labelFormatter={(label: string) => `科目: ${label}`}
                />
                <Legend />
                {selectedExams.map((examId, index) => {
                  const exam = mockExams.find(e => e.id === examId);
                  return (
                    <Line
                      key={examId}
                      type="monotone"
                      dataKey={examId}
                      name={exam?.name}
                      stroke={colors[index]}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            请选择要对比的考试
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamComparison;
