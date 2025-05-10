import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Info, SearchCheck, Sparkles, FileText, UserCheck, Send } from 'lucide-react';
import { toast } from 'sonner';

// Assuming ExamInfo is defined in a shared types file or passed appropriately
// For now, defining it locally for clarity if not already globally available.
// Make sure this is exported if Index.tsx or other parent components need it directly.
export interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject: string;
}

export interface FileDataForReview {
    fileName: string;
    headers: string[];
    dataRows: any[];
}

export interface AIParseResult {
    suggestedMappings: Record<string, string>;
    // We could add more details from AI if needed, e.g., warnings, data preview
}

export interface ExistingStudentCheckResult {
    count: number;
    // message?: string; // e.g. "Found 5 existing students. Recommended action: Merge."
}

interface ImportReviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  
  fileData: FileDataForReview | null;
  currentExamInfo: ExamInfo | null;
  standardSystemFields: Record<string, string>; // e.g. { student_id: "学号", name: "姓名" }
  initialDisplayInfo?: { name: string, size: number } | null; // Optional prop for initial file info

  onStartAIParse?: (fileData: FileDataForReview) => Promise<AIParseResult>;
  onCheckExistingStudents?: (
    userConfirmedMappings: Record<string, string>,
    sampleData: any[], // A small sample of data mapped with userConfirmedMappings
    examInfo: ExamInfo
  ) => Promise<ExistingStudentCheckResult>;
  onFinalImport: (
    finalExamInfo: ExamInfo,
    confirmedMappings: Record<string, string>,
    mergeChoice: string, 
    fullDataToImport: any[]
  ) => Promise<void>;
  onCancel?: () => void;
}

const NEW_STEPS = [
  { id: 1, name: 'AI 智能解析', description: "AI正在分析您的文件结构和内容...", icon: Sparkles },
  { id: 2, name: '字段映射确认', description: "请核对或调整AI建议的字段映射关系。", icon: FileText },
  { id: 3, name: '学生信息合并', description: "选择如何处理已存在的学生记录。", icon: UserCheck },
  { id: 4, name: '最终确认导入', description: "检查所有设置，然后开始导入数据。", icon: Send },
];

