import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FileUploader from './FileUploader';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
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
import { Download, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// 学生信息验证schema
const studentSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  class_name: z.string().min(1, "班级不能为空"),
  class_id: z.string().uuid().optional(),
  admission_year: z.string().optional(),
  gender: z.enum(["男", "女", "其他"]).optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email("请输入有效的邮箱").optional().or(z.string().length(0)),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentDataImporterProps {
  onDataImported: (data: any[]) => void;
}

// 添加一个辅助函数来标准化性别值
const normalizeGender = (gender: string | undefined | null): string | null => {
  if (!gender || gender.trim() === "") return null;
  
  const normalized = gender.trim();
  // 只允许'男'、'女'、'其他'三个值
  if (['男', '女', '其他'].includes(normalized)) {
    return normalized;
  }
  
  // 尝试匹配常见的性别表示
  if (['male', 'm', '男生', '男孩'].some(term => normalized.toLowerCase().includes(term))) {
    return '男';
  }
  
  if (['female', 'f', '女生', '女孩'].some(term => normalized.toLowerCase().includes(term))) {
    return '女';
  }
  
  // 默认返回null
  return null;
};

const StudentDataImporter: React.FC<StudentDataImporterProps> = ({ onDataImported }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'replace'>('skip');
  const navigate = useNavigate();
  
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

  const downloadTemplate = () => {
    const csvContent = "学号,姓名,班级,入学年份,性别,联系电话,电子邮箱\n20230001,张三,高一1班,2023,男,13812345678,zhangsan@example.com\n20230002,李四,高一2班,2023,女,13987654321,lisi@example.com\n20230003,王五,高一3班,2023,男,13712345678,wangwu@example.com";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "学生信息模板.csv";
    link.click();
    toast.success("模板下载成功");
  };

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
      
      // 检查班级是否存在于classes表中
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('name', values.class_name)
        .maybeSingle();
        
      if (classError) throw classError;
      
      let class_id = classData?.id;
      
      // 如果班级不存在，先创建班级
      if (!classData) {
        // 提取年级信息，例如从"初三7班"提取"初三"
        let grade = '未指定';
        if (values.class_name.match(/^[初高][一二三]/) || values.class_name.match(/^[1-9][年级班]/)) {
          grade = values.class_name.replace(/[0-9班级组]/g, '').trim();
        }
        
        toast.info(`班级 "${values.class_name}" 不存在，将自动创建该班级`);
        
        // 创建班级记录
        const { data: newClassData, error: createClassError } = await supabase
          .from('classes')
          .insert({
            name: values.class_name,
            grade: grade
          })
          .select('id');
          
        if (createClassError) throw createClassError;
        class_id = newClassData[0].id;
        
        // 同时尝试在class_info表中创建记录以保持一致性
        try {
          await supabase
            .from('class_info' as any)
            .insert({
              class_name: values.class_name,
              grade_level: grade,
              academic_year: new Date().getFullYear().toString(),
              student_count: 1
            } as any);
        } catch (e) {
          console.warn('更新class_info表失败', e);
          // 不中断流程，因为主要关系是students和classes
        }
      }
      
      // 插入学生信息
      const { data, error } = await supabase
        .from('students')
        .insert({
          student_id: values.student_id,
          name: values.name,
          class_id: class_id,
          admission_year: values.admission_year,
          gender: normalizeGender(values.gender),
          contact_phone: values.contact_phone,
          contact_email: values.contact_email
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
    let updatedCount = 0;
    const errors: string[] = [];
    
    try {
      // 收集所有班级名称
      const classNames = new Set<string>();
      data.data.forEach(item => {
        const className = item.class_name || item.className || item.班级 || "";
        if (className) classNames.add(className);
      });
      
      // 创建班级名称到ID的映射
      const classNameToIdMap = new Map<string, string>();
      
      // 检查班级是否存在
      for (const className of classNames) {
        try {
          // 尝试在classes表中查询班级
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id, name')
            .eq('name', className)
            .maybeSingle();
            
          if (classError) {
            console.error(`查询班级 "${className}" 失败:`, classError);
            errors.push(`查询班级 "${className}" 失败: ${classError.message}`);
            continue;
          }
          
          // 如果班级不存在，创建班级
          if (!classData) {
            // 提取年级信息，例如从"初三7班"提取"初三"
            let grade = '未指定';
            if (className.match(/^[初高][一二三]/) || className.match(/^[1-9][年级班]/)) {
              grade = className.replace(/[0-9班级组]/g, '').trim();
            }
            
            console.log(`尝试创建班级: ${className}, 年级: ${grade}`);
            
            const { data: newClassData, error: createClassError } = await supabase
              .from('classes')
              .insert({
                name: className,
                grade: grade
              })
              .select('id');
              
            if (createClassError) {
              console.error(`创建班级 "${className}" 失败:`, createClassError);
              errors.push(`创建班级 "${className}" 失败: ${createClassError.message}`);
              continue;
            }
            
            // 保存新班级ID到映射
            classNameToIdMap.set(className, newClassData[0].id);
            
            // 同时尝试在class_info表中创建记录
            try {
              await supabase
                .from('class_info' as any)
                .insert({
                  class_name: className,
                  grade_level: grade,
                  academic_year: new Date().getFullYear().toString(),
                  student_count: 0
                } as any);
            } catch (e) {
              console.warn(`更新class_info表失败 (${className}):`, e);
              // 不中断流程
            }
            
            console.log(`已创建班级: ${className}`);
          } else {
            // 保存已有班级ID到映射
            classNameToIdMap.set(className, classData.id);
          }
        } catch (e) {
          console.error(`处理班级 "${className}" 时出错:`, e);
          errors.push(`处理班级 "${className}" 时出错: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      
      // 批量处理学生数据
      for (const item of data.data) {
        try {
          // 映射字段 (确保符合数据库字段名称)
          const className = item.class_name || item.className || item.班级 || "";
          const class_id = classNameToIdMap.get(className);
          
          if (!class_id) {
            errorCount++;
            errors.push(`找不到班级 "${className}" 的ID，无法添加学生 ${item.name || item.姓名 || ""}`);
            continue;
          }
          
          const genderValue = item.gender || item.性别 || "";
          const studentData = {
            student_id: item.student_id || item.studentId || item.学号 || "",
            name: item.name || item.姓名 || "",
            class_id: class_id,
            admission_year: item.admission_year || item.admissionYear || item.入学年份 || "",
            gender: normalizeGender(genderValue),
            contact_phone: item.contact_phone || item.contactPhone || item.电话 || "",
            contact_email: item.contact_email || item.contactEmail || item.邮箱 || "",
          };
          
          // 验证必填字段
          if (!studentData.student_id || !studentData.name) {
            errorCount++;
            errors.push(`记录缺少必填字段: ${JSON.stringify(item)}`);
            continue;
          }
          
          // 检查学号是否已存在
          const { data: existingStudent, error: checkError } = await supabase
            .from('students')
            .select('student_id')
            .eq('student_id', studentData.student_id)
            .maybeSingle();
          
          if (checkError) {
            console.error(`检查学号 ${studentData.student_id} 是否存在时出错:`, checkError);
            errors.push(`检查学号 ${studentData.student_id} 失败: ${checkError.message}`);
            errorCount++;
            continue;
          }
          
          // 根据选择的策略处理重复数据
          if (existingStudent) {
            // 存在重复学号
            if (duplicateStrategy === 'skip') {
              // 跳过策略
              errorCount++;
              errors.push(`学号 ${studentData.student_id} 已存在，已跳过`);
              continue;
            } else if (duplicateStrategy === 'update' || duplicateStrategy === 'replace') {
              // 更新或替换策略
              let updateData = studentData;
              
              if (duplicateStrategy === 'update') {
                // 获取完整的现有数据，只更新有值的字段
                const { data: fullExisting } = await supabase
                  .from('students')
                  .select('*')
                  .eq('student_id', studentData.student_id)
                  .single();
                  
                if (fullExisting) {
                  // 智能合并：只用新数据中非空的字段替换旧数据
                  updateData = Object.entries(studentData).reduce((result, [key, value]) => {
                    // 只更新有具体值的字段，保留现有数据中有值但新数据中为空的字段
                    if (value !== "" && value !== null && value !== undefined) {
                      result[key] = value;
                    } else if (fullExisting[key]) {
                      result[key] = fullExisting[key];
                    }
                    return result;
                  }, {} as any);
                }
              }
              
              // 执行更新
              const { error: updateError } = await supabase
                .from('students')
                .update(updateData)
                .eq('student_id', studentData.student_id);
                
              if (updateError) {
                console.error(`更新学生 ${studentData.name} 失败:`, updateError);
                errorCount++;
                errors.push(`更新 ${studentData.name} 失败: ${updateError.message}`);
              } else {
                updatedCount++;
                console.log(`已更新学生: ${studentData.name}`);
              }
            }
          } else {
            // 插入新学生信息
            console.log(`尝试插入学生: ${JSON.stringify(studentData)}`);
            const { error } = await supabase
              .from('students')
              .insert(studentData);
            
            if (error) {
              console.error(`导入学生 ${studentData.name} 失败:`, error);
              errorCount++;
              errors.push(`导入 ${studentData.name} 失败: ${error.message}`);
            } else {
              successCount++;
            }
          }
        } catch (e) {
          console.error(`处理学生记录时出错:`, e);
          errorCount++;
          errors.push(`处理学生记录时出错: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      
      // 构建成功消息
      let successMessage = "";
      if (successCount > 0 && updatedCount > 0) {
        successMessage = `成功导入 ${successCount} 条新记录，更新 ${updatedCount} 条已有记录`;
      } else if (successCount > 0) {
        successMessage = `成功导入 ${successCount} 条学生信息`;
      } else if (updatedCount > 0) {
        successMessage = `成功更新 ${updatedCount} 条学生信息`;
      }
      
      if (successCount > 0 || updatedCount > 0) {
        // 先显示处理中提示
        toast.success("导入完成，正在处理数据...", {
          description: (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>请稍候，系统正在处理您导入的数据</span>
            </div>
          )
        });
        
        // 延迟导航，给用户感知时间
        setTimeout(() => {
        toast.success("批量导入完成", {
            description: (
              <div className="space-y-2">
                <p>{successMessage}</p>
                <p className="text-xs text-green-600">导入成功</p>
              </div>
            )
        });
        onDataImported(data.data.slice(0, successCount + updatedCount));
        
          // 不再导航到单独的页面，而是通过回调函数通知父组件
          // navigate("/student-management");
        }, 1500);
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} 条记录导入失败`, {
          description: (
            <div className="max-h-40 overflow-y-auto">
              <Alert variant="destructive" className="mb-2">
                <AlertTitle>导入过程中发生错误</AlertTitle>
                <AlertDescription>
                  部分学生数据未能成功导入，请查看以下错误信息
                </AlertDescription>
              </Alert>
              <ul className="list-disc list-inside">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
                {errors.length > 5 && <li className="text-sm">...还有 {errors.length - 5} 个错误</li>}
              </ul>
            </div>
          ),
          duration: 7000
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
        <TabsTrigger value="template">下载模板</TabsTrigger>
      </TabsList>
      
      {isSubmitting && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">正在处理，请稍候...</p>
          </div>
        </div>
      )}
      
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
            
            {/* 重复数据处理策略 */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">重复数据处理策略：</h4>
              <RadioGroup 
                value={duplicateStrategy}
                onValueChange={(value) => setDuplicateStrategy(value as 'skip' | 'update' | 'replace')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="skip" id="skip" />
                  <label htmlFor="skip" className="text-sm text-blue-700 cursor-pointer">
                    跳过重复学号（默认）- 已存在的学生记录将不被导入
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="update" />
                  <label htmlFor="update" className="text-sm text-blue-700 cursor-pointer">
                    智能更新 - 仅更新文件中包含的字段，保留数据库中已有的其他信息
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="replace" />
                  <label htmlFor="replace" className="text-sm text-blue-700 cursor-pointer">
                    完全替换 - 用新数据完全替换已有记录
                  </label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
              <h4 className="text-sm font-medium text-yellow-800 mb-1">必填字段说明：</h4>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                <li>学号 (student_id): 学生唯一标识</li>
                <li>姓名 (name): 学生姓名</li>
                <li>班级 (class_name): 学生所在班级</li>
              </ul>
            </div>
            
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="mb-4 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              下载学生信息模板
            </Button>
          </div>
          
          <FileUploader 
            onFileProcessed={handleFileProcessed}
            isAIEnhanced={true}
          />
        </Card>
      </TabsContent>

      <TabsContent value="template">
        <Card className="border p-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">学生信息模板</CardTitle>
            <CardDescription>
              下载学生信息导入模板，包含基本字段和示例数据
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">学生信息模板包含以下字段：</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>学号（必填）：学生唯一标识</li>
                  <li>姓名（必填）：学生姓名</li>
                  <li>班级（必填）：学生所在班级</li>
                  <li>入学年份：学生入学年份，例如"2023"</li>
                  <li>性别：学生性别，可填"男"、"女"或"其他"</li>
                  <li>联系电话：学生或家长联系电话</li>
                  <li>电子邮箱：学生或家长电子邮箱地址</li>
                </ul>
              </div>
              
              <Button 
                onClick={downloadTemplate} 
                className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c] flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                下载学生信息模板
              </Button>
              
              <div className="text-sm text-gray-500">
                <p>提示：下载后可使用Excel或其他电子表格软件编辑，完成后保存为CSV格式上传</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default StudentDataImporter;

