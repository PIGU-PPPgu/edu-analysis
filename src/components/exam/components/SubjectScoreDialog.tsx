/**
 * 科目分数配置对话框组件
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  BookOpen,
  Calculator,
  Target,
  Info,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Exam, ExamSubjectScore } from "../types";

interface SubjectScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: Exam | null;
  currentScores: ExamSubjectScore[];
  availableSubjects: Array<{ code: string; name: string; configured: boolean }>;
  onSave: (scores: ExamSubjectScore[]) => void;
  isLoading?: boolean;
}

interface SubjectScoreConfig {
  subject_code: string;
  subject_name: string;
  total_score: number;
  passing_score: number;
  excellent_score: number;
}

export const SubjectScoreDialog: React.FC<SubjectScoreDialogProps> = ({
  open,
  onOpenChange,
  exam,
  currentScores,
  availableSubjects,
  onSave,
  isLoading = false,
}) => {
  const [scores, setScores] = useState<SubjectScoreConfig[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 初始化分数配置
  useEffect(() => {
    if (open && exam && availableSubjects) {
      const initialScores = availableSubjects.map((subject) => {
        const existingScore = currentScores.find(
          (s) => s.subject_code === subject.code
        );
        return {
          subject_code: subject.code,
          subject_name: subject.name,
          total_score: existingScore?.total_score || 100,
          passing_score: existingScore?.passing_score || 60,
          excellent_score: existingScore?.excellent_score || 90,
        };
      });
      setScores(initialScores);
      setErrors({});
    }
  }, [open, exam, currentScores, availableSubjects]);

  // 验证分数配置
  const validateScores = (): boolean => {
    const newErrors: Record<string, string> = {};

    scores.forEach((score, index) => {
      const key = `${score.subject_code}`;

      if (score.total_score <= 0) {
        newErrors[`${key}_total`] = "总分必须大于0";
      }

      if (score.passing_score < 0 || score.passing_score > score.total_score) {
        newErrors[`${key}_passing`] = "及格分必须在0到总分之间";
      }

      if (
        score.excellent_score < score.passing_score ||
        score.excellent_score > score.total_score
      ) {
        newErrors[`${key}_excellent`] = "优秀分必须在及格分到总分之间";
      }
    });

    // 检查总分是否超过考试总分
    const totalExamScore = scores.reduce(
      (sum, score) => sum + score.total_score,
      0
    );
    const examTotalScore = exam?.total_score || 100;

    if (totalExamScore !== examTotalScore) {
      newErrors.total = `各科目总分之和(${totalExamScore})应等于考试总分(${examTotalScore})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 更新科目分数
  const updateSubjectScore = (
    subjectCode: string,
    field: keyof SubjectScoreConfig,
    value: number
  ) => {
    setScores((prev) =>
      prev.map((score) =>
        score.subject_code === subjectCode
          ? { ...score, [field]: value }
          : score
      )
    );

    // 清除相关错误
    const errorKey = `${subjectCode}_${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    // 清除总分错误
    if (errors.total) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.total;
        return newErrors;
      });
    }
  };

  // 自动调整分数比例
  const autoAdjustScores = () => {
    if (!exam || scores.length === 0) return;

    const examTotalScore = exam.total_score || 100;
    const averageScore = Math.round(examTotalScore / scores.length);
    const remainder = examTotalScore % scores.length;

    const adjustedScores = scores.map((score, index) => ({
      ...score,
      total_score: index < remainder ? averageScore + 1 : averageScore,
      passing_score: Math.round(
        (index < remainder ? averageScore + 1 : averageScore) * 0.6
      ),
      excellent_score: Math.round(
        (index < remainder ? averageScore + 1 : averageScore) * 0.9
      ),
    }));

    setScores(adjustedScores);
  };

  // 处理保存
  const handleSave = () => {
    if (validateScores()) {
      const examSubjectScores: ExamSubjectScore[] = scores.map((score) => ({
        exam_id: exam!.id,
        subject_code: score.subject_code,
        subject_name: score.subject_name,
        total_score: score.total_score,
        passing_score: score.passing_score,
        excellent_score: score.excellent_score,
      }));
      onSave(examSubjectScores);
    }
  };

  const totalConfiguredScore = scores.reduce(
    (sum, score) => sum + score.total_score,
    0
  );
  const examTotalScore = exam?.total_score || 100;
  const scoreBalanced = totalConfiguredScore === examTotalScore;

  if (!exam) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            科目分数配置
          </DialogTitle>
          <DialogDescription>
            为考试 "{exam.title}" 配置各科目的分数设置，包括总分、及格分和优秀分
          </DialogDescription>
        </DialogHeader>

        {/* 考试信息概览 */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              考试信息
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">考试名称:</span>
                <div className="font-medium">{exam.title}</div>
              </div>
              <div>
                <span className="text-gray-600">考试日期:</span>
                <div className="font-medium">{exam.date}</div>
              </div>
              <div>
                <span className="text-gray-600">考试总分:</span>
                <div className="font-medium text-blue-600">
                  {examTotalScore} 分
                </div>
              </div>
              <div>
                <span className="text-gray-600">科目数量:</span>
                <div className="font-medium">{scores.length} 门</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 分数平衡提示 */}
        <div
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg text-sm mb-4",
            scoreBalanced
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-yellow-50 text-yellow-800 border border-yellow-200"
          )}
        >
          {scoreBalanced ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>
            各科目总分之和: <strong>{totalConfiguredScore}</strong> 分
            {scoreBalanced ? (
              <span className="text-green-600"> ✓ 与考试总分匹配</span>
            ) : (
              <span className="text-yellow-600">
                {totalConfiguredScore > examTotalScore
                  ? " ⚠️ 超出考试总分"
                  : " ⚠️ 少于考试总分"}
                {examTotalScore} 分
              </span>
            )}
          </span>
        </div>

        {errors.total && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
            {errors.total}
          </div>
        )}

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-4">
            {scores.map((score, index) => (
              <Card
                key={score.subject_code}
                className="border-l-4 border-l-blue-500"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      {score.subject_name}
                    </CardTitle>
                    <Badge variant="outline">{score.subject_code}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 总分 */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`total-${score.subject_code}`}
                        className="flex items-center gap-2"
                      >
                        <Calculator className="h-3 w-3" />
                        总分
                      </Label>
                      <Input
                        id={`total-${score.subject_code}`}
                        type="number"
                        min="1"
                        value={score.total_score}
                        onChange={(e) =>
                          updateSubjectScore(
                            score.subject_code,
                            "total_score",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className={cn(
                          errors[`${score.subject_code}_total`] &&
                            "border-red-500"
                        )}
                      />
                      {errors[`${score.subject_code}_total`] && (
                        <p className="text-xs text-red-500">
                          {errors[`${score.subject_code}_total`]}
                        </p>
                      )}
                    </div>

                    {/* 及格分 */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`passing-${score.subject_code}`}
                        className="flex items-center gap-2"
                      >
                        <Target className="h-3 w-3" />
                        及格分
                      </Label>
                      <Input
                        id={`passing-${score.subject_code}`}
                        type="number"
                        min="0"
                        max={score.total_score}
                        value={score.passing_score}
                        onChange={(e) =>
                          updateSubjectScore(
                            score.subject_code,
                            "passing_score",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className={cn(
                          errors[`${score.subject_code}_passing`] &&
                            "border-red-500"
                        )}
                      />
                      {errors[`${score.subject_code}_passing`] && (
                        <p className="text-xs text-red-500">
                          {errors[`${score.subject_code}_passing`]}
                        </p>
                      )}
                    </div>

                    {/* 优秀分 */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`excellent-${score.subject_code}`}
                        className="flex items-center gap-2"
                      >
                        <Target className="h-3 w-3" />
                        优秀分
                      </Label>
                      <Input
                        id={`excellent-${score.subject_code}`}
                        type="number"
                        min={score.passing_score}
                        max={score.total_score}
                        value={score.excellent_score}
                        onChange={(e) =>
                          updateSubjectScore(
                            score.subject_code,
                            "excellent_score",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className={cn(
                          errors[`${score.subject_code}_excellent`] &&
                            "border-red-500"
                        )}
                      />
                      {errors[`${score.subject_code}_excellent`] && (
                        <p className="text-xs text-red-500">
                          {errors[`${score.subject_code}_excellent`]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 分数比例显示 */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>
                        及格率:{" "}
                        {Math.round(
                          (score.passing_score / score.total_score) * 100
                        )}
                        %
                      </span>
                      <span>
                        优秀率:{" "}
                        {Math.round(
                          (score.excellent_score / score.total_score) * 100
                        )}
                        %
                      </span>
                      <span>
                        占总分:{" "}
                        {Math.round((score.total_score / examTotalScore) * 100)}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* 快速操作提示 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">分数配置建议:</p>
              <ul className="space-y-1 text-xs">
                <li>• 各科目总分之和应等于考试总分 ({examTotalScore} 分)</li>
                <li>• 及格分建议设为总分的60%-70%</li>
                <li>• 优秀分建议设为总分的85%-95%</li>
                <li>• 可使用"自动平分"快速分配分数</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between pt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={autoAdjustScores}
              disabled={isLoading}
            >
              <Calculator className="h-4 w-4 mr-2" />
              自动平分
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !scoreBalanced}>
              {isLoading ? "保存中..." : "保存配置"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
