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
import { gradeAnalysisService, MergeStrategy } from "@/services/gradeAnalysisService";
import type { 
    FileDataForReview as ReviewDialogFileData, 
    ExamInfo as ReviewDialogExamInfo, 
    AIParseResult, 
    ExistingStudentCheckResult 
} from "@/components/analysis/ImportReviewDialog"; // Assuming types are exported from dialog

// Define standard system fields for mapping - customize as needed
const STANDARD_SYSTEM_FIELDS: Record<string, string> = {
  // 基本字段
  student_id: "学号",
  name: "姓名",
  class_name: "班级名称",
  subject: "科目",
  score: "分数",
  total_score: "总分",
  exam_title: "考试标题",
  exam_type: "考试类型",
  exam_date: "考试日期",
  level: "层次",
  
  // 通用排名和等级
  grade: "等级",
  rank_in_class: "班级排名",
  rank_in_grade: "年级排名",
  rank_in_school: "学校排名",
  
  // 科目分数
  chinese_score: "语文分数",
  math_score: "数学分数",
  english_score: "英语分数",
  physics_score: "物理分数",
  chemistry_score: "化学分数",
  biology_score: "生物分数",
  history_score: "历史分数",
  geography_score: "地理分数",
  politics_score: "政治分数",
  
  // 科目等级
  chinese_grade: "语文等级",
  math_grade: "数学等级",
  english_grade: "英语等级",
  physics_grade: "物理等级",
  chemistry_grade: "化学等级",
  biology_grade: "生物等级",
  history_grade: "历史等级",
  geography_grade: "地理等级",
  politics_grade: "政治等级",
  
  // 科目班级排名
  chinese_rank_class: "语文班级排名",
  math_rank_class: "数学班级排名",
  english_rank_class: "英语班级排名",
  physics_rank_class: "物理班级排名",
  chemistry_rank_class: "化学班级排名",
  biology_rank_class: "生物班级排名",
  history_rank_class: "历史班级排名",
  geography_rank_class: "地理班级排名",
  politics_rank_class: "政治班级排名",
  
  // 科目学校排名
  chinese_rank_school: "语文学校排名",
  math_rank_school: "数学学校排名",
  english_rank_school: "英语学校排名",
  physics_rank_school: "物理学校排名",
  chemistry_rank_school: "化学学校排名",
  biology_rank_school: "生物学校排名",
  history_rank_school: "历史学校排名",
  geography_rank_school: "地理学校排名",
  politics_rank_school: "政治学校排名",
  
  // 科目年级排名
  chinese_rank_grade: "语文年级排名",
  math_rank_grade: "数学年级排名",
  english_rank_grade: "英语年级排名",
  physics_rank_grade: "物理年级排名",
  chemistry_rank_grade: "化学年级排名",
  biology_rank_grade: "生物年级排名",
  history_rank_grade: "历史年级排名",
  geography_rank_grade: "地理年级排名",
  politics_rank_grade: "政治年级排名"
};

