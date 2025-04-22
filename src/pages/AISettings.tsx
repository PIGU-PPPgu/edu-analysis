
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import AIConnector from "@/components/analysis/AIConnector";
import Navbar from "@/components/analysis/Navbar";

const AISettings: React.FC = () => {
  const handleAIConnect = (apiKey: string, provider: string, enabled: boolean) => {
    console.log(`AI配置已更新：${provider}`);
    toast.success("AI配置已保存", {
      description: `已成功连接到${provider}`,
    });
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
