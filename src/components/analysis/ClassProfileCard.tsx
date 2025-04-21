
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

// Mock data for class profile
const mockClassData = {
  className: "高二(1)班",
  studentCount: 42,
  avgScore: 85.7,
  passRate: 97.6,
  topStudents: ["张三", "李四", "王五"],
  subjectScores: [
    { subject: "语文", score: 87.5, fullmarks: 5 },
    { subject: "数学", score: 84.2, fullmarks: 8 },
    { subject: "英语", score: 88.1, fullmarks: 6 },
    { subject: "物理", score: 82.6, fullmarks: 3 },
    { subject: "化学", score: 86.3, fullmarks: 4 },
    { subject: "生物", score: 85.4, fullmarks: 2 }
  ],
  competencies: [
    { name: "知识掌握", value: 85 },
    { name: "解题能力", value: 83 },
    { name: "创新思维", value: 75 },
    { name: "团队协作", value: 90 },
    { name: "学习态度", value: 88 }
  ]
};

interface ClassProfileCardProps {
  classData?: {
    className: string;
    studentCount: number;
    avgScore: number;
    passRate: number;
    topStudents: string[];
    subjectScores: Array<{
      subject: string;
      score: number;
      fullmarks: number;
    }>;
    competencies: Array<{
      name: string;
      value: number;
    }>;
  };
}

const ClassProfileCard: React.FC<ClassProfileCardProps> = ({ 
  classData = mockClassData 
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{classData.className}班级画像</CardTitle>
        <CardDescription>
          学生人数: {classData.studentCount} | 平均分: {classData.avgScore} | 及格率: {classData.passRate}%
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subject Performance Chart */}
          <div className="h-[300px]">
            <h3 className="text-sm font-medium mb-2">各科成绩表现</h3>
            <ChartContainer config={{
              score: { color: "#8884d8" },
              fullmarks: { color: "#B9FF66" }
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classData.subjectScores}
                  margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                >
                  <XAxis dataKey="subject" angle={-45} textAnchor="end" interval={0} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value} 分`} />
                  <Legend wrapperStyle={{ bottom: 0 }} />
                  <Bar dataKey="score" name="平均分" fill="#8884d8" />
                  <Bar dataKey="fullmarks" name="满分人数" fill="#B9FF66" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          
          {/* Competency Radar Chart */}
          <div className="h-[300px]">
            <h3 className="text-sm font-medium mb-2">班级能力评估</h3>
            <ChartContainer config={{
              value: { color: "#B9FF66" }
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius={90} data={classData.competencies}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value} 分`} />
                  <Radar 
                    name="班级能力" 
                    dataKey="value" 
                    stroke="#B9FF66" 
                    fill="#B9FF66" 
                    fillOpacity={0.5} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <h3 className="font-medium mb-2">班级特点分析</h3>
          <p className="text-sm text-muted-foreground">
            该班级整体表现优秀，特别在语文和英语科目上有明显优势。团队协作能力突出，
            学习态度积极。可以适当加强创新思维训练，提高物理学科水平。
            班级有 {classData.topStudents.length} 名学生在年级排名前20，分别是：
            {classData.topStudents.join("、")}。
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline" className="w-full" size="sm">
          <Link to="/student-management">
            <FileText className="mr-2 h-4 w-4" />
            查看详细报告
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ClassProfileCard;
