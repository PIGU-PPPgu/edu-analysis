import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  X,
  BookOpen,
  Play,
  CheckCircle,
  ArrowRight,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  tips?: string[];
  image?: string;
  video?: string;
}

interface UserGuideProps {
  steps: GuideStep[];
  title?: string;
  description?: string;
  onComplete?: () => void;
  onDismiss?: () => void;
  autoPlay?: boolean;
  showProgress?: boolean;
  variant?: "tour" | "tips" | "onboarding";
  className?: string;
}

const UserGuide: React.FC<UserGuideProps> = ({
  steps,
  title = "操作指南",
  description,
  onComplete,
  onDismiss,
  autoPlay = false,
  showProgress = true,
  variant = "tips",
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // 自动播放功能
  useEffect(() => {
    if (autoPlay && !isLastStep) {
      const timer = setTimeout(() => {
        nextStep();
      }, 5000); // 5秒自动下一步

      return () => clearTimeout(timer);
    }
  }, [currentStep, autoPlay, isLastStep]);

  const nextStep = () => {
    if (!isLastStep) {
      setCurrentStep((current) => current + 1);
      markStepCompleted(currentStepData.id);
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep((current) => current - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const markStepCompleted = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  };

  const handleComplete = () => {
    markStepCompleted(currentStepData.id);
    onComplete?.();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    onDismiss?.();
    setIsVisible(false);
  };

  const handleAction = () => {
    if (currentStepData.action?.onClick) {
      currentStepData.action.onClick();
    } else if (currentStepData.action?.href) {
      window.open(currentStepData.action.href, "_blank");
    }
    markStepCompleted(currentStepData.id);
  };

  if (!isVisible || !currentStepData) {
    return null;
  }

  // 根据变体返回不同的样式
  const getVariantStyles = () => {
    switch (variant) {
      case "tour":
        return {
          container:
            "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200",
          header: "text-purple-700",
          content: "text-purple-600",
        };
      case "onboarding":
        return {
          container:
            "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200",
          header: "text-blue-700",
          content: "text-blue-600",
        };
      default: // tips
        return {
          container:
            "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200",
          header: "text-amber-700",
          content: "text-amber-600",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={cn(styles.container, "shadow-lg", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {variant === "tour" && (
              <Sparkles className="h-5 w-5 text-purple-600" />
            )}
            {variant === "onboarding" && (
              <BookOpen className="h-5 w-5 text-blue-600" />
            )}
            {variant === "tips" && (
              <Lightbulb className="h-5 w-5 text-amber-600" />
            )}
            <CardTitle className={cn("text-lg font-semibold", styles.header)}>
              {title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {showProgress && (
              <Badge variant="outline" className="text-xs">
                {currentStep + 1} / {steps.length}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {description && (
          <p className={cn("text-sm", styles.content)}>{description}</p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* 步骤指示器 */}
          {showProgress && steps.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    index === currentStep
                      ? "bg-blue-500 w-6"
                      : completedSteps.has(step.id)
                        ? "bg-green-500"
                        : "bg-gray-300 hover:bg-gray-400"
                  )}
                />
              ))}
            </div>
          )}

          {/* 当前步骤内容 */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">
                  {currentStep + 1}
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-medium text-gray-900">
                  {currentStepData.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {currentStepData.description}
                </p>
              </div>
            </div>

            {/* 提示列表 */}
            {currentStepData.tips && currentStepData.tips.length > 0 && (
              <div className="pl-11 space-y-1">
                {currentStepData.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs text-gray-500"
                  >
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 媒体内容 */}
            {currentStepData.image && (
              <div className="pl-11">
                <img
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  className="rounded-lg border border-gray-200 max-w-full h-auto"
                />
              </div>
            )}

            {currentStepData.video && (
              <div className="pl-11">
                <video
                  src={currentStepData.video}
                  controls
                  className="rounded-lg border border-gray-200 max-w-full h-auto"
                />
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-3 w-3" />
                  上一步
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {currentStepData.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAction}
                  className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Play className="h-3 w-3" />
                  {currentStepData.action.label}
                </Button>
              )}

              {isLastStep ? (
                <Button
                  size="sm"
                  onClick={handleComplete}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                >
                  完成
                  <CheckCircle className="h-3 w-3" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="flex items-center gap-1"
                >
                  下一步
                  <ChevronRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {/* 自动播放指示器 */}
          {autoPlay && !isLastStep && (
            <div className="text-center pt-2">
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <Play className="h-3 w-3" />
                5秒后自动下一步
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserGuide;
