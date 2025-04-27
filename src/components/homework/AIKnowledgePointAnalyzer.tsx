import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Save, Plus, BookOpen, XCircle, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { analyzeHomeworkContent } from "@/services/aiService";
import { env } from "@/env";
import { getUserAIConfig } from "@/utils/userAuth";

// 定义知识点类型
export interface KnowledgePoint {
  id?: string;
  name: string;
  description?: string;
  confidence?: number;
  masteryLevel?: number;
  isNew?: boolean;
  importance?: number;
}

interface AIKnowledgePointAnalyzerProps {
  homeworkId: string;
  submissionId: string;
  submissionContent: string;
  existingKnowledgePoints: KnowledgePoint[];
  onSaveKnowledgePoints: (knowledgePoints: KnowledgePoint[]) => void;
  onClose?: () => void;
}

export function AIKnowledgePointAnalyzer({
  homeworkId,
  submissionId,
  submissionContent,
  existingKnowledgePoints,
  onSaveKnowledgePoints,
  onClose
}: AIKnowledgePointAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [progress, setProgress] = useState(0);
  const [customKnowledgePoint, setCustomKnowledgePoint] = useState("");
  
  // 开始分析
  useEffect(() => {
    if (submissionContent) {
      handleStartAnalysis();
    }
  }, [submissionContent]);
  
  // 开始AI分析
  const handleStartAnalysis = async () => {
    if (!submissionContent) {
      toast.warning("缺少作业内容，无法进行分析");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setProgress(0);
    
    try {
      // 检查AI配置
      const aiConfig = await getUserAIConfig();
      if (!aiConfig || !aiConfig.enabled) {
        throw new Error("AI分析功能未启用，请先在AI设置中配置并启用");
      }
      
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);
      
      // 调用AI分析服务
      try {
        const result = await analyzeHomeworkContent(submissionContent, existingKnowledgePoints);
        
        // 处理结果
        if (!result.knowledgePoints || result.knowledgePoints.length === 0) {
          setError("未能从内容中识别出知识点，请尝试提供更多内容或手动添加");
          setIsAnalyzing(false);
          clearInterval(progressInterval);
          return;
        }
        
        setKnowledgePoints(result.knowledgePoints);
        
        // 延迟一段时间以显示100%进度
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setIsAnalyzing(false);
        }, 500);
      } catch (err) {
        clearInterval(progressInterval);
        const errorMsg = err instanceof Error ? err.message : "未知错误";
        setError(`AI分析出错: ${errorMsg}`);
        setIsAnalyzing(false);
      }
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知错误";
      setError(`启动AI分析失败: ${errorMsg}`);
      setIsAnalyzing(false);
    }
  };
  
  // 添加自定义知识点
  const handleAddCustomKnowledgePoint = () => {
    if (!customKnowledgePoint.trim()) return;
    
    const newPoint: KnowledgePoint = {
      name: customKnowledgePoint.trim(),
      isNew: true,
      masteryLevel: 50, // 默认掌握程度为中等
      confidence: 100,   // 手动添加的置信度为100%
      importance: 3,     // 默认重要性为3
    };
    
    setKnowledgePoints(prev => [...prev, newPoint]);
    setCustomKnowledgePoint("");
  };
  
  // 删除知识点
  const handleRemoveKnowledgePoint = (index: number) => {
    setKnowledgePoints(prev => prev.filter((_, i) => i !== index));
  };
  
  // 更新掌握程度
  const handleUpdateMasteryLevel = (index: number, level: number) => {
    setKnowledgePoints(prev => 
      prev.map((kp, i) => i === index ? {...kp, masteryLevel: level} : kp)
    );
  };
  
  // 保存分析结果
  const handleSaveAnalysis = () => {
    onSaveKnowledgePoints(knowledgePoints);
    toast.success("知识点评估已保存");
    if (onClose) onClose();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <BrainCircuit className="mr-2 h-5 w-5 text-primary" />
              AI知识点分析
            </CardTitle>
            <CardDescription>
              自动分析作业内容，识别知识点掌握情况
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isAnalyzing ? (
          <div className="space-y-4 py-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm">正在分析作业内容...</span>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center mt-4">
              AI正在分析作业内容，识别知识点并评估掌握程度
            </p>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>分析失败</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={handleStartAnalysis}
            >
              重试
            </Button>
          </Alert>
        ) : (
          <div className="space-y-6">
            {/* 知识点列表 */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">识别到的知识点（{knowledgePoints.length}）</h3>
              
              {knowledgePoints.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  未识别到任何知识点，可能需要更多的作业内容或手动添加
                </p>
              ) : (
                <div className="space-y-3">
                  {knowledgePoints.map((kp, index) => (
                    <div 
                      key={kp.id || `new-kp-${index}`}
                      className="flex items-center justify-between border rounded-md p-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium">{kp.name}</span>
                          {kp.isNew && (
                            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                              新发现
                            </Badge>
                          )}
                          {kp.confidence && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "ml-2",
                                      kp.confidence >= 90 ? "bg-green-50 text-green-700 border-green-200" :
                                      kp.confidence >= 70 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                      "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    )}
                                  >
                                    置信度: {kp.confidence}%
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>AI对该知识点识别的确信程度</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {kp.importance && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "ml-2",
                                      kp.importance >= 4 ? "bg-purple-50 text-purple-700 border-purple-200" :
                                      kp.importance >= 3 ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                      "bg-slate-50 text-slate-700 border-slate-200"
                                    )}
                                  >
                                    重要性: {kp.importance}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>知识点的重要程度 (1-5)</p>
                                  <p className="text-xs text-muted-foreground">1=基础, 3=必要, 5=核心</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {kp.description && (
                          <p className="text-sm text-muted-foreground">{kp.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground mb-1">掌握程度</span>
                                <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      kp.masteryLevel && kp.masteryLevel >= 4 ? "bg-green-500" :
                                      kp.masteryLevel && kp.masteryLevel >= 3 ? "bg-blue-500" :
                                      kp.masteryLevel && kp.masteryLevel >= 2 ? "bg-yellow-500" :
                                      "bg-red-500"
                                    )}
                                    style={{ 
                                      width: `${kp.masteryLevel ? (kp.masteryLevel / 5) * 100 : 0}%` 
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-medium mt-1">{kp.masteryLevel}/5</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>学生对此知识点的掌握程度 (1-5)</p>
                              <p className="text-xs text-muted-foreground">1=不熟练, 3=基本掌握, 5=精通</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveKnowledgePoint(index)}
                        >
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 手动添加知识点 */}
            <div>
              <h3 className="text-sm font-medium mb-2">手动添加知识点</h3>
              <div className="flex gap-2">
                <Textarea
                  placeholder="输入新的知识点名称..."
                  value={customKnowledgePoint}
                  onChange={(e) => setCustomKnowledgePoint(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddCustomKnowledgePoint} 
                  disabled={!customKnowledgePoint.trim()}
                  className="mt-auto"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加
                </Button>
              </div>
            </div>

            {/* 评分说明区域 */}
            <div className="bg-muted p-3 rounded-md text-sm">
              <h4 className="font-medium mb-2 flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                评分说明
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium mb-1">知识点重要性 (1-5):</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li><span className="font-medium">1</span> - 非常基础，辅助性知识点</li>
                    <li><span className="font-medium">2</span> - 基础，入门级知识点</li>
                    <li><span className="font-medium">3</span> - 必要，标准要求知识点</li>
                    <li><span className="font-medium">4</span> - 重要，核心能力相关知识点</li>
                    <li><span className="font-medium">5</span> - 核心，关键能力必备知识点</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">掌握程度 (1-5):</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li><span className="font-medium">1</span> - 初步了解，尚未熟练应用</li>
                    <li><span className="font-medium">2</span> - 了解基础，能简单应用</li>
                    <li><span className="font-medium">3</span> - 基本掌握，能正常应用</li>
                    <li><span className="font-medium">4</span> - 熟练掌握，能灵活应用</li>
                    <li><span className="font-medium">5</span> - 精通，能创造性应用</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {!isAnalyzing && !error && (
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button 
            onClick={handleSaveAnalysis} 
            disabled={knowledgePoints.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            保存评估结果
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 