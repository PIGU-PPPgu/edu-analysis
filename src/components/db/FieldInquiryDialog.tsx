import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Brain,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  aiFieldClassifier,
  FieldInquiryRequest,
  FieldClassificationResult,
} from "@/services/aiFieldClassifier";
import { FieldType } from "@/services/intelligentFileParser";

interface UnknownField {
  name: string;
  sampleValues: string[];
  description?: string;
}

interface FieldInquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unknownFields: UnknownField[];
  context?: {
    detectedSubjects: string[];
    fileStructure: "wide" | "long" | "mixed";
    otherFields: string[];
  };
  onComplete: (fieldMappings: Record<string, FieldType>) => void;
}

interface FieldInquiry {
  field: UnknownField;
  userDescription: string;
  classification?: FieldClassificationResult;
  isAnalyzing: boolean;
  selectedType?: FieldType;
}

export function FieldInquiryDialog({
  open,
  onOpenChange,
  unknownFields,
  context,
  onComplete,
}: FieldInquiryDialogProps) {
  const [inquiries, setInquiries] = useState<FieldInquiry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 初始化询问列表
  useEffect(() => {
    if (unknownFields.length > 0) {
      setInquiries(
        unknownFields.map((field) => ({
          field,
          userDescription: field.description || "",
          isAnalyzing: false,
        }))
      );
    }
  }, [unknownFields]);

  // 分析单个字段
  const analyzeField = async (index: number) => {
    const inquiry = inquiries[index];
    if (!inquiry.userDescription.trim()) {
      toast.error("请先描述字段的用途");
      return;
    }

    setInquiries((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isAnalyzing: true } : item
      )
    );

    try {
      const request: FieldInquiryRequest = {
        fieldName: inquiry.field.name,
        userDescription: inquiry.userDescription,
        sampleValues: inquiry.field.sampleValues,
        context,
      };

      const result = await aiFieldClassifier.classifyField(request);

      setInquiries((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                classification: result,
                selectedType: result.fieldType,
                isAnalyzing: false,
              }
            : item
        )
      );

      if (result.confidence > 0.7) {
        toast.success(
          `AI识别成功: ${aiFieldClassifier.getFieldTypeDescription(result.fieldType)}`
        );
      } else {
        toast.warning("AI识别置信度较低，请检查分析结果");
      }
    } catch (error) {
      console.error("字段分析失败:", error);
      toast.error("字段分析失败，请重试");

      setInquiries((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, isAnalyzing: false } : item
        )
      );
    }
  };

  // 批量分析所有字段
  const analyzeAllFields = async () => {
    const fieldsToAnalyze = inquiries.filter(
      (inquiry) => inquiry.userDescription.trim() && !inquiry.classification
    );

    if (fieldsToAnalyze.length === 0) {
      toast.error("请先为字段添加描述");
      return;
    }

    setIsProcessing(true);

    try {
      const requests: FieldInquiryRequest[] = fieldsToAnalyze.map(
        (inquiry) => ({
          fieldName: inquiry.field.name,
          userDescription: inquiry.userDescription,
          sampleValues: inquiry.field.sampleValues,
          context,
        })
      );

      const results = await aiFieldClassifier.classifyFields(requests);

      setInquiries((prev) =>
        prev.map((inquiry) => {
          const result = results[inquiry.field.name];
          if (result) {
            return {
              ...inquiry,
              classification: result,
              selectedType: result.fieldType,
              isAnalyzing: false,
            };
          }
          return inquiry;
        })
      );

      toast.success(`成功分析 ${Object.keys(results).length} 个字段`);
    } catch (error) {
      console.error("批量分析失败:", error);
      toast.error("批量分析失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  // 更新字段描述
  const updateDescription = (index: number, description: string) => {
    setInquiries((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, userDescription: description } : item
      )
    );
  };

  // 手动选择字段类型
  const selectFieldType = (index: number, fieldType: FieldType) => {
    setInquiries((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selectedType: fieldType } : item
      )
    );
  };

  // 完成字段映射
  const handleComplete = () => {
    const fieldMappings: Record<string, FieldType> = {};

    for (const inquiry of inquiries) {
      if (inquiry.selectedType) {
        fieldMappings[inquiry.field.name] = inquiry.selectedType;
      } else {
        fieldMappings[inquiry.field.name] = FieldType.UNKNOWN;
      }
    }

    onComplete(fieldMappings);
    onOpenChange(false);
  };

  // 获取置信度颜色
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (confidence >= 0.6)
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  // 获取置信度图标
  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-4 h-4" />;
    if (confidence >= 0.6) return <AlertCircle className="w-4 h-4" />;
    return <HelpCircle className="w-4 h-4" />;
  };

  const allFieldsProcessed = inquiries.every((inquiry) => inquiry.selectedType);
  const availableFieldTypes = aiFieldClassifier.getAllFieldTypes();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            智能字段识别
          </DialogTitle>
          <DialogDescription>
            系统检测到 {unknownFields.length}{" "}
            个未识别的字段。请描述这些字段的用途，AI将帮助您自动分类。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 批量操作按钮 */}
          <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>提示：</strong>
              描述字段用途后，AI会自动判断字段类型。例如："这是学生的数学成绩"
            </div>
            <Button
              onClick={analyzeAllFields}
              disabled={isProcessing}
              className="ml-4"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  批量分析
                </>
              )}
            </Button>
          </div>

          {/* 字段列表 */}
          <div className="grid gap-4">
            {inquiries.map((inquiry, index) => (
              <Card key={inquiry.field.name} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                      {inquiry.field.name}
                    </CardTitle>
                    {inquiry.classification && (
                      <Badge
                        className={`${getConfidenceColor(inquiry.classification.confidence)} border`}
                      >
                        {getConfidenceIcon(inquiry.classification.confidence)}
                        <span className="ml-1">
                          {Math.round(inquiry.classification.confidence * 100)}%
                        </span>
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    示例数据:{" "}
                    {inquiry.field.sampleValues.slice(0, 3).join(", ")}
                    {inquiry.field.sampleValues.length > 3 && "..."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* 用户描述输入 */}
                  <div className="space-y-2">
                    <Label htmlFor={`description-${index}`}>
                      请描述这个字段的用途{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Textarea
                        id={`description-${index}`}
                        placeholder="例如：这是学生的数学成绩分数"
                        value={inquiry.userDescription}
                        onChange={(e) =>
                          updateDescription(index, e.target.value)
                        }
                        className="flex-1"
                        rows={2}
                      />
                      <Button
                        onClick={() => analyzeField(index)}
                        disabled={
                          inquiry.isAnalyzing || !inquiry.userDescription.trim()
                        }
                        variant="outline"
                        size="sm"
                        className="self-start"
                      >
                        {inquiry.isAnalyzing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Brain className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* AI分析结果 */}
                  {inquiry.classification && (
                    <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          AI分析结果:
                        </span>
                        <Badge variant="outline">
                          {aiFieldClassifier.getFieldTypeDescription(
                            inquiry.classification.fieldType
                          )}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600">
                        {inquiry.classification.reasoning}
                      </p>

                      {/* 其他建议 */}
                      {inquiry.classification.suggestions.length > 1 && (
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-gray-500">
                            其他可能的类型:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {inquiry.classification.suggestions
                              .slice(1)
                              .map((suggestion, i) => (
                                <Button
                                  key={i}
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    selectFieldType(index, suggestion.type)
                                  }
                                  className="text-xs"
                                >
                                  {aiFieldClassifier.getFieldTypeDescription(
                                    suggestion.type
                                  )}
                                  <span className="ml-1 text-gray-400">
                                    ({Math.round(suggestion.confidence * 100)}%)
                                  </span>
                                </Button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 手动选择字段类型 */}
                  <div className="space-y-2">
                    <Label>或手动选择字段类型:</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableFieldTypes.map(({ type, description }) => (
                        <Button
                          key={type}
                          variant={
                            inquiry.selectedType === type
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => selectFieldType(index, type)}
                          className="text-xs justify-start"
                        >
                          {description}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* 当前选择 */}
                  {inquiry.selectedType && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <span className="text-sm text-green-700">
                        ✓ 已选择:{" "}
                        {aiFieldClassifier.getFieldTypeDescription(
                          inquiry.selectedType
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleComplete} disabled={!allFieldsProcessed}>
            {allFieldsProcessed
              ? "完成映射"
              : `还有 ${inquiries.filter((i) => !i.selectedType).length} 个字段未处理`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
