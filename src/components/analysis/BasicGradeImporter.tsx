import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { gradeAnalysisService } from '@/services/gradeAnalysisService';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

interface BasicGradeImporterProps {
  onDataImported: (data: any[]) => void;
}

export const BasicGradeImporter: React.FC<BasicGradeImporterProps> = ({ onDataImported }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize] = useState(5);
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
        setPreviewPage(1); // 重置分页
        
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

  // 智能字段映射 - 重新设计学生匹配逻辑
  const createFieldMappingWithStudentMatch = async (data: any[]) => {
    if (!data || data.length === 0) return [];

    console.log(`🚀 开始处理 ${data.length} 条数据，重新设计学生匹配逻辑...`);
    
    // 1. 先分析数据结构，识别包含的科目
    const headers = Object.keys(data[0]);
    console.log('📊 检测到的表头:', headers);
    
    // 科目识别模式 - 支持"科目+分数"格式
    const subjectPatterns = {
      '语文': ['语文分数', '语文'],
      '数学': ['数学分数', '数学'],  
      '英语': ['英语分数', '英语'],
      '物理': ['物理分数', '物理'],
      '化学': ['化学分数', '化学'],
      '生物': ['生物分数', '生物'],
      '政治': ['政治分数', '政治', '道法分数', '道法'],
      '历史': ['历史分数', '历史'],
      '地理': ['地理分数', '地理'],
      '总分': ['总分分数', '总分']
    };
    
    // 检测数据中包含的科目
    const detectedSubjects = new Map<string, {scoreField: string, gradeField?: string, classRankField?: string}>();
    
    // 扫描表头，寻找科目相关字段
    headers.forEach(header => {
      Object.entries(subjectPatterns).forEach(([subject, patterns]) => {
        patterns.forEach(pattern => {
          if (header === pattern) {
            // 找到科目的分数字段
            if (!detectedSubjects.has(subject)) {
              detectedSubjects.set(subject, { scoreField: header });
            }
            
            // 寻找对应的等级和排名字段
            const subjectKey = pattern.replace('分数', '');
            const gradeField = `${subjectKey}等级`;
            const classRankField = `${subjectKey}班名`;
            
            if (headers.includes(gradeField)) {
              detectedSubjects.get(subject)!.gradeField = gradeField;
            }
            if (headers.includes(classRankField)) {
              detectedSubjects.get(subject)!.classRankField = classRankField;
            }
          }
        });
      });
    });
    
    console.log(`🎯 检测到科目及字段映射:`);
    detectedSubjects.forEach((fields, subject) => {
      console.log(`  ${subject}: 分数=${fields.scoreField}, 等级=${fields.gradeField || '无'}, 班名=${fields.classRankField || '无'}`);
    });
    
    // 2. 批量获取所有学生信息用于匹配
    console.log('📚 批量获取学生信息...');
    const { data: allStudents, error: studentError } = await supabase
      .from('students')
      .select('student_id, name, class_name');
    
    if (studentError) {
      console.error('获取学生信息失败:', studentError);
      throw new Error(`获取学生信息失败: ${studentError.message}`);
    }
    
    console.log('📖 数据库中的学生信息示例:', allStudents?.slice(0, 3));
    console.log(`📊 数据库中共有 ${allStudents?.length || 0} 个学生`);

    const mappedData = [];
    let matchedCount = 0;
    let newStudentCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // 第一步：从CSV行中提取学生基本信息
      let csvStudentName = '';
      let csvClassName = '';
      
      // 直接从固定字段名提取
      if (row['姓名']) {
        csvStudentName = String(row['姓名']).trim();
      }
      if (row['班级']) {
        csvClassName = String(row['班级']).trim();
      }
      
      console.log(`🔍 第${i+1}行CSV数据: 姓名="${csvStudentName}", 班级="${csvClassName}"`);
      
      // 第二步：在数据库中查找匹配的学生
      let matchedStudent = null;
      let matchReason = '';
      
      if (csvStudentName && csvClassName && allStudents) {
        // 方法1: 精确匹配 姓名+班级
        matchedStudent = allStudents.find(student => 
          student.name === csvStudentName && student.class_name === csvClassName
        );
        
        if (matchedStudent) {
          matchReason = '姓名+班级精确匹配';
          matchedCount++;
          console.log(`✅ 精确匹配成功: ${csvStudentName} -> ${matchedStudent.student_id} (${matchedStudent.class_name})`);
        } else {
          // 方法2: 尝试班级格式变换后匹配
          const classVariants = [
            csvClassName.replace('初三', '九年级'),
            csvClassName.replace('九年级', '初三'),
            csvClassName.replace('班', ''),
            `${csvClassName}班`,
            csvClassName.replace(/^(\d+)$/, '九年级$1班'),
            csvClassName.replace(/^(\d+)班$/, '九年级$1班')
          ];
          
          console.log(`🔄 尝试班级格式变体: ${classVariants.join(', ')}`);
          
          for (const variant of classVariants) {
            matchedStudent = allStudents.find(student => 
              student.name === csvStudentName && student.class_name === variant
            );
            if (matchedStudent) {
              matchReason = `姓名+班级变体匹配 (${variant})`;
              matchedCount++;
              console.log(`✅ 变体匹配成功: ${csvStudentName} + ${variant} -> ${matchedStudent.student_id}`);
              break;
            }
          }
        }
        
        // 方法3: 如果还没匹配到，尝试仅通过姓名匹配（如果姓名唯一）
        if (!matchedStudent) {
          const sameName = allStudents.filter(student => student.name === csvStudentName);
          if (sameName.length === 1) {
            matchedStudent = sameName[0];
            matchReason = '姓名唯一匹配';
            matchedCount++;
            console.log(`✅ 姓名唯一匹配: ${csvStudentName} -> ${matchedStudent.student_id} (${matchedStudent.class_name})`);
          } else if (sameName.length > 1) {
            console.log(`⚠️ 找到${sameName.length}个同名学生，无法唯一确定: ${sameName.map(s => `${s.name}(${s.class_name})`).join(', ')}`);
          }
        }
      }
      
      // 第三步：确定最终学生信息
      let finalStudentInfo;
      if (matchedStudent) {
        // 使用数据库中的真实学生信息
        finalStudentInfo = {
          student_id: matchedStudent.student_id,
          name: matchedStudent.name,
          class_name: matchedStudent.class_name
        };
        console.log(`✅ 第${i+1}行最终匹配: ID=${finalStudentInfo.student_id}, 姓名=${finalStudentInfo.name}, 班级=${finalStudentInfo.class_name} [${matchReason}]`);
      } else {
        // 如果没有匹配到，创建新学生记录
        finalStudentInfo = {
          student_id: `temp_${Date.now()}_${i}`,
          name: csvStudentName || `学生_${i+1}`,
          class_name: csvClassName || '未知班级'
        };
        newStudentCount++;
        console.log(`🆕 第${i+1}行创建新学生: ID=${finalStudentInfo.student_id}, 姓名=${finalStudentInfo.name}, 班级=${finalStudentInfo.class_name} [未匹配到数据库]`);
      }

      // 第四步：根据检测到的科目生成记录
      detectedSubjects.forEach((fields, subject) => {
        const scoreValue = parseFloat(row[fields.scoreField]);
        const gradeValue = fields.gradeField ? row[fields.gradeField] : null;
        const classRank = fields.classRankField ? parseInt(row[fields.classRankField]) : null;
        
        // 只有当分数有效时才创建记录
        if (!isNaN(scoreValue)) {
          const record = {
            ...finalStudentInfo,
            exam_title: examInfo.title,
            exam_type: examInfo.type,
            exam_date: examInfo.date,
            subject: subject,
            score: scoreValue,
            grade: gradeValue,
            rank_in_class: classRank,
            rank_in_grade: null,
          };
          
          console.log(`📋 创建记录: 学生${finalStudentInfo.name}(${finalStudentInfo.student_id}), 班级=${finalStudentInfo.class_name}, 科目=${subject}, 分数=${scoreValue}`);
          
          mappedData.push(record);
        }
      });
    }

    console.log(`🎯 学生匹配总结:`);
    console.log(`  ✅ 成功匹配已有学生: ${matchedCount} 个`);
    console.log(`  🆕 创建新学生记录: ${newStudentCount} 个`);
    console.log(`📊 数据生成总结:`);
    console.log(`  📚 涉及学生: ${data.length} 名`);
    console.log(`  📖 涉及科目: ${detectedSubjects.size} 个 (${Array.from(detectedSubjects.keys()).join(', ')})`);
    console.log(`  📋 生成记录: ${mappedData.length} 条`);
    console.log(`  📈 预期计算: ${detectedSubjects.size} 科目 × ${data.length} 学生 = ${detectedSubjects.size * data.length} 条记录`);
    
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
      setPreviewPage(1); // 重置分页
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>数据预览</Label>
              <div className="text-sm text-gray-500">
                共 {parsedData.length} 条记录
              </div>
            </div>
            
            <div className="border rounded-lg p-4 bg-gray-50 text-sm">
              <div className="space-y-3">
                <div className="font-medium text-gray-600 border-b border-gray-200 pb-2">
                  检测到字段: {headers.join(', ')}
                </div>
                
                {/* 智能预览：检测是否为宽表格式 */}
                {(() => {
                  const subjectPatterns = {
                    '语文': ['语文分数'],
                    '数学': ['数学分数'],
                    '英语': ['英语分数'],
                    '物理': ['物理分数'],
                    '化学': ['化学分数'],
                    '生物': ['生物分数'],
                    '政治': ['道法分数'],
                    '历史': ['历史分数'],
                    '地理': ['地理分数'],
                    '总分': ['总分分数']
                  };
                  
                  const detectedSubjects = new Set();
                  headers.forEach(header => {
                    Object.entries(subjectPatterns).forEach(([subject, patterns]) => {
                      if (patterns.includes(header)) {
                        detectedSubjects.add(subject);
                      }
                    });
                  });
                  
                  const isWideFormat = detectedSubjects.size > 1;
                  
                  return (
                    <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                      <div className="text-blue-700 font-medium">
                        {isWideFormat ? 
                          `📊 宽表格式，检测到科目: ${Array.from(detectedSubjects).join(', ')}` :
                          `📝 长表格式，科目: ${examInfo.subject || '总分'}`
                        }
                      </div>
                      {isWideFormat && (
                        <div className="text-blue-600 text-xs mt-1">
                          预计生成记录数: {detectedSubjects.size} 个科目 × {parsedData.length} 名学生 = {detectedSubjects.size * parsedData.length} 条记录
                          <br />
                          (每个学生每个科目包含分数、等级、排名等信息)
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* 分页数据显示 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">
                      数据样例 (第 {previewPage} 页, 共 {Math.ceil(parsedData.length / previewPageSize)} 页)
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPreviewPage(Math.max(1, previewPage - 1))}
                        disabled={previewPage === 1}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        上一页
                      </button>
                      <span className="text-xs text-gray-500">
                        {previewPage} / {Math.ceil(parsedData.length / previewPageSize)}
                      </span>
                      <button
                        onClick={() => setPreviewPage(Math.min(Math.ceil(parsedData.length / previewPageSize), previewPage + 1))}
                        disabled={previewPage === Math.ceil(parsedData.length / previewPageSize)}
                        className="px-2 py-1 text-xs border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                  
                  {(() => {
                    const startIndex = (previewPage - 1) * previewPageSize;
                    const endIndex = Math.min(startIndex + previewPageSize, parsedData.length);
                    const pageData = parsedData.slice(startIndex, endIndex);
                    
                    return pageData.map((row, index) => (
                      <div key={startIndex + index} className="bg-white p-3 rounded border border-gray-200">
                        <div className="font-medium text-gray-800 mb-2">
                          第 {startIndex + index + 1} 行数据:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                          {Object.entries(row).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="font-medium text-gray-600 min-w-[80px]">{key}:</span>
                              <span className="text-gray-800 ml-2 truncate" title={String(value)}>
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
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