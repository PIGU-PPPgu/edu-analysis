import React, { useState, useEffect } from "react";
import Navbar from "@/components/shared/Navbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getUserAIConfig, getUserAPIKey, saveUserAIConfig, saveUserAPIKey } from "@/utils/userAuth";
import { Info, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { UserAIConfig } from "@/types/ai";

interface APIProvider {
  id: string;
  name: string;
  logoUrl?: string;
  description: string;
  sampleApiKey: string;
  apiKeyFormat: string;
  versions: {
    id: string;
    name: string;
    description?: string;
  }[];
}

const API_PROVIDERS: APIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    logoUrl: "/images/openai-logo.png",
    description: "ChatGPT和GPT-4模型",
    sampleApiKey: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    apiKeyFormat: "以sk-开头的51个字符",
    versions: [
      { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "经济实惠的通用模型" },
      { id: "gpt-4", name: "GPT-4", description: "功能更强大的大模型" },
      { id: "gpt-4o", name: "GPT-4o", description: "最新的GPT-4 Omni模型" }
    ]
  },
  {
    id: "doubao",
    name: "豆包",
    logoUrl: "/images/doubao-logo.png",
    description: "字节跳动旗下的大模型",
    sampleApiKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    apiKeyFormat: "UUID格式的36个字符",
    versions: [
      { id: "doubao-1-0", name: "豆包 1.0", description: "基础版本" },
      { id: "doubao-1-5", name: "豆包 1.5", description: "增强版本" },
      { id: "doubao-1-5-vision-pro-32k-250115", name: "豆包 Vision Pro", description: "支持图像与文本理解" }
    ]
  },
  {
    id: "glm",
    name: "智谱 GLM",
    logoUrl: "/images/glm-logo.png",
    description: "清华大学开发的大模型",
    sampleApiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    apiKeyFormat: "32个字符的API密钥",
    versions: [
      { id: "glm-4", name: "GLM-4", description: "最新版本GLM模型" },
      { id: "glm-3-turbo", name: "GLM-3 Turbo", description: "经济实惠的选择" }
    ]
  }
];

