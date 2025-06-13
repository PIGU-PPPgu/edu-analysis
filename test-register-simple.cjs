const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://giluhqotfjpmofowvogn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ"
);

async function testRegister() {
  console.log('🧪 测试用户注册...');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Test123456!';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.error('❌ 注册失败:', error.message);
      console.error('错误代码:', error.status);
      console.error('详细信息:', error);
      return false;
    }
    
    console.log('✅ 注册成功！');
    console.log('用户ID:', data.user?.id);
    console.log('邮箱:', data.user?.email);
    console.log('需要确认:', !data.session);
    
    return true;
  } catch (err) {
    console.error('❌ 测试异常:', err);
    return false;
  }
}

testRegister(); 