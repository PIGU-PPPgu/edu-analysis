/**
 * 简化的学生学习分析组件
 * 基于真实成绩数据，移除AI模拟功能
 */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  TrendingUp,
  User,
  Target,
  Star,
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

// 接口定义
interface Student {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
}

interface AbilityData {
  subject: string;
  score: number;
  level: "excellent" | "good" | "average" | "needs_improvement";
}

interface AnalysisResult {
  studentInfo: Student;
  overallRating: number;
  subjectPerformance: AbilityData[];
  strengthAreas: string[];
  improvementAreas: string[];
  insights: string[];
  recommendations: string[];
  analysisDate: string;
}

const SimpleStudentAnalysis: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 加载学生列表
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, student_id, name, class_name")
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

  // 执行基于成绩的分析
  const handleAnalysis = async () => {
    if (!selectedStudentId) {
      toast.error("请先选择一个学生");
      return;
    }

    setIsAnalyzing(true);
    try {
      const selectedStudent = students.find((s) => s.id === selectedStudentId);
      if (!selectedStudent) throw new Error("找不到选中的学生");

      const analysis = await performGradeBasedAnalysis(selectedStudent);
      setAnalysisResult(analysis);
      toast.success("学习分析完成！");
    } catch (error) {
      console.error("学习分析失败:", error);
      toast.error("学习分析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 基于成绩的分析方法
  const performGradeBasedAnalysis = async (student: Student): Promise<AnalysisResult> => {
    // 1. 获取学生成绩数据
    const { data: gradeData, error: gradeError } = await supabase
      .from("grade_data_new")
      .select("*")
      .eq("student_id", student.student_id)
      .order("exam_date", { ascending: false })
      .limit(20);

    if (gradeError) {
      throw new Error("获取成绩数据失败");
    }

    const grades = gradeData || [];

    // 2. 分析各科目表现
    const subjectPerformance = analyzeSubjectPerformance(grades);

    // 3. 计算整体评分
    const overallRating = calculateOverallRating(grades);

    // 4. 识别优势和弱势
    const strengths = identifyStrengths(subjectPerformance);
    const improvements = identifyImprovements(subjectPerformance);

    // 5. 生成洞察和建议
    const insights = generateInsights(grades, subjectPerformance);
    const recommendations = generateRecommendations(subjectPerformance, improvements);

    return {
      studentInfo: student,
      overallRating,
      subjectPerformance,
      strengthAreas: strengths,
      improvementAreas: improvements,
      insights,
      recommendations,
      analysisDate: new Date().toISOString(),
    };
  };

  // 分析各科目表现
  const analyzeSubjectPerformance = (grades: any[]): AbilityData[] => {
    const subjectScores: Record<string, number[]> = {};
    
    // 收集各科目成绩
    grades.forEach(record => {
      const subjects = [
        { field: 'chinese_score', name: '语文' },
        { field: 'math_score', name: '数学' },
        { field: 'english_score', name: '英语' },
        { field: 'physics_score', name: '物理' },
        { field: 'chemistry_score', name: '化学' }
      ];
      
      subjects.forEach(subject => {
        const score = record[subject.field];
        if (score !== null && score !== undefined) {
          if (!subjectScores[subject.name]) {
            subjectScores[subject.name] = [];
          }
          subjectScores[subject.name].push(score);
        }
      });
    });

    // 计算各科目平均分并分级
    return Object.entries(subjectScores).map(([subject, scores]) => {
      if (scores.length === 0) {
        return { subject, score: 0, level: 'needs_improvement' as const };
      }
      
      const average = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      let level: AbilityData['level'];
      
      if (average >= 90) level = 'excellent';
      else if (average >= 80) level = 'good';
      else if (average >= 70) level = 'average';
      else level = 'needs_improvement';
      
      return { subject, score: Math.round(average), level };
    });
  };

  // 计算整体评分
  const calculateOverallRating = (grades: any[]): number => {
    if (grades.length === 0) return 0;
    
    const totalScores = grades
      .map(g => g.total_score)
      .filter(score => score !== null && score !== undefined);
      
    if (totalScores.length === 0) return 0;
    
    return Math.round(totalScores.reduce((sum, s) => sum + s, 0) / totalScores.length);
  };

  // 识别优势科目
  const identifyStrengths = (performance: AbilityData[]): string[] => {
    return performance
      .filter(p => p.level === 'excellent' || (p.level === 'good' && p.score >= 85))
      .map(p => p.subject)
      .slice(0, 3); // 最多3个优势科目
  };

  // 识别待改进科目
  const identifyImprovements = (performance: AbilityData[]): string[] => {
    return performance
      .filter(p => p.level === 'needs_improvement' || (p.level === 'average' && p.score < 75))
      .map(p => p.subject)
      .slice(0, 3); // 最多3个待改进科目
  };

  // 生成学习洞察
  const generateInsights = (grades: any[], performance: AbilityData[]): string[] => {
    const insights = [];
    
    // 成绩趋势分析
    if (grades.length >= 3) {
      const recentScores = grades.slice(0, 3).map(g => g.total_score || 0);
      const earlierScores = grades.slice(-3).map(g => g.total_score || 0);
      const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
      const earlierAvg = earlierScores.reduce((a, b) => a + b, 0) / earlierScores.length;
      
      if (recentAvg > earlierAvg + 5) {
        insights.push("近期成绩呈上升趋势，学习状态良好");
      } else if (recentAvg < earlierAvg - 5) {
        insights.push("近期成绩有所下降，需要关注学习状态");
      } else {
        insights.push("成绩相对稳定，保持当前学习节奏");
      }
    }

    // 科目平衡性分析
    const scores = performance.map(p => p.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    if (maxScore - minScore > 20) {
      insights.push("各科目发展不够均衡，建议加强薄弱科目");
    } else {
      insights.push("各科目发展相对均衡，整体表现稳定");
    }

    return insights;
  };

  // 生成学习建议
  const generateRecommendations = (performance: AbilityData[], improvements: string[]): string[] => {
    const recommendations = [];
    
    if (improvements.length > 0) {
      recommendations.push(`重点关注${improvements[0]}学科，制定专项提升计划`);
      
      if (improvements.length > 1) {
        recommendations.push(`同时加强${improvements.slice(1).join('、')}的学习`);
      }
    }

    const excellentSubjects = performance.filter(p => p.level === 'excellent');
    if (excellentSubjects.length > 0) {
      recommendations.push(`发挥${excellentSubjects[0].subject}优势，可考虑拓展相关领域`);
    }

    recommendations.push("保持规律的学习习惯，定期复习巩固");

    return recommendations;
  };

  // 获取评级颜色
  const getLevelColor = (level: AbilityData['level']) => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'average': return 'text-yellow-600';
      case 'needs_improvement': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // 获取评级标签
  const getLevelLabel = (level: AbilityData['level']) => {
    switch (level) {
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'average': return '一般';
      case 'needs_improvement': return '待提升';
      default: return '未知';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            学生学习分析
          </CardTitle>
          <CardDescription>
            基于学生成绩数据进行学习表现分析和个性化建议
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">选择学生</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择要分析的学生" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} - {student.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAnalysis}
              disabled={!selectedStudentId || isAnalyzing || isLoading}
              className="min-w-[100px]"
            >
              {isAnalyzing ? "分析中..." : "开始分析"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysisResult && (
        <div className="space-y-6">
          {/* 学生基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {analysisResult.studentInfo.name}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">整体评分:</span>
                  <span className="text-2xl font-bold text-primary">
                    {analysisResult.overallRating}
                  </span>
                </div>
              </CardTitle>
              <CardDescription>
                班级: {analysisResult.studentInfo.class_name} | 
                分析日期: {new Date(analysisResult.analysisDate).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
          </Card>

          <Tabs defaultValue="performance" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="performance">学科表现</TabsTrigger>
              <TabsTrigger value="strengths">优势分析</TabsTrigger>
              <TabsTrigger value="insights">学习洞察</TabsTrigger>
              <TabsTrigger value="recommendations">改进建议</TabsTrigger>
            </TabsList>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart className="h-5 w-5" />
                    各科目表现分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysisResult.subjectPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="subject" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Bar dataKey="score" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analysisResult.subjectPerformance.map((subject) => (
                        <div key={subject.subject} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{subject.subject}</span>
                            <Badge variant="outline" className={getLevelColor(subject.level)}>
                              {getLevelLabel(subject.level)}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>平均分</span>
                              <span className="font-medium">{subject.score}分</span>
                            </div>
                            <Progress value={subject.score} className="h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strengths">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-green-600" />
                      优势科目
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.strengthAreas.length > 0 ? (
                        analysisResult.strengthAreas.map((strength, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
                            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                            <span>{strength}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">暂无明显优势科目</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-orange-600" />
                      待改进科目
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.improvementAreas.length > 0 ? (
                        analysisResult.improvementAreas.map((area, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 rounded-md">
                            <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
                            <span>{area}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">各科目表现均衡</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    学习洞察
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResult.insights.map((insight, index) => (
                      <div key={index} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r-md">
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    个性化建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysisResult.recommendations.map((recommendation, index) => (
                      <div key={index} className="p-3 bg-green-50 border-l-4 border-green-500 rounded-r-md">
                        <p className="text-sm">{recommendation}</p>
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

export default SimpleStudentAnalysis;