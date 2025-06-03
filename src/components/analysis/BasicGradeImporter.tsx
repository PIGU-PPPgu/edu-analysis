import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { gradeAnalysisService } from '@/services/gradeAnalysisService';
import * as XLSX from 'xlsx';

interface BasicGradeImporterProps {
  onDataImported: (data: any[]) => void;
}

export const BasicGradeImporter: React.FC<BasicGradeImporterProps> = ({ onDataImported }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [examInfo, setExamInfo] = useState({
    title: '',
    type: '期中考试',
    date: new Date().toISOString().split('T')[0],
    subject: '总分'
  });

  // 文件处理
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExtension)) {
      toast.error('文件格式不支持', {
        description: '请选择 CSV 或 Excel 文件'
      });
      return;
    }

    setFile(selectedFile);
    await parseFile(selectedFile);
  };

  // 解析文件
  const parseFile = async (file: File) => {
    setIsLoading(true);
    
    try {
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      let data: any[] = [];

      if (fileExtension === '.csv') {
        data = await parseCSV(file);
      } else {
        data = await parseExcel(file);
      }

      if (data.length > 0) {
        setHeaders(Object.keys(data[0]));
        setParsedData(data);
        
        // 自动推断考试信息
        const fileName = file.name.replace(/\.(csv|xlsx|xls)$/i, '');
        if (fileName.includes('期中')) {
          setExamInfo(prev => ({ ...prev, type: '期中考试' }));
        } else if (fileName.includes('期末')) {
          setExamInfo(prev => ({ ...prev, type: '期末考试' }));
        } else if (fileName.includes('月考')) {
          setExamInfo(prev => ({ ...prev, type: '月考' }));
        }
        
        if (!examInfo.title) {
          setExamInfo(prev => ({ ...prev, title: fileName || '未命名考试' }));
        }
        
        toast.success('文件解析成功', {
          description: `解析了 ${data.length} 条记录`
        });
      }
    } catch (error) {
      console.error('文件解析失败:', error);
      toast.error('文件解析失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 解析CSV
  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('CSV文件格式错误');
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
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  // 解析Excel
  const parseExcel = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 智能字段映射 - 增加学生匹配功能
  const createFieldMappingWithStudentMatch = async (data: any[]) => {
    if (!data || data.length === 0) return [];

    const mappedData = [];
    let matchedCount = 0;
    let newStudentCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const mappedRow: any = {
        exam_title: examInfo.title,
        exam_type: examInfo.type,
        exam_date: examInfo.date,
        subject: examInfo.subject
      };

      // 第一步：从原始数据中提取基本信息
      let studentInfo: { student_id?: string; name?: string; class_name?: string } = {};
      
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === undefined || value === null || value === '') return;
        
        const lowerKey = key.toLowerCase();
        const trimmedValue = String(value).trim();

        // 提取学生基本信息用于匹配
        if (lowerKey.includes('学号') || lowerKey.includes('studentid') || 
            lowerKey.includes('student_id') || lowerKey === 'id' || lowerKey === '编号') {
          studentInfo.student_id = trimmedValue;
        } 
        else if (lowerKey.includes('姓名') || lowerKey.includes('name') || 
                 lowerKey.includes('学生姓名') || lowerKey === '姓名') {
          studentInfo.name = trimmedValue;
        } 
        else if (lowerKey.includes('班级') || lowerKey.includes('class') ||
                 lowerKey.includes('班') || lowerKey === '班级名称') {
          studentInfo.class_name = trimmedValue;
        }
        
        // 继续提取其他字段
        if (lowerKey.includes('分数') || lowerKey.includes('成绩') || 
            lowerKey.includes('总分') || lowerKey.includes('score') ||
            lowerKey === '分数' || lowerKey === '成绩' || lowerKey === '总分') {
          const numValue = parseFloat(trimmedValue);
          if (!isNaN(numValue)) {
            mappedRow.score = numValue;
          }
        } 
        else if (lowerKey.includes('等级') || lowerKey.includes('grade') ||
                 lowerKey.includes('评级')) {
          mappedRow.grade = trimmedValue;
        } 
        else if (lowerKey.includes('班级排名') || lowerKey.includes('班名')) {
          const rankValue = parseInt(trimmedValue);
          if (!isNaN(rankValue)) {
            mappedRow.rank_in_class = rankValue;
          }
        } 
        else if (lowerKey.includes('年级排名') || lowerKey.includes('级名')) {
          const rankValue = parseInt(trimmedValue);
          if (!isNaN(rankValue)) {
            mappedRow.rank_in_grade = rankValue;
          }
        }
      });

      // 第二步：尝试匹配后台已有学生
      try {
        const matchResult = await gradeAnalysisService.matchStudentEnhanced ? 
          await gradeAnalysisService.matchStudentEnhanced(studentInfo) :
          await gradeAnalysisService.originalMatchStudent(studentInfo);

        if (matchResult.matchedStudent) {
          // 找到匹配的学生，使用后台数据
          mappedRow.student_id = matchResult.matchedStudent.student_id;
          mappedRow.name = matchResult.matchedStudent.name;
          mappedRow.class_name = matchResult.matchedStudent.class_name;
          matchedCount++;
          
          console.log(`✅ 第${i+1}行: 匹配到学生 ${mappedRow.name} (${mappedRow.student_id}) - ${matchResult.matchReason || '姓名班级匹配'}`);
        } else {
          // 没有找到匹配的学生，使用原始数据或生成新数据
          if (studentInfo.student_id) {
            mappedRow.student_id = studentInfo.student_id;
          } else if (studentInfo.name) {
            // 生成临时学号
            const nameBase = studentInfo.name.replace(/\s+/g, '');
            const classBase = studentInfo.class_name ? studentInfo.class_name.replace(/\s+/g, '') : 'unknown';
            mappedRow.student_id = `${classBase}_${nameBase}_${Date.now() % 10000}`;
          }
          
          mappedRow.name = studentInfo.name || `学生_${mappedRow.student_id}`;
          mappedRow.class_name = studentInfo.class_name || '未知班级';
          newStudentCount++;
          
          console.log(`🆕 第${i+1}行: 新学生 ${mappedRow.name} (${mappedRow.student_id})`);
        }
      } catch (error) {
        console.error(`❌ 第${i+1}行匹配失败:`, error);
        // 降级处理：使用原始数据
        mappedRow.student_id = studentInfo.student_id || `unknown_${Date.now() % 10000}`;
        mappedRow.name = studentInfo.name || `学生_${mappedRow.student_id}`;
        mappedRow.class_name = studentInfo.class_name || '未知班级';
      }

      mappedData.push(mappedRow);
    }

    console.log(`🎯 学生匹配结果: 匹配已有学生 ${matchedCount} 个，新学生 ${newStudentCount} 个`);
    return mappedData;
  };

  // 导入数据
  const handleImport = async () => {
    if (!file || parsedData.length === 0) {
      toast.error('请先选择并解析文件');
      return;
    }

    if (!examInfo.title.trim()) {
      toast.error('请填写考试标题');
      return;
    }

    setIsLoading(true);

    try {
      const mappedData = await createFieldMappingWithStudentMatch(parsedData);
      
      // 验证必要字段 - 更严格的验证
      console.log('验证数据前3行示例:', mappedData.slice(0, 3));
      
      const invalidRows = mappedData.filter((row, index) => {
        const hasStudentId = row.student_id && row.student_id.trim();
        const hasName = row.name && row.name.trim();
        const hasScore = row.score !== undefined && row.score !== null && !isNaN(row.score);
        
        if (!hasStudentId && !hasName) {
          console.warn(`第${index + 1}行: 缺少学号和姓名`, row);
          return true;
        }
        
        if (!hasScore) {
          console.warn(`第${index + 1}行: 缺少有效分数`, row);
          return true;
        }
        
        return false;
      });

      if (invalidRows.length > 0) {
        const validRowCount = mappedData.length - invalidRows.length;
        if (validRowCount === 0) {
          throw new Error(`所有数据行都无效。请检查文件格式，确保包含学号/姓名和分数字段。`);
        }
        
        toast.warning('数据验证警告', {
          description: `有 ${invalidRows.length} 行数据无效，将跳过这些行。有效数据：${validRowCount} 行`
        });
      }

      const validData = mappedData.filter((row, index) => {
        const hasStudentId = row.student_id && row.student_id.trim();
        const hasName = row.name && row.name.trim();
        const hasScore = row.score !== undefined && row.score !== null && !isNaN(row.score);
        
        return (hasStudentId || hasName) && hasScore;
      });

      console.log('处理后的有效数据示例:', validData.slice(0, 3));

      // 保存到数据库
      const result = await gradeAnalysisService.saveExamData(
        validData,
        examInfo,
        'replace',
        {
          examScope: 'class',
          newStudentStrategy: 'create'
        }
      );

      if (!result.success) {
        throw new Error(result.message || '保存失败');
      }

      toast.success('导入成功!', {
        description: `成功导入 ${validData.length} 条记录`
      });

      // 通知父组件
      onDataImported(validData);

      // 重置状态
      setFile(null);
      setParsedData([]);
      setHeaders([]);
      setExamInfo({
        title: '',
        type: '期中考试',
        date: new Date().toISOString().split('T')[0],
        subject: '总分'
      });

    } catch (error) {
      console.error('导入失败:', error);
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          成绩数据导入
        </CardTitle>
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
            <Label htmlFor="exam-subject">科目</Label>
            <Input
              id="exam-subject"
              value={examInfo.subject}
              onChange={(e) => setExamInfo(prev => ({ ...prev, subject: e.target.value }))}
              placeholder="总分"
            />
          </div>
        </div>
        
        {/* 文件上传 */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={isLoading}
          />
          
          <div className="text-center">
            {file ? (
              <div className="space-y-2">
                <FileText className="h-8 w-8 mx-auto text-green-600" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                {parsedData.length > 0 && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">已解析 {parsedData.length} 条记录</span>
                  </div>
                )}
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
        </div>

        {/* 数据预览 */}
        {parsedData.length > 0 && (
          <div className="space-y-2">
            <Label>数据预览 (前3行)</Label>
            <div className="border rounded-lg p-4 bg-gray-50 text-sm">
              <div className="grid gap-2">
                <div className="font-medium text-gray-600">
                  检测到字段: {headers.join(', ')}
                </div>
                {parsedData.slice(0, 3).map((row, index) => (
                  <div key={index} className="text-gray-800">
                    第{index + 1}行: {Object.values(row).slice(0, 4).join(' | ')}
                    {Object.values(row).length > 4 && '...'}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* 导入按钮 */}
        <div className="flex gap-3">
          <Button 
            onClick={handleImport}
            disabled={!file || !examInfo.title.trim() || isLoading || parsedData.length === 0}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                开始导入
              </>
            )}
          </Button>
        </div>
        
        {/* 使用说明 */}
        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <h4 className="font-medium mb-2 text-blue-800">文件格式要求：</h4>
          <ul className="space-y-1 text-blue-700 list-disc list-inside">
            <li>必须包含：学号或姓名、班级、分数</li>
            <li>支持字段：学号、姓名、班级、分数、等级、班级排名、年级排名</li>
            <li>系统会自动识别常见的中文字段名</li>
            <li>首行必须是字段标题行</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}; 