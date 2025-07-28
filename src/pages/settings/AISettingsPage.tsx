import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Save, ArrowLeft, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/shared/Navbar";
import apiKeyManager, { ApiConfig } from "@/utils/apiKeyManager";

const AISettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [modelConfig, setModelConfig] = useState<ApiConfig>({
    provider: "openai",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 1500,
  });
  const [activeTab, setActiveTab] = useState<string>("settings");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 加载已保存的配置和API密钥
  useEffect(() => {
    const savedKey = apiKeyManager.getApiKey();
    if (savedKey) {
      setApiKey(savedKey);
    }

    const savedConfig = apiKeyManager.getApiConfig();
    if (savedConfig) {
      setModelConfig(savedConfig);
    }
  }, []);

  // 保存设置
  const handleSaveSettings = () => {
    setIsLoading(true);

    try {
      // 保存API密钥
      if (apiKey) {
        apiKeyManager.saveApiKey(apiKey);
      }

      // 保存模型配置
      apiKeyManager.saveApiConfig(modelConfig);

      toast.success("AI设置已保存");
    } catch (error) {
      toast.error("保存设置失败", {
        description: error.message || "请稍后再试",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 清除API密钥
  const handleClearApiKey = () => {
    setApiKey("");
    apiKeyManager.clearApiKey();
    toast.info("API密钥已清除");
  };

  // 测试API密钥
  const handleTestApiKey = async () => {
    if (!apiKey) {
      toast.error("请先输入API密钥");
      return;
    }

    setIsLoading(true);

    try {
      // 向OpenAI发送简单请求测试API密钥
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: headers,
      });

      if (response.ok) {
        toast.success("API密钥有效", {
          description: "成功连接到AI服务",
        });

        // 如果测试成功，保存API密钥
        apiKeyManager.saveApiKey(apiKey);
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || "API密钥无效");
      }
    } catch (error) {
      console.error("测试API密钥失败:", error);
      toast.error("API密钥无效", {
        description: error.message || "无法连接到AI服务",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 重置所有设置
  const handleResetAllSettings = () => {
    apiKeyManager.clearApiKey();
    apiKeyManager.clearApiConfig();
    setApiKey("");
    setModelConfig({
      provider: "openai",
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 1500,
    });
    toast.success("已重置所有AI设置");
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/settings">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    返回设置
                  </Link>
                </Button>
                <h1 className="text-3xl font-bold">AI分析设置</h1>
              </div>
              <p className="text-gray-500 mt-1">
                配置AI分析所需的API密钥和参数
              </p>
            </div>
          </div>

          <Tabs
            defaultValue="settings"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="settings">基本设置</TabsTrigger>
              <TabsTrigger value="api">API设置</TabsTrigger>
              <TabsTrigger value="help">帮助</TabsTrigger>
            </TabsList>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>模型配置</CardTitle>
                  <CardDescription>
                    选择要使用的AI模型和参数设置
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="provider">AI提供商</Label>
                    <Select
                      value={modelConfig.provider}
                      onValueChange={(value) =>
                        setModelConfig({ ...modelConfig, provider: value })
                      }
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder="选择AI提供商" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">智能语言模型</SelectItem>
                        <SelectItem value="azure">云端智能模型</SelectItem>
                        <SelectItem value="anthropic">对话助手模型</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model-version">模型版本</Label>
                    <Select
                      value={modelConfig.model}
                      onValueChange={(value) =>
                        setModelConfig({ ...modelConfig, model: value })
                      }
                    >
                      <SelectTrigger id="model-version">
                        <SelectValue placeholder="选择模型版本" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelConfig.provider === "openai" && (
                          <>
                            <SelectItem value="gpt-3.5-turbo">
                              智能模型-标准版
                            </SelectItem>
                            <SelectItem value="gpt-4">
                              智能模型-专业版
                            </SelectItem>
                            <SelectItem value="gpt-4-turbo">
                              智能模型-增强版
                            </SelectItem>
                          </>
                        )}
                        {modelConfig.provider === "azure" && (
                          <>
                            <SelectItem value="gpt-35-turbo">
                              云端智能模型-标准版
                            </SelectItem>
                            <SelectItem value="gpt-4">
                              云端智能模型-专业版
                            </SelectItem>
                          </>
                        )}
                        {modelConfig.provider === "anthropic" && (
                          <>
                            <SelectItem value="claude-2.1">
                              对话助手-专业版
                            </SelectItem>
                            <SelectItem value="claude-instant-1.2">
                              对话助手-快速版
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="temperature">温度 (创造性)</Label>
                      <span className="text-xs text-muted-foreground">
                        {modelConfig.temperature.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[modelConfig.temperature]}
                      onValueChange={(values) =>
                        setModelConfig({
                          ...modelConfig,
                          temperature: values[0],
                        })
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>精确</span>
                      <span>创造</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="max-tokens">最大Token数</Label>
                      <span className="text-xs text-muted-foreground">
                        {modelConfig.maxTokens}
                      </span>
                    </div>
                    <Slider
                      id="max-tokens"
                      min={500}
                      max={4000}
                      step={100}
                      value={[modelConfig.maxTokens]}
                      onValueChange={(values) =>
                        setModelConfig({ ...modelConfig, maxTokens: values[0] })
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>简短回答</span>
                      <span>详细回答</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveSettings} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    保存设置
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API设置</CardTitle>
                  <CardDescription>配置访问AI服务所需的API密钥</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API密钥</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <Input
                          id="api-key"
                          type={showApiKey ? "text" : "password"}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder={`输入${modelConfig.provider === "openai" ? "以sk-开头的" : ""}API密钥`}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showApiKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleTestApiKey}
                        disabled={isLoading}
                      >
                        测试
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      API密钥仅存储在您的浏览器会话中，浏览器关闭后将自动清除。
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-sm font-medium mb-2">API访问安全</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      您的API密钥使用会话存储并进行基本加密，在浏览器关闭后会自动清除，提供更高的安全性。
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleClearApiKey}
                    >
                      清除API密钥
                    </Button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveSettings} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    保存API设置
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="help">
              <Card>
                <CardHeader>
                  <CardTitle>帮助与说明</CardTitle>
                  <CardDescription>
                    如何获取和配置AI分析所需的API密钥
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">获取智能模型API密钥</h3>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      <li>
                        访问{" "}
                        <a
                          href="https://platform.openai.com/signup"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          智能模型平台
                        </a>{" "}
                        注册账号
                      </li>
                      <li>登录后，点击右上角头像，选择"View API keys"</li>
                      <li>点击"Create new secret key"创建新密钥</li>
                      <li>复制生成的API密钥（以sk-开头的字符串）</li>
                      <li>将复制的API密钥粘贴到本页面的API密钥输入框中</li>
                      <li>点击"保存API设置"按钮保存</li>
                    </ol>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-4">
                      <h4 className="font-medium text-amber-800 mb-2">
                        注意事项
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-amber-700">
                        <li>API密钥需要自行承担费用，请妥善保管</li>
                        <li>使用学生画像分析功能将消耗API额度</li>
                        <li>我们不会存储您的API密钥，仅保存在浏览器本地</li>
                        <li>关闭浏览器后API密钥将被清除</li>
                        <li>如需长期使用，每次打开网页后需重新输入API密钥</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <h3 className="font-medium">模型参数说明</h3>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="font-medium">AI提供商</dt>
                        <dd className="text-muted-foreground">
                          选择不同的AI服务提供商，每个提供商可能有不同的模型和API格式。
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium">模型版本</dt>
                        <dd className="text-muted-foreground">
                          选择不同能力和成本的AI模型。专业版功能更强但费用更高。
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium">温度</dt>
                        <dd className="text-muted-foreground">
                          控制生成内容的创造性和随机性。较低值生成更精确的回答，较高值生成更创造性的回答。
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium">最大Token数</dt>
                        <dd className="text-muted-foreground">
                          控制生成内容的最大长度。数值越大，生成的回答越详细，但费用也越高。
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-2">重置设置</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      如果遇到问题，可以尝试重置所有AI设置。
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetAllSettings}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      重置所有设置
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AISettingsPage;
