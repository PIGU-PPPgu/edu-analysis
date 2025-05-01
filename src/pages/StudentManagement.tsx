import React, { useEffect, useState } from "react";
import { Navbar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Download, 
  UserPlus, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Check, 
  X 
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface Student {
  id: string;
  student_id: string;
  name: string;
  class_id: string | null;
  admission_year: string | null;
  gender: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  class: {
    id: string;
    name: string;
  } | null;
}

interface Class {
  id: string;
  name: string;
  grade: string;
}

// 学生信息验证schema
const studentSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  class_id: z.string().min(1, "班级不能为空"),
  admission_year: z.string().optional(),
  gender: z.enum(["男", "女", "其他"]).nullable(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("请输入有效的邮箱").optional().or(z.string().length(0)),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function StudentManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);

  // 表单设置
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_id: "",
      name: "",
      class_id: "",
      admission_year: "",
      gender: null,
      contact_phone: "",
      contact_email: "",
    },
  });

  useEffect(() => {
    // 从URL参数中获取班级ID和名称
    const searchParams = new URLSearchParams(location.search);
    const classId = searchParams.get('classId');
    const className = searchParams.get('className');
    
    if (classId) {
      setSelectedClassId(classId);
    }
    
    if (className) {
      setSelectedClassName(className);
    }
    
    fetchStudents(classId || null);
    fetchClasses();
  }, [location.search]);

  useEffect(() => {
    // 当编辑模式打开且有当前学生时，重置表单值
    if (isEditing && currentStudent) {
      form.reset({
        student_id: currentStudent.student_id,
        name: currentStudent.name,
        class_id: currentStudent.class_id || "",
        admission_year: currentStudent.admission_year || "",
        gender: currentStudent.gender as "男" | "女" | "其他" | null,
        contact_phone: currentStudent.contact_phone || "",
        contact_email: currentStudent.contact_email || "",
      });
    }
  }, [isEditing, currentStudent, form]);

  const fetchStudents = async (classId: string | null = null) => {
    try {
      setLoading(true);
      let query = supabase
        .from('students')
        .select(`
          *,
          class:class_id (
            id,
            name
          )
        `);
      
      // 如果有班级ID，则按班级筛选
      if (classId) {
        query = query.eq('class_id', classId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      setStudents(data || []);
    } catch (error) {
      console.error('获取学生数据失败:', error);
      toast.error('获取学生数据失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, grade')
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('获取班级数据失败:', error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleEditStudent = (student: Student) => {
    setCurrentStudent(student);
    setIsEditing(true);
  };

  const handleConfirmDelete = (student: Student) => {
    setCurrentStudent(student);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!currentStudent) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', currentStudent.id);
        
      if (error) throw error;
      
      toast.success("删除成功", {
        description: `已删除学生 ${currentStudent.name}`
      });
      
      // 刷新学生列表
      fetchStudents();
    } catch (error) {
      console.error('删除学生失败:', error);
      toast.error('删除学生失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsConfirmDeleteOpen(false);
      setCurrentStudent(null);
    }
  };

  const handleExportStudents = () => {
    try {
      // 准备导出数据
      const exportData = filteredStudents.map(student => ({
        学号: student.student_id,
        姓名: student.name,
        班级: student.class?.name || "",
        性别: student.gender || "",
        入学年份: student.admission_year || "",
        联系电话: student.contact_phone || "",
        电子邮箱: student.contact_email || ""
      }));
      
      // 转换为CSV
      const headers = ["学号", "姓名", "班级", "性别", "入学年份", "联系电话", "电子邮箱"];
      const csvContent = [
        headers.join(","),
        ...exportData.map(row => headers.map(header => `"${(row as any)[header] || ""}"`).join(","))
      ].join("\n");
      
      // 创建下载链接
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `学生信息_${new Date().toLocaleDateString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("导出成功", {
        description: `已导出 ${exportData.length} 条学生记录`
      });
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  const onSubmit = async (values: StudentFormValues) => {
    if (!currentStudent) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .update({
          student_id: values.student_id,
          name: values.name,
          class_id: values.class_id,
          admission_year: values.admission_year || null,
          gender: values.gender,
          contact_phone: values.contact_phone || null,
          contact_email: values.contact_email || null
        })
        .eq('id', currentStudent.id);
        
      if (error) throw error;
      
      toast.success("更新成功", {
        description: `已更新学生 ${values.name} 的信息`
      });
      
      setIsEditing(false);
      setCurrentStudent(null);
      
      // 刷新学生列表
      fetchStudents();
    } catch (error) {
      console.error('更新学生失败:', error);
      toast.error('更新学生失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    }
  };

  // 移除班级筛选
  const handleClearClassFilter = () => {
    setSelectedClassId(null);
    setSelectedClassName(null);
    navigate('/student-management');
    fetchStudents();
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_id.toString().includes(searchQuery) ||
    (student.class?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">{selectedClassName ? `${selectedClassName} - ` : ''}学生管理</h1>
              <p className="text-muted-foreground mt-1">管理学生信息和班级分配</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/student-portrait-management')}
              >
                查看学生画像管理
              </Button>
              <Button 
                onClick={() => navigate('/')}
                className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                添加学生
              </Button>
            </div>
          </div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索学生姓名、学号或班级..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              {!selectedClassId && classes.length > 0 && (
                <Select onValueChange={(value) => {
                  const selectedClass = classes.find(c => c.id === value);
                  if (selectedClass) {
                    setSelectedClassId(value);
                    setSelectedClassName(selectedClass.name);
                    navigate(`/student-management?classId=${value}&className=${encodeURIComponent(selectedClass.name)}`);
                    fetchStudents(value);
                  }
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="按班级筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExportStudents}>
              <Download className="mr-2 h-4 w-4" />
              导出
            </Button>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">加载中...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              {searchQuery ? '没有找到匹配的学生' : '还没有学生数据，请添加学生'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学号</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>班级</TableHead>
                    <TableHead>性别</TableHead>
                    <TableHead>入学年份</TableHead>
                    <TableHead>联系电话</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.student_id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        {student.class ? (
                          <Badge variant="outline" className="bg-blue-50">
                            {student.class.name}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{student.gender || '-'}</TableCell>
                      <TableCell>{student.admission_year || '-'}</TableCell>
                      <TableCell>{student.contact_phone || '-'}</TableCell>
                      <TableCell className="truncate max-w-[180px]">
                        {student.contact_email || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">打开菜单</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditStudent(student)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleConfirmDelete(student)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
      
      {/* 编辑学生信息对话框 */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>编辑学生信息</DialogTitle>
            <DialogDescription>
              修改学生基本信息，包括班级、联系方式等。
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="student_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>学号 *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名 *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>班级 *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择班级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
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
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>性别</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value || undefined}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择性别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="男">男</SelectItem>
                          <SelectItem value="女">女</SelectItem>
                          <SelectItem value="其他">其他</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="admission_year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>入学年份</FormLabel>
                      <FormControl>
                        <Input placeholder="如：2023" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话</FormLabel>
                      <FormControl>
                        <Input placeholder="电话号码" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>电子邮箱</FormLabel>
                      <FormControl>
                        <Input placeholder="电子邮箱地址" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  取消
                </Button>
                <Button type="submit">保存修改</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* 确认删除对话框 */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除学生 {currentStudent?.name} 的信息吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteStudent}>
              <Trash2 className="mr-2 h-4 w-4" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
