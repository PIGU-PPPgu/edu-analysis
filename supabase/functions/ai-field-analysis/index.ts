import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// 标准字段映射定义
const STANDARD_FIELDS = {
  'student_id': '学号',
  'name': '姓名', 
  'class_name': '班级',
  'grade_level': '年级',
  'subject': '科目',
  'score': '分数/成绩',
  'total_score': '总分',
  'original_grade': '等级/评级',
  'rank_in_class': '班级排名',
  'rank_in_grade': '年级排名',
  'exam_date': '考试日期',
  'exam_type': '考试类型',
  'exam_title': '考试标题'
};

// 科目映射配置
const SUBJECT_MAPPING = {
  '语文': 'chinese',
  '数学': 'math',
  '英语': 'english',
  '物理': 'physics',
  '化学': 'chemistry',
  '生物': 'biology',
  '政治': 'politics',
  '历史': 'history',
  '地理': 'geography'
};

// AI字段分析函数
async function analyzeFieldsWithAI(headers: string[], sampleData: any[], provider: string, apiKey: string) {
  console.log(`[AI字段分析] 使用${provider}分析字段:`, headers);
  
  // 构建标准字段说明
  const standardFieldsDesc = Object.entries(STANDARD_FIELDS)
    .map(([key, desc]) => `- ${key}: ${desc}`)
    .join('\n');
  
  // 构建科目对应关系说明
  const subjectMappingDesc = Object.entries(SUBJECT_MAPPING)
    .map(([chinese, english]) => `- ${chinese} → ${english} (分数) + ${english}_grade (等级) + ${english}_class_rank (班级排名)`)
    .join('\n');
  
  // 构建优化后的分析提示词
  const prompt = `你是一个专业的教育数据解析专家。请从上传的文件数据中准确提取学生成绩信息。

文件支持格式：
- CSV (.csv) - 逗号分隔值文件
- Excel (.xlsx, .xls) - Microsoft Excel文件

表头字段: ${headers.join(', ')}

数据样本:
${JSON.stringify(sampleData, null, 2)}

重要规则：
1. 学号(student_id)是必填字段，不能为空
2. 姓名(name)是必填字段，不能为空  
3. 分数字段应该是数字，如果无法解析则返回null
4. 等级字段通常是A+、A、A-、B+、B、B-、C+、C、C-、D+、D、E等，保持原始格式
5. 排名字段应该是正整数，如果无法解析则返回null
6. 班级名称应该标准化，如"初三7班"、"高二3班"等
7. 如果某个字段在数据中不存在，请返回null而不是空字符串
8. 注意表格可能有合并单元格的情况，可能需要再次进行拆分

标准字段定义：
${standardFieldsDesc}

科目对应关系：
${subjectMappingDesc}

数据处理要求：
1. 自动识别文件格式并正确解析
2. 处理Excel中的数值、文本、日期等不同数据类型
3. 清理空行和无效数据
4. 标准化字段名称和数据格式
5. 生成考试基本信息（从文件名或数据中推断）
6. 检测合并单元格：如果某些行的关键字段为空，可能是Excel合并单元格导致
7. 识别表格结构类型：宽表、长表、混合格式或多级表头

请返回JSON格式：
{
  "mappings": [
    {
      "originalField": "原始字段名",
      "mappedField": "标准字段名或科目字段名",
      "subject": "科目名称（如果适用）",
      "dataType": "数据类型（score/grade/rank/student_info）",
      "confidence": 0.9,
      "notes": "处理说明（如合并单元格、数据清洗等）"
    }
  ],
  "subjects": ["识别到的科目列表"],
  "tableStructure": {
    "type": "wide/long/mixed",
    "hasMergedCells": true/false,
    "hasMultiLevelHeaders": true/false
  },
  "examInfo": {
    "title": "推断的考试标题",
    "type": "推断的考试类型",
    "date": "推断的考试日期"
  },
  "dataQuality": {
    "missingFields": ["缺失的重要字段"],
    "inconsistentFormats": ["格式不一致的字段"],
    "suspiciousData": ["可疑的数据问题"]
  },
  "confidence": 0.9,
  "reasoning": "详细的分析推理过程"
}`;

  let apiUrl: string;
  let requestBody: any;
  let headers_req: Record<string, string>;

  // 根据不同AI提供商构建请求
  switch (provider) {
    case 'openai':
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      headers_req = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的教育数据解析专家，擅长分析学生成绩数据的字段结构和处理复杂的Excel表格格式。你必须严格按照教育数据的标准格式进行解析，确保数据的准确性和完整性。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      };
      break;

    case 'doubao':
      apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      headers_req = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      requestBody = {
        model: 'ep-20241213150608-8rvtx',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的教育数据解析专家，擅长分析学生成绩数据的字段结构和处理复杂的Excel表格格式。你必须严格按照教育数据的标准格式进行解析，确保数据的准确性和完整性。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 3000
      };
      break;

    default:
      throw new Error(`不支持的AI提供商: ${provider}`);
  }

  // 调用AI API
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers_req,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI字段分析] API响应错误:', errorText);
    throw new Error(`AI API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('[AI字段分析] AI响应:', result);

  // 解析AI响应
  const aiContent = result.choices?.[0]?.message?.content || '';
  
  try {
    // 尝试提取JSON
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // 验证必要字段
      if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
        throw new Error('AI响应缺少mappings字段');
      }
      
      return {
        success: true,
        mappings: parsed.mappings || [],
        subjects: parsed.subjects || [],
        tableStructure: parsed.tableStructure || { 
          type: 'unknown', 
          hasMergedCells: false, 
          hasMultiLevelHeaders: false 
        },
        examInfo: parsed.examInfo || {},
        dataQuality: parsed.dataQuality || { 
          missingFields: [], 
          inconsistentFormats: [], 
          suspiciousData: [] 
        },
        confidence: parsed.confidence || 0.7,
        reasoning: parsed.reasoning || '',
        rawResponse: aiContent
      };
    } else {
      throw new Error('AI响应中未找到有效的JSON格式');
    }
  } catch (error) {
    console.error('[AI字段分析] JSON解析失败:', error);
    console.error('[AI字段分析] 原始响应:', aiContent);
    
    // 返回解析失败的详细信息
    return {
      success: false,
      error: `AI响应解析失败: ${error.message}`,
      rawResponse: aiContent,
      parseError: error.stack
    };
  }
}

// 主处理函数
serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    const { provider, data } = requestData;
    
    if (!provider || !data) {
      throw new Error('请求参数不完整：缺少provider或data字段');
    }
    
    const { headers, sampleData, context } = data;
    
    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new Error('请求参数不完整：headers字段无效');
    }
    
    if (!sampleData || !Array.isArray(sampleData)) {
      throw new Error('请求参数不完整：sampleData字段无效');
    }

    console.log('[AI字段分析] 收到请求:', { 
      provider, 
      headers: headers.length, 
      sampleData: sampleData.length,
      context: context ? Object.keys(context) : 'none'
    });

    // 创建Supabase客户端
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[AI字段分析] 用户认证失败:', userError);
      throw new Error('用户认证失败');
    }

    // 获取用户AI配置
    const { data: aiConfig, error: configError } = await supabase
      .from('user_ai_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('enabled', true)
      .single();

    if (configError || !aiConfig) {
      console.error('[AI字段分析] AI配置获取失败:', configError);
      throw new Error(`未找到${provider}的AI配置或配置已禁用`);
    }

    // 解密API密钥（这里简化处理，实际应该有加密解密逻辑）
    const apiKey = aiConfig.api_key_encrypted;
    if (!apiKey) {
      throw new Error(`${provider}的API密钥未配置`);
    }

    // 调用AI分析
    const analysisResult = await analyzeFieldsWithAI(headers, sampleData, provider, apiKey);

    console.log('[AI字段分析] 分析完成:', {
      success: analysisResult.success,
      mappingsCount: analysisResult.mappings?.length || 0,
      confidence: analysisResult.confidence
    });

    return new Response(
      JSON.stringify(analysisResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[AI字段分析] 处理失败:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 