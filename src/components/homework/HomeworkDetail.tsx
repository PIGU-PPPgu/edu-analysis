import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/Loading";
import TeacherGradeHomeworkDialog from "./TeacherGradeHomeworkDialog";
import { useToast } from "@/components/ui/use-toast";
import {
  CheckCircle,
  Clock,
  Award,
  BookOpen,
  ChevronLeft,
  BrainCircuit,
  ChartPieIcon,
  PenLine,
  ImagePlus,
  FileUp,
  ListIcon,
  Grid2X2,
  Upload,
  Download,
  Filter,
  FileDown,
  Scan,
  Sparkles,
  ChevronDown,
  XCircle,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StudentCard, StudentCardGrid, SubmissionStatus } from "./StudentCard";
import GradeCardView from "./GradeCardView";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, AreaChart, Area } from "recharts";
import { AutoChart, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { 
  gradeHomework, 
  getHomeworkById,
  getHomeworkSubmissions
} from "@/services/homeworkService";
import { getKnowledgePointsByHomeworkId } from "@/services/knowledgePointService";
import { 
  getGradingScaleWithLevels, 
  scoreToCustomGrade, 
  GradingScaleLevel 
} from "@/services/gradingService";
import { AIKnowledgePointAnalyzer } from '@/components/homework/AIKnowledgePointAnalyzer';
import { KnowledgePoint } from '@/components/homework/AIKnowledgePointAnalyzer';
import { 
  bulkCreateKnowledgePoints, 
  updateKnowledgePointEvaluations,
  masteryLevelToGrade
} from '@/services/knowledgePointService';

// 导入Excel导出库
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import KnowledgePointAnalysis from './KnowledgePointAnalysis';
import { KnowledgePoint as HomeworkKnowledgePoint } from "@/types/homework";
import { KnowledgePointManager } from "@/components/homework/KnowledgePointManager";
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";

const statusMap = {
  pending: { label: "待完成", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  submitted: { label: "已提交", icon: CheckCircle, color: "bg-blue-100 text-blue-800" },
  graded: { label: "已批改", icon: Award, color: "bg-green-100 text-green-800" },
  not_submitted: { label: "未交作业", icon: XCircle, color: "bg-gray-100 text-gray-800" },
  absent: { label: "请假", icon: Calendar, color: "bg-purple-100 text-purple-800" },
};

// 视图模式类型
type ViewMode = "cards" | "table" | "ai";

interface Homework {
  id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  grading_scale_id?: string; // 添加评级标准ID
  classes: {
    id: string;
    name: string;
    subject?: string;
  };
  teachers: {
    name: string;
  };
  knowledge_points?: KnowledgePoint[];
}

interface Submission {
  id: string;
  status: string;
  score?: number;
  submit_date?: string;
  submitted_at?: string;
  updated_at?: string;  // 添加更新时间字段
  students: {
    id: string;
    name: string;
    student_id?: string;
  };
  student_id?: string; // 添加学生ID字段
  teacher_feedback?: string;
  feedback?: string;
  knowledge_point_evaluation?: any[];
  submission_knowledge_points?: any[];
  student_knowledge_mastery?: any[]; // 添加新的知识点评估表
  knowledge_points_assessed?: boolean; // Add the missing field
}

interface HomeworkDetailProps {
  homeworkId: string;
}

export default function HomeworkDetail({ homeworkId }: HomeworkDetailProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [currentTab, setCurrentTab] = useState<"details" | "submissions" | "analysis">("details");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [openStudentDetailsId, setOpenStudentDetailsId] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [isGradeDialogOpen, setIsGradeDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [scoreDisplayMode, setScoreDisplayMode] = useState<"numeric" | "letter">("numeric");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradingScale, setGradingScale] = useState<{
    id: string;
    name: string;
    levels: GradingScaleLevel[];
  } | null>(null);
  const [homeworkImages, setHomeworkImages] = useState<{url: string; name: string; status?: string}[]>([]);
  const [lastUploadedImage, setLastUploadedImage] = useState<{url: string; name: string} | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // 添加知识点确认对话框状态
  const [showKnowledgePointDialog, setShowKnowledgePointDialog] = useState(false);
  const [aiKnowledgePoints, setAiKnowledgePoints] = useState<KnowledgePoint[]>([]);
  // 添加知识点分析对话框状态
  const [showAIAnalysisDialog, setShowAIAnalysisDialog] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [studentIdMapping, setStudentIdMapping] = useState<{[key: string]: {id: string, name: string}}>({});
  const [validationInProgress, setValidationInProgress] = useState(false);
  // Add state to track the last graded submission ID
  const [lastGradedSubmissionId, setLastGradedSubmissionId] = useState<string | null>(null);
  // Add ref for the submissions container
  const submissionsContainerRef = useRef<HTMLDivElement>(null);
  
  // 1. 数据加载优化：添加分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  
  // 2. 实时更新功能：添加websocket状态与定时器
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 3. 数据导出功能：添加导出状态
  const [isExporting, setIsExporting] = useState(false);
  
  // 4. 移动端适配：添加屏幕尺寸检测
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (!homeworkId) {
      console.error("HomeworkDetail: 缺少homeworkId参数");
      return;
    }

    console.log("HomeworkDetail: 开始获取作业详情，ID:", homeworkId);

    const fetchHomework = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // 使用实际的Supabase服务
        const data = await getHomeworkById(homeworkId);
        
        if (data) {
          setHomework(data); // Set homework state first
          
          // 获取知识点
          const kpData = await getKnowledgePointsByHomeworkId(homeworkId);
          console.log("获取到的知识点:", kpData);
          setKnowledgePoints(kpData as unknown as KnowledgePoint[]);
          
          // 获取作业的评级标准
          if (data.grading_scale_id) {
            const gradingScaleData = await getGradingScaleWithLevels(data.grading_scale_id);
            if (gradingScaleData) {
              setGradingScale({
                id: gradingScaleData.id || "",
                name: (gradingScaleData as any).name || "默认评级标准",
                levels: (gradingScaleData.levels || []) as unknown as GradingScaleLevel[]
              });
            }
          }
          
          // 获取班级学生ID映射 - 使用本地函数替代
          if (data.classes && data.classes.id) {
            try {
              console.log('获取班级学生ID映射，班级ID:', data.classes.id);
              // 替换为使用本地的fetchStudentIdMapping函数
              await fetchStudentIdMapping(data.classes.id);
            } catch (error) {
              console.error('获取学生ID映射异常:', error);
            }
          }
          
          // 获取作业提交情况
          // 不再重新获取数据，使用本地状态更新
          await fetchSubmissions(false, data); // 传入作业数据
        } else {
          setError("获取作业详情失败");
          toast({
            variant: "destructive",
            title: "错误",
            description: "获取作业详情失败"
          });
        }
      } catch (error) {
        setError("获取作业详情出错");
        toast({
          variant: "destructive",
          title: "错误",
          description: `获取作业详情出错: ${error.message}`
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHomework();
  }, [homeworkId, toast]);

  useEffect(() => {
    // 根据状态过滤和搜索过滤提交列表
    let filtered = [...submissions];
    
    // 状态过滤
    if (statusFilter.length > 0) {
      filtered = filtered.filter(sub => statusFilter.includes(sub.status));
    }
    
    // 搜索过滤
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sub => 
        sub.students.name.toLowerCase().includes(query)
      );
    }
    
    setFilteredSubmissions(filtered);
  }, [submissions, statusFilter, searchQuery]);

  // 懒加载设置：添加页面滚动侦听器
  useEffect(() => {
    // 仅在submissions标签页且为cards视图时启用懒加载
    if (currentTab === "submissions" && viewMode === "cards") {
      const handleScroll = () => {
        if (submissionsContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = submissionsContainerRef.current;
          
          // 当滚动到底部附近时加载更多内容
          if (scrollTop + clientHeight >= scrollHeight - 100 && !isLazyLoading && currentPage < totalPages) {
            setIsLazyLoading(true);
            setCurrentPage(prev => prev + 1);
          }
        }
      };

      const container = submissionsContainerRef.current;
      if (container) {
        container.addEventListener("scroll", handleScroll);
        
        return () => {
          container.removeEventListener("scroll", handleScroll);
        };
      }
    }
  }, [currentTab, viewMode, isLazyLoading, currentPage, totalPages]);

  // 移动端检测
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // 初始检查
    checkMobileView();
    
    // 添加窗口大小变化事件监听
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);
  
  // 实时更新功能
  useEffect(() => {
    // 启用或禁用实时更新
    if (realtimeEnabled) {
      // 每30秒获取一次更新
      realtimeIntervalRef.current = setInterval(() => {
        if (homeworkId) {
          console.log("实时更新：获取最新作业提交");
          fetchSubmissions(true, homework); // 传入当前homework状态
          setLastUpdate(new Date());
        }
      }, 30000); // 30秒检查一次
      
      toast({
        title: "实时更新已启用",
        description: "系统将自动获取最新提交"
      });
    } else {
      // 清除定时器
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
        realtimeIntervalRef.current = null;
      }
    }
    
    // 组件卸载时清除定时器
    return () => {
      if (realtimeIntervalRef.current) {
        clearInterval(realtimeIntervalRef.current);
      }
    };
  }, [realtimeEnabled, homeworkId, homework]);
  
  // 优化的fetchSubmissions函数，支持分页和实时更新
  const fetchSubmissions = async (isRealtime = false, homeworkData?: Homework) => {
    if (!homeworkId) return;
    
    // 使用传入的homeworkData或当前状态中的homework
    const currentHomework = homeworkData || homework;
    
    try {
      if (!isRealtime) {
        setIsLoading(true);
      }
      
      const result = await getHomeworkSubmissions(homeworkId);
      console.log("[fetchSubmissions] Raw result from getHomeworkSubmissions:", JSON.stringify(result)); // 打印原始结果
      
      if (result.success && currentHomework?.classes?.id) {
        // Map existing submissions (ensure students object exists)
        let existingSubmissions = result.submissions?.map(submission => {
          return {
            ...submission,
            students: Array.isArray(submission.students) 
              ? submission.students[0] || { id: submission.student_id, name: "未知学生" }
              : submission.students || { id: submission.student_id, name: "未知学生" } 
          };
        }) || [];
        
        console.log("[fetchSubmissions] Mapped existingSubmissions:", JSON.stringify(existingSubmissions)); // 打印映射后的结果
        
        // 始终获取班级所有学生，并合并现有提交记录
        console.log("[fetchSubmissions] 获取班级所有学生并合并提交记录。作业数据:", {
          homeworkId: currentHomework.id,
          classId: currentHomework.classes.id,
          className: currentHomework.classes.name,
          existingSubmissionsCount: existingSubmissions.length
        });
        
        try {
          // 尝试通过class_id查询（新结构）
          let { data: classStudents, error: classError } = await supabase
            .from('students')
            .select('id, name, student_id, class_name, class_id')
            .eq('class_id', currentHomework.classes.id);
          
          console.log("[fetchSubmissions] 通过class_id查询结果:", { 
            classStudents: classStudents?.length || 0, 
            error: classError?.message 
          });
          
          // 如果通过class_id查询失败，尝试通过class_name查询（旧结构）
          if (classError || !classStudents || classStudents.length === 0) {
            console.log('[fetchSubmissions] 尝试通过class_name查询学生...', currentHomework.classes.name);
            const { data: classStudentsByName, error: nameError } = await supabase
              .from('students')
              .select('id, name, student_id, class_name')
              .eq('class_name', currentHomework.classes.name);
            
            console.log("[fetchSubmissions] 通过class_name查询结果:", { 
              classStudents: classStudentsByName?.length || 0, 
              error: nameError?.message 
            });
            
            if (!nameError && classStudentsByName) {
              classStudents = classStudentsByName;
              console.log(`[fetchSubmissions] 通过班级名称找到${classStudents.length}名学生`);
            }
          }
          
          if (classStudents && classStudents.length > 0) {
            console.log(`[fetchSubmissions] 找到${classStudents.length}名班级学生，开始合并数据`);
            
            // 创建学生ID到现有提交记录的映射
            const existingSubmissionMap = new Map();
            existingSubmissions.forEach(submission => {
              const studentId = submission.students?.id || submission.student_id;
              if (studentId) {
                existingSubmissionMap.set(studentId, submission);
              }
            });
            
            // 为所有学生创建完整的提交记录列表
            const allSubmissions = classStudents.map(student => {
              const studentId = student.id || student.student_id;
              const existingSubmission = existingSubmissionMap.get(studentId);
              
              if (existingSubmission) {
                // 使用现有的提交记录
                console.log(`[fetchSubmissions] 学生 ${student.name} 有现有提交记录，状态: ${existingSubmission.status}`);
                return {
                  ...existingSubmission,
                  students: {
                    id: studentId,
                    student_id: student.student_id,
                    name: student.name,
                    class_name: student.class_name
                  }
                };
              } else {
                // 为没有提交记录的学生创建临时记录
                console.log(`[fetchSubmissions] 学生 ${student.name} 没有提交记录，创建临时记录`);
                return {
                  id: `temp-${studentId}`,
                  status: 'pending',
                  students: {
                    id: studentId,
                    student_id: student.student_id,
                    name: student.name,
                    class_name: student.class_name
                  },
                  student_knowledge_mastery: []
                };
              }
            });
    
            console.log(`[fetchSubmissions] 合并完成，总共${allSubmissions.length}条记录 (${existingSubmissions.length}条现有 + ${allSubmissions.length - existingSubmissions.length}条临时)`);
            setSubmissions(allSubmissions);
            
            // 计算总页数
            setTotalPages(Math.ceil(allSubmissions.length / pageSize));
            
            // 创建学生ID映射
            const mapping: {[key: string]: {id: string, name: string}} = {};
            classStudents.forEach(student => {
              const studentId = student.id || student.student_id;
              mapping[studentId] = { id: studentId, name: student.name };
              mapping[`temp-${studentId}`] = { id: studentId, name: student.name };
            });
            
            setStudentIdMapping(mapping);
            
            // 显示成功提示
            const newRecordsCount = allSubmissions.length - existingSubmissions.length;
            toast({
              title: "学生列表已加载",
              description: `班级共${allSubmissions.length}名学生 (${existingSubmissions.length}名已有记录，${newRecordsCount}名待处理)`
            });
            
            // 实时更新提示
            if (isRealtime && existingSubmissions.length > 0) {
              toast({
                title: "数据已更新",
                description: `最新提交数据已同步，共 ${allSubmissions.length} 条记录`
              });
            }
          } else {
            console.log('[fetchSubmissions] 未找到班级学生');
            setSubmissions([]);
            setTotalPages(1);
            
            toast({
              variant: "destructive",
              title: "未找到学生",
              description: "该班级中没有找到学生记录"
            });
          }
        } catch (error) {
          console.error('[fetchSubmissions] 获取班级学生失败:', error);
          toast({
            variant: "destructive",
            title: "获取学生名单失败",
            description: "无法获取班级学生列表"
          });
        }
      } else {
        console.error('[fetchSubmissions] 获取提交列表失败或缺少作业数据:', result.error);
        if (!isRealtime) {
          toast({
            variant: "destructive",
            title: "获取提交列表失败",
            description: result.error || "请检查网络连接后重试"
          });
        }
        setSubmissions([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('[fetchSubmissions] 获取提交列表异常:', error);
      if (!isRealtime) {
        toast({
          variant: "destructive",
          title: "获取提交列表失败",
          description: "加载提交列表时发生错误"
        });
      }
      setSubmissions([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
      setIsLazyLoading(false);
      setLastFetchTime(new Date());
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleGraded = async () => {
    setIsGradeDialogOpen(false);
    setSelectedSubmissionId(null);
    // 不再重新获取数据，使用本地状态更新
  };

  const handleOpenGradeDialog = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsGradeDialogOpen(true);
  };

  const handleStatusFilterChange = (value: string) => {
    if (statusFilter.includes(value)) {
      setStatusFilter(statusFilter.filter(v => v !== value));
    } else {
      setStatusFilter([...statusFilter, value]);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 改进的数据导出功能
  const handleExportResults = async () => {
    try {
      setIsExporting(true);
      
      if (!homework || submissions.length === 0) {
        toast({
          variant: "destructive",
          title: "无法导出",
          description: "没有可导出的数据"
        });
        setIsExporting(false);
        return;
      }
      
      // 准备导出数据
      const exportData = submissions.map(submission => {
        // 计算知识点平均掌握度
        const masteryValues = submission.student_knowledge_mastery
          ? submission.student_knowledge_mastery.map(km => km.mastery_level)
          : [];
        const avgMastery = masteryValues.length > 0
          ? masteryValues.reduce((sum, val) => sum + val, 0) / masteryValues.length
          : 0;
          
        // 生成知识点掌握情况详情
        const knowledgePointDetails = submission.student_knowledge_mastery
          ? submission.student_knowledge_mastery.map(km => 
              `${km.knowledge_points?.name || '未知'}: ${km.mastery_level}%`
            ).join('; ')
          : '';
        
        return {
          '学生姓名': submission.students.name,
          '学生ID': submission.students.student_id || submission.students.id,
          '提交状态': submission.status === 'graded' ? '已批改' : 
                    submission.status === 'submitted' ? '已提交' : 
                    submission.status === 'late' ? '逾期提交' : '未提交',
          '分数': submission.score || '',
          '等级': submission.score ? scoreToGrade(submission.score) : '',
          '知识点平均掌握度': avgMastery > 0 ? `${avgMastery.toFixed(1)}%` : '',
          '教师反馈': submission.teacher_feedback || submission.feedback || '',
          '提交时间': submission.submitted_at ? formatDate(submission.submitted_at) : '',
          '批改时间': submission.updated_at ? formatDate(submission.updated_at) : '',
          '知识点详情': knowledgePointDetails
        };
      });
      
      // 创建工作簿和工作表
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '作业批改结果');
      
      // 设置列宽
      const columnWidths = [
        { wch: 10 },  // 学生姓名
        { wch: 12 },  // 学生ID
        { wch: 8 },   // 提交状态
        { wch: 6 },   // 分数
        { wch: 6 },   // 等级
        { wch: 15 },  // 知识点平均掌握度
        { wch: 30 },  // 教师反馈
        { wch: 18 },  // 提交时间
        { wch: 18 },  // 批改时间
        { wch: 50 }   // 知识点详情
      ];
      worksheet['!cols'] = columnWidths;
      
      // 导出工作簿
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // 设置文件名：作业标题-日期
      const fileName = `${homework.title}-批改结果-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // 保存文件
      saveAs(blob, fileName);
      
    toast({
      title: "导出成功",
        description: `批改结果已导出到Excel文件: ${fileName}`
      });
    } catch (error) {
      console.error('导出数据失败:', error);
      toast({
        variant: "destructive",
        title: "导出失败",
        description: error instanceof Error ? error.message : "导出数据时发生错误"
    });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadScans = () => {
    toast({
      title: "功能开发中",
      description: "AI批改功能正在开发中"
    });
  };

  // 新增处理上传作业图片的函数
  const handleUploadHomeworkImage = () => {
    // 创建一个隐藏的文件输入框
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    // 处理文件选择
    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) return;
      
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "格式错误",
          description: "请上传图片文件"
        });
        return;
      }
      
      // 验证文件大小 (限制为5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "文件过大",
          description: "图片大小不能超过5MB"
        });
        return;
      }
      
      // 显示上传中状态
      setIsUploadingImage(true);
      
      // 先添加一个临时图片项，显示上传中状态
      const tempId = Date.now().toString();
      setHomeworkImages(prev => [...prev, {
        url: URL.createObjectURL(file),
        name: file.name,
        status: 'uploading'
      }]);
      
      try {
        // 开始上传图片:
        console.log('开始上传图片:', file.name, '大小:', Math.round(file.size/1024) + 'KB', '类型:', file.type);
        
        // 将图片转换为base64，用于直接传给AI分析
        const readAsBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };
        
        // 获取图片的base64版本用于AI分析
        const imageBase64 = await readAsBase64(file);
        console.log('图片已转换为base64格式，长度:', imageBase64.length);
        
        // 实际上传逻辑，连接到Supabase Storage
        const { supabase } = await import('@/integrations/supabase/client');
        console.log('Supabase 客户端已加载');
        
        // 检查 Storage API 是否可用
        if (!supabase || !supabase.storage) {
          throw new Error('Supabase Storage API 不可用');
        }
        
        const filePath = `homework_files/${homeworkId}/${Date.now()}_${file.name}`;
        console.log('准备上传至路径:', filePath);
        
        // 上传文件到Supabase
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('homework_files')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Supabase 上传错误:', uploadError);
          
          // 移除临时上传项
          setHomeworkImages(prev => prev.filter(img => !(img.status === 'uploading' && img.name === file.name)));
          
          throw new Error(`上传失败: ${uploadError.message}`);
        }
        
        console.log('上传成功，文件信息:', uploadData);
          
        // 获取文件的公共URL
        const { data: { publicUrl } } = supabase.storage
          .from('homework_files')
          .getPublicUrl(filePath);
        
        console.log('已获取公共URL:', publicUrl);
        
        // 更新临时图片为实际上传完成的图片
        setHomeworkImages(prev => prev.map(img => 
          (img.status === 'uploading' && img.name === file.name) 
            ? { url: publicUrl, name: file.name, status: 'uploaded' } 
            : img
        ));
        
        // 记录最后上传的图片
        const uploadedImage = { url: publicUrl, name: file.name };
        setLastUploadedImage(uploadedImage);
        
        // 上传成功提示
        toast({
          title: "上传成功",
          description: "作业图片已上传成功"
        });
        
        // 设置AI分析状态
        setIsAiAnalyzing(true);
        
        // 调用AI分析接口
        console.log('开始AI分析图片');
        const { analyzeHomeworkImage } = await import('@/services/aiService');
        
        // 使用base64图片数据而不是URL进行分析
        const analysisResult = await analyzeHomeworkImage(imageBase64, {
          homeworkId,
          subject: homework?.classes?.subject || '',
        });
        
        console.log('AI分析结果:', analysisResult);
        
        if (analysisResult?.success && analysisResult?.knowledgePoints?.length > 0) {
          // 保存知识点结果
          console.log('保存AI提取的知识点:', analysisResult.knowledgePoints.length);
          const { 
            success, 
            message, 
            knowledgePoints: extractedPoints, 
            localSaved // 使用localSaved代替fromLocalStorage
          } = await bulkCreateKnowledgePoints(
            analysisResult.knowledgePoints, 
            homeworkId
          );
          
          if (success) {
            // 更新知识点列表
            if (localSaved) { // 使用localSaved
              // 如果是从本地存储恢复的知识点，直接使用
              console.log('使用从本地存储恢复的知识点');
              setKnowledgePoints((extractedPoints || []) as unknown as KnowledgePoint[]);
            } else {
              // 否则从数据库获取最新的知识点列表
              const updatedKnowledgePoints = await getKnowledgePointsByHomeworkId(homeworkId);
              setKnowledgePoints(updatedKnowledgePoints as unknown as KnowledgePoint[]);
            }
            
            // 分析完成提示
            toast({
              title: "分析完成",
              description: `AI已完成图片分析，${localSaved ? '从本地存储恢复了' : '提取了'}${extractedPoints ? extractedPoints.length : analysisResult.knowledgePoints.length}个知识点`
            });
          } else {
            console.error('知识点保存失败:', message);
            toast({
              variant: "destructive",
              title: "知识点保存失败",
              description: message || "无法保存提取的知识点"
            });
          }
        } else {
          console.warn('AI未检测到知识点');
          toast({
            variant: "default",
            title: "未检测到知识点",
            description: "AI未能从图片中提取到知识点，请尝试使用更清晰的图片"
          });
        }
      } catch (error) {
        console.error('图片上传或分析过程中出错:', error);
        
        // 移除临时上传项
        setHomeworkImages(prev => prev.filter(img => !(img.status === 'uploading' && img.name === file.name)));
        
        toast({
          variant: "destructive",
          title: "上传失败",
          description: error instanceof Error ? error.message : "上传图片时发生错误"
        });
      } finally {
        setIsUploadingImage(false);
        setIsAiAnalyzing(false);
      }
    };
    
    // 触发文件选择
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  // 添加拖放上传处理函数
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "格式错误",
          description: "请上传图片文件"
        });
        return;
      }
      
      // 验证文件大小 (限制为5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          variant: "destructive",
          title: "文件过大",
          description: "图片大小不能超过5MB"
        });
        return;
      }
      
      // 显示上传中状态
      setIsUploadingImage(true);
      setIsAiAnalyzing(true);
      
      try {
        console.log('开始通过拖放上传图片:', file.name, '大小:', Math.round(file.size/1024) + 'KB', '类型:', file.type);
        
        // 将图片转换为base64，用于直接传给AI分析
        const readAsBase64 = (file: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        };
        
        // 获取图片的base64版本用于AI分析
        const imageBase64 = await readAsBase64(file);
        console.log('图片已转换为base64格式，长度:', imageBase64.length);
        
        // 实际上传逻辑，连接到Supabase Storage
        const { supabase } = await import('@/integrations/supabase/client');
        console.log('Supabase 客户端已加载');
        
        // 检查 Storage API 是否可用
        if (!supabase || !supabase.storage) {
          throw new Error('Supabase Storage API 不可用');
        }
        
        const filePath = `homework_files/${homeworkId}/${Date.now()}_${file.name}`;
        console.log('准备上传至路径:', filePath);
        
        // 上传文件到Supabase
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('homework_files')
          .upload(filePath, file);
          
        if (uploadError) {
          console.error('Supabase 上传错误:', uploadError);
          throw new Error(`上传失败: ${uploadError.message}`);
        }
        
        console.log('上传成功，文件信息:', uploadData);
          
        // 获取文件的公共URL
        const { data: { publicUrl } } = supabase.storage
          .from('homework_files')
          .getPublicUrl(filePath);
        
        console.log('已获取公共URL:', publicUrl);
        console.log('公共URL详细信息:', {
          url: publicUrl,
          length: publicUrl.length,
          isImageUrl: publicUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) !== null,
          isPublicAccessible: publicUrl.includes('supabase'),
        });
        
        // 添加到图片列表
        setHomeworkImages(prev => [...prev, {
          url: publicUrl,
          name: file.name
        }]);
        
        // 上传成功提示
        toast({
          title: "上传成功",
          description: "作业图片已上传，AI分析中..."
        });
        
        // 调用AI分析接口
        console.log('开始AI分析图片');
        const { analyzeHomeworkImage } = await import('@/services/aiService');
        
        // 使用base64图片数据而不是URL进行分析
        const analysisResult = await analyzeHomeworkImage(imageBase64, {
          homeworkId,
          subject: homework?.classes?.subject || '',
        });
        
        console.log('AI分析结果:', analysisResult);
        
        if (analysisResult?.success && analysisResult?.knowledgePoints?.length > 0) {
          // 保存知识点结果
          console.log('保存AI提取的知识点:', analysisResult.knowledgePoints.length);
          const { 
            success, 
            message, 
            knowledgePoints: extractedPoints, 
            localSaved // 使用localSaved代替fromLocalStorage
          } = await bulkCreateKnowledgePoints(
            analysisResult.knowledgePoints, 
            homeworkId
          );
          
          if (success) {
            // 更新知识点列表
            if (localSaved) { // 使用localSaved
              // 如果是从本地存储恢复的知识点，直接使用
              console.log('使用从本地存储恢复的知识点');
              setKnowledgePoints((extractedPoints || []) as unknown as KnowledgePoint[]);
            } else {
              // 否则从数据库获取最新的知识点列表
              const updatedKnowledgePoints = await getKnowledgePointsByHomeworkId(homeworkId);
              setKnowledgePoints(updatedKnowledgePoints as unknown as KnowledgePoint[]);
            }
            
            // 分析完成提示
            toast({
              title: "分析完成",
              description: `AI已完成图片分析，${localSaved ? '从本地存储恢复了' : '提取了'}${extractedPoints ? extractedPoints.length : analysisResult.knowledgePoints.length}个知识点`
            });
          } else {
            console.error('知识点保存失败:', message);
            toast({
              variant: "destructive",
              title: "知识点保存失败",
              description: message || "无法保存提取的知识点"
            });
          }
        } else {
          console.warn('AI未检测到知识点');
          toast({
            variant: "default",
            title: "未检测到知识点",
            description: "AI未能从图片中提取到知识点，请尝试使用更清晰的图片"
          });
        }
      } catch (error) {
        console.error('图片拖放上传或分析过程中出错:', error);
        toast({
          variant: "destructive",
          title: "上传失败",
          description: error instanceof Error ? error.message : "上传图片时发生错误"
        });
      } finally {
        setIsUploadingImage(false);
        setIsAiAnalyzing(false);
      }
    }
  };

  // 将分数转换为等级
  const scoreToGrade = (score: number): string => {
    if (score >= 95) return "A+";
    if (score >= 90) return "A";
    if (score >= 85) return "B+";
    if (score >= 80) return "B";
    if (score >= 75) return "C+";
    if (score >= 70) return "C";
    if (score >= 65) return "D+";
    if (score >= 60) return "D";
    return "F";
  };
  
  // 将分数转换为中文评级
  const scoreToChineseGrade = (score: number): string => {
    if (score >= 90) return "优秀";
    if (score >= 80) return "良好";
    if (score >= 70) return "中等";
    if (score >= 60) return "及格";
    return "不及格";
  };
  
  // 获取分数或等级展示
  const getScoreDisplay = (score: number | undefined): string => {
    if (score === undefined) return "-";
    
    if (scoreDisplayMode === "numeric") {
      return `${score}`;
    } else if (gradingScale && gradingScale.levels.length > 0) {
      // 使用自定义评级
      const grade = scoreToCustomGrade(score, gradingScale.levels);
      return grade ? grade.name : "-";
    } else {
      // 使用默认评级
      return scoreToGrade(score); 
    }
  };

  // 计算知识点掌握度分布数据
  const knowledgePointDistributionData = useMemo(() => {
    if (!knowledgePoints.length || !submissions.some(s => s.knowledge_point_evaluation?.length > 0)) {
      return [];
    }
    
    return knowledgePoints.map(kp => {
      // 找出所有与该知识点相关的评估
      const evaluations = submissions
        .filter(s => s.status === "graded")
        .flatMap(s => s.knowledge_point_evaluation || [])
        .filter(e => e.knowledge_points.id === kp.id);
      
      // 按掌握度区间统计学生人数
      const excellent = evaluations.filter(e => e.mastery_level >= 90).length;
      const good = evaluations.filter(e => e.mastery_level >= 75 && e.mastery_level < 90).length;
      const average = evaluations.filter(e => e.mastery_level >= 60 && e.mastery_level < 75).length;
      const poor = evaluations.filter(e => e.mastery_level < 60).length;
      
      return {
        name: kp.name,
        优秀: excellent,
        良好: good,
        中等: average,
        不及格: poor,
        total: evaluations.length,
      };
    });
  }, [knowledgePoints, submissions]);

  // 计算每个知识点的平均掌握度
  const knowledgePointAverageMasteryData = useMemo(() => {
    if (!knowledgePoints.length || !submissions.some(s => s.status === "graded" && s.student_knowledge_mastery?.length > 0)) {
      return [];
    }

    return knowledgePoints.map(kp => {
      const evaluations = submissions
        .filter(s => s.status === "graded" && s.student_knowledge_mastery)
        .flatMap(s => s.student_knowledge_mastery)
        .filter(mastery => mastery.knowledge_points?.id === kp.id);
      
      const totalMastery = evaluations.reduce((sum, e) => sum + e.mastery_level, 0);
      const averageMastery = evaluations.length > 0 ? totalMastery / evaluations.length : 0;

      return {
        name: kp.name,
        averageMastery: averageMastery,
      };
    });
  }, [knowledgePoints, submissions]);

  // 计算分数分布数据
  const scoreDistributionData = useMemo(() => {
    const gradedSubmissions = submissions.filter(s => s.status === "graded" && s.score !== undefined);
    if (gradedSubmissions.length === 0) return [];

    const distribution = {
      "0-59": 0,
      "60-69": 0,
      "70-79": 0,
      "80-89": 0,
      "90-100": 0,
    };

    gradedSubmissions.forEach(s => {
      const score = s.score!;
      if (score < 60) distribution["0-59"]++;
      else if (score < 70) distribution["60-69"]++;
      else if (score < 80) distribution["70-79"]++;
      else if (score < 90) distribution["80-89"]++;
      else distribution["90-100"]++;
    });

    return Object.entries(distribution).map(([range, count]) => ({
      name: range,
      "学生人数": count,
    }));
  }, [submissions]);

  // 评分处理函数
  const handleGradeSubmission = async (data: {
    submissionId: string;
    score: number;
    feedback: string;
    knowledgePointEvaluations: Array<{
      id: string;
      masteryLevel: number;
    }>;
  }) => {
    setIsSubmitting(true);
    const currentSubmission = submissions.find(sub => sub.id === data.submissionId);
    const studentId = currentSubmission?.students?.id || currentSubmission?.student_id; 
    const currentHomeworkId = homeworkId; 

    if (!studentId || !currentHomeworkId) {
      toast({ variant: "destructive", title: "批改失败", description: "缺少学生ID或作业ID" }); // Ensure toast is defined in scope
      setIsSubmitting(false);
      return;
    }

    try {
      console.log(`开始评分操作：学生ID=${studentId}, 提交ID=${data.submissionId}, 分数=${data.score}`);
      
      // 确保状态正确
      const submissionStatus = data.score ? "graded" : "pending";
      console.log(`根据分数(${data.score})设置状态为: ${submissionStatus}`);

      const result = await gradeHomework({
        ...data,
        studentId: studentId,
        homeworkId: currentHomeworkId,
        status: submissionStatus, // 确保传递正确的状态
      });
      
      if (result.success) {
        const updatedSubmissionId = result.submissionId || data.submissionId;
        const studentName = currentSubmission?.students?.name || '未知学生';
        
        console.log(`评分成功：提交ID从 ${data.submissionId} 更新为 ${updatedSubmissionId}, 状态设置为"已批改"`);
        
        // 处理临时记录到正式记录的转换
        const isTemporarySubmission = data.submissionId.startsWith('temp-');
        
        setSubmissions(prev => {
          // 如果是临时记录且返回了新的ID，则替换旧记录
          if (isTemporarySubmission && updatedSubmissionId !== data.submissionId) {
            // 先移除临时记录，再添加新记录
            const withoutTemp = prev.filter(s => s.id !== data.submissionId);
            
            // 确保没有重复记录
            const alreadyHasNew = withoutTemp.some(s => s.id === updatedSubmissionId);
            
            if (alreadyHasNew) {
              // 只更新现有记录
              return withoutTemp.map(s => s.id === updatedSubmissionId ? {
                ...s,
                status: "graded",
                score: data.score,
                teacher_feedback: data.feedback,
                updated_at: new Date().toISOString(),
                knowledge_points_assessed: result.knowledgePointsAssessed
              } : s);
            } else {
              // 添加新记录
              return [
                ...withoutTemp,
                {
                  ...currentSubmission,
                  id: updatedSubmissionId,
                  status: "graded",
                  score: data.score,
                  teacher_feedback: data.feedback,
                  updated_at: new Date().toISOString(),
                  knowledge_points_assessed: result.knowledgePointsAssessed
                }
              ];
            }
          } else {
            // 普通更新现有记录
            return prev.map(s => {
              if (s.id === data.submissionId) {
                return {
                  ...s,
                  id: updatedSubmissionId,
                  status: "graded",
                  score: data.score,
                  teacher_feedback: data.feedback,
                  updated_at: new Date().toISOString(),
                  knowledge_points_assessed: result.knowledgePointsAssessed
                };
              }
              return s;
            });
          }
        });

        toast({
          title: "批改成功",
          description: `学生 ${studentName} 的评分${result.knowledgePointsAssessed ? '和知识点' : ''}已保存。`,
        });

        // 同样更新筛选后的数据
        setFilteredSubmissions(prev => {
          // 采用与上面相同的逻辑，确保临时记录和正式记录的转换
          if (isTemporarySubmission && updatedSubmissionId !== data.submissionId) {
            const withoutTemp = prev.filter(s => s.id !== data.submissionId);
            
            const alreadyHasNew = withoutTemp.some(s => s.id === updatedSubmissionId);
            
            if (alreadyHasNew) {
              return withoutTemp.map(s => s.id === updatedSubmissionId ? {
                ...s,
                status: "graded", 
                score: data.score,
                teacher_feedback: data.feedback,
                updated_at: new Date().toISOString(),
                knowledge_points_assessed: result.knowledgePointsAssessed
              } : s);
            } else {
              return [
                ...withoutTemp,
                {
                  ...currentSubmission,
                  id: updatedSubmissionId,
                  status: "graded",
                  score: data.score,
                  teacher_feedback: data.feedback,
                  updated_at: new Date().toISOString(),
                  knowledge_points_assessed: result.knowledgePointsAssessed
                }
              ];
            }
          } else {
            return prev.map(s => s.id === data.submissionId ? { 
              ...s,
              id: updatedSubmissionId,
              status: "graded", 
              score: data.score,
              teacher_feedback: data.feedback,
              updated_at: new Date().toISOString(),
              knowledge_points_assessed: result.knowledgePointsAssessed
            } : s);
          }
        });
        
        const finalSubmissionId = result.submissionId || data.submissionId;
        setLastGradedSubmissionId(finalSubmissionId);

        setTimeout(() => {
          const itemElement = submissionsContainerRef.current?.querySelector(`[data-submission-id="${finalSubmissionId}"]`);
          itemElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
      } else {
         toast({ variant: "destructive", title: "批改失败", description: result.error || "保存评分时出错" });
      }
    } catch (error: any) {
       toast({ variant: "destructive", title: "批改异常", description: error.message || "处理评分时出错" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 在渲染评分选项的部分添加以下内容
  const renderScoreDisplayOptions = () => {
    return (
      <div className="flex items-center space-x-4 mb-4">
        <span className="text-sm font-medium">分数显示:</span>
        <div className="flex bg-gray-100 rounded-md p-1">
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              scoreDisplayMode === "numeric"
                ? "bg-white shadow"
                : "text-gray-600"
            }`}
            onClick={() => setScoreDisplayMode("numeric")}
          >
            数字分数
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              scoreDisplayMode === "letter"
                ? "bg-white shadow"
                : "text-gray-600"
            }`}
            onClick={() => setScoreDisplayMode("letter")}
          >
            等级
          </button>
        </div>
        {gradingScale && (
          <span className="text-sm text-gray-500">
            使用评级标准: {gradingScale.name}
          </span>
        )}
      </div>
    );
  };

  // 在handleGradeSubmission函数附近，添加处理AI知识点保存的函数
  const handleSaveAiKnowledgePoints = async (newKnowledgePoints: KnowledgePoint[]) => {
    if (!homework || newKnowledgePoints.length === 0) return;
    
    try {
      setIsLoading(true);
      
      // 过滤掉与现有知识点相似的项
      const existingKnowledgePoints = [...knowledgePoints];
      const uniqueNewKnowledgePoints = newKnowledgePoints.filter(newKp => {
        // 检查是否与现有知识点相似
        const isSimilarToExisting = existingKnowledgePoints.some(existingKp => 
          areKnowledgePointsSimilar(newKp.name, existingKp.name)
        );
        
        // 如果相似，记录日志并返回false将其过滤掉
        if (isSimilarToExisting) {
          console.log(`过滤掉相似知识点: ${newKp.name}`);
          return false;
        }
        
        return true;
      });
      
      if (uniqueNewKnowledgePoints.length === 0) {
        toast({
          title: "未发现新知识点",
          description: "AI分析未发现新的知识点，或所有知识点都与现有知识点相似"
        });
        setIsLoading(false);
        return;
      }
      
      // 保存知识点到数据库
      const result = await bulkCreateKnowledgePoints(uniqueNewKnowledgePoints, homework.id);
      
      if (result.success) {
        // 更新知识点列表
        const updatedKnowledgePointsList = await getKnowledgePointsByHomeworkId(homework.id);
        setKnowledgePoints(updatedKnowledgePointsList as unknown as KnowledgePoint[]);
        
        // 根据不同情况显示不同的提示信息
        if (result.skippedPoints && result.skippedPoints.length > 0) {
          toast({
            title: "部分知识点已跳过",
            description: `成功保存 ${uniqueNewKnowledgePoints.length - result.skippedPoints.length} 个知识点，跳过 ${result.skippedPoints.length} 个重复或相似知识点`,
          });
          
          // 可以在控制台显示详细的跳过信息
          console.log("跳过的相似知识点:", result.skippedPoints);
        } else {
          toast({
            title: "保存成功",
            description: `成功保存 ${uniqueNewKnowledgePoints.length} 个知识点到数据库`
          });
        }
        
        // 关闭分析对话框
        setShowKnowledgePointDialog(false);
      } else {
        toast({
          variant: "destructive",
          title: "保存失败",
          description: result.message
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存知识点失败"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 添加一个工具函数用于判断知识点是否相似
  const areKnowledgePointsSimilar = (kp1: string, kp2: string): boolean => {
    // 1. 清理文本：移除标点符号和多余的空格
    const normalize = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5]/g, '') // 移除标点符号，保留中文字符
        .replace(/\s+/g, ' ')                 // 压缩多余空格
        .trim();
    };
    
    const normalized1 = normalize(kp1);
    const normalized2 = normalize(kp2);
    
    // 2. 完全匹配检查
    if (normalized1 === normalized2) return true;
    
    // 3. 包含关系检查
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
      // 如果一个是另一个的子串，且长度差异不大，认为是相似的
      const minLength = Math.min(normalized1.length, normalized2.length);
      const maxLength = Math.max(normalized1.length, normalized2.length);
      
      // 如果长度之比超过80%，认为是相似的
      if (minLength / maxLength > 0.8) return true;
    }
    
    // 4. 余弦相似度或编辑距离检查（简化版）
    // 计算两个字符串中相同字符的数量
    const commonChars = (str1: string, str2: string): number => {
      const set1 = new Set(str1.split(''));
      const set2 = new Set(str2.split(''));
      let common = 0;
      
      for (const char of set1) {
        if (set2.has(char)) common++;
      }
      
      return common;
    };
    
    const common = commonChars(normalized1, normalized2);
    const similarity = (2 * common) / (normalized1.length + normalized2.length);
    
    // 相似度阈值
    return similarity > 0.7;
  };

  // 添加AI提取知识点处理函数
  const handleAIExtractKnowledgePoints = async () => {
    if (homeworkImages.length === 0 && !homework.description) {
      toast({
        variant: "destructive",
        title: "缺少内容",
        description: "请先上传作业图片或确保作业描述不为空，再进行AI提取知识点"
      });
      return;
    }
    
    setIsAiAnalyzing(true);
    toast({
      title: "AI分析中",
      description: "正在分析作业内容提取知识点..."
    });
    
    try {
      // 获取现有知识点用于比对
      const existingKnowledgePoints = await getKnowledgePointsByHomeworkId(homeworkId);
      
      // 导入AI服务
      const { analyzeHomeworkContentWithParams } = await import('@/services/aiService'); 
      
      // 构建分析内容：优先使用作业描述，如果有图片也加入分析
      const analysisContent = homework.description;
      const imageUrls = homeworkImages.map(img => img.url);
      
      // 调用AI分析接口
      const analysisResult = await analyzeHomeworkContentWithParams({
        content: analysisContent,
        imageUrls: imageUrls,
        homeworkId,
        subject: homework.classes.subject || '',
        existingKnowledgePoints: existingKnowledgePoints
      });
      
      if (!analysisResult || !analysisResult.knowledgePoints || analysisResult.knowledgePoints.length === 0) {
        toast({
          title: "未发现新知识点",
          description: "AI分析未发现新的知识点，或所有知识点都与现有知识点相似"
        });
        setIsAiAnalyzing(false);
        return;
      }
      
      // 过滤掉与现有知识点相似的项
      const uniqueNewKnowledgePoints = analysisResult.knowledgePoints.filter(newKp => {
        // 检查是否与现有知识点相似
        const isSimilarToExisting = existingKnowledgePoints.some(existingKp => 
          areKnowledgePointsSimilar(newKp.name, existingKp.name)
        );
        
        return !isSimilarToExisting;
      });
      
      if (uniqueNewKnowledgePoints.length === 0) {
        toast({
          title: "未发现新知识点",
          description: "AI分析未发现新的知识点，或所有知识点都与现有知识点相似"
        });
      } else {
        // 弹出确认对话框，而不是直接更新
        setAiKnowledgePoints(uniqueNewKnowledgePoints);
        setShowKnowledgePointDialog(true);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "提取失败",
        description: error instanceof Error ? error.message : "知识点提取失败"
      });
    } finally {
      setIsAiAnalyzing(false);
    }
  };
  
  // 添加确认保存知识点的函数
  const handleConfirmSaveKnowledgePoints = async () => {
    if (!homework || aiKnowledgePoints.length === 0) return;
    
    try {
      // 保存到数据库
      setIsLoading(true);
      
      // 真实调用保存接口
      const result = await bulkCreateKnowledgePoints(aiKnowledgePoints, homework.id);
      
      if (result.success) {
        // 直接调用handleKnowledgePointsChanged刷新知识点列表
        await handleKnowledgePointsChanged();
        
        // 根据不同情况显示不同的提示信息
        if (result.skippedPoints && result.skippedPoints.length > 0) {
          toast({
            title: "部分知识点已跳过",
            description: `成功保存 ${aiKnowledgePoints.length - result.skippedPoints.length} 个知识点，跳过 ${result.skippedPoints.length} 个重复或相似知识点`,
          });
          
          // 可以在控制台显示详细的跳过信息
          console.log("跳过的相似知识点:", result.skippedPoints);
        } else {
          toast({
            title: "保存成功",
            description: `成功保存 ${aiKnowledgePoints.length} 个知识点到数据库`
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "保存失败",
          description: result.message
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存知识点失败"
      });
    } finally {
      setIsLoading(false);
      setShowKnowledgePointDialog(false);
      setAiKnowledgePoints([]);
    }
  };
  
  // 取消保存知识点
  const handleCancelSaveKnowledgePoints = () => {
    setShowKnowledgePointDialog(false);
    setAiKnowledgePoints([]);
    toast({
      title: "已取消",
      description: "已取消保存知识点"
    });
  };

  // 在component中添加一个处理知识点变更的函数
  const handleKnowledgePointsChanged = async () => {
    console.log('知识点已更新，重新加载知识点列表');
    if (homework) {
      const updatedKnowledgePoints = await getKnowledgePointsByHomeworkId(homework.id);
      setKnowledgePoints(updatedKnowledgePoints as unknown as KnowledgePoint[]);
      toast({
        title: "知识点列表已更新",
        description: "知识点列表已成功刷新"
      });
    }
  };

  // 获取班级学生的有效ID映射
  const fetchStudentIdMapping = async (classId: string) => {
    setValidationInProgress(true);
    try {
      console.log('获取班级学生ID映射，班级ID:', classId);
      
      // 直接使用supabase获取学生列表
      const { data: students, error } = await supabase
        .from('students')
        .select('id, name, student_id')
        .eq('class_id', classId);
        
      if (error) {
        console.error('获取班级学生列表失败:', error);
        toast({
          variant: "destructive",
          title: "学生信息加载失败",
          description: `获取班级学生失败: ${error.message}`
        });
        return;
      }
      
      if (!students || students.length === 0) {
        console.warn('班级中没有学生记录');
        toast({
          variant: "destructive",
          title: "学生信息加载失败",
          description: "班级中没有学生记录"
        });
        return;
      }
      
      // 创建ID映射关系
      const idMapping: {[key: string]: {id: string, name: string}} = {};
      
      students.forEach(student => {
        // 以学生ID为键
        idMapping[student.id] = {
          id: student.id,
          name: student.name
        };
        
        // 以临时ID格式为键
        idMapping[`temp-${student.id}`] = {
          id: student.id,
          name: student.name
        };
        
        // 如果有学号，也以学号为键
        if (student.student_id) {
          idMapping[student.student_id] = {
            id: student.id,
            name: student.name
          };
        }
      });
      
      console.log(`成功获取 ${students.length} 名学生的ID映射`);
      setStudentIdMapping(idMapping);
      
      toast({
        title: "学生信息加载成功",
        description: `已加载 ${students.length} 名学生的信息用于评分`
      });
    } catch (error) {
      console.error('获取学生ID映射异常:', error);
      toast({
        variant: "destructive",
        title: "学生信息加载失败",
        description: "无法获取有效的学生信息，评分可能无法正确保存"
      });
    } finally {
      setValidationInProgress(false);
    }
  };

  if (isLoading) return <Loading />;
  if (error) return <div className="p-6">{error}</div>;
  if (!homework) return <div>作业不存在</div>;

  // 将服务器状态映射到组件使用的状态
  const mapSubmissionStatus = (status: string): SubmissionStatus => {
    console.log(`映射提交状态: ${status}`);
    // 确保状态字符串有效
    if (!status) {
      console.warn('映射到空状态，默认设为未提交');
      return "not_submitted";
    }
    
    // 忽略大小写，进行规范化处理
    const normalizedStatus = status.toLowerCase().trim();
    
    // 特殊处理：如果submission有分数，无论状态如何都应该显示为已批改
    if (typeof arguments[1] === 'object' && arguments[1] && arguments[1].score) {
      console.log(`检测到分数(${arguments[1].score})但状态为"${normalizedStatus}"，强制映射为"graded"`);
      return "graded";
    }
    
    switch (normalizedStatus) {
      case "graded": return "graded";
      case "submitted": return "submitted";
      case "late": return "late";
      case "pending": return "pending";
      case "missing": return "not_submitted";
      case "not_submitted": return "not_submitted";
      case "absent": return "absent";
      default:
        console.warn(`未知状态: ${status}，默认设为未提交`);
        return "not_submitted";
    }
  };

  return (
    <div className={`space-y-6 ${isMobileView ? 'pb-16' : ''}`}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">作业详情</h1>
        
        {/* 添加实时更新切换按钮 */}
        <div className="ml-auto flex items-center">
          <div className="flex items-center mr-3">
            <span className="text-sm text-muted-foreground mr-2">实时更新</span>
            <button 
              onClick={() => setRealtimeEnabled(prev => !prev)}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${realtimeEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
            >
              <span 
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${realtimeEnabled ? 'translate-x-5' : 'translate-x-0'}`} 
              />
            </button>
          </div>
          
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              最后更新: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{homework.title}</CardTitle>
              <CardDescription>
                {homework.classes.subject} - {homework.classes.name}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end">
              <Badge variant="outline" className="mb-2">
                截止日期: {formatDate(homework.due_date)}
              </Badge>
              <p className="text-sm text-muted-foreground">
                由 {homework.teachers.name} 创建于{" "}
                {formatDate(homework.created_at)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as "details" | "submissions" | "analysis")}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">
                <BookOpen className="h-4 w-4 mr-2" />
                作业详情
              </TabsTrigger>
              <TabsTrigger value="submissions">
                <PenLine className="h-4 w-4 mr-2" />
                学生作业
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <ChartPieIcon className="h-4 w-4 mr-2" />
                数据分析
              </TabsTrigger>
            </TabsList>

            {/* Details Tab Content */}
            <TabsContent value="details" className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">作业说明</h3>
                <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                  {homework.description}
                </div>
              </div>

              {/* 知识点分析部分 - 移动到作业详情中 */}
              <div className="mt-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium mb-2 flex items-center">
                    <BrainCircuit className="h-4 w-4 mr-2" />
                    知识点分析
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAIExtractKnowledgePoints}
                    disabled={isLoading}
                    className="flex items-center gap-1"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI分析知识点
                  </Button>
                </div>
                
                {isAiAnalyzing ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">
                      AI正在分析作业内容，识别知识点...
                    </p>
                  </div>
                ) : (
                  <div>
                    {knowledgePoints.length === 0 ? (
                      <div className="bg-muted/50 rounded-md p-8 text-center border border-dashed">
                        <p className="text-sm text-muted-foreground">
                          尚未发现知识点，点击"AI分析知识点"按钮使用AI分析作业内容
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                        {knowledgePoints.map((kp) => (
                          <Card key={kp.id} className="bg-muted/30">
                            <CardHeader className="p-3 pb-2">
                              <CardTitle className="text-base">{kp.name}</CardTitle>
                              {kp.description && (
                                <CardDescription className="text-xs line-clamp-2">
                                  {kp.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-4">
                <h3 className="font-medium">作业图片</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={handleUploadHomeworkImage}
                >
                  <ImagePlus className="h-4 w-4" />
                  上传作业图片
                </Button>
              </div>
              
              <div 
                className="bg-muted/50 rounded-md p-8 text-center border border-dashed cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={handleUploadHomeworkImage}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {isUploadingImage ? (
                  <div className="space-y-3">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground">正在上传图片...</p>
                  </div>
                ) : homeworkImages.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {homeworkImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className={`relative h-32 w-full overflow-hidden rounded-md ${image.status === 'uploading' ? 'bg-muted animate-pulse' : ''}`}>
                          <img 
                            src={image.url} 
                            alt={image.name} 
                              className={`h-full w-full object-cover rounded-md ${image.status === 'uploading' ? 'opacity-50' : ''}`}
                            />
                            {image.status === 'uploading' && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                              </div>
                            )}
                            {image === lastUploadedImage && (
                              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                新上传
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHomeworkImages(prev => prev.filter((_, i) => i !== index));
                                if (lastUploadedImage && lastUploadedImage.url === image.url) {
                                  setLastUploadedImage(null);
                                }
                                toast({
                                  title: "已删除",
                                  description: "作业图片已删除"
                                });
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div 
                        className="h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center hover:border-primary transition-colors"
                        onClick={handleUploadHomeworkImage}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-gray-400"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">点击添加更多图片或拖放图片到此处</p>
                  </div>
                ) : (
                  <>
                    <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">点击上传作业图片供AI分析</p>
                  </>
                )}
              </div>

              {knowledgePoints.length > 0 && (
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium mb-2">相关知识点</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleAIExtractKnowledgePoints}
                    >
                      <BrainCircuit className="h-4 w-4 mr-1" />
                      AI提取知识点
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {knowledgePoints.map((kp) => (
                      <div key={kp.id} className="flex items-center">
                        <Badge variant="secondary" className="mr-1">
                          <BrainCircuit className="h-3 w-3 mr-1" />
                          {kp.name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Submissions Tab Content - Ensure this one is closed correctly */ }
            <TabsContent value="submissions">
              <div className="space-y-4"> {/* This div starts at L1611 */} 
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">学生作业情况</h3>
                    <div className="flex gap-2">
                      <Button
                        variant={viewMode === "cards" ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setViewMode("cards")}
                        title="卡片视图"
                      >
                        <Grid2X2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "table" ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setViewMode("table")}
                        title="表格视图"
                      >
                        <ListIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "ai" ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setViewMode("ai")}
                        title="AI批改"
                      >
                        <BrainCircuit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Input
                        placeholder="搜索学生..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-8"
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    
                    <Select
                      value={statusFilter.join(",")}
                      onValueChange={(value) => {
                        setStatusFilter(value.split(","));
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="筛选状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有状态</SelectItem>
                        <SelectItem value="graded">已批改</SelectItem>
                        <SelectItem value="submitted">已提交</SelectItem>
                        <SelectItem value="pending">待完成</SelectItem>
                        <SelectItem value="not_submitted">未交作业</SelectItem>
                        <SelectItem value="absent">请假</SelectItem>
                      </SelectContent>
                    </Select>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Filter className="h-4 w-4 mr-2" />
                          操作
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>批量操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={handleExportResults}
                          disabled={isExporting}
                        >
                          {isExporting ? (
                            <>
                              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                              导出中...
                            </>
                          ) : (
                            <>
                          <Download className="h-4 w-4 mr-2" />
                              导出Excel
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleUploadScans}>
                          <Upload className="h-4 w-4 mr-2" />
                          上传扫描件
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* 添加批改模式说明 */}
                <div className="mb-4 px-4 py-2 bg-muted/40 rounded-md text-sm text-muted-foreground">
                  <p>
                    {viewMode === "cards" ? (
                      <span><b>卡片视图</b>: 提供直观的滑块评分界面，适合批量快速批改</span>
                    ) : viewMode === "table" ? (
                      <span><b>表格视图</b>: 提供详细的评估界面，适合进行深度评价和知识点分析</span>
                    ) : (
                      <span><b>AI批改</b>: 使用人工智能自动识别和批改作业内容</span>
                    )}
                  </p>
                </div>

                {/* Container for different view modes */}
                <div ref={submissionsContainerRef}>
                  {/* Cards View */}
                {viewMode === "cards" && (
                  filteredSubmissions.length > 0 ? (
                    <GradeCardView 
                      data-grade-card-view
                      submissions={filteredSubmissions}
                      knowledgePoints={knowledgePoints}
                      isSubmitting={isSubmitting}
                      onGraded={async (submissionId, score, feedback, knowledgePointEvaluations, status) => {
                        setIsSubmitting(true);
                        const currentSubmission = submissions.find(sub => sub.id === submissionId);
                        const studentId = currentSubmission?.students?.id || currentSubmission?.student_id;
                        const currentHomeworkId = homeworkId;

                        if (!studentId || !currentHomeworkId) {
                          toast({
                            variant: "destructive",
                            title: "批改失败",
                            description: "缺少学生ID或作业ID，无法保存评分。",
                          });
                          setIsSubmitting(false);
                          return;
                        }

                        try {
                          const gradeData = {
                            submissionId,
                            score,
                            feedback,
                            knowledgePointEvaluations,
                            studentId,
                            homeworkId: currentHomeworkId,
                            status // 添加status参数
                          };
                          const result = await gradeHomework(gradeData);
                          
                          if (result.success) {
                            const updatedSubmissionId = result.submissionId || submissionId;
                            const studentName = currentSubmission?.students?.name || '未知学生';
                            
                            // 直接更新本地状态，避免重新获取数据
                            setSubmissions(prev => 
                              prev.map(s => {
                                if (s.id === submissionId) {
                                  // 使用传入的status或默认为"graded"
                                  const newStatus = status || "graded";
                                  return {
                                    ...s,
                                    id: updatedSubmissionId,
                                    status: newStatus,
                                    score: score,
                                    teacher_feedback: feedback,
                                    updated_at: new Date().toISOString(), 
                                    knowledge_points_assessed: result.knowledgePointsAssessed, 
                                  };
                                }
                                return s; 
                              })
                            );
                            
                            toast({
                              title: "批改成功",
                              description: status === "absent" ? 
                                `已将 ${studentName} 标记为缺勤` :
                                status === "not_submitted" ? 
                                  `已将 ${studentName} 标记为未交作业` :
                                  `学生 ${studentName} 的评分已成功保存。`,
                            });

                            setFilteredSubmissions(prev => 
                              prev.map(s => s.id === submissionId ? 
                                {...s, 
                                  id: updatedSubmissionId,
                                  status: status || "graded", 
                                  score: score,
                                  teacher_feedback: feedback,
                                  updated_at: new Date().toISOString(),
                                  knowledge_points_assessed: result.knowledgePointsAssessed
                                } : s
                              )
                            );
                                  
                            const finalSubmissionId = result.submissionId || submissionId;
                            setLastGradedSubmissionId(finalSubmissionId);

                            setTimeout(() => {
                              const cardElement = submissionsContainerRef.current?.querySelector(`[data-submission-id="${finalSubmissionId}"]`);
                              cardElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }, 100);

                          } else {
                            toast({
                              variant: "destructive",
                              title: "批改失败",
                              description: result.error || "保存评分时发生未知错误。",
                            });
                          }
                        } catch (error: any) {
                          console.error("评分处理异常:", error);
                          toast({
                            variant: "destructive",
                            title: "批改异常",
                            description: error.message || "处理评分时发生严重错误。",
                          });
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      onBatchGraded={async (submissionIds, score, feedback) => {
                        // 实现批量评分的本地状态更新
                        setSubmissions(prev => 
                          prev.map(s => {
                            if (submissionIds.includes(s.id)) {
                              return {
                                ...s,
                                status: "graded",
                                score: score,
                                teacher_feedback: feedback,
                                updated_at: new Date().toISOString(),
                              };
                            }
                            return s;
                          })
                        );
                        
                        // 同样更新过滤后的列表
                        setFilteredSubmissions(prev => 
                          prev.map(s => {
                            if (submissionIds.includes(s.id)) {
                              return {
                                ...s,
                                status: "graded",
                                score: score,
                                teacher_feedback: feedback,
                                updated_at: new Date().toISOString(),
                              };
                            }
                            return s;
                          })
                        );
                        
                        toast({
                          title: "批量批改成功",
                          description: `已批改 ${submissionIds.length} 份作业`,
                        });
                        
                        setLastGradedSubmissionId(null);
                      }}
                      lastGradedSubmissionId={lastGradedSubmissionId}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      没有找到符合条件的学生
                    </div>
                  )
                )}

                  {/* Table View */} 
                {viewMode === "table" && (
                  filteredSubmissions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>学生</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>分数</TableHead>
                          <TableHead>批改日期</TableHead>
                          <TableHead>知识点掌握情况</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSubmissions.map((submission) => {
                          const status = statusMap[submission.status as keyof typeof statusMap];
                          const StatusIcon = status.icon;
                          return (
                              <TableRow key={submission.id} data-submission-id={submission.id}> {/* Add data-submission-id here too */}
                              <TableCell>{submission.students.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <Badge
                                    variant="outline"
                                    className={`flex items-center gap-1 ${status.color}`}
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {status.label}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                {submission.status === "graded"
                                  ? `${submission.score}/100`
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                  {submission.status === "graded" && submission.updated_at
                                    ? formatDate(submission.updated_at)
                                    : submission.submitted_at
                                      ? formatDate(submission.submitted_at)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {(submission.student_knowledge_mastery?.length > 0) ? (
                                      // 使用新表获取知识点评估数据
                                      submission.student_knowledge_mastery.map(
                                        (evaluation) => {
                                          // 确保评估对象具有必要字段
                                          const masteryLevel = evaluation.mastery_level;
                                          const knowledgePtName = evaluation.knowledge_points?.name || "未知知识点";
                                          // 获取掌握等级
                                          const masteryGrade = evaluation.mastery_grade || 
                                            masteryLevelToGrade(masteryLevel);

                                          // 根据等级确定颜色
                                          const gradeColor = 
                                            masteryGrade === 'A' ? 'bg-green-100 text-green-800 border-green-200' : 
                                            masteryGrade === 'B' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                                            masteryGrade === 'C' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                            masteryGrade === 'D' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                                            'bg-red-100 text-red-800 border-red-200';

                                            return (
                                      <Badge
                                        key={evaluation.id}
                                        variant="outline"
                                            className={cn(
                                              "px-2 py-0.5",
                                              gradeColor
                                            )}
                                          >
                                            <span className="flex items-center gap-1">
                                              {knowledgePtName}: {masteryGrade} ({masteryLevel}%)
                                            </span>
                                      </Badge>
                                        );
                                      }
                                    )
                                  ) : (
                                    <span className="text-muted-foreground">未评估</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenGradeDialog(submission.students.id)}
                                >
                                  <PenLine className="h-3.5 w-3.5 mr-1" />
                                  详细批改
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      没有找到符合条件的学生
                    </div>
                  )
                )}

                {/* AI View */} 
                {viewMode === "ai" && (
                  <div className="mt-6">
                    <div className="bg-muted p-6 rounded-lg border border-dashed text-center">
                      <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-primary/60" />
                      <h3 className="text-lg font-medium mb-2">AI批改助手</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        上传学生作业的扫描件，AI将自动识别内容并批改
                      </p>
                      <Button onClick={handleUploadScans}>
                        <Upload className="h-4 w-4 mr-2" />
                        上传扫描件
                      </Button>
                    </div>
                  </div>
                )}

                {/* Scoring display options */} 
                {renderScoreDisplayOptions()}
                </div>
              </div>
            </TabsContent>

            {/* Analysis Tab Content - Start with only the first three cards uncommented */}
            <TabsContent value="analysis">
              <div className="flex justify-end mb-4">
                {/* ... Tab controls (numeric/letter score mode buttons) ... */}
                <div className="bg-muted p-1 rounded-md flex">
                  <Button 
                    variant={scoreDisplayMode === "numeric" ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setScoreDisplayMode("numeric")}
                    className="text-xs h-8"
                  >
                    分数模式
                  </Button>
                  <Button 
                    variant={scoreDisplayMode === "letter" ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setScoreDisplayMode("letter")}
                    className="text-xs h-8"
                  >
                    等级模式
                  </Button>
                </div>
              </div>
                
              {/* 1. Card: 数据概览卡片 */}
              <Card className="mb-6">
                  <CardHeader className="pb-2">
                  <CardTitle className="text-base">数据概览</CardTitle>
                  <CardDescription>当前作业的关键指标</CardDescription>
                  </CardHeader>
                  <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {/* ... Grid items for stats ... */}
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.filter(s => s.status === "graded").length > 0 
                            ? (scoreDisplayMode === "numeric" 
                               ? (submissions.filter(s => s.status === "graded").reduce((sum, s) => sum + (s.score || 0), 0) / 
                                 submissions.filter(s => s.status === "graded").length).toFixed(1)
                               : scoreToGrade(submissions.filter(s => s.status === "graded").reduce((sum, s) => sum + (s.score || 0), 0) / 
                                 submissions.filter(s => s.status === "graded").length))
                            : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">平均{scoreDisplayMode === "numeric" ? "分" : "等级"}</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.length > 0
                            ? `${((submissions.filter(s => s.status === "graded" || s.status === "submitted").length / 
                              submissions.filter(s => s.status !== "not_submitted" && s.status !== "absent").length) * 100).toFixed(0)}%`
                            : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">提交率</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.filter(s => s.status === "graded").length}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">已批改</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.filter(s => s.status === "pending").length}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">待提交</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.filter(s => s.status === "not_submitted").length}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">未交作业</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.filter(s => s.status === "absent").length}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">请假</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {knowledgePoints.length}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">知识点数</div>
                      </div>
                    </div>
                  </CardContent>
              </Card>

              {/* 2. Card: 分数分布图表 */}
              {submissions.filter(s => s.status === "graded").length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">分数分布</CardTitle>
                    <CardDescription>已批改作业的分数分布情况</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={scoreDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="学生人数" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 3. Card: 知识点掌握度雷达图/柱状图 */}
              {knowledgePoints.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">知识点平均掌握度</CardTitle>
                    <CardDescription>各知识点的平均掌握情况</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={knowledgePointAverageMasteryData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="平均掌握度" dataKey="averageMastery" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                        <Legend />
                        <Tooltip formatter={(value) => `${value}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 4. Card: 知识点掌握水平分布 - UNCOMMENTING THIS CARD */}
              {knowledgePointDistributionData.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">知识点掌握水平分布</CardTitle>
                    <CardDescription>各知识点不同掌握水平的学生人数</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      {/* Ensure knowledgePointDistributionData is defined via useMemo */}
                      <BarChart data={knowledgePointDistributionData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="优秀" stackId="a" fill="#82ca9d" />
                        <Bar dataKey="良好" stackId="a" fill="#8884d8" />
                        <Bar dataKey="中等" stackId="a" fill="#ffc658" />
                        <Bar dataKey="不及格" stackId="a" fill="#ff8042" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* 5. Card: 学生个人成绩与知识点掌握情况列表 - UNCOMMENTING THIS CARD */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">学生表现概览</CardTitle>
                  <CardDescription>每位学生的总分及各知识点掌握情况</CardDescription>
                </CardHeader>
                <CardContent>
                  {submissions.filter(s => s.status === "graded").length > 0 ? (
                    <div className="space-y-4">
                      {submissions
                        .filter(s => s.status === "graded")
                        .sort((a, b) => (b.score || 0) - (a.score || 0)) // Sort by score descending
                        .slice(0, 5) // Add slice to get only the top 5
                        .map((studentSubmission, index) => {
                          const studentName = studentSubmission.students.name;
                          const overallScore = studentSubmission.score || 0;
                          const rank = index + 1;

                          let badgeColor = "bg-gray-100 text-gray-800";
                          let performanceIcon = <Award className="h-4 w-4 text-gray-500" />;
                          if (overallScore >= 90) {
                            badgeColor = "bg-green-100 text-green-800";
                            performanceIcon = <Award className="h-4 w-4 text-green-500" />;
                          } else if (overallScore >= 75) {
                            badgeColor = "bg-blue-100 text-blue-800";
                            performanceIcon = <CheckCircle className="h-4 w-4 text-blue-500" />;
                          } else if (overallScore >= 60) {
                            badgeColor = "bg-yellow-100 text-yellow-800";
                            performanceIcon = <Clock className="h-4 w-4 text-yellow-500" />;
                          } else {
                            badgeColor = "bg-red-100 text-red-800";
                            performanceIcon = <Sparkles className="h-4 w-4 text-red-500" />;
                          }

                          return (
                            <details key={studentSubmission.id} className="group bg-muted/30 p-3 rounded-lg">
                              <summary className="flex justify-between items-center cursor-pointer list-none">
                                <div className="flex items-center space-x-3">
                                  <span className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold ${badgeColor}`}>
                                    {rank}
                                  </span>
                                  <span className="font-medium">{studentName}</span>
                                  {performanceIcon}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground">总分:</span>
                                  <span className={`font-semibold ${overallScore < 60 ? 'text-red-600' : 'text-primary'}`}>
                                    {getScoreDisplay(overallScore)}
                                  </span>
                                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                                </div>
                              </summary>
                              <div className="mt-3 pt-3 border-t border-border/60">
                                <h4 className="text-sm font-medium mb-2">知识点掌握情况:</h4>
                                {studentSubmission.student_knowledge_mastery && studentSubmission.student_knowledge_mastery.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {studentSubmission.student_knowledge_mastery.map(kp => {
                                      const masteryGrade = masteryLevelToGrade(kp.mastery_level);
                                      const gradeColor = 
                                        masteryGrade === 'A' ? 'bg-green-100 text-green-800 border-green-200' : 
                                        masteryGrade === 'B' ? 'bg-blue-100 text-blue-800 border-blue-200' : 
                                        masteryGrade === 'C' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 
                                        masteryGrade === 'D' ? 'bg-orange-100 text-orange-800 border-orange-200' : 
                                        'bg-red-100 text-red-800 border-red-200';
                                      return (
                                        <Badge key={kp.id} variant="outline" className={cn("px-2 py-1 text-xs justify-between", gradeColor)}>
                                          <span>{kp.knowledge_points?.name || "未知知识点"}</span>
                                          <span>{masteryGrade} ({kp.mastery_level}%)</span>
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">无知识点评估数据。</p>
                                )}
                              </div>
                            </details>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">尚无已批改的作业可供分析。</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isGradeDialogOpen && (
        <TeacherGradeHomeworkDialog
          homeworkId={homeworkId}
          studentId={selectedStudentId}
          open={isGradeDialogOpen}
          onOpenChange={setIsGradeDialogOpen}
          onGraded={handleGraded}
          isSubmitting={isSubmitting}
          knowledgePoints={knowledgePoints}
          gradingScaleId={homework?.grading_scale_id || null}
          onSaveAiKnowledgePoints={handleSaveAiKnowledgePoints}
        />
      )}
      
      {/* 添加知识点确认对话框 */}
      <AlertDialog open={showKnowledgePointDialog} onOpenChange={setShowKnowledgePointDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认保存新知识点</AlertDialogTitle>
            <AlertDialogDescription>
              AI分析发现了以下新知识点，请确认是否保存到数据库。
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="max-h-80 overflow-y-auto my-4">
            <div className="space-y-3">
              {aiKnowledgePoints.map((kp, index) => (
                <div key={kp.id} className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{index + 1}. {kp.name}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      新知识点
                    </Badge>
                  </div>
                  {kp.description && (
                    <p className="text-sm text-muted-foreground mt-1">{kp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSaveKnowledgePoints}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSaveKnowledgePoints}>
              确认保存
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 