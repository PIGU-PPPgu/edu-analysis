// ===========================================
// 🧪 企业微信Webhook测试 Edge Function
// 解决CORS问题的无服务器解决方案
// ===========================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestWechatRequest {
  webhook_url: string;
}

interface WechatResponse {
  errcode: number;
  errmsg?: string;
}

serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 只允许POST请求
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '只支持POST请求' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 解析请求体
    const { webhook_url }: TestWechatRequest = await req.json()

    // 验证参数
    if (!webhook_url) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '缺少webhook_url参数' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 验证URL格式
    const urlPattern = /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=[\w-]+$/
    if (!urlPattern.test(webhook_url)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '请输入有效的企业微信机器人Webhook URL' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🧪 测试企业微信Webhook:', webhook_url)

    // 构建测试消息
    const testMessage = {
      msgtype: 'text',
      text: {
        content: `🧪 企业微信连接测试

这是一条测试消息，用于验证Webhook配置是否正确。

⏰ 测试时间: ${new Date().toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai' 
        })}
        
🚀 发送来源: Supabase Edge Function`
      }
    }

    // 发送测试请求到企业微信
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    })

    const result: WechatResponse = await response.json()
    
    console.log('企业微信响应:', result)

    if (response.ok) {
      // 检查企业微信API的响应
      if (result.errcode === 0) {
        // 成功
        return new Response(
          JSON.stringify({
            success: true,
            message: '企业微信连接测试成功！',
            timestamp: new Date().toISOString(),
            response: result
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        // 企业微信API返回错误
        return new Response(
          JSON.stringify({
            success: false,
            message: `企业微信API错误: ${result.errmsg || '未知错误'}`,
            code: result.errcode,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else {
      // HTTP请求失败
      return new Response(
        JSON.stringify({
          success: false,
          message: `HTTP请求失败: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString()
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('❌ 企业微信测试异常:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `测试异常: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})