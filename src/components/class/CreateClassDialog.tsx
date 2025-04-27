import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createClass, updateClass } from "@/services/classService";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClassCreated: () => void;
  classToEdit?: {
    id: string;
    name: string;
    grade: string;
  } | null;
}

const CreateClassDialog: React.FC<CreateClassDialogProps> = ({
  open,
  onOpenChange,
  onClassCreated,
  classToEdit = null
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: '',
    grade: ''
  });

  React.useEffect(() => {
    if (classToEdit) {
      setFormData({
        name: classToEdit.name,
        grade: classToEdit.grade
      });
    } else {
      setFormData({
        name: '',
        grade: ''
      });
    }
  }, [classToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (classToEdit) {
        // 更新班级
        const success = await updateClass(classToEdit.id, {
          name: formData.name,
          grade: formData.grade
        });

        if (success) {
          toast.success('班级更新成功');
          onClassCreated();
          onOpenChange(false);
        }
      } else {
        // 创建班级
        const newClass = await createClass({
          name: formData.name,
          grade: formData.grade
        });

        if (newClass) {
          toast.success('班级创建成功');
          onClassCreated();
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error(classToEdit ? '更新班级失败:' : '创建班级失败:', error);
      toast.error(classToEdit ? '更新班级失败' : '创建班级失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{classToEdit ? '编辑班级' : '创建新班级'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">班级名称</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade">年级</Label>
            <Input
              id="grade"
              value={formData.grade}
              onChange={e => setFormData(prev => ({ ...prev, grade: e.target.value }))}
              placeholder="如：高一、初二等"
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? '处理中...' : (classToEdit ? '更新班级' : '创建班级')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateClassDialog; 