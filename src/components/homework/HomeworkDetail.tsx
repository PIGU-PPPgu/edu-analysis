import React, { useState, useEffect, useMemo, useCallback, ChangeEvent } from "react";
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
  Loader2,
  UploadCloud,
  AlertTriangle as AlertTriangleIcon,
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
import { AIKnowledgePointAnalyzer, KnowledgePoint as AIKnowledgePoint } from '@/components/homework/AIKnowledgePointAnalyzer';
import { bulkCreateKnowledgePoints, updateKnowledgePointEvaluations } from '@/services/knowledgePointService';
import { analyzeWithModel, getAIClient } from "@/services/aiService"; // Import AI analysis service
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth"; // Import user config utils
import { getModelInfo } from "@/services/providers"; // To check model capabilities
import { AIAnalysisResult } from "@/types/analysis"; // Import result type

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // 添加知识点确认对话框状态
  const [showKnowledgePointDialog, setShowKnowledgePointDialog] = useState(false);
  const [aiKnowledgePoints, setAiKnowledgePoints] = useState<KnowledgePoint[]>([]);
  // 添加知识点分析对话框状态
  const [showAIAnalysisDialog, setShowAIAnalysisDialog] = useState(false);

  // State for Image Analysis
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

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
    // This function might need revision or could be triggered differently now
    // For now, keep the dialog logic but maybe disable the button that calls this
    // if image analysis is the primary way?
    if (!homework) return;

    setShowAIAnalysisDialog(true); // Use existing dialog for AIKnowledgePointAnalyzer?
                                     // Or repurpose/remove if image analysis is the focus.
    // Temporarily disabling the direct call to AIKnowledgePointAnalyzer
    /*
    try {
      // ... (existing logic using AIKnowledgePointAnalyzer)
    } catch (error) {
      // ...
    }
    */
    toast({ title: "提示", description: "请使用下方的图片上传功能进行知识点分析。" });
  };

  // --- Image Analysis Handlers --- //

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImageFile(file);
      setAnalysisResult(null); // Clear previous results
      setAnalysisError(null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.onerror = () => {
        console.error("Error reading file");
        setAnalysisError("读取图片文件失败。");
        setImageBase64(null);
        setSelectedImageFile(null);
      };
      reader.readAsDataURL(file);
    } else {
       setSelectedImageFile(null);
       setImageBase64(null);
    }
     // Reset the input value to allow selecting the same file again
     event.target.value = "";
  };

  const handleAnalyzeImageClick = useCallback(async () => {
    if (!imageBase64) {
      toast({ title: "请先选择一张图片", variant: "destructive" });
      return;
    }

    setIsAnalyzingImage(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    let chosenProviderId: string | null = null;
    let chosenModelId: string | null = null;
    let apiKeyAvailable = false;

    try {
      // 1. Check user config
      const aiConfig = await getUserAIConfig();
      const preferredProvider = aiConfig?.provider;
      const preferredModelId = aiConfig?.version;

      if (preferredProvider && preferredModelId) {
        logInfo('Checking preferred AI config for vision...', { preferredProvider, preferredModelId });
        const modelInfo = getModelInfo(preferredProvider, preferredModelId);
        const hasVision = modelInfo?.id.includes('vision') || modelInfo?.id.includes('vl') || modelInfo?.id.includes('gpt-4o'); // Add other identifiers if needed
        const apiKey = await getUserAPIKey(preferredProvider);
        if (hasVision && apiKey) {
          chosenProviderId = preferredProvider;
          chosenModelId = preferredModelId;
          apiKeyAvailable = true;
          logInfo('Using preferred vision model', { chosenProviderId, chosenModelId });
        }
      }

      // 2. Fallback to Doubao (if preferred not suitable)
      if (!chosenProviderId) {
        logInfo('Preferred model not suitable or key missing, trying Doubao...');
        const doubaoApiKey = await getUserAPIKey('doubao');
        if (doubaoApiKey) {
           // Use a known Doubao vision model ID (update if necessary)
           const doubaoVisionModel = 'doubao-volc-vision'; // Example ID, ensure this exists in providers.ts/doubaoClient
           const modelInfo = getModelInfo('doubao', doubaoVisionModel);
           if(modelInfo){ // Check if model exists
              chosenProviderId = 'doubao';
              chosenModelId = doubaoVisionModel;
              apiKeyAvailable = true;
              logInfo('Using Doubao vision model', { chosenProviderId, chosenModelId });
           } else {
               logError('Doubao vision model info not found', { modelId: doubaoVisionModel });
           }
        }
      }

      // 3. Fallback to OpenAI GPT-4o (if Doubao not suitable)
      if (!chosenProviderId) {
        logInfo('Doubao not suitable or key missing, trying OpenAI GPT-4o...');
        const openaiApiKey = await getUserAPIKey('openai');
        if (openaiApiKey) {
          const openaiVisionModel = 'gpt-4o'; // Use gpt-4o which has vision
           const modelInfo = getModelInfo('openai', openaiVisionModel);
            if(modelInfo){ // Check if model exists
                chosenProviderId = 'openai';
                chosenModelId = openaiVisionModel;
                apiKeyAvailable = true;
                logInfo('Using OpenAI vision model', { chosenProviderId, chosenModelId });
            } else {
                 logError('OpenAI vision model info not found', { modelId: openaiVisionModel });
            }
        }
      }

      // 4. Perform Analysis or show error
      if (chosenProviderId && chosenModelId && apiKeyAvailable) {
        const result = await analyzeWithModel(chosenProviderId, chosenModelId, imageBase64, knowledgePoints);
        setAnalysisResult(result);
        if (result.error) {
          setAnalysisError(`分析失败: ${result.error}`);
          toast({ title: "AI分析失败", description: result.error, variant: "destructive" });
        } else {
          toast({ title: "AI分析完成", description: `从图片中识别到 ${result.knowledgePoints.length} 个知识点。` });
        }
      } else {
        logError('No suitable AI vision provider/model/key found for analysis');
        setAnalysisError("未找到可用的 AI 视觉模型配置或 API 密钥。请在 AI 设置中检查 OpenAI(gpt-4o) 或 豆包(vision) 的配置。" );
        toast({ title: "无法进行分析", description: "请先配置支持视觉的 AI 模型及其 API 密钥。", variant: "destructive" });
      }

    } catch (error: any) {
      console.error("Error during image analysis setup or execution:", error);
      setAnalysisError(`分析过程中发生错误: ${error.message}`);
      toast({ title: "分析出错", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzingImage(false);
    }
  }, [imageBase64, toast, knowledgePoints]); // Added knowledgePoints dependency

  // Function to add analyzed points to the homework (similar to handleConfirmSaveKnowledgePoints)
  const handleAddAnalyzedKnowledgePoints = async () => {
     if (!analysisResult || !analysisResult.knowledgePoints || analysisResult.knowledgePoints.length === 0) {
       toast({ title: "没有可添加的知识点", variant: "default" });
       return;
     }

     setIsSubmitting(true); // Reuse submitting state
     try {
       // Filter out potential duplicates (simple name check)
       const existingNames = knowledgePoints.map(kp => kp.name.toLowerCase());
       const pointsToAdd = analysisResult.knowledgePoints.filter(
         kp => !existingNames.includes(kp.name.toLowerCase())
       );

       if (pointsToAdd.length === 0) {
         toast({ title: "没有新的知识点可添加", description: "AI 分析的知识点似乎已存在。" });
         setIsSubmitting(false);
         setAnalysisResult(null); // Clear results after attempting add
         return;
       }

       const newPoints = await bulkCreateKnowledgePoints(homeworkId, pointsToAdd);
       setKnowledgePoints(prev => [...prev, ...newPoints]);
       setAnalysisResult(null); // Clear results after adding
       toast({ title: "成功添加知识点", description: `已将 ${newPoints.length} 个新知识点关联到此作业。` });

     } catch (error: any) {
       console.error("Error adding analyzed knowledge points:", error);
       toast({ title: "添加知识点失败", description: error.message, variant: "destructive" });
     } finally {
       setIsSubmitting(false);
     }
   };

  // --- Render Functions --- //

  const renderKnowledgePointsTab = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>知识点列表</CardTitle>
          <CardDescription>与本次作业关联的知识点</CardDescription>
        </div>
        {/* Keep existing AI Extract button? Or rely solely on image upload? */}
        <Button onClick={handleAIExtractKnowledgePoints} size="sm" variant="outline">
          <BrainCircuit className="mr-2 h-4 w-4" />
          AI 提取知识点 (文本)
        </Button>
      </CardHeader>
      <CardContent>
        {knowledgePoints.length > 0 ? (
          <ul className="space-y-2">
            {knowledgePoints.map((kp) => (
              <li key={kp.id} className="text-sm p-2 border rounded bg-gray-50">
                {kp.name}
                {kp.description && <p className="text-xs text-gray-500 mt-1">{kp.description}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">尚未关联任何知识点。</p>
        )}

        {/* --- Image Analysis Section --- */}
        <div className="mt-6 pt-6 border-t">
           <h3 className="text-lg font-semibold mb-3">图片知识点分析 (AI Vision)</h3>
           <div className="flex flex-col md:flex-row gap-4 items-start">
             {/* Image Upload Area */}
             <div className="flex-1 space-y-3">
               <Label htmlFor="image-upload" className="text-sm font-medium">上传作业图片</Label>
               <div className="flex items-center gap-2">
                  <Input
                     id="image-upload"
                     type="file"
                     accept="image/*"
                     onChange={handleImageSelect}
                     className="flex-grow"
                     disabled={isAnalyzingImage}
                   />
                   <Button 
                     onClick={handleAnalyzeImageClick} 
                     disabled={!imageBase64 || isAnalyzingImage}
                     size="icon"
                   >
                     {isAnalyzingImage ? (
                       <Loader2 className="h-4 w-4 animate-spin" />
                     ) : (
                       <Scan className="h-4 w-4" />
                     )}
                   </Button>
               </div>
                {imageBase64 && (
                 <div className="mt-2 border rounded p-2 bg-gray-50">
                   <p className="text-xs font-medium mb-1">已选择图片:</p>
                   <img 
                     src={imageBase64} 
                     alt={selectedImageFile?.name || 'Uploaded preview'} 
                     className="max-h-40 rounded object-contain"
                   />
                 </div>
               )}
               <p className="text-xs text-gray-500">选择一张图片，点击扫描按钮进行 AI 分析。</p>
             </div>

             {/* Analysis Results Area */}
             <div className="flex-1 space-y-3 min-h-[150px]">
               <Label className="text-sm font-medium">AI 分析结果</Label>
               {isAnalyzingImage && (
                 <div className="flex items-center justify-center p-4 border rounded bg-blue-50 text-blue-700">
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 正在分析中...
                 </div>
               )}
               {analysisError && !isAnalyzingImage && (
                 <div className="flex items-center p-4 border rounded bg-red-50 text-red-700">
                   <AlertTriangleIcon className="mr-2 h-4 w-4 flex-shrink-0" /> 
                   <span className="text-sm">{analysisError}</span>
                 </div>
               )}
               {analysisResult && !isAnalyzingImage && !analysisResult.error && (
                 <div className="border rounded p-4 bg-green-50">
                   <p className="text-sm font-medium mb-2 text-green-800">分析完成，识别到 {analysisResult.knowledgePoints.length} 个知识点：</p>
                   {analysisResult.knowledgePoints.length > 0 ? (
                     <ul className="space-y-1 max-h-60 overflow-y-auto pr-2">
                       {analysisResult.knowledgePoints.map((kp, index) => (
                         <li key={index} className="text-xs p-1.5 border-b border-green-200">
                           <span className="font-semibold">{kp.name}</span>
                           {kp.description && <span className="text-gray-600">: {kp.description}</span>}
                         </li>
                       ))}
                     </ul>
                   ) : (
                      <p className="text-sm text-gray-600">图片中未识别到明确的知识点。</p>
                   )}
                   {analysisResult.knowledgePoints.length > 0 && (
                      <Button 
                         onClick={handleAddAnalyzedKnowledgePoints} 
                         size="sm" 
                         variant="outline"
                         className="mt-3"
                         disabled={isSubmitting}
                       >
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         将识别结果添加到作业知识点
                       </Button>
                    )}
                 </div>
               )}
                {!isAnalyzingImage && !analysisResult && !analysisError && (
                  <div className="flex items-center justify-center p-4 border rounded border-dashed text-gray-400">
                    等待分析结果...
                  </div>
                )}
             </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );

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

      <Card className="overflow-hidden">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {homework?.title || "加载中..."}
          </CardTitle>
          {/* ... (Description, Due Date, etc.) ... */}
          <CardDescription>
             {homework?.description || "加载作业描述..."}
          </CardDescription>
           <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-2">
              <span>截止日期: {formatDate(homework?.due_date) || "未设置"}</span>
              <span>创建日期: {formatDate(homework?.created_at) || "未知"}</span>
              <span>班级: {homework?.classes?.name || "未关联"}</span>
              <span>科目: {homework?.classes?.subject || "未指定"}</span>
              <span>教师: {homework?.teachers?.name || "未知"}</span>
              <span>评分标准: {gradingScale?.name || "默认数值"}</span>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
              <TabsTrigger value="details">提交详情</TabsTrigger>
              <TabsTrigger value="submissions">学生提交 ({filteredSubmissions.length}/{submissions.length})</TabsTrigger>
              <TabsTrigger value="analysis">统计分析</TabsTrigger>
              <TabsTrigger value="knowledgePoints">知识点管理</TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="p-6">
              {renderSubmissionsTab()} 
            </TabsContent>
            <TabsContent value="submissions" className="p-6">
              {renderSubmissionsTab()} 
            </TabsContent>
            <TabsContent value="analysis" className="p-6">
              {renderAnalysisTab()}
            </TabsContent>
            <TabsContent value="knowledgePoints" className="p-6">
              {renderKnowledgePointsTab()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isGradeDialogOpen && selectedSubmissionId && selectedStudentId && (
           <TeacherGradeHomeworkDialog
             open={isGradeDialogOpen}
             onOpenChange={setIsGradeDialogOpen}
             submissionId={selectedSubmissionId}
             studentId={selectedStudentId}
             homeworkTitle={homework?.title || ""}
             knowledgePoints={knowledgePoints}
             currentEvaluation={submissions.find(s => s.id === selectedSubmissionId)?.submission_knowledge_points || []}
             onGraded={handleGraded}
             gradingScale={gradingScale}
           />
         )}
         
       {/* Dialog to confirm adding AI-extracted knowledge points */} 
       <AlertDialog open={showKnowledgePointDialog} onOpenChange={setShowKnowledgePointDialog}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>确认添加知识点？</AlertDialogTitle>
             <AlertDialogDescription>
               AI分析识别出以下 <span className="font-bold">{aiKnowledgePoints.length}</span> 个可能的知识点。是否要将它们添加到本次作业？（重复的知识点将被忽略）
               <ul className="mt-2 max-h-60 overflow-y-auto rounded border bg-gray-50 p-2 text-sm space-y-1">
                 {aiKnowledgePoints.map((kp, idx) => <li key={idx}>{kp.name}</li>)}
               </ul>
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={handleCancelSaveKnowledgePoints}>取消</AlertDialogCancel>
             <AlertDialogAction onClick={handleConfirmSaveKnowledgePoints}>确认添加</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
} 