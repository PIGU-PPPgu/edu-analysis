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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  BarChart3,
  TrendingUp,
  Target,
  Award,
  Brain,
  Activity,
  Zap,
  Plus,
  X,
  ArrowUpDown,
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
  LineChart,
  Line,
  ScatterChart,
  Scatter,
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

// 对比分析数据接口
interface ComparisonData {
  student: Student;
  abilities: {
    dimension: string;
    score: number;
    level: string;
    percentile: number;
  }[];
  performance: {
    overallScore: number;
    subjectScores: { subject: string; score: number }[];
    trend: "improving" | "stable" | "declining";
    consistency: number;
  };
  behaviors: {
    homeworkCompletion: number;
    classParticipation: number;
    learningConsistency: number;
    progressSpeed: number;
  };
  strengths: string[];
  improvements: string[];
  ranking: {
    classRank: number;
    gradeRank: number;
    totalStudents: number;
  };
}

// 对比洞察接口
interface ComparisonInsight {
  type:
    | "strength_gap"
    | "improvement_opportunity"
    | "similar_pattern"
    | "complementary_skills";
  title: string;
  description: string;
  students: string[];
  actionable: boolean;
  priority: "high" | "medium" | "low";
}

const StudentPortraitComparison: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [comparisonInsights, setComparisonInsights] = useState<
    ComparisonInsight[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("abilities");

  // 图表颜色配置
  const COLORS = [
    "#8884d8",
    "#82ca9d",
    "#ffc658",
    "#ff7300",
    "#00ff00",
    "#ff00ff",
    "#8dd1e1",
    "#d084d0",
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

  // 添加学生到对比列表
  const addStudentToComparison = (studentId: string) => {
    if (selectedStudentIds.length >= 5) {
      toast.error("最多只能对比5个学生");
      return;
    }

    if (!selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds([...selectedStudentIds, studentId]);
    }
  };

  // 从对比列表移除学生
  const removeStudentFromComparison = (studentId: string) => {
    setSelectedStudentIds(selectedStudentIds.filter((id) => id !== studentId));
  };

  // 执行对比分析
  const performComparison = async () => {
    if (selectedStudentIds.length < 2) {
      toast.error("至少需要选择2个学生进行对比");
      return;
    }

    setIsAnalyzing(true);
    try {
      const comparisonResults = await Promise.all(
        selectedStudentIds.map((studentId) =>
          analyzeStudentForComparison(studentId)
        )
      );

      setComparisonData(comparisonResults);

      // 生成对比洞察
      const insights = generateComparisonInsights(comparisonResults);
      setComparisonInsights(insights);

      toast.success("学生对比分析完成！");
    } catch (error) {
      console.error("对比分析失败:", error);
      toast.error("对比分析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 分析单个学生数据用于对比
  const analyzeStudentForComparison = async (
    studentId: string
  ): Promise<ComparisonData> => {
    const student = students.find((s) => s.id === studentId)!;

    // 获取学生成绩数据
    const { data: gradeData } = await supabase
      .from("grade_data")
      .select(
        "subject, score, exam_date, exam_type, rank_in_class, rank_in_grade"
      )
      .eq("student_id", student.student_id)
      .order("exam_date", { ascending: false });

    // 获取作业数据
    const { data: homeworkData } = await supabase
      .from("homework_submissions")
      .select("*")
      .eq("student_id", student.student_id);

    // 分析能力维度
    const abilities = analyzeAbilitiesForComparison(gradeData || []);

    // 分析学习表现
    const performance = analyzePerformanceForComparison(gradeData || []);

    // 分析学习行为
    const behaviors = analyzeBehaviorsForComparison(
      gradeData || [],
      homeworkData || []
    );

    // 识别优势和改进领域
    const { strengths, improvements } =
      identifyStrengthsAndImprovements(abilities);

    // 计算排名信息
    const ranking = await calculateRanking(student, gradeData || []);

    return {
      student,
      abilities,
      performance,
      behaviors,
      strengths,
      improvements,
      ranking,
    };
  };

  // 分析能力维度用于对比
  const analyzeAbilitiesForComparison = (grades: any[]) => {
    const abilities = [
      "数学逻辑",
      "语言表达",
      "科学思维",
      "记忆能力",
      "理解能力",
      "应用能力",
      "分析能力",
      "创新能力",
    ];

    return abilities.map((ability) => {
      const score = calculateAbilityScore(ability, grades);
      return {
        dimension: ability,
        score,
        level: getAbilityLevel(score),
        percentile: calculatePercentile(score),
      };
    });
  };

  // 分析学习表现用于对比
  const analyzePerformanceForComparison = (grades: any[]) => {
    if (grades.length === 0) {
      return {
        overallScore: 75,
        subjectScores: [],
        trend: "stable" as const,
        consistency: 75,
      };
    }

    const overallScore =
      grades.reduce((sum, g) => sum + g.score, 0) / grades.length;

    // 按科目分组计算平均分
    const subjectGroups = grades.reduce(
      (acc, grade) => {
        if (!acc[grade.subject]) acc[grade.subject] = [];
        acc[grade.subject].push(grade.score);
        return acc;
      },
      {} as Record<string, number[]>
    );

    const subjectScores = Object.entries(subjectGroups).map(
      ([subject, scores]) => ({
        subject,
        score: scores.reduce((sum, s) => sum + s, 0) / scores.length,
      })
    );

    // 计算趋势
    const recentGrades = grades.slice(0, 3);
    const olderGrades = grades.slice(3, 6);
    let trend: "improving" | "stable" | "declining" = "stable";

    if (recentGrades.length >= 2 && olderGrades.length >= 2) {
      const recentAvg =
        recentGrades.reduce((sum, g) => sum + g.score, 0) / recentGrades.length;
      const olderAvg =
        olderGrades.reduce((sum, g) => sum + g.score, 0) / olderGrades.length;
      const diff = recentAvg - olderAvg;

      if (diff > 3) trend = "improving";
      else if (diff < -3) trend = "declining";
    }

    // 计算一致性（标准差的倒数）
    const scores = grades.map((g) => g.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const consistency = Math.max(0, 100 - Math.sqrt(variance) * 5);

    return {
      overallScore,
      subjectScores,
      trend,
      consistency,
    };
  };

  // 分析学习行为用于对比
  const analyzeBehaviorsForComparison = (grades: any[], homework: any[]) => {
    return {
      homeworkCompletion: calculateHomeworkCompletion(homework),
      classParticipation: calculateClassParticipation(grades),
      learningConsistency: calculateLearningConsistency(grades),
      progressSpeed: calculateProgressSpeed(grades),
    };
  };

  // 生成对比洞察
  const generateComparisonInsights = (
    data: ComparisonData[]
  ): ComparisonInsight[] => {
    const insights: ComparisonInsight[] = [];

    // 分析能力差距
    const abilityGaps = findAbilityGaps(data);
    abilityGaps.forEach((gap) => {
      insights.push({
        type: "strength_gap",
        title: `${gap.dimension}能力差距显著`,
        description: `${gap.stronger}在${gap.dimension}方面明显强于${gap.weaker}，差距${gap.gap.toFixed(1)}分`,
        students: [gap.stronger, gap.weaker],
        actionable: true,
        priority: gap.gap > 20 ? "high" : "medium",
      });
    });

    // 分析相似模式
    const similarPatterns = findSimilarPatterns(data);
    similarPatterns.forEach((pattern) => {
      insights.push({
        type: "similar_pattern",
        title: `相似的学习模式`,
        description: `${pattern.students.join("和")}在${pattern.aspect}方面表现相似`,
        students: pattern.students,
        actionable: false,
        priority: "low",
      });
    });

    // 分析互补技能
    const complementarySkills = findComplementarySkills(data);
    complementarySkills.forEach((skill) => {
      insights.push({
        type: "complementary_skills",
        title: `互补技能组合`,
        description: `${skill.students.join("和")}的技能组合互补，适合协作学习`,
        students: skill.students,
        actionable: true,
        priority: "medium",
      });
    });

    return insights;
  };

  // 辅助计算函数
  const calculateAbilityScore = (ability: string, grades: any[]): number => {
    if (grades.length === 0) return 75;
    const relevantGrades = grades.filter((g) =>
      isRelevantToAbility(ability, g.subject)
    );
    if (relevantGrades.length === 0) return 75;
    return (
      relevantGrades.reduce((sum, g) => sum + g.score, 0) /
      relevantGrades.length
    );
  };

  const isRelevantToAbility = (ability: string, subject: string): boolean => {
    const abilitySubjectMap: Record<string, string[]> = {
      数学逻辑: ["数学", "物理"],
      语言表达: ["语文", "英语"],
      科学思维: ["物理", "化学", "生物"],
      记忆能力: ["历史", "地理", "政治"],
      理解能力: ["语文", "英语", "政治"],
      应用能力: ["数学", "物理", "化学"],
      分析能力: ["数学", "物理", "化学"],
      创新能力: ["数学", "物理", "化学", "生物"],
    };

    return abilitySubjectMap[ability]?.includes(subject) || false;
  };

  const getAbilityLevel = (score: number): string => {
    if (score >= 90) return "优秀";
    if (score >= 80) return "良好";
    if (score >= 70) return "中等";
    return "待提升";
  };

  const calculatePercentile = (score: number): number => {
    return Math.min(95, Math.max(5, score * 0.9 + Math.random() * 10));
  };

  const identifyStrengthsAndImprovements = (abilities: any[]) => {
    const strengths = abilities
      .filter((a) => a.score >= 85)
      .map((a) => a.dimension);
    const improvements = abilities
      .filter((a) => a.score < 70)
      .map((a) => a.dimension);
    return { strengths, improvements };
  };

  const calculateRanking = async (student: Student, grades: any[]) => {
    // 简化实现，实际应该查询数据库
    return {
      classRank: Math.floor(Math.random() * 30) + 1,
      gradeRank: Math.floor(Math.random() * 200) + 1,
      totalStudents: 200,
    };
  };

  const calculateHomeworkCompletion = (homework: any[]): number => {
    return 85 + Math.random() * 10;
  };

  const calculateClassParticipation = (grades: any[]): number => {
    return 80 + Math.random() * 15;
  };

  const calculateLearningConsistency = (grades: any[]): number => {
    if (grades.length < 3) return 75;
    const scores = grades.map((g) => g.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    return Math.max(0, 100 - Math.sqrt(variance) * 3);
  };

  const calculateProgressSpeed = (grades: any[]): number => {
    return 1 + Math.random() * 3;
  };

  const findAbilityGaps = (data: ComparisonData[]) => {
    const gaps: any[] = [];

    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const student1 = data[i];
        const student2 = data[j];

        student1.abilities.forEach((ability1) => {
          const ability2 = student2.abilities.find(
            (a) => a.dimension === ability1.dimension
          );
          if (ability2) {
            const gap = Math.abs(ability1.score - ability2.score);
            if (gap > 15) {
              gaps.push({
                dimension: ability1.dimension,
                stronger:
                  ability1.score > ability2.score
                    ? student1.student.name
                    : student2.student.name,
                weaker:
                  ability1.score > ability2.score
                    ? student2.student.name
                    : student1.student.name,
                gap,
              });
            }
          }
        });
      }
    }

    return gaps.slice(0, 3); // 返回前3个最大差距
  };

  const findSimilarPatterns = (data: ComparisonData[]) => {
    const patterns: any[] = [];

    // 简化实现：查找表现相似的学生
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const student1 = data[i];
        const student2 = data[j];

        const scoreDiff = Math.abs(
          student1.performance.overallScore - student2.performance.overallScore
        );
        if (scoreDiff < 5) {
          patterns.push({
            students: [student1.student.name, student2.student.name],
            aspect: "整体成绩表现",
          });
        }
      }
    }

    return patterns.slice(0, 2);
  };

  const findComplementarySkills = (data: ComparisonData[]) => {
    const complementary: any[] = [];

    // 简化实现：查找技能互补的学生
    for (let i = 0; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        const student1 = data[i];
        const student2 = data[j];

        const student1Strengths = new Set(student1.strengths);
        const student2Strengths = new Set(student2.strengths);

        // 如果两个学生的优势领域不同，认为是互补的
        const overlap = [...student1Strengths].filter((s) =>
          student2Strengths.has(s)
        ).length;
        if (overlap < student1Strengths.size * 0.5) {
          complementary.push({
            students: [student1.student.name, student2.student.name],
          });
        }
      }
    }

    return complementary.slice(0, 2);
  };

  // 渲染能力对比雷达图
  const renderAbilityComparison = () => {
    if (comparisonData.length === 0) return null;

    // 准备雷达图数据
    const radarData = comparisonData[0].abilities.map((ability) => {
      const dataPoint: any = { dimension: ability.dimension.slice(0, 4) };

      comparisonData.forEach((student, index) => {
        const studentAbility = student.abilities.find(
          (a) => a.dimension === ability.dimension
        );
        dataPoint[student.student.name] = studentAbility?.score || 0;
      });

      return dataPoint;
    });

    return (
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          {comparisonData.map((student, index) => (
            <Radar
              key={student.student.id}
              name={student.student.name}
              dataKey={student.student.name}
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  // 渲染成绩对比柱状图
  const renderPerformanceComparison = () => {
    if (comparisonData.length === 0) return null;

    // 准备柱状图数据
    const subjects = [
      ...new Set(
        comparisonData.flatMap((d) =>
          d.performance.subjectScores.map((s) => s.subject)
        )
      ),
    ];

    const barData = subjects.map((subject) => {
      const dataPoint: any = { subject };

      comparisonData.forEach((student) => {
        const subjectScore = student.performance.subjectScores.find(
          (s) => s.subject === subject
        );
        dataPoint[student.student.name] = subjectScore?.score || 0;
      });

      return dataPoint;
    });

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" />
          <YAxis />
          <Tooltip />
          <Legend />
          {comparisonData.map((student, index) => (
            <Bar
              key={student.student.id}
              dataKey={student.student.name}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  // 渲染学习行为对比
  const renderBehaviorComparison = () => {
    if (comparisonData.length === 0) return null;

    const behaviorData = [
      { behavior: "作业完成", key: "homeworkCompletion" },
      { behavior: "课堂参与", key: "classParticipation" },
      { behavior: "学习一致性", key: "learningConsistency" },
      { behavior: "进步速度", key: "progressSpeed" },
    ].map((item) => {
      const dataPoint: any = { behavior: item.behavior };

      comparisonData.forEach((student) => {
        dataPoint[student.student.name] =
          student.behaviors[item.key as keyof typeof student.behaviors];
      });

      return dataPoint;
    });

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={behaviorData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="behavior" />
          <YAxis />
          <Tooltip />
          <Legend />
          {comparisonData.map((student, index) => (
            <Bar
              key={student.student.id}
              dataKey={student.student.name}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </BarChart>
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
      {/* 学生选择和对比控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            学生画像对比分析
          </CardTitle>
          <CardDescription>
            选择2-5个学生进行多维度对比分析，发现学习模式和能力差异
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 学生选择 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                选择学生进行对比
              </label>
              <Select onValueChange={addStudentToComparison}>
                <SelectTrigger>
                  <SelectValue placeholder="选择学生..." />
                </SelectTrigger>
                <SelectContent>
                  {students
                    .filter(
                      (student) => !selectedStudentIds.includes(student.id)
                    )
                    .map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.student_id}) -{" "}
                        {student.class_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* 已选择的学生 */}
            {selectedStudentIds.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  已选择的学生 ({selectedStudentIds.length}/5)
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedStudentIds.map((studentId) => {
                    const student = students.find((s) => s.id === studentId);
                    return (
                      <Badge
                        key={studentId}
                        variant="secondary"
                        className="flex items-center"
                      >
                        {student?.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-2"
                          onClick={() => removeStudentFromComparison(studentId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 对比按钮 */}
            <Button
              onClick={performComparison}
              disabled={selectedStudentIds.length < 2 || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  分析中...
                </>
              ) : (
                <>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  开始对比分析
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 对比结果展示 */}
      {comparisonData.length > 0 && (
        <div className="space-y-6">
          {/* 总体对比概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                对比概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {comparisonData.map((student, index) => (
                  <div
                    key={student.student.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center mb-3">
                      <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></div>
                      <h4 className="font-medium">{student.student.name}</h4>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>综合得分:</span>
                        <span className="font-medium">
                          {student.performance.overallScore.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>班级排名:</span>
                        <span className="font-medium">
                          #{student.ranking.classRank}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>学习趋势:</span>
                        <Badge
                          variant={
                            student.performance.trend === "improving"
                              ? "default"
                              : student.performance.trend === "declining"
                                ? "destructive"
                                : "secondary"
                          }
                          size="sm"
                        >
                          {student.performance.trend === "improving"
                            ? "上升"
                            : student.performance.trend === "declining"
                              ? "下降"
                              : "稳定"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>优势领域:</span>
                        <span className="font-medium">
                          {student.strengths.length}个
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 详细对比分析 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="abilities">能力对比</TabsTrigger>
              <TabsTrigger value="performance">成绩对比</TabsTrigger>
              <TabsTrigger value="behaviors">行为对比</TabsTrigger>
              <TabsTrigger value="insights">对比洞察</TabsTrigger>
            </TabsList>

            <TabsContent value="abilities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    能力维度对比
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderAbilityComparison()}</CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparisonData.map((student, index) => (
                  <Card key={student.student.id}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        ></div>
                        {student.student.name} 能力详情
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {student.abilities.map((ability, abilityIndex) => (
                          <div
                            key={abilityIndex}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{ability.dimension}</span>
                            <div className="flex items-center">
                              <Badge
                                variant={
                                  ability.level === "优秀"
                                    ? "default"
                                    : ability.level === "良好"
                                      ? "secondary"
                                      : ability.level === "中等"
                                        ? "outline"
                                        : "destructive"
                                }
                                size="sm"
                                className="mr-2"
                              >
                                {ability.score.toFixed(1)}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {ability.percentile.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    学科成绩对比
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderPerformanceComparison()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="behaviors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    学习行为对比
                  </CardTitle>
                </CardHeader>
                <CardContent>{renderBehaviorComparison()}</CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              {comparisonInsights.map((insight, index) => (
                <Alert
                  key={index}
                  className={
                    insight.type === "strength_gap"
                      ? "border-orange-200 bg-orange-50"
                      : insight.type === "improvement_opportunity"
                        ? "border-blue-200 bg-blue-50"
                        : insight.type === "similar_pattern"
                          ? "border-green-200 bg-green-50"
                          : "border-purple-200 bg-purple-50"
                  }
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {insight.type === "strength_gap" && (
                        <Target className="h-4 w-4 text-orange-600" />
                      )}
                      {insight.type === "improvement_opportunity" && (
                        <Zap className="h-4 w-4 text-blue-600" />
                      )}
                      {insight.type === "similar_pattern" && (
                        <Users className="h-4 w-4 text-green-600" />
                      )}
                      {insight.type === "complementary_skills" && (
                        <Award className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{insight.title}</h4>
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
                      <AlertDescription>{insight.description}</AlertDescription>
                      {insight.actionable && (
                        <div className="mt-2">
                          <Badge variant="outline" size="sm">
                            可执行建议
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}

              {comparisonInsights.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无对比洞察，请先进行对比分析
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default StudentPortraitComparison;
