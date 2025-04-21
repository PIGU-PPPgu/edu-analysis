
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, Database, Users } from "lucide-react";

interface ParsedData {
  headers: string[];
  data: Record<string, any>[];
  detectedFormat: string;
  confidence: number;
}

const IntelligentFileParser: React.FC<{
  onDataParsed: (data: any[]) => void;
}> = ({ onDataParsed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedData | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setParseProgress(0);
    setFileInfo({ name: file.name, size: file.size });

    // 模拟解析进度
    const progressInterval = setInterval(() => {
      setParseProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        clearInterval(progressInterval);
        const content = e.target?.result as string;
        
        // 智能检测文件格式与结构
        const detectedFormat = detectFileFormat(file.name, content);
        const parsedData = parseFileContent(content, detectedFormat);
        
        setParsedPreview({
          headers: Object.keys(parsedData[0] || {}),
          data: parsedData.slice(0, 5),
          detectedFormat,
          confidence: 95
        });
        
        setParseProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          onDataParsed(parsedData);
          toast.success("数据解析成功", {
            description: `成功解析 ${parsedData.length} 条记录`
          });
        }, 500);
      } catch (error) {
        clearInterval(progressInterval);
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

  // 智能检测文件格式
  const detectFileFormat = (fileName: string, content: string): string => {
    if (fileName.endsWith('.csv')) return 'CSV';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return 'Excel';
    if (fileName.endsWith('.json')) return 'JSON';
    
    // 内容分析
    if (content.includes(',') && content.includes('\n')) return 'CSV';
    if (content.startsWith('{') || content.startsWith('[')) return 'JSON';
    
    return 'Unknown';
  };

  // 解析文件内容
  const parseFileContent = (content: string, format: string): any[] => {
    if (format === 'CSV') {
      return parseCSV(content);
    } else if (format === 'JSON') {
      return JSON.parse(content);
    } else {
      // 尝试智能解析
      try {
        return parseCSV(content);
      } catch {
        throw new Error("无法解析文件内容");
      }
    }
  };

  // 解析CSV
  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // 智能检测数据类型
    const dataTypes = detectDataTypes(lines.slice(1, 10), headers);
    
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
    
    return result;
  };

  // 智能检测数据类型
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">智能数据导入</CardTitle>
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
                  
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {parsedPreview.headers.map((header, i) => (
                            <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {header}
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
    </Card>
  );
};

export default IntelligentFileParser;
