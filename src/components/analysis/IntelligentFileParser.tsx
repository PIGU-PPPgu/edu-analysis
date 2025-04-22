import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileInput } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { processAndSaveData } from "@/utils/dataStorage";
import HeaderMappingDialog from './HeaderMappingDialog';
import FileUploader from './FileUploader';
import DataPreview from './DataPreview';
import TemplateDownloader from './TemplateDownloader';
import { ParsedData, IntelligentFileParserProps } from "./types";

const IntelligentFileParser: React.FC<IntelligentFileParserProps> = ({ onDataParsed }) => {
  const [isAIEnhanced, setIsAIEnhanced] = useState(true);
  const [showHeaderMapping, setShowHeaderMapping] = useState(false);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [saveToDatabase, setSaveToDatabase] = useState(true);

  const handleFileProcessed = async (data: ParsedData) => {
    setParsedData(data);
    setShowHeaderMapping(true);
  };

  const processDataWithMappings = async (mappings: Record<string, string>) => {
    if (!parsedData) return;

    const processedData = parsedData.data.map(row => {
      const newRow: Record<string, any> = {};
      Object.entries(mappings).forEach(([originalHeader, mappedField]) => {
        if (mappedField && mappedField !== 'ignore' && row[originalHeader] !== undefined) {
          newRow[mappedField] = row[originalHeader];
        }
      });
      return newRow;
    });

    if (saveToDatabase) {
      const results = await processAndSaveData(processedData);
      if (results.errors.length > 0) {
        toast.error("部分数据处理失败", {
          description: (
            <div className="max-h-40 overflow-y-auto">
              <ul className="list-disc list-inside">
                {results.errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          ),
          duration: 5000
        });
      }
    }

    if (onDataParsed) {
      onDataParsed(processedData);
    }

    setShowHeaderMapping(false);
    toast.success("数据解析完成", {
      description: `已智能识别并解析 ${processedData.length} 条记录`
    });
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

              {!parsedData ? (
                <FileUploader
                  onFileProcessed={handleFileProcessed}
                  isAIEnhanced={isAIEnhanced}
                />
              ) : (
                <DataPreview 
                  data={parsedData.data}
                  headers={parsedData.headers}
                  mappings={headerMappings}
                  onShowMapping={() => setShowHeaderMapping(true)}
                  onReupload={() => setParsedData(null)}
                />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="template">
            <TemplateDownloader />
          </TabsContent>
          
          <TabsContent value="paste">
            <div className="flex flex-col gap-4">
              <textarea 
                className="w-full h-40 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                placeholder="粘贴数据，每行一条记录，字段之间用逗号分隔..."
              ></textarea>
              
              <div className="flex justify-end">
                <button 
                  className="bg-[#B9FF66] text-black hover:bg-[#a8e85c] px-4 py-2 rounded-lg"
                  onClick={() => toast.info("粘贴解析功能即将推出")}
                >
                  解析数据
                </button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <HeaderMappingDialog
        open={showHeaderMapping}
        onOpenChange={setShowHeaderMapping}
        headers={parsedData?.headers || []}
        mappings={headerMappings}
        onUpdateMapping={(header, value) => {
          setHeaderMappings(prev => ({
            ...prev,
            [header]: value
          }));
        }}
        onConfirm={() => processDataWithMappings(headerMappings)}
      />
    </Card>
  );
};

export default IntelligentFileParser;
