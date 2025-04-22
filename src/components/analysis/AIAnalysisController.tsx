
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIProviderVersionSelector } from "./AIProviderVersionSelector";
import { AIAnalysisOptions } from "./AIAnalysisOptions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ZapIcon, Settings } from "lucide-react";
import { PredefinedProvider } from "./types";
import { getUserAPIKey } from "@/utils/userAuth";

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
    await onStartAnalysis({
      provider: selectedProvider.id,
      model: selectedModel,
      temperature,
      language
    });
  };
  
  return (
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
  );
};
