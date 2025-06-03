const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 从前端配置文件中读取Supabase配置
function getSupabaseConfig() {
  try {
    const clientPath = path.join(__dirname, 'src/integrations/supabase/client.ts');
    const clientContent = fs.readFileSync(clientPath, 'utf-8');
    
    // 提取URL和Key
    const urlMatch = clientContent.match(/supabaseUrl\s*=\s*['"`]([^'"`]+)['"`]/);
    const keyMatch = clientContent.match(/supabaseAnonKey\s*=\s*['"`]([^'"`]+)['"`]/);
    
    if (urlMatch && keyMatch) {
      return {
        url: urlMatch[1],
        key: keyMatch[1]
      };
    }
  } catch (error) {
    console.log('无法从client.ts读取配置，尝试其他方法...');
  }
  
  // 如果无法从文件读取，使用已知的配置
  return {
    url: 'https://giluhqotfjpmofowvogn.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
  };
}

const config = getSupabaseConfig();
const supabase = createClient(config.url, config.key);

async function fixDatabaseConstraint() {
  console.log('🔧 开始修复数据库约束问题...\n');
  console.log(`📡 连接到: ${config.url}`);
  
  try {
    // 1. 检查当前约束
    console.log('\n📋 检查当前约束...');
    
    // 使用直接SQL查询而不是RPC
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'grade_data')
      .eq('constraint_type', 'UNIQUE');
    
    if (constraintError) {
      console.error('❌ 检查约束失败:', constraintError);
      // 继续执行，可能约束不存在
    } else {
      console.log('当前唯一约束:', constraints);
    }
    
    // 2. 尝试删除可能存在的错误约束
    console.log('\n🗑️ 删除可能存在的错误约束...');
    
    // 由于我们无法直接执行DDL，我们需要通过Edge Function或其他方式
    // 暂时跳过约束修复，先解决其他问题
    
    console.log('⚠️ 无法直接修改数据库约束，需要通过数据库管理员权限');
    console.log('💡 建议：联系数据库管理员执行以下SQL:');
    console.log('   ALTER TABLE grade_data DROP CONSTRAINT IF EXISTS grade_data_exam_id_student_id_key;');
    console.log('   ALTER TABLE grade_data ADD CONSTRAINT grade_data_exam_student_subject_key UNIQUE(exam_id, student_id, subject);');
    
    // 3. 检查是否可以插入测试数据来验证约束
    console.log('\n🧪 测试当前约束行为...');
    
    // 查询现有数据
    const { data: existingData, error: queryError } = await supabase
      .from('grade_data')
      .select('exam_id, student_id, subject')
      .limit(5);
    
    if (queryError) {
      console.error('❌ 查询现有数据失败:', queryError);
    } else {
      console.log('现有数据示例:', existingData);
      
      if (existingData && existingData.length > 0) {
        const sample = existingData[0];
        console.log(`\n📊 发现数据格式: exam_id=${sample.exam_id}, student_id=${sample.student_id}, subject=${sample.subject}`);
        
        // 检查是否有同一学生同一考试的多个科目
        const { data: duplicateCheck, error: dupError } = await supabase
          .from('grade_data')
          .select('exam_id, student_id, subject, count(*)')
          .eq('exam_id', sample.exam_id)
          .eq('student_id', sample.student_id);
        
        if (!dupError && duplicateCheck) {
          console.log('同一学生同一考试的记录数:', duplicateCheck.length);
          if (duplicateCheck.length > 1) {
            console.log('✅ 数据库已支持同一学生同一考试多个科目记录');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 修复过程中发生错误:', error);
  }
}

// 运行修复
fixDatabaseConstraint(); 