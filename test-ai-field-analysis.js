#!/usr/bin/env node

/**
 * AI字段分析功能测试脚本
 * 测试真正的AI解析功能是否工作
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试数据
const testHeaders = [
  '学号', '姓名', '班级', '语文', '数学', '英语', '语文等级', '数学等级', '总分', '班级排名'
];

const testSampleData = [
  {
    '学号': '108110907001',
    '姓名': '张三',
    '班级': '初三7班',
    '语文': '85',
    '数学': '92',
    '英语': '78',
    '语文等级': 'B+',
    '数学等级': 'A',
    '总分': '255',
    '班级排名': '15'
  },
  {
    '学号': '108110907002',
    '姓名': '李四',
    '班级': '初三7班',
    '语文': '78',
    '数学': '88',
    '英语': '82',
    '语文等级': 'B',
    '数学等级': 'B+',
    '总分': '248',
    '班级排名': '18'
  }
];

async function testAIFieldAnalysis() {
  console.log('🧪 开始测试AI字段分析功能...\n');

  try {
    // 1. 检查用户登录状态
    console.log('1️⃣ 检查用户认证状态...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ 用户未登录，尝试使用测试用户登录...');
      
      // 尝试登录测试用户
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'test123456'
      });
      
      if (loginError) {
        console.error('❌ 登录失败:', loginError.message);
        console.log('💡 请确保有测试用户或手动登录后再运行此脚本');
        return;
      }
      
      console.log('✅ 登录成功:', loginData.user.email);
    } else {
      console.log('✅ 用户已登录:', user.email);
    }

    // 2. 检查AI配置
    console.log('\n2️⃣ 检查AI配置...');
    const { data: aiConfigs, error: configError } = await supabase
      .from('user_ai_configs')
      .select('*')
      .eq('enabled', true);

    if (configError) {
      console.error('❌ 查询AI配置失败:', configError.message);
      return;
    }

    if (!aiConfigs || aiConfigs.length === 0) {
      console.log('❌ 未找到启用的AI配置');
      console.log('💡 请先在AI设置页面配置AI服务');
      return;
    }

    console.log('✅ 找到AI配置:', aiConfigs.map(c => c.provider).join(', '));

    // 3. 测试AI字段分析
    console.log('\n3️⃣ 测试AI字段分析...');
    console.log('测试数据:');
    console.log('- 字段:', testHeaders.join(', '));
    console.log('- 样本行数:', testSampleData.length);

    for (const config of aiConfigs) {
      console.log(`\n🤖 测试${config.provider}分析...`);
      
      try {
        const { data: result, error: analysisError } = await supabase.functions.invoke('ai-field-analysis', {
          body: {
            provider: config.provider,
            data: {
              headers: testHeaders,
              sampleData: testSampleData,
              context: '这是一个学生成绩数据文件测试'
            }
          }
        });

        if (analysisError) {
          console.error(`❌ ${config.provider}分析失败:`, analysisError.message);
          continue;
        }

        if (result && result.success) {
          console.log(`✅ ${config.provider}分析成功!`);
          console.log('- 置信度:', result.confidence);
          console.log('- 识别科目:', result.subjects?.join(', ') || '无');
          console.log('- 字段映射数:', result.mappings?.length || 0);
          
          if (result.mappings && result.mappings.length > 0) {
            console.log('\n📋 字段映射结果:');
            result.mappings.forEach(mapping => {
              console.log(`  ${mapping.originalField} → ${mapping.mappedField}${mapping.subject ? ` (${mapping.subject})` : ''} [${mapping.confidence}]`);
            });
          }

          if (result.reasoning) {
            console.log('\n🧠 AI推理过程:');
            console.log(result.reasoning);
          }
        } else {
          console.log(`❌ ${config.provider}分析失败:`, result?.error || '未知错误');
          if (result?.rawResponse) {
            console.log('原始响应:', result.rawResponse.substring(0, 200) + '...');
          }
        }
      } catch (error) {
        console.error(`❌ ${config.provider}分析异常:`, error.message);
      }
    }

    // 4. 测试规则分析对比
    console.log('\n4️⃣ 对比规则分析结果...');
    
    try {
      // 动态导入前端模块
      const { analyzeCSVHeaders } = await import('./src/services/intelligentFieldMapper.ts');
      
      const ruleAnalysis = analyzeCSVHeaders(testHeaders);
      console.log('📏 规则分析结果:');
      console.log('- 置信度:', ruleAnalysis.confidence);
      console.log('- 识别科目:', ruleAnalysis.subjects.join(', '));
      console.log('- 字段映射数:', ruleAnalysis.mappings.length);
      
      if (ruleAnalysis.mappings.length > 0) {
        console.log('\n📋 规则映射结果:');
        ruleAnalysis.mappings.forEach(mapping => {
          console.log(`  ${mapping.originalField} → ${mapping.mappedField}${mapping.subject ? ` (${mapping.subject})` : ''} [${mapping.confidence}]`);
        });
      }
    } catch (error) {
      console.log('⚠️ 无法加载规则分析模块:', error.message);
    }

    console.log('\n🎉 AI字段分析功能测试完成!');

  } catch (error) {
    console.error('❌ 测试过程出错:', error);
    console.error(error.stack);
  }
}

// 运行测试
testAIFieldAnalysis().catch(console.error); 