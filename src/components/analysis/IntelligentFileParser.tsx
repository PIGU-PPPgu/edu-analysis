import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, FileInput, TableIcon } from "lucide-react";
import { processAndSaveData } from "@/utils/dataStorage";
import HeaderMappingDialog from './HeaderMappingDialog';
import { parseCSV, parseExcel, standardFields } from './utils/fileParsingUtils';
import { ParsedData } from './types';
import FilePreviewTable from './FilePreviewTable';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface IntelligentFileParserProps {
  onDataParsed: (data: any[]) => void;
}

const IntelligentFileParser: React.FC<IntelligentFileParserProps> = ({ onDataParsed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedData | null>(null);
  const [isAIEnhanced, setIsAIEnhanced] = useState(true);
  const [showHeaderMapping, setShowHeaderMapping] = useState(false);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [saveToDatabase, setSaveToDatabase] = useState(true);

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

      // Check field matching
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
  
  const saveToSupabase = async (data: any[]) => {
    try {
      // 保存数据到数据库
      const results = await processAndSaveData(data);
      
      if (results.failed > 0) {
        toast.warning(`部分数据导入失败`, {
          description: `成功: ${results.success}条, 失败: ${results.failed}条`
        });
      } else {
        toast.success(`数据导入成功`, {
          description: `已导入${results.success}条记录`
        });
      }
    } catch (error) {
      console.error("保存数据失败:", error);
      toast.error("保存数据失败", {
        description: error instanceof Error ? error.message : "无法保存数据"
      });
    } finally {
      setIsUploading(false);
      setParseProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <FileInput className="h-5 w-5" />
          智能数据导入
          {isAIEnhanced && (
            <span className="bg-[#B9FF66] text-xs font-medium px-2 py-0.5 rounded-full text-black flex items-center">
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
                    支持 CSV、Excel文件，系统将自动识别并解析
                  </p>
                  <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-5 py-3 rounded-[14px] inline-block">
                    选择文件
                    <Input
                      type="file"
                      accept=".csv,.txt,.xls,.xlsx"
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
                        onClick={() => setShowHeaderMapping(true)}
                      >
                        <TableIcon className="h-4 w-4 mr-2" />
                        字段映射
                      </Button>
                      <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-3 py-2 rounded-[14px] inline-block text-sm">
                        重新上传
                        <Input
                          type="file"
                          accept=".csv,.txt,.xls,.xlsx"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <FilePreviewTable parsedPreview={parsedPreview} />
                  
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
                  <li>支持CSV和Excel格式文件导入</li>
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

      <HeaderMappingDialog
        open={showHeaderMapping}
        onOpenChange={setShowHeaderMapping}
        headers={detectedHeaders}
        mappings={headerMappings}
        onUpdateMapping={(header, value) => {
          setHeaderMappings(prev => ({
            ...prev,
            [header]: value
          }));
        }}
        onConfirm={() => processDataWithMappings(rawData, headerMappings)}
      />
    </Card>
  );
};

export default IntelligentFileParser;
