import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Loading } from "@/components/Loading";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  PlusCircle,
  BookOpen,
  Clock,
  CheckCircle,
  Award,
  MoreVertical,
  FileEdit,
  Trash2,
  Users,
  BrainCircuit,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";

// 导入Supabase服务
import { getAllHomeworks } from "@/services/homeworkService";
import { getKnowledgePointsByHomeworkId, createKnowledgePoints } from "@/services/knowledgePointService";
import { supabase } from "@/integrations/supabase/client";

// 临时导入模拟数据（后续完全替换）
import { mockApi, knowledgePoints } from "@/data/mockData";

const homeworkSchema = z.object({
  title: z.string().min(1, "作业标题不能为空"),
  description: z.string().min(1, "作业说明不能为空"),
  classId: z.string().min(1, "请选择班级"),
  dueDate: z.string().min(1, "请选择截止日期"),
  knowledgePoints: z.array(z.string()).optional(),
});

export default function TeacherHomeworkList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [filteredHomeworks, setFilteredHomeworks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedKnowledgePoints, setSelectedKnowledgePoints] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState("all");

  const form = useForm<z.infer<typeof homeworkSchema>>({
    resolver: zodResolver(homeworkSchema),
    defaultValues: {
      title: "",
      description: "",
      classId: "",
      dueDate: "",
      knowledgePoints: [],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("正在获取教师数据...");
        
        // 获取班级数据（使用模拟API）
        const classesData = await mockApi.teacher.getClasses();
        console.log("班级数据:", classesData);
        setClasses(classesData);
        
        // 获取作业数据（使用Supabase服务）
        const homeworksData = await getAllHomeworks();
        console.log("作业数据:", homeworksData);
        setHomeworks(homeworksData);
        setFilteredHomeworks(homeworksData);
        
      } catch (error) {
        console.error("获取数据失败:", error);
        setError("数据加载失败，请刷新页面重试");
        toast({
          variant: "destructive",
          title: "错误",
          description: "获取数据失败",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useMemo(() => {
    if (filter.trim() === "") {
      setFilteredHomeworks(homeworks);
    } else {
      const filtered = homeworks.filter(
        (hw) =>
          hw.title?.toLowerCase().includes(filter.toLowerCase()) ||
          (hw.classes?.name && hw.classes.name.toLowerCase().includes(filter.toLowerCase())) ||
          (hw.classes?.subject && hw.classes.subject.toLowerCase().includes(filter.toLowerCase()))
      );
      setFilteredHomeworks(filtered);
    }
  }, [filter, homeworks]);

  useMemo(() => {
    // 根据标签筛选作业
    if (currentTab === "all") {
      setFilteredHomeworks(homeworks);
    } else if (currentTab === "active") {
      const today = new Date();
      const filtered = homeworks.filter((hw) => {
        const dueDate = new Date(hw.due_date);
        return dueDate >= today;
      });
      setFilteredHomeworks(filtered);
    } else if (currentTab === "completed") {
      const filtered = homeworks.filter((hw) => {
        // 检查是否所有提交都是已评分状态
        if (!hw.homework_submission || hw.homework_submission.length === 0) {
          return false;
        }
        return hw.homework_submission.every((s: any) => s.status === "graded");
      });
      setFilteredHomeworks(filtered);
    }
  }, [currentTab, homeworks]);

  const filterHomeworks = useCallback((value: string) => {
    setFilter(value);
  }, []);

  const onSubmit = useCallback(async (values: z.infer<typeof homeworkSchema>) => {
    try {
      // 获取当前用户ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("未登录");
      }
      
      // 使用Supabase创建作业
      const { data: newHomework, error } = await supabase
        .from('homework')
        .insert({
          title: values.title,
          description: values.description,
          class_id: values.classId,
          due_date: values.dueDate,
          created_by: user.id
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // 如果选择了知识点，为作业创建知识点
      if (selectedKnowledgePoints.length > 0) {
        // 处理选择的知识点 (这里假设selectedKnowledgePoints包含知识点名称)
        const knowledgePointsToCreate = selectedKnowledgePoints.map(name => ({
          name,
          description: null
        }));
        
        // 创建知识点
        await createKnowledgePoints(newHomework.id, knowledgePointsToCreate);
      }
      
      toast({
        title: "创建成功",
        description: "作业已成功创建",
      });
      
      // 更新作业列表
      setHomeworks((prev) => [newHomework, ...prev]);

      // 重置表单
      form.reset();
      setSelectedKnowledgePoints([]);
      setCreateDialogOpen(false);
    } catch (error: any) {
      console.error("创建作业失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: `创建作业失败: ${error.message || "未知错误"}`,
      });
    }
  }, [form, selectedKnowledgePoints, toast]);

  const handleDeleteHomework = useCallback(async (id: string) => {
    try {
      // 使用Supabase删除作业
      const { error } = await supabase
        .from('homework')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }

      // 从列表中移除
      setHomeworks((prev) => prev.filter((hw) => hw.id !== id));
      toast({
        title: "删除成功",
        description: "作业已成功删除",
      });
    } catch (error: any) {
      console.error("删除作业失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: `删除作业失败: ${error.message || "未知错误"}`,
      });
    } finally {
      setConfirmDeleteId(null);
    }
  }, [toast]);

  const getCompletionStatus = useCallback((homework: any) => {
    const submissions = homework.homework_submission || [];
    const gradedCount = submissions.filter((s: any) => s.status === "graded").length;
    const pendingCount = submissions.filter((s: any) => s.status === "pending").length;
    const submittedCount = submissions.filter((s: any) => s.status === "submitted").length;
    const totalCount = submissions.length;

    if (totalCount === 0) return { percent: 0, gradedCount: 0, pendingCount: 0, submittedCount: 0, totalCount: 0 };

    return {
      percent: Math.round((gradedCount / totalCount) * 100),
      gradedCount,
      pendingCount,
      submittedCount,
      totalCount,
    };
  }, []);

  // 显示加载状态
  if (loading) return <Loading />;
  
  // 显示错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <AlertTriangle className="h-16 w-16 text-red-500" />
        <h2 className="text-2xl font-bold">加载失败</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>我的作业</CardTitle>
              <CardDescription>管理和查看学生作业情况</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Input
                  placeholder="搜索作业..."
                  value={filter}
                  onChange={(e) => filterHomeworks(e.target.value)}
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
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-1"
              >
                <PlusCircle className="h-4 w-4" /> 创建作业
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList>
              <TabsTrigger value="all">全部作业</TabsTrigger>
              <TabsTrigger value="active">进行中</TabsTrigger>
              <TabsTrigger value="completed">已批改完成</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {renderHomeworkList(filteredHomeworks)}
            </TabsContent>

            <TabsContent value="active" className="mt-4">
              {renderHomeworkList(filteredHomeworks)}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {renderHomeworkList(filteredHomeworks)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建作业</DialogTitle>
            <DialogDescription>创建新的作业并分配给班级</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>作业标题</FormLabel>
                    <FormControl>
                      <Input placeholder="输入作业标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>作业说明</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="输入作业说明、要求等内容"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>选择班级</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择班级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name} ({cls.subject})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>截止日期</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>知识点 (可选)</FormLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {knowledgePoints.map((kp) => (
                    <Badge
                      key={kp.id}
                      variant={
                        selectedKnowledgePoints.includes(kp.id)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        if (selectedKnowledgePoints.includes(kp.id)) {
                          setSelectedKnowledgePoints(
                            selectedKnowledgePoints.filter((id) => id !== kp.id)
                          );
                        } else {
                          setSelectedKnowledgePoints([
                            ...selectedKnowledgePoints,
                            kp.id,
                          ]);
                        }
                      }}
                    >
                      <BrainCircuit className="h-3 w-3 mr-1" />
                      {kp.name}
                    </Badge>
                  ))}
                </div>
                <FormDescription className="mt-2">
                  选择与此作业相关的知识点，将用于后续的知识点掌握情况分析
                </FormDescription>
              </div>

              <DialogFooter>
                <Button type="submit">创建作业</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteId !== null}
        onOpenChange={() => setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除此作业吗？此操作无法撤销，相关的学生作业记录也将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteId) {
                  handleDeleteHomework(confirmDeleteId);
                }
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderHomeworkList(homeworks: any[]) {
    if (homeworks.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">暂无作业</h3>
          <p className="mt-2 text-muted-foreground">
            点击"创建作业"按钮开始添加作业
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="mt-4"
          >
            <PlusCircle className="h-4 w-4 mr-2" /> 创建作业
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>作业标题</TableHead>
            <TableHead>班级</TableHead>
            <TableHead>截止日期</TableHead>
            <TableHead>批改情况</TableHead>
            <TableHead>知识点</TableHead>
            <TableHead className="w-[100px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {homeworks.map((homework) => {
            const status = getCompletionStatus(homework);
            const isOverdue =
              new Date(homework.due_date) < new Date() &&
              status.percent < 100;
            return (
              <TableRow key={homework.id}>
                <TableCell className="font-medium">{homework.title}</TableCell>
                <TableCell>
                  {homework.classes?.name ? `${homework.classes.name} (${homework.classes.subject || '未知'})` : '未知班级'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className={`${
                        isOverdue
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      }`}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(homework.due_date)}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${status.percent}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium">
                        {status.percent}%
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="flex items-center">
                        <Award className="h-3 w-3 mr-1 text-green-600" />
                        已批改: {status.gradedCount}
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1 text-blue-600" />
                        已记录: {status.submittedCount}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-yellow-600" />
                        待完成: {status.pendingCount}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {homework.homework_knowledge_point &&
                    homework.homework_knowledge_point.length > 0 ? (
                      homework.homework_knowledge_point
                        .slice(0, 2)
                        .map((kp: any) => (
                          <Badge
                            key={kp.knowledge_point_id}
                            variant="secondary"
                            className="flex items-center"
                          >
                            <BrainCircuit className="h-3 w-3 mr-1" />
                            {kp.knowledge_points?.name || "未知知识点"}
                          </Badge>
                        ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        无知识点
                      </span>
                    )}
                    {homework.homework_knowledge_point &&
                      homework.homework_knowledge_point.length > 2 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline">
                                +{homework.homework_knowledge_point.length - 2}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="flex flex-col gap-1">
                                {homework.homework_knowledge_point
                                  .slice(2)
                                  .map((kp: any) => (
                                    <span key={kp.knowledge_point_id}>
                                      {kp.knowledge_points?.name || "未知知识点"}
                                    </span>
                                  ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>操作</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={(e) => {
                          try {
                            console.log("点击查看详情按钮，作业ID:", homework.id);
                            const url = `/homework/${homework.id}`;
                            console.log("将导航到:", url);
                            
                            // 使用两种方式尝试导航
                            window.location.href = url;
                          } catch (error) {
                            console.error("导航失败:", error);
                            alert("导航失败，请手动前往作业详情页");
                          }
                        }}
                      >
                        <Info className="h-4 w-4 mr-2" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          console.log("点击编辑作业按钮，作业ID:", homework.id);
                          navigate(`/homework/edit/${homework.id}`);
                        }}
                      >
                        <FileEdit className="h-4 w-4 mr-2" />
                        编辑作业
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmDeleteId(homework.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除作业
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }
}
