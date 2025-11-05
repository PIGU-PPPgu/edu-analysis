/**
 * 复杂度切换组件
 * 控制分析界面的复杂度等级，遵循米勒定律
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Rocket,
  ChevronDown,
  User,
  UserCog,
  Brain,
} from "lucide-react";

export type ComplexityLevel = "simple" | "standard" | "advanced";

interface ComplexityToggleProps {
  value: ComplexityLevel;
  onChange: (value: ComplexityLevel) => void;
  className?: string;
}

const complexityConfig = {
  simple: {
    label: "简洁模式",
    icon: User,
    description: "只显示核心数据",
    color: "#B9FF66",
    items: 5,
  },
  standard: {
    label: "标准模式",
    icon: UserCog,
    description: "平衡信息量与易读性",
    color: "#F59E0B",
    items: 7,
  },
  advanced: {
    label: "专业模式",
    icon: Brain,
    description: "完整数据分析",
    color: "#8B5CF6",
    items: 9,
  },
};

export const ComplexityToggle: React.FC<ComplexityToggleProps> = ({
  value,
  onChange,
  className,
}) => {
  const current = complexityConfig[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2 border-2 border-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all",
            className
          )}
        >
          <current.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{current.label}</span>
          <Badge
            variant="secondary"
            className="ml-1 px-2 py-0.5 text-xs font-black bg-white border border-black"
          >
            {current.items}
          </Badge>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border-2 border-black shadow-[6px_6px_0px_0px_#191A23]"
      >
        {Object.entries(complexityConfig).map(([key, config]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => onChange(key as ComplexityLevel)}
            className={cn(
              "flex items-start gap-3 p-3 cursor-pointer",
              value === key && "bg-[#F8F8F8]"
            )}
          >
            <div
              className="p-2 rounded-lg border-2 border-black"
              style={{ backgroundColor: config.color }}
            >
              <config.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">{config.label}</span>
                <Badge variant="outline" className="text-xs border-black">
                  {config.items}项
                </Badge>
              </div>
              <p className="text-xs text-[#6B7280]">{config.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
