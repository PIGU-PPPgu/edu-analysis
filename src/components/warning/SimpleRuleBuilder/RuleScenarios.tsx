/**
 * 预警场景选择器
 * 以卡片形式展示预设场景，供教师选择
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { RuleScenario } from "./types";
import { allScenarios, scenariosByCategory } from "./scenarios";

interface RuleScenariosProps {
  onSelectScenario: (scenario: RuleScenario) => void;
  className?: string;
}

// 类别图标映射
const categoryIcons = {
  grade: GraduationCap,
  homework: BookOpen,
  progress: Target,
  attendance: BookOpen,
  behavior: BookOpen,
  composite: Target,
} as const;

// 类别名称映射
const categoryNames = {
  grade: "成绩相关",
  homework: "作业相关",
  progress: "学习进度",
  attendance: "考勤相关",
  behavior: "行为相关",
  composite: "综合评估",
} as const;

// 难度标签样式
const getDifficultyBadge = (difficulty: string) => {
  switch (difficulty) {
    case "easy":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          简单
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          中等
        </Badge>
      );
    default:
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200">
          {difficulty}
        </Badge>
      );
  }
};

// 场景卡片组件
const ScenarioCard: React.FC<{
  scenario: RuleScenario;
  onSelect: () => void;
}> = ({ scenario, onSelect }) => {
  const IconComponent = categoryIcons[scenario.category] || BookOpen;

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md border-2 border-gray-200 hover:border-[#B9FF66]"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <span className="text-2xl">{scenario.icon}</span>
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[#191A23]">
                {scenario.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <IconComponent className="h-3 w-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {categoryNames[scenario.category]}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getDifficultyBadge(scenario.difficulty)}
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600 leading-relaxed">
          {scenario.description}
        </p>
        <div className="mt-3 text-xs text-gray-500">
          需要设置 {scenario.parameters.length} 个参数
        </div>
      </CardContent>
    </Card>
  );
};

const RuleScenarios: React.FC<RuleScenariosProps> = ({
  onSelectScenario,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // 筛选场景
  const filteredScenarios = React.useMemo(() => {
    let scenarios = allScenarios;

    // 按类别筛选
    if (activeCategory !== "all") {
      scenarios =
        scenariosByCategory[
          activeCategory as keyof typeof scenariosByCategory
        ] || [];
    }

    // 按搜索词筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      scenarios = scenarios.filter(
        (scenario) =>
          scenario.name.toLowerCase().includes(term) ||
          scenario.description.toLowerCase().includes(term)
      );
    }

    return scenarios;
  }, [searchTerm, activeCategory]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* 标题区域 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#191A23] mb-2">选择预警场景</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          选择一个符合您需求的预警场景，我们将引导您完成详细配置
        </p>
      </div>

      {/* 搜索框 */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜索预警场景..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-2 border-gray-200"
          />
        </div>
      </div>

      {/* 类别标签页 */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-4 bg-gray-100 max-w-2xl mx-auto">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            全部
          </TabsTrigger>
          <TabsTrigger
            value="grade"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            成绩
          </TabsTrigger>
          <TabsTrigger
            value="homework"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            作业
          </TabsTrigger>
          <TabsTrigger
            value="composite"
            className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            综合
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-6">
          {/* 场景卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                onSelect={() => onSelectScenario(scenario)}
              />
            ))}
          </div>

          {/* 无结果提示 */}
          {filteredScenarios.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-bold text-[#191A23] mb-2">
                未找到匹配的场景
              </h3>
              <p className="text-gray-600 mb-4">尝试调整搜索词或选择其他类别</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setActiveCategory("all");
                }}
                className="border-2 border-gray-200"
              >
                重置筛选
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 底部提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-100 rounded-full">
            <span className="text-sm">💡</span>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-1">使用建议</h4>
            <p className="text-sm text-blue-700">
              如果您是第一次使用，建议从"简单"难度的场景开始。
              系统会根据您的配置自动生成预警规则，无需编写代码。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleScenarios;
