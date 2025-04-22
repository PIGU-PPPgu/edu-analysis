
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIAnalysisRequest, AIAnalysisResponse, ChartGenerationConfig, AIModelConfig } from "@/components/analysis/types";

// 默认的AI分析配置
const DEFAULT_AI_CONFIG: AIModelConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 2000
};

/**
 * 生成用于AI分析的提示词
 */
export const generateAnalysisPrompt = (data: any[], language: string = 'zh'): string => {
  // 提取学科和成绩数据
  const subjectScores: Record<string, number[]> = {};
  
  data.forEach(item => {
    if (item.subject && typeof item.score === 'number') {
      if (!subjectScores[item.subject]) {
        subjectScores[item.subject] = [];
      }
      subjectScores[item.subject].push(item.score);
    }
  });
  
  // 计算每个学科的平均分
  const subjectAverages: Record<string, number> = {};
  Object.entries(subjectScores).forEach(([subject, scores]) => {
    const sum = scores.reduce((acc, score) => acc + score, 0);
    subjectAverages[subject] = sum / scores.length;
  });
  
  // 根据语言构建提示词
  const prompts = {
    zh: `基于以下数据，为教师生成详细的教学分析报告。\n\n学生成绩数据摘要：\n${
      Object.entries(subjectAverages).map(([subject, average]) => 
        `- ${subject} 平均分: ${average.toFixed(1)}`
      ).join('\n')
    }\n\n请提供：\n1. 整体数据分析概述\n2. 关键发现（至少4点）\n3. 教学建议（至少4点）\n\n使用专业但易懂的语言，针对教育工作者提供有价值的见解。`,
    
    en: `Based on the following data, generate a detailed teaching analysis report for educators.\n\nStudent grades summary:\n${
      Object.entries(subjectAverages).map(([subject, average]) => 
        `- ${subject} average score: ${average.toFixed(1)}`
      ).join('\n')
    }\n\nPlease provide:\n1. Overall data analysis overview\n2. Key findings (at least 4 points)\n3. Teaching recommendations (at least 4 points)\n\nUse professional yet accessible language to provide valuable insights for educators.`
  };
  
  return prompts[language as keyof typeof prompts] || prompts.zh;
};

/**
 * 发送AI分析请求
 */
export const performAIAnalysis = async (request: AIAnalysisRequest): Promise<AIAnalysisResponse> => {
  const { data, config, language = 'zh' } = request;
  const prompt = request.prompt || generateAnalysisPrompt(data, language);
  
  try {
    console.log("发送AI分析请求:", { config, prompt });
    
    // 调用Supabase Edge Function进行AI分析
    const { data: responseData, error } = await supabase.functions.invoke('analyze-data', {
      body: { prompt, config: { ...DEFAULT_AI_CONFIG, ...config } }
    });
    
    if (error) {
      console.error("AI分析API调用失败:", error);
      throw new Error(`AI分析失败: ${error.message}`);
    }
    
    console.log("AI分析响应:", responseData);
    
    return responseData as AIAnalysisResponse;
  } catch (error) {
    console.error("AI分析过程中出错:", error);
    toast.error("AI分析失败", {
      description: error instanceof Error ? error.message : "请检查网络连接或API配置"
    });
    
    return {
      overview: "分析失败，请重试",
      insights: ["无法获取分析结果"],
      recommendations: ["请检查API配置或网络连接"],
      error: error instanceof Error ? error.message : "未知错误"
    };
  }
};

/**
 * 自动分析数据并生成推荐图表
 */
export const generateChartRecommendations = async (
  data: any[]
): Promise<ChartGenerationConfig[]> => {
  if (data.length === 0) return [];
  
  try {
    // 调用Supabase Edge Function进行图表推荐
    const { data: responseData, error } = await supabase.functions.invoke('recommend-charts', {
      body: { data: data.slice(0, 10) } // 只发送少量数据样本进行分析
    });
    
    if (error) {
      console.error("图表推荐API调用失败:", error);
      throw new Error(`图表推荐失败: ${error.message}`);
    }
    
    return responseData as ChartGenerationConfig[];
  } catch (error) {
    console.error("生成图表推荐时出错:", error);
    // 返回默认的图表推荐
    return generateDefaultChartConfigs(data);
  }
};

/**
 * 根据数据特征生成默认的图表配置
 * 这是在API调用失败时的备选方案
 */
const generateDefaultChartConfigs = (data: any[]): ChartGenerationConfig[] => {
  if (data.length === 0) return [];
  
  const configs: ChartGenerationConfig[] = [];
  const firstRecord = data[0];
  const fields = Object.keys(firstRecord);
  
  // 查找可能的成绩字段
  const scoreField = fields.find(f => 
    f.toLowerCase().includes('score') || 
    f.toLowerCase().includes('分数') || 
    f.toLowerCase().includes('成绩')
  );
  
  // 查找可能的学科字段
  const subjectField = fields.find(f => 
    f.toLowerCase().includes('subject') || 
    f.toLowerCase().includes('科目') || 
    f.toLowerCase().includes('学科')
  );
  
  // 查找可能的日期字段
  const dateField = fields.find(f => 
    f.toLowerCase().includes('date') || 
    f.toLowerCase().includes('日期') || 
    f.toLowerCase().includes('time') || 
    f.toLowerCase().includes('时间')
  );
  
  // 如果找到学科和分数字段，添加柱状图配置
  if (subjectField && scoreField) {
    configs.push({
      chartType: 'bar',
      dataFields: {
        xAxis: subjectField,
        yAxis: [scoreField]
      },
      options: {
        title: '各科目平均分'
      }
    });
  }
  
  // 如果找到日期和分数字段，添加折线图配置
  if (dateField && scoreField) {
    configs.push({
      chartType: 'line',
      dataFields: {
        xAxis: dateField,
        yAxis: [scoreField],
        groupBy: subjectField
      },
      options: {
        title: '成绩趋势变化'
      }
    });
  }
  
  // 始终添加分数分布图配置
  if (scoreField) {
    configs.push({
      chartType: 'pie',
      dataFields: {
        groupBy: scoreField
      },
      options: {
        title: '分数段分布'
      }
    });
  }
  
  return configs;
};
