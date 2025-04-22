
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomProvider, PredefinedProvider } from "./types";

interface Props {
  selectedProvider: string;
  customProviders: CustomProvider[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  value: string;
}

export const AIKeyInput: React.FC<Props> = ({
  selectedProvider,
  customProviders,
  onChange,
  value,
}) => {
  const getApiKeyHint = () => {
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
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`${selectedProvider}-key`}>API密钥</Label>
      <Input
        id={`${selectedProvider}-key`}
        type="password"
        placeholder="输入API密钥..."
        value={value}
        onChange={onChange}
      />
      <p className="text-xs text-gray-500">{getApiKeyHint()}</p>
    </div>
  );
};
