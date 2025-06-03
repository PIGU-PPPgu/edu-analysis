import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGradeAnalysis } from '@/contexts/GradeAnalysisContext';
import { supabase } from '@/integrations/supabase/client';
import { BrainCircuit, Loader2, Lightbulb, TrendingUp, AlertTriangle, BookOpen, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AIAnalysisResult {
  dataType: string;
  keyFindings: string[];
  subjectInsights: Array<{
    subject: string;
    performance: string;
    trends: string;
    recommendations: string;
  }>;
  overallRecommendations: string[];
  riskFactors: string[];
  opportunities: string[];
}

const IntelligentDataAnalyzer: React.FC = () => {
  const { gradeData, examInfo } = useGradeAnalysis();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisType, setAnalysisType] = useState<'comprehensive' | 'subject' | 'trend' | 'risk'>('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiConfig, setAiConfig] = useState<any>(null);

  // 从localStorage获取AI配置
  useEffect(() => {
    const loadAIConfig = () => {
      try {
        const savedConfig = localStorage.getItem('ai_config');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          setAiConfig(config);
        } else {
          setAiConfig(null);
        }
      } catch (error) {
        console.error('解析AI配置失败:', error);
        setAiConfig(null);
      }
    };

    loadAIConfig();

    // 监听localStorage变化，实时更新配置
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ai_config') {
        loadAIConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 准备分析数据
  const prepareAnalysisData = () => {
    if (!gradeData || gradeData.length === 0) {
      return null;
    }

    // 提取关键统计信息
    const subjects = [...new Set(gradeData.map(item => item.subject))].filter(Boolean);
    const classes = [...new Set(gradeData.map(item => item.class_name))].filter(Boolean);
    const averageScore = gradeData.reduce((sum, item) => sum + (item.score || 0), 0) / gradeData.length;
    
    // 各科目平均分
    const subjectStats = subjects.map(subject => {
      const subjectGrades = gradeData.filter(item => item.subject === subject);
      const avgScore = subjectGrades.reduce((sum, item) => sum + (item.score || 0), 0) / subjectGrades.length;
      const passRate = subjectGrades.filter(item => (item.score || 0) >= 60).length / subjectGrades.length;
      const excellentRate = subjectGrades.filter(item => (item.score || 0) >= 90).length / subjectGrades.length;
      
      return {
        subject,
        averageScore: avgScore.toFixed(1),
        passRate: (passRate * 100).toFixed(1),
        excellentRate: (excellentRate * 100).toFixed(1),
        studentCount: subjectGrades.length
      };
    });

    // 班级统计
    const classStats = classes.map(className => {
      const classGrades = gradeData.filter(item => item.class_name === className);
      const avgScore = classGrades.reduce((sum, item) => sum + (item.score || 0), 0) / classGrades.length;
      
      return {
        className,
        averageScore: avgScore.toFixed(1),
        studentCount: classGrades.length
      };
    });

    return {
      totalRecords: gradeData.length,
      totalStudents: [...new Set(gradeData.map(item => item.student_id))].length,
      examInfo: examInfo || {},
      overallAverage: averageScore.toFixed(1),
      subjectStats,
      classStats,
      subjects,
      classes
    };
  };

  // 生成AI分析提示词
  const generatePrompt = (data: any, type: string, customText?: string) => {
    const baseContext = `
作为教育数据分析专家，请分析以下学生成绩数据：

考试信息: ${data.examInfo.title || '未知考试'} (${data.examInfo.date || '未知日期'})
总体数据: ${data.totalRecords}条记录，${data.totalStudents}名学生
整体平均分: ${data.overallAverage}分
科目数量: ${data.subjects.length}个科目
班级数量: ${data.classes.length}个班级

各科目统计:
${data.subjectStats.map(s => `- ${s.subject}: 平均${s.averageScore}分, 及格率${s.passRate}%, 优秀率${s.excellentRate}%`).join('\n')}

各班级统计:
${data.classStats.map(c => `- ${c.className}: 平均${c.averageScore}分, ${c.studentCount}名学生`).join('\n')}
`;

    let specificPrompt = '';
    switch (type) {
      case 'comprehensive':
        specificPrompt = `
请从以下角度进行全面分析：
1. 数据类型识别和特征
2. 各科目表现深度分析
3. 学习趋势和模式发现
4. 潜在风险因素识别
5. 教学改进建议

要求返回JSON格式：
{
  "dataType": "数据类型描述",
  "keyFindings": ["关键发现1", "关键发现2", ...],
  "subjectInsights": [
    {
      "subject": "科目名",
      "performance": "表现分析",
      "trends": "趋势分析", 
      "recommendations": "改进建议"
    }
  ],
  "overallRecommendations": ["总体建议1", "总体建议2", ...],
  "riskFactors": ["风险因素1", "风险因素2", ...],
  "opportunities": ["机会点1", "机会点2", ...]
}`;
        break;
      case 'subject':
        specificPrompt = `请重点分析各科目的相对表现、强弱对比和改进空间。`;
        break;
      case 'trend':
        specificPrompt = `请重点分析学习趋势、进步模式和发展预测。`;
        break;
      case 'risk':
        specificPrompt = `请重点识别学习风险、预警信号和干预建议。`;
        break;
    }

    if (customText) {
      specificPrompt += `\n\n用户自定义要求: ${customText}`;
    }

    return baseContext + specificPrompt;
  };

  // 调用AI分析
  const performAIAnalysis = async () => {
    const analysisData = prepareAnalysisData();
    if (!analysisData) {
      toast.error('没有可分析的数据');
      return;
    }

    if (!aiConfig) {
      toast.error('请先在设置中配置AI服务', {
        description: '点击右上角的设置按钮进行配置',
        action: {
          label: '前往设置',
          onClick: () => navigate('/settings')
        }
      });
      return;
    }

    // 检查必要的配置项
    if (!aiConfig.provider || !aiConfig.apiKey) {
      toast.error('AI配置不完整', {
        description: '请确保已配置AI服务商和API密钥',
        action: {
          label: '前往设置',
          onClick: () => navigate('/settings')
        }
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const prompt = generatePrompt(analysisData, analysisType, customPrompt);

      // 调用AI服务
      const { data, error } = await supabase.functions.invoke('proxy-ai-request', {
        body: {
          providerId: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          endpoint: aiConfig.endpoint || 'https://api.openai.com/v1/chat/completions',
          data: {
            model: aiConfig.model || 'gpt-4',
            messages: [
              {
                role: 'system',
                content: '你是一个专业的教育数据分析师，擅长从学生成绩数据中发现模式、识别问题并提供改进建议。请用中文回答，并确保分析客观、专业、有建设性。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: aiConfig.temperature || 0.7,
            max_tokens: aiConfig.maxTokens || 2000
          }
        }
      });

      if (error) {
        throw new Error(`AI分析失败: ${error.message}`);
      }

      // 解析AI响应
      const aiResponse = data.data;
      let analysisText = '';
      
      if (aiResponse.choices && aiResponse.choices[0]) {
        analysisText = aiResponse.choices[0].message.content;
      } else {
        throw new Error('AI响应格式错误');
      }

      // 尝试解析JSON响应
      try {
        const result = JSON.parse(analysisText);
        setAnalysisResult(result);
        toast.success('AI分析完成');
      } catch {
        // 如果不是JSON格式，创建简单的结果对象
        setAnalysisResult({
          dataType: '智能分析结果',
          keyFindings: [analysisText.substring(0, 200) + '...'],
          subjectInsights: [],
          overallRecommendations: ['详细分析请查看完整报告'],
          riskFactors: [],
          opportunities: []
        });
        toast.success('AI分析完成（简化格式）');
      }

    } catch (error) {
      console.error('AI分析失败:', error);
      toast.error(`AI分析失败: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 获取AI配置显示信息
  const getAIConfigDisplay = () => {
    if (!aiConfig) return { provider: '未配置', model: '未配置', status: 'error' };
    
    const providerNames = {
      'openai': 'OpenAI',
      'doubao': '豆包',
      'deepseek': 'DeepSeek',
      'qwen': '通义千问',
      'baichuan': '百川'
    };

    return {
      provider: providerNames[aiConfig.provider] || aiConfig.provider,
      model: aiConfig.model || '默认模型',
      status: aiConfig.provider && aiConfig.apiKey ? 'success' : 'warning'
    };
  };

  const configDisplay = getAIConfigDisplay();

  return (
    <div className="space-y-6">
      {/* 分析控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            AI智能分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI配置状态显示 */}
          <div className="p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">当前AI配置</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/settings')}
              >
                修改设置
              </Button>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">服务商:</span>
                <Badge variant={configDisplay.status === 'success' ? 'default' : configDisplay.status === 'warning' ? 'secondary' : 'destructive'}>
                  {configDisplay.provider}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">模型:</span>
                <span className="text-xs font-mono text-gray-700">{configDisplay.model}</span>
              </div>
            </div>
            {configDisplay.status !== 'success' && (
              <p className="text-xs text-amber-600 mt-2">
                请先配置AI服务才能使用智能分析功能
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">分析类型</label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">🔍 综合分析 - 全面深度分析</SelectItem>
                  <SelectItem value="subject">📚 科目对比 - 学科表现对比</SelectItem>
                  <SelectItem value="trend">📈 趋势分析 - 成绩变化趋势</SelectItem>
                  <SelectItem value="risk">⚠️ 风险识别 - 预警和建议</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">自定义分析要求（可选）</label>
            <Textarea
              placeholder="例如：重点关注数学和物理的关联性，分析班级间的差异原因，关注学习困难学生的表现..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <Button 
            onClick={performAIAnalysis} 
            disabled={isAnalyzing || !gradeData || gradeData.length === 0 || !aiConfig}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                AI分析中...
              </>
            ) : (
              <>
                <BrainCircuit className="h-4 w-4 mr-2" />
                开始AI分析
              </>
            )}
          </Button>
          
          {!aiConfig && (
            <p className="text-sm text-gray-500 text-center">
              需要先在设置中配置AI服务
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI分析结果 */}
      {analysisResult && (
        <div className="space-y-4">
          {/* 关键发现 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                关键发现
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {analysisResult.keyFindings.map((finding, index) => (
                  <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p className="text-sm">{finding}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 科目洞察 */}
          {analysisResult.subjectInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  科目深度分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {analysisResult.subjectInsights.map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-semibold text-lg mb-3">{insight.subject}</h4>
                      <div className="space-y-2">
                        <div>
                          <Badge variant="outline">表现分析</Badge>
                          <p className="text-sm mt-1">{insight.performance}</p>
                        </div>
                        <div>
                          <Badge variant="outline">趋势分析</Badge>
                          <p className="text-sm mt-1">{insight.trends}</p>
                        </div>
                        <div>
                          <Badge variant="outline">改进建议</Badge>
                          <p className="text-sm mt-1">{insight.recommendations}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 风险因素和机会点 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 风险因素 */}
            {analysisResult.riskFactors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    风险因素
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisResult.riskFactors.map((risk, index) => (
                      <div key={index} className="p-2 bg-red-50 border-l-4 border-red-400 rounded">
                        <p className="text-sm">{risk}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 发展机会 */}
            {analysisResult.opportunities.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    发展机会
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analysisResult.opportunities.map((opportunity, index) => (
                      <div key={index} className="p-2 bg-green-50 border-l-4 border-green-400 rounded">
                        <p className="text-sm">{opportunity}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 总体建议 */}
          {analysisResult.overallRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI教学建议</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.overallRecommendations.map((recommendation, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default IntelligentDataAnalyzer; 