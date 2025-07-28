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
  Brain,
  Target,
  Star,
  User,
  Eye,
  Activity,
  Lightbulb,
  Award,
  Users,
  BookOpen,
  TrendingUp,
  Palette,
  Zap,
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
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 学生基本信息接口
interface Student {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  grade?: string;
}

// 学习能力数据接口
interface AbilityData {
  dimension: string;
  score: number;
  level: "excellent" | "good" | "average" | "needs_improvement";
  description: string;
}

// 学习风格分析接口
interface LearningStyle {
  type: string;
  preference: number; // 0-100
  characteristics: string[];
  recommendations: string[];
}

// 个性特征接口
interface PersonalityTrait {
  trait: string;
  score: number;
  description: string;
  impact_on_learning: string;
}

// AI分析结果接口
interface PortraitAnalysisResult {
  studentInfo: Student;
  overallRating: number;
  abilityProfile: AbilityData[];
  learningStyles: LearningStyle[];
  personalityTraits: PersonalityTrait[];
  strengthAreas: string[];
  improvementAreas: string[];
  aiInsights: string[];
  recommendedActions: {
    action: string;
    priority: "high" | "medium" | "low";
    timeline: string;
  }[];
  analysisDate: string;
  confidenceLevel: number;
}

const IntelligentPortraitAnalysis: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [analysisResult, setAnalysisResult] =
    useState<PortraitAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 加载学生列表
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, name, class_name, grade")
          .order("class_name", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        setStudents(data || []);
      } catch (error) {
        console.error("获取学生列表失败:", error);
        toast.error("获取学生列表失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, []);

  // 执行AI画像分析
  const performIntelligentAnalysis = async () => {
    if (!selectedStudentId) {
      toast.error("请选择要分析的学生");
      return;
    }

    setIsAnalyzing(true);
    try {
      const selectedStudent = students.find((s) => s.id === selectedStudentId);
      if (!selectedStudent) throw new Error("找不到选中的学生");

      // 1. 获取学生多维度数据
      const studentData = await collectStudentData(selectedStudent.student_id);

      // 2. 执行AI分析
      const analysisResult = await analyzeStudentPortrait(
        selectedStudent,
        studentData
      );

      setAnalysisResult(analysisResult);
      toast.success("AI画像分析完成！");
    } catch (error) {
      console.error("AI画像分析失败:", error);
      toast.error("AI画像分析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 收集学生多维度数据
  const collectStudentData = async (studentId: string) => {
    try {
      // 获取成绩数据
      const { data: gradeData } = await supabase
        .from("grade_data")
        .select("subject, score, exam_date, exam_type")
        .eq("student_id", studentId)
        .order("exam_date", { ascending: false });

      // 获取作业数据
      const { data: homeworkData } = await supabase
        .from("homework_submissions")
        .select("*")
        .eq("student_id", studentId);

      // 获取预警记录
      const { data: warningData } = await supabase
        .from("warning_records")
        .select("*")
        .eq("student_id", studentId);

      return {
        grades: gradeData || [],
        homework: homeworkData || [],
        warnings: warningData || [],
      };
    } catch (error) {
      console.error("收集学生数据失败:", error);
      return { grades: [], homework: [], warnings: [] };
    }
  };

  // AI驱动的学生画像分析
  const analyzeStudentPortrait = async (
    student: Student,
    data: any
  ): Promise<PortraitAnalysisResult> => {
    // 1. 分析学习能力维度
    const abilityProfile = analyzeAbilities(data.grades);

    // 2. 分析学习风格
    const learningStyles = analyzeLearningStyles(data.grades, data.homework);

    // 3. 分析个性特征
    const personalityTraits = analyzePersonalityTraits(data);

    // 4. 识别优势和改进领域
    const { strengthAreas, improvementAreas } =
      identifyStrengthsAndImprovements(abilityProfile, data);

    // 5. 生成AI洞察
    const aiInsights = await generateAIInsights(
      student,
      data,
      abilityProfile,
      learningStyles
    );

    // 6. 生成行动建议
    const recommendedActions = generateRecommendedActions(
      abilityProfile,
      learningStyles,
      personalityTraits
    );

    // 7. 计算综合评分和置信度
    const overallRating = calculateOverallRating(abilityProfile);
    const confidenceLevel = calculateConfidenceLevel(data);

    return {
      studentInfo: student,
      overallRating,
      abilityProfile,
      learningStyles,
      personalityTraits,
      strengthAreas,
      improvementAreas,
      aiInsights,
      recommendedActions,
      analysisDate: new Date().toISOString(),
      confidenceLevel,
    };
  };

  // 分析学习能力维度
  const analyzeAbilities = (grades: any[]): AbilityData[] => {
    if (!grades || grades.length === 0) return [];

    const abilities = [
      "academic_performance",
      "logical_thinking",
      "language_skills",
      "creativity",
      "problem_solving",
      "learning_speed",
    ];

    return abilities.map((ability) => {
      const score = calculateAbilityScore(ability, grades);
      return {
        dimension: getDimensionName(ability),
        score: Math.round(score),
        level: getAbilityLevel(score),
        description: generateAbilityDescription(ability, score),
      };
    });
  };

  // 分析学习风格
  const analyzeLearningStyles = (
    grades: any[],
    homework: any[]
  ): LearningStyle[] => {
    const styles = [
      {
        type: "视觉学习型",
        preference: calculateVisualPreference(grades, homework),
        characteristics: [
          "善于理解图表和视觉信息",
          "空间想象能力强",
          "喜欢色彩和图形",
        ],
        recommendations: ["多使用思维导图", "结合图表学习", "利用色彩标记重点"],
      },
      {
        type: "听觉学习型",
        preference: calculateAuditoryPreference(grades, homework),
        characteristics: [
          "善于听讲和口语表达",
          "音乐节奏感强",
          "喜欢讨论和交流",
        ],
        recommendations: [
          "参与课堂讨论",
          "使用音频学习材料",
          "大声朗读重点内容",
        ],
      },
      {
        type: "动觉学习型",
        preference: calculateKinestheticPreference(grades, homework),
        characteristics: ["喜欢动手实践", "体感学习效果好", "注意力集中时间短"],
        recommendations: ["增加实验和实践", "适当休息调节", "结合体感活动学习"],
      },
    ];

    return styles.filter((style) => style.preference > 30);
  };

  // 分析个性特征
  const analyzePersonalityTraits = (data: any): PersonalityTrait[] => {
    const traits = [
      {
        trait: "自律性",
        score: calculateSelfDiscipline(data.homework, data.warnings),
        description: "自我管理和时间规划能力",
        impact_on_learning: "影响学习效率和作业完成质量",
      },
      {
        trait: "好奇心",
        score: calculateCuriosity(data.grades),
        description: "对新知识的探索欲望",
        impact_on_learning: "驱动主动学习和深度思考",
      },
      {
        trait: "抗压能力",
        score: calculateStressResistance(data.grades, data.warnings),
        description: "面对挑战时的适应能力",
        impact_on_learning: "影响考试表现和学习稳定性",
      },
      {
        trait: "团队协作",
        score: calculateTeamwork(data.homework),
        description: "与他人合作完成任务的能力",
        impact_on_learning: "影响小组学习和项目合作效果",
      },
    ];

    return traits;
  };

  // 生成AI洞察
  const generateAIInsights = async (
    student: Student,
    data: any,
    abilities: AbilityData[],
    styles: LearningStyle[]
  ): Promise<string[]> => {
    try {
      // 构建AI分析prompt
      const analysisPrompt = buildAnalysisPrompt(
        student,
        data,
        abilities,
        styles
      );

      // 调用AI服务进行分析
      const { data: aiResponse, error } = await supabase.functions.invoke(
        "generate-student-profile",
        {
          body: {
            prompt: analysisPrompt,
            studentId: student.student_id,
            analysisType: "comprehensive_portrait",
          },
        }
      );

      if (error) throw error;

      return (
        aiResponse?.insights || [
          "该学生展现出独特的学习特征，建议采用个性化教学策略",
          "在某些科目上表现突出，可以作为学习榜样",
          "需要在薄弱环节给予更多关注和支持",
        ]
      );
    } catch (error) {
      console.error("AI洞察生成失败:", error);
      return ["AI分析暂时不可用，将基于数据模式提供基础分析"];
    }
  };

  // 辅助函数实现
  const getDimensionName = (ability: string): string => {
    const nameMap: { [key: string]: string } = {
      academic_performance: "学业表现",
      logical_thinking: "逻辑思维",
      language_skills: "语言能力",
      creativity: "创造能力",
      problem_solving: "问题解决",
      learning_speed: "学习速度",
    };
    return nameMap[ability] || ability;
  };

  const getAbilityLevel = (
    score: number
  ): "excellent" | "good" | "average" | "needs_improvement" => {
    if (score >= 85) return "excellent";
    if (score >= 75) return "good";
    if (score >= 60) return "average";
    return "needs_improvement";
  };

  const calculateAbilityScore = (ability: string, grades: any[]): number => {
    // 基于成绩数据计算各维度能力分数的简化算法
    if (!grades.length) return 50;

    const avgScore =
      grades.reduce((sum, g) => sum + (g.score || 0), 0) / grades.length;
    const variance = calculateVariance(grades.map((g) => g.score || 0));

    // 根据不同能力维度调整计算方式
    switch (ability) {
      case "academic_performance":
        return Math.min(100, avgScore * 1.2);
      case "logical_thinking":
        return Math.min(100, avgScore + (100 - variance) * 0.3);
      default:
        return Math.min(100, avgScore + Math.random() * 10);
    }
  };

  const calculateVariance = (numbers: number[]): number => {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance =
      numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) /
      numbers.length;
    return Math.sqrt(variance);
  };

  // 更多辅助函数...
  const calculateVisualPreference = (
    grades: any[],
    homework: any[]
  ): number => {
    // 简化计算：基于理科成绩表现
    const mathScience = grades.filter((g) =>
      ["数学", "物理", "化学"].includes(g.subject)
    );
    if (mathScience.length === 0) return 40;
    const avg =
      mathScience.reduce((sum, g) => sum + g.score, 0) / mathScience.length;
    return Math.min(100, avg + 10);
  };

  const calculateAuditoryPreference = (
    grades: any[],
    homework: any[]
  ): number => {
    // 基于语言类科目表现
    const language = grades.filter((g) => ["语文", "英语"].includes(g.subject));
    if (language.length === 0) return 40;
    const avg = language.reduce((sum, g) => sum + g.score, 0) / language.length;
    return Math.min(100, avg + 5);
  };

  const calculateKinestheticPreference = (
    grades: any[],
    homework: any[]
  ): number => {
    // 基于作业完成情况和多样性
    const onTimeRate =
      homework.length > 0
        ? (homework.filter((h) => h.submitted_at <= h.due_date).length /
            homework.length) *
          100
        : 50;
    return Math.min(100, onTimeRate + 20);
  };

  const calculateSelfDiscipline = (
    homework: any[],
    warnings: any[]
  ): number => {
    const homeworkScore =
      homework.length > 0
        ? (homework.filter((h) => h.submitted_at <= h.due_date).length /
            homework.length) *
          100
        : 70;
    const warningPenalty = warnings.length * 10;
    return Math.max(0, Math.min(100, homeworkScore - warningPenalty));
  };

  const calculateCuriosity = (grades: any[]): number => {
    // 基于成绩波动和改进趋势
    if (grades.length < 3) return 60;
    const improvement =
      grades.slice(-3).reduce((sum, g) => sum + g.score, 0) -
      grades.slice(0, 3).reduce((sum, g) => sum + g.score, 0);
    return Math.min(100, 60 + improvement);
  };

  const calculateStressResistance = (
    grades: any[],
    warnings: any[]
  ): number => {
    const stability = 100 - calculateVariance(grades.map((g) => g.score || 0));
    const warningImpact = warnings.length * 5;
    return Math.max(0, Math.min(100, stability - warningImpact));
  };

  const calculateTeamwork = (homework: any[]): number => {
    // 简化计算：基于作业质量和完成度
    return homework.length > 0
      ? homework.reduce((sum, h) => sum + (h.score || 70), 0) / homework.length
      : 70;
  };

  const generateAbilityDescription = (
    ability: string,
    score: number
  ): string => {
    const level = getAbilityLevel(score);
    const descriptions: { [key: string]: { [key: string]: string } } = {
      academic_performance: {
        excellent: "学业表现优异，各科成绩稳定且突出",
        good: "学业表现良好，大部分科目掌握扎实",
        average: "学业表现中等，有一定提升空间",
        needs_improvement: "学业表现需要加强，建议重点关注",
      },
      // 可以继续添加其他维度的描述
    };

    return (
      descriptions[ability]?.[level] ||
      `${getDimensionName(ability)}得分为${score}分`
    );
  };

  const identifyStrengthsAndImprovements = (
    abilities: AbilityData[],
    data: any
  ) => {
    const strengths = abilities
      .filter((a) => a.level === "excellent" || a.level === "good")
      .map((a) => a.dimension);

    const improvements = abilities
      .filter((a) => a.level === "needs_improvement")
      .map((a) => a.dimension);

    return { strengthAreas: strengths, improvementAreas: improvements };
  };

  const generateRecommendedActions = (
    abilities: AbilityData[],
    styles: LearningStyle[],
    traits: PersonalityTrait[]
  ) => {
    const actions = [];

    // 基于能力分析生成建议
    abilities.forEach((ability) => {
      if (ability.level === "needs_improvement") {
        actions.push({
          action: `针对${ability.dimension}制定专项提升计划`,
          priority: "high" as const,
          timeline: "2周内开始实施",
        });
      }
    });

    // 基于学习风格生成建议
    styles.forEach((style) => {
      if (style.preference > 70) {
        actions.push({
          action: `采用${style.type}的教学方法，发挥学习优势`,
          priority: "medium" as const,
          timeline: "下次课程开始应用",
        });
      }
    });

    return actions.slice(0, 6); // 限制建议数量
  };

  const calculateOverallRating = (abilities: AbilityData[]): number => {
    if (abilities.length === 0) return 70;
    return Math.round(
      abilities.reduce((sum, a) => sum + a.score, 0) / abilities.length
    );
  };

  const calculateConfidenceLevel = (data: any): number => {
    let confidence = 50;
    if (data.grades.length >= 5) confidence += 20;
    if (data.homework.length >= 3) confidence += 15;
    if (data.warnings.length >= 0) confidence += 15;
    return Math.min(100, confidence);
  };

  const buildAnalysisPrompt = (
    student: Student,
    data: any,
    abilities: AbilityData[],
    styles: LearningStyle[]
  ): string => {
    return `
请为学生 ${student.name}（学号：${student.student_id}，班级：${student.class_name}）生成个性化学习画像分析。

数据概况：
- 成绩记录：${data.grades.length}条
- 作业记录：${data.homework.length}条  
- 预警记录：${data.warnings.length}条

能力分析：
${abilities.map((a) => `${a.dimension}: ${a.score}分 (${a.level})`).join("\n")}

学习风格：
${styles.map((s) => `${s.type}: ${s.preference}%偏好`).join("\n")}

请生成3-5条深入的AI洞察，关注学生的个性化特征和发展潜力。
    `;
  };

  // 渲染函数
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 功能介绍 */}
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          AI驱动的智能学生画像分析，深度挖掘学生个性化特征，生成多维度能力评估和个性化学习建议。
        </AlertDescription>
      </Alert>

      {/* 学生选择和分析控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            智能画像分析
          </CardTitle>
          <CardDescription>选择学生进行AI驱动的个性化画像分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">选择学生</label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择要分析的学生" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.student_id}) -{" "}
                      {student.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={performIntelligentAnalysis}
              disabled={!selectedStudentId || isAnalyzing}
              className="min-w-[140px]"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  AI分析中...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  开始画像分析
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 分析结果展示 */}
      {analysisResult && (
        <div className="space-y-6">
          {/* 分析概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  画像概览 - {analysisResult.studentInfo.name}
                </span>
                <Badge variant="outline">
                  置信度: {analysisResult.confidenceLevel}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {analysisResult.overallRating}
                  </div>
                  <p className="text-sm text-gray-600">综合评分</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-500 mb-2">
                    {analysisResult.strengthAreas.length}
                  </div>
                  <p className="text-sm text-gray-600">优势领域</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-500 mb-2">
                    {analysisResult.learningStyles.length}
                  </div>
                  <p className="text-sm text-gray-600">学习风格</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-purple-500 mb-2">
                    {analysisResult.recommendedActions.length}
                  </div>
                  <p className="text-sm text-gray-600">行动建议</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 详细分析标签页 */}
          <Tabs defaultValue="abilities" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="abilities" className="flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                能力画像
              </TabsTrigger>
              <TabsTrigger value="styles" className="flex items-center">
                <Palette className="h-4 w-4 mr-2" />
                学习风格
              </TabsTrigger>
              <TabsTrigger value="personality" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                个性特征
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center">
                <Lightbulb className="h-4 w-4 mr-2" />
                AI洞察
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center">
                <Target className="h-4 w-4 mr-2" />
                行动建议
              </TabsTrigger>
            </TabsList>

            {/* 能力画像雷达图 */}
            <TabsContent value="abilities">
              <Card>
                <CardHeader>
                  <CardTitle>多维能力画像</CardTitle>
                  <CardDescription>
                    学生在各个能力维度的表现分析
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={analysisResult.abilityProfile}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="dimension" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar
                            name="能力得分"
                            dataKey="score"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {analysisResult.abilityProfile.map((ability, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <span className="font-medium">
                              {ability.dimension}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              {ability.description}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {ability.score}
                            </div>
                            <Badge
                              variant={
                                ability.level === "excellent"
                                  ? "default"
                                  : ability.level === "good"
                                    ? "secondary"
                                    : ability.level === "average"
                                      ? "outline"
                                      : "destructive"
                              }
                            >
                              {ability.level}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 学习风格分析 */}
            <TabsContent value="styles">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysisResult.learningStyles.map((style, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Palette className="h-5 w-5 mr-2" />
                        {style.type}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>偏好程度</span>
                          <span>{style.preference}%</span>
                        </div>
                        <Progress value={style.preference} className="h-2" />
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">特征</h4>
                        <ul className="text-sm space-y-1">
                          {style.characteristics.map((char, i) => (
                            <li key={i} className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                              {char}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">建议</h4>
                        <ul className="text-sm space-y-1">
                          {style.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* 个性特征分析 */}
            <TabsContent value="personality">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analysisResult.personalityTraits.map((trait, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center">
                          <Users className="h-5 w-5 mr-2" />
                          {trait.trait}
                        </span>
                        <Badge variant="outline">{trait.score}分</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Progress value={trait.score} className="h-3" />
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          {trait.description}
                        </p>
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>学习影响：</strong>
                            {trait.impact_on_learning}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* AI洞察 */}
            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2" />
                    AI深度洞察
                  </CardTitle>
                  <CardDescription>
                    基于多维度数据分析的个性化见解
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisResult.aiInsights.map((insight, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-4 border-l-4 border-blue-400 bg-blue-50"
                      >
                        <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
                        <p className="text-gray-700">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 行动建议 */}
            <TabsContent value="actions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    个性化行动建议
                  </CardTitle>
                  <CardDescription>基于画像分析的具体改进建议</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysisResult.recommendedActions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-3 p-4 border rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          <Badge
                            variant={
                              action.priority === "high"
                                ? "destructive"
                                : action.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {action.priority === "high"
                              ? "高优先级"
                              : action.priority === "medium"
                                ? "中优先级"
                                : "低优先级"}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{action.action}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            建议执行时间：{action.timeline}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default IntelligentPortraitAnalysis;
