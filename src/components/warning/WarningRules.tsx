import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, Trash2, Edit, RefreshCw, ChevronRight, ExternalLink } from "lucide-react";
import { toast } from 'sonner';
import { getWarningRules, createWarningRule, updateWarningRule, deleteWarningRule, WarningRule } from '@/services/warningService';

interface WarningRulesProps {
  simplified?: boolean; // 是否为简化模式
  limit?: number; // 显示条数限制
  showViewAllButton?: boolean; // 是否显示"查看全部"按钮
  onViewAllClick?: () => void; // "查看全部"按钮点击回调
}

const WarningRules: React.FC<WarningRulesProps> = ({
  simplified = false,
  limit,
  showViewAllButton = false,
  onViewAllClick
}) => {
  const [rules, setRules] = useState<WarningRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRule, setSelectedRule] = useState<WarningRule | null>(null);
  
  // 表单状态
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [ruleSeverity, setRuleSeverity] = useState<'low' | 'medium' | 'high'>('medium');
  const [ruleConditions, setRuleConditions] = useState<any>({
    type: '成绩',
    threshold: 60,
    operator: '<',
    subject: '全部',
    factors: []
  });
  
  // 添加isMounted引用以防止内存泄漏
  const isMounted = useRef(true);
  
  // 组件卸载时清理
  useEffect(() => {
    fetchRules();
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
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
      console.error('获取预警规则失败:', error);
      if (isMounted.current) {
        toast.error('获取预警规则失败');
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
      toast.error('规则名称不能为空');
      return;
    }
    
    const ruleData = {
      name: ruleName,
      description: ruleDescription,
      severity: ruleSeverity,
      conditions: ruleConditions,
      is_active: true,
      is_system: false,
      created_by: null // 应该从认证系统获取当前用户ID
    };
    
    try {
      if (isEditMode && selectedRule) {
        await updateWarningRule(selectedRule.id, ruleData);
      } else {
        await createWarningRule(ruleData);
      }
      
      // 刷新规则列表
      await fetchRules();
      
      // 关闭对话框并重置表单
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('保存规则失败:', error);
      toast.error('保存规则失败');
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
      toast.success('规则已删除');
    } catch (error) {
      console.error('删除规则失败:', error);
      toast.error('删除规则失败');
    }
  };

  // 切换规则状态
  const handleToggleActive = async (rule: WarningRule, active: boolean) => {
    try {
      await updateWarningRule(rule.id, { is_active: active });
      
      // 更新本地状态而不是重新获取
      setRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, is_active: active } : r
      ));
      
      toast.success(`规则已${active ? '启用' : '禁用'}`);
    } catch (error) {
      console.error('更新规则状态失败:', error);
      toast.error('更新规则状态失败');
    }
  };

  // 处理编辑规则
  const handleEditRule = (rule: WarningRule) => {
    setSelectedRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description || '');
    setRuleSeverity(rule.severity);
    setRuleConditions(rule.conditions);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // 处理创建新规则
  const handleCreateRule = () => {
    resetForm();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  // 重置表单
  const resetForm = () => {
    setRuleName('');
    setRuleDescription('');
    setRuleSeverity('medium');
    setRuleConditions({
      type: '成绩',
      threshold: 60,
      operator: '<',
      subject: '全部',
      factors: []
    });
    setSelectedRule(null);
  };

  // 获取严重程度标签样式
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">高</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">中</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">低</Badge>;
      default:
        return <Badge variant="outline">未知</Badge>;
    }
  };
  
  // 格式化规则条件
  const formatConditions = (conditions: any): string => {
    if (!conditions) return '无条件';
    
    try {
      let result = '';
      
      if (conditions.type) {
        result += `${conditions.type}`;
      }
      
      if (conditions.subject && conditions.subject !== '全部') {
        result += ` (${conditions.subject})`;
      }
      
      if (conditions.threshold && conditions.operator) {
        result += ` ${conditions.operator} ${conditions.threshold}`;
      }
      
      if (conditions.unit) {
        result += ` ${conditions.unit}`;
      }
      
      if (Array.isArray(conditions.factors) && conditions.factors.length > 0) {
        result += ` [${conditions.factors.join(', ')}]`;
      }
      
      return result || '复合条件';
    } catch (e) {
      return JSON.stringify(conditions);
    }
  };
  
  // 限制显示的规则数量
  const displayedRules = limit ? rules.slice(0, limit) : rules;

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
              <div key={i} className="rounded-md border p-3 animate-pulse bg-gray-50">
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
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? '刷新中...' : '刷新'}
            </Button>
            <Button onClick={handleCreateRule}>
              <Plus className="h-4 w-4 mr-1" />
              新增规则
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>规则名称</TableHead>
                <TableHead>严重程度</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>条件</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                    <p>加载中...</p>
                  </TableCell>
                </TableRow>
              ) : displayedRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    暂无预警规则
                  </TableCell>
                </TableRow>
              ) : (
                displayedRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{getSeverityBadge(rule.severity)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={rule.description || ''}>
                      {rule.description || '无描述'}
                    </TableCell>
                    <TableCell>
                      {formatConditions(rule.conditions)}
                    </TableCell>
                    <TableCell>
                      <Switch 
                        checked={rule.is_active} 
                        onCheckedChange={(checked) => handleToggleActive(rule, checked)}
                        className="data-[state=checked]:bg-[#c0ff3f]"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditRule(rule)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!rule.is_system && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule)}>
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
        {limit && rules.length > limit && showViewAllButton && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={onViewAllClick}>
              查看全部 ({rules.length}) 条规则
              <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
          </div>
        )}
      </CardContent>

      {/* 新增/编辑预警规则对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleSubmit}>
              <DialogHeader>
              <DialogTitle>{isEditMode ? '编辑预警规则' : '新增预警规则'}</DialogTitle>
                <DialogDescription>
                定义自动触发学生预警的条件规则，系统将根据这些规则识别风险学生
                </DialogDescription>
              </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                  <Label htmlFor="rule-name">规则名称</Label>
                  <Input 
                    id="rule-name" 
                  value={ruleName} 
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="例如: 低分预警、出勤问题等"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="rule-description">规则描述</Label>
                <Textarea 
                  id="rule-description" 
                  value={ruleDescription} 
                  onChange={(e) => setRuleDescription(e.target.value)}
                  placeholder="详细描述该规则的触发条件和目的"
                  rows={3}
                  />
                </div>
                
              <div className="grid gap-2">
                <Label htmlFor="rule-severity">严重程度</Label>
                <Select value={ruleSeverity} onValueChange={(value: any) => setRuleSeverity(value)}>
                    <SelectTrigger>
                    <SelectValue placeholder="选择严重程度" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="high">高风险</SelectItem>
                    <SelectItem value="medium">中风险</SelectItem>
                    <SelectItem value="low">低风险</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
              <div className="grid gap-4">
                <Label>规则条件</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rule-type" className="text-sm">预警类型</Label>
                    <Select 
                      value={ruleConditions.type} 
                      onValueChange={(value) => setRuleConditions({...ruleConditions, type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择预警类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="成绩">成绩预警</SelectItem>
                        <SelectItem value="出勤">出勤预警</SelectItem>
                        <SelectItem value="作业">作业预警</SelectItem>
                        <SelectItem value="行为">行为预警</SelectItem>
                        <SelectItem value="参与度">课堂参与度</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
                
                  <div>
                    <Label htmlFor="rule-subject" className="text-sm">科目</Label>
                  <Select 
                      value={ruleConditions.subject} 
                      onValueChange={(value) => setRuleConditions({...ruleConditions, subject: value})}
                  >
                    <SelectTrigger>
                        <SelectValue placeholder="选择科目" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="全部">全部科目</SelectItem>
                        <SelectItem value="数学">数学</SelectItem>
                        <SelectItem value="语文">语文</SelectItem>
                        <SelectItem value="英语">英语</SelectItem>
                        <SelectItem value="物理">物理</SelectItem>
                        <SelectItem value="化学">化学</SelectItem>
                        <SelectItem value="生物">生物</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="rule-operator" className="text-sm">操作符</Label>
                    <Select 
                      value={ruleConditions.operator} 
                      onValueChange={(value) => setRuleConditions({...ruleConditions, operator: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择操作符" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<">小于 (&lt;)</SelectItem>
                        <SelectItem value="<=">小于等于 (&le;)</SelectItem>
                        <SelectItem value=">">大于 (&gt;)</SelectItem>
                        <SelectItem value=">=">大于等于 (&ge;)</SelectItem>
                        <SelectItem value="==">等于 (=)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="rule-threshold" className="text-sm">阈值</Label>
                    <Input 
                      id="rule-threshold" 
                      type="number"
                      value={ruleConditions.threshold} 
                      onChange={(e) => setRuleConditions({
                        ...ruleConditions, 
                        threshold: parseInt(e.target.value)
                      })}
                    />
                  </div>
                </div>
              </div>
        </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
        </Button>
              <Button type="submit">保存规则</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WarningRules;
