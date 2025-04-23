
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
import { Plus, PlayCircle, AlertTriangle } from "lucide-react";
import { warningSystem } from "@/utils/dbUtils";
import { toast } from "sonner";

// Define the severity type to match what's expected in the warning system
type SeverityType = "low" | "medium" | "high";
type OperatorType = "less_than" | "greater_than" | "equal_to";

interface ConditionFormProps {
  threshold: number;
  operator: OperatorType;
  setThreshold: (value: number) => void;
  setOperator: (value: OperatorType) => void;
}

const ConditionForm: React.FC<ConditionFormProps> = ({
  threshold,
  operator,
  setThreshold,
  setOperator,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="operator">比较方式</Label>
        <Select
          value={operator}
          onValueChange={(value: any) => setOperator(value as OperatorType)}
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
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          placeholder="设置阈值"
          required
        />
      </div>
    </div>
  );
};

const WarningRules = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<SeverityType>("medium");
  const [threshold, setThreshold] = useState(60);
  const [operator, setOperator] = useState<OperatorType>("less_than");
  const [evaluating, setEvaluating] = useState(false);

  const { data: rules = [], refetch } = useQuery({
    queryKey: ['warning-rules'],
    queryFn: () => warningSystem.getWarningRules()
  });

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await warningSystem.createWarningRule({
        name,
        description,
        severity,
        conditions: {
          threshold,
          operator
        }
      });
      toast.success("预警规则创建成功");
      setIsOpen(false);
      refetch();
      // 重置表单
      setName("");
      setDescription("");
      setSeverity("medium");
      setThreshold(60);
      setOperator("less_than");
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
              <DialogContent>
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
                    <ConditionForm 
                      threshold={threshold}
                      operator={operator}
                      setThreshold={setThreshold}
                      setOperator={setOperator}
                    />
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
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{rule.name}</h4>
                  <p className="text-sm text-gray-500">{rule.description}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    条件: {rule.conditions.operator === 'less_than' ? '小于' : 
                          rule.conditions.operator === 'greater_than' ? '大于' : '等于'} {rule.conditions.threshold}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    rule.severity === 'high' ? 'bg-red-100 text-red-700' :
                    rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {rule.severity === 'high' ? '高风险' :
                    rule.severity === 'medium' ? '中风险' : '低风险'}
                  </span>
                  <Button variant="outline" size="sm" disabled={rule.is_system}>
                    {rule.is_system ? '系统规则' : '编辑'}
                  </Button>
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
