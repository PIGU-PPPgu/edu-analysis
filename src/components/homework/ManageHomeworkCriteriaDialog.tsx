import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

interface ManageHomeworkCriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeworkId: string;
  onUpdated: () => void;
}

// 评分标准类型
interface CriteriaItem {
  id?: string;
  name: string;
  description: string;
  weight: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

// 知识点类型
interface KnowledgePointItem {
  id?: string;
  name: string;
  description: string;
  isNew?: boolean;
  isDeleted?: boolean;
}

const ManageHomeworkCriteriaDialog: React.FC<ManageHomeworkCriteriaDialogProps> = ({
  open,
  onOpenChange,
  homeworkId,
  onUpdated
}) => {
  const [criteria, setCriteria] = useState<CriteriaItem[]>([]);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePointItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("criteria");

  // 获取评分标准和知识点
  useEffect(() => {
    const fetchData = async () => {
      if (open && homeworkId) {
        setIsLoading(true);
        try {
          // 获取评分标准
          const { data: criteriaData, error: criteriaError } = await supabase
            .from('grading_criteria')
            .select('*')
            .eq('homework_id', homeworkId)
            .order('name');
          
          if (criteriaError) throw criteriaError;
          
          // 获取知识点
          const { data: knowledgeData, error: knowledgeError } = await supabase
            .from('knowledge_points')
            .select('*')
            .eq('homework_id', homeworkId)
            .order('name');
          
          if (knowledgeError) throw knowledgeError;
          
          setCriteria(criteriaData || []);
          setKnowledgePoints(knowledgeData || []);
        } catch (error) {
          console.error('获取数据失败:', error);
          toast.error('获取数据失败');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchData();
  }, [open, homeworkId]);

  // 添加评分标准
  const addCriteria = () => {
    setCriteria([
      ...criteria,
      {
        name: '',
        description: '',
        weight: 0,
        isNew: true
      }
    ]);
  };

  // 添加知识点
  const addKnowledgePoint = () => {
    setKnowledgePoints([
      ...knowledgePoints,
      {
        name: '',
        description: '',
        isNew: true
      }
    ]);
  };

  // 更新评分标准
  const updateCriteria = (index: number, field: string, value: string | number) => {
    setCriteria(criteria.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // 更新知识点
  const updateKnowledgePoint = (index: number, field: string, value: string) => {
    setKnowledgePoints(knowledgePoints.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // 删除评分标准
  const deleteCriteria = (index: number) => {
    setCriteria(criteria.map((item, i) => 
      i === index ? { ...item, isDeleted: true } : item
    ));
  };

  // 删除知识点
  const deleteKnowledgePoint = (index: number) => {
    setKnowledgePoints(knowledgePoints.map((item, i) => 
      i === index ? { ...item, isDeleted: true } : item
    ));
  };

  // 验证评分标准总权重是否为100%
  const validateCriteria = () => {
    const activeCriteria = criteria.filter(item => !item.isDeleted);
    if (activeCriteria.length === 0) return true; // 如果没有标准，则验证通过
    
    const totalWeight = activeCriteria.reduce((sum, item) => sum + Number(item.weight), 0);
    return Math.abs(totalWeight - 100) < 0.001; // 浮点数比较，允许小误差
  };

  // 保存所有更改
  const handleSave = async () => {
    // 验证评分标准总权重
    if (!validateCriteria()) {
      toast.error('评分标准权重总和必须为100%');
      return;
    }
    
    // 验证所有字段
    const invalidCriteria = criteria
      .filter(item => !item.isDeleted)
      .some(item => !item.name.trim());
    
    const invalidKnowledge = knowledgePoints
      .filter(item => !item.isDeleted)
      .some(item => !item.name.trim());
    
    if (invalidCriteria || invalidKnowledge) {
      toast.error('所有项目必须填写名称');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // 处理评分标准
      const criteriaToAdd = criteria.filter(item => item.isNew && !item.isDeleted);
      const criteriaToDelete = criteria.filter(item => !item.isNew && item.isDeleted);
      const criteriaToUpdate = criteria.filter(item => !item.isNew && !item.isDeleted);
      
      // 添加新评分标准
      if (criteriaToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('grading_criteria')
          .insert(criteriaToAdd.map(item => ({
            homework_id: homeworkId,
            name: item.name.trim(),
            description: item.description.trim() || null,
            weight: Number(item.weight)
          })));
        
        if (addError) throw addError;
      }
      
      // 更新现有评分标准
      for (const item of criteriaToUpdate) {
        const { error: updateError } = await supabase
          .from('grading_criteria')
          .update({
            name: item.name.trim(),
            description: item.description.trim() || null,
            weight: Number(item.weight)
          })
          .eq('id', item.id);
        
        if (updateError) throw updateError;
      }
      
      // 删除评分标准
      if (criteriaToDelete.length > 0) {
        const idsToDelete = criteriaToDelete.map(item => item.id);
        const { error: deleteError } = await supabase
          .from('grading_criteria')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) throw deleteError;
      }
      
      // 处理知识点
      const knowledgeToAdd = knowledgePoints.filter(item => item.isNew && !item.isDeleted);
      const knowledgeToDelete = knowledgePoints.filter(item => !item.isNew && item.isDeleted);
      const knowledgeToUpdate = knowledgePoints.filter(item => !item.isNew && !item.isDeleted);
      
      // 添加新知识点
      if (knowledgeToAdd.length > 0) {
        const { error: addError } = await supabase
          .from('knowledge_points')
          .insert(knowledgeToAdd.map(item => ({
            homework_id: homeworkId,
            name: item.name.trim(),
            description: item.description.trim() || null
          })));
        
        if (addError) throw addError;
      }
      
      // 更新现有知识点
      for (const item of knowledgeToUpdate) {
        const { error: updateError } = await supabase
          .from('knowledge_points')
          .update({
            name: item.name.trim(),
            description: item.description.trim() || null
          })
          .eq('id', item.id);
        
        if (updateError) throw updateError;
      }
      
      // 删除知识点
      if (knowledgeToDelete.length > 0) {
        const idsToDelete = knowledgeToDelete.map(item => item.id);
        const { error: deleteError } = await supabase
          .from('knowledge_points')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) throw deleteError;
      }
      
      toast.success('保存成功');
      onUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px]">
        <DialogHeader>
          <DialogTitle>管理评分标准和知识点</DialogTitle>
          <DialogDescription>
            为作业定义评分标准和相关知识点
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="criteria">评分标准</TabsTrigger>
            <TabsTrigger value="knowledge">知识点</TabsTrigger>
          </TabsList>
          
          <TabsContent value="criteria" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">评分标准</h3>
              <Button type="button" variant="outline" size="sm" onClick={addCriteria}>
                <Plus className="h-4 w-4 mr-2" />
                添加标准
              </Button>
            </div>
            
            <div className="space-y-3">
              {criteria.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-4">
                  尚未定义评分标准，点击"添加标准"开始添加
                </p>
              )}
              
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
                </div>
              ) : (
                criteria
                  .filter(item => !item.isDeleted)
                  .map((item, index) => (
                    <Card key={item.id || `new-${index}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="grid grid-cols-[1fr,auto] gap-2">
                          <div className="space-y-2">
                            <Label htmlFor={`criteria-name-${index}`}>标准名称</Label>
                            <Input
                              id={`criteria-name-${index}`}
                              value={item.name}
                              onChange={(e) => updateCriteria(index, 'name', e.target.value)}
                              placeholder="例如：代码质量、文档完整性"
                            />
                          </div>
                          <div className="space-y-2 w-24">
                            <Label htmlFor={`criteria-weight-${index}`}>权重 (%)</Label>
                            <Input
                              id={`criteria-weight-${index}`}
                              type="number"
                              min="0"
                              max="100"
                              value={item.weight}
                              onChange={(e) => updateCriteria(index, 'weight', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`criteria-description-${index}`}>描述</Label>
                          <Textarea
                            id={`criteria-description-${index}`}
                            value={item.description}
                            onChange={(e) => updateCriteria(index, 'description', e.target.value)}
                            placeholder="对此评分标准的详细说明..."
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCriteria(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
            
            {criteria.filter(item => !item.isDeleted).length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  权重总和: {criteria.filter(item => !item.isDeleted).reduce((sum, item) => sum + Number(item.weight), 0)}%
                </p>
                {Math.abs(criteria.filter(item => !item.isDeleted).reduce((sum, item) => sum + Number(item.weight), 0) - 100) > 0.001 && (
                  <p className="text-sm text-destructive">权重总和必须为100%</p>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="knowledge" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">知识点</h3>
              <Button type="button" variant="outline" size="sm" onClick={addKnowledgePoint}>
                <Plus className="h-4 w-4 mr-2" />
                添加知识点
              </Button>
            </div>
            
            <div className="space-y-3">
              {knowledgePoints.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-4">
                  尚未定义知识点，点击"添加知识点"开始添加
                </p>
              )}
              
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
                </div>
              ) : (
                knowledgePoints
                  .filter(item => !item.isDeleted)
                  .map((item, index) => (
                    <Card key={item.id || `new-${index}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor={`knowledge-name-${index}`}>知识点名称</Label>
                          <Input
                            id={`knowledge-name-${index}`}
                            value={item.name}
                            onChange={(e) => updateKnowledgePoint(index, 'name', e.target.value)}
                            placeholder="例如：面向对象编程、数据结构"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`knowledge-description-${index}`}>描述</Label>
                          <Textarea
                            id={`knowledge-description-${index}`}
                            value={item.description}
                            onChange={(e) => updateKnowledgePoint(index, 'description', e.target.value)}
                            placeholder="对此知识点的详细说明..."
                            rows={2}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteKnowledgePoint(index)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存更改
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageHomeworkCriteriaDialog; 