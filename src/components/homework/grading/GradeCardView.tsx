import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentCard, StudentCardGrid, SubmissionStatus } from "../StudentCard";
import { useToast } from "@/components/ui/use-toast";

// 定义评分选项，包含评级、分数范围、标签、颜色和反馈模板
const gradingOptions = [
  {
    label: "优秀",
    value: "excellent",
    range: [90, 100],
    color: "bg-green-500",
    description: "表现出色，完全掌握知识点",
    feedbackTemplate: "非常出色的作业！你展示了对所有知识点的深刻理解和应用能力。继续保持这样的水平！"
  },
  {
    label: "良好",
    value: "good",
    range: [80, 89],
    color: "bg-blue-500",
    description: "表现良好，基本掌握知识点",
    feedbackTemplate: "这是一份良好的作业，你已经掌握了大部分知识点。继续努力，有几个小细节还可以改进。"
  },
  {
    label: "中等",
    value: "average",
    range: [70, 79],
    color: "bg-yellow-500", 
    description: "基本达标，部分掌握知识点",
    feedbackTemplate: "你的作业达到了基本要求，但还有一些知识点需要加强理解和练习。"
  },
  {
    label: "及格",
    value: "pass",
    range: [60, 69],
    color: "bg-orange-500",
    description: "刚刚及格，知识点掌握不足",
    feedbackTemplate: "你的作业刚刚达到及格标准，但显示出对一些关键知识点的理解不足。建议重新复习这些内容。"
  },
  {
    label: "不及格",
    value: "fail",
    range: [0, 59],
    color: "bg-red-500",
    description: "未达及格标准，需重新学习",
    feedbackTemplate: "这次作业未能达到及格标准。你需要重新学习相关知识点，并寻求额外的帮助和指导。"
  }
];

// 定义组件属性
export interface SubmissionWithStudent {
  id: string;
  student_id: string;
  homework_id: string;
  status: string;
  submit_date?: string;
  score?: number;
  teacher_feedback?: string;
  knowledge_point_evaluation?: Array<{
    id: string;
    knowledge_point_id: string;
    mastery_level: number;
    knowledge_points: {
      id: string;
      name: string;
    }
  }>;
  students: {
    id: string;
    name: string;
    avatar?: string;
    class?: string;
  }
}

interface GradeCardViewProps {
  submissions: SubmissionWithStudent[];
  knowledgePoints: Array<{
    id: string;
    name: string;
  }>;
  onGraded: () => void;
}

