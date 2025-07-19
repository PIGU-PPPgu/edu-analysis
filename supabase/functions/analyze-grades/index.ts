// ===========================================
// 📊 成绩分析 Edge Function
// 基于DeepSeek API的智能成绩分析
// ===========================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BotConfig {
  bot_type: 'wechat' | 'dingtalk';
  bot_name: string;
  webhook_url: string;
  is_default: boolean;
}

interface AnalyzeRequest {
  exam_title: string;
  class_name?: string;
  analysis_type: 'simple' | 'detailed' | 'premium' | 'batch';
  grade_data: string; // CSV format data
  enabled_bots?: BotConfig[];
  focus_mode?: 'all' | 'top' | 'bottom';
  model?: 'deepseek-chat' | 'deepseek-reasoner';
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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
    const {
      exam_title,
      class_name,
      analysis_type = 'detailed',
      grade_data,
      enabled_bots = [],
      focus_mode = 'all',
      model = 'deepseek-reasoner'
    }: AnalyzeRequest = await req.json()

    // 验证必要参数
    if (!exam_title || !grade_data) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '缺少必要参数: exam_title 和 grade_data' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`📊 开始${analysis_type}分析:`, exam_title)

    // 获取环境变量
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY环境变量未设置')
    }

    // 构建分析提示词
    const analysisPrompt = buildAnalysisPrompt(
      analysis_type, 
      grade_data, 
      exam_title, 
      class_name, 
      focus_mode
    )

    // 调用DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        max_tokens: getMaxTokens(analysis_type),
        temperature: 0.7
      })
    })

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API请求失败: ${deepseekResponse.status}`)
    }

    const deepseekResult: DeepSeekResponse = await deepseekResponse.json()
    const analysisResult = deepseekResult.choices[0]?.message?.content

    if (!analysisResult) {
      throw new Error('DeepSeek API返回空结果')
    }

    console.log('✅ 分析完成，长度:', analysisResult.length)

    // 保存分析结果到数据库（如果配置了Supabase）
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        
        const { error: saveError } = await supabase
          .from('analysis_results')
          .insert({
            exam_title,
            class_name,
            analysis_type,
            result_content: analysisResult,
            created_at: new Date().toISOString()
          })

        if (saveError) {
          console.error('⚠️ 保存分析结果失败:', saveError)
        }
      } catch (dbError) {
        console.error('⚠️ 数据库操作失败:', dbError)
      }
    }

    // 多机器人推送（如果启用）
    const pushResults: Array<{bot_name: string, bot_type: string, success: boolean, error?: string}> = []
    
    if (enabled_bots && enabled_bots.length > 0) {
      const title = `📊 ${exam_title} - ${analysis_type}分析报告`
      
      for (const bot of enabled_bots) {
        try {
          let pushResult: {success: boolean, error?: string}
          
          if (bot.bot_type === 'wechat') {
            pushResult = await sendWechatMessage(bot.webhook_url, analysisResult, title)
          } else if (bot.bot_type === 'dingtalk') {
            pushResult = await sendDingtalkMessage(bot.webhook_url, analysisResult, title)
          } else {
            pushResult = { success: false, error: '不支持的机器人类型' }
          }
          
          pushResults.push({
            bot_name: bot.bot_name,
            bot_type: bot.bot_type,
            success: pushResult.success,
            error: pushResult.error
          })
          
          console.log(`💬 ${bot.bot_type}机器人推送结果 (${bot.bot_name}):`, pushResult.success)
        } catch (pushError) {
          console.error(`❌ ${bot.bot_type}机器人推送失败 (${bot.bot_name}):`, pushError)
          pushResults.push({
            bot_name: bot.bot_name,
            bot_type: bot.bot_type,
            success: false,
            error: pushError.message
          })
        }
      }
    }

    // 返回分析结果
    return new Response(
      JSON.stringify({
        success: true,
        message: '成绩分析完成',
        data: {
          exam_title,
          class_name,
          analysis_type,
          result: analysisResult,
          timestamp: new Date().toISOString(),
          push_results: pushResults
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ 成绩分析异常:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `分析异常: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// 构建分析提示词
function buildAnalysisPrompt(
  type: string, 
  data: string, 
  examTitle: string, 
  className?: string,
  focusMode = 'all'
): string {
  const focusInstruction = {
    'top': '特别关注高分学生的优势分析和进一步提升建议。',
    'bottom': '特别关注低分学生的问题诊断和改进方案。',
    'all': '全面分析所有学生的表现。'
  }[focusMode]

  const basePrompt = `你是一位资深的教育数据分析专家。请对以下 ${examTitle} ${className ? `(${className})` : ''} 的成绩数据进行专业分析。

【分析要求】
- 分析类型: ${type}
- 特殊要求: ${focusInstruction}
- 使用具体的数据和学生姓名举例
- 提供可操作的建议和改进方案

【成绩数据】
${data}`

  switch (type) {
    case 'simple':
      return `${basePrompt}

【简易分析要求】
1. 整体表现概览
2. 主要问题识别
3. 简要改进建议
控制在800字以内。`

    case 'detailed':
      return `${basePrompt}

【详细分析要求】
1. 成绩分布统计
2. 学科表现分析
3. 学生个体分析
4. 班级对比分析
5. 改进建议
控制在2000字以内。`

    case 'premium':
      return `${basePrompt}

【超级结构化分析要求】
严格按照以下9个维度进行分析：
## 1) 📊 数据质量与概况评估
## 2) 🎯 核心指标分析
## 3) 👥 学生表现分层分析
## 4) 📈 学科深度分析
## 5) 🏫 班级对比分析
## 6) 🔍 异常值与特殊情况
## 7) 📋 问题诊断与根因分析
## 8) 💡 分层改进建议
## 9) 🚀 行动计划与监控指标

控制在4000字以内，使用markdown格式。`

    case 'batch':
      return `${basePrompt}

【大规模分批分析要求】
1. 分层分类分析
2. 重点学生识别
3. 全局洞察分析
4. 系统性问题诊断
5. 优先级改进建议
控制在1500字以内。`

    default:
      return basePrompt
  }
}

