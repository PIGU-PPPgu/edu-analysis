import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { filesize } from "filesize";

// 导入Supabase服务
import { submitHomework, uploadHomeworkFile } from "@/services/submissionService";
import { supabase } from "@/integrations/supabase/client";

// Define simple types
type FileInfo = {
  name: string;
  path: string;
  type: string;
  size: number;
};

interface SubmitHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework: {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
  };
  onSubmitted: (content: string) => void;
}

const SubmitHomeworkDialog: React.FC<SubmitHomeworkDialogProps> = ({
  open,
  onOpenChange,
  homework,
  onSubmitted
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [content, setContent] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 检查截止日期是否已过
  const isOverdue = homework.due_date ? new Date(homework.due_date) < new Date() : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && files.length === 0) {
      toast("请提供作业内容或上传文件");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 获取当前用户
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("未登录");
      }
      
      // 上传文件（如果有）
      let uploadedFiles = [];
      if (files.length > 0) {
        for (const file of files) {
          const uploadResult = await uploadHomeworkFile(file, homework.id, user.id);
          if (uploadResult) {
            uploadedFiles.push(uploadResult);
          }
        }
      }
      
      // 提交作业
      const submissionData = {
        homework_id: homework.id,
        student_id: user.id, // 使用实际用户ID
        files: uploadedFiles.length > 0 ? uploadedFiles : null,
        content: content.trim() || null
      };
      
      const result = await submitHomework(submissionData);
      
      if (result) {
        // 调用回调
        if (onSubmitted) {
          onSubmitted(content);
        }
        
        // 清空表单
        setContent("");
        setFiles([]);
        
        // 关闭对话框
        onOpenChange(false);
      }
    } catch (error) {
      console.error("提交作业失败:", error);
      toast.error(`提交作业失败: ${error.message || "未知错误"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>提交作业 - {homework.title}</DialogTitle>
          {homework.description && (
            <DialogDescription className="mt-2 text-sm">
              {homework.description}
            </DialogDescription>
          )}
        </DialogHeader>

        {isOverdue && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>截止日期已过</AlertTitle>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">作业内容</Label>
            <Textarea
              id="content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="请输入你的作业内容..."
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="files">上传文件 (可选)</Label>
            <div className="border-2 border-dashed rounded-md p-4 text-center">
              <input
                id="files"
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Label htmlFor="files" className="cursor-pointer block py-2">
                <FileUp className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm text-gray-600">
                  点击或拖拽文件上传
                </span>
              </Label>
            </div>
            {files.length > 0 && (
              <ul className="mt-2 text-sm space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span className="truncate max-w-[300px]">{file.name}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 px-2"
                    >
                      删除
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              variant={isOverdue ? "destructive" : "default"}
            >
              {isSubmitting ? '提交中...' : isOverdue ? '逾期提交' : '提交作业'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitHomeworkDialog;