// 定义组件
const GradeCardView = forwardRef<any, GradeCardViewProps>(
  ({ submissions, knowledgePoints, onGraded }, ref) => {
    const { toast } = useToast();
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithStudent | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [score, setScore] = useState<number>(0);
    const [feedback, setFeedback] = useState("");
    const [quickGradeMode, setQuickGradeMode] = useState(false);
    const [batchSelection, setBatchSelection] = useState<Set<string>>(new Set());
    const [knowledgePointEvaluations, setKnowledgePointEvaluations] = useState<Array<{
      knowledge_point_id: string;
      mastery_level: number;
    }>>([]);

    // 用于向父组件暴露方法
    useImperativeHandle(ref, () => ({
      handleOpenGradeDialog: (submission: SubmissionWithStudent) => {
        handleGradeDialogOpen(submission);
      }
    }));

    // 打开批改对话框
    const handleGradeDialogOpen = (submission: SubmissionWithStudent) => {
      setSelectedSubmission(submission);
      setScore(submission.score || 0);
      setFeedback(submission.teacher_feedback || "");
      
      // 初始化知识点评估数据
      const initialEvaluations = knowledgePoints.map(kp => {
        // 查找现有评估
        const existingEval = submission.knowledge_point_evaluation?.find(
          evaluation => evaluation.knowledge_point_id === kp.id
        );
        
        return {
          knowledge_point_id: kp.id,
          mastery_level: existingEval?.mastery_level || 50, // 默认50%掌握度
        };
      });
      
      setKnowledgePointEvaluations(initialEvaluations);
      setDialogOpen(true);
    };

    // 处理快速评分
    const handleQuickGrade = (submissionId: string, grade: typeof gradingOptions[0]) => {
      if (!quickGradeMode) return;
      
      // 示例实现 - 实际应用中需要连接到API
      toast({
        title: "已快速评分",
        description: `评分: ${grade.label} (${grade.range[0]}-${grade.range[1]}分)`
      });
      
      // 在实际应用中，这里需要调用API保存评分
      setTimeout(() => {
        onGraded();
      }, 500);
    };

    // 处理批量评分选择
    const toggleBatchSelection = (submissionId: string) => {
      const newSelection = new Set(batchSelection);
      if (newSelection.has(submissionId)) {
        newSelection.delete(submissionId);
      } else {
        newSelection.add(submissionId);
      }
      setBatchSelection(newSelection);
    };

    // 提交评分
    const handleSubmitGrade = async () => {
      if (!selectedSubmission) return;
      
      try {
        // 实际应用中，这里需要调用API保存评分和知识点评估
        console.log("提交评分:", {
          submissionId: selectedSubmission.id,
          score,
          feedback,
          knowledgePointEvaluations
        });
        
        // 模拟API调用成功
        setTimeout(() => {
          setDialogOpen(false);
          toast({
            title: "评分成功",
            description: `已为${selectedSubmission.students.name}批改完成`
          });
          onGraded();
        }, 500);
      } catch (error) {
        console.error("提交评分失败:", error);
        toast({
          variant: "destructive",
          title: "评分失败",
          description: "提交评分时发生错误，请重试"
        });
      }
    };

    // 更新知识点掌握度
    const handleMasteryLevelChange = (index: number, value: number[]) => {
      const newEvaluations = [...knowledgePointEvaluations];
      newEvaluations[index] = {
        ...newEvaluations[index],
        mastery_level: value[0]
      };
      setKnowledgePointEvaluations(newEvaluations);
    };

    // 根据分数获取对应的评分选项
    const getGradeOptionByScore = (score: number) => {
      return gradingOptions.find(option => 
        score >= option.range[0] && score <= option.range[1]
      ) || gradingOptions[0];
    };

    // 应用评分模板
    const applyFeedbackTemplate = (option: typeof gradingOptions[0]) => {
      setFeedback(option.feedbackTemplate);
    };

    // 将服务器状态映射到组件使用的状态
    const mapSubmissionStatus = (status: string): SubmissionStatus => {
      switch (status) {
        case "graded": return "graded";
        case "submitted": return "submitted";
        case "late": return "late";
        case "pending": return "pending";
        case "missing": return "not_submitted";
        default: return "not_submitted";
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant={quickGradeMode ? "default" : "outline"}
              size="sm"
              onClick={() => setQuickGradeMode(!quickGradeMode)}
            >
              {quickGradeMode ? "退出快速批改" : "快速批改模式"}
            </Button>
            {batchSelection.size > 0 && (
              <span className="text-sm text-muted-foreground">
                已选择 {batchSelection.size} 名学生
              </span>
            )}
          </div>
          
          {batchSelection.size > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setBatchSelection(new Set())}>
                取消选择
              </Button>
              <Button size="sm">
                批量批改
              </Button>
            </div>
          )}
        </div>

        <StudentCardGrid>
          {submissions.map((submission) => (
            <div key={submission.id} className="relative">
              {quickGradeMode && (
                <div className="absolute top-2 right-2 z-10">
                  <input 
                    type="checkbox"
                    checked={batchSelection.has(submission.id)}
                    onChange={() => toggleBatchSelection(submission.id)}
                    className="h-4 w-4"
                  />
                </div>
              )}
              <StudentCard
                student={{
                  id: submission.students.id,
                  name: submission.students.name,
                  avatar: submission.students.avatar,
                  class: submission.students.class,
                }}
                submissionStatus={mapSubmissionStatus(submission.status)}
                score={submission.score}
                onClick={() => {
                  if (quickGradeMode) {
                    toggleBatchSelection(submission.id);
                  } else {
                    handleGradeDialogOpen(submission);
                  }
                }}
              >
                {quickGradeMode && (
                  <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm rounded-b-md p-2">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {gradingOptions.map((grade) => (
                        <Badge
                          key={grade.value}
                          className={`cursor-pointer ${grade.color} text-white`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickGrade(submission.id, grade);
                          }}
                        >
                          {grade.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </StudentCard>
            </div>
          ))}
        </StudentCardGrid>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                批改学生作业: {selectedSubmission?.students.name}
              </DialogTitle>
              <DialogDescription>
                为学生作业评分并提供反馈，同时评估知识点掌握情况
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="score">分数</Label>
                    <span className="text-2xl font-bold">{score}</span>
                  </div>
                  <Slider
                    id="score"
                    defaultValue={[selectedSubmission?.score || 0]}
                    max={100}
                    step={1}
                    value={[score]}
                    onValueChange={(value) => setScore(value[0])}
                    className="mb-6"
                  />
                  
                  {/* 快速评分标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {gradingOptions.map((grade) => (
                      <Badge
                        key={grade.value}
                        className={`cursor-pointer ${
                          score >= grade.range[0] && score <= grade.range[1]
                            ? grade.color
                            : "bg-gray-200 text-gray-800"
                        } hover:${grade.color} transition-colors`}
                        onClick={() => {
                          // 设置该评分等级的平均分
                          const avgScore = Math.floor(
                            (grade.range[0] + grade.range[1]) / 2
                          );
                          setScore(avgScore);
                          applyFeedbackTemplate(grade);
                        }}
                      >
                        {grade.label} ({grade.range[0]}-{grade.range[1]})
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">教师反馈</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="为学生提供反馈..."
                    className="min-h-[150px]"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">知识点掌握情况评估</Label>
                <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
                  {knowledgePointEvaluations.map((evaluation, index) => {
                    const kp = knowledgePoints.find(
                      k => k.id === evaluation.knowledge_point_id
                    );
                    return (
                      <div key={evaluation.knowledge_point_id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>
                            {kp?.name || "未知知识点"}
                          </Label>
                          <span className="text-sm font-medium">
                            {evaluation.mastery_level}%
                          </span>
                        </div>
                        <Slider
                          defaultValue={[evaluation.mastery_level]}
                          max={100}
                          step={5}
                          value={[evaluation.mastery_level]}
                          onValueChange={(value) =>
                            handleMasteryLevelChange(index, value)
                          }
                        />
                      </div>
                    );
                  })}

                  {knowledgePointEvaluations.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      没有可评估的知识点
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center">
              <div>
                <span className="text-sm text-muted-foreground mr-2">
                  当前评级:
                </span>
                <Badge className={getGradeOptionByScore(score).color}>
                  {getGradeOptionByScore(score).label}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmitGrade}>保存评分</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

// 命名组件，便于开发者工具中识别
GradeCardView.displayName = "GradeCardView";

export default GradeCardView; 