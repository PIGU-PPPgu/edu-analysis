/**
 * 考试选择器组件
 * 用于选择基准考试和目标考试，并设置对比范围
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  TrendingUp,
  Users,
  School,
  AlertTriangle,
} from "lucide-react";
import type {
  ExamInfo,
  ExamSelectionState,
  ComparisonScope,
} from "@/types/valueAddedTypes";

interface ExamSelectorProps {
  examList: ExamInfo[];
  selection: ExamSelectionState;
  onSelectionChange: (selection: ExamSelectionState) => void;
  onCalculate: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const ExamSelector: React.FC<ExamSelectorProps> = ({
  examList,
  selection,
  onSelectionChange,
  onCalculate,
  loading = false,
  disabled = false,
}) => {
  const handleBaselineChange = (examId: string) => {
    onSelectionChange({
      ...selection,
      baselineExamId: examId,
    });
  };

  const handleTargetChange = (examId: string) => {
    onSelectionChange({
      ...selection,
      targetExamId: examId,
    });
  };

  const handleScopeChange = (scope: string) => {
    onSelectionChange({
      ...selection,
      comparisonScope: scope as ComparisonScope,
    });
  };

  // 检查是否可以开始分析
  const canAnalyze =
    selection.baselineExamId &&
    selection.targetExamId &&
    selection.baselineExamId !== selection.targetExamId &&
    !disabled;

  // 获取选中考试的信息
  const baselineExam = examList.find((e) => e.id === selection.baselineExamId);
  const targetExam = examList.find((e) => e.id === selection.targetExamId);

  // 对比范围图标
  const scopeIcons = {
    class: Users,
    grade: School,
    school: TrendingUp,
  };

  const ScopeIcon = scopeIcons[selection.comparisonScope];

  return (
    <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-200">
      <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
        <CardTitle className="text-black font-black flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          选择对比考试
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基准考试选择 */}
          <div className="space-y-2">
            <Label className="text-base font-bold flex items-center gap-2">
              <span className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                起点
              </span>
              基准考试
            </Label>
            <Select
              value={selection.baselineExamId || ""}
              onValueChange={handleBaselineChange}
              disabled={disabled || loading}
            >
              <SelectTrigger className="border-2 border-black">
                <SelectValue placeholder="选择基准考试（起点）" />
              </SelectTrigger>
              <SelectContent>
                {examList.map((exam) => (
                  <SelectItem
                    key={exam.id}
                    value={exam.id}
                    disabled={exam.id === selection.targetExamId}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{exam.title}</span>
                      <span className="text-xs text-gray-500">
                        {exam.date} · {exam.type}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {baselineExam && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                {baselineExam.date} · {baselineExam.type}
              </div>
            )}
          </div>

          {/* 目标考试选择 */}
          <div className="space-y-2">
            <Label className="text-base font-bold flex items-center gap-2">
              <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">
                终点
              </span>
              目标考试
            </Label>
            <Select
              value={selection.targetExamId || ""}
              onValueChange={handleTargetChange}
              disabled={disabled || loading}
            >
              <SelectTrigger className="border-2 border-black">
                <SelectValue placeholder="选择目标考试（终点）" />
              </SelectTrigger>
              <SelectContent>
                {examList.map((exam) => (
                  <SelectItem
                    key={exam.id}
                    value={exam.id}
                    disabled={exam.id === selection.baselineExamId}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{exam.title}</span>
                      <span className="text-xs text-gray-500">
                        {exam.date} · {exam.type}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetExam && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                {targetExam.date} · {targetExam.type}
              </div>
            )}
          </div>
        </div>

        {/* 对比范围选择 */}
        <div className="space-y-2">
          <Label className="text-base font-bold">对比范围</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                value: "class",
                label: "本班级",
                icon: Users,
                desc: "仅本班学生",
              },
              {
                value: "grade",
                label: "同年级",
                icon: School,
                desc: "同年级所有班级",
              },
              {
                value: "school",
                label: "全校",
                icon: TrendingUp,
                desc: "全校所有学生",
              },
            ].map((option) => {
              const Icon = option.icon;
              const isSelected = selection.comparisonScope === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleScopeChange(option.value)}
                  disabled={disabled || loading}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-lg border-2
                    transition-all duration-200
                    ${
                      isSelected
                        ? "bg-[#B9FF66] border-black shadow-[3px_3px_0px_0px_#000] font-bold"
                        : "bg-white border-gray-300 hover:border-gray-400"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <Icon
                    className={`w-6 h-6 ${isSelected ? "text-black" : "text-gray-600"}`}
                  />
                  <div className="text-center">
                    <div className="text-sm">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 开始分析按钮 */}
        <Button
          onClick={onCalculate}
          disabled={!canAnalyze || loading}
          className="w-full h-12 text-lg font-black bg-[#B9FF66] hover:bg-[#96E044] text-black border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all duration-200 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
              计算中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              开始增值分析
            </span>
          )}
        </Button>

        {/* 提示信息 */}
        {selection.baselineExamId === selection.targetExamId &&
          selection.baselineExamId && (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded p-3 text-sm text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              请选择两次不同的考试进行对比
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default ExamSelector;
