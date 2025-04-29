import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * AI服务代理 - 用于从后端转发请求，避免CORS问题
 */
serve(async (req) => {
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { providerId, apiKey, endpoint, data } = await req.json();

    // 验证必要参数
    if (!providerId || !apiKey || !endpoint || !data) {
      return new Response(
        JSON.stringify({
          error: '缺少必要参数',
          required: ['providerId', 'apiKey', 'endpoint', 'data']
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // 构建请求头
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    });

    // 对于特定提供商的自定义处理
    switch (providerId) {
      case 'qwen':
        // 千问API可能有特殊需求
        break;
      // 其他提供商的特殊处理...
    }

    // 发送请求到AI服务
    console.log(`代理请求到 ${providerId} API:`, endpoint);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    // 获取响应
    const result = await response.json();

    // 包装响应数据
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        data: result
      }),
      {
        status: response.ok ? 200 : response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('AI请求代理出错:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'AI请求处理失败',
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}); 