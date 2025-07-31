/**
 * 🧠 Master-AI-Data: 智能推荐面板组件
 * 基于用户行为显示个性化推荐
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lightbulb,
  TrendingUp,
  Users,
  BarChart3,
  Navigation,
  Filter,
  Clock,
  BookOpen,
  Settings,
  ChevronRight,
  RefreshCw,
  X,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/unified/modules/AuthModule";
import {
  recommendationEngine,
  RecommendationItem,
  RecommendationType,
} from "@/services/ai/recommendationEngine";
import { cn } from "@/lib/utils";

interface RecommendationPanelProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
  variant?: "compact" | "full";
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  className,
  maxItems = 6,
  showHeader = true,
  variant = "full",
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
  }, [user?.id]);

  const loadRecommendations = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const recs = await recommendationEngine.generateRecommendations(user.id);
      const filtered = recs
        .filter((rec) => !dismissedIds.has(rec.id))
        .slice(0, maxItems);

      setRecommendations(filtered);
    } catch (err) {
      console.error("Failed to load recommendations:", err);
      setError("加载推荐失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecommendationClick = (recommendation: RecommendationItem) => {
    if (recommendation.actionUrl) {
      navigate(recommendation.actionUrl);
    }

    // 记录推荐点击事件
    console.log("Recommendation clicked:", {
      id: recommendation.id,
      type: recommendation.type,
      title: recommendation.title,
    });
  };

  const handleDismiss = (recommendationId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    setDismissedIds((prev) => new Set([...prev, recommendationId]));
    setRecommendations((prev) =>
      prev.filter((rec) => rec.id !== recommendationId)
    );
  };

  const getTypeIcon = (type: RecommendationType) => {
    const iconProps = { className: "w-4 h-4" };

    switch (type) {
      case RecommendationType.STUDENT_FOCUS:
        return <Users {...iconProps} />;
      case RecommendationType.ANALYSIS_METHOD:
        return <BarChart3 {...iconProps} />;
      case RecommendationType.PAGE_NAVIGATION:
        return <Navigation {...iconProps} />;
      case RecommendationType.FILTER_SUGGESTION:
        return <Filter {...iconProps} />;
      case RecommendationType.TIME_RANGE:
        return <Clock {...iconProps} />;
      case RecommendationType.SUBJECT_FOCUS:
        return <BookOpen {...iconProps} />;
      case RecommendationType.CLASS_ATTENTION:
        return <Users {...iconProps} />;
      case RecommendationType.WORKFLOW_OPTIMIZATION:
        return <Settings {...iconProps} />;
      default:
        return <Lightbulb {...iconProps} />;
    }
  };

  const getTypeColor = (type: RecommendationType): string => {
    switch (type) {
      case RecommendationType.STUDENT_FOCUS:
        return "bg-[#FF6B6B] text-white";
      case RecommendationType.ANALYSIS_METHOD:
        return "bg-[#4ECDC4] text-white";
      case RecommendationType.PAGE_NAVIGATION:
        return "bg-[#45B7D1] text-white";
      case RecommendationType.FILTER_SUGGESTION:
        return "bg-[#96CEB4] text-white";
      case RecommendationType.TIME_RANGE:
        return "bg-[#FECA57] text-black";
      case RecommendationType.SUBJECT_FOCUS:
        return "bg-[#6C5CE7] text-white";
      case RecommendationType.CLASS_ATTENTION:
        return "bg-[#FD79A8] text-white";
      case RecommendationType.WORKFLOW_OPTIMIZATION:
        return "bg-[#A0E7E5] text-black";
      default:
        return "bg-[#B9FF66] text-black";
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8)
      return { text: "高优先级", className: "bg-[#FF6B6B] text-white" };
    if (priority >= 6)
      return { text: "中优先级", className: "bg-[#FECA57] text-black" };
    return { text: "低优先级", className: "bg-[#6B7280] text-white" };
  };

  if (isLoading) {
    return (
      <Card
        className={cn(
          "border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]",
          className
        )}
      >
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-[#B9FF66] border-t-transparent rounded-full" />
          <span className="ml-3 font-bold text-[#191A23]">生成推荐中...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn(
          "border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B]",
          className
        )}
      >
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-[#FF6B6B] font-medium mb-4">{error}</p>
            <Button
              onClick={loadRecommendations}
              className="bg-[#FF6B6B] text-white border-2 border-black font-bold hover:bg-[#FF5252]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card
        className={cn(
          "border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]",
          className
        )}
      >
        <CardContent className="p-6 text-center">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-[#6B7280]" />
          <p className="text-[#6B7280] font-medium">暂无个性化推荐</p>
          <p className="text-sm text-[#6B7280] mt-2">
            继续使用系统，我们将为您生成更好的建议
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]",
        className
      )}
    >
      {showHeader && (
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="flex items-center justify-between text-[#191A23] font-black">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              智能推荐
              <Badge className="bg-[#191A23] text-[#B9FF66] border-2 border-black font-bold">
                {recommendations.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadRecommendations}
              className="text-[#191A23] hover:bg-[#A3E635] p-2"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="p-0">
        <ScrollArea
          className={variant === "compact" ? "max-h-96" : "max-h-[600px]"}
        >
          <div className="space-y-0">
            {recommendations.map((recommendation, index) => {
              const priorityBadge = getPriorityBadge(recommendation.priority);

              return (
                <div
                  key={recommendation.id}
                  className={cn(
                    "group relative p-4 cursor-pointer transition-all duration-200",
                    "hover:bg-[#F8F8F8] border-b border-gray-200 last:border-b-0",
                    "hover:shadow-[inset_4px_0px_0px_0px_#B9FF66]"
                  )}
                  onClick={() => handleRecommendationClick(recommendation)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={cn(
                            "p-2 rounded-lg border-2 border-black",
                            getTypeColor(recommendation.type)
                          )}
                        >
                          {getTypeIcon(recommendation.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#191A23] group-hover:text-[#2D5016] truncate">
                            {recommendation.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className={cn(
                                "text-xs font-bold border-2 border-black",
                                priorityBadge.className
                              )}
                            >
                              {priorityBadge.text}
                            </Badge>
                            <div className="flex items-center text-xs text-[#6B7280]">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              {Math.round(recommendation.confidence * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-[#6B7280] mb-2 leading-relaxed">
                        {recommendation.description}
                      </p>

                      <p className="text-xs text-[#9CA3AF] italic">
                        💡 {recommendation.reasoning}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDismiss(recommendation.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-[#6B7280] hover:text-[#FF6B6B] hover:bg-[#FEE2E2]"
                      >
                        <X className="w-4 h-4" />
                      </Button>

                      <ChevronRight className="w-5 h-5 text-[#6B7280] group-hover:text-[#B9FF66] transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RecommendationPanel;
