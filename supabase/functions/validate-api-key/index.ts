import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface RequestBody {
  provider: string;
  apiKey: string;
}

/**
 * 验证OpenAI API密钥
 */
async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    // 尝试调用OpenAI API的模型列表接口
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('验证OpenAI密钥失败:', error);
    return false;
  }
}

/**
 * 验证Anthropic API密钥
 */
async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    // 尝试调用Anthropic API的模型信息接口
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('验证Anthropic密钥失败:', error);
    return false;
  }
}

/**
 * 验证其他AI提供商的API密钥
 * 这里只是简单验证格式，实际应用中应该调用对应厂商的API
 */
function validateGenericKey(apiKey: string): boolean {
  // 简单验证密钥格式：至少10个字符，只含字母、数字、下划线和连字符
  return apiKey.length >= 10 && /^[a-zA-Z0-9_\-]+$/.test(apiKey);
}

/**
 * Edge Function处理程序
 */
serve(async (req) => {
  try {
    // 解析请求体
    const { provider, apiKey } = await req.json() as RequestBody;
    
    if (!provider || !apiKey) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    let isValid = false;
    
    // 根据提供商选择验证方法
    switch (provider.toLowerCase()) {
      case 'openai':
        isValid = await validateOpenAIKey(apiKey);
        break;
      case 'anthropic':
        isValid = await validateAnthropicKey(apiKey);
        break;
      default:
        // 对于其他提供商，使用通用验证
        isValid = validateGenericKey(apiKey);
    }
    
    return new Response(
      JSON.stringify({ isValid }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('验证API密钥时出错:', error);
    
    return new Response(
      JSON.stringify({ error: '验证API密钥失败', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 