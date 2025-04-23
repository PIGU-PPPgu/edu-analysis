
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "../components/analysis/Navbar";
import StudentGradeTrend from "../components/analysis/StudentGradeTrend";
import ClassComparison from "../components/analysis/ClassComparison";
import ScoreSummary from "../components/profile/ScoreSummary";
import ScoreChart from "../components/profile/ScoreChart";
import AbilityRadar from "../components/profile/AbilityRadar";
import AIProfileTags from "../components/profile/AIProfileTags";
import { StudentData } from "../components/profile/types";
import { ArrowLeft } from "lucide-react";

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

const StudentProfile: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentData | null>(null);

  useEffect(() => {
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
                  <Link to="/student-management">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    返回学生管理
                  </Link>
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
                  <TabsTrigger value="profile">学生画像</TabsTrigger>
                  <TabsTrigger value="trends">趋势分析</TabsTrigger>
                  <TabsTrigger value="comparison">班级对比</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="space-y-6">
                    <ScoreSummary student={student} />
                    <ScoreChart student={student} />
                  </div>
                </TabsContent>
                
                <TabsContent value="ability">
                  <div className="space-y-6">
                    <AbilityRadar />
                    
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
                
                <TabsContent value="profile">
                  <div className="space-y-6">
                    <AIProfileTags student={student} />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">学习习惯分析</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">专注度</span>
                              <span className="text-sm font-medium">85%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: "85%" }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">作业完成质量</span>
                              <span className="text-sm font-medium">78%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: "78%" }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">课堂参与度</span>
                              <span className="text-sm font-medium">92%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: "92%" }}></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">教师评价摘要</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            学生课堂表现积极，能够主动参与讨论，回答问题。作业完成认真，但有时粗心导致错误。
                            阅读能力强，善于理解文本内容。在数学计算方面表现出色，但在解决复杂问题时需要提升
                            思考能力。建议鼓励其培养更全面的学习方法和习惯。
                          </p>
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
