#!/bin/bash

# ===========================================
# 🚀 Edge Functions 部署脚本
# 通过HTTP API直接部署到Supabase
# ===========================================

set -e

PROJECT_ID="giluhqotfjpmofowvogn"
SUPABASE_URL="https://giluhqotfjpmofowvogn.supabase.co"

echo "🚀 开始部署Edge Functions到Supabase..."

# 检查必要的环境变量
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ 错误: 需要设置 SUPABASE_ACCESS_TOKEN 环境变量"
    echo "💡 请执行: export SUPABASE_ACCESS_TOKEN=your_access_token"
    echo "📖 获取token: https://supabase.com/dashboard/account/tokens"
    exit 1
fi

# 函数1: test-wechat
echo "📤 部署 test-wechat 函数..."

TEST_WECHAT_CODE=$(cat << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: '只支持POST请求' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { webhook_url } = await req.json()
    
    if (!webhook_url) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少webhook_url参数' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const urlPattern = /^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=[\w-]+$/
    if (!urlPattern.test(webhook_url)) {
      return new Response(
        JSON.stringify({ success: false, message: '请输入有效的企业微信机器人Webhook URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const testMessage = {
      msgtype: 'text',
      text: {
        content: `🧪 企业微信连接测试\n\n这是一条测试消息，用于验证Webhook配置是否正确。\n\n⏰ 测试时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n🚀 发送来源: Supabase Edge Function`
      }
    }

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    })

    const result = await response.json()
    
    if (response.ok) {
      if (result.errcode === 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: '企业微信连接测试成功！',
            timestamp: new Date().toISOString(),
            response: result
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: `企业微信API错误: ${result.errmsg || '未知错误'}`,
            code: result.errcode,
            timestamp: new Date().toISOString()
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          message: `HTTP请求失败: ${response.status} ${response.statusText}`,
          timestamp: new Date().toISOString()
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: `测试异常: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
EOF
)

# 创建test-wechat函数
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_ID}/functions" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"slug\": \"test-wechat\",
    \"name\": \"test-wechat\",
    \"body\": $(echo "$TEST_WECHAT_CODE" | jq -Rs .),
    \"verify_jwt\": false
  }" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ test-wechat 函数部署成功"
else
    echo "❌ test-wechat 函数部署失败"
fi

# 函数2: analyze-grades
echo "📤 部署 analyze-grades 函数..."

ANALYZE_GRADES_CODE=$(cat << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, message: '只支持POST请求' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const {
      exam_title,
      class_name,
      analysis_type = 'detailed',
      grade_data,
      enable_wechat_push = false,
      webhook_url,
      focus_mode = 'all'
    } = await req.json()

    if (!exam_title || !grade_data) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少必要参数: exam_title 和 grade_data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!deepseekApiKey) {
      throw new Error('DEEPSEEK_API_KEY环境变量未设置')
    }

    // 构建分析提示词
    const buildAnalysisPrompt = (type, data, title, className, mode) => {
      const focusInstruction = {
        'top': '特别关注高分学生的优势分析和进一步提升建议。',
        'bottom': '特别关注低分学生的问题诊断和改进方案。',
        'all': '全面分析所有学生的表现。'
      }[mode]

      const basePrompt = `你是一位资深的教育数据分析专家。请对以下 ${title} ${className ? `(${className})` : ''} 的成绩数据进行专业分析。

【分析要求】
- 分析类型: ${type}
- 特殊要求: ${focusInstruction}
- 使用具体的数据和学生姓名举例
- 提供可操作的建议和改进方案

【成绩数据】
${data}`

      switch (type) {
        case 'simple':
          return `${basePrompt}\n\n【简易分析要求】\n1. 整体表现概览\n2. 主要问题识别\n3. 简要改进建议\n控制在800字以内。`
        case 'detailed':
          return `${basePrompt}\n\n【详细分析要求】\n1. 成绩分布统计\n2. 学科表现分析\n3. 学生个体分析\n4. 班级对比分析\n5. 改进建议\n控制在2000字以内。`
        case 'premium':
          return `${basePrompt}\n\n【超级结构化分析要求】\n严格按照以下9个维度进行分析：\n## 1) 📊 数据质量与概况评估\n## 2) 🎯 核心指标分析\n## 3) 👥 学生表现分层分析\n## 4) 📈 学科深度分析\n## 5) 🏫 班级对比分析\n## 6) 🔍 异常值与特殊情况\n## 7) 📋 问题诊断与根因分析\n## 8) 💡 分层改进建议\n## 9) 🚀 行动计划与监控指标\n\n控制在4000字以内，使用markdown格式。`
        case 'batch':
          return `${basePrompt}\n\n【大规模分批分析要求】\n1. 分层分类分析\n2. 重点学生识别\n3. 全局洞察分析\n4. 系统性问题诊断\n5. 优先级改进建议\n控制在1500字以内。`
        default:
          return basePrompt
      }
    }

    const getMaxTokens = (type) => {
      switch (type) {
        case 'simple': return 1000
        case 'detailed': return 2500
        case 'premium': return 4500
        case 'batch': return 2000
        default: return 2000
      }
    }

    const analysisPrompt = buildAnalysisPrompt(analysis_type, grade_data, exam_title, class_name, focus_mode)

    // 调用DeepSeek API
    const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: getMaxTokens(analysis_type),
        temperature: 0.7
      })
    })

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API请求失败: ${deepseekResponse.status}`)
    }

    const deepseekResult = await deepseekResponse.json()
    const analysisResult = deepseekResult.choices[0]?.message?.content

    if (!analysisResult) {
      throw new Error('DeepSeek API返回空结果')
    }

    // 企业微信推送
    let wechatPushResult = null
    if (enable_wechat_push && webhook_url) {
      try {
        const message = {
          msgtype: 'text',
          text: {
            content: `📊 ${exam_title} - ${analysis_type}分析报告\n\n${analysisResult.substring(0, 4000)}${analysisResult.length > 4000 ? '...\n\n(报告过长，已截断)' : ''}`
          }
        }

        const response = await fetch(webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        })

        wechatPushResult = { success: response.ok }
      } catch (error) {
        wechatPushResult = { success: false, error: error.message }
      }
    }

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
          wechat_push: wechatPushResult
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: `分析异常: ${error.message}`,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
EOF
)

# 创建analyze-grades函数
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_ID}/functions" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"slug\": \"analyze-grades\",
    \"name\": \"analyze-grades\",
    \"body\": $(echo "$ANALYZE_GRADES_CODE" | jq -Rs .),
    \"verify_jwt\": false
  }" > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ analyze-grades 函数部署成功"
else
    echo "❌ analyze-grades 函数部署失败"
fi

echo ""
echo "🎉 Edge Functions 部署完成！"
echo ""
echo "📋 接下来的步骤："
echo "1. 设置 DEEPSEEK_API_KEY 环境变量："
echo "   curl -X POST 'https://api.supabase.com/v1/projects/${PROJECT_ID}/secrets' \\"
echo "     -H 'Authorization: Bearer \$SUPABASE_ACCESS_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\": \"DEEPSEEK_API_KEY\", \"value\": \"your_deepseek_api_key\"}'"
echo ""
echo "2. 测试函数："
echo "   - test-wechat: ${SUPABASE_URL}/functions/v1/test-wechat"
echo "   - analyze-grades: ${SUPABASE_URL}/functions/v1/analyze-grades"
echo ""
echo "📖 更多信息请查看 EDGE_FUNCTIONS_DEPLOYMENT.md"