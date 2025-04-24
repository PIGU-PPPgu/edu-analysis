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
import { PlusCircle, X, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BrainCircuit, Info, PenLine, Plus, Trash2, Trophy } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { mockApi } from "@/data/mockData";

export interface TeacherGradeHomeworkDialogProps {
  homeworkId: string;
  studentId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGraded?: () => void;
  knowledgePoints: any[];
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
  studentId,
  open,
  onOpenChange,
  onGraded,
  knowledgePoints
}: TeacherGradeHomeworkDialogProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKnowledgePoints, setSelectedKnowledgePoints] = useState<string[]>([]);
  const [knowledgePointEvaluations, setKnowledgePointEvaluations] = useState<
    { id: string; name: string; masteryLevel: number }[]
  >([]);
  const { toast } = useToast();

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
        
        // 使用模拟API获取班级学生
        const submissionsData = await mockApi.teacher.getSubmissions(homeworkId);
        const studentOptions = submissionsData.map((sub: any) => ({
          value: sub.students.id,
          label: sub.students.name,
          submissionId: sub.id,
          status: sub.status
        }));
        
        setStudents(studentOptions);
        
        // 如果提供了studentId，预先选择该学生
        if (studentId) {
          const selectedStudent = studentOptions.find((s: any) => s.value === studentId);
          if (selectedStudent) {
            form.setValue('studentId', selectedStudent.value);
            
            // 如果该学生已有提交记录且已评分，预填表单
            const submission = submissionsData.find((sub: any) => sub.students.id === studentId);
            if (submission && submission.status === 'graded') {
              form.setValue('score', submission.score);
              form.setValue('feedback', submission.teacher_feedback || '');
              
              // 预填知识点评估
              if (submission.knowledge_point_evaluation && submission.knowledge_point_evaluation.length > 0) {
                const kpEvals = submission.knowledge_point_evaluation.map((kpe: any) => ({
                  id: kpe.knowledge_points.id,
                  name: kpe.knowledge_points.name,
                  masteryLevel: kpe.mastery_level
                }));
                setKnowledgePointEvaluations(kpEvals);
              }
            }
          }
        }
      } catch (error) {
        console.error("获取学生列表失败:", error);
        toast({
          variant: "destructive",
          title: "错误",
          description: "获取学生列表失败"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudents();
  }, [homeworkId, open, toast, form, studentId]);

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

  // 提交表单
  const onSubmit = async (values: FormValues) => {
    try {
      if (!selectedStudent) {
        toast.error("请选择学生");
        return;
      }

      setIsLoading(true);
      console.log("批改作业:", values);
      
      // 使用模拟API保存评分数据
      await mockApi.teacher.gradeHomework({
        submissionId: selectedStudent.submissionId,
        score: values.score,
        feedback: values.feedback,
        knowledgePointEvaluations: knowledgePointEvaluations
      });
      
      toast.success("作业批改成功");
      form.reset();
      onGraded?.();
      onOpenChange(false);
    } catch (error) {
      console.error("批改作业失败:", error);
      toast.error("批改作业失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                      {students.map((student) => (
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

            <FormField
              control={form.control}
              name="score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分数</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} max={100} {...field} />
                  </FormControl>
                  <FormDescription>满分100分</FormDescription>
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
              <div>
                <Label className="text-base">知识点评估</Label>
                <p className="text-sm text-muted-foreground">
                  选择要评估的知识点，拖动滑块设置掌握程度
                </p>
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
                  value=""
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="添加知识点" />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgePoints
                      .filter((kp) => !selectedKnowledgePoints.includes(kp.id))
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
                          {kp.masteryLevel}%
                        </span>
                      </div>
                      <Slider
                        defaultValue={[kp.masteryLevel]}
                        max={100}
                        step={1}
                        onValueChange={(values) =>
                          handleMasteryLevelChange(kp.id, values[0])
                        }
                        className={cn(
                          "w-full",
                          kp.masteryLevel >= 80
                            ? "accent-green-500"
                            : kp.masteryLevel >= 60
                            ? "accent-blue-500"
                            : kp.masteryLevel >= 40
                            ? "accent-yellow-500"
                            : "accent-red-500"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>未掌握</span>
                        <span>部分掌握</span>
                        <span>良好掌握</span>
                        <span>熟练掌握</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center border rounded-md p-6 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-6 w-6" />
                    <p className="text-sm">请添加知识点评估</p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "提交中..." : "提交批改"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 