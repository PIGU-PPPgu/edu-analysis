
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ZapIcon } from "lucide-react";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { performAIAnalysis, generateAnalysisPrompt } from "@/utils/aiAnalysis";
import { AIAnalysisIntro } from "./AIAnalysisIntro";
import { AIAnalysisTabs } from "./AIAnalysisTabs";

interface AIDataAnalysisProps {
  data: any[];
  charts: React.ReactNode[];
}

const AIDataAnalysis: React.FC<AIDataAnalysisProps> = ({ data, charts }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    overview: string;
    insights: string[];
    recommendations: string[];
  } | null>(null);

  const [aiConfigured, setAiConfigured] = useState(false);

  useEffect(() => {
    const config = getUserAIConfig();
    const apiKey = getUserAPIKey();
    setAiConfigured(!!config && !!apiKey);
  }, []);

  const generateAnalysis = async () => {
    if (data.length === 0) {
      toast.error("没有足够的数据进行分析");
      return;
    }

    const aiConfig = getUserAIConfig();
    const apiKey = getUserAPIKey();

    if (!aiConfig || !apiKey) {
      toast.error("请先配置AI服务", {
        description: "前往AI设置页面配置大模型API"
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const language = aiConfig.language || "zh";
      const config = {
        provider: aiConfig.provider,
        model: aiConfig.version,
        temperature: aiConfig.temperature ?? 0.7,
        maxTokens: aiConfig.maxTokens ?? 2000,
        apiKey: apiKey
      };
      
      const prompt =
        aiConfig.prompt ||
        generateAnalysisPrompt(data);

      const result = await performAIAnalysis({
        data,
        config,
        prompt,
        language
      });

      if (result.error) {
        setAnalysis({
          overview: result.overview,
          insights: result.insights,
          recommendations: result.recommendations,
        });
        toast.error("AI分析失败", {
          description: result.error
        });
      } else {
        setAnalysis({
          overview: result.overview,
          insights: result.insights,
          recommendations: result.recommendations,
        });
        toast.success("AI分析完成", {
          description: `已生成基于${data.length}条记录的数据分析报告`
        });
      }
    } catch (error) {
      console.error("AI分析失败:", error);
      toast.error("分析生成失败", {
        description: error instanceof Error ? error.message : "请检查AI配置或重试"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="h-5 w-5" />
          AI智能分析
        </CardTitle>
        <CardDescription>
          基于导入的数据和生成的图表，提供智能分析和教学建议
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <AIAnalysisIntro 
            isAnalyzing={isAnalyzing} 
            aiConfigured={aiConfigured} 
            onStart={generateAnalysis}
          />
        ) : (
          <AIAnalysisTabs analysis={analysis} dataCount={data.length} />
        )}
      </CardContent>
    </Card>
  );
};

export default AIDataAnalysis;
