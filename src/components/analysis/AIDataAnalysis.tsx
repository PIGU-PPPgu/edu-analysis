import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ZapIcon } from "lucide-react";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { performAIAnalysis, generateAnalysisPrompt } from "@/utils/aiAnalysis";
import { AIAnalysisIntro } from "./AIAnalysisIntro";
import { AIAnalysisTabs } from "./AIAnalysisTabs";

interface AIDataAnalysisProps {
  selectedClass?: any;
  data?: any[];
  charts?: React.ReactNode[];
}

const AIDataAnalysis: React.FC<AIDataAnalysisProps> = ({ 
  selectedClass, 
  data: dataProp,
  charts: chartsProp 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    overview: string;
    insights: string[];
    recommendations: string[];
  } | null>(null);

  const [aiConfigured, setAiConfigured] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const data = dataProp || [];
  const charts = chartsProp || [];

  useEffect(() => {
    const config = getUserAIConfig();
    const apiKey = getUserAPIKey();
    setAiConfigured(!!config && !!apiKey);
  }, []);

  // 数据变更时自动进行分析
  useEffect(() => {
    if (data && data.length > 0 && aiConfigured && !analysis && !isAnalyzing) {
      // 只有当数据不为空、AI已配置、还没有分析结果、且不在分析中时，自动开始分析
      generateAnalysis();
    }
  }, [data, aiConfigured, analysis, isAnalyzing]);

  const generateAnalysis = async () => {
    if (!data || data.length === 0) {
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
      
      // 使用数据中可能存在的subject和score字段数据
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
        // 如果出错但返回了分析结果，仍然显示结果，但提示出错
        setAnalysis({
          overview: result.overview,
          insights: result.insights,
          recommendations: result.recommendations,
        });
        
        toast.error("AI分析部分完成", {
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
      
      // 仍然设置一些默认分析结果，避免UI空白
      setAnalysis({
        overview: "分析生成遇到问题，以下是基本统计信息",
        insights: [
          `共有${data ? data.length : 0}条成绩记录`,
          "系统无法连接到AI服务",
          "请检查网络连接和API配置",
          "可以尝试使用其他AI服务提供商"
        ],
        recommendations: [
          "确保AI服务配置正确",
          "检查API密钥是否有效",
          "参考图表和表格数据进行手动分析",
          "联系系统管理员获取支持"
        ]
      });
      
      toast.error("分析生成失败", {
        description: error instanceof Error ? error.message : "请检查AI配置或重试"
      });
      
      // 如果失败次数少于3次，自动重试
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          generateAnalysis();
        }, 2000);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = () => {
    setAnalysis(null);
    setRetryCount(0);
    generateAnalysis();
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="h-5 w-5" />
          AI智能分析
          {isAnalyzing && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full animate-pulse">处理中</span>}
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
          <AIAnalysisTabs 
            analysis={analysis} 
            dataCount={data ? data.length : 0}
            onRetry={handleRetry}
            isRetrying={isAnalyzing}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AIDataAnalysis;
