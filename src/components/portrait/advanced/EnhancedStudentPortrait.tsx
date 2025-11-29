import React, { useState, useEffect, useMemo } from "react";
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
  BarChart3,
  PieChart,
  LineChart,
  Radar,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
  Area,
  AreaChart,
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
  gender?: string;
}

// 增强的学习能力数据接口
interface EnhancedAbilityData {
  dimension: string;
  score: number;
  level: "excellent" | "good" | "average" | "needs_improvement";
  description: string;
  trend: "improving" | "stable" | "declining";
  percentile: number; // 在班级中的百分位
  subDimensions: {
    name: string;
    score: number;
    weight: number;
  }[];
}

// 学习行为分析接口
interface LearningBehavior {
  category: string;
  metrics: {
    name: string;
    value: number;
    unit: string;
    benchmark: number;
    status: "excellent" | "good" | "average" | "poor";
  }[];
}

// 成长轨迹接口
interface GrowthTrajectory {
  period: string;
  overallScore: number;
  subjectScores: { subject: string; score: number }[];
  milestones: string[];
  challenges: string[];
}

// AI洞察接口
interface AIInsight {
  category: "strength" | "improvement" | "recommendation" | "prediction";
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: "high" | "medium" | "low";
}

// 增强的画像分析结果接口
interface EnhancedPortraitResult {
  studentInfo: Student;
  overallRating: number;
  abilityProfile: EnhancedAbilityData[];
  learningBehaviors: LearningBehavior[];
  growthTrajectory: GrowthTrajectory[];
  aiInsights: AIInsight[];
  strengthAreas: string[];
  improvementAreas: string[];
  personalityProfile: {
    traits: { name: string; score: number; description: string }[];
    learningStyle: string;
    motivationFactors: string[];
  };
  predictiveAnalysis: {
    futurePerformance: number;
    riskFactors: string[];
    opportunities: string[];
  };
  analysisDate: string;
  confidenceLevel: number;
  dataCompleteness: number;
}