const AISettingsPage = () => {
  const [activeTab, setActiveTab] = useState("providers");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);
  
  // 加载现有配置
  useEffect(() => {
    const loadConfig = async () => {
      const config = await getUserAIConfig();
      if (config) {
        setSelectedProvider(config.provider);
        setSelectedVersion(config.version);
        
        // 加载对应提供商的API密钥
        const key = await getUserAPIKey(config.provider);
        if (key) setApiKey(key);
      } else {
        // 默认选择第一个提供商
        setSelectedProvider(API_PROVIDERS[0].id);
        setSelectedVersion(API_PROVIDERS[0].versions[0].id);
      }
    };
    
    loadConfig();
  }, []);
  
  // 保存配置
  const saveConfig = async () => {
    if (!selectedProvider || !selectedVersion || !apiKey) {
      toast.error("请完成所有配置项");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // 保存API密钥
      await saveUserAPIKey(selectedProvider, apiKey);
      
      // 保存AI配置
      const config: UserAIConfig = {
        provider: selectedProvider,
        version: selectedVersion,
        enabled: true,
        customSettings: {
          debugMode: false
        },
        lastUpdated: new Date().toISOString()
      };
      
      await saveUserAIConfig(config);
      
      toast.success("AI配置已保存", {
        description: "您的AI服务设置已更新"
      });
    } catch (error) {
      console.error("保存AI配置失败:", error);
      toast.error("保存失败", {
        description: "无法保存AI配置，请重试"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // 测试连接
  const testConnection = async () => {
    if (!selectedProvider || !apiKey) {
      toast.error("请先选择提供商并输入API密钥");
      return;
    }
    
    setIsTestingConnection(true);
    setTestResult(null);
    
    try {
      // 简单测试请求
      const response = await fetch(`/api/test-ai-connection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: selectedProvider,
          version: selectedVersion,
          apiKey: apiKey
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult({
          success: true,
          message: "连接成功! " + (data.message || "")
        });
      } else {
        const errorData = await response.json();
        setTestResult({
          success: false,
          message: `连接失败: ${errorData.error || "未知错误"}`
        });
      }
    } catch (error) {
      console.error("测试AI连接失败:", error);
      setTestResult({
        success: false,
        message: `连接测试失败: ${error.message || "网络错误"}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // 模拟测试连接（在实际API端点不可用的情况下使用）
  const simulateTestConnection = async () => {
    if (!selectedProvider || !apiKey) {
      toast.error("请先选择提供商并输入API密钥");
      return;
    }
    
    setIsTestingConnection(true);
    setTestResult(null);
    
    // 模拟API请求延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 验证API密钥格式（简单验证示例）
    let isValid = false;
    
    switch (selectedProvider) {
      case "openai":
        isValid = apiKey.startsWith("sk-") && apiKey.length > 30;
        break;
      case "doubao":
        isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(apiKey);
        break;
      case "glm":
        isValid = apiKey.length >= 30;
        break;
      default:
        isValid = apiKey.length > 20;
    }
    
    if (isValid) {
      setTestResult({
        success: true,
        message: "API密钥格式验证通过，连接成功!"
      });
    } else {
      setTestResult({
        success: false,
        message: `API密钥格式不正确，请检查您输入的密钥是否符合${getSelectedProvider()?.apiKeyFormat}格式`
      });
    }
    
    setIsTestingConnection(false);
  };
  
  const getSelectedProvider = () => {
    return API_PROVIDERS.find(p => p.id === selectedProvider) || null;
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">AI服务设置</h1>
          <p className="text-gray-500 mt-1">
            配置您的AI服务参数，用于预警分析和学生画像生成
          </p>
        </div>
        
        <Card className="border-t-4 border-t-[#B9FF66]">
          <CardHeader>
            <CardTitle>AI服务配置</CardTitle>
            <CardDescription>
              选择AI服务提供商并配置API密钥，用于系统中的AI分析功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="providers">AI服务提供商</TabsTrigger>
                <TabsTrigger value="models">模型版本</TabsTrigger>
                <TabsTrigger value="api-key">API密钥</TabsTrigger>
              </TabsList>
              
              <TabsContent value="providers">
                <div className="space-y-4">
                  <RadioGroup value={selectedProvider || ""} onValueChange={setSelectedProvider}>
                    {API_PROVIDERS.map((provider) => (
                      <div key={provider.id} className={`flex items-start space-x-3 p-4 rounded-lg border ${selectedProvider === provider.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <RadioGroupItem value={provider.id} id={`provider-${provider.id}`} />
                        <div className="flex-1">
                          <Label htmlFor={`provider-${provider.id}`} className="font-medium text-lg">
                            {provider.name}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </TabsContent>
              
              <TabsContent value="models">
                <div className="space-y-4">
                  {selectedProvider ? (
                    <RadioGroup value={selectedVersion || ""} onValueChange={setSelectedVersion}>
                      {getSelectedProvider()?.versions.map((version) => (
                        <div key={version.id} className={`flex items-start space-x-3 p-4 rounded-lg border ${selectedVersion === version.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <RadioGroupItem value={version.id} id={`version-${version.id}`} />
                          <div className="flex-1">
                            <Label htmlFor={`version-${version.id}`} className="font-medium">
                              {version.name}
                            </Label>
                            {version.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {version.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="p-4 border rounded-lg flex items-center gap-2 text-amber-700 bg-amber-50 border-amber-200">
                      <Info className="h-5 w-5" />
                      <span>请先选择AI服务提供商</span>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="api-key">
                <div className="space-y-4">
                  {selectedProvider ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="api-key" className="font-medium">
                          {getSelectedProvider()?.name} API密钥
                        </Label>
                        <Input
                          id="api-key"
                          type="password"
                          placeholder={getSelectedProvider()?.sampleApiKey}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          请输入{getSelectedProvider()?.apiKeyFormat}
                        </p>
                      </div>
                      
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          onClick={simulateTestConnection}
                          disabled={isTestingConnection || !apiKey}
                        >
                          {isTestingConnection ? "测试中..." : "测试连接"}
                        </Button>
                        
                        {testResult && (
                          <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                            testResult.success 
                              ? 'text-green-700 bg-green-50 border border-green-200' 
                              : 'text-red-700 bg-red-50 border border-red-200'
                          }`}>
                            {testResult.success ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <AlertCircle className="h-5 w-5" />
                            )}
                            <span>{testResult.message}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 border rounded-lg flex items-center gap-2 text-amber-700 bg-amber-50 border-amber-200">
                      <Info className="h-5 w-5" />
                      <span>请先选择AI服务提供商</span>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <div className="text-sm text-muted-foreground">
              AI设置将用于系统中的所有AI功能，包括预警分析和学生画像生成
            </div>
            <Button 
              onClick={saveConfig} 
              disabled={isSaving || !selectedProvider || !selectedVersion || !apiKey}
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
            >
              {isSaving ? "保存中..." : "保存设置"}
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API用量统计</CardTitle>
            <CardDescription>
              查看当前月度API使用情况及相关统计
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg flex items-center gap-2 text-muted-foreground">
              <Info className="h-5 w-5" />
              <span>API用量统计功能即将上线，敬请期待</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AISettingsPage; 