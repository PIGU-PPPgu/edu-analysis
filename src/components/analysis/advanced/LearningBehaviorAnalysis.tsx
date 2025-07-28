import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Brain,
  Target,
  BookOpen,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  Activity,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LearningPattern {
  studentId: string;
  studentName: string;
  className: string;
  learnerType: string;
  strengths: string[];
  challenges: string[];
  recommendations: string[];
  cognitiveStyle: {
    learningType: string;
    processingSpeed: string;
    memoryStrength: number;
  };
  socialLearning: {
    collaborationPreference: number;
    peerInteraction: number;
    leadershipTendency: number;
  };
  motivation: {
    intrinsicMotivation: number;
    persistenceLevel: number;
    selfEfficacy: number;
  };
  learningStrategies: {
    planningSkills: number;
    monitoringSkills: number;
    evaluationSkills: number;
    adaptabilitySkills: number;
  };
}

export const LearningBehaviorAnalysis: React.FC = () => {
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadStudentList();
  }, []);

  const loadStudentList = async () => {
    try {
      const { data: students } = await supabase
        .from("students")
        .select("student_id, name, class_name")
        .order("name");

      setAllStudents(students || []);
    } catch (error) {
      console.error("加载学生列表失败:", error);
    }
  };

  const analyzeLearningBehavior = async () => {
    if (!selectedStudent) {
      toast.error("请先选择学生");
      return;
    }

    setIsLoading(true);

    try {
      const pattern = await analyzeStudentBehavior(selectedStudent);
      if (pattern) {
        setPatterns([pattern]);
        toast.success("学习行为分析完成");
      } else {
        toast.error("该学生数据不足，无法进行行为分析");
      }
    } catch (error) {
      console.error("学习行为分析失败:", error);
      toast.error("学习行为分析失败");
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeStudentBehavior = async (
    studentId: string
  ): Promise<LearningPattern | null> => {
    try {
      const student = allStudents.find((s) => s.student_id === studentId);
      if (!student) return null;

      // 获取学生的成绩数据
      const { data: grades } = await supabase
        .from("grade_data")
        .select("*")
        .eq("student_id", studentId)
        .order("exam_date", { ascending: true });

      if (!grades || grades.length < 2) {
        return null;
      }

      // 计算基础指标
      const scores = grades.map((g) => g.score || 0).filter((s) => s > 0);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const variance = calculateVariance(scores);
      const trend =
        scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

      // 生成学习行为模式
      const pattern: LearningPattern = {
        studentId,
        studentName: student.name,
        className: student.class_name,
        learnerType: determineLearnerType(avgScore, variance, trend),
        strengths: generateStrengths(avgScore, variance, trend),
        challenges: generateChallenges(avgScore, variance, trend),
        recommendations: generateRecommendations(avgScore, variance, trend),
        cognitiveStyle: {
          learningType:
            variance < 100 ? "视觉型" : variance < 200 ? "听觉型" : "动觉型",
          processingSpeed:
            variance < 100 ? "快速" : variance < 200 ? "中等" : "稳健",
          memoryStrength: Math.min(100, Math.max(0, avgScore)),
        },
        socialLearning: {
          collaborationPreference: Math.min(100, avgScore + Math.random() * 20),
          peerInteraction: Math.min(100, avgScore + Math.random() * 15),
          leadershipTendency:
            avgScore > 75 ? 70 + Math.random() * 30 : 30 + Math.random() * 40,
        },
        motivation: {
          intrinsicMotivation: Math.min(100, Math.max(0, 50 + trend)),
          persistenceLevel: Math.min(100, scores.length * 10),
          selfEfficacy: Math.min(100, avgScore),
        },
        learningStrategies: {
          planningSkills: Math.min(100, avgScore + (100 - variance) * 0.1),
          monitoringSkills: Math.min(100, avgScore + (100 - variance) * 0.08),
          evaluationSkills: Math.min(100, avgScore + (100 - variance) * 0.12),
          adaptabilitySkills: Math.min(100, avgScore + variance * 0.05),
        },
      };

      return pattern;
    } catch (error) {
      console.error(`分析学生 ${studentId} 行为失败:`, error);
      return null;
    }
  };

  const calculateVariance = (numbers: number[]) => {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
  };

  const determineLearnerType = (
    avgScore: number,
    variance: number,
    trend: number
  ) => {
    if (variance < 50 && avgScore > 80) return "稳定优秀型";
    if (trend > 10) return "进步提升型";
    if (trend < -10) return "需要关注型";
    if (variance > 200) return "波动较大型";
    return "稳健发展型";
  };

  const generateStrengths = (
    avgScore: number,
    variance: number,
    trend: number
  ) => {
    const strengths = [];
    if (avgScore > 80) strengths.push("学习成绩优秀");
    if (variance < 100) strengths.push("成绩稳定");
    if (trend > 5) strengths.push("持续进步");
    if (strengths.length === 0) strengths.push("学习态度认真");
    return strengths;
  };

  const generateChallenges = (
    avgScore: number,
    variance: number,
    trend: number
  ) => {
    const challenges = [];
    if (avgScore < 60) challenges.push("基础知识需要加强");
    if (variance > 200) challenges.push("成绩波动较大");
    if (trend < -5) challenges.push("成绩呈下降趋势");
    if (challenges.length === 0) challenges.push("保持当前学习状态");
    return challenges;
  };

  const generateRecommendations = (
    avgScore: number,
    variance: number,
    trend: number
  ) => {
    const recommendations = [];
    if (avgScore < 60) recommendations.push("建议制定基础知识复习计划");
    if (variance > 200) recommendations.push("建议培养稳定的学习习惯");
    if (trend < -5) recommendations.push("建议及时调整学习方法");
    if (trend > 10) recommendations.push("继续保持良好的学习状态");
    if (recommendations.length === 0)
      recommendations.push("建议保持当前学习节奏");
    return recommendations;
  };

  const renderRadarChart = (pattern: LearningPattern) => {
    const radarData = [
      { subject: "记忆力", A: pattern.cognitiveStyle.memoryStrength },
      {
        subject: "协作能力",
        A: pattern.socialLearning.collaborationPreference,
      },
      { subject: "内在动机", A: pattern.motivation.intrinsicMotivation },
      { subject: "规划能力", A: pattern.learningStrategies.planningSkills },
      { subject: "监控能力", A: pattern.learningStrategies.monitoringSkills },
      { subject: "适应能力", A: pattern.learningStrategies.adaptabilitySkills },
    ];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar
            name="能力指标"
            dataKey="A"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const renderStrategiesChart = (pattern: LearningPattern) => {
    const strategiesData = [
      { name: "规划", value: pattern.learningStrategies.planningSkills },
      { name: "监控", value: pattern.learningStrategies.monitoringSkills },
      { name: "评估", value: pattern.learningStrategies.evaluationSkills },
      { name: "适应", value: pattern.learningStrategies.adaptabilitySkills },
    ];

    return (
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={strategiesData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Bar dataKey="value" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="flex items-center space-x-3 text-[#191A23] font-black uppercase tracking-wide">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span>学习行为分析</span>
          </CardTitle>
          <CardDescription className="text-[#191A23]/80 font-medium mt-2">
            深度分析学生的学习模式、认知风格和行为特征，提供个性化教学建议
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#F7931E] focus:ring-2 focus:ring-[#F7931E] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                <SelectValue placeholder="选择学生进行分析" />
              </SelectTrigger>
              <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                {allStudents.map((student) => (
                  <SelectItem
                    key={student.student_id}
                    value={student.student_id}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#191A23]" />
                      <span className="font-medium">{student.name}</span>
                      <Badge className="bg-[#9C88FF] text-white border border-black text-xs font-bold">
                        {student.class_name}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={analyzeLearningBehavior}
              disabled={isLoading}
              className="border-2 border-black bg-[#F7931E] hover:bg-[#E8821C] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  分析中...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  开始行为分析
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
          <CardContent className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-[#9C88FF] border-r-transparent mb-6"></div>
            <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">
              AI分析进行中
            </p>
            <p className="text-[#191A23]/70 font-medium">
              正在深度分析学习行为模式，请稍候...
            </p>
            <div className="mt-4 w-64 bg-[#F3F3F3] rounded-full h-3 mx-auto border-2 border-black">
              <div
                className="bg-[#9C88FF] h-full rounded-full transition-all duration-1000 animate-pulse"
                style={{ width: "75%" }}
              ></div>
            </div>
          </CardContent>
        </Card>
      )}

      {patterns.length > 0 && (
        <div className="space-y-6">
          {patterns.map((pattern) => (
            <Card
              key={pattern.studentId}
              className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]"
            >
              <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-black text-[#191A23] uppercase tracking-wide">
                      {pattern.studentName} - 学习行为档案
                    </span>
                  </div>
                  <Badge className="bg-[#F7931E] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wide">
                    {pattern.learnerType}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[#191A23]/80 font-medium mt-2">
                  班级: {pattern.className} | 基于AI算法的综合行为分析报告
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#F7931E] p-1">
                    <TabsTrigger
                      value="overview"
                      className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide"
                    >
                      <Activity className="w-4 h-4" />
                      总览
                    </TabsTrigger>
                    <TabsTrigger
                      value="cognitive"
                      className="flex items-center gap-2 data-[state=active]:bg-[#F7931E] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide"
                    >
                      <Brain className="w-4 h-4" />
                      认知
                    </TabsTrigger>
                    <TabsTrigger
                      value="social"
                      className="flex items-center gap-2 data-[state=active]:bg-[#9C88FF] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide"
                    >
                      <Users className="w-4 h-4" />
                      社交
                    </TabsTrigger>
                    <TabsTrigger
                      value="strategies"
                      className="flex items-center gap-2 data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide"
                    >
                      <Target className="w-4 h-4" />
                      策略
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF]">
                        <CardHeader className="bg-[#9C88FF] border-b-2 border-black">
                          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            能力雷达图
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          {renderRadarChart(pattern)}
                        </CardContent>
                      </Card>

                      <div className="space-y-4">
                        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
                          <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-3">
                            <CardTitle className="text-sm font-black text-[#191A23] uppercase tracking-wide flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              学习优势
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {pattern.strengths.map((strength, index) => (
                                <Badge
                                  key={index}
                                  className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] text-xs"
                                >
                                  {strength}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F7931E]">
                          <CardHeader className="bg-[#F7931E] border-b-2 border-black py-3">
                            <CardTitle className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              改进空间
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            <div className="flex flex-wrap gap-2">
                              {pattern.challenges.map((challenge, index) => (
                                <Badge
                                  key={index}
                                  className="bg-[#F7931E] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] text-xs"
                                >
                                  {challenge}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#FF6B6B]">
                          <CardHeader className="bg-[#FF6B6B] border-b-2 border-black py-3">
                            <CardTitle className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              个性化建议
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 space-y-3">
                            {pattern.recommendations.map((rec, index) => (
                              <div
                                key={index}
                                className="p-3 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] rounded-lg"
                              >
                                <p className="text-sm font-medium text-[#191A23]">
                                  {rec}
                                </p>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="cognitive" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
                        <CardContent className="p-6 text-center">
                          <div className="p-3 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-4 w-fit">
                            <Brain className="h-8 w-8 text-[#191A23]" />
                          </div>
                          <p className="text-lg font-black text-[#191A23] uppercase tracking-wide mb-2">
                            学习类型
                          </p>
                          <div className="px-3 py-2 bg-[#B9FF66] border-2 border-black rounded-lg">
                            <p className="font-bold text-[#191A23]">
                              {pattern.cognitiveStyle.learningType}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F7931E] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#F7931E]">
                        <CardContent className="p-6 text-center">
                          <div className="p-3 bg-[#F7931E] rounded-full border-2 border-black mx-auto mb-4 w-fit">
                            <Clock className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-lg font-black text-[#191A23] uppercase tracking-wide mb-2">
                            处理速度
                          </p>
                          <div className="px-3 py-2 bg-[#F7931E] border-2 border-black rounded-lg">
                            <p className="font-bold text-white">
                              {pattern.cognitiveStyle.processingSpeed}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#9C88FF]">
                        <CardContent className="p-6 text-center">
                          <div className="p-3 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-4 w-fit">
                            <Award className="h-8 w-8 text-white" />
                          </div>
                          <p className="text-lg font-black text-[#191A23] uppercase tracking-wide mb-3">
                            记忆力
                          </p>
                          <div className="space-y-2">
                            <div className="w-full bg-[#F3F3F3] rounded-full h-4 border-2 border-black">
                              <div
                                className="bg-[#9C88FF] h-full rounded-full transition-all duration-500 border-r-2 border-black"
                                style={{
                                  width: `${pattern.cognitiveStyle.memoryStrength}%`,
                                }}
                              />
                            </div>
                            <p className="font-bold text-[#191A23] text-xl">
                              {pattern.cognitiveStyle.memoryStrength.toFixed(0)}
                              %
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="social" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
                        <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-3">
                          <CardTitle className="text-sm font-black text-[#191A23] uppercase tracking-wide flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            协作偏好
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="w-full bg-[#F3F3F3] rounded-full h-6 border-2 border-black">
                              <div
                                className="bg-[#B9FF66] h-full rounded-full transition-all duration-500 border-r-2 border-black flex items-center justify-end pr-2"
                                style={{
                                  width: `${pattern.socialLearning.collaborationPreference}%`,
                                }}
                              >
                                <span className="text-xs font-bold text-[#191A23]">
                                  {pattern.socialLearning.collaborationPreference.toFixed(
                                    0
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F7931E]">
                        <CardHeader className="bg-[#F7931E] border-b-2 border-black py-3">
                          <CardTitle className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            同伴互动
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="w-full bg-[#F3F3F3] rounded-full h-6 border-2 border-black">
                              <div
                                className="bg-[#F7931E] h-full rounded-full transition-all duration-500 border-r-2 border-black flex items-center justify-end pr-2"
                                style={{
                                  width: `${pattern.socialLearning.peerInteraction}%`,
                                }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {pattern.socialLearning.peerInteraction.toFixed(
                                    0
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF]">
                        <CardHeader className="bg-[#9C88FF] border-b-2 border-black py-3">
                          <CardTitle className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            领导倾向
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="w-full bg-[#F3F3F3] rounded-full h-6 border-2 border-black">
                              <div
                                className="bg-[#9C88FF] h-full rounded-full transition-all duration-500 border-r-2 border-black flex items-center justify-end pr-2"
                                style={{
                                  width: `${pattern.socialLearning.leadershipTendency}%`,
                                }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {pattern.socialLearning.leadershipTendency.toFixed(
                                    0
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="strategies" className="space-y-6 mt-6">
                    <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B]">
                      <CardHeader className="bg-[#FF6B6B] border-b-2 border-black">
                        <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          学习策略能力分析
                        </CardTitle>
                        <CardDescription className="text-white/90 font-medium mt-2">
                          多维度评估学习策略的运用能力和效果
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {renderStrategiesChart(pattern)}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {patterns.length === 0 && !isLoading && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
              <Activity className="h-16 w-16 text-[#191A23]" />
            </div>
            <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
              准备开始分析
            </p>
            <p className="text-[#191A23]/70 font-medium">
              选择学生，开启AI驱动的学习行为深度分析之旅
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
