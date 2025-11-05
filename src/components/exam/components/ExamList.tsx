/**
 * 考试列表组件
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Trash2,
  Copy,
  Download,
  MoreHorizontal,
  Settings,
  Users,
  Calendar,
  Clock,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Exam, STATUS_COLOR_MAP, STATUS_LABEL_MAP } from "../types";

interface ExamListProps {
  exams: Exam[];
  selectedExams: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam: (examId: string) => void;
  onDuplicateExam: (exam: Exam) => void;
  onConfigureSubjectScores: (exam: Exam) => void;
  onExportExam: (exam: Exam) => void;
  isLoading?: boolean;
}

export const ExamList: React.FC<ExamListProps> = ({
  exams,
  selectedExams,
  onSelectionChange,
  onEditExam,
  onDeleteExam,
  onDuplicateExam,
  onConfigureSubjectScores,
  onExportExam,
  isLoading = false,
}) => {
  const [deleteExamId, setDeleteExamId] = useState<string | null>(null);

  // 处理单个考试选择
  const handleExamSelect = (examId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedExams, examId]);
    } else {
      onSelectionChange(selectedExams.filter((id) => id !== examId));
    }
  };

  // 处理全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(exams.map((exam) => exam.id));
    } else {
      onSelectionChange([]);
    }
  };

  // 确认删除
  const handleConfirmDelete = () => {
    if (deleteExamId) {
      onDeleteExam(deleteExamId);
      setDeleteExamId(null);
    }
  };

  // 获取状态颜色和标签
  const getStatusInfo = (status: string) => ({
    color: STATUS_COLOR_MAP[status] || "#6B7280",
    label: STATUS_LABEL_MAP[status] || status,
  });

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "yyyy年MM月dd日", { locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  // 格式化时间
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    return timeStr.substring(0, 5); // 只显示 HH:mm
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-gray-300 rounded"></div>
                <div className="h-6 bg-gray-300 rounded w-48"></div>
                <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="flex gap-4 mt-4">
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            暂无考试数据
          </h3>
          <p className="text-gray-500 mb-4">
            还没有创建任何考试，立即开始创建您的第一场考试吧！
          </p>
          <Button>创建考试</Button>
        </CardContent>
      </Card>
    );
  }

  const allSelected = exams.length > 0 && selectedExams.length === exams.length;
  const someSelected =
    selectedExams.length > 0 && selectedExams.length < exams.length;

  return (
    <div className="space-y-4">
      {/* 批量操作栏 */}
      {exams.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  {selectedExams.length > 0
                    ? `已选择 ${selectedExams.length} 个考试`
                    : `全部 ${exams.length} 个考试`}
                </span>
              </div>

              {selectedExams.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // 批量导出
                      console.log("批量导出:", selectedExams);
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    导出 ({selectedExams.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // 批量删除
                      console.log("批量删除:", selectedExams);
                    }}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除 ({selectedExams.length})
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 考试列表 */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {exams.map((exam) => {
            const statusInfo = getStatusInfo(exam.status);
            const isSelected = selectedExams.includes(exam.id);

            return (
              <Card
                key={exam.id}
                className={cn(
                  "hover:shadow-md transition-shadow duration-200 cursor-pointer",
                  isSelected && "ring-2 ring-blue-500 bg-blue-50/50"
                )}
                onClick={() => handleExamSelect(exam.id, !isSelected)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleExamSelect(exam.id, !!checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="flex items-center space-x-2">
                        {exam.typeInfo && (
                          <span className="text-lg">{exam.typeInfo.emoji}</span>
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {exam.title}
                        </h3>
                      </div>

                      <Badge
                        variant="outline"
                        style={{
                          borderColor: statusInfo.color,
                          color: statusInfo.color,
                        }}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditExam(exam);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          编辑考试
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onConfigureSubjectScores(exam);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          科目配置
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateExam(exam);
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          复制考试
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportExam(exam);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          导出数据
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteExamId(exam.id);
                          }}
                          className="text-red-600 focus:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除考试
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* 考试描述 */}
                    {exam.description && (
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {exam.description}
                      </p>
                    )}

                    {/* 考试信息 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                        {formatDate(exam.date)}
                      </div>

                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-green-500" />
                        {formatTime(exam.start_time)} -{" "}
                        {formatTime(exam.end_time)}
                      </div>

                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-purple-500" />
                        {exam.participantCount || 0}个参与者
                      </div>

                      <div className="flex items-center text-gray-600">
                        <FileText className="h-4 w-4 mr-2 text-orange-500" />
                        总分: {exam.total_score || 100}分
                      </div>
                    </div>

                    {/* 科目和班级标签 */}
                    <div className="flex flex-wrap gap-2">
                      {exam.subjects.map((subject, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {subject}
                        </Badge>
                      ))}
                      {exam.classes.map((className, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {className}
                        </Badge>
                      ))}
                      {exam.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs bg-gray-50"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>

                    {/* 创建信息 */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                      <span>创建者: {exam.createdBy}</span>
                      <span>创建时间: {formatDate(exam.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteExamId}
        onOpenChange={() => setDeleteExamId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除考试</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该考试及其相关数据，包括考试成绩、统计信息等。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
