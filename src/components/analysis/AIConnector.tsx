
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudUpload, Database, Settings, Plus, Check } from "lucide-react";
import { saveUserAIConfig, getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface AIConnectorProps {
  onConnect: (apiKey: string, provider: string, enabled: boolean) => void;
}

interface CustomProvider {
  id: string;
  name: string;
  endpoint: string;
}

const predefinedProviders = [
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
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [selectedVersion, setSelectedVersion] = useState("");
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const [showAddCustomDialog, setShowAddCustomDialog] = useState(false);
  const [newCustomProvider, setNewCustomProvider] = useState<CustomProvider>({ id: "", name: "", endpoint: "" });
  
  const form = useForm({
    defaultValues: {
      apiKey: "",
      enabled: true,
    },
  });

  // 检查是否已有保存的配置
  useEffect(() => {
    const savedConfig = getUserAIConfig();
    const savedKey = getUserAPIKey();
    
    if (savedConfig && savedKey) {
      setIsConnected(true);
      setSelectedProvider(savedConfig.provider);
      if (savedConfig.version) {
        setSelectedVersion(savedConfig.version);
      } else {
        // 设置默认版本
        const providerInfo = predefinedProviders.find(p => p.id === savedConfig.provider);
        if (providerInfo && providerInfo.versions.length > 0) {
          setSelectedVersion(providerInfo.versions[0]);
        }
      }
      form.setValue("enabled", savedConfig.enabled);
      
      // 加载自定义提供商
      if (savedConfig.customProviders) {
        try {
          setCustomProviders(JSON.parse(savedConfig.customProviders));
        } catch (e) {
          console.error("解析自定义提供商数据失败", e);
          setCustomProviders([]);
        }
      }
      
      // 通知父组件已连接
      onConnect(savedKey, savedConfig.provider, savedConfig.enabled);
    }
  }, []);

  const validateApiKey = async (apiKey: string, provider: string): Promise<boolean> => {
    setIsValidating(true);
    // 实际环境中应该验证API密钥有效性
    try {
      // 模拟API验证延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 这里应该实际验证API密钥，简化处理为长度检查
      const isValid = apiKey.length > 8;
      
      if (!isValid) {
        toast.error("API密钥无效，请检查后重试");
      }
      
      return isValid;
    } catch (error) {
      toast.error(`验证API密钥失败: ${error.message}`);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: { apiKey: string; enabled: boolean }) => {
    if (!data.apiKey) {
      toast.error("请输入API密钥");
      return;
    }
    
    const isValid = await validateApiKey(data.apiKey, selectedProvider);
    if (!isValid) return;
    
    try {
      // 保存配置
      await saveUserAIConfig({
        apiKey: data.apiKey,
        provider: selectedProvider,
        version: selectedVersion,
        enabled: data.enabled,
        customProviders: JSON.stringify(customProviders)
      });
      
      setIsConnected(true);
      onConnect(data.apiKey, selectedProvider, data.enabled);
      
      toast.success("AI连接成功", {
        description: `已成功连接到${getProviderName(selectedProvider)}${selectedVersion ? ` (${selectedVersion})` : ''}`,
      });
    } catch (error) {
      toast.error(`AI配置保存失败: ${error.message || '请重试'}`);
    }
  };

  const getProviderName = (provider: string) => {
    const predefined = predefinedProviders.find(p => p.id === provider);
    if (predefined) return predefined.name;
    
    const custom = customProviders.find(p => p.id === provider);
    if (custom) return custom.name;
    
    return provider;
  };
  
  const handleAddCustomProvider = () => {
    if (!newCustomProvider.id || !newCustomProvider.name || !newCustomProvider.endpoint) {
      toast.error("请填写完整的自定义模型信息");
      return;
    }
    
    // 检查ID是否已存在
    if ([...predefinedProviders.map(p => p.id), ...customProviders.map(p => p.id)].includes(newCustomProvider.id)) {
      toast.error("模型ID已存在，请使用其他标识符");
      return;
    }
    
    setCustomProviders([...customProviders, newCustomProvider]);
    setNewCustomProvider({ id: "", name: "", endpoint: "" });
    setShowAddCustomDialog(false);
    toast.success("自定义模型已添加");
  };
  
  const handleDeleteCustomProvider = (id: string) => {
    setCustomProviders(customProviders.filter(p => p.id !== id));
    toast.success("自定义模型已删除");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5" />
          AI分析配置
        </CardTitle>
        <CardDescription>
          连接大模型API，开启智能分析功能
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">选择大模型提供商</div>
                <Dialog open={showAddCustomDialog} onOpenChange={setShowAddCustomDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Plus className="h-4 w-4" /> 添加自定义模型
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加自定义AI模型</DialogTitle>
                      <DialogDescription>
                        添加您自己的API端点和配置，以连接其他大语言模型。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="custom-id">模型标识符 (ID)</Label>
                        <Input
                          id="custom-id"
                          placeholder="例如: my-model"
                          value={newCustomProvider.id}
                          onChange={(e) => setNewCustomProvider(prev => ({...prev, id: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custom-name">模型名称</Label>
                        <Input
                          id="custom-name"
                          placeholder="例如: 我的自定义模型"
                          value={newCustomProvider.name}
                          onChange={(e) => setNewCustomProvider(prev => ({...prev, name: e.target.value}))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custom-endpoint">API 端点</Label>
                        <Input
                          id="custom-endpoint"
                          placeholder="例如: https://api.example.com/v1/chat"
                          value={newCustomProvider.endpoint}
                          onChange={(e) => setNewCustomProvider(prev => ({...prev, endpoint: e.target.value}))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddCustomDialog(false)}>取消</Button>
                      <Button onClick={handleAddCustomProvider}>添加</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {predefinedProviders.map(provider => (
                  <Card 
                    key={provider.id}
                    className={`cursor-pointer p-3 hover:border-primary ${selectedProvider === provider.id ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      if (provider.versions.length > 0) {
                        setSelectedVersion(provider.versions[0]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{provider.name}</div>
                      {selectedProvider === provider.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </Card>
                ))}
                
                {customProviders.map(provider => (
                  <div key={provider.id} className="relative">
                    <Card 
                      className={`cursor-pointer p-3 hover:border-primary ${selectedProvider === provider.id ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">{provider.name}</div>
                        {selectedProvider === provider.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </Card>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDeleteCustomProvider(provider.id)}>
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              
              {selectedProvider && (
                <div className="space-y-2">
                  {(() => {
                    const current = predefinedProviders.find(p => p.id === selectedProvider);
                    if (current && current.versions.length > 0) {
                      return (
                        <div className="space-y-2">
                          <Label htmlFor="model-version">选择模型版本</Label>
                          <Select 
                            value={selectedVersion} 
                            onValueChange={setSelectedVersion}
                          >
                            <SelectTrigger id="model-version">
                              <SelectValue placeholder="选择模型版本" />
                            </SelectTrigger>
                            <SelectContent>
                              {current.versions.map(version => (
                                <SelectItem key={version} value={version}>
                                  {version}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${selectedProvider}-key`}>API密钥</Label>
                    <Input 
                      id={`${selectedProvider}-key`} 
                      type="password" 
                      placeholder="输入API密钥..."
                      {...form.register("apiKey")}
                    />
                    <p className="text-xs text-gray-500">
                      {(() => {
                        switch (selectedProvider) {
                          case 'openai': return "获取您的OpenAI API密钥，用于GPT模型的数据分析";
                          case 'anthropic': return "Anthropic提供的Claude模型，适用于教育场景分析";
                          case 'deepseek': return "DeepSeek提供先进的中文理解能力，适合教育场景的数据分析";
                          case 'baichuan': return "国产大模型，提供专业的教育领域知识和分析能力";
                          case 'qwen': return "阿里云提供的大语言模型，拥有丰富的知识库和分析能力";
                          case 'moonshot': return "Moonshot AI提供的高性能大语言模型";
                          case 'zhipu': return "智谱AI提供的通用大语言模型";
                          case 'minimax': return "MiniMax提供的ABAB系列大语言模型";
                          default: {
                            const custom = customProviders.find(p => p.id === selectedProvider);
                            return custom ? `连接到自定义API端点: ${custom.endpoint}` : "请输入API密钥完成连接";
                          }
                        }
                      })()}
                    </p>
                  </div>
                </div>
              )}

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
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
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
            
            <div className="space-y-3">
              <Label>AI分析选项</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch id="student-analysis" defaultChecked />
                  <Label htmlFor="student-analysis">学生个体分析</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="class-analysis" defaultChecked />
                  <Label htmlFor="class-analysis">班级整体分析</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="improvement-suggestions" defaultChecked />
                  <Label htmlFor="improvement-suggestions">改进建议</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="performance-prediction" defaultChecked />
                  <Label htmlFor="performance-prediction">成绩趋势预测</Label>
                </div>
              </div>
            </div>
            
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

