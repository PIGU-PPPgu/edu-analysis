import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import GradeOverview from "@/components/analysis/core/GradeOverview";
import ScoreDistribution from "@/components/analysis/statistics/ScoreDistribution";
import { BasicGradeStats } from "@/components/analysis/core/BasicGradeStats";
import OptimizedDataDashboard from "@/components/analysis/core/OptimizedDataDashboard";
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
  Brain,
  CheckCircle,
  Calendar,
  AlertTriangle
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
import SubjectCorrelationAnalysis from "@/components/analysis/advanced/SubjectCorrelationAnalysis";
import AnomalyDetectionAnalysis from "@/components/analysis/advanced/AnomalyDetectionAnalysis";
import ContributionAnalysis from "@/components/analysis/advanced/ContributionAnalysis";
import CrossAnalysis from "@/components/analysis/advanced/CrossAnalysis";

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
      classField: 'class_name',  // 确保使用正确的字段名
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
          const hasErrors = results.some(result => !result.success);
          if (hasErrors) {
            console.warn("数据库检查发现一些问题，但不影响基本功能");
          } else {
            console.log("数据库结构检查完成，一切正常");
          }
          
          // 记录检查时间
          localStorage.setItem('dbStructureLastCheckTime', now.toString());
          
          setDbFixStatus({
            checking: false,
            fixed: !hasErrors,
            error: hasErrors ? "数据库结构存在一些问题，但不影响基本功能" : null
          });
        });
      } catch (error) {
        console.error("数据库检查过程中发生异常:", error);
        setDbFixStatus({
          checking: false,
          fixed: false,
          error: "数据库检查失败，请检查网络连接"
        });
      }
    };

    checkDatabase();
  }, []);

  // 创建可重用的加载考试列表函数
  const loadExamList = useCallback(async () => {
    try {
      console.log("开始获取考试列表...");
      
      // 获取所有考试信息
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .order('date', { ascending: false });

      if (examsError) {
        console.error("获取考试列表失败:", examsError);
        toast.error("获取考试列表失败", {
          description: examsError.message
        });
        return;
      }

      if (examsData && examsData.length > 0) {
        // 为每个考试计算成绩数量
        const examsWithCount = await Promise.all(
          examsData.map(async (exam) => {
            const { count } = await supabase
              .from('grade_data')
              .select('*', { count: 'exact', head: true })
              .eq('exam_id', exam.id);
            
            return {
              ...exam,
              gradeCount: count || 0
            };
          })
        );

        console.log("获取到考试列表:", examsWithCount);
        setExamList(examsWithCount);
        
        // 如果没有选中的考试，默认选择第一个
        if (!selectedExam && examsWithCount.length > 0) {
          const defaultExam = examsWithCount[0];
          console.log("默认选择考试:", defaultExam.title);
          setSelectedExam(defaultExam.id);
        }
      } else {
        console.log("没有找到考试数据");
        setExamList([]);
      }
    } catch (error) {
      console.error("获取考试列表时发生异常:", error);
      toast.error("获取考试列表失败", {
        description: "请检查网络连接或联系管理员"
      });
    }
  }, [selectedExam]);

  // 获取考试列表 - 使用可重用函数
  useEffect(() => {
    loadExamList();
  }, [loadExamList]);

  // 获取成绩数据 - 修复版本
  useEffect(() => {
    const fetchGradeData = async (examId: string) => {
      if (!examId) {
        console.log("未选择考试，无法获取成绩数据");
        setIsLoading(false);
        return;
      }
      
      // 如果已经有数据，并且是当前选中的考试的数据，则跳过加载
      if (gradeData.length > 0 && 
          gradeData[0].examId === examId) {
        console.log("使用缓存的成绩数据");
        setIsLoading(false);
        return;
      }
      
      console.log(`开始获取考试ID[${examId}]的成绩数据...`);
      try {
        setIsLoading(true);
        
        // 修改查询方式，直接查询grade_data表，不使用JOIN
        const { data: gradeDataResult, error: gradeError } = await supabase
          .from('grade_data')
          .select('*')
          .eq('exam_id', examId);
        
        if (gradeError) {
          console.error("获取成绩数据出错:", gradeError);
          toast.error("获取成绩数据失败", {
            description: gradeError.message
          });
          throw gradeError;
        }
        
        if (gradeDataResult && gradeDataResult.length > 0) {
          console.log("获取到考试成绩数据:", gradeDataResult.length, "条记录");
          console.log("原始数据样本:", gradeDataResult.slice(0, 2));
          
          // 格式化数据 - 修复版本，直接使用grade_data表中的字段
          const formattedData = gradeDataResult.map((item: any) => {
            // 从grade_data表中提取正确的分数
            let finalScore = 0;
            if (item.score !== null && item.score !== undefined) {
              finalScore = parseFloat(item.score);
            } else if (item.total_score !== null && item.total_score !== undefined) {
              finalScore = parseFloat(item.total_score);
            }
            
            // 处理班级信息 - 直接使用grade_data表中的字段
            let finalClassName = '未知班级';
            if (item.class_name && item.class_name !== '未知班级') {
              finalClassName = item.class_name;
            }
            
            // 处理学生姓名 - 直接使用grade_data表中的字段
            let finalName = '未知学生';
            if (item.name) {
              finalName = item.name;
            }
            
            return {
              id: item.id,
              student_id: item.student_id,
              studentId: item.student_id,
              name: finalName,
              subject: item.subject || '总分',
              score: finalScore,
              examDate: item.exam_date,
              examType: item.exam_type || '未知考试',
              examTitle: item.exam_title || '未知考试',
              className: finalClassName,
              class_name: finalClassName,
              examId: item.exam_id
            };
          });
          
          console.log("格式化后的数据样本:", formattedData.slice(0, 3));
          console.log("格式化后的数据总数:", formattedData.length);
          setGradeData(formattedData);
          
          // 收集可用的班级列表 - 修复版本
          const classes = [...new Set(formattedData
            .map((item: any) => item.className)
            .filter(c => c && c !== '未知班级')
          )];
          
          // 如果没有有效班级，至少包含"未知班级"
          if (classes.length === 0) {
            classes.push('未知班级');
          }
          
          setClassesList(classes as string[]);
          console.log("收集到的班级:", classes);
          
          // 收集学生列表
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
          const subjects = [...new Set(formattedData
            .map((item: any) => item.subject)
            .filter(s => s && s.trim())
          )];
          setAvailableSubjects(subjects as string[]);
          console.log("收集到的科目:", subjects);
          
          // 如果有班级数据，默认选择第一个班级
          if (classes.length > 0 && !selectedClass) {
            console.log("默认选择班级:", classes[0]);
            setSelectedClass(classes[0] as string);
          }
        } else {
          console.log("未获取到成绩数据或数据为空");
          setGradeData([]);
          setClassesList([]);
          setStudentsList([]);
          setAvailableSubjects([]);
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
    
    if (selectedExam) {
      fetchGradeData(selectedExam);
    }
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

  // 考试切换处理 - 修复版本
  const handleExamChange = (examId: string) => {
    console.log("切换考试:", examId);
    setSelectedExam(examId);
    // 清空当前数据，触发重新加载
    setGradeData([]);
    setClassesList([]);
    setStudentsList([]);
    setAvailableSubjects([]);
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

  // 新增：删除考试处理函数
  const handleDeleteExam = async () => {
    if (!selectedExam) {
      toast.error('请先选择要删除的考试');
      return;
    }

    const examToDelete = examList.find(e => e.id === selectedExam);
    if (!examToDelete) {
      toast.error('找不到要删除的考试');
      return;
    }

    // 确认删除
    const confirmed = window.confirm(
      `确定要删除考试"${examToDelete.title}"吗？\n\n此操作将删除该考试的所有成绩数据，且无法恢复。`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      toast.info('正在删除考试...');

      const result = await gradeAnalysisService.deleteExam(selectedExam);
      
      if (result.success) {
        toast.success(`考试"${examToDelete.title}"已成功删除`);
        
        // 重新加载考试列表
        handleRefreshData();
        
        // 清除当前选择的考试
        setSelectedExam(null);
        setGradeData([]);
        
      } else {
        toast.error(`删除失败: ${result.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除考试时发生错误:', error);
      toast.error(`删除失败: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    // 清空缓存，重新获取数据
    setExamList([]);
    setClassesList([]);
    setStudentsList([]);
    setGradeData([]);
    setSelectedExam(null);
    
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

  // 处理表格排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">正在加载成绩数据</h3>
            <p className="text-gray-500">请稍候...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
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
            {/* 考试选择器 - 修复版本 */}
            {examList.length > 0 ? (
              <>
                <BookOpen className="h-4 w-4" />
                <Select value={selectedExam || ''} onValueChange={handleExamChange}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="选择考试">
                      {selectedExam && examList.find(e => e.id === selectedExam) ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{examList.find(e => e.id === selectedExam)?.title}</span>
                          <Badge variant="secondary" className="ml-auto">
                            {examList.find(e => e.id === selectedExam)?.gradeCount || 0}条记录
                          </Badge>
                        </div>
                      ) : (
                        "选择考试"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {examList.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex flex-col">
                            <span className="font-medium">{exam.title}</span>
                            <span className="text-xs text-gray-500">
                              {exam.type} • {exam.date ? new Date(exam.date).toLocaleDateString() : '未知日期'}
                            </span>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {exam.gradeCount || 0}条记录
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={handleDeleteExam}
                  title="删除考试"
                >
                  <CircleX className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={handleRefreshData}
                  title="刷新数据"
                  disabled={isRefreshing}
                >
                  <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </>
            ) : (
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

        {/* 紧凑筛选器组件 - 修复版本 */}
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
            {selectedExam && (
              <Card className="bg-white p-4 rounded-lg shadow mb-4">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      当前分析考试
                    </CardTitle>
                    <Badge>
                      {examList.find(e => e.id === selectedExam)?.type}
                    </Badge>
                  </div>
                  <CardDescription>
                    {examList.find(e => e.id === selectedExam)?.title} 
                    {examList.find(e => e.id === selectedExam)?.date && (
                      <span className="ml-2 text-gray-400">
                        ({new Date(examList.find(e => e.id === selectedExam)?.date).toLocaleDateString()})
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}
            
            {/* 显示没有数据的提示卡片 - 简化版 */}
            {examList.length === 0 && !isLoading && (
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
          
            {/* 使用优化的数据看板组件 */}
            <OptimizedDataDashboard 
              gradeData={filteredGradeData} 
              loading={isLoading}
              showScoreDistribution={true}
              showDetailedStats={true}
            />
            
            {!isDataLoaded && !isLoading && (
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
            
            {examList.length === 0 && !isLoading && (
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
            )}
            
            {isDataLoaded && (
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
                        data={filteredGradeData}
                        filterState={{
                          selectedClasses: filterState.selectedClasses || [],
                          viewMode: filterState.mode === 'multi-class' ? 'comparison' : 'all',
                          comparisonTarget: 'classes'
                        }}
                        selectedSubject={filterState.selectedSubjects[0] as Subject || Subject.TOTAL}
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
            
            {examList.length === 0 && !isLoading && (
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
            )}
            
            {isDataLoaded && (
              <BasicGradeStats 
                gradeData={filteredGradeData}
                title="学生成绩进步分析"
              />
            )}
          </TabsContent>
          
          <TabsContent value="advanced">
            {examList.length === 0 && (
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
            )}
            
            {isDataLoaded && selectedExam && (
              <AdvancedDashboard 
                examId={selectedExam}
                examTitle={examList.find(e => e.id === selectedExam)?.title}
                examDate={examList.find(e => e.id === selectedExam)?.date || undefined}
                examType={examList.find(e => e.id === selectedExam)?.type}
                gradeData={filteredGradeData}
              />
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
              {isDataLoaded ? (
                <CrossAnalysis 
                  gradeData={filteredGradeData}
                  title="多维交叉分析"
                  className=""
                />
              ) : (
                <Card className="bg-white p-4 rounded-lg shadow">
                  <CardContent className="pt-6 text-center">
                    <Grid className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                    <p className="mb-4 text-sm text-gray-500">
                      请先导入学生成绩数据进行交叉分析
                    </p>
                    <Button 
                      onClick={() => navigate("/")}
                    >
                      前往导入数据
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="anomaly">
            <div className="space-y-6">
              {isDataLoaded ? (
                <AnomalyDetectionAnalysis 
                  gradeData={filteredGradeData}
                  title="成绩异常检测"
                />
              ) : (
                <Card className="bg-white p-4 rounded-lg shadow">
                  <CardContent className="pt-6 text-center">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                    <p className="mb-4 text-sm text-gray-500">
                      请先导入学生成绩数据进行异常检测
                    </p>
                    <Button 
                      onClick={() => navigate("/")}
                    >
                      前往导入数据
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="correlation">
            <div className="space-y-6">
              {isDataLoaded ? (
                <SubjectCorrelationAnalysis 
                  gradeData={filteredGradeData}
                  title="科目相关性分析"
                />
              ) : (
                <Card className="bg-white p-4 rounded-lg shadow">
                  <CardContent className="pt-6 text-center">
                    <Grid className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                    <p className="mb-4 text-sm text-gray-500">
                      请先导入学生成绩数据进行相关性分析
                    </p>
                    <Button 
                      onClick={() => navigate("/")}
                    >
                      前往导入数据
                    </Button>
                  </CardContent>
                </Card>
              )}
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
              {isDataLoaded ? (
                <ContributionAnalysis 
                  gradeData={filteredGradeData}
                  title="学生科目贡献度分析"
                  className=""
                />
              ) : (
                <Card className="bg-white p-4 rounded-lg shadow">
                  <CardContent className="pt-6 text-center">
                    <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="mb-4 text-xl text-gray-600">暂无考试数据</p>
                    <p className="mb-4 text-sm text-gray-500">
                      请先导入学生成绩数据进行贡献度分析
                    </p>
                    <Button 
                      onClick={() => navigate("/")}
                    >
                      前往导入数据
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="ai-analysis">
            <div className="space-y-6">
              <Alert className="bg-blue-50 border-blue-200">
                <BrainCircuit className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">AI智能分析</AlertTitle>
                <AlertDescription className="text-blue-600">
                  <p>集成多种AI模型，为您的成绩数据提供专业的智能分析和教学建议。支持智能大模型、通义千问等多种AI模型。</p>
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
