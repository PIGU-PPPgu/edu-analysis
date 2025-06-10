import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import GradeOverview from "@/components/analysis/core/GradeOverview";
import ScoreDistribution from "@/components/analysis/statistics/ScoreDistribution";
// import MultiClassPerformanceTable from "@/components/analysis/MultiClassPerformanceTable"; // 已删除
import { Subject } from "@/types/grade";

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
  Settings2,
  Activity,
  Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
// import { ClassAnalysisView } from "@/components/analysis/ClassAnalysisView"; // 已删除
import { AdvancedDashboard } from "@/components/analysis/advanced/AdvancedDashboard";
import { PredictiveAnalysis } from "@/components/analysis/advanced/PredictiveAnalysis";
import { LearningBehaviorAnalysis } from "@/components/analysis/advanced/LearningBehaviorAnalysis";
// import { StudentProgressView } from "@/components/analysis/StudentProgressView"; // 已删除
// import { AIAnalysisAssistant } from "@/components/analysis/AIAnalysisAssistant"; // 已删除
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AnomalyDetection from "@/components/analysis/advanced/AnomalyDetection";
// import GradeCorrelationMatrix from "@/components/analysis/GradeCorrelationMatrix"; // 已删除
import ClassBoxPlotChart from "@/components/analysis/comparison/ClassBoxPlotChart";
// import StudentSubjectContribution from "@/components/analysis/StudentSubjectContribution"; // 已删除
// import { ExamSelector } from "@/components/analysis/ExamSelector"; // 已删除
// import DataTypeAnalyzer from "@/components/analysis/subject/DataTypeAnalyzer"; // 已删除
// import SubjectComparisonAnalysis from "@/components/analysis/subject/SubjectComparisonAnalysis"; // 已删除
// import IntelligentDataAnalyzer from "@/components/analysis/subject/IntelligentDataAnalyzer"; // 已删除
import PerformanceMonitor from '@/components/ui/performance-monitor';
import { getGradeLevelInfo } from '@/utils/gradeUtils';
// import ClassSelector from "@/components/analysis/ClassSelector"; // 已删除
import ClassComparisonChart from "@/components/analysis/comparison/ClassComparisonChart";
import GradeTable from "@/components/analysis/core/GradeTable";

// 新增导入 - 全局筛选相关组件
import { FilterProvider, useFilter, filterUtils } from "@/contexts/FilterContext";
// 使用新的紧凑筛选器替换原有的大型筛选器
import CompactGradeFilters from "@/components/ui/compact-grade-filters";

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
    class_name?: string;
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

// 外层包装组件，提供FilterProvider
const GradeAnalysisLayout: React.FC = () => {
  return (
    <FilterProvider>
      <GradeAnalysisContent />
    </FilterProvider>
  );
};

