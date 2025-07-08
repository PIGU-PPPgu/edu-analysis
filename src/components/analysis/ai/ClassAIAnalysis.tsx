/**
 *  班级AI智能分析组件
 * 为老师提供全面的班级学情、学科诊断和教学建议
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  BookOpen,
  Users,
  Target,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Award,
  FileText,
  Download,
  Zap,
  Eye,
  Lightbulb,
  BarChart3,
  PieChart
} from 'lucide-react';

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

interface ClassAIAnalysisProps {
  gradeData: GradeRecord[];
  className?: string;
}

interface ClassInsight {
  type: 'strength' | 'weakness' | 'opportunity' | 'threat';
  category: 'academic' | 'management' | 'teaching';
  title: string;
  description: string;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
  impact: number; // 1-10
}

interface SubjectAnalysis {
  subject: string;
  averageScore: number;
  passRate: number;
  excellentRate: number;
  trend: 'improving' | 'declining' | 'stable';
  strongPoints: string[];
  weakPoints: string[];
  teachingAdvice: string[];
  studentConcerns: string[];
}

const ClassAIAnalysis: React.FC<ClassAIAnalysisProps> = ({ 
  gradeData, 
  className = "" 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState('overview');

  // AI分析：班级整体学情
  const classOverview = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return null;

    const students = new Set(gradeData.map(r => r.student_id)).size;
    const subjects = new Set(gradeData.map(r => r.subject)).size;
    const averageScore = gradeData.reduce((sum, r) => sum + (r.score || 0), 0) / gradeData.length;
    const passRate = (gradeData.filter(r => (r.score || 0) >= 60).length / gradeData.length) * 100;
    const excellentRate = (gradeData.filter(r => (r.score || 0) >= 90).length / gradeData.length) * 100;

    // AI生成学情评估
    let classLevel = '待提高';
    let classDescription = '';
    let urgentActions = [];

    if (averageScore >= 85 && passRate >= 90) {
      classLevel = '优秀';
      classDescription = '班级整体表现优异，学生基础扎实，学习氛围浓厚';
      urgentActions = ['保持优势科目领先地位', '挖掘潜力学生冲刺高分', '建立学习标杆效应'];
    } else if (averageScore >= 75 && passRate >= 80) {
      classLevel = '良好';
      classDescription = '班级表现稳定，但仍有提升空间，需要重点关注薄弱环节';
      urgentActions = ['强化薄弱科目训练', '关注中等生提升', '建立学习互助小组'];
    } else if (averageScore >= 65 && passRate >= 70) {
      classLevel = '中等';
      classDescription = '班级成绩处于中等水平，需要系统性改进教学策略';
      urgentActions = ['全面诊断学习问题', '实施分层教学', '加强基础知识训练'];
    } else {
      classLevel = '需要改进';
      classDescription = '班级整体成绩偏低，需要立即采取干预措施';
      urgentActions = ['紧急制定提升方案', '一对一辅导学困生', '调整教学进度和方法'];
    }

    return {
      students,
      subjects,
      averageScore,
      passRate,
      excellentRate,
      classLevel,
      classDescription,
      urgentActions
    };
  }, [gradeData]);

  // AI分析：各科目智能诊断
  const subjectAnalysis = useMemo((): SubjectAnalysis[] => {
    if (!gradeData || gradeData.length === 0) return [];

    const subjectGroups = gradeData.reduce((acc, record) => {
      const subject = record.subject || '未知科目';
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(record);
      return acc;
    }, {} as Record<string, GradeRecord[]>);

    return Object.entries(subjectGroups).map(([subject, records]) => {
      const scores = records.map(r => r.score || 0).filter(s => s > 0);
      const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const passRate = (scores.filter(s => s >= 60).length / scores.length) * 100;
      const excellentRate = (scores.filter(s => s >= 90).length / scores.length) * 100;

      // AI生成教学建议
      let strongPoints = [];
      let weakPoints = [];
      let teachingAdvice = [];
      let studentConcerns = [];
      let trend: 'improving' | 'declining' | 'stable' = 'stable';

      if (averageScore >= 80) {
        strongPoints.push('学生基础扎实', '整体理解能力强');
        teachingAdvice.push('保持现有教学节奏', '适当增加拓展内容');
      } else if (averageScore >= 70) {
        strongPoints.push('大部分学生掌握基础知识');
        weakPoints.push('少数学生存在知识盲点');
        teachingAdvice.push('加强重点难点讲解', '实施分层作业');
      } else {
        weakPoints.push('基础知识掌握不牢', '学习方法需要改进');
        teachingAdvice.push('回归基础知识教学', '增加练习强度', '个别化辅导');
        studentConcerns.push(`${Math.round((100 - passRate))}%的学生需要重点关注`);
      }

      if (passRate < 60) {
        studentConcerns.push('超过40%学生不及格，需要紧急干预');
        teachingAdvice.push('立即调整教学策略', '增加课堂互动', '强化基础练习');
      }

      return {
        subject,
        averageScore,
        passRate,
        excellentRate,
        trend,
        strongPoints,
        weakPoints,
        teachingAdvice,
        studentConcerns
      };
    }).sort((a, b) => b.averageScore - a.averageScore);
  }, [gradeData]);

  // AI生成班级管理建议
  const classManagementInsights = useMemo((): ClassInsight[] => {
    if (!classOverview) return [];

    const insights: ClassInsight[] = [];

    // 学业表现洞察
    if (classOverview.excellentRate > 30) {
      insights.push({
        type: 'strength',
        category: 'academic',
        title: '优等生群体突出',
        description: `班级有${classOverview.excellentRate.toFixed(1)}%的学生达到优秀水平`,
        recommendation: '建立学习标杆，发挥优等生的带动作用，组织学习经验分享',
        priority: 'medium',
        impact: 8
      });
    }

    if (classOverview.passRate < 70) {
      insights.push({
        type: 'threat',
        category: 'academic',
        title: '学困生比例偏高',
        description: `${(100 - classOverview.passRate).toFixed(1)}%的学生处于不及格状态`,
        recommendation: '立即启动学困生帮扶计划，实施一对一辅导，调整教学策略',
        priority: 'high',
        impact: 9
      });
    }

    // 教学策略建议
    if (classOverview.averageScore >= 75 && classOverview.averageScore <= 85) {
      insights.push({
        type: 'opportunity',
        category: 'teaching',
        title: '提升空间明显',
        description: '班级整体水平良好，具备进一步提升的潜力',
        recommendation: '适当增加挑战性内容，培养学生高阶思维能力',
        priority: 'medium',
        impact: 7
      });
    }

    // 班级管理建议
    insights.push({
      type: 'opportunity',
      category: 'management',
      title: '分层教学机会',
      description: '学生水平差异为实施分层教学提供了条件',
      recommendation: '根据学生能力分组，设计差异化教学方案和作业',
      priority: 'high',
      impact: 8
    });

    return insights.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return b.impact - a.impact;
    });
  }, [classOverview]);

  const startAIAnalysis = async () => {
    setIsAnalyzing(true);
    // 模拟AI分析过程
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  const exportReport = async () => {
    if (!classOverview) return;
    
    try {
      // 创建Excel工作簿
      const XLSX = await import('xlsx');
      
      // 班级概况数据
      const overviewData = [
        ['班级AI智能分析报告', ''],
        ['生成时间', new Date().toLocaleString()],
        ['', ''],
        ['班级基本情况', ''],
        ['学生总数', classOverview.students],
        ['科目数量', classOverview.subjects],
        ['班级平均分', classOverview.averageScore.toFixed(1)],
        ['及格率', `${classOverview.passRate.toFixed(1)}%`],
        ['班级等级', classOverview.classLevel],
        ['', ''],
        ['班级描述', classOverview.classDescription]
      ];
      
      // 学科分析数据
      const subjectHeaders = ['科目', '平均分', '及格率', '优秀率', '趋势', '教学建议'];
      const subjectData = subjectAnalysis.map(subject => [
        subject.subject,
        subject.averageScore.toFixed(1),
        `${subject.passRate.toFixed(1)}%`,
        `${subject.excellentRate.toFixed(1)}%`,
        subject.trend === 'improving' ? '上升' : subject.trend === 'declining' ? '下降' : '稳定',
        subject.teachingAdvice.join('; ')
      ]);
      
      // 创建工作表
      const wb = XLSX.utils.book_new();
      
      // 添加班级概况工作表
      const overviewWS = XLSX.utils.aoa_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(wb, overviewWS, '班级概况');
      
      // 添加学科分析工作表
      const subjectWS = XLSX.utils.aoa_to_sheet([subjectHeaders, ...subjectData]);
      XLSX.utils.book_append_sheet(wb, subjectWS, '学科分析');
      
      // 导出文件
      const fileName = `班级AI分析报告_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      // 显示成功提示
      console.log('AI分析报告导出成功:', fileName);
    } catch (error) {
      console.error('导出报告失败:', error);
    }
  };

  const getInsightIcon = (type: ClassInsight['type']) => {
    switch (type) {
      case 'strength': return <CheckCircle className="w-5 h-5 text-[#B9FF66]" />;
      case 'weakness': return <AlertTriangle className="w-5 h-5 text-[#FF6B6B]" />;
      case 'opportunity': return <Lightbulb className="w-5 h-5 text-[#F7931E]" />;
      case 'threat': return <AlertTriangle className="w-5 h-5 text-[#FF6B6B]" />;
    }
  };

  const getInsightColor = (type: ClassInsight['type']) => {
    switch (type) {
      case 'strength': return 'bg-[#B9FF66]/20 border-[#B9FF66]';
      case 'weakness': return 'bg-[#FF6B6B]/20 border-[#FF6B6B]';
      case 'opportunity': return 'bg-[#F7931E]/20 border-[#F7931E]';
      case 'threat': return 'bg-[#FF6B6B]/20 border-[#FF6B6B]';
    }
  };

  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardContent className="p-12 text-center">
          <Brain className="h-16 w-16 text-[#B9FF66] mx-auto mb-6" />
          <p className="text-2xl font-black text-[#191A23] mb-3"> 暂无数据</p>
          <p className="text-[#191A23]/70 font-medium">需要成绩数据才能进行AI智能分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* AI分析启动控制台 */}
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardHeader className="bg-[#B9FF66] border-b-4 border-[#191A23] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-[#191A23] rounded-full border-2 border-black">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black text-[#191A23]">
                   AI班级智能分析师
                </CardTitle>
                <p className="text-[#191A23]/80 font-medium mt-2">
                  专业的班级学情诊断与教学建议助手
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={startAIAnalysis}
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
                    启动AI分析
                  </>
                )}
              </Button>
              {analysisComplete && (
                <Button
                  onClick={exportReport}
                  className="bg-[#F7931E] hover:bg-[#E8821C] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出报告
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <div className="flex items-center gap-4">
            <Eye className="w-5 h-5 text-[#191A23]" />
            <p className="text-[#191A23] font-medium">
              将分析 <span className="font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded">{classOverview?.students || 0}</span> 名学生，
              <span className="font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded mx-1">{classOverview?.subjects || 0}</span> 个科目的成绩数据
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI分析结果展示 */}
      {(isAnalyzing || analysisComplete) && (
        <div className="space-y-8">
          {isAnalyzing ? (
            <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
              <CardContent className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-[#B9FF66] border-r-transparent mb-6"></div>
                <p className="text-2xl font-black text-[#191A23] mb-4"> AI正在深度分析中...</p>
                <div className="space-y-2 text-[#191A23]/70 font-medium">
                  <p> 分析学生成绩分布模式</p>
                  <p> 识别各科目教学重点</p>
                  <p> 生成个性化教学建议</p>
                  <p> 制定班级管理策略</p>
                </div>
                <Progress value={75} className="w-64 mx-auto mt-6 h-3 border-2 border-black" />
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab} className="space-y-6">
              <TabsList className="grid w-fit grid-cols-3 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
                <TabsTrigger 
                  value="overview"
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black"
                >
                   班级概况
                </TabsTrigger>
                <TabsTrigger 
                  value="subjects"
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black"
                >
                  📚 学科诊断
                </TabsTrigger>
                <TabsTrigger 
                  value="insights"
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black"
                >
                   智能建议
                </TabsTrigger>
              </TabsList>

              {/* 班级概况 */}
              <TabsContent value="overview" className="space-y-6">
                {classOverview && (
                  <Card className="border-3 border-[#B9FF66] shadow-[6px_6px_0px_0px_#191A23] bg-white">
                    <CardHeader className="bg-[#B9FF66]/30 border-b-3 border-[#B9FF66] p-6">
                      <CardTitle className="text-2xl font-bold text-[#191A23] flex items-center gap-3">
                        <BarChart3 className="w-6 h-6" />
                         班级整体学情AI分析
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 bg-white">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* 关键指标 */}
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
                              <div className="text-3xl font-black text-[#191A23] mb-2">
                                {classOverview.averageScore.toFixed(1)}
                              </div>
                              <div className="text-sm font-bold text-[#191A23]/70">班级平均分</div>
                            </div>
                            <div className="text-center p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
                              <div className="text-3xl font-black text-[#191A23] mb-2">
                                {classOverview.passRate.toFixed(1)}%
                              </div>
                              <div className="text-sm font-bold text-[#191A23]/70">及格率</div>
                            </div>
                          </div>
                          
                          <div className="p-6 bg-[#F8F8F8] border-2 border-[#B9FF66]/50 rounded-lg">
                            <h4 className="font-bold text-[#191A23] mb-3 flex items-center gap-2">
                              <Award className="w-5 h-5" />
                              AI学情评估
                            </h4>
                            <Badge className={`mb-3 font-bold border-2 border-black ${
                              classOverview.classLevel === '优秀' ? 'bg-[#B9FF66] text-[#191A23]' :
                              classOverview.classLevel === '良好' ? 'bg-[#F7931E] text-white' :
                              classOverview.classLevel === '中等' ? 'bg-[#9C88FF] text-white' :
                              'bg-[#FF6B6B] text-white'
                            }`}>
                              {classOverview.classLevel}班级
                            </Badge>
                            <p className="text-[#191A23] font-medium leading-relaxed">
                              {classOverview.classDescription}
                            </p>
                          </div>
                        </div>

                        {/* AI建议行动 */}
                        <div className="space-y-4">
                          <h4 className="font-bold text-[#191A23] text-lg flex items-center gap-2">
                            <Target className="w-5 h-5" />
                             AI推荐行动方案
                          </h4>
                          {classOverview.urgentActions.map((action, index) => (
                            <Alert key={index} className="border-2 border-[#F7931E] bg-[#F7931E]/10">
                              <Lightbulb className="h-4 w-4 text-[#F7931E]" />
                              <AlertDescription className="font-medium text-[#191A23]">
                                {action}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* 学科诊断 */}
              <TabsContent value="subjects" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {subjectAnalysis.map((subject, index) => (
                    <Card key={subject.subject} className="border-3 border-[#B9FF66] shadow-[4px_4px_0px_0px_#191A23] bg-white">
                      <CardHeader className="bg-[#B9FF66]/20 border-b-2 border-[#B9FF66] p-5">
                        <CardTitle className="font-bold text-[#191A23] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            {subject.subject}
                          </div>
                          <Badge className="bg-[#191A23] text-white border border-black">
                            平均 {subject.averageScore.toFixed(1)}分
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 bg-white space-y-4">
                        {/* 成绩指标 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-[#F8F8F8] border border-[#B9FF66] rounded">
                            <div className="font-bold text-[#191A23]">{subject.passRate.toFixed(1)}%</div>
                            <div className="text-xs text-[#191A23]/70">及格率</div>
                          </div>
                          <div className="text-center p-3 bg-[#F8F8F8] border border-[#B9FF66] rounded">
                            <div className="font-bold text-[#191A23]">{subject.excellentRate.toFixed(1)}%</div>
                            <div className="text-xs text-[#191A23]/70">优秀率</div>
                          </div>
                        </div>

                        {/* AI分析结果 */}
                        {subject.strongPoints.length > 0 && (
                          <div>
                            <h5 className="font-bold text-[#191A23] text-sm mb-2 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-[#B9FF66]" />
                              优势表现
                            </h5>
                            <ul className="space-y-1">
                              {subject.strongPoints.map((point, idx) => (
                                <li key={idx} className="text-sm text-[#191A23] flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 bg-[#B9FF66] rounded-full mt-2 flex-shrink-0"></div>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {subject.weakPoints.length > 0 && (
                          <div>
                            <h5 className="font-bold text-[#191A23] text-sm mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-[#FF6B6B]" />
                              需要改进
                            </h5>
                            <ul className="space-y-1">
                              {subject.weakPoints.map((point, idx) => (
                                <li key={idx} className="text-sm text-[#191A23] flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 bg-[#FF6B6B] rounded-full mt-2 flex-shrink-0"></div>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 教学建议 */}
                        <div className="bg-[#B9FF66]/10 p-3 border border-[#B9FF66] rounded">
                          <h5 className="font-bold text-[#191A23] text-sm mb-2 flex items-center gap-1">
                            <Lightbulb className="w-4 h-4 text-[#F7931E]" />
                            教学建议
                          </h5>
                          <ul className="space-y-1">
                            {subject.teachingAdvice.map((advice, idx) => (
                              <li key={idx} className="text-sm text-[#191A23]">
                                • {advice}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* 智能建议 */}
              <TabsContent value="insights" className="space-y-6">
                <div className="space-y-4">
                  {classManagementInsights.map((insight, index) => (
                    <Card key={index} className={`border-3 border-black shadow-[4px_4px_0px_0px_#B9FF66] ${getInsightColor(insight.type)}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white border-2 border-black rounded-full">
                            {getInsightIcon(insight.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-black text-[#191A23] text-lg">{insight.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge className={`font-bold border-2 border-black ${
                                  insight.priority === 'high' ? 'bg-[#FF6B6B] text-white' :
                                  insight.priority === 'medium' ? 'bg-[#F7931E] text-white' :
                                  'bg-[#9C88FF] text-white'
                                }`}>
                                  {insight.priority === 'high' ? ' 高' :
                                   insight.priority === 'medium' ? ' 中' : ' 低'}优先级
                                </Badge>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm font-bold text-[#191A23]">影响力</span>
                                  <div className="flex gap-1">
                                    {Array.from({length: 5}).map((_, i) => (
                                      <div key={i} className={`w-2 h-2 rounded-full border border-black ${
                                        i < Math.ceil(insight.impact / 2) ? 'bg-[#B9FF66]' : 'bg-gray-300'
                                      }`}></div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-[#191A23] font-medium mb-3">{insight.description}</p>
                            <div className="p-3 bg-white border-2 border-black rounded-lg">
                              <h5 className="font-bold text-[#191A23] text-sm mb-2"> AI建议行动</h5>
                              <p className="text-[#191A23] text-sm">{insight.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassAIAnalysis;