/**
 * UnknownFieldsBlockDialog - 未识别字段强制确认对话框
 *
 * 当检测到未识别字段时，强制中止导入流程并要求用户处理
 * 用户必须明确：
 * 1. 手动映射每个未识别字段
 * 2. 或忽略该字段
 * 3. 或取消整个导入
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, HelpCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// 标准字段选项
const STANDARD_FIELD_OPTIONS = [
  { value: "student_id", label: "学号", icon: "👤" },
  { value: "name", label: "姓名", icon: "📝" },
  { value: "class_name", label: "班级", icon: "🏫" },
  { value: "chinese_score", label: "语文分数", icon: "📚" },
  { value: "math_score", label: "数学分数", icon: "🔢" },
  { value: "english_score", label: "英语分数", icon: "🔤" },
  { value: "physics_score", label: "物理分数", icon: "⚛️" },
  { value: "chemistry_score", label: "化学分数", icon: "🧪" },
  { value: "biology_score", label: "生物分数", icon: "🧬" },
  { value: "politics_score", label: "政治分数", icon: "📖" },
  { value: "history_score", label: "历史分数", icon: "📜" },
  { value: "geography_score", label: "地理分数", icon: "🌍" },
  { value: "total_score", label: "总分", icon: "💯" },
  { value: "chinese_grade", label: "语文等级", icon: "🅰️" },
  { value: "math_grade", label: "数学等级", icon: "🅰️" },
  { value: "english_grade", label: "英语等级", icon: "🅰️" },
  { value: "rank_in_class", label: "班级排名", icon: "🏆" },
  { value: "rank_in_grade", label: "年级排名", icon: "🥇" },
  { value: "rank_in_school", label: "学校排名", icon: "🎖️" },
  { value: "ignore", label: "忽略此字段", icon: "🚫" },
];

interface UnknownField {
  name: string;
  sampleValues: string[];
}

interface UnknownFieldsBlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unknownFields: UnknownField[];
  onConfirm: (mappings: Record<string, string>) => void;
  onCancel: () => void;
}

export const UnknownFieldsBlockDialog: React.FC<
  UnknownFieldsBlockDialogProps
> = ({ open, onOpenChange, unknownFields, onConfirm, onCancel }) => {
  // 字段映射状态 (fieldName -> standardField)
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(
    {}
  );

  // 计算已处理的字段数量
  const handledCount = Object.keys(fieldMappings).length;
  const totalCount = unknownFields.length;
  const allHandled = handledCount === totalCount;

  // 处理字段映射选择
  const handleMappingChange = (fieldName: string, mappedValue: string) => {
    setFieldMappings((prev) => ({
      ...prev,
      [fieldName]: mappedValue,
    }));
  };

  // 确认映射
  const handleConfirm = () => {
    if (!allHandled) {
      return;
    }

    // 过滤掉"忽略"的字段
    const validMappings: Record<string, string> = {};
    Object.entries(fieldMappings).forEach(([fieldName, mappedValue]) => {
      if (mappedValue !== "ignore") {
        validMappings[fieldName] = mappedValue;
      }
    });

    onConfirm(validMappings);
  };

  // 取消导入
  const handleCancel = () => {
    onOpenChange(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            检测到未识别的字段
          </DialogTitle>
          <DialogDescription className="text-base">
            为了确保数据正确导入，请为以下未识别的字段指定含义。
            <br />
            您可以将它们映射到标准字段，或选择忽略。
          </DialogDescription>
        </DialogHeader>

        {/* 进度提示 */}
        <Alert
          className={cn(allHandled ? "border-green-500" : "border-amber-500")}
        >
          <AlertDescription className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {allHandled ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <HelpCircle className="h-5 w-5 text-amber-500" />
              )}
              <span className="font-medium">
                已处理 {handledCount} / {totalCount} 个字段
              </span>
            </div>
            {!allHandled && (
              <Badge variant="outline" className="text-amber-600">
                请处理所有字段后才能继续
              </Badge>
            )}
          </AlertDescription>
        </Alert>

        {/* 未识别字段列表 */}
        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {unknownFields.length === 0 ? (
              <Alert>
                <AlertDescription className="text-center text-gray-600">
                  没有未识别的字段
                </AlertDescription>
              </Alert>
            ) : (
              unknownFields.map((field, index) => {
                const isMapped = !!fieldMappings[field.name];
                const mappedValue = fieldMappings[field.name];

                return (
                  <div
                    key={field.name}
                    className={cn(
                      "p-4 border rounded-lg transition-colors",
                      isMapped
                        ? "border-green-200 bg-green-50/50"
                        : "border-amber-200 bg-amber-50/50"
                    )}
                  >
                    {/* 字段名和状态 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono">
                            {field.name}
                          </Badge>
                          {isMapped && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              已处理
                            </Badge>
                          )}
                        </div>

                        {/* 样本数据 */}
                        {field.sampleValues.length > 0 && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">样本数据：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {field.sampleValues.map((sample, idx) => (
                                <code
                                  key={idx}
                                  className="px-2 py-1 bg-white border rounded text-xs"
                                >
                                  {sample}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 映射选择 */}
                    <div className="mt-3">
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        请选择此字段的含义：
                      </label>
                      <Select
                        value={mappedValue}
                        onValueChange={(value) =>
                          handleMappingChange(field.name, value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="请选择..." />
                        </SelectTrigger>
                        <SelectContent>
                          {STANDARD_FIELD_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <span>{option.icon}</span>
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* 操作按钮 */}
        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            取消导入
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!allHandled}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            确认并继续
            {!allHandled && ` (${totalCount - handledCount}个未处理)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnknownFieldsBlockDialog;
