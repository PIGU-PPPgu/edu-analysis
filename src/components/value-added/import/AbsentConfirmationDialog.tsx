"use client";

/**
 * 缺考确认对话框 - 横向表格布局
 * 一行显示一个学生的所有科目，避免列表过长
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ZeroScoreRecord {
  student_id: string;
  student_name: string;
  class_name: string;
  subject: string;
  score: number;
  grade_data_id?: number;
}

interface AbsentConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zeroScores: ZeroScoreRecord[];
  onConfirm: (absentRecords: ZeroScoreRecord[]) => Promise<void>;
}

// 学生维度的数据结构
interface StudentZeroScores {
  student_id: string;
  student_name: string;
  class_name: string;
  subjects: Map<string, ZeroScoreRecord>; // 科目名 -> 原始记录
}

// 支持的科目列表（固定顺序）
const ALL_SUBJECTS = [
  "语文",
  "数学",
  "英语",
  "物理",
  "化学",
  "生物",
  "政治",
  "历史",
  "地理",
];

export function AbsentConfirmationDialog({
  open,
  onOpenChange,
  zeroScores,
  onConfirm,
}: AbsentConfirmationDialogProps) {
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(
    new Set()
  );
  const [submitting, setSubmitting] = useState(false);

  // 转换数据：按学生分组
  const studentData = useMemo(() => {
    const studentMap = new Map<string, StudentZeroScores>();

    zeroScores.forEach((record) => {
      if (!studentMap.has(record.student_id)) {
        studentMap.set(record.student_id, {
          student_id: record.student_id,
          student_name: record.student_name,
          class_name: record.class_name,
          subjects: new Map(),
        });
      }
      const student = studentMap.get(record.student_id)!;
      student.subjects.set(record.subject, record);
    });

    return Array.from(studentMap.values()).sort((a, b) =>
      a.class_name.localeCompare(b.class_name)
    );
  }, [zeroScores]);

  // 获取实际出现的科目（用于表头）
  const presentSubjects = useMemo(() => {
    const subjectSet = new Set<string>();
    zeroScores.forEach((record) => subjectSet.add(record.subject));
    return ALL_SUBJECTS.filter((subject) => subjectSet.has(subject));
  }, [zeroScores]);

  // 生成唯一key
  const getRecordKey = (student_id: string, subject: string) =>
    `${student_id}_${subject}`;

  // 切换单个科目
  const handleToggleSubject = (student_id: string, subject: string) => {
    const key = getRecordKey(student_id, subject);
    const newSet = new Set(selectedRecords);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedRecords(newSet);
  };

  // 切换整个学生
  const handleToggleStudent = (student: StudentZeroScores) => {
    const studentKeys = Array.from(student.subjects.keys()).map((subject) =>
      getRecordKey(student.student_id, subject)
    );

    const allSelected = studentKeys.every((key) => selectedRecords.has(key));
    const newSet = new Set(selectedRecords);

    if (allSelected) {
      // 全部取消选择
      studentKeys.forEach((key) => newSet.delete(key));
    } else {
      // 全部选择
      studentKeys.forEach((key) => newSet.add(key));
    }

    setSelectedRecords(newSet);
  };

  // 检查学生是否全部选中
  const isStudentFullySelected = (student: StudentZeroScores) => {
    return Array.from(student.subjects.keys()).every((subject) =>
      selectedRecords.has(getRecordKey(student.student_id, subject))
    );
  };

  // 检查学生是否部分选中
  const isStudentPartiallySelected = (student: StudentZeroScores) => {
    const keys = Array.from(student.subjects.keys()).map((subject) =>
      getRecordKey(student.student_id, subject)
    );
    const selectedCount = keys.filter((key) => selectedRecords.has(key)).length;
    return selectedCount > 0 && selectedCount < keys.length;
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedRecords.size === zeroScores.length) {
      setSelectedRecords(new Set());
    } else {
      const allKeys = zeroScores.map((record) =>
        getRecordKey(record.student_id, record.subject)
      );
      setSelectedRecords(new Set(allKeys));
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const absentRecords = zeroScores.filter((record) =>
        selectedRecords.has(getRecordKey(record.student_id, record.subject))
      );

      await onConfirm(absentRecords);

      toast.success(`已标记 ${absentRecords.length} 条记录为缺考`);
      onOpenChange(false);
      setSelectedRecords(new Set());
    } catch (error) {
      console.error("标记缺考失败:", error);
      toast.error("标记缺考失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    setSelectedRecords(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            检测到0分成绩
          </DialogTitle>
          <DialogDescription>
            系统检测到 <strong>{studentData.length}</strong> 名学生共{" "}
            <strong>{zeroScores.length}</strong> 科次0分成绩记录。
            请确认哪些是缺考，哪些是真实成绩。
            <br />
            <span className="text-orange-600 text-sm">
              标记为缺考的学生将不会参与增值计算
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="text-sm">
              已选择 <strong>{selectedRecords.size}</strong> /{" "}
              {zeroScores.length} 科次标记为缺考
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedRecords.size === zeroScores.length ? "取消全选" : "全选"}
            </Button>
          </div>

          {/* 横向表格 */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">全选</TableHead>
                  <TableHead className="min-w-[100px]">班级</TableHead>
                  <TableHead className="min-w-[80px]">学号</TableHead>
                  <TableHead className="min-w-[80px]">姓名</TableHead>
                  {presentSubjects.map((subject) => (
                    <TableHead
                      key={subject}
                      className="text-center min-w-[70px]"
                    >
                      {subject}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentData.map((student) => {
                  const fullySelected = isStudentFullySelected(student);
                  const partiallySelected = isStudentPartiallySelected(student);

                  return (
                    <TableRow
                      key={student.student_id}
                      className={fullySelected ? "bg-orange-50" : ""}
                    >
                      {/* 学生全选复选框 */}
                      <TableCell>
                        <Checkbox
                          checked={fullySelected}
                          // @ts-ignore - indeterminate is a valid prop
                          indeterminate={partiallySelected}
                          onCheckedChange={() => handleToggleStudent(student)}
                        />
                      </TableCell>

                      {/* 基本信息 */}
                      <TableCell className="text-sm">
                        {student.class_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.student_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.student_name}
                      </TableCell>

                      {/* 各科目 */}
                      {presentSubjects.map((subject) => {
                        const record = student.subjects.get(subject);
                        if (!record) {
                          return (
                            <TableCell
                              key={subject}
                              className="text-center text-gray-400"
                            >
                              -
                            </TableCell>
                          );
                        }

                        const isSelected = selectedRecords.has(
                          getRecordKey(student.student_id, subject)
                        );

                        return (
                          <TableCell key={subject} className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  handleToggleSubject(
                                    student.student_id,
                                    subject
                                  )
                                }
                              />
                              <Badge
                                variant={isSelected ? "destructive" : "outline"}
                                className="text-xs"
                              >
                                0
                              </Badge>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 说明 */}
          <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded">
            <div>
              <strong>使用说明</strong>：
            </div>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>
                勾选"全选"列的复选框，可以一次性标记该学生的所有0分科目为缺考
              </li>
              <li>勾选科目列的复选框，可以单独标记该科目为缺考</li>
              <li>如果学生因病假、事假等原因未参加考试，请勾选标记为"缺考"</li>
              <li>
                如果学生参加了考试但得分为0，请<strong>不要勾选</strong>
                ，保留为真实成绩
              </li>
              <li>标记为缺考的学生在增值计算时会被自动排除</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip} disabled={submitting}>
            跳过（全部视为真实成绩）
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting || selectedRecords.size === 0}
          >
            {submitting
              ? "标记中..."
              : `确认标记 ${selectedRecords.size} 条为缺考`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
