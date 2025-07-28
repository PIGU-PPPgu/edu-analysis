import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Filter,
  X,
  Plus,
  Save,
  Clock,
  Star,
  ChevronDown,
  Search,
  Trash2,
  Edit,
  RotateCcw,
  Calendar as CalendarIcon,
  Hash,
  Type,
  ToggleLeft,
  Sparkles,
  Target,
  Bookmark,
} from "lucide-react";
import { format } from "date-fns";

// Positivus设计配色
const POSITIVUS_COLORS = {
  primary: "#B9FF66",
  secondary: "#191A23",
  accent: "#F7931E",
  danger: "#FF6B6B",
  purple: "#9C88FF",
  white: "#FFFFFF",
};

// 筛选器类型定义
export interface FilterCondition {
  id: string;
  field: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "greaterThan"
    | "lessThan"
    | "between"
    | "in"
    | "notIn";
  value: any;
  label?: string;
  type: "text" | "number" | "date" | "select" | "boolean";
}

export interface FilterTemplate {
  id: string;
  name: string;
  description?: string;
  conditions: FilterCondition[];
  isDefault?: boolean;
  isStarred?: boolean;
  createdAt: Date;
  usageCount: number;
}

export interface SmartFilterProps {
  fields: Array<{
    key: string;
    label: string;
    type: "text" | "number" | "date" | "select" | "boolean";
    options?: Array<{ label: string; value: any }>;
    placeholder?: string;
  }>;
  conditions: FilterCondition[];
  onConditionsChange: (conditions: FilterCondition[]) => void;
  templates?: FilterTemplate[];
  onTemplatesSave?: (template: FilterTemplate) => void;
  onTemplatesLoad?: (template: FilterTemplate) => void;
  className?: string;
  allowTemplates?: boolean;
  showPreview?: boolean;
  maxConditions?: number;
}

