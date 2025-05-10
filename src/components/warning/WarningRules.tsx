import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, AlertTriangle, Pencil, BookOpen, Clock, ClipboardCheck, UserRound, ChevronDown } from "lucide-react";

// 预警规则类型接口
interface WarningRule {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  conditions: {
    threshold: number;
    operator: "lt" | "gt" | "eq";
    value: number;
    unit?: string;
  };
  riskLevel: "high" | "medium" | "low";
  description: string;
  lastModified: string;
}

// 模拟数据
const initialRules: WarningRule[] = [
  {
    id: "r1",
    name: "成绩下降预警",
    type: "grade",
    enabled: true,
    conditions: {
      threshold: 20,
      operator: "gt",
      value: 20,
      unit: "%"
    },
    riskLevel: "high",
    description: "当学生成绩相比上次考试下降超过20%时触发高风险预警",
    lastModified: "2023-10-15"
  },
  {
    id: "r2",
    name: "出勤率预警",
    type: "attendance",
    enabled: true,
    conditions: {
      threshold: 80,
      operator: "lt",
      value: 80,
      unit: "%"
    },
    riskLevel: "medium",
    description: "当学生月出勤率低于80%时触发中风险预警",
    lastModified: "2023-10-12"
  },
  {
    id: "r3",
    name: "作业完成率预警",
    type: "homework",
    enabled: true,
    conditions: {
      threshold: 70,
      operator: "lt",
      value: 70,
      unit: "%"
    },
    riskLevel: "medium",
    description: "当学生周作业完成率低于70%时触发中风险预警",
    lastModified: "2023-10-20"
  },
  {
    id: "r4",
    name: "课堂参与度预警",
    type: "participation",
    enabled: false,
    conditions: {
      threshold: 60,
      operator: "lt",
      value: 60,
      unit: "%"
    },
    riskLevel: "low",
    description: "当学生课堂参与度评分低于60%时触发低风险预警",
    lastModified: "2023-09-30"
  }
];

// 获取规则类型图标
const getRuleTypeIcon = (type: string) => {
  switch (type) {
    case "grade":
      return <BookOpen className="h-4 w-4" />;
    case "attendance":
      return <Clock className="h-4 w-4" />;
    case "homework":
      return <ClipboardCheck className="h-4 w-4" />;
    case "participation":
      return <UserRound className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
};

// 获取规则类型中文名
const getRuleTypeName = (type: string) => {
  switch (type) {
    case "grade":
      return "成绩";
    case "attendance":
      return "出勤";
    case "homework":
      return "作业";
    case "participation":
      return "参与度";
    default:
      return "其他";
  }
};

// 风险等级颜色映射
const riskLevelColors: Record<string, string> = {
  high: "text-red-500 bg-red-50",
  medium: "text-amber-500 bg-amber-50",
  low: "text-blue-500 bg-blue-50"
};

// 风险等级中文名
const riskLevelNames: Record<string, string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险"
};