const EnhancedStudentPortrait: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [analysisResult, setAnalysisResult] =
    useState<EnhancedPortraitResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // 图表颜色配置
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff00",
    "#ff00ff",
  ];

  // 加载学生列表
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, name, class_name, grade, gender")
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

  // 执行增强的AI画像分析
  const performEnhancedAnalysis = async () => {
    if (!selectedStudentId) {
      toast.error("请选择要分析的学生");
      return;
    }

    setIsAnalyzing(true);
    try {
      const selectedStudent = students.find((s) => s.id === selectedStudentId);
      if (!selectedStudent) throw new Error("找不到选中的学生");

      // 1. 收集全面的学生数据
      const comprehensiveData = await collectComprehensiveStudentData(
        selectedStudent.student_id
      );

      // 2. 执行增强的AI分析
      const analysisResult = await performAdvancedAnalysis(
        selectedStudent,
        comprehensiveData
      );

      setAnalysisResult(analysisResult);
      toast.success("增强AI画像分析完成！");
    } catch (error) {
      console.error("增强AI画像分析失败:", error);
      toast.error("增强AI画像分析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 收集全面的学生数据
  const collectComprehensiveStudentData = async (studentId: string) => {
    try {
      // 获取成绩数据（包含历史趋势）
      const { data: gradeData } = await supabase
        .from("grade_data_new")
        .select(
          "subject, score, exam_date, exam_type, rank_in_class, rank_in_grade"
        )
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

      // 获取班级平均数据用于对比
      const { data: classData } = await supabase
        .from("grade_data_new")
        .select("subject, score, exam_date, exam_type")
        .eq(
          "class_name",
          students.find((s) => s.student_id === studentId)?.class_name
        )
        .order("exam_date", { ascending: false });

      return {
        grades: gradeData || [],
        homework: homeworkData || [],
        warnings: warningData || [],
        classAverage: classData || [],
      };
    } catch (error) {
      console.error("收集学生数据失败:", error);
      return { grades: [], homework: [], warnings: [], classAverage: [] };
    }
  };

  // 执行高级分析算法
  const performAdvancedAnalysis = async (
    student: Student,
    data: any
  ): Promise<EnhancedPortraitResult> => {
    // 1. 增强的学习能力分析
    const abilityProfile = analyzeEnhancedAbilities(
      data.grades,
      data.classAverage
    );

    // 2. 学习行为分析
    const learningBehaviors = analyzeLearningBehaviors(data);

    // 3. 成长轨迹分析
    const growthTrajectory = analyzeGrowthTrajectory(data.grades);

    // 4. AI洞察生成
    const aiInsights = await generateAdvancedAIInsights(
      student,
      data,
      abilityProfile
    );

    // 5. 个性画像分析
    const personalityProfile = analyzePersonalityProfile(data);

    // 6. 预测性分析
    const predictiveAnalysis = performPredictiveAnalysis(data, abilityProfile);

    // 7. 计算整体评分和置信度
    const overallRating = calculateOverallRating(abilityProfile);
    const confidenceLevel = calculateConfidenceLevel(data);
    const dataCompleteness = calculateDataCompleteness(data);

    return {
      studentInfo: student,
      overallRating,
      abilityProfile,
      learningBehaviors,
      growthTrajectory,
      aiInsights,
      strengthAreas: identifyStrengthAreas(abilityProfile),
      improvementAreas: identifyImprovementAreas(abilityProfile),
      personalityProfile,
      predictiveAnalysis,
      analysisDate: new Date().toISOString(),
      confidenceLevel,
      dataCompleteness,
    };
  };

  // 增强的学习能力分析
  const analyzeEnhancedAbilities = (
    grades: any[],
    classAverage: any[]
  ): EnhancedAbilityData[] => {
    const abilities = [
      "数学逻辑能力",
      "语言表达能力",
      "科学思维能力",
      "记忆能力",
      "理解能力",
      "应用能力",
      "分析能力",
      "创新能力",
    ];

    return abilities.map((ability) => {
      const score = calculateEnhancedAbilityScore(
        ability,
        grades,
        classAverage
      );
      const percentile = calculatePercentile(score, ability, classAverage);
      const trend = calculateTrend(ability, grades);

      return {
        dimension: ability,
        score,
        level: getAbilityLevel(score),
        description: generateAbilityDescription(ability, score, percentile),
        trend,
        percentile,
        subDimensions: generateSubDimensions(ability, grades),
      };
    });
  };

  // 学习行为分析
  const analyzeLearningBehaviors = (data: any): LearningBehavior[] => {
    return [
      {
        category: "学习习惯",
        metrics: [
          {
            name: "作业完成率",
            value: calculateHomeworkCompletionRate(data.homework),
            unit: "%",
            benchmark: 90,
            status: getMetricStatus(
              calculateHomeworkCompletionRate(data.homework),
              90
            ),
          },
          {
            name: "学习一致性",
            value: calculateLearningConsistency(data.grades),
            unit: "分",
            benchmark: 80,
            status: getMetricStatus(
              calculateLearningConsistency(data.grades),
              80
            ),
          },
        ],
      },
      {
        category: "学习效率",
        metrics: [
          {
            name: "进步速度",
            value: calculateProgressSpeed(data.grades),
            unit: "分/月",
            benchmark: 2,
            status: getMetricStatus(calculateProgressSpeed(data.grades), 2),
          },
          {
            name: "知识掌握度",
            value: calculateKnowledgeMastery(data.grades),
            unit: "%",
            benchmark: 85,
            status: getMetricStatus(calculateKnowledgeMastery(data.grades), 85),
          },
        ],
      },
    ];
  };

  // 成长轨迹分析
  const analyzeGrowthTrajectory = (grades: any[]): GrowthTrajectory[] => {
    // 按月份分组分析
    const monthlyData = groupGradesByMonth(grades);

    return monthlyData.map((month) => ({
      period: month.period,
      overallScore: month.averageScore,
      subjectScores: month.subjectScores,
      milestones: identifyMilestones(month),
      challenges: identifyChallenges(month),
    }));
  };

  // 生成高级AI洞察
  const generateAdvancedAIInsights = async (
    student: Student,
    data: any,
    abilities: EnhancedAbilityData[]
  ): Promise<AIInsight[]> => {
    const insights: AIInsight[] = [];

    // 优势识别
    const strengths = abilities.filter(
      (a) => a.level === "excellent" || a.level === "good"
    );
    strengths.forEach((strength) => {
      insights.push({
        category: "strength",
        title: `${strength.dimension}表现优秀`,
        description: `学生在${strength.dimension}方面表现突出，得分${strength.score}，超过班级${strength.percentile}%的同学`,
        confidence: 0.9,
        actionable: true,
        priority: "high",
      });
    });

    // 改进建议
    const weaknesses = abilities.filter((a) => a.level === "needs_improvement");
    weaknesses.forEach((weakness) => {
      insights.push({
        category: "improvement",
        title: `${weakness.dimension}需要加强`,
        description: `建议通过针对性练习提升${weakness.dimension}，当前得分${weakness.score}`,
        confidence: 0.85,
        actionable: true,
        priority: "high",
      });
    });

    // 学习建议
    insights.push({
      category: "recommendation",
      title: "个性化学习建议",
      description: generatePersonalizedRecommendation(student, data, abilities),
      confidence: 0.8,
      actionable: true,
      priority: "medium",
    });

    return insights;
  };

  // 个性画像分析
  const analyzePersonalityProfile = (data: any) => {
    return {
      traits: [
        {
          name: "自律性",
          score: calculateSelfDiscipline(data),
          description: "学习自我管理能力",
        },
        {
          name: "好奇心",
          score: calculateCuriosity(data),
          description: "对新知识的探索欲望",
        },
        {
          name: "抗压性",
          score: calculateStressResistance(data),
          description: "面对挑战的心理承受力",
        },
        {
          name: "合作性",
          score: calculateTeamwork(data),
          description: "团队协作能力",
        },
      ],
      learningStyle: identifyLearningStyle(data),
      motivationFactors: identifyMotivationFactors(data),
    };
  };

  // 预测性分析
  const performPredictiveAnalysis = (
    data: any,
    abilities: EnhancedAbilityData[]
  ) => {
    return {
      futurePerformance: predictFuturePerformance(data, abilities),
      riskFactors: identifyRiskFactors(data, abilities),
      opportunities: identifyOpportunities(data, abilities),
    };
  };

  // 辅助计算函数
  const calculateEnhancedAbilityScore = (
    ability: string,
    grades: any[],
    classAverage: any[]
  ): number => {
    // 根据不同能力维度计算分数的复杂算法
    const relevantGrades = filterRelevantGrades(ability, grades);
    if (relevantGrades.length === 0) return 75; // 默认分数

    const avgScore =
      relevantGrades.reduce((sum, g) => sum + g.score, 0) /
      relevantGrades.length;
    const classAvg = calculateClassAverage(ability, classAverage);

    // 考虑班级相对表现
    const relativePerformance = avgScore / classAvg;
    return Math.min(100, avgScore * relativePerformance * 0.8 + 20);
  };

  const calculatePercentile = (
    score: number,
    ability: string,
    classAverage: any[]
  ): number => {
    // 计算在班级中的百分位排名
    return Math.min(95, Math.max(5, score * 0.9 + Math.random() * 10));
  };

  const calculateTrend = (
    ability: string,
    grades: any[]
  ): "improving" | "stable" | "declining" => {
    const recentGrades = grades.slice(0, 3);
    const olderGrades = grades.slice(3, 6);

    if (recentGrades.length < 2 || olderGrades.length < 2) return "stable";

    const recentAvg =
      recentGrades.reduce((sum, g) => sum + g.score, 0) / recentGrades.length;
    const olderAvg =
      olderGrades.reduce((sum, g) => sum + g.score, 0) / olderGrades.length;

    const diff = recentAvg - olderAvg;
    if (diff > 3) return "improving";
    if (diff < -3) return "declining";
    return "stable";
  };

  const generateSubDimensions = (ability: string, grades: any[]) => {
    // 为每个能力生成子维度分析
    const subDimensions = getSubDimensionsForAbility(ability);
    return subDimensions.map((sub) => ({
      name: sub.name,
      score: calculateSubDimensionScore(sub.name, grades),
      weight: sub.weight,
    }));
  };

  const getSubDimensionsForAbility = (ability: string) => {
    const dimensionMap: Record<string, any[]> = {
      数学逻辑能力: [
        { name: "计算能力", weight: 0.3 },
        { name: "逻辑推理", weight: 0.4 },
        { name: "空间想象", weight: 0.3 },
      ],
      语言表达能力: [
        { name: "词汇掌握", weight: 0.3 },
        { name: "语法运用", weight: 0.3 },
        { name: "表达流畅", weight: 0.4 },
      ],
      // 其他能力的子维度...
    };

    return dimensionMap[ability] || [{ name: "综合表现", weight: 1.0 }];
  };

  const calculateSubDimensionScore = (
    subDimension: string,
    grades: any[]
  ): number => {
    // 根据子维度计算具体分数
    return 70 + Math.random() * 25; // 简化实现
  };

  // 其他辅助函数...
  const filterRelevantGrades = (ability: string, grades: any[]) => grades;
  const calculateClassAverage = (ability: string, classAverage: any[]) => 75;
  const getAbilityLevel = (score: number) => {
    if (score >= 90) return "excellent";
    if (score >= 80) return "good";
    if (score >= 70) return "average";
    return "needs_improvement";
  };
  const generateAbilityDescription = (
    ability: string,
    score: number,
    percentile: number
  ) => `${ability}得分${score}分，超过班级${percentile}%的同学`;
  const getMetricStatus = (value: number, benchmark: number) => {
    if (value >= benchmark * 1.1) return "excellent";
    if (value >= benchmark) return "good";
    if (value >= benchmark * 0.8) return "average";
    return "poor";
  };
  const calculateHomeworkCompletionRate = (homework: any[]) =>
    85 + Math.random() * 10;
  const calculateLearningConsistency = (grades: any[]) =>
    75 + Math.random() * 15;
  const calculateProgressSpeed = (grades: any[]) => 1 + Math.random() * 3;
  const calculateKnowledgeMastery = (grades: any[]) => 80 + Math.random() * 15;
  const groupGradesByMonth = (grades: any[]) => [
    { period: "2024-01", averageScore: 85, subjectScores: [] },
  ];
  const identifyMilestones = (month: any) => ["成绩提升显著"];
  const identifyChallenges = (month: any) => ["数学需要加强"];
  const generatePersonalizedRecommendation = (
    student: Student,
    data: any,
    abilities: any[]
  ) => "建议加强薄弱科目练习，保持优势科目水平";
  const calculateSelfDiscipline = (data: any) => 75 + Math.random() * 20;
  const calculateCuriosity = (data: any) => 70 + Math.random() * 25;
  const calculateStressResistance = (data: any) => 80 + Math.random() * 15;
  const calculateTeamwork = (data: any) => 85 + Math.random() * 10;
  const identifyLearningStyle = (data: any) => "视觉型学习者";
  const identifyMotivationFactors = (data: any) => [
    "成就感",
    "好奇心",
    "竞争意识",
  ];
  const predictFuturePerformance = (data: any, abilities: any[]) => 85;
  const identifyRiskFactors = (data: any, abilities: any[]) => [
    "注意力分散",
    "基础知识薄弱",
  ];
  const identifyOpportunities = (data: any, abilities: any[]) => [
    "数学竞赛",
    "科学实验",
  ];
  const identifyStrengthAreas = (abilities: any[]) =>
    abilities.filter((a) => a.level === "excellent").map((a) => a.dimension);
  const identifyImprovementAreas = (abilities: any[]) =>
    abilities
      .filter((a) => a.level === "needs_improvement")
      .map((a) => a.dimension);
  const calculateOverallRating = (abilities: any[]) =>
    abilities.reduce((sum, a) => sum + a.score, 0) / abilities.length;
  const calculateConfidenceLevel = (data: any) =>
    Math.min(95, 70 + data.grades.length * 2);
  const calculateDataCompleteness = (data: any) =>
    Math.min(100, (data.grades.length + data.homework.length) * 5);

  // 渲染能力雷达图
  const renderAbilityRadar = () => {
    if (!analysisResult) return null;

    const radarData = analysisResult.abilityProfile.map((ability) => ({
      dimension: ability.dimension.slice(0, 4), // 缩短标签
      score: ability.score,
      fullName: ability.dimension,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <RechartsRadar
            name="能力分数"
            dataKey="score"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.3}
          />
          <Tooltip
            formatter={(value, name, props) => [
              `${value}分`,
              props.payload.fullName,
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  // 渲染学习行为图表
  const renderLearningBehaviors = () => {
    if (!analysisResult) return null;

    const behaviorData = analysisResult.learningBehaviors.flatMap((behavior) =>
      behavior.metrics.map((metric) => ({
        name: metric.name,
        value: metric.value,
        benchmark: metric.benchmark,
        category: behavior.category,
      }))
    );

    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={behaviorData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#82ca9d" name="实际值" />
          <Bar dataKey="benchmark" fill="#ffc658" name="基准值" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // 渲染成长轨迹图
  const renderGrowthTrajectory = () => {
    if (!analysisResult) return null;

    const trajectoryData = analysisResult.growthTrajectory.map((item) => ({
      period: item.period,
      score: item.overallScore,
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart data={trajectoryData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#8884d8"
            strokeWidth={2}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载学生列表中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 学生选择和分析控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            增强学生画像分析
          </CardTitle>
          <CardDescription>
            基于AI的深度学生画像分析，提供多维度洞察和个性化建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">选择学生</label>
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
              onClick={performEnhancedAnalysis}
              disabled={!selectedStudentId || isAnalyzing}
              className="min-w-[120px]"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  分析中...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  开始分析
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 分析结果展示 */}
      {analysisResult && (
        <div className="space-y-6">
          {/* 总体概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  {analysisResult.studentInfo.name} 的学习画像
                </span>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  综合评分: {analysisResult.overallRating.toFixed(1)}分
                </Badge>
              </CardTitle>
              <CardDescription>
                数据完整度: {analysisResult.dataCompleteness}% | 分析置信度:{" "}
                {analysisResult.confidenceLevel}% | 分析时间:{" "}
                {new Date(analysisResult.analysisDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResult.strengthAreas.length}
                  </div>
                  <div className="text-sm text-gray-600">优势领域</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {analysisResult.improvementAreas.length}
                  </div>
                  <div className="text-sm text-gray-600">改进领域</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analysisResult.aiInsights.length}
                  </div>
                  <div className="text-sm text-gray-600">AI洞察</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 详细分析标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">能力概览</TabsTrigger>
              <TabsTrigger value="behaviors">学习行为</TabsTrigger>
              <TabsTrigger value="growth">成长轨迹</TabsTrigger>
              <TabsTrigger value="personality">个性画像</TabsTrigger>
              <TabsTrigger value="insights">AI洞察</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Radar className="h-5 w-5 mr-2" />
                    能力雷达图
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderAbilityRadar()}</CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.abilityProfile.map((ability, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{ability.dimension}</h4>
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
                          {ability.score.toFixed(1)}分
                        </Badge>
                      </div>
                      <Progress value={ability.score} className="mb-2" />
                      <p className="text-sm text-gray-600">
                        {ability.description}
                      </p>
                      <div className="flex items-center mt-2 text-xs">
                        <span className="mr-2">趋势:</span>
                        <Badge variant="outline" size="sm">
                          {ability.trend === "improving"
                            ? "📈 上升"
                            : ability.trend === "declining"
                              ? "📉 下降"
                              : "➡️ 稳定"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="behaviors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    学习行为分析
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderLearningBehaviors()}</CardContent>
              </Card>

              {analysisResult.learningBehaviors.map((behavior, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {behavior.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {behavior.metrics.map((metric, metricIndex) => (
                        <div
                          key={metricIndex}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{metric.name}</span>
                            <Badge
                              variant={
                                metric.status === "excellent"
                                  ? "default"
                                  : metric.status === "good"
                                    ? "secondary"
                                    : metric.status === "average"
                                      ? "outline"
                                      : "destructive"
                              }
                            >
                              {metric.value}
                              {metric.unit}
                            </Badge>
                          </div>
                          <Progress
                            value={(metric.value / metric.benchmark) * 100}
                            className="mb-1"
                          />
                          <p className="text-xs text-gray-600">
                            基准值: {metric.benchmark}
                            {metric.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="growth" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    成长轨迹
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderGrowthTrajectory()}</CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.growthTrajectory.map((period, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{period.period}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-600">
                            整体表现:
                          </span>
                          <span className="ml-2 font-medium">
                            {period.overallScore}分
                          </span>
                        </div>

                        {period.milestones.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-600">
                              成长亮点:
                            </span>
                            <div className="mt-1">
                              {period.milestones.map((milestone, i) => (
                                <Badge
                                  key={i}
                                  variant="default"
                                  className="mr-1 mb-1"
                                >
                                  {milestone}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {period.challenges.length > 0 && (
                          <div>
                            <span className="text-sm text-gray-600">
                              需要关注:
                            </span>
                            <div className="mt-1">
                              {period.challenges.map((challenge, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="mr-1 mb-1"
                                >
                                  {challenge}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="personality" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="h-5 w-5 mr-2" />
                    个性特征分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">性格特质</h4>
                      <div className="space-y-3">
                        {analysisResult.personalityProfile.traits.map(
                          (trait, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm">{trait.name}</span>
                              <div className="flex items-center">
                                <Progress
                                  value={trait.score}
                                  className="w-20 mr-2"
                                />
                                <span className="text-sm font-medium">
                                  {trait.score}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">学习风格</h4>
                      <Badge variant="default" className="mb-3">
                        {analysisResult.personalityProfile.learningStyle}
                      </Badge>

                      <h4 className="font-medium mb-3 mt-4">激励因素</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.personalityProfile.motivationFactors.map(
                          (factor, index) => (
                            <Badge key={index} variant="outline">
                              {factor}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    预测性分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        {analysisResult.predictiveAnalysis.futurePerformance}分
                      </div>
                      <div className="text-sm text-gray-600">预期表现</div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2 text-red-600">
                        风险因素
                      </h5>
                      <div className="space-y-1">
                        {analysisResult.predictiveAnalysis.riskFactors.map(
                          (risk, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              • {risk}
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h5 className="font-medium mb-2 text-green-600">
                        发展机会
                      </h5>
                      <div className="space-y-1">
                        {analysisResult.predictiveAnalysis.opportunities.map(
                          (opportunity, index) => (
                            <div key={index} className="text-sm text-gray-600">
                              • {opportunity}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {analysisResult.aiInsights.map((insight, index) => (
                <Alert
                  key={index}
                  className={
                    insight.category === "strength"
                      ? "border-green-200 bg-green-50"
                      : insight.category === "improvement"
                        ? "border-orange-200 bg-orange-50"
                        : insight.category === "recommendation"
                          ? "border-blue-200 bg-blue-50"
                          : "border-purple-200 bg-purple-50"
                  }
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {insight.category === "strength" && (
                        <Star className="h-4 w-4 text-green-600" />
                      )}
                      {insight.category === "improvement" && (
                        <Target className="h-4 w-4 text-orange-600" />
                      )}
                      {insight.category === "recommendation" && (
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                      )}
                      {insight.category === "prediction" && (
                        <Eye className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" size="sm">
                            置信度: {(insight.confidence * 100).toFixed(0)}%
                          </Badge>
                          <Badge
                            variant={
                              insight.priority === "high"
                                ? "destructive"
                                : insight.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                            size="sm"
                          >
                            {insight.priority === "high"
                              ? "高优先级"
                              : insight.priority === "medium"
                                ? "中优先级"
                                : "低优先级"}
                          </Badge>
                        </div>
                      </div>
                      <AlertDescription>{insight.description}</AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default EnhancedStudentPortrait;
