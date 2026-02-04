"use client";

/**
 * 缺考确认对话框
 * 检测到0分时，询问用户是否为缺考
 */

import { useState } from "react";
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

  // 生成唯一key
  const getRecordKey = (record: ZeroScoreRecord) =>
    `${record.student_id}_${record.subject}`;

  const handleToggle = (record: ZeroScoreRecord) => {
    const key = getRecordKey(record);
    const newSet = new Set(selectedRecords);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedRecords(newSet);
  };

  const handleSelectAll = () => {
    if (selectedRecords.size === zeroScores.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(zeroScores.map(getRecordKey)));
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const absentRecords = zeroScores.filter((record) =>
        selectedRecords.has(getRecordKey(record))
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            检测到0分成绩
          </DialogTitle>
          <DialogDescription>
            系统检测到 <strong>{zeroScores.length}</strong> 条0分成绩记录。
            请确认哪些是缺考，哪些是真实成绩。
            <br />
            <span className="text-orange-600 text-sm">
              ⚠️ 标记为缺考的学生将不会参与增值计算
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 统计信息 */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="text-sm">
              已选择 <strong>{selectedRecords.size}</strong> /{" "}
              {zeroScores.length} 条记录标记为缺考
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedRecords.size === zeroScores.length ? "取消全选" : "全选"}
            </Button>
          </div>

          {/* 数据表格 */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">缺考</TableHead>
                  <TableHead>学号</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>班级</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>分数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zeroScores.map((record) => {
                  const key = getRecordKey(record);
                  const isSelected = selectedRecords.has(key);

                  return (
                    <TableRow
                      key={key}
                      className={isSelected ? "bg-orange-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(record)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.student_id}
                      </TableCell>
                      <TableCell>{record.student_name}</TableCell>
                      <TableCell>{record.class_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.subject}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{record.score}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* 说明 */}
          <div className="text-xs text-gray-500 space-y-1 p-3 bg-gray-50 rounded">
            <div>
              💡 <strong>建议</strong>：
            </div>
            <ul className="list-disc list-inside ml-2 space-y-1">
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
