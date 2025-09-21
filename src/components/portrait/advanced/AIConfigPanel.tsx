import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Settings, Zap, Brain } from "lucide-react";
import { type AITagsGenerationConfig } from "@/services/enhancedAITagsService";

interface AIConfigPanelProps {
  onConfigChange: (config: AITagsGenerationConfig | null) => void;
  isLoading?: boolean;
}

const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ 
  onConfigChange,
  isLoading = false 
}) => {
  const [config, setConfig] = useState<AITagsGenerationConfig>({
    provider: 'openai',
    version: 'gpt-4o-mini',
    apiKey: '',
    batchSize: 3,
    enableProgressiveUpdate: true,
    minDataPointsRequired: 1
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  // 预设配置选项
  const providerOptions = [
    { 
      value: 'openai', 
      label: 'OpenAI', 
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
      description: '稳定可靠，适合大规模分析'
    },
    { 
      value: 'deepseek', 
      label: 'DeepSeek', 
      models: ['deepseek-v3', 'deepseek-coder'],
      description: '中文优化，成本较低'
    },
    { 
      value: 'anthropic', 
      label: 'Anthropic', 
      models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      description: '深度分析能力强'
    },
    { 
      value: 'qwen', 
      label: '通义千问', 
      models: ['qwen-max', 'qwen-plus'],
      description: '国内服务，中文理解优秀'
    }
  ];

  const currentProvider = providerOptions.find(p => p.value === config.provider);
  const availableModels = currentProvider?.models || [];

  // 更新配置
  const updateConfig = (updates: Partial<AITagsGenerationConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    // 只有在启用且API Key存在时才回调
    if (isEnabled && newConfig.apiKey.trim()) {
      onConfigChange(newConfig);
    } else {
      onConfigChange(null);
    }
  };

  // 启用/禁用切换
  const handleEnableToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    
    if (enabled && config.apiKey.trim()) {
      onConfigChange(config);
    } else {
      onConfigChange(null);
    }
  };

  // 预设快速配置
  const applyQuickConfig = (preset: 'fast' | 'balanced' | 'thorough') => {
    const presets = {
      fast: {
        provider: 'openai' as const,
        version: 'gpt-4o-mini',
        batchSize: 5,
        minDataPointsRequired: 1
      },
      balanced: {
        provider: 'deepseek' as const,
        version: 'deepseek-v3',
        batchSize: 3,
        minDataPointsRequired: 2
      },
      thorough: {
        provider: 'anthropic' as const,
        version: 'claude-3-sonnet-20240229',
        batchSize: 2,
        minDataPointsRequired: 3
      }
    };

    updateConfig(presets[preset]);
  };

  // 验证API Key格式
  const validateApiKey = (apiKey: string): boolean => {
    if (!apiKey) return false;
    
    const patterns = {
      openai: /^sk-[a-zA-Z0-9]{48}$/,
      deepseek: /^sk-[a-zA-Z0-9]+$/,
      anthropic: /^sk-ant-api[a-zA-Z0-9\-_]+$/,
      qwen: /^sk-[a-zA-Z0-9]+$/
    };

    const pattern = patterns[config.provider as keyof typeof patterns];
    return pattern ? pattern.test(apiKey) : apiKey.length > 10;
  };

  const isValidConfig = isEnabled && config.apiKey.trim() && validateApiKey(config.apiKey);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            增强AI标签配置
          </span>
          <div className="flex items-center space-x-2">
            <Label htmlFor="ai-enable">启用AI增强</Label>
            <input
              id="ai-enable"
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleEnableToggle(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4"
            />
          </div>
        </CardTitle>
        <CardDescription>
          配置AI服务以生成深度学习画像标签。启用后，新学生将自动获得AI分析的个性化标签。
        </CardDescription>
      </CardHeader>

      {isEnabled && (
        <CardContent className="space-y-6">
          {/* 快速配置预设 */}
          <div className="space-y-3">
            <Label>快速配置</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickConfig('fast')}
                disabled={isLoading}
              >
                <Zap className="h-4 w-4 mr-1" />
                快速模式
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickConfig('balanced')}
                disabled={isLoading}
              >
                <Settings className="h-4 w-4 mr-1" />
                平衡模式
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyQuickConfig('thorough')}
                disabled={isLoading}
              >
                <Brain className="h-4 w-4 mr-1" />
                深度模式
              </Button>
            </div>
          </div>

          {/* AI提供商选择 */}
          <div className="space-y-3">
            <Label>AI服务提供商</Label>
            <Select
              value={config.provider}
              onValueChange={(provider) => updateConfig({ 
                provider: provider as AITagsGenerationConfig['provider'],
                version: providerOptions.find(p => p.value === provider)?.models[0] || ''
              })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex flex-col">
                      <span>{provider.label}</span>
                      <span className="text-xs text-gray-500">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 模型版本选择 */}
          <div className="space-y-3">
            <Label>模型版本</Label>
            <Select
              value={config.version}
              onValueChange={(version) => updateConfig({ version })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key输入 */}
          <div className="space-y-3">
            <Label>API密钥</Label>
            <div className="relative">
              <Input
                type={showApiKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => updateConfig({ apiKey: e.target.value })}
                placeholder={`输入${currentProvider?.label} API Key...`}
                disabled={isLoading}
                className={`pr-12 ${config.apiKey && !validateApiKey(config.apiKey) ? 'border-red-500' : ''}`}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
                type="button"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {config.apiKey && !validateApiKey(config.apiKey) && (
              <p className="text-sm text-red-600">API Key格式不正确</p>
            )}
          </div>

          {/* 高级设置 */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-semibold">高级设置</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">批处理大小</Label>
                <Select
                  value={config.batchSize?.toString() || '3'}
                  onValueChange={(value) => updateConfig({ batchSize: parseInt(value) })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (慢速，精准)</SelectItem>
                    <SelectItem value="2">2 (平衡)</SelectItem>
                    <SelectItem value="3">3 (推荐)</SelectItem>
                    <SelectItem value="5">5 (快速)</SelectItem>
                    <SelectItem value="8">8 (批量)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">最低数据要求</Label>
                <Select
                  value={config.minDataPointsRequired?.toString() || '1'}
                  onValueChange={(value) => updateConfig({ minDataPointsRequired: parseInt(value) })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1次考试记录</SelectItem>
                    <SelectItem value="2">2次考试记录</SelectItem>
                    <SelectItem value="3">3次考试记录</SelectItem>
                    <SelectItem value="5">5次考试记录</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">启用渐进式更新</Label>
              <input
                type="checkbox"
                checked={config.enableProgressiveUpdate}
                onChange={(e) => updateConfig({ enableProgressiveUpdate: e.target.checked })}
                disabled={isLoading}
                className="w-4 h-4"
              />
            </div>
          </div>

          {/* 配置状态显示 */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">配置状态</span>
              <Badge variant={isValidConfig ? "default" : "secondary"}>
                {isValidConfig ? "就绪" : "未配置"}
              </Badge>
            </div>
            
            {isValidConfig && (
              <Alert className="mt-3">
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  AI增强配置已就绪。新创建的学生将自动获得基于{currentProvider?.label}的深度学习画像分析。
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AIConfigPanel;