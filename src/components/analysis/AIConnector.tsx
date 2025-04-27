import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { saveUserAIConfig, getUserAIConfig, getUserAPIKey, saveUserAPIKey } from "@/utils/userAuth";
import { AIProviderSelector } from "./AIProviderSelector";
import { AIModelVersionSelector } from "./AIModelVersionSelector";
import { AICustomModelDialog } from "./AICustomModelDialog";
import { AIKeyInput } from "./AIKeyInput";
import { AIAnalysisOptions } from "./AIAnalysisOptions";
import { Check } from "lucide-react";
import { PredefinedProvider, CustomProvider } from "./types";
import { supabase } from "@/lib/supabase";
import SimplifiedAIClient from "@/lib/GenericAIClient";
import { getProviderEndpoint } from '@/services/aiProviderManager';

interface AIConnectorProps {
  onConnect: (apiKey: string, provider: string, enabled: boolean) => void;
}

const predefinedProviders: PredefinedProvider[] = [
  { id: "openai", name: "OpenAI", versions: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { id: "anthropic", name: "Anthropic", versions: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
  { 
    id: "deepseek", 
    name: "DeepSeek", 
    versions: [
      "deepseek-chat", 
      "deepseek-coder", 
      "deepseek-reasoner", 
      "deepseek-llm-67b-chat", 
      "deepseek-coder-33b-instruct",
      "deepseek-math-7b-rl"
    ] 
  },
  { 
    id: "sbjt", 
    name: "硅基流动", 
    versions: [
      "sbjt-base", 
      "sbjt-edu", 
      "sbjt-code", 
      "sbjt-knowledge",
      "Pro/deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-R1"
    ] 
  },
  { id: "baichuan", name: "百川大模型", versions: ["baichuan-v1", "baichuan-v2"] },
  { id: "qwen", name: "通义千问", versions: ["qwen-max", "qwen-plus", "qwen-lite"] },
  { id: "moonshot", name: "Moonshot AI", versions: ["moonshot-v1", "moonshot-pro"] },
  { id: "zhipu", name: "智谱 AI", versions: ["glm-4", "glm-3-turbo"] },
  { id: "minimax", name: "MiniMax", versions: ["abab5.5", "abab6"] },
];

const AIConnector: React.FC<AIConnectorProps> = ({ onConnect }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(predefinedProviders[0].id);
  const [selectedVersion, setSelectedVersion] = useState(predefinedProviders[0].versions[0]);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showAddCustomDialog, setShowAddCustomDialog] = useState(false);
  const [newCustomProvider, setNewCustomProvider] = useState<CustomProvider>({ id: "", name: "", endpoint: "" });
  const [apiKey, setApiKey] = useState("");
  const [apiKeyValidation, setApiKeyValidation] = useState<{
    status: 'none' | 'success' | 'error' | 'validating';
    message: string;
  }>({ status: 'none', message: '' });

  const form = useForm({
    defaultValues: {
      apiKey: "",
      enabled: true,
    },
  });

  // 从本地恢复配置
  useEffect(() => {
    const loadSavedConfig = async () => {
      const savedConfig = await getUserAIConfig();
      const savedKey = await getUserAPIKey();
      if (savedConfig && savedKey) {
        setIsConnected(true);
        setSelectedProvider(savedConfig.provider);
        
        // 验证模型版本是否有效
        const provider = predefinedProviders.find(p => p.id === savedConfig.provider);
        let version = savedConfig.version ?? predefinedProviders[0].versions[0];
        
        // 如果有提供商信息且版本无效，使用第一个有效版本
        if (provider && !provider.versions.includes(version)) {
          console.log(`保存的模型版本 ${version} 不再可用，切换到 ${provider.versions[0]}`);
          version = provider.versions[0];
        }
        
        setSelectedVersion(version);
        form.setValue("enabled", savedConfig.enabled);
        setApiKey(savedKey);

        if (savedConfig.customProviders) {
          try {
            setCustomProviders(JSON.parse(savedConfig.customProviders));
          } catch (e) {
            setCustomProviders([]);
          }
        }
        onConnect(savedKey, savedConfig.provider, savedConfig.enabled);
      }
    };
    
    loadSavedConfig();
  }, []);

  // 新增自定义模型
  const handleAddCustomProvider = () => {
    if (!newCustomProvider.id || !newCustomProvider.name || !newCustomProvider.endpoint) {
      toast.error("请填写完整的自定义模型信息");
      return;
    }
    // 不许重复
    if ([...predefinedProviders.map(p => p.id), ...customProviders.map(p => p.id)].includes(newCustomProvider.id)) {
      toast.error("模型ID已存在，请使用其他标识符");
      return;
    }
    
    // 确保ID以custom-开头
    let customId = newCustomProvider.id;
    if (!customId.startsWith('custom-')) {
      customId = `custom-${customId}`;
    }
    
    const customProvider = {
      ...newCustomProvider,
      id: customId
    };
    
    setCustomProviders([...customProviders, customProvider]);
    setNewCustomProvider({ id: "", name: "", endpoint: "" });
    setShowAddCustomDialog(false);
    toast.success("自定义模型已添加");
  };
  // 删除自定义模型
  const handleDeleteCustomProvider = (id: string) => {
    setCustomProviders(customProviders.filter(p => p.id !== id));
    toast.success("自定义模型已删除");
  };

  // 获取提供商的API端点URL
  const getProviderBaseUrl = (providerId: string, customProviders: CustomProvider[]): string => {
    // 对于自定义提供商，从自定义配置中获取
    if (providerId.startsWith('custom-')) {
      const customProvider = customProviders.find(p => p.id === providerId);
      if (customProvider) {
        return customProvider.endpoint;
      }
    }
    
    // 对于预定义提供商，返回默认URL
    switch (providerId) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com/v1';
      case 'deepseek':
        return 'https://api.deepseek.com/v1';
      case 'sbjt': // 硅基流动使用的是DeepSeek的API
        return 'https://api.deepseek.com/v1';
      case 'baichuan':
        return 'https://api.baichuan-ai.com/v1';
      case 'qwen':
        return 'https://dashscope.aliyuncs.com/api/v1';
      case 'moonshot':
        return 'https://api.moonshot.cn/v1';
      case 'zhipu':
        return 'https://open.bigmodel.cn/api/paas/v3';
      case 'minimax':
        return 'https://api.minimax.chat/v1';
      default:
        return 'https://api.openai.com/v1';
    }
  };

  const validateApiKey = async (): Promise<boolean> => {
    if (!apiKey) {
      setApiKeyValidation({ status: 'error', message: '请输入API密钥' });
      return false;
    }

    setApiKeyValidation({ status: 'validating', message: '正在验证API密钥...' });
    setIsValidating(true);

    try {
      let isValid = false;

      // 根据提供商选择验证方法
      if (selectedProvider === 'openai') {
        // 对于OpenAI，使用基本格式验证，避免CORS问题
        isValid = apiKey.startsWith('sk-') && apiKey.length > 20;
        
        // 可选地，如果环境允许，尝试使用Edge Function
        try {
          const { data } = await supabase.functions.invoke('validate-api-key', {
            body: { 
              provider: 'openai',
              apiKey 
            }
          });
          if (data?.isValid === true) {
            isValid = true;
          }
        } catch (e) {
          console.log('Edge Function调用失败，使用基本验证', e);
          // 继续使用基本验证结果
        }
      } else if (selectedProvider === 'anthropic') {
        // 对于Anthropic，直接使用格式验证
        isValid = apiKey.startsWith('sk-ant-') && apiKey.length > 20;
      } else if (selectedProvider === 'deepseek' || selectedProvider === 'sbjt') {
        // 对于DeepSeek和硅基流动，前端验证格式
        if (apiKey.startsWith('sk-')) {
          // 标准DeepSeek密钥格式验证
          isValid = apiKey.length >= 20;
        } else if (apiKey.startsWith('sbjt_') || apiKey.startsWith('jgt_')) {
          // 硅基流动公司格式密钥验证
          isValid = apiKey.length >= 20;
        } else {
          // 使用API直接验证（避免CORS问题，改为客户端验证）
          try {
            // 获取基础URL和完整API端点
            const baseUrl = getProviderBaseUrl(selectedProvider, customProviders);
            const apiEndpoint = getProviderEndpoint(selectedProvider, baseUrl);
            
            // 使用SimplifiedAIClient尝试一个简单请求
            const client = new SimplifiedAIClient({
              apiKey,
              baseURL: apiEndpoint,
              model: selectedProvider === 'sbjt' 
                ? (selectedVersion.includes('DeepSeek') 
                   ? selectedVersion // 使用Pro/deepseek-ai系列模型名称
                   : 'sbjt-base') // 默认使用sbjt-base
                : 'deepseek-chat' // DeepSeek默认模型
            });
            
            const response = await client.sendRequest({
              messages: [{ role: 'user', content: 'Hello' }],
              temperature: 0.7,
              max_tokens: 5
            });
            
            isValid = !!response;
            console.log(`${selectedProvider} API密钥验证响应:`, response ? "成功" : "失败");
          } catch (err) {
            console.error(`${selectedProvider} API密钥验证错误:`, err);
            isValid = false;
          }
        }
      } else if (selectedProvider.startsWith('custom-')) {
        // 对于自定义模型，直接使用API调用验证
        try {
          // 获取自定义模型的API端点
          const customProvider = customProviders.find(p => p.id === selectedProvider);
          if (!customProvider) {
            setApiKeyValidation({ 
              status: 'error', 
              message: `未找到自定义提供商: ${selectedProvider}` 
            });
            setIsValidating(false);
            return false;
          }
          
          // 直接构建一个客户端实例来测试API调用
          const client = new SimplifiedAIClient({
            apiKey,
            baseURL: customProvider.endpoint, // 直接使用自定义端点
            model: 'default-model'
          });
          
          const response = await client.sendRequest({
            messages: [{ role: 'user', content: 'Hello' }],
            temperature: 0.7,
            max_tokens: 5
          });
          
          isValid = !!response;
          console.log("自定义API密钥验证响应:", response ? "成功" : "失败");
        } catch (err) {
          console.error("自定义API密钥验证错误:", err);
          setApiKeyValidation({ 
            status: 'error', 
            message: `验证失败: ${err.message || '请检查API密钥和网络'}` 
          });
          setIsValidating(false);
          return false;
        }
      } else {
        // 对于其他预定义提供商
        // 检查当前选择的版本是否存在于提供商的版本列表中
        const provider = predefinedProviders.find(p => p.id === selectedProvider);
        let versionToUse = selectedVersion;
        
        if (provider && provider.versions && provider.versions.length > 0) {
          // 如果当前选择的版本不在提供商的版本列表中，使用第一个版本
          if (!provider.versions.includes(selectedVersion)) {
            console.log(`选择的版本 ${selectedVersion} 不可用，使用默认版本 ${provider.versions[0]}`);
            versionToUse = provider.versions[0];
            // 更新选中的版本
            setSelectedVersion(versionToUse);
          }
        }
        
        try {
          // 获取基础URL和完整API端点
          const baseUrl = getProviderBaseUrl(selectedProvider, customProviders);
          const apiEndpoint = getProviderEndpoint(selectedProvider, baseUrl);
          
          // 使用SimplifiedAIClient发送测试请求
          const client = new SimplifiedAIClient({
            apiKey,
            baseURL: apiEndpoint,
            model: versionToUse
          });
          
          const response = await client.sendRequest({
            messages: [{ role: 'user', content: 'Hello' }],
            temperature: 0.7,
            max_tokens: 5
          });
          
          isValid = !!response;
          console.log("API密钥验证响应:", response ? "成功" : "失败");
        } catch (err) {
          console.error("API密钥验证错误:", err);
          setApiKeyValidation({ 
            status: 'error', 
            message: `验证失败: ${err.message || '请检查API密钥和网络'}` 
          });
          setIsValidating(false);
          return false;
        }
      }

      if (isValid) {
        setApiKeyValidation({ status: 'success', message: 'API密钥有效' });
        setIsValidating(false);
        return true;
      } else {
        setApiKeyValidation({ status: 'error', message: 'API密钥无效' });
        setIsValidating(false);
        return false;
      }
    } catch (error) {
      console.error("验证API密钥时出错:", error);
      setApiKeyValidation({ 
        status: 'error', 
        message: `验证过程中出错: ${error.message || '请重试'}` 
      });
      setIsValidating(false);
      return false;
    }
  };
  
  // 验证OpenAI API密钥 - 简化版，不再使用
  const validateOpenAIKey = async (apiKey: string): Promise<boolean> => {
    // 简单格式验证，避免CORS问题
    return apiKey.startsWith('sk-') && apiKey.length > 20;
  };
  
  // 验证Anthropic API密钥 - 简化版，不再使用
  const validateAnthropicKey = async (apiKey: string): Promise<boolean> => {
    // 简单格式验证，避免CORS问题
    return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
  };

  const onSubmit = async (data: { apiKey: string; enabled: boolean }) => {
    if (!apiKey) {
      toast.error("请输入API密钥");
      return;
    }
    
    // 如果没有进行验证或验证失败，要求先验证
    if (apiKeyValidation.status !== 'success') {
      const isValid = await validateApiKey();
      if (!isValid) return;
    }
    
    try {
      console.log("保存最终配置...");
      // 保存API密钥
      await saveUserAPIKey(apiKey);
      
      // 保存AI配置 - 特殊处理硅基流动的DeepSeek系列模型
      let configProvider = selectedProvider;
      let configVersion = selectedVersion;
      
      // 硅基流动使用DeepSeek的API，但需要记录完整的模型名称
      if (selectedProvider === 'sbjt' && selectedVersion.includes('DeepSeek')) {
        console.log(`使用硅基流动的DeepSeek模型: ${selectedVersion}`);
      }
      
      await saveUserAIConfig({
        provider: configProvider,
        version: configVersion,
        enabled: data.enabled,
        customProviders: JSON.stringify(customProviders),
        lastUpdated: new Date().toISOString()
      });
      
      console.log("配置保存成功:", {
        provider: configProvider,
        version: configVersion,
        enabled: data.enabled
      });
      
      setIsConnected(true);
      onConnect(apiKey, configProvider, data.enabled);
      
      // 获取友好的模型名称显示
      let modelDisplay = selectedVersion;
      if (selectedProvider === 'sbjt') {
        if (selectedVersion === 'Pro/deepseek-ai/DeepSeek-V3') {
          modelDisplay = 'DeepSeek-V3 (硅基流动专业版)';
        } else if (selectedVersion === 'deepseek-ai/DeepSeek-R1') {
          modelDisplay = 'DeepSeek-R1 (硅基流动版)';
        }
      }
      
      toast.success("AI连接成功", {
        description: `已成功连接到${getProviderName(selectedProvider)}${modelDisplay ? ` (${modelDisplay})` : ''}`,
      });
    } catch (error) {
      console.error("保存配置失败:", error);
      toast.error(`AI配置保存失败: ${error.message || '请重试'}`);
    }
  };

  // Provider name 获取
  const getProviderName = (provider: string) => {
    const predefined = predefinedProviders.find(p => p.id === provider);
    if (predefined) return predefined.name;
    const custom = customProviders.find(p => p.id === provider);
    if (custom) return custom.name;
    return provider;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="h-5 w-5"><svg width="20" height="20" viewBox="0 0 24 24"><g><circle cx="12" cy="12" r="10" fill="#B9FF66" /></g><g><path d="M17.5 10.5V7A2.5 2.5 0 0 0 15 4.5h-6A2.5 2.5 0 0 0 6.5 7v3.5m11 0L19 17m-13-6.5L5 17M17 17.5A2.5 2.5 0 0 1 14.5 20h-5A2.5 2.5 0 0 1 7 17.5V17m10 .5v1A2.5 2.5 0 0 1 14.5 21h-5A2.5 2.5 0 0 1 7 18.5v-1M6.5 10.5h11" stroke="#222" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></g></svg></span>
          AI分析配置
        </CardTitle>
        <CardDescription>
          连接大模型API，开启智能分析功能
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <AIProviderSelector
                  predefinedProviders={predefinedProviders}
                  customProviders={customProviders}
                  selectedProvider={selectedProvider}
                  onSelect={(id) => {
                    setSelectedProvider(id);
                    const fromPre = predefinedProviders.find(p => p.id === id);
                    setSelectedVersion(fromPre && fromPre.versions.length ? fromPre.versions[0] : "");
                  }}
                  onShowAddCustom={() => setShowAddCustomDialog(true)}
                  onDeleteCustom={handleDeleteCustomProvider}
                />
                <AICustomModelDialog
                  open={showAddCustomDialog}
                  onOpenChange={setShowAddCustomDialog}
                  newProvider={newCustomProvider}
                  setNewProvider={setNewCustomProvider}
                  onAdd={handleAddCustomProvider}
                />
                <AIModelVersionSelector
                  provider={predefinedProviders.find(p => p.id === selectedProvider)}
                  selectedVersion={selectedVersion}
                  onChange={setSelectedVersion}
                />
                <AIKeyInput
                  selectedProvider={selectedProvider}
                  customProviders={customProviders}
                  value={apiKey}
                  onChange={e => {
                    setApiKey(e.target.value);
                    setApiKeyValidation({ status: 'none', message: '' });
                  }}
                  onValidate={() => validateApiKey()}
                  isValidating={isValidating}
                  validationStatus={apiKeyValidation.status}
                  validationMessage={apiKeyValidation.message}
                />
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>启用AI分析</FormLabel>
                        <FormDescription>
                          开启后，系统将自动对数据进行智能分析并生成报告
                        </FormDescription>
                      </div>
                      <FormControl>
                        <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                  disabled={isValidating}
                >
                  {isValidating ? "验证中..." : "连接AI服务"}
                </Button>
              </form>
            </Form>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="text-white h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">
                    已连接 {getProviderName(selectedProvider)}
                    {selectedVersion && <span className="text-sm text-gray-600 ml-1">({selectedVersion})</span>}
                  </p>
                  <p className="text-xs text-gray-500">API密钥已安全加密存储</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsConnected(false)}>
                更改
              </Button>
            </div>
            <AIAnalysisOptions />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast.success("AI分析设置已保存");
              }}
            >
              保存设置
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default AIConnector;
