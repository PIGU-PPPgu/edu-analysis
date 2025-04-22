
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CustomProvider, PredefinedProvider } from "./types";
import { Plus } from "lucide-react";

interface Props {
  predefinedProviders: PredefinedProvider[];
  customProviders: CustomProvider[];
  selectedProvider: string;
  onSelect: (providerId: string) => void;
  onShowAddCustom: () => void;
  onDeleteCustom: (id: string) => void;
}

export const AIProviderSelector: React.FC<Props> = ({
  predefinedProviders,
  customProviders,
  selectedProvider,
  onSelect,
  onShowAddCustom,
  onDeleteCustom,
}) => (
  <div>
    <div className="flex justify-between items-center mb-2">
      <div className="font-medium">选择大模型提供商</div>
      <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={onShowAddCustom}>
        <Plus className="h-4 w-4" /> 添加自定义模型
      </Button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {predefinedProviders.map(provider => (
        <Card
          key={provider.id}
          className={`cursor-pointer p-3 hover:border-primary ${selectedProvider === provider.id ? 'border-primary bg-primary/5' : ''}`}
          onClick={() => onSelect(provider.id)}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm">{provider.name}</div>
            {selectedProvider === provider.id && <Check className="h-4 w-4 text-primary" />}
          </div>
        </Card>
      ))}

      {customProviders.map(provider => (
        <div key={provider.id} className="relative">
          <Card
            className={`cursor-pointer p-3 hover:border-primary ${selectedProvider === provider.id ? 'border-primary bg-primary/5' : ''}`}
            onClick={() => onSelect(provider.id)}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{provider.name}</div>
              {selectedProvider === provider.id && <Check className="h-4 w-4 text-primary" />}
            </div>
          </Card>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onDeleteCustom(provider.id)}>
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  </div>
);
