
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import AIConnector from "@/components/analysis/AIConnector";
import Navbar from "@/components/analysis/Navbar";
import { getUserAIConfig } from "@/utils/userAuth";

const AISettings: React.FC = () => {
  const [aiConfig, setAiConfig] = useState<any>(null);
  
  useEffect(() => {
    // 获取保存的AI配置
    const savedConfig = getUserAIConfig();
    setAiConfig(savedConfig);
  }, []);

  const handleAIConnect = (apiKey: string, provider: string, enabled: boolean) => {
    console.log(`AI配置已更新：${provider}`);
    setAiConfig({ provider, enabled, lastUpdated: new Date().toISOString() });
    
    toast.success("AI配置已保存", {
      description: `已成功连接到${getProviderName(provider)}`,
    });
  };
  
  const getProviderName = (provider: string) => {
    switch (provider) {
      case "openai": return "OpenAI";
      case "deepseek": return "DeepSeek";
      case "baichuan": return "百川大模型";
      case "qwen": return "通义千问";
      default: return provider;
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
                    <p>• 使用模型: {getProviderName(aiConfig.provider)}</p>
                    <p>• 分析状态: {aiConfig.enabled ? '已启用' : '已禁用'}</p>
                    <p>• 更新时间: {new Date(aiConfig.lastUpdated).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
