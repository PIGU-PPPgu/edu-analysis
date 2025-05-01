import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Tag, Plus, X, Pencil, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { StudentData } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { portraitAPI } from "@/lib/api/portrait";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  student: StudentData;
}

interface TagsType {
  learningStyle: string[];
  strengths: string[];
  improvements: string[];
  personalityTraits: string[];
}

const colorMap = {
  learningStyle: "bg-blue-100 text-blue-800",
  strengths: "bg-green-100 text-green-800",
  improvements: "bg-amber-100 text-amber-800",
  personalityTraits: "bg-purple-100 text-purple-800",
  custom: "bg-gray-100 text-gray-800"
};

const AIProfileTags: React.FC<Props> = ({ student }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");
  const [newCustomTag, setNewCustomTag] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // 使用React Query获取学生的AI标签和自定义标签
  const { 
    data: portraitData, 
    isLoading: isLoadingPortrait
  } = useQuery({
    queryKey: ['studentPortrait', student.studentId],
    queryFn: () => portraitAPI.getStudentPortrait(student.studentId),
    enabled: !!student.studentId,
    refetchOnWindowFocus: false
  });
  
  // 使用React Query Mutation保存自定义标签
  const saveTagsMutation = useMutation({
    mutationFn: (tags: string[]) => portraitAPI.saveCustomTags(student.studentId, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentPortrait', student.studentId] });
      toast.success("自定义标签已保存");
    },
    onError: (error) => {
      toast.error("保存标签失败", { description: error.message });
    }
  });

  useEffect(() => {
    const config = getUserAIConfig();
    const apiKey = getUserAPIKey();
    setAiConfigured(!!config && !!apiKey);
  }, []);

  const generateProfileTags = async () => {
    setIsAnalyzing(true);
    
    try {
      const config = getUserAIConfig();
      const apiKey = getUserAPIKey();
      
      if (!config || !apiKey) {
        throw new Error("请先在AI设置中配置大模型API");
      }
      
      // 调用portraitAPI生成标签
      await portraitAPI.generateAIPortraitTags(student.studentId, {
        provider: config.provider,
        version: config.version,
        apiKey: apiKey,
        customProviders: config.customProviders
      });
      
      // 更新标签数据
      queryClient.invalidateQueries({ queryKey: ['studentPortrait', student.studentId] });
      
      toast.success("学生画像分析完成", {
        description: "AI已生成个性化学生画像标签"
      });
    } catch (error) {
      console.error("AI分析失败:", error);
      toast.error("AI分析失败", {
        description: error.message || "无法生成学生画像标签，请稍后重试"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleAddCustomTag = () => {
    if (!newCustomTag.trim()) return;
    
    // 提取当前自定义标签
    const currentCustomTags = portraitData?.customTags || [];
    
    // 确保不添加重复标签
    if (currentCustomTags.includes(newCustomTag.trim())) {
      toast.error("标签已存在");
      return;
    }
    
    // 添加新标签并保存
    const updatedTags = [...currentCustomTags, newCustomTag.trim()];
    saveTagsMutation.mutate(updatedTags);
    setNewCustomTag("");
  };
  
  const handleRemoveCustomTag = (tagToRemove: string) => {
    const currentCustomTags = portraitData?.customTags || [];
    const updatedTags = currentCustomTags.filter(tag => tag !== tagToRemove);
    saveTagsMutation.mutate(updatedTags);
  };
  
  const renderAITags = () => {
    const aiTags = portraitData?.aiTags;
    
    if (!aiTags) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            AI可以分析学生的学习风格、优势领域和发展方向，生成个性化的学生画像标签
          </p>
          <Button
            onClick={generateProfileTags}
            className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
            disabled={isAnalyzing || !aiConfigured}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                {!aiConfigured ? "请先配置AI服务" : "生成学生画像标签"}
              </>
            )}
          </Button>
          {!aiConfigured && (
            <p className="text-xs text-gray-500">
              您需要先在AI设置页面配置大模型API才能使用AI分析功能
            </p>
          )}
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {Object.entries(aiTags).map(([category, tags]) => {
          // 转换类别标识为显示名称
          const categoryDisplayNames = {
            learningStyle: "学习风格",
            strengths: "优势领域",
            improvements: "提升空间",
            personalityTraits: "性格特质"
          };
          
          const categoryName = categoryDisplayNames[category as keyof typeof categoryDisplayNames] || category;
          const colorClass = colorMap[category as keyof typeof colorMap] || "bg-gray-100 text-gray-800";
          
          if (!tags || tags.length === 0) return null;
          
          return (
            <div key={category}>
              <h3 className="text-sm font-medium mb-2">{categoryName}</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${colorClass}`}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        
        <Button
          onClick={generateProfileTags}
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              重新分析中...
            </>
          ) : (
            "重新分析"
          )}
        </Button>
      </div>
    );
  };
  
  const renderCustomTags = () => {
    const customTags = portraitData?.customTags || [];
    
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="添加自定义标签..."
            value={newCustomTag}
            onChange={(e) => setNewCustomTag(e.target.value)}
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddCustomTag();
              }
            }}
          />
          <Button 
            size="sm" 
            onClick={handleAddCustomTag}
            disabled={saveTagsMutation.isPending || !newCustomTag.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {customTags.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            暂无自定义标签，请添加
          </p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">教师标签</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    完成
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-1" />
                    编辑
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {customTags.map((tag, index) => (
                <span 
                  key={index} 
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${colorMap.custom}`}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                  {isEditing && (
                    <button
                      className="ml-1 text-gray-500 hover:text-red-500"
                      onClick={() => handleRemoveCustomTag(tag)}
                      disabled={saveTagsMutation.isPending}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </>
        )}
        
        {saveTagsMutation.isPending && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-xs">保存中...</span>
          </div>
        )}
      </div>
    );
  };

  if (isLoadingPortrait) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5" />
            学生画像分析
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5" />
          学生画像分析
        </CardTitle>
        <CardDescription>基于学生表现自动生成个性化标签和教师自定义标签</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="ai">AI评估标签</TabsTrigger>
            <TabsTrigger value="custom">教师自定义标签</TabsTrigger>
          </TabsList>
          
          <TabsContent value="ai" className="mt-0">
            {renderAITags()}
          </TabsContent>
          
          <TabsContent value="custom" className="mt-0">
            {renderCustomTags()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIProfileTags;
