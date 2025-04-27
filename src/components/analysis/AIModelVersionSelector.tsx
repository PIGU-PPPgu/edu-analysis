import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PredefinedProvider } from "./types";

interface Props {
  provider: PredefinedProvider | undefined;
  selectedVersion: string;
  onChange: (version: string) => void;
}

export const AIModelVersionSelector: React.FC<Props> = ({ provider, selectedVersion, onChange }) => {
  if (!provider || !provider.versions.length) return null;

  // 获取显示友好的模型名称
  const getDisplayName = (version: string) => {
    // 处理硅基流动的DeepSeek系列模型
    if (version === 'Pro/deepseek-ai/DeepSeek-V3') {
      return 'DeepSeek-V3 (硅基流动专业版)';
    } else if (version === 'deepseek-ai/DeepSeek-R1') {
      return 'DeepSeek-R1 (硅基流动版)';
    }
    return version;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="model-version">选择模型版本</Label>
      <Select value={selectedVersion} onValueChange={onChange}>
        <SelectTrigger id="model-version">
          <SelectValue placeholder="选择模型版本">
            {getDisplayName(selectedVersion)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {provider.versions.map(version => (
            <SelectItem key={version} value={version}>
              {getDisplayName(version)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