const WarningRules = () => {
  const [rules, setRules] = useState<WarningRule[]>(initialRules);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WarningRule | null>(null);
  
  // 新规则表单状态
  const [newRule, setNewRule] = useState<Partial<WarningRule>>({
    name: "",
    type: "grade",
    enabled: true,
    conditions: {
      threshold: 20,
      operator: "gt",
      value: 20,
      unit: "%"
    },
    riskLevel: "medium",
    description: ""
  });
  
  // 切换规则启用状态
  const toggleRuleEnabled = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };
  
  // 删除规则
  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };
  
  // 编辑规则
  const startEditRule = (rule: WarningRule) => {
    setEditingRule(rule);
    setNewRule(rule);
    setIsAddDialogOpen(true);
  };
  
  // 保存规则
  const saveRule = () => {
    if (!newRule.name || !newRule.type || !newRule.description) {
      return; // 表单验证
    }
    
    const now = new Date().toISOString().split('T')[0];
    
    if (editingRule) {
      // 更新现有规则
      setRules(rules.map(rule => 
        rule.id === editingRule.id ? 
          { 
            ...rule, 
            ...newRule as WarningRule, 
            lastModified: now 
          } : rule
      ));
    } else {
      // 添加新规则
      const newId = `r${Date.now()}`;
      setRules([
        ...rules, 
        { 
          id: newId,
          ...newRule as WarningRule,
          lastModified: now
        }
      ]);
    }
    
    // 重置表单并关闭对话框
    setNewRule({
      name: "",
      type: "grade",
      enabled: true,
      conditions: {
        threshold: 20,
        operator: "gt",
        value: 20,
        unit: "%"
      },
      riskLevel: "medium",
      description: ""
    });
    setEditingRule(null);
    setIsAddDialogOpen(false);
  };
  
  // 操作符号显示
  const getOperatorDisplay = (operator: string) => {
    switch (operator) {
      case "lt": return "<";
      case "gt": return ">";
      case "eq": return "=";
      default: return operator;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
              预警规则设置
            </CardTitle>
            <CardDescription>
              创建和管理学生学习表现的预警规则，自定义预警条件和风险等级
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  setEditingRule(null);
                  setNewRule({
                    name: "",
                    type: "grade",
                    enabled: true,
                    conditions: {
                      threshold: 20,
                      operator: "gt",
                      value: 20,
                      unit: "%"
                    },
                    riskLevel: "medium",
                    description: ""
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                添加规则
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingRule ? "编辑预警规则" : "添加预警规则"}</DialogTitle>
                <DialogDescription>
                  {editingRule 
                    ? "修改预警规则的参数和触发条件" 
                    : "创建新的预警规则以监测学生学习状态"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">规则名称</Label>
                  <Input 
                    id="rule-name" 
                    placeholder="输入规则名称" 
                    value={newRule.name || ""} 
                    onChange={e => setNewRule({...newRule, name: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-type">规则类型</Label>
                  <Select 
                    value={newRule.type} 
                    onValueChange={value => setNewRule({...newRule, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择规则类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>数据类型</SelectLabel>
                        <SelectItem value="grade">成绩</SelectItem>
                        <SelectItem value="attendance">出勤</SelectItem>
                        <SelectItem value="homework">作业</SelectItem>
                        <SelectItem value="participation">课堂参与度</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>触发条件</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground min-w-[80px]">
                      {newRule.type === "grade" ? "成绩变化" : 
                       newRule.type === "attendance" ? "出勤率" :
                       newRule.type === "homework" ? "作业完成率" : "参与度评分"}
                    </p>
                    <Select 
                      value={newRule.conditions?.operator} 
                      onValueChange={value => setNewRule({
                        ...newRule, 
                        conditions: {...newRule.conditions, operator: value as any}
                      })}
                      className="w-20"
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lt">&lt;</SelectItem>
                        <SelectItem value="gt">&gt;</SelectItem>
                        <SelectItem value="eq">=</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1">
                      <Slider 
                        value={[newRule.conditions?.value || 0]} 
                        min={0} 
                        max={100} 
                        step={1}
                        onValueChange={value => setNewRule({
                          ...newRule, 
                          conditions: {...newRule.conditions, value: value[0]}
                        })}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-w-[60px]">
                      <Input 
                        type="number" 
                        className="w-12 h-8 text-center p-1" 
                        value={newRule.conditions?.value || 0}
                        onChange={e => setNewRule({
                          ...newRule, 
                          conditions: {...newRule.conditions, value: Number(e.target.value)}
                        })}
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="risk-level">风险等级</Label>
                  <Select 
                    value={newRule.riskLevel} 
                    onValueChange={value => setNewRule({...newRule, riskLevel: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">高风险</SelectItem>
                      <SelectItem value="medium">中风险</SelectItem>
                      <SelectItem value="low">低风险</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rule-desc">规则描述</Label>
                  <Input 
                    id="rule-desc" 
                    placeholder="输入规则描述" 
                    value={newRule.description || ""} 
                    onChange={e => setNewRule({...newRule, description: e.target.value})}
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    id="rule-enabled" 
                    checked={newRule.enabled} 
                    onCheckedChange={checked => setNewRule({...newRule, enabled: checked})}
                  />
                  <Label htmlFor="rule-enabled">启用规则</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>取消</Button>
                <Button onClick={saveRule}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {rules.map((rule) => (
            <AccordionItem value={rule.id} key={rule.id} className="border-b border-gray-200 last:border-b-0">
              <div className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors rounded-t-lg">
                <AccordionTrigger asChild>
                  <div className="w-full">
                    <div className="flex items-center space-x-3">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => toggleRuleEnabled(rule.id)}
                          className="data-[state=checked]:bg-[#c0ff3f] data-[state=unchecked]:bg-gray-300"
                        />
                      </div>
                      <div className="flex items-center text-sm font-medium text-gray-800">
                        {getRuleTypeIcon(rule.type)}
                        <span className="ml-2">{rule.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${riskLevelColors[rule.riskLevel] || 'bg-gray-100 text-gray-600'}`}>
                        {riskLevelNames[rule.riskLevel] || '未知等级'}
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                  </div>
                </AccordionTrigger>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); startEditRule(rule); }} className="text-gray-500 hover:text-gray-700">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteRule(rule.id); }} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <AccordionContent className="p-4 pt-0 bg-white rounded-b-lg">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium">触发条件</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      当{getRuleTypeName(rule.type)}
                      {getOperatorDisplay(rule.conditions.operator)}
                      {rule.conditions.value}{rule.conditions.unit} 时触发
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">规则描述</h4>
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium">最后修改时间</h4>
                    <p className="text-sm text-gray-600 mt-1">{rule.lastModified}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter className="border-t pt-6 flex justify-between">
        <div className="text-sm text-gray-500">
          共 {rules.length} 条规则，{rules.filter(r => r.enabled).length} 条已启用
        </div>
        <Button variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          导出规则
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WarningRules;
