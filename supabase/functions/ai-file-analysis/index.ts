import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const openAIKey = Deno.env.get('OPENAI_API_KEY') ?? '';

// 分析文件结构
async function analyzeFileStructure(content: string, fileType: string) {
  // 调用OpenAI API分析文件结构
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的数据分析助手，专门用于分析文件结构。请分析以下${fileType}格式的文件内容，识别其结构、字段和数据特点。`
        },
        {
          role: 'user',
          content: `请分析以下内容，识别表格结构、列名含义和数据类型：\n\n${content}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })
  });
  
  const result = await response.json();
  
  return {
    analysis: result.choices[0]?.message?.content || '无法分析文件结构',
    confidence: 0.8,
    model: 'gpt-3.5-turbo'
  };
}

// 映射表头
async function mapHeaders(headers: string[], sampleData: any[]) {
  // 格式化样本数据为可读字符串
  const dataString = JSON.stringify(sampleData.slice(0, 5));
  
  // 构建提示词
  const prompt = `
  分析这些表头和数据样本，将表头映射到以下预定义字段之一：
  - studentId: 学生ID、学号等
  - name: 学生姓名
  - className: 班级名称
  - subject: 学科、科目
  - score: 分数、成绩
  - examDate: 考试日期
  - examType: 考试类型
  - ignore: 不重要或无法识别的字段
  
  表头: ${headers.join(', ')}
  数据样本: ${dataString}
  
  返回格式: 
  {
    "mappings": {
      "原始表头1": "映射字段1",
      "原始表头2": "映射字段2",
      ...
    },
    "confidence": 0.9
  }`;
  
  // 调用OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAIKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的数据字段映射助手，专门将表格列名映射到预定义的系统字段。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    })
  });
  
  const result = await response.json();
  
  try {
    // 尝试从AI回复中解析JSON
    const content = result.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 如果无法解析JSON，返回默认映射
    return {
      mappings: headers.reduce((acc, header) => {
        acc[header] = 'ignore';
        return acc;
      }, {}),
      confidence: 0.5
    };
  } catch (error) {
    console.error('解析映射结果出错:', error);
    
    // 返回默认映射
    return {
      mappings: headers.reduce((acc, header) => {
        acc[header] = 'ignore';
        return acc;
      }, {}),
      confidence: 0.5,
      error: '解析映射结果失败'
    };
  }
}

serve(async (req) => {
  // 处理CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { action, content, type, headers, sampleData } = await req.json();
    
    // 根据请求的action执行相应的操作
    switch (action) {
      case 'structure_analysis':
        const analysisResult = await analyzeFileStructure(content, type);
        return new Response(JSON.stringify(analysisResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
        
      case 'header_mapping':
        const mappingResult = await mapHeaders(headers, sampleData);
        return new Response(JSON.stringify(mappingResult), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
        
      default:
        return new Response(JSON.stringify({ error: '不支持的操作' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
    }
  } catch (error) {
    console.error('处理请求出错:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 