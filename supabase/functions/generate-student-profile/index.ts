
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName, studentId, scores } = await req.json();

    // Prepare a detailed prompt for GPT
    const prompt = `分析以下学生的学习数据并生成个性化画像标签:

学生姓名: ${studentName}
学生ID: ${studentId}

科目成绩明细:
${scores.map(score => `${score.subject}: ${score.score}`).join('\n')}

请生成以下四个分类的标签:
1. 学习风格 (3个标签)
2. 优势领域 (3个标签)
3. 提升空间 (3个标签)
4. 性格特质 (3个标签)

每个分类的标签应简洁明了，最多3-4个字。返回的格式必须是JSON对象。`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { 
            role: 'system', 
            content: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300
      }),
    });

    const responseData = await openAIResponse.json();
    const tags = JSON.parse(responseData.choices[0].message.content);

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating student profile:', error);
    return new Response(JSON.stringify({ 
      error: '无法生成学生画像',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