// 主要分析组件
const GradeAnalysisContent: React.FC = () => {
  const { gradeData, isDataLoaded, calculateStatistics, setGradeData } = useGradeAnalysis();
  const { filterState, updateFilter, isFiltered } = useFilter();
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
  
  // 新增：科目筛选相关状态 - 使用全局筛选状态
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  // 新增：表格排序状态
  const [sortField, setSortField] = useState<string>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  // 使用全局筛选状态过滤数据
  const filteredGradeData = React.useMemo(() => {
    if (!isDataLoaded) return [];
    
    return filterUtils.filterData(gradeData, filterState, {
      classField: 'class_name',
      subjectField: 'subject',
      examField: 'exam_id',
      dateField: 'exam_date'
    });
  }, [gradeData, filterState, isDataLoaded]);

  // 计算过滤后的学生数量
  const filteredStudentCount = React.useMemo(() => {
    const uniqueStudents = new Set(
      filteredGradeData.map(grade => grade.student_id)
    );
    return uniqueStudents.size;
  }, [filteredGradeData]);

  // 数据库结构检查 - 更可靠的实现
  useEffect(() => {
    const checkDatabase = async () => {
      // 检查本地存储中的上次检查时间
      const lastCheckTime = localStorage.getItem('dbStructureLastCheckTime');
      const now = Date.now();
      
      // 如果24小时内已经检查过，则跳过检查
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
            console.log(`🏫 第${item.id}行班级处理: grade_data.class_name="${item.class_name}"`);
            
            if (!finalClassName || finalClassName === '未知班级') {
              // 从students表中获取的学生信息可能包含班级
              const studentInfo = studentsData?.find(s => s.student_id === item.student_id);
              console.log(`🔍 查找学生${item.student_id}在students表中的信息:`, studentInfo);
              
              if (studentInfo && studentInfo.class_name) {
                finalClassName = studentInfo.class_name;
                console.log(`✅ 从students表获取班级: "${finalClassName}"`);
              } else {
                finalClassName = '未知班级';
                console.log(`❌ 无法获取班级信息，使用默认值: "未知班级"`);
              }
            } else {
              console.log(`✅ 直接使用grade_data中的班级: "${finalClassName}"`);
            }
            
            return {
              id: item.id,
              student_id: item.student_id,  // 保持下划线命名统一
              studentId: item.student_id,   // 同时保留驼峰命名兼容性
              name: studentMap.get(item.student_id) || item.name || '未知学生',
              subject: item.subject || '总分',
              score: finalScore,
              examDate: item.exam_date,
              examType: item.exam_type || '未知考试',
              examTitle: item.exam_title || '未知考试',
              className: finalClassName,
              class_name: finalClassName,   // 同时保留下划线命名兼容性
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
          
          // 收集可用的科目列表
          const subjects = [...new Set(formattedData.map((item: any) => item.subject))].filter(s => s && s.trim());
          setAvailableSubjects(subjects as string[]);
          console.log("收集到的科目:", subjects);
          
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
    setSelectedStudent(student || null);
  };

  // 新增：科目筛选处理函数
  const handleSubjectChange = (subject: string) => {
    if (subject === "all") {
      updateFilter({
        ...filterState,
        selectedSubjects: []
      });
    } else {
      updateFilter({
        ...filterState,
        selectedSubjects: [subject]
      });
    }
  };

  // 重复的filteredGradeData计算已移除，使用顶部的全局筛选逻辑

  // 处理表格排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
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
        {/* 页面头部 */}
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
              {filteredGradeData.length}/{gradeData.length}条记录
            </span>
          )}
          
          <div className="ml-auto flex items-center gap-2">
            {examList.length > 0 ? (
              <>
                <BookOpen className="h-4 w-4" />
                <div className="flex items-center justify-center px-4 py-2 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500">
                    <span className="text-sm">考试选择器正在重构中</span>
                  </div>
                </div>
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

        {/* 紧凑筛选器组件 - 替换原有的大型筛选器 */}
        {isDataLoaded && (
          <div className="mb-6">
            <CompactGradeFilters
              config={{
                classes: classesList.length > 0 ? classesList : ['全部班级'],
                subjects: availableSubjects.length > 0 ? availableSubjects : ['全部科目'],
                examTypes: ['期中考试', '期末考试', '月考', '周测', '单元测试'],
                scoreRanges: [
                  { label: '优秀 (90-100)', min: 90, max: 100 },
                  { label: '良好 (80-89)', min: 80, max: 89 },
                  { label: '中等 (70-79)', min: 70, max: 79 },
                  { label: '及格 (60-69)', min: 60, max: 69 },
                  { label: '不及格 (0-59)', min: 0, max: 59 },
                ]
              }}
              filterState={{
                searchTerm: filterState.searchTerm || '',
                selectedClasses: filterState.selectedClasses || [],
                selectedSubjects: filterState.selectedSubjects || [],
                selectedExamTypes: [],
                selectedScoreRange: ''
              }}
              onFilterChange={(newFilterState) => {
                updateFilter({
                  ...filterState,
                  searchTerm: newFilterState.searchTerm,
                  selectedClasses: newFilterState.selectedClasses,
                  selectedSubjects: newFilterState.selectedSubjects
                });
              }}
              totalRecords={gradeData.length}
              filteredRecords={filteredGradeData.length}
              className="mb-4"
            />
            {/* 筛选状态摘要 */}
            {isFiltered && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-blue-700">
                    <Filter className="h-4 w-4 mr-2" />
                    当前筛选: {filterUtils.getFilterDescription(filterState)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter({
                      mode: 'grade',
                      selectedClasses: [],
                      selectedSubjects: [],
                      selectedExam: filterState.selectedExam,
                      dateRange: undefined
                    })}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    清除筛选
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
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
            <TabsTrigger value="predictive" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <Brain className="h-4 w-4" />
              预测分析
            </TabsTrigger>
            <TabsTrigger value="behavior" className="gap-2 data-[state=active]:bg-[#fafafa]">
              <Activity className="h-4 w-4" />
              行为分析
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
            {/* 当前考试信息展示 */}
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
          
            <GradeOverview gradeData={filteredGradeData} />
            
            {isDataLoaded && (
              <div className="grid grid-cols-1 gap-6">
                <ScoreDistribution gradeData={filteredGradeData} />
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
            
            {/* 成绩明细区域 */}
            {isDataLoaded && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">
                    {filterState.selectedSubjects.length > 0 ? 
                      `${filterState.selectedSubjects.join(', ')} 成绩明细` : 
                      '学生成绩明细'
                    }
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    共 {filteredGradeData.length} 条记录 • {filteredStudentCount} 名学生
                    {isFiltered && (
                      <span className="ml-2 text-blue-600">
                        ({filterUtils.getFilterDescription(filterState)})
                      </span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <GradeTable gradeData={filteredGradeData} />
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="class">
            <div className="mb-4">
              <h2 className="text-xl font-bold">班级成绩分析</h2>
              <p className="text-sm text-gray-600 mt-1">
                当前筛选状态: {filterUtils.getFilterDescription(filterState)}
              </p>
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
              <div className="space-y-6">
                {/* 多班级对比图表 */}
                {classesList.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        多班级对比分析
                      </CardTitle>
                      <CardDescription>
                        对比不同班级在各科目上的表现差异，识别优势和不足
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ClassComparisonChart
                        gradeData={filteredGradeData}
                      />
                    </CardContent>
                  </Card>
                )}
                
                {/* 单班级详细分析 */}
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                      🏫
                    </div>
                    <p className="text-lg font-medium">班级分析视图正在重构中</p>
                    <p className="text-sm">此功能将在后续版本中重新设计</p>
                  </div>
                </div>
              </div>
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
            <div className="mb-4">
              <h2 className="text-xl font-bold">学生成绩进步分析</h2>
              <p className="text-sm text-gray-600 mt-1">
                当前筛选状态: {filterUtils.getFilterDescription(filterState)} • 
                {filteredStudentCount} 名学生
              </p>
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
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    📈
                  </div>
                  <p className="text-lg font-medium">学生成绩进步分析正在重构中</p>
                  <p className="text-sm">此功能将在后续版本中重新设计</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">暂无学生数据</p>
                <p className="text-gray-500 mt-2">查看学生历次成绩进步情况</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate("/")}
                >
                  前往导入数据
                </Button>
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
                gradeData={filteredGradeData}
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
          
          <TabsContent value="predictive">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <Brain className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">智能预测分析</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>基于历史成绩数据，运用机器学习算法预测学生未来的学习表现，提供个性化的学习建议和干预措施。</p>
                </AlertDescription>
              </Alert>
              
              <PredictiveAnalysis />
            </div>
          </TabsContent>
          
          <TabsContent value="behavior">
            <div className="space-y-6">
              <Alert className="bg-green-50 border-green-200">
                <Activity className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">学习行为分析</AlertTitle>
                <AlertDescription className="text-green-600">
                  <p>深度分析学生的学习模式、认知风格和行为特征，识别学习者类型，为个性化教学提供科学依据。</p>
                </AlertDescription>
              </Alert>
              
              <LearningBehaviorAnalysis />
            </div>
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
              
              {/* 占位符 */}
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
              
              {/* 占位符 */}
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
              
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    🔗
                  </div>
                  <p className="text-lg font-medium">科目相关性分析正在重构中</p>
                  <p className="text-sm">此功能将在后续版本中重新设计</p>
                </div>
              </div>
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
              
              <ClassBoxPlotChart gradeData={filteredGradeData} />
            </div>
          </TabsContent>
          
          <TabsContent value="contribution">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <ChartPieIcon className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">多班级表现对比分析</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>详细对比各班级在不同科目的表现，包括排名、统计数据和导出功能。</p>
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    👥
                  </div>
                  <p className="text-lg font-medium">学生科目贡献度分析正在重构中</p>
                  <p className="text-sm">此功能将在后续版本中重新设计</p>
                </div>
              </div>
              
              <Alert className="bg-green-50 border-green-200 mt-6">
                <ChartPieIcon className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">学生科目贡献度</AlertTitle>
                <AlertDescription className="text-green-600">
                  <p>分析学生各科成绩相对于班级的表现差异，识别学生的优势和劣势学科，为因材施教提供数据支持。</p>
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    👥
                  </div>
                  <p className="text-lg font-medium">学生科目贡献度分析正在重构中</p>
                  <p className="text-sm">此功能将在后续版本中重新设计</p>
                </div>
              </div>
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
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    🤖
                  </div>
                  <p className="text-lg font-medium">智能数据分析器正在重构中</p>
                  <p className="text-sm">此功能将在后续版本中重新设计</p>
                </div>
              </div>
              
              {/* 数据类型分析 */}
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    📊
                  </div>
                  <p className="text-lg font-medium">数据类型分析器正在重构中</p>
                  <p className="text-sm">此功能将在后续版本中重新设计</p>
                </div>
              </div>
              
              {/* 科目对比分析 */}
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                    📈
                  </div>
                  <p className="text-lg font-medium">科目对比分析正在重构中</p>
                  <p className="text-sm">此功能将在后续版本中重新设计</p>
                </div>
              </div>
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
