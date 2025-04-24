import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface GradeHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework: any;
  submission: any;
  onGraded: () => void;
}

const GradeHomeworkDialog: React.FC<GradeHomeworkDialogProps> = ({
  open,
  onOpenChange,
  homework,
  submission,
  onGraded
}) => {
  const [formData, setFormData] = useState({
    score: submission.score !== null ? submission.score : '',
    feedback: submission.feedback || '',
    status: submission.status || 'submitted',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value }));
  };

  const handleDownloadFile = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('homework_files')
        .download(file.path);
      
      if (error) throw error;
      
      // 创建下载链接
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载文件失败:', error);
      toast.error('下载文件失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 验证分数
      const score = formData.score === '' ? null : Number(formData.score);
      if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
        throw new Error('分数必须在0-100之间');
      }
      
      // 更新提交状态和评分
      const { error } = await supabase
        .from('homework_submissions')
        .update({
          score: score,
          feedback: formData.feedback.trim() ? formData.feedback : null,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', submission.id);
      
      if (error) throw error;
      
      toast.success('评分已保存');
      onGraded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('保存评分失败:', error);
      toast.error(error.message || '保存评分失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>评分作业</DialogTitle>
          <DialogDescription>
            为{submission.students?.name}的{homework.title}作业进行评分
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-md">
            <h3 className="font-medium mb-2">学生信息</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">学生姓名:</span> {submission.students?.name}
              </div>
              <div>
                <span className="text-muted-foreground">学号:</span> {submission.students?.student_id}
              </div>
              <div>
                <span className="text-muted-foreground">提交时间:</span> {new Date(submission.submitted_at).toLocaleString()}
              </div>
              <div>
                <span className="text-muted-foreground">状态:</span> {submission.status}
              </div>
            </div>
          </div>

          {submission.notes && (
            <div>
              <Label>学生备注</Label>
              <div className="mt-1 p-3 bg-muted/30 rounded-md text-sm whitespace-pre-wrap">
                {submission.notes}
              </div>
            </div>
          )}

          {submission.files && submission.files.length > 0 && (
            <div>
              <Label>提交的文件</Label>
              <div className="mt-1 space-y-2">
                {(submission.files as any[]).map((file, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadFile(file)}
                    className="w-full justify-start"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {file.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="score">分数 (0-100)</Label>
            <Input
              id="score"
              name="score"
              type="number"
              min="0"
              max="100"
              value={formData.score}
              onChange={handleInputChange}
              placeholder="输入0-100之间的分数"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="选择状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submitted">已提交</SelectItem>
                <SelectItem value="graded">已评分</SelectItem>
                <SelectItem value="returned">已退回</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback">反馈</Label>
            <Textarea
              id="feedback"
              name="feedback"
              value={formData.feedback}
              onChange={handleInputChange}
              placeholder="给学生的评语和建议..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存评分'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GradeHomeworkDialog; 