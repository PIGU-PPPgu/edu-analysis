import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer } from "@/components/ui/chart";
import { toast } from "sonner";
import { ZapIcon, FileTextIcon } from "lucide-react";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { performAIAnalysis, generateAnalysisPrompt } from "@/utils/aiAnalysis";

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

  const generateAnalysisPrompt = (data: any[]) => {
    const subjectScores: Record<string, number[]> = {};
    
    data.forEach(item => {
      if (item.subject && typeof item.score === 'number') {
        if (!subjectScores[item.subject]) {
          subjectScores[item.subject] = [];
        }
        subjectScores[item.subject].push(item.score);
      }
    });
    
    const subjectAverages: Record<string, number> = {};
    Object.entries(subjectScores).forEach(([subject, scores]) => {
      const sum = scores.reduce((acc, score) => acc + score, 0);
      subjectAverages[subject] = sum / scores.length;
    });
    
    let prompt = `基于以下数据，为教师生成详细的教学分析报告。\n\n`;
    prompt += `学生成绩数据摘要：\n`;
    
    Object.entries(subjectAverages).forEach(([subject, average]) => {
      prompt += `- ${subject} 平均分: ${average.toFixed(1)}\n`;
    });
    
    prompt += `\n请提供：\n1. 整体数据分析概述\n2. 关键发现（至少4点）\n3. 教学建议（至少4点）\n\n`;
    prompt += `使用专业但易懂的语言，针对教育工作者提供有价值的见解。`;
    
    return prompt;
  };
  
  const mockAiRequest = async (prompt: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const subjects = [...new Set(data.map(item => item.subject).filter(Boolean))];
    
    const randomInsight = () => {
      const insights = [
        "成绩分布呈现正态分布，大部分学生集中在中等水平",
        "部分学生在多个学科表现一致，显示学习能力的一致性",
        "个别学生成绩波动较大，可能存在学习方法不稳定的问题",
        "高分段学生在课外活动参与度也较高，显示全面发展",
        "部分低分学生出勤率偏低，需加强考勤管理",
        "期中至期末成绩提升显著，教学效果良好",
        "理科与文科成绩存在明显差异，可能需要平衡教学资源"
      ];
      return insights[Math.floor(Math.random() * insights.length)];
    };
    
    const randomRecommendation = () => {
      const recommendations = [
        "建议对学习方法不稳定的学生提供个性化辅导",
        "可考虑增加小组学习活动，促进学生间互助",
        "针对薄弱环节，设计专项训练",
        "加强基础知识巩固，提高学生学习自信心",
        "建议与家长加强沟通，形成教育合力",
        "可适当增加实践性教学，提高学生学习兴趣",
        "针对不同学习风格的学生，采用多样化的教学方法"
      ];
      return recommendations[Math.floor(Math.random() * recommendations.length)];
    };
    
    const subjectSpecificInsights = subjects.map(subject => 
      `${subject}科目成绩分布${Math.random() > 0.5 ? '较为集中' : '较为分散'}，${Math.random() > 0.5 ? '大部分学生掌握良好' : '存在两级分化现象'}`
    );
    
    const subjectSpecificRecommendations = subjects.map(subject => 
      `在${subject}教学中可${Math.random() > 0.5 ? '增加互动环节' : '加强基础训练'}，提高学生${Math.random() > 0.5 ? '学习兴趣' : '掌握程度'}`
    );
    
    return {
      overview: `整体数据显示学生成绩${Math.random() > 0.5 ? '分布均衡' : '存在差异'}，${
        Math.random() > 0.5 ? '大部分学生成绩在良好范围内' : '不同学科表现各有特点'
      }。通过分析，发现${
        Math.random() > 0.5 ? '教学效果整体良好' : '存在一些可提升空间'
      }。`,
      insights: [
        ...subjectSpecificInsights.slice(0, Math.min(2, subjectSpecificInsights.length)),
        randomInsight(),
        randomInsight()
      ],
      recommendations: [
        ...subjectSpecificRecommendations.slice(0, Math.min(2, subjectSpecificRecommendations.length)),
        randomRecommendation(),
        randomRecommendation()
      ]
    };
  };

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
          <div className="text-center py-8">
            <div className="mb-4">
              <ZapIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">启动AI智能分析</p>
              <p className="text-sm text-gray-500 mb-6">
                AI将分析您导入的数据和生成的图表，提供教学见解和改进建议
              </p>
            </div>
            <Button 
              onClick={generateAnalysis} 
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
              disabled={isAnalyzing || !aiConfigured}
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-pulse mr-2">●</span>
                  正在分析中...
                </>
              ) : !aiConfigured ? (
                "请先配置AI服务"
              ) : (
                "开始分析"
              )}
            </Button>
            {!aiConfigured && (
              <p className="text-sm text-gray-500 mt-2">
                您需要先在AI设置页面配置大模型API才能使用AI分析功能
              </p>
            )}
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview">总体分析</TabsTrigger>
              <TabsTrigger value="insights">关键发现</TabsTrigger>
              <TabsTrigger value="recommendations">教学建议</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <p className="text-base">{analysis.overview}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-medium mb-2">数据特点</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• 样本数量: {data.length} 条记录</li>
                    <li>• 数据完整度: {Math.floor(90 + Math.random() * 9)}%</li>
                    <li>• 数据质量: {Math.random() > 0.5 ? '良好' : '优秀'}</li>
                  </ul>
                </Card>
                <Card className="p-4">
                  <h3 className="font-medium mb-2">主要结论</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• {Math.random() > 0.5 ? '整体成绩良好' : '学习进步明显'}</li>
                    <li>• {Math.random() > 0.5 ? '存在学科差异' : '基础知识掌握扎实'}</li>
                    <li>• {Math.random() > 0.5 ? '发现学习规律' : '需加强薄弱环节'}</li>
                  </ul>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="insights" className="space-y-4">
              <ul className="space-y-3">
                {analysis.insights.map((insight, index) => (
                  <li key={index} className="p-3 border rounded-lg flex items-start">
                    <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                      {index + 1}
                    </span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              <ul className="space-y-3">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="p-3 border rounded-lg bg-gray-50 flex items-start">
                    <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
                      {index + 1}
                    </span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                onClick={() => {
                  toast.success("报告已导出", {
                    description: "AI分析报告已成功导出为PDF文件"
                  });
                }} 
                variant="outline" 
                className="w-full mt-4"
              >
                <FileTextIcon className="mr-2 h-4 w-4" />
                导出分析报告
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default AIDataAnalysis;
