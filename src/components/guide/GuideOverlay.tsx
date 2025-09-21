/**
 * 引导遮罩组件
 * 提供高亮效果和步骤导航
 */

import React, { useEffect, useState } from 'react';
import { useGuide } from './UserGuideProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  SkipForward, 
  Clock,
  BookOpen,
  Target,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function GuideOverlay() {
  const { state, tours, nextStep, previousStep, stopTour, skipTour } = useGuide();
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [targetElement, setTargetElement] = useState<Element | null>(null);

  const currentTour = tours.find(tour => tour.id === state.currentTour);
  const currentStep = currentTour?.steps[state.currentStep];

  useEffect(() => {
    if (!state.isActive || !currentStep) {
      setHighlightRect(null);
      setTargetElement(null);
      return;
    }

    const updateHighlight = () => {
      const target = document.querySelector(currentStep.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        const padding = 8;
        
        setHighlightRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2
        });
        setTargetElement(target);

        // 滚动到目标元素
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    };

    // 初始更新
    updateHighlight();

    // 监听窗口大小变化
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight);
    };
  }, [state.isActive, currentStep]);

  const getTooltipPosition = () => {
    if (!highlightRect || !currentStep) return { top: '50%', left: '50%' };

    const padding = 20;
    const tooltipWidth = 400;
    const tooltipHeight = 200;

    let top = highlightRect.top;
    let left = highlightRect.left;

    switch (currentStep.position) {
      case 'top':
        top = highlightRect.top - tooltipHeight - padding;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = highlightRect.top + highlightRect.height + padding;
        left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
        left = highlightRect.left - tooltipWidth - padding;
        break;
      case 'right':
        top = highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2;
        left = highlightRect.left + highlightRect.width + padding;
        break;
      case 'center':
        top = window.innerHeight / 2 - tooltipHeight / 2;
        left = window.innerWidth / 2 - tooltipWidth / 2;
        break;
    }

    // 确保工具提示在可视区域内
    top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));
    left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

    return { top: `${top}px`, left: `${left}px` };
  };

  const handleActionClick = () => {
    if (currentStep?.action === 'click' && targetElement) {
      (targetElement as HTMLElement).click();
    }
    
    if (currentStep?.nextTrigger === 'auto' || currentStep?.nextTrigger === 'element') {
      setTimeout(nextStep, 500);
    }
  };

  if (!state.isActive || !currentTour || !currentStep) {
    return null;
  }

  const progress = ((state.currentStep + 1) / currentTour.steps.length) * 100;
  const tooltipPosition = getTooltipPosition();

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* 高亮区域 */}
      {highlightRect && (
        <div
          className="absolute bg-transparent border-2 border-[#c0ff3f] rounded-lg shadow-lg pointer-events-auto"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: '0 0 0 99999px rgba(0, 0, 0, 0.6)'
          }}
        />
      )}

      {/* 引导工具提示 */}
      <Card
        className="absolute w-96 pointer-events-auto bg-white border-2 border-[#c0ff3f] shadow-2xl"
        style={tooltipPosition}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#c0ff3f] text-[#c0ff3f]">
                {state.currentStep + 1} / {currentTour.steps.length}
              </Badge>
              <Badge
                variant="secondary" 
                className={cn(
                  "text-xs",
                  currentStep.category === 'basic' && "bg-green-100 text-green-800",
                  currentStep.category === 'intermediate' && "bg-yellow-100 text-yellow-800",
                  currentStep.category === 'advanced' && "bg-red-100 text-red-800"
                )}
              >
                {currentStep.category === 'basic' && '基础'}
                {currentStep.category === 'intermediate' && '进阶'}
                {currentStep.category === 'advanced' && '高级'}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={stopTour}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#c0ff3f]" />
            {currentStep.title}
          </CardTitle>
          
          <Progress value={progress} className="h-2" />
        </CardHeader>

        <CardContent className="space-y-4">
          <CardDescription className="text-gray-700 text-sm leading-relaxed">
            {currentStep.content}
          </CardDescription>

          {/* 操作提示 */}
          {currentStep.action && currentStep.action !== 'wait' && (
            <div className="flex items-center gap-2 p-3 bg-[#c0ff3f]/10 rounded-md border border-[#c0ff3f]/20">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                {currentStep.action === 'click' && (
                  <>
                    <Target className="h-4 w-4" />
                    点击高亮区域继续
                  </>
                )}
                {currentStep.action === 'input' && (
                  <>
                    <BookOpen className="h-4 w-4" />
                    在高亮区域输入内容
                  </>
                )}
                {currentStep.action === 'scroll' && (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    滚动页面查看更多
                  </>
                )}
              </div>
            </div>
          )}

          {/* 导航按钮 */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={previousStep}
                disabled={state.currentStep === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                上一步
              </Button>
              
              {currentStep.skipable !== false && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTour}
                  className="flex items-center gap-1 text-gray-500"
                >
                  <SkipForward className="h-4 w-4" />
                  跳过引导
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep.action && currentStep.action !== 'wait' ? (
                <Button
                  size="sm"
                  onClick={handleActionClick}
                  className="bg-[#c0ff3f] text-black hover:bg-[#a5e034] flex items-center gap-1"
                >
                  {currentStep.action === 'click' && '点击继续'}
                  {currentStep.action === 'input' && '输入后继续'}
                  {currentStep.action === 'scroll' && '滚动后继续'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="bg-[#c0ff3f] text-black hover:bg-[#a5e034] flex items-center gap-1"
                >
                  {state.currentStep === currentTour.steps.length - 1 ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      完成引导
                    </>
                  ) : (
                    <>
                      下一步
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* 引导信息 */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {currentTour.name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                约 {currentTour.estimatedTime} 分钟
              </span>
            </div>
            <span className="text-[#c0ff3f] font-medium">
              {currentTour.difficulty === 'beginner' && '新手'}
              {currentTour.difficulty === 'intermediate' && '进阶'}
              {currentTour.difficulty === 'advanced' && '高级'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}