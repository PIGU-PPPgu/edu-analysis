
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FileUploader from './FileUploader';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsedData } from './types';

// 学生信息验证schema
const studentSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  class_name: z.string().min(1, "班级不能为空"),
  admission_year: z.string().optional(),
  gender: z.enum(["男", "女", "其他"]).optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("请输入有效的邮箱").optional().or(z.string().length(0)),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentDataImporterProps {
  onDataImported: (data: any[]) => void;
}

const StudentDataImporter: React.FC<StudentDataImporterProps> = ({ onDataImported }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 单个学生表单
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_id: '',
      name: '',
      class_name: '',
      admission_year: '',
      gender: undefined,
      contact_phone: '',
      contact_email: '',
    },
  });

  const handleSubmit = async (values: StudentFormValues) => {
    setIsSubmitting(true);
    
    try {
      // 检查学号是否已存在
      const { data: existingStudent, error: checkError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', values.student_id)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingStudent) {
        toast.error("添加失败", {
          description: `学号 ${values.student_id} 已存在`
        });
        return;
      }
      
      // 插入学生信息
      const { data, error } = await supabase
        .from('students')
        .insert({
          student_id: values.student_id,
          name: values.name,
          class_id: null, // 后续可关联班级表
          ...values
        })
        .select();
      
      if (error) throw error;
      
      toast.success("添加成功", {
        description: `学生 ${values.name} 信息已添加`
      });
      
      // 重置表单
      form.reset({
        student_id: '',
        name: '',
        class_name: values.class_name, // 保留班级，方便连续添加同班级学生
        admission_year: values.admission_year,
        gender: undefined,
        contact_phone: '',
        contact_email: '',
      });
      
      if (data) {
        onDataImported(data);
      }
    } catch (error) {
      console.error("添加学生失败:", error);
      toast.error("添加失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileProcessed = async (data: ParsedData) => {
    if (!data || !data.data || data.data.length === 0) {
      toast.error("导入失败", {
        description: "数据为空或格式不正确"
      });
      return;
    }
    
    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    try {
      // 批量处理学生数据
      for (const item of data.data) {
        // 映射字段 (确保符合数据库字段名称)
        const studentData = {
          student_id: item.student_id || item.studentId || item.学号 || "",
          name: item.name || item.姓名 || "",
          class_name: item.class_name || item.className || item.班级 || "",
          admission_year: item.admission_year || item.admissionYear || item.入学年份 || "",
          gender: item.gender || item.性别 || "",
          contact_phone: item.contact_phone || item.contactPhone || item.电话 || "",
          contact_email: item.contact_email || item.contactEmail || item.邮箱 || "",
        };
        
        // 验证必填字段
        if (!studentData.student_id || !studentData.name || !studentData.class_name) {
          errorCount++;
          errors.push(`记录缺少必填字段: ${JSON.stringify(item)}`);
          continue;
        }
        
        // 检查学号是否已存在
        const { data: existingStudent } = await supabase
          .from('students')
          .select('id')
          .eq('student_id', studentData.student_id)
          .maybeSingle();
        
        if (existingStudent) {
          errorCount++;
          errors.push(`学号 ${studentData.student_id} 已存在`);
          continue;
        }
        
        // 插入学生信息
        const { error } = await supabase
          .from('students')
          .insert(studentData);
        
        if (error) {
          errorCount++;
          errors.push(`导入 ${studentData.name} 失败: ${error.message}`);
        } else {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success("批量导入完成", {
          description: `成功导入 ${successCount} 条学生信息`
        });
        onDataImported(data.data.slice(0, successCount));
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} 条记录导入失败`, {
          description: (
            <div className="max-h-40 overflow-y-auto">
              <ul className="list-disc list-inside">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
                {errors.length > 5 && <li className="text-sm">...还有 {errors.length - 5} 个错误</li>}
              </ul>
            </div>
          ),
          duration: 5000
        });
      }
    } catch (error) {
      console.error("批量导入学生失败:", error);
      toast.error("批量导入失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Tabs defaultValue="single" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="single">单个添加</TabsTrigger>
        <TabsTrigger value="batch">批量导入</TabsTrigger>
      </TabsList>
      
      <TabsContent value="single">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="student_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>学号 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入学号" {...field} />
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
                      <Input placeholder="请输入姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="class_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>班级 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入班级" {...field} />
                    </FormControl>
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
                      <Input placeholder="请输入入学年份" {...field} />
                    </FormControl>
                    <FormDescription>选填项，如：2023</FormDescription>
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
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="请选择性别" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="男">男</SelectItem>
                        <SelectItem value="女">女</SelectItem>
                        <SelectItem value="其他">其他</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>选填项</FormDescription>
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
                      <Input placeholder="请输入联系电话" {...field} />
                    </FormControl>
                    <FormDescription>选填项</FormDescription>
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
                      <Input placeholder="请输入电子邮箱" {...field} />
                    </FormControl>
                    <FormDescription>选填项</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "添加中..." : "添加学生"}
            </Button>
          </form>
        </Form>
      </TabsContent>
      
      <TabsContent value="batch">
        <Card className="border-2 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">批量导入学生信息</h3>
            <p className="text-sm text-muted-foreground mb-4">
              通过文件批量导入学生信息，支持Excel、CSV等格式，文件需包含学号、姓名、班级等必填字段
            </p>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">必填字段说明：</h4>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                <li>学号 (student_id): 学生唯一标识</li>
                <li>姓名 (name): 学生姓名</li>
                <li>班级 (class_name): 学生所在班级</li>
              </ul>
            </div>
          </div>
          
          <FileUploader 
            onFileProcessed={handleFileProcessed}
            isAIEnhanced={true}
          />
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default StudentDataImporter;
