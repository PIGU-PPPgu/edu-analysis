/**
 *  AI成绩模式识别分析组件
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Eye,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  exam_date?: string;
  exam_title?: string;
}

interface PatternAnalysisProps {
  gradeData: GradeRecord[];
  className?: string;
}

interface LearningPattern {
  type: "improving" | "declining" | "stable" | "irregular";
  confidence: number;
  description: string;
  recommendation: string;
  students: string[];
}

const AIGradePatternAnalysis: React.FC<PatternAnalysisProps> = ({
  gradeData,
  className = "",
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // 计算趋势（线性回归斜率）
  const calculateTrend = (scores: number[]): number => {
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = scores.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * scores[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope * (n - 1); // 总变化量
  };

  // 计算稳定性（相关系数）
  const calculateStability = (scores: number[]): number => {
    const mean = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    const variance =
      scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      scores.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - stdDev / mean);
  };

  // AI模式识别分析
  const patternAnalysis = useMemo((): LearningPattern[] => {
    if (!gradeData || gradeData.length === 0) return [];

    // 按学生分组分析成绩趋势
    const studentGroups = gradeData.reduce(
      (acc, record) => {
        const key = record.student_id;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(record);
        return acc;
      },
      {} as Record<string, GradeRecord[]>
    );

    const patterns: LearningPattern[] = [];

    // 分析每个学生的成绩趋势
    Object.entries(studentGroups).forEach(([studentId, records]) => {
      if (records.length < 3) return; // 需要至少3次记录来识别模式

      const sortedRecords = records
        .filter((r) => r.score && r.exam_date)
        .sort(
          (a, b) =>
            new Date(a.exam_date!).getTime() - new Date(b.exam_date!).getTime()
        );

      if (sortedRecords.length < 3) return;

      const scores = sortedRecords.map((r) => r.score!);
      const trend = calculateTrend(scores);
      const stability = calculateStability(scores);

      // 根据趋势和稳定性分类模式
      let patternType: LearningPattern["type"];
      let confidence: number;
      let description: string;
      let recommendation: string;

      if (trend > 5 && stability > 0.7) {
        patternType = "improving";
        confidence = Math.min(95, 70 + trend);
        description = `成绩持续上升，平均提升${trend.toFixed(1)}分`;
        recommendation = "保持当前学习方法，可适当增加挑战性内容";
      } else if (trend < -5 && stability > 0.7) {
        patternType = "declining";
        confidence = Math.min(95, 70 + Math.abs(trend));
        description = `成绩持续下降，平均下降${Math.abs(trend).toFixed(1)}分`;
        recommendation = "需要立即干预，分析学习方法和学习环境";
      } else if (Math.abs(trend) < 3 && stability > 0.8) {
        patternType = "stable";
        confidence = Math.min(90, 60 + stability * 30);
        description = "成绩保持稳定，波动较小";
        recommendation = "可尝试新的学习策略来突破瓶颈";
      } else {
        patternType = "irregular";
        confidence = Math.min(85, 50 + (1 - stability) * 35);
        description = "成绩波动较大，学习状态不稳定";
        recommendation = "需要规范学习习惯，建立稳定的学习节奏";
      }

      // 查找同类型模式，如果存在则添加学生到该模式
      const existingPattern = patterns.find((p) => p.type === patternType);
      if (existingPattern) {
        existingPattern.students.push(records[0].name);
        existingPattern.confidence =
          (existingPattern.confidence + confidence) / 2;
      } else {
        patterns.push({
          type: patternType,
          confidence,
          description,
          recommendation,
          students: [records[0].name],
        });
      }
    });

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }, [gradeData, calculateTrend, calculateStability]);

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    // 模拟AI分析过程
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  const getPatternIcon = (type: LearningPattern["type"]) => {
    switch (type) {
      case "improving":
        return <TrendingUp className="w-5 h-5 text-[#B9FF66]" />;
      case "declining":
        return <TrendingDown className="w-5 h-5 text-[#FF6B6B]" />;
      case "stable":
        return <CheckCircle className="w-5 h-5 text-[#B9FF66]" />;
      case "irregular":
        return <AlertTriangle className="w-5 h-5 text-[#F7931E]" />;
    }
  };

  const getPatternColor = (type: LearningPattern["type"]) => {
    switch (type) {
      case "improving":
        return "bg-[#B9FF66]/20 border-[#B9FF66]";
      case "declining":
        return "bg-[#FF6B6B]/20 border-[#FF6B6B]";
      case "stable":
        return "bg-[#B9FF66]/15 border-[#B9FF66]";
      case "irregular":
        return "bg-[#F7931E]/20 border-[#F7931E]";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/*  AI分析控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                学生AI学习模式识别
              </span>
            </div>
            <Button
              onClick={startAnalysis}
              disabled={isAnalyzing}
              className="border-2 border-black bg-[#191A23] hover:bg-[#2A2B35] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  AI分析中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  启动AI分析
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Eye className="w-5 h-5 text-[#191A23]" />
            <p className="text-[#191A23] font-medium">
              AI将分析{" "}
              <span className="font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded">
                {gradeData.length}
              </span>{" "}
              条成绩记录， 识别学习模式和趋势，提供个性化建议
            </p>
          </div>
        </CardContent>
      </Card>

      {/*  AI分析结果 */}
      {(isAnalyzing || analysisComplete) && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI分析结果
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isAnalyzing ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-[#B9FF66] border-r-transparent mb-6"></div>
                <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">
                  {" "}
                  AI深度分析中
                </p>
                <p className="text-[#191A23]/70 font-medium">
                  正在运用机器学习算法识别学习模式...
                </p>
                <div className="mt-6 w-64 bg-[#F3F3F3] rounded-full h-3 mx-auto border-2 border-black">
                  <div
                    className="bg-[#B9FF66] h-full rounded-full transition-all duration-1000 animate-pulse"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert className="border-2 border-[#B9FF66] bg-[#B9FF66]/10">
                  <CheckCircle className="h-4 w-4 text-[#B9FF66]" />
                  <AlertDescription className="font-medium text-[#191A23]">
                    AI分析完成！识别出{" "}
                    <span className="font-bold">{patternAnalysis.length}</span>{" "}
                    种学习模式
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {patternAnalysis.map((pattern, index) => (
                    <Card
                      key={index}
                      className={`border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] ${getPatternColor(pattern.type)}`}
                    >
                      <CardHeader className="border-b-2 border-black py-4">
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getPatternIcon(pattern.type)}
                            <span className="font-black text-[#191A23] uppercase tracking-wide">
                              {pattern.type === "improving"
                                ? " 上升型"
                                : pattern.type === "declining"
                                  ? " 下降型"
                                  : pattern.type === "stable"
                                    ? "稳定型"
                                    : "波动型"}
                            </span>
                          </div>
                          <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold">
                            {pattern.confidence.toFixed(0)}% 置信度
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-[#191A23] mb-2">
                              {" "}
                              模式描述
                            </h4>
                            <p className="text-[#191A23]/80 font-medium">
                              {pattern.description}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-bold text-[#191A23] mb-2">
                              {" "}
                              AI建议
                            </h4>
                            <p className="text-[#191A23]/80 font-medium">
                              {pattern.recommendation}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-bold text-[#191A23] mb-2">
                              {" "}
                              涉及学生 ({pattern.students.length}人)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {pattern.students
                                .slice(0, 5)
                                .map((student, idx) => (
                                  <Badge
                                    key={idx}
                                    className="bg-[#191A23] text-white border border-black font-medium"
                                  >
                                    {student}
                                  </Badge>
                                ))}
                              {pattern.students.length > 5 && (
                                <Badge className="bg-[#F3F3F3] text-[#191A23] border border-black font-medium">
                                  +{pattern.students.length - 5}更多
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-bold text-[#191A23]">
                                AI置信度
                              </span>
                              <span className="text-sm font-bold text-[#191A23]">
                                {pattern.confidence.toFixed(0)}%
                              </span>
                            </div>
                            <Progress
                              value={pattern.confidence}
                              className="h-3 border-2 border-black bg-[#F3F3F3]"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIGradePatternAnalysis;
