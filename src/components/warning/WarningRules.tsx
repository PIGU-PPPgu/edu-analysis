
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  PlayCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { warningSystem } from "@/utils/dbUtils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { WarningCondition } from "@/components/analysis/types";

// Define the severity type
type SeverityType = "low" | "medium" | "high";

// Condition types with descriptions
const conditionTypes = [
  { 
    value: 'score', 
    label: '成绩', 
    description: '基于学生考试成绩进行预警' 
  },
  { 
    value: 'attendance', 
    label: '出勤率', 
    description: '基于学生课堂出勤情况进行预警' 
  },
  { 
    value: 'homework', 
    label: '作业完成', 
    description: '基于学生作业提交和完成质量进行预警' 
  },
  { 
    value: 'participation', 
    label: '课堂参与', 
    description: '基于学生课堂参与度进行预警' 
  },
  { 
    value: 'trend', 
    label: '成绩趋势', 
    description: '基于学生成绩变化趋势进行预警' 
  }
];

// Subject options
const subjects = [
  '全部科目',
  '数学',
  '语文',
  '英语',
  '物理',
  '化学',
  '生物',
  '历史',
  '地理',
  '政治'
];

interface ConditionFormProps {
  condition: WarningCondition;
  onChange: (updatedCondition: WarningCondition) => void;
  onRemove: () => void;
  isRemovable: boolean;
}

