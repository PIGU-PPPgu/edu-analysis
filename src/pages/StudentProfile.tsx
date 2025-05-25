import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import StudentGradeTrend from "../components/analysis/StudentGradeTrend";
import ClassComparison from "../components/analysis/ClassComparison";
import ScoreSummary from "../components/profile/ScoreSummary";
import ScoreChart from "../components/profile/ScoreChart";
import AbilityRadar from "../components/profile/AbilityRadar";
import AIProfileTags from "../components/profile/AIProfileTags";
import LearningBehaviorAnalysis from "../components/profile/LearningBehaviorAnalysis";
import LearningStyleAnalysis from "../components/profile/LearningStyleAnalysis";
import LearningProgressTracker from "../components/profile/LearningProgressTracker";
import AILearningProfile from "../components/profile/AILearningProfile";
import StudentLearningTags from "../components/profile/StudentLearningTags";
import ExportLearningReport from "../components/profile/ExportLearningReport";
import { StudentData } from "../components/profile/types";
import { ArrowLeft, Download, FileText, Printer, Share2, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { portraitAPI, StudentPortraitData } from "@/lib/api/portrait";
import { toast } from "sonner";

// 备用模拟数据，当API数据不可用时使用
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
  const [activeTab, setActiveTab] = useState("overview");
  
  // 使用React Query获取学生详情数据
  const { 
    data: studentPortrait, 
    isLoading,
    error
  } = useQuery({
    queryKey: ['studentPortrait', studentId],
    queryFn: () => portraitAPI.getStudentPortrait(studentId!),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    refetchOnWindowFocus: false
  });
  
  // 转换API数据或使用备用数据
  const student = React.useMemo(() => {
    if (studentPortrait) {
      return {
        studentId: studentPortrait.student_id,
        name: studentPortrait.name,
        className: studentPortrait.class_name || '未知班级',
        age: 0, // 实际项目中应从数据中获取
        scores: studentPortrait.scores || mockStudentData.scores
      } as StudentData;
    }
    
    // 如果API数据不可用且不再加载中，使用备用数据
    if (!isLoading && error) {
      return mockStudentData;
    }
    
    return null;
  }, [studentPortrait, isLoading, error]);
  
  // 处理报告导出
  const handleExportReport = () => {
    toast.success("正在生成学生画像报告...", {
      description: "报告将在几秒钟内准备完成"
    });
    
    // 模拟报告生成延迟
    setTimeout(() => {
      toast.success("学生画像报告已生成", {
        description: "报告已可供下载"
      });
    }, 2500);
  };

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin h-10 w-10 border-2 border-primary border-t-transparent rounded-full mb-4"></div>
              <p>加载学生数据中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col gap-3 justify-center items-center h-64">
            <p className="text-lg font-medium">找不到该学生信息</p>
            <Button variant="outline" asChild>
              <Link to="/student-portrait-management">
                返回学生画像管理
              </Link>
            </Button>
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
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/student-management">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    返回学生管理
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/student-portrait-management">
                    查看画像管理
                  </Link>
                </Button>
                <h1 className="text-3xl font-bold">学生画像分析</h1>
              </div>
              <p className="text-gray-500 mt-1">
                全方位评估学生学习情况与表现
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/ai">
                  <Settings className="h-4 w-4 mr-1" />
                  AI设置
                </Link>
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{student.name}</CardTitle>
                  <CardDescription>
                    学号: {student.studentId} | 班级: {student.className} | 年龄: {student.age || '未知'}岁
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6">
                  <TabsTrigger value="overview">成绩概览</TabsTrigger>
                  <TabsTrigger value="learning-style">学习风格</TabsTrigger>
                  <TabsTrigger value="behavior">学习行为</TabsTrigger>
                  <TabsTrigger value="ability">能力评估</TabsTrigger>
                  <TabsTrigger value="progress">学习进度</TabsTrigger>
                  <TabsTrigger value="tags">学习特征</TabsTrigger>
                  <TabsTrigger value="ai-analysis">AI分析</TabsTrigger>
                  <TabsTrigger value="export">报告导出</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <div className="space-y-6">
                    <ScoreSummary student={student} />
                    <ScoreChart student={student} />
                  </div>
                </TabsContent>
                
                <TabsContent value="learning-style">
                  <div className="space-y-6">
                    <LearningStyleAnalysis student={student} />
                  </div>
                </TabsContent>
                
                <TabsContent value="behavior">
                  <div className="space-y-6">
                    <LearningBehaviorAnalysis student={student} />
                  </div>
                </TabsContent>
                
                <TabsContent value="ability">
                  <div className="space-y-6">
                    <AbilityRadar />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">优势能力</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {studentPortrait?.abilities
                              ?.filter(a => a.isStrength)
                              .map((ability, index) => (
                                <li key={index} className="flex items-center justify-between">
                                  <span>{ability.name}</span>
                                  <span className="font-medium text-green-600">{ability.score}</span>
                                </li>
                              )) || (
                                <>
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
                                </>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">提升空间</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {studentPortrait?.abilities
                              ?.filter(a => !a.isStrength)
                              .map((ability, index) => (
                                <li key={index} className="flex items-center justify-between">
                                  <span>{ability.name}</span>
                                  <span className="font-medium text-orange-500">{ability.score}</span>
                                </li>
                              )) || (
                                <>
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
                                </>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="progress">
                  <div className="space-y-6">
                    <LearningProgressTracker student={student} />
                  </div>
                </TabsContent>
                
                <TabsContent value="tags">
                  <div className="space-y-6">
                    <StudentLearningTags student={student} />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">学习习惯分析</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {studentPortrait?.learningHabits?.map((habit, index) => (
                            <div key={index}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm">{habit.name}</span>
                                <span className="text-sm font-medium">{habit.percentage}%</span>
                              </div>
                              <div className="h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-2 bg-blue-500 rounded-full"
                                  style={{ width: `${habit.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )) || (
                            <>
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm">专注度</span>
                                  <span className="text-sm font-medium">85%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div
                                    className="h-2 bg-blue-500 rounded-full"
                                    style={{ width: '85%' }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm">做笔记习惯</span>
                                  <span className="text-sm font-medium">70%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div
                                    className="h-2 bg-blue-500 rounded-full"
                                    style={{ width: '70%' }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm">课前预习</span>
                                  <span className="text-sm font-medium">60%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div
                                    className="h-2 bg-blue-500 rounded-full"
                                    style={{ width: '60%' }}
                                  ></div>
                                </div>
                              </div>
                              
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm">作业完成质量</span>
                                  <span className="text-sm font-medium">90%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full">
                                  <div
                                    className="h-2 bg-blue-500 rounded-full"
                                    style={{ width: '90%' }}
                                  ></div>
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">AI分析标签</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <AIProfileTags student={student} />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="ai-analysis">
                  <div className="space-y-6">
                    <AILearningProfile student={student} />
                  </div>
                </TabsContent>
                
                <TabsContent value="export">
                  <div className="space-y-6">
                    <ExportLearningReport student={student} />
                  </div>
                </TabsContent>
                
                <TabsContent value="comparison">
                  <div className="space-y-6">
                    <ClassComparison />
                  </div>
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
