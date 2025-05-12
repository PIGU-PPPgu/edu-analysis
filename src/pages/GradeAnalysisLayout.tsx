import React, { useEffect, useState } from "react";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import GradeOverview from "@/components/analysis/GradeOverview";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import Navbar from "@/components/shared/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { AIAnalysisController } from "@/components/analysis/AIAnalysisController";
import { 
  BarChartBig, 
  BookOpen, 
  ChevronLeft, 
  LineChart, 
  PieChart,  
  UserRound, 
  School,
  BrainCircuit,
  Sigma,
  RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ClassAnalysisView } from "@/components/analysis/ClassAnalysisView";
import { AdvancedDashboard } from "@/components/analysis/AdvancedDashboard";
import { StudentProgressView } from "@/components/analysis/StudentProgressView";
import { AIAnalysisAssistant } from "@/components/analysis/AIAnalysisAssistant";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";

// Updated to match what Supabase actually returns
interface StudentGrade {
  id: string;
  student_id: string;
  score: number;
  subject: string;
  exam_date: string | null;
  exam_type: string | null;
  exam_title: string | null;
  students?: {
    name?: string;
    student_id?: string;
  };
}

// 考试信息接口
interface ExamInfo {
  id: string;
  title: string;
  type: string;
  date: string | null;
  subject?: string;
}