// 预设字段映射：从实际表头到系统字段的映射
const KNOWN_HEADERS_MAPPING: Record<string, string> = {
  // 基本信息
  "姓名": "name",
  "学号": "student_id",
  "行政班级": "class_name",
  "班级": "class_name",
  "层次": "level",
  
  // 总分相关
  "总分分数": "total_score",
  "总分等级": "grade",
  "总分班名": "rank_in_class",
  "总分校名": "rank_in_school",
  
  // 语文相关
  "语文分数": "chinese_score",
  "语文等级": "chinese_grade",
  "语文班名": "chinese_rank_class",
  "语文校名": "chinese_rank_school",
  
  // 数学相关
  "数学分数": "math_score",
  "数学等级": "math_grade",
  "数学班名": "math_rank_class",
  "数学校名": "math_rank_school",
  "数学级名": "math_rank_grade",
  
  // 英语相关
  "英语分数": "english_score",
  "英语等级": "english_grade",
  "英语班名": "english_rank_class",
  "英语校名": "english_rank_school",
  "英语级名": "english_rank_grade",
  
  // 物理相关
  "物理分数": "physics_score",
  "物理等级": "physics_grade",
  "物理班名": "physics_rank_class",
  "物理校名": "physics_rank_school",
  "物理级名": "physics_rank_grade",
  
  // 化学相关
  "化学分数": "chemistry_score",
  "化学等级": "chemistry_grade",
  "化学班名": "chemistry_rank_class",
  "化学校名": "chemistry_rank_school",
  "化学级名": "chemistry_rank_grade",
  
  // 道法相关
  "道法分数": "politics_score",
  "道法等级": "politics_grade",
  "道法班名": "politics_rank_class",
  "道法校名": "politics_rank_school",
  "道法级名": "politics_rank_grade",
  
  // 历史相关
  "历史分数": "history_score",
  "历史等级": "history_grade",
  "历史班名": "history_rank_class",
  "历史校名": "history_rank_school",
  "历史级名": "history_rank_grade",
  
  // 生物相关
  "生物分数": "biology_score",
  "生物等级": "biology_grade",
  "生物班名": "biology_rank_class",
  "生物校名": "biology_rank_school",
  "生物级名": "biology_rank_grade",
  
  // 地理相关
  "地理分数": "geography_score",
  "地理等级": "geography_grade",
  "地理班名": "geography_rank_class",
  "地理校名": "geography_rank_school",
  "地理级名": "geography_rank_grade"
};

