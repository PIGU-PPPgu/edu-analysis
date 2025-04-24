import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Grid2X2,
  Upload,
  Download,
  Filter,
  ExternalLink,
  FileDown,
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
import { SubmissionStatus } from "./StudentCard";
import GradeCardView from "@/components/homework/grading/GradeCardView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Checkbox,
  Label,
} from "@/components/ui/checkbox";
import { exportToExcel } from "@/lib/export";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// 导入模拟数据
import { mockApi } from "@/data/mockData";

const statusMap = {
  pending: { label: "待完成", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  submitted: { label: "已提交", icon: CheckCircle, color: "bg-blue-100 text-blue-800" },
  graded: { label: "已批改", icon: Award, color: "bg-green-100 text-green-800" },
};

// 视图模式类型
type ViewMode = "cards" | "ai";

export default function HomeworkDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [homework, setHomework] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<any[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("details");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [gradeDialogSubmission, setGradeDialogSubmission] = useState<any>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const gradeCardViewRef = useRef<any>(null);

  useEffect(() => {
    if (!params.homeworkId) return;

    const fetchHomework = async () => {
      try {
        setLoading(true);
        console.log("正在获取作业详情，ID:", params.homeworkId);
        
        // 使用模拟数据代替Supabase调用
        const homeworkData = await mockApi.teacher.getHomeworkById(params.homeworkId);
        setHomework(homeworkData);
        
        // 获取作业关联的知识点
        const kpData = await mockApi.knowledgePoints.getKnowledgePoints(params.homeworkId);
        setKnowledgePoints(kpData);
        
        // 获取作业提交情况
        await fetchSubmissions();
        
      } catch (error) {
        console.error("获取作业详情失败:", error);
        toast({
          variant: "destructive",
          title: "错误",
          description: "获取作业详情失败"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHomework();
  }, [params.homeworkId, toast]);

  useEffect(() => {
    // 根据状态过滤和搜索过滤提交列表
    let filtered = [...submissions];
    
    // 状态过滤
    if (statusFilter !== "all") {
      filtered = filtered.filter(sub => sub.status === statusFilter);
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
    try {
      if (!params.homeworkId) return;
      
      // 使用模拟数据获取提交情况
      const submissionsData = await mockApi.teacher.getSubmissions(params.homeworkId);
      setSubmissions(submissionsData);
      setFilteredSubmissions(submissionsData);
    } catch (error) {
      console.error("获取作业提交情况失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: "获取作业提交情况失败"
      });
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleGraded = () => {
    fetchSubmissions();
    toast({
      title: "批改成功",
      description: "学生成绩和知识点掌握情况已更新"
    });
  };

  const handleExportResults = () => {
    // 准备导出数据
    const exportData = submissions.map(submission => {
      // 查找知识点评估的掌握度平均值
      let avgMasteryLevel = 0;
      if (submission.knowledge_point_evaluation && submission.knowledge_point_evaluation.length > 0) {
        const total = submission.knowledge_point_evaluation.reduce(
          (sum: number, item: any) => sum + item.mastery_level, 0
        );
        avgMasteryLevel = Math.round(total / submission.knowledge_point_evaluation.length);
      }
      
      // 获取知识点名称
      let knowledgePointsText = "";
      if (submission.knowledge_point_evaluation && submission.knowledge_point_evaluation.length > 0) {
        knowledgePointsText = submission.knowledge_point_evaluation
          .map((kp: any) => `${kp.knowledge_points.name}(${kp.mastery_level}%)`)
          .join(", ");
      }
      
      return {
        "学生姓名": submission.students.name,
        "学生班级": submission.students.class || '未分班',
        "提交状态": statusMap[submission.status as keyof typeof statusMap]?.label || '未知',
        "分数": submission.status === "graded" ? submission.score : '',
        "提交日期": submission.submit_date ? formatDate(submission.submit_date) : '未提交',
        "教师反馈": submission.teacher_feedback || '',
        "知识点平均掌握度": avgMasteryLevel ? `${avgMasteryLevel}%` : '',
        "知识点详情": knowledgePointsText
      };
    });
    
    // 导出文件名
    const fileName = `${homework.title}-作业批改结果-${formatDate(new Date().toISOString())}`;
    
    // 导出Excel
    exportToExcel(exportData, fileName);
    
    toast({
      title: "导出成功",
      description: `批改结果已导出到"${fileName}.xlsx"文件`
    });
  };

  const handleUploadScans = () => {
    toast({
      title: "功能开发中",
      description: "AI批改功能正在开发中"
    });
  };

  const openGradeDialog = (submission: any) => {
    if (gradeCardViewRef.current) {
      gradeCardViewRef.current.handleOpenGradeDialog(submission);
    } else {
      toast({
        variant: "destructive",
        title: "错误",
        description: "批改组件未加载，请刷新页面重试"
      });
    }
  };

  const handleOpenGradeDialog = (studentId: string) => {
    const submission = submissions.find(s => s.students.id === studentId);
    if (submission) {
      openGradeDialog(submission);
    } else {
      toast({
        variant: "destructive",
        title: "错误",
        description: "未找到该学生的作业提交记录"
      });
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (loading) return <Loading />;
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
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <ImagePlus className="h-4 w-4" />
                  上传作业图片
                </Button>
              </div>
              
              <div className="bg-muted/50 rounded-md p-8 text-center border border-dashed">
                <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">点击上传作业图片供AI分析</p>
              </div>

              {knowledgePoints.length > 0 && (
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium mb-2">相关知识点</h3>
                    <Button variant="outline" size="sm">
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
                      value={statusFilter}
                      onValueChange={handleStatusFilterChange}
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

                {viewMode === "cards" && (
                  filteredSubmissions.length > 0 ? (
                    <GradeCardView 
                      ref={gradeCardViewRef}
                      submissions={filteredSubmissions}
                      knowledgePoints={knowledgePoints}
                      onGraded={handleGraded}
                    />
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
              </div>
            </TabsContent>

            <TabsContent value="analysis">
              <div className="text-center py-12 text-muted-foreground">
                <BrainCircuit className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">数据分析功能即将推出</h3>
                <p>
                  班级作业分析、学生知识点掌握情况统计、学习进度追踪等功能正在开发中...
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TeacherGradeHomeworkDialog
        homeworkId={params.homeworkId as string}
        studentId={selectedStudentId}
        open={false}
        onOpenChange={setGradeDialogOpen}
        onGraded={handleGraded}
        knowledgePoints={knowledgePoints}
      />
      
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>导出作业批改结果</DialogTitle>
            <DialogDescription>
              选择要导出的内容和格式
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-2">
              <Checkbox id="export-all" checked={true} />
              <Label htmlFor="export-all">导出所有学生数据</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="export-kp" checked={true} />
              <Label htmlFor="export-kp">包含知识点评估详情</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleExportResults} className="w-full">
                <FileDown className="h-4 w-4 mr-2" />
                导出为Excel
              </Button>
              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                导出为PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 