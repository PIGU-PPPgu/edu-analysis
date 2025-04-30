import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrainCircuit, Sparkles, Book, AlertTriangle, CheckCircle, BookOpen } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { getKnowledgePointsByHomeworkId } from "@/services/knowledgePointService";
import { KnowledgePoint as HomeworkKnowledgePoint } from "@/types/homework";
import { AIKnowledgePointAnalyzer } from "./AIKnowledgePointAnalyzer";

// 知识点掌握程度指示器
const MasteryIndicator = ({ level }: { level: number }) => {
  let bgColor = "bg-red-500";
  let text = "未掌握";
  
  if (level >= 90) {
    bgColor = "bg-green-500";
    text = "精通";
  } else if (level >= 70) {
    bgColor = "bg-blue-500";
    text = "熟练";
  } else if (level >= 50) {
    bgColor = "bg-yellow-500";
    text = "基础";
  } else if (level >= 30) {
    bgColor = "bg-orange-500";
    text = "薄弱";
  }
  
  return (
    <div className="flex items-center">
      <div className={`w-2 h-2 rounded-full ${bgColor} mr-1`}></div>
      <span className="text-xs">{text} ({level}%)</span>
    </div>
  );
};

interface KnowledgePointAnalysisProps {
  homeworkId: string;
  submissions?: any[];
  knowledgePoints: HomeworkKnowledgePoint[];
  onKnowledgePointsUpdated?: (points: HomeworkKnowledgePoint[]) => void;
  isAiAnalyzing?: boolean;
}

