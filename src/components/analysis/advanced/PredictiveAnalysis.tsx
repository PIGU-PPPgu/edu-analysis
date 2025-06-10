import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  BookOpen,
  LineChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PredictionData {
  studentId: string;
  studentName: string;
  currentAverage: number;
  predictedScores: { subject: string; predicted: number; confidence: number }[];
  trendDirection: 'improving' | 'declining' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: { type: string; description: string; priority: number }[];
  strengths: string[];
  weaknesses: string[];
}

interface PredictiveAnalysisProps {
  selectedStudents?: string[];
  timeframe?: 'week' | 'month' | 'semester';
}

export const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({
  selectedStudents = [],
  timeframe = 'month'
}) => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [allStudents, setAllStudents] = useState<any[]>([]);

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

  const generatePredictions = async () => {
    if (!selectedStudent) {
      toast.error('请先选择学生');
      return;
    }

    setIsLoading(true);
    
    try {
      const prediction = await analyzeSingleStudent(selectedStudent);
      if (prediction) {
        setPredictions([prediction]);
        toast.success('预测分析完成');
      } else {
        toast.error('该学生数据不足，无法进行预测');
      }
    } catch (error) {
      console.error('生成预测分析失败:', error);
      toast.error('预测分析生成失败');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSingleStudent = async (studentId: string): Promise<PredictionData | null> => {
    try {
      const student = allStudents.find(s => s.student_id === studentId);
      if (!student) return null;

      // 获取历史成绩数据
      const { data: grades } = await supabase
        .from('grade_data')
        .select('*')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: true });

      if (!grades || grades.length < 2) {
        return null;
      }

      // 计算当前平均分
      const scores = grades.map(g => g.score || 0).filter(s => s > 0);
      const currentAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // 按科目分组计算预测
      const subjectScores: { [key: string]: number[] } = {};
      grades.forEach(grade => {
        const subject = grade.subject || '总分';
        const score = grade.score || 0;
        if (score > 0) {
          if (!subjectScores[subject]) {
            subjectScores[subject] = [];
          }
          subjectScores[subject].push(score);
        }
      });

      // 生成预测分数
      const predictedScores = Object.entries(subjectScores).map(([subject, scores]) => {
        const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const trend = scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0;
        const predicted = Math.max(0, Math.min(100, avg + trend * 0.5));
        
        return {
          subject,
          predicted: Math.round(predicted * 10) / 10,
          confidence: Math.min(0.95, 0.6 + (scores.length * 0.1))
        };
      });

      // 判断趋势
      const recentScores = scores.slice(-3);
      const earlierScores = scores.slice(0, 3);
      const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;
      const earlierAvg = earlierScores.reduce((sum, s) => sum + s, 0) / earlierScores.length;
      
      let trendDirection: 'improving' | 'declining' | 'stable';
      if (recentAvg - earlierAvg > 5) trendDirection = 'improving';
      else if (recentAvg - earlierAvg < -5) trendDirection = 'declining';
      else trendDirection = 'stable';

      // 风险评估
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (currentAverage < 50) riskLevel = 'critical';
      else if (currentAverage < 60 || trendDirection === 'declining') riskLevel = 'high';
      else if (currentAverage < 70) riskLevel = 'medium';
      else riskLevel = 'low';

      // 生成建议
      const recommendations = [];
      if (currentAverage < 60) {
        recommendations.push({
          type: 'urgent',
          description: '需要立即制定学习计划，重点补强基础知识',
          priority: 1
        });
      }
      if (trendDirection === 'declining') {
        recommendations.push({
          type: 'warning',
          description: '成绩呈下降趋势，建议及时调整学习方法',
          priority: 2
        });
      }
      if (trendDirection === 'improving') {
        recommendations.push({
          type: 'positive',
          description: '成绩呈上升趋势，继续保持当前学习状态',
          priority: 3
        });
      }

      // 识别优势和劣势
      const sortedSubjects = Object.entries(subjectScores)
        .map(([subject, scores]) => ({
          subject,
          average: scores.reduce((sum, s) => sum + s, 0) / scores.length
        }))
        .sort((a, b) => b.average - a.average);

      const strengths = sortedSubjects.slice(0, Math.ceil(sortedSubjects.length / 2)).map(s => s.subject);
      const weaknesses = sortedSubjects.slice(-Math.ceil(sortedSubjects.length / 2)).map(s => s.subject);

      return {
        studentId,
        studentName: student.name,
        currentAverage,
        predictedScores,
        trendDirection,
        riskLevel,
        recommendations,
        strengths,
        weaknesses
      };
    } catch (error) {
      console.error(`分析学生 ${studentId} 失败:`, error);
      return null;
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 rounded-full bg-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>智能预测分析</span>
          </CardTitle>
          <CardDescription>
            基于历史数据预测学生成绩趋势，提供个性化学习建议
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

            <Button onClick={generatePredictions} disabled={isLoading}>
              {isLoading ? '分析中...' : '开始预测分析'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
            <p>正在进行智能分析，请稍候...</p>
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions.map((prediction) => (
            <Card key={prediction.studentId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <span>{prediction.studentName}</span>
                    {getTrendIcon(prediction.trendDirection)}
                  </CardTitle>
                  <Badge className={getRiskBadgeColor(prediction.riskLevel)}>
                    风险等级: {prediction.riskLevel}
                  </Badge>
                </div>
                <CardDescription>
                  当前平均分: {prediction.currentAverage.toFixed(1)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 科目预测 */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-1" />
                    各科目预测
                  </h4>
                  <div className="space-y-2">
                    {prediction.predictedScores.map((pred) => (
                      <div key={pred.subject} className="flex items-center justify-between">
                        <span className="text-sm">{pred.subject}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{pred.predicted}</span>
                          <Progress 
                            value={pred.confidence * 100} 
                            className="w-16 h-2"
                          />
                          <span className="text-xs text-gray-500">
                            {(pred.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 优势与劣势 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      优势科目
                    </h4>
                    <div className="space-y-1">
                      {prediction.strengths.slice(0, 3).map((strength) => (
                        <Badge key={strength} variant="outline" className="text-xs">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center text-orange-600">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      薄弱科目
                    </h4>
                    <div className="space-y-1">
                      {prediction.weaknesses.slice(0, 3).map((weakness) => (
                        <Badge key={weakness} variant="outline" className="text-xs">
                          {weakness}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 学习建议 */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    个性化建议
                  </h4>
                  <div className="space-y-2">
                    {prediction.recommendations.slice(0, 3).map((rec, index) => (
                      <Alert key={index}>
                        <AlertDescription className="text-sm">
                          {rec.description}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {predictions.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>选择学生开始智能预测分析</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 