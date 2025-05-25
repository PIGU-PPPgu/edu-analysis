import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Brain, Target, ArrowUpRight, Blocks, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { StudentData } from "./types";
import { toast } from "sonner";
import { getUserAIModelConfig, getUserSimpleAPIKey } from "@/utils/userAuth";

interface AILearningProfileProps {
  student: StudentData;
  analysisEnabled?: boolean;
}

interface LearningProfile {
  summary: string;
  strengths: string[];
  challenges: string[];
  learningStyle: string;
  recommendedStrategies: string[];
  longTermPotential: string;
}

interface AnalysisResult {
  studentId: string;
  name: string;
  date: string;
  className?: string;
  learningProfile: LearningProfile;
  analysisType: string;
}

const DEFAULT_PROFILE: LearningProfile = {
  summary: "尚未生成学习画像分析，请点击\"生成分析\"按钮。",
  strengths: [],
  challenges: [],
  learningStyle: "尚未分析学习风格。",
  recommendedStrategies: [],
  longTermPotential: "尚未分析长期潜力。"
}

const AILearningProfile: React.FC<AILearningProfileProps> = ({ 
  student,
  analysisEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState("summary");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [profileData, setProfileData] = useState<LearningProfile>(DEFAULT_PROFILE);
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string | null>(null);
  
  // 检查AI配置
  React.useEffect(() => {
    const config = getUserAIModelConfig();
    const apiKey = getUserSimpleAPIKey();
    setAiConfigured(!!config && !!apiKey);
  }, []);
  
  // 生成学习画像分析
  const generateLearningProfile = async (type: 'simple' | 'comprehensive' = 'simple') => {
    setIsAnalyzing(true);
    
    try {
      const config = getUserAIModelConfig();
      const apiKey = getUserSimpleAPIKey();
      
      if (!config || !apiKey) {
        throw new Error("请先在AI设置中配置大模型API");
      }
      
      // 获取Supabase URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      if (!supabaseUrl) {
        throw new Error("无法获取API地址");
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-student-learning-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.studentId,
          apiKey,
          model: config.version || 'gpt-3.5-turbo',
          analysisType: type
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "分析请求失败");
      }
      
      const data: AnalysisResult = await response.json();
      
      // 更新画像数据
      setProfileData(data.learningProfile);
      setLastAnalysisDate(data.date);
      
      toast.success("学习画像分析完成", {
        description: `已生成${type === 'comprehensive' ? '综合' : '简要'}学习画像分析`
      });
    } catch (error) {
      console.error("AI分析失败:", error);
      toast.error("AI分析失败", {
        description: error.message || "无法生成学习画像分析，请稍后重试"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI学习画像综合分析
        </CardTitle>
        <CardDescription className="flex justify-between items-center">
          <span>人工智能生成的学生学习综合评估和建议</span>
          {lastAnalysisDate && (
            <span className="text-xs text-muted-foreground">
              分析日期: {lastAnalysisDate}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!profileData.summary || profileData.summary === DEFAULT_PROFILE.summary ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Brain className="h-12 w-12 text-muted-foreground" />
            <p className="text-center text-muted-foreground">
              尚未生成学习画像分析
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => generateLearningProfile('simple')}
                className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                disabled={isAnalyzing || !aiConfigured || !analysisEnabled}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    生成简要分析
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => generateLearningProfile('comprehensive')}
                variant="outline"
                disabled={isAnalyzing || !aiConfigured || !analysisEnabled}
              >
                <ArrowUpRight className="h-4 w-4 mr-2" />
                生成详细分析
              </Button>
            </div>
            {!aiConfigured && (
              <p className="text-xs text-red-500">
                请先在AI设置页面配置大模型API
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="summary">总体评估</TabsTrigger>
                <TabsTrigger value="strengths">学习优势</TabsTrigger>
                <TabsTrigger value="challenges">学习挑战</TabsTrigger>
                <TabsTrigger value="strategies">学习建议</TabsTrigger>
                <TabsTrigger value="potential">发展潜力</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      学习情况综合评估
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {profileData.summary}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-500" />
                      学习风格特点
                    </h3>
                    <p className="text-sm text-blue-700 whitespace-pre-line">
                      {profileData.learningStyle}
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="strengths">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">学习优势分析</h3>
                  {profileData.strengths.length > 0 ? (
                    <div className="space-y-3">
                      {profileData.strengths.map((strength, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border border-green-200 bg-green-50"
                        >
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                            <p className="text-sm text-green-700">{strength}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      暂无学习优势分析数据
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="challenges">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">学习挑战分析</h3>
                  {profileData.challenges.length > 0 ? (
                    <div className="space-y-3">
                      {profileData.challenges.map((challenge, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border border-amber-200 bg-amber-50"
                        >
                          <div className="flex items-start gap-2">
                            <XCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                            <p className="text-sm text-amber-700">{challenge}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      暂无学习挑战分析数据
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="strategies">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">学习策略建议</h3>
                  {profileData.recommendedStrategies.length > 0 ? (
                    <div className="space-y-3">
                      {profileData.recommendedStrategies.map((strategy, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg border border-indigo-200 bg-indigo-50"
                        >
                          <div className="flex items-start gap-2">
                            <Target className="h-5 w-5 text-indigo-500 mt-0.5" />
                            <p className="text-sm text-indigo-700">{strategy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      暂无学习策略建议数据
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="potential">
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Blocks className="h-4 w-4 text-purple-500" />
                      长期学习潜力评估
                    </h3>
                    <p className="text-sm text-purple-700 whitespace-pre-line">
                      {profileData.longTermPotential}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateLearningProfile('simple')}
                disabled={isAnalyzing || !aiConfigured || !analysisEnabled}
              >
                {isAnalyzing && (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                )}
                重新分析
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isAnalyzing || !aiConfigured || !analysisEnabled}
                onClick={() => {
                  setProfileData(DEFAULT_PROFILE);
                  setLastAnalysisDate(null);
                }}
              >
                清除分析
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AILearningProfile; 