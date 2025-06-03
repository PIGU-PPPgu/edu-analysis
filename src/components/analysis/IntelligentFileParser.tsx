import React, { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileInput, Sparkles, TableIcon, CheckCircle as ConfirmIcon } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import FileUploader from './FileUploader';
import TemplateDownloader from './TemplateDownloader';
import { ParsedData } from "./types";
import TextDataImporter from "./TextDataImporter";
import { aiService } from "@/services/aiService";
import debounce from "lodash/debounce";
import SimplifiedExamForm from './SimplifiedExamForm';

// 考试信息接口
interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject: string;
}

// Define the structure for data passed to ImportReviewDialog
interface FileDataForReview {
    fileName: string;
    headers: string[];
    dataRows: any[];
}

// Redefine props for IntelligentFileParser
export interface IntelligentFileParserProps {
  onFileParsedForReview: (
    fileData: FileDataForReview, 
    initialMappings: Record<string, string>, 
    examInfo: ExamInfo
  ) => void;
  onImportIntent?: (fileName: string, fileSize: number) => void;
}

const IntelligentFileParser: React.FC<IntelligentFileParserProps> = ({ 
  onFileParsedForReview, 
  onImportIntent
}) => {
  const [isAIEnhanced, setIsAIEnhanced] = useState(true);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);

  const [examInfo, setExamInfo] = useState<ExamInfo>({
    title: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    subject: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const debouncedSetExamInfo = useCallback(
    debounce((newExamInfo: ExamInfo) => {
      setExamInfo(newExamInfo);
    }, 500),
    [setExamInfo] 
  );
  
  useEffect(() => {
    if (!parsedData) {
      setExamInfo({
        title: '',
        type: '',
        date: new Date().toISOString().split('T')[0],
        subject: ''
      });
    }
  }, [parsedData]);

  const handleFileProcessed = async (data: ParsedData) => {
    setParsedData(data);
    setIsProcessing(true);
    let currentMappings: Record<string, string> = {};
    let AIdidMap = false;

    if (isAIEnhanced && data.headers.length > 0) {
      try {
        toast.info("AI正在分析数据结构...", { duration: 2000 });
        const enhancedResult = await aiService.enhanceFileParsing(data.headers, data.data.slice(0, 5));
        if (enhancedResult && enhancedResult.mappings && Object.keys(enhancedResult.mappings).length > 0) {
          currentMappings = enhancedResult.mappings;
          AIdidMap = true;
          toast.success("AI成功识别数据结构", {
            description: enhancedResult.suggestions || "表头字段已自动映射"
          });
        } else {
           toast.info("AI未提供有效映射，将使用规则映射。", { duration: 3000 });
        }
      } catch (error) {
        console.error("AI增强解析失败:", error);
        toast.error("AI增强处理遇到问题", { description: "将使用基本解析继续" });
      }
    }

    if (!AIdidMap) {
      const initialRuleMappings: Record<string, string> = {};
      data.headers.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('学号') || lowerHeader.includes('id') || lowerHeader.includes('编号')) {
          initialRuleMappings[header] = 'student_id';
        } else if (lowerHeader.includes('姓名') || lowerHeader.includes('name')) {
          initialRuleMappings[header] = 'name';
        } else if (lowerHeader.includes('班级') || lowerHeader.includes('class') || lowerHeader.includes('行政班')) {
          initialRuleMappings[header] = 'class_name';
        } else if (lowerHeader.includes('分数') || lowerHeader.includes('成绩') || lowerHeader.includes('score')) {
          initialRuleMappings[header] = 'score';
        } else if (lowerHeader.includes('总分')) {
          initialRuleMappings[header] = 'total_score';
        } else if (lowerHeader.includes('科目') || lowerHeader.includes('学科') || lowerHeader.includes('subject')) {
          initialRuleMappings[header] = 'subject';
        } else if (lowerHeader.includes('等级') || lowerHeader.includes('grade') || lowerHeader.includes('层次')) {
          initialRuleMappings[header] = 'grade';
        } else if (lowerHeader.includes('班名') || (lowerHeader.includes('班') && lowerHeader.includes('排'))) {
          initialRuleMappings[header] = 'rank_in_class';
        } else if (lowerHeader.includes('级名') || (lowerHeader.includes('级') && lowerHeader.includes('排')) || lowerHeader.includes('校排名')) {
          initialRuleMappings[header] = 'rank_in_grade';
        }
      });
      currentMappings = initialRuleMappings;
    }
    
    if (onFileParsedForReview) {
        const fileDataForReview: FileDataForReview = {
            fileName: data.fileName || "Uploaded File",
            headers: data.headers,
            dataRows: data.data,
        };
        onFileParsedForReview(fileDataForReview, currentMappings, { ...examInfo });
    }
    setIsProcessing(false);
  };

  const handleTextDataImported = (data: ParsedData) => {
    const dataWithFileName = { ...data, fileName: data.fileName || "Pasted Text Data" };
    handleFileProcessed(dataWithFileName);
  };

  const simplifiedExamFormProps = {
    initialExamInfo: examInfo,
    onExamInfoChange: debouncedSetExamInfo,
    disabled: isProcessing
  };

  const textDataImporterProps = {
    onDataImported: handleTextDataImported,
    isAIEnhanced: isAIEnhanced
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <FileInput className="h-5 w-5" />
          智能数据导入 (初步解析)
        </CardTitle>
        <CardDescription>
          支持多种格式导入，系统自动识别数据结构并智能解析
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <Label htmlFor="ai-enhanced-checkbox" className="text-sm font-medium text-blue-700">
              启用 AI 增强解析 (推荐)
            </Label>
            <Checkbox
              id="ai-enhanced-checkbox"
              checked={isAIEnhanced}
              onCheckedChange={(checked) => setIsAIEnhanced(Boolean(checked))}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          <SimplifiedExamForm {...simplifiedExamFormProps} />

          <Tabs defaultValue="file" className="w-full">
            <TabsList>
              <TabsTrigger value="file">通过文件导入</TabsTrigger>
              <TabsTrigger value="text">通过文本粘贴</TabsTrigger>
            </TabsList>
            <TabsContent value="file">
              <FileUploader 
                onFileProcessed={handleFileProcessed} 
                isProcessing={isProcessing} 
                isAIEnhanced={isAIEnhanced}
                onFileSelected={(file) => {
                  if (onImportIntent) {
                    onImportIntent(file.name, file.size);
                  }
                }}
              />
              <TemplateDownloader />
            </TabsContent>
            <TabsContent value="text">
              <TextDataImporter {...textDataImporterProps} />
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntelligentFileParser;
