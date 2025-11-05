import React, { useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { mockApi } from "@/data/mockData";
import {
  Download,
  FileUp,
  Filter,
  MoreVertical,
  PenLine,
  Search,
  Upload,
  FileText,
  Eye,
  CheckCircle,
  X,
  FileImage,
  BrainCircuit,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

// 定义表格中显示的学生数据类型
interface StudentSubmission {
  id: string;
  students: {
    id: string;
    name: string;
  };
  status: string;
  score?: number;
  submit_date?: string;
  teacher_feedback?: string;
  knowledge_point_evaluation?: {
    id: string;
    knowledge_point_id: string;
    mastery_level: number;
    knowledge_points: {
      id: string;
      name: string;
    };
  }[];
}

export default function StudentTable() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredSubmissions, setFilteredSubmissions] = useState<
    StudentSubmission[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentTab, setCurrentTab] = useState("table");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<StudentSubmission | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<any[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);

  // 模拟获取作业提交数据
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        // 使用ID为1的作业数据作为示例
        const submissionsData = await mockApi.teacher.getSubmissions("1");
        setSubmissions(submissionsData);
        setFilteredSubmissions(submissionsData);
      } catch (error) {
        console.error("获取提交数据失败:", error);
        toast({
          variant: "destructive",
          title: "错误",
          description: "获取学生数据失败",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [toast]);

  // 根据搜索和筛选条件过滤学生列表
  useEffect(() => {
    let filtered = [...submissions];

    // 状态筛选
    if (statusFilter !== "all") {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }

    // 搜索过滤
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((sub) =>
        sub.students.name.toLowerCase().includes(query)
      );
    }

    setFilteredSubmissions(filtered);
  }, [submissions, statusFilter, searchQuery]);

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setSelectedFiles(fileArray);
    }
  };

  // 模拟文件上传过程
  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "请选择文件",
        description: "您需要先选择要上传的扫描件文件",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // 模拟上传进度
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);

          toast({
            title: "上传成功",
            description: `已成功上传 ${selectedFiles.length} 个文件`,
          });

          return 0;
        }
        return prev + 10;
      });
    }, 300);
  };

  // 模拟OCR识别过程
  const handleRecognize = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "请选择文件",
        description: "您需要先上传扫描件才能进行识别",
      });
      return;
    }

    setIsRecognizing(true);

    // 模拟识别过程
    setTimeout(() => {
      // 模拟识别结果
      const results = selectedFiles.map((file, index) => ({
        id: `result-${index}`,
        fileName: file.name,
        studentName: `学生${index + 1}`,
        accuracy: Math.floor(75 + Math.random() * 20),
        answers: [
          { question: 1, answer: "这是识别的第一题答案...", confidence: 92 },
          { question: 2, answer: "这是识别的第二题答案...", confidence: 88 },
          { question: 3, answer: "这是识别的第三题答案...", confidence: 75 },
        ],
        aiScore: Math.floor(70 + Math.random() * 30),
        aiFeedback:
          "整体答案结构清晰，概念理解准确，但在第三题的实现细节上需要改进。",
      }));

      setRecognitionResults(results);
      setIsRecognizing(false);

      toast({
        title: "识别完成",
        description: `已成功识别 ${results.length} 份作业内容`,
      });
    }, 2000);
  };

  // 查看学生详情
  const handleViewDetails = (submission: StudentSubmission) => {
    setSelectedSubmission(submission);
    setDetailsDialogOpen(true);
  };

  // 导出成绩
  const handleExport = () => {
    toast({
      title: "导出成功",
      description: "成绩数据已导出到Excel文件",
    });
  };

  // 获取状态标签颜色
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "graded":
        return "bg-green-100 text-green-800 border-green-200";
      case "submitted":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // 获取状态标签文本
  const getStatusText = (status: string) => {
    switch (status) {
      case "graded":
        return "已批改";
      case "submitted":
        return "已提交";
      case "pending":
        return "待完成";
      default:
        return "未知状态";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>学生作业管理</CardTitle>
              <CardDescription>查看、批改学生作业和扫描件识别</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                导出成绩
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="table">学生列表</TabsTrigger>
              <TabsTrigger value="upload">作业上传</TabsTrigger>
              <TabsTrigger value="recognition">AI识别</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <div className="flex justify-between mb-4">
                <div className="relative w-64">
                  <Input
                    placeholder="搜索学生..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                <select
                  className="border rounded px-3 py-1.5 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">全部状态</option>
                  <option value="graded">已批改</option>
                  <option value="submitted">已提交</option>
                  <option value="pending">待完成</option>
                </select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>分数</TableHead>
                    <TableHead>提交日期</TableHead>
                    <TableHead>知识点掌握</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        正在加载数据...
                      </TableCell>
                    </TableRow>
                  ) : filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">
                          {submission.students.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeColor(submission.status)}
                          >
                            {getStatusText(submission.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.status === "graded" && submission.score
                            ? `${submission.score}/100`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {submission.submit_date
                            ? formatDate(submission.submit_date)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {submission.knowledge_point_evaluation ? (
                            <div className="flex gap-1 items-center">
                              <span>
                                {submission.knowledge_point_evaluation.length}{" "}
                                项
                              </span>
                              <Progress
                                value={
                                  submission.knowledge_point_evaluation.reduce(
                                    (acc, kp) => acc + kp.mastery_level,
                                    0
                                  ) /
                                  submission.knowledge_point_evaluation.length
                                }
                                max={100}
                                className="h-2 w-20"
                              />
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>操作</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(submission)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <PenLine className="h-4 w-4 mr-2" />
                                {submission.status === "graded"
                                  ? "重新批改"
                                  : "批改"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        没有找到符合条件的学生
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="upload">
              <div className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    上传学生作业扫描件
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    支持JPG、PNG、PDF格式，最大20MB
                  </p>
                  <div className="flex flex-col items-center gap-3">
                    <Input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf"
                      id="fileUpload"
                      className="max-w-sm"
                      onChange={handleFileSelect}
                    />
                    <Button onClick={handleUpload} disabled={isUploading}>
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? "上传中..." : "开始上传"}
                    </Button>
                  </div>
                </div>

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>上传进度</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      已选择文件 ({selectedFiles.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                        >
                          <div className="flex items-center">
                            <FileImage className="h-5 w-5 mr-2 text-blue-500" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="recognition">
              <div className="space-y-6">
                <div className="bg-muted p-6 rounded-lg border border-dashed">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">AI作业批改</h3>
                      <p className="text-sm text-muted-foreground">
                        使用OCR和AI技术自动识别和批改作业
                      </p>
                    </div>
                    <Button
                      onClick={handleRecognize}
                      disabled={isRecognizing || selectedFiles.length === 0}
                    >
                      <BrainCircuit className="h-4 w-4 mr-2" />
                      {isRecognizing ? "识别中..." : "开始识别"}
                    </Button>
                  </div>

                  {isRecognizing ? (
                    <div className="text-center py-8">
                      <div className="animate-pulse">
                        <BrainCircuit className="h-12 w-12 mx-auto mb-4 text-primary/60" />
                        <p>AI正在识别作业内容...</p>
                      </div>
                    </div>
                  ) : recognitionResults.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-medium">
                        AI识别结果 ({recognitionResults.length})
                      </h4>

                      {recognitionResults.map((result) => (
                        <div
                          key={result.id}
                          className="border rounded-md overflow-hidden"
                        >
                          <div className="bg-muted p-3 flex justify-between items-center">
                            <div>
                              <span className="font-medium">
                                {result.fileName}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-800 border-blue-200"
                                >
                                  识别准确率: {result.accuracy}%
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-800 border-green-200"
                                >
                                  AI评分: {result.aiScore}分
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                查看
                              </Button>
                              <Button size="sm">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                采用
                              </Button>
                            </div>
                          </div>

                          <div className="p-3">
                            <h5 className="text-sm font-medium mb-2">
                              AI反馈意见
                            </h5>
                            <p className="text-sm text-muted-foreground mb-3">
                              {result.aiFeedback}
                            </p>

                            <h5 className="text-sm font-medium mb-2">
                              识别的答案
                            </h5>
                            <div className="space-y-2">
                              {result.answers.map((ans, idx) => (
                                <div
                                  key={idx}
                                  className="text-sm bg-muted/50 p-2 rounded"
                                >
                                  <div className="flex justify-between mb-1">
                                    <span className="font-medium">
                                      第{ans.question}题
                                    </span>
                                    <span className="text-xs">
                                      置信度: {ans.confidence}%
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground">
                                    {ans.answer}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4" />
                      <p>上传扫描件后开始AI识别和批改</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 学生详情对话框 */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>学生作业详情</DialogTitle>
            <DialogDescription>
              查看学生提交的作业详情和批改情况
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>学生姓名</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {selectedSubmission.students.name}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>状态</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    <Badge
                      variant="outline"
                      className={getStatusBadgeColor(selectedSubmission.status)}
                    >
                      {getStatusText(selectedSubmission.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分数</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {selectedSubmission.status === "graded" &&
                    selectedSubmission.score
                      ? `${selectedSubmission.score}/100`
                      : "-"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>提交日期</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {selectedSubmission.submit_date
                      ? formatDate(selectedSubmission.submit_date)
                      : "-"}
                  </div>
                </div>
              </div>

              {selectedSubmission.teacher_feedback && (
                <div className="space-y-2">
                  <Label>教师反馈</Label>
                  <div className="p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                    {selectedSubmission.teacher_feedback}
                  </div>
                </div>
              )}

              {selectedSubmission.knowledge_point_evaluation &&
                selectedSubmission.knowledge_point_evaluation.length > 0 && (
                  <div className="space-y-2">
                    <Label>知识点掌握情况</Label>
                    <div className="space-y-2">
                      {selectedSubmission.knowledge_point_evaluation.map(
                        (kp) => (
                          <div
                            key={kp.id}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <span className="text-sm">
                              {kp.knowledge_points.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={kp.mastery_level}
                                max={100}
                                className="h-2 w-32"
                              />
                              <span className="text-sm">
                                {kp.mastery_level}%
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDetailsDialogOpen(false)}
            >
              关闭
            </Button>
            <Button>
              <PenLine className="h-4 w-4 mr-2" />
              修改批改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
