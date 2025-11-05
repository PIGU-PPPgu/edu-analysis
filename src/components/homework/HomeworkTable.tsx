import React, { useState, useEffect } from "react";
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
import {
  Eye,
  FileText,
  MoreHorizontal,
  PenLine,
  Edit,
  Trash2,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import {
  getAllHomeworks,
  deleteHomework,
  getHomeworksByClassId,
} from "@/services/homeworkService";
import { formatDate } from "@/lib/utils";
import CreateHomeworkDialog from "./CreateHomeworkDialog";
import EditHomeworkDialog from "./EditHomeworkDialog";
import { toast } from "sonner";
import { Loading } from "@/components/Loading";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllClasses } from "@/services/classService";
import { supabase } from "@/integrations/supabase/client";

interface HomeworkTableProps {
  className?: string;
  searchTerm?: string;
}

// 状态到颜色的映射函数
const getStatusColor = (status: string) => {
  switch (status) {
    case "已截止":
      return "bg-red-100 text-red-800 hover:bg-red-100/80";
    case "进行中":
      return "bg-green-100 text-green-800 hover:bg-green-100/80";
    default:
      return "bg-blue-100 text-blue-800 hover:bg-blue-100/80";
  }
};

// 获取作业状态
const getHomeworkStatus = (dueDate: string): string => {
  const now = new Date();
  const due = new Date(dueDate);

  if (due < now) {
    return "已截止";
  } else {
    return "进行中";
  }
};

