"use client";

/**
 * 创建增值活动对话框
 */

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createValueAddedActivity } from "@/services/valueAddedActivityService";
import { supabase } from "@/integrations/supabase/client";

interface CreateActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ExamOption {
  id: string;
  title: string;
  date: string;
  type: string;
  original_filename?: string; // ✅ 新增：原始文件名
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateActivityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    entryExamId: "",
    entryExamTitle: "",
    exitExamId: "",
    exitExamTitle: "",
    gradeLevel: "",
    studentYear: "",
    academicYear: "",
    semester: "",
  });

  // 加载真实考试数据
  useEffect(() => {
    if (open) {
      loadExams();
    }
  }, [open]);

  const loadExams = async () => {
    setLoadingExams(true);
    try {
      const { data, error } = await supabase
        .from("exams")
        .select("id, title, date, type, original_filename") // ✅ 包含文件名
        .order("date", { ascending: false });

      if (error) {
        console.error("加载考试列表失败:", error);
        toast.error("加载考试列表失败");
        return;
      }

      setExams(data || []);
    } catch (error) {
      console.error("加载考试列表异常:", error);
      toast.error("加载考试列表失败");
    } finally {
      setLoadingExams(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证必填字段
    if (!formData.name.trim()) {
      toast.error("请输入活动名称");
      return;
    }

    if (!formData.entryExamId || !formData.exitExamId) {
      toast.error("请选择入口和出口考试");
      return;
    }

    if (formData.entryExamId === formData.exitExamId) {
      toast.error("入口和出口考试不能相同");
      return;
    }

    if (
      !formData.gradeLevel ||
      !formData.studentYear ||
      !formData.academicYear ||
      !formData.semester
    ) {
      toast.error("请完善年级和学期信息");
      return;
    }

    setLoading(true);

    try {
      const result = await createValueAddedActivity({
        name: formData.name,
        description: formData.description,
        entryExamId: formData.entryExamId,
        entryExamTitle: formData.entryExamTitle,
        exitExamId: formData.exitExamId,
        exitExamTitle: formData.exitExamTitle,
        gradeLevel: formData.gradeLevel,
        studentYear: formData.studentYear,
        academicYear: formData.academicYear,
        semester: formData.semester,
      });

      if (result.success) {
        toast.success("增值活动创建成功");
        onOpenChange(false);
        onSuccess?.();

        // 重置表单
        setFormData({
          name: "",
          description: "",
          entryExamId: "",
          entryExamTitle: "",
          exitExamId: "",
          exitExamTitle: "",
          gradeLevel: "",
          studentYear: "",
          academicYear: "",
          semester: "",
        });
      } else {
        toast.error(result.error || "创建失败");
      }
    } catch (error) {
      console.error("创建活动失败:", error);
      toast.error("创建失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = (value: string, type: "entry" | "exit") => {
    const exam = exams.find((e) => e.id === value);
    if (exam) {
      if (type === "entry") {
        setFormData((prev) => ({
          ...prev,
          entryExamId: exam.id,
          entryExamTitle: exam.title,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          exitExamId: exam.id,
          exitExamTitle: exam.title,
        }));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>创建增值活动</DialogTitle>
          <DialogDescription>
            选择入口考试和出口考试，系统将自动计算学生的增值情况
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">活动名称 *</Label>
              <Input
                id="name"
                placeholder="例如：高一年级2023-2024学年增值评价"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="description">活动描述</Label>
              <Textarea
                id="description"
                placeholder="简要描述本次增值评价的目的和范围..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>

          {/* 考试选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entryExam">入口考试（基准） *</Label>
              <Select
                value={formData.entryExamId}
                onValueChange={(value) => handleExamSelect(value, "entry")}
              >
                <SelectTrigger id="entryExam" disabled={loadingExams}>
                  <SelectValue
                    placeholder={loadingExams ? "加载中..." : "选择入口考试"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {exams.length === 0 && !loadingExams && (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      暂无考试数据，请先导入成绩
                    </div>
                  )}
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.original_filename || exam.title} ({exam.date}) -{" "}
                      {exam.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="exitExam">出口考试（目标） *</Label>
              <Select
                value={formData.exitExamId}
                onValueChange={(value) => handleExamSelect(value, "exit")}
              >
                <SelectTrigger id="exitExam" disabled={loadingExams}>
                  <SelectValue
                    placeholder={loadingExams ? "加载中..." : "选择出口考试"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {exams.length === 0 && !loadingExams && (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      暂无考试数据，请先导入成绩
                    </div>
                  )}
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.original_filename || exam.title} ({exam.date}) -{" "}
                      {exam.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 年级和学期信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gradeLevel">年级 *</Label>
              <Select
                value={formData.gradeLevel}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, gradeLevel: value }))
                }
              >
                <SelectTrigger id="gradeLevel">
                  <SelectValue placeholder="选择年级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="初一">初一</SelectItem>
                  <SelectItem value="初二">初二</SelectItem>
                  <SelectItem value="初三">初三</SelectItem>
                  <SelectItem value="高一">高一</SelectItem>
                  <SelectItem value="高二">高二</SelectItem>
                  <SelectItem value="高三">高三</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="studentYear">学生届别 *</Label>
              <Input
                id="studentYear"
                placeholder="例如：2026届"
                value={formData.studentYear}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    studentYear: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="academicYear">学年 *</Label>
              <Input
                id="academicYear"
                placeholder="例如：2023-2024"
                value={formData.academicYear}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    academicYear: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="semester">学期 *</Label>
              <Select
                value={formData.semester}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, semester: value }))
                }
              >
                <SelectTrigger id="semester">
                  <SelectValue placeholder="选择学期" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="上学期">上学期</SelectItem>
                  <SelectItem value="下学期">下学期</SelectItem>
                  <SelectItem value="全学年">全学年</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "创建中..." : "创建活动"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
