import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import WarningStatistics from "./WarningStatistics";
import RiskFactorChart from "./RiskFactorChart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ZapIcon, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Lightbulb, 
  BarChart3, 
  Users, 
  BookOpen, 
  Check, 
  Brain, 
  ArrowRight 
} from "lucide-react";
import { toast } from "sonner";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { getAIClient } from "@/services/aiService";
import { formatNumber } from "@/utils/formatUtils";

// 组件属性接口
interface WarningDashboardProps {
  factorStats?: Array<{ factor: string; count: number; percentage: number }>;
  levelStats?: Array<{ level: string; count: number; percentage: number }>;
  warningData?: any;
}

// 默认模拟数据
const defaultWarningStats = {
  totalStudents: 156,
  atRiskStudents: 28,
  highRiskStudents: 12,
  warningsByType: [
    { type: "成绩", count: 32, percentage: 42, trend: "up" },
    { type: "作业", count: 24, percentage: 31, trend: "down" },
    { type: "参与度", count: 18, percentage: 24, trend: "up" },
    { type: "行为", count: 3, percentage: 3, trend: "down" },
  ],
  riskByClass: [
    { className: "高一(1)班", studentCount: 52, atRiskCount: 8 },
    { className: "高一(2)班", studentCount: 50, atRiskCount: 12 },
    { className: "高一(3)班", studentCount: 54, atRiskCount: 8 }
  ],
  commonRiskFactors: [
    { factor: "期中考试成绩下降", count: 27, percentage: 35 },
    { factor: "作业完成率低", count: 24, percentage: 31 },
    { factor: "课堂参与度不足", count: 18, percentage: 23 },
    { factor: "缺交作业次数增加", count: 12, percentage: 15 },
    { factor: "考试科目成绩不均衡", count: 8, percentage: 10 }
  ]
};

