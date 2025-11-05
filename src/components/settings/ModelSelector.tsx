import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ModelInfo } from "@/types/ai";
import { getAvailableModels } from "@/services/aiService";

interface ModelSelectorProps {
  providerId: string;
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

/**
 * 模型选择器组件
 * 提供更直观的模型选择体验
 */
export default function ModelSelector({
  providerId,
  value,
  onChange,
  disabled = false,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载提供商支持的模型
  useEffect(() => {
    if (!providerId) {
      setModels([]);
      return;
    }

    setLoading(true);
    // 获取提供商支持的模型
    const availableModels = getAvailableModels(providerId);
    setModels(availableModels);
    setLoading(false);

    // 如果当前选择的模型不在可用模型列表中，选择第一个可用模型
    if (
      value &&
      availableModels.length > 0 &&
      !availableModels.some((m) => m.id === value)
    ) {
      onChange(availableModels[0].id);
    }
  }, [providerId]);

  const selectedModel = models.find((m) => m.id === value);

  return (
    <div className="space-y-2 w-full">
      <Label htmlFor="model-select">模型</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || loading || models.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择模型">
            {selectedModel && (
              <div className="flex items-center gap-2">
                <span>{selectedModel.name}</span>
                <Badge variant="outline">
                  {selectedModel.maxTokens} tokens
                </Badge>
                {selectedModel.supportStream && (
                  <Badge variant="default" className="bg-green-500">
                    支持流式输出
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{model.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {model.maxTokens} tokens
                    </Badge>
                    {model.supportStream && (
                      <Badge variant="default" className="bg-green-500 text-xs">
                        流式输出
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