const ImportReviewDialog: React.FC<ImportReviewDialogProps> = ({
  isOpen,
  onOpenChange,
  fileData,
  currentExamInfo,
  standardSystemFields,
  initialDisplayInfo,
  onStartAIParse,
  onCheckExistingStudents,
  onFinalImport,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [editableExamInfo, setEditableExamInfo] = useState<ExamInfo | null>(currentExamInfo || { title: '', type: '', date: new Date().toISOString().split('T')[0], subject: '' });
  
  // Step 1: AI Parsing states
  const [isAIParsing, setIsAIParsing] = useState(false);
  const [aiParseProgress, setAiParseProgress] = useState(0);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [aiSuggestedMappings, setAiSuggestedMappings] = useState<Record<string, string> | null>(null);

  // Step 2: Field Mapping states
  const [userConfirmedMappings, setUserConfirmedMappings] = useState<Record<string, string> | null>(null);

  // Step 3: Student Merge states
  const [isCheckingStudents, setIsCheckingStudents] = useState(false);
  const [existingStudentsInfo, setExistingStudentsInfo] = useState<ExistingStudentCheckResult | null>(null);
  const [mergeChoice, setMergeChoice] = useState<string>('merge'); // Default to 'merge'

  // Step 4: Final Import states
  const [isImporting, setIsImporting] = useState(false);

  const resetDialogState = useCallback(() => {
    setCurrentStep(1);
    if (currentExamInfo) {
      setEditableExamInfo(currentExamInfo);
    } else {
      setEditableExamInfo({ title: '', type: '', date: new Date().toISOString().split('T')[0], subject: '' });
    }
    setIsAIParsing(false);
    setAiParseProgress(0);
    setAiParseError(null);
    setAiSuggestedMappings(null);
    setUserConfirmedMappings(null);
    setIsCheckingStudents(false);
    setExistingStudentsInfo(null);
    setMergeChoice('merge');
    setIsImporting(false);
  }, [currentExamInfo]);

  useEffect(() => {
    if (isOpen) {
      resetDialogState();
    } else {
      // Optional: if you want a full reset when dialog is closed externally too
      // resetDialogState();
    }
  }, [isOpen, resetDialogState]);
  
  // Auto-trigger AI parsing when dialog is open, on step 1, AND fileData becomes available
  useEffect(() => {
    if (isOpen && currentStep === 1 && fileData && onStartAIParse && !isAIParsing && !aiSuggestedMappings && !aiParseError) {
        if(currentExamInfo && editableExamInfo.title === '') {
            setEditableExamInfo(currentExamInfo);
        }
        handleStartAIParsing();
    }
  }, [isOpen, currentStep, fileData, isAIParsing, aiSuggestedMappings, aiParseError, onStartAIParse, currentExamInfo, editableExamInfo]);


  const handleStartAIParsing = async () => {
    if (!fileData || !onStartAIParse) return;
    setIsAIParsing(true);
    setAiParseProgress(0);
    setAiParseError(null);
    setAiSuggestedMappings(null); // Clear previous results

    // Simulate progress for the animation
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress <= 100) {
        setAiParseProgress(progress);
      }
    }, 200);

    try {
      const result = await onStartAIParse(fileData);
      clearInterval(interval);
      setAiParseProgress(100);
      setAiSuggestedMappings(result.suggestedMappings);
      setUserConfirmedMappings(result.suggestedMappings); // Initialize user mappings with AI suggestions
      toast.success("AI智能解析完成！");
      setCurrentStep(2); // Automatically move to next step
    } catch (error) {
      clearInterval(interval);
      setAiParseProgress(100); // Show full progress even on error, but mark as error
      console.error("AI parsing failed:", error);
      setAiParseError((error as Error).message || "AI解析时发生未知错误。");
      toast.error("AI解析失败", { description: (error as Error).message });
    } finally {
      setIsAIParsing(false);
    }
  };

  const handleConfirmMappings = () => {
    if (!userConfirmedMappings) {
        toast.error("映射尚未确认");
        return;
    }
    // Basic validation for essential fields if needed, e.g. student_id, name, score
    // For now, assume mappings are valid if confirmed by user.
    setCurrentStep(3);
  };

  useEffect(() => {
    // Trigger student check when moving to step 3
    if (isOpen && currentStep === 3 && fileData && onCheckExistingStudents && userConfirmedMappings && !isCheckingStudents && !existingStudentsInfo) {
      handleStudentCheck();
    }
  }, [isOpen, currentStep, fileData, onCheckExistingStudents, userConfirmedMappings, isCheckingStudents, existingStudentsInfo]);

  const handleStudentCheck = async () => {
    if (!fileData || !userConfirmedMappings || !onCheckExistingStudents) return;
    setIsCheckingStudents(true);
    try {
        // Sending a small sample of data (e.g., first 5 rows) for checking
        const sampleDataForCheck = fileData.dataRows.slice(0, 5);
        const result = await onCheckExistingStudents(userConfirmedMappings, sampleDataForCheck, editableExamInfo!);
        setExistingStudentsInfo(result);
    } catch (error) {
        console.error("Student check failed:", error);
        toast.error("检查学生信息失败", { description: (error as Error).message });
        // Decide if we should block proceeding or allow user to skip this
    } finally {
        setIsCheckingStudents(false);
    }
  };

  const handleFinalConfirmAndImport = async () => {
    if (!fileData || !userConfirmedMappings) {
        toast.error("数据或映射不完整，无法导入");
        return;
    }
    setIsImporting(true);
    try {
      await onFinalImport(editableExamInfo!, userConfirmedMappings, mergeChoice, fileData.dataRows);
      onOpenChange(false); // Close dialog on success (parent should show toast)
    } catch (error) {
      // Error already handled by parent's onFinalImport or toast shown there
      console.error("Final import failed:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && (isAIParsing || !aiSuggestedMappings)) {
        toast.info("请等待AI解析完成。");
        return;
    }
    if (currentStep === 2) {
        handleConfirmMappings(); // This will move to step 3 internally if successful
        return;
    }
    if (currentStep === 3 && isCheckingStudents) {
        toast.info("正在检查学生信息...");
        return;
    }
    if (currentStep < NEW_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDialogClose = () => {
    if (isAIParsing || isCheckingStudents || isImporting) {
        toast.info("操作正在进行中，请稍候或等待完成。");
        return;
    }
    if (onCancel) onCancel();
    onOpenChange(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // AI Smart Parse
        return (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold mb-3">{NEW_STEPS[0].name}</h3>
            <p className="text-sm text-gray-600 mb-6">
              {fileData 
                ? NEW_STEPS[0].description 
                : initialDisplayInfo 
                  ? `正在准备分析文件: ${initialDisplayInfo.name}...` 
                  : "正在等待文件数据..."}
            </p>
            
            {/* 小男孩翻书动画占位符 */}
            <div className="my-8 w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg mx-auto flex items-center justify-center">
              <p className="text-xs text-gray-400 p-2">小男孩翻书动画区域</p>
            </div>

            {isAIParsing && <Progress value={aiParseProgress} className="w-3/4 mx-auto mb-4" />}
            
            {aiParseError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                <Info size={16} className="inline mr-2" /> {aiParseError}
                <Button variant="outline" size="sm" onClick={handleStartAIParsing} className="ml-4">
                  重试解析
                </Button>
              </div>
            )}
            {!isAIParsing && !aiSuggestedMappings && !aiParseError && !fileData && (
                 <p className="text-sm text-gray-500">请稍候，等待文件内容加载...</p>
            )}
            {!isAIParsing && !aiSuggestedMappings && !aiParseError && fileData && (
                 <p className="text-sm text-gray-500">即将开始AI智能解析...</p>
            )}
            {!isAIParsing && aiSuggestedMappings && (
                <p className="text-sm text-green-600">AI解析完成！即将进入下一步...</p>
            )}
          </div>
        );

      case 2: // Field Mapping Confirmation
        if (!fileData || !userConfirmedMappings) return <p>数据加载中或映射信息丢失...</p>;
        return (
          <div>
            <h3 className="text-lg font-semibold mb-2">{NEW_STEPS[1].name}</h3>
            <p className="text-sm text-gray-600 mb-4">{NEW_STEPS[1].description}</p>
            <ScrollArea className="h-[40vh] border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[40%]">文件表头 (来自: {fileData.fileName})</TableHead>
                    <TableHead className="w-[60%]">映射到系统字段</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileData.headers.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium py-2.5">{header}</TableCell>
                      <TableCell className="py-1.5">
                        <Select
                          value={userConfirmedMappings[header] || ''} // '' for unmapped
                          onValueChange={(value) => {
                            setUserConfirmedMappings(prev => ({ ...prev!, [header]: value === 'empty' ? '' : value }));
                          }}
                        >
                          <SelectTrigger className="w-full text-xs h-9">
                            <SelectValue placeholder="选择系统字段" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="empty"><em>-- 不要映射此字段 --</em></SelectItem>
                            {Object.entries(standardSystemFields).map(([sysKey, sysName]) => (
                              <SelectItem key={sysKey} value={sysKey}>{sysName} ({sysKey})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        );

      case 3: // Student Information Merge
        return (
          <div>
            <h3 className="text-lg font-semibold mb-2">{NEW_STEPS[2].name}</h3>
            <p className="text-sm text-gray-600 mb-4">{NEW_STEPS[2].description}</p>
            {isCheckingStudents && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={24} className="animate-spin mr-2" /> 正在检查现有学生信息...
              </div>
            )}
            {!isCheckingStudents && existingStudentsInfo && (
              <>
                {existingStudentsInfo.count > 0 ? (
                  <div className="p-4 border rounded-md bg-blue-50 border-blue-200">
                    <p className="text-blue-700 mb-3">
                      <SearchCheck size={18} className="inline mr-2" />
                      系统检测到 <strong>{existingStudentsInfo.count}</strong> 位可能已存在的学生。
                    </p>
                    <RadioGroup value={mergeChoice} onValueChange={setMergeChoice} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="merge" id="merge-yes" />
                        <Label htmlFor="merge-yes" className="font-normal">
                          是的，将本次导入的成绩合并到这些已存在的学生记录中。
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="create_new" id="merge-no" />
                        <Label htmlFor="merge-no" className="font-normal">
                          不，为本次导入的所有记录创建新的学生信息（如果学号/姓名已存在，可能会产生重复记录）。
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                ) : (
                  <div className="p-4 border rounded-md bg-green-50 border-green-200 text-green-700">
                    <Info size={18} className="inline mr-2" />
                    未检测到匹配的现有学生记录。本次导入将为所有学生创建新的学生信息。
                  </div>
                )}
              </>
            )}
            {!isCheckingStudents && !existingStudentsInfo && (
                <p className="text-sm text-gray-500 mt-4">学生信息检查服务似乎未配置或遇到问题。</p>
            )}
          </div>
        );

      case 4: // Final Confirmation and Import
        return (
          <div>
            <h3 className="text-lg font-semibold mb-2">{NEW_STEPS[3].name}</h3>
            <p className="text-sm text-gray-600 mb-1">{NEW_STEPS[3].description}</p>
            <div className="mt-4 p-4 border rounded-md space-y-2 bg-gray-50">
                <p className="text-sm"><span className="font-semibold">考试标题:</span> {editableExamInfo?.title}</p>
                <p className="text-sm"><span className="font-semibold">文件名:</span> {fileData?.fileName}</p>
                <p className="text-sm"><span className="font-semibold">总记录数:</span> {fileData?.dataRows.length} 条</p>
                <p className="text-sm"><span className="font-semibold">学生信息处理:</span> 
                    {mergeChoice === 'merge' ? "合并到现有记录" : "创建新记录"}
                </p>
                <p className="text-xs text-gray-500 pt-2">字段映射将在后台使用您第二步确认的设置为准。</p>
            </div>
            <div className="mt-6 p-3 border rounded-md bg-yellow-50 border-yellow-300 text-yellow-800 text-sm">
                <Info size={16} className="inline mr-2" />
                点击"完成并导入"后，数据将开始处理并保存。此过程可能不可逆。
            </div>
          </div>
        );
      default:
        return <div>未知步骤</div>;
    }
  };

  // Stepper UI Visuals
  const StepperUI = () => (
    <div className="px-6 sm:px-8 py-4 border-b bg-gray-50/50">
      <div className="flex items-start justify-between">
        {NEW_STEPS.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center text-center w-1/4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold text-lg
                  ${
                    currentStep > step.id
                      ? 'bg-green-500 border-green-600 text-white'
                      : currentStep === step.id
                      ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-lg'
                      : 'bg-gray-200 border-gray-300 text-gray-500'
                  } transition-all duration-300 ease-in-out`}
              >
                {currentStep > step.id ? <CheckCircle size={22} /> : <step.icon size={20} />}
              </div>
              <p className={`mt-2 text-xs sm:text-sm font-medium ${
                currentStep === step.id ? 'text-primary' : currentStep > step.id ? 'text-green-600' : 'text-gray-500'
              }`}>{step.name}</p>
            </div>
            {index < NEW_STEPS.length - 1 && (
              <div className={`flex-1 h-1 mt-5 mx-1 sm:mx-2 rounded-full ${
                currentStep > step.id + 1 ? 'bg-green-500' : (currentStep > step.id ? 'bg-green-300' : 'bg-gray-300')
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col p-0 shadow-xl">
        <DialogHeader className="p-5 sm:p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-gray-800">导入数据审核与确认</DialogTitle>
          {/* Optional: Sub-description if needed */}
          {/* <DialogDescription>请按步骤检查并确认您的数据与设置。</DialogDescription> */}
        </DialogHeader>

        <StepperUI />

        <div className="p-5 sm:p-6 flex-grow overflow-y-auto min-h-[350px] bg-white">
          {renderStepContent()}
        </div>

        <DialogFooter className="p-4 sm:p-5 border-t flex flex-col sm:flex-row justify-between items-center w-full bg-gray-50 space-y-3 sm:space-y-0">
          <div className="flex-shrink-0">
            <Button variant="outline" onClick={handlePrevious} disabled={isAIParsing || isCheckingStudents || isImporting}>
              <ArrowLeft size={16} className="mr-1.5" />
              上一步
            </Button>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <Button variant="ghost" onClick={handleDialogClose} disabled={isAIParsing || isCheckingStudents || isImporting}>
                取消
            </Button>
            {currentStep < NEW_STEPS.length && (
              <Button 
                onClick={handleNext} 
                disabled={isAIParsing || (currentStep === 1 && !aiSuggestedMappings) || (currentStep === 2 && !userConfirmedMappings) || isCheckingStudents || isImporting}
              >
                下一步
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            )}
            {currentStep === NEW_STEPS.length && (
              <Button 
                onClick={handleFinalConfirmAndImport} 
                disabled={isImporting || isAIParsing || isCheckingStudents}
                className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
              >
                {isImporting ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Send size={16} className="mr-2" /> // Changed icon for final import
                )}
                {isImporting ? '正在导入...' : '完成并导入'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportReviewDialog; 