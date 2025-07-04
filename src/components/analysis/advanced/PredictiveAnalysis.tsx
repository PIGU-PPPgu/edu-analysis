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
      case 'low': return 'bg-[#B9FF66] text-[#191A23] border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]';
      case 'medium': return 'bg-[#B9FF66] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]';
      case 'high': return 'bg-[#FF6B6B] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]';
      case 'critical': return 'bg-[#191A23] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#FF6B6B]';
      default: return 'bg-[#F3F3F3] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return (
        <div className="p-1 bg-[#B9FF66] rounded-full border-2 border-black">
          <TrendingUp className="h-4 w-4 text-[#191A23]" />
        </div>
      );
      case 'declining': return (
        <div className="p-1 bg-[#FF6B6B] rounded-full border-2 border-black">
          <TrendingDown className="h-4 w-4 text-white" />
        </div>
      );
      default: return (
        <div className="p-1 bg-[#9C88FF] rounded-full border-2 border-black">
          <div className="h-4 w-4 rounded-full bg-white" />
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#9C88FF]">
        <CardHeader className="bg-[#9C88FF] border-b-2 border-black">
          <CardTitle className="flex items-center space-x-3 text-white font-black uppercase tracking-wide">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span>🤖 AI智能预测分析</span>
          </CardTitle>
          <CardDescription className="text-white/90 font-medium mt-2">
            基于机器学习算法分析学生成绩趋势，提供个性化学习建议和风险预警
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger className="bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                <SelectValue placeholder="🎯 选择学生进行分析" />
              </SelectTrigger>
              <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                {allStudents.map(student => (
                  <SelectItem key={student.student_id} value={student.student_id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#9C88FF] rounded-full border border-black"></div>
                      <span className="font-medium">{student.name}</span>
                      <Badge className="bg-[#B9FF66] text-[#191A23] border border-black text-xs font-bold">
                        {student.class_name}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={generatePredictions} 
              disabled={isLoading}
              className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E55C] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  AI分析中...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  开始智能预测
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-solid border-[#B9FF66] border-r-transparent mb-6"></div>
            <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">🤖 AI分析进行中</p>
            <p className="text-[#191A23]/70 font-medium">正在运用机器学习算法深度分析学习数据，请稍候...</p>
            <div className="mt-4 w-64 bg-[#F3F3F3] rounded-full h-3 mx-auto border-2 border-black">
              <div className="bg-[#B9FF66] h-full rounded-full transition-all duration-1000 animate-pulse" style={{ width: '70%' }}></div>
            </div>
          </CardContent>
        </Card>
      )}

      {predictions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {predictions.map((prediction) => (
            <Card key={prediction.studentId} className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
              <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-3">
                    <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                      <LineChart className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-black text-[#191A23] uppercase tracking-wide">{prediction.studentName}</span>
                    {getTrendIcon(prediction.trendDirection)}
                  </CardTitle>
                  <Badge className={getRiskBadgeColor(prediction.riskLevel)}>
                    风险: {prediction.riskLevel === 'low' ? '低' : prediction.riskLevel === 'medium' ? '中' : prediction.riskLevel === 'high' ? '高' : '极高'}
                  </Badge>
                </div>
                <CardDescription className="text-[#191A23]/80 font-medium mt-2">
                  📊 当前平均分: <span className="font-black text-[#B9FF66]">{prediction.currentAverage.toFixed(1)}分</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 🎯 科目预测 */}
                <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
                  <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-3">
                    <CardTitle className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      🎯 科目成绩预测
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {prediction.predictedScores.map((pred) => (
                        <div key={pred.subject} className="p-3 bg-[#B9FF66]/10 border border-[#B9FF66] rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-[#191A23]">{pred.subject}</span>
                            <Badge className="bg-[#B9FF66] text-white border border-black font-bold text-sm">
                              {pred.predicted}分
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#191A23]/70">置信度</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-[#F3F3F3] rounded-full h-2 border border-black">
                                <div 
                                  className="bg-[#B9FF66] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pred.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-[#191A23] w-8">
                                {(pred.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 🎨 优势与劣势分析 */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2 border-black shadow-[2px_2px_0px_0px_#B9FF66]">
                    <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-2">
                      <CardTitle className="text-xs font-black text-[#191A23] uppercase tracking-wide flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        ✨ 优势科目
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {prediction.strengths.slice(0, 3).map((strength) => (
                          <Badge key={strength} className="bg-[#B9FF66] text-[#191A23] border border-black font-bold text-xs">
                            {strength}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-black shadow-[2px_2px_0px_0px_#FF6B6B]">
                    <CardHeader className="bg-[#FF6B6B] border-b-2 border-black py-2">
                      <CardTitle className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        🎯 薄弱科目
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {prediction.weaknesses.slice(0, 3).map((weakness) => (
                          <Badge key={weakness} className="bg-[#FF6B6B] text-white border border-black font-bold text-xs">
                            {weakness}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 💡 AI个性化建议 */}
                <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF]">
                  <CardHeader className="bg-[#9C88FF] border-b-2 border-black py-3">
                    <CardTitle className="text-sm font-black text-white uppercase tracking-wide flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      💡 AI个性化建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {prediction.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className={`p-3 border-2 rounded-lg ${
                        rec.type === 'urgent' ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]' :
                        rec.type === 'warning' ? 'bg-[#B9FF66]/10 border-[#B9FF66]' :
                        'bg-[#B9FF66]/10 border-[#B9FF66]'
                      }`}>
                        <p className="text-sm font-medium text-[#191A23] leading-relaxed">
                          📝 {rec.description}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {predictions.length === 0 && !isLoading && (
        <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
          <CardContent className="p-12 text-center">
            <div className="p-4 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-6 w-fit">
              <Brain className="h-16 w-16 text-white" />
            </div>
            <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">
              🚀 准备开始分析
            </p>
            <p className="text-[#191A23]/70 font-medium">
              选择学生，开启AI驱动的成绩预测与学习建议之旅
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 