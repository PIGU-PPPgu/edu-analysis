import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import Navbar from "@/components/shared/Navbar";
import { getUserAIConfig, getUserAPIKey, saveUserAPIKey, saveUserAIConfig } from "@/utils/userAuth";
import { getProviderById } from "@/services/providers";
import { DEFAULT_PROVIDERS } from "@/config/aiProviders";
import { Check, RefreshCw, Plus, Save, Trash2 } from "lucide-react";
import { testProviderConnection } from '@/services/aiService';

const AISettings: React.FC = () => {
  // 通用状态
  const [selectedProvider, setSelectedProvider] = useState<string>('doubao'); // 默认选择豆包
  const [availableProviders, setAvailableProviders] = useState<Array<{id: string, name: string}>>([]);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [isConfigSaved, setIsConfigSaved] = useState(false);
  
  // API配置状态
  const [apiKey, setApiKey] = useState<string>('');
  const [apiId, setApiId] = useState<string>(''); // 适用于需要额外ID的提供商
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [savedApiId, setSavedApiId] = useState<string>('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  
  // 模型选择状态
  const [availableModels, setAvailableModels] = useState<Array<{id: string, name: string, selected: boolean}>>([]);
  const [customModelName, setCustomModelName] = useState<string>('');
  
  // 初始化可用提供商列表
  useEffect(() => {
    const providers = Object.entries(DEFAULT_PROVIDERS).map(([id, config]) => ({
      id,
      name: getProviderDisplayName(id)
    }));
    setAvailableProviders(providers);
  }, []);
  
  // 加载用户配置和初始化
  useEffect(() => {
    loadUserConfig();
  }, []);
  
  // 当提供商变更时获取该提供商的模型列表和API密钥
  useEffect(() => {
    if (selectedProvider) {
      loadProviderModels(selectedProvider);
      fetchProviderApiKey(selectedProvider);
    }
  }, [selectedProvider]);
  
  // 加载用户配置
  const loadUserConfig = async () => {
    try {
      const config = await getUserAIConfig();
      setAiConfig(config);
      
      // 如果有已保存的提供商，设置为当前选择
      if (config?.provider) {
        setSelectedProvider(config.provider);
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
    }
  };
  
  // 加载提供商的模型列表
  const loadProviderModels = (providerId: string) => {
    const provider = getProviderById(providerId);
    if (provider && provider.models) {
      const models = provider.models.map(model => ({
        id: model.id,
        name: model.name,
        selected: aiConfig?.provider === providerId && aiConfig?.version === model.id
      }));
      setAvailableModels(models);
    } else {
      setAvailableModels([]);
    }
  };
  
  // 获取提供商的友好显示名称
  const getProviderDisplayName = (providerId: string): string => {
    const displayNames: Record<string, string> = {
      'openai': '智能语言模型',
      'anthropic': '对话助手模型',
      'deepseek': 'DeepSeek',
      'baichuan': '百川大模型',
      'qwen': '通义千问',
      'sbjt': '硅基流动',
      'doubao': '豆包视觉 (火山方舟)',
      'moonshot': 'Moonshot AI',
      'zhipu': '智谱 AI',
      'minimax': 'MiniMax',
    };
    return displayNames[providerId] || providerId;
  };
  
  // 获取保存的API密钥
  const fetchProviderApiKey = async (providerId: string) => {
    try {
      const key = await getUserAPIKey(providerId);
      setSavedApiKey(key);
      
      // 如果有保存的密钥，显示掩码
      if (key) {
        // 显示掩码，只显示前4位和后4位
        const maskKey = key.length > 8 
          ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
          : '••••';
        setApiKey(maskKey);
      } else {
        setApiKey('');
      }
      
      // 获取保存的API ID - 仅当providerId为'doubao'时
      if (providerId === 'doubao') {
        const savedId = localStorage.getItem(`${providerId}_api_id`);
        if (savedId) {
          setApiId(savedId);
          setSavedApiId(savedId);
        } else {
          // 清空API ID输入框
          setApiId('');
          setSavedApiId('');
        }
      } else {
        // 其他提供商清空API ID
        setApiId('');
        setSavedApiId('');
      }
    } catch (error) {
      console.error(`获取${providerId} API密钥失败:`, error);
      setSavedApiKey(null);
      setApiKey('');
      // 同时清空API ID
      setApiId('');
      setSavedApiId('');
    }
  };
  
  // 保存API密钥
  const handleSaveApiKey = async () => {
    if (!apiKey) {
      toast.error('请输入API密钥');
      return;
    }
    
    // 判断是否是掩码值，如果是则不保存（用户没有修改）
    if (apiKey.includes('...') && savedApiKey) {
      toast.info('API密钥未更改');
      return;
    }
    
    try {
      // 保存API密钥
      await saveUserAPIKey(selectedProvider, apiKey);
      
      // 如果有API ID，也保存它
      if (providerRequiresApiId && apiId) {
        // 使用localStorage或其他方式存储API ID
        localStorage.setItem(`${selectedProvider}_api_id`, apiId);
        setSavedApiId(apiId);
      } else if (providerRequiresApiId) {
        // 如果需要API ID但用户未输入，清除之前存储的值
        localStorage.removeItem(`${selectedProvider}_api_id`);
        setSavedApiId('');
      }
      
      toast.success(`${getProviderDisplayName(selectedProvider)} API密钥已保存`);
      setSavedApiKey(apiKey);
      
      // 刷新掩码显示
      fetchProviderApiKey(selectedProvider);
    } catch (error) {
      toast.error(`保存API密钥失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
  
  // 测试连接
  const handleTestConnection = async () => {
    if (!savedApiKey) {
      toast.error('请先保存API密钥');
      return;
    }
    
    setIsTestingConnection(true);
    
    try {
      // 获取选中的模型
      const selectedModel = availableModels.find(model => model.selected);
      if (!selectedModel) {
        toast.error('请先选择一个模型');
        setIsTestingConnection(false);
        return;
      }
      
      // 记录实际测试的模型
      console.log('测试连接使用模型:', selectedModel.id);
      
      // 调用真实API测试连接
      const result = await testProviderConnection(
        selectedProvider,
        savedApiKey,
        savedApiId,
        selectedModel.id  // 传递所选模型ID
      );
      
      if (result.success) {
        toast.success(`${getProviderDisplayName(selectedProvider)} API连接测试成功`);
      } else {
        toast.error(`连接测试失败: ${result.message}`);
      }
    } catch (error) {
      toast.error(`连接测试失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsTestingConnection(false);
    }
  };
  
  // 切换模型选择状态
  const toggleModelSelection = (modelId: string) => {
    setAvailableModels(models => 
      models.map(model => 
        model.id === modelId 
          ? { ...model, selected: !model.selected } 
          : model
      )
    );
  };
  
  // 添加自定义模型
  const handleAddCustomModel = () => {
    if (!customModelName.trim()) {
      toast.error('请输入自定义模型名称');
      return;
    }
    
    // 创建自定义模型ID
    const customId = `custom-${selectedProvider}-${Date.now()}`;
    
    setAvailableModels([
      ...availableModels,
      {
        id: customId,
        name: customModelName.trim(),
        selected: true // 默认选中新添加的自定义模型
      }
    ]);
    
    setCustomModelName('');
    toast.success('自定义模型已添加');
  };
  
  // 保存整体配置
  const handleSaveConfig = async () => {
    try {
      // 获取选中的模型
      const selectedModel = availableModels.find(model => model.selected);
      
      if (!selectedModel) {
        toast.error('请至少选择一个模型');
        return;
      }
      
      if (!savedApiKey) {
        toast.error('请先保存API密钥');
        return;
      }
      
      // 保存配置
      const config = {
        provider: selectedProvider,
        version: selectedModel.id,
        enabled: true,
        lastUpdated: new Date().toISOString(),
      };
      
      await saveUserAIConfig(config);
      setAiConfig(config);
      setIsConfigSaved(true);
      toast.success('AI设置已保存', {
        description: `已将${getProviderDisplayName(selectedProvider)}设为默认模型`
      });
      
      // 3秒后重置保存状态
      setTimeout(() => setIsConfigSaved(false), 3000);
    } catch (error) {
      toast.error(`保存设置失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };
  
  // 获取已选择的模型数量
  const selectedModelsCount = availableModels.filter(model => model.selected).length;
  
  // 判断当前提供商是否需要API ID
  const providerRequiresApiId = selectedProvider === 'doubao';
  
  // 获取提供商的模型推荐说明
  const getProviderModelRecommendations = () => {
    switch (selectedProvider) {
      case 'doubao':
        return (
          <div className="space-y-3 mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium">推荐模型</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="font-semibold inline-block w-64">doubao-1-5-vision-pro-32k-250115</span>
                <span>豆包视觉增强版，适合图片分析和知识点提取</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold inline-block w-64">doubao-lite-128k</span>
                <span>大上下文窗口，适合长文本处理</span>
              </li>
            </ul>
          </div>
        );
      case 'openai':
        return (
          <div className="space-y-3 mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium">推荐模型</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="font-semibold inline-block w-64">智能模型-旗舰版</span>
                <span>最新的多模态模型，支持图像和文本分析</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold inline-block w-64">智能模型-增强版</span>
                <span>功能强大的大型语言模型，适合复杂任务</span>
              </li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AI分析设置</h1>
              <p className="text-gray-500 mt-1">
                配置AI分析功能，选择合适的AI模型和参数
              </p>
            </div>
            <Button
              onClick={handleSaveConfig}
              disabled={isConfigSaved || !selectedModelsCount}
              className="ml-auto"
            >
              {isConfigSaved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  保存设置
                </>
              )}
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>AI模型配置</CardTitle>
              <CardDescription>
                选择AI提供商并配置相关参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 提供商选择 */}
              <div className="space-y-4">
                <label className="text-sm font-medium">选择AI提供商</label>
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择AI提供商" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map(provider => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择一个AI提供商来配置API密钥和选择模型
                </p>
              </div>
              
              {/* API密钥设置 */}
              <div className="space-y-4">
                <h3 className="text-md font-medium">API密钥配置</h3>
                
                {providerRequiresApiId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API ID <span className="text-xs text-muted-foreground">(可选)</span></label>
                    <Input
                      placeholder="输入API ID (如需要)"
                      value={apiId}
                      onChange={e => setApiId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      部分提供商需要额外的API ID
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">API密钥</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={`输入${getProviderDisplayName(selectedProvider)}的API密钥`}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleSaveApiKey}>
                      保存密钥
                    </Button>
                  </div>
                  {savedApiKey && (
                    <div className="flex items-center mt-2 text-sm text-green-600">
                      <Check size={16} className="mr-1" />
                      已保存API密钥
                    </div>
                  )}
                </div>
                
                {/* 测试连接按钮 */}
                {savedApiKey && (
                  <div className="mt-4">
                    <Button 
                      variant="outline" 
                      onClick={handleTestConnection}
                      disabled={isTestingConnection}
                      className="w-full"
                    >
                      {isTestingConnection ? (
                        <>
                          <RefreshCw size={14} className="mr-2 animate-spin" />
                          测试连接中...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} className="mr-2" />
                          测试API连接
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* 模型选择 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-medium">{getProviderDisplayName(selectedProvider)}可用模型</h3>
                  <Badge variant="outline">{selectedModelsCount} 个已选</Badge>
                </div>
                
                {availableModels.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {availableModels.map(model => (
                      <div key={model.id} className="flex items-center space-x-2 p-2 rounded border">
                        <Checkbox 
                          id={`model-${model.id}`}
                          checked={model.selected}
                          onCheckedChange={() => toggleModelSelection(model.id)}
                        />
                        <label 
                          htmlFor={`model-${model.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                        >
                          {model.name}
                          <p className="text-xs text-muted-foreground mt-1">
                            {model.id}
                          </p>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    此提供商没有可用模型
                  </div>
                )}
                
                <Separator />
                
                {/* 添加自定义模型 */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">添加自定义模型</label>
                    <Input
                      placeholder="输入自定义模型名称"
                      value={customModelName}
                      onChange={e => setCustomModelName(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleAddCustomModel}
                    disabled={!customModelName.trim()}
                  >
                    <Plus size={16} className="mr-1" />
                    添加
                  </Button>
                </div>
                
                {/* 提供商模型推荐说明 */}
                {getProviderModelRecommendations()}
              </div>
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
                    <p>• 使用提供商: {getProviderDisplayName(aiConfig.provider)}</p>
                    <p>• 使用模型: {aiConfig.version}</p>
                    <p>• 分析状态: {aiConfig.enabled ? '已启用' : '已禁用'}</p>
                    <p>• 更新时间: {aiConfig.lastUpdated ? new Date(aiConfig.lastUpdated).toLocaleString() : '未知'}</p>
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
                                  <h3 className="font-semibold mb-2">智能语言模型</h3>
                <p className="text-sm text-gray-600 mb-2">提供先进的语言模型，支持多种语言的文本分析和生成。</p>
                <div className="text-xs text-gray-500">支持版本: 旗舰版, 增强版, 标准版</div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">豆包 (火山方舟)</h3>
                  <p className="text-sm text-gray-600 mb-2">专为中文优化的多模态模型，支持图像和文本分析。</p>
                  <div className="text-xs text-gray-500">支持版本: doubao-1-5-vision-pro-32k-250115, doubao-lite-128k</div>
                </Card>
                
                <Card className="p-4">
                  <h3 className="font-semibold mb-2">DeepSeek</h3>
                  <p className="text-sm text-gray-600 mb-2">强大的中文理解能力，适合教育文本分析和理解。</p>
                  <div className="text-xs text-gray-500">支持版本: deepseek-chat (DeepSeek-V3), deepseek-reasoner (DeepSeek-R1), deepseek-coder</div>
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
                  <p className="text-sm text-gray-600 mb-2">系统还支持硅基流动、Moonshot AI、智谱AI等多种模型。</p>
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

