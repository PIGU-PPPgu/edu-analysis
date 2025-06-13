#!/usr/bin/env node

/**
 * Supabase项目配置诊断工具
 * 检查认证服务无法添加用户的根本原因
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

// 你需要从Supabase Dashboard获取service_role key
const SUPABASE_SERVICE_KEY = "YOUR_SERVICE_ROLE_KEY_HERE"; // 需要替换

console.log('🔍 开始Supabase项目配置诊断...\n');

async function diagnoseSupabaseConfig() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  console.log('1. 📡 测试基础连接...');
  try {
    const { data, error } = await client.from('students').select('count').limit(1);
    if (error) {
      console.log('   ❌ 数据库连接失败:', error.message);
    } else {
      console.log('   ✅ 数据库连接正常');
    }
  } catch (err) {
    console.log('   ❌ 连接异常:', err.message);
  }

  console.log('\n2. 🔐 测试认证服务...');
  try {
    // 测试获取当前会话
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      console.log('   ⚠️  会话获取异常:', sessionError.message);
    } else {
      console.log('   ✅ 认证服务响应正常');
    }

    // 测试注册功能（使用临时邮箱）
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`   📝 测试注册功能 (${testEmail})...`);
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) {
      console.log('   ❌ 注册失败:', signUpError.message);
      console.log('   🔍 错误详情:', JSON.stringify(signUpError, null, 2));
      
      // 分析常见错误原因
      if (signUpError.message.includes('Database error saving new user')) {
        console.log('\n   🎯 可能的问题原因:');
        console.log('      • auth.users表损坏或权限问题');
        console.log('      • 缺少必要的数据库触发器');
        console.log('      • public.user_profiles表约束问题');
        console.log('      • RLS策略阻止了用户创建');
      }
      
      if (signUpError.message.includes('signup disabled')) {
        console.log('\n   🎯 问题原因: 注册功能被禁用');
        console.log('      解决方法: Dashboard → Authentication → Settings → 启用Sign up');
      }
      
      if (signUpError.message.includes('rate limit')) {
        console.log('\n   🎯 问题原因: 请求频率限制');
        console.log('      解决方法: 等待一段时间后重试');
      }
    } else {
      console.log('   ✅ 注册测试成功');
      console.log('   📋 用户信息:', {
        id: signUpData.user?.id,
        email: signUpData.user?.email,
        confirmed: signUpData.user?.email_confirmed_at ? true : false
      });
    }
  } catch (err) {
    console.log('   ❌ 认证服务异常:', err.message);
  }

  console.log('\n3. 🔧 项目配置检查建议:');
  console.log('   在Supabase Dashboard中检查以下设置:');
  console.log('');
  console.log('   📧 Authentication → Settings:');
  console.log('      • Enable email confirmations: 可以暂时禁用');
  console.log('      • Enable sign ups: 必须启用');
  console.log('      • Enable manual linking: 建议启用');
  console.log('');
  console.log('   🌐 Authentication → URL Configuration:');
  console.log('      • Site URL: http://localhost:5173');
  console.log('      • Redirect URLs: http://localhost:5173/**');
  console.log('');
  console.log('   🛡️ Authentication → Providers:');
  console.log('      • Email provider: 必须启用');
  console.log('      • Confirm email: 可以暂时禁用用于测试');

  console.log('\n4. 💡 快速修复建议:');
  console.log('   方案A - 使用开发模式 (推荐):');
  console.log('   • 开发模式已在 AuthContext.tsx 中配置');
  console.log('   • 设置 DEV_MODE.enabled = true');
  console.log('   • 可以绕过认证问题继续开发');
  console.log('');
  console.log('   方案B - 重置认证系统:');
  console.log('   • 备份现有数据');
  console.log('   • 运行 reset-auth-system.sql');
  console.log('   • 重新配置Authentication设置');
  console.log('');
  console.log('   方案C - 创建新项目:');
  console.log('   • 如果问题持续存在');
  console.log('   • 导出数据到新的Supabase项目');
  console.log('   • 更新项目配置');

  console.log('\n5. 📋 下一步行动:');
  console.log('   1. 检查Supabase Dashboard的Authentication设置');
  console.log('   2. 如果急需开发，使用开发模式绕过认证');
  console.log('   3. 联系Supabase支持获取项目级别的帮助');
  console.log('   4. 考虑创建新项目作为备选方案');
}

// 检查环境和权限
async function checkPermissions() {
  console.log('\n6. 🔐 权限检查 (需要service_role key):');
  
  if (SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('   ⚠️  未提供service_role key，跳过管理员检查');
    console.log('   💡 获取方法: Dashboard → Settings → API → service_role secret');
    return;
  }

  try {
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // 检查auth schema
    const { data: authUsers, error: authError } = await adminClient
      .from('auth.users')
      .select('count')
      .limit(1);
      
    if (authError) {
      console.log('   ❌ auth.users表访问失败:', authError.message);
    } else {
      console.log('   ✅ auth.users表访问正常');
    }
  } catch (err) {
    console.log('   ❌ 管理员权限检查失败:', err.message);
  }
}

// 主函数
async function main() {
  try {
    await diagnoseSupabaseConfig();
    await checkPermissions();
    
    console.log('\n✨ 诊断完成！');
    console.log('📋 建议按以下优先级解决:');
    console.log('   1. 启用开发模式继续开发 (immediate)');
    console.log('   2. 检查Dashboard认证设置 (short-term)');  
    console.log('   3. 考虑项目重置或新建 (long-term)');
    
  } catch (error) {
    console.error('❌ 诊断过程出错:', error);
  }
}

main(); 