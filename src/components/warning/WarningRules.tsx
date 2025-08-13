import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Filter,
  Search,
  Wand2,
  Brain,
} from "lucide-react";
import { toast } from "sonner";
import {
  getWarningRules,
  createWarningRule,
  updateWarningRule,
  deleteWarningRule,
  toggleRuleStatus,
  getWarningRuleTemplates,
  WarningRule,
  RuleFilter,
  RuleTemplate,
} from "@/services/warningService";
import RuleBuilder from "./RuleBuilder/RuleBuilder";
import { ExportedRule } from "./RuleBuilder/types";
import SimpleRuleBuilder from "./SimpleRuleBuilder/SimpleRuleBuilder";
import { SimpleExportedRule } from "./SimpleRuleBuilder/types";

interface WarningRulesProps {
  simplified?: boolean;
  limit?: number;
  showViewAllButton?: boolean;
  onViewAllClick?: () => void;
}

const WarningRules: React.FC<WarningRulesProps> = ({
  simplified = false,
  limit,
  showViewAllButton = false,
  onViewAllClick,
}) => {
  const [rules, setRules] = useState<WarningRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<WarningRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<WarningRule | null>(null);

  // 智能规则构建器状态
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [showSimpleBuilder, setShowSimpleBuilder] = useState(false);

  // 筛选状态
  const [filter, setFilter] = useState<RuleFilter>({});
  const [searchTerm, setSearchTerm] = useState("");

  // 表单状态
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleSeverity, setRuleSeverity] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [ruleScope, setRuleScope] = useState<
    "global" | "exam" | "class" | "student"
  >("global");
  const [ruleCategory, setRuleCategory] = useState<
    "grade" | "attendance" | "behavior" | "progress" | "homework" | "composite"
  >("grade");
  const [rulePriority, setRulePriority] = useState(5);
  const [ruleConditions, setRuleConditions] = useState<any>({
    type: "成绩",
    threshold: 60,
    operator: "<",
    subject: "全部",
  });
  const [autoTrigger, setAutoTrigger] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // 模板选择状态
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates] = useState<RuleTemplate[]>(getWarningRuleTemplates());

  const isMounted = useRef(true);

  useEffect(() => {
    fetchRules();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // 应用筛选
  useEffect(() => {
    let filtered = rules;

    if (filter.scope) {
      filtered = filtered.filter((rule) => rule.scope === filter.scope);
    }
    if (filter.category) {
      filtered = filtered.filter((rule) => rule.category === filter.category);
    }
    if (filter.severity) {
      filtered = filtered.filter((rule) => rule.severity === filter.severity);
    }
    if (filter.is_active !== undefined) {
      filtered = filtered.filter((rule) => rule.is_active === filter.is_active);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (rule) =>
          rule.name.toLowerCase().includes(term) ||
          (rule.description && rule.description.toLowerCase().includes(term))
      );
    }

    setFilteredRules(filtered);
  }, [rules, filter, searchTerm]);

  // 获取预警规则
  const fetchRules = async () => {
    if (!isMounted.current) return;

    try {
      setIsLoading(true);
      const data = await getWarningRules();

      if (isMounted.current) {
        setRules(data);
      }
    } catch (error) {
      console.error("获取预警规则失败:", error);
      if (isMounted.current) {
        toast.error("获取预警规则失败");
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ruleName.trim()) {
      toast.error("规则名称不能为空");
      return;
    }

    const ruleData = {
      name: ruleName,
      description: ruleDescription,
      severity: ruleSeverity,
      scope: ruleScope,
      category: ruleCategory,
      priority: rulePriority,
      conditions: ruleConditions,
      is_active: true,
      is_system: false,
      auto_trigger: autoTrigger,
      notification_enabled: notificationEnabled,
      created_by: null,
    };

    try {
      if (isEditMode && selectedRule) {
        await updateWarningRule(selectedRule.id, ruleData);
        toast.success("规则已更新");
      } else {
        await createWarningRule(ruleData);
        toast.success("规则已创建");
      }

      await fetchRules();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("保存规则失败:", error);
      toast.error("保存规则失败");
    }
  };

  // 处理删除规则
  const handleDeleteRule = async (rule: WarningRule) => {
    if (!confirm(`确定要删除规则 "${rule.name}" 吗?`)) {
      return;
    }

    try {
      await deleteWarningRule(rule.id);
      await fetchRules();
      toast.success("规则已删除");
    } catch (error) {
      console.error("删除规则失败:", error);
      toast.error("删除规则失败");
    }
  };

  // 切换规则状态
  const handleToggleActive = async (rule: WarningRule, active: boolean) => {
    try {
      await toggleRuleStatus(rule.id, active);

      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: active } : r))
      );

      toast.success(`规则已${active ? "启用" : "禁用"}`);
    } catch (error) {
      console.error("更新规则状态失败:", error);
      toast.error("更新规则状态失败");
    }
  };

  // 处理编辑规则
  const handleEditRule = (rule: WarningRule) => {
    setSelectedRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description || "");
    setRuleSeverity(rule.severity);
    setRuleScope(rule.scope);
    setRuleCategory(rule.category);
    setRulePriority(rule.priority || 5);
    setRuleConditions(rule.conditions);
    setAutoTrigger(rule.auto_trigger || true);
    setNotificationEnabled(rule.notification_enabled || true);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // 处理创建新规则
  const handleCreateRule = () => {
    resetForm();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  // 处理智能构建器保存
  const handleRuleBuilderSave = async (rule: ExportedRule) => {
    try {
      // 规则已经在RuleBuilder内部保存，这里只需要刷新列表和关闭构建器
      await fetchRules();
      setShowRuleBuilder(false);
      toast.success("智能规则创建成功");
    } catch (error) {
      console.error("刷新规则列表失败:", error);
    }
  };

  // 处理简化构建器保存
  const handleSimpleBuilderSave = async (rule: SimpleExportedRule) => {
    try {
      // 规则已经在SimpleRuleBuilder内部保存，这里只需要刷新列表和关闭构建器
      await fetchRules();
      setShowSimpleBuilder(false);
      toast.success("预警规则创建成功");
    } catch (error) {
      console.error("刷新规则列表失败:", error);
    }
  };

  // 打开智能构建器
  const handleOpenRuleBuilder = () => {
    setShowRuleBuilder(true);
  };

  // 打开简化构建器
  const handleOpenSimpleBuilder = () => {
    setShowSimpleBuilder(true);
  };

  // 从模板创建规则
  const handleCreateFromTemplate = (template: RuleTemplate) => {
    setRuleName(template.name);
    setRuleDescription(template.description);
    setRuleSeverity(template.severity);
    setRuleScope(template.scope);
    setRuleCategory(template.category);
    setRulePriority(template.priority);
    setRuleConditions(template.conditions);
    setAutoTrigger(true);
    setNotificationEnabled(true);
    setIsEditMode(false);
    setShowTemplates(false);
    setIsDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setRuleName("");
    setRuleDescription("");
    setRuleSeverity("medium");
    setRuleScope("global");
    setRuleCategory("grade");
    setRulePriority(5);
    setRuleConditions({
      type: "成绩",
      threshold: 60,
      operator: "<",
      subject: "全部",
    });
    setAutoTrigger(true);
    setNotificationEnabled(true);
    setSelectedRule(null);
  };

  // 清除筛选
  const clearFilters = () => {
    setFilter({});
    setSearchTerm("");
  };

  // 获取严重程度标签样式
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-200"
          >
            高
          </Badge>
        );
      case "medium":
        return (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 border-amber-200"
          >
            中
          </Badge>
        );
      case "low":
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 border-blue-200"
          >
            低
          </Badge>
        );
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };

  // 获取范围标签
  const getScopeBadge = (scope: string) => {
    const scopeMap = {
      global: {
        label: "全局",
        className: "bg-purple-100 text-purple-800 border-purple-200",
      },
      exam: {
        label: "考试",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      class: {
        label: "班级",
        className: "bg-blue-100 text-blue-800 border-blue-200",
      },
      student: {
        label: "学生",
        className: "bg-orange-100 text-orange-800 border-orange-200",
      },
    };

    const config = scopeMap[scope as keyof typeof scopeMap] || {
      label: scope,
      className: "",
    };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // 获取分类标签
  const getCategoryBadge = (category: string) => {
    const categoryMap = {
      grade: {
        label: "成绩",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      progress: {
        label: "进步",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      homework: {
        label: "作业",
        className: "bg-blue-100 text-blue-800 border-blue-200",
      },
      attendance: {
        label: "出勤",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      behavior: {
        label: "行为",
        className: "bg-purple-100 text-purple-800 border-purple-200",
      },
      composite: {
        label: "综合",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
    };

    const config = categoryMap[category as keyof typeof categoryMap] || {
      label: category,
      className: "",
    };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // 格式化规则条件
  const formatConditions = (conditions: any): string => {
    if (!conditions) return "无条件";

    try {
      let result = "";

      if (conditions.type) {
        result += `${conditions.type}`;
      }

      if (conditions.subject && conditions.subject !== "全部") {
        result += ` (${conditions.subject})`;
      }

      if (conditions.threshold && conditions.operator) {
        result += ` ${conditions.operator} ${conditions.threshold}`;
      }

      if (conditions.unit) {
        result += ` ${conditions.unit}`;
      }

      if (Array.isArray(conditions.factors) && conditions.factors.length > 0) {
        result += ` [${conditions.factors.join(", ")}]`;
      }

      return result || "复合条件";
    } catch (e) {
      return JSON.stringify(conditions);
    }
  };

  // 限制显示的规则数量
  const displayedRules = limit ? filteredRules.slice(0, limit) : filteredRules;

  // 简化版的规则列表
  if (simplified) {
    return (
      <div className="space-y-3">
        {displayedRules.length === 0 && !isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>暂无预警规则</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="rounded-md border p-3 animate-pulse bg-gray-50"
              >
                <div className="w-1/3 h-4 bg-gray-200 rounded mb-2"></div>
                <div className="w-2/3 h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayedRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex justify-between items-center p-3 rounded-md border hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleEditRule(rule)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{rule.name}</span>
                      {getSeverityBadge(rule.severity)}
                      {getScopeBadge(rule.scope)}
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => {
                          handleToggleActive(rule, checked);
                          // 防止点击开关时触发父元素的点击事件
                          event?.stopPropagation();
                        }}
                        className="ml-auto data-[state=checked]:bg-[#c0ff3f]"
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {formatConditions(rule.conditions)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                </div>
              ))}
            </div>

            {showViewAllButton && (
              <Button
                variant="outline"
                onClick={onViewAllClick}
                className="w-full mt-2 text-sm h-9"
              >
                管理预警规则
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              预警规则管理
            </CardTitle>
            <CardDescription>
              配置学生预警规则，系统将根据这些规则自动识别风险学生
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRules}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "刷新中..." : "刷新"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(true)}
            >
              <Wand2 className="h-4 w-4 mr-1" />
              模板
            </Button>
            <Button
              onClick={handleOpenSimpleBuilder}
              className="bg-[#B9FF66] text-black border-2 border-black font-bold shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000]"
            >
              <Plus className="h-4 w-4 mr-1" />
              创建规则
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenRuleBuilder}
              className="border-2 border-gray-300 bg-white text-gray-600 font-bold"
            >
              <Brain className="h-4 w-4 mr-1" />
              高级构建
            </Button>
            <Button variant="outline" onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-1" />
              手动创建
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 筛选器 */}
        <div className="mb-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="搜索规则名称或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filter.scope || ""}
              onValueChange={(value) =>
                setFilter({ ...filter, scope: value || undefined })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="范围" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部范围</SelectItem>
                <SelectItem value="global">全局</SelectItem>
                <SelectItem value="exam">考试</SelectItem>
                <SelectItem value="class">班级</SelectItem>
                <SelectItem value="student">学生</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter.category || ""}
              onValueChange={(value) =>
                setFilter({ ...filter, category: value || undefined })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="grade">成绩</SelectItem>
                <SelectItem value="progress">进步</SelectItem>
                <SelectItem value="homework">作业</SelectItem>
                <SelectItem value="attendance">出勤</SelectItem>
                <SelectItem value="behavior">行为</SelectItem>
                <SelectItem value="composite">综合</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter.severity || ""}
              onValueChange={(value) =>
                setFilter({ ...filter, severity: value || undefined })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="严重程度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filter.is_active?.toString() || ""}
              onValueChange={(value) =>
                setFilter({
                  ...filter,
                  is_active: value ? value === "true" : undefined,
                })
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="true">已启用</SelectItem>
                <SelectItem value="false">已禁用</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              清除
            </Button>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>范围</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>严重程度</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>条件</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <p>加载中...</p>
                  </TableCell>
                </TableRow>
              ) : displayedRules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    暂无预警规则
                  </TableCell>
                </TableRow>
              ) : (
                displayedRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{rule.name}</div>
                        {rule.description && (
                          <div
                            className="text-sm text-gray-500 mt-1 max-w-[200px] truncate"
                            title={rule.description}
                          >
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getScopeBadge(rule.scope)}</TableCell>
                    <TableCell>{getCategoryBadge(rule.category)}</TableCell>
                    <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {rule.priority || 5}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div
                        className="truncate"
                        title={formatConditions(rule.conditions)}
                      >
                        {formatConditions(rule.conditions)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) =>
                          handleToggleActive(rule, checked)
                        }
                        className="data-[state=checked]:bg-[#c0ff3f]"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!rule.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRule(rule)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 限制数量时显示查看全部按钮 */}
        {limit && filteredRules.length > limit && showViewAllButton && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onViewAllClick}>
              查看全部 ({filteredRules.length}) 条规则
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* 创建/编辑规则对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "编辑预警规则" : "创建预警规则"}
            </DialogTitle>
            <DialogDescription>
              配置预警规则的基本信息和触发条件
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleName">规则名称 *</Label>
                <Input
                  id="ruleName"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="输入规则名称"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rulePriority">优先级</Label>
                <Input
                  id="rulePriority"
                  type="number"
                  min="1"
                  max="10"
                  value={rulePriority}
                  onChange={(e) => setRulePriority(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDescription">规则描述</Label>
              <Textarea
                id="ruleDescription"
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                placeholder="描述此规则的作用和触发条件"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ruleScope">适用范围</Label>
                <Select
                  value={ruleScope}
                  onValueChange={(value: any) => setRuleScope(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">全局范围</SelectItem>
                    <SelectItem value="exam">考试级别</SelectItem>
                    <SelectItem value="class">班级级别</SelectItem>
                    <SelectItem value="student">学生级别</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruleCategory">规则分类</Label>
                <Select
                  value={ruleCategory}
                  onValueChange={(value: any) => setRuleCategory(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grade">成绩相关</SelectItem>
                    <SelectItem value="progress">进步相关</SelectItem>
                    <SelectItem value="homework">作业相关</SelectItem>
                    <SelectItem value="attendance">出勤相关</SelectItem>
                    <SelectItem value="behavior">行为相关</SelectItem>
                    <SelectItem value="composite">综合评估</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleSeverity">严重程度</Label>
              <Select
                value={ruleSeverity}
                onValueChange={(value: any) => setRuleSeverity(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低风险</SelectItem>
                  <SelectItem value="medium">中风险</SelectItem>
                  <SelectItem value="high">高风险</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>触发条件</Label>
              <Textarea
                value={JSON.stringify(ruleConditions, null, 2)}
                onChange={(e) => {
                  try {
                    setRuleConditions(JSON.parse(e.target.value));
                  } catch (err) {
                    // 无效JSON时不更新
                  }
                }}
                placeholder="输入JSON格式的触发条件"
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="autoTrigger"
                  checked={autoTrigger}
                  onCheckedChange={setAutoTrigger}
                  className="data-[state=checked]:bg-[#c0ff3f]"
                />
                <Label htmlFor="autoTrigger">自动触发</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="notificationEnabled"
                  checked={notificationEnabled}
                  onCheckedChange={setNotificationEnabled}
                  className="data-[state=checked]:bg-[#c0ff3f]"
                />
                <Label htmlFor="notificationEnabled">启用通知</Label>
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {isEditMode ? "更新规则" : "创建规则"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模板选择对话框 */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>选择预警规则模板</DialogTitle>
            <DialogDescription>
              选择一个预设模板快速创建预警规则，您可以在创建后进行进一步自定义
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {templates.map((template, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-md transition-shadow border"
                onClick={() => handleCreateFromTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {template.name}
                    <div className="flex gap-1">
                      {getScopeBadge(template.scope)}
                      {getSeverityBadge(template.severity)}
                    </div>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>分类: {getCategoryBadge(template.category)}</span>
                    <span>优先级: {template.priority}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplates(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 简化版规则构建器对话框 */}
      <Dialog open={showSimpleBuilder} onOpenChange={setShowSimpleBuilder}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-gray-50">
          <div className="overflow-y-auto max-h-[95vh]">
            <SimpleRuleBuilder
              onSave={handleSimpleBuilderSave}
              onCancel={() => setShowSimpleBuilder(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 高级规则构建器对话框 */}
      <Dialog open={showRuleBuilder} onOpenChange={setShowRuleBuilder}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-gray-50">
          <DialogHeader className="p-6 border-b bg-white">
            <DialogTitle className="text-xl font-bold text-[#191A23] flex items-center gap-2">
              <Brain className="h-6 w-6 text-[#9C88FF]" />
              高级预警规则构建器
            </DialogTitle>
            <DialogDescription>
              通过可视化拖拽方式构建复杂的预警规则，支持多条件组合和实时预览
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
            <RuleBuilder
              onSave={handleRuleBuilderSave}
              onCancel={() => setShowRuleBuilder(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WarningRules;
