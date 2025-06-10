const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zpflwvtiqynzxqtojgwh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZmx3dnRpcXluenhxdG9qZ3doIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxOTc1NjIwOSwiZXhwIjoyMDM1MzMyMjA5fQ.Y9sGQaHfaYINjV53MpGZVU2F7rP9sAv94aD6Y0qflLM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addGradeLevelFields() {
  try {
    console.log('📊 添加等级字段到grade_data表...');
    
    // 首先检查是否有execute_sql函数
    const { data: functions } = await supabase.rpc('help');
    console.log('可用函数:', functions);
    
    // 直接尝试ALTER TABLE语句
    const columns = [
      '总分等级',
      '语文等级', 
      '数学等级',
      '英语等级',
      '物理等级',
      '化学等级',
      '道法等级',
      '历史等级'
    ];
    
    for (const col of columns) {
      try {
        console.log(`正在添加字段: ${col}`);
        
        // 使用Supabase客户端执行原生SQL
        const { data, error } = await supabase
          .from('grade_data')
          .select('*')
          .limit(1);
          
        if (error) {
          console.error(`检查表结构失败:`, error);
        } else {
          console.log(`表grade_data存在，继续添加字段...`);
        }
        
        // 由于没有直接的ALTER TABLE权限，我们先检查数据是否包含等级字段
        const { data: sampleData, error: sampleError } = await supabase
          .from('grade_data')
          .select('*')
          .limit(3);
          
        if (sampleData && sampleData.length > 0) {
          console.log('样本数据字段:', Object.keys(sampleData[0]));
          console.log('样本数据:', sampleData[0]);
        }
        
      } catch (err) {
        console.error(`处理字段 ${col} 时出错:`, err);
      }
    }
    
  } catch (err) {
    console.error('❌ 操作失败:', err);
  }
}

addGradeLevelFields(); 