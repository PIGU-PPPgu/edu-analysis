/**
 * 考试科目总分设置对话框
 * 用于配置每个考试中各科目的总分、及格分等设置
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, RotateCcw, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { getExamActiveSubjects } from "@/services/examService";

export interface ExamSubjectScore {
  id?: string;
  exam_id: string;
  subject_code: string;
  subject_name: string;
  total_score: number;
  passing_score: number;
  excellent_score: number;
  is_required: boolean;
  weight: number;
}

interface ExamSubjectScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  onSave: (scores: ExamSubjectScore[]) => Promise<boolean>;
  initialScores?: ExamSubjectScore[];
}

// 注意：这个默认配置已被动态获取的科目配置替代
// 保留作为最后的回退选项

const ExamSubjectScoreDialog: React.FC<ExamSubjectScoreDialogProps> = ({
  open,
  onOpenChange,
  examId,
  examTitle,
  onSave,
  initialScores = [],
}) => {
  const [scores, setScores] = useState<ExamSubjectScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<
    { code: string; name: string; configured: boolean }[]
  >([]);
  const [hasExamData, setHasExamData] = useState(false);

  // 初始化科目分数配置
  useEffect(() => {
    if (open) {
      initializeSubjects();
    }
  }, [open, examId, initialScores]);

  // 动态获取并初始化科目配置
  const initializeSubjects = async () => {
    console.log(
      `[ExamSubjectScoreDialog] 开始初始化科目配置，examId: ${examId}`
    );
    setIsLoadingSubjects(true);
    try {
      // 获取考试实际涉及的科目
      console.log(`[ExamSubjectScoreDialog] 调用 getExamActiveSubjects...`);
      const { configuredSubjects, hasData } =
        await getExamActiveSubjects(examId);
      console.log(`[ExamSubjectScoreDialog] getExamActiveSubjects 结果:`, {
        configuredSubjects,
        hasData,
      });

      setAvailableSubjects(configuredSubjects);
      setHasExamData(hasData);

      if (initialScores.length > 0) {
        // 使用已有配置，但只显示实际存在的科目
        const filteredScores = initialScores.filter((score) =>
          configuredSubjects.some(
            (subject) => subject.code === score.subject_code
          )
        );
        setScores(filteredScores);
      } else {
        // 创建基于实际科目的默认配置
        const defaultScores: ExamSubjectScore[] = configuredSubjects.map(
          (subject) => ({
            exam_id: examId,
            subject_code: subject.code,
            subject_name: subject.name,
            total_score: 100,
            passing_score: 60,
            excellent_score: 85, // 使用85%而不是90%
            is_required: true, // 既然在考试中出现，默认都是必考
            weight: 1.0,
          })
        );
        setScores(defaultScores);
      }
    } catch (error) {
      console.error("初始化科目配置失败:", error);
      toast.error("加载科目信息失败");
      // 使用基本的默认配置作为回退
      const fallbackScores: ExamSubjectScore[] = [
        {
          exam_id: examId,
          subject_code: "chinese",
          subject_name: "语文",
          total_score: 100,
          passing_score: 60,
          excellent_score: 85,
          is_required: true,
          weight: 1.0,
        },
        {
          exam_id: examId,
          subject_code: "math",
          subject_name: "数学",
          total_score: 100,
          passing_score: 60,
          excellent_score: 85,
          is_required: true,
          weight: 1.0,
        },
        {
          exam_id: examId,
          subject_code: "english",
          subject_name: "英语",
          total_score: 100,
          passing_score: 60,
          excellent_score: 85,
          is_required: true,
          weight: 1.0,
        },
      ];
      setScores(fallbackScores);
      setAvailableSubjects([
        { code: "chinese", name: "语文", configured: false },
        { code: "math", name: "数学", configured: false },
        { code: "english", name: "英语", configured: false },
      ]);
      setHasExamData(false);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // 更新单个科目配置
  const updateSubjectScore = (
    subjectCode: string,
    field: keyof ExamSubjectScore,
    value: any
  ) => {
    setScores((prev) =>
      prev.map((score) =>
        score.subject_code === subjectCode
          ? { ...score, [field]: value }
          : score
      )
    );
  };

  // 重置为默认值
  const resetToDefaults = () => {
    const defaultScores: ExamSubjectScore[] = availableSubjects.map(
      (subject) => ({
        exam_id: examId,
        subject_code: subject.code,
        subject_name: subject.name,
        total_score: 100,
        passing_score: 60,
        excellent_score: 85,
        is_required: true,
        weight: 1.0,
      })
    );
    setScores(defaultScores);
    toast.success("已重置为默认配置");
  };

  // 保存配置
  const handleSave = async () => {
    // 验证数据
    const invalidScores = scores.filter((score) => {
      return (
        score.total_score <= 0 ||
        score.passing_score < 0 ||
        score.excellent_score < 0 ||
        score.passing_score > score.total_score ||
        score.excellent_score > score.total_score
      );
    });

    if (invalidScores.length > 0) {
      toast.error("配置数据不合法，请检查总分、及格分和优秀分的设置");
      return;
    }

    setIsLoading(true);
    try {
      const success = await onSave(scores);
      if (success) {
        toast.success("科目总分配置保存成功");
        onOpenChange(false);
      } else {
        toast.error("保存失败，请重试");
      }
    } catch (error) {
      console.error("保存科目总分配置失败:", error);
      toast.error("保存失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 计算及格率预估
  const calculateEstimatedPassRate = (
    totalScore: number,
    passingScore: number
  ) => {
    const passPercentage = (passingScore / totalScore) * 100;
    return passPercentage.toFixed(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Settings className="h-5 w-5 text-[#B9FF66]" />
            考试科目总分设置
          </DialogTitle>
          <DialogDescription>
            为"{examTitle}"配置各科目的总分、及格分和优秀分标准
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* 加载提示 */}
          {isLoadingSubjects && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">正在加载科目信息...</div>
            </div>
          )}

          {!isLoadingSubjects && (
            <>
              {/* 智能提示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">智能科目识别</p>
                    <p className="text-blue-600 mt-1">
                      {hasExamData
                        ? "已根据考试实际包含的科目自动筛选显示，只显示有成绩数据的科目"
                        : "未找到成绩数据，显示默认主要科目。您可以根据实际情况调整"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    考试ID: {examId}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {scores.length} 个科目
                  </Badge>
                  {hasExamData && (
                    <Badge variant="default" className="text-sm bg-green-500">
                      基于实际数据
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefaults}
                  className="gap-1"
                >
                  <RotateCcw className="h-4 w-4" />
                  重置默认
                </Button>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* 科目配置列表 */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid gap-4">
            {scores.map((score, index) => (
              <Card
                key={score.subject_code}
                className="border-2 hover:border-gray-300 transition-colors"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <span>{score.subject_name}</span>
                      <Badge
                        variant={score.is_required ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {score.is_required ? "必考" : "选考"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      及格率预估:{" "}
                      {calculateEstimatedPassRate(
                        score.total_score,
                        score.passing_score
                      )}
                      %
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor={`total-${score.subject_code}`}
                        className="text-sm font-medium"
                      >
                        总分 <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`total-${score.subject_code}`}
                        type="number"
                        value={score.total_score}
                        onChange={(e) => {
                          const totalScore = Number(e.target.value);
                          updateSubjectScore(
                            score.subject_code,
                            "total_score",
                            totalScore
                          );
                          // 自动计算及格分和优秀分
                          updateSubjectScore(
                            score.subject_code,
                            "passing_score",
                            Math.round(totalScore * 0.6)
                          );
                          updateSubjectScore(
                            score.subject_code,
                            "excellent_score",
                            Math.round(totalScore * 0.85)
                          );
                        }}
                        min="1"
                        max="1000"
                        className="h-10 text-lg font-medium"
                        placeholder="100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">
                        自动计算及格分 (60%)
                      </Label>
                      <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md flex items-center text-gray-700 font-medium">
                        {Math.round(score.total_score * 0.6)} 分
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600">
                        自动计算优秀分 (85%)
                      </Label>
                      <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md flex items-center text-gray-700 font-medium">
                        {Math.round(score.total_score * 0.85)} 分
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-[#B9FF66] text-black hover:bg-[#A3E85A] gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? "保存中..." : "保存配置"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExamSubjectScoreDialog;
