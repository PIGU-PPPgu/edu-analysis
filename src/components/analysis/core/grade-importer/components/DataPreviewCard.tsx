/**
 *  DataPreviewCard - 用户友好的数据预览卡片
 *
 * 将技术化的"字段映射"转换为用户友好的"数据确认"界面
 * 让老师用户能够直观地看到系统识别了什么数据
 *
 * 使用现有的类型接口，确保与系统完全兼容
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  BookOpen,
  Trophy,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 使用现有的类型定义
import type {
  AIAnalysisResult,
  MappingConfig,
  SYSTEM_FIELDS,
  ExamInfo,
} from "../types";

// 数据类型定义 - 基于现有接口扩展
export interface DataCategory {
  type: "student_info" | "subject_scores" | "rankings" | "metadata" | "other";
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  fields: IdentifiedField[];
  confidence: number;
  isComplete: boolean;
}

export interface IdentifiedField {
  originalName: string;
  displayName: string;
  mappedTo: string;
  confidence: number;
  sampleValues: string[];
  isRequired: boolean;
  isConfirmed: boolean;
  subject?: string; // 与现有FieldMapping兼容
  dataType?:
    | "score"
    | "grade"
    | "rank_class"
    | "rank_school"
    | "rank_grade"
    | "student_info";
}

export interface DataPreviewProps {
  headers: string[];
  sampleData: any[];
  aiAnalysis?: AIAnalysisResult; // 使用现有的AIAnalysisResult接口
  onDataConfirmed: (confirmedMappings: MappingConfig) => void; // 使用现有的MappingConfig
  onNeedHelp: (missingData: string[]) => void;
  onShowAdvanced: () => void;
}

const DataPreviewCard: React.FC<DataPreviewProps> = ({
  headers,
  sampleData,
  aiAnalysis,
  onDataConfirmed,
  onNeedHelp,
  onShowAdvanced,
}) => {
  const [userFeedback, setUserFeedback] = useState<Record<string, boolean>>({});
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // 将识别的字段分类整理
  const categorizeFields = (): DataCategory[] => {
    const categories: DataCategory[] = [
      {
        type: "student_info",
        title: "学生信息",
        description: "用于识别学生身份的基本信息",
        icon: Users,
        fields: [],
        confidence: 0,
        isComplete: false,
      },
      {
        type: "subject_scores",
        title: "科目成绩",
        description: "各个科目的分数和等级",
        icon: BookOpen,
        fields: [],
        confidence: 0,
        isComplete: false,
      },
      {
        type: "rankings",
        title: "排名信息",
        description: "班级、年级或学校排名",
        icon: Trophy,
        fields: [],
        confidence: 0,
        isComplete: false,
      },
      {
        type: "metadata",
        title: "考试信息",
        description: "考试名称、日期、类型等信息",
        icon: Eye,
        fields: [],
        confidence: 0,
        isComplete: false,
      },
      {
        type: "other",
        title: "其他数据",
        description: "系统识别但分类不确定的数据",
        icon: HelpCircle,
        fields: [],
        confidence: 0,
        isComplete: false,
      },
    ];

    // 基于AI分析结果分类字段
    if (aiAnalysis?.fieldMappings) {
      Object.entries(aiAnalysis.fieldMappings).forEach(
        ([originalField, mappedField]) => {
          const sampleValues = sampleData
            .slice(0, 3)
            .map((row) => row[originalField])
            .filter(Boolean);

          const field: IdentifiedField = {
            originalName: originalField,
            displayName: getDisplayName(mappedField, originalField),
            mappedTo: mappedField,
            confidence: aiAnalysis.confidence || 0.7,
            sampleValues: sampleValues.map((v) => String(v)),
            isRequired: isRequiredField(mappedField),
            isConfirmed: false,
          };

          // 根据字段类型分类
          const category = categorizeFieldByType(mappedField);
          const targetCategory = categories.find((c) => c.type === category);
          if (targetCategory) {
            targetCategory.fields.push(field);
          }
        }
      );
    }

    // 计算每个分类的完整度和置信度
    categories.forEach((category) => {
      if (category.fields.length > 0) {
        category.confidence =
          category.fields.reduce((sum, field) => sum + field.confidence, 0) /
          category.fields.length;
        category.isComplete =
          category.fields.some((f) => f.isRequired) ||
          category.fields.length >= getExpectedFieldCount(category.type);
      }
    });

    return categories.filter((c) => c.fields.length > 0);
  };

  // 获取字段显示名称 - 使用现有的SYSTEM_FIELDS
  const getDisplayName = (
    mappedField: string,
    originalField: string
  ): string => {
    // 从types文件导入的SYSTEM_FIELDS
    const systemFields = {
      student_id: "学号",
      name: "姓名",
      class_name: "班级",
      grade_level: "年级",
      subject: "科目",
      exam_date: "考试日期",
      exam_type: "考试类型",
      exam_title: "考试标题",
      exam_scope: "考试范围",
      score: "分数/成绩",
      total_score: "总分",
      subject_total_score: "满分/科目满分",
      original_grade: "等级/评级",
      computed_grade: "计算等级",
      grade: "旧等级",
      rank_in_class: "班级排名",
      rank_in_grade: "年级排名/校排名",
      percentile: "百分位数",
      z_score: "标准分",
    };

    return systemFields[mappedField] || originalField;
  };

  // 判断是否为必需字段
  const isRequiredField = (mappedField: string): boolean => {
    const requiredFields = ["name", "student_id", "class_name"];
    return requiredFields.includes(mappedField);
  };

  // 根据字段类型分类
  const categorizeFieldByType = (mappedField: any): DataCategory["type"] => {
    const fieldStr = String(mappedField || "");

    if (
      ["student_id", "name", "class_name", "grade_level"].includes(fieldStr)
    ) {
      return "student_info";
    }
    if (fieldStr.includes("score") || fieldStr.includes("grade")) {
      return "subject_scores";
    }
    if (fieldStr.includes("rank")) {
      return "rankings";
    }
    if (["exam_title", "exam_date", "exam_type"].includes(fieldStr)) {
      return "metadata";
    }
    return "other";
  };

  // 获取期望的字段数量
  const getExpectedFieldCount = (type: DataCategory["type"]): number => {
    switch (type) {
      case "student_info":
        return 2; // 至少需要姓名+学号或班级
      case "subject_scores":
        return 3; // 至少几个主要科目
      case "rankings":
        return 1; // 至少一个排名
      default:
        return 1;
    }
  };

  // 获取置信度显示文本
  const getConfidenceText = (
    confidence: number
  ): { text: string; color: string } => {
    if (confidence >= 0.9) return { text: "识别准确", color: "text-green-600" };
    if (confidence >= 0.7) return { text: "识别良好", color: "text-blue-600" };
    if (confidence >= 0.5)
      return { text: "需要确认", color: "text-orange-600" };
    return { text: "不确定", color: "text-red-600" };
  };

  // 处理用户反馈
  const handleFieldFeedback = (fieldKey: string, isCorrect: boolean) => {
    setUserFeedback((prev) => ({
      ...prev,
      [fieldKey]: isCorrect,
    }));
  };

  // 切换详情显示
  const toggleDetails = (categoryType: string) => {
    setShowDetails((prev) => ({
      ...prev,
      [categoryType]: !prev[categoryType],
    }));
  };

  // 确认数据 - 返回完整的MappingConfig
  const handleConfirmData = () => {
    const fieldMappings: Record<string, string> = {};
    const customFields: Record<string, string> = {};

    categorizeFields().forEach((category) => {
      category.fields.forEach((field) => {
        const feedbackKey = `${category.type}_${field.originalName}`;
        if (userFeedback[feedbackKey] !== false) {
          // 如果用户没有明确反对
          fieldMappings[field.originalName] = field.mappedTo;

          // 检查是否为自定义字段（包含科目相关的字段）
          if (
            field.subject ||
            !getDisplayName(field.mappedTo, field.originalName).includes(
              field.mappedTo
            )
          ) {
            customFields[field.mappedTo] = field.displayName;
          }
        }
      });
    });

    // 构建完整的MappingConfig对象
    const mappingConfig: MappingConfig = {
      fieldMappings,
      customFields,
      aiSuggestions: aiAnalysis
        ? {
            confidence: aiAnalysis.confidence,
            suggestions: aiAnalysis.fieldMappings,
            issues: aiAnalysis.processing?.issues || [],
          }
        : undefined,
      wideTableFormat:
        aiAnalysis?.dataStructure === "wide"
          ? {
              detected: true,
              subjects: aiAnalysis.subjects || [],
              confidence: aiAnalysis.confidence,
            }
          : undefined,
    };

    onDataConfirmed(mappingConfig);
  };

  // 请求帮助
  const handleNeedHelp = () => {
    const problematicFields = Object.entries(userFeedback)
      .filter(([_, isCorrect]) => !isCorrect)
      .map(([key, _]) => key);

    onNeedHelp(problematicFields);
  };

  const categories = categorizeFields();
  const overallConfidence =
    categories.length > 0
      ? categories.reduce((sum, cat) => sum + cat.confidence, 0) /
        categories.length
      : 0;

  return (
    <div className="space-y-6">
      {/* 整体分析结果 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            智能数据识别结果
          </CardTitle>
          <CardDescription>
            系统已智能识别您的数据，请确认这些信息是否正确
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">识别质量:</span>
                <Badge
                  variant={
                    overallConfidence >= 0.8
                      ? "default"
                      : overallConfidence >= 0.6
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-xs"
                >
                  {getConfidenceText(overallConfidence).text}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                识别到 {categories.length} 类数据，共{" "}
                {categories.reduce((sum, cat) => sum + cat.fields.length, 0)}{" "}
                个字段
              </p>
            </div>

            {aiAnalysis?.examInfo && (
              <div className="text-right text-sm">
                <p className="font-medium">{aiAnalysis.examInfo.title}</p>
                <p className="text-gray-600">{aiAnalysis.examInfo.date}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 分类数据展示 */}
      <div className="grid gap-4">
        {categories.map((category) => {
          const IconComponent = category.icon;
          const confidenceInfo = getConfidenceText(category.confidence);

          return (
            <Card key={category.type} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        category.isComplete
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-600"
                      )}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {category.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        category.confidence >= 0.8 ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {confidenceInfo.text}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDetails(category.type)}
                    >
                      {showDetails[category.type] ? "收起" : "详情"}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* 字段预览 */}
                <div className="space-y-2">
                  {category.fields
                    .slice(0, showDetails[category.type] ? undefined : 3)
                    .map((field, index) => {
                      const feedbackKey = `${category.type}_${field.originalName}`;
                      const userConfirmed = userFeedback[feedbackKey];

                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-between p-3 border rounded-lg",
                            userConfirmed === true
                              ? "border-green-200 bg-green-50"
                              : userConfirmed === false
                                ? "border-red-200 bg-red-50"
                                : "border-gray-200"
                          )}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {field.displayName}
                              </span>
                              {field.isRequired && (
                                <Badge variant="outline" className="text-xs">
                                  必需
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              <span>来源: {field.originalName}</span>
                              {field.sampleValues.length > 0 && (
                                <span className="ml-2">
                                  示例:{" "}
                                  {field.sampleValues.slice(0, 2).join(", ")}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 ml-4">
                            <Button
                              variant={
                                userConfirmed === true ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleFieldFeedback(feedbackKey, true)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant={
                                userConfirmed === false
                                  ? "destructive"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                handleFieldFeedback(feedbackKey, false)
                              }
                              className="h-8 w-8 p-0"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                  {!showDetails[category.type] &&
                    category.fields.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDetails(category.type)}
                        className="w-full"
                      >
                        查看全部 {category.fields.length} 个字段
                      </Button>
                    )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 缺失数据提醒 */}
      {categories.some((cat) => !cat.isComplete) && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">可能缺少一些常用数据</p>
              <p className="text-sm">
                如果您需要查看总分、等级或其他数据，但上面没有显示，请点击"需要帮助"告诉我们。
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNeedHelp}>
            需要帮助
          </Button>
          <Button variant="outline" onClick={onShowAdvanced}>
            <Settings className="w-4 h-4 mr-2" />
            高级设置
          </Button>
        </div>

        <Button
          onClick={handleConfirmData}
          className="px-6"
          disabled={categories.length === 0}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          确认数据，继续导入
        </Button>
      </div>
    </div>
  );
};

export default DataPreviewCard;
