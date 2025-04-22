
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { toast } from "sonner";
import Navbar from "../components/analysis/Navbar";
import StudentGradeTrend from "../components/analysis/StudentGradeTrend";
import ClassComparison from "../components/analysis/ClassComparison";

interface StudentData {
  studentId: string;
  name: string;
  className?: string;
  age?: number;
  scores: {
    subject: string;
    score: number;
    examDate?: string;
    examType?: string;
  }[];
}

const mockStudentData: StudentData = {
  studentId: "20230001",
  name: "张三",
  className: "一年级(1)班",
  age: 7,
  scores: [
    { subject: "语文", score: 92, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "数学", score: 88, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "英语", score: 76, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "科学", score: 85, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "音乐", score: 96, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "体育", score: 90, examDate: "2023-09-01", examType: "期中考试" },
  ]
};

// 能力维度评估数据
const abilityRadarData = [
  { ability: "阅读理解", value: 85 },
  { ability: "数学运算", value: 90 },
  { ability: "逻辑思维", value: 75 },
  { ability: "记忆能力", value: 95 },
  { ability: "创新思维", value: 65 },
  { ability: "沟通表达", value: 80 },
];

const StudentProfile: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentData | null>(null);

  useEffect(() => {
    // 在实际应用中，这里应该从API获取学生数据
    setStudent(mockStudentData);
  }, [studentId]);

  if (!student) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="flex justify-center items-center h-64">
            <p>加载学生数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/grade-analysis">返回成绩分析</Link>
                </Button>
                <h1 className="text-3xl font-bold">学生画像分析</h1>
              </div>
              <p className="text-gray-500 mt-1">
                全方位评估学生学习情况与表现
              </p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{student.name}</CardTitle>
                  <CardDescription>
                    学号: {student.studentId} | 班级: {student.className} | 年龄: {student.age}岁
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="overview">成绩概览</TabsTrigger>
                  <TabsTrigger value="ability">能力评估</TabsTrigger>
                  <TabsTrigger value="trends">趋势分析</TabsTrigger>
                  <TabsTrigger value="comparison">班级对比</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">平均分</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {(student.scores.reduce((sum, score) => sum + score.score, 0) / student.scores.length).toFixed(1)}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">最高分</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {Math.max(...student.scores.map(s => s.score))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.scores.find(s => s.score === Math.max(...student.scores.map(s => s.score)))?.subject}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">最低分</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {Math.min(...student.scores.map(s => s.score))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {student.scores.find(s => s.score === Math.min(...student.scores.map(s => s.score)))?.subject}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">班级排名</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">5</div>
                          <div className="text-xs text-gray-500">超过90%同学</div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">各科目成绩</CardTitle>
                        <CardDescription>该学生在各学科的得分情况</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        <ChartContainer config={{
                          score: { color: "#B9FF66" }
                        }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={student.scores}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="subject" />
                              <YAxis domain={[0, 100]} />
                              <ChartTooltip />
                              <Legend />
                              <Bar dataKey="score" name="分数" fill="#B9FF66" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="ability">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">学习能力雷达图</CardTitle>
                        <CardDescription>多维度评估学生各方面能力</CardDescription>
                      </CardHeader>
                      <CardContent className="h-80">
                        <ChartContainer config={{
                          score: { color: "#8884d8" }
                        }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={abilityRadarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="ability" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar name="能力值" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">优势能力</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            <li className="flex items-center justify-between">
                              <span>记忆能力</span>
                              <span className="font-medium text-green-600">95</span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>数学运算</span>
                              <span className="font-medium text-green-600">90</span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>阅读理解</span>
                              <span className="font-medium text-green-600">85</span>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">提升空间</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            <li className="flex items-center justify-between">
                              <span>创新思维</span>
                              <span className="font-medium text-orange-500">65</span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>逻辑思维</span>
                              <span className="font-medium text-orange-500">75</span>
                            </li>
                            <li className="flex items-center justify-between">
                              <span>沟通表达</span>
                              <span className="font-medium text-orange-500">80</span>
                            </li>
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="trends">
                  <StudentGradeTrend studentId={student.studentId} studentName={student.name} />
                </TabsContent>
                
                <TabsContent value="comparison">
                  <ClassComparison studentId={student.studentId} studentName={student.name} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