export default function KnowledgePointAnalysis({
  homeworkId,
  submissions = [],
  knowledgePoints = [],
  onKnowledgePointsUpdated,
  isAiAnalyzing = false,
}: KnowledgePointAnalysisProps) {
  const [currentTab, setCurrentTab] = useState<"overview" | "mastery" | "breakdown">("overview");
  const [showAIAnalyzer, setShowAIAnalyzer] = useState(false);
  const [viewMode, setViewMode] = useState<"radar" | "distribution">("radar");
  
  // 计算每个知识点的掌握情况
  const knowledgePointMastery = knowledgePoints.map(kp => {
    // 找出所有包含此知识点评估的提交
    const evaluations = submissions
      .filter(s => s.status === "graded")
      .flatMap(s => s.knowledge_point_evaluation || [])
      .filter(e => e.knowledge_points?.id === kp.id);
      
    // 计算平均掌握度
    const avgMastery = evaluations.length 
      ? evaluations.reduce((sum, e) => sum + (e.mastery_level || 0), 0) / evaluations.length
      : 0;
      
    // 掌握情况分布
    const masteryDistribution = {
      excellent: evaluations.filter(e => e.mastery_level >= 90).length,
      good: evaluations.filter(e => e.mastery_level >= 70 && e.mastery_level < 90).length,
      adequate: evaluations.filter(e => e.mastery_level >= 50 && e.mastery_level < 70).length,
      poor: evaluations.filter(e => e.mastery_level >= 30 && e.mastery_level < 50).length,
      inadequate: evaluations.filter(e => e.mastery_level < 30).length,
    };
    
    return {
      ...kp,
      avgMastery,
      masteryDistribution,
      evaluations: evaluations.length
    };
  });
  
  // 处理AI分析后的知识点更新
  const handleAIExtractKnowledgePoints = (
    newPoints: HomeworkKnowledgePoint[], 
    summary: string,
    providerInfo: {provider: string, model: string}
  ) => {
    if (onKnowledgePointsUpdated) {
      onKnowledgePointsUpdated(newPoints);
    }
    setShowAIAnalyzer(false);
  };
  
  // 组合知识点图表数据
  const radarChartData = knowledgePointMastery.map(kp => ({
    name: kp.name,
    value: kp.avgMastery || 0,
  }));
  
  // 计算班级整体知识点掌握情况
  const overallMasteryDistribution = knowledgePointMastery.reduce(
    (acc, kp) => {
      const dist = kp.masteryDistribution;
      return {
        excellent: acc.excellent + dist.excellent,
        good: acc.good + dist.good,
        adequate: acc.adequate + dist.adequate,
        poor: acc.poor + dist.poor,
        inadequate: acc.inadequate + dist.inadequate,
      };
    },
    { excellent: 0, good: 0, adequate: 0, poor: 0, inadequate: 0 }
  );
  
  // 计算整体掌握情况分布百分比
  const totalEvaluations = Object.values(overallMasteryDistribution).reduce((sum, val) => sum + val, 0);
  
  const pieChartData = [
    { name: "精通", value: overallMasteryDistribution.excellent, color: "#4ade80" },
    { name: "熟练", value: overallMasteryDistribution.good, color: "#60a5fa" },
    { name: "基础", value: overallMasteryDistribution.adequate, color: "#facc15" },
    { name: "薄弱", value: overallMasteryDistribution.poor, color: "#f97316" },
    { name: "未掌握", value: overallMasteryDistribution.inadequate, color: "#ef4444" }
  ].filter(item => item.value > 0);
  
  return (
    <div className="space-y-4">
      {/* AI分析器对话框 */}
      {showAIAnalyzer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI知识点分析</CardTitle>
            <CardDescription>
              AI将分析作业内容，智能识别相关知识点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AIKnowledgePointAnalyzer
              homeworkId={homeworkId}
              existingKnowledgePoints={knowledgePoints}
              onExtractKnowledgePoints={handleAIExtractKnowledgePoints}
              onClose={() => setShowAIAnalyzer(false)}
            />
          </CardContent>
        </Card>
      )}
      
      {/* 主内容 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium flex items-center">
            <BrainCircuit className="h-4 w-4 mr-2" />
            知识点分析
          </h3>
          {!showAIAnalyzer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIAnalyzer(true)}
              disabled={isAiAnalyzing}
              className="flex items-center gap-1"
            >
              <Sparkles className="h-4 w-4" />
              AI分析知识点
            </Button>
          )}
        </div>
        
        {/* 显示加载动画 */}
        {isAiAnalyzing ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">
              AI正在分析作业内容，识别知识点...
            </p>
          </div>
        ) : (
          <>
            {/* 没有知识点的提示 */}
            {knowledgePoints.length === 0 ? (
              <div className="bg-muted/50 rounded-md p-8 text-center border border-dashed">
                <p className="text-sm text-muted-foreground">
                  尚未发现知识点，点击"AI分析知识点"按钮使用AI分析作业内容
                </p>
              </div>
            ) : (
              <>
                {/* 知识点分析标签页 */}
                <Tabs value={currentTab} onValueChange={(value: any) => setCurrentTab(value)} className="mt-2">
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">
                      <BookOpen className="h-4 w-4 mr-2" />
                      知识点总览
                    </TabsTrigger>
                    <TabsTrigger value="mastery">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      掌握情况
                    </TabsTrigger>
                    <TabsTrigger value="breakdown">
                      <Book className="h-4 w-4 mr-2" />
                      知识点详解
                    </TabsTrigger>
                  </TabsList>

                  {/* 知识点总览 */}
                  <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {knowledgePoints.map((kp) => (
                        <Card key={kp.id || `temp-${kp.name}`} className="bg-muted/30">
                          <CardHeader className="p-3 pb-2">
                            <CardTitle className="text-base">{kp.name}</CardTitle>
                            {kp.description && (
                              <CardDescription className="text-xs line-clamp-2">
                                {kp.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 掌握情况 */}
                  <TabsContent value="mastery">
                    <div className="flex justify-end mb-4">
                      <div className="bg-muted p-1 rounded-md flex">
                        <Button
                          variant={viewMode === "radar" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("radar")}
                          className="text-xs h-8"
                        >
                          雷达图
                        </Button>
                        <Button
                          variant={viewMode === "distribution" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("distribution")}
                          className="text-xs h-8"
                        >
                          分布图
                        </Button>
                      </div>
                    </div>
                    
                    {viewMode === "radar" ? (
                      // 雷达图展示
                      <div className="h-[350px]">
                        {radarChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart outerRadius={90} width={730} height={250} data={radarChartData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="name" />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} />
                              <Radar
                                name="班级平均掌握度"
                                dataKey="value"
                                stroke="#B9FF66"
                                fill="#B9FF66"
                                fillOpacity={0.6}
                              />
                              <Tooltip formatter={(value: any) => [`${Number(value).toFixed(1)}%`, "掌握度"]} />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">暂无知识点评估数据</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      // 分布图展示
                      <div className="h-[350px]">
                        {totalEvaluations > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={true}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                nameKey="name"
                                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} 次评估`, "数量"]} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">暂无知识点评估数据</p>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* 知识点详解 */}
                  <TabsContent value="breakdown">
                    <div className="space-y-4">
                      {knowledgePointMastery.map((kp) => (
                        <Card key={kp.id || `temp-${kp.name}`}>
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between">
                              <CardTitle className="text-base">{kp.name}</CardTitle>
                              {kp.evaluations > 0 ? (
                                <MasteryIndicator level={kp.avgMastery} />
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  无评估数据
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="text-sm">
                              {kp.description || "无详细描述"}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            {kp.evaluations > 0 ? (
                              <div className="mt-2">
                                <div className="text-xs text-muted-foreground mb-1">
                                  掌握情况分布 (共{kp.evaluations}人次评估)
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex">
                                  {kp.masteryDistribution.excellent > 0 && (
                                    <div 
                                      className="h-full bg-green-500" 
                                      style={{width: `${(kp.masteryDistribution.excellent / kp.evaluations) * 100}%`}}
                                      title={`精通: ${kp.masteryDistribution.excellent}人`}
                                    ></div>
                                  )}
                                  {kp.masteryDistribution.good > 0 && (
                                    <div 
                                      className="h-full bg-blue-500" 
                                      style={{width: `${(kp.masteryDistribution.good / kp.evaluations) * 100}%`}}
                                      title={`熟练: ${kp.masteryDistribution.good}人`}
                                    ></div>
                                  )}
                                  {kp.masteryDistribution.adequate > 0 && (
                                    <div 
                                      className="h-full bg-yellow-500" 
                                      style={{width: `${(kp.masteryDistribution.adequate / kp.evaluations) * 100}%`}}
                                      title={`基础: ${kp.masteryDistribution.adequate}人`}
                                    ></div>
                                  )}
                                  {kp.masteryDistribution.poor > 0 && (
                                    <div 
                                      className="h-full bg-orange-500" 
                                      style={{width: `${(kp.masteryDistribution.poor / kp.evaluations) * 100}%`}}
                                      title={`薄弱: ${kp.masteryDistribution.poor}人`}
                                    ></div>
                                  )}
                                  {kp.masteryDistribution.inadequate > 0 && (
                                    <div 
                                      className="h-full bg-red-500" 
                                      style={{width: `${(kp.masteryDistribution.inadequate / kp.evaluations) * 100}%`}}
                                      title={`未掌握: ${kp.masteryDistribution.inadequate}人`}
                                    ></div>
                                  )}
                                </div>
                                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                                  <span>未掌握</span>
                                  <span>掌握良好</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                此知识点尚未进行评估，在批改作业时评估学生对该知识点的掌握情况。
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
} 