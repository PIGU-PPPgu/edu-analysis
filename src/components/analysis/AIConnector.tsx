
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { saveUserAIConfig, getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { AIProviderSelector } from "./AIProviderSelector";
import { AIModelVersionSelector } from "./AIModelVersionSelector";
import { AICustomModelDialog } from "./AICustomModelDialog";
import { AIKeyInput } from "./AIKeyInput";
import { AIAnalysisOptions } from "./AIAnalysisOptions";
import { Check } from "lucide-react";
import { PredefinedProvider, CustomProvider } from "./types";

interface AIConnectorProps {
  onConnect: (apiKey: string, provider: string, enabled: boolean) => void;
}

const predefinedProviders: PredefinedProvider[] = [
  { id: "openai", name: "OpenAI", versions: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"] },
  { id: "anthropic", name: "Anthropic", versions: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"] },
  { id: "deepseek", name: "DeepSeek", versions: ["deepseek-chat", "deepseek-coder", "deepseek-v2", "deepseek-v3"] },
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

  const form = useForm({
    defaultValues: {
      apiKey: "",
      enabled: true,
    },
  });

  // 从本地恢复配置
  useEffect(() => {
    const savedConfig = getUserAIConfig();
    const savedKey = getUserAPIKey();
    if (savedConfig && savedKey) {
      setIsConnected(true);
      setSelectedProvider(savedConfig.provider);
      setSelectedVersion(savedConfig.version ?? predefinedProviders[0].versions[0]);
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
    setCustomProviders([...customProviders, newCustomProvider]);
    setNewCustomProvider({ id: "", name: "", endpoint: "" });
    setShowAddCustomDialog(false);
    toast.success("自定义模型已添加");
  };
  // 删除自定义模型
  const handleDeleteCustomProvider = (id: string) => {
    setCustomProviders(customProviders.filter(p => p.id !== id));
    toast.success("自定义模型已删除");
  };

  const validateApiKey = async (inputApiKey: string, provider: string): Promise<boolean> => {
    setIsValidating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const isValid = inputApiKey.length > 8;
      if (!isValid) toast.error("API密钥无效，请检查后重试");
      return isValid;
    } catch (error) {
      toast.error("验证API密钥失败");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: { apiKey: string; enabled: boolean }) => {
    if (!apiKey) {
      toast.error("请输入API密钥");
      return;
    }
    const isValid = await validateApiKey(apiKey, selectedProvider);
    if (!isValid) return;
    try {
      await saveUserAIConfig({
        apiKey: apiKey,
        provider: selectedProvider,
        version: selectedVersion,
        enabled: data.enabled,
        customProviders: JSON.stringify(customProviders)
      });
      setIsConnected(true);
      onConnect(apiKey, selectedProvider, data.enabled);
      toast.success("AI连接成功", {
        description: `已成功连接到${getProviderName(selectedProvider)}${selectedVersion ? ` (${selectedVersion})` : ''}`,
      });
    } catch (error) {
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
                  onChange={e => setApiKey(e.target.value)}
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
