"use client";

/**
 * AI洞察面板 - 增值报告专用
 * 集成advancedAnalysisEngine提供智能分析
 */

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Info,
  X,
  RefreshCw,
} from "lucide-react";
import { AdvancedAnalysisEngine } from "@/services/ai/advancedAnalysisEngine";
import {
  InsightType,
  InsightPriority,
  InsightSentiment,
} from "@/types/aiInsights";
import type {
  AIInsight,
  AnalysisRequest,
  AnalysisResponse,
} from "@/types/aiInsights";

interface AIInsightsPanelProps {
  /** 要分析的数据 */
  data: any[];
  /** 分析上下文 */
  context?: {
    examId?: string;
    className?: string;
    subject?: string;
  };
  /** 最大洞察数量 */
  maxInsights?: number;
}

export function AIInsightsPanel({
  data,
  context = {},
  maxInsights = 5,
}: AIInsightsPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // 执行AI分析
  const analyzeData = async () => {
    if (data.length === 0) {
      setError("暂无数据可供分析");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const engine = AdvancedAnalysisEngine.getInstance();

      const request: AnalysisRequest = {
        data,
        context,
        options: {
          maxInsights,
          includeActions: true,
          language: "simple",
        },
      };

      const result = await engine.generateInsights(request);
      setAnalysisResult(result);
    } catch (err) {
      console.error("AI分析失败:", err);
      setError("AI分析失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 自动分析
  useEffect(() => {
    if (data.length > 0) {
      analyzeData();
    }
  }, [data, context, maxInsights]);

  // 过滤未被隐藏的洞察
  const visibleInsights = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.insights.filter(
      (insight) => !dismissed.has(insight.id)
    );
  }, [analysisResult, dismissed]);

  // 隐藏洞察
  const handleDismiss = (insightId: string) => {
    setDismissed((prev) => new Set([...prev, insightId]));
  };

  // 获取洞察图标
  const getInsightIcon = (type: InsightType, sentiment: InsightSentiment) => {
    if (sentiment === InsightSentiment.POSITIVE) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (sentiment === InsightSentiment.NEGATIVE) {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }

    switch (type) {
      case InsightType.TREND:
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case InsightType.ANOMALY:
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case InsightType.ACHIEVEMENT:
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case InsightType.SUGGESTION:
        return <Lightbulb className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: InsightPriority) => {
    switch (priority) {
      case InsightPriority.HIGH:
        return "bg-red-100 text-red-700 border-red-200";
      case InsightPriority.MEDIUM:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case InsightPriority.LOW:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  // 渲染洞察卡片
  const renderInsightCard = (insight: AIInsight) => {
    const priorityColor = getPriorityColor(insight.priority);

    return (
      <Card key={insight.id} className={`border-l-4 ${priorityColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {getInsightIcon(insight.type, insight.sentiment)}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(insight.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 指标展示 */}
              {insight.metric && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">
                    {insight.metric.value}
                    {insight.metric.unit || ""}
                  </Badge>
                  {insight.metric.trend && (
                    <span
                      className={
                        insight.metric.trend === "up"
                          ? "text-green-600"
                          : insight.metric.trend === "down"
                            ? "text-red-600"
                            : "text-gray-600"
                      }
                    >
                      {insight.metric.trend === "up" ? (
                        <TrendingUp className="h-4 w-4 inline" />
                      ) : insight.metric.trend === "down" ? (
                        <TrendingDown className="h-4 w-4 inline" />
                      ) : null}
                      {insight.metric.changePercent && (
                        <span className="ml-1">
                          {insight.metric.changePercent > 0 ? "+" : ""}
                          {insight.metric.changePercent.toFixed(1)}%
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}

              {/* 详细信息 */}
              {insight.detail && (
                <p className="text-xs text-muted-foreground">
                  {insight.detail}
                </p>
              )}

              {/* 置信度 */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>置信度:</span>
                <div className="flex-1 max-w-[100px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      insight.confidence > 0.8
                        ? "bg-green-500"
                        : insight.confidence > 0.6
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                    style={{ width: `${insight.confidence * 100}%` }}
                  />
                </div>
                <span>{(insight.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>AI正在分析数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={analyzeData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              重新分析
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult || visibleInsights.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Sparkles className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">暂无AI洞察</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部信息 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI智能洞察
              </CardTitle>
              <CardDescription className="mt-1">
                基于 {analysisResult.metadata.dataPoints} 条数据生成 • 分析耗时{" "}
                {analysisResult.metadata.analysisTime}ms
              </CardDescription>
            </div>

            <Button onClick={analyzeData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardHeader>

        {/* 摘要统计 */}
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {analysisResult.summary.totalInsights}
              </div>
              <div className="text-xs text-muted-foreground">总洞察</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {analysisResult.summary.highPriorityCount}
              </div>
              <div className="text-xs text-muted-foreground">高优先级</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analysisResult.summary.positiveCount}
              </div>
              <div className="text-xs text-muted-foreground">积极</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {analysisResult.summary.negativeCount}
              </div>
              <div className="text-xs text-muted-foreground">需关注</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 洞察列表 */}
      <div className="space-y-3">
        {visibleInsights.map((insight) => renderInsightCard(insight))}
      </div>

      {/* 底部说明 */}
      {dismissed.size > 0 && (
        <div className="text-xs text-center text-muted-foreground">
          已隐藏 {dismissed.size} 条洞察 •
          <button
            onClick={() => setDismissed(new Set())}
            className="ml-1 text-blue-600 hover:underline"
          >
            全部恢复
          </button>
        </div>
      )}
    </div>
  );
}
