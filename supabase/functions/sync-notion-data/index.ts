import { serve } from 'https://deno.land/std@0.175.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.25.0'
import { Client } from 'https://esm.sh/@notionhq/client@2.2.3'

// 配置信息
const NOTION_API_KEY = Deno.env.get('NOTION_API_KEY') || ''
const NOTION_DASHBOARD_ID = Deno.env.get('NOTION_DASHBOARD_ID') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// 初始化Notion客户端
const notion = new Client({
  auth: NOTION_API_KEY,
})

// 初始化Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    // 验证请求
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('未授权', { status: 401 })
    }
    
    // 根据请求类型处理不同的同步逻辑
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()
    
    if (req.method === 'POST') {
      const body = await req.json()
      
      // 同步项目进度数据
      if (path === 'sync-progress') {
        await syncProgressToNotion(body)
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
    
    // 获取Notion中的项目进度数据
    if (req.method === 'GET' && path === 'progress') {
      const progressData = await getProgressFromNotion()
      return new Response(JSON.stringify(progressData), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    return new Response('不支持的操作', { status: 400 })
  } catch (error) {
    console.error('处理请求时出错:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

/**
 * 同步进度数据到Notion
 */
async function syncProgressToNotion(data) {
  if (!NOTION_DASHBOARD_ID) {
    throw new Error('未配置NOTION_DASHBOARD_ID环境变量')
  }
  
  // 获取现有条目
  const existingEntries = {}
  const response = await notion.databases.query({
    database_id: NOTION_DASHBOARD_ID,
  })
  
  // 将现有条目按模块名索引
  for (const page of response.results) {
    try {
      // 找到标题属性
      const titleProp = Object.values(page.properties).find(prop => prop.type === 'title')
      if (titleProp && titleProp.title.length > 0) {
        const moduleName = titleProp.title[0].text.content
        existingEntries[moduleName] = page.id
      }
    } catch (e) {
      // 跳过无法解析的条目
      console.warn('跳过解析错误的条目:', e.message)
    }
  }
  
  // 处理每个模块
  for (const module of data.modules) {
    const moduleName = module.name
    const progress = module.progress
    
    if (existingEntries[moduleName]) {
      // 更新现有条目
      await notion.pages.update({
        page_id: existingEntries[moduleName],
        properties: {
          "完成度": {
            number: progress / 100
          },
          "进度状态": {
            select: {
              name: progress < 50 ? "未开始" : progress < 80 ? "进行中" : "已完成"
            }
          }
        }
      })
    } else {
      // 创建新条目
      await notion.pages.create({
        parent: {
          database_id: NOTION_DASHBOARD_ID
        },
        properties: {
          "模块": {
            title: [
              {
                text: {
                  content: moduleName
                }
              }
            ]
          },
          "完成度": {
            number: progress / 100
          },
          "进度状态": {
            select: {
              name: progress < 50 ? "未开始" : progress < 80 ? "进行中" : "已完成"
            }
          },
          "类别": {
            select: {
              name: "核心模块"
            }
          }
        }
      })
    }
  }
}

/**
 * 从Notion获取进度数据
 */
async function getProgressFromNotion() {
  if (!NOTION_DASHBOARD_ID) {
    throw new Error('未配置NOTION_DASHBOARD_ID环境变量')
  }
  
  const response = await notion.databases.query({
    database_id: NOTION_DASHBOARD_ID,
  })
  
  const modules = []
  
  for (const page of response.results) {
    try {
      // 获取模块名称
      const titleProp = Object.values(page.properties).find(prop => prop.type === 'title')
      const moduleName = titleProp && titleProp.title.length > 0 ? 
                         titleProp.title[0].text.content : '未命名'
      
      // 获取完成度
      const completionProp = Object.values(page.properties).find(
        prop => prop.type === 'number' && prop.id.includes('完成度')
      )
      const progress = completionProp ? 
                      Math.round((completionProp.number || 0) * 100) : 0
      
      // 获取状态
      const statusProp = Object.values(page.properties).find(
        prop => prop.type === 'select' && prop.id.includes('进度状态')
      )
      const status = statusProp && statusProp.select ? 
                    statusProp.select.name : '未开始'
      
      modules.push({
        id: page.id,
        name: moduleName,
        progress,
        status
      })
    } catch (e) {
      console.warn('处理页面数据时出错:', e.message)
    }
  }
  
  return { modules }
} 