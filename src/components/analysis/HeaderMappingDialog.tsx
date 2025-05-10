import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

interface HeaderMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  mappings: Record<string, string>;
  onUpdateMapping: (header: string, value: string) => void;
  onConfirm: () => void;
}

// 扩展标准字段，包含更多可能的映射字段
const standardFields = {
  student_id: ["学号", "id", "student_id", "studentid", "student id", "学生编号"],
  name: ["姓名", "name", "student_name", "学生姓名"],
  class_name: ["班级", "class", "class_name", "行政班级", "班级名称"],
  grade_level: ["年级", "grade", "grade_level", "学级"],
  subject: ["科目", "subject", "course", "学科"],
  score: ["分数", "成绩", "score", "总分", "总分分数"],
  total_score: ["总分", "total_score", "总分数", "总成绩"],
  exam_date: ["考试日期", "日期", "date", "exam_date", "测试日期"],
  exam_type: ["考试类型", "类型", "type", "exam_type", "测试类型"],
  exam_title: ["考试标题", "标题", "title", "exam_title", "测试名称"],
  grade: ["等级", "grade", "level", "评级", "总分等级", "层次"],
  rank_in_class: ["班级排名", "class_rank", "rank_in_class", "班排名", "班名", "总分班名"],
  rank_in_grade: ["年级排名", "grade_rank", "rank_in_grade", "校排名", "级名", "总分级名"]
};

const mandatorySystemFields = ['student_id', 'name', 'score', 'total_score'];

const HeaderMappingDialog: React.FC<HeaderMappingDialogProps> = ({
  open,
  onOpenChange,
  headers,
  mappings,
  onUpdateMapping,
  onConfirm
}) => {
  // 检查是否有必要字段未映射
  const hasMandatoryFields = () => {
    const mappedSystemFields = Object.values(mappings);
    const hasStudentId = mappedSystemFields.includes('student_id');
    const hasName = mappedSystemFields.includes('name');
    const hasScore = mappedSystemFields.includes('score') || mappedSystemFields.includes('total_score');
    return hasStudentId && hasName && hasScore;
  };

  const getDuplicateMappings = () => {
    const systemFieldCounts: Record<string, number> = {};
    Object.values(mappings).forEach(systemField => {
      if (systemField && systemField !== 'empty') { // "empty" 代表未映射，不计入重复
        systemFieldCounts[systemField] = (systemFieldCounts[systemField] || 0) + 1;
      }
    });
    return Object.entries(systemFieldCounts)
      .filter(([_, count]) => count > 1)
      .map(([systemField, _]) => standardFields[systemField as keyof typeof standardFields] || systemField);
  };

  const duplicateWarning = getDuplicateMappings();

  const handleUpdateMapping = (header: string, newSystemField: string) => {
    // 检查这个 newSystemField 是否已经被其他 header 映射了
    if (newSystemField && newSystemField !== 'empty') {
      for (const h in mappings) {
        if (h !== header && mappings[h] === newSystemField) {
          toast.warning(`字段 "${standardFields[newSystemField as keyof typeof standardFields] || newSystemField}" 已被 "${h}" 映射。`, {
            description: "请选择其他字段或先取消之前的映射。",
            duration: 4000,
          });
          return; // 阻止更新
        }
      }
    }
    onUpdateMapping(header, newSystemField);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span>字段映射</span>
            {hasMandatoryFields() ? (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                基本字段已映射
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                请映射必要字段
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            请将文件中的字段映射到系统标准字段，至少需要映射：学号、姓名和分数/总分。
            {duplicateWarning.length > 0 && (
              <span className="block text-red-500 mt-1 font-medium">
                <TriangleAlert className="h-4 w-4 inline-block mr-1" />
                警告：以下系统字段被重复映射: {duplicateWarning.join(", ")}。
                这可能导致数据覆盖，请检查您的映射。
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(60vh-50px)] border rounded-md">
          <Table className="w-full">
            <TableHeader className="sticky top-0 bg-white z-10">
              <TableRow>
                <TableHead className="w-[200px] bg-gray-50">文件中的字段名</TableHead>
                <TableHead className="w-[300px] bg-gray-50">映射到系统字段</TableHead>
                <TableHead className="w-[120px] bg-gray-50">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {headers.map((header) => (
                <TableRow key={header} className="border-b">
                  <TableCell className="font-medium whitespace-normal py-3">
                    <div className="max-w-[200px] break-words" title={header}>
                      {header}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Select
                      value={mappings[header] || "empty"} // 使用 "empty" 代表未映射
                      onValueChange={(value) => handleUpdateMapping(header, value === "empty" ? "" : value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择对应字段" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(standardFields).map(([key, value]) => (
                           <SelectItem key={key} value={key} disabled={key === 'empty' && !!mappings[header]}>
                             {value}
                           </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-3">
                    {mappings[header] && mappings[header] !== 'empty' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        已映射
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        未映射
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        
        <div className="flex justify-between gap-2 mt-4">
          <div className="text-sm text-gray-500">
            {!hasMandatoryFields() && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                请至少映射学号、姓名和分数字段
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button 
              onClick={onConfirm}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!hasMandatoryFields() || duplicateWarning.length > 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              确认映射并导入
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HeaderMappingDialog;
