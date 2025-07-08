/**
 * 🏫 班级AI诊断师组件 - 真AI版本
 * 我的班级怎么样？- 让AI告诉你答案
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Lightbulb,
  Zap,
  Download,
  RefreshCw,
  Clock,
  Award,
  Eye
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

interface ClassAIDiagnosticianProps {
  gradeData: GradeRecord[];
  className?: string;
}

const ClassAIDiagnostician: React.FC<ClassAIDiagnosticianProps> = ({ 
  gradeData, 
  className = "" 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [aiStatus, setAiStatus] = useState<{isConfigured: boolean, hasClient: boolean} | null>(null);

  // 生成数据唯一标识符用于缓存
  const dataHash = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return '';
    try {
      // 基于数据内容生成简单的哈希
      const dataString = JSON.stringify(gradeData.map(r => ({
        student_id: r.student_id,
        subject: r.subject,
        score: r.score,
        exam_date: r.exam_date
      })).sort());
      
      // 使用安全的编码方式处理中文字符
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString);
      
      // 简单哈希算法
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      
      return Math.abs(hash).toString(36).slice(0, 16);
    } catch (error) {
      console.warn('生成数据哈希失败:', error);
      return `fallback_${Date.now()}`;
    }
  }, [gradeData]);

  // 缓存键
  const cacheKey = `ai_analysis_${dataHash}`;

  // 组件加载时尝试从localStorage恢复AI分析结果
  useEffect(() => {
    if (dataHash && !analysisResult) {
      // 使用setTimeout避免在渲染期间调用setState
      const timeoutId = setTimeout(() => {
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsedCache = JSON.parse(cached);
            // 检查缓存时间（24小时有效期）
            const now = Date.now();
            const cacheAge = now - parsedCache.timestamp;
            const maxAge = 24 * 60 * 60 * 1000; // 24小时
            
            if (cacheAge < maxAge) {
              console.info('🔄 从缓存恢复AI分析结果');
              setAnalysisResult(parsedCache.data);
            } else {
              console.info('⏰ 缓存已过期，清除旧数据');
              localStorage.removeItem(cacheKey);
            }
          }
        } catch (error) {
          console.warn('恢复AI分析缓存失败:', error);
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [dataHash, cacheKey, analysisResult]);

  // 保存AI分析结果到localStorage
  const saveAnalysisToCache = (result: any) => {
    if (dataHash && result) {
      try {
        const cacheData = {
          data: result,
          timestamp: Date.now(),
          dataHash
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.info('💾 AI分析结果已保存到缓存');
      } catch (error) {
        console.warn('保存AI分析缓存失败:', error);
      }
    }
  };

  // 调试信息
  console.log(' ClassAIDiagnostician 渲染状态:', {
    hasGradeData: !!gradeData && gradeData.length > 0,
    gradeDataCount: gradeData?.length || 0,
    isAnalyzing,
    hasAnalysisResult: !!analysisResult,
    analysisError,
    aiStatus
  });

  const startAIDiagnosis = async () => {
    if (!gradeData || gradeData.length === 0) {
      setAnalysisError('需要成绩数据才能进行AI诊断');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const aiService = AIAnalysisService.getInstance();
      
      // 刷新AI配置以确保使用最新设置
      await aiService.refreshAIConfig();
      
      // 获取AI状态
      const currentAiStatus = aiService.getAIStatus();
      setAiStatus(currentAiStatus);
      
      if (currentAiStatus.isConfigured) {
        console.info(' 正在使用您配置的AI服务进行分析...');
      } else {
        console.info(' 使用基于实际数据的智能模拟分析...');
      }
      
      const result = await aiService.analyzeClass(gradeData);
      console.log(' AI诊断成功，结果:', result);
      setAnalysisResult(result);
      
      // 保存结果到缓存
      saveAnalysisToCache(result);
    } catch (error) {
      console.error('AI诊断失败:', error);
      setAnalysisError(error instanceof Error ? error.message : '诊断过程中出现未知错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportReport = async () => {
    if (!analysisResult) return;

    try {
      // 生成AI分析报告
      const reportContent = `
# 🏫 班级AI诊断报告

##  整体评估
**班级水平**: ${analysisResult.overall_assessment.level}
**AI评价**: ${analysisResult.overall_assessment.description}
**分析置信度**: ${(analysisResult.overall_assessment.confidence * 100).toFixed(1)}%

## 📚 各科目分析
${analysisResult.subject_analysis.map((subject: any) => `
### ${subject.subject}
**优势表现**:
${subject.strengths.map((s: string) => `- ${s}`).join('\n')}

**需要改进**:
${subject.weaknesses.map((w: string) => `- ${w}`).join('\n')}

**教学建议**:
${subject.teaching_suggestions.map((t: string) => `- ${t}`).join('\n')}
`).join('\n')}

##  班级管理洞察
${analysisResult.management_insights.map((insight: any) => `
### ${insight.category}
**发现**: ${insight.insight}
**建议**: ${insight.recommendation}
**影响程度**: ${insight.impact_level}/10
`).join('\n')}

##  AI推荐行动计划
### 立即行动
${analysisResult.action_plan.immediate_actions.map((action: string) => `- ${action}`).join('\n')}

### 长期策略
${analysisResult.action_plan.long_term_strategies.map((strategy: string) => `- ${strategy}`).join('\n')}

### 成功指标
${analysisResult.action_plan.success_metrics.map((metric: string) => `- ${metric}`).join('\n')}

---
*本报告由AI分析生成，建议结合实际情况灵活运用*
`;

      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `班级AI诊断报告_${new Date().toLocaleDateString()}.md`;
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
      case 'high': return 'bg-[#FF6B6B] text-white';
      case 'medium': return 'bg-[#F7931E] text-white';
      case 'low': return 'bg-[#B9FF66] text-[#191A23]';
      default: return 'bg-[#F3F3F3] text-[#191A23]';
    }
  };

  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardContent className="p-12 text-center">
          <Brain className="h-16 w-16 text-[#B9FF66] mx-auto mb-6" />
          <p className="text-2xl font-black text-[#191A23] mb-3">🏫 AI诊断师待命中</p>
          <p className="text-[#191A23]/70 font-medium">需要成绩数据才能启动班级AI诊断</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* AI诊断师控制台 */}
      <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
        <CardHeader className="bg-[#B9FF66] border-b-4 border-[#191A23] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-[#191A23] rounded-full border-2 border-black">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black text-[#191A23]">
                  🏫 AI班级诊断师
                </CardTitle>
                <p className="text-[#191A23]/80 font-medium mt-2">
                  我的班级怎么样？让AI基于实际数据告诉你答案
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={startAIDiagnosis}
                disabled={isAnalyzing}
                className="bg-[#191A23] hover:bg-[#2A2B35] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    AI诊断中...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    启动AI诊断
                  </>
                )}
              </Button>
              {analysisResult && (
                <>
                  <Button
                    onClick={() => {
                      // 清除缓存并重新分析
                      localStorage.removeItem(cacheKey);
                      setAnalysisResult(null);
                      setAnalysisError('');
                      startAIDiagnosis();
                    }}
                    disabled={isAnalyzing}
                    className="bg-[#9C88FF] hover:bg-[#8B7AE6] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新分析
                  </Button>
                  <Button
                    onClick={exportReport}
                    className="bg-[#F7931E] hover:bg-[#E8821C] text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出报告
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 bg-white">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Eye className="w-5 h-5 text-[#191A23]" />
              <p className="text-[#191A23] font-medium">
                AI将深度分析 <span className="font-bold text-[#B9FF66] bg-[#191A23] px-2 py-1 rounded">{new Set(gradeData.map(r => r.student_id)).size}</span> 名学生的成绩数据，
                生成专业的班级诊断报告
              </p>
            </div>
            {aiStatus && (
              <div className="flex items-center gap-2">
                {aiStatus.isConfigured ? (
                  <>
                    <div className="w-2 h-2 bg-[#B9FF66] rounded-full"></div>
                    <span className="text-sm font-medium text-[#191A23]">
                       已配置AI服务 - 将使用您设置的豆包等AI进行真实分析
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-[#F7931E] rounded-full"></div>
                    <span className="text-sm font-medium text-[#191A23]">
                       未配置AI服务 - 将使用基于实际数据的智能模拟分析
                    </span>
                    <a href="/ai-settings" className="text-[#B9FF66] hover:underline text-sm font-bold">
                      去配置 →
                    </a>
                  </>
                )}
              </div>
            )}
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

      {/* AI诊断结果展示 */}
      {isAnalyzing && (
        <Card className="border-4 border-[#191A23] shadow-[8px_8px_0px_0px_#B9FF66] bg-white">
          <CardContent className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-solid border-[#B9FF66] border-r-transparent mb-6"></div>
            <p className="text-2xl font-black text-[#191A23] mb-4"> AI正在深度诊断班级...</p>
            <div className="space-y-2 text-[#191A23]/70 font-medium">
              <p> 分析学生成绩分布规律</p>
              <p> 识别各科目教学重点难点</p>
              <p> 生成个性化教学改进建议</p>
              <p> 制定科学的班级管理策略</p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-[#191A23]/60">
              <Clock className="w-4 h-4" />
              <span className="text-sm">AI分析通常需要30-60秒，请耐心等待</span>
            </div>
          </CardContent>
        </Card>
      )}

      {analysisResult && (
        <div className="space-y-6">
          {/* AI分析导航提示 */}
          <Card className="border-4 border-[#B9FF66] shadow-[8px_8px_0px_0px_#191A23] bg-gradient-to-r from-[#B9FF66]/20 to-[#F7931E]/20">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#B9FF66] rounded-full border-2 border-black animate-pulse">
                    <CheckCircle className="w-6 h-6 text-[#191A23]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#191A23]"> AI诊断完成！</h3>
                    <p className="text-[#191A23]/80 font-medium">
                      AI已生成 <span className="font-bold text-[#F7931E]">{analysisResult.subject_analysis?.length || 0}</span> 个科目分析
                      和 <span className="font-bold text-[#9C88FF]">{analysisResult.management_insights?.length || 0}</span> 项管理洞察
                    </p>
                    {/* 显示缓存状态 */}
                    {(() => {
                      try {
                        const cached = localStorage.getItem(cacheKey);
                        if (cached) {
                          const parsedCache = JSON.parse(cached);
                          const cacheAge = Date.now() - parsedCache.timestamp;
                          const minutes = Math.floor(cacheAge / (1000 * 60));
                          const hours = Math.floor(minutes / 60);
                          
                          if (hours > 0) {
                            return (
                              <p className="text-[#191A23]/60 text-sm mt-1">
                                💾 结果已保存，{hours}小时前生成
                              </p>
                            );
                          } else if (minutes > 0) {
                            return (
                              <p className="text-[#191A23]/60 text-sm mt-1">
                                💾 结果已保存，{minutes}分钟前生成
                              </p>
                            );
                          } else {
                            return (
                              <p className="text-[#191A23]/60 text-sm mt-1">
                                💾 结果已保存，刚刚生成
                              </p>
                            );
                          }
                        }
                      } catch (error) {
                        return null;
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <Badge className="bg-[#F7931E] text-white border-2 border-black font-bold px-4 py-2 text-center animate-bounce">
                  👆 点击下方标签查看详细分析
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="overflow-x-auto">
              <TabsList className="grid w-fit grid-cols-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1 h-auto">
                <TabsTrigger 
                  value="overview"
                  className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-[#191A23] font-bold border-2 border-transparent data-[state=active]:border-black transition-all px-4 py-3 text-center"
                >
                  整体诊断
                </TabsTrigger>
                <TabsTrigger 
                  value="subjects"
                  className="data-[state=active]:bg-[#F7931E] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black transition-all px-4 py-3 text-center"
                >
                  <div className="flex items-center gap-2">
                    科目分析
                    <Badge className="text-xs bg-[#FF6B6B] text-white border border-black px-1.5 py-0.5">
                      {analysisResult.subject_analysis?.length || 0}
                    </Badge>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="insights"
                  className="data-[state=active]:bg-[#9C88FF] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black transition-all px-4 py-3 text-center"
                >
                  <div className="flex items-center gap-2">
                    管理洞察
                    <Badge className="text-xs bg-[#FF6B6B] text-white border border-black px-1.5 py-0.5">
                      {analysisResult.management_insights?.length || 0}
                    </Badge>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="action"
                  className="data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black transition-all px-4 py-3 text-center"
                >
                  行动计划
                </TabsTrigger>
              </TabsList>
            </div>

          {/* 整体诊断 */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border-3 border-[#B9FF66] shadow-[6px_6px_0px_0px_#191A23] bg-white">
              <CardHeader className="bg-[#B9FF66]/30 border-b-3 border-[#B9FF66] p-6">
                <CardTitle className="text-2xl font-bold text-[#191A23] flex items-center gap-3">
                  <Award className="w-6 h-6" />
                   AI整体诊断结果
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="text-center p-6 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
                      <Badge className="mb-4 text-lg font-bold border-2 border-black bg-[#B9FF66] text-[#191A23] px-4 py-2">
                        {analysisResult.overall_assessment.level}班级
                      </Badge>
                      <div className="text-3xl font-black text-[#191A23] mb-2">
                        {(analysisResult.overall_assessment.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm font-bold text-[#191A23]/70">AI分析置信度</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-bold text-[#191A23] text-lg flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                       AI专业评价
                    </h4>
                    <div className="p-6 bg-[#F8F8F8] border-2 border-[#B9FF66]/50 rounded-lg">
                      <p className="text-[#191A23] font-medium leading-relaxed">
                        {analysisResult.overall_assessment.description}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 科目分析 */}
          <TabsContent value="subjects" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analysisResult.subject_analysis.map((subject: any, index: number) => (
                <Card key={index} className="border-3 border-[#F7931E] shadow-[4px_4px_0px_0px_#191A23] bg-white">
                  <CardHeader className="bg-[#F7931E]/20 border-b-2 border-[#F7931E] p-5">
                    <CardTitle className="font-bold text-[#191A23] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        {subject.subject}
                      </div>
                      <Badge className={`border-2 border-black ${getPriorityColor(subject.priority)}`}>
                        {subject.priority === 'high' ? ' 高优先级' :
                         subject.priority === 'medium' ? ' 中优先级' : ' 低优先级'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 bg-white space-y-4">
                    {/* 优势表现 */}
                    {subject.strengths.length > 0 && (
                      <div>
                        <h5 className="font-bold text-[#191A23] text-sm mb-2 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-[#B9FF66]" />
                           AI识别优势
                        </h5>
                        <ul className="space-y-1">
                          {subject.strengths.map((strength: string, idx: number) => (
                            <li key={idx} className="text-sm text-[#191A23] flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-[#B9FF66] rounded-full mt-2 flex-shrink-0"></div>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 需要改进 */}
                    {subject.weaknesses.length > 0 && (
                      <div>
                        <h5 className="font-bold text-[#191A23] text-sm mb-2 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-[#FF6B6B]" />
                           AI发现问题
                        </h5>
                        <ul className="space-y-1">
                          {subject.weaknesses.map((weakness: string, idx: number) => (
                            <li key={idx} className="text-sm text-[#191A23] flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-[#FF6B6B] rounded-full mt-2 flex-shrink-0"></div>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* AI教学建议 */}
                    <div className="bg-[#F7931E]/10 p-3 border border-[#F7931E] rounded">
                      <h5 className="font-bold text-[#191A23] text-sm mb-2 flex items-center gap-1">
                        <Lightbulb className="w-4 h-4 text-[#F7931E]" />
                         AI教学建议
                      </h5>
                      <ul className="space-y-1">
                        {subject.teaching_suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="text-sm text-[#191A23]">
                            • {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 管理洞察 */}
          <TabsContent value="insights" className="space-y-6">
            <div className="space-y-4">
              {analysisResult.management_insights.map((insight: any, index: number) => (
                <Card key={index} className="border-3 border-[#9C88FF] shadow-[4px_4px_0px_0px_#191A23] bg-[#9C88FF]/10">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white border-2 border-black rounded-full">
                        <Lightbulb className="w-5 h-5 text-[#9C88FF]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-black text-[#191A23] text-lg">{insight.category}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#191A23]">影响力</span>
                            <div className="flex gap-1">
                              {Array.from({length: 5}).map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full border border-black ${
                                  i < Math.ceil(insight.impact_level / 2) ? 'bg-[#9C88FF]' : 'bg-gray-300'
                                }`}></div>
                              ))}
                            </div>
                            <span className="text-sm font-bold text-[#191A23]">{insight.impact_level}/10</span>
                          </div>
                        </div>
                        <p className="text-[#191A23] font-medium mb-3"> {insight.insight}</p>
                        <div className="p-3 bg-white border-2 border-black rounded-lg">
                          <h5 className="font-bold text-[#191A23] text-sm mb-2"> AI建议</h5>
                          <p className="text-[#191A23] text-sm">{insight.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 行动计划 */}
          <TabsContent value="action" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 立即行动 */}
              <Card className="border-3 border-[#FF6B6B] shadow-[4px_4px_0px_0px_#191A23] bg-white">
                <CardHeader className="bg-[#FF6B6B]/20 border-b-2 border-[#FF6B6B] p-5">
                  <CardTitle className="font-bold text-[#191A23] flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                     立即行动
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white space-y-3">
                  {analysisResult.action_plan.immediate_actions.map((action: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-[#FF6B6B]/10 border border-[#FF6B6B] rounded">
                      <div className="w-6 h-6 bg-[#FF6B6B] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-[#191A23] font-medium">{action}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 长期策略 */}
              <Card className="border-3 border-[#F7931E] shadow-[4px_4px_0px_0px_#191A23] bg-white">
                <CardHeader className="bg-[#F7931E]/20 border-b-2 border-[#F7931E] p-5">
                  <CardTitle className="font-bold text-[#191A23] flex items-center gap-2">
                    <Target className="w-5 h-5" />
                     长期策略
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white space-y-3">
                  {analysisResult.action_plan.long_term_strategies.map((strategy: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-[#F7931E]/10 border border-[#F7931E] rounded">
                      <div className="w-6 h-6 bg-[#F7931E] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-sm text-[#191A23] font-medium">{strategy}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* 成功指标 */}
              <Card className="border-3 border-[#B9FF66] shadow-[4px_4px_0px_0px_#191A23] bg-white">
                <CardHeader className="bg-[#B9FF66]/20 border-b-2 border-[#B9FF66] p-5">
                  <CardTitle className="font-bold text-[#191A23] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                     成功指标
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white space-y-3">
                  {analysisResult.action_plan.success_metrics.map((metric: string, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-[#B9FF66]/10 border border-[#B9FF66] rounded">
                      <div className="w-6 h-6 bg-[#B9FF66] text-[#191A23] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        ✓
                      </div>
                      <p className="text-sm text-[#191A23] font-medium">{metric}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      )}
    </div>
  );
};

export default ClassAIDiagnostician;