const GradeAnalysisLayout: React.FC = () => {
  const { gradeData, isDataLoaded, calculateStatistics, setGradeData } = useGradeAnalysis();
  const [boxPlotData, setBoxPlotData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // 新增考试列表和当前选择的考试
  const [examList, setExamList] = useState<ExamInfo[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{id: string; name: string} | null>(null);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [studentsList, setStudentsList] = useState<{id: string; name: string}[]>([]);

  // 获取考试列表
  useEffect(() => {
    const fetchExamList = async () => {
      console.log("开始获取考试列表...");
      try {
        console.log("调用 gradeAnalysisService.getExamList()");
        const { data, error } = await gradeAnalysisService.getExamList();
        
        if (error) {
          console.error("获取考试列表出错:", error);
          toast.error("获取考试列表失败", {
            description: error instanceof Error ? error.message : "未知错误"
          });
          throw error;
        }
        
        console.log("获取到考试列表:", data);
        if (data && data.length > 0) {
          setExamList(data);
          
          // 默认选择第一个考试
          if (data.length > 0 && !selectedExam) {
            console.log("选择默认考试:", data[0].id);
            setSelectedExam(data[0].id);
          }
        } else {
          console.log("未获取到考试列表数据或数据为空");
          setIsLoading(false); // 即使没有数据也应停止加载状态
        }
      } catch (error) {
        console.error("加载考试列表失败:", error);
        setIsLoading(false); // 出错时停止加载状态
      }
    };
    
    fetchExamList();
  }, []);

  // 获取成绩数据
  useEffect(() => {
    const fetchGradeData = async () => {
      if (!selectedExam) {
        console.log("未选择考试，无法获取成绩数据");
        return;
      }
      
      console.log(`开始获取考试ID[${selectedExam}]的成绩数据...`);
      try {
        setIsLoading(true);
        
        console.log("调用 gradeAnalysisService.getExamResults()");
        const { data, error } = await gradeAnalysisService.getExamResults(selectedExam);
        
        if (error) {
          console.error("获取成绩数据出错:", error);
          toast.error("获取成绩数据失败", {
            description: error instanceof Error ? error.message : "未知错误"
          });
          throw error;
        }
        
        console.log("获取到考试成绩数据:", data);
        if (data && data.length > 0) {
          // 格式化数据
          console.log("开始格式化成绩数据...");
          const formattedData = data.map((item: any) => ({
            id: item.id,
            studentId: item.student_id,
            name: item.name || '未知学生',
            subject: item.subject || '总分',
            score: item.total_score,
            examDate: item.exam_date,
            examType: item.exam_type || '未知考试',
            examTitle: item.exam_title || '未知考试',
            className: item.class_name || '未知班级'
          }));
          
          console.log("格式化后的数据:", formattedData);
          setGradeData(formattedData);
          
          // 收集可用的班级和学生列表
          console.log("开始收集班级和学生信息...");
          const classes = [...new Set(data.map((item: any) => item.class_name))].filter(Boolean);
          setClassesList(classes as string[]);
          console.log("收集到的班级:", classes);
          
          const students = data.reduce((acc: {id: string; name: string}[], item: any) => {
            if (!acc.some(s => s.id === item.student_id) && item.student_id && item.name) {
              acc.push({
                id: item.student_id,
                name: item.name
              });
            }
            return acc;
          }, []);
          
          setStudentsList(students);
          console.log("收集到的学生:", students);
          
          // 如果有班级数据，默认选择第一个班级
          if (classes.length > 0 && !selectedClass) {
            console.log("默认选择班级:", classes[0]);
            setSelectedClass(classes[0] as string);
          }
        } else {
          console.log("未获取到成绩数据或数据为空");
        }
      } catch (error) {
        console.error("加载成绩数据失败:", error);
        toast.error("加载成绩数据失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      } finally {
        console.log("成绩数据加载完成，设置isLoading=false");
        setIsLoading(false);
      }
    };
    
    fetchGradeData();
  }, [selectedExam, setGradeData]);

  // 计算箱线图数据
  useEffect(() => {
    if (gradeData.length > 0) {
      // 按学科分组
      const subjectGroups: Record<string, number[]> = {};
      
      gradeData.forEach(item => {
        if (!subjectGroups[item.subject]) {
          subjectGroups[item.subject] = [];
        }
        subjectGroups[item.subject].push(item.score);
      });
      
      // 计算每个学科的箱线图数据
      const boxPlotDataArray = Object.entries(subjectGroups).map(([subject, scores]) => {
        // 排序分数
        scores.sort((a, b) => a - b);
        
        // 计算统计值
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const q1 = scores[Math.floor(scores.length * 0.25)];
        const median = scores[Math.floor(scores.length * 0.5)];
        const q3 = scores[Math.floor(scores.length * 0.75)];
        
        return {
          subject,
          min,
          q1,
          median,
          q3,
          max
        };
      });
      
      setBoxPlotData(boxPlotDataArray);
    }
  }, [gradeData]);

  // 考试切换处理
  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    // 设置isDataLoaded为false触发数据重新加载
    setGradeData([]);
  };

  // Handler for AI Analysis start
  const handleStartAnalysis = async (config: {
    provider: string;
    model: string;
    temperature: number;
    language: string;
  }) => {
    setIsAnalyzing(true);
    try {
      // 实际分析逻辑
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 可以在这里调用后端API进行AI分析
      if (gradeData.length > 0 && selectedExam) {
        const { data, error } = await supabase.functions.invoke('analyze-grades', {
          body: {
            examId: selectedExam,
            config: config
          }
        });
        
        if (error) throw error;
        
        console.log("分析结果:", data);
      }
      
      toast.success("分析完成", {
        description: "AI已完成成绩数据分析"
      });
    } catch (error) {
      toast.error("分析失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
      console.error("AI分析失败:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefreshData = () => {
    if (selectedExam) {
      toast.info('正在刷新数据...');
      setGradeData([]);
    }
  };

  const handleAnalyzeData = async () => {
    if (!selectedExam) return;
    
    toast.info('正在分析成绩数据...', { id: 'analyze-data' });
    await calculateStatistics(gradeData);
    toast.success('成绩分析完成', { id: 'analyze-data' });
  };

  const handleAIAnalysisToggle = () => {
    setShowAIAnalysis(!showAIAnalysis);
    if (!showAIAnalysis && !isDataLoaded) {
      handleAnalyzeData();
    }
  };

  // 班级选择处理
  const handleClassChange = (className: string) => {
    setSelectedClass(className);
  };

  // 学生选择处理
  const handleStudentChange = (studentId: string) => {
    const student = studentsList.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
    }
  };

  if (isLoading && examList.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>正在加载考试数据...</span>
        </div>
      </div>
    );
  }

  // 修改这里，不再提前返回简化界面，而是记录没有数据的状态
  const hasNoExams = examList.length === 0 && !isLoading;
  
  // 获取当前选中考试的详细信息
  const currentExam = examList.find(exam => exam.id === selectedExam) || null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden md:flex" 
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">成绩分析</h1>
          
          {isDataLoaded && (
            <span className="bg-green-100 text-green-800 text-xs font-medium ml-2 px-2.5 py-0.5 rounded-full flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              {gradeData.length}条记录
            </span>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            {examList.length > 0 ? (
              <>
                <BookOpen className="h-4 w-4" />
                <Select 
                  value={selectedExam || undefined} 
                  onValueChange={handleExamChange}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="选择考试" />
                  </SelectTrigger>
                  <SelectContent>
                    {examList.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title} ({exam.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshData}
                  title="刷新数据"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </>
            ) : (
              // 即使没有考试，也显示占位按钮，保持布局一致
              <Button 
                variant="outline"
                onClick={() => navigate("/")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                导入数据
              </Button>
            )}
          </div>
        </div>
        
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-4"
        >
          <TabsList className="bg-white border">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChartBig className="h-4 w-4" />
              数据看板
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-1.5">
              <School className="h-4 w-4" />
              班级分析
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-1.5">
              <UserRound className="h-4 w-4" />
              学生进步
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5">
              <Sigma className="h-4 w-4" />
              高级分析
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <BrainCircuit className="h-4 w-4" />
              AI助手
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            {currentExam && (
              <Card className="bg-white p-4 rounded-lg shadow mb-4">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      当前分析考试
                    </CardTitle>
                    <Badge>
                      {currentExam.type}
                    </Badge>
                  </div>
                  <CardDescription>
                    {currentExam.title} 
                    {currentExam.date && (
                      <span className="ml-2 text-gray-400">
                        ({new Date(currentExam.date).toLocaleDateString()})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            
            {/* 显示没有数据的提示卡片 - 简化版 */}
            {hasNoExams && (
              <Card className="bg-white p-4 rounded-lg shadow mb-4">
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                  <p className="mb-4 text-sm text-amber-600">
                    请先从首页导入考试数据
                  </p>
                  <Button
                    onClick={() => navigate("/")}
                    variant="outline"
                  >
                    前往导入数据
                  </Button>
                </CardContent>
              </Card>
            )}
          
            <GradeOverview />
            
            {isDataLoaded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScoreDistribution />
                
                {boxPlotData.length > 0 && (
                  <ScoreBoxPlot data={boxPlotData} />
                )}
              </div>
            )}
            
            {!isDataLoaded && !isLoading && !hasNoExams && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">暂无成绩数据</p>
                <p className="text-gray-500 mt-2">请先导入学生成绩数据</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate("/")}
                >
                  前往导入数据
                </Button>
              </div>
            )}
            
            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-purple-500 border-r-transparent"></div>
                <p className="mt-4 text-gray-600">正在加载成绩数据...</p>
              </div>
            )}
            
            {/* 添加详细成绩表格 */}
            {isDataLoaded && (
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg font-semibold">成绩明细</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto h-80">
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-white border-b">
                        <tr>
                          <th className="py-2 px-3 text-left text-sm font-medium text-gray-500">学号</th>
                          <th className="py-2 px-3 text-left text-sm font-medium text-gray-500">姓名</th>
                          <th className="py-2 px-3 text-left text-sm font-medium text-gray-500">班级</th>
                          <th className="py-2 px-3 text-right text-sm font-medium text-gray-500">分数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeData.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-3 text-sm">{item.studentId}</td>
                            <td className="py-2 px-3 text-sm font-medium">{item.name}</td>
                            <td className="py-2 px-3 text-sm text-gray-600">{item.className}</td>
                            <td className="py-2 px-3 text-sm text-right font-medium">
                              <span className={`
                                ${item.score >= 90 ? 'text-green-600' : 
                                  item.score >= 80 ? 'text-blue-600' :
                                  item.score >= 60 ? 'text-amber-600' :
                                  'text-red-500'}
                              `}>
                                {item.score}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="classes">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">班级成绩分析</h2>
              
              {classesList.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedClass || undefined} 
                    onValueChange={handleClassChange}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="                                                    班级" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesList.map(className => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {hasNoExams ? (
              <Card className="bg-white p-4 rounded-lg shadow">
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                  <p className="mb-4 text-sm text-gray-500">
                    请先导入学生成绩数据
                  </p>
                  <Button 
                    onClick={() => navigate("/")}
                  >
                    前往导入数据
                  </Button>
                </CardContent>
              </Card>
            ) : isDataLoaded ? (
              <ClassAnalysisView 
                classId={selectedClass || undefined} 
                examId={selectedExam || undefined}
                className={selectedClass || "全部班级"}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">暂无班级数据</p>
                <p className="text-gray-500 mt-2">请先导入学生和成绩数据</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate("/")}
                >
                  前往导入数据
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="students">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">学生成绩进步分析</h2>
              
              {studentsList.length > 0 && (
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedStudent?.id} 
                    onValueChange={handleStudentChange}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="选择学生" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentsList.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {hasNoExams ? (
              <Card className="bg-white p-4 rounded-lg shadow">
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                  <p className="mb-4 text-sm text-gray-500">
                    请先导入学生成绩数据
                  </p>
                  <Button 
                    onClick={() => navigate("/")}
                  >
                    前往导入数据
                  </Button>
                </CardContent>
              </Card>
            ) : isDataLoaded && selectedStudent ? (
              <StudentProgressView 
                studentId={selectedStudent.id}
                studentName={selectedStudent.name} 
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">请选择学生</p>
                <p className="text-gray-500 mt-2">查看学生历次成绩进步情况</p>
                {!isDataLoaded && (
                  <Button 
                    className="mt-4" 
                    onClick={() => navigate("/")}
                  >
                    前往导入数据
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="advanced">
            {hasNoExams ? (
              <Card className="bg-white p-4 rounded-lg shadow">
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                  <p className="mb-4 text-sm text-gray-500">
                    请先导入学生成绩数据
                  </p>
                  <Button 
                    onClick={() => navigate("/")}
                  >
                    前往导入数据
                  </Button>
                </CardContent>
              </Card>
            ) : isDataLoaded && selectedExam ? (
              <AdvancedDashboard 
                examId={selectedExam}
                examTitle={currentExam?.title}
                examDate={currentExam?.date || undefined}
                examType={currentExam?.type}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">高级分析需要数据</p>
                <p className="text-gray-500 mt-2">请先选择考试并确保有成绩数据</p>
                {!selectedExam && examList.length > 0 ? (
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      if (examList.length > 0) {
                        handleExamChange(examList[0].id);
                      }
                    }}
                  >
                    选择考试
                  </Button>
                ) : (
                  <Button 
                    className="mt-4" 
                    onClick={() => navigate("/")}
                  >
                    前往导入数据
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="ai">
            {hasNoExams ? (
              <Card className="bg-white p-4 rounded-lg shadow">
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                  <p className="mb-4 text-sm text-gray-500">
                    请先导入学生成绩数据
                  </p>
                  <Button 
                    onClick={() => navigate("/")}
                  >
                    前往导入数据
                  </Button>
                </CardContent>
              </Card>
            ) : isDataLoaded && selectedExam ? (
              <AIAnalysisAssistant 
                examId={selectedExam}
                examTitle={currentExam?.title}
                examType={currentExam?.type}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">智能分析需要数据</p>
                <p className="text-gray-500 mt-2">请先选择考试并确保有成绩数据</p>
                {!selectedExam && examList.length > 0 ? (
                  <Button 
                    className="mt-4" 
                    onClick={() => {
                      if (examList.length > 0) {
                        handleExamChange(examList[0].id);
                      }
                    }}
                  >
                    选择考试
                  </Button>
                ) : (
                  <Button 
                    className="mt-4" 
                    onClick={() => navigate("/")}
                  >
                    前往导入数据
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GradeAnalysisLayout;
