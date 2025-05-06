import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { PlusCircle, X, AlertCircle, BrainCircuit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Info, PenLine, Plus, Trash2, Trophy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mockApi } from "@/data/mockData";
import { getHomeworkSubmissions, gradeHomework } from "@/services/homeworkService";
import { getGradingScaleWithLevels, GradingScaleLevel } from "@/services/gradingService";
import { AIKnowledgePointAnalyzer, KnowledgePoint } from "@/components/homework/AIKnowledgePointAnalyzer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { updateKnowledgePointEvaluations } from "@/services/knowledgePointService";

export interface TeacherGradeHomeworkDialogProps {
  homeworkId: string;
  submissionId?: string | null;
  studentId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGraded?: () => void;
  onClose?: () => void;
  onGradeSubmit?: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  knowledgePoints: any[];
  gradingScaleId?: string | null;
  onSaveAiKnowledgePoints?: (knowledgePoints: KnowledgePoint[]) => void;
}

const formSchema = z.object({
  studentId: z.string().min(1, {
    message: "请选择学生",
  }),
  score: z.coerce
    .number()
    .min(0, { message: "分数不能低于0" })
    .max(100, { message: "分数不能高于100" }),
  feedback: z.string().optional(),
  knowledgePointEvaluations: z.array(
    z.object({
      knowledgePointId: z.string(),
      masteryLevel: z.number().min(0).max(100),
    })
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function TeacherGradeHomeworkDialog({
  homeworkId,
  submissionId,
  studentId: studentIdProp,
  open,
  onOpenChange,
  onGraded,
  onClose,
  onGradeSubmit,
  isSubmitting = false,
  knowledgePoints,
  gradingScaleId,
  onSaveAiKnowledgePoints
}: TeacherGradeHomeworkDialogProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKnowledgePoints, setSelectedKnowledgePoints] = useState<string[]>([]);
  const [knowledgePointEvaluations, setKnowledgePointEvaluations] = useState<
    { id: string; name: string; masteryLevel: number; evaluationId?: string }[]
  >([]);
  const { toast } = useToast();
  const [gradingScale, setGradingScale] = useState<{
    id: string;
    name: string;
    levels: GradingScaleLevel[];
  } | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [isAiAnalysisComplete, setIsAiAnalysisComplete] = useState(false);
  const [preSelectedStudentName, setPreSelectedStudentName] = useState<string | null>(null);
  const [isLoadingStudentName, setIsLoadingStudentName] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      score: 0,
      feedback: "",
      knowledgePointEvaluations: [],
    },
  });

  useEffect(() => {
    const fetchStudents = async () => {
      if (!open || studentIdProp) return;
      
      try {
        setIsLoading(true);
        
        const result = await getHomeworkSubmissions(homeworkId);
        console.log('获取到的提交数据 (for dropdown):', result);
        
        if (result.success && result.submissions) {
          const submissionsData = result.submissions;
          const studentOptions = submissionsData
            .filter(sub => sub.students && (Array.isArray(sub.students) ? sub.students[0]?.id : sub.students?.id))
            .map((sub: any) => {
              const student = Array.isArray(sub.students) ? sub.students[0] : sub.students;
              return { value: student.id, label: student.name, submissionId: sub.id, status: sub.status };
            });
        
          setStudents(studentOptions);
        } else {
          console.error('获取提交列表失败 (for dropdown):', result.error);
          toast({ title: "获取学生列表失败", description: result.error || "请检查网络连接" });
          setStudents([]);
        }
      } catch (error) {
        console.error('获取学生列表异常 (for dropdown):', error);
        toast({ title: "获取学生列表失败", description: "加载学生列表时发生错误" });
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudents();
  }, [homeworkId, open, studentIdProp, toast]);

  useEffect(() => {
    const fetchGradingScale = async () => {
      if (!gradingScaleId || !open) return;
      
      try {
        const data = await getGradingScaleWithLevels(gradingScaleId);
        if (data) {
          setGradingScale({
            id: data.id || "",
            name: data.name,
            levels: data.levels || []
          });
        }
      } catch (error) {
        console.error("获取评级标准失败:", error);
        toast({
          variant: "destructive",
          title: "错误",
          description: "获取评级标准失败"
        });
      }
    };
    
    fetchGradingScale();
  }, [gradingScaleId, open, toast]);

  useEffect(() => {
    const loadDataForDialog = async () => {
      if (!open) return;
      const currentStudentId = studentIdProp;

      setIsLoading(true);
      setIsLoadingStudentName(!!currentStudentId);
      setSelectedSubmission(null);
      setPreSelectedStudentName(null);
      form.reset({ studentId: currentStudentId || "", score: 0, feedback: "" });
      setKnowledgePointEvaluations([]);
      setSelectedKnowledgePoints([]);

      let studentNameFromDb: string | null = null;
      let submissionData: any = null;
      let loadError: Error | null = null;

      try {
        if (submissionId) {
          console.log('加载提交数据，通过 submissionId:', submissionId);
          const { data, error } = await supabase
            .from('homework_submissions')
            .select(`
              id,
              student_id,
              score,
              status,
              teacher_feedback,
              students (id, name, student_id),
              student_knowledge_mastery (id, knowledge_point_id, mastery_level, mastery_grade, assessment_count)
            `)
            .eq('id', submissionId)
            .single();
        
          if (error) {
            console.error('加载提交数据失败 (by submissionId):', error);
            toast({ title: "加载失败", description: `无法获取提交数据: ${error.message}` });
            setIsLoading(false);
            return;
          }
          
          console.log('提交数据加载成功 (by submissionId):', data);
          submissionData = data;
        } else if (currentStudentId) {
          console.log('加载提交数据，通过 studentId:', currentStudentId, '和 homeworkId:', homeworkId);
          const { data, error } = await supabase
            .from('homework_submissions')
            .select(`
              id,
              student_id,
              score,
              status,
              teacher_feedback,
              students (id, name, student_id),
              student_knowledge_mastery (id, knowledge_point_id, mastery_level, mastery_grade, assessment_count)
            `)
            .eq('student_id', currentStudentId)
            .eq('homework_id', homeworkId)
            .maybeSingle();
            
          if (error) {
            console.warn('查询学生提交记录时出错(可能不存在): ', error.message);
          }
          
          submissionData = data;
        }

        const studentIdToFetch = currentStudentId || submissionData?.student_id;
        if (studentIdToFetch) {
          try {
            console.log('尝试获取学生姓名, ID:', studentIdToFetch);
            const { data: studentInfo, error: studentError } = await supabase
              .from('students')
              .select('name')
              .eq('id', studentIdToFetch)
              .single();
            if (studentError) {
              console.error('获取预选学生姓名失败:', studentError);
              studentNameFromDb = "无效学生";
            } else if (studentInfo) {
              studentNameFromDb = studentInfo.name;
              console.log('获取到学生姓名:', studentNameFromDb);
            }
          } catch (nameError: any) {
             console.error('获取学生姓名时发生异常:', nameError);
             studentNameFromDb = "查询出错";
          }
        }

        if (submissionData) {
          console.log('处理找到的提交数据:', submissionData);
          setSelectedSubmission(submissionData);
          form.reset({
            studentId: submissionData.student_id,
            score: submissionData.score || 0,
            feedback: submissionData.teacher_feedback || '',
          });
          
          if (submissionData.student_knowledge_mastery && submissionData.student_knowledge_mastery.length > 0) {
            console.log('提交包含知识点评估:', submissionData.student_knowledge_mastery);
            
            const knowledgePointMap = new Map(knowledgePoints.map(kp => [kp.id, kp]));
            
            const evaluations = submissionData.student_knowledge_mastery.map(evaluation => {
              const knowledgePoint = knowledgePointMap.get(evaluation.knowledge_point_id);
              return {
                id: evaluation.knowledge_point_id,
                name: knowledgePoint?.name || '未知知识点',
                masteryLevel: evaluation.mastery_level,
                evaluationId: evaluation.id
              };
            });
            
            setKnowledgePointEvaluations(evaluations);
            setSelectedKnowledgePoints(evaluations.map(e => e.id));
          } else {
            initializeDefaultKnowledgePoints();
          }
        } else if (currentStudentId) {
          console.log('未找到提交记录，但有学生ID，为新评分设置表单');
          form.setValue('studentId', currentStudentId);
          form.reset({ studentId: currentStudentId, score: 0, feedback: '' });
          initializeDefaultKnowledgePoints();
        } else {
          console.log('通用评分对话框，无预选学生');
          initializeDefaultKnowledgePoints();
        }
      } catch (error: any) {
        loadError = error;
        console.error('加载提交数据时捕获异常:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingStudentName(false);
        setPreSelectedStudentName(studentNameFromDb);
        if (loadError) {
           toast({ title: "加载失败", description: `加载数据时出错: ${loadError.message || loadError}` });
        }
      }
    };

    const initializeDefaultKnowledgePoints = () => {
      if (knowledgePoints && knowledgePoints.length > 0) {
        console.log('初始化默认知识点评估');
        const defaultEvaluations = knowledgePoints.map(kp => ({
          id: kp.id,
          name: kp.name,
          masteryLevel: 50,
          evaluationId: undefined
        }));
        
        setKnowledgePointEvaluations(defaultEvaluations);
        setSelectedKnowledgePoints(defaultEvaluations.map(e => e.id));
      } else {
        setKnowledgePointEvaluations([]);
        setSelectedKnowledgePoints([]);
      }
    };
    
    if (open) {
      loadDataForDialog();
    }
  }, [open, submissionId, studentIdProp, homeworkId, knowledgePoints, form, toast]);

  const handleAddKnowledgePoint = (knowledgePointId: string) => {
    if (selectedKnowledgePoints.includes(knowledgePointId)) return;
    
    const knowledgePoint = knowledgePoints.find((kp) => kp.id === knowledgePointId);
    if (!knowledgePoint) return;
    
    setSelectedKnowledgePoints([...selectedKnowledgePoints, knowledgePointId]);
    setKnowledgePointEvaluations([
      ...knowledgePointEvaluations,
      { 
        id: knowledgePointId, 
        name: knowledgePoint.name, 
        masteryLevel: 50,
        evaluationId: `temp-${knowledgePointId}`
      }
    ]);
  };

  const handleRemoveKnowledgePoint = (knowledgePointId: string) => {
    setSelectedKnowledgePoints(
      selectedKnowledgePoints.filter((id) => id !== knowledgePointId)
    );
    setKnowledgePointEvaluations(
      knowledgePointEvaluations.filter((kp) => kp.id !== knowledgePointId)
    );
  };

  const handleMasteryLevelChange = (knowledgePointId: string, value: number) => {
    setKnowledgePointEvaluations(
      knowledgePointEvaluations.map((kp) =>
        kp.id === knowledgePointId ? { ...kp, masteryLevel: value } : kp
      )
    );
  };

  const getMasteryLevelLabel = (level: number): string => {
    if (level >= 90) return "优秀";
    if (level >= 80) return "良好";
    if (level >= 70) return "中等";
    if (level >= 60) return "及格";
    return "不及格";
  };

  const getCustomGradeLabel = (score: number): string => {
    if (!gradingScale || !gradingScale.levels.length) {
      return getMasteryLevelLabel(score);
    }
    
    const level = gradingScale.levels.find(
      level => score >= level.min_score && score <= level.max_score
    );
    
    return level ? level.name : "-";
  };

  const renderScoreWithGrade = (score: number) => {
    const gradeLabel = getCustomGradeLabel(score);
    return (
      <div className="flex items-center space-x-2">
        <span className="text-2xl font-bold">{score}</span>
        <Badge className="ml-2">{gradeLabel}</Badge>
      </div>
    );
  };

  const handleSaveAiKnowledgePoints = (aiKnowledgePoints: KnowledgePoint[]) => {
    const evaluations = aiKnowledgePoints.map(kp => ({
      id: kp.id || kp.name,
      name: kp.name,
      masteryLevel: kp.masteryLevel || 50
    }));
    
    setKnowledgePointEvaluations(evaluations);
    
    setSelectedKnowledgePoints(evaluations.map(e => e.id));
    
    setIsAiAnalysisComplete(true);
    
    setActiveTab("manual");
    
    toast({
      title: "AI知识点评估已应用",
      description: `已成功应用 ${evaluations.length} 个知识点评估`
    });
    
    if (onSaveAiKnowledgePoints) {
      onSaveAiKnowledgePoints(aiKnowledgePoints);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      
      console.log('提交评分表单:', values);
      
      const evaluations = knowledgePointEvaluations.map(evaluation => ({
        knowledgePointId: evaluation.id,
        masteryLevel: evaluation.masteryLevel,
        evaluationId: evaluation.evaluationId
      }));
      
      console.log('准备保存知识点评估:', evaluations);
      
      const currentSubmissionId = selectedSubmission?.id || submissionId;
      const currentStudentId = values.studentId;
      
      let submissionIdToUse = currentSubmissionId;
      let isNewSubmission = false;
      
      if (!submissionIdToUse && currentStudentId && homeworkId) {
        console.log('创建新的提交记录 for student:', currentStudentId);
        isNewSubmission = true;
        
        const { data: newSubmission, error: createError } = await supabase
          .from('homework_submissions')
          .insert({
            homework_id: homeworkId,
            student_id: currentStudentId,
            score: values.score,
            status: 'graded',
            teacher_feedback: values.feedback,
            updated_at: new Date().toISOString()
          })
          .select('id')
          .single();
          
        if (createError) {
          console.error('创建提交记录失败:', createError);
          toast({
            variant: "destructive",
            title: "创建提交失败",
            description: `无法创建新的提交记录: ${createError.message}`
          });
          setIsLoading(false);
          return;
        }
        
        console.log('创建的新提交记录:', newSubmission);
        submissionIdToUse = newSubmission.id;
        
        setSelectedSubmission({ id: submissionIdToUse, student_id: currentStudentId, ...values });
      } else if (!submissionIdToUse) {
          console.error('没有有效的提交ID或学生ID来创建提交');
          toast({
            variant: "destructive",
            title: "保存失败",
            description: "缺少有效的提交信息"
          });
          setIsLoading(false);
          return;
      }
      
      if (!isNewSubmission) {
          console.log('更新现有提交记录:', submissionIdToUse);
          const { error: updateError } = await supabase
            .from('homework_submissions')
            .update({
              score: values.score,
              status: 'graded',
              teacher_feedback: values.feedback,
              updated_at: new Date().toISOString()
            })
            .eq('id', submissionIdToUse);
            
          if (updateError) {
            console.error('更新提交记录失败:', updateError);
            toast({
              variant: "destructive",
              title: "保存失败",
              description: `更新评分信息失败: ${updateError.message}`
            });
            setIsLoading(false);
            return;
          }
          console.log('提交记录更新成功');
      }
      
      if (evaluations.length > 0 && submissionIdToUse && currentStudentId && homeworkId) {
          const evaluationResult = await updateKnowledgePointEvaluations(
            submissionIdToUse,
            evaluations,
            homeworkId
          );
          
          if (!evaluationResult.success) {
            console.error('保存知识点评估失败:', evaluationResult.message);
            toast({
              variant: "destructive",
              title: "部分保存失败",
              description: "评分已保存，但知识点评估更新失败"
            });
          } else {
            console.log('知识点评估保存结果:', evaluationResult);
          }
      } else {
           console.log('没有知识点评估需要保存或缺少必要ID');
      }
      
      if (onGraded) {
        onGraded();
      }
      
      onOpenChange(false);
      
      toast({
        title: "评分已保存",
        description: "学生作业评分已成功保存"
      });
    } catch (error: any) {
      console.error('保存评分过程中发生错误:', error);
      toast({
        variant: "destructive",
        title: "保存失败",
        description: `保存评分时发生错误: ${error.message || error}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>批改学生作业</DialogTitle>
          <DialogDescription>
            为学生评分并提供反馈，同时评估知识点掌握程度
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>选择学生</FormLabel>
                  <Select
                    onValueChange={(value) => {
                        field.onChange(value);
                        if (!studentIdProp) {
                            setPreSelectedStudentName(null);
                        }
                    }}
                    value={field.value || ""}
                    disabled={!!studentIdProp || isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择学生" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {studentIdProp ? (
                        isLoadingStudentName ? (
                          <SelectItem value={studentIdProp} disabled>加载中...</SelectItem>
                        ) : preSelectedStudentName ? (
                          <SelectItem key={studentIdProp} value={studentIdProp}>
                            {preSelectedStudentName}
                          </SelectItem>
                        ) : (
                          <SelectItem value={studentIdProp} disabled>学生信息错误</SelectItem>
                        )
                      ) : (
                        students.length > 0 ? (
                          students.map((student) => (
                            <SelectItem key={student.value} value={student.value}>
                              {student.label}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>暂无学生</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center">
                  <PenLine className="mr-2 h-4 w-4" />
                  手动评分
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex items-center">
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  AI辅助评分
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>分数</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            {...field}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value) && value >= 0 && value <= 100) {
                                field.onChange(value);
                              }
                            }}
                          />
                          {field.value !== undefined && (
                            <div className="text-sm text-gray-500 flex items-center">
                              当前评级: 
                              <Badge 
                                variant="outline" 
                                className="ml-2"
                              >
                                {getCustomGradeLabel(field.value)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="feedback"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>教师反馈</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="请输入反馈内容"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">知识点评估</Label>
                      <p className="text-sm text-muted-foreground">
                        选择要评估的知识点，拖动滑块设置掌握程度
                      </p>
                    </div>
                    
                    {isAiAnalysisComplete && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        AI辅助评估已应用
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {knowledgePointEvaluations.map((kp) => (
                      <Badge
                        key={kp.id}
                        variant="outline"
                        className="py-2 px-3 flex items-center gap-2"
                      >
                        <span>{kp.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => handleRemoveKnowledgePoint(kp.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}

                    <Select
                      onValueChange={handleAddKnowledgePoint}
                      value="none"
                      defaultValue="none"
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="添加知识点" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" disabled>添加知识点</SelectItem>
                        {knowledgePoints
                          .filter((kp) => kp.id && !selectedKnowledgePoints.includes(kp.id))
                          .map((kp) => (
                            <SelectItem key={kp.id} value={kp.id}>
                              {kp.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {knowledgePointEvaluations.length > 0 ? (
                    <div className="space-y-4 border rounded-md p-4">
                      {knowledgePointEvaluations.map((kp) => (
                        <div key={kp.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>{kp.name}</Label>
                            <span className="text-sm font-medium">
                              {getMasteryLevelLabel(kp.masteryLevel)}（{kp.masteryLevel}）
                            </span>
                          </div>
                          <Slider
                            defaultValue={[kp.masteryLevel]}
                            max={100}
                            step={5}
                            onValueChange={(value) => handleMasteryLevelChange(kp.id, value[0])}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 border border-dashed rounded-md">
                      <p className="text-sm text-muted-foreground">
                        尚未选择任何知识点，请添加知识点或使用AI辅助评估
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="ai" className="pt-4">
                {selectedSubmission ? (
                  <AIKnowledgePointAnalyzer
                    homeworkId={homeworkId}
                    submissionId={selectedSubmission.id}
                    submissionContent={selectedSubmission.content || "这是学生提交的作业内容，用于测试AI分析功能。可能包含方程式解法、函数图像和概率计算相关的内容。"}
                    existingKnowledgePoints={knowledgePoints}
                    onSaveKnowledgePoints={handleSaveAiKnowledgePoints}
                  />
                ) : (
                  <div className="text-center p-8 border border-dashed rounded-md">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">无法加载提交内容</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      无法获取学生提交的作业内容，无法进行AI分析
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("manual")}>
                      返回手动评分
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                提交评分
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 