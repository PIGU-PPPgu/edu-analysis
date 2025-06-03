import * as React from "react";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { supabase } from "@/integrations/supabase/client";

export interface Exam {
  id: string;
  title: string; // 使用title字段，不是exam_title
  name?: string;  // 向后兼容，支持name字段
  type?: string;  // 使用type字段，不是exam_type
  date?: string;  // 使用date字段，不是exam_date
  subject?: string;
  gradeCount?: number; // 成绩记录数量
}

interface ExamSelectorProps {
  exams: Exam[];
  // 单选模式的props
  selectedExam?: Exam | null;
  onExamSelect?: (exam: Exam) => void;
  // 多选模式的props
  selectedExams?: string[];
  onChange?: (selectedIds: string[]) => void;
  maxSelections?: number;
  // 通用props
  isLoading?: boolean;
  onExamDelete?: (examId: string) => void;
}

export function ExamSelector({
  exams,
  selectedExam,
  onExamSelect,
  selectedExams,
  onChange,
  maxSelections,
  isLoading = false,
  onExamDelete,
}: ExamSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [examToDelete, setExamToDelete] = React.useState<Exam | null>(null);
  
  // 判断是多选模式还是单选模式
  const isMultiSelect = selectedExams !== undefined && onChange !== undefined;
  
  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    
    try {
      // 使用Supabase删除考试
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examToDelete.id);
      
      if (error) throw error;
      
      // 成功删除后调用回调
      if (onExamDelete) {
        onExamDelete(examToDelete.id);
      }
      
      toast.success("考试已删除", {
        description: `已成功删除考试: ${examToDelete.title || examToDelete.name}`
        });
        
      // 如果删除的是当前选中的考试，清除选择
      if (isMultiSelect && selectedExams && onChange) {
        const newSelected = selectedExams.filter(id => id !== examToDelete.id);
        onChange(newSelected);
      } else if (selectedExam && selectedExam.id === examToDelete.id && onExamSelect) {
        const remainingExam = exams.find(e => e.id !== examToDelete.id);
        if (remainingExam) {
          onExamSelect(remainingExam);
        }
      }
    } catch (error) {
      console.error("删除考试失败:", error);
      toast.error("删除考试失败", {
        description: error instanceof Error ? error.message : "未知错误"
      });
    } finally {
      setDeleteDialogOpen(false);
      setExamToDelete(null);
    }
  };

  // 格式化考试显示文本
  const formatExamDisplay = (exam: Exam) => {
    const displayTitle = exam.title || exam.name || "未命名考试";
    const displayDate = exam.date 
      ? new Date(exam.date).toLocaleDateString('zh-CN')
      : "";
    
    return displayDate ? `${displayTitle} (${displayDate})` : displayTitle;
  };

  // 处理考试选择
  const handleExamToggle = (exam: Exam) => {
    if (isMultiSelect && selectedExams && onChange) {
      const isSelected = selectedExams.includes(exam.id);
      if (isSelected) {
        onChange(selectedExams.filter(id => id !== exam.id));
      } else {
        if (!maxSelections || selectedExams.length < maxSelections) {
          onChange([...selectedExams, exam.id]);
        } else {
          toast.warning(`最多只能选择${maxSelections}个考试`);
        }
      }
    } else if (onExamSelect) {
      onExamSelect(exam);
      setOpen(false);
    }
  };

  // 获取显示的文本
  const getDisplayText = () => {
    if (isLoading) return "加载考试列表...";
    
    if (isMultiSelect && selectedExams) {
      if (selectedExams.length === 0) return "选择考试";
      if (selectedExams.length === 1) {
        const exam = exams.find(e => e.id === selectedExams[0]);
        return exam ? formatExamDisplay(exam) : "选择考试";
      }
      return `已选择 ${selectedExams.length} 个考试`;
    } else if (selectedExam) {
      return formatExamDisplay(selectedExam);
    }
    
    return "选择考试";
  };

  return (
    <div className="flex items-center space-x-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[250px] justify-between"
            disabled={isLoading || exams.length === 0}
          >
            {getDisplayText()}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <Command>
            <CommandInput placeholder="搜索考试..." />
            <CommandEmpty>没有找到匹配的考试</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-y-auto">
              {exams.map((exam) => (
                <CommandItem
                  key={exam.id}
                  value={exam.id}
                  onSelect={() => {
                    handleExamToggle(exam);
                  }}
                  className="flex justify-between items-center"
                >
                  <div>
                    <span>{formatExamDisplay(exam)}</span>
                    {exam.subject && (
                      <Badge variant="outline" className="ml-2">
                        {exam.subject}
                      </Badge>
                    )}
                    {exam.type && (
                      <Badge variant="secondary" className="ml-2">
                        {exam.type}
                      </Badge>
                    )}
                    {exam.gradeCount !== undefined && (
                      <Badge variant={exam.gradeCount > 0 ? "default" : "destructive"} className="ml-2">
                        {exam.gradeCount > 0 ? `${exam.gradeCount}条记录` : "无数据"}
                      </Badge>
                    )}
                  </div>
                  {/* 显示选中状态 */}
                  {isMultiSelect && selectedExams ? (
                    selectedExams.includes(exam.id) && (
                      <Check className="h-4 w-4" />
                    )
                  ) : (
                    selectedExam && selectedExam.id === exam.id && (
                      <Check className="h-4 w-4" />
                    )
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {!isMultiSelect && selectedExam && onExamDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setExamToDelete(selectedExam);
            setDeleteDialogOpen(true);
          }}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除考试</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除 "{examToDelete?.title}" 吗？这将删除所有相关的成绩数据，且此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              className="bg-destructive hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
