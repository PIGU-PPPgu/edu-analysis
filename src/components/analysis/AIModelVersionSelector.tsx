
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
  return (
    <div className="space-y-2">
      <Label htmlFor="model-version">选择模型版本</Label>
      <Select value={selectedVersion} onValueChange={onChange}>
        <SelectTrigger id="model-version">
          <SelectValue placeholder="选择模型版本" />
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
