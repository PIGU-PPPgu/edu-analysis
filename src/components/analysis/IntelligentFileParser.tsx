
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, Database, Users, ZapIcon, TableIcon, FileInput, Import } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/utils/auth";

interface ParsedData {
  headers: string[];
  data: Record<string, any>[];
  detectedFormat: string;
  confidence: number;
  fieldMappings?: Record<string, string>;
}

interface CustomField {
  originalField: string;
  mappedField: string;
  dataType: string;
}

// 标准字段定义
const standardFields = {
  studentId: ["学号", "id", "student_id", "studentid", "student id", "编号"],
  name: ["姓名", "name", "student_name", "studentname", "student name", "名字"],
  className: ["班级", "class", "class_name", "classname", "class name", "年级班级"],
  subject: ["科目", "subject", "course", "学科"],
  score: ["分数", "成绩", "score", "grade", "mark", "得分"],
  examDate: ["考试日期", "日期", "date", "exam_date", "examdate", "exam date"],
  examType: ["考试类型", "类型", "type", "exam_type", "examtype", "exam type"],
  semester: ["学期", "semester", "term"],
  teacher: ["教师", "老师", "teacher", "instructor"]
};

const fieldTypes = [
  { id: "text", name: "文本" },
  { id: "number", name: "数字" },
  { id: "date", name: "日期" },
  { id: "enum", name: "枚举值" }
];

