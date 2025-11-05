import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Upload, X, FileText } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface RecordStudentHomeworkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homework: any;
  onRecorded: () => void;
}

// 表单验证模式
const formSchema = z.object({
  studentId: z.string().min(1, "请选择学生"),
  status: z.string().default("submitted"),
  notes: z.string().optional(),
});

const RecordStudentHomeworkDialog: React.FC<
  RecordStudentHomeworkDialogProps
> = ({ open, onOpenChange, homework, onRecorded }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);

  // 获取班级学生
  useEffect(() => {
    const fetchStudents = async () => {
      if (homework?.classes?.id) {
        try {
          // 获取班级学生
          const { data: studentsData, error } = await supabase
            .from("students")
            .select("*")
            .eq("class_id", homework.classes.id)
            .order("name");

          if (error) throw error;

          // 获取已有作业记录的学生列表
          const { data: submittedStudents, error: submissionError } =
            await supabase
              .from("homework_submissions")
              .select("student_id")
              .eq("homework_id", homework.id);

          if (submissionError) throw submissionError;

          // 过滤掉已提交作业的学生
          const alreadySubmittedIds =
            submittedStudents?.map((s) => s.student_id) || [];

          setStudents(
            studentsData?.filter(
              (student) => !alreadySubmittedIds.includes(student.id)
            ) || []
          );
        } catch (error) {
          console.error("获取学生列表失败:", error);
          toast.error("获取学生列表失败");
        }
      }
    };

    if (open) {
      fetchStudents();
    }
  }, [open, homework]);

  // 表单设置
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: "",
      status: "submitted",
      notes: "",
    },
  });

  // 处理文件拖放
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // 移除文件
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // 提交表单
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (students.length === 0) {
      toast.error("没有可用的学生");
      return;
    }

    setUploading(true);

    try {
      // 上传文件
      const uploadedFiles = [];

      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split(".").pop();
          const filePath = `${homework.id}/${values.studentId}/${uuidv4()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("homework_files")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          uploadedFiles.push({
            name: file.name,
            path: filePath,
            size: file.size,
            type: file.type,
          });
        }
      }

      // 创建作业记录
      const { error: submissionError } = await supabase
        .from("homework_submissions")
        .insert({
          homework_id: homework.id,
          student_id: values.studentId,
          status: values.status,
          notes: values.notes || null,
          files: uploadedFiles.length > 0 ? uploadedFiles : null,
          submitted_at: new Date().toISOString(),
        });

      if (submissionError) throw submissionError;

      toast.success("成功记录学生作业");
      onRecorded();
      onOpenChange(false);
    } catch (error) {
      console.error("记录作业失败:", error);
      toast.error("记录作业失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>记录学生作业</DialogTitle>
          <DialogDescription>
            为 {homework?.title} 添加学生作业记录
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>选择学生</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择学生" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.length > 0 ? (
                        <ScrollArea className="h-[200px]">
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} ({student.student_id})
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      ) : (
                        <div className="p-2 text-center text-muted-foreground">
                          班级内所有学生都已有记录
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>作业状态</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择状态" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="submitted">已记录</SelectItem>
                      <SelectItem value="graded">已评分</SelectItem>
                      <SelectItem value="returned">待修改</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="记录作业的完成情况、问题或备注..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>上传文件</Label>
              <div
                className={`border-2 border-dashed rounded-md p-6 text-center ${
                  isDragging ? "border-primary bg-primary/5" : "border-input"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    拖放文件到此处或
                    <label className="mx-1 cursor-pointer text-primary hover:underline">
                      浏览
                      <Input
                        type="file"
                        className="hidden"
                        multiple
                        onChange={handleFileSelect}
                      />
                    </label>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    支持任何类型的文件，最大50MB
                  </p>
                </div>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label>已选文件</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    提交中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    创建记录
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordStudentHomeworkDialog;
