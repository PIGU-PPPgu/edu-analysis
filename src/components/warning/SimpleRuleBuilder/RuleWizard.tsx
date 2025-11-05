/**
 * 规则创建向导
 * 三步式引导用户完成预警规则配置
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Circle,
  Settings,
  Eye,
  Save,
  Users,
  Target,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  RuleScenario,
  RuleParameter,
  RuleConfiguration,
  WizardStep,
  RulePreview,
} from "./types";

interface RuleWizardProps {
  scenario: RuleScenario;
  onSave: (configuration: RuleConfiguration) => void;
  onCancel: () => void;
  className?: string;
}

// 参数输入组件
const ParameterInput: React.FC<{
  parameter: RuleParameter;
  value: any;
  onChange: (value: any) => void;
}> = ({ parameter, value, onChange }) => {
  const renderInput = () => {
    switch (parameter.type) {
      case "number":
        return (
          <div className="space-y-2">
            <Input
              type="number"
              value={value || parameter.defaultValue || ""}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              min={parameter.min}
              max={parameter.max}
              className="border-2 border-gray-200"
            />
            {parameter.unit && (
              <div className="text-xs text-gray-500">
                单位: {parameter.unit}
              </div>
            )}
          </div>
        );

      case "range":
        return (
          <div className="space-y-3">
            <div className="px-2">
              <Slider
                value={[value || parameter.defaultValue || 50]}
                onValueChange={(values) => onChange(values[0])}
                min={parameter.min || 0}
                max={parameter.max || 100}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {parameter.min || 0}
                {parameter.unit}
              </span>
              <span className="font-medium">
                {value || parameter.defaultValue || 50}
                {parameter.unit}
              </span>
              <span>
                {parameter.max || 100}
                {parameter.unit}
              </span>
            </div>
          </div>
        );

      case "select":
        return (
          <Select
            value={value || parameter.defaultValue}
            onValueChange={onChange}
          >
            <SelectTrigger className="border-2 border-gray-200">
              <SelectValue placeholder="请选择..." />
            </SelectTrigger>
            <SelectContent>
              {parameter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500">
                        {option.description}
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect":
        return (
          <div className="space-y-2">
            {parameter.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${parameter.id}_${option.value}`}
                  checked={(value || parameter.defaultValue || []).includes(
                    option.value
                  )}
                  onCheckedChange={(checked) => {
                    const currentValues = value || parameter.defaultValue || [];
                    if (checked) {
                      onChange([...currentValues, option.value]);
                    } else {
                      onChange(
                        currentValues.filter((v: any) => v !== option.value)
                      );
                    }
                  }}
                />
                <Label
                  htmlFor={`${parameter.id}_${option.value}`}
                  className="text-sm font-medium leading-none"
                >
                  {option.label}
                </Label>
                {option.description && (
                  <span className="text-xs text-gray-500">
                    ({option.description})
                  </span>
                )}
              </div>
            ))}
          </div>
        );

      case "boolean":
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value !== undefined ? value : parameter.defaultValue}
              onCheckedChange={onChange}
              className="data-[state=checked]:bg-[#B9FF66]"
            />
            <Label className="text-sm">{parameter.label}</Label>
          </div>
        );

      default:
        return (
          <Input
            value={value || parameter.defaultValue || ""}
            onChange={(e) => onChange(e.target.value)}
            className="border-2 border-gray-200"
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[#191A23]">
        {parameter.label}
        {parameter.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderInput()}
      {parameter.description && (
        <p className="text-xs text-gray-600">{parameter.description}</p>
      )}
    </div>
  );
};

// 生成自然语言描述
const generateNaturalLanguage = (
  scenario: RuleScenario,
  parameters: Record<string, any>
): string => {
  let template = scenario.template.conditionTemplate;

  // 替换参数占位符
  Object.entries(parameters).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    if (template.includes(placeholder)) {
      if (key === "subjects" && Array.isArray(value)) {
        // 处理科目数组
        const subjectLabels = value.map((v) => {
          const option = scenario.parameters
            .find((p) => p.id === "subjects")
            ?.options?.find((o) => o.value === v);
          return option?.label || v;
        });
        template = template.replace(placeholder, subjectLabels.join("、"));
      } else if (key === "comparisonPeriod") {
        // 处理对比周期
        const option = scenario.parameters
          .find((p) => p.id === "comparisonPeriod")
          ?.options?.find((o) => o.value === value);
        template = template.replace(placeholder, option?.label || value);
      } else if (key === "timeWindow") {
        // 处理时间窗口
        const option = scenario.parameters
          .find((p) => p.id === "timeWindow")
          ?.options?.find((o) => o.value === value);
        template = template.replace(placeholder, option?.label || value);
      } else if (key === "severity") {
        // 处理严重程度
        const option = scenario.parameters
          .find((p) => p.id === "severity")
          ?.options?.find((o) => o.value === value);
        template = template.replace(placeholder, option?.label || value);
      } else {
        // 普通参数替换
        template = template.replace(placeholder, String(value));
      }
    }
  });

  return template;
};

// 生成预览数据
const generatePreview = (
  scenario: RuleScenario,
  parameters: Record<string, any>
): RulePreview => {
  const naturalLanguage = generateNaturalLanguage(scenario, parameters);

  // 模拟SQL生成
  let sqlTemplate = scenario.template.sqlTemplate;
  Object.entries(parameters).forEach(([key, value]) => {
    sqlTemplate = sqlTemplate.replace(
      new RegExp(`{${key}}`, "g"),
      String(value)
    );
  });

  // 模拟匹配学生数据
  const estimatedMatches = Math.floor(Math.random() * 20) + 5;
  const sampleStudents = [
    {
      studentId: "S001",
      studentName: "张三",
      className: "高三1班",
      matchReason: "连续2次数学成绩低于60分",
    },
    {
      studentId: "S002",
      studentName: "李四",
      className: "高三2班",
      matchReason: "总分从435分下降到398分",
    },
  ].slice(0, Math.min(estimatedMatches, 2));

  return {
    naturalLanguage,
    sqlQuery: sqlTemplate,
    estimatedMatches,
    sampleStudents,
    potentialIssues:
      estimatedMatches > 50 ? ["预警范围可能过大，建议调整参数"] : [],
  };
};

const RuleWizard: React.FC<RuleWizardProps> = ({
  scenario,
  onSave,
  onCancel,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // 初始化参数默认值
  useEffect(() => {
    const defaultParams: Record<string, any> = {};
    scenario.parameters.forEach((param) => {
      if (param.defaultValue !== undefined) {
        defaultParams[param.id] = param.defaultValue;
      }
    });
    setParameters(defaultParams);
    setRuleName(scenario.name);
    setRuleDescription(scenario.description);
  }, [scenario]);

  // 向导步骤定义
  const steps: WizardStep[] = [
    {
      id: "parameters",
      title: "设置参数",
      description: "配置预警规则的具体参数",
      isCompleted: scenario.parameters.every(
        (p) => !p.required || parameters[p.id] !== undefined
      ),
      isActive: currentStep === 0,
      canSkip: false,
    },
    {
      id: "preview",
      title: "预览效果",
      description: "查看规则的效果和影响范围",
      isCompleted: currentStep > 1,
      isActive: currentStep === 1,
      canSkip: false,
    },
    {
      id: "save",
      title: "保存规则",
      description: "确认规则信息并保存",
      isCompleted: false,
      isActive: currentStep === 2,
      canSkip: false,
    },
  ];

  // 更新参数值
  const updateParameter = (paramId: string, value: any) => {
    setParameters((prev) => ({
      ...prev,
      [paramId]: value,
    }));
  };

  // 验证当前步骤
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return scenario.parameters.every(
          (p) => !p.required || parameters[p.id] !== undefined
        );
      case 1:
        return true;
      case 2:
        return ruleName.trim().length > 0;
      default:
        return true;
    }
  };

  // 下一步
  const handleNext = () => {
    if (validateCurrentStep() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 保存配置
  const handleSave = () => {
    const configuration: RuleConfiguration = {
      scenarioId: scenario.id,
      name: ruleName,
      description: ruleDescription,
      parameters,
      isActive,
      metadata: {
        estimatedAffectedStudents: Math.floor(Math.random() * 20) + 5,
        confidence: 0.85,
      },
    };
    onSave(configuration);
  };

  // 生成预览
  const preview = React.useMemo(() => {
    return generatePreview(scenario, parameters);
  }, [scenario, parameters]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 进度指示器 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-gray-600 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回选择
        </Button>
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                  step.isActive
                    ? "border-[#B9FF66] bg-[#B9FF66] text-black"
                    : step.isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                )}
              >
                {step.isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <div className="ml-2">
                <div
                  className={cn(
                    "text-sm font-medium",
                    step.isActive ? "text-black" : "text-gray-500"
                  )}
                >
                  {step.title}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300 mx-4" />
              )}
            </div>
          ))}
        </div>
        <div className="w-20" /> {/* 占位符保持对称 */}
      </div>

      {/* 场景信息 */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{scenario.icon}</span>
            <div>
              <CardTitle className="text-lg font-bold text-[#191A23]">
                {scenario.name}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {scenario.description}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 步骤内容 */}
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 0 && <Settings className="h-5 w-5" />}
            {currentStep === 1 && <Eye className="h-5 w-5" />}
            {currentStep === 2 && <Save className="h-5 w-5" />}
            {steps[currentStep].title}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {steps[currentStep].description}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 第一步：参数配置 */}
          {currentStep === 0 && (
            <div className="space-y-4">
              {scenario.parameters.map((parameter) => (
                <ParameterInput
                  key={parameter.id}
                  parameter={parameter}
                  value={parameters[parameter.id]}
                  onChange={(value) => updateParameter(parameter.id, value)}
                />
              ))}
            </div>
          )}

          {/* 第二步：预览效果 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* 自然语言描述 */}
              <div>
                <h4 className="font-medium text-[#191A23] mb-2">规则描述</h4>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 font-medium">
                    {preview.naturalLanguage}
                  </p>
                </div>
              </div>

              {/* 影响预估 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-800">预计影响</span>
                  </div>
                  <div className="text-2xl font-bold text-[#191A23]">
                    {preview.estimatedMatches} 名学生
                  </div>
                  <div className="text-sm text-gray-600">
                    约占总学生数的{" "}
                    {Math.round((preview.estimatedMatches / 150) * 100)}%
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-800">规则精度</span>
                  </div>
                  <div className="text-2xl font-bold text-[#191A23]">85%</div>
                  <div className="text-sm text-gray-600">基于历史数据预估</div>
                </div>
              </div>

              {/* 样本学生 */}
              {preview.sampleStudents.length > 0 && (
                <div>
                  <h4 className="font-medium text-[#191A23] mb-2">
                    匹配学生样本
                  </h4>
                  <div className="space-y-2">
                    {preview.sampleStudents.map((student, index) => (
                      <div
                        key={index}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium">
                              {student.studentName}
                            </span>
                            <span className="text-gray-500 ml-2">
                              ({student.className})
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {student.studentId}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {student.matchReason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 潜在问题提示 */}
              {preview.potentialIssues.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">注意事项</h4>
                      <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                        {preview.potentialIssues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 第三步：保存配置 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-[#191A23]">
                  规则名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="输入规则名称"
                  className="border-2 border-gray-200 mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-[#191A23]">
                  规则描述
                </Label>
                <Textarea
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="描述这个规则的作用和适用场景"
                  rows={3}
                  className="border-2 border-gray-200 mt-1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-[#B9FF66]"
                />
                <Label className="text-sm">立即启用此规则</Label>
              </div>

              {/* 最终预览 */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-[#191A23] mb-2">最终规则</h4>
                <p className="text-sm text-gray-700">
                  {preview.naturalLanguage}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="border-2 border-gray-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          上一步
        </Button>

        <div className="flex gap-2">
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!validateCurrentStep()}
              className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold hover:bg-[#A8E055]"
            >
              下一步
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!validateCurrentStep()}
              className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold hover:bg-[#A8E055]"
            >
              <Save className="h-4 w-4 mr-2" />
              保存规则
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleWizard;
