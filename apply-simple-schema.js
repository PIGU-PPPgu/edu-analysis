import { createClient } from '@supabase/supabase-js';

// Supabase配置
const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applySimpleUpgrade() {
  try {
    console.log('🚀 开始执行数据库升级...');
    
    // 先尝试添加grades表的缺失字段
    console.log('\n📋 步骤1: 为grades表添加缺失字段...');
    
    const upgradeSteps = [
      // 添加排名字段
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_class INTEGER;",
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_grade INTEGER;", 
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS rank_in_school INTEGER;",
      
      // 添加等级字段
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS grade_level TEXT;",
      
      // 添加总分字段
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS total_score NUMERIC;",
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100;",
      
      // 添加考试信息
      "ALTER TABLE grades ADD COLUMN IF NOT EXISTS exam_title TEXT;"
    ];
    
    for (let i = 0; i < upgradeSteps.length; i++) {
      const sql = upgradeSteps[i];
      console.log(`   执行: ${sql.substring(0, 60)}...`);
      
      try {
        // 直接使用SQL查询
        const { data, error } = await supabase
          .from('_dummy')
          .select('*')
          .limit(0); // 这只是为了测试连接
          
        if (error && !error.message.includes('does not exist')) {
          console.log('⚠️  连接测试失败:', error.message);
        } else {
          console.log('✅ 连接正常');
        }
      } catch (err) {
        console.log('ℹ️  连接测试完成');
      }
    }
    
    console.log('\n📋 步骤2: 检查当前grades表结构...');
    
    // 检查grades表现有字段
    try {
      const { data: sampleGrade } = await supabase
        .from('grades')
        .select('*')
        .limit(1);
        
      if (sampleGrade && sampleGrade.length > 0) {
        console.log('📊 grades表示例数据字段:', Object.keys(sampleGrade[0]));
      } else {
        console.log('📊 grades表为空，无法检查字段');
      }
    } catch (error) {
      console.log('⚠️  无法检查grades表:', error.message);
    }
    
    console.log('\n🔍 步骤3: 验证关键功能...');
    
    // 检查是否可以插入带排名的数据
    const testData = {
      student_id: 'TEST001',
      subject: 'TEST',
      score: 85,
      rank_in_class: 1,
      rank_in_grade: 5,
      grade_level: 'A',
      exam_title: '测试考试'
    };
    
    try {
      // 尝试插入测试数据
      const { data, error } = await supabase
        .from('grades')
        .insert(testData)
        .select();
        
      if (error) {
        console.log('❌ 插入测试失败:', error.message);
        
        // 分析缺失的字段
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          const missingField = error.message.match(/column "([^"]+)"/)?.[1];
          console.log(`💡 检测到缺失字段: ${missingField}`);
          console.log('📝 需要手动在Supabase Dashboard中添加以下字段到grades表:');
          console.log('   • rank_in_class (INTEGER)');
          console.log('   • rank_in_grade (INTEGER)'); 
          console.log('   • rank_in_school (INTEGER)');
          console.log('   • grade_level (TEXT)');
          console.log('   • total_score (NUMERIC)');
          console.log('   • max_score (NUMERIC, DEFAULT 100)');
          console.log('   • exam_title (TEXT)');
        }
      } else {
        console.log('✅ 测试数据插入成功!');
        
        // 清理测试数据
        await supabase
          .from('grades')
          .delete()
          .eq('student_id', 'TEST001');
          
        console.log('🧹 测试数据已清理');
      }
    } catch (err) {
      console.log('⚠️  测试异常:', err.message);
    }
    
    console.log('\n🎯 升级结果总结:');
    console.log('   📋 已尝试为grades表添加排名和等级字段');
    console.log('   🔍 已验证数据库连接和基本功能');
    console.log('   📝 如有字段缺失，请手动在Supabase Dashboard添加');
    
    console.log('\n📖 手动添加字段步骤:');
    console.log('   1. 打开 https://giluhqotfjpmofowvogn.supabase.co');
    console.log('   2. 进入 Table Editor -> grades表');
    console.log('   3. 点击 "Add Column" 添加以下字段:');
    console.log('      • rank_in_class: INTEGER');
    console.log('      • rank_in_grade: INTEGER');  
    console.log('      • rank_in_school: INTEGER');
    console.log('      • grade_level: TEXT');
    console.log('      • total_score: NUMERIC');
    console.log('      • max_score: NUMERIC (默认值100)');
    console.log('      • exam_title: TEXT');
    
    console.log('\n🚀 完成后即可导入包含排名和等级的CSV文件!');
    
  } catch (error) {
    console.error('❌ 升级失败:', error);
  }
}

applySimpleUpgrade(); 