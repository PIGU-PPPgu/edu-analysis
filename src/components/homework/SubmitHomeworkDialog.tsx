
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { FileUp } from "lucide-react";
import { toast } from "sonner";

// Define a simple type for file info that won't cause recursive type issues
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
  };
  onSubmitted: () => void;
}

const SubmitHomeworkDialog: React.FC<SubmitHomeworkDialogProps> = ({
  open,
  onOpenChange,
  homework,
  onSubmitted
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('student_id')
        .eq('user_id', userData.user?.id)
        .single();

      if (studentError) throw studentError;

      // Create an array to store uploaded file info
      const uploadedFileInfo: FileInfo[] = [];
      
      // Process each file
      for (const file of files) {
        const fileExt = file.name.split('.').pop() || '';
        const fileName = `${homework.id}/${userData.user?.id}/${Date.now()}.${fileExt}`;
        
        // Upload the file to storage
        const { error: uploadError } = await supabase.storage
          .from('homework_files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        // Add file info to our array after successful upload
        uploadedFileInfo.push({
          name: file.name,
          path: fileName,
          type: file.type,
          size: file.size
        });
      }

      // Create submission record with files data
      const { error: submissionError } = await supabase
        .from('homework_submissions')
        .insert({
          homework_id: homework.id,
          student_id: studentData.student_id,
          files: uploadedFileInfo,
          notes: notes.trim() ? notes : null,
          status: 'submitted'
        });

      if (submissionError) throw submissionError;

      toast.success('作业提交成功');
      onSubmitted();
      onOpenChange(false);
      setFiles([]);
      setNotes('');
    } catch (error) {
      console.error('提交作业失败:', error);
      toast.error('提交作业失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>提交作业 - {homework.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">上传文件</Label>
            <div className="border-2 border-dashed rounded-md p-4 text-center">
              <input
                id="files"
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Label htmlFor="files" className="cursor-pointer">
                <FileUp className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm text-gray-600">
                  点击或拖拽文件上传
                </span>
              </Label>
            </div>
            {files.length > 0 && (
              <ul className="mt-2 text-sm">
                {files.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">备注说明</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="可以添加一些说明..."
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? '提交中...' : '提交作业'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitHomeworkDialog;
