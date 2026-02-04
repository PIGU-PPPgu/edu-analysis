/**
 * AI智能洞察面板
 * 提供基于数据的智能分析和建议
 */

import React, { useState, useEffect, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  BookOpen,
  RefreshCw,
  ChevronRight,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { GradeData } from "@/types/grade";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePerformanceOptimizer,
  ComputeTask,
} from "@/services/performance/advancedAnalysisOptimizer";
import { AdvancedAnalysisEngine } from "@/services/ai/advancedAnalysisEngine";
import { cn } from "@/lib/utils";
import { InsightType, InsightPriority } from "@/types/aiInsights";
import type { AIInsight as EngineInsight } from "@/types/aiInsights";

interface AIInsightsPanelProps {
  data: GradeData[];
  context?: {
    examId?: string;
    className?: string;
    subject?: string;
  };
  autoAnalyze?: boolean;
  onInsightClick?: (insight: AIInsight) => void;
}

interface AIInsight {
  id: string;
  type: "trend" | "anomaly" | "recommendation" | "prediction";
  title: string;
  description: string;
  summary?: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  priority?: "high" | "medium" | "low";
  data?: any;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

// 洞察卡片组件
const InsightCard = memo<{
  insight: AIInsight;
  onClick?: (insight: AIInsight) => void;
}>(({ insight, onClick }) => {
  const typeIcons = {
    trend: TrendingUp,
    anomaly: AlertTriangle,
    recommendation: Lightbulb,
    prediction: Target,
  };

  const impactColors = {
    high: "text-red-600 bg-red-50",
    medium: "text-yellow-600 bg-yellow-50",
    low: "text-blue-600 bg-blue-50",
  };

  const Icon = typeIcons[insight.type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="cursor-pointer"
      onClick={() => onClick?.(insight)}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${impactColors[insight.impact]}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{insight.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {insight.description}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  置信度: {(insight.confidence * 100).toFixed(0)}%
                </Badge>
                <Badge
                  variant={
                    insight.impact === "high" ? "destructive" : "secondary"
                  }
                  className="text-xs"
                >
                  {insight.impact === "high"
                    ? "高"
                    : insight.impact === "medium"
                      ? "中"
                      : "低"}
                  影响
                </Badge>
              </div>
              {insight.actions && insight.actions.length > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 p-0 h-auto text-blue-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    insight.actions![0].action();
                  }}
                >
                  {insight.actions[0].label}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = memo(
  ({ data, context, autoAnalyze = false, onInsightClick }) => {
    const optimizer = usePerformanceOptimizer();
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState("all");

    // 生成洞察
    const generateInsights = async () => {
      setIsAnalyzing(true);

      try {
        // 使用性能优化器进行计算
        const statisticsTask: ComputeTask = {
          id: "statistics-" + Date.now(),
          type: "statistics",
          data: data.map((d) => d.total_score || 0),
          priority: 0.8,
        };

        const stats = await optimizer.compute(statisticsTask);

        // 生成洞察（这里是模拟的，实际应该调用AI服务）
        const newInsights: AIInsight[] = [];

        // 趋势洞察
        if (stats.mean && stats.stdDev) {
          const trend = analyzeTrend(data);
          if (trend) {
            newInsights.push({
              id: "trend-1",
              type: "trend",
              title: trend.improving ? "成绩呈上升趋势" : "成绩呈下降趋势",
              description: `近期考试平均分${trend.improving ? "提升" : "下降"}了${Math.abs(trend.change).toFixed(1)}分，${trend.improving ? "学习效果良好" : "需要加强辅导"}。`,
              confidence: 0.85,
              impact: Math.abs(trend.change) > 5 ? "high" : "medium",
              data: trend,
            });
          }
        }

        // 异常检测
        const anomalies = detectAnomalies(data, stats);
        anomalies.forEach((anomaly, index) => {
          newInsights.push({
            id: `anomaly-${index}`,
            type: "anomaly",
            title: anomaly.title,
            description: anomaly.description,
            confidence: anomaly.confidence,
            impact: anomaly.impact,
            data: anomaly.data,
          });
        });

        // 个性化建议
        const recommendations = generateRecommendations(data, stats);
        recommendations.forEach((rec, index) => {
          newInsights.push({
            id: `rec-${index}`,
            type: "recommendation",
            title: rec.title,
            description: rec.description,
            confidence: rec.confidence,
            impact: rec.impact,
            actions: rec.actions,
          });
        });

        // 预测分析
        const predictions = generatePredictions(data, stats);
        predictions.forEach((pred, index) => {
          newInsights.push({
            id: `pred-${index}`,
            type: "prediction",
            title: pred.title,
            description: pred.description,
            confidence: pred.confidence,
            impact: pred.impact,
            data: pred.data,
          });
        });

        setInsights(newInsights);
      } catch (error) {
        console.error("Failed to generate insights:", error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // 分析趋势
    const analyzeTrend = (
      data: GradeData[]
    ): { improving: boolean; change: number } | null => {
      const sorted = [...data].sort(
        (a, b) =>
          new Date(a.exam_date || 0).getTime() -
          new Date(b.exam_date || 0).getTime()
      );

      if (sorted.length < 2) return null;

      const recentScores = sorted.slice(-5).map((d) => d.total_score || 0);
      const previousScores = sorted
        .slice(-10, -5)
        .map((d) => d.total_score || 0);

      const recentAvg =
        recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const previousAvg =
        previousScores.length > 0
          ? previousScores.reduce((a, b) => a + b, 0) / previousScores.length
          : recentAvg;

      const change = recentAvg - previousAvg;
      return {
        improving: change > 0,
        change,
      };
    };

    // 检测异常
    const detectAnomalies = (data: GradeData[], stats: any): AIInsight[] => {
      const anomalies: AIInsight[] = [];

      // 检测低分异常
      const lowScoreStudents = data.filter(
        (d) => d.total_score && d.total_score < stats.mean - 2 * stats.stdDev
      );

      if (lowScoreStudents.length > 0) {
        anomalies.push({
          id: "anomaly-low-scores",
          type: "anomaly",
          title: `发现${lowScoreStudents.length}名学生成绩异常偏低`,
          description:
            "这些学生的成绩显著低于平均水平，可能需要特别关注和辅导。",
          confidence: 0.9,
          impact: "high",
          data: lowScoreStudents,
        });
      }

      // 检测进步异常
      const rapidImprovers = data.filter((d) => {
        // 这里应该比较历史数据
        return false; // 简化示例
      });

      return anomalies;
    };

    // 生成建议
    const generateRecommendations = (
      data: GradeData[],
      stats: any
    ): AIInsight[] => {
      const recommendations: AIInsight[] = [];

      // 基于及格率的建议
      const passRate =
        data.filter((d) => (d.total_score || 0) >= 60).length / data.length;
      if (passRate < 0.6) {
        recommendations.push({
          id: "rec-pass-rate",
          type: "recommendation",
          title: "建议加强基础知识教学",
          description:
            "当前及格率较低，建议增加基础知识复习时间，采用分层教学方法。",
          confidence: 0.8,
          impact: "high",
          actions: [
            {
              label: "查看薄弱知识点",
              action: () => console.log("Navigate to weak points"),
            },
          ],
        });
      }

      // 基于成绩分布的建议
      if (stats.stdDev > 15) {
        recommendations.push({
          id: "rec-variance",
          type: "recommendation",
          title: "建议实施差异化教学",
          description: "学生成绩差异较大，建议根据不同水平制定个性化学习计划。",
          confidence: 0.75,
          impact: "medium",
          actions: [
            {
              label: "生成分组方案",
              action: () => console.log("Generate grouping plan"),
            },
          ],
        });
      }

      return recommendations;
    };

    // 生成预测
    const generatePredictions = (
      data: GradeData[],
      stats: any
    ): AIInsight[] => {
      const predictions: AIInsight[] = [];

      // 预测下次考试表现
      predictions.push({
        id: "pred-next-exam",
        type: "prediction",
        title: "下次考试预测",
        description: `基于当前趋势，预计下次考试平均分将在${(stats.mean - 3).toFixed(0)}-${(stats.mean + 3).toFixed(0)}分之间。`,
        confidence: 0.7,
        impact: "medium",
        data: {
          predictedMean: stats.mean,
          predictedRange: [stats.mean - 3, stats.mean + 3],
        },
      });

      return predictions;
    };

    // 自动分析
    useEffect(() => {
      if (autoAnalyze && data.length > 0) {
        generateInsights();
      }
    }, [data, autoAnalyze]);

    // 按类型过滤洞察
    const filteredInsights = useMemo(() => {
      if (activeTab === "all") return insights;
      return insights.filter((insight) => insight.type === activeTab);
    }, [insights, activeTab]);

    if (data.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500">暂无数据进行AI分析</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI智能洞察
              {isAnalyzing && <Badge variant="secondary">分析中...</Badge>}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={generateInsights}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-2">
                {isAnalyzing ? "分析中" : "重新分析"}
              </span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {insights.length === 0 && !isAnalyzing ? (
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                点击"重新分析"按钮开始AI智能分析，获取数据洞察和建议。
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full mb-4">
                <TabsTrigger value="all">全部 ({insights.length})</TabsTrigger>
                <TabsTrigger value="trend">
                  趋势 ({insights.filter((i) => i.type === "trend").length})
                </TabsTrigger>
                <TabsTrigger value="anomaly">
                  异常 ({insights.filter((i) => i.type === "anomaly").length})
                </TabsTrigger>
                <TabsTrigger value="recommendation">
                  建议 (
                  {insights.filter((i) => i.type === "recommendation").length})
                </TabsTrigger>
                <TabsTrigger value="prediction">
                  预测 ({insights.filter((i) => i.type === "prediction").length}
                  )
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredInsights.map((insight) => (
                    <InsightCard
                      key={insight.id}
                      insight={insight}
                      onClick={onInsightClick}
                    />
                  ))}
                </AnimatePresence>

                {filteredInsights.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>暂无{activeTab === "all" ? "" : "该类型的"}洞察</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    );
  }
);

AIInsightsPanel.displayName = "AIInsightsPanel";

// Mini版本组件 - 用于嵌入其他组件
export const AIInsightsMini: React.FC<{
  data?: any[];
  maxInsights?: number;
  className?: string;
  context?: {
    examId?: string;
    className?: string;
    subject?: string;
  };
  onInsightClick?: (insight: AIInsight) => void;
}> = ({
  data = [],
  maxInsights = 3,
  className = "",
  context,
  onInsightClick,
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    if (!data?.length) return;

    const generateMiniInsights = async () => {
      try {
        const engine = AdvancedAnalysisEngine.getInstance();
        const mapType = (type: InsightType): AIInsight["type"] => {
          switch (type) {
            case InsightType.TREND:
              return "trend";
            case InsightType.ANOMALY:
              return "anomaly";
            case InsightType.SUGGESTION:
              return "recommendation";
            default:
              return "prediction";
          }
        };
        const mapImpact = (priority: InsightPriority): AIInsight["impact"] => {
          if (priority === InsightPriority.HIGH) return "high";
          if (priority === InsightPriority.MEDIUM) return "medium";
          return "low";
        };
        const generatedInsights = await engine.generateInsights({
          data,
          context: context ?? {},
          options: {
            maxInsights,
            focusAreas: [
              InsightType.TREND,
              InsightType.ANOMALY,
              InsightType.SUGGESTION,
            ],
          },
        });
        const mappedInsights = generatedInsights.insights.map(
          (insight: EngineInsight): AIInsight => ({
            id: insight.id,
            type: mapType(insight.type),
            title: insight.title,
            description: insight.description,
            summary: insight.detail ?? insight.description,
            confidence: insight.confidence,
            impact: mapImpact(insight.priority),
            data: insight.relatedData,
            actions: insight.actions?.map((action) => ({
              label: action.label,
              action: () => {},
            })),
          })
        );
        setInsights(mappedInsights.slice(0, maxInsights));
      } catch (error) {
        console.error("生成迷你洞察失败:", error);
      }
    };

    generateMiniInsights();
  }, [data, maxInsights, context]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {insights.map((insight) => (
        <div
          key={insight.id}
          className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm"
          onClick={() => onInsightClick?.(insight)}
          role={onInsightClick ? "button" : undefined}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
              insight.priority === "high"
                ? "bg-red-500"
                : insight.priority === "medium"
                  ? "bg-yellow-500"
                  : "bg-green-500"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {insight.title}
            </p>
            <p className="text-gray-600 text-xs">
              {insight.summary ?? insight.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export { AIInsightsPanel };
export default AIInsightsPanel;
