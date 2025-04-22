import React, { useState } from "react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
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
  const [fileInfo, setFileInfo<{ name: string; size: number } | null>(null);
  const [parsedPreview, setParsedPreview<ParsedData | null>(null);
  const [isAIEnhanced, setIsAIEnhanced] = useState(true);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [customFields, setCustomFields<CustomField[]>([]);
  const [availableFields, setAvailableFields<string[]>([]);
  const [saveToDatabase, setSaveToDatabase] = useState(true);

  const [showHeaderMapping, setShowHeaderMapping] = useState(false);
  const [headerMappings, setHeaderMappings<Record<string, string>>({});
  const [detectedHeaders, setDetectedHeaders<string[]>([]);
  const [rawData, setRawData<any[]>([]);

  const isBinaryContent = (content: string): boolean => {
    const binarySignatures = [
      'PK\x03\x04',
      '\x25\x50\x44\x46',
      '\xFF\xD8\xFF',
      '\x89\x50\x4E\x47'
    ];
    
    const hasBinaryChars = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content.slice(0, 500));
    
    const hasSignature = binarySignatures.some(sig => 
      content.slice(0, 20).includes(sig)
    );
    
    return hasBinaryChars || hasSignature;
  };

  const extractStudentInfo = (content: string, format: string, headers: string[]) => {
    const studentInfo: Record<string, any> = {};
    
    const fieldPatterns = {
      studentId: /学号|学生号|id|student[-_]?id/i,
      name: /姓名|名字|student[-_]?name/i,
      className: /班级|class/i,
      subject: /科目|学科|subject/i,
      score: /分数|成绩|得分|score|grade|mark/i,
      examDate: /考试日期|考试时间|exam[-_]?date/i,
      examType: /考试类型|exam[-_]?type/i
    };
    
    headers.forEach((header, index) => {
      for (const [fieldKey, pattern] of Object.entries(fieldPatterns)) {
        if (pattern.test(header)) {
          studentInfo[fieldKey] = index;
          break;
        }
      }
    });
    
    return studentInfo;
  };

  const detectDataTypes = (sampleLines: string[], headers: string[]): string[] => {
    const dataTypes = headers.map(() => ({ 
      type: 'string',
      confidence: 0
    }));
    
    sampleLines.forEach(line => {
      const values = line.split(',');
      
      values.forEach((value, index) => {
        if (index >= dataTypes.length) return;
        
        const trimmedValue = value.trim();
        
        if (!isNaN(parseFloat(trimmedValue)) && isFinite(Number(trimmedValue))) {
          dataTypes[index].confidence += 1;
          if (dataTypes[index].type !== 'number') {
            dataTypes[index].type = 'number';
          }
        }
        
        const datePatterns = [
          /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
          /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,
          /^\d{4}年\d{1,2}月\d{1,2}日$/
        ];
        
        if (datePatterns.some(pattern => pattern.test(trimmedValue))) {
          dataTypes[index].confidence += 1;
          dataTypes[index].type = 'date';
        }
      });
    });
    
    return dataTypes.map(dt => dt.type);
  };

  const parseFileContent = (content: string, format: string): { headers: string[], data: any[] } => {
    if (isBinaryContent(content)) {
      throw new Error("检测到二进制文件内容，请上传文本格式文件如CSV或Excel导出的文本文件");
    }
    
    if (format === 'CSV') {
      return parseCSV(content);
    } else if (format === 'JSON') {
      try {
        const jsonData = JSON.parse(content);
        const arrayData = Array.isArray(jsonData) ? jsonData : [jsonData];
        const headers = arrayData.length > 0 ? Object.keys(arrayData[0]) : [];
        return { headers, data: arrayData };
      } catch (e) {
        toast.error("无法解析JSON数据");
        throw new Error("无法解析JSON数据");
      }
    } else {
      try {
        return parseCSV(content);
      } catch {
        toast.error("无法识别文件格式");
        throw new Error("无法解析文件内容");
      }
    }
  };

  const parseCSV = (content: string): { headers: string[], data: any[] } => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) throw new Error("文件为空");
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    const dataTypes = detectDataTypes(lines.slice(1, Math.min(10, lines.length)), headers);
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',');
      const obj: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        let value = values[index]?.trim() || '';
        
        if (dataTypes[index] === 'number') {
          obj[header] = isNaN(parseFloat(value)) ? value : parseFloat(value);
        } else if (dataTypes[index] === 'date') {
          obj[header] = value;
        } else {
          obj[header] = value;
        }
      });
      
      result.push(obj);
    }
    
    return { headers, data: result };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(file.type) && 
        !['csv', 'xls', 'xlsx', 'txt'].includes(fileExtension || '')) {
      toast.error("不支持的文件格式", {
        description: "请上传CSV、Excel(xls/xlsx)或文本文件"
      });
      return;
    }

    setIsUploading(true);
    setParseProgress(0);
    setFileInfo({ name: file.name, size: file.size });

    try {
      let data: any[];
      let headers: string[];

      if (fileExtension === 'csv' || fileExtension === 'txt') {
        const content = await readFileAsText(file);
        const { headers: csvHeaders, data: csvData } = parseCSV(content);
        headers = csvHeaders;
        data = csvData;
      } else {
        const buffer = await readFileAsArrayBuffer(file);
        const { headers: excelHeaders, data: excelData } = await parseExcel(buffer);
        headers = excelHeaders;
        data = excelData;
      }

      setParseProgress(50);
      setDetectedHeaders(headers);
      setRawData(data);

      // 检查标准字段与检测到的字段的匹配度
      const initialMappings: Record<string, string> = {};
      const matchedFields = new Set<string>();
      
      headers.forEach(header => {
        for (const [standardField, aliases] of Object.entries(standardFields)) {
          if (aliases.some(alias => 
            header.toLowerCase().includes(alias.toLowerCase())
          )) {
            initialMappings[header] = standardField;
            matchedFields.add(standardField);
            break;
          }
        }
      });

      // 如果有未匹配的标准字段或不确定的字段，显示映射对话框
      if (matchedFields.size < Object.keys(standardFields).length || 
          headers.some(h => !initialMappings[h])) {
        setHeaderMappings(initialMappings);
        setShowHeaderMapping(true);
      } else {
        // 所有字段都已正确匹配，直接处理数据
        processDataWithMappings(data, initialMappings);
      }

      setParseProgress(100);
      
    } catch (error) {
      console.error("解析文件失败:", error);
      toast.error("文件解析失败", {
        description: error instanceof Error ? error.message : "无法解析文件内容"
      });
      setIsUploading(false);
      setParseProgress(0);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseExcel = async (buffer: ArrayBuffer) => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    if (data.length < 2) {
      throw new Error("Excel文件为空或格式不正确");
    }

    const headers = data[0] as string[];
    const rows = data.slice(1).map(row => {
      const obj: Record<string, any> = {};
      (row as any[]).forEach((cell, index) => {
        obj[headers[index]] = cell;
      });
      return obj;
    });

    return { headers, data: rows };
  };

  const processDataWithMappings = (data: any[], mappings: Record<string, string>) => {
    const processedData = data.map(row => {
      const newRow: Record<string, any> = {};
      Object.entries(mappings).forEach(([originalHeader, mappedField]) => {
        if (mappedField && row[originalHeader] !== undefined) {
          newRow[mappedField] = row[originalHeader];
        }
      });
      return newRow;
    });

    setShowHeaderMapping(false);
    onDataParsed(processedData);
    
    if (saveToDatabase) {
      saveToSupabase(processedData);
    }
    
    toast.success("数据解析成功", {
      description: `已智能识别并解析 ${processedData.length} 条记录`
    });
  };

  const handleConfirmMapping = () => {
    if (!rawData || !headerMappings) return;
    processDataWithMappings(rawData, headerMappings);
  };

  const updateHeaderMapping = (originalHeader: string, standardField: string) => {
    setHeaderMappings(prev => ({
      ...prev,
      [originalHeader]: standardField
    }));
  };

  const calculateConfidence = (headers: string[], format: string): number => {
    let confidence = 70; // 基础置信度
    
    const recognizedFields = Object.values(standardFields).flat().filter(field => 
      headers.some(h => h.toLowerCase().includes(field.toLowerCase()))
    );
    
    confidence += Math.min(recognizedFields.length * 5, 20);
    
    if (format === 'CSV') confidence += 5;
    if (format === 'Excel') confidence += 5;
    
    return Math.min(confidence, 98);
  }

  const detectFileFormat = (fileName: string, content: string): string => {
    if (fileName.endsWith('.csv')) return 'CSV';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'Excel';
    if (fileName.endsWith('.json')) return 'JSON';
    
    if (content.includes(',') && content.includes('\n')) return 'CSV';
    if (content.startsWith('{') || content.startsWith('[')) return 'JSON';
    
    return 'Unknown';
  };

  const saveToSupabase = async (data: any[]) => {
    try {
      toast.info("正在保存数据到数据库...");
      
      const studentsToSave = Array.from(new Set(data.map(item => item.studentId)))
        .map(studentId => {
          const studentRecord = data.find(item => item.studentId === studentId);
          return {
            student_id: studentId,
            name: studentRecord?.name || '',
            class_name: studentRecord?.className || '',
          };
        });
        
      const gradesData = data.map(item => ({
        student_id: item.studentId,
        subject: item.subject || '',
        score: item.score || 0,
        exam_date: item.examDate || new Date().toISOString().split('T')[0],
        exam_type: item.examType || '未知',
      }));
      
      if (studentsToSave.length > 0) {
        const { error: studentsError } = await supabase
          .from('students')
          .upsert(studentsToSave, { onConflict: 'student_id' });
          
        if (studentsError) throw studentsError;
      }
      
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
    
    const mappedData = parsedPreview.data.map(record => {
      const mappedRecord: Record<string, any> = {};
      
      customFields.forEach(field => {
        if (record[field.originalField] !== undefined) {
          let value = record[field.originalField];
          
          if (field.dataType === 'number') {
            value = parseFloat(value);
          } else if (field.dataType === 'date') {
            // 保持日期格式不变
          }
          
          mappedRecord[field.mappedField] = value;
        }
      });
      
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
                    支持 CSV 文本文件，系统将自动识别并解析
                  </p>
                  <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-5 py-3 rounded-[14px] inline-block">
                    选择文件
                    <Input
                      type="file"
                      accept=".csv,.txt"
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
                          accept=".csv,.txt"
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
                                {String(row[header] !== undefined ? row[header] : '')}
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
                  <li>请使用纯文本CSV格式，不要直接上传Excel文件</li>
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

      <Dialog open={showHeaderMapping} onOpenChange={setShowHeaderMapping}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>确认字段映射</DialogTitle>
            <DialogDescription>
              请确认检测到的字段与系统字段的对应关系
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4 font-medium text-sm bg-gray-50 p-2 rounded">
              <div>原始字段</div>
              <div>系统字段</div>
            </div>
            
            {detectedHeaders.map((header) => (
              <div key={header} className="grid grid-cols-2 gap-4 items-center">
                <div className="font-medium">{header}</div>
                <Select
                  value={headerMappings[header] || ''}
                  onValueChange={(value) => updateHeaderMapping(header, value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择对应的系统字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(standardFields).map(([field, aliases]) => (
                      <SelectItem key={field} value={field}>
                        {field} ({aliases.join(', ')})
                      </SelectItem>
                    ))}
                    <SelectItem value="">忽略该字段</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowHeaderMapping(false)}
