
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import AIConnector from "@/components/analysis/AIConnector";
import Navbar from "@/components/analysis/Navbar";
import { getUserAIConfig } from "@/utils/userAuth";
import { Link } from "react-router-dom";

const AISettings: React.FC = () => {
  const [aiConfig, setAiConfig] = useState<any>(null);
  
  useEffect(() => {
    // 获取保存的AI配置
    const savedConfig = getUserAIConfig();
    setAiConfig(savedConfig);
  }, []);

  const handleAIConnect = (apiKey: string, provider: string, enabled: boolean) => {
    console.log(`AI配置已更新：${provider}`);
    const config = getUserAIConfig();
    setAiConfig(config);
    
    toast.success("AI配置已保存", {
      description: `已成功连接到${getProviderName(provider)}`,
    });
  };
  
  const getProviderName = (provider: string) => {
    switch (provider) {
      case "openai": return "OpenAI";
      case "anthropic": return "Anthropic Claude";
      case "deepseek": return "DeepSeek";
      case "baichuan": return "百川大模型";
      case "qwen": return "通义千问";
      case "moonshot": return "Moonshot AI";
      case "zhipu": return "智谱 AI";
      case "minimax": return "MiniMax";
      default: 
        try {
          // 检查是否为自定义提供商
          if (aiConfig && aiConfig.customProviders) {
            const customProviders = JSON.parse(aiConfig.customProviders);
            const custom = customProviders.find((p: any) => p.id === provider);
            if (custom) return custom.name;
          }
        } catch (e) {
          console.error("解析自定义提供商失败", e);
        }
        return provider;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">AI分析设置</h1>
            <p className="text-gray-500 mt-1">
              配置AI分析功能，选择合适的AI模型和参数
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>AI模型配置</CardTitle>
              <CardDescription>
                选择合适的AI模型并配置相关参数，以获得最佳的分析效果
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIConnector onConnect={handleAIConnect} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI分析范围</CardTitle>
              <CardDescription>
                设置AI分析的具体范围和深度
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">基础分析</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• 成绩趋势分析</li>
                    <li>• 学科优势分析</li>
                    <li>• 基础能力评估</li>
                    <li>• 学习习惯分析</li>
                  </ul>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">深度分析</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• 学习风格诊断</li>
                    <li>• 个性化学习建议</li>
                    <li>• 潜力发展预测</li>
                    <li>• 综合能力评估</li>
                  </ul>
                </Card>
              </div>
              
              {aiConfig && (
                <div className="p-4 bg-gray-50 border rounded-lg mt-4">
                  <p className="text-sm font-medium">当前AI配置信息</p>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>• 使用模型: {getProviderName(aiConfig.provider)}{aiConfig.version ? ` (${aiConfig.version})` : ''}</p>
                    <p>• 分析状态: {aiConfig.enabled ? '已启用' : '已禁用'}</p>
                    <p>• 更新时间: {new Date(aiConfig.lastUpdated).toLocaleString()}</p>
                    {aiConfig.customProviders && (
                      <p>• 自定义模型: {
                        (() => {
                          try {
                            const customs = JSON.parse(aiConfig.customProviders);
                            return customs.length > 0 ? `已配置 ${customs.length} 个` : '无';
                          } catch (e) {
                            return '解析失败';
                          }
                        })()
                      }</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>支持的模型列表</CardTitle>
              <CardDescription>
                系统内置支持的AI模型及其特点
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">OpenAI</h3>
                  <p className="text-sm text-gray-600 mb-2">提供GPT系列模型，支持多种语言的文本分析和生成。</p>
                  <div className="text-xs text-gray-500">支持版本: gpt-4o, gpt-4-turbo, gpt-3.5-turbo</div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">Anthropic Claude</h3>
                  <p className="text-sm text-gray-600 mb-2">专注于安全性和有用性的大语言模型，适合教育场景。</p>
                  <div className="text-xs text-gray-500">支持版本: claude-3-opus, claude-3-sonnet, claude-3-haiku</div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">DeepSeek</h3>
                  <p className="text-sm text-gray-600 mb-2">强大的中文理解能力，适合教育文本分析和理解。</p>
                  <div className="text-xs text-gray-500">支持版本: deepseek-chat, deepseek-coder, deepseek-v2, deepseek-v3</div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">百川大模型</h3>
                  <p className="text-sm text-gray-600 mb-2">国产大模型，提供专业的教育领域知识和分析能力。</p>
                  <div className="text-xs text-gray-500">支持版本: baichuan-v1, baichuan-v2</div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">通义千问</h3>
                  <p className="text-sm text-gray-600 mb-2">阿里云提供的大语言模型，拥有丰富的知识库。</p>
                  <div className="text-xs text-gray-500">支持版本: qwen-max, qwen-plus, qwen-lite</div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">其他模型</h3>
                  <p className="text-sm text-gray-600 mb-2">系统还支持Moonshot AI, 智谱AI, MiniMax等多种模型。</p>
                  <div className="text-xs text-gray-500">您还可以通过配置自定义模型来连接其他API。</div>
                </Card>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  需要连接其他模型？您可以使用自定义模型功能添加任意AI服务
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AISettings;

