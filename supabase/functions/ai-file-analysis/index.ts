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

function identifyStructure(headers: string[], data: any[]): FileStructureInfo {
  const structure: FileStructureInfo = {
    subjectColumns: [],
    subjects: [],
    className: null,
    classNames: [],
    format: 'wide',
    nameColumn: '',
    classColumn: '',
    excludedColumns: [], // 需要排除的列
  };

  // 识别名字列
  const possibleNameColumns = ['姓名', '学生姓名', '学生', '名字', 'name', 'student_name', 'student name'];
  for (const header of headers) {
    if (possibleNameColumns.some(col => header.toLowerCase().includes(col.toLowerCase()))) {
      structure.nameColumn = header;
      break;
    }
  }

  // 识别班级列
  const possibleClassColumns = ['班级', '班名', '班', 'class', 'class_name', 'class name'];
  // 排除带有"班名"但明显是排名的列
  const excludedClassPatterns = [/语文班名/, /数学班名/, /英语班名/, /物理班名/, /化学班名/, /生物班名/, /政治班名/, /历史班名/, /地理班名/, /总分班名/, /总分校名/]; 
  
  for (const header of headers) {
    // 跳过明显是排名的"班名"列
    if (excludedClassPatterns.some(pattern => pattern.test(header))) {
      console.log(`排除班级列识别: ${header} 因为这看起来是排名列`);
      structure.excludedColumns.push(header);
      continue;
    }
    
    if (possibleClassColumns.some(col => header.toLowerCase().includes(col.toLowerCase()))) {
      structure.classColumn = header;
      break;
    }
  }

  // 识别班级
  if (structure.classColumn && data.length > 0) {
    const classValues = new Set();
    for (const row of data) {
      if (row[structure.classColumn]) {
        classValues.add(row[structure.classColumn]);
      }
    }
    structure.classNames = Array.from(classValues) as string[];
    if (structure.classNames.length === 1) {
      structure.className = structure.classNames[0];
    }
  }

  // 识别科目列 - 排除带有"班名"的列，这些通常是排名
  const excludedSubjectPatterns = [
    /班名/, /班级排名/, /年级排名/, /校名/, /班排/, /年排/,
    /rank/i, /排名/
  ];
  
  for (const header of headers) {
    // 排除已经识别的名字和班级列
    if (header === structure.nameColumn || header === structure.classColumn) {
      continue;
    }
    
    // 排除明显是排名的列
    if (excludedSubjectPatterns.some(pattern => pattern.test(header))) {
      console.log(`排除科目列识别: ${header} 因为这看起来是排名列`);
      if (!structure.excludedColumns.includes(header)) {
        structure.excludedColumns.push(header);
      }
      continue;
    }
    
    // 检查是否包含数据
    let hasData = false;
    for (const row of data) {
      if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
        hasData = true;
        // 检查是否为数字或数字字符串
        if (typeof row[header] === 'number' || !isNaN(Number(row[header]))) {
          structure.subjectColumns.push(header);
          structure.subjects.push(header);
          break;
        }
      }
    }
  }

  // 确定数据格式
  if (structure.subjectColumns.length > 3) {
    structure.format = 'wide';
  } else {
    structure.format = 'long';
  }
  
  console.log(`识别到的数据结构:`);
  console.log(`识别到 ${structure.subjects.length} 个科目: ${structure.subjects.join(', ')}`);
  console.log(`识别到 ${structure.classNames.length} 个班级: ${structure.classNames.join(', ')}`);
  console.log(`数据格式: ${structure.format === 'wide' ? '宽表格式' : '长表格式'}`);
  console.log(`学生姓名字段: ${structure.nameColumn}`);
  console.log(`班级字段: ${structure.classColumn}`);
  console.log(`排除的字段(主要是排名列): ${structure.excludedColumns.join(', ')}`);

  return structure;
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
        
      case 'identify_structure':
        const structure = identifyStructure(headers, sampleData);
        return new Response(JSON.stringify(structure), {
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