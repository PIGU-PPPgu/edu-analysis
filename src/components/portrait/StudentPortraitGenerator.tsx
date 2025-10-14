/**
 * 学生个体画像生成器 - 基于intelligentPortraitService
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Brain,
  Target,
  TrendingUp,
  BookOpen,
  Award,
  AlertCircle,
  Sparkles,
  BarChart3,
  Activity,
  Lightbulb,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  intelligentPortraitService,
  type StudentPortraitAnalysis,
} from "@/services/intelligentPortraitService";
import { toast } from "sonner";

interface StudentPortraitGeneratorProps {
  studentId: string;
  className?: string;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export function StudentPortraitGenerator({
  studentId,
  className,
}: StudentPortraitGeneratorProps) {
  const [portrait, setPortrait] = useState<StudentPortraitAnalysis | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePortrait = async () => {
    if (!studentId) {
      setError("请提供有效的学生ID");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result =
        await intelligentPortraitService.generateStudentPortrait(studentId);
      if (result) {
        setPortrait(result);
        toast.success("学生画像生成成功！");
      } else {
        setError("无法生成学生画像，请检查学生数据");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "生成画像时发生未知错误";
      setError(message);
      toast.error(`画像生成失败: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 准备学术能力雷达图数据
  const academicRadarData = portrait
    ? [
        {
          subject: "数学能力",
          value: portrait.academic_performance.math_ability,
        },
        {
          subject: "语言能力",
          value: portrait.academic_performance.language_ability,
        },
        {
          subject: "逻辑思维",
          value: portrait.academic_performance.logical_thinking,
        },
        {
          subject: "记忆能力",
          value: portrait.academic_performance.memory_retention,
        },
        {
          subject: "理解能力",
          value: portrait.academic_performance.comprehension_skills,
        },
        {
          subject: "应用能力",
          value: portrait.academic_performance.application_skills,
        },
      ]
    : [];

  // 准备学习特征数据
  const learningTraitsData = portrait
    ? [
        { name: "主动性", value: portrait.learning_characteristics.initiative },
        {
          name: "专注度",
          value: portrait.learning_characteristics.focus_level,
        },
        {
          name: "合作性",
          value: portrait.learning_characteristics.collaboration_tendency,
        },
        {
          name: "创新性",
          value: portrait.learning_characteristics.creativity_level,
        },
      ]
    : [];

  // 准备知识掌握分布数据
  const knowledgeMasteryData = portrait?.knowledge_mastery
    ? Object.entries(portrait.knowledge_mastery).map(([subject, level]) => ({
        name: subject,
        value: level,
      }))
    : [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-muted-foreground">
            正在分析学生数据，生成个性化画像...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            这可能需要几秒钟时间
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="text-center">
            <Button onClick={generatePortrait} variant="outline">
              重新生成画像
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!portrait) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">AI智能画像生成</h3>
          <p className="text-muted-foreground mb-6">
            基于学生的成绩数据和学习行为，生成个性化的学习画像
          </p>
          <Button onClick={generatePortrait}>
            <Brain className="h-4 w-4 mr-2" />
            生成学生画像
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基本信息概览 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {portrait.student_name} - 学习画像
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">ID: {portrait.student_id}</Badge>
              <Button variant="outline" size="sm" onClick={generatePortrait}>
                <Sparkles className="h-4 w-4 mr-1" />
                重新生成
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(portrait.overall_score)}
              </div>
              <div className="text-sm text-muted-foreground">综合评分</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(portrait.progress_trend * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">进步趋势</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {portrait.learning_characteristics.stability_score}%
              </div>
              <div className="text-sm text-muted-foreground">学习稳定性</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {portrait.risk_factors.length}
              </div>
              <div className="text-sm text-muted-foreground">风险因素</div>
            </div>
          </div>

          {/* AI洞察摘要 */}
          <Alert className="mb-4">
            <Brain className="h-4 w-4" />
            <AlertDescription>
              <strong>AI洞察：</strong>
              {portrait.ai_insights.learning_patterns.join("，")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* 详细分析标签页 */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="academic">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="academic">学术能力</TabsTrigger>
              <TabsTrigger value="learning">学习特征</TabsTrigger>
              <TabsTrigger value="knowledge">知识掌握</TabsTrigger>
              <TabsTrigger value="behavior">行为分析</TabsTrigger>
              <TabsTrigger value="recommendations">个性建议</TabsTrigger>
            </TabsList>

            <TabsContent value="academic" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                学术能力雷达图
              </h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={academicRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={false}
                    />
                    <Radar
                      name="能力评分"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="learning" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                学习特征分析
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">学习行为特征</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={learningTraitsData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">学习类型倾向</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>视觉学习</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={portrait.learning_style.visual}
                          className="w-20"
                        />
                        <span className="text-sm">
                          {portrait.learning_style.visual}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>听觉学习</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={portrait.learning_style.auditory}
                          className="w-20"
                        />
                        <span className="text-sm">
                          {portrait.learning_style.auditory}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>动觉学习</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={portrait.learning_style.kinesthetic}
                          className="w-20"
                        />
                        <span className="text-sm">
                          {portrait.learning_style.kinesthetic}%
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>阅读写作</span>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={portrait.learning_style.reading_writing}
                          className="w-20"
                        />
                        <span className="text-sm">
                          {portrait.learning_style.reading_writing}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                知识点掌握情况
              </h3>
              {knowledgeMasteryData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={knowledgeMasteryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {knowledgeMasteryData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无知识点掌握数据</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="behavior" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                行为模式分析
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">优势特征</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {portrait.strengths.map((strength, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-green-600"
                        >
                          <Award className="h-4 w-4" />
                          <span className="text-sm">{strength}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">需要改进</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {portrait.areas_for_improvement.map((area, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-orange-600"
                        >
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                个性化教学建议
              </h3>

              <div className="space-y-4">
                {portrait.teaching_recommendations.personalized_strategies.map(
                  (strategy, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium mb-1">
                              教学策略 {index + 1}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {strategy}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}

                {portrait.teaching_recommendations.intervention_suggestions
                  .length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-orange-600">
                        干预建议
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {portrait.teaching_recommendations.intervention_suggestions.map(
                          (suggestion, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                              <span className="text-sm">{suggestion}</span>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentPortraitGenerator;
