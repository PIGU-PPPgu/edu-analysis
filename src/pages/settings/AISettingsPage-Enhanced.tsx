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
import {
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  RefreshCcw,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/shared/Navbar";
import {
  saveProviderApiKey,
  getProviderApiKey,
  clearProviderApiKey,
  saveGlobalAIConfig,
  getGlobalAIConfig,
  getConfiguredProviders,
  hasProviderApiKey,
} from "@/utils/apiKeyManager";
import {
  getAllProviders,
  getModelsByProvider,
  getAllProviderModels,
  getProvider,
  RECOMMENDED_MODELS,
  AIProvider,
  AIModel,
  saveCustomModel,
  deleteCustomModel,
  getCustomModelsByProvider,
} from "@/config/aiModels";
import {
  getFormatPresetOptions,
  getFormatPreset,
  saveCustomProvider as saveCustomProviderToStorage,
  getCustomProviders,
  deleteCustomProvider as deleteCustomProviderFromStorage,
  CustomProviderConfig,
} from "@/config/apiFormatPresets";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const AISettingsPage: React.FC = () => {
  // 当前选择的提供商
  const [selectedProvider, setSelectedProvider] = useState<string>("openai");

  // 当前提供商的API配置
  const [apiKey, setApiKey] = useState<string>("");
  const [baseURL, setBaseURL] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);

  // 全局配置
  const [globalConfig, setGlobalConfig] = useState(getGlobalAIConfig());

  // 已配置的提供商列表
  const [configuredProviders, setConfiguredProviders] = useState<string[]>(
    getConfiguredProviders()
  );

  // UI状态
  const [activeTab, setActiveTab] = useState<string>("providers");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [persistConfig, setPersistConfig] = useState<boolean>(true);

  // 自定义提供商管理
  const [customProviders, setCustomProviders] = useState<
    CustomProviderConfig[]
  >([]);
  const [showCustomProviderDialog, setShowCustomProviderDialog] =
    useState<boolean>(false);
  const [editingCustomProvider, setEditingCustomProvider] =
    useState<CustomProviderConfig | null>(null);
  const [customProviderForm, setCustomProviderForm] = useState<
    Partial<CustomProviderConfig>
  >({
    formatPresetId: "openai",
    models: [],
  });

  // 模型管理
  const [showModelManagementDialog, setShowModelManagementDialog] =
    useState<boolean>(false);
  const [managingProviderId, setManagingProviderId] = useState<string>("");
  const [editingModel, setEditingModel] = useState<AIModel | null>(null);
  const [modelForm, setModelForm] = useState<Partial<AIModel>>({});

  // 所有可用的提供商和模型
  const allProviders = getAllProviders();
  const currentProvider = getProvider(selectedProvider);
  const availableModels = getAllProviderModels(selectedProvider); // 包含内置+自定义模型

  // 加载已保存的配置
  useEffect(() => {
    loadProviderConfig(selectedProvider);
    setConfiguredProviders(getConfiguredProviders());
  }, [selectedProvider]);

  // 加载自定义提供商
  useEffect(() => {
    setCustomProviders(getCustomProviders());
  }, []);

  // 加载特定提供商的配置
  const loadProviderConfig = (providerId: string) => {
    const config = getProviderApiKey(providerId);
    if (config) {
      setApiKey(config.apiKey || "");
      setBaseURL(config.baseURL || "");
      setOrgId(config.orgId || "");
    } else {
      setApiKey("");
      setBaseURL("");
      setOrgId("");
    }
  };

  // 保存当前提供商配置
  const handleSaveProviderConfig = () => {
    if (!apiKey) {
      toast.error("请输入API密钥");
      return;
    }

    setIsLoading(true);

    try {
      saveProviderApiKey(
        selectedProvider,
        {
          apiKey,
          baseURL: baseURL || undefined,
          orgId: orgId || undefined,
        },
        persistConfig
      );

      toast.success(`${currentProvider?.displayName} 配置已保存`, {
        description: persistConfig
          ? "配置已持久化到本地"
          : "配置仅保存到当前会话",
      });

      // 更新已配置列表
      setConfiguredProviders(getConfiguredProviders());
    } catch (error: any) {
      toast.error("保存配置失败", {
        description: error.message || "请稍后再试",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 测试API密钥
  const handleTestApiKey = async () => {
    if (!apiKey) {
      toast.error("请先输入API密钥");
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const testURL = baseURL || currentProvider?.baseURL || "";

      if (!testURL) {
        toast.warning("测试功能需要配置API端点");
        setIsLoading(false);
        return;
      }

      // 获取该提供商的第一个模型
      const firstModel = availableModels[0];
      if (!firstModel) {
        toast.error("该提供商没有可用模型");
        setIsLoading(false);
        return;
      }

      // 构建测试请求
      let testEndpoint = testURL;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // 确保URL不重复路径
      const normalizeURL = (url: string) => {
        // 移除末尾的斜杠
        return url.replace(/\/+$/, "");
      };

      const baseUrlNormalized = normalizeURL(testURL);

      // 根据提供商设置认证头和端点
      switch (selectedProvider) {
        case "openai":
        case "deepseek":
        case "moonshot":
        case "zhipu":
        case "sbjt":
          // 检查URL是否已包含 /chat/completions
          if (baseUrlNormalized.endsWith("/chat/completions")) {
            testEndpoint = baseUrlNormalized;
          } else {
            testEndpoint = `${baseUrlNormalized}/chat/completions`;
          }
          headers["Authorization"] = `Bearer ${apiKey}`;
          if (orgId && selectedProvider === "openai") {
            headers["OpenAI-Organization"] = orgId;
          }
          break;
        case "doubao":
          // 豆包特殊处理
          if (baseUrlNormalized.endsWith("/chat/completions")) {
            testEndpoint = baseUrlNormalized;
          } else {
            testEndpoint = `${baseUrlNormalized}/chat/completions`;
          }
          headers["Authorization"] = `Bearer ${apiKey}`;
          break;
        case "anthropic":
          headers["x-api-key"] = apiKey;
          headers["anthropic-version"] = "2023-06-01";
          testEndpoint = baseUrlNormalized.endsWith("/messages")
            ? baseUrlNormalized
            : `${baseUrlNormalized}/messages`;
          break;
        case "azure":
          headers["api-key"] = apiKey;
          testEndpoint = baseUrlNormalized.endsWith("/chat/completions")
            ? baseUrlNormalized
            : `${baseUrlNormalized}/chat/completions`;
          break;
        case "baidu":
          // 百度使用URL参数认证
          testEndpoint = `${baseUrlNormalized}/chat/${firstModel.id}?access_token=${apiKey}`;
          break;
        default:
          testEndpoint = baseUrlNormalized.endsWith("/chat/completions")
            ? baseUrlNormalized
            : `${baseUrlNormalized}/chat/completions`;
          headers["Authorization"] = `Bearer ${apiKey}`;
      }

      // 构建测试消息
      const requestBody: any = {
        model: firstModel.id,
        messages: [{ role: "user", content: "你好，这是一个API密钥测试" }],
        max_tokens: 10,
      };

      // Anthropic 格式特殊处理
      if (selectedProvider === "anthropic") {
        requestBody.max_tokens = 10;
        delete requestBody.model;
        requestBody.model = firstModel.id;
      }

      console.log("🧪 测试API:", {
        endpoint: testEndpoint,
        provider: selectedProvider,
        model: firstModel.id,
      });

      const response = await fetch(testEndpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        console.log("✅ API测试成功:", data);

        // 提取响应内容
        let responseContent = "";
        if (data.choices && data.choices[0]?.message?.content) {
          responseContent = data.choices[0].message.content;
        } else if (data.content && data.content[0]?.text) {
          responseContent = data.content[0].text;
        } else if (data.result) {
          responseContent = data.result;
        }

        toast.success("✅ API密钥验证成功", {
          description: `响应时间: ${responseTime}ms\n模型: ${firstModel.displayName}\n${responseContent ? `回复: ${responseContent.substring(0, 50)}...` : ""}`,
          duration: 5000,
        });

        // 自动保存验证成功的密钥
        setTimeout(() => {
          handleSaveProviderConfig();
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ API测试失败:", errorData);

        let errorMessage = `HTTP ${response.status}`;
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error_msg) {
          errorMessage = errorData.error_msg;
        }

        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("❌ 测试API密钥失败:", error);

      let errorMessage = error.message || "无法连接到AI服务";

      // 网络错误特殊处理
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        errorMessage = "网络连接失败，请检查API地址是否正确";
      }

      toast.error("❌ API密钥验证失败", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 清除当前提供商配置
  const handleClearProviderConfig = () => {
    if (
      !confirm(
        `确定要删除 ${currentProvider?.displayName} 的配置吗？\n\n删除后需要重新配置API密钥才能使用该提供商。`
      )
    ) {
      return;
    }
    clearProviderApiKey(selectedProvider, true);
    setApiKey("");
    setBaseURL("");
    setOrgId("");
    setConfiguredProviders(getConfiguredProviders());
    toast.success(`已删除 ${currentProvider?.displayName} 的配置`);
  };

  // 保存全局配置
  const handleSaveGlobalConfig = () => {
    setIsLoading(true);
    try {
      // 1. 保存新版全局配置
      saveGlobalAIConfig(globalConfig);

      // 2. 🔧 同步到旧版配置（user_ai_config），用于报告生成等功能
      const userAIConfig = {
        provider: globalConfig.defaultProvider,
        version: globalConfig.defaultModel,
        model: globalConfig.defaultModel,
        enabled: true,
        customSettings: {
          temperature: globalConfig.defaultTemperature,
          maxTokens: globalConfig.defaultMaxTokens,
        },
        lastUpdated: new Date().toISOString(),
      };

      // 保存到 localStorage
      localStorage.setItem("user_ai_config", JSON.stringify(userAIConfig));

      console.log("✅ 全局配置已保存到两个位置:");
      console.log("1. global_ai_config:", globalConfig);
      console.log("2. user_ai_config:", userAIConfig);

      // 显示详细的保存信息
      const providerName = allProviders.find(
        (p) => p.id === globalConfig.defaultProvider
      )?.displayName;
      const modelName = getAllProviderModels(globalConfig.defaultProvider).find(
        (m) => m.id === globalConfig.defaultModel
      )?.displayName;

      toast.success("✅ 全局配置已保存", {
        description: `提供商: ${providerName || globalConfig.defaultProvider}\n模型: ${modelName || globalConfig.defaultModel}`,
        duration: 4000,
      });
    } catch (error: any) {
      console.error("❌ 保存配置失败:", error);
      toast.error("保存失败", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // 重置所有设置
  const handleResetAll = () => {
    if (confirm("确定要重置所有AI配置吗？此操作不可恢复。")) {
      allProviders.forEach((provider) => {
        clearProviderApiKey(provider.id, true);
      });
      setConfiguredProviders([]);
      setGlobalConfig(getGlobalAIConfig()); // 重置为默认值
      toast.success("所有配置已重置");
    }
  };

  // 自定义提供商管理函数
  const handleOpenCustomProviderDialog = (provider?: CustomProviderConfig) => {
    if (provider) {
      setEditingCustomProvider(provider);
      setCustomProviderForm(provider);
    } else {
      setEditingCustomProvider(null);
      setCustomProviderForm({
        formatPresetId: "openai",
        models: [],
      });
    }
    setShowCustomProviderDialog(true);
  };

  const handleSaveCustomProvider = () => {
    const { id, name, displayName, baseURL, formatPresetId, models } =
      customProviderForm;

    if (!id || !name || !displayName || !baseURL || !formatPresetId) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (!models || models.length === 0) {
      toast.error("请至少添加一个模型");
      return;
    }

    try {
      const config: CustomProviderConfig = {
        id: id as string,
        name: name as string,
        displayName: displayName as string,
        baseURL: baseURL as string,
        formatPresetId: formatPresetId as string,
        customEndpoint: customProviderForm.customEndpoint,
        apiKeyFormat: customProviderForm.apiKeyFormat,
        models: models as any[],
      };

      saveCustomProviderToStorage(config);
      setCustomProviders(getCustomProviders());
      setShowCustomProviderDialog(false);
      toast.success(`自定义提供商 ${displayName} 已保存`);
    } catch (error: any) {
      toast.error("保存失败", { description: error.message });
    }
  };

  const handleDeleteCustomProvider = (providerId: string) => {
    if (confirm("确定要删除此自定义提供商吗？")) {
      deleteCustomProviderFromStorage(providerId);
      setCustomProviders(getCustomProviders());
      toast.success("自定义提供商已删除");
    }
  };

  const handleAddModelToCustomProvider = () => {
    const newModel = {
      id: "",
      name: "",
      contextWindow: 8000,
      maxOutputTokens: 4096,
    };
    setCustomProviderForm({
      ...customProviderForm,
      models: [...(customProviderForm.models || []), newModel],
    });
  };

  const handleRemoveModelFromCustomProvider = (index: number) => {
    const models = [...(customProviderForm.models || [])];
    models.splice(index, 1);
    setCustomProviderForm({
      ...customProviderForm,
      models,
    });
  };

  const handleUpdateCustomProviderModel = (
    index: number,
    field: string,
    value: any
  ) => {
    const models = [...(customProviderForm.models || [])];
    models[index] = { ...models[index], [field]: value };
    setCustomProviderForm({
      ...customProviderForm,
      models,
    });
  };

  // 模型管理函数
  const handleOpenModelManagement = (providerId: string) => {
    setManagingProviderId(providerId);
    setShowModelManagementDialog(true);
    setModelForm({});
    setEditingModel(null);
  };

  const handleEditModel = (model: AIModel) => {
    setEditingModel(model);
    setModelForm(model);
  };

  const handleSaveModel = () => {
    try {
      if (!modelForm.id || !modelForm.name || !modelForm.displayName) {
        toast.error("请填写必填字段");
        return;
      }

      const model: AIModel = {
        id: modelForm.id,
        name: modelForm.name,
        displayName: modelForm.displayName,
        provider: managingProviderId,
        contextWindow: modelForm.contextWindow || 8000,
        maxOutputTokens: modelForm.maxOutputTokens || 4096,
        pricing: modelForm.pricing,
        capabilities: modelForm.capabilities || [],
        releaseDate: modelForm.releaseDate,
        isCustom: true,
      };

      saveCustomModel(model);
      setModelForm({});
      setEditingModel(null);
      toast.success(editingModel ? "模型已更新" : "模型已添加");

      // 刷新可用模型列表（通过重新设置selectedProvider触发重新渲染）
      setSelectedProvider((prev) => prev);
    } catch (error: any) {
      toast.error("保存失败", { description: error.message });
    }
  };

  const handleDeleteModel = (modelId: string) => {
    if (confirm("确定要删除此模型吗？")) {
      deleteCustomModel(modelId);
      toast.success("模型已删除");
      setSelectedProvider((prev) => prev); // 刷新
    }
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
                <h1 className="text-3xl font-bold">AI模型配置</h1>
              </div>
              <p className="text-gray-500 mt-1">
                配置多个AI提供商，使用最新的AI模型
              </p>
            </div>
          </div>

          <Tabs
            defaultValue="providers"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="providers">提供商配置</TabsTrigger>
              <TabsTrigger value="custom">自定义提供商</TabsTrigger>
              <TabsTrigger value="global">全局设置</TabsTrigger>
            </TabsList>

            {/* 提供商配置 Tab */}
            <TabsContent value="providers">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧：提供商列表 */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-lg">AI提供商</CardTitle>
                    <CardDescription className="text-xs">
                      选择要配置的AI服务提供商
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {allProviders.map((provider) => {
                      const isConfigured = configuredProviders.includes(
                        provider.id
                      );
                      const isSelected = selectedProvider === provider.id;

                      return (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedProvider(provider.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-[#B9FF66] bg-[#B9FF66]/10"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium flex items-center gap-2">
                                {provider.displayName}
                                {isConfigured && (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              {provider.apiKeyPrefix && (
                                <div className="text-xs text-gray-500 mt-1">
                                  格式: {provider.apiKeyPrefix}...
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* 右侧：配置表单 */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {currentProvider?.displayName} 配置
                        </CardTitle>
                        <CardDescription className="text-xs">
                          配置API密钥和其他选项
                        </CardDescription>
                      </div>
                      {currentProvider?.docURL && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={currentProvider.docURL}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            文档
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* API密钥 */}
                    <div className="space-y-2">
                      <Label htmlFor="api-key">
                        API密钥 <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <Input
                            id="api-key"
                            type={showApiKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={
                              currentProvider?.apiKeyFormat || "输入API密钥"
                            }
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
                          onClick={handleTestApiKey}
                          disabled={isLoading || !apiKey}
                          className="bg-blue-500 text-white hover:bg-blue-600"
                        >
                          {isLoading ? "测试中..." : "🧪 测试连接"}
                        </Button>
                      </div>
                    </div>

                    {/* 自定义端点 (如果需要) */}
                    {currentProvider?.requiresCustomEndpoint && (
                      <div className="space-y-2">
                        <Label htmlFor="base-url">
                          API端点 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="base-url"
                          type="url"
                          value={baseURL}
                          onChange={(e) => setBaseURL(e.target.value)}
                          placeholder="https://your-endpoint.com/v1"
                        />
                        <p className="text-xs text-muted-foreground">
                          {selectedProvider === "azure"
                            ? "Azure OpenAI资源端点"
                            : "自定义API端点地址"}
                        </p>
                      </div>
                    )}

                    {!currentProvider?.requiresCustomEndpoint &&
                      currentProvider?.baseURL && (
                        <div className="space-y-2">
                          <Label htmlFor="base-url">
                            API端点 (可选，留空使用默认)
                          </Label>
                          <Input
                            id="base-url"
                            type="url"
                            value={baseURL}
                            onChange={(e) => setBaseURL(e.target.value)}
                            placeholder={currentProvider.baseURL}
                          />
                        </div>
                      )}

                    {/* 组织ID (OpenAI) */}
                    {selectedProvider === "openai" && (
                      <div className="space-y-2">
                        <Label htmlFor="org-id">组织ID (可选)</Label>
                        <Input
                          id="org-id"
                          value={orgId}
                          onChange={(e) => setOrgId(e.target.value)}
                          placeholder="org-..."
                        />
                        <p className="text-xs text-muted-foreground">
                          仅在使用组织账号时需要
                        </p>
                      </div>
                    )}

                    {/* 持久化选项 */}
                    <div className="border-t pt-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="persist"
                          checked={persistConfig}
                          onChange={(e) => setPersistConfig(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <Label htmlFor="persist" className="cursor-pointer">
                          持久化配置（关闭浏览器后保留）
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {persistConfig
                          ? "配置将保存到localStorage，关闭浏览器后仍然保留"
                          : "配置仅保存到sessionStorage，关闭浏览器后清除"}
                      </p>
                    </div>

                    {/* 可用模型列表 */}
                    {availableModels.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium">
                            可用模型 ({availableModels.length})
                          </h3>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleOpenModelManagement(selectedProvider)
                            }
                          >
                            管理模型
                          </Button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableModels.map((model) => (
                            <div
                              key={model.id}
                              className="text-sm p-2 bg-gray-50 rounded border"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">
                                    {model.displayName}
                                  </div>
                                  {model.isCustom && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      自定义
                                    </Badge>
                                  )}
                                </div>
                                {model.releaseDate && (
                                  <Badge variant="outline" className="text-xs">
                                    {new Date(
                                      model.releaseDate
                                    ).toLocaleDateString("zh-CN", {
                                      year: "numeric",
                                      month: "short",
                                    })}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                上下文:{" "}
                                {(model.contextWindow / 1000).toFixed(0)}K
                                tokens
                                {model.pricing && (
                                  <>
                                    {" "}
                                    · 输入: ${model.pricing.input}/1M · 输出: $
                                    {model.pricing.output}/1M
                                  </>
                                )}
                              </div>
                              {model.description && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {model.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="destructive"
                      onClick={handleClearProviderConfig}
                      disabled={!hasProviderApiKey(selectedProvider)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      删除配置
                    </Button>
                    <Button
                      onClick={handleSaveProviderConfig}
                      disabled={isLoading || !apiKey}
                      className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      保存配置
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            {/* 自定义提供商 Tab */}
            <TabsContent value="custom">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>自定义AI提供商</CardTitle>
                      <CardDescription>
                        添加您自己的AI API端点，支持OpenAI、Claude等格式
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleOpenCustomProviderDialog()}
                      className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                    >
                      添加提供商
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {customProviders.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <p className="text-gray-500 mb-4">暂无自定义提供商</p>
                      <p className="text-sm text-gray-400">
                        点击上方按钮添加您的第一个自定义AI提供商
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {customProviders.map((provider) => {
                        const formatPreset = getFormatPreset(
                          provider.formatPresetId
                        );
                        return (
                          <Card key={provider.id} className="border-2">
                            <CardHeader className="pb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">
                                    {provider.displayName}
                                  </CardTitle>
                                  <CardDescription className="text-xs mt-1">
                                    {provider.baseURL}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenCustomProviderDialog(provider)
                                    }
                                  >
                                    编辑
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleDeleteCustomProvider(provider.id)
                                    }
                                  >
                                    删除
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">
                                    API格式：
                                  </span>
                                  <Badge variant="outline" className="ml-2">
                                    {formatPreset?.name ||
                                      provider.formatPresetId}
                                  </Badge>
                                </div>
                                <div>
                                  <span className="text-gray-500">
                                    模型数量：
                                  </span>
                                  <Badge variant="outline" className="ml-2">
                                    {provider.models.length} 个模型
                                  </Badge>
                                </div>
                              </div>
                              <div className="border-t pt-3">
                                <p className="text-xs text-gray-500 mb-2">
                                  可用模型：
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {provider.models.map((model) => (
                                    <Badge key={model.id} variant="secondary">
                                      {model.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 全局设置 Tab */}
            <TabsContent value="global">
              <Card>
                <CardHeader>
                  <CardTitle>全局AI设置</CardTitle>
                  <CardDescription>
                    配置默认使用的AI提供商和模型
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="default-provider">默认AI提供商</Label>
                    <Select
                      value={globalConfig.defaultProvider}
                      onValueChange={(value) =>
                        setGlobalConfig({
                          ...globalConfig,
                          defaultProvider: value,
                        })
                      }
                      disabled={configuredProviders.length === 0}
                    >
                      <SelectTrigger id="default-provider">
                        <SelectValue
                          placeholder={
                            configuredProviders.length === 0
                              ? '请先在"提供商配置"中配置API密钥'
                              : "选择默认提供商"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {allProviders
                          .filter((provider) =>
                            configuredProviders.includes(provider.id)
                          )
                          .map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.displayName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {configuredProviders.length === 0 && (
                      <p className="text-xs text-amber-600">
                        ⚠️ 请先在"提供商配置"Tab中配置至少一个AI提供商的API密钥
                      </p>
                    )}
                    {configuredProviders.length > 0 && (
                      <p className="text-xs text-gray-500">
                        已配置 {configuredProviders.length} 个提供商
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-model">默认模型</Label>
                    <Select
                      value={globalConfig.defaultModel}
                      onValueChange={(value) =>
                        setGlobalConfig({
                          ...globalConfig,
                          defaultModel: value,
                        })
                      }
                      disabled={
                        !globalConfig.defaultProvider ||
                        configuredProviders.length === 0
                      }
                    >
                      <SelectTrigger id="default-model">
                        <SelectValue
                          placeholder={
                            !globalConfig.defaultProvider
                              ? "请先选择默认提供商"
                              : "选择默认模型"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllProviderModels(globalConfig.defaultProvider).map(
                          (model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center gap-2">
                                {model.displayName}
                                {model.isCustom && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    自定义
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {globalConfig.defaultProvider && (
                      <p className="text-xs text-gray-500">
                        {
                          getAllProviderModels(globalConfig.defaultProvider)
                            .length
                        }{" "}
                        个可用模型
                        {getCustomModelsByProvider(globalConfig.defaultProvider)
                          .length > 0 &&
                          ` (含 ${getCustomModelsByProvider(globalConfig.defaultProvider).length} 个自定义)`}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="temperature">温度 (创造性)</Label>
                      <span className="text-xs text-muted-foreground">
                        {globalConfig.defaultTemperature.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[globalConfig.defaultTemperature]}
                      onValueChange={(values) =>
                        setGlobalConfig({
                          ...globalConfig,
                          defaultTemperature: values[0],
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
                        {globalConfig.defaultMaxTokens}
                      </span>
                    </div>
                    <Slider
                      id="max-tokens"
                      min={500}
                      max={8000}
                      step={100}
                      value={[globalConfig.defaultMaxTokens]}
                      onValueChange={(values) =>
                        setGlobalConfig({
                          ...globalConfig,
                          defaultMaxTokens: values[0],
                        })
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>简短回答</span>
                      <span>详细回答</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>启用缓存</Label>
                        <p className="text-xs text-muted-foreground">
                          缓存相似请求以节省成本
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={globalConfig.enableCache}
                        onChange={(e) =>
                          setGlobalConfig({
                            ...globalConfig,
                            enableCache: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>启用成本追踪</Label>
                        <p className="text-xs text-muted-foreground">
                          记录AI使用成本
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={globalConfig.enableCostTracking}
                        onChange={(e) =>
                          setGlobalConfig({
                            ...globalConfig,
                            enableCostTracking: e.target.checked,
                          })
                        }
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSaveGlobalConfig} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    保存全局设置
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 自定义提供商配置对话框 */}
      <Dialog
        open={showCustomProviderDialog}
        onOpenChange={setShowCustomProviderDialog}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomProvider ? "编辑自定义提供商" : "添加自定义提供商"}
            </DialogTitle>
            <DialogDescription>
              配置您的自定义AI API端点，选择API格式模板自动处理请求格式
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="font-medium">基本信息</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider-id">提供商ID *</Label>
                  <Input
                    id="provider-id"
                    placeholder="my-custom-api"
                    value={customProviderForm.id || ""}
                    onChange={(e) =>
                      setCustomProviderForm({
                        ...customProviderForm,
                        id: e.target.value,
                      })
                    }
                    disabled={!!editingCustomProvider}
                  />
                  <p className="text-xs text-gray-500">
                    唯一标识符，只能包含小写字母、数字和连字符
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider-name">内部名称 *</Label>
                  <Input
                    id="provider-name"
                    placeholder="My Custom API"
                    value={customProviderForm.name || ""}
                    onChange={(e) =>
                      setCustomProviderForm({
                        ...customProviderForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-display-name">显示名称 *</Label>
                <Input
                  id="provider-display-name"
                  placeholder="我的自定义API"
                  value={customProviderForm.displayName || ""}
                  onChange={(e) =>
                    setCustomProviderForm({
                      ...customProviderForm,
                      displayName: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-500">在界面中显示的名称</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-baseurl">Base URL *</Label>
                <Input
                  id="provider-baseurl"
                  placeholder="https://api.example.com/v1"
                  value={customProviderForm.baseURL || ""}
                  onChange={(e) =>
                    setCustomProviderForm({
                      ...customProviderForm,
                      baseURL: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  API的基础URL，不包含具体端点路径
                </p>
              </div>
            </div>

            {/* API格式选择 */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-medium">API格式配置</h3>

              <div className="space-y-2">
                <Label htmlFor="format-preset">API格式模板 *</Label>
                <Select
                  value={customProviderForm.formatPresetId || "openai"}
                  onValueChange={(value) =>
                    setCustomProviderForm({
                      ...customProviderForm,
                      formatPresetId: value,
                    })
                  }
                >
                  <SelectTrigger id="format-preset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getFormatPresetOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {customProviderForm.formatPresetId && (
                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded border">
                    <p className="font-medium mb-1">格式说明：</p>
                    {(() => {
                      const preset = getFormatPreset(
                        customProviderForm.formatPresetId
                      );
                      if (!preset) return null;
                      return (
                        <div className="space-y-1">
                          <p>
                            • 认证方式:{" "}
                            {preset.authType === "bearer"
                              ? "Bearer Token"
                              : preset.authType === "header"
                                ? `自定义Header (${preset.authHeaderName})`
                                : `URL参数 (${preset.authParamName})`}
                          </p>
                          <p>• 默认端点: {preset.defaultEndpoint}</p>
                          {preset.exampleBaseURL && (
                            <p>• 示例URL: {preset.exampleBaseURL}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="custom-endpoint">自定义端点路径（可选）</Label>
                <Input
                  id="custom-endpoint"
                  placeholder="/chat/completions"
                  value={customProviderForm.customEndpoint || ""}
                  onChange={(e) =>
                    setCustomProviderForm({
                      ...customProviderForm,
                      customEndpoint: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  覆盖默认端点路径，留空则使用格式模板的默认值
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key-format">API Key格式说明（可选）</Label>
                <Input
                  id="api-key-format"
                  placeholder="sk-..."
                  value={customProviderForm.apiKeyFormat || ""}
                  onChange={(e) =>
                    setCustomProviderForm({
                      ...customProviderForm,
                      apiKeyFormat: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  帮助用户识别正确的API Key格式
                </p>
              </div>
            </div>

            {/* 模型配置 */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">模型配置</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddModelToCustomProvider}
                >
                  添加模型
                </Button>
              </div>

              {!customProviderForm.models ||
              customProviderForm.models.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded">
                  <p className="text-gray-500 text-sm">
                    暂无模型，请添加至少一个模型
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customProviderForm.models.map((model, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <h4 className="text-sm font-medium">
                              模型 #{index + 1}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleRemoveModelFromCustomProvider(index)
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">模型ID *</Label>
                              <Input
                                placeholder="gpt-4"
                                value={model.id}
                                onChange={(e) =>
                                  handleUpdateCustomProviderModel(
                                    index,
                                    "id",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">模型名称 *</Label>
                              <Input
                                placeholder="GPT-4"
                                value={model.name}
                                onChange={(e) =>
                                  handleUpdateCustomProviderModel(
                                    index,
                                    "name",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">上下文窗口</Label>
                              <Input
                                type="number"
                                placeholder="8000"
                                value={model.contextWindow || ""}
                                onChange={(e) =>
                                  handleUpdateCustomProviderModel(
                                    index,
                                    "contextWindow",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">最大输出Token</Label>
                              <Input
                                type="number"
                                placeholder="4096"
                                value={model.maxOutputTokens || ""}
                                onChange={(e) =>
                                  handleUpdateCustomProviderModel(
                                    index,
                                    "maxOutputTokens",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCustomProviderDialog(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveCustomProvider}
              className="bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 模型管理对话框 */}
      <Dialog
        open={showModelManagementDialog}
        onOpenChange={setShowModelManagementDialog}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModel ? "编辑模型" : "添加模型"}</DialogTitle>
            <DialogDescription>
              为 {getProvider(managingProviderId)?.displayName} 配置模型
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 模型ID */}
            <div className="space-y-2">
              <Label>
                模型ID <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="例如 gpt-3.5-turbo"
                value={modelForm.id || ""}
                onChange={(e) =>
                  setModelForm({ ...modelForm, id: e.target.value })
                }
                disabled={!!editingModel}
              />
              <p className="text-xs text-gray-500">
                模型的唯一标识符，创建后不可修改
              </p>
            </div>

            {/* 模型名称 */}
            <div className="space-y-2">
              <Label>
                模型名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="例如 GPT-4"
                value={modelForm.name || ""}
                onChange={(e) =>
                  setModelForm({ ...modelForm, name: e.target.value })
                }
              />
            </div>

            {/* 显示名称 */}
            <div className="space-y-2">
              <Label>
                显示名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="例如 GPT-4 Turbo"
                value={modelForm.displayName || ""}
                onChange={(e) =>
                  setModelForm({ ...modelForm, displayName: e.target.value })
                }
              />
            </div>

            {/* 上下文窗口 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>上下文窗口 (tokens)</Label>
                <Input
                  type="number"
                  placeholder="8000"
                  value={modelForm.contextWindow || ""}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      contextWindow: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              {/* 最大输出tokens */}
              <div className="space-y-2">
                <Label>最大输出 (tokens)</Label>
                <Input
                  type="number"
                  placeholder="4096"
                  value={modelForm.maxOutputTokens || ""}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      maxOutputTokens: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* 定价（可选） */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>输入价格 ($/1M tokens)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="5.00"
                  value={modelForm.pricing?.input || ""}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      pricing: {
                        ...modelForm.pricing,
                        input: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>输出价格 ($/1M tokens)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="15.00"
                  value={modelForm.pricing?.output || ""}
                  onChange={(e) =>
                    setModelForm({
                      ...modelForm,
                      pricing: {
                        ...modelForm.pricing,
                        output: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>

            {/* 已有模型列表 */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">已有模型</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {getCustomModelsByProvider(managingProviderId).map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="text-sm">
                      <div className="font-medium">{model.displayName}</div>
                      <div className="text-xs text-gray-500">{model.id}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditModel(model)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteModel(model.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
                {getCustomModelsByProvider(managingProviderId).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    暂无自定义模型
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModelManagementDialog(false)}
            >
              关闭
            </Button>
            <Button onClick={handleSaveModel}>
              {editingModel ? "更新" : "添加"}模型
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AISettingsPage;
