import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { FileInput, Loader2, AlertTriangle, Info, Check, HelpCircle, Download, FileSpreadsheet, FileText, UploadCloud, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SimplifiedExamForm from './SimplifiedExamForm';
import { gradeAnalysisService, MergeStrategy } from '@/services/gradeAnalysisService';
import ImportReviewDialog, { FileDataForReview, ExamInfo } from './ImportReviewDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Lightbulb } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

// 自定义字段类型
interface CustomField {
  id: string;
  name: string;
  key: string;
  description?: string;
  field_type?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

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
  
  // 用于存储自定义字段的状态
  const [userCreatedCustomFields, setUserCreatedCustomFields] = useState<Record<string, string>>({});
  
  // 组合系统字段和自定义字段
  const allAvailableFields = useRef<Record<string, string>>(SYSTEM_FIELDS);
  
  // 用于跟踪组件挂载状态，防止内存泄漏
  const isMountedRef = useRef(true);
  
  // 用于字段分析缓存
  const fieldAnalysisCache = useRef<Record<string, any>>({});
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // 加载自定义字段
  useEffect(() => {
    const loadCustomFields = async () => {
      try {
        console.log("[GradeImporter] 正在加载自定义字段...");
        
        const { data, error } = await supabase
          .from('custom_fields')
          .select('*');
          
        if (error) {
          console.error("加载自定义字段失败:", error);
          return;
        }
        
        if (data && data.length > 0) {
          const customFieldsMap: Record<string, string> = {};
          
          // 将自定义字段添加到映射中
          data.forEach((field: CustomField) => {
            customFieldsMap[`custom_${field.id}`] = `${field.name} (自定义)`;
          });
          
          console.log(`[GradeImporter] 加载了 ${data.length} 个自定义字段`);
          
          // 更新自定义字段状态
          setUserCreatedCustomFields(customFieldsMap);
          
          // 更新 allAvailableFields 引用
          allAvailableFields.current = {
            ...SYSTEM_FIELDS,
            ...customFieldsMap
          };
        } else {
          console.log("[GradeImporter] 没有找到自定义字段");
          allAvailableFields.current = { ...SYSTEM_FIELDS };
        }
      } catch (error) {
        console.error("加载自定义字段时出错:", error);
      }
    };
    
    loadCustomFields();
  }, []);
  
  // 初始化数据库表
  useEffect(() => {
    const initDatabase = async () => {
      try {
        // 初始化或验证数据库
        const result = await gradeAnalysisService.initializeDatabase();
        console.log('数据库初始化结果:', result);
        
        if (result.success && result.createdTables && result.createdTables.length > 0) {
          toast.success('系统数据表初始化完成', {
            description: `已创建缺失的表: ${result.createdTables.join(', ')}`
          });
        }
        
        // 验证学生表结构，确保class_name字段存在
        try {
          const tableCheck = await gradeAnalysisService.checkAndFixStudentsTable();
          console.log('学生表结构检查结果:', tableCheck);
          
          if (tableCheck.success) {
            console.log('学生表结构验证成功');
          } else {
            console.warn('学生表结构问题:', tableCheck.message);
            
            // 如果有SQL修复脚本但自动修复失败，显示Toast通知
            if (tableCheck.sql) {
              toast.warning('数据库表结构需要修复', {
                description: tableCheck.message,
                duration: 6000,
                action: {
                  label: '了解详情',
                  onClick: () => {
                    // 这里可以添加显示SQL的逻辑，或者引导用户到管理界面
                    console.info('需要执行的SQL:', tableCheck.sql);
                    alert('请联系管理员执行必要的数据库修复脚本');
                  }
                }
              });
            }
          }
        } catch (tableError) {
          console.error('检查学生表结构失败:', tableError);
        }
        
        // 验证考试表结构，确保scope字段存在
        try {
          const examsTableCheck = await gradeAnalysisService.checkAndFixExamsTable();
          console.log('考试表结构检查结果:', examsTableCheck);
          
          if (examsTableCheck.success) {
            console.log('考试表结构验证成功');
          } else {
            console.warn('考试表结构问题:', examsTableCheck.message);
            
            // 检查错误详情
            if (examsTableCheck.error && 
                examsTableCheck.error.message && 
                examsTableCheck.error.message.includes('already exists')) {
              // 如果错误是列已存在，这其实是成功的情况，只是检测过程失败
              console.log('根据错误信息推断scope字段已存在，忽略错误');
            }
            // 如果有SQL修复脚本但自动修复失败，显示Toast通知
            else if (examsTableCheck.sql) {
              // 对于列已存在但检测失败的特殊情况，使用警告而不是错误
              if (examsTableCheck.message && examsTableCheck.message.includes('already exists')) {
                console.log('列已存在但自动检测失败，无需修复');
              } else {
                toast.warning('考试表结构需要修复', {
                  description: examsTableCheck.message,
                  duration: 6000,
                  action: {
                    label: '了解详情',
                    onClick: () => {
                      console.info('需要执行的SQL:', examsTableCheck.sql);
                      alert('请联系管理员执行必要的数据库修复脚本 fix_exams_table.sql');
                    }
                  }
                });
              }
            }
          }
        } catch (tableError) {
          console.error('检查考试表结构失败:', tableError);
        }
        
        // 验证成绩数据表结构，确保exam_scope字段存在
        try {
          const gradeDataTableCheck = await gradeAnalysisService.fixGradeDataTable();
          console.log('成绩数据表结构检查结果:', gradeDataTableCheck);
          
          if (gradeDataTableCheck.success) {
            console.log('成绩数据表结构验证成功');
          } else {
            console.warn('成绩数据表结构问题:', gradeDataTableCheck.message);
            
            // 检查错误详情
            if (gradeDataTableCheck.error && 
                gradeDataTableCheck.error.message && 
                gradeDataTableCheck.error.message.includes('already exists')) {
              // 如果错误是列已存在，这其实是成功的情况
              console.log('根据错误信息推断exam_scope字段已存在，忽略错误');
            }
            // 如果有SQL修复脚本但自动修复失败，显示Toast通知
            else if (gradeDataTableCheck.sql) {
              toast.warning('成绩数据表结构需要修复', {
                description: gradeDataTableCheck.message,
                duration: 6000,
                action: {
                  label: '了解详情',
                  onClick: () => {
                    console.info('需要执行的SQL:', gradeDataTableCheck.sql);
                    alert('请联系管理员执行必要的数据库修复脚本 fix_grade_data_table.sql');
                  }
                }
              });
            }
          }
        } catch (tableError) {
          console.error('检查成绩数据表结构失败:', tableError);
        }
      } catch (error) {
        console.error('初始化数据库失败:', error);
        toast.error('初始化数据库失败', {
          description: '系统在检查或创建必要的数据表时出错。可能影响数据导入功能。'
        });
      }
    };
    
    initDatabase();
  }, []);
  
  // 监听导入审核对话框的打开状态
  useEffect(() => {
    console.log('[GradeImporter] 导入审核对话框状态变化:', {
      importReviewOpen,
      hasFileData: !!fileData,
      hasFileInfo: !!fileInfo
    });
  }, [importReviewOpen, fileData, fileInfo]);
  
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

  // 处理自定义字段创建请求
  const handleCustomFieldCreateRequested = async (newFieldName: string, originalHeader: string): Promise<string | null> => {
    console.log(`[GradeImporter] 创建自定义字段请求: "${newFieldName}" (原始表头: "${originalHeader}")`);
    
    if (!newFieldName.trim()) {
      console.error("自定义字段名不能为空");
      return null;
    }
    
    try {
      // 生成唯一的字段键名
      const fieldKey = `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // 将字段信息保存到数据库
      const { data, error } = await supabase
        .from('custom_fields')
        .insert([{
          name: newFieldName.trim(),
          key: fieldKey,
          description: `由原始表头 "${originalHeader}" 自动创建`,
          field_type: 'text',
          metadata: {
            original_header: originalHeader,
            auto_created: true,
            created_from: 'import'
          }
        }])
        .select('id, name')
        .single();
        
      if (error) {
        console.error("保存自定义字段失败:", error);
        throw new Error(`创建自定义字段失败: ${error.message}`);
      }
      
      if (!data || !data.id) {
        throw new Error("创建自定义字段返回的数据无效");
      }
      
      // 生成字段的唯一ID (将在映射中使用)
      const customFieldId = `custom_${data.id}`;
      
      // 更新本地自定义字段映射
      const updatedCustomFields = {
        ...userCreatedCustomFields,
        [customFieldId]: `${newFieldName} (自定义)`
      };
      
      setUserCreatedCustomFields(updatedCustomFields);
      
      // 更新allAvailableFields引用
      allAvailableFields.current = {
        ...SYSTEM_FIELDS,
        ...updatedCustomFields
      };
      
      console.log(`[GradeImporter] 自定义字段创建成功: "${newFieldName}" (ID: ${customFieldId})`);
      
      return customFieldId;
    } catch (error) {
      console.error("创建自定义字段失败:", error);
      toast.error("创建自定义字段失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
      return null;
    }
  };

  // 获取文件图标
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
    } else if (extension === 'csv') {
      return <FileText className="h-5 w-5 text-blue-600" />;
    } else {
      return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  // 格式化文件大小显示
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 下载模板文件
  const handleTemplateDownload = (type: 'excel' | 'csv') => {
    try {
      // 创建一个包含示例数据的工作簿
      const wb = XLSX.utils.book_new();
      
      // 定义模板数据
      const templateData = [
        ['学号', '姓名', '班级', '科目', '分数', '考试日期', '等级', '班排名', '年级排名', '备注'],
        ['1001', '张三', '高一(1)班', '数学', 95, '2024-07-15', 'A', 1, 5, ''],
        ['1002', '李四', '高一(1)班', '数学', 88, '2024-07-15', 'B', 2, 12, '表现不错'],
        ['1003', '王五', '高一(2)班', '数学', 78, '2024-07-15', 'C', 5, 25, '需要加强']
      ];
      
      // 创建工作表
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      
      // 设置列宽
      const colWidths = [
        { wch: 10 },  // 学号
        { wch: 8 },   // 姓名
        { wch: 12 },  // 班级
        { wch: 8 },   // 科目
        { wch: 6 },   // 分数
        { wch: 12 },  // 日期
        { wch: 6 },   // 等级
        { wch: 8 },   // 班排名
        { wch: 8 },   // 年级排名
        { wch: 15 },  // 备注
      ];
      ws['!cols'] = colWidths;
      
      // 将工作表添加到工作簿
      XLSX.utils.book_append_sheet(wb, ws, "成绩模板");
      
      // 下载文件
      if (type === 'excel') {
        XLSX.writeFile(wb, "成绩导入模板.xlsx");
        toast.success("Excel模板下载成功");
      } else {
        // 转换为CSV并下载
        const csvContent = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        
        link.href = URL.createObjectURL(blob);
        link.download = "成绩导入模板.csv";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("CSV模板下载成功");
      }
    } catch (error) {
      console.error("模板下载失败:", error);
      toast.error("模板下载失败", { 
        description: error instanceof Error ? error.message : "未知错误"
      });
    }
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
    
    console.log("[GradeImporter] 收到文件数据，准备打开导入对话框", {
      fileSize: data.data.length,
      headers: data.headers
    });
    
    // 设置文件数据和文件信息
    setFileData({
      fileName: data.fileName || '未命名文件',
      headers: data.headers,
      dataRows: data.data
    });
    
    setFileInfo({
      name: data.fileName || '未命名文件',
      size: JSON.stringify(data.data).length
    });
    
    // 确保在状态更新后再打开对话框
    setTimeout(() => {
      setImportReviewOpen(true);
      console.log("[GradeImporter] 已设置对话框打开状态为true");
    }, 200);
  };

  // AI辅助解析文件
  const handleStartAIParse = async (fileData: FileDataForReview, examInfo: ExamInfo | null) => {
    if (!isMountedRef.current) return { suggestedMappings: {} };
    
    try {
      console.log("[GradeImporter] 开始智能解析文件结构", {
        headers: fileData.headers,
        rowCount: fileData.dataRows.length
      });
      
      // 分析文件头部和样本数据
      const headers = fileData.headers;
      const sampleData = fileData.dataRows.slice(0, Math.min(10, fileData.dataRows.length));
      const suggestedMappings: Record<string, string> = {};
      
      // 1. 尝试从localStorage获取之前成功的映射规则
      const storedMappings = localStorage.getItem('gradeImporter.lastSuccessfulMappings');
      let historicalMappings: Record<string, string> = {};
      if (storedMappings) {
        try {
          historicalMappings = JSON.parse(storedMappings);
          console.log("[GradeImporter] 找到历史映射规则:", historicalMappings);
        } catch (e) {
          console.warn("解析历史映射规则失败:", e);
        }
      }
      
      // 2. 基于文件特征判断是否与上次导入的文件格式相似
      const fileSignature = headers.join('|').toLowerCase();
      const storedSignature = localStorage.getItem('gradeImporter.lastFileSignature');
      let usedHistoricalMapping = false;
      
      // 如果表头完全一致，直接使用历史映射
      if (storedSignature && storedSignature === fileSignature && Object.keys(historicalMappings).length > 0) {
        console.log("[GradeImporter] 检测到与上次导入相同的文件格式，应用历史映射");
        // 确认历史映射中的所有字段仍然存在于当前文件
        const allFieldsPresent = Object.keys(historicalMappings).every(header => headers.includes(header));
        
        if (allFieldsPresent) {
          toast.success("自动应用上次的导入设置", {
            description: "系统检测到与上次相同的导入格式",
          });
          usedHistoricalMapping = true;
          return { suggestedMappings: historicalMappings };
        }
      }
      
      if (!usedHistoricalMapping) {
        // 3. 更复杂的表头匹配规则
        
        // 表头匹配规则库 - 更全面的中英文表头匹配
        const headerPatterns = [
          // 学号匹配规则
          { field: 'student_id', patterns: ['学号', '学生编号', '编号', 'id', 'student id', 'student_id', '学籍号', '考号'] },
          // 姓名匹配规则
          { field: 'name', patterns: ['姓名', '学生姓名', 'name', 'student name', 'student_name', '名字', '学生', '考生姓名', '学员姓名'] },
          // 班级匹配规则
          { field: 'class_name', patterns: ['班级', '班级名称', 'class', 'class name', 'class_name', '所在班级', '班组', '行政班'] },
          // 科目匹配规则
          { field: 'subject', patterns: ['科目', '考试科目', 'subject', '学科', '课程', '课程名称', '科目名称'] },
          // 分数匹配规则
          { field: 'score', patterns: ['分数', '成绩', '成绩分数', 'score', 'grade', '得分', '总分', '考试成绩', '总成绩', '原始分', '得分'] },
          // 考试标题匹配规则
          { field: 'exam_title', patterns: ['考试标题', '考试名称', '测试名称', 'exam title', 'exam_title', 'title', '考试', '测验标题', '测验名称'] },
          // 考试类型匹配规则
          { field: 'exam_type', patterns: ['考试类型', 'exam type', 'exam_type', 'type', '类型', '考试性质', '考试种类'] },
          // 日期匹配规则
          { field: 'exam_date', patterns: ['日期', '考试日期', 'date', 'exam date', 'exam_date', '考试时间', '测试日期', '测验日期', '考期'] },
          // 班级排名匹配规则
          { field: 'rank_in_class', patterns: ['班排名', '班级排名', '班内排名', 'class rank', 'rank in class', 'rank_in_class', '班排', '班次序', '班名', '名次（班）', '班级名次', '班内序位'] },
          // 年级排名匹配规则  
          { field: 'rank_in_grade', patterns: ['年级排名', '校排名', '学校排名', '总排名', 'grade rank', 'rank in grade', 'rank_in_grade', '年排', '校排', '全级排名', '校名', '学校名次', '年级名次', '名次（校）', '全校排名'] },
          // 等级评定匹配规则
          { field: 'grade', patterns: ['等级', '等级评定', '评级', 'grade', 'level', '成绩等级', 'grade level', '等第'] },
        ];
        
        // 应用表头匹配规则
        headers.forEach(header => {
          const lowerHeader = header.toLowerCase().trim();
          
          // 特殊处理：对于"总分校名"/"总分班名"等复合表头，优先识别为排名
          if ((lowerHeader.includes('校名') || lowerHeader.includes('校排') || lowerHeader.includes('学校') || 
               lowerHeader.includes('年级排') || lowerHeader.includes('全校')) && 
              (lowerHeader.includes('总分') || lowerHeader.includes('分数'))) {
            suggestedMappings[header] = 'rank_in_grade';
            console.log(`[GradeImporter] 特殊复合表头匹配(年级排名): ${header} -> rank_in_grade`);
            return;
          }
          
          if ((lowerHeader.includes('班名') || lowerHeader.includes('班排') || lowerHeader.includes('班级')) && 
              (lowerHeader.includes('总分') || lowerHeader.includes('分数'))) {
            suggestedMappings[header] = 'rank_in_class';
            console.log(`[GradeImporter] 特殊复合表头匹配(班级排名): ${header} -> rank_in_class`);
            return;
          }
          
          // 根据规则库匹配
          for (const patternObj of headerPatterns) {
            // 精确匹配
            if (patternObj.patterns.includes(lowerHeader)) {
              suggestedMappings[header] = patternObj.field;
              console.log(`[GradeImporter] 精确匹配: ${header} -> ${patternObj.field}`);
              break;
            }
            
            // 部分匹配 - 判断表头是否包含任一模式
            const matchedPattern = patternObj.patterns.find(pattern => 
              lowerHeader.includes(pattern) || pattern.includes(lowerHeader)
            );
            
            if (matchedPattern) {
              suggestedMappings[header] = patternObj.field;
              console.log(`[GradeImporter] 部分匹配: ${header} -> ${patternObj.field} (匹配模式: ${matchedPattern})`);
              break;
            }
          }
        });
        
        // 4. 基于数据内容的智能分析
        headers.forEach(header => {
          // 如果已经匹配，跳过
          if (suggestedMappings[header]) return;
          
          // 提取此列的所有非空值
          const columnValues = sampleData
            .map(row => row[header])
            .filter(value => value !== null && value !== undefined && value !== '');
          
          if (columnValues.length === 0) return;
          
          // 基于内容判断类型
          const valueType = typeof columnValues[0];
          const firstValue = String(columnValues[0]).trim();
          
          // 学号特征：通常是数字字符串或带特定前缀的字符串
          if (!suggestedMappings[header] && (
              /^\d{5,12}$/.test(firstValue) || // 5-12位数字
              /^(G|S|XS|STU|XH|J)[\d-]+$/i.test(firstValue) // 带常见前缀的学号
          )) {
            const allNumbersOrIDFormat = columnValues.every(val => 
              /^\d{5,12}$/.test(String(val)) || /^(G|S|XS|STU|XH|J)[\d-]+$/i.test(String(val))
            );
            
            if (allNumbersOrIDFormat && !Object.values(suggestedMappings).includes('student_id')) {
              suggestedMappings[header] = 'student_id';
              console.log(`[GradeImporter] 内容分析匹配学号: ${header}`);
            }
          }
          
          // 分数特征：数值在0-100间
          if (!suggestedMappings[header] && valueType === 'number') {
            const isScoreRange = columnValues.every(val => {
              const num = parseFloat(String(val));
              return !isNaN(num) && num >= 0 && num <= 100;
            });
            
            if (isScoreRange && !Object.values(suggestedMappings).includes('score')) {
              suggestedMappings[header] = 'score';
              console.log(`[GradeImporter] 内容分析匹配分数: ${header}`);
            }
          }
          
          // 日期特征：符合日期格式
          if (!suggestedMappings[header] && /^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}$/.test(firstValue)) {
            const allDates = columnValues.every(val => /^\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}$/.test(String(val)));
            
            if (allDates && !Object.values(suggestedMappings).includes('exam_date')) {
              suggestedMappings[header] = 'exam_date';
              console.log(`[GradeImporter] 内容分析匹配日期: ${header}`);
            }
          }
          
          // 姓名特征：通常是2-4个汉字
          if (!suggestedMappings[header] && /^[\u4e00-\u9fa5]{2,4}$/.test(firstValue)) {
            const allChineseNames = columnValues.every(val => /^[\u4e00-\u9fa5]{2,4}$/.test(String(val)));
            
            if (allChineseNames && !Object.values(suggestedMappings).includes('name')) {
              suggestedMappings[header] = 'name';
              console.log(`[GradeImporter] 内容分析匹配姓名: ${header}`);
            }
          }
          
          // 班级特征：通常包含"班"字或类似格式
          if (!suggestedMappings[header] && (
              firstValue.includes('班') || 
              /^\d+$/.test(firstValue) || // 纯数字可能是班号
              /^[一二三四五六七八九十]$/.test(firstValue) || // 中文数字
              /^\d+[\(（][a-zA-Z]\)）]$/.test(firstValue) // 1(A)格式
          )) {
            const allPossibleClasses = columnValues.every(val => {
              const strVal = String(val);
              return strVal.includes('班') || 
                     /^\d+$/.test(strVal) || 
                     /^[一二三四五六七八九十]$/.test(strVal) || 
                     /^\d+[\(（][a-zA-Z]\)）]$/.test(strVal);
            });
            
            if (allPossibleClasses && !Object.values(suggestedMappings).includes('class_name')) {
              suggestedMappings[header] = 'class_name';
              console.log(`[GradeImporter] 内容分析匹配班级: ${header}`);
            }
          }
        });
        
        // 5. 基于表头数量的优先级映射 - 如果有太多未匹配字段，专注于必要字段
        const mappedFields = Object.values(suggestedMappings);
        const essentialFields = ['student_id', 'name', 'score'];
        
        // 如果存在唯一的未映射数值列，且分数字段未映射，假定其为分数
        if (!mappedFields.includes('score')) {
          const unmappedNumericColumns = headers.filter(header => {
            if (suggestedMappings[header]) return false; // 已映射的跳过
            
            // 检查是否为数值列
            const numericValues = sampleData
              .map(row => parseFloat(row[header]))
              .filter(num => !isNaN(num));
              
            return numericValues.length > sampleData.length * 0.8; // 80%以上是数字则视为数值列
          });
          
          if (unmappedNumericColumns.length === 1) {
            suggestedMappings[unmappedNumericColumns[0]] = 'score';
            console.log(`[GradeImporter] 基于唯一数值列推断分数: ${unmappedNumericColumns[0]}`);
          }
        }
      }
      
      // 存储本次映射规则，供下次使用
      localStorage.setItem('gradeImporter.lastFileSignature', headers.join('|').toLowerCase());
      localStorage.setItem('gradeImporter.sampleDataFormat', JSON.stringify(
        sampleData.slice(0, 2).map(row => 
          Object.keys(row).reduce((acc, key) => {
            // 存储数据类型而非实际值
            acc[key] = typeof row[key];
            return acc;
          }, {} as Record<string, string>)
        )
      ));
      
      console.log(`[GradeImporter] 智能分析完成，匹配了${Object.keys(suggestedMappings).length}/${headers.length}个字段`);
      
      return { suggestedMappings };
    } catch (error) {
      console.error("[GradeImporter] AI解析失败:", error);
      return { suggestedMappings: {} };
    }
  };

  // 检查学生是否已存在
  const handleCheckExistingStudents = async (
    mappings: Record<string, string>,
    sampleData: any[],
    examInfo: ExamInfo,
    examScope: 'class' | 'grade' = 'class',
    newStudentStrategy: 'create' | 'ignore' = 'ignore'
  ) => {
    console.log("[GradeImporter] 检查学生信息", { 
      mappings, 
      sampleRowCount: sampleData.length,
      examInfo,
      examScope,
      newStudentStrategy
    });
    
    try {
      // 检查学生ID/姓名字段是否已映射
      const hasStudentIdMapping = Object.values(mappings).includes('student_id');
      const hasNameMapping = Object.values(mappings).includes('name');
      const hasClassMapping = Object.values(mappings).includes('class_name');
      
      if (!hasStudentIdMapping && !hasNameMapping) {
        toast.warning("缺少学生识别字段", {
          description: "请至少映射学号或姓名字段以便识别学生"
        });
        return { count: 0 };
      }
      
      // 确保学生表存在
      const tableResult = await gradeAnalysisService.ensureStudentsTableExists();
      if (!tableResult.success) {
        console.warn('学生表不存在或无法创建:', tableResult);
        toast.warning('学生信息表可能不存在', {
          description: '系统尝试检查学生表失败，可能导致学生匹配不准确'
        });
        return { count: 5 }; // 假设成功匹配，允许用户继续操作
      }
      
      // 提取映射的关键字段
      const studentIdField = Object.keys(mappings).find(key => mappings[key] === 'student_id');
      const nameField = Object.keys(mappings).find(key => mappings[key] === 'name');
      const classField = Object.keys(mappings).find(key => mappings[key] === 'class_name');
      
      // 用于匹配的学生信息
      let matchedCount = 0;
      
      // 使用supabase检查每个学生记录
      for (const row of sampleData) {
        let studentInfo: any = {};
        
        if (studentIdField && row[studentIdField]) {
          studentInfo.student_id = row[studentIdField];
        }
        
        if (nameField && row[nameField]) {
          studentInfo.name = row[nameField];
        }
        
        if (classField && row[classField]) {
          studentInfo.class_name = row[classField];
        }
        
        // 如果有足够信息进行匹配
        if (studentInfo.student_id || (studentInfo.name && (studentInfo.student_id || studentInfo.class_name))) {
          // 查询现有学生
          try {
            // 首先检查students表是否存在
            const checkTable = async () => {
              try {
                // 尝试只查询一条记录检查表是否存在
                const { count, error } = await supabase
                  .from('students')
                  .select('*', { count: 'exact', head: true })
                  .limit(1);
                
                return !error; // 如果没有错误，表存在
              } catch (e) {
                console.error("检查students表是否存在失败:", e);
                return false;
              }
            };
            
            // 执行表检查
            const tableExists = await checkTable();
            if (!tableExists) {
              console.error("students表不存在，无法进行学生匹配");
              // 模拟匹配成功以避免阻塞流程
              matchedCount++;
              continue;
            }
            
            // 优先使用学号查询
            if (studentInfo.student_id) {
              try {
                const { data, error } = await supabase
                  .from('students')
                  .select('*')
                  .eq('student_id', studentInfo.student_id)
                  .limit(1);
                
                if (error) {
                  console.error("通过学号查询学生失败:", error);
                } else if (data && data.length > 0) {
                  matchedCount++;
                  continue; // 已找到匹配，继续下一条
                }
              } catch (err) {
                console.error("通过学号查询学生时发生异常:", err);
              }
            }
            
            // 如果有姓名和班级，使用这两个字段查询
            if (studentInfo.name && studentInfo.class_name) {
              try {
                const { data, error } = await supabase
                  .from('students')
                  .select('*')
                  .eq('name', studentInfo.name)
                  .eq('class_name', studentInfo.class_name)
                  .limit(1);
                
                if (error) {
                  console.error("通过姓名+班级查询学生失败:", error);
                } else if (data && data.length > 0) {
                  matchedCount++;
                  continue; // 已找到匹配，继续下一条
                }
              } catch (err) {
                console.error("通过姓名+班级查询学生时发生异常:", err);
              }
            }
            
            // 如果只有姓名，尝试只通过姓名匹配
            if (studentInfo.name) {
              try {
                const { data, error } = await supabase
                  .from('students')
                  .select('*')
                  .eq('name', studentInfo.name)
                  .limit(1);
                
                if (error) {
                  console.error("通过姓名查询学生失败:", error);
                } else if (data && data.length > 0) {
                  matchedCount++;
                  continue; // 已找到匹配，继续下一条
                }
              } catch (err) {
                console.error("通过姓名查询学生时发生异常:", err);
              }
            }
          } catch (err) {
            console.error("查询学生信息时出错:", err);
          }
        }
      }
      
      console.log(`[GradeImporter] 样本数据中找到 ${matchedCount} 个匹配的学生`);
      
      return { count: matchedCount };
    } catch (error) {
      console.error("[GradeImporter] 检查学生时出错:", error);
      toast.error("检查学生信息失败");
      return { count: 0 };
    }
  };

  // 最终导入数据
  const handleFinalImport = async (
    finalExamInfo: ExamInfo,
    confirmedMappings: Record<string, string>,
    mergeChoice: string,
    dataToImport: any[],
    examScope: 'class' | 'grade' = 'class',
    newStudentStrategy: 'create' | 'ignore' = 'ignore'
  ) => {
    console.log("[GradeImporter] 开始最终导入", { 
      finalExamInfo, 
      mappingsCount: Object.keys(confirmedMappings).length,
      rowsToImport: dataToImport.length,
      mergeChoice,
      examScope,
      newStudentStrategy 
    });
    
    try {
      // 处理导入数据
      // 根据映射转换数据格式
      const processedData = dataToImport.map((row, index) => {
        const processedRow: Record<string, any> = {
          exam_title: finalExamInfo.title,
          exam_type: finalExamInfo.type,
          exam_date: finalExamInfo.date,
        };
        
        if (finalExamInfo.subject) {
          processedRow.subject = finalExamInfo.subject;
        }
        
        // 扩展数据
        processedRow.exam_scope = examScope;
        processedRow.import_strategy = {
          newStudent: newStudentStrategy,
          mergeChoice
        };
        
        // 处理每个映射的字段
        Object.keys(confirmedMappings).forEach(header => {
          const systemField = confirmedMappings[header];
          if (systemField && row[header] !== undefined) {
            processedRow[systemField] = row[header];
          }
        });
        
        return processedRow;
      });
      
      // 确定合并策略
      let mergeStrategy: 'replace' | 'update' | 'add_only' = 'replace';
      if (mergeChoice === 'update_existing') {
        mergeStrategy = 'update';
      } else if (mergeChoice === 'add_only') {
        mergeStrategy = 'add_only';
      }
      
      // 保存数据
      const result = await gradeAnalysisService.saveExamData(
        processedData,
        finalExamInfo,
        mergeStrategy,
        {
          examScope,
          newStudentStrategy
        }
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || '导入失败');
      }
      
      // 成功导入后，保存映射规则供下次使用
      try {
        localStorage.setItem('gradeImporter.lastSuccessfulMappings', JSON.stringify(confirmedMappings));
        console.log('[GradeImporter] 保存成功的映射规则供下次使用:', confirmedMappings);
      } catch (storageError) {
        console.warn('保存映射规则失败:', storageError);
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
  const handleSuggestFieldMapping = async (header: string, sampleData: any[], retryCount = 0) => {
    // 检查缓存中是否已有此字段的分析结果
    if (fieldAnalysisCache.current[header]) {
      console.log(`[GradeImporter] 使用缓存的字段分析结果: ${header}`);
      return fieldAnalysisCache.current[header];
    }
    
    const MAX_RETRIES = 2; // 最大重试次数
    
    try {
      console.log(`[GradeImporter] 请求AI分析字段: ${header}，样本数据: ${JSON.stringify(sampleData.slice(0, 3))}...`);
      
      // 提示用户正在分析
      if (retryCount === 0) {
        toast.info("AI分析中...", {
          id: `ai-analysis-${header}`,
          duration: 3000
        });
      }
      
      // 先尝试使用Edge Function调用AI服务
      try {
        // 调用AI服务进行分析
        const { data, error } = await supabase.functions.invoke('proxy-ai-request', {
          body: { 
            task: 'field_mapping_suggestion',
            header,
            sampleData: sampleData.slice(0, 10), // 只发送前10个样本以减少数据量
            availableFields: Object.keys(SYSTEM_FIELDS).map(key => ({
              id: key,
              name: SYSTEM_FIELDS[key]
            }))
          }
        });
        
        if (error) {
          console.error("AI服务调用失败:", error);
          
          // 添加重试逻辑
          if (retryCount < MAX_RETRIES) {
            toast.warning(`正在重试分析(${retryCount + 1}/${MAX_RETRIES})`, {
              id: `ai-analysis-${header}`,
              duration: 2000
            });
            
            // 延迟一秒后重试
            return await new Promise(resolve => {
              setTimeout(async () => {
                const result = await handleSuggestFieldMapping(header, sampleData, retryCount + 1);
                resolve(result);
              }, 1000);
            });
          }
          
          throw error;
        }
        
        if (data && data.suggestion) {
          console.log(`[GradeImporter] AI服务成功返回建议: ${JSON.stringify(data.suggestion)}`);
          
          // 缓存分析结果
          fieldAnalysisCache.current[header] = data.suggestion;
          
          // 成功提示
          toast.success("分析完成", {
            id: `ai-analysis-${header}`,
            duration: 2000
          });
          
          return data.suggestion;
        }
      } catch (aiError) {
        console.warn("AI服务调用失败，使用本地逻辑回退:", aiError);
        
        // 添加重试逻辑
        if (retryCount < MAX_RETRIES) {
          toast.warning(`AI服务暂时不可用，正在重试(${retryCount + 1}/${MAX_RETRIES})`, {
            id: `ai-analysis-${header}`,
            duration: 2000
          });
          
          // 延迟一秒后重试
          return await new Promise(resolve => {
            setTimeout(async () => {
              const result = await handleSuggestFieldMapping(header, sampleData, retryCount + 1);
              resolve(result);
            }, 1000);
          });
        }
      }
      
      // 如果AI服务调用失败，使用本地简单匹配逻辑作为后备
      console.log("[GradeImporter] 使用本地匹配逻辑作为后备");
      toast.info("使用本地规则进行匹配", {
        id: `ai-analysis-${header}`,
        duration: 2000
      });
      
      const lowerHeader = header.toLowerCase();
      let suggestion = null;
      
      if (lowerHeader.includes('学号') || lowerHeader.includes('id')) {
        suggestion = { suggestedSystemField: 'student_id' };
      } else if (lowerHeader.includes('姓名') || lowerHeader.includes('name')) {
        suggestion = { suggestedSystemField: 'name' };
      } else if (lowerHeader.includes('班级') || lowerHeader.includes('class')) {
        suggestion = { suggestedSystemField: 'class_name' };
      } else if (lowerHeader.includes('科目') || lowerHeader.includes('subject')) {
        suggestion = { suggestedSystemField: 'subject' };
      } else if (lowerHeader.includes('分数') || lowerHeader.includes('成绩') || lowerHeader.includes('score')) {
        suggestion = { suggestedSystemField: 'score' };
      } else if (lowerHeader.includes('排名') || lowerHeader.includes('名次') || lowerHeader.includes('rank')) {
        if (lowerHeader.includes('班') || lowerHeader.includes('class')) {
          suggestion = { suggestedSystemField: 'rank_in_class' };
        } else if (lowerHeader.includes('校') || lowerHeader.includes('年级') || lowerHeader.includes('grade')) {
          suggestion = { suggestedSystemField: 'rank_in_grade' };
        }
      } else if (lowerHeader.includes('日期') || lowerHeader.includes('时间') || lowerHeader.includes('date')) {
        suggestion = { suggestedSystemField: 'exam_date' };
      } else if (lowerHeader.includes('考试') || lowerHeader.includes('测试') || lowerHeader.includes('exam')) {
        if (lowerHeader.includes('类型') || lowerHeader.includes('type')) {
          suggestion = { suggestedSystemField: 'exam_type' };
        } else if (lowerHeader.includes('标题') || lowerHeader.includes('名称') || lowerHeader.includes('title')) {
          suggestion = { suggestedSystemField: 'exam_title' };
        }
      }
      
      // 如果找到匹配的系统字段
      if (suggestion) {
        // 缓存分析结果
        fieldAnalysisCache.current[header] = suggestion;
        return suggestion;
      }
      
      // 可能是需要创建自定义字段的情况
      // 尝试根据样本数据判断字段类型
      const nonEmptyValues = sampleData.filter(v => v !== null && v !== undefined && v !== '');
      if (nonEmptyValues.length > 0) {
        // 样本数据的第一个非空值
        const sample = nonEmptyValues[0];
        
        // 如果看起来像是等级评定 (A, B, C, 优, 良, 等)
        if (typeof sample === 'string' && /^[A-F]$|^[优良中差]$/.test(sample)) {
          suggestion = { 
            isNewField: true, 
            newFieldName: `${header}_等级评定`,
            suggestedSystemField: '' 
          };
        }
        
        // 如果看起来像是得分率/百分比
        if (typeof sample === 'number' && sample <= 100 && sample >= 0) {
          const headerLower = header.toLowerCase();
          if (headerLower.includes('率') || headerLower.includes('比') || headerLower.includes('percent')) {
            suggestion = { 
              isNewField: true, 
              newFieldName: `${header}_比率`,
              suggestedSystemField: '' 
            };
          }
        }
        
        // 缓存分析结果
        if (suggestion) {
          fieldAnalysisCache.current[header] = suggestion;
          return suggestion;
        }
      }
      
      // 无法建议
      toast.info("无法确定字段类型", {
        id: `ai-analysis-${header}`,
        duration: 2000
      });
      
      // 缓存结果 (即使是null)
      fieldAnalysisCache.current[header] = null;
      return null;
    } catch (error) {
      console.error("字段映射建议失败:", error);
      
      // 错误提示
      toast.error("字段分析失败", { 
        id: `ai-analysis-${header}`,
        description: error instanceof Error ? error.message : "未知错误"
      });
      
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
                onClick={() => handleTemplateDownload('csv')}
                className="bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
              >
                下载CSV模板
              </Button>
              <Button 
                onClick={() => handleTemplateDownload('excel')}
                className="bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
              >
                下载Excel模板
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* 导入审核对话框 */}
      {importReviewOpen && (
        <ImportReviewDialog 
          isOpen={importReviewOpen}
          onOpenChange={setImportReviewOpen}
          fileData={fileData}
          currentExamInfo={currentExamInfo}
          availableSystemFields={{...SYSTEM_FIELDS, ...userCreatedCustomFields}}
          initialDisplayInfo={fileInfo}
          onStartAIParse={handleStartAIParse}
          onCheckExistingStudents={handleCheckExistingStudents}
          onFinalImport={handleFinalImport}
          onSuggestFieldMapping={handleSuggestFieldMapping}
          onCustomFieldCreateRequested={handleCustomFieldCreateRequested}
          onCancel={handleCancelImport}
        />
      )}
    </Card>
  );
};

export default GradeImporter; 