export const SmartFilter: React.FC<SmartFilterProps> = ({
  fields,
  conditions,
  onConditionsChange,
  templates = [],
  onTemplatesSave,
  onTemplatesLoad,
  className,
  allowTemplates = true,
  showPreview = true,
  maxConditions = 10,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newCondition, setNewCondition] = useState<Partial<FilterCondition>>(
    {}
  );
  const [filterHistory, setFilterHistory] = useState<FilterCondition[][]>([]);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  // 计算筛选预览
  const filterPreview = useMemo(() => {
    const activeCount = conditions.length;
    const fieldCount = new Set(conditions.map((c) => c.field)).size;

    if (activeCount === 0) return "无筛选条件";
    if (activeCount === 1) return `1个条件`;
    return `${activeCount}个条件，涉及${fieldCount}个字段`;
  }, [conditions]);

  // 智能建议生成
  const generateSuggestions = useCallback(
    (fieldKey: string, partialValue: string) => {
      // 基于历史数据和字段类型生成建议
      const suggestions: string[] = [];

      // 从历史记录中提取相似条件
      filterHistory.flat().forEach((condition) => {
        if (
          condition.field === fieldKey &&
          condition.value.toString().includes(partialValue)
        ) {
          suggestions.push(condition.value.toString());
        }
      });

      // 为常见字段添加预设建议
      const field = fields.find((f) => f.key === fieldKey);
      if (field?.type === "text") {
        const commonPatterns = ["包含", "等于", "开始于", "结束于"];
        suggestions.push(
          ...commonPatterns.filter((p) => p.includes(partialValue))
        );
      }

      setSearchSuggestions([...new Set(suggestions)].slice(0, 5));
    },
    [filterHistory, fields]
  );

  // 添加新条件
  const addCondition = useCallback(() => {
    if (!newCondition.field || newCondition.value === undefined) return;

    const condition: FilterCondition = {
      id: `filter_${Date.now()}`,
      field: newCondition.field,
      operator: newCondition.operator || "equals",
      value: newCondition.value,
      type: newCondition.type || "text",
      label:
        newCondition.label ||
        fields.find((f) => f.key === newCondition.field)?.label,
    };

    const newConditions = [...conditions, condition];
    onConditionsChange(newConditions);

    // 更新历史记录
    setFilterHistory((prev) => [newConditions, ...prev.slice(0, 9)]);

    // 重置新条件表单
    setNewCondition({});
  }, [newCondition, conditions, onConditionsChange, fields]);

  // 移除条件
  const removeCondition = useCallback(
    (conditionId: string) => {
      const newConditions = conditions.filter((c) => c.id !== conditionId);
      onConditionsChange(newConditions);
    },
    [conditions, onConditionsChange]
  );

  // 清空所有条件
  const clearAllConditions = useCallback(() => {
    onConditionsChange([]);
  }, [onConditionsChange]);

  // 保存为模板
  const saveAsTemplate = useCallback(() => {
    if (!templateName || conditions.length === 0) return;

    const template: FilterTemplate = {
      id: `template_${Date.now()}`,
      name: templateName,
      conditions: [...conditions],
      createdAt: new Date(),
      usageCount: 0,
    };

    onTemplatesSave?.(template);
    setTemplateName("");
    setShowTemplateDialog(false);
  }, [templateName, conditions, onTemplatesSave]);

  // 应用模板
  const applyTemplate = useCallback(
    (template: FilterTemplate) => {
      onConditionsChange([...template.conditions]);
      onTemplatesLoad?.(template);
    },
    [onConditionsChange, onTemplatesLoad]
  );

  // 渲染操作符选择
  const renderOperatorSelect = (
    type: string,
    value: string,
    onChange: (value: string) => void
  ) => {
    const operators = {
      text: [
        { value: "equals", label: "等于" },
        { value: "contains", label: "包含" },
        { value: "startsWith", label: "开始于" },
        { value: "endsWith", label: "结束于" },
      ],
      number: [
        { value: "equals", label: "等于" },
        { value: "greaterThan", label: "大于" },
        { value: "lessThan", label: "小于" },
        { value: "between", label: "介于" },
      ],
      date: [
        { value: "equals", label: "等于" },
        { value: "greaterThan", label: "晚于" },
        { value: "lessThan", label: "早于" },
        { value: "between", label: "介于" },
      ],
      select: [
        { value: "in", label: "包含于" },
        { value: "notIn", label: "不包含于" },
      ],
      boolean: [{ value: "equals", label: "等于" }],
    };

    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-2 border-black rounded-lg font-medium">
          <SelectValue placeholder="选择操作符" />
        </SelectTrigger>
        <SelectContent className="border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
          {operators[type as keyof typeof operators]?.map((op) => (
            <SelectItem key={op.value} value={op.value} className="font-medium">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  // 渲染值输入
  const renderValueInput = (
    field: any,
    operator: string,
    value: any,
    onChange: (value: any) => void
  ) => {
    switch (field.type) {
      case "text":
        return (
          <div className="relative">
            <Input
              placeholder={field.placeholder || `输入${field.label}...`}
              value={value || ""}
              onChange={(e) => {
                onChange(e.target.value);
                generateSuggestions(field.key, e.target.value);
              }}
              className="border-2 border-black rounded-lg font-medium focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66]/20"
            />
            {searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full text-left px-3 py-2 hover:bg-[#B9FF66] transition-colors"
                    onClick={() => {
                      onChange(suggestion);
                      setSearchSuggestions([]);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case "number":
        return (
          <Input
            type="number"
            placeholder={`输入${field.label}...`}
            value={value || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            className="border-2 border-black rounded-lg font-medium focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66]/20"
          />
        );

      case "select":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="border-2 border-black rounded-lg font-medium">
              <SelectValue placeholder={`选择${field.label}...`} />
            </SelectTrigger>
            <SelectContent className="border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
              {field.options?.map((option: any) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="font-medium"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="border-2 border-black rounded-lg font-medium justify-start text-left"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(value, "yyyy-MM-dd") : `选择${field.label}...`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
              <Calendar
                mode="single"
                selected={value}
                onSelect={onChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox checked={value} onCheckedChange={onChange} />
            <label className="text-sm font-medium text-[#191A23]">
              {field.label}
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 筛选器头部 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] bg-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#B9FF66] border-2 border-black rounded-full">
                <Filter className="w-5 h-5 text-black" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-[#191A23] flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  智能筛选器
                </CardTitle>
                <p className="text-sm text-[#191A23]/70 font-medium mt-1">
                  {showPreview && filterPreview}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 模板菜单 */}
              {allowTemplates && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-black rounded-lg font-bold hover:bg-[#F7931E] hover:text-white shadow-[2px_2px_0px_0px_#191A23]"
                    >
                      <Bookmark className="w-4 h-4 mr-1" />
                      模板
                      <ChevronDown className="w-4 h-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
                    <DropdownMenuLabel className="font-bold text-[#191A23]">
                      筛选模板
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {templates.length > 0 ? (
                      templates.map((template) => (
                        <DropdownMenuItem
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2">
                            {template.isStarred && (
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            )}
                            <span className="font-medium">{template.name}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {template.conditions.length}
                          </Badge>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        <span className="text-gray-500">暂无模板</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setShowTemplateDialog(true)}
                      disabled={conditions.length === 0}
                      className="text-[#B9FF66] font-medium"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      保存当前筛选
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* 历史记录 */}
              {filterHistory.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-black rounded-lg font-bold hover:bg-[#9C88FF] hover:text-white shadow-[2px_2px_0px_0px_#191A23]"
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      历史
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
                    <DropdownMenuLabel className="font-bold text-[#191A23]">
                      筛选历史
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {filterHistory
                      .slice(0, 5)
                      .map((historyConditions, index) => (
                        <DropdownMenuItem
                          key={index}
                          onClick={() => onConditionsChange(historyConditions)}
                          className="flex items-center justify-between"
                        >
                          <span className="font-medium text-sm">
                            筛选 #{index + 1}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {historyConditions.length} 条件
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* 展开/收起按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="border-2 border-black rounded-lg font-bold hover:bg-[#B9FF66] hover:text-black shadow-[2px_2px_0px_0px_#191A23]"
              >
                {isExpanded ? "收起" : "展开"}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 ml-1 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {/* 现有条件列表 */}
            {conditions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#191A23] text-sm uppercase tracking-wide">
                    当前筛选条件
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllConditions}
                    className="border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    清空全部
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {conditions.map((condition) => (
                    <Badge
                      key={condition.id}
                      className="bg-[#B9FF66] text-black border-2 border-black font-bold px-3 py-1 gap-2 hover:bg-[#A8E055] transition-colors"
                    >
                      <span className="text-xs uppercase tracking-wide">
                        {condition.label}: {String(condition.value)}
                      </span>
                      <button
                        onClick={() => removeCondition(condition.id)}
                        className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 添加新条件 */}
            {conditions.length < maxConditions && (
              <div className="space-y-3 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                <h4 className="font-bold text-[#191A23] text-sm uppercase tracking-wide flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  添加筛选条件
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* 字段选择 */}
                  <Select
                    value={newCondition.field}
                    onValueChange={(value) => {
                      const field = fields.find((f) => f.key === value);
                      setNewCondition((prev) => ({
                        ...prev,
                        field: value,
                        type: field?.type,
                        operator: "equals",
                        value: undefined,
                      }));
                    }}
                  >
                    <SelectTrigger className="border-2 border-black rounded-lg font-medium">
                      <SelectValue placeholder="选择字段..." />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-black rounded-lg bg-white shadow-[4px_4px_0px_0px_#191A23]">
                      {fields.map((field) => (
                        <SelectItem
                          key={field.key}
                          value={field.key}
                          className="font-medium"
                        >
                          <div className="flex items-center gap-2">
                            {field.type === "text" && (
                              <Type className="w-4 h-4" />
                            )}
                            {field.type === "number" && (
                              <Hash className="w-4 h-4" />
                            )}
                            {field.type === "date" && (
                              <CalendarIcon className="w-4 h-4" />
                            )}
                            {field.type === "boolean" && (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                            {field.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 操作符选择 */}
                  {newCondition.field && newCondition.type && (
                    <>
                      {renderOperatorSelect(
                        newCondition.type,
                        newCondition.operator || "equals",
                        (operator) =>
                          setNewCondition((prev) => ({
                            ...prev,
                            operator: operator as any,
                          }))
                      )}

                      {/* 值输入 */}
                      {renderValueInput(
                        fields.find((f) => f.key === newCondition.field),
                        newCondition.operator || "equals",
                        newCondition.value,
                        (value) =>
                          setNewCondition((prev) => ({ ...prev, value }))
                      )}

                      {/* 添加按钮 */}
                      <Button
                        onClick={addCondition}
                        disabled={
                          newCondition.value === undefined ||
                          newCondition.value === ""
                        }
                        className="border-2 border-black rounded-lg font-bold bg-[#B9FF66] text-black hover:bg-[#A8E055] shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23]"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        添加
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 快捷操作 */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                {conditions.length}/{maxConditions} 个筛选条件
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="border border-gray-300 rounded-lg font-medium"
                >
                  收起筛选器
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 保存模板对话框 */}
      {showTemplateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-96 border-2 border-black shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-black text-[#191A23]">
                保存筛选模板
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="输入模板名称..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="border-2 border-black rounded-lg font-medium"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTemplateDialog(false)}
                  className="border-2 border-black rounded-lg font-medium"
                >
                  取消
                </Button>
                <Button
                  onClick={saveAsTemplate}
                  disabled={!templateName}
                  className="border-2 border-black rounded-lg font-bold bg-[#B9FF66] text-black hover:bg-[#A8E055] shadow-[2px_2px_0px_0px_#191A23]"
                >
                  保存模板
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
