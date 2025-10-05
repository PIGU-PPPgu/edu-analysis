/**
 * 新手引导系统
 *
 * 功能:
 * - 分步引导用户了解系统功能
 * - 高亮关键元素
 * - 支持跳过和完成
 * - 记录引导完成状态
 * - 支持自定义引导步骤
 */

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 引导步骤定义
 */
export interface TourStep {
  target: string; // 目标元素的CSS选择器
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  action?: {
    label: string;
    onClick: () => void;
  };
  beforeShow?: () => void; // 显示前执行的操作
  afterShow?: () => void; // 显示后执行的操作
}

/**
 * 引导配置
 */
export interface TourConfig {
  id: string; // 引导ID，用于记录完成状态
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  showProgress?: boolean;
}

export interface OnboardingTourProps {
  config: TourConfig;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 新手引导组件
 */
export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  config,
  isOpen,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const step = config.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === config.steps.length - 1;

  /**
   * 计算目标元素位置
   */
  const calculatePosition = useCallback(() => {
    if (!step?.target) return;

    const element = document.querySelector(step.target);
    if (!element) {
      console.warn(`[OnboardingTour] 找不到目标元素: ${step.target}`);
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetPosition(rect);

    // 高亮目标元素
    element.classList.add("onboarding-highlight");

    // 滚动到目标元素
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step]);

  /**
   * 清除高亮
   */
  const clearHighlight = useCallback(() => {
    if (!step?.target) return;

    const element = document.querySelector(step.target);
    if (element) {
      element.classList.remove("onboarding-highlight");
    }
  }, [step]);

  /**
   * 初始化
   */
  useEffect(() => {
    if (isOpen && step) {
      // 执行beforeShow回调
      step.beforeShow?.();

      // 延迟计算位置,确保元素已渲染
      setTimeout(() => {
        calculatePosition();
        setIsVisible(true);

        // 执行afterShow回调
        step.afterShow?.();
      }, 100);
    } else {
      setIsVisible(false);
      clearHighlight();
    }

    return () => {
      clearHighlight();
    };
  }, [isOpen, currentStep, step, calculatePosition, clearHighlight]);

  /**
   * 监听窗口大小变化
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      calculatePosition();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, calculatePosition]);

  /**
   * 下一步
   */
  const handleNext = useCallback(() => {
    clearHighlight();

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, clearHighlight]);

  /**
   * 上一步
   */
  const handlePrevious = useCallback(() => {
    clearHighlight();
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, [clearHighlight]);

  /**
   * 跳过引导
   */
  const handleSkip = useCallback(() => {
    clearHighlight();
    markTourCompleted(config.id, true); // 标记为已跳过
    config.onSkip?.();
    onClose();
  }, [config, onClose, clearHighlight]);

  /**
   * 完成引导
   */
  const handleComplete = useCallback(() => {
    clearHighlight();
    markTourCompleted(config.id, false);
    config.onComplete?.();
    onClose();
  }, [config, onClose, clearHighlight]);

  /**
   * 计算提示框位置
   */
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetPosition) return {};

    const placement = step?.placement || "bottom";
    const tooltipWidth = 320;
    const tooltipHeight = 200; // 估算高度
    const margin = 16;

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = targetPosition.top - tooltipHeight - margin;
        left = targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2;
        break;
      case "bottom":
        top = targetPosition.bottom + margin;
        left = targetPosition.left + targetPosition.width / 2 - tooltipWidth / 2;
        break;
      case "left":
        top = targetPosition.top + targetPosition.height / 2 - tooltipHeight / 2;
        left = targetPosition.left - tooltipWidth - margin;
        break;
      case "right":
        top = targetPosition.top + targetPosition.height / 2 - tooltipHeight / 2;
        left = targetPosition.right + margin;
        break;
    }

    // 确保不超出视口
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 10001,
    };
  };

  /**
   * 高亮遮罩样式
   */
  const getHighlightStyle = (): React.CSSProperties | undefined => {
    if (!targetPosition) return undefined;

    return {
      position: "fixed",
      top: `${targetPosition.top}px`,
      left: `${targetPosition.left}px`,
      width: `${targetPosition.width}px`,
      height: `${targetPosition.height}px`,
      zIndex: 10000,
      pointerEvents: "none",
    };
  };

  if (!isOpen || !isVisible) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={handleSkip}
      />

      {/* 高亮区域 */}
      {targetPosition && (
        <div
          style={getHighlightStyle()}
          className="border-2 border-blue-500 rounded shadow-lg shadow-blue-500/50 animate-pulse"
        />
      )}

      {/* 引导提示框 */}
      <Card style={getTooltipStyle()} className="shadow-2xl">
        <CardContent className="p-6">
          {/* 关闭按钮 */}
          <button
            onClick={handleSkip}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 进度指示 */}
          {config.showProgress !== false && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  第 {currentStep + 1} 步，共 {config.steps.length} 步
                </span>
              </div>
              <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${((currentStep + 1) / config.steps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* 标题和内容 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {step.content}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-between">
            <div>
              {!isFirstStep && (
                <Button
                  onClick={handlePrevious}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  上一步
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {step.action && (
                <Button
                  onClick={() => {
                    step.action!.onClick();
                    handleNext();
                  }}
                  variant="outline"
                  size="sm"
                >
                  {step.action.label}
                </Button>
              )}

              <Button onClick={handleNext} size="sm">
                {isLastStep ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    完成
                  </>
                ) : (
                  <>
                    下一步
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

/**
 * 引导状态管理
 */
const TOUR_STORAGE_KEY = "onboarding_tours_completed";

/**
 * 标记引导已完成
 */
function markTourCompleted(tourId: string, skipped: boolean = false): void {
  const completed = getTourCompletedStatus();
  completed[tourId] = {
    completed: true,
    skipped,
    timestamp: Date.now(),
  };
  localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
}

/**
 * 检查引导是否已完成
 */
export function isTourCompleted(tourId: string): boolean {
  const completed = getTourCompletedStatus();
  return completed[tourId]?.completed === true;
}

/**
 * 获取所有引导完成状态
 */
function getTourCompletedStatus(): Record<string, { completed: boolean; skipped: boolean; timestamp: number }> {
  try {
    const data = localStorage.getItem(TOUR_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * 重置引导状态
 */
export function resetTour(tourId?: string): void {
  if (tourId) {
    const completed = getTourCompletedStatus();
    delete completed[tourId];
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(completed));
  } else {
    localStorage.removeItem(TOUR_STORAGE_KEY);
  }
}

/**
 * Hook - 管理引导状态
 */
export function useOnboardingTour(config: TourConfig) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (config.autoStart && !isTourCompleted(config.id)) {
      // 延迟启动，确保页面已加载
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [config.id, config.autoStart]);

  const start = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    start,
    close,
  };
}
