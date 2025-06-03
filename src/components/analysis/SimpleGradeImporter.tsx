import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, Download, Loader2, CheckCircle } from 'lucide-react';
import { gradeAnalysisService } from '@/services/gradeAnalysisService';

interface SimpleGradeImporterProps {
  onDataImported: (data: any[]) => void;
}

interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject?: string;
}

export const SimpleGradeImporter: React.FC<SimpleGradeImporterProps> = ({ onDataImported }) => {
  const [examInfo, setExamInfo] = useState<ExamInfo>({
    title: '',
    type: '期中考试',
    date: new Date().toISOString().split('T')[0],
    subject: ''
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    step: 'upload' | 'parse' | 'save' | 'complete';
    message: string;
  }>({
    step: 'upload',
    message: '请选择文件并填写考试信息'
  });

  // 智能文件处理
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 验证文件类型
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      toast.error('文件格式不支持', {
        description: '请选择 CSV 或 Excel 文件'
      });
      return;
    }
    
    setSelectedFile(file);
    
    // 尝试从文件名智能推断考试信息
    const fileName = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
    
    // 智能识别考试类型
    if (fileName.includes('期中')) {
      setExamInfo(prev => ({ ...prev, type: '期中考试' }));
    } else if (fileName.includes('期末')) {
      setExamInfo(prev => ({ ...prev, type: '期末考试' }));
    } else if (fileName.includes('月考')) {
      setExamInfo(prev => ({ ...prev, type: '月考' }));
    } else if (fileName.includes('模拟')) {
      setExamInfo(prev => ({ ...prev, type: '模拟考试' }));
    }
    
    // 智能识别日期
    const dateMatch = fileName.match(/(\d{4})[-年]?(\d{1,2})[-月]?(\d{1,2})?/);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      const date = `${year}-${month.padStart(2, '0')}-${(day || '01').padStart(2, '0')}`;
      setExamInfo(prev => ({ ...prev, date }));
    }
    
    // 智能识别标题
    if (!examInfo.title) {
      setExamInfo(prev => ({ 
        ...prev, 
        title: fileName.replace(/[\d年月日\-_\.]/g, ' ').trim() || '未命名考试'
      }));
    }
    
    toast.success('文件选择成功', {
      description: `已选择文件: ${file.name}`
    });
  }, [examInfo.title]);

  // 一键导入处理
  const handleQuickImport = async () => {
    if (!selectedFile) {
      toast.error('请先选择文件');
      return;
    }
    
    if (!examInfo.title.trim()) {
      toast.error('请填写考试标题');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // 步骤1: 解析文件
      setImportProgress({
        step: 'parse',
        message: '正在解析文件内容...'
      });
      
      await new Promise(resolve => setTimeout(resolve, 500)); // 给用户看到进度
      
      const fileData = await parseFile(selectedFile);
      
      if (!fileData || fileData.length === 0) {
        throw new Error('文件内容为空或格式错误');
      }
      
      // 步骤2: 智能字段映射
      setImportProgress({
        step: 'parse',
        message: '正在智能识别数据字段...'
      });
      
      const mappedData = intelligentFieldMapping(fileData);
      
      // 步骤3: 保存数据
      setImportProgress({
        step: 'save',
        message: '正在保存成绩数据...'
      });
      
      const result = await gradeAnalysisService.saveExamData(
        mappedData,
        examInfo,
        'replace', // 使用替换策略，简化用户选择
        {
          examScope: 'class',
          newStudentStrategy: 'create' // 自动创建新学生
        }
      );
      
      if (!result.success) {
        throw new Error(result.message || '保存数据失败');
      }
      
      // 步骤4: 完成
      setImportProgress({
        step: 'complete',
        message: `成功导入 ${mappedData.length} 条成绩记录`
      });
      
      toast.success('导入成功!', {
        description: `已成功导入 ${mappedData.length} 条成绩记录`,
        duration: 3000
      });
      
      // 通知父组件
      onDataImported(mappedData);
      
      // 重置状态
      setTimeout(() => {
        setSelectedFile(null);
        setExamInfo({
          title: '',
          type: '期中考试',
          date: new Date().toISOString().split('T')[0],
          subject: ''
        });
        setImportProgress({
          step: 'upload',
          message: '请选择文件并填写考试信息'
        });
      }, 2000);
      
    } catch (error) {
      console.error('导入失败:', error);
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
      
      setImportProgress({
        step: 'upload',
        message: '导入失败，请重试'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 解析文件内容
  const parseFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          
          if (file.name.toLowerCase().endsWith('.csv')) {
            // 解析CSV
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
              throw new Error('CSV文件格式错误，至少需要标题行和数据行');
            }
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const data = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row: any = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              return row;
            });
            
            resolve(data);
          } else {
            // Excel文件需要使用专门的库解析
            // 这里简化处理，实际项目中需要集成xlsx库
            reject(new Error('Excel文件解析需要额外配置，请使用CSV格式'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // 智能字段映射
  const intelligentFieldMapping = (data: any[]): any[] => {
    if (!data || data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    const mappings: Record<string, string> = {};
    
    // 智能识别常见字段
    headers.forEach(header => {
      const normalized = header.toLowerCase().trim();
      
      if (normalized.includes('学号') || normalized.includes('id')) {
        mappings[header] = 'student_id';
      } else if (normalized.includes('姓名') || normalized.includes('name')) {
        mappings[header] = 'name';
      } else if (normalized.includes('班级') || normalized.includes('class')) {
        mappings[header] = 'class_name';
      } else if (normalized.includes('分数') || normalized.includes('成绩') || 
                 normalized.includes('score') || normalized.includes('总分')) {
        mappings[header] = 'score';
      } else if (normalized.includes('科目') || normalized.includes('subject')) {
        mappings[header] = 'subject';
      }
    });
    
    // 转换数据
    return data.map(row => {
      const mappedRow: any = {
        exam_title: examInfo.title,
        exam_type: examInfo.type,
        exam_date: examInfo.date,
        subject: examInfo.subject || '总分'
      };
      
      Object.entries(mappings).forEach(([originalField, targetField]) => {
        mappedRow[targetField] = row[originalField];
      });
      
      // 确保必要字段存在
      if (!mappedRow.student_id && row['学号']) {
        mappedRow.student_id = row['学号'];
      }
      if (!mappedRow.name && row['姓名']) {
        mappedRow.name = row['姓名'];
      }
      if (!mappedRow.score && row['总分']) {
        mappedRow.score = parseFloat(row['总分']) || 0;
      }
      if (!mappedRow.class_name) {
        mappedRow.class_name = row['班级'] || row['class'] || '未知班级';
      }
      
      return mappedRow;
    });
  };

  // 下载模板
  const downloadTemplate = () => {
    const template = `学号,姓名,班级,总分
20240001,张三,高一(1)班,85
20240002,李四,高一(1)班,92
20240003,王五,高一(2)班,78`;
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '成绩导入模板.csv';
    link.click();
    
    toast.success('模板下载成功', {
      description: '请按照模板格式准备您的数据'
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          快速成绩导入
        </CardTitle>
        <p className="text-sm text-gray-600">
          上传CSV文件，系统将自动识别字段并导入成绩数据
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 考试信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="exam-title">考试标题 *</Label>
            <Input
              id="exam-title"
              value={examInfo.title}
              onChange={(e) => setExamInfo(prev => ({ ...prev, title: e.target.value }))}
              placeholder="例如：2024年春季期中考试"
            />
          </div>
          
          <div>
            <Label htmlFor="exam-type">考试类型</Label>
            <Select value={examInfo.type} onValueChange={(value) => setExamInfo(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="期中考试">期中考试</SelectItem>
                <SelectItem value="期末考试">期末考试</SelectItem>
                <SelectItem value="月考">月考</SelectItem>
                <SelectItem value="模拟考试">模拟考试</SelectItem>
                <SelectItem value="单元测试">单元测试</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="exam-date">考试日期</Label>
            <Input
              id="exam-date"
              type="date"
              value={examInfo.date}
              onChange={(e) => setExamInfo(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          
          <div>
            <Label htmlFor="exam-subject">科目 (可选)</Label>
            <Input
              id="exam-subject"
              value={examInfo.subject}
              onChange={(e) => setExamInfo(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="留空表示总分"
            />
          </div>
        </div>
        
        {/* 文件上传 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isProcessing}
          />
          
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="h-8 w-8 mx-auto text-green-600" />
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 mx-auto text-gray-400" />
              <div>
                <Label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
                  点击选择文件
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  支持 CSV、Excel 格式
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* 进度显示 */}
        {isProcessing && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="font-medium text-blue-800">正在处理...</p>
                <p className="text-sm text-blue-600">{importProgress.message}</p>
              </div>
            </div>
          </div>
        )}
        
        {importProgress.step === 'complete' && !isProcessing && (
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">导入完成!</p>
                <p className="text-sm text-green-600">{importProgress.message}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button 
            onClick={handleQuickImport}
            disabled={!selectedFile || !examInfo.title.trim() || isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                导入中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                一键导入
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            下载模板
          </Button>
        </div>
        
        {/* 使用说明 */}
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
          <h4 className="font-medium mb-2">使用说明：</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>请确保CSV文件包含：学号、姓名、班级、分数等必要字段</li>
            <li>系统会自动识别常见字段名称（支持中英文）</li>
            <li>新学生会自动创建，已存在的考试数据会被替换</li>
            <li>建议先下载模板了解标准格式</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}; 