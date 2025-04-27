import React, { useState, useEffect, useMemo } from "react";
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
import { getHomeworkById, getHomeworkSubmissions, gradeHomework } from "@/services/homeworkService";
import { getKnowledgePointsByHomeworkId } from "@/services/knowledgePointService";
import { 
  getGradingScaleWithLevels, 
  scoreToCustomGrade, 
  GradingScaleLevel 
} from "@/services/gradingService";
import { AIKnowledgePointAnalyzer, KnowledgePoint } from '@/components/homework/AIKnowledgePointAnalyzer';
import { bulkCreateKnowledgePoints, updateKnowledgePointEvaluations } from '@/services/knowledgePointService';

// 导入模拟数据
import { mockApi } from "@/data/mockData";

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

const statusMap = {
  pending: { label: "待完成", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  submitted: { label: "已提交", icon: CheckCircle, color: "bg-blue-100 text-blue-800" },
  graded: { label: "已批改", icon: Award, color: "bg-green-100 text-green-800" },
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
  students: {
    id: string;
    name: string;
    student_id?: string;
  };
  teacher_feedback?: string;
  feedback?: string;
  knowledge_point_evaluation?: any[];
  submission_knowledge_points?: any[];
}

interface KnowledgePoint {
  id: string;
  name: string;
  description?: string;
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
  const [currentTab, setCurrentTab] = useState<"details" | "submissions" | "analysis" | "knowledgePoints">("details");
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
  const [homeworkImages, setHomeworkImages] = useState<{url: string; name: string}[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // 添加知识点确认对话框状态
  const [showKnowledgePointDialog, setShowKnowledgePointDialog] = useState(false);
  const [aiKnowledgePoints, setAiKnowledgePoints] = useState<KnowledgePoint[]>([]);
  // 添加知识点分析对话框状态
  const [showAIAnalysisDialog, setShowAIAnalysisDialog] = useState(false);

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
          setHomework(data);
          
          // 获取知识点
          const kpData = await getKnowledgePointsByHomeworkId(homeworkId);
          console.log("获取到的知识点:", kpData);
          setKnowledgePoints(kpData);
          
          // 获取作业的评级标准
          if (data.grading_scale_id) {
            const gradingScaleData = await getGradingScaleWithLevels(data.grading_scale_id);
            if (gradingScaleData) {
              setGradingScale({
                id: gradingScaleData.id || "",
                name: gradingScaleData.name,
                levels: gradingScaleData.levels || []
              });
            }
          }
          
          // 获取作业提交情况
          await fetchSubmissions();
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

  const fetchSubmissions = async () => {
    setIsLoadingSubmissions(true);
    try {
      // 使用实际的Supabase服务
      const submissionsData = await getHomeworkSubmissions(homeworkId);
      
      setSubmissions(submissionsData);
      setFilteredSubmissions(submissionsData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "错误",
        description: `获取提交记录失败: ${error.message}`
      });
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleGraded = async () => {
    setIsGradeDialogOpen(false);
    setSelectedSubmissionId(null);
    await fetchSubmissions();
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

  const handleExportResults = () => {
    toast({
      title: "导出成功",
      description: "批改结果已导出到Excel文件"
    });
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
      
      try {
        // TODO: 实际上传逻辑，连接到Supabase Storage
        // 示例:
        // const { data, error } = await supabase.storage
        //   .from('homework_images')
        //   .upload(`${homeworkId}/${Date.now()}_${file.name}`, file);
        
        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 创建临时URL
        const imageUrl = URL.createObjectURL(file);
        
        // 添加到图片列表
        setHomeworkImages(prev => [...prev, {
          url: imageUrl,
          name: file.name
        }]);
        
        // 上传成功提示
        toast({
          title: "上传成功",
          description: "作业图片已上传，AI分析中..."
        });
        
        // 模拟AI分析延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 分析完成提示
        toast({
          title: "分析完成",
          description: "AI已完成图片分析，已提取3个知识点"
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "上传失败",
          description: error instanceof Error ? error.message : "上传图片时发生错误"
        });
      } finally {
        setIsUploadingImage(false);
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
      
      try {
        // 模拟上传延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 创建临时URL
        const imageUrl = URL.createObjectURL(file);
        
        // 添加到图片列表
        setHomeworkImages(prev => [...prev, {
          url: imageUrl,
          name: file.name
        }]);
        
        // 上传成功提示
        toast({
          title: "上传成功",
          description: "作业图片已上传，AI分析中..."
        });
        
        // 模拟AI分析延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 分析完成提示
        toast({
          title: "分析完成",
          description: "AI已完成图片分析，已提取3个知识点"
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "上传失败",
          description: error instanceof Error ? error.message : "上传图片时发生错误"
        });
      } finally {
        setIsUploadingImage(false);
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
    try {
      // 使用实际的Supabase服务
      const result = await gradeHomework(data);
      
      if (result.success) {
        toast({
          title: "评分成功",
          description: "学生成绩和知识点掌握情况已更新"
        });
        await fetchSubmissions(); // 重新加载提交数据
      } else {
        toast({
          title: "评分失败",
          description: "评分失败"
        });
      }
    } catch (error) {
      toast({
        title: "评分出错",
        description: `评分出错: ${error.message}`
      });
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
        setKnowledgePoints(updatedKnowledgePointsList);
        
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
        setShowAIAnalysisDialog(false);
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
    if (homeworkImages.length === 0) {
      toast({
        variant: "destructive",
        title: "缺少图片",
        description: "请先上传作业图片，再进行AI提取知识点"
      });
      return;
    }
    
    setIsLoading(true);
    toast({
      title: "AI分析中",
      description: "正在分析作业图片提取知识点..."
    });
    
    try {
      // TODO: 这里应该先从数据库获取所有现有知识点
      // const existingKnowledgePoints = await fetchAllKnowledgePoints();
      
      // 模拟获取现有知识点
      const existingKnowledgePoints = [...knowledgePoints];
      
      // 模拟AI分析延迟
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 模拟新知识点
      const aiAnalyzedKnowledgePoints = [
        {
          id: `ai-${Date.now()}-1`,
          name: "图像分割与处理",
          description: "理解并掌握基本的图像分割算法及图像预处理技术",
          isNew: true
        },
        {
          id: `ai-${Date.now()}-2`,
          name: "卷积神经网络原理",
          description: "理解CNN的基本结构和工作原理，掌握卷积、池化等操作",
          isNew: true
        },
        {
          id: `ai-${Date.now()}-3`,
          name: "特征提取与识别",
          description: "掌握图像特征提取的关键技术和应用方法",
          isNew: true
        },
        // 添加一个与现有知识点相似的项作为测试
        {
          id: `ai-${Date.now()}-4`,
          name: "反比例函数的图像",
          description: "理解反比例函数的图像特征和变换规律",
          isNew: true
        }
      ];
      
      // 过滤掉与现有知识点相似的项
      const uniqueNewKnowledgePoints = aiAnalyzedKnowledgePoints.filter(newKp => {
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
      } else {
        // 弹出确认对话框，而不是直接更新
        setAiKnowledgePoints(uniqueNewKnowledgePoints as KnowledgePoint[]);
        setShowKnowledgePointDialog(true);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "提取失败",
        description: error instanceof Error ? error.message : "知识点提取失败"
      });
    } finally {
      setIsLoading(false);
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
        // 更新知识点列表
        // 先获取最新的知识点列表，确保包含后端处理的结果
        const updatedKnowledgePointsList = await getKnowledgePointsByHomeworkId(homework.id);
        setKnowledgePoints(updatedKnowledgePointsList);
        
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

  if (isLoading) return <Loading />;
  if (error) return <div className="p-6">{error}</div>;
  if (!homework) return <div>作业不存在</div>;

  // 将服务器状态映射到组件使用的状态
  const mapSubmissionStatus = (status: string): SubmissionStatus => {
    switch (status) {
      case "graded": return "graded";
      case "submitted": return "submitted";
      case "late": return "late";
      case "pending": return "pending";
      case "missing": return "not_submitted";
      default: return "not_submitted";
    }
  };

  return (
    <div className="space-y-6">
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
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
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
              <TabsTrigger value="knowledgePoints">
                <BrainCircuit className="h-4 w-4 mr-2" />
                知识点分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">作业说明</h3>
                <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                  {homework.description}
                </div>
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
                          <img 
                            src={image.url} 
                            alt={image.name} 
                            className="h-32 w-full object-cover rounded-md" 
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHomeworkImages(prev => prev.filter((_, i) => i !== index));
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

            <TabsContent value="submissions">
              <div className="space-y-4">
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
                        <DropdownMenuItem onClick={handleExportResults}>
                          <Download className="h-4 w-4 mr-2" />
                          导出结果
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

                {viewMode === "cards" && (
                  filteredSubmissions.length > 0 ? (
                    <GradeCardView 
                      data-grade-card-view
                      submissions={filteredSubmissions}
                      knowledgePoints={knowledgePoints}
                      onGraded={(submissionId, score, feedback, knowledgePointEvaluations) => {
                        // 在这里处理评分提交
                        // 更新提交状态
                        const updatedSubmission = {
                          ...filteredSubmissions.find(s => s.id === submissionId),
                          status: "graded",
                          score: score,
                          teacher_feedback: feedback,
                        };
                        
                        // 更新状态
                        setSubmissions(prev => 
                          prev.map(s => s.id === submissionId ? updatedSubmission : s)
                        );
                        
                        // 显示成功提示
                        toast({
                          title: "批改成功",
                          description: "学生成绩和知识点掌握情况已更新"
                        });
                      }}
                      onBatchGraded={(submissionIds, score, feedback) => {
                        // 处理批量评分
                        setSubmissions(prev => 
                          prev.map(s => 
                            submissionIds.includes(s.id) 
                              ? {...s, status: "graded", score, teacher_feedback: feedback} 
                              : s
                          )
                        );
                        
                        toast({
                          title: "批量评分成功",
                          description: `已批量评分 ${submissionIds.length} 名学生的作业`
                        });
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      没有找到符合条件的学生
                    </div>
                  )
                )}

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
                            <TableRow key={submission.id}>
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
                                {submission.submit_date
                                  ? formatDate(submission.submit_date)
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {submission.knowledge_point_evaluation?.map(
                                    (evaluation) => (
                                      <Badge
                                        key={evaluation.id}
                                        variant="outline"
                                        className={
                                          evaluation.mastery_level >= 80
                                            ? "bg-green-100 text-green-800 border-green-200"
                                            : evaluation.mastery_level >= 60
                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                            : evaluation.mastery_level >= 40
                                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                            : "bg-red-100 text-red-800 border-red-200"
                                        }
                                      >
                                        {evaluation.knowledge_points.name} ({evaluation.mastery_level}%)
                                      </Badge>
                                    )
                                  )}
                                  {(!submission.knowledge_point_evaluation ||
                                    submission.knowledge_point_evaluation.length === 0) && "-"}
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

                {/* 添加评分显示选项 */}
                {renderScoreDisplayOptions()}
              </div>
            </TabsContent>

            <TabsContent value="analysis">
              <div className="flex justify-end mb-4">
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
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 作业完成状态分布 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">作业完成状态</CardTitle>
                    <CardDescription>学生作业提交情况分布</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {submissions.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "已批改",
                                value: submissions.filter(s => s.status === "graded").length,
                                color: "#4ade80"
                              },
                              {
                                name: "已提交",
                                value: submissions.filter(s => s.status === "submitted").length,
                                color: "#60a5fa"
                              },
                              {
                                name: "待完成",
                                value: submissions.filter(s => s.status === "pending").length,
                                color: "#facc15"
                              }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {[
                              { name: "已批改", value: submissions.filter(s => s.status === "graded").length, color: "#4ade80" },
                              { name: "已提交", value: submissions.filter(s => s.status === "submitted").length, color: "#60a5fa" },
                              { name: "待完成", value: submissions.filter(s => s.status === "pending").length, color: "#facc15" }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">暂无数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 成绩分布图 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">成绩分布</CardTitle>
                    <CardDescription>学生成绩区间分布情况</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {submissions.filter(s => s.status === "graded").length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={
                            scoreDisplayMode === "numeric" ? [
                              { range: "90-100", count: submissions.filter(s => s.status === "graded" && s.score >= 90 && s.score <= 100).length, color: "#4ade80" },
                              { range: "80-89", count: submissions.filter(s => s.status === "graded" && s.score >= 80 && s.score < 90).length, color: "#60a5fa" },
                              { range: "70-79", count: submissions.filter(s => s.status === "graded" && s.score >= 70 && s.score < 80).length, color: "#facc15" },
                              { range: "60-69", count: submissions.filter(s => s.status === "graded" && s.score >= 60 && s.score < 70).length, color: "#f97316" },
                              { range: "0-59", count: submissions.filter(s => s.status === "graded" && s.score < 60).length, color: "#ef4444" }
                            ] : [
                              { range: "A+/A", count: submissions.filter(s => s.status === "graded" && s.score >= 90).length, color: "#4ade80" },
                              { range: "B+/B", count: submissions.filter(s => s.status === "graded" && s.score >= 80 && s.score < 90).length, color: "#60a5fa" },
                              { range: "C+/C", count: submissions.filter(s => s.status === "graded" && s.score >= 70 && s.score < 80).length, color: "#facc15" },
                              { range: "D+/D", count: submissions.filter(s => s.status === "graded" && s.score >= 60 && s.score < 70).length, color: "#f97316" },
                              { range: "F", count: submissions.filter(s => s.status === "graded" && s.score < 60).length, color: "#ef4444" }
                            ]
                          }
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="range" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value} 人`, "数量"]} />
                          <Bar dataKey="count" name="学生人数">
                            {(scoreDisplayMode === "numeric" ? [
                              { range: "90-100", count: 0, color: "#4ade80" },
                              { range: "80-89", count: 0, color: "#60a5fa" },
                              { range: "70-79", count: 0, color: "#facc15" },
                              { range: "60-69", count: 0, color: "#f97316" },
                              { range: "0-59", count: 0, color: "#ef4444" }
                            ] : [
                              { range: "A+/A", count: 0, color: "#4ade80" },
                              { range: "B+/B", count: 0, color: "#60a5fa" },
                              { range: "C+/C", count: 0, color: "#facc15" },
                              { range: "D+/D", count: 0, color: "#f97316" },
                              { range: "F", count: 0, color: "#ef4444" }
                            ]).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">暂无评分数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 知识点掌握情况 */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">知识点掌握情况</CardTitle>
                    <CardDescription>各知识点掌握程度分析</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[350px]">
                    {knowledgePoints.length > 0 && submissions.some(s => s.knowledge_point_evaluation?.length > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart outerRadius={90} width={730} height={250}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="name" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="班级平均掌握度"
                            dataKey="value"
                            stroke="#B9FF66"
                            fill="#B9FF66"
                            fillOpacity={0.6}
                            data={knowledgePoints.map(kp => {
                              // 计算该知识点的平均掌握度
                              const evaluations = submissions
                                .filter(s => s.status === "graded")
                                .flatMap(s => s.knowledge_point_evaluation || [])
                                .filter(e => e.knowledge_points.id === kp.id);
                                
                              const avgMastery = evaluations.length 
                                ? evaluations.reduce((sum, e) => sum + e.mastery_level, 0) / evaluations.length
                                : 0;
                                
                              return {
                                name: kp.name,
                                value: avgMastery
                              };
                            })}
                          />
                          <Tooltip formatter={(value) => [`${value.toFixed(1)}%`, "掌握度"]} />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">暂无知识点评估数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 作业质量对比分析 */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">作业质量对比分析</CardTitle>
                      <CardDescription>当前作业与以前作业的质量指标对比</CardDescription>
                    </div>
                    <Select defaultValue="recent3">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="选择对比范围" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent3">近3次作业</SelectItem>
                        <SelectItem value="recent5">近5次作业</SelectItem>
                        <SelectItem value="all">全部作业</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
                              submissions.length) * 100).toFixed(0)}%`
                            : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">提交率</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.filter(s => s.status === "graded").length > 0
                            ? `${((submissions.filter(s => s.status === "graded" && (s.score || 0) >= 60).length / 
                              submissions.filter(s => s.status === "graded").length) * 100).toFixed(0)}%`
                            : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">及格率</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.filter(s => s.status === "graded").length > 0
                            ? `${((submissions.filter(s => s.status === "graded" && (s.score || 0) >= 90).length / 
                              submissions.filter(s => s.status === "graded").length) * 100).toFixed(0)}%`
                            : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">优秀率</div>
                      </div>
                      <div className="bg-muted/50 rounded-md p-3 text-center">
                        <div className="text-3xl font-bold text-primary">
                          {submissions.some(s => s.knowledge_point_evaluation?.length > 0)
                            ? `${(submissions
                              .filter(s => s.status === "graded")
                              .flatMap(s => s.knowledge_point_evaluation || [])
                              .reduce((sum, e) => sum + e.mastery_level, 0) / 
                              submissions
                                .filter(s => s.status === "graded")
                                .flatMap(s => s.knowledge_point_evaluation || []).length).toFixed(0)}%`
                            : "-"}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">知识点掌握度</div>
                      </div>
                    </div>
                    
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={[
                            {
                              name: "作业3",
                              平均分: 78.5,
                              提交率: 95,
                              及格率: 88,
                              优秀率: 20,
                              知识点掌握度: 75
                            },
                            {
                              name: "作业2",
                              平均分: 81.2,
                              提交率: 90,
                              及格率: 92,
                              优秀率: 25,
                              知识点掌握度: 80
                            },
                            {
                              name: "作业1",
                              平均分: 75.8,
                              提交率: 85,
                              及格率: 80,
                              优秀率: 15,
                              知识点掌握度: 72
                            },
                            {
                              name: "当前作业",
                              平均分: submissions.filter(s => s.status === "graded").length > 0 
                                ? (submissions.filter(s => s.status === "graded").reduce((sum, s) => sum + (s.score || 0), 0) / 
                                  submissions.filter(s => s.status === "graded").length)
                                : 0,
                              提交率: submissions.length > 0
                                ? (submissions.filter(s => s.status === "graded" || s.status === "submitted").length / 
                                  submissions.length) * 100
                                : 0,
                              及格率: submissions.filter(s => s.status === "graded").length > 0
                                ? (submissions.filter(s => s.status === "graded" && (s.score || 0) >= 60).length / 
                                  submissions.filter(s => s.status === "graded").length) * 100
                                : 0,
                              优秀率: submissions.filter(s => s.status === "graded").length > 0
                                ? (submissions.filter(s => s.status === "graded" && (s.score || 0) >= 90).length / 
                                  submissions.filter(s => s.status === "graded").length) * 100
                                : 0,
                              知识点掌握度: submissions.some(s => s.knowledge_point_evaluation?.length > 0)
                                ? (submissions
                                  .filter(s => s.status === "graded")
                                  .flatMap(s => s.knowledge_point_evaluation || [])
                                  .reduce((sum, e) => sum + e.mastery_level, 0) / 
                                  submissions
                                    .filter(s => s.status === "graded")
                                    .flatMap(s => s.knowledge_point_evaluation || []).length)
                                : 0
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip formatter={(value) => {
                            if (typeof value === 'number') {
                              if (name === "平均分" && scoreDisplayMode === "letter") {
                                return [scoreToGrade(value), ""];
                              }
                              return [value.toFixed(1), ""];
                            }
                            return [value, ""];
                          }} />
                          <Legend />
                          <Line type="monotone" dataKey="平均分" stroke="#4ade80" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="提交率" stroke="#60a5fa" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="及格率" stroke="#facc15" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="优秀率" stroke="#f97316" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                          <Line type="monotone" dataKey="知识点掌握度" stroke="#8884d8" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      * 历史作业数据仅供参考，实际数据将基于系统记录的作业评分情况
                    </div>
                  </CardContent>
                </Card>

                {/* 成绩等级趋势 */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">成绩等级趋势</CardTitle>
                    <CardDescription>近期作业中各等级获得次数变化</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            month: "9月",
                            优秀: 5,
                            良好: 12,
                            中等: 8,
                            及格: 3,
                            不及格: 2
                          },
                          {
                            month: "10月",
                            优秀: 7,
                            良好: 15,
                            中等: 6,
                            及格: 2,
                            不及格: 1
                          },
                          {
                            month: "11月",
                            优秀: 9,
                            良好: 14,
                            中等: 5,
                            及格: 2,
                            不及格: 0
                          },
                          {
                            month: "12月",
                            优秀: submissions.filter(s => s.status === "graded" && s.score >= 90).length,
                            良好: submissions.filter(s => s.status === "graded" && s.score >= 80 && s.score < 90).length,
                            中等: submissions.filter(s => s.status === "graded" && s.score >= 70 && s.score < 80).length,
                            及格: submissions.filter(s => s.status === "graded" && s.score >= 60 && s.score < 70).length,
                            不及格: submissions.filter(s => s.status === "graded" && s.score < 60).length
                          }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} 人`, ""]} />
                        <Legend />
                        <Bar dataKey="优秀" fill="#4ade80" name={scoreDisplayMode === "numeric" ? "优秀(90-100)" : "A/A+"} />
                        <Bar dataKey="良好" fill="#60a5fa" name={scoreDisplayMode === "numeric" ? "良好(80-89)" : "B/B+"} />
                        <Bar dataKey="中等" fill="#facc15" name={scoreDisplayMode === "numeric" ? "中等(70-79)" : "C/C+"} />
                        <Bar dataKey="及格" fill="#f97316" name={scoreDisplayMode === "numeric" ? "及格(60-69)" : "D/D+"} />
                        <Bar dataKey="不及格" fill="#ef4444" name={scoreDisplayMode === "numeric" ? "不及格(<60)" : "F"} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                
                {/* 作业提交时间趋势 */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">作业提交时间趋势</CardTitle>
                    <CardDescription>每天作业提交次数分布</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          {
                            day: "周一",
                            总提交: 8,
                            准时提交: 6,
                            逾期提交: 2
                          },
                          {
                            day: "周二",
                            总提交: 12,
                            准时提交: 10,
                            逾期提交: 2
                          },
                          {
                            day: "周三",
                            总提交: 15,
                            准时提交: 11,
                            逾期提交: 4
                          },
                          {
                            day: "周四",
                            总提交: 6,
                            准时提交: 4,
                            逾期提交: 2
                          },
                          {
                            day: "周五",
                            总提交: 14,
                            准时提交: 8,
                            逾期提交: 6
                          },
                          {
                            day: "周六",
                            总提交: 9,
                            准时提交: 5,
                            逾期提交: 4
                          },
                          {
                            day: "周日",
                            总提交: 18,
                            准时提交: 10,
                            逾期提交: 8
                          }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis label={{ value: '提交次数', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => [`${value} 次`, ""]} />
                        <Legend />
                        <Area type="monotone" dataKey="总提交" stackId="1" stroke="#8884d8" fill="#8884d8" />
                        <Area type="monotone" dataKey="准时提交" stackId="2" stroke="#4ade80" fill="#4ade80" />
                        <Area type="monotone" dataKey="逾期提交" stackId="2" stroke="#ef4444" fill="#ef4444" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="knowledgePoints">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">知识点分析</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAIExtractKnowledgePoints}
                    className="flex items-center gap-1"
                  >
                    <BrainCircuit className="h-4 w-4" />
                    更新知识点分析
                  </Button>
                </div>
                
                <AIKnowledgePointAnalyzer
                  homeworkId={homeworkId}
                  submissionId=""
                  submissionContent={homework?.description || ""}
                  existingKnowledgePoints={knowledgePoints}
                  onSaveKnowledgePoints={handleSaveAiKnowledgePoints}
                  onClose={() => setCurrentTab("details")}
                />
              </div>
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