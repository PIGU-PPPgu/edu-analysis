
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
import { StudentData } from "../components/profile/types";
import { Check } from "lucide-react";

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
