import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  timestamp: string;
  trigger_source: string;
  force_analysis?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { timestamp, trigger_source, force_analysis = false }: AnalysisRequest = await req.json();
    
    console.log('📊 触发成绩分析:', { timestamp, trigger_source });

    // 获取环境变量
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const doubaoApiKey = Deno.env.get('DOUBAO_API_KEY')!;
    const doubaoApiUrl = Deno.env.get('DOUBAO_API_URL') || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const doubaoModel = Deno.env.get('DOUBAO_MODEL') || 'doubao-seed-1-6-thinking-250715';
    const wechatWebhook = Deno.env.get('WECHAT_WORK_WEBHOOK');
    const linearApiKey = Deno.env.get('LINEAR_API_KEY');
    const linearTeamId = Deno.env.get('LINEAR_TEAM_ID');

    // 创建Supabase客户端
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 检查是否有新的成绩数据
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentGrades, error: gradeError } = await supabase
      .from('grade_data_new')
      .select('student_id, name, class_name, exam_title, total_score, total_rank_in_class, created_at')
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(50);

    if (gradeError) {
      throw new Error(`获取成绩数据失败: ${gradeError.message}`);
    }

    if (!recentGrades || recentGrades.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: '没有找到最近的成绩数据'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (recentGrades.length < 5 && !force_analysis) {
      return new Response(JSON.stringify({
        success: false,
        error: `成绩数据量不足 (${recentGrades.length}条)，需要至少5条记录`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log(`📊 找到 ${recentGrades.length} 条最近成绩数据`);

    // 构建AI分析提示词
    const analysisPrompt = `作为教育数据分析专家，请深度分析以下成绩数据。数据包含总分和7个科目(语文、数学、英语、物理、化学、道法、历史)的分数、等级、排名三个维度。

## 📊 基础分析部分
### 整体成绩概况
- 总分分布情况(最高分、最低分、平均分)
- 各科目平均分排序
- 等级分布统计(A+、A、B+、B、C+等)

### 排名体系分析
- 班级排名与校排名、年级排名的关联性
- 各科目排名差异较大的学生识别
- 总分排名与单科排名的匹配度

### 分数-等级-排名三维分析
- 分数区间与等级对应关系
- 等级分布是否合理
- 排名梯度是否正常

## 🎯 高级分析部分
### 多维度异常识别
- 总分与单科成绩不匹配的学生
- 等级与排名不符的异常情况
- 同等级学生分数差异过大的科目

### 科目相关性分析
- 强相关科目组合(如理科三科、文科组合)
- 学科优势互补学生识别
- 偏科严重程度分析

### 班级竞争力评估
- 各科目在校内/年级内的相对位置
- 班级整体优势科目和薄弱科目
- 尖子生、中等生、后进生的分布特征

## 💡 精准教学建议
### 个性化学生指导
- 根据三维数据识别需要重点关注的学生
- 偏科学生的补强建议
- 优等生的进一步提升方向

### 科目教学策略
- 各科目教学重点调整建议
- 基于等级分布的教学难度调整
- 跨科目知识整合建议

### 班级管理建议
- 基于排名分析的班级管理策略
- 学习小组搭配建议
- 竞争激励机制设计

数据：
${JSON.stringify(recentGrades, null, 2)}

注意：
1. 重点关注分数、等级、排名三个维度的深层关系
2. 输出要具有教育专业性和实用性
3. 每部分控制在250字以内，保持简洁专业`;

    // 调用豆包AI分析
    console.log('🤖 调用豆包AI分析...');
    const aiResponse = await fetch(doubaoApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${doubaoApiKey}`
      },
      body: JSON.stringify({
        model: doubaoModel,
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`豆包AI调用失败: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const aiResult = await aiResponse.json();
    const analysis = aiResult.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('豆包AI返回结果为空');
    }

    console.log('✅ AI分析完成');

    // 推送到企业微信（分段发送）
    if (wechatWebhook) {
      console.log('💬 推送到企业微信...');
      await sendToWechatWork(analysis, wechatWebhook);
    }

    // 推送到Linear
    if (linearApiKey && linearTeamId) {
      console.log('📋 推送到Linear...');
      await sendToLinear(analysis, linearApiKey, linearTeamId);
    }

    // 保存分析结果到数据库（可选）
    try {
      await supabase.from('analysis_logs').insert({
        analysis_content: analysis,
        trigger_source: trigger_source,
        records_count: recentGrades.length,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.log('⚠️ 保存分析日志失败:', error);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: analysis,
      records_analyzed: recentGrades.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ 成绩分析失败:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// 企业微信推送函数（分段发送）
async function sendToWechatWork(analysis: string, webhook: string) {
  const timestamp = new Date().toLocaleString('zh-CN');
  
  // 分段逻辑
  const segments = [
    analysis.match(/## 📊 基础分析部分([\s\S]*?)(?=## 🎯 高级分析部分|$)/)?.[0] || '',
    analysis.match(/## 🎯 高级分析部分([\s\S]*?)(?=## 💡 教学建议|$)/)?.[0] || '',
    analysis.match(/## 💡 教学建议([\s\S]*?)$/)?.[0] || ''
  ];

  const titles = [
    '📊 基础分析部分',
    '🎯 高级分析部分',
    '💡 教学建议'
  ];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const title = titles[i];
    
    if (segment.trim()) {
      const message = {
        msgtype: 'markdown',
        markdown: {
          content: `# ${title}

**分析时间：** ${timestamp}

${segment}

---
*第${i+1}部分/共${segments.length}部分*`
        }
      };

      try {
        const response = await fetch(webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        });

        if (response.ok) {
          console.log(`✅ 企业微信第${i+1}部分推送成功`);
        } else {
          console.log(`❌ 企业微信第${i+1}部分推送失败: ${response.status}`);
        }
        
        // 避免推送过快
        if (i < segments.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.log(`❌ 企业微信第${i+1}部分推送异常:`, error);
      }
    }
  }
}

// Linear推送函数
async function sendToLinear(analysis: string, apiKey: string, teamId: string) {
  const timestamp = new Date().toLocaleString('zh-CN');
  
  const mutation = `
    mutation {
      issueCreate(input: {
        teamId: "${teamId}",
        title: "📊 成绩分析报告 - ${timestamp}",
        description: "${analysis.replace(/"/g, '\\"').replace(/\n/g, '\\n')}",
        labelIds: ["auto-analysis"]
      }) {
        success
        issue {
          id
          url
        }
      }
    }
  `;

  try {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: mutation })
    });

    if (response.ok) {
      console.log('✅ Linear任务创建成功');
    } else {
      console.log('❌ Linear任务创建失败:', response.status);
    }
  } catch (error) {
    console.log('❌ Linear推送异常:', error);
  }
}