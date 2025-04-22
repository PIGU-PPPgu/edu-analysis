
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PredefinedProvider, CustomProvider } from "./types";

interface Props {
  provider: PredefinedProvider | CustomProvider | undefined;
  selectedVersion: string;
  onChange: (version: string) => void;
  label?: string;
  disabled?: boolean;
}

export const AIProviderVersionSelector: React.FC<Props> = ({ 
  provider, 
  selectedVersion, 
  onChange, 
  label = "选择模型版本",
  disabled = false
}) => {
  // 如果没有提供商或者是自定义提供商（没有预定义版本）则不显示
  if (!provider || !('versions' in provider) || !provider.versions.length) return null;
  
  return (
    <div className="space-y-2">
      <Label htmlFor="model-version">{label}</Label>
      <Select 
        value={selectedVersion} 
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id="model-version" className={disabled ? "opacity-70" : ""}>
          <SelectValue placeholder={`请${label}`} />
        </SelectTrigger>
        <SelectContent>
          {provider.versions.map(version => (
            <SelectItem key={version} value={version}>
              {version}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
