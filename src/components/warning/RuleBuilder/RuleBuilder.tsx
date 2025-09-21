/**
 * 主规则构建器组件 - 拖拽式预警规则构建界面
 * 整合指标面板和构建画布，提供完整的规则构建体验
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Save,
  Play,
  Eye,
  Settings,
  Download,
  Upload,
  Lightbulb,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Code2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import MetricPalette from "./MetricPalette";
import RuleCanvas from "./RuleCanvas";
import {
  RuleBuilderState,
  DragItem,
  ExportedRule,
  RuleTestResult,
  SmartRecommendation,
} from "./types";
import { createWarningRule } from "@/services/warningService";

interface RuleBuilderProps {
  onSave?: (rule: ExportedRule) => void;
  onCancel?: () => void;
  initialRule?: Partial<ExportedRule>;
  className?: string;
}

// 规则模板
const ruleTemplates = [
  {
    id: "consecutive_fails",
    name: "连续不及格预警",
    description: "学生连续多次考试不及格时触发",
    icon: "🔴",
    difficulty: "beginner" as const,
    category: "grade",
  },
  {
    id: "grade_decline",
    name: "成绩下降预警",
    description: "成绩连续下降超过阈值时触发",
    icon: "📉",
    difficulty: "intermediate" as const,
    category: "trend",
  },
  {
    id: "homework_default",
    name: "作业拖欠预警",
    description: "连续多次作业未提交时触发",
    icon: "📝",
    difficulty: "beginner" as const,
    category: "homework",
  },
  {
    id: "composite_risk",
    name: "综合风险预警",
    description: "多个因素综合评估高风险时触发",
    icon: "⚠️",
    difficulty: "advanced" as const,
    category: "composite",
  },
];

// 智能推荐模拟数据
const getSmartRecommendations = (
  state: RuleBuilderState
): SmartRecommendation[] => {
  const recommendations: SmartRecommendation[] = [];

  // 基于当前节点提供推荐
  const nodeCount = Object.keys(state.nodes).length;

  if (nodeCount === 0) {
    recommendations.push({
      type: "threshold",
      title: "建议从成绩指标开始",
      description: "成绩相关的预警规则通常最有效，建议先添加总分或单科成绩指标",
      confidence: 0.9,
      data: {
        reasoning: "基于历史数据，成绩类预警规则的准确率最高",
        expectedImpact: {
          studentCount: 25,
          accuracy: 85,
        },
      },
    });
  }

  if (nodeCount > 0 && nodeCount < 3) {
    recommendations.push({
      type: "operator",
      title: "添加条件操作符",
      description: '当前只有指标，建议添加"小于"或"大于"操作符来设定阈值',
      confidence: 0.8,
      data: {
        suggestedValue: "<",
        reasoning: '对于成绩指标，通常使用"小于"操作符设定预警阈值',
      },
    });
  }

  return recommendations;
};

const RuleBuilder: React.FC<RuleBuilderProps> = ({
  onSave,
  onCancel,
  initialRule,
  className,
}) => {
  // 规则构建状态
  const [builderState, setBuilderState] = useState<RuleBuilderState>({
    nodes: {},
    rootNodeId: null,
    selectedNodeId: null,
    isValid: false,
    errors: [],
    affectedStudentCount: 0,
    sampleStudents: [],
    ruleName: initialRule?.name || "",
    ruleDescription: initialRule?.description || "",
    severity: initialRule?.severity || "medium",
    scope: initialRule?.scope || "global",
    category: initialRule?.category || "grade",
    priority: initialRule?.priority || 5,
  });

  // UI状态
  const [activeTab, setActiveTab] = useState("builder");
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [isTestingRule, setIsTestingRule] = useState(false);
  const [testResults, setTestResults] = useState<RuleTestResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 智能推荐
  const recommendations = useMemo(
    () => getSmartRecommendations(builderState),
    [builderState]
  );

  // 处理拖拽开始
  const handleDragStart = useCallback((item: DragItem) => {
    console.log("开始拖拽:", item);
  }, []);

  // 更新规则元信息
  const updateRuleMetadata = useCallback((field: string, value: any) => {
    setBuilderState((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // 测试规则
  const testRule = useCallback(async () => {
    if (!builderState.isValid) {
      toast.error("规则无效，无法测试");
      return;
    }

    setIsTestingRule(true);
    try {
      // 模拟测试结果
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResults: RuleTestResult = {
        totalStudents: 150,
        affectedStudents: 12,
        affectedPercentage: 8.0,
        sampleMatches: [
          {
            studentId: "S001",
            studentName: "张三",
            matchedConditions: ["总分 < 400"],
            values: { total_score: 385, chinese_score: 95, math_score: 120 },
          },
          {
            studentId: "S002",
            studentName: "李四",
            matchedConditions: ["总分 < 400"],
            values: { total_score: 372, chinese_score: 88, math_score: 108 },
          },
        ],
        historicalAnalysis: {
          wouldHaveTriggered: 8,
          accuracy: 87.5,
          falsePositives: 1,
          falseNegatives: 2,
        },
      };

      setTestResults(mockResults);
      setBuilderState((prev) => ({
        ...prev,
        affectedStudentCount: mockResults.affectedStudents,
        sampleStudents: mockResults.sampleMatches,
      }));

      toast.success("规则测试完成");
    } catch (error) {
      toast.error("规则测试失败");
    } finally {
      setIsTestingRule(false);
    }
  }, [builderState.isValid]);

  // 保存规则
  const saveRule = useCallback(async () => {
    if (!builderState.isValid) {
      toast.error("规则无效，无法保存");
      return;
    }

    if (!builderState.ruleName.trim()) {
      toast.error("请输入规则名称");
      return;
    }

    setIsSaving(true);
    try {
      // 构建导出规则
      const exportedRule: ExportedRule = {
        name: builderState.ruleName,
        description: builderState.ruleDescription,
        severity: builderState.severity,
        scope: builderState.scope,
        category: builderState.category,
        priority: builderState.priority,
        is_active: true,
        conditions: {
          structure: Object.values(builderState.nodes),
          sql: "-- 生成的SQL查询将在此处", // 实际实现需要生成SQL
          parameters: {},
        },
        metadata: {
          createdBy: (await supabase.auth.getUser()).data.user?.id || "anonymous-user",
          createdWith: "rule_builder",
          version: "1.0.0",
          tags: [builderState.category, builderState.severity],
        },
      };

      // 调用API保存
      const result = await createWarningRule({
        name: exportedRule.name,
        description: exportedRule.description,
        conditions: exportedRule.conditions,
        severity: exportedRule.severity,
        scope: exportedRule.scope,
        category: exportedRule.category,
        priority: exportedRule.priority,
        is_active: true,
        is_system: false,
        auto_trigger: true,
        notification_enabled: true,
        metadata: exportedRule.metadata,
      });

      if (result) {
        toast.success("规则保存成功");
        onSave?.(exportedRule);
      } else {
        throw new Error("保存失败");
      }
    } catch (error) {
      console.error("保存规则失败:", error);
      toast.error("保存规则失败");
    } finally {
      setIsSaving(false);
    }
  }, [builderState, onSave]);

  // 从模板加载
  const loadTemplate = useCallback((templateId: string) => {
    const template = ruleTemplates.find((t) => t.id === templateId);
    if (!template) return;

    // 根据模板创建基础节点结构
    const nodes: Record<string, any> = {};
    let nodeCounter = 1;

    // 示例：为连续不及格模板创建节点
    if (templateId === "consecutive_fails") {
      const metricNode = {
        id: `node_${nodeCounter++}`,
        type: "metric",
        position: { x: 50, y: 100 },
        data: { metric: "total_score", label: "考试总分" },
      };

      const operatorNode = {
        id: `node_${nodeCounter++}`,
        type: "operator",
        position: { x: 300, y: 100 },
        data: { operator: "<" },
      };

      const valueNode = {
        id: `node_${nodeCounter++}`,
        type: "value",
        position: { x: 550, y: 100 },
        data: { value: 400 },
      };

      nodes[metricNode.id] = metricNode;
      nodes[operatorNode.id] = operatorNode;
      nodes[valueNode.id] = valueNode;
    }

    setBuilderState((prev) => ({
      ...prev,
      nodes,
      ruleName: template.name,
      ruleDescription: template.description,
      category: template.category as any,
      selectedNodeId: null,
    }));

    toast.success(`已加载模板: ${template.name}`);
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 顶部控制栏 */}
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-black rounded-full">
                <Brain className="h-5 w-5 text-[#B9FF66]" />
              </div>
              <div>
                <CardTitle className="text-black font-black uppercase tracking-wide">
                  智能规则构建器
                </CardTitle>
                <p className="text-black/70 text-sm font-medium">
                  通过拖拽构建预警规则，支持复杂条件组合
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={testRule}
                disabled={!builderState.isValid || isTestingRule}
                className="border-2 border-black bg-white text-black font-bold"
              >
                <Play
                  className={cn(
                    "h-4 w-4 mr-1",
                    isTestingRule && "animate-spin"
                  )}
                />
                {isTestingRule ? "测试中..." : "测试规则"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={saveRule}
                disabled={!builderState.isValid || isSaving}
                className="border-2 border-black bg-white text-black font-bold"
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? "保存中..." : "保存规则"}
              </Button>
              {onCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  className="border-2 border-black bg-white text-red-600 font-bold"
                >
                  取消
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* 规则基础信息 */}
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-sm font-bold text-[#191A23]">
                规则名称
              </Label>
              <Input
                value={builderState.ruleName}
                onChange={(e) => updateRuleMetadata("ruleName", e.target.value)}
                placeholder="输入规则名称"
                className="border-2 border-black mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-[#191A23]">
                严重程度
              </Label>
              <Select
                value={builderState.severity}
                onValueChange={(value) => updateRuleMetadata("severity", value)}
              >
                <SelectTrigger className="border-2 border-black mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低风险</SelectItem>
                  <SelectItem value="medium">中风险</SelectItem>
                  <SelectItem value="high">高风险</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold text-[#191A23]">
                应用范围
              </Label>
              <Select
                value={builderState.scope}
                onValueChange={(value) => updateRuleMetadata("scope", value)}
              >
                <SelectTrigger className="border-2 border-black mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">全局</SelectItem>
                  <SelectItem value="exam">考试</SelectItem>
                  <SelectItem value="class">班级</SelectItem>
                  <SelectItem value="student">学生</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-bold text-[#191A23]">
                规则类别
              </Label>
              <Select
                value={builderState.category}
                onValueChange={(value) => updateRuleMetadata("category", value)}
              >
                <SelectTrigger className="border-2 border-black mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grade">成绩</SelectItem>
                  <SelectItem value="homework">作业</SelectItem>
                  <SelectItem value="attendance">考勤</SelectItem>
                  <SelectItem value="behavior">行为</SelectItem>
                  <SelectItem value="progress">进度</SelectItem>
                  <SelectItem value="composite">综合</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-sm font-bold text-[#191A23]">规则描述</Label>
            <Textarea
              value={builderState.ruleDescription}
              onChange={(e) =>
                updateRuleMetadata("ruleDescription", e.target.value)
              }
              placeholder="描述规则的作用和触发条件"
              className="border-2 border-black mt-1"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 主要构建区域 */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 bg-gray-100">
          <TabsTrigger
            value="builder"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <Settings className="h-4 w-4 mr-2" />
            构建器
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <Target className="h-4 w-4 mr-2" />
            模板
          </TabsTrigger>
          <TabsTrigger
            value="test"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            测试
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <Code2 className="h-4 w-4 mr-2" />
            代码
          </TabsTrigger>
        </TabsList>

        {/* 规则构建标签页 */}
        <TabsContent value="builder" className="space-y-4">
          <div className="grid grid-cols-12 gap-6">
            {/* 指标面板 */}
            <div className="col-span-3">
              <MetricPalette onDragStart={handleDragStart} compact={true} />
            </div>

            {/* 构建画布 */}
            <div className="col-span-6">
              <RuleCanvas
                state={builderState}
                onStateChange={setBuilderState}
              />
            </div>

            {/* 智能推荐面板 */}
            <div className="col-span-3">
              {showRecommendations && recommendations.length > 0 && (
                <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F59E0B]">
                  <CardHeader className="bg-[#F59E0B] border-b-2 border-black p-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white font-black text-sm uppercase">
                        智能推荐
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRecommendations(false)}
                        className="text-white hover:bg-white/20 h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    {recommendations.map((rec, index) => (
                      <div
                        key={index}
                        className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                      >
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-bold text-amber-800 text-sm">
                              {rec.title}
                            </h4>
                            <p className="text-xs text-amber-700 mt-1">
                              {rec.description}
                            </p>
                            <div className="flex items-center justify-between mt-2">
                              <Badge className="bg-amber-200 text-amber-800 text-xs">
                                置信度 {Math.round(rec.confidence * 100)}%
                              </Badge>
                              {rec.action && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-6 border-amber-300"
                                >
                                  应用
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 模板标签页 */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {ruleTemplates.map((template) => (
              <Card
                key={template.id}
                className="border-2 border-black cursor-pointer hover:shadow-[4px_4px_0px_0px_#000] transition-all"
                onClick={() => loadTemplate(template.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{template.icon}</div>
                  <h3 className="font-bold text-sm text-[#191A23] mb-1">
                    {template.name}
                  </h3>
                  <p className="text-xs text-[#191A23]/70 mb-3">
                    {template.description}
                  </p>
                  <Badge
                    className={cn(
                      "text-xs",
                      template.difficulty === "beginner" &&
                        "bg-green-100 text-green-800",
                      template.difficulty === "intermediate" &&
                        "bg-yellow-100 text-yellow-800",
                      template.difficulty === "advanced" &&
                        "bg-red-100 text-red-800"
                    )}
                  >
                    {template.difficulty === "beginner"
                      ? "初级"
                      : template.difficulty === "intermediate"
                        ? "中级"
                        : "高级"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 测试结果标签页 */}
        <TabsContent value="test" className="space-y-4">
          {testResults ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 测试概览 */}
              <Card className="border-2 border-black">
                <CardHeader className="bg-blue-50 border-b-2 border-black">
                  <CardTitle className="text-[#191A23] font-bold">
                    测试概览
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-[#191A23]">
                        {testResults.affectedStudents}
                      </div>
                      <div className="text-sm text-gray-600">影响学生</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-[#191A23]">
                        {testResults.affectedPercentage}%
                      </div>
                      <div className="text-sm text-gray-600">影响比例</div>
                    </div>
                  </div>

                  {testResults.historicalAnalysis && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-[#191A23]">历史准确性</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-800">
                            {testResults.historicalAnalysis.accuracy}%
                          </div>
                          <div className="text-xs text-green-600">准确率</div>
                        </div>
                        <div className="p-2 bg-red-50 rounded">
                          <div className="font-bold text-red-800">
                            {testResults.historicalAnalysis.falsePositives}
                          </div>
                          <div className="text-xs text-red-600">误报</div>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded">
                          <div className="font-bold text-yellow-800">
                            {testResults.historicalAnalysis.falseNegatives}
                          </div>
                          <div className="text-xs text-yellow-600">漏报</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 样本学生 */}
              <Card className="border-2 border-black">
                <CardHeader className="bg-green-50 border-b-2 border-black">
                  <CardTitle className="text-[#191A23] font-bold">
                    匹配学生样本
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {testResults.sampleMatches.map((student, index) => (
                      <div
                        key={index}
                        className="p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-[#191A23]">
                            {student.studentName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {student.studentId}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          {student.matchedConditions.map((condition, i) => (
                            <div key={i} className="text-red-600">
                              • {condition}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          总分: {student.values.total_score} | 语文:{" "}
                          {student.values.chinese_score} | 数学:{" "}
                          {student.values.math_score}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🧪</div>
              <h3 className="text-lg font-bold text-[#191A23] mb-2">
                尚未测试规则
              </h3>
              <p className="text-[#191A23]/70 mb-4">
                点击"测试规则"按钮查看规则在实际数据上的表现
              </p>
              <Button
                onClick={testRule}
                disabled={!builderState.isValid}
                className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold"
              >
                <Play className="h-4 w-4 mr-2" />
                立即测试
              </Button>
            </div>
          )}
        </TabsContent>

        {/* 代码预览标签页 */}
        <TabsContent value="code" className="space-y-4">
          <Card className="border-2 border-black">
            <CardHeader className="bg-gray-900 border-b-2 border-black">
              <CardTitle className="text-white font-bold">
                生成的SQL查询
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="p-4 bg-gray-900 text-green-400 text-sm font-mono overflow-x-auto">
                {`-- 预警规则: ${builderState.ruleName || "未命名规则"}
-- 描述: ${builderState.ruleDescription || "无描述"}
-- 生成时间: ${new Date().toLocaleString()}

SELECT DISTINCT
    s.student_id,
    s.name AS student_name,
    s.class_name,
    gd.total_score,
    gd.exam_title,
    gd.exam_date
FROM students s
JOIN grade_data gd ON s.student_id = gd.student_id
WHERE 
    -- 主要条件
    gd.total_score < 400
    
    -- 时间范围限制
    AND gd.exam_date >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
    
    -- 排除已处理的预警
    AND NOT EXISTS (
        SELECT 1 FROM warning_records wr 
        WHERE wr.student_id = s.student_id 
        AND wr.status = 'resolved'
        AND wr.created_at > DATE_SUB(NOW(), INTERVAL 1 MONTH)
    )

ORDER BY gd.total_score ASC, gd.exam_date DESC;

-- 预期影响: 约${builderState.affectedStudentCount}名学生
-- 规则类型: ${builderState.category} | 严重程度: ${builderState.severity}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RuleBuilder;