export function HomeworkTable({
  className,
  searchTerm = "",
}: HomeworkTableProps) {
  const navigate = useNavigate();
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // 编辑作业状态
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [homeworkToEdit, setHomeworkToEdit] = useState<any>(null);

  // 删除作业状态
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [homeworkToDelete, setHomeworkToDelete] = useState<any>(null);

  // 获取班级列表
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await getAllClasses();
        // 过滤掉id为空的班级数据
        setClasses((classesData || []).filter((c) => c.id));
      } catch (err) {
        console.error("获取班级列表失败:", err);
      }
    };

    fetchClasses();
  }, []);

  // 获取作业列表
  useEffect(() => {
    const fetchHomeworks = async () => {
      try {
        setLoading(true);
        setError(null);

        let data;
        if (selectedClassId && selectedClassId !== "all") {
          data = await getHomeworksByClassId(selectedClassId);
        } else {
          data = await getAllHomeworks();
        }

        console.log("获取到的作业数据:", data);
        setHomeworks(data || []);
      } catch (err) {
        console.error("获取作业列表失败:", err);
        setError("获取作业列表失败");
        toast.error("获取作业列表失败");
      } finally {
        setLoading(false);
      }
    };

    fetchHomeworks();
  }, [selectedClassId]);

  // 根据搜索词过滤作业
  const filteredHomeworks =
    searchTerm && homeworks.length > 0
      ? homeworks.filter(
          (hw) =>
            hw.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            hw.classes?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : homeworks;

  // 跳转到作业详情
  const handleViewDetails = (id: string) => {
    console.log("查看作业详情，ID:", id);
    navigate(`/homework/${id}`);
  };

  // 跳转到批改页面
  const handleGradeHomework = (id: string) => {
    console.log("批改作业，ID:", id);
    navigate(`/homework/${id}`);
  };

  // 处理新作业创建完成
  const handleHomeworkCreated = async () => {
    try {
      setLoading(true);
      let data;
      if (selectedClassId) {
        data = await getHomeworksByClassId(selectedClassId);
      } else {
        data = await getAllHomeworks();
      }
      setHomeworks(data || []);
    } catch (err) {
      console.error("刷新作业列表失败:", err);
      toast.error("刷新作业列表失败");
    } finally {
      setLoading(false);
    }
  };

  // 处理编辑作业
  const handleEditHomework = (homework: any) => {
    setHomeworkToEdit(homework);
    setIsEditDialogOpen(true);
  };

  // 处理删除作业
  const handleDeleteHomework = async (homework: any) => {
    console.log("点击删除按钮，作业信息:", homework);
    try {
      setLoading(true);

      // 先检查是否有学生提交
      const { data: submissions, error } = await supabase
        .from("homework_submissions")
        .select("id")
        .eq("homework_id", homework.id);

      if (error) {
        console.error("检查作业提交失败:", error);
        toast.error(`检查作业提交失败: ${error.message}`);
        return;
      }

      // 添加提交记录信息到作业对象
      const homeworkWithSubmissions = {
        ...homework,
        hasSubmissions: submissions && submissions.length > 0,
        submissionsCount: submissions?.length || 0,
      };

      setHomeworkToDelete(homeworkWithSubmissions);
      setIsDeleteDialogOpen(true);
    } catch (err) {
      console.error("检查作业提交失败:", err);
      toast.error(`检查作业提交失败: ${err.message || "未知错误"}`);
    } finally {
      setLoading(false);
    }
  };

  // 确认删除作业
  const confirmDeleteHomework = async () => {
    if (!homeworkToDelete) {
      console.error("没有要删除的作业信息");
      return;
    }

    console.log("确认删除作业:", homeworkToDelete.id, homeworkToDelete.title);

    try {
      setLoading(true);
      console.log("调用deleteHomework API, 参数:", homeworkToDelete.id);
      const result = await deleteHomework(homeworkToDelete.id);
      console.log("deleteHomework API返回结果:", result);

      if (result.success) {
        // 删除成功后的提示由service层负责，这里只需刷新列表
        setTimeout(() => {
          handleHomeworkCreated(); // 延迟一点刷新列表，让用户有时间看到提示
        }, 500);
      } else if (result.error) {
        // 显示详细错误信息
        console.error("删除作业失败，详细错误:", result.error);
        toast.error(`删除作业失败: ${result.error.message || "未知错误"}`);
      } else {
        console.error("删除作业失败，无详细错误信息");
        toast.error("删除作业失败");
      }
    } catch (err) {
      console.error("删除作业失败:", err);
      toast.error(`删除作业失败: ${err.message || "未知错误"}`);
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
      setHomeworkToDelete(null);
    }
  };

  // 确认强制删除作业
  const confirmForceDeleteHomework = async () => {
    if (!homeworkToDelete) return;

    try {
      setLoading(true);
      const result = await deleteHomework(homeworkToDelete.id, true); // 使用force=true

      if (result.success) {
        // 删除成功后的提示由service层负责，这里只需刷新列表
        setTimeout(() => {
          handleHomeworkCreated(); // 延迟一点刷新列表，让用户有时间看到提示
        }, 500);
      } else if (result.error) {
        // 显示详细错误信息
        console.error("强制删除作业失败，详细错误:", result.error);
        toast.error(`强制删除作业失败: ${result.error.message || "未知错误"}`);
      } else {
        toast.error("强制删除作业失败");
      }
    } catch (err) {
      console.error("强制删除作业失败:", err);
      toast.error(`强制删除作业失败: ${err.message || "未知错误"}`);
    } finally {
      setLoading(false);
      setIsForceDeleteDialogOpen(false);
      setHomeworkToDelete(null);
    }
  };

  // 处理班级筛选变化
  const handleClassFilterChange = (value: string) => {
    setSelectedClassId(value === "all" ? "" : value);
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="flex flex-row items-center">
          <div>
            <CardTitle>作业列表</CardTitle>
            <CardDescription>管理班级作业和学生提交</CardDescription>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex-shrink-0 min-w-[200px]">
              <Select
                value={selectedClassId}
                onValueChange={handleClassFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="所有班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有班级</SelectItem>
                  {classes
                    .filter((c) => !!c.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              发布新作业
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {homeworks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedClassId
                ? "该班级还没有创建任何作业"
                : "还没有创建任何作业"}
              ，点击"发布新作业"按钮创建
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>作业标题</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>截止日期</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHomeworks.map((homework) => {
                  const status = getHomeworkStatus(homework.due_date);

                  return (
                    <TableRow key={homework.id}>
                      <TableCell className="font-medium">
                        {homework.title}
                      </TableCell>
                      <TableCell>{homework.classes?.name || "N/A"}</TableCell>
                      <TableCell>
                        {homework.due_date
                          ? formatDate(homework.due_date)
                          : "无截止日期"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(status)}
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">打开菜单</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewDetails(homework.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              查看并批改
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEditHomework(homework)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              编辑作业
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                console.log(
                                  "删除按钮被点击，作业ID:",
                                  homework.id
                                );
                                handleDeleteHomework(homework);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
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
          )}
        </CardContent>
      </Card>

      {/* 创建作业对话框 */}
      <CreateHomeworkDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onHomeworkCreated={handleHomeworkCreated}
      />

      {/* 编辑作业对话框 */}
      <EditHomeworkDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onHomeworkUpdated={handleHomeworkCreated}
        homework={homeworkToEdit}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          console.log("删除对话框状态变更:", open);
          setIsDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除作业</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销。
              {homeworkToDelete?.hasSubmissions
                ? `注意：该作业已有 ${homeworkToDelete?.submissionsCount || 0} 条学生提交记录。删除将会同时删除所有提交记录、评分数据和相关文件。`
                : "删除后数据将无法恢复。"}
            </AlertDialogDescription>
            {homeworkToDelete && (
              <div className="mt-4 p-3 border border-input rounded-md">
                <div>
                  <strong>作业标题:</strong> {homeworkToDelete.title}
                </div>
                <div>
                  <strong>班级:</strong> {homeworkToDelete.classes?.name}
                </div>
                <div>
                  <strong>截止日期:</strong>{" "}
                  {homeworkToDelete.due_date
                    ? formatDate(homeworkToDelete.due_date)
                    : "无截止日期"}
                </div>
              </div>
            )}

            {homeworkToDelete?.hasSubmissions && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-700 font-medium">
                  该作业将删除以下相关数据：
                </p>
                <ul className="list-disc ml-6 mt-2 space-y-1 text-sm text-amber-700">
                  <li>所有学生的提交记录</li>
                  <li>所有学生的评分和反馈</li>
                  <li>所有相关的知识点掌握度数据</li>
                  <li>作业相关的所有文件</li>
                </ul>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log("确认删除按钮被点击");
                // 如果有提交记录，直接进行强制删除
                if (homeworkToDelete?.hasSubmissions) {
                  confirmForceDeleteHomework();
                } else {
                  confirmDeleteHomework();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 注释掉强制删除对话框，改为在上面的对话框中处理 */}
      {/* <AlertDialog open={isForceDeleteDialogOpen} onOpenChange={setIsForceDeleteDialogOpen}>
        ... 现有代码保留但注释掉 ...
      </AlertDialog> */}
    </>
  );
}
