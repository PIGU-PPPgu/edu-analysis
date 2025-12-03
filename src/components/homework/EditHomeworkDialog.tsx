import React from "react";
import {
  Dialog,
  DialogContent,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getGradingScales } from "@/services/gradingService";
import { getAllClasses } from "@/services/classService";
import { updateHomework } from "@/services/homeworkService";

interface EditHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHomeworkUpdated: () => void;
  homework: {
    id: string;
    title: string;
    description: string;
    class_id?: string; // ⚠️ 可选（过渡期兼容）
    class_name?: string; // ✅ 新增主字段
    due_date: string | null;
    grading_scale_id: string | null;
  } | null;
}

const EditHomeworkDialog: React.FC<EditHomeworkDialogProps> = ({
  open,
  onOpenChange,
  onHomeworkUpdated,
  homework,
}) => {
  const [classes, setClasses] = React.useState<any[]>([]);
  const [gradingScales, setGradingScales] = React.useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    title: "",
    description: "",
    classId: "",
    dueDate: "",
    gradingScaleId: "",
  });

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // 获取班级列表
        const classesData = await getAllClasses();
        setClasses(classesData || []);

        // 获取评级标准列表
        const gradingScalesData = await getGradingScales();
        setGradingScales(gradingScalesData || []);
      } catch (error) {
        console.error("获取数据失败:", error);
        toast.error("获取数据失败");
      }
    };

    fetchData();
  }, [open]); // 当对话框打开时刷新数据

  // 当homework变化时更新表单数据
  React.useEffect(() => {
    if (homework) {
      setFormData({
        title: homework.title || "",
        description: homework.description || "",
        classId: homework.class_name || homework.class_id || "", // ✅ 优先使用class_name
        dueDate: homework.due_date || "",
        gradingScaleId: homework.grading_scale_id || "",
      });
    }
  }, [homework]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!homework) {
      toast.error("没有要编辑的作业数据");
      return;
    }

    setIsSubmitting(true);

    try {
      const { success } = await updateHomework(homework.id, {
        title: formData.title,
        description: formData.description,
        class_name: formData.classId, // ✅ 新增主字段（值实际是班级名称）
        class_id: formData.classId, // ⚠️ 过渡期兼容字段
        due_date: formData.dueDate || null,
        grading_scale_id:
          formData.gradingScaleId === "default"
            ? null
            : formData.gradingScaleId || null,
      });

      if (success) {
        toast.success("作业更新成功");
        onHomeworkUpdated();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("更新作业失败:", error);
      toast.error("更新作业失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>编辑作业</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">作业标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">作业说明</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">班级</Label>
            <Select
              value={formData.classId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, classId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择班级" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">截止日期</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradingScale">评级标准</Label>
            <Select
              value={formData.gradingScaleId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gradingScaleId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择评级标准" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认评级</SelectItem>
                {gradingScales
                  .filter((scale) => scale.id && scale.id.trim() !== "")
                  .map((scale) => (
                    <SelectItem key={scale.id} value={scale.id}>
                      {scale.name} {scale.is_default ? "(默认)" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              选择评级标准将决定分数如何转换为等级。如不选择，将使用系统默认评级。
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "更新中..." : "更新作业"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditHomeworkDialog;
