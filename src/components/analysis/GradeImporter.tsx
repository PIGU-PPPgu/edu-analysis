import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import FileUploader from './FileUploader';
import TextDataImporter from './TextDataImporter';
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
import { FileInput, Loader2, AlertTriangle, Info, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SimplifiedExamForm from './SimplifiedExamForm';
import { gradeAnalysisService, MergeStrategy } from '@/services/gradeAnalysisService';
import ImportReviewDialog, { FileDataForReview, ExamInfo } from './ImportReviewDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// 成绩数据导入组件的属性
interface GradeImporterProps {
  onDataImported: (data: any[]) => void;
}

// 系统字段映射
const SYSTEM_FIELDS: Record<string, string> = {
  'student_id': '学号',
  'name': '姓名',
  'class_name': '班级',
  'score': '分数',
  'subject': '科目',
  'exam_date': '考试日期',
  'exam_type': '考试类型',
  'exam_title': '考试标题',
  'rank_in_class': '班级排名',
  'rank_in_grade': '年级排名',
  'grade': '等级评定'
};

// 成绩信息验证schema
const gradeSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "学生姓名不能为空"),
  class_name: z.string().min(1, "班级不能为空"),
  subject: z.string().min(1, "考试科目不能为空"),
  score: z.number().min(0, "分数不能为负数"),
  exam_title: z.string().min(1, "考试标题不能为空"),
  exam_type: z.string().min(1, "考试类型不能为空"),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式应为 YYYY-MM-DD")
});

type GradeFormValues = z.infer<typeof gradeSchema>;

