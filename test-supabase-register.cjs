const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

// 创建客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSupabaseConnection() {
  console.log('🔍 测试 Supabase 连接...');
  
  try {
    // 1. 测试基本连接
    console.log('\n1. 测试基本连接...');
    const { data: connTest, error: connError } = await supabase
      .from('students')
      .select('count')
      .limit(1);
      
    if (connError) {
      console.error('❌ 连接失败:', connError.message);
      return false;
    }
    console.log('✅ 基本连接正常');
    
    // 2. 测试认证服务是否可用
    console.log('\n2. 测试认证服务...');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      console.log('✅ 认证服务可用');
    } catch (authErr) {
      console.error('❌ 认证服务错误:', authErr.message);
      return false;
    }
    
    // 3. 测试注册功能（使用测试邮箱）
    console.log('\n3. 测试注册功能...');
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'test123456';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError) {
      console.error('❌ 注册失败:', signUpError.message);
      console.error('错误详情:', signUpError);
      
      // 分析常见的注册错误
      if (signUpError.message.includes('Email confirmations have been disabled')) {
        console.log('💡 提示: 邮箱确认被禁用，这可能是Supabase项目配置问题');
      }
      if (signUpError.message.includes('Invalid email')) {
        console.log('💡 提示: 邮箱格式无效');
      }
      if (signUpError.message.includes('Signup is disabled')) {
        console.log('💡 提示: 注册功能被禁用，请检查Supabase项目设置');
      }
      if (signUpError.message.includes('Password should be at least')) {
        console.log('💡 提示: 密码长度不符合要求');
      }
      
      return false;
    }
    
    console.log('✅ 注册测试成功');
    console.log('注册结果:', {
      user: signUpData?.user ? '用户创建成功' : '无用户数据',
      session: signUpData?.session ? '会话创建成功' : '需要邮箱验证'
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ 测试过程中出现异常:', error);
    return false;
  }
}

async function checkSupabaseProject() {
  console.log('🔍 检查 Supabase 项目配置...');
  
  try {
    console.log('\n📋 Supabase 项目信息:');
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`API Key 长度: ${SUPABASE_ANON_KEY.length} 字符`);
    
    // 检查网络连接
    console.log('\n🌐 检查网络连接...');
    const response = await fetch(SUPABASE_URL, {
      method: 'HEAD'
    });
    
    if (response.ok) {
      console.log('✅ 网络连接正常');
    } else {
      console.log('❌ 网络连接异常:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ 检查项目配置时出错:', error.message);
  }
}

// 运行测试
async function runTests() {
  console.log('🚀 开始 Supabase 注册功能测试\n');
  
  await checkSupabaseProject();
  console.log('\n' + '='.repeat(50));
  
  const success = await testSupabaseConnection();
  
  console.log('\n' + '='.repeat(50));
  console.log(success ? '🎉 所有测试通过！' : '❌ 测试失败，请检查配置');
}

runTests().catch(console.error); 