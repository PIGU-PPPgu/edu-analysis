import React, { useState, useMemo, useRef, useEffect } from "react";
import { StudentCard } from "@/components/homework/StudentCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PenLine,
  Star,
  Save,
  X,
  Award,
  BrainCircuit,
  Sparkles,
  Check,
  Edit,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 评分等级定义
const gradeOptions = [
  { value: 55, label: "不及格", color: "bg-red-500", borderColor: "border-red-500", description: "未掌握，需要重点帮助" },
  { value: 65, label: "及格", color: "bg-yellow-500", borderColor: "border-yellow-500", description: "勉强掌握，需要努力" },
  { value: 75, label: "一般", color: "bg-orange-500", borderColor: "border-orange-500", description: "部分掌握，需要巩固" },
  { value: 85, label: "良好", color: "bg-blue-500", borderColor: "border-blue-500", description: "基本掌握，有一定理解" },
  { value: 95, label: "优秀", color: "bg-green-500", borderColor: "border-green-500", description: "完全掌握，举一反三" },
];

export type SubmissionWithStudent = {
  id: string;
  status: string;
  score?: number;
  students: {
    id: string;
    name: string;
    avatar?: string;
    class?: string;
  };
  submit_date?: string;
  teacher_feedback?: string;
  knowledge_point_evaluation?: Array<{
    id: string;
    knowledge_point_id: string;
    mastery_level: number;
    knowledge_points: {
      id: string;
      name: string;
    };
  }>;
};

type KnowledgePoint = {
  id: string;
  name: string;
  description?: string;
};

interface GradeCardViewProps {
  submissions: SubmissionWithStudent[];
  knowledgePoints: KnowledgePoint[];
  onGraded: (
    submissionId: string, 
    score: number, 
    feedback: string, 
    knowledgePointEvaluations: Array<{id: string, masteryLevel: number}>
  ) => void;
  onBatchGraded?: (
    submissionIds: string[], 
    score: number, 
    feedback: string
  ) => void;
}

