/**
 * 考试创建/编辑对话框组件
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar as CalendarIcon,
  X,
  Plus,
  Clock,
  FileText,
  Users,
  BookOpen,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Exam,
  ExamFormData,
  ExamType,
  AcademicTerm,
  SUBJECT_OPTIONS,
} from "../types";

interface ExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Exam | null; // null表示创建新考试
  examTypes: ExamType[];
  academicTerms: AcademicTerm[];
  onSave: (examData: ExamFormData) => void;
  isLoading?: boolean;
}

export const ExamDialog: React.FC<ExamDialogProps> = ({
  open,
  onOpenChange,
  exam,
  examTypes,
  academicTerms,
  onSave,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ExamFormData>({
    title: "",
    description: "",
    type: "",
    subjects: [],
    date: "",
    startTime: "09:00",
    endTime: "11:00",
    totalScore: 100,
    passingScore: 60,
    classes: [],
    status: "draft",
  });

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);

  // 加载可用班级列表
  useEffect(() => {
    if (open) {
      const loadClasses = async () => {
        try {
          const { data, error } = await supabase
            .from("class_info")
            .select("class_name")
            .order("class_name");

          if (!error && data) {
            setAvailableClasses(data.map((c) => c.class_name));
          } else {
            console.error("加载班级列表失败:", error);
            setAvailableClasses([]);
          }
        } catch (error) {
          console.error("加载班级列表时出错:", error);
          setAvailableClasses([]);
        }
      };

      loadClasses();
    }
  }, [open]);

  // 初始化表单数据
  useEffect(() => {
    if (open) {
      if (exam) {
        // 编辑模式
        setFormData({
          title: exam.title || "",
          description: exam.description || "",
          type: exam.type || "",
          subjects: exam.subjects || [],
          date: exam.date || "",
          startTime: exam.start_time || "09:00",
          endTime: exam.end_time || "11:00",
          totalScore: exam.total_score || 100,
          passingScore: exam.passing_score || 60,
          classes: exam.classes || [],
          status: exam.status || "draft",
        });
        if (exam.date) {
          setSelectedDate(new Date(exam.date));
        }
      } else {
        // 创建模式
        const today = new Date();
        setFormData({
          title: "",
          description: "",
          type: "",
          subjects: [],
          date: format(today, "yyyy-MM-dd"),
          startTime: "09:00",
          endTime: "11:00",
          totalScore: 100,
          passingScore: 60,
          classes: [],
          status: "draft",
        });
        setSelectedDate(today);
      }
      setErrors({});
    }
  }, [open, exam]);

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "考试标题不能为空";
    }

    if (!formData.type) {
      newErrors.type = "请选择考试类型";
    }

    if (!formData.date) {
      newErrors.date = "请选择考试日期";
    }

    if (formData.subjects.length === 0) {
      newErrors.subjects = "请至少选择一个科目";
    }

    if (formData.classes.length === 0) {
      newErrors.classes = "请至少选择一个班级";
    }

    if (formData.totalScore <= 0) {
      newErrors.totalScore = "总分必须大于0";
    }

    if (
      formData.passingScore < 0 ||
      formData.passingScore > formData.totalScore
    ) {
      newErrors.passingScore = "及格分数必须在0到总分之间";
    }

    if (formData.startTime >= formData.endTime) {
      newErrors.time = "开始时间必须早于结束时间";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  // 更新表单字段
  const updateField = <K extends keyof ExamFormData>(
    field: K,
    value: ExamFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 处理日期选择
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      updateField("date", format(date, "yyyy-MM-dd"));
    }
  };

  // 添加科目
  const addSubject = (subject: string) => {
    if (!formData.subjects.includes(subject)) {
      updateField("subjects", [...formData.subjects, subject]);
    }
  };

  // 移除科目
  const removeSubject = (subject: string) => {
    updateField(
      "subjects",
      formData.subjects.filter((s) => s !== subject)
    );
  };

  // 添加班级
  const addClass = (className: string) => {
    if (!formData.classes.includes(className)) {
      updateField("classes", [...formData.classes, className]);
    }
  };

  // 移除班级
  const removeClass = (className: string) => {
    updateField(
      "classes",
      formData.classes.filter((c) => c !== className)
    );
  };

  const isEditMode = !!exam;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            {isEditMode ? "编辑考试" : "创建考试"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "修改考试信息和配置"
              : "创建一场新的考试，填写必要的考试信息"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左列：基本信息 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  考试标题 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="请输入考试标题"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className={cn(errors.title && "border-red-500")}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">考试描述</Label>
                <Textarea
                  id="description"
                  placeholder="请输入考试描述（可选）"
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="flex items-center gap-2">
                  考试类型 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => updateField("type", value)}
                >
                  <SelectTrigger
                    className={cn(errors.type && "border-red-500")}
                  >
                    <SelectValue placeholder="选择考试类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {examTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        <div className="flex items-center gap-2">
                          <span>{type.emoji}</span>
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">考试状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    updateField("status", value as ExamFormData["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="scheduled">已安排</SelectItem>
                    <SelectItem value="ongoing">进行中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 右列：时间和分数配置 */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  考试日期 <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground",
                        errors.date && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? format(selectedDate, "yyyy年MM月dd日", {
                            locale: zhCN,
                          })
                        : "选择考试日期"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="startTime"
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    开始时间
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => updateField("startTime", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">结束时间</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => updateField("endTime", e.target.value)}
                  />
                </div>
              </div>
              {errors.time && (
                <p className="text-sm text-red-500">{errors.time}</p>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalScore">总分</Label>
                  <Input
                    id="totalScore"
                    type="number"
                    min="1"
                    value={formData.totalScore}
                    onChange={(e) =>
                      updateField("totalScore", parseInt(e.target.value) || 0)
                    }
                    className={cn(errors.totalScore && "border-red-500")}
                  />
                  {errors.totalScore && (
                    <p className="text-sm text-red-500">{errors.totalScore}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passingScore">及格分</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min="0"
                    max={formData.totalScore}
                    value={formData.passingScore}
                    onChange={(e) =>
                      updateField("passingScore", parseInt(e.target.value) || 0)
                    }
                    className={cn(errors.passingScore && "border-red-500")}
                  />
                  {errors.passingScore && (
                    <p className="text-sm text-red-500">
                      {errors.passingScore}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 科目选择 */}
          <div className="mt-6 space-y-4">
            <div>
              <Label className="flex items-center gap-2 mb-3">
                科目选择 <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {SUBJECT_OPTIONS.map((subject) => (
                  <Button
                    key={subject}
                    type="button"
                    variant={
                      formData.subjects.includes(subject)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      if (formData.subjects.includes(subject)) {
                        removeSubject(subject);
                      } else {
                        addSubject(subject);
                      }
                    }}
                    className="justify-start"
                  >
                    {formData.subjects.includes(subject) && (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    {subject}
                  </Button>
                ))}
              </div>
              {formData.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.subjects.map((subject) => (
                    <Badge
                      key={subject}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {subject}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeSubject(subject)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              {errors.subjects && (
                <p className="text-sm text-red-500 mt-2">{errors.subjects}</p>
              )}
            </div>

            {/* 班级选择 */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" />
                班级选择 <span className="text-red-500">*</span>
              </Label>
              {availableClasses.length === 0 && (
                <p className="text-sm text-muted-foreground mb-2">
                  暂无班级数据，请先上传成绩数据
                </p>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {availableClasses.map((className) => (
                  <Button
                    key={className}
                    type="button"
                    variant={
                      formData.classes.includes(className)
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() => {
                      if (formData.classes.includes(className)) {
                        removeClass(className);
                      } else {
                        addClass(className);
                      }
                    }}
                    className="justify-start"
                  >
                    {formData.classes.includes(className) && (
                      <X className="h-3 w-3 mr-1" />
                    )}
                    {className}
                  </Button>
                ))}
              </div>
              {formData.classes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.classes.map((className) => (
                    <Badge
                      key={className}
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      {className}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeClass(className)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              {errors.classes && (
                <p className="text-sm text-red-500 mt-2">{errors.classes}</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <div className="flex gap-2">
            {!isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  updateField("status", "draft");
                  handleSubmit();
                }}
                disabled={isLoading}
              >
                保存草稿
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "保存中..." : isEditMode ? "保存修改" : "创建考试"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
