import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Tag, 
  Filter, 
  Plus, 
  X, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface GradeTagsPanelProps {
  examId?: string;
  selectedGradeIds?: string[];
  onTagsApplied?: () => void;
}

export const GradeTagsPanel: React.FC<GradeTagsPanelProps> = ({
  examId,
  selectedGradeIds = [],
  onTagsApplied
}) => {
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const [taggedGradeData, setTaggedGradeData] = useState<any[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isApplyingTags, setIsApplyingTags] = useState(false);
  
  // 加载标签列表
  useEffect(() => {
    const loadTags = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await gradeAnalysisService.getTags();
        
        if (error) throw error;
        
        setTags(data || []);
        
        // 如果有标签，默认选择第一个
        if (data && data.length > 0 && !activeTagId) {
          setActiveTagId(data[0].id);
          await loadTaggedGrades(data[0].id);
        }
      } catch (error) {
        console.error("加载标签失败:", error);
        toast.error("加载标签失败");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTags();
  }, []);
  
  // 加载带有特定标签的成绩
  const loadTaggedGrades = async (tagId: string) => {
    if (!tagId) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await gradeAnalysisService.getGradesByTag(tagId);
      
      if (error) throw error;
      
      setTaggedGradeData(data || []);
    } catch (error) {
      console.error("加载标签成绩失败:", error);
      toast.error("加载标签成绩失败");
    } finally {
      setIsLoading(false);
    }
  };
  
  // 切换标签选择
  const handleTagClick = (tagId: string) => {
    setActiveTagId(tagId);
    loadTaggedGrades(tagId);
  };
  
  // 切换标签选择
  const handleTagSelect = (tagId: string) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  };
  
  // 应用标签到选中的成绩
  const applyTagsToSelectedGrades = async () => {
    if (selectedTagIds.length === 0 || selectedGradeIds.length === 0) {
      toast.error("请至少选择一个标签和一条成绩");
      return;
    }
    
    setIsApplyingTags(true);
    
    try {
      // 为每个选中的成绩添加每个选中的标签
      for (const gradeId of selectedGradeIds) {
        for (const tagId of selectedTagIds) {
          await gradeAnalysisService.addTagToGradeData(gradeId, tagId);
        }
      }
      
      toast.success(`已为${selectedGradeIds.length}条成绩应用${selectedTagIds.length}个标签`);
      
      // 刷新当前标签的成绩列表
      if (activeTagId) {
        await loadTaggedGrades(activeTagId);
      }
      
      // 调用外部回调
      if (onTagsApplied) {
        onTagsApplied();
      }
      
      // 清除选中的标签
      setSelectedTagIds([]);
    } catch (error) {
      console.error("应用标签失败:", error);
      toast.error("应用标签失败");
    } finally {
      setIsApplyingTags(false);
    }
  };
  
  // 从成绩中移除标签
  const removeTagFromGrade = async (gradeId: string, tagId: string) => {
    try {
      setIsLoading(true);
      const { success, error } = await gradeAnalysisService.removeTagFromGradeData(gradeId, tagId);
      
      if (error) throw error;
      
      if (success) {
        toast.success("标签已移除");
        
        // 从列表中移除
        setTaggedGradeData(prev => prev.filter(item => item.id !== gradeId));
      }
    } catch (error) {
      console.error("移除标签失败:", error);
      toast.error("移除标签失败");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Tag className="h-5 w-5 text-blue-500" />
            成绩标签管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* 标签列表 */}
              <div>
                <h3 className="text-sm font-medium mb-2">选择标签</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <div className="text-center w-full py-4 text-gray-500">
                      暂无标签，请先创建标签
                    </div>
                  ) : (
                    tags.map(tag => (
                      <Badge
                        key={tag.id}
                        variant={activeTagId === tag.id ? "default" : "outline"}
                        className="cursor-pointer"
                        style={{ 
                          backgroundColor: activeTagId === tag.id ? tag.color : 'transparent',
                          borderColor: tag.color,
                          color: activeTagId === tag.id ? 'white' : tag.color
                        }}
                        onClick={() => handleTagClick(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              
              {/* 带有该标签的成绩列表 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">带有该标签的成绩</h3>
                  <Badge variant="outline" className="text-gray-500">
                    {taggedGradeData.length} 条记录
                  </Badge>
                </div>
                
                <ScrollArea className="h-[200px] border rounded-md">
                  {taggedGradeData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <AlertCircle className="h-8 w-8 mb-2 text-gray-300" />
                      <p>暂无数据</p>
                      <p className="text-xs">该标签尚未应用于任何成绩</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {taggedGradeData.map(grade => (
                        <div 
                          key={grade.id} 
                          className="flex items-center justify-between p-2 border rounded-md"
                        >
                          <div>
                            <p className="font-medium">{grade.name}</p>
                            <div className="flex text-xs text-gray-500 gap-2">
                              <span>{grade.student_id}</span>
                              <span>{grade.class_name}</span>
                              <span className="font-medium">
                                {grade.total_score}分
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => activeTagId && removeTagFromGrade(grade.id, activeTagId)}
                            title="移除标签"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
              
              {/* 为选中的成绩应用标签 */}
              {selectedGradeIds.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">
                      为选中的 {selectedGradeIds.length} 条成绩应用标签
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>应用标签</DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <p className="text-sm text-gray-500 mb-4">
                        选择要应用的标签（可多选）：
                      </p>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {tags.map(tag => (
                          <label 
                            key={tag.id} 
                            className="flex items-center space-x-2 p-2 border rounded-md cursor-pointer"
                          >
                            <Checkbox 
                              checked={selectedTagIds.includes(tag.id)} 
                              onCheckedChange={() => handleTagSelect(tag.id)} 
                            />
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: tag.color }}
                              ></div>
                              <span className="font-medium">{tag.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        onClick={applyTagsToSelectedGrades}
                        disabled={isApplyingTags || selectedTagIds.length === 0}
                      >
                        {isApplyingTags && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        应用标签
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 