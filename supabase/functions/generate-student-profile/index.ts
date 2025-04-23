
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
    const { studentName, studentId, scores, aiConfig } = await req.json();
    
    if (!aiConfig || !aiConfig.provider || !aiConfig.apiKey) {
      throw new Error("缺少 AI 配置信息");
    }

    // Prepare a detailed prompt for the AI model
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

每个分类的标签应简洁明了，最多3-4个字。返回的格式必须是JSON对象，具体结构如下:
{
  "learningStyle": ["标签1", "标签2", "标签3"],
  "strengths": ["标签1", "标签2", "标签3"],
  "improvements": ["标签1", "标签2", "标签3"],
  "personalityTraits": ["标签1", "标签2", "标签3"]
}`;

    // Configure API endpoints and parameters based on provider
    let apiEndpoint, requestBody, responseProcessor;
    
    switch (aiConfig.provider) {
      case "openai":
        apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        requestBody = {
          model: aiConfig.version || 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。' 
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        };
        responseProcessor = (data) => {
          if (data.choices && data.choices[0] && data.choices[0].message) {
            return JSON.parse(data.choices[0].message.content);
          }
          throw new Error("OpenAI 响应格式异常");
        };
        break;
        
      case "deepseek":
        apiEndpoint = 'https://api.deepseek.com/v1/chat/completions';
        requestBody = {
          model: aiConfig.version || 'deepseek-v3',
          messages: [
            { 
              role: 'system', 
              content: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。' 
            },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        };
        responseProcessor = (data) => {
          if (data.choices && data.choices[0] && data.choices[0].message) {
            return JSON.parse(data.choices[0].message.content);
          }
          throw new Error("DeepSeek 响应格式异常");
        };
        break;
        
      case "anthropic":
        apiEndpoint = 'https://api.anthropic.com/v1/messages';
        requestBody = {
          model: aiConfig.version || 'claude-3-sonnet-20240229',
          system: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000
        };
        responseProcessor = (data) => {
          if (data.content && data.content[0] && data.content[0].text) {
            return JSON.parse(data.content[0].text);
          }
          throw new Error("Anthropic 响应格式异常");
        };
        break;
        
      case "qwen":
        apiEndpoint = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        requestBody = {
          model: aiConfig.version || 'qwen-max',
          input: {
            messages: [
              {
                role: 'system',
                content: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。'
              },
              { role: 'user', content: prompt }
            ]
          },
          parameters: {
            result_format: 'json'
          }
        };
        responseProcessor = (data) => {
          if (data.output && data.output.text) {
            return JSON.parse(data.output.text);
          }
          throw new Error("通义千问响应格式异常");
        };
        break;
        
      default:
        // Handle custom providers
        try {
          if (aiConfig.customProviders) {
            const customProviders = JSON.parse(aiConfig.customProviders);
            const customProvider = customProviders.find(p => p.id === aiConfig.provider);
            
            if (customProvider && customProvider.endpoint) {
              apiEndpoint = customProvider.endpoint;
              requestBody = {
                model: aiConfig.version || 'default',
                messages: [
                  { 
                    role: 'system', 
                    content: '你是一个专业的教育数据分析助手。根据学生的成绩和表现，生成准确、个性化的画像标签。标签应该简洁明了，反映学生的真实学习特点。' 
                  },
                  { role: 'user', content: prompt }
                ]
              };
              responseProcessor = (data) => {
                if (data.choices && data.choices[0] && data.choices[0].message) {
                  return JSON.parse(data.choices[0].message.content);
                }
                throw new Error("自定义API响应格式异常");
              };
              break;
            }
          }
        } catch (e) {
          console.error("解析自定义提供商失败:", e);
        }
        
        throw new Error(`不支持的AI提供商: ${aiConfig.provider}`);
    }

    console.log(`Calling AI provider: ${aiConfig.provider}`);
    
    // Make the API request
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add appropriate authorization header based on provider
    if (aiConfig.provider === 'anthropic') {
      headers['x-api-key'] = aiConfig.apiKey;
      headers['anthropic-version'] = '2023-06-01';
    } else if (aiConfig.provider === 'qwen') {
      headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
      headers['Content-Type'] = 'application/json; charset=utf-8';
    } else {
      headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
    }
    
    const aiResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`AI API error (${aiConfig.provider}):`, errorText);
      throw new Error(`AI API 请求失败: ${aiResponse.status} ${aiResponse.statusText}`);
    }
    
    const responseData = await aiResponse.json();
    
    // Process the response using the provider-specific processor
    let tags;
    try {
      tags = responseProcessor(responseData);
    } catch (parseError) {
      console.error(`Error parsing ${aiConfig.provider} response:`, parseError);
      console.log("Raw response:", JSON.stringify(responseData));
      
      // Fallback tags
      tags = {
        learningStyle: ["专注型", "探索型", "实践型"],
        strengths: ["逻辑思考", "分析能力", "记忆力"],
        improvements: ["表达能力", "创新思维", "时间管理"],
        personalityTraits: ["认真", "细心", "好奇"]
      };
    }

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
