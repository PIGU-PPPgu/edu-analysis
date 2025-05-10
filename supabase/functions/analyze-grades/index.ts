import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const openAIKey = Deno.env.get('OPENAI_API_KEY') ?? '';

// 成绩分析统计
function calculateStatistics(grades: any[]) {
  if (!grades || grades.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      passingRate: 0,
      excellentRate: 0,
      distribution: []
    };
  }

  // 过滤有效分数
  const scores = grades
    .map(g => g.score)
    .filter(score => typeof score === 'number' && !isNaN(score));
  
  if (scores.length === 0) return { count: 0 };
  
  // 排序
  scores.sort((a, b) => a - b);
  
  // 计算基本统计量
  const count = scores.length;
  const sum = scores.reduce((a, b) => a + b, 0);
  const average = sum / count;
  const median = count % 2 === 0 
    ? (scores[count / 2 - 1] + scores[count / 2]) / 2 
    : scores[Math.floor(count / 2)];
  const min = scores[0];
  const max = scores[count - 1];
  
  // 计算及格率和优秀率
  const passingCount = scores.filter(s => s >= 60).length;
  const excellentCount = scores.filter(s => s >= 90).length;
  const passingRate = passingCount / count;
  const excellentRate = excellentCount / count;
  
  // 计算分数分布
  const distribution = [
    { range: "0-59", count: scores.filter(s => s < 60).length },
    { range: "60-69", count: scores.filter(s => s >= 60 && s < 70).length },
    { range: "70-79", count: scores.filter(s => s >= 70 && s < 80).length },
    { range: "80-89", count: scores.filter(s => s >= 80 && s < 90).length },
    { range: "90-100", count: scores.filter(s => s >= 90).length }
  ];
  
  return {
    count,
    average,
    median,
    min,
    max,
    passingRate,
    excellentRate,
    distribution
  };
}

// 按科目分组并计算统计量
function analyzeBySubject(grades: any[]) {
  if (!grades || grades.length === 0) return {};
  
  // 按科目分组
  const subjectGroups: Record<string, any[]> = {};
  
  grades.forEach(grade => {
    const subject = grade.subject || '未知科目';
    if (!subjectGroups[subject]) {
      subjectGroups[subject] = [];
    }
    subjectGroups[subject].push(grade);
  });
  
  // 计算每个科目的统计量
  const results: Record<string, any> = {};
  
  for (const [subject, gradesList] of Object.entries(subjectGroups)) {
    results[subject] = calculateStatistics(gradesList);
  }
  
  return results;
}

// 使用AI分析成绩数据
async function analyzeGradesWithAI(grades: any[], config: any) {
  if (!grades || grades.length === 0) {
    return {
      analysis: "没有提供成绩数据进行分析",
      recommendations: []
    };
  }
  
  // 计算基本统计数据
  const statistics = calculateStatistics(grades);
  const subjectAnalysis = analyzeBySubject(grades);
  
  // 准备提供给AI的数据摘要
  const dataSummary = {
    totalStudents: grades.length,
    overallStatistics: statistics,
    subjectAnalysis
  };
  
  // 构建AI提示词
  let language = config?.language === 'en' ? 'English' : '中文';
  let prompt = `
  请基于以下成绩数据进行深入分析，并提供教学建议。请使用${language}回答。
  
  数据概要:
  ${JSON.stringify(dataSummary, null, 2)}
  
  请提供:
  1. 对整体成绩的分析，包括优势和不足
  2. 对不同学科表现的对比分析
  3. 针对性的教学建议和改进措施
  4. 需要特别关注的问题和学生群体
  
  返回格式:
  {
    "analysis": "整体分析文本",
    "insights": [
      "洞察点1",
      "洞察点2",
      ...
    ],
    "recommendations": [
      "建议1",
      "建议2",
      ...
    ],
    "concerns": [
      "需关注问题1",
      "需关注问题2",
      ...
    ]
  }`;
  
  // 调用AI API
  try {
    const model = config?.model || 'gpt-3.5-turbo';
    const temperature = config?.temperature || 0.7;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一位专业的教育数据分析师，擅长分析学生成绩数据并提供有价值的教学建议。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        max_tokens: 2000
      })
    });
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    try {
      // 尝试解析JSON响应
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // 如果不是JSON格式，返回文本
      return {
        analysis: content,
        insights: [],
        recommendations: [],
        concerns: []
      };
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError);
      return {
        analysis: content,
        insights: [],
        recommendations: [],
        concerns: [],
        error: '无法解析AI响应为JSON格式'
      };
    }
  } catch (error) {
    console.error('调用AI API失败:', error);
    return {
      analysis: "AI分析失败，请稍后再试",
      error: error.message,
      insights: [],
      recommendations: [],
      concerns: []
    };
  }
}

serve(async (req) => {
  // 处理CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { grades, config } = await req.json();
    
    // 首先计算统计数据
    const statistics = calculateStatistics(grades);
    const subjectAnalysis = analyzeBySubject(grades);
    
    // 使用AI进行高级分析
    const aiAnalysis = await analyzeGradesWithAI(grades, config);
    
    // 整合所有分析结果
    const result = {
      statistics,
      subjectAnalysis,
      aiAnalysis
    };
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('处理成绩分析请求出错:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 