// 需要动态添加到系统字段的科目特定字段
const DYNAMIC_SUBJECT_FIELDS = [
  // 格式: [字段名后缀, 显示名称前缀]
  ["_grade", "等级"],
  ["_rank_class", "班级排名"], 
  ["_rank_school", "学校排名"],
  ["_rank_grade", "年级排名"],
];

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

  // Mock implementation for onSuggestFieldMapping (for ImportReviewDialog)
  const handleSuggestFieldMapping = async (header: string, sampleData: any[]) => {
    console.log(`Dialog: Requesting AI suggestion for header: "${header}"`, "Sample data:", sampleData.slice(0,5));
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API call to AI service

    // --- Mock AI Logic ---
    const lowerHeader = header.toLowerCase();

    if (lowerHeader.includes('语文') || lowerHeader.includes('chinese')) {
      return { suggestedSystemField: 'score', newFieldName: '语文分数' }; 
    }
    if (lowerHeader.includes('数学') || lowerHeader.includes('math')) {
      return { suggestedSystemField: 'score' };
    }
    if (lowerHeader.includes('学号') || lowerHeader.includes('student id')) {
      return { suggestedSystemField: 'student_id' };
    }
    if (lowerHeader.includes('备注') || lowerHeader.includes('comment')) {
      return { isNewField: true, newFieldName: '自定义备注', suggestedSystemField: '' };
    }
    
    return null;
  };

  // State for tracking custom fields created through the dialog
  const [userCreatedCustomFields, setUserCreatedCustomFields] = useState<Record<string, string>>({});

  // Handle when dialog requests to create a new custom field
  const handleCustomFieldCreateRequested = async (newFieldName: string, originalHeader: string): Promise<string | null> => {
    console.log(`[Index] Creating custom field "${newFieldName}" for header "${originalHeader}"`);
    
    // Generate a unique key for the custom field
    const newFieldKey = `custom_${newFieldName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    
    // Update state with the new field
    setUserCreatedCustomFields(prevFields => {
      const updatedFields = {
        ...prevFields,
        [newFieldKey]: `${newFieldName} (自定义)`
      };
      console.log(`[Index] Updated custom fields:`, updatedFields);
      return updatedFields;
    });
    
    toast.success(`自定义信息项 "${newFieldName}" 已创建`);
    return newFieldKey;
  };

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
    // 模拟AI解析延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 创建映射
    const suggestedMappings: Record<string, string> = initialMappingsForReview || {};
    
    // 为科目特定字段预先准备系统字段定义
    const subjectFields: Record<string, string> = {};
    
    // 先确保标准系统字段已包含所有科目的字段定义
    ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics'].forEach(subject => {
      DYNAMIC_SUBJECT_FIELDS.forEach(([suffix, displayPrefix]) => {
        const fieldKey = `${subject}${suffix}`;
        // 如果系统字段中没有这个字段，添加它
        if (!STANDARD_SYSTEM_FIELDS[fieldKey]) {
          const subjectDisplayName = {
            'chinese': '语文',
            'math': '数学',
            'english': '英语',
            'physics': '物理',
            'chemistry': '化学',
            'biology': '生物',
            'history': '历史',
            'geography': '地理',
            'politics': '道法'
          }[subject];
          
          subjectFields[fieldKey] = `${subjectDisplayName}${displayPrefix}`;
        }
      });
    });
    
    // 将这些动态生成的字段添加到用户自定义字段中
    setUserCreatedCustomFields(prev => ({
      ...prev,
      ...subjectFields
    }));
    
    console.log("已动态添加科目特定字段:", Object.keys(subjectFields).length);
    
    // 1. 首先尝试从预设映射中匹配
    let matchCount = 0;
    fileData.headers.forEach(header => {
      if (KNOWN_HEADERS_MAPPING[header]) {
        suggestedMappings[header] = KNOWN_HEADERS_MAPPING[header];
        matchCount++;
      }
    });
    
    // 2. 对于未匹配的字段，尝试智能识别
    fileData.headers.forEach(header => {
      // 如果已经有映射了，跳过
      if (suggestedMappings[header]) return;
      
      const lowerHeader = header.toLowerCase();
      
      // 1. 处理基本字段
      if (lowerHeader.includes('姓名')) {
        suggestedMappings[header] = 'name';
      }
      else if (lowerHeader.includes('学号')) {
        suggestedMappings[header] = 'student_id';
      }
      else if (lowerHeader.includes('班级') || lowerHeader.includes('行政班')) {
        suggestedMappings[header] = 'class_name';
      }
      // 2. 处理总分相关字段
      else if (lowerHeader.includes('总分') && lowerHeader.includes('分数')) {
        suggestedMappings[header] = 'total_score';
      }
      // 3. 对科目成绩字段，生成自定义字段键值
      else if (lowerHeader.includes('分数')) {
        // 提取科目名称（例如 "语文分数" 提取 "语文"）
        const subjectMatch = header.match(/^(.+?)分数$/);
        if (subjectMatch && subjectMatch[1]) {
          const subject = subjectMatch[1];
          // 使用更具体的命名格式
          const key = `custom_${subject}_score_${Date.now()}`;
          // 将这个新字段添加到可用字段中
          setUserCreatedCustomFields(prev => ({
            ...prev,
            [key]: `${subject}分数 (自动创建)`
          }));
          // 设置映射
          suggestedMappings[header] = key;
        } else {
          // 无法识别的分数字段
          suggestedMappings[header] = 'score';
        }
      }
      // 4. 处理等级字段
      else if (lowerHeader.includes('等级')) {
        const subjectMatch = header.match(/^(.+?)等级$/);
        if (subjectMatch && subjectMatch[1]) {
          const subject = subjectMatch[1];
          const key = `custom_${subject}_grade_${Date.now()}`;
          setUserCreatedCustomFields(prev => ({
            ...prev,
            [key]: `${subject}等级 (自动创建)`
          }));
          suggestedMappings[header] = key;
        }
      }
      // 5. 处理排名字段
      else if (lowerHeader.includes('班名')) {
        const subjectMatch = header.match(/^(.+?)班名$/);
        if (subjectMatch && subjectMatch[1]) {
          const subject = subjectMatch[1];
          const key = `custom_${subject}_rank_class_${Date.now()}`;
          setUserCreatedCustomFields(prev => ({
            ...prev,
            [key]: `${subject}班级排名 (自动创建)`
          }));
          suggestedMappings[header] = key;
        }
      }
      else if (lowerHeader.includes('校名')) {
        const subjectMatch = header.match(/^(.+?)校名$/);
        if (subjectMatch && subjectMatch[1]) {
          const subject = subjectMatch[1];
          const key = `custom_${subject}_rank_school_${Date.now()}`;
          setUserCreatedCustomFields(prev => ({
            ...prev,
            [key]: `${subject}学校排名 (自动创建)`
          }));
          suggestedMappings[header] = key;
        }
      }
      else if (lowerHeader.includes('级名')) {
        const subjectMatch = header.match(/^(.+?)级名$/);
        if (subjectMatch && subjectMatch[1]) {
          const subject = subjectMatch[1];
          const key = `custom_${subject}_rank_grade_${Date.now()}`;
          setUserCreatedCustomFields(prev => ({
            ...prev,
            [key]: `${subject}年级排名 (自动创建)`
          }));
          suggestedMappings[header] = key;
        }
      }
      // 6. 处理其他特殊字段
      else if (lowerHeader.includes('层次')) {
        const key = `custom_level_${Date.now()}`;
        setUserCreatedCustomFields(prev => ({
          ...prev,
          [key]: `层次 (自动创建)`
        }));
        suggestedMappings[header] = key;
      }
    });
    
    console.log("AI generated mappings:", suggestedMappings);
    toast.success("智能分析完成", { 
      description: `已智能识别${fileData.headers.length}个表头字段，其中${matchCount}个来自预设映射，${fileData.headers.length - matchCount}个通过AI分析创建` 
    });
    
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

  const handleDialogCancel = () => {
    setIsReviewDialogOpen(false);
    // 重置导入相关状态
    setFileDataForReview(null);
    setInitialMappingsForReview(null);
    setExamInfoForReview(null);
    setProcessingFileInfo(null);
    // 可选：如果希望每次导入都重置自定义字段，取消下面的注释
    // setUserCreatedCustomFields({});
  };

  const handleFinalImportInDialog = async (
    finalExamInfo: ReviewDialogExamInfo,
    confirmedMappings: Record<string, string>,
    mergeChoice: string, 
    fullDataToImport: any[]
  ) => {
    console.log("Dialog wants to final import with:", finalExamInfo, confirmedMappings, mergeChoice, fullDataToImport);
    toast.info("开始最终导入流程...", {id: "final-import"});
    
    // 处理数据
    const processedData = fullDataToImport.map((row, index) => {
      const formattedRow: Record<string, any> = {};
      Object.keys(confirmedMappings).forEach(header => {
        const mappedField = confirmedMappings[header];
        if (mappedField && row[header] !== undefined && row[header] !== null) {
          formattedRow[mappedField] = String(row[header]); // Basic conversion, needs enhancement for types
        }
      });
      // 添加考试信息
      formattedRow.exam_title = finalExamInfo.title;
      formattedRow.exam_type = finalExamInfo.type;
      formattedRow.exam_date = finalExamInfo.date;
      if (finalExamInfo.subject) formattedRow.subject = finalExamInfo.subject;
      
      return formattedRow;
    });

    try {
      // 将mergeChoice转换为MergeStrategy
      const mergeStrategy: MergeStrategy = 
        mergeChoice === 'replace_all' ? 'replace' :
        mergeChoice === 'update_existing' ? 'update' : 'add_only';
      
      // 调用服务保存数据
      const result = await gradeAnalysisService.saveExamData(
        processedData, 
        finalExamInfo, 
        mergeStrategy
      );
      
      if (!result.success) {
        throw new Error(result.error instanceof Error ? result.error.message : '未知错误');
      }
      
      toast.success("最终导入成功！", {
        description: `已导入 ${result.count} 条记录`,
        id: "final-import"
      });
      handleGradeDataImportedSuccessfully(result.count);
      
      // 关闭对话框并重置状态
      setIsReviewDialogOpen(false);
      setFileDataForReview(null);
      setInitialMappingsForReview(null);
      setExamInfoForReview(null);
      setProcessingFileInfo(null);
    } catch (error) {
      console.error("Final import error:", error);
      toast.error("最终导入失败", { 
        description: error instanceof Error ? error.message : '未知错误', 
        id: "final-import" 
      });
    }
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
            availableSystemFields={{...STANDARD_SYSTEM_FIELDS, ...userCreatedCustomFields}}
            onStartAIParse={handleStartAIParseInDialog}
            onCheckExistingStudents={handleCheckExistingStudentsInDialog}
            onFinalImport={handleFinalImportInDialog}
            onSuggestFieldMapping={handleSuggestFieldMapping}
            onCustomFieldCreateRequested={handleCustomFieldCreateRequested}
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
