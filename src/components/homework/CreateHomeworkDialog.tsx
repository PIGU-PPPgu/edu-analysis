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
import { toast } from "sonner";
import { getGradingScales } from "@/services/gradingService";
import { getAllClasses } from "@/services/classService";
import { createHomework } from "@/services/homeworkService";
import { useAuth, useAuthActions } from "@/contexts/unified/modules/AuthModule";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CreateHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHomeworkCreated: () => void;
}

const CreateHomeworkDialog: React.FC<CreateHomeworkDialogProps> = ({
  open,
  onOpenChange,
  onHomeworkCreated,
}) => {
  const { user } = useAuth();
  const { refreshAuth } = useAuthActions();
  const [classes, setClasses] = React.useState<any[]>([]);
  const [gradingScales, setGradingScales] = React.useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

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
        // 检查用户认证状态
        if (!user) {
          setAuthError("请先登录后再创建作业");
          return;
        } else {
          setAuthError(null);
        }

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
  }, [open, user]); // 当对话框打开时或用户变化时刷新数据

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 首先刷新会话，确保认证有效
      await refreshSession();

      // 检查用户是否已登录
      if (!user || !user.id) {
        setAuthError("用户身份验证失败，请重新登录");
        setIsSubmitting(false);
        return;
      }

      console.log("正在创建作业，用户ID:", user.id);

      // 使用homeworkService中的createHomework函数

      // 根据用户选择处理 grading_scale_id
      let finalGradingScaleId: string | null = null;
      if (formData.gradingScaleId === "default") {
        const defaultScale = gradingScales.find(
          (scale) => scale.is_default && scale.id && scale.id.trim() !== ""
        );
        if (defaultScale) {
          finalGradingScaleId = defaultScale.id;
          console.log(
            "用户选择了'默认评级'，将使用数据库中is_default的方案ID:",
            finalGradingScaleId
          );
        } else {
          console.log(
            "用户选择了'默认评级'，但未找到数据库中is_default的方案，grading_scale_id将为null"
          );
          // 如果没有在 gradingScales 列表中找到 is_default 的有效 scale, finalGradingScaleId 保持 null
        }
      } else if (
        formData.gradingScaleId &&
        formData.gradingScaleId.trim() !== ""
      ) {
        finalGradingScaleId = formData.gradingScaleId;
        console.log("用户选择了特定的评级方案ID:", finalGradingScaleId);
      } else {
        console.log(
          "用户未选择评级方案或选择了无效方案，grading_scale_id将为null"
        );
        // 如果 formData.gradingScaleId 为空或无效, finalGradingScaleId 保持 null
      }

      const result = await createHomework({
        title: formData.title,
        description: formData.description,
        class_id: formData.classId,
        due_date: formData.dueDate || null,
        grading_scale_id: finalGradingScaleId, // 使用处理后的 finalGradingScaleId
        created_by: user.id,
      });

      // 检查是否创建成功
      if (result.success) {
        onHomeworkCreated();
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("创建作业失败:", error);
      toast.error(`创建作业失败: ${error.message || "未知错误"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>布置新作业</DialogTitle>
        </DialogHeader>

        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>认证错误</AlertTitle>
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

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
              disabled={!!authError}
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
              disabled={!!authError}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">班级</Label>
            <Select
              value={formData.classId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, classId: value }))
              }
              disabled={!!authError}
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
              disabled={!!authError}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gradingScale">评级标准</Label>
            <Select
              value={formData.gradingScaleId}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, gradingScaleId: value }))
              }
              disabled={!!authError}
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

          <Button
            type="submit"
            disabled={isSubmitting || !!authError}
            className="w-full"
          >
            {isSubmitting ? "创建中..." : "创建作业"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateHomeworkDialog;
