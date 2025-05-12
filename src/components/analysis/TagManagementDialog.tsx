import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tag, Plus, Trash2 } from "lucide-react";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';

interface TagManagementDialogProps {
  onTagsChange?: () => void;
}

export const TagManagementDialog: React.FC<TagManagementDialogProps> = ({
  onTagsChange
}) => {
  const [tags, setTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newTag, setNewTag] = useState({
    name: "",
    description: "",
    color: "#3B82F6"
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // 加载标签列表
  const loadTags = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await gradeAnalysisService.getTags();
      
      if (error) throw error;
      
      setTags(data || []);
    } catch (error) {
      console.error("加载标签失败:", error);
      toast.error("加载标签失败");
    } finally {
      setIsLoading(false);
    }
  };
  
  // 当对话框打开时加载标签
  useEffect(() => {
    if (isDialogOpen) {
      loadTags();
    }
  }, [isDialogOpen]);
  
  // 创建新标签
  const handleCreateTag = async () => {
    if (!newTag.name.trim()) {
      toast.error("标签名称不能为空");
      return;
    }
    
    try {
      const { data, error } = await gradeAnalysisService.createTag(
        newTag.name,
        newTag.description,
        newTag.color
      );
      
      if (error) throw error;
      
      toast.success("标签创建成功");
      loadTags();
      setNewTag({ name: "", description: "", color: "#3B82F6" });
      
      if (onTagsChange) {
        onTagsChange();
      }
    } catch (error) {
      console.error("创建标签失败:", error);
      toast.error("创建标签失败");
    }
  };
  
  // 删除标签
  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('grade_tags')
        .delete()
        .eq('id', tagId);
        
      if (error) throw error;
      
      toast.success("标签删除成功");
      loadTags();
      
      if (onTagsChange) {
        onTagsChange();
      }
    } catch (error) {
      console.error("删除标签失败:", error);
      toast.error("删除标签失败");
    }
  };
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Tag className="h-4 w-4" />
          标签管理
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>管理成绩标签</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* 创建新标签 */}
          <div className="space-y-2 border rounded-md p-3">
            <h3 className="text-sm font-medium">创建新标签</h3>
            <div className="grid gap-2">
              <Label htmlFor="tag-name">标签名称</Label>
              <Input 
                id="tag-name" 
                value={newTag.name} 
                onChange={e => setNewTag({...newTag, name: e.target.value})}
                placeholder="输入标签名称" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag-description">描述</Label>
              <Textarea 
                id="tag-description" 
                value={newTag.description} 
                onChange={e => setNewTag({...newTag, description: e.target.value})}
                placeholder="输入标签描述" 
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tag-color">颜色</Label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  id="tag-color" 
                  value={newTag.color} 
                  onChange={e => setNewTag({...newTag, color: e.target.value})}
                  className="w-10 h-8 rounded border"
                />
                <span className="text-sm">{newTag.color}</span>
              </div>
            </div>
            <Button 
              onClick={handleCreateTag} 
              className="w-full mt-2"
            >
              <Plus className="h-4 w-4 mr-1" />
              创建标签
            </Button>
          </div>
          
          {/* 标签列表 */}
          <div className="border rounded-md p-3">
            <h3 className="text-sm font-medium mb-2">现有标签</h3>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-solid border-blue-500 border-r-transparent"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tags.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">暂无标签</p>
                ) : (
                  tags.map(tag => (
                    <div 
                      key={tag.id} 
                      className="flex items-center justify-between p-2 border rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <div>
                          <p className="font-medium">{tag.name}</p>
                          {tag.description && (
                            <p className="text-xs text-gray-500">{tag.description}</p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={tag.is_system}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 