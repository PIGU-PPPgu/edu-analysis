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

// 导入模拟数据
import { mockApi } from "@/data/mockData";

const statusMap = {
  pending: { label: "待完成", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  submitted: { label: "已提交", icon: CheckCircle, color: "bg-blue-100 text-blue-800" },
  graded: { label: "已批改", icon: Award, color: "bg-green-100 text-green-800" },
};

// 视图模式类型
type ViewMode = "cards" | "table" | "ai";

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
  const [scoreDisplayMode, setScoreDisplayMode] = useState<"numeric" | "grade">("numeric");

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

  const handleOpenGradeDialog = (studentId: string) => {
    setSelectedStudentId(studentId);
    setGradeDialogOpen(true);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
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
    } else {
      return scoreToGrade(score); // 或者使用 scoreToChineseGrade(score)
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
                    variant={scoreDisplayMode === "grade" ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setScoreDisplayMode("grade")}
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
                              if (name === "平均分" && scoreDisplayMode === "grade") {
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
          </Tabs>
        </CardContent>
      </Card>

      <TeacherGradeHomeworkDialog
        homeworkId={params.homeworkId as string}
        studentId={selectedStudentId}
        open={gradeDialogOpen}
        onOpenChange={setGradeDialogOpen}
        onGraded={handleGraded}
        knowledgePoints={knowledgePoints}
      />
    </div>
  );
} 