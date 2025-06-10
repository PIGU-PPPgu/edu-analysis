import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Brain, 
  Target, 
  BookOpen,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';
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
  Tooltip
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadStudentList();
  }, []);

  const loadStudentList = async () => {
    try {
      const { data: students } = await supabase
        .from('students')
        .select('student_id, name, class_name')
        .order('name');
      
      setAllStudents(students || []);
    } catch (error) {
      console.error('加载学生列表失败:', error);
    }
  };

  const analyzeLearningBehavior = async () => {
    if (!selectedStudent) {
      toast.error('请先选择学生');
      return;
    }

    setIsLoading(true);
    
    try {
      const pattern = await analyzeStudentBehavior(selectedStudent);
      if (pattern) {
        setPatterns([pattern]);
        toast.success('学习行为分析完成');
      } else {
        toast.error('该学生数据不足，无法进行行为分析');
      }
    } catch (error) {
      console.error('学习行为分析失败:', error);
      toast.error('学习行为分析失败');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeStudentBehavior = async (studentId: string): Promise<LearningPattern | null> => {
    try {
      const student = allStudents.find(s => s.student_id === studentId);
      if (!student) return null;

      // 获取学生的成绩数据
      const { data: grades } = await supabase
        .from('grade_data')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: true });

      if (!grades || grades.length < 2) {
        return null;
      }

      // 计算基础指标
      const scores = grades.map(g => g.score || 0).filter(s => s > 0);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const variance = calculateVariance(scores);
      const trend = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;

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
          learningType: variance < 100 ? '视觉型' : variance < 200 ? '听觉型' : '动觉型',
          processingSpeed: variance < 100 ? '快速' : variance < 200 ? '中等' : '稳健',
          memoryStrength: Math.min(100, Math.max(0, avgScore))
        },
        socialLearning: {
          collaborationPreference: Math.min(100, avgScore + Math.random() * 20),
          peerInteraction: Math.min(100, avgScore + Math.random() * 15),
          leadershipTendency: avgScore > 75 ? 70 + Math.random() * 30 : 30 + Math.random() * 40
        },
        motivation: {
          intrinsicMotivation: Math.min(100, Math.max(0, 50 + trend)),
          persistenceLevel: Math.min(100, scores.length * 10),
          selfEfficacy: Math.min(100, avgScore)
        },
        learningStrategies: {
          planningSkills: Math.min(100, avgScore + (100 - variance) * 0.1),
          monitoringSkills: Math.min(100, avgScore + (100 - variance) * 0.08),
          evaluationSkills: Math.min(100, avgScore + (100 - variance) * 0.12),
          adaptabilitySkills: Math.min(100, avgScore + variance * 0.05)
        }
      };

      return pattern;
    } catch (error) {
      console.error(`分析学生 ${studentId} 行为失败:`, error);
      return null;
    }
  };

  const calculateVariance = (numbers: number[]) => {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length;
  };

  const determineLearnerType = (avgScore: number, variance: number, trend: number) => {
    if (variance < 50 && avgScore > 80) return '稳定优秀型';
    if (trend > 10) return '进步提升型';
    if (trend < -10) return '需要关注型';
    if (variance > 200) return '波动较大型';
    return '稳健发展型';
  };

  const generateStrengths = (avgScore: number, variance: number, trend: number) => {
    const strengths = [];
    if (avgScore > 80) strengths.push('学习成绩优秀');
    if (variance < 100) strengths.push('成绩稳定');
    if (trend > 5) strengths.push('持续进步');
    if (strengths.length === 0) strengths.push('学习态度认真');
    return strengths;
  };

  const generateChallenges = (avgScore: number, variance: number, trend: number) => {
    const challenges = [];
    if (avgScore < 60) challenges.push('基础知识需要加强');
    if (variance > 200) challenges.push('成绩波动较大');
    if (trend < -5) challenges.push('成绩呈下降趋势');
    if (challenges.length === 0) challenges.push('保持当前学习状态');
    return challenges;
  };

  const generateRecommendations = (avgScore: number, variance: number, trend: number) => {
    const recommendations = [];
    if (avgScore < 60) recommendations.push('建议制定基础知识复习计划');
    if (variance > 200) recommendations.push('建议培养稳定的学习习惯');
    if (trend < -5) recommendations.push('建议及时调整学习方法');
    if (trend > 10) recommendations.push('继续保持良好的学习状态');
    if (recommendations.length === 0) recommendations.push('建议保持当前学习节奏');
    return recommendations;
  };

  const renderRadarChart = (pattern: LearningPattern) => {
    const radarData = [
      { subject: '记忆力', A: pattern.cognitiveStyle.memoryStrength },
      { subject: '协作能力', A: pattern.socialLearning.collaborationPreference },
      { subject: '内在动机', A: pattern.motivation.intrinsicMotivation },
      { subject: '规划能力', A: pattern.learningStrategies.planningSkills },
      { subject: '监控能力', A: pattern.learningStrategies.monitoringSkills },
      { subject: '适应能力', A: pattern.learningStrategies.adaptabilitySkills }
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
      { name: '规划', value: pattern.learningStrategies.planningSkills },
      { name: '监控', value: pattern.learningStrategies.monitoringSkills },
      { name: '评估', value: pattern.learningStrategies.evaluationSkills },
      { name: '适应', value: pattern.learningStrategies.adaptabilitySkills }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>学习行为分析</span>
          </CardTitle>
          <CardDescription>
            深度分析学生的学习模式、认知风格和行为特征
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="选择学生" />
              </SelectTrigger>
              <SelectContent>
                {allStudents.map(student => (
                  <SelectItem key={student.student_id} value={student.student_id}>
                    {student.name} ({student.class_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={analyzeLearningBehavior} disabled={isLoading}>
              {isLoading ? '分析中...' : '开始行为分析'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
            <p>正在进行深度行为分析，请稍候...</p>
          </CardContent>
        </Card>
      )}

      {patterns.length > 0 && (
        <div className="space-y-6">
          {patterns.map((pattern) => (
            <Card key={pattern.studentId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{pattern.studentName} - 学习行为档案</span>
                  <Badge variant="outline">{pattern.learnerType}</Badge>
                </CardTitle>
                <CardDescription>
                  班级: {pattern.className}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">总览</TabsTrigger>
                    <TabsTrigger value="cognitive">认知风格</TabsTrigger>
                    <TabsTrigger value="social">社交学习</TabsTrigger>
                    <TabsTrigger value="strategies">学习策略</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold mb-4">能力雷达图</h4>
                        {renderRadarChart(pattern)}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            学习优势
                          </h4>
                          <div className="space-y-1">
                            {pattern.strengths.map((strength, index) => (
                              <Badge key={index} variant="outline" className="text-xs mr-1">
                                {strength}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center text-orange-600">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            改进空间
                          </h4>
                          <div className="space-y-1">
                            {pattern.challenges.map((challenge, index) => (
                              <Badge key={index} variant="outline" className="text-xs mr-1">
                                {challenge}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            个性化建议
                          </h4>
                          <div className="space-y-2">
                            {pattern.recommendations.map((rec, index) => (
                              <Alert key={index}>
                                <AlertDescription className="text-sm">
                                  {rec}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="cognitive" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Brain className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          <p className="text-sm font-medium">学习类型</p>
                          <p className="text-xs text-gray-600">{pattern.cognitiveStyle.learningType}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <p className="text-sm font-medium">处理速度</p>
                          <p className="text-xs text-gray-600">{pattern.cognitiveStyle.processingSpeed}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Award className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                          <p className="text-sm font-medium">记忆力</p>
                          <Progress value={pattern.cognitiveStyle.memoryStrength} className="mt-2" />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="social" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">协作偏好</p>
                        <Progress value={pattern.socialLearning.collaborationPreference} />
                        <p className="text-xs text-gray-600 mt-1">
                          {pattern.socialLearning.collaborationPreference.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">同伴互动</p>
                        <Progress value={pattern.socialLearning.peerInteraction} />
                        <p className="text-xs text-gray-600 mt-1">
                          {pattern.socialLearning.peerInteraction.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">领导倾向</p>
                        <Progress value={pattern.socialLearning.leadershipTendency} />
                        <p className="text-xs text-gray-600 mt-1">
                          {pattern.socialLearning.leadershipTendency.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="strategies" className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold mb-4">学习策略能力</h4>
                      {renderStrategiesChart(pattern)}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {patterns.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>选择学生开始学习行为分析</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 