const ConditionForm: React.FC<ConditionFormProps> = ({
  condition,
  onChange,
  onRemove,
  isRemovable
}) => {
  const handleTypeChange = (value: string) => {
    const selectedType = conditionTypes.find(t => t.value === value);
    if (selectedType) {
      onChange({
        ...condition,
        type: value as any,
        description: selectedType.description
      });
    }
  };

  const handleOperatorChange = (value: string) => {
    onChange({
      ...condition,
      operator: value as any
    });
  };

  const handleThresholdChange = (value: number) => {
    onChange({
      ...condition,
      threshold: value
    });
  };

  const handleSubjectChange = (value: string) => {
    onChange({
      ...condition,
      subject: value === '全部科目' ? undefined : value
    });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg relative">
      {isRemovable && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="type">预警维度</Label>
        <Select
          value={condition.type}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择预警维度" />
          </SelectTrigger>
          <SelectContent>
            {conditionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{condition.description}</p>
      </div>
      
      {condition.type === 'score' && (
        <div className="space-y-2">
          <Label htmlFor="subject">适用科目</Label>
          <Select
            value={condition.subject || '全部科目'}
            onValueChange={handleSubjectChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>
                  {subject}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="operator">比较方式</Label>
        <Select
          value={condition.operator}
          onValueChange={handleOperatorChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择比较方式" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="less_than">小于</SelectItem>
            <SelectItem value="greater_than">大于</SelectItem>
            <SelectItem value="equal_to">等于</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="threshold">阈值</Label>
        <Input
          id="threshold"
          type="number"
          value={condition.threshold}
          onChange={(e) => handleThresholdChange(Number(e.target.value))}
          placeholder="设置阈值"
          required
        />
        <p className="text-xs text-muted-foreground">
          {condition.type === 'score' && '分数取值范围：0-100'}
          {condition.type === 'attendance' && '出勤率取值范围：0-100%'}
          {condition.type === 'homework' && '作业完成率取值范围：0-100%'}
          {condition.type === 'participation' && '课堂参与度取值范围：0-100分'}
          {condition.type === 'trend' && '成绩趋势变化百分比，负值表示下降'}
        </p>
      </div>
    </div>
  );
};

const WarningRules = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<SeverityType>("medium");
  const [conditions, setConditions] = useState<WarningCondition[]>([{
    type: 'score',
    operator: 'less_than',
    threshold: 60,
    description: '基于学生考试成绩进行预警'
  }]);
  const [evaluating, setEvaluating] = useState(false);

  const { data: rules = [], refetch } = useQuery({
    queryKey: ['warning-rules'],
    queryFn: () => warningSystem.getWarningRules()
  });

  const handleAddCondition = () => {
    setConditions([
      ...conditions, 
      {
        type: 'score',
        operator: 'less_than',
        threshold: 60,
        description: '基于学生考试成绩进行预警'
      }
    ]);
  };

  const handleUpdateCondition = (index: number, updatedCondition: WarningCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = updatedCondition;
    setConditions(newConditions);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length > 1) {
      const newConditions = conditions.filter((_, i) => i !== index);
      setConditions(newConditions);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await warningSystem.createWarningRule({
        name,
        description,
        severity,
        conditions
      });
      toast.success("预警规则创建成功");
      setIsOpen(false);
      refetch();
      // 重置表单
      setName("");
      setDescription("");
      setSeverity("medium");
      setConditions([{
        type: 'score',
        operator: 'less_than',
        threshold: 60,
        description: '基于学生考试成绩进行预警'
      }]);
    } catch (error) {
      toast.error("创建预警规则失败");
      console.error(error);
    }
  };

  const handleEvaluateRules = async () => {
    setEvaluating(true);
    try {
      await warningSystem.evaluateWarningRules();
      toast.success("规则评估完成，已更新学生风险等级");
    } catch (error) {
      toast.error("规则评估失败");
      console.error(error);
    } finally {
      setEvaluating(false);
    }
  };

  // Helper function to get condition type label
  const getConditionTypeLabel = (type: string) => {
    const conditionType = conditionTypes.find(c => c.value === type);
    return conditionType?.label || type;
  };

  // Helper function to get operator label
  const getOperatorLabel = (operator: string) => {
    switch (operator) {
      case 'less_than': return '小于';
      case 'greater_than': return '大于';
      case 'equal_to': return '等于';
      default: return operator;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          预警规则管理
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleEvaluateRules}
              disabled={evaluating || rules.length === 0}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {evaluating ? "评估中..." : "评估规则"}
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  添加规则
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新建预警规则</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRule} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">规则名称</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="输入规则名称"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">规则描述</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="输入规则描述"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="severity">风险等级</Label>
                    <Select
                      value={severity}
                      onValueChange={(value: any) => setSeverity(value as SeverityType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择风险等级" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低风险</SelectItem>
                        <SelectItem value="medium">中风险</SelectItem>
                        <SelectItem value="high">高风险</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      触发条件
                    </Label>
                    <div className="space-y-4">
                      {conditions.map((condition, index) => (
                        <ConditionForm
                          key={index}
                          condition={condition}
                          onChange={(updatedCondition) => handleUpdateCondition(index, updatedCondition)}
                          onRemove={() => handleRemoveCondition(index)}
                          isRemovable={conditions.length > 1}
                        />
                      ))}
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddCondition}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" /> 添加条件
                    </Button>
                  </div>
                  <Button type="submit" className="w-full">
                    创建规则
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              暂无预警规则，请添加新规则
            </div>
          ) : (
            rules.map((rule: any) => (
              <div
                key={rule.id}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-gray-500">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`px-2 py-1 ${
                      rule.severity === 'high' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                      rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' :
                      'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}>
                      {rule.severity === 'high' ? '高风险' :
                      rule.severity === 'medium' ? '中风险' : '低风险'}
                    </Badge>
                    <Button variant="outline" size="sm" disabled={rule.is_system}>
                      {rule.is_system ? '系统规则' : '编辑'}
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {Array.isArray(rule.conditions) ? (
                    rule.conditions.map((condition: any, i: number) => (
                      <div key={i} className="text-xs border p-2 rounded bg-muted">
                        <span className="font-medium">{getConditionTypeLabel(condition.type)}</span>
                        {condition.subject && <span> ({condition.subject})</span>}
                        <span className="mx-1">{getOperatorLabel(condition.operator)}</span>
                        <span className="font-medium">{condition.threshold}</span>
                        {condition.type === 'attendance' && <span>%</span>}
                        {condition.type === 'homework' && <span>%</span>}
                      </div>
                    ))
                  ) : (
                    // 处理旧数据格式
                    <div className="text-xs border p-2 rounded bg-muted">
                      <span className="font-medium">成绩</span>
                      <span className="mx-1">
                        {rule.conditions.operator === 'less_than' ? '小于' : 
                        rule.conditions.operator === 'greater_than' ? '大于' : '等于'}
                      </span>
                      <span className="font-medium">{rule.conditions.threshold}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WarningRules;