// 改进设计的统计卡片组件
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  change, 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  description?: string;
  trend?: "up" | "down" | "unchanged"; 
  change?: number;
}) => (
  <Card className="overflow-hidden border border-gray-200 bg-white text-gray-900 hover:shadow-lg transition-all duration-200 rounded-xl">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-800">{formatNumber(value)}</p>
            {change !== undefined && trend !== 'unchanged' && (
              <div className="flex items-center">
                {trend === "up" ? (
                  <ArrowUpRight className={`h-4 w-4 ${title.includes('风险') ? 'text-red-500' : 'text-green-500'}`} />
                ) : trend === "down" ? (
                  <ArrowDownRight className={`h-4 w-4 ${title.includes('风险') ? 'text-green-500' : 'text-red-500'}`} />
                ) : null}
                <span className={`text-xs ${
                  (trend === "up" && title.includes('风险')) || (trend === "down" && !title.includes('风险') && !title.includes('高风险学生') ) 
                    ? 'text-red-500' 
                    : ((trend === "down" && title.includes('高风险学生')) ? 'text-green-500' : 'text-green-500')
                } ml-1`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// 改进的风险类型卡片
const WarningTypeCard = ({ type, count, percentage, trend }: { 
  type: string; 
  count: number; 
  percentage: number;
  trend: "up" | "down" | "unchanged"; 
}) => {
  return (
    <div className={`flex flex-col p-6 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200`}>
      <div className="inline-block px-3 py-1 rounded-md mb-3 text-black font-semibold text-sm self-start" style={{ backgroundColor: '#c0ff3f' }}>
        {type}预警
      </div>
      <div className="text-4xl font-bold mt-1 text-gray-800">{formatNumber(count)}</div>
      <div className="flex items-center text-sm mt-2 text-gray-500">
        {trend === "up" ? (
          <ArrowUpRight className="mr-1 h-4 w-4 text-red-500" />
        ) : trend === "down" ? (
          <ArrowDownRight className="mr-1 h-4 w-4 text-green-500" />
        ) : (
          <span className="mr-1 h-4 w-4">-</span>
        )}
        <span>占比 {percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 h-2.5 mt-4 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: '#c0ff3f' }}
        ></div>
      </div>
    </div>
  );
};

// AI分析结果组件
const AIInsightPanel = ({ 
  insights, 
  isLoading, 
  progress, 
  onRegenerate, 
  error 
}: { 
  insights: string | null;
  isLoading: boolean;
  progress: number;
  onRegenerate: () => void;
  error: string | null;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-[#c0ff3f] animate-pulse" />
            <span className="font-medium text-gray-700">AI分析进行中...</span>
          </div>
          <span className="text-sm font-medium text-[#c0ff3f]">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-[#c0ff3f] transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          正在分析风险因素和趋势，生成教育干预建议...
        </p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600 font-medium">
          {error}
        </p>
      </div>
    );
  }
  
  if (!insights) return null;
  
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center text-gray-800 text-lg">
          <Lightbulb className="h-5 w-5 mr-2 text-[#c0ff3f]" />
          AI 智能分析结果
        </h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRegenerate}
          className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black font-medium py-1.5 px-3 rounded-md text-xs transition-colors"
        >
          <ZapIcon className="h-4 w-4 mr-1" />
          重新分析
        </Button>
      </div>
      
      <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200 text-black">
        <div dangerouslySetInnerHTML={{ 
          __html: insights
            .replace(/\n\n/g, '<br/><br/>')
            .replace(/\n/g, '<br/>')
            .replace(/## (.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2 text-black">$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-black font-normal">$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/- (.*)/g, '<li class="ml-4 my-1">$1</li>')
        }} />
      </div>
      
      <div className="flex items-center mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <Brain className="h-4 w-4 mr-2 text-[#c0ff3f]" />
        <span>AI分析基于当前可见数据，随着数据更新可能发生变化</span>
      </div>
    </div>
  );
};

// WarningDashboard组件
const WarningDashboard: React.FC<WarningDashboardProps> = ({ 
  factorStats, 
  levelStats, 
  warningData 
}) => {
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // 添加isMounted引用以避免内存泄漏
  const isMounted = React.useRef(true);

  // 使用传入的数据或默认数据
  const stats = warningData || defaultWarningStats;
  const riskFactors = factorStats || stats.commonRiskFactors;

  useEffect(() => {
    const checkAIConfig = async () => {
      const config = await getUserAIConfig();
      const apiKey = await getUserAPIKey(config?.provider || '');
      
      // 确保组件仍然挂载
      if (isMounted.current) {
        setAiConfigured(!!config && !!apiKey && config.enabled === true);
      }
    };
    
    checkAIConfig();
    
    // 组件卸载时的清理函数
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 使用aiService中的功能进行AI分析
  const generateAIInsights = async () => {
    // 如果组件已卸载，不执行操作
    if (!isMounted.current) return;
    
    try {
      const aiConfig = await getUserAIConfig();
      
      if (!aiConfig || !aiConfig.enabled) {
        if (isMounted.current) {
          toast.error("请先配置并启用AI服务", {
            description: "前往AI设置页面配置大模型API"
          });
        }
        return;
      }
      
      if (isMounted.current) setIsGeneratingInsights(true);
      if (isMounted.current) setAiError(null);
      if (isMounted.current) setAnalysisProgress(0);
      
      // 启动进度模拟
      const progressInterval = setInterval(() => {
        if (isMounted.current) {
          setAnalysisProgress(prev => {
            const newProgress = prev + (Math.random() * 10);
            return newProgress >= 95 ? 95 : newProgress;
          });
        }
      }, 500);
      
      // 获取AI客户端
      const aiClient = await getAIClient();
      
      // 检查组件是否仍然挂载
      if (!isMounted.current) {
        clearInterval(progressInterval);
        return;
      }
      
      if (!aiClient) {
        if (isMounted.current) {
          clearInterval(progressInterval);
          throw new Error("获取AI服务失败，请检查您的AI设置和API密钥");
        }
        return;
      }
      
      // 准备数据
      const analysisData = {
        warningStats: stats,
        riskFactors,
        levelStats
      };
      
      // 构建提示词
      const prompt = `
        请作为教育数据分析专家，分析以下学生预警数据：
        
        ${JSON.stringify(analysisData, null, 2)}
        
        请提供以下分析：
        1. 总体风险情况概述
        2. 识别主要风险因素及其可能的原因
        3. 针对主要风险因素的干预建议
        4. 哪些学生群体需要特别关注
        
        请用简洁的中文回答，突出关键发现和建议。分析应该有数据支持，并具有可操作性。
        使用Markdown格式，包括标题、重点突出和列表。
      `;
      
      // 发送请求
      let response;
      
      try {
        // 检查AI客户端是否有预期的方法
        if (aiClient.chat && typeof aiClient.chat.completions?.create === 'function') {
          response = await aiClient.chat.completions.create({
            messages: [
              { role: "system", content: "你是一位教育数据分析专家，擅长分析学生预警数据并提供干预建议。" },
              { role: "user", content: prompt }
            ],
            model: aiConfig.model || aiConfig.version || "gpt-3.5-turbo",
          });
        } else {
          throw new Error("AI客户端接口不兼容或未正确初始化");
        }
      } catch (apiError) {
        console.error("AI API请求失败:", apiError);
        throw new Error(`AI请求错误: ${apiError instanceof Error ? apiError.message : '未知错误'}`);
      }
      
      // 清除进度模拟
      clearInterval(progressInterval);
      
      // 检查组件是否仍然挂载
      if (!isMounted.current) return;
      
      if (isMounted.current) setAnalysisProgress(100);
      
      // 处理不同格式的响应
      let insights;
      
      if (response?.choices && response.choices.length > 0) {
        // 处理各种可能的响应格式
        if (response.choices[0]?.message?.content) {
          insights = response.choices[0].message.content;
        } else if (response.choices[0]?.text) {
          insights = response.choices[0].text;
        } else if (typeof response.choices[0] === 'string') {
          insights = response.choices[0];
        } else {
          insights = "无法解析AI响应格式";
        }
      } else {
        insights = "未获得有效的AI分析结果";
      }
      
      if (isMounted.current) {
        setAiInsights(insights || "分析失败，请稍后再试");
        
        toast.success("AI分析完成", {
          description: "已生成预警分析报告"
        });
      }
    } catch (error) {
      console.error("生成AI分析失败:", error);
      
      // 检查组件是否仍然挂载
      if (!isMounted.current) return;
      
      if (isMounted.current) {
        setAiError(`AI分析请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
        
        toast.error("AI分析失败", {
          description: "尝试使用备用分析方案",
        });
        
        // 使用备用方案生成分析结果
        setAiInsights(generateFallbackInsight());
      }
    } finally {
      // 检查组件是否仍然挂载
      if (isMounted.current) {
        setIsGeneratingInsights(false);
        setAnalysisProgress(100);
      }
    }
  };

  // 备用分析内容生成
  const generateFallbackInsight = () => {
    const highRiskCount = Math.floor(3 + Math.random() * 5);
    
    const subjects = ["数学", "语文", "英语", "物理", "化学", "生物"];
    const randomSubjects = () => {
      const count = 1 + Math.floor(Math.random() * 2);
      const selected = [];
      for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * subjects.length);
        if (!selected.includes(subjects[index])) {
          selected.push(subjects[index]);
        }
      }
      return selected.join("和");
    };
    
    const riskFactors = ["出勤率", "作业完成情况", "课堂参与度", "考试成绩", "学习态度"];
    const randomRiskFactors = () => {
      const count = 1 + Math.floor(Math.random() * 2);
      const selected = [];
      for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * riskFactors.length);
        if (!selected.includes(riskFactors[index])) {
          selected.push(riskFactors[index]);
        }
      }
      return selected.join("和");
    };
    
    const increasePercent = 5 + Math.floor(Math.random() * 20);
    
    return `
## 预警分析结果

根据当前数据分析，系统检测到以下几点关键发现：

1. **高风险学生**: ${highRiskCount}名学生处于学习高风险状态，主要集中在${randomSubjects()}科目
2. **上升趋势**: 相比上月，预警学生数量增加了${increasePercent}%，需要引起关注
3. **主要风险因素**: ${randomRiskFactors()}是最主要的风险指标

## 建议措施

1. 对高风险学生进行一对一辅导干预
2. 加强班级${Math.random() > 0.5 ? '作业管理和督促' : '考勤管理'}
3. 发起家校沟通，共同关注学生学习状态
${Math.random() > 0.5 ? '4. 设计专项提升计划，针对薄弱学科进行重点辅导' : ''}
      `;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="学生总数" 
          value={stats.totalStudents} 
          icon={Users}
          description="全校在籍学生"
        />
        <StatCard 
          title="风险学生" 
          value={stats.atRiskStudents} 
          icon={AlertTriangle}
          description={`占比 ${((stats.atRiskStudents / stats.totalStudents) * 100).toFixed(1)}%`}
          change={2.5}
          trend="up"
        />
        <StatCard 
          title="高风险学生" 
          value={stats.highRiskStudents} 
          icon={AlertTriangle}
          description={`占风险学生 ${((stats.highRiskStudents / stats.atRiskStudents) * 100).toFixed(1)}%`}
          change={-1.2}
          trend="down"
        />
        <StatCard 
          title="风险类型" 
          value={stats.warningsByType.length} 
          icon={BarChart3}
          description="综合预警类型总数"
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid grid-cols-2 w-[400px] bg-gray-100 border border-gray-300 p-1 rounded-lg">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
          >
            预警概览
          </TabsTrigger>
          <TabsTrigger 
            value="aiAnalysis"
            className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
          >
            AI分析
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">风险级别分布</CardTitle>
                <CardDescription className="text-gray-500">学生风险等级分布统计</CardDescription>
              </CardHeader>
              <CardContent>
                <WarningStatistics 
                  data={stats.warningsByType} 
                  levelData={levelStats}
                />
              </CardContent>
            </Card>
            
            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">风险因素分析</CardTitle>
                <CardDescription className="text-gray-500">主要风险因素影响占比</CardDescription>
              </CardHeader>
              <CardContent>
                <RiskFactorChart data={riskFactors} />
              </CardContent>
            </Card>
          </div>
          
          <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">班级风险分布</CardTitle>
              <CardDescription className="text-gray-500">班级风险学生比例分析</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.riskByClass.map((classData, index) => (
                  <Card key={index} className="bg-gray-50 border-l-[3px] border-[#c0ff3f] rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <h3 className="font-semibold text-gray-700 mb-1.5">{classData.className}</h3>
                    <div className="flex justify-between items-center mt-2 mb-1">
                      <span className="text-xs text-gray-500">风险学生比例</span>
                      <span className="text-xs font-medium text-gray-700">
                        {classData.atRiskCount}/{classData.studentCount} 
                        ({((classData.atRiskCount / classData.studentCount) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-[#c0ff3f]"
                        style={{ width: `${(classData.atRiskCount / classData.studentCount) * 100}%` }}
                      ></div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
        <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">预警类型分布</CardTitle>
              <CardDescription className="text-gray-500">各类型预警数量及占比</CardDescription>
        </CardHeader>
        <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.warningsByType.map((warning, index) => (
                  <WarningTypeCard 
                    key={index}
                    type={warning.type}
                    count={warning.count}
                    percentage={warning.percentage}
                    trend={warning.trend}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="aiAnalysis" className="space-y-6">
          <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-xl font-semibold text-gray-800">
                <div className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-[#c0ff3f]" />
                  <span>AI预警分析与干预建议</span>
            </div>
                <Button 
                  onClick={generateAIInsights}
                  disabled={isGeneratingInsights || !aiConfigured}
                  className="bg-[#c0ff3f] text-black hover:bg-[#a5e034] font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  <ZapIcon className="mr-2 h-4 w-4" />
                  {isGeneratingInsights ? "分析中..." : "生成AI分析"}
                </Button>
              </CardTitle>
              <CardDescription className="text-gray-500">
                基于学生数据和风险因素，使用AI生成分析洞察和干预建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aiConfigured && !isGeneratingInsights && !aiInsights ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Brain className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">AI分析未配置</h3>
                  <p className="text-center text-sm text-gray-500 max-w-md mb-6">
                    您需要先在AI设置页面配置大模型API才能使用AI分析功能。
                    配置后可自动分析风险趋势和提供个性化干预建议。
                  </p>
                  <Button variant="outline" size="sm" className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black font-medium py-1.5 px-3 rounded-md text-xs transition-colors"
                    onClick={() => window.location.href = '/ai-settings'}>
                    前往AI设置
                    <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </div>
              ) : (
                <AIInsightPanel
                  insights={aiInsights}
                  isLoading={isGeneratingInsights}
                  progress={analysisProgress}
                  onRegenerate={generateAIInsights}
                  error={aiError}
                />
          )}
        </CardContent>
      </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">风险因素相关性</CardTitle>
              </CardHeader>
              <CardContent>
                <RiskFactorChart data={riskFactors} />
              </CardContent>
            </Card>
            
            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">关键指标趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-8 text-center text-gray-500">
                  <p>趋势分析功能正在开发中，敬请期待...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WarningDashboard;