const GradeImporter: React.FC<GradeImporterProps> = ({ onDataImported }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('file');
  const [importReviewOpen, setImportReviewOpen] = useState(false);
  const [fileData, setFileData] = useState<FileDataForReview | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [currentExamInfo, setCurrentExamInfo] = useState<ExamInfo>({
    title: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    subject: ''
  });
  
  // 用于跟踪组件挂载状态，防止内存泄漏
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // 表单初始化
  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      student_id: '',
      name: '',
      class_name: '',
      subject: '',
      score: 0,
      exam_title: '',
      exam_type: '',
      exam_date: new Date().toISOString().split('T')[0]
    },
  });

  // 下载成绩导入模板
  const downloadTemplate = () => {
    const csvContent = "学号,姓名,班级,科目,分数,考试标题,考试类型,考试日期\n2023001,张三,高一(1)班,语文,85,2023年秋季期中考试,期中考试,2023-11-15\n2023002,李四,高一(1)班,语文,92,2023年秋季期中考试,期中考试,2023-11-15\n2023003,王五,高一(2)班,语文,78,2023年秋季期中考试,期中考试,2023-11-15";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "成绩数据导入模板.csv";
    link.click();
    toast.success("模板下载成功");
  };

  // 单条成绩记录提交
  const handleSubmit = async (values: GradeFormValues) => {
    if (!isMountedRef.current) return;
    
    setIsSubmitting(true);
    
    try {
      // 1. 先保存考试信息
      const examInfo = {
        title: values.exam_title,
        type: values.exam_type,
        date: values.exam_date,
        subject: values.subject
      };
      
      const processedData = [{
        student_id: values.student_id,
        name: values.name,
        class_name: values.class_name,
        subject: values.subject,
        total_score: values.score,
        exam_title: values.exam_title,
        exam_type: values.exam_type,
        exam_date: values.exam_date
      }];
      
      // 使用服务保存数据
      const result = await gradeAnalysisService.saveExamData(
        processedData,
        examInfo,
        'update' // 对于单条记录，默认使用更新策略
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || '保存失败');
      }
      
      if (isMountedRef.current) {
        toast.success("成绩保存成功", {
          description: `已成功保存 ${values.name} 的${values.subject}成绩`
        });

        // 重置表单
        form.reset({
          student_id: '',
          name: '',
          class_name: values.class_name, // 保留班级，方便连续添加同班级学生成绩
          subject: values.subject, // 保留科目信息
          score: 0,
          exam_title: values.exam_title, // 保留考试信息
          exam_type: values.exam_type,
          exam_date: values.exam_date
        });
        
        // 通知父组件数据已导入
        onDataImported(processedData);
      }
    } catch (error) {
      console.error("保存成绩失败:", error);
      if (isMountedRef.current) {
        toast.error("保存失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  // 处理文件上传后的数据
  const handleFileProcessed = (data: ParsedData) => {
    if (!isMountedRef.current) return;
    
    if (!data || !data.data || data.data.length === 0) {
      toast.error("导入失败", {
        description: "数据为空或格式不正确"
      });
      return;
    }
    
    setFileData({
      fileName: data.fileName || '未命名文件',
      headers: data.headers,
      dataRows: data.data
    });
    
    setFileInfo({
      name: data.fileName || '未命名文件',
      size: JSON.stringify(data.data).length
    });
    
    // 打开导入审核对话框
    setImportReviewOpen(true);
  };

  // AI辅助解析文件
  const handleStartAIParse = async (fileData: FileDataForReview, examInfo: ExamInfo | null) => {
    if (!isMountedRef.current) return { suggestedMappings: {} };
    
    try {
      // 分析文件头部，尝试自动匹配字段
      const headers = fileData.headers;
      const sampleData = fileData.dataRows.slice(0, 5);
      const suggestedMappings: Record<string, string> = {};
      
      // 简单的自动映射逻辑
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        
        if (lowerHeader.includes('学号') || lowerHeader.includes('id')) {
          suggestedMappings[header] = 'student_id';
        } else if (lowerHeader.includes('姓名') || lowerHeader.includes('name')) {
          suggestedMappings[header] = 'name';
        } else if (lowerHeader.includes('班级') || lowerHeader.includes('class')) {
          suggestedMappings[header] = 'class_name';
        } else if (lowerHeader.includes('科目') || lowerHeader.includes('subject')) {
          suggestedMappings[header] = 'subject';
        } else if (lowerHeader.includes('分数') || lowerHeader.includes('成绩') || lowerHeader.includes('score')) {
          suggestedMappings[header] = 'score';
        } else if (lowerHeader.includes('考试标题') || lowerHeader.includes('title')) {
          suggestedMappings[header] = 'exam_title';
        } else if (lowerHeader.includes('考试类型') || lowerHeader.includes('type')) {
          suggestedMappings[header] = 'exam_type';
        } else if (lowerHeader.includes('日期') || lowerHeader.includes('date')) {
          suggestedMappings[header] = 'exam_date';
        } else if (lowerHeader.includes('班排名') || lowerHeader.includes('班级排名')) {
          suggestedMappings[header] = 'rank_in_class';
        } else if (lowerHeader.includes('年级排名') || lowerHeader.includes('校排名')) {
          suggestedMappings[header] = 'rank_in_grade';
        } else if (lowerHeader.includes('等级') || lowerHeader.includes('grade')) {
          suggestedMappings[header] = 'grade';
        }
      });
      
      return { suggestedMappings };
    } catch (error) {
      console.error("AI解析失败:", error);
      return { suggestedMappings: {} };
    }
  };

  // 检查学生是否已存在
  const handleCheckExistingStudents = async (
    mappings: Record<string, string>,
    sampleData: any[],
    examInfo: ExamInfo
  ) => {
    try {
      // 提取学号和考试信息
      const studentIds = sampleData.map(row => {
        const studentIdHeader = Object.entries(mappings)
          .find(([_, value]) => value === 'student_id')?.[0];
        
        return studentIdHeader ? row[studentIdHeader] : null;
      }).filter(Boolean);
      
      // 检查系统中是否已有这些学生的成绩记录
      const { data } = await supabase
        .from('grade_data')
        .select('student_id')
        .in('student_id', studentIds)
        .eq('exam_title', examInfo.title)
        .eq('exam_date', examInfo.date);
      
      const existingCount = data?.length || 0;
      
      return { count: existingCount };
    } catch (error) {
      console.error("检查学生记录失败:", error);
      return { count: 0 };
    }
  };

  // 最终导入数据
  const handleFinalImport = async (
    finalExamInfo: ExamInfo,
    confirmedMappings: Record<string, string>,
    mergeChoice: string,
    dataToImport: any[]
  ) => {
    if (!isMountedRef.current) return;
    
    try {
      // 转换数据格式
      const processedData = dataToImport.map(row => {
        const processedRow: Record<string, any> = {
          exam_title: finalExamInfo.title,
          exam_type: finalExamInfo.type,
          exam_date: finalExamInfo.date
        };
        
        // 如果设置了统一科目，使用统一科目
        if (finalExamInfo.subject) {
          processedRow.subject = finalExamInfo.subject;
        }
        
        // 根据映射关系处理每个字段
        Object.entries(confirmedMappings).forEach(([header, field]) => {
          if (field === 'score') {
            // 确保成绩是数字
            const scoreValue = row[header];
            processedRow.total_score = scoreValue ? parseFloat(scoreValue) : null;
          } else {
            processedRow[field] = row[header];
          }
        });
        
        return processedRow;
      });
      
      // 获取合并策略
      let mergeStrategy: MergeStrategy = 'update';
      if (mergeChoice === 'replace') {
        mergeStrategy = 'replace';
      } else if (mergeChoice === 'add_only') {
        mergeStrategy = 'add_only';
      }
      
      // 保存数据
      const result = await gradeAnalysisService.saveExamData(
        processedData,
        finalExamInfo,
        mergeStrategy
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || '导入失败');
      }
      
      toast.success("成绩导入成功", {
        description: `已成功导入 ${processedData.length} 条成绩记录`
      });
      
      // 通知父组件
      onDataImported(processedData);
      
      // 关闭对话框
      setImportReviewOpen(false);
      setFileData(null);
      setFileInfo(null);
      
    } catch (error) {
      console.error("导入失败:", error);
      
      toast.error("导入失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    }
  };

  // 单个字段映射建议
  const handleSuggestFieldMapping = async (header: string, sampleData: any[]) => {
    try {
      // 简单的字段映射逻辑
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('学号') || lowerHeader.includes('id')) {
        return { suggestedSystemField: 'student_id' };
      } else if (lowerHeader.includes('姓名') || lowerHeader.includes('name')) {
        return { suggestedSystemField: 'name' };
      } else if (lowerHeader.includes('班级') || lowerHeader.includes('class')) {
        return { suggestedSystemField: 'class_name' };
      } else if (lowerHeader.includes('科目') || lowerHeader.includes('subject')) {
        return { suggestedSystemField: 'subject' };
      } else if (lowerHeader.includes('分数') || lowerHeader.includes('成绩') || lowerHeader.includes('score')) {
        return { suggestedSystemField: 'score' };
      } else {
        // 检查是否是未知字段，需要创建自定义字段
        return null;
      }
    } catch (error) {
      console.error("字段映射建议失败:", error);
      return null;
    }
  };
  
  // 处理取消导入
  const handleCancelImport = () => {
    if (!isMountedRef.current) return;
    
    setImportReviewOpen(false);
    setFileData(null);
    setFileInfo(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <FileInput className="h-5 w-5 text-[#c0ff3f]" />
          成绩数据导入
        </CardTitle>
        <CardDescription>
          选择添加单个成绩记录或批量导入成绩数据文件
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 添加智能匹配说明 */}
        <Alert className="bg-blue-50 border-blue-200 mb-6">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700">智能学生匹配</AlertTitle>
          <AlertDescription className="text-blue-600">
            <p className="mb-2">系统会自动匹配学生数据，无需预处理原始文件，支持多种匹配方式：</p>
            <ul className="list-disc ml-6 space-y-1 text-sm">
              <li>优先使用<strong>学号</strong>精确匹配</li>
              <li>如果学号未匹配，尝试使用<strong>姓名+班级</strong>组合匹配</li>
              <li>如果以上均失败，尝试仅使用<strong>姓名</strong>匹配</li>
            </ul>
            <p className="mt-2 text-xs">您的数据文件只需包含学号、姓名、班级中的任意两项即可成功匹配。</p>
          </AlertDescription>
        </Alert>
        
        <Tabs defaultValue="file" className="w-full" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="file">文件导入</TabsTrigger>
            <TabsTrigger value="text">文本粘贴</TabsTrigger>
            <TabsTrigger value="single">单个添加</TabsTrigger>
            <TabsTrigger value="template">下载模板</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file">
            <FileUploader 
              onFileProcessed={handleFileProcessed}
              isAIEnhanced={true} // 使用AI增强解析
              onFileSelected={(file) => {
                setFileInfo({
                  name: file.name,
                  size: file.size
                });
              }}
            />
          </TabsContent>
          
          <TabsContent value="text">
            <TextDataImporter 
              onDataImported={handleFileProcessed}
              isAIEnhanced={true} 
            />
          </TabsContent>
          
          <TabsContent value="single">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                {/* 考试信息表单 */}
                <div className="bg-slate-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-4">考试信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="exam_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>考试标题 <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="如：2023学年第一学期期末考试" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="exam_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>考试类型 <span className="text-red-500">*</span></FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择考试类型" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="期中考试">期中考试</SelectItem>
                              <SelectItem value="期末考试">期末考试</SelectItem>
                              <SelectItem value="单元测试">单元测试</SelectItem>
                              <SelectItem value="月考">月考</SelectItem>
                              <SelectItem value="模拟考">模拟考</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="exam_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>考试日期 <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* 学生信息 */}
                <div className="bg-slate-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-4">学生信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="student_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>学号 <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="学生学号" {...field} />
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
                          <FormLabel>姓名 <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="学生姓名" {...field} />
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
                          <FormLabel>班级 <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input placeholder="如：高一(1)班" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                {/* 成绩信息 */}
                <div className="bg-slate-50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-4">成绩信息</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>科目 <span className="text-red-500">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="选择科目" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="语文">语文</SelectItem>
                              <SelectItem value="数学">数学</SelectItem>
                              <SelectItem value="英语">英语</SelectItem>
                              <SelectItem value="物理">物理</SelectItem>
                              <SelectItem value="化学">化学</SelectItem>
                              <SelectItem value="生物">生物</SelectItem>
                              <SelectItem value="政治">政治</SelectItem>
                              <SelectItem value="历史">历史</SelectItem>
                              <SelectItem value="地理">地理</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="score"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>分数 <span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="考试分数" 
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    '保存成绩'
                  )}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="template">
            <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg">
              <FileInput className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-medium mb-2">下载成绩导入模板</h3>
              <p className="text-slate-500 mb-6 text-center max-w-md">
                下载CSV格式的成绩导入模板，按照模板格式填写数据后导入系统
              </p>
              <Button 
                onClick={downloadTemplate}
                className="bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
              >
                下载模板
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* 导入审核对话框 */}
      {importReviewOpen && fileData && (
        <ImportReviewDialog 
          isOpen={importReviewOpen}
          onOpenChange={setImportReviewOpen}
          fileData={fileData}
          currentExamInfo={currentExamInfo}
          availableSystemFields={SYSTEM_FIELDS}
          initialDisplayInfo={fileInfo}
          onStartAIParse={handleStartAIParse}
          onCheckExistingStudents={handleCheckExistingStudents}
          onFinalImport={handleFinalImport}
          onSuggestFieldMapping={handleSuggestFieldMapping}
          onCancel={handleCancelImport}
        />
      )}
    </Card>
  );
};

export default GradeImporter; 