export default function GradeCardView({
  submissions,
  knowledgePoints,
  onGraded,
  onBatchGraded,
}: GradeCardViewProps) {
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithStudent | null>(null);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [score, setScore] = useState(85);
  const [feedback, setFeedback] = useState("");
  const [kpEvaluations, setKpEvaluations] = useState<Array<{id: string, masteryLevel: number}>>([]);
  const [quickGradeMode, setQuickGradeMode] = useState(false);
  const [activeTab, setActiveTab] = useState("grades");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSubmissions, setSelectedSubmissions] = useState<string[]>([]);
  const [customKnowledgePoint, setCustomKnowledgePoint] = useState("");
  const [hoverSubmission, setHoverSubmission] = useState<string | null>(null);
  const [shouldAddKnowledgePoints, setShouldAddKnowledgePoints] = useState(false);
  
  // 容器引用，用于注册事件监听
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 添加对自定义事件的监听
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleOpenGradeDialogEvent = (event: CustomEvent) => {
      const { submission } = event.detail;
      if (submission) {
        handleOpenGradeDialog(submission);
      }
    };
    
    // 添加事件监听
    container.addEventListener('openGradeDialog', handleOpenGradeDialogEvent as EventListener);
    
    // 清理事件监听
    return () => {
      container.removeEventListener('openGradeDialog', handleOpenGradeDialogEvent as EventListener);
    };
  }, [submissions]); // 当submissions变化时重新注册监听
  
  // 初始化评分对话框
  const handleOpenGradeDialog = (submission: SubmissionWithStudent) => {
    setSelectedSubmission(submission);
    
    // 如果已经有评分，则加载当前评分
    if (submission.status === "graded" && submission.score) {
      setScore(submission.score);
    } else {
      setScore(85); // 默认为"良好"
    }
    
    // 加载当前反馈
    setFeedback(submission.teacher_feedback || "");
    
    // 加载知识点评估
    if (submission.knowledge_point_evaluation && submission.knowledge_point_evaluation.length > 0) {
      setKpEvaluations(
        submission.knowledge_point_evaluation.map(kp => ({
          id: kp.knowledge_point_id,
          masteryLevel: kp.mastery_level
        }))
      );
      setShouldAddKnowledgePoints(true);
    } else {
      // 清空知识点评估
      setKpEvaluations([]);
      setShouldAddKnowledgePoints(false);
    }
    
    setGradeDialogOpen(true);
  };

  // 快速评分处理
  const handleQuickGrade = (submission: SubmissionWithStudent, gradeValue: number) => {
    // 准备知识点评估数据（使用默认值或现有值）
    let evaluations = [];
    
    if (submission.knowledge_point_evaluation && submission.knowledge_point_evaluation.length > 0) {
      evaluations = submission.knowledge_point_evaluation.map(kp => ({
        id: kp.knowledge_point_id,
        masteryLevel: kp.mastery_level
      }));
    }
    
    // 根据评分自动生成反馈
    const gradeFeedback = getAutoFeedback(gradeValue);
    
    // 提交评分
    onGraded(
      submission.id,
      gradeValue,
      gradeFeedback,
      evaluations
    );
    
    // 显示成功提示
    toast({
      title: "批改成功",
      description: `已将 ${submission.students.name} 的作业评为${getGradeLabel(gradeValue)}（${gradeValue}分）`
    });
  };

  // 批量评分
  const handleBatchGrade = (gradeValue: number) => {
    if (selectedSubmissions.length === 0) {
      toast({
        title: "未选择学生",
        description: "请先选择需要批量评分的学生",
        variant: "destructive"
      });
      return;
    }
    
    // 根据评分自动生成反馈
    const gradeFeedback = getAutoFeedback(gradeValue);
    
    // 如果有批量评分回调函数
    if (onBatchGraded) {
      onBatchGraded(
        selectedSubmissions,
        gradeValue,
        gradeFeedback
      );
    } else {
      // 逐个提交评分
      selectedSubmissions.forEach(submissionId => {
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
          onGraded(
            submissionId,
            gradeValue,
            gradeFeedback,
            []  // 批量评分不处理知识点
          );
        }
      });
    }
    
    // 清空选择
    setSelectedSubmissions([]);
    
    // 显示成功提示
    toast({
      title: "批量评分成功",
      description: `已批量评分 ${selectedSubmissions.length} 名学生为${getGradeLabel(gradeValue)}（${gradeValue}分）`
    });
  };

  // 根据评分获取对应标签
  const getGradeLabel = (value: number) => {
    const option = gradeOptions.find(
      opt => value >= opt.value - 5 && value < opt.value + 5
    );
    return option ? option.label : "未评级";
  };

  // 根据评分获取对应颜色
  const getGradeColor = (value: number) => {
    const option = gradeOptions.find(
      opt => value >= opt.value - 5 && value < opt.value + 5
    );
    return option ? option.color : "";
  };

  // 根据评分获取边框颜色
  const getGradeBorderColor = (value: number) => {
    const option = gradeOptions.find(
      opt => value >= opt.value - 5 && value < opt.value + 5
    );
    return option ? option.borderColor : "";
  };

  // 自动生成反馈文本
  const getAutoFeedback = (value: number) => {
    const templates = [
      "作业完成度高，思路清晰，概念理解准确。知识点掌握很好，逻辑性强，值得表扬！",
      "知识点掌握良好，书写整洁，有些小细节可以进一步完善。总体表现不错！",
      "基本理解了知识点，但还需要多练习巩固。书写较为整洁，但解题思路需要进一步梳理。",
      "作业有一定完成度，但概念理解不够清晰，需要加强基础知识学习。建议多做习题。",
      "作业完成度不高，基础知识薄弱，建议重新复习相关章节，并做好笔记。需要加强练习。"
    ];
    
    let index = 0;
    if (value >= 90) index = 0;
    else if (value >= 80) index = 1;
    else if (value >= 70) index = 2;
    else if (value >= 60) index = 3;
    else index = 4;
    
    return templates[index];
  };

  // 提交评分
  const handleSubmitGrade = () => {
    if (!selectedSubmission) return;
    
    // 确定提交哪些知识点评估
    const evaluationsToSubmit = shouldAddKnowledgePoints ? kpEvaluations : [];
    
    onGraded(
      selectedSubmission.id,
      score,
      feedback,
      evaluationsToSubmit
    );
    
    setGradeDialogOpen(false);
    
    // 显示成功提示
    toast({
      title: "批改成功",
      description: `已将 ${selectedSubmission.students.name} 的作业评为${getGradeLabel(score)}（${score}分）`
    });
  };

  // 更新知识点掌握度
  const handleMasteryChange = (id: string, value: number) => {
    setKpEvaluations(prev => 
      prev.map(kp => 
        kp.id === id ? { ...kp, masteryLevel: value } : kp
      )
    );
  };

  // 添加自定义知识点
  const handleAddCustomKnowledgePoint = () => {
    if (!customKnowledgePoint.trim()) return;
    
    // 创建一个唯一ID
    const customId = `custom-${Date.now()}`;
    
    const newKp = {
      id: customId,
      masteryLevel: 70
    };
    
    setKpEvaluations(prev => [...prev, newKp]);
    setCustomKnowledgePoint("");
    
    toast({
      title: "添加成功",
      description: `已添加自定义知识点: ${customKnowledgePoint}`
    });
  };

  // 移除知识点评估
  const handleRemoveKnowledgePoint = (id: string) => {
    setKpEvaluations(prev => prev.filter(kp => kp.id !== id));
  };

  // 切换选择学生
  const toggleSelectSubmission = (submissionId: string) => {
    setSelectedSubmissions(prev => {
      if (prev.includes(submissionId)) {
        return prev.filter(id => id !== submissionId);
      } else {
        return [...prev, submissionId];
      }
    });
  };

  // 选择所有学生
  const selectAllSubmissions = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissions.map(s => s.id));
    }
  };

  // 处理卡片鼠标悬停，显示快速评分选项
  const handleCardMouseEnter = (submissionId: string) => {
    if (!quickGradeMode) return;
    setHoverSubmission(submissionId);
  };

  // 处理卡片鼠标离开
  const handleCardMouseLeave = () => {
    setHoverSubmission(null);
  };

  // 获取知识点名称
  const getKnowledgePointName = (id: string) => {
    // 查找是否是预定义知识点
    const kp = knowledgePoints.find(k => k.id === id);
    if (kp) return kp.name;
    
    // 查找是否是自定义知识点
    if (id.startsWith('custom-')) {
      const evaluation = kpEvaluations.find(e => e.id === id);
      if (evaluation) return `自定义: ${evaluation.id.replace('custom-', '')}`;
    }
    
    return "未知知识点";
  };

  return (
    <div className="space-y-6" ref={containerRef} data-grade-card-view>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-medium">学生作业批改</h3>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">快速评分模式</span>
            <button
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                quickGradeMode ? "bg-primary" : "bg-muted"
              )}
              onClick={() => setQuickGradeMode(!quickGradeMode)}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                  quickGradeMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">批量模式</span>
            <button
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                batchMode ? "bg-primary" : "bg-muted"
              )}
              onClick={() => setBatchMode(!batchMode)}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white transition-transform",
                  batchMode ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>
        
        {batchMode && (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAllSubmissions}
            >
              {selectedSubmissions.length === submissions.length ? "取消全选" : "全选"}
            </Button>
            <span className="text-sm text-muted-foreground">
              已选择 {selectedSubmissions.length} 名学生
            </span>
          </div>
        )}
      </div>
      
      {batchMode && selectedSubmissions.length > 0 && (
        <div className="bg-muted p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">批量评分</h4>
            <div className="flex gap-1">
              {gradeOptions.map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  className={cn("text-white", option.color)}
                  onClick={() => handleBatchGrade(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {submissions.map((submission) => (
          <div 
            key={submission.id} 
            className={cn(
              "relative",
              submission.status === "graded" && submission.score && getGradeBorderColor(submission.score)
            )}
            onMouseEnter={() => handleCardMouseEnter(submission.id)}
            onMouseLeave={handleCardMouseLeave}
          >
            {batchMode && (
              <div className="absolute -top-2 -left-2 z-10">
                <Checkbox
                  checked={selectedSubmissions.includes(submission.id)}
                  onCheckedChange={() => toggleSelectSubmission(submission.id)}
                  className="h-5 w-5 bg-white border-gray-300 rounded-full"
                />
              </div>
            )}
            
            {submission.status === "graded" && submission.score && (
              <div 
                className={cn(
                  "absolute -top-2 -right-2 z-10 rounded-full w-8 h-8 flex items-center justify-center text-xs font-medium text-white shadow-md",
                  getGradeColor(submission.score)
                )}
              >
                {submission.score}
              </div>
            )}
            
            {/* 学生卡片组件，添加顶部边框颜色 */}
            <div className={cn(
              "overflow-hidden",
              submission.status === "graded" && submission.score && 
              `border-t-4 rounded-t-md ${getGradeBorderColor(submission.score)}`
            )}>
              <StudentCard
                student={submission.students}
                status={submission.status as any}
                score={submission.score}
                onClick={() => {
                  if (batchMode) {
                    toggleSelectSubmission(submission.id);
                  } else if (!quickGradeMode) {
                    handleOpenGradeDialog(submission);
                  }
                }}
              />
            </div>
            
            {/* 快速评分悬浮层 */}
            {quickGradeMode && hoverSubmission === submission.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-md z-10">
                <div className="bg-white p-2 rounded-md shadow-lg">
                  <div className="text-center mb-2 text-xs font-medium">
                    <Badge variant="secondary" className="mb-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      一键评分
                    </Badge>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {gradeOptions.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        className={cn("text-white", option.color)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickGrade(submission, option.value);
                        }}
                        title={`${option.label}: ${option.description}`}
                      >
                        {option.value}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* 评分对话框 */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <PenLine className="h-5 w-5 mr-2" />
              快速批改学生作业
            </DialogTitle>
          </DialogHeader>
          
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="px-2 py-1">
                    学生: {selectedSubmission.students.name}
                  </Badge>
                  {selectedSubmission.submit_date && (
                    <Badge variant="outline" className="px-2 py-1">
                      提交日期: {selectedSubmission.submit_date}
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="px-2 py-1">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  快速模式
                </Badge>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="grades">
                    <Star className="h-4 w-4 mr-2" />
                    评分
                  </TabsTrigger>
                  <TabsTrigger value="kp">
                    <BrainCircuit className="h-4 w-4 mr-2" />
                    知识点评估
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="grades" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>分数评定</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score}
                            onChange={(e) => setScore(Number(e.target.value))}
                            className="w-16 text-center"
                          />
                          <Badge>
                            {getGradeLabel(score)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="pt-4 pb-2">
                        <div className="flex justify-between mb-2">
                          {gradeOptions.map(option => (
                            <div 
                              key={option.value}
                              className="flex flex-col items-center"
                            >
                              <Badge 
                                className={cn(
                                  "cursor-pointer",
                                  score >= option.value - 5 && score < option.value + 5
                                    ? option.color + " text-white"
                                    : "bg-muted"
                                )}
                                onClick={() => setScore(option.value)}
                              >
                                {option.label}
                              </Badge>
                              <span className="text-xs text-center mt-1">{option.value}</span>
                            </div>
                          ))}
                        </div>
                        <Slider
                          value={[score]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([value]) => setScore(value)}
                          className="mt-6"
                        />
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>不及格</span>
                          <span>及格</span>
                          <span>一般</span>
                          <span>良好</span>
                          <span>优秀</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>教师反馈</Label>
                      <Textarea
                        placeholder="请输入对该学生作业的评语和建议..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => setFeedback(prev => prev + "概念理解准确，答案完整。")}
                        >
                          概念理解准确
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => setFeedback(prev => prev + "书写工整，条理清晰。")}
                        >
                          书写工整
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => setFeedback(prev => prev + "计算过程规范。")}
                        >
                          计算规范
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => setFeedback(prev => prev + "需要加强基础知识。")}
                        >
                          加强基础
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer"
                          onClick={() => setFeedback(prev => prev + "思路不够清晰，需要多加练习。")}
                        >
                          思路不清
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="kp" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="add-knowledge-points"
                        checked={shouldAddKnowledgePoints}
                        onCheckedChange={(checked) => {
                          setShouldAddKnowledgePoints(!!checked);
                          if (checked && kpEvaluations.length === 0) {
                            // 默认添加所有知识点，初始掌握度为70%
                            setKpEvaluations(
                              knowledgePoints.map(kp => ({
                                id: kp.id,
                                masteryLevel: 70
                              }))
                            );
                          }
                        }}
                      />
                      <Label htmlFor="add-knowledge-points">添加知识点评估</Label>
                    </div>
                    
                    {shouldAddKnowledgePoints && (
                      <>
                        <div className="flex justify-between items-center">
                          <Label>知识点掌握度评估</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={customKnowledgePoint}
                              onChange={(e) => setCustomKnowledgePoint(e.target.value)}
                              placeholder="添加自定义知识点..."
                              className="w-48"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleAddCustomKnowledgePoint}
                              disabled={!customKnowledgePoint.trim()}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              添加
                            </Button>
                          </div>
                        </div>
                        
                        {kpEvaluations.length > 0 ? (
                          <div className="space-y-4 mt-4">
                            {kpEvaluations.map(evaluation => (
                              <div key={evaluation.id} className="space-y-2 border p-3 rounded-md">
                                <div className="flex justify-between items-center">
                                  <Label className="text-sm font-medium flex items-center gap-1">
                                    <BrainCircuit className="h-3 w-3" />
                                    {getKnowledgePointName(evaluation.id)}
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      className={cn(
                                        evaluation.masteryLevel >= 90
                                          ? "bg-green-500 text-white"
                                          : evaluation.masteryLevel >= 80
                                          ? "bg-blue-500 text-white"
                                          : evaluation.masteryLevel >= 70
                                          ? "bg-orange-500 text-white"
                                          : evaluation.masteryLevel >= 60
                                          ? "bg-yellow-500 text-white"
                                          : "bg-red-500 text-white"
                                      )}
                                    >
                                      {evaluation.masteryLevel}%
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveKnowledgePoint(evaluation.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">不熟悉</span>
                                  <Slider
                                    value={[evaluation.masteryLevel]}
                                    min={0}
                                    max={100}
                                    step={5}
                                    onValueChange={([value]) => 
                                      handleMasteryChange(evaluation.id, value)
                                    }
                                    className="flex-1"
                                  />
                                  <span className="text-xs">精通</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground">没有关联的知识点，请添加</p>
                          </div>
                        )}

                        <div className="mt-2">
                          <h4 className="text-sm font-medium mb-2">可添加的知识点：</h4>
                          <div className="flex flex-wrap gap-2">
                            {knowledgePoints.map(kp => {
                              const isAdded = kpEvaluations.some(e => e.id === kp.id);
                              return (
                                <Badge
                                  key={kp.id}
                                  variant={isAdded ? "secondary" : "outline"}
                                  className={cn(
                                    "cursor-pointer",
                                    isAdded ? "opacity-50" : "hover:bg-secondary"
                                  )}
                                  onClick={() => {
                                    if (!isAdded) {
                                      setKpEvaluations(prev => [...prev, { id: kp.id, masteryLevel: 70 }]);
                                    }
                                  }}
                                >
                                  {!isAdded && <Plus className="h-3 w-3 mr-1" />}
                                  {kp.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              取消
            </Button>
            <Button onClick={handleSubmitGrade}>
              <Save className="h-4 w-4 mr-2" />
              保存评分
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 根据分数获取颜色
function getScoreColor(score: number) {
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 70) return "bg-orange-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
} 