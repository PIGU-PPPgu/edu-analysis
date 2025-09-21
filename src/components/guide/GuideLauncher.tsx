/**
 * 引导启动器组件
 * 提供引导入口和管理界面
 */

import React, { useState } from 'react';
import { useGuide } from './UserGuideProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  HelpCircle, 
  Play, 
  Clock, 
  CheckCircle, 
  Lock, 
  Settings,
  BookOpen,
  Target,
  Users,
  Workflow,
  Star,
  Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideLauncherProps {
  className?: string;
  variant?: 'button' | 'card' | 'floating';
  showForNewUsers?: boolean;
}

export function GuideLauncher({ 
  className, 
  variant = 'button',
  showForNewUsers = true 
}: GuideLauncherProps) {
  const { state, tours, startTour, updatePreferences, isTourCompleted, canStartTour } = useGuide();
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 检查是否为新用户（完成的引导少于2个）
  const isNewUser = state.completedTours.length < 2;
  
  // 推荐的引导（基于用户进度）
  const getRecommendedTours = () => {
    if (state.completedTours.length === 0) {
      return tours.filter(tour => tour.id === 'warning-system-intro');
    }
    
    return tours.filter(tour => 
      !isTourCompleted(tour.id) && 
      canStartTour(tour.id)
    ).slice(0, 3);
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Star className="h-4 w-4 text-green-500" />;
      case 'intermediate':
        return <Target className="h-4 w-4 text-yellow-500" />;
      case 'advanced':
        return <Workflow className="h-4 w-4 text-red-500" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return <Settings className="h-4 w-4" />;
      case 'feature':
        return <Target className="h-4 w-4" />;
      case 'workflow':
        return <Workflow className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const handleStartTour = (tourId: string) => {
    setShowGuideDialog(false);
    startTour(tourId);
  };

  // 浮动按钮样式
  if (variant === 'floating') {
    return (
      <div className={cn("fixed bottom-6 right-6 z-40", className)}>
        <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
          <DialogTrigger asChild>
            <Button 
              size="lg"
              className="rounded-full h-14 w-14 bg-[#c0ff3f] text-black hover:bg-[#a5e034] shadow-lg border-2 border-black"
            >
              <HelpCircle className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <GuideDialogContent />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 卡片样式（用于新用户欢迎）
  if (variant === 'card' && showForNewUsers && isNewUser) {
    const recommendedTours = getRecommendedTours();
    
    return (
      <Card className={cn("border-2 border-[#c0ff3f] bg-gradient-to-br from-[#c0ff3f]/10 to-[#c0ff3f]/5", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[#c0ff3f]" />
            欢迎使用预警系统
          </CardTitle>
          <CardDescription>
            看起来您是第一次使用我们的预警系统。让我们通过快速引导帮助您了解系统功能。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendedTours.map(tour => (
            <div key={tour.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-3">
                {getCategoryIcon(tour.category)}
                <div>
                  <div className="font-medium">{tour.name}</div>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {tour.estimatedTime} 分钟
                  </div>
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => handleStartTour(tour.id)}
                className="bg-[#c0ff3f] text-black hover:bg-[#a5e034]"
              >
                <Play className="h-4 w-4 mr-1" />
                开始
              </Button>
            </div>
          ))}
          
          <div className="flex items-center justify-between pt-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowGuideDialog(true)}
            >
              查看所有引导
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => updatePreferences({ autoStart: false })}
              className="text-gray-500"
            >
              稍后再说
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 按钮样式
  return (
    <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn("border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black", className)}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          使用引导
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <GuideDialogContent />
      </DialogContent>
    </Dialog>
  );

  function GuideDialogContent() {
    const recommendedTours = getRecommendedTours();
    const completedToursData = tours.filter(tour => isTourCompleted(tour.id));
    const allTours = tours;

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#c0ff3f]" />
            学习引导中心
          </DialogTitle>
          <DialogDescription>
            通过互动引导快速掌握预警系统的使用方法
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6">
          <div className="flex-1">
            <ScrollArea className="h-[500px] pr-4">
              {/* 推荐引导 */}
              {recommendedTours.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    推荐引导
                  </h3>
                  <div className="space-y-3">
                    {recommendedTours.map(tour => (
                      <TourCard key={tour.id} tour={tour} onStart={handleStartTour} />
                    ))}
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              {/* 所有引导 */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  所有引导
                </h3>
                <div className="space-y-3">
                  {allTours.map(tour => (
                    <TourCard key={tour.id} tour={tour} onStart={handleStartTour} />
                  ))}
                </div>
              </div>

              {/* 已完成引导 */}
              {completedToursData.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    已完成 ({completedToursData.length})
                  </h3>
                  <div className="space-y-2">
                    {completedToursData.map(tour => (
                      <div key={tour.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <div className="font-medium text-green-800">{tour.name}</div>
                          <div className="text-sm text-green-600">{tour.description}</div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStartTour(tour.id)}
                          className="border-green-200 text-green-700 hover:bg-green-100"
                        >
                          重新学习
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 设置面板 */}
          <div className="w-64 border-l pl-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              引导设置
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-start" className="text-sm">
                  自动启动引导
                </Label>
                <Switch
                  id="auto-start"
                  checked={state.userPreferences.autoStart}
                  onCheckedChange={(checked) => 
                    updatePreferences({ autoStart: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="show-hints" className="text-sm">
                  显示提示
                </Label>
                <Switch
                  id="show-hints"
                  checked={state.userPreferences.showHints}
                  onCheckedChange={(checked) => 
                    updatePreferences({ showHints: checked })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-tooltips" className="text-sm">
                  启用工具提示
                </Label>
                <Switch
                  id="enable-tooltips"
                  checked={state.userPreferences.enableTooltips}
                  onCheckedChange={(checked) => 
                    updatePreferences({ enableTooltips: checked })
                  }
                />
              </div>
            </div>

            <Separator className="my-4" />

            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <span>完成引导:</span>
                <span className="font-medium">{state.completedTours.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>总引导数:</span>
                <span className="font-medium">{tours.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>完成率:</span>
                <span className="font-medium">
                  {Math.round((state.completedTours.length / tours.length) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  function TourCard({ 
    tour, 
    onStart 
  }: { 
    tour: any; 
    onStart: (tourId: string) => void; 
  }) {
    const isCompleted = isTourCompleted(tour.id);
    const canStart = canStartTour(tour.id);

    return (
      <Card className={cn(
        "transition-all duration-200",
        isCompleted && "bg-green-50 border-green-200",
        !canStart && "opacity-60"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getCategoryIcon(tour.category)}
                <h4 className="font-medium">{tour.name}</h4>
                {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                {!canStart && <Lock className="h-4 w-4 text-gray-400" />}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{tour.description}</p>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  {getDifficultyIcon(tour.difficulty)}
                  {tour.difficulty === 'beginner' && '新手'}
                  {tour.difficulty === 'intermediate' && '进阶'}
                  {tour.difficulty === 'advanced' && '高级'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {tour.estimatedTime} 分钟
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {tour.steps.length} 步骤
                </span>
              </div>

              {tour.prerequisites && tour.prerequisites.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500">
                    前置要求: {tour.prerequisites.map((prereq: string) => {
                      const prereqTour = tours.find(t => t.id === prereq);
                      return prereqTour?.name || prereq;
                    }).join(', ')}
                  </span>
                </div>
              )}
            </div>
            
            <div className="ml-4">
              <Button
                size="sm"
                onClick={() => onStart(tour.id)}
                disabled={!canStart}
                className={cn(
                  "bg-[#c0ff3f] text-black hover:bg-[#a5e034]",
                  isCompleted && "bg-green-100 text-green-800 hover:bg-green-200",
                  !canStart && "bg-gray-100 text-gray-400 hover:bg-gray-100"
                )}
              >
                <Play className="h-4 w-4 mr-1" />
                {isCompleted ? '重新学习' : '开始引导'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}