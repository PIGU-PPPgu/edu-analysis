const { createClient } = require('@supabase/supabase-js');

// 使用正确的Supabase配置
const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkColumnExists(tableName, columnName) {
  try {
    // 方法1: 尝试使用RPC函数
    try {
      const { data: hasColumn, error: rpcError } = await supabase.rpc('has_column', { 
        table_name: tableName, 
        column_name: columnName 
      });

      if (!rpcError && hasColumn === true) {
        console.log(`✅ 使用RPC确认${columnName}字段已存在`);
        return true;
      }
    } catch (rpcError) {
      console.log('⚠️ RPC函数不可用，尝试其他方法...');
    }
    
    // 方法2: 尝试查询信息模式
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', tableName)
        .eq('column_name', columnName)
        .eq('table_schema', 'public');
        
      if (!error && data && data.length > 0) {
        console.log(`✅ 通过information_schema确认${columnName}字段已存在`);
        return true;
      }
    } catch (queryError) {
      console.log('⚠️ information_schema查询失败，字段可能不存在');
    }
    
    return false;
  } catch (error) {
    console.error(`❌ 检查字段${columnName}时出错:`, error);
    return false;
  }
}

async function addColumn(tableName, columnName, columnType, comment) {
  try {
    const addColumnSQL = `
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};
          COMMENT ON COLUMN ${tableName}.${columnName} IS '${comment}';
          RAISE NOTICE '${columnName}字段已添加';
        EXCEPTION WHEN duplicate_column THEN
          RAISE NOTICE '${columnName}字段已存在，无需添加';
        END;
      END $$;
    `;
    
    console.log(`🔧 尝试添加${columnName}字段...`);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: addColumnSQL
    });
    
    if (!error) {
      console.log(`✅ 成功添加${columnName}字段`);
      return true;
    }
    
    // 检查是否是"列已存在"的错误
    if (error && error.message && 
        (error.message.includes('already exists') || 
         error.code === '42701' || 
         error.message.includes('已经存在'))) {
      console.log(`✅ ${columnName}字段已存在`);
      return true;
    }
    
    console.error(`❌ 添加${columnName}字段失败:`, error);
    return false;
  } catch (error) {
    console.error(`❌ 添加${columnName}字段时出错:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 开始检查和修复rank_in_school字段...\n');
  
  // 检查grade_data表是否存在
  console.log('1️⃣ 检查grade_data表是否存在...');
  try {
    const { data, error } = await supabase
      .from('grade_data')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ grade_data表不存在或无法访问:', error.message);
      return;
    }
    
    console.log('✅ grade_data表存在且可访问\n');
  } catch (error) {
    console.error('❌ 检查grade_data表时出错:', error);
    return;
  }
  
  // 检查rank_in_school字段
  console.log('2️⃣ 检查rank_in_school字段是否存在...');
  const columnExists = await checkColumnExists('grade_data', 'rank_in_school');
  
  if (columnExists) {
    console.log('✅ rank_in_school字段已存在，无需修复');
  } else {
    console.log('⚠️ rank_in_school字段不存在，正在添加...\n');
    
    // 添加字段
    console.log('3️⃣ 添加rank_in_school字段...');
    const addResult = await addColumn('grade_data', 'rank_in_school', 'INTEGER', '校内排名');
    
    if (addResult) {
      console.log('✅ rank_in_school字段修复完成');
    } else {
      console.log('❌ rank_in_school字段修复失败');
      console.log('\n📋 手动执行SQL脚本:');
      console.log(`
-- 添加rank_in_school字段到grade_data表
DO $$
BEGIN
  BEGIN
    ALTER TABLE grade_data ADD COLUMN rank_in_school INTEGER;
    COMMENT ON COLUMN grade_data.rank_in_school IS '校内排名';
    RAISE NOTICE 'rank_in_school字段已添加';
  EXCEPTION WHEN duplicate_column THEN
    RAISE NOTICE 'rank_in_school字段已存在，无需添加';
  END;
END $$;
      `);
    }
  }
  
  // 验证修复结果
  console.log('\n4️⃣ 验证修复结果...');
  const finalCheck = await checkColumnExists('grade_data', 'rank_in_school');
  
  if (finalCheck) {
    console.log('🎉 字段修复验证成功！现在可以重新尝试数据导入。');
  } else {
    console.log('❌ 字段修复验证失败，可能需要手动处理。');
  }
  
  console.log('\n✨ 修复脚本执行完成！');
}

// 运行脚本
main().catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
}); 