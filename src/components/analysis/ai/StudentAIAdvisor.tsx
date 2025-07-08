/**
 *  学生AI顾问组件 - 真AI版本
 * 我的学生需要什么？- 让AI为每个学生提供个性化指导
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Brain, 
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Zap,
  Download,
  Clock,
  Star,
  Eye,
  Filter
} from 'lucide-react';
import AIAnalysisService from './AIService';

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

interface StudentAIAdvisorProps {
  gradeData: GradeRecord[];
  className?: string;
}

const StudentAIAdvisor: React.FC<StudentAIAdvisorProps> = ({ 
  gradeData, 
  className = "" 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');

  const startAIGuidance = async () => {
    if (!gradeData || gradeData.length === 0) {
      setAnalysisError('需要学生成绩数据才能进行AI指导');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const aiService = AIAnalysisService.getInstance();
      
      // 刷新AI配置以确保使用最新设置
      await aiService.refreshAIConfig();
      
      // 获取AI状态
      const aiStatus = aiService.getAIStatus();
      if (aiStatus.isConfigured) {
        console.info(' 正在使用您配置的AI服务进行学生指导分析...');
      } else {
        console.info(' 使用基于实际数据的智能模拟分析...');
      }
      
      const result = await aiService.analyzeStudents(gradeData);
      setAnalysisResult(result);
    } catch (error) {
      console.error('AI指导失败:', error);
      setAnalysisError(error instanceof Error ? error.message : '指导过程中出现未知错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportGuidanceReport = async () => {
    if (!analysisResult) return;

    try {
      const reportContent = `
#  学生AI指导报告

##  分析概况
- **分析学生总数**: ${analysisResult.summary.total_analyzed}人
- **识别学习模式**: ${analysisResult.summary.patterns_identified.join('、')}
- **生成时间**: ${new Date().toLocaleString()}

##  AI整体建议
${analysisResult.summary.overall_recommendations.map((rec: string) => `- ${rec}`).join('\n')}

##  学生个性化指导方案

${analysisResult.students.map((student: any) => `
### ${student.name}

** AI识别学习模式**
- **类型**: ${student.learning_pattern.type}
- **描述**: ${student.learning_pattern.description}
- **置信度**: ${(student.learning_pattern.confidence * 100).toFixed(1)}%

** 个性化学习计划**
- **学习目标**: ${student.personalized_plan.goals.join('、')}
- **推荐方法**: ${student.personalized_plan.methods.join('、')}
- **时间安排**: ${student.personalized_plan.timeline}
- **预期效果**: ${student.personalized_plan.expected_outcome}

** 关注级别**: ${student.priority_level === 'urgent' ? ' 紧急关注' : 
                   student.priority_level === 'important' ? ' 重点关注' :
                   student.priority_level === 'normal' ? ' 正常关注' : ' 保持现状'}

---
`).join('\n')}

*本报告由AI分析生成，建议结合学生实际情况灵活运用*
`;

      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `学生AI指导报告_${new Date().toLocaleDateString()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出报告失败:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[#FF6B6B] text-white border-[#FF6B6B]';
      case 'important': return 'bg-[#F7931E] text-white border-[#F7931E]';
      case 'normal': return 'bg-[#9C88FF] text-white border-[#9C88FF]';
      case 'maintain': return 'bg-[#B9FF66] text-[#191A23] border-[#B9FF66]';
      default: return 'bg-[#F3F3F3] text-[#191A23] border-[#191A23]';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '';
      case 'important': return '';
      case 'normal': return '';
      case 'maintain': return '';
      default: return '';
    }
  };

  const filteredStudents = analysisResult?.students?.filter((student: any) => {
    const priorityMatch = selectedPriority === 'all' || student.priority_level === selectedPriority;
    const studentMatch = selectedStudent === 'all' || student.student_id === selectedStudent;
    return priorityMatch && studentMatch;
  }) || [];

  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardContent className="p-12 text-center">
          <Users className="h-16 w-16 text-[#B9FF66] mx-auto mb-6" />
          <p className="text-2xl font-black text-[#191A23] mb-3"> AI顾问待命中</p>
          <p className="text-[#191A23]/70 font-medium">需要学生成绩数据才能启动个性化AI指导</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* AI顾问控制台 */}
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardHeader className="bg-[#B9FF66] border-b-4 border-[#191A23] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-[#191A23] rounded-full border-2 border-black">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black text-[#191A23]">
                   AI学生顾问
                </CardTitle>
                <p className="text-[#191A23]/80 font-medium mt-2">
                  我的学生需要什么？让AI基于成绩数据为每个学生定制方案
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={startAIGuidance}
                disabled={isAnalyzing}
                className="bg-[#191A23] hover:bg-[#2A2B35] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    AI分析中...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    启动AI指导
                  </>
                )}
              </Button>
              {analysisResult && (
                <Button
                  onClick={exportGuidanceReport}
                  className="bg-[#F7931E] hover:bg-[#E8821C] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出指导
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <div className="flex items-center gap-4">
            <Eye className="w-5 h-5 text-[#191A23]" />
            <p className="text-[#191A23] font-medium">
              AI将为 <span className="font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded">{new Set(gradeData.map(r => r.student_id)).size}</span> 名学生
              生成个性化学习指导方案
            </p>
          </div>
          {analysisError && (
            <Alert className="mt-4 border-2 border-[#FF6B6B] bg-[#FF6B6B]/10">
              <AlertTriangle className="h-4 w-4 text-[#FF6B6B]" />
              <AlertDescription className="font-medium text-[#191A23]">
                {analysisError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* AI分析进度 */}
      {isAnalyzing && (
        <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
          <CardContent className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-[#B9FF66] border-r-transparent mb-6"></div>
            <p className="text-2xl font-black text-[#191A23] mb-4"> AI正在为每个学生定制方案...</p>
            <div className="space-y-2 text-[#191A23]/70 font-medium">
              <p> 分析个人学习轨迹和模式</p>
              <p> 识别学习优势和挑战领域</p>
              <p> 生成个性化学习建议</p>
              <p> 制定可执行的行动计划</p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[#191A23]/60">
              <Clock className="w-4 h-4" />
              <span className="text-sm">学生越多分析时间越长，请耐心等待</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI指导结果 */}
      {analysisResult && (
        <div className="space-y-6">
          {/* 分析概况 */}
          <Card className="border-3 border-[#B9FF66] shadow-[6px_6px_0px_0px_#191A23] bg-white">
            <CardHeader className="bg-[#B9FF66]/30 border-b-3 border-[#B9FF66] p-6">
              <CardTitle className="text-2xl font-bold text-[#191A23] flex items-center gap-3">
                <Brain className="w-6 h-6" />
                 AI分析概况
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-[#B9FF66]/10 border border-[#B9FF66] rounded-lg">
                  <div className="text-3xl font-black text-[#191A23] mb-2">
                    {analysisResult.summary.total_analyzed}
                  </div>
                  <div className="text-sm font-bold text-[#191A23]/70">分析学生数</div>
                </div>
                <div className="text-center p-4 bg-[#F7931E]/10 border border-[#F7931E] rounded-lg">
                  <div className="text-3xl font-black text-[#191A23] mb-2">
                    {analysisResult.summary.patterns_identified.length}
                  </div>
                  <div className="text-sm font-bold text-[#191A23]/70">识别模式数</div>
                </div>
                <div className="text-center p-4 bg-[#9C88FF]/10 border border-[#9C88FF] rounded-lg">
                  <div className="text-3xl font-black text-[#191A23] mb-2">
                    {analysisResult.summary.overall_recommendations.length}
                  </div>
                  <div className="text-sm font-bold text-[#191A23]/70">整体建议数</div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-[#F8F8F8] border border-[#B9FF66] rounded-lg">
                <h4 className="font-bold text-[#191A23] mb-3"> AI整体建议</h4>
                <ul className="space-y-2">
                  {analysisResult.summary.overall_recommendations.map((rec: string, index: number) => (
                    <li key={index} className="text-[#191A23] font-medium flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-[#F7931E] mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 筛选器 */}
          <Card className="border-2 border-[#B9FF66] bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-[#191A23]" />
                <span className="font-bold text-[#191A23]">筛选学生:</span>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-40 border-2 border-[#B9FF66]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部优先级</SelectItem>
                    <SelectItem value="urgent"> 紧急关注</SelectItem>
                    <SelectItem value="important"> 重点关注</SelectItem>
                    <SelectItem value="normal"> 正常关注</SelectItem>
                    <SelectItem value="maintain"> 保持现状</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[#191A23]/70">共 {filteredStudents.length} 个学生</span>
              </div>
            </CardContent>
          </Card>

          {/* 学生个性化指导卡片 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredStudents.map((student: any, index: number) => (
              <Card key={student.student_id} className="border-3 border-[#191A23] shadow-[4px_4px_0px_0px_#B9FF66] bg-white">
                <CardHeader className="bg-[#B9FF66]/20 border-b-2 border-[#B9FF66] p-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-bold text-[#191A23] flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#B9FF66] text-[#191A23] rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      {student.name}
                    </CardTitle>
                    <Badge className={`border-2 border-black font-bold ${getPriorityColor(student.priority_level)}`}>
                      {getPriorityIcon(student.priority_level)} {
                        student.priority_level === 'urgent' ? '紧急关注' :
                        student.priority_level === 'important' ? '重点关注' :
                        student.priority_level === 'normal' ? '正常关注' : '保持现状'
                      }
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 bg-white space-y-4">
                  {/* 学习模式识别 */}
                  <div className="p-4 bg-[#F8F8F8] border border-[#B9FF66] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-bold text-[#191A23] text-sm flex items-center gap-1">
                        <Brain className="w-4 h-4" />
                         AI识别学习模式
                      </h5>
                      <Badge className="bg-[#191A23] text-white text-xs">
                        {(student.learning_pattern.confidence * 100).toFixed(0)}% 置信度
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded text-sm w-fit">
                        {student.learning_pattern.type}
                      </div>
                      <p className="text-sm text-[#191A23]">{student.learning_pattern.description}</p>
                    </div>
                  </div>

                  {/* 个性化学习计划 */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-[#191A23] text-sm flex items-center gap-1">
                      <Target className="w-4 h-4" />
                       AI个性化计划
                    </h5>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-[#B9FF66]/10 border border-[#B9FF66] rounded">
                        <p className="text-xs font-bold text-[#191A23] mb-1">学习目标</p>
                        <div className="flex flex-wrap gap-1">
                          {student.personalized_plan.goals.map((goal: string, idx: number) => (
                            <Badge key={idx} className="bg-[#B9FF66] text-[#191A23] text-xs border border-black">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="p-3 bg-[#F7931E]/10 border border-[#F7931E] rounded">
                        <p className="text-xs font-bold text-[#191A23] mb-1">推荐方法</p>
                        <ul className="text-xs text-[#191A23] space-y-1">
                          {student.personalized_plan.methods.map((method: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-[#F7931E]">•</span>
                              {method}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#9C88FF]/10 border border-[#9C88FF] rounded">
                      <div>
                        <p className="text-xs font-bold text-[#191A23]">时间安排</p>
                        <p className="text-xs text-[#191A23]">{student.personalized_plan.timeline}</p>
                      </div>
                      <Clock className="w-4 h-4 text-[#9C88FF]" />
                    </div>

                    <div className="p-3 bg-[#191A23] text-white rounded">
                      <p className="text-xs font-bold mb-1"> 预期效果</p>
                      <p className="text-xs">{student.personalized_plan.expected_outcome}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAIAdvisor;