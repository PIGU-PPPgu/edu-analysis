import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  Activity,
  BarChart3,
  Zap,
} from "lucide-react";
import {
  aiAnalysisService,
  BasicAIAnalysis,
  AIAnalysisRequest,
} from "../../services/aiAnalysisService";

interface AIAnalysisPanelProps {
  request: AIAnalysisRequest;
  onRefresh?: () => void;
}

function AIAnalysisPanel({ request, onRefresh }: AIAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<BasicAIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载AI分析结果
  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("[AIAnalysisPanel] 开始加载AI分析...");
      const result = await aiAnalysisService.getAIAnalysis(request);
      setAnalysis(result);
      console.log("[AIAnalysisPanel] AI分析加载完成:", result.analysisId);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "获取AI分析失败";
      setError(errorMessage);
      console.error("[AIAnalysisPanel] AI分析失败:", err);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载分析
  useEffect(() => {
    loadAnalysis();
  }, [request.dataType, request.scope, request.targetId, request.timeRange]);

  // 手动刷新
  const handleRefresh = () => {
    loadAnalysis();
    onRefresh?.();
  };

  // 获取风险等级颜色
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      case "high":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // 获取风险等级图标
  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "low":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-600" />;
    }
  };

  // 获取趋势图标
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse" />
            AI智能分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-500">AI正在分析数据...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI智能分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={handleRefresh} variant="outline">
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI智能分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">暂无分析数据</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" style={{ color: "#c0ff3f" }} />
            AI智能分析
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              置信度: {(analysis.metadata.confidence * 100).toFixed(0)}%
            </Badge>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
            >
              <Zap className="h-3 w-3" />
              刷新
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">风险摘要</TabsTrigger>
            <TabsTrigger value="patterns">模式识别</TabsTrigger>
            <TabsTrigger value="recommendations">智能建议</TabsTrigger>
          </TabsList>

          {/* 风险摘要标签页 */}
          <TabsContent value="summary" className="space-y-4">
            {/* 总体风险评估 */}
            <Card
              className={`border ${getRiskColor(analysis.riskSummary.overallRisk)}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  {getRiskIcon(analysis.riskSummary.overallRisk)}
                  <div>
                    <h3 className="font-semibold">总体风险评估</h3>
                    <p className="text-sm text-gray-600">
                      风险评分: {analysis.riskSummary.riskScore}/100
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      analysis.riskSummary.riskScore >= 80
                        ? "bg-red-500"
                        : analysis.riskSummary.riskScore >= 60
                          ? "bg-orange-500"
                          : analysis.riskSummary.riskScore >= 30
                            ? "bg-yellow-500"
                            : "bg-green-500"
                    }`}
                    style={{ width: `${analysis.riskSummary.riskScore}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            {/* 主要关注点 */}
            {analysis.riskSummary.primaryConcerns.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    主要关注点
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {analysis.riskSummary.primaryConcerns.map(
                      (concern, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg"
                        >
                          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                          <span className="text-sm">{concern}</span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 改进领域 */}
            {analysis.riskSummary.improvementAreas.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    改进领域
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {analysis.riskSummary.improvementAreas.map(
                      (area, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg"
                        >
                          <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm">{area}</span>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 模式识别标签页 */}
          <TabsContent value="patterns" className="space-y-4">
            {/* 趋势方向 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  趋势分析
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  {getTrendIcon(analysis.patterns.trendDirection)}
                  <span className="font-medium">
                    {analysis.patterns.trendDirection === "improving"
                      ? "改善趋势"
                      : analysis.patterns.trendDirection === "declining"
                        ? "恶化趋势"
                        : "稳定状态"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 异常情况 */}
            {analysis.patterns.anomalies.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    异常检测
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analysis.patterns.anomalies.map((anomaly, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              anomaly.severity === "high"
                                ? "destructive"
                                : anomaly.severity === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {anomaly.severity === "high"
                              ? "高"
                              : anomaly.severity === "medium"
                                ? "中"
                                : "低"}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            影响 {anomaly.affectedCount} 项
                          </span>
                        </div>
                        <p className="text-sm">{anomaly.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 相关性分析 */}
            {analysis.patterns.correlations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    相关性分析
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analysis.patterns.correlations.map(
                      (correlation, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {correlation.factor1} ↔ {correlation.factor2}
                            </span>
                            <Badge
                              variant={
                                Math.abs(correlation.strength) > 0.7
                                  ? "default"
                                  : Math.abs(correlation.strength) > 0.4
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {(correlation.strength * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {correlation.description}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 智能建议标签页 */}
          <TabsContent value="recommendations" className="space-y-4">
            {/* 即时建议 */}
            {analysis.recommendations.immediate.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    即时行动建议
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {analysis.recommendations.immediate.map((rec, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 bg-red-50 border-red-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={getPriorityColor(rec.priority)}>
                            {rec.priority === "high"
                              ? "高优先级"
                              : rec.priority === "medium"
                                ? "中优先级"
                                : "低优先级"}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {rec.timeframe}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">{rec.action}</h4>
                        <p className="text-sm text-gray-600">
                          {rec.expectedImpact}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 战略建议 */}
            {analysis.recommendations.strategic.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    战略性建议
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    {analysis.recommendations.strategic.map((rec, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 bg-blue-50 border-blue-100"
                      >
                        <h4 className="font-medium mb-2">{rec.action}</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          {rec.rationale}
                        </p>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-500">
                              预期结果:
                            </span>
                            <p className="text-sm">{rec.expectedOutcome}</p>
                          </div>
                          {rec.resources.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-500">
                                所需资源:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rec.resources.map((resource, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {resource}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 分析元数据 */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>分析ID: {analysis.analysisId}</span>
            <span>
              生成时间:{" "}
              {new Date(analysis.metadata.generatedAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>数据点: {analysis.metadata.dataPoints} 个</span>
            <span>处理时间: {analysis.metadata.processingTime}ms</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AIAnalysisPanel;
