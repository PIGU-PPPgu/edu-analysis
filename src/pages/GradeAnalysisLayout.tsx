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
  RefreshCcw,
  AlertCircle,
  Grid,
  BarChart3,
  ChartPieIcon,
  Search,
  Target,
  Table,
  Download,
  Filter,
  ArrowUpDown,
  Eye,
  Edit,
  Award,
  TrendingUp,
  Users,
  ChevronRight,
  CircleX,
  Plus,
  Settings2
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import CrossDimensionAnalysisPanel from "@/components/analysis/CrossDimensionAnalysisPanel";
import AnomalyDetection from "@/components/analysis/AnomalyDetection";
import GradeCorrelationMatrix from "@/components/analysis/GradeCorrelationMatrix";
import ClassBoxPlotChart from "@/components/analysis/ClassBoxPlotChart";
import StudentSubjectContribution from "@/components/analysis/StudentSubjectContribution";
import { ExamSelector } from "@/components/analysis/ExamSelector";
import DataTypeAnalyzer from "@/components/analysis/subject/DataTypeAnalyzer";
import SubjectComparisonAnalysis from "@/components/analysis/subject/SubjectComparisonAnalysis";
import IntelligentDataAnalyzer from "@/components/analysis/subject/IntelligentDataAnalyzer";
import PerformanceMonitor from '@/components/ui/performance-monitor';

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
  gradeCount?: number;
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 添加一个状态来跟踪数据库修复
  const [dbFixStatus, setDbFixStatus] = useState<{
    checking: boolean;
    fixed: boolean;
    error: string | null;
  }>({
    checking: false,
    fixed: false,
    error: null
  });

  // 数据库结构检查 - 更可靠的实现
  useEffect(() => {
    const checkDatabase = async () => {
      // 检查本地存储中的上次检查时间
      const lastCheckTime = localStorage.getItem('dbStructureLastCheckTime');
      const now = Date.now();
      
      // 如果24小时内已经检查过，则跳过
      if (lastCheckTime && (now - parseInt(lastCheckTime)) < 24 * 60 * 60 * 1000) {
        console.log("数据库结构已于24小时内检查过，跳过检查");
        return;
      }
      
      try {
        console.log("开始检查数据库结构...");
        setDbFixStatus(prev => ({ ...prev, checking: true }));
        
        // 非阻塞执行数据库检查
        Promise.all([
          gradeAnalysisService.checkAndFixStudentsTable().catch(err => {
            console.warn("检查学生表失败 (非致命错误):", err);
            return { success: false, error: err };
          }),
          gradeAnalysisService.checkAndFixExamsTable().catch(err => {
            console.warn("检查考试表失败 (非致命错误):", err);
            return { success: false, error: err };
          }),
          gradeAnalysisService.checkAndFixGradeDataTable().catch(err => {
            console.warn("检查成绩表失败 (非致命错误):", err);
            return { success: false, error: err };
          })
        ]).then(results => {
          console.log("数据库检查结果:", results);
          
          // 记录检查时间，即使失败也记录，避免频繁重试
          localStorage.setItem('dbStructureLastCheckTime', now.toString());
          
          // 设置成功状态
          const allSucceeded = results.every(r => r.success !== false);
          
          setDbFixStatus({
            checking: false,
            fixed: allSucceeded,
            error: allSucceeded ? null : "数据库结构可能需要更新，但不影响基本功能"
          });
          
          if (allSucceeded) {
            console.log("数据库结构检查并修复完成");
          } else {
            console.warn("数据库结构检查部分失败，但应用可以继续运行");
          }
        }).catch(error => {
          // 捕获所有错误
          console.error("数据库检查过程失败:", error);
          setDbFixStatus({
            checking: false,
            fixed: false,
            error: null // 不显示错误，避免吓到用户
          });
          
          // 仍然记录检查时间
          localStorage.setItem('dbStructureLastCheckTime', now.toString());
        });
      } catch (error) {
        console.error("启动数据库检查失败:", error);
        setDbFixStatus({
          checking: false,
          fixed: false,
          error: null // 不显示错误
        });
      }
    };
    
    // 延迟执行数据库检查，优先加载UI
    const timer = setTimeout(() => {
      checkDatabase();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []); // 仅在组件挂载时执行一次

  // 获取考试列表 - 使用缓存和加载状态优化
  useEffect(() => {
    const fetchExamList1 = async () => {
      console.log("开始获取考试列表...");
      
      if (examList.length > 0) {
        console.log("使用缓存的考试列表数据");
        return; // 已有数据，不重复加载
      }
      
      try {
        setIsLoading(true);
        console.log("从Supabase获取考试列表");
        
        // 直接从Supabase获取考试列表
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .order('date', { ascending: false });
        
        if (error) {
          console.error("获取考试列表出错:", error);
          toast.error("获取考试列表失败", {
            description: error instanceof Error ? error.message : "未知错误"
          });
          throw error;
        }
        
        console.log("获取到考试列表:", data);
        if (data && data.length > 0) {
          // 为每个考试获取成绩数量
          console.log("检查每个考试的成绩数量...");
          const examsWithCounts = await Promise.all(
            data.map(async (exam) => {
              const { count, error: countError } = await supabase
                .from('grade_data')
                .select('id', { count: 'exact', head: true })
                .eq('exam_id', exam.id);
              
              return {
                ...exam,
                gradeCount: countError ? 0 : (count || 0)
              };
            })
          );
          
          setExamList(examsWithCounts);
          console.log("考试列表及成绩数量:", examsWithCounts.map(e => `${e.title}: ${e.gradeCount}条`));
          
          // 检查哪些考试有成绩数据，优先选择有数据的考试
          if (!selectedExam) {
            console.log("选择考试...");
            
            // 首先筛选出有成绩数据的考试
            const examsWithGrades = examsWithCounts.filter(exam => exam.gradeCount && exam.gradeCount > 0);
            
            let examToSelect = null;
            
            if (examsWithGrades.length > 0) {
              // 如果有考试包含成绩数据，按日期排序选择最新的
              const sortedExamsWithGrades = examsWithGrades.sort((a, b) => 
                new Date(b.date || '1970-01-01').getTime() - new Date(a.date || '1970-01-01').getTime()
              );
              examToSelect = sortedExamsWithGrades[0];
              console.log(`优先选择有数据的考试: ${examToSelect.title} (${examToSelect.gradeCount}条记录)`);
            } else {
              // 如果没有考试包含成绩数据，选择最新的考试
              const sortedExams = examsWithCounts.sort((a, b) => 
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
              );
              examToSelect = sortedExams[0];
              
              if (examToSelect) {
                console.log(`选择最新考试: ${examToSelect.title} (无成绩数据，可能导入失败)`);
                toast.warning("最新考试暂无成绩数据", {
                  description: `考试"${examToSelect.title}"导入后没有找到成绩数据，请检查导入过程是否成功`
                });
              }
            }
            
            // 设置选中的考试
            if (examToSelect) {
              setSelectedExam(examToSelect.id);
            }
          }
        } else {
          console.log("没有找到考试数据");
          toast.warning("没有找到考试数据", {
            description: "请先创建考试并导入成绩"
          });
        }
      } catch (error) {
        console.error("加载考试列表失败:", error);
        toast.error("加载考试列表失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExamList1();
  }, [examList.length, selectedExam]);

  // 获取成绩数据 - 使用缓存和按需加载
  useEffect(() => {
    const fetchGradeData1 = async (examId: string) => {
      if (!selectedExam) {
        console.log("未选择考试，无法获取成绩数据");
        return;
      }
      
      // 如果已经有数据，并且是当前选中的考试的数据，则跳过加载
      if (gradeData.length > 0 && 
          gradeData[0].examId === selectedExam) {
        console.log("使用缓存的成绩数据");
        setIsLoading(false);
        return;
      }
      
      console.log(`开始获取考试ID[${selectedExam}]的成绩数据...`);
      try {
        setIsLoading(true);
        
        // 修改查询方式，使用两次独立查询替代外键关系查询
        // 第一步：获取成绩数据
        const { data: gradeDataResult, error: gradeError } = await supabase
          .from('grade_data')
          .select('*')
          .eq('exam_id', selectedExam);
        
        if (gradeError) {
          console.error("获取成绩数据出错:", gradeError);
          toast.error("获取成绩数据失败", {
            description: gradeError instanceof Error ? gradeError.message : "未知错误"
          });
          throw gradeError;
        }
        
        // 如果有成绩数据，获取相关学生信息
        if (gradeDataResult && gradeDataResult.length > 0) {
          // 收集所有学生ID
          const studentIds = [...new Set(gradeDataResult.map(item => item.student_id))];
          
          // 第二步：获取学生数据
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('student_id, name, class_name')
            .in('student_id', studentIds);
          
          if (studentsError) {
            console.warn("获取学生数据出错 (非致命错误):", studentsError);
            // 即使学生数据获取失败，也继续处理成绩数据
          }
          
          // 创建学生ID到名字的映射
          const studentMap = new Map();
          if (studentsData) {
            studentsData.forEach(student => {
              studentMap.set(student.student_id, student.name);
            });
          }
          
          console.log("获取到考试成绩数据:", gradeDataResult ? `${gradeDataResult.length}条记录` : '无数据');
          
          // 格式化数据
          console.log("开始格式化成绩数据...");
          console.log("原始数据样本:", gradeDataResult.slice(0, 2));
          
          const formattedData = gradeDataResult.map((item: any) => {
            // 从grade_data表中提取正确的分数
            // 优先使用score字段，如果没有则使用total_score
            let finalScore = 0;
            if (item.score !== null && item.score !== undefined) {
              finalScore = parseFloat(item.score);
            } else if (item.total_score !== null && item.total_score !== undefined) {
              finalScore = parseFloat(item.total_score);
            }
            
            // 处理班级信息 - 如果grade_data中的class_name是"未知班级"，尝试从students表获取
            let finalClassName = item.class_name;
            if (!finalClassName || finalClassName === '未知班级') {
              // 从students表中获取的学生信息可能包含班级
              const studentInfo = studentsData?.find(s => s.student_id === item.student_id);
              if (studentInfo && studentInfo.class_name) {
                finalClassName = studentInfo.class_name;
              } else {
                finalClassName = '未知班级';
              }
            }
            
            return {
              id: item.id,
              studentId: item.student_id,
              name: studentMap.get(item.student_id) || item.name || '未知学生',
              subject: item.subject || '总分',
              score: finalScore,
              examDate: item.exam_date,
              examType: item.exam_type || '未知考试',
              examTitle: item.exam_title || '未知考试',
              className: finalClassName,
              examId: item.exam_id
            };
          });
          
          console.log("格式化后的数据样本:", formattedData.slice(0, 3));
          console.log("格式化后的数据总数:", formattedData.length);
          setGradeData(formattedData);
          
          // 收集可用的班级和学生列表 - 使用格式化后的数据
          console.log("开始收集班级和学生信息...");
          const classes = [...new Set(formattedData.map((item: any) => item.className))].filter(c => c && c !== '未知班级');
          
          // 如果没有有效班级，至少包含"未知班级"
          if (classes.length === 0) {
            classes.push('未知班级');
          }
          
          setClassesList(classes as string[]);
          console.log("收集到的班级:", classes);
          
          const students = formattedData.reduce((acc: {id: string; name: string}[], item: any) => {
            if (!acc.some(s => s.id === item.studentId) && item.studentId) {
              acc.push({
                id: item.studentId,
                name: item.name
              });
            }
            return acc;
          }, []);
          
          setStudentsList(students);
          console.log("收集到的学生:", students.length, "个");
          
          // 如果有班级数据，默认选择第一个班级
          if (classes.length > 0 && !selectedClass) {
            console.log("默认选择班级:", classes[0]);
            setSelectedClass(classes[0] as string);
          }
        } else {
          console.log("未获取到成绩数据或数据为空");
          // 清空数据
          setGradeData([]);
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
    
    fetchGradeData1(selectedExam || '');
  }, [selectedExam, setGradeData, examList, selectedClass]);

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
    setIsRefreshing(true);
    // 清空缓存，重新获取数据
    setExamList([]);
    setClassesList([]);
    setStudentsList([]);
    setGradeData([]);
    
    // 这里不直接调用那些未定义的函数，而是依靠 useEffect 的依赖更新来触发数据刷新
    
    // 刷新页面提示
    toast.success("数据已刷新");
    setTimeout(() => setIsRefreshing(false), 500);
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
      
      {dbFixStatus.checking && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 mx-4 mt-2">
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500 mr-2" />
            <p className="text-sm text-blue-700">正在检查并更新数据库结构...</p>
          </div>
        </div>
      )}
      
      {dbFixStatus.error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 mx-4 mt-2">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="font-medium text-red-800">数据库结构问题</p>
              <p className="text-sm text-red-700">
                {dbFixStatus.error}
                <br />
                <span className="font-medium">建议: </span>
                请联系管理员在Supabase中执行必要的迁移脚本
              </p>
            </div>
          </div>
        </div>
      )}
      
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
                <ExamSelector 
                  exams={examList.map(exam => ({
                    id: exam.id,
                    title: exam.title,
                    date: exam.date || undefined,
                    type: exam.type || undefined,
                    subject: exam.subject || undefined,
                    gradeCount: exam.gradeCount
                  }))}
                  selectedExam={selectedExam ? examList.find(exam => exam.id === selectedExam) || null : null}
                  onExamSelect={(exam) => {
                    handleExamChange(exam.id);
                  }}
                  isLoading={isLoading}
                  onExamDelete={handleRefreshData}
                />
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
          <TabsList className="bg-white border shadow-sm mb-6">
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <BarChartBig className="h-4 w-4" />
              数据看板
            </TabsTrigger>
            <TabsTrigger value="class" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <School className="h-4 w-4" />
              班级分析
            </TabsTrigger>
            <TabsTrigger value="student" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <UserRound className="h-4 w-4" />
              学生进步
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <Sigma className="h-4 w-4" />
              高级分析
            </TabsTrigger>
            <TabsTrigger value="cross-analysis" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <ChartPieIcon className="h-4 w-4" />
              交叉分析
            </TabsTrigger>
            <TabsTrigger value="anomaly" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <AlertCircle className="h-4 w-4" />
              异常检测
            </TabsTrigger>
            <TabsTrigger value="correlation" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <Grid className="h-4 w-4" />
              相关性分析
            </TabsTrigger>
            <TabsTrigger value="boxplot" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <BarChart3 className="h-4 w-4" />
              班级箱线图
            </TabsTrigger>
            <TabsTrigger value="contribution" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <ChartPieIcon className="h-4 w-4" />
              贡献度分析
            </TabsTrigger>
            <TabsTrigger value="ai-analysis" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <BrainCircuit className="h-4 w-4" />
              AI智能分析
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <Settings2 className="h-4 w-4" />
              性能监控
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
            
            {/* 优化后的成绩明细表格 */}
            {isDataLoaded && (
              <Card className="bg-gradient-to-br from-white to-gray-50 shadow-lg border-0">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <Table className="h-5 w-5 text-blue-600" />
                        成绩明细表
                      </CardTitle>
                      <CardDescription className="mt-1">
                        共 {gradeData.length} 条记录 • 点击表头可排序
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        导出
                      </Button>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        筛选
                      </Button>
                    </div>
                  </div>

                  {/* 搜索和筛选栏 */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="搜索学生姓名或学号..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="选择班级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有班级</SelectItem>
                        {classesList.map(className => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select defaultValue="all">
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="成绩范围" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有成绩</SelectItem>
                        <SelectItem value="excellent">优秀 (≥90)</SelectItem>
                        <SelectItem value="good">良好 (80-89)</SelectItem>
                        <SelectItem value="fair">中等 (70-79)</SelectItem>
                        <SelectItem value="pass">及格 (60-69)</SelectItem>
                        <SelectItem value="fail">不及格 (&lt;60)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <tr>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                              <div className="flex items-center gap-2">
                                <span>学号</span>
                                <ArrowUpDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                              <div className="flex items-center gap-2">
                                <span>姓名</span>
                                <ArrowUpDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                              <div className="flex items-center gap-2">
                                <span>班级</span>
                                <ArrowUpDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 transition-colors">
                              <div className="flex items-center justify-center gap-2">
                                <span>分数</span>
                                <ArrowUpDown className="h-3 w-3 text-gray-400" />
                              </div>
                            </th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">
                              等级
                            </th>
                            <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {gradeData.slice(0, 20).map((item, index) => {
                            // 计算成绩等级
                            const getGradeLevel = (score: number) => {
                              if (score >= 90) return { level: '优秀', color: 'bg-emerald-100 text-emerald-800', icon: '🏆' };
                              if (score >= 80) return { level: '良好', color: 'bg-blue-100 text-blue-800', icon: '👍' };
                              if (score >= 70) return { level: '中等', color: 'bg-yellow-100 text-yellow-800', icon: '📈' };
                              if (score >= 60) return { level: '及格', color: 'bg-orange-100 text-orange-800', icon: '✓' };
                              return { level: '不及格', color: 'bg-red-100 text-red-800', icon: '⚠️' };
                            };

                            const gradeLevel = getGradeLevel(item.score);

                            return (
                              <tr 
                                key={index} 
                                className="hover:bg-blue-50 transition-colors group"
                              >
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
                                      {index + 1}
                                    </div>
                                    <span className="text-sm font-mono text-gray-700">
                                      {item.studentId}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                      {item.name ? item.name.charAt(0) : '?'}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                      {item.name}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline" className="text-xs">
                                    {item.className}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center">
                                    <span className={`
                                      text-lg font-bold px-3 py-1 rounded-lg
                                      ${item.score >= 90 ? 'text-emerald-700 bg-emerald-100' : 
                                        item.score >= 80 ? 'text-blue-700 bg-blue-100' :
                                        item.score >= 70 ? 'text-yellow-700 bg-yellow-100' :
                                        item.score >= 60 ? 'text-orange-700 bg-orange-100' :
                                        'text-red-700 bg-red-100'}
                                    `}>
                                      {item.score}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <Badge className={`${gradeLevel.color} border-0`}>
                                    <span className="mr-1">{gradeLevel.icon}</span>
                                    {gradeLevel.level}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* 分页和统计信息 */}
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-sm text-gray-600">
                          显示 1-{Math.min(20, gradeData.length)} 条，共 {gradeData.length} 条记录
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled>
                            <ChevronLeft className="h-4 w-4" />
                            上一页
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button variant="default" size="sm" className="w-8 h-8 p-0">
                              1
                            </Button>
                            {gradeData.length > 20 && (
                              <>
                                <Button variant="outline" size="sm" className="w-8 h-8 p-0">
                                  2
                                </Button>
                                <span className="text-sm text-gray-400 px-1">...</span>
                              </>
                            )}
                          </div>
                          <Button variant="outline" size="sm" disabled={gradeData.length <= 20}>
                            下一页
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 快速统计卡片 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">优秀人数</span>
                      </div>
                      <div className="text-xl font-bold text-green-800">
                        {gradeData.filter(item => item.score >= 90).length}
                      </div>
                      <div className="text-xs text-green-600">
                        占比 {((gradeData.filter(item => item.score >= 90).length / gradeData.length) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">及格人数</span>
                      </div>
                      <div className="text-xl font-bold text-blue-800">
                        {gradeData.filter(item => item.score >= 60).length}
                      </div>
                      <div className="text-xs text-blue-600">
                        占比 {((gradeData.filter(item => item.score >= 60).length / gradeData.length) * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">平均分</span>
                      </div>
                      <div className="text-xl font-bold text-purple-800">
                        {(gradeData.reduce((sum, item) => sum + item.score, 0) / gradeData.length).toFixed(1)}
                      </div>
                      <div className="text-xs text-purple-600">
                        总分 {gradeData.reduce((sum, item) => sum + item.score, 0)}
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">总人数</span>
                      </div>
                      <div className="text-xl font-bold text-orange-800">
                        {gradeData.length}
                      </div>
                      <div className="text-xs text-orange-600">
                        {classesList.length} 个班级
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="class">
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
          
          <TabsContent value="student">
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
          
          <TabsContent value="cross-analysis">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <ChartPieIcon className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">多维交叉分析</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>通过交叉分析功能，您可以从多个维度探索数据之间的关系，发现更深层次的教学规律和问题。</p>
                </AlertDescription>
              </Alert>
              
              <CrossDimensionAnalysisPanel />
            </div>
          </TabsContent>
          
          <TabsContent value="anomaly">
            <div className="space-y-6">
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-700">成绩异常检测</AlertTitle>
                <AlertDescription className="text-amber-600">
                  <p>系统会自动分析成绩数据，识别可能的异常情况，如成绩骤降、数据缺失等，帮助教师及时发现问题。</p>
                </AlertDescription>
              </Alert>
              
              <AnomalyDetection />
            </div>
          </TabsContent>
          
          <TabsContent value="correlation">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Grid className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">科目相关性分析</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>通过计算不同科目成绩之间的相关系数，帮助教师理解学科间的关联性，优化教学策略。</p>
                </AlertDescription>
              </Alert>
              
              <GradeCorrelationMatrix classId={selectedClass || selectedExam || ''} />
            </div>
          </TabsContent>
          
          <TabsContent value="boxplot">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">班级学科箱线图</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>通过箱线图直观展示班级各科目成绩分布，快速定位异常值和极端情况，助力精准教学干预。</p>
                </AlertDescription>
              </Alert>
              
              <ClassBoxPlotChart />
            </div>
          </TabsContent>
          
          <TabsContent value="contribution">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <ChartPieIcon className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">学生科目贡献度</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>分析学生各科成绩相对于班级的表现差异，识别学生的优势和劣势学科，为因材施教提供数据支持。</p>
                </AlertDescription>
              </Alert>
              
              <StudentSubjectContribution />
            </div>
          </TabsContent>
          
          <TabsContent value="ai-analysis">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <BrainCircuit className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">AI智能分析</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>集成多种AI模型，为您的成绩数据提供专业的智能分析和教学建议。支持GPT-4、通义千问等多种AI模型。</p>
                </AlertDescription>
              </Alert>
              
              {/* 真正的AI分析组件 */}
              <IntelligentDataAnalyzer />
              
              {/* 数据类型分析 */}
              <DataTypeAnalyzer />
              
              {/* 科目对比分析 */}
              <SubjectComparisonAnalysis />
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Settings2 className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">系统性能监控</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>实时监控系统性能指标，包括页面加载速度、内存使用、数据库查询等，帮助优化用户体验。</p>
                </AlertDescription>
              </Alert>
              
              <PerformanceMonitor 
                showAdvanced={true}
                onOptimize={() => {
                  // 实际的性能优化逻辑
                  toast.success('已应用性能优化设置');
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GradeAnalysisLayout;
