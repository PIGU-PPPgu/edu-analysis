import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Check,
  Loader2,
  Cpu,
  Code,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { KnowledgePoint as HomeworkKnowledgePoint } from "@/types/homework";
import { GenericAIClient } from "@/services/aiService";

// 为组件导出KnowledgePoint接口
export interface KnowledgePoint {
  id: string;
  name: string;
  description?: string;
  masteryLevel?: number;
  subject?: string;
  createdAt?: string;
}

interface AIKnowledgePointAnalyzerProps {
  homeworkId?: string;
  submissionId?: string;
  submissionContent?: string;
  existingKnowledgePoints?: HomeworkKnowledgePoint[];
  onSaveKnowledgePoints?: (points: KnowledgePoint[]) => void;
  onClose?: () => void;
  onExtractKnowledgePoints?: (
    points: KnowledgePoint[],
    summary: string,
    providerInfo: { provider: string; model: string }
  ) => void;
  subject?: string;
  grade?: string;
}

// 辅助函数 - 根据掌握度返回不同的Badge样式
const getBadgeVariant = (mastery: number) => {
  if (mastery >= 80) return "secondary";
  if (mastery >= 60) return "default";
  if (mastery >= 40) return "outline";
  return "destructive";
};

// AI知识点分析器组件
export function AIKnowledgePointAnalyzer({
  homeworkId,
  submissionId,
  submissionContent: initialContent = "",
  existingKnowledgePoints = [],
  onSaveKnowledgePoints,
  onClose,
  onExtractKnowledgePoints,
  subject: initialSubject = "",
  grade: initialGrade = "",
}: AIKnowledgePointAnalyzerProps) {
  // 状态管理
  const [submissionContent, setSubmissionContent] = useState(initialContent);
  const [subject, setSubject] = useState(initialSubject);
  const [grade, setGrade] = useState(initialGrade);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [extractedKnowledgePoints, setExtractedKnowledgePoints] = useState<
    KnowledgePoint[]
  >([]);
  const [overallSummary, setOverallSummary] = useState("");

  // 添加知识点确认状态
  const [confirmingPoints, setConfirmingPoints] = useState(false);
  const [confirmedPoints, setConfirmedPoints] = useState<{
    [key: string]: boolean;
  }>({});
  const [allConfirmed, setAllConfirmed] = useState(false);

  // 使用AI分析知识点
  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    setAnalysisFailed(false);
    setAiResponse("");

    try {
      // 确保有内容进行分析
      if (!submissionContent || submissionContent.trim() === "") {
        toast.error("没有可用内容进行分析");
        setIsAnalyzing(false);
        return;
      }

      // 获取当前设置的AI提供商和模型
      const savedProvider =
        localStorage.getItem("selectedProvider") || "openai";
      const savedApiKey = localStorage.getItem(`${savedProvider}_api_key`);

      if (!savedApiKey) {
        toast.error("未设置API密钥，请先在AI设置中配置");
        setIsAnalyzing(false);
        return;
      }

      // 获取选中的模型ID
      const modelId =
        localStorage.getItem(`${savedProvider}_selected_model`) || "";

      if (!modelId) {
        toast.error("未选择AI模型，请先在AI设置中选择模型");
        setIsAnalyzing(false);
        return;
      }

      console.log(`使用AI提供商: ${savedProvider}, 模型: ${modelId}`);

      // 提示词模板
      const prompt = `
你的任务是分析以下教育内容中的知识点。
内容类型: 学生作业/作业题目
学科: ${subject || "未知"}
年级: ${grade || "未知"}

请从以下内容中识别出主要知识点:
---
${submissionContent}
---

要求:
1. 识别内容中涉及的3-5个关键知识点
2. 为每个知识点提供简短说明
3. 评估每个知识点的掌握程度(1-100分)，如果是作业题目则不需要评估掌握程度

以JSON格式输出，格式如下:
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "简短说明",
      "mastery": 分数(1-100)
    }
  ],
  "summary": "整体评估总结"
}

只返回JSON格式，不要有其他额外文字。
`;

      // 构建消息
      const messages = [
        {
          role: "system",
          content: "你是一位教育专家，擅长分析教育内容中的知识点。",
        },
        { role: "user", content: prompt },
      ];

      // 使用通用AI客户端
      const client = new GenericAIClient({
        providerId: savedProvider,
        apiKey: savedApiKey,
        modelId: modelId,
        baseUrl: "", // baseUrl会在GenericAIClient内部根据providerId确定
      });

      const response = await client.sendRequest(messages, {
        temperature: 0.2,
        maxTokens: 2000,
      });

      // 处理AI响应
      const aiResponseContent = response.choices[0]?.message?.content || "";

      if (!aiResponseContent) {
        throw new Error("AI返回内容为空");
      }

      console.log("AI返回内容:", aiResponseContent);
      setAiResponse(aiResponseContent);

      // 尝试解析JSON
      try {
        const jsonMatch = aiResponseContent.match(/\{[\s\S]*\}/);
        let parsedJson;

        if (jsonMatch) {
          parsedJson = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("无法找到JSON格式的响应");
        }

        // 确保格式正确
        if (parsedJson && parsedJson.knowledgePoints) {
          // 提取知识点数据
          const extractedPoints = parsedJson.knowledgePoints.map(
            (kp: any, index: number) => ({
              id: `kp-${Date.now()}-${index}`,
              name: kp.name,
              description: kp.description || "",
              masteryLevel: kp.mastery || null,
              subject: subject || "",
              createdAt: new Date().toISOString(),
            })
          );

          setExtractedKnowledgePoints(extractedPoints);
          setOverallSummary(parsedJson.summary || "");
          setAnalysisSuccess(true);
        } else {
          throw new Error("返回的JSON缺少knowledgePoints字段");
        }
      } catch (parseError) {
        console.error("解析AI返回的JSON失败:", parseError);
        throw new Error("无法解析AI返回的JSON数据");
      }
    } catch (error) {
      console.error("AI分析知识点失败:", error);
      setAnalysisFailed(true);
      toast.error(
        `AI分析失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 开始分析
  const startAnalysis = async () => {
    // 直接使用真实AI分析
    await analyzeWithAI();
  };

  // 处理单个知识点确认/取消
  const handleConfirmPoint = (pointId: string, confirmed: boolean) => {
    setConfirmedPoints((prev) => ({
      ...prev,
      [pointId]: confirmed,
    }));

    // 检查是否所有知识点都已确认
    const updatedConfirmedPoints = {
      ...confirmedPoints,
      [pointId]: confirmed,
    };

    const allPointsConfirmed = extractedKnowledgePoints.every(
      (point) => updatedConfirmedPoints[point.id] !== false
    );

    setAllConfirmed(allPointsConfirmed);
  };

  // 一键确认所有知识点
  const confirmAllPoints = () => {
    const allPoints = {};
    extractedKnowledgePoints.forEach((point) => {
      allPoints[point.id] = true;
    });

    setConfirmedPoints(allPoints);
    setAllConfirmed(true);
  };

  // 一键取消所有确认
  const cancelAllConfirmations = () => {
    const allPoints = {};
    extractedKnowledgePoints.forEach((point) => {
      allPoints[point.id] = false;
    });

    setConfirmedPoints(allPoints);
    setAllConfirmed(false);
  };

  // 保存确认后的知识点
  const saveConfirmedPoints = () => {
    // 只保留已确认的知识点
    const pointsToSave = extractedKnowledgePoints.filter(
      (point) => confirmedPoints[point.id] !== false
    );

    if (onExtractKnowledgePoints) {
      const provider = localStorage.getItem("selectedProvider") || "openai";
      const modelId = localStorage.getItem(`${provider}_selected_model`) || "";

      onExtractKnowledgePoints(pointsToSave, overallSummary, {
        provider,
        model: modelId,
      });
    }

    toast.success(`已保存 ${pointsToSave.length} 个确认的知识点`);
  };

  // 在AI分析完成后，显示确认界面
  const proceedToConfirmation = () => {
    if (extractedKnowledgePoints.length === 0) {
      toast.error("没有识别到知识点，无法进行确认");
      return;
    }

    // 初始化所有知识点为已确认状态
    const initialConfirmations = {};
    extractedKnowledgePoints.forEach((point) => {
      initialConfirmations[point.id] = true;
    });

    setConfirmedPoints(initialConfirmations);
    setConfirmingPoints(true);
    setAllConfirmed(true);
  };

  // 重置确认状态
  const resetConfirmation = () => {
    setConfirmingPoints(false);
    setConfirmedPoints({});
    setAllConfirmed(false);
  };

  // 修改handleSubmit方法，调用proceedToConfirmation
  const handleSubmit = () => {
    if (analysisSuccess) {
      proceedToConfirmation();
    } else {
      startAnalysis();
    }
  };

  // 显示内容
  return (
    <div className="space-y-4">
      {confirmingPoints ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">确认知识点</h3>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={confirmAllPoints}
                disabled={allConfirmed}
              >
                <Check className="h-4 w-4 mr-1" />
                全部确认
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelAllConfirmations}
                disabled={
                  !allConfirmed && Object.keys(confirmedPoints).length === 0
                }
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                全部取消
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto p-1">
            {extractedKnowledgePoints.map((point) => (
              <div
                key={point.id}
                className={`p-3 rounded-md border ${
                  confirmedPoints[point.id] !== false
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{point.name}</h4>
                    {point.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {point.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant={
                      confirmedPoints[point.id] !== false
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      handleConfirmPoint(
                        point.id,
                        confirmedPoints[point.id] === false
                      )
                    }
                  >
                    {confirmedPoints[point.id] !== false ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        已确认
                      </>
                    ) : (
                      "确认"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertTitle className="flex items-center">
              <Cpu className="h-4 w-4 mr-2" />
              AI分析结果总结
            </AlertTitle>
            <AlertDescription>
              {overallSummary || "AI未提供总结信息"}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={resetConfirmation}>
              返回编辑
            </Button>
            <Button
              onClick={saveConfirmedPoints}
              disabled={
                extractedKnowledgePoints.length > 0 &&
                !extractedKnowledgePoints.some(
                  (p) => confirmedPoints[p.id] !== false
                )
              }
            >
              保存确认的知识点
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>学科</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="如：数学、语文、英语"
                />
              </div>
              <div>
                <Label>年级</Label>
                <Input
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="如：一年级、初二、高三"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>作业内容</Label>
            <Textarea
              value={submissionContent}
              onChange={(e) => setSubmissionContent(e.target.value)}
              rows={8}
              placeholder="输入学生作业内容或作业题目，AI将帮助您分析其中包含的知识点"
            />
          </div>

          {/* 分析结果 */}
          {isAnalyzing ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                AI正在分析作业内容，识别知识点...
              </p>
            </div>
          ) : (
            <>
              {/* 分析失败 */}
              {analysisFailed && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>分析失败</AlertTitle>
                  <AlertDescription>
                    AI无法完成知识点分析，请检查您的AI配置和网络连接，或稍后重试。
                  </AlertDescription>
                </Alert>
              )}

              {/* 分析成功后显示分析结果 */}
              {analysisSuccess && extractedKnowledgePoints.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">分析结果</h3>

                  {/* 知识点列表 */}
                  <div className="space-y-3">
                    {extractedKnowledgePoints.map((point) => (
                      <Card key={point.id} className="bg-muted/30">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-base flex items-center justify-between">
                            <span>{point.name}</span>
                            {point.masteryLevel && (
                              <Badge
                                variant={getBadgeVariant(point.masteryLevel)}
                                className="ml-2"
                              >
                                掌握度: {point.masteryLevel}%
                              </Badge>
                            )}
                          </CardTitle>
                          {point.description && (
                            <CardDescription className="text-xs">
                              {point.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>

                  {/* 整体评估 */}
                  {overallSummary && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-1">整体评估</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                        {overallSummary}
                      </p>
                    </div>
                  )}

                  {/* AI提供商信息 */}
                  <div className="text-xs text-muted-foreground flex items-center mt-2">
                    <Cpu className="h-3 w-3 mr-1" />
                    使用 {localStorage.getItem("selectedProvider") || "AI"} /
                    {localStorage.getItem(
                      `${localStorage.getItem("selectedProvider") || "openai"}_selected_model`
                    ) || "默认模型"}{" "}
                    进行分析
                  </div>
                </div>
              )}

              {/* 原始AI响应（调试用） */}
              {aiResponse && (
                <Collapsible className="mt-4">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 text-xs"
                    >
                      <Code className="h-3 w-3" />
                      查看AI原始响应
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-muted p-2 rounded-md overflow-auto max-h-40">
                      <pre className="text-xs whitespace-pre-wrap">
                        {aiResponse}
                      </pre>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isAnalyzing}>
              取消
            </Button>
            {!analysisSuccess ? (
              <Button
                onClick={startAnalysis}
                disabled={isAnalyzing || !submissionContent}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    开始分析
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={proceedToConfirmation}>
                <Check className="mr-2 h-4 w-4" />
                确认结果
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
