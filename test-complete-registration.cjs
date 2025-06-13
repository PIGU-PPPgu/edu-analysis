const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function testCompleteFlow() {
  console.log('🧪 测试完整的注册和登录流程...\n');
  
  // 测试注册
  const testEmail = `test${Date.now()}@teacher.com`;
  console.log(`📧 测试邮箱: ${testEmail}`);
  
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: 'test123456'
  });
  
  if (signUpError) {
    console.log('❌ 注册失败:', signUpError.message);
    return;
  }
  
  console.log('✅ 注册成功:', signUpData.user?.email);
  
  // 如果注册成功，手动创建用户profile
  if (signUpData.user) {
    console.log('👤 创建用户profile...');
    
    const { error: profileError } = await supabase.rpc('create_user_profile_manual', {
      user_id: signUpData.user.id,
      user_email: signUpData.user.email,
      user_name: '测试教师'
    });
    
    if (profileError) {
      console.log('⚠️ 创建用户profile失败:', profileError.message);
    } else {
      console.log('✅ 用户profile创建成功');
    }
    
    // 验证profile是否创建成功
    const { data: profileData, error: fetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', signUpData.user.id)
      .single();
    
    if (fetchError) {
      console.log('⚠️ 获取用户profile失败:', fetchError.message);
    } else {
      console.log('📋 用户profile信息:', profileData);
    }
  }
  
  console.log('\n🎉 完整流程测试成功！');
}

testCompleteFlow().catch(console.error); 