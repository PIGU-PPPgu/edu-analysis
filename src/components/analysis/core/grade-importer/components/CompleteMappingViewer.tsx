/**
 *  CompleteMappingViewer - 完整映射结果查看器
 *
 * 显示所有映射结果，包括AI成功映射和用户手动映射
 * 解决用户无法看到AI映射结果的问题
 */

import React, { useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  AlertTriangle,
  Settings,
  Eye,
  Sparkles,
  Brain,
  User,
  ArrowRight,
  Edit,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { MappingConfig, AIAnalysisResult } from "../types";

interface CompleteMappingViewerProps {
  headers: string[];
  mappingConfig: MappingConfig;
  aiAnalysis?: AIAnalysisResult;
  onMappingUpdate: (mapping: MappingConfig) => void;
  onConfirm: () => void;
  className?: string;
}

interface MappingInfo {
  originalField: string;
  mappedField: string;
  dataType: string;
  confidence: number;
  source: "AI" | "USER" | "SUGGESTED";
  isEditable: boolean;
}

// 预定义的字段选项
const AVAILABLE_FIELDS = {
  student_info: {
    label: "学生信息",
    fields: {
      name: "学生姓名",
      student_id: "学号",
      class_name: "班级",
      grade_level: "年级",
    },
  },
  scores: {
    label: "学科成绩",
    fields: {
      chinese_score: "语文成绩",
      math_score: "数学成绩",
      english_score: "英语成绩",
      physics_score: "物理成绩",
      chemistry_score: "化学成绩",
      biology_score: "生物成绩",
      politics_score: "政治成绩",
      history_score: "历史成绩",
      geography_score: "地理成绩",
      total_score: "总分",
    },
  },
  rankings: {
    label: "排名信息",
    fields: {
      rank_in_class: "班级排名",
      rank_in_grade: "年级排名",
      rank_in_school: "全校排名",
    },
  },
  grades: {
    label: "等级信息",
    fields: {
      original_grade: "成绩等级",
      computed_grade: "计算等级",
    },
  },
};

export default function CompleteMappingViewer({
  headers,
  mappingConfig,
  aiAnalysis,
  onMappingUpdate,
  onConfirm,
  className,
}: CompleteMappingViewerProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [localMappings, setLocalMappings] = useState(
    mappingConfig.fieldMappings || {}
  );

  // 分析映射结果
  const mappingAnalysis = useMemo(() => {
    const mappings: MappingInfo[] = [];
    const unmappedHeaders: string[] = [];

    headers.forEach((header) => {
      const mappedField = localMappings[header];

      if (mappedField) {
        // 判断映射来源
        let source: "AI" | "USER" | "SUGGESTED" = "USER";
        let confidence = 0.5;

        // 从AI分析中查找置信度
        if (aiAnalysis?.mappings) {
          const aiMapping = aiAnalysis.mappings.find(
            (m) => m.originalField === header && m.mappedField === mappedField
          );
          if (aiMapping) {
            source = "AI";
            confidence = aiMapping.confidence || 0.9;
          }
        }

        mappings.push({
          originalField: header,
          mappedField,
          dataType: getFieldDataType(mappedField),
          confidence,
          source,
          isEditable: true,
        });
      } else {
        unmappedHeaders.push(header);
      }
    });

    return { mappings, unmappedHeaders };
  }, [headers, localMappings, aiAnalysis]);

  // 获取字段数据类型
  const getFieldDataType = (mappedField: string): string => {
    for (const [category, config] of Object.entries(AVAILABLE_FIELDS)) {
      if (Object.keys(config.fields).includes(mappedField)) {
        return category;
      }
    }
    return "unknown";
  };

  // 获取字段显示名称
  const getFieldDisplayName = (mappedField: string): string => {
    for (const config of Object.values(AVAILABLE_FIELDS)) {
      if (config.fields[mappedField as keyof typeof config.fields]) {
        return config.fields[mappedField as keyof typeof config.fields];
      }
    }
    return mappedField;
  };

  // 更新映射
  const updateMapping = (originalField: string, newMappedField: string) => {
    const updatedMappings = {
      ...localMappings,
      [originalField]: newMappedField,
    };
    setLocalMappings(updatedMappings);
    onMappingUpdate({
      ...mappingConfig,
      fieldMappings: updatedMappings,
    });
  };

  // 删除映射
  const removeMapping = (originalField: string) => {
    const updatedMappings = { ...localMappings };
    delete updatedMappings[originalField];
    setLocalMappings(updatedMappings);
    onMappingUpdate({
      ...mappingConfig,
      fieldMappings: updatedMappings,
    });
  };

  // 应用AI建议
  const applyAISuggestion = (originalField: string) => {
    if (!aiAnalysis?.mappings) return;

    const aiMapping = aiAnalysis.mappings.find(
      (m) => m.originalField === originalField
    );
    if (aiMapping) {
      updateMapping(originalField, aiMapping.mappedField);
      toast.success(
        `已应用AI建议：${originalField} → ${getFieldDisplayName(aiMapping.mappedField)}`
      );
    }
  };

  const totalFields = headers.length;
  const mappedFields = mappingAnalysis.mappings.length;
  const mappingProgress =
    totalFields > 0 ? (mappedFields / totalFields) * 100 : 0;
  const aiConfidence = aiAnalysis?.confidence || 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* 映射概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            字段映射结果总览
          </CardTitle>
          <CardDescription>
            查看所有字段的映射状态，包括AI自动识别和手动确认的字段
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* 映射进度 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  映射进度
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {mappedFields} / {totalFields}
              </div>
              <Progress value={mappingProgress} className="h-2" />
            </div>

            {/* AI置信度 */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">
                  AI置信度
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {Math.round(aiConfidence * 100)}%
              </div>
              <Progress value={aiConfidence * 100} className="h-2" />
            </div>

            {/* 待处理字段 */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">
                  待处理
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {mappingAnalysis.unmappedHeaders.length}
              </div>
              <div className="text-xs text-orange-700">个字段需要确认</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="mapped" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mapped" className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            已映射字段 ({mappingAnalysis.mappings.length})
          </TabsTrigger>
          <TabsTrigger value="unmapped" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            未映射字段 ({mappingAnalysis.unmappedHeaders.length})
          </TabsTrigger>
        </TabsList>

        {/* 已映射字段 */}
        <TabsContent value="mapped" className="space-y-4">
          {mappingAnalysis.mappings.length === 0 ? (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                还没有任何字段被映射。请切换到"未映射字段"标签页开始字段映射。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {mappingAnalysis.mappings.map((mapping, index) => (
                <Card key={index} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              mapping.source === "AI" ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {mapping.source === "AI" ? (
                              <>
                                <Brain className="w-3 h-3 mr-1" />
                                AI识别
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3 mr-1" />
                                手动设置
                              </>
                            )}
                          </Badge>
                          {mapping.source === "AI" && (
                            <Badge variant="outline" className="text-xs">
                              置信度 {Math.round(mapping.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {mapping.originalField}
                          </span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="text-green-600 font-medium">
                            {getFieldDisplayName(mapping.mappedField)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {getFieldDataType(mapping.mappedField)} 类型
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {editingField === mapping.originalField ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={mapping.mappedField}
                              onValueChange={(value) => {
                                updateMapping(mapping.originalField, value);
                                setEditingField(null);
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(AVAILABLE_FIELDS).map(
                                  ([category, config]) => (
                                    <div key={category}>
                                      <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                                        {config.label}
                                      </div>
                                      {Object.entries(config.fields).map(
                                        ([key, label]) => (
                                          <SelectItem key={key} value={key}>
                                            {label}
                                          </SelectItem>
                                        )
                                      )}
                                    </div>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingField(null)}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setEditingField(mapping.originalField)
                              }
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                removeMapping(mapping.originalField)
                              }
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 未映射字段 */}
        <TabsContent value="unmapped" className="space-y-4">
          {mappingAnalysis.unmappedHeaders.length === 0 ? (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>
                太棒了！所有字段都已完成映射。您可以继续下一步数据验证。
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {mappingAnalysis.unmappedHeaders.map((header, index) => {
                const aiSuggestion = aiAnalysis?.mappings?.find(
                  (m) => m.originalField === header
                );

                return (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 mb-1">
                            {header}
                          </div>
                          {aiSuggestion && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Sparkles className="w-3 h-3 text-purple-500" />
                              AI建议:{" "}
                              {getFieldDisplayName(aiSuggestion.mappedField)}
                              <Badge variant="outline" className="text-xs">
                                {Math.round(aiSuggestion.confidence * 100)}%
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {aiSuggestion && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applyAISuggestion(header)}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              <Sparkles className="w-4 h-4 mr-1" />
                              应用AI建议
                            </Button>
                          )}
                          <Select
                            onValueChange={(value) =>
                              updateMapping(header, value)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="选择字段类型" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(AVAILABLE_FIELDS).map(
                                ([category, config]) => (
                                  <div key={category}>
                                    <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                                      {config.label}
                                    </div>
                                    {Object.entries(config.fields).map(
                                      ([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                          {label}
                                        </SelectItem>
                                      )
                                    )}
                                  </div>
                                )
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-gray-600">
          映射完成度: {mappedFields}/{totalFields} 字段
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocalMappings({})}>
            重置所有映射
          </Button>
          <Button
            onClick={onConfirm}
            disabled={mappingAnalysis.unmappedHeaders.length > 0}
            className="bg-green-600 hover:bg-green-700"
          >
            确认映射并继续
          </Button>
        </div>
      </div>
    </div>
  );
}
