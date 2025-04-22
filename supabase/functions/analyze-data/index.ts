
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIModelConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
}

interface AIRequest {
  prompt: string;
  config: AIModelConfig;
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, config }: AIRequest = await req.json();
    
    // 获取API密钥（优先使用请求中的，否则使用环境变量）
    let apiKey;
    if (config.provider === 'openai') {
      apiKey = config.apiKey || Deno.env.get('OPENAI_API_KEY');
    } else if (config.provider === 'deepseek') {
      apiKey = config.apiKey || Deno.env.get('DEEPSEEK_API_KEY');
    } else if (config.provider === 'anthropic') {
      apiKey = config.apiKey || Deno.env.get('ANTHROPIC_API_KEY');
    } else {
      // 默认使用OpenAI
      apiKey = config.apiKey || Deno.env.get('OPENAI_API_KEY');
    }
    
    if (!apiKey) {
      throw new Error(`缺少${config.provider || 'AI'}提供商的API密钥`);
    }

    console.log(`正在使用${config.provider}的${config.model}模型进行分析`);
    
    // 根据提供商选择不同的API调用方式
    let result;
    if (config.provider === 'openai') {
      result = await callOpenAI(prompt, apiKey, config);
    } else if (config.provider === 'deepseek') {
      result = await callDeepseek(prompt, apiKey, config);
    } else if (config.provider === 'anthropic') {
      result = await callAnthropic(prompt, apiKey, config);
    } else {
      // 默认使用OpenAI
      result = await callOpenAI(prompt, apiKey, config);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI分析过程中出错:', error);
    
    return new Response(JSON.stringify({ 
      overview: "分析失败",
      insights: ["无法获取AI分析结果"],
      recommendations: ["请检查API配置或重试"],
      error: error.message || '未知错误'
    }), {
      status: 200, // 返回200状态码而不是500，让前端能够正确处理错误
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * 调用OpenAI API
 */
async function callOpenAI(prompt: string, apiKey: string, config: AIModelConfig) {
  const openaiUrl = 'https://api.openai.com/v1/chat/completions';
  
  const response = await fetch(openaiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '你是一位教育数据分析专家，负责对学生成绩数据进行分析并提供教学建议。' },
        { role: 'user', content: prompt }
      ],
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI API错误:', error);
    throw new Error(`OpenAI API错误: ${error.error?.message || '未知错误'}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // 解析AI响应内容
  return parseAIResponse(content);
}

/**
 * 调用DeepSeek API
 */
async function callDeepseek(prompt: string, apiKey: string, config: AIModelConfig) {
  const url = 'https://api.deepseek.com/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是一位教育数据分析专家，负责对学生成绩数据进行分析并提供教学建议。' },
        { role: 'user', content: prompt }
      ],
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Deepseek API错误:', error);
    throw new Error(`Deepseek API错误: ${error.error?.message || '未知错误'}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // 解析AI响应内容
  return parseAIResponse(content);
}

/**
 * 调用Anthropic API
 */
async function callAnthropic(prompt: string, apiKey: string, config: AIModelConfig) {
  const url = 'https://api.anthropic.com/v1/messages';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku',
      max_tokens: config.maxTokens || 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: config.temperature || 0.7,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Anthropic API错误:', error);
    throw new Error(`Anthropic API错误: ${error.message || '未知错误'}`);
  }
  
  const data = await response.json();
  const content = data.content[0].text;
  
  // 解析AI响应内容
  return parseAIResponse(content);
}

/**
 * 解析AI响应内容为结构化数据
 */
function parseAIResponse(content: string) {
  let overview = '';
  const insights: string[] = [];
  const recommendations: string[] = [];
  
  // 尝试解析概述
  const overviewMatch = content.match(/概述[:：]?\s*([\s\S]+?)(?=\n[^\n]|关键发现|教学建议|$)/i);
  if (overviewMatch) {
    overview = overviewMatch[1].trim();
  }
  
  // 尝试解析关键发现
  const insightsMatch = content.match(/关键发现[:：]?\s*([\s\S]+?)(?=\n[^\n]|教学建议|$)/i);
  if (insightsMatch) {
    const insightsText = insightsMatch[1];
    const insightsList = insightsText.split(/\n\s*[-•*]\s*/).filter(Boolean);
    insights.push(...insightsList.map(item => item.trim()));
  }
  
  // 尝试解析教学建议
  const recommendationsMatch = content.match(/教学建议[:：]?\s*([\s\S]+?)(?=$)/i);
  if (recommendationsMatch) {
    const recommendationsText = recommendationsMatch[1];
    const recommendationsList = recommendationsText.split(/\n\s*[-•*]\s*/).filter(Boolean);
    recommendations.push(...recommendationsList.map(item => item.trim()));
  }
  
  // 如果无法解析出结构化数据，则尝试更简单的划分
  if (!overview && !insights.length && !recommendations.length) {
    const paragraphs = content.split(/\n{2,}/);
    
    if (paragraphs.length >= 1) {
      overview = paragraphs[0].trim();
    }
    
    if (paragraphs.length >= 2) {
      const points = paragraphs[1].split(/\n\s*[-•*]\s*/).filter(Boolean);
      insights.push(...points.map(item => item.trim()));
    }
    
    if (paragraphs.length >= 3) {
      const points = paragraphs[2].split(/\n\s*[-•*]\s*/).filter(Boolean);
      recommendations.push(...points.map(item => item.trim()));
    }
  }
  
  // 如果仍然没有内容，生成默认内容
  if (!overview) {
    overview = "AI分析已完成";
  }
  
  if (insights.length === 0) {
    insights.push(
      "数据分析需要更多样本",
      "需要更丰富的数据来源",
      "建议收集更多历史数据",
      "关注学生成绩趋势变化"
    );
  }
  
  if (recommendations.length === 0) {
    recommendations.push(
      "针对不同学生制定个性化教学计划",
      "关注低分学生并提供额外辅导",
      "定期评估教学效果并调整方法",
      "鼓励学生积极参与课堂讨论"
    );
  }
  
  return {
    overview,
    insights,
    recommendations,
  };
}
