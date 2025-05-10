import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navbar } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IntelligentFileParser, { IntelligentFileParserProps } from "@/components/analysis/IntelligentFileParser";
import StudentDataImporter from "@/components/analysis/StudentDataImporter";
import { FileText, Users, Loader2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImportReviewDialog from "@/components/analysis/ImportReviewDialog";
import type { 
    FileDataForReview as ReviewDialogFileData, 
    ExamInfo as ReviewDialogExamInfo, 
    AIParseResult, 
    ExistingStudentCheckResult 
} from "@/components/analysis/ImportReviewDialog"; // Assuming types are exported from dialog

// Define standard system fields for mapping - customize as needed
const STANDARD_SYSTEM_FIELDS: Record<string, string> = {
  student_id: "学号",
  name: "姓名",
  class_name: "班级名称",
  subject: "科目",
  score: "分数",
  total_score: "总分",
  exam_title: "考试标题",
  exam_type: "考试类型",
  exam_date: "考试日期",
  // Add other relevant fields your system uses
};

// Local ExamInfo type if different from ReviewDialogExamInfo for some reason, or use ReviewDialogExamInfo directly
interface ExamInfoInternal extends ReviewDialogExamInfo {}


const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuthContext();

  // States for ImportReviewDialog
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [fileDataForReview, setFileDataForReview] = useState<ReviewDialogFileData | null>(null);
  const [initialMappingsForReview, setInitialMappingsForReview] = useState<Record<string, string> | null>(null);
  const [examInfoForReview, setExamInfoForReview] = useState<ReviewDialogExamInfo | null>(null);
  const [processingFileInfo, setProcessingFileInfo] = useState<{name: string, size: number} | null>(null); // For initial dialog display


  useEffect(() => {
    // 用AuthContext统一处理认证状态，避免重复逻辑
    if (isAuthReady) {
      setIsLoading(false);
    }
  }, [isAuthReady]);

  // Renamed and updated for the new dialog flow
  const handleGradeDataImportedSuccessfully = (importedDataCount: number) => {
    toast.success("数据导入成功", {
      description: `已成功导入 ${importedDataCount} 条记录`
    });
    navigate("/grade-analysis"); 
  };

  const handleStudentDataImported = (data: any[]) => {
    toast.success("数据导入成功", {
      description: `已成功导入 ${data.length} 条记录`
    });
  };

  // Called when IntelligentFileParser has selected a file, before full parsing
  const handleImportIntent = (fileName: string, fileSize: number) => {
    setProcessingFileInfo({ name: fileName, size: fileSize });
    setFileDataForReview(null); // Ensure old data is cleared
    setInitialMappingsForReview(null);
    setExamInfoForReview(null);
    setIsReviewDialogOpen(true); // Open dialog immediately
  };

  // Callback from IntelligentFileParser when file is parsed and ready for review
  const handleFileParsedForReview = (
    fileData: ReviewDialogFileData, 
    initialMappings: Record<string, string>, 
    examInfo: ReviewDialogExamInfo
  ) => {
    setFileDataForReview(fileData);
    setInitialMappingsForReview(initialMappings); // Store initial mappings
    setExamInfoForReview(examInfo);
    setIsReviewDialogOpen(true);
  };

  // --- Callbacks for ImportReviewDialog ---
  const handleStartAIParseInDialog = async (fileData: ReviewDialogFileData): Promise<AIParseResult> => {
    console.log("Dialog wants to start AI parse with:", fileData);
    // Mock AI Parsing - In real scenario, call your AI service here
    // For example, use aiService.enhanceFileParsing(fileData.headers, fileData.dataRows.slice(0,5))
    // The `aiService.enhanceFileParsing` used in IntelligentFileParser might need adjustment
    // if it expects only headers and sample, or if it can take the full fileData.
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
    const suggestedMappings = initialMappingsForReview || {}; // Use initial mappings from parser for now
     // Example: a more specific AI might refine mappings or suggest based on content
    if (fileData.headers.includes("数学成绩")) suggestedMappings["数学成绩"] = "score";
    
    // toast.info("ImportReviewDialog: AI解析模拟完成。");
    return {
      suggestedMappings: suggestedMappings,
    };
  };

  const handleCheckExistingStudentsInDialog = async (
    userConfirmedMappings: Record<string, string>,
    sampleData: any[],
    examInfo: ReviewDialogExamInfo
  ): Promise<ExistingStudentCheckResult> => {
    console.log("Dialog wants to check existing students with:", userConfirmedMappings, sampleData, examInfo);
    // Mock student check
    await new Promise(resolve => setTimeout(resolve, 1000));
    const MOCK_EXISTING_STUDENT_COUNT = Math.floor(Math.random() * 10);
    // toast.info(`ImportReviewDialog: 学生检查模拟完成，发现 ${MOCK_EXISTING_STUDENT_COUNT} 个现有学生。`);
    return {
      count: MOCK_EXISTING_STUDENT_COUNT,
    };
  };

  const handleFinalImportInDialog = async (
    finalExamInfo: ReviewDialogExamInfo,
    confirmedMappings: Record<string, string>,
    mergeChoice: string, 
    fullDataToImport: any[]
  ) => {
    console.log("Dialog wants to final import with:", finalExamInfo, confirmedMappings, mergeChoice, fullDataToImport);
    toast.info("开始最终导入流程...", {id: "final-import"});
    
    // This is where the logic similar to IntelligentFileParser's `processDataAndSave` would go.
    // 1. Format data based on confirmedMappings
    // 2. Handle student merging based on mergeChoice (this is new)
    // 3. Save to database (e.g., call a service like `saveExamData`)
    
    // Simplified example of data processing (adapt from IntelligentFileParser's processDataAndSave)
    const processedData = fullDataToImport.map((row, index) => {
      const formattedRow: Record<string, any> = {};
      Object.keys(confirmedMappings).forEach(header => {
        const mappedField = confirmedMappings[header];
        if (mappedField && row[header] !== undefined && row[header] !== null) {
          formattedRow[mappedField] = String(row[header]); // Basic conversion, needs enhancement for types
        }
      });
      // Add exam info (already part of finalExamInfo, so ensure it's added if your DB expects it per row)
      formattedRow.exam_title = finalExamInfo.title;
      formattedRow.exam_type = finalExamInfo.type;
      formattedRow.exam_date = finalExamInfo.date;
      if (finalExamInfo.subject) formattedRow.subject = finalExamInfo.subject;
      
      // TODO: Add student_id generation if not mapped, handle mergeChoice, numeric conversions etc.
      // For now, let's assume student_id is mapped or handled by backend based on mergeChoice
      return formattedRow;
    });

    try {
      // Replace with your actual data saving logic
      // await saveExamData(processedData, finalExamInfo); // Example call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate save
      
      toast.success("最终导入成功！", {id: "final-import"});
      handleGradeDataImportedSuccessfully(processedData.length);
      setIsReviewDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error("Final import error:", error);
      toast.error("最终导入失败", { description: (error as Error).message, id: "final-import" });
      // Potentially re-throw or handle to keep dialog open on error, depending on UX preference
    }
  };

  const handleDialogCancel = () => {
    setIsReviewDialogOpen(false);
    // Add any other cleanup if needed when dialog is cancelled
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>正在加载...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-2">数据导入中心</h1>
        <p className="text-gray-500 mb-8">导入和管理学生信息与成绩数据</p>
        
        <Tabs defaultValue="grades" className="w-full"> {/* Changed default to grades for testing */}
          <TabsList className="mb-6 bg-white border shadow-sm">
            <TabsTrigger value="students" className="gap-2 data-[state=active]:bg-[#F2FCE2]">
              <Users className="h-4 w-4" />
              学生信息导入
            </TabsTrigger>
            <TabsTrigger value="grades" className="gap-2 data-[state=active]:bg-[#E5DEFF]">
              <FileText className="h-4 w-4" />
              成绩数据导入
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="students">
            <div className="grid gap-6">
              <Card className="border-t-4 border-t-green-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    学生信息导入
                  </CardTitle>
                  <CardDescription>
                    导入学生基本信息，包括学号、姓名、班级等必填信息及其他选填信息
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StudentDataImporter onDataImported={handleStudentDataImported} />
                  <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={() => navigate('/student-management')}
                    >
                      <List className="h-4 w-4" />
                      查看学生列表
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="grades">
            <div className="grid gap-6">
              <Card className="border-t-4 border-t-purple-400">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    成绩数据导入
                  </CardTitle>
                  <CardDescription>
                    通过学号或姓名关联学生，导入各科目成绩数据
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <IntelligentFileParser 
                    onFileParsedForReview={handleFileParsedForReview} 
                    onImportIntent={handleImportIntent}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {(isReviewDialogOpen) && (
        <ImportReviewDialog 
            isOpen={isReviewDialogOpen}
            onOpenChange={(isOpen) => {
                setIsReviewDialogOpen(isOpen);
                if (!isOpen) setProcessingFileInfo(null); // Clear info if dialog is closed
            }}
            initialDisplayInfo={processingFileInfo}
            fileData={fileDataForReview}
            currentExamInfo={examInfoForReview}
            standardSystemFields={STANDARD_SYSTEM_FIELDS}
            onStartAIParse={handleStartAIParseInDialog}
            onCheckExistingStudents={handleCheckExistingStudentsInDialog}
            onFinalImport={handleFinalImportInDialog}
            onCancel={() => { 
                handleDialogCancel(); 
                setProcessingFileInfo(null);
            }}
        />
      )}
    </div>
  );
};

export default Index;
