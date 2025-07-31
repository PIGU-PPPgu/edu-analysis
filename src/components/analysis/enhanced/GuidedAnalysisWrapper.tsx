/**
 * 引导式分析包装器
 * 为复杂分析提供渐进式展示和新手引导
 */

import React, { useState, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  User,
  UserCog,
  Brain,
  Info,
  Lightbulb,
  GraduationCap,
  Eye,
  EyeOff,
  BookOpen,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ComplexityLevel {
  id: "basic" | "advanced" | "expert";
  label: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const COMPLEXITY_LEVELS: ComplexityLevel[] = [
  {
    id: "basic",
    label: "基础",
    icon: User,
    description: "显示核心指标和简单解释",
    color: "#B9FF66",
  },
  {
    id: "advanced",
    label: "进阶",
    icon: UserCog,
    description: "增加统计分析和趋势预测",
    color: "#F59E0B",
  },
  {
    id: "expert",
    label: "专家",
    icon: Brain,
    description: "完整的数据科学分析",
    color: "#8B5CF6",
  },
];

interface GuideStep {
  title: string;
  content: string;
  target?: string;
  illustration?: React.ElementType;
}

interface GuidedAnalysisWrapperProps {
  children: ReactNode;
  title: string;
  description?: string;
  guideSteps?: GuideStep[];
  examples?: {
    title: string;
    description: string;
    visual?: ReactNode;
  }[];
  complexityConfig?: {
    basic: ReactNode;
    advanced: ReactNode;
    expert: ReactNode;
  };
  defaultComplexity?: "basic" | "advanced" | "expert";
  showCaseStudy?: boolean;
  caseStudy?: {
    title: string;
    scenario: string;
    insight: string;
    action: string;
  };
  className?: string;
}

const GuidedAnalysisWrapper: React.FC<GuidedAnalysisWrapperProps> = ({
  children,
  title,
  description,
  guideSteps = [],
  examples = [],
  complexityConfig,
  defaultComplexity = "advanced",
  showCaseStudy = true,
  caseStudy,
  className,
}) => {
  const [complexity, setComplexity] = useState<"basic" | "advanced" | "expert">(
    defaultComplexity
  );
  const [showGuide, setShowGuide] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);
  const [showExamples, setShowExamples] = useState(false);
  const [showCase, setShowCase] = useState(false);

  const currentLevel = COMPLEXITY_LEVELS.find((l) => l.id === complexity)!;

  // 根据复杂度返回对应的内容
  const renderContent = () => {
    if (complexityConfig) {
      return complexityConfig[complexity];
    }
    return children;
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-2 border-black",
        `shadow-[6px_6px_0px_0px_${currentLevel.color}]`,
        className
      )}
    >
      {/* 标题栏 */}
      <CardHeader className="pb-3">
        <div className="space-y-4">
          {/* 标题和帮助按钮 */}
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl font-black text-[#191A23] flex items-center gap-3">
                {title}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full border-2 border-black bg-[#B9FF66] hover:bg-[#B9FF66] hover:scale-110 transition-transform"
                        onClick={() => setShowGuide(true)}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>查看使用指南</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              {description && (
                <p className="text-sm text-[#6B7280] font-medium">
                  {description}
                </p>
              )}
            </div>

            {/* 功能按钮组 */}
            <div className="flex items-center gap-2">
              {examples.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExamples(!showExamples)}
                        className="border-2 border-black font-bold hover:bg-[#F3F3F3] transition-all"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        示例
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>查看分析示例</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {showCaseStudy && caseStudy && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCase(true)}
                        className="border-2 border-black font-bold hover:bg-[#F3F3F3] transition-all"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        案例
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>查看实际案例</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* 复杂度切换器 */}
          {complexityConfig && (
            <div className="flex items-center gap-2 p-1 bg-[#F8F8F8] rounded-lg border-2 border-black">
              {COMPLEXITY_LEVELS.map((level) => (
                <TooltipProvider key={level.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={complexity === level.id ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setComplexity(level.id)}
                        className={cn(
                          "flex-1 font-bold transition-all",
                          complexity === level.id
                            ? `bg-[${level.color}] text-black border-2 border-black hover:bg-[${level.color}]`
                            : "hover:bg-white"
                        )}
                      >
                        <level.icon className="h-4 w-4 mr-2" />
                        {level.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{level.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      {/* 示例面板 */}
      {showExamples && examples.length > 0 && (
        <div className="mx-6 mb-4 p-4 bg-[#FFF9E6] border-2 border-black rounded-lg">
          <div className="space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              理解示例
            </h4>
            {examples.map((example, index) => (
              <div key={index} className="space-y-2">
                <p className="font-semibold text-sm">{example.title}</p>
                <p className="text-sm text-[#6B7280]">{example.description}</p>
                {example.visual && <div className="mt-2">{example.visual}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <CardContent className="pt-0">{renderContent()}</CardContent>

      {/* 引导对话框 */}
      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="max-w-2xl border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              {title} - 使用指南
            </DialogTitle>
            <DialogDescription>
              了解如何使用和理解这个分析功能
            </DialogDescription>
          </DialogHeader>

          {guideSteps.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-bold text-lg">
                  步骤 {currentGuideStep + 1} / {guideSteps.length}
                </h3>
                <h4 className="font-semibold">
                  {guideSteps[currentGuideStep].title}
                </h4>
                <p className="text-[#6B7280]">
                  {guideSteps[currentGuideStep].content}
                </p>
                {guideSteps[currentGuideStep].illustration && (
                  <div className="flex justify-center p-8 bg-[#F8F8F8] rounded-lg border-2 border-black">
                    {React.createElement(
                      guideSteps[currentGuideStep].illustration!,
                      { className: "h-24 w-24 text-[#6B7280]" }
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentGuideStep(Math.max(0, currentGuideStep - 1))
                  }
                  disabled={currentGuideStep === 0}
                  className="border-2 border-black font-bold"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  上一步
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentGuideStep(
                      Math.min(guideSteps.length - 1, currentGuideStep + 1)
                    )
                  }
                  disabled={currentGuideStep === guideSteps.length - 1}
                  className="border-2 border-black font-bold"
                >
                  下一步
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 案例研究对话框 */}
      {caseStudy && (
        <Dialog open={showCase} onOpenChange={setShowCase}>
          <DialogContent className="max-w-2xl border-2 border-black shadow-[6px_6px_0px_0px_#F59E0B]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <BookOpen className="h-6 w-6" />
                {caseStudy.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-[#F8F8F8] rounded-lg border-2 border-black">
                <h4 className="font-bold mb-2">场景描述</h4>
                <p className="text-[#6B7280]">{caseStudy.scenario}</p>
              </div>

              <div className="p-4 bg-[#FFF9E6] rounded-lg border-2 border-black">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  发现的洞察
                </h4>
                <p className="text-[#6B7280]">{caseStudy.insight}</p>
              </div>

              <div className="p-4 bg-[#E6FFF0] rounded-lg border-2 border-black">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  采取的行动
                </h4>
                <p className="text-[#6B7280]">{caseStudy.action}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default GuidedAnalysisWrapper;
