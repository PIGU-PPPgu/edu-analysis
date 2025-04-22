
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface HeaderMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  mappings: Record<string, string>;
  onUpdateMapping: (header: string, value: string) => void;
  onConfirm: () => void;
}

const standardFields = {
  studentId: ["学号", "id", "student_id", "studentid", "student id"],
  name: ["姓名", "name", "student_name"],
  className: ["班级", "class", "class_name"],
  grade: ["年级", "grade", "grade_level"],
  subject: ["科目", "subject", "course"],
  score: ["分数", "成绩", "score"],
  examDate: ["考试日期", "日期", "date", "exam_date"],
  examType: ["考试类型", "类型", "type", "exam_type"]
};

const HeaderMappingDialog: React.FC<HeaderMappingDialogProps> = ({
  open,
  onOpenChange,
  headers,
  mappings,
  onUpdateMapping,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>字段映射</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>文件中的字段名</TableHead>
                <TableHead>映射到系统字段</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((header) => (
                <TableRow key={header}>
                  <TableCell>{header}</TableCell>
                  <TableCell>
                    <Select
                      value={mappings[header] || ""}
                      onValueChange={(value) => onUpdateMapping(header, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择对应字段" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="studentId">学号</SelectItem>
                        <SelectItem value="name">姓名</SelectItem>
                        <SelectItem value="className">班级</SelectItem>
                        <SelectItem value="grade">年级</SelectItem>
                        <SelectItem value="subject">科目</SelectItem>
                        <SelectItem value="score">分数</SelectItem>
                        <SelectItem value="examDate">考试日期</SelectItem>
                        <SelectItem value="examType">考试类型</SelectItem>
                        <SelectItem value="ignore">忽略此字段</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onConfirm}>确认映射</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HeaderMappingDialog;
