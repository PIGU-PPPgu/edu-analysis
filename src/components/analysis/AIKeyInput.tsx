import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { CustomProvider } from "./types";

interface Props {
  selectedProvider: string;
  customProviders: CustomProvider[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
  onValidate?: () => Promise<boolean>;
  isValidating?: boolean;
  validationStatus?: 'none' | 'success' | 'error' | 'validating';
  validationMessage?: string;
}

export const AIKeyInput: React.FC<Props> = ({
  selectedProvider,
  customProviders,
  onChange,
  value,
  onValidate,
  isValidating = false,
  validationStatus = 'none',
  validationMessage = '',
}) => {
  const getApiKeyHint = () => {
    switch (selectedProvider) {
      case 'openai': return "获取您的OpenAI API密钥，用于GPT模型的数据分析";
      case 'anthropic': return "Anthropic提供的Claude模型，适用于教育场景分析";
      case 'deepseek': return "DeepSeek提供先进的中文理解能力，适合教育场景的数据分析";
      case 'sbjt': return "硅基流动提供的教育专用模型，支持sk-、sbjt_或jgt_开头的API密钥";
      case 'baichuan': return "国产大模型，提供专业的教育领域知识和分析能力";
      case 'qwen': return "阿里云提供的大语言模型，拥有丰富的知识库和分析能力";
      case 'moonshot': return "Moonshot AI提供的高性能大语言模型";
      case 'zhipu': return "智谱AI提供的通用大语言模型";
      case 'minimax': return "MiniMax提供的ABAB系列大语言模型";
      default: {
        if (selectedProvider.startsWith('custom-')) {
          const custom = customProviders.find(p => p.id === selectedProvider);
          return custom 
            ? `连接到自定义API端点: ${custom.endpoint}` 
            : "请输入自定义API端点的API密钥";
        }
        
        const custom = customProviders.find(p => p.id === selectedProvider);
        return custom ? `连接到自定义API端点: ${custom.endpoint}` : "请输入API密钥完成连接";
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${selectedProvider}-key`}>API密钥</Label>
      <div className="flex gap-2">
        <Input
          id={`${selectedProvider}-key`}
          type="password"
          placeholder="输入API密钥..."
          value={value}
          onChange={onChange}
          className={validationStatus === 'error' ? 'border-red-500' : ''}
        />
        {onValidate && (
          <Button 
            type="button" 
            onClick={onValidate}
            disabled={isValidating || !value.trim()} 
            className="whitespace-nowrap min-w-[120px]"
            variant={validationStatus === 'success' ? 'outline' : 'default'}
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                验证中...
              </>
            ) : validationStatus === 'success' ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                验证成功
              </>
            ) : (
              "验证API密钥"
            )}
          </Button>
        )}
      </div>
      {validationStatus !== 'none' && validationStatus !== 'validating' && (
        <div className={`text-sm rounded-md p-2 ${validationStatus === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {validationStatus === 'success' ? (
            <div className="flex items-center">
              <Check className="mr-2 h-4 w-4" />
              {validationMessage || '验证成功！API密钥有效。'}
            </div>
          ) : (
            <div className="flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              {validationMessage || '验证失败，请检查API密钥。'}
            </div>
          )}
        </div>
      )}
      {validationStatus === 'validating' && (
        <div className="text-sm rounded-md p-2 bg-blue-50 text-blue-700">
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {validationMessage || '正在验证API密钥...'}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500">{getApiKeyHint()}</p>
    </div>
  );
};
