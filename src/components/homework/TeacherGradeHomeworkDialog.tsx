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
import { getHomeworkSubmissions } from "@/services/homeworkService";
import { getGradingScaleWithLevels, GradingScaleLevel } from "@/services/gradingService";
import { AIKnowledgePointAnalyzer, KnowledgePoint } from "@/components/homework/AIKnowledgePointAnalyzer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  studentId,
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
    { id: string; name: string; masteryLevel: number }[]
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
      if (!open) return;
      
      try {
        setIsLoading(true);
        
        // 使用Supabase服务获取提交数据
        const submissionsData = await getHomeworkSubmissions(homeworkId);
        const studentOptions = submissionsData
          .filter(sub => sub.students && sub.students.id) // 确保学生数据有效
          .map((sub: any) => ({
            value: sub.students.id,
            label: sub.students.name,
            submissionId: sub.id,
            status: sub.status
          }));
        
        setStudents(studentOptions);
        
        // 如果提供了submissionId，直接使用这个提交
        if (submissionId) {
          const submission = submissionsData.find((sub: any) => sub.id === submissionId);
          if (submission) {
            form.setValue('studentId', submission.students.id);
            
            // 如果该提交已评分，预填表单
            if (submission.status === 'graded') {
              form.setValue('score', submission.score || 0);
              form.setValue('feedback', submission.feedback || '');
              
              // 预填知识点评估
              if (submission.submission_knowledge_points && submission.submission_knowledge_points.length > 0) {
                const kpEvals = submission.submission_knowledge_points.map((kpe: any) => ({
                  id: kpe.knowledge_point_id,
                  name: kpe.knowledge_points.name,
                  masteryLevel: kpe.mastery_level,
                  evaluationId: kpe.id // 保存评估ID用于更新
                }));
                setKnowledgePointEvaluations(kpEvals);
                setSelectedKnowledgePoints(kpEvals.map((kp: any) => kp.id));
              }
            }
          }
        }
        // 或者如果提供了studentId，预先选择该学生
        else if (studentId) {
          const selectedStudent = studentOptions.find((s: any) => s.value === studentId);
          if (selectedStudent) {
            form.setValue('studentId', selectedStudent.value);
            
            // 如果该学生已有提交记录且已评分，预填表单
            const submission = submissionsData.find((sub: any) => sub.students.id === studentId);
            if (submission && submission.status === 'graded') {
              form.setValue('score', submission.score || 0);
              form.setValue('feedback', submission.feedback || '');
              
              // 预填知识点评估
              if (submission.submission_knowledge_points && submission.submission_knowledge_points.length > 0) {
                const kpEvals = submission.submission_knowledge_points.map((kpe: any) => ({
                  id: kpe.knowledge_point_id,
                  name: kpe.knowledge_points.name,
                  masteryLevel: kpe.mastery_level,
                  evaluationId: kpe.id // 保存评估ID用于更新
                }));
                setKnowledgePointEvaluations(kpEvals);
                setSelectedKnowledgePoints(kpEvals.map((kp: any) => kp.id));
              }
            }
          }
        }
      } catch (error) {
        console.error("获取提交列表失败:", error);
        toast({
          variant: "destructive",
          title: "错误",
          description: "获取提交列表失败"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudents();
  }, [homeworkId, submissionId, studentId, open, toast, form]);

  useEffect(() => {
    // 加载评级标准
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

  // 加载选中的提交内容
  useEffect(() => {
    const loadSelectedSubmission = async () => {
      if (!open || !submissionId) return;
      
      try {
        setIsLoading(true);
        
        // 使用Supabase服务获取提交数据
        const submissionsData = await getHomeworkSubmissions(homeworkId);
        const submission = submissionsData.find((sub: any) => sub.id === submissionId);
        
        if (submission) {
          setSelectedSubmission(submission);
        }
      } catch (error) {
        console.error("获取提交数据失败:", error);
        toast({
          variant: "destructive",
          title: "错误",
          description: "获取提交数据失败"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSelectedSubmission();
  }, [homeworkId, submissionId, open, toast]);

  // 添加知识点评估
  const handleAddKnowledgePoint = (knowledgePointId: string) => {
    if (selectedKnowledgePoints.includes(knowledgePointId)) return;
    
    const knowledgePoint = knowledgePoints.find((kp) => kp.id === knowledgePointId);
    if (!knowledgePoint) return;
    
    setSelectedKnowledgePoints([...selectedKnowledgePoints, knowledgePointId]);
    setKnowledgePointEvaluations([
      ...knowledgePointEvaluations,
      { id: knowledgePointId, name: knowledgePoint.name, masteryLevel: 50 }
    ]);
  };

  // 移除知识点评估
  const handleRemoveKnowledgePoint = (knowledgePointId: string) => {
    setSelectedKnowledgePoints(
      selectedKnowledgePoints.filter((id) => id !== knowledgePointId)
    );
    setKnowledgePointEvaluations(
      knowledgePointEvaluations.filter((kp) => kp.id !== knowledgePointId)
    );
  };

  // 更新掌握程度
  const handleMasteryLevelChange = (knowledgePointId: string, value: number) => {
    setKnowledgePointEvaluations(
      knowledgePointEvaluations.map((kp) =>
        kp.id === knowledgePointId ? { ...kp, masteryLevel: value } : kp
      )
    );
  };

  // 获取掌握程度对应的等级名称
  const getMasteryLevelLabel = (level: number): string => {
    if (level >= 90) return "优秀";
    if (level >= 80) return "良好";
    if (level >= 70) return "中等";
    if (level >= 60) return "及格";
    return "不及格";
  };

  // 根据自定义评级获取等级名称
  const getCustomGradeLabel = (score: number): string => {
    if (!gradingScale || !gradingScale.levels.length) {
      return getMasteryLevelLabel(score);
    }
    
    const level = gradingScale.levels.find(
      level => score >= level.min_score && score <= level.max_score
    );
    
    return level ? level.name : "-";
  };

  // 在显示分数的地方添加等级显示
  const renderScoreWithGrade = (score: number) => {
    const gradeLabel = getCustomGradeLabel(score);
    return (
      <div className="flex items-center space-x-2">
        <span className="text-2xl font-bold">{score}</span>
        <Badge className="ml-2">{gradeLabel}</Badge>
      </div>
    );
  };

  // 处理AI知识点评估结果保存
  const handleSaveAiKnowledgePoints = (aiKnowledgePoints: KnowledgePoint[]) => {
    // 转换AI知识点为评估格式
    const evaluations = aiKnowledgePoints.map(kp => ({
      id: kp.id || kp.name,
      name: kp.name,
      masteryLevel: kp.masteryLevel || 50
    }));
    
    // 更新状态
    setKnowledgePointEvaluations(evaluations);
    
    // 将所有知识点ID添加到选中列表
    setSelectedKnowledgePoints(evaluations.map(e => e.id));
    
    // 标记AI分析已完成
    setIsAiAnalysisComplete(true);
    
    // 切换到手动评分标签页
    setActiveTab("manual");
    
    // 显示成功提示
    toast({
      title: "AI知识点评估已应用",
      description: `已成功应用 ${evaluations.length} 个知识点评估`
    });
    
    // 如果有回调函数，则调用
    if (onSaveAiKnowledgePoints) {
      onSaveAiKnowledgePoints(aiKnowledgePoints);
    }
  };

  // 提交表单
  const onSubmit = async (values: FormValues) => {
    try {
      if (!selectedSubmission) {
        toast.error("请选择学生");
        return;
      }

      setIsLoading(true);
      
      // 准备知识点评估数据
      const knowledgePointData = knowledgePointEvaluations.map(kp => ({
        id: kp.evaluationId || kp.id, // 使用评估ID（如果存在）或知识点ID
        masteryLevel: kp.masteryLevel
      }));
      
      // 创建提交数据
      const submissionData = {
        submissionId: selectedSubmission.id,
        score: values.score,
        feedback: values.feedback || "",
        knowledgePointEvaluations: knowledgePointData
      };
      
      // 使用提供的评分提交函数或调用模拟API
      if (onGradeSubmit) {
        await onGradeSubmit(submissionData);
      } else {
        await mockApi.teacher.gradeHomework(submissionData);
      }
      
      toast({
        title: "评分成功",
        description: "学生成绩和知识点掌握情况已更新"
      });
      
      // 调用成功回调
      if (onGraded) {
        onGraded();
      }
      
      // 关闭对话框
      onOpenChange(false);
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("评分失败:", error);
      toast({
        variant: "destructive",
        title: "错误",
        description: `评分失败: ${error instanceof Error ? error.message : "未知错误"}`
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择学生" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.filter(student => !!student.value).map((student) => (
                        <SelectItem key={student.value} value={student.value}>
                          {student.label}
                        </SelectItem>
                      ))}
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