// 获取不同分析类型的最大token数
function getMaxTokens(type: string): number {
  switch (type) {
    case 'simple': return 1000
    case 'detailed': return 2500
    case 'premium': return 4500
    case 'batch': return 2000
    default: return 2000
  }
}

// 发送企业微信消息
async function sendWechatMessage(
  webhookUrl: string, 
  content: string, 
  title?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 处理长消息分段发送
    const maxLength = 4000
    const messages = []
    
    if (title) {
      messages.push(`${title}\n\n`)
    }
    
    // 分段处理内容
    if (content.length <= maxLength) {
      messages[0] = (messages[0] || '') + content
    } else {
      // 按段落分割
      const sections = content.split(/\n\n|\n#{1,3}\s/)
      let currentMessage = messages[0] || ''
      
      for (const section of sections) {
        if ((currentMessage + section).length <= maxLength) {
          currentMessage += section + '\n\n'
        } else {
          if (currentMessage) {
            messages.push(currentMessage)
          }
          currentMessage = section + '\n\n'
        }
      }
      
      if (currentMessage) {
        messages.push(currentMessage)
      }
    }

    // 发送消息
    for (let i = 0; i < messages.length; i++) {
      const message = {
        msgtype: 'text',
        text: {
          content: messages[i].trim()
        }
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })

      if (!response.ok) {
        throw new Error(`消息${i + 1}发送失败: ${response.status}`)
      }

      // 添加延迟避免频率限制
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// 发送钉钉消息
async function sendDingtalkMessage(
  webhookUrl: string, 
  content: string, 
  title?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 处理长消息分段发送
    const maxLength = 4000
    const messages = []
    
    if (title) {
      messages.push(`${title}\n\n`)
    }
    
    // 分段处理内容
    if (content.length <= maxLength) {
      messages[0] = (messages[0] || '') + content
    } else {
      // 按段落分割
      const sections = content.split(/\n\n|\n#{1,3}\s/)
      let currentMessage = messages[0] || ''
      
      for (const section of sections) {
        if ((currentMessage + section).length <= maxLength) {
          currentMessage += section + '\n\n'
        } else {
          if (currentMessage) {
            messages.push(currentMessage)
          }
          currentMessage = section + '\n\n'
        }
      }
      
      if (currentMessage) {
        messages.push(currentMessage)
      }
    }

    // 发送消息
    for (let i = 0; i < messages.length; i++) {
      const message = {
        msgtype: 'text',
        text: {
          content: messages[i].trim()
        }
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      })

      if (!response.ok) {
        throw new Error(`钉钉消息${i + 1}发送失败: ${response.status}`)
      }

      // 检查响应内容
      const result = await response.json()
      if (result.errcode !== 0) {
        throw new Error(`钉钉API错误: ${result.errmsg || '未知错误'}`)
      }

      // 添加延迟避免频率限制
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}