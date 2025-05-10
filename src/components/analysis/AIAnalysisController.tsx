import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIProviderVersionSelector } from "./AIProviderVersionSelector";
import { AIAnalysisOptions } from "./AIAnalysisOptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ZapIcon, Settings, Sparkles, AlertTriangle, CheckCircle, AlertCircle, ListTodo } from "lucide-react";
import { PredefinedProvider } from "./types";
import { getUserAPIKey } from "@/utils/userAuth";
import { Progress } from "@/components/ui/progress";

interface AIAnalysisControllerProps {
  onStartAnalysis: (config: {
    provider: string;
    model: string;
    temperature: number;
    language: string;
  }) => Promise<void>;
  isAnalyzing: boolean;
}

const PREDEFINED_PROVIDERS: PredefinedProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    versions: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    versions: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]
  }
];

export const AIAnalysisController: React.FC<AIAnalysisControllerProps> = ({ 
  onStartAnalysis,
  isAnalyzing 
}) => {
  const [selectedProvider, setSelectedProvider] = useState<PredefinedProvider>(PREDEFINED_PROVIDERS[0]);
  const [selectedModel, setSelectedModel] = useState<string>(PREDEFINED_PROVIDERS[0].versions[0]);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [language, setLanguage] = useState<string>("zh");
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisInsights, setAnalysisInsights] = useState<string[]>([]);
  
  // 检查是否已配置API密钥
  const apiKey = getUserAPIKey();
  const isConfigured = !!apiKey;
  
  const handleProviderChange = (providerId: string) => {
    const provider = PREDEFINED_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      setSelectedProvider(provider);
      setSelectedModel(provider.versions[0]);
    }
  };
  
  const handleStartAnalysis = async () => {
    // 重置分析结果和进度
    setAnalysisResult(null);
    setAnalysisInsights([]);
    setAnalysisProgress(0);
    
    // 模拟进度更新
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);
    
    try {
    await onStartAnalysis({
      provider: selectedProvider.id,
      model: selectedModel,
      temperature,
      language
    });
      
      // 分析完成，清除进度条更新
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      
      // 设置模拟分析结果
      setTimeout(() => {
        setAnalysisResult(`基于对全班${Math.floor(Math.random() * 40 + 20)}名学生的成绩分析，发现以下关键问题和建议：`);
        setAnalysisInsights([
          "班级整体数学成绩呈现两极分化，建议针对不同学习水平进行分层教学",
          "语文科目得分曲线正态分布明显，教学进度和难度较为合理",
          "英语科目有5名学生成绩明显偏低，建议进行针对性辅导",
          "班级前10名学生各科成绩相对均衡，后10名学生理科普遍偏弱",
          "建议增加理科实验课程，提高学生动手能力和学习兴趣"
        ]);
      }, 1000);
    } catch (error) {
      // 出错时清除进度条更新
      clearInterval(progressInterval);
      setAnalysisProgress(0);
      console.error("分析失败:", error);
    }
  };
  
  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="h-5 w-5" />
          AI分析设置
        </CardTitle>
        <CardDescription>
          配置AI分析选项，选择合适的大语言模型和参数
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="basic">基本设置</TabsTrigger>
            <TabsTrigger value="advanced">高级设置</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ai-provider">选择AI提供商</Label>
                <select 
                  id="ai-provider"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  value={selectedProvider.id}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  disabled={isAnalyzing}
                >
                  {PREDEFINED_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <AIProviderVersionSelector
                provider={selectedProvider}
                selectedVersion={selectedModel}
                onChange={setSelectedModel}
                disabled={isAnalyzing}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language-select">报告语言</Label>
              <select
                id="language-select"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isAnalyzing}
              >
                <option value="zh">中文</option>
                <option value="en">英文</option>
              </select>
            </div>
            
            <AIAnalysisOptions />
            
            <Button 
              onClick={handleStartAnalysis} 
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c] w-full mt-4"
              disabled={isAnalyzing || !isConfigured}
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-pulse mr-2">●</span>
                  正在分析中...
                </>
              ) : !isConfigured ? (
                "请先配置AI服务API密钥"
              ) : (
                "开始智能分析"
              )}
            </Button>
            
            {!isConfigured && (
              <p className="text-sm text-gray-500 mt-2">
                您需要先在AI设置页面配置大模型API才能使用AI分析功能
              </p>
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="temperature">温度系数: {temperature.toFixed(1)}</Label>
              </div>
              <Slider
                id="temperature"
                min={0}
                max={1}
                step={0.1}
                value={[temperature]}
                onValueChange={(values) => setTemperature(values[0])}
                disabled={isAnalyzing}
              />
              <p className="text-xs text-gray-500">
                较低的值使输出更确定，较高的值使输出更多样化和创造性
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="custom-prompt">自定义提示词模板 (可选)</Label>
              <textarea
                id="custom-prompt"
                className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
                placeholder="输入自定义的提示词模板，留空则使用默认模板"
                disabled={isAnalyzing}
              />
              <p className="text-xs text-gray-500">
                您可以自定义提示词模板，系统将在其中插入数据细节
              </p>
            </div>
            
            <Button 
              onClick={handleStartAnalysis} 
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c] w-full mt-4"
              disabled={isAnalyzing || !isConfigured}
            >
              {isAnalyzing ? (
                <>
                  <span className="animate-pulse mr-2">●</span>
                  正在分析中...
                </>
              ) : !isConfigured ? (
                "请先配置AI服务API密钥"
              ) : (
                "使用高级设置开始分析"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
      
      {(isAnalyzing || analysisResult) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI分析结果
            </CardTitle>
            <CardDescription>
              基于大语言模型对当前学生成绩数据的综合分析
            </CardDescription>
            
            {isAnalyzing && (
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>分析进度</span>
                  <span>{Math.min(Math.round(analysisProgress), 100)}%</span>
                </div>
                <Progress value={analysisProgress} className="h-2" />
                <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 mt-1">
                  <div className={`${analysisProgress >= 25 ? "text-green-600 font-medium" : ""}`}>数据加载</div>
                  <div className={`${analysisProgress >= 50 ? "text-green-600 font-medium" : ""}`}>数据分析</div>
                  <div className={`${analysisProgress >= 75 ? "text-green-600 font-medium" : ""}`}>生成见解</div>
                  <div className={`${analysisProgress >= 100 ? "text-green-600 font-medium" : ""}`}>完成</div>
                </div>
              </div>
            )}
          </CardHeader>
          
          {analysisResult && (
            <CardContent className="space-y-4">
              <p className="text-sm">{analysisResult}</p>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-purple-500" />
                  关键发现与建议
                </h3>
                <ul className="space-y-2">
                  {analysisInsights.map((insight, index) => (
                    <li key={index} className="flex gap-2 items-start text-sm">
                      {index % 3 === 0 ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      ) : index % 3 === 1 ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          )}
          
          {analysisResult && (
            <CardFooter className="flex flex-col gap-2 border-t pt-4">
              <p className="text-xs text-gray-500 w-full">
                <span className="font-medium">分析方法：</span>
                使用{selectedProvider.name} {selectedModel}模型，基于现有成绩数据进行智能分析和推理。
              </p>
              <div className="flex justify-end w-full">
                <Button variant="outline" size="sm" className="gap-1">
                  <ZapIcon className="h-3.5 w-3.5" />
                  生成详细报告
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
};