const IntelligentFileParser: React.FC<{
  onDataParsed: (data: any[]) => void;
}> = ({ onDataParsed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedData | null>(null);
  const [isAIEnhanced, setIsAIEnhanced] = useState(true);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [saveToDatabase, setSaveToDatabase] = useState(true);

  const extractStudentInfo = (content: string, format: string, headers: string[]) => {
    // 智能识别学生信息字段
    const studentInfo: Record<string, any> = {};
    
    if (format === 'CSV' || format === 'Excel') {
      const lines = content.split('\n');
      
      // 智能匹配标准字段
      for (const [fieldKey, fieldAliases] of Object.entries(standardFields)) {
        const matchedHeaderIndex = headers.findIndex(header => 
          fieldAliases.some(alias => header.toLowerCase().includes(alias.toLowerCase()))
        );
        
        if (matchedHeaderIndex !== -1) {
          // 找到匹配字段，在数据的第一行获取对应值
          if (lines.length > 1) {
            const values = lines[1].split(',');
            if (values.length > matchedHeaderIndex) {
              studentInfo[fieldKey] = values[matchedHeaderIndex]?.trim() || '';
            }
          }
        }
      }
    } else {
      // 文本模式下尝试提取信息
      const namePattern = /[姓名|名字][:：]?\s*([^\s,，.。\t\n]+)/;
      const classPattern = /[班级][:：]?\s*([^\s,，.。\t\n]+)/;
      const idPattern = /[学号|编号][:：]?\s*([^\s,，.。\t\n]+)/;
      
      const nameMatch = content.match(namePattern);
      const classMatch = content.match(classPattern);
      const idMatch = content.match(idPattern);
      
      if (nameMatch) studentInfo.name = nameMatch[1];
      if (classMatch) studentInfo.className = classMatch[1];
      if (idMatch) studentInfo.studentId = idMatch[1];
    }
    
    return studentInfo;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setParseProgress(0);
    setFileInfo({ name: file.name, size: file.size });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const detectedFormat = detectFileFormat(file.name, content);
        
        // 解析文件内容和表头
        const { headers, data } = parseFileContent(content, detectedFormat);
        setAvailableFields(headers);
        
        // 提取学生信息
        const studentInfo = extractStudentInfo(content, detectedFormat, headers);
        
        // 检查是否需要手动映射字段
        const needMapping = !Object.keys(standardFields).every(field => 
          headers.some(header => 
            standardFields[field as keyof typeof standardFields].some(alias => 
              header.toLowerCase().includes(alias.toLowerCase())
            )
          )
        );
        
        if (needMapping && headers.length > 0) {
          // 预先进行自动映射
          const initialMappings: CustomField[] = [];
          
          for (const [fieldKey, fieldAliases] of Object.entries(standardFields)) {
            const matchedHeader = headers.find(header => 
              fieldAliases.some(alias => header.toLowerCase().includes(alias.toLowerCase()))
            );
            
            if (matchedHeader) {
              initialMappings.push({
                originalField: matchedHeader,
                mappedField: fieldKey,
                dataType: fieldKey === 'score' ? 'number' : fieldKey.includes('Date') ? 'date' : 'text'
              });
            }
          }
          
          setCustomFields(initialMappings);
          setShowFieldMapping(true);
        }
        
        // 合并学生信息和成绩数据
        const enrichedData = data.map(record => ({
          ...record,
          ...studentInfo,
        }));
        
        setParsedPreview({
          headers,
          data: enrichedData.slice(0, 5),
          detectedFormat,
          confidence: calculateConfidence(headers, detectedFormat),
        });
        
        setParseProgress(100);
        
        if (!needMapping) {
          setTimeout(() => {
            setIsUploading(false);
            onDataParsed(enrichedData);
            if (saveToDatabase) {
              saveToSupabase(enrichedData);
            }
            toast.success("数据解析成功", {
              description: `已智能识别学生信息并解析 ${enrichedData.length} 条记录`
            });
          }, 500);
        } else {
          setIsUploading(false);
        }
      } catch (error) {
        console.error("解析文件失败:", error);
        setIsUploading(false);
        setParseProgress(0);
        toast.error("数据解析失败", {
          description: "无法识别文件格式或内容不符合要求"
        });
      }
    };

    reader.readAsText(file);
  };

  const calculateConfidence = (headers: string[], format: string): number => {
    // 计算识别置信度
    let confidence = 70; // 基础置信度
    
    // 根据识别到的标准字段数量增加置信度
    const recognizedFields = Object.values(standardFields).flat().filter(field => 
      headers.some(h => h.toLowerCase().includes(field.toLowerCase()))
    );
    
    confidence += Math.min(recognizedFields.length * 5, 20);
    
    // 根据格式类型调整置信度
    if (format === 'CSV') confidence += 5;
    if (format === 'Excel') confidence += 5;
    
    return Math.min(confidence, 98);
  }

  const detectFileFormat = (fileName: string, content: string): string => {
    if (fileName.endsWith('.csv')) return 'CSV';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'Excel';
    if (fileName.endsWith('.json')) return 'JSON';
    
    // 内容分析
    if (content.includes(',') && content.includes('\n')) return 'CSV';
    if (content.startsWith('{') || content.startsWith('[')) return 'JSON';
    
    return 'Unknown';
  };

  const parseFileContent = (content: string, format: string): { headers: string[], data: any[] } => {
    if (format === 'CSV') {
      return parseCSV(content);
    } else if (format === 'JSON') {
      try {
        const jsonData = JSON.parse(content);
        const arrayData = Array.isArray(jsonData) ? jsonData : [jsonData];
        const headers = arrayData.length > 0 ? Object.keys(arrayData[0]) : [];
        return { headers, data: arrayData };
      } catch (e) {
        throw new Error("无法解析JSON数据");
      }
    } else {
      // 尝试智能解析
      try {
        return parseCSV(content);
      } catch {
        throw new Error("无法解析文件内容");
      }
    }
  };

  const parseCSV = (content: string): { headers: string[], data: any[] } => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) throw new Error("文件为空");
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    // 智能检测数据类型
    const dataTypes = detectDataTypes(lines.slice(1, Math.min(10, lines.length)), headers);
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const obj: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        let value = values[index]?.trim() || '';
        
        // 根据检测的数据类型转换
        if (dataTypes[index] === 'number') {
          obj[header] = isNaN(parseFloat(value)) ? value : parseFloat(value);
        } else if (dataTypes[index] === 'date') {
          obj[header] = value; // 保留原始日期字符串
        } else {
          obj[header] = value;
        }
      });
      
      result.push(obj);
    }
    
    return { headers, data: result };
  };

  const detectDataTypes = (sampleLines: string[], headers: string[]): string[] => {
    const dataTypes = headers.map(() => 'string');
    
    sampleLines.forEach(line => {
      const values = line.split(',');
      
      values.forEach((value, index) => {
        if (index >= dataTypes.length) return;
        
        const trimmedValue = value.trim();
        
        // 数字检测
        if (!isNaN(parseFloat(trimmedValue)) && isFinite(Number(trimmedValue))) {
          if (dataTypes[index] === 'string') {
            dataTypes[index] = 'number';
          }
        }
        
        // 日期检测 (简单版)
        if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(trimmedValue)) {
          dataTypes[index] = 'date';
        }
      });
    });
    
    return dataTypes;
  };

  const saveToSupabase = async (data: any[]) => {
    try {
      toast.info("正在保存数据到数据库...");
      
      // 1. 保存学生信息
      const studentsToSave = Array.from(new Set(data.map(item => item.studentId)))
        .map(studentId => {
          const studentRecord = data.find(item => item.studentId === studentId);
          return {
            student_id: studentId,
            name: studentRecord?.name || '',
            class_name: studentRecord?.className || '',
          };
        });
        
      // 2. 保存成绩数据
      const gradesData = data.map(item => ({
        student_id: item.studentId,
        subject: item.subject || '',
        score: item.score || 0,
        exam_date: item.examDate || new Date().toISOString().split('T')[0],
        exam_type: item.examType || '未知',
      }));
      
      // 批量upsert学生数据
      if (studentsToSave.length > 0) {
        const { error: studentsError } = await supabase
          .from('students')
          .upsert(studentsToSave, { onConflict: 'student_id' });
          
        if (studentsError) throw studentsError;
      }
      
      // 批量插入成绩数据
      if (gradesData.length > 0) {
        const { error: gradesError } = await supabase
          .from('grades')
          .insert(gradesData);
          
        if (gradesError) throw gradesError;
      }
      
      toast.success("数据已成功保存到数据库");
    } catch (error) {
      console.error("保存数据失败:", error);
      toast.error("保存数据失败", {
        description: "无法将数据保存到数据库，请检查连接或权限"
      });
    }
  };

  const handleConfirmMapping = () => {
    if (!parsedPreview) return;
    
    // 应用字段映射
    const mappedData = parsedPreview.data.map(record => {
      const mappedRecord: Record<string, any> = {};
      
      // 应用自定义字段映射
      customFields.forEach(field => {
        if (record[field.originalField] !== undefined) {
          let value = record[field.originalField];
          
          // 根据数据类型转换
          if (field.dataType === 'number') {
            value = parseFloat(value);
          } else if (field.dataType === 'date') {
            // 保持日期格式不变
          }
          
          mappedRecord[field.mappedField] = value;
        }
      });
      
      // 保留未映射的字段
      Object.keys(record).forEach(key => {
        if (!customFields.some(f => f.originalField === key)) {
          mappedRecord[key] = record[key];
        }
      });
      
      return mappedRecord;
    });
    
    setShowFieldMapping(false);
    onDataParsed(mappedData);
    
    if (saveToDatabase) {
      saveToSupabase(mappedData);
    }
    
    toast.success("数据映射完成", {
      description: `根据您的映射规则处理了 ${mappedData.length} 条记录`
    });
  };

  const addCustomField = () => {
    setCustomFields([...customFields, {
      originalField: availableFields[0] || '',
      mappedField: '',
      dataType: 'text'
    }]);
  };

  const updateCustomField = (index: number, field: Partial<CustomField>) => {
    const updatedFields = [...customFields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    setCustomFields(updatedFields);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <FileInput className="h-5 w-5" />
          智能数据导入
          {isAIEnhanced && (
            <span className="bg-[#B9FF66] text-xs font-medium px-2 py-0.5 rounded-full text-black flex items-center">
              <ZapIcon className="h-3 w-3 mr-1" />
              AI增强
            </span>
          )}
        </CardTitle>
        <CardDescription>
          支持多种格式导入，系统自动识别数据结构并智能解析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="upload">上传文件</TabsTrigger>
            <TabsTrigger value="template">下载模板</TabsTrigger>
            <TabsTrigger value="paste">粘贴数据</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">AI增强解析</span>
                  <div
                    className={`relative inline-block w-10 h-5 rounded-full transition-colors duration-200 ease-in-out cursor-pointer ${
                      isAIEnhanced ? "bg-[#B9FF66]" : "bg-gray-300"
                    }`}
                    onClick={() => setIsAIEnhanced(!isAIEnhanced)}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out transform ${
                        isAIEnhanced ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {isAIEnhanced ? "使用AI优化数据解析和类型推断" : "标准数据解析"}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="saveToDb" 
                    checked={saveToDatabase}
                    onCheckedChange={(checked) => setSaveToDatabase(checked as boolean)}
                  />
                  <Label htmlFor="saveToDb" className="text-sm font-medium">保存到数据库</Label>
                </div>
                <span className="text-xs text-gray-500">
                  {saveToDatabase ? "解析后自动保存到学生和成绩表中" : "仅用于当前分析，不保存到数据库"}
                </span>
              </div>
              
              {!isUploading && !parsedPreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="h-10 w-10 mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium mb-2">拖拽文件到此处或点击上传</p>
                  <p className="text-sm text-gray-500 mb-4">
                    支持 CSV, Excel, JSON 等多种格式，系统将自动识别并解析
                  </p>
                  <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-5 py-3 rounded-[14px] inline-block">
                    选择文件
                    <Input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              ) : isUploading ? (
                <div className="p-6 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{fileInfo?.name}</p>
                      <p className="text-sm text-gray-500">{(fileInfo?.size || 0) / 1024 < 1024 ? 
                        `${Math.round((fileInfo?.size || 0) / 1024)} KB` : 
                        `${Math.round((fileInfo?.size || 0) / 1024 / 1024 * 10) / 10} MB`}</p>
                    </div>
                    <p className="text-sm font-medium">{parseProgress}%</p>
                  </div>
                  <Progress value={parseProgress} className="h-2" />
                  <div className="mt-4 text-sm">
                    <p>正在进行智能数据解析...</p>
                    <ul className="mt-2 space-y-1 text-gray-500">
                      <li className={parseProgress >= 20 ? "text-green-600" : ""}>✓ 数据格式检测</li>
                      <li className={parseProgress >= 40 ? "text-green-600" : ""}>✓ 列标题分析</li>
                      <li className={parseProgress >= 60 ? "text-green-600" : ""}>✓ 数据类型推断</li>
                      <li className={parseProgress >= 80 ? "text-green-600" : ""}>✓ 数据清洗和处理</li>
                      <li className={parseProgress >= 100 ? "text-green-600" : ""}>✓ 解析完成</li>
                    </ul>
                  </div>
                </div>
              ) : parsedPreview ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-lg">预览解析结果</h3>
                      <p className="text-sm text-gray-500">
                        检测到 {parsedPreview.detectedFormat} 格式，置信度 {parsedPreview.confidence}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowFieldMapping(true)}
                      >
                        <TableIcon className="h-4 w-4 mr-2" />
                        字段映射
                      </Button>
                      <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-3 py-2 rounded-[14px] inline-block text-sm">
                        重新上传
                        <Input
                          type="file"
                          accept=".csv,.xlsx,.xls,.json,.txt"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {parsedPreview.headers.map((header, i) => (
                            <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {header}
                              <div className="mt-1">
                                {Object.entries(standardFields).map(([key, aliases]) => 
                                  aliases.some(alias => header.toLowerCase().includes(alias.toLowerCase())) && (
                                    <Badge key={key} variant="outline" className="text-[10px] mr-1" title={`已识别为${key}`}>
                                      {key}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedPreview.data.map((row, i) => (
                          <tr key={i}>
                            {parsedPreview.headers.map((header, j) => (
                              <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                {row[header]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <p>已预览前 5 条记录，共解析 {parsedPreview.data.length} 条记录</p>
                  </div>
                </div>
              ) : null}
            </div>
          </TabsContent>
          
          <TabsContent value="template">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">基础成绩模板</CardTitle>
                    <CardDescription>包含学号、姓名、分数、科目字段</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => {
                        const csvContent = "学号,姓名,分数,科目\n20230001,张三,92,语文\n20230002,李四,85,语文\n20230003,王五,78,语文";
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = "成绩基础模板.csv";
                        link.click();
                        toast.success("模板下载成功");
                      }}
                    >
                      下载模板
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">详细成绩模板</CardTitle>
                    <CardDescription>包含更多详细字段和示例数据</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        const csvContent = "学号,姓名,班级,科目,分数,考试日期,考试类型,教师\n20230001,张三,一年级1班,语文,92,2023/09/01,期中考试,李老师\n20230001,张三,一年级1班,数学,85,2023/09/01,期中考试,王老师\n20230001,张三,一年级1班,英语,78,2023/09/01,期中考试,赵老师";
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = "成绩详细模板.csv";
                        link.click();
                        toast.success("模板下载成功");
                      }}
                    >
                      下载模板
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">导入数据说明：</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>列标题必须完整，系统将根据标题自动识别数据类型</li>
                  <li>学号字段必须唯一，用于标识不同学生</li>
                  <li>数字类型字段请勿包含非数字字符</li>
                  <li>日期格式推荐使用 YYYY/MM/DD 或 YYYY-MM-DD</li>
                  <li>如有特殊格式数据，系统将尝试智能解析或提供手动映射</li>
                </ul>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="paste">
            <div className="flex flex-col gap-4">
              <textarea 
                className="w-full h-40 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                placeholder="粘贴数据，每行一条记录，字段之间用逗号分隔..."
              ></textarea>
              
              <div className="flex justify-end">
                <Button 
                  className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                  onClick={() => toast.info("粘贴解析功能即将推出")}
                >
                  解析数据
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* 字段映射对话框 */}
      <Dialog open={showFieldMapping} onOpenChange={setShowFieldMapping}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>自定义字段映射</DialogTitle>
            <DialogDescription>
              您可以自定义数据字段与系统字段的映射关系
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-12 gap-2 font-medium text-sm bg-gray-50 p-2 rounded">
              <div className="col-span-5">原始字段</div>
              <div className="col-span-5">映射字段</div>
              <div className="col-span-2">数据类型</div>
            </div>
            
            {customFields.map((field, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Select 
                    value={field.originalField}
                    onValueChange={(value) => updateCustomField(index, { originalField: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择原始字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5">
                  <Input 
                    value={field.mappedField}
                    onChange={(e) => updateCustomField(index, { mappedField: e.target.value })}
                    placeholder="映射为系统字段"
                  />
                </div>
                <div className="col-span-1">
                  <Select 
                    value={field.dataType}
                    onValueChange={(value) => updateCustomField(index, { dataType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeCustomField(index)}
                    className="h-8 w-8 p-0"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addCustomField} 
              className="w-full"
            >
              添加字段映射
            </Button>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowFieldMapping(false)}
            >
              取消
            </Button>
            <Button 
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
              onClick={handleConfirmMapping}
              disabled={customFields.some(f => !f.mappedField || !f.originalField)}
            >
              确认映射
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default IntelligentFileParser;
