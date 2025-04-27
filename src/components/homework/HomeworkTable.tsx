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
import { Eye, FileText, MoreHorizontal, PenLine, Edit, Trash2, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { getAllHomeworks, deleteHomework, getHomeworksByClassId } from "@/services/homeworkService";
import { formatDate } from "@/lib/utils";
import CreateHomeworkDialog from "./CreateHomeworkDialog";
import EditHomeworkDialog from "./EditHomeworkDialog";
import { toast } from "sonner";
import { Loading } from "@/components/Loading";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllClasses } from "@/services/classService";

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

export function HomeworkTable({ className, searchTerm = "" }: HomeworkTableProps) {
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
  const [homeworkToDelete, setHomeworkToDelete] = useState<any>(null);

  // 获取班级列表
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classesData = await getAllClasses();
        // 过滤掉id为空的班级数据
        setClasses((classesData || []).filter(c => c.id));
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
  const filteredHomeworks = searchTerm && homeworks.length > 0
    ? homeworks.filter(hw => 
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
  const handleDeleteHomework = (homework: any) => {
    setHomeworkToDelete(homework);
    setIsDeleteDialogOpen(true);
  };
  
  // 确认删除作业
  const confirmDeleteHomework = async () => {
    if (!homeworkToDelete) return;
    
    try {
      setLoading(true);
      const result = await deleteHomework(homeworkToDelete.id);
      
      if (result.success) {
        toast.success('作业删除成功');
        handleHomeworkCreated(); // 重新加载列表
      } else if (result.hasSubmissions) {
        toast.error(`无法删除：该作业已有 ${result.submissionsCount} 份学生提交。请考虑改为归档。`);
      } else {
        toast.error('删除作业失败');
      }
    } catch (err) {
      console.error("删除作业失败:", err);
      toast.error("删除作业失败");
    } finally {
      setLoading(false);
      setIsDeleteDialogOpen(false);
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
              <Select value={selectedClassId} onValueChange={handleClassFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="所有班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有班级</SelectItem>
                  {classes.filter(c => !!c.id).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <FileText className="mr-2 h-4 w-4" />
              发布新作业
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {homeworks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {selectedClassId ? "该班级还没有创建任何作业" : "还没有创建任何作业"}，点击"发布新作业"按钮创建
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
                      <TableCell className="font-medium">{homework.title}</TableCell>
                      <TableCell>{homework.classes?.name || 'N/A'}</TableCell>
                      <TableCell>{homework.due_date ? formatDate(homework.due_date) : '无截止日期'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(status)}>
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
                            <DropdownMenuItem onClick={() => handleViewDetails(homework.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGradeHomework(homework.id)}>
                              <PenLine className="mr-2 h-4 w-4" />
                              批改作业
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditHomework(homework)}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑作业
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteHomework(homework)}
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除作业</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销。如果学生已经提交了作业，建议不要删除。
              {homeworkToDelete && (
                <div className="mt-4 p-3 border border-input rounded-md">
                  <p><strong>作业标题:</strong> {homeworkToDelete.title}</p>
                  <p><strong>班级:</strong> {homeworkToDelete.classes?.name}</p>
                  <p><strong>截止日期:</strong> {homeworkToDelete.due_date ? formatDate(homeworkToDelete.due_date) : '无截止日期'}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteHomework} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 