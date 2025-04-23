
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { StudentData } from "./types";

interface Props {
  student: StudentData;
}

const AIProfileTags: React.FC<Props> = ({ student }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [profileTags, setProfileTags] = useState<{
    learningStyle: string[];
    strengths: string[];
    improvements: string[];
    personalityTraits: string[];
  } | null>(null);

  useEffect(() => {
    const config = getUserAIConfig();
    const apiKey = getUserAPIKey();
    setAiConfigured(!!config && !!apiKey);
  }, []);

  const generateProfileTags = () => {
    setIsAnalyzing(true);
    
    // Mock AI analysis generation for demonstration
    setTimeout(() => {
      const mockTags = {
        learningStyle: [
          `${Math.random() > 0.5 ? '视觉学习者' : '听觉学习者'}`,
          `${Math.random() > 0.5 ? '自主学习' : '小组协作'}`,
          `${Math.random() > 0.5 ? '发散思维' : '逻辑思维'}`
        ],
        strengths: [
          `${Math.random() > 0.5 ? '语言表达能力' : '数学计算能力'}`,
          `${Math.random() > 0.5 ? '细节关注' : '创意思考'}`,
          `${Math.random() > 0.5 ? '记忆力强' : '理解力好'}`
        ],
        improvements: [
          `${Math.random() > 0.5 ? '时间管理' : '专注力'}`,
          `${Math.random() > 0.5 ? '书面表达' : '口头表达'}`,
          `${Math.random() > 0.5 ? '抽象思维' : '实践应用'}`
        ],
        personalityTraits: [
          `${Math.random() > 0.5 ? '积极主动' : '认真踏实'}`,
          `${Math.random() > 0.5 ? '善于合作' : '独立自主'}`,
          `${Math.random() > 0.5 ? '好奇心强' : '责任感强'}`
        ]
      };
      
      setProfileTags(mockTags);
      setIsAnalyzing(false);
      toast.success("学生画像分析完成", {
        description: "AI已生成学生画像标签"
      });
    }, 1500);
  };

  const renderTagSection = (title: string, tags: string[] | undefined, color: string) => {
    if (!tags || tags.length === 0) return null;
    
    return (
      <div>
        <h3 className="text-sm font-medium mb-2">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span 
              key={index} 
              className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${color}`}
            >
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="h-5 w-5" />
          AI学生画像分析
        </CardTitle>
        <CardDescription>基于学生表现自动生成个性化标签</CardDescription>
      </CardHeader>
      <CardContent>
        {!profileTags ? (
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
        ) : (
          <div className="space-y-4">
            {renderTagSection("学习风格", profileTags.learningStyle, "bg-blue-100 text-blue-800")}
            {renderTagSection("优势领域", profileTags.strengths, "bg-green-100 text-green-800")}
            {renderTagSection("提升空间", profileTags.improvements, "bg-amber-100 text-amber-800")}
            {renderTagSection("性格特质", profileTags.personalityTraits, "bg-purple-100 text-purple-800")}
            
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
        )}
      </CardContent>
    </Card>
  );
};

export default AIProfileTags;
