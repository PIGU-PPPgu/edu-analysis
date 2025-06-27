import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGradeDataStructure() {
  console.log('🔍 检查grade_data表结构...\n');
  
  try {
    // 1. 检查grade_data表是否存在以及基本信息
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'grade_data' 
            AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

    if (tableError) {
      console.error('❌ 查询表结构失败:', tableError);
      
      // 尝试备选方法
      console.log('\n🔄 尝试备选查询方法...');
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'grade_data')
        .eq('table_schema', 'public');

      if (colError) {
        console.error('❌ 备选方法也失败:', colError);
        return;
      }
      
      console.log('✅ 使用备选方法成功获取表结构');
      console.log('📊 grade_data表字段列表:');
      console.log(JSON.stringify(columns, null, 2));
      return;
    }

    console.log('✅ 成功获取grade_data表结构');
    console.log('📊 grade_data表字段列表:');
    console.log(JSON.stringify(tableInfo, null, 2));
    
    // 2. 重点检查我们关心的排名字段
    const targetFields = ['rank_in_class', 'rank_in_grade', 'rank_in_school', 'total_grade', 'total_score'];
    
    console.log('\n🎯 检查重点字段存在情况:');
    const existingFields = {};
    
    if (tableInfo && Array.isArray(tableInfo)) {
      tableInfo.forEach(col => {
        if (targetFields.includes(col.column_name)) {
          existingFields[col.column_name] = {
            type: col.data_type,
            nullable: col.is_nullable,
            default: col.column_default
          };
        }
      });
    }
    
    targetFields.forEach(field => {
      if (existingFields[field]) {
        console.log(`✅ ${field}: 存在 (${existingFields[field].type}, nullable: ${existingFields[field].nullable})`);
      } else {
        console.log(`❌ ${field}: 不存在`);
      }
    });
    
    // 3. 检查可能的自定义UUID字段
    console.log('\n🔍 检查自定义UUID字段:');
    const customFields = [];
    if (tableInfo && Array.isArray(tableInfo)) {
      tableInfo.forEach(col => {
        if (col.column_name.startsWith('custom_') || col.data_type === 'uuid') {
          customFields.push(col.column_name);
        }
      });
    }
    
    if (customFields.length > 0) {
      console.log(`🔸 发现 ${customFields.length} 个自定义/UUID字段:`, customFields);
    } else {
      console.log('✅ 没有发现自定义UUID字段');
    }
    
    // 4. 统计表中的记录数量
    console.log('\n📈 检查数据量:');
    const { count, error: countError } = await supabase
      .from('grade_data')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ 无法统计记录数量:', countError.message);
    } else {
      console.log(`📊 表中共有 ${count} 条记录`);
    }
    
    // 5. 检查一些样本数据中的字段使用情况
    console.log('\n🔍 检查样本数据:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('grade_data')
      .select('*')
      .limit(3);
    
    if (sampleError) {
      console.log('❌ 无法获取样本数据:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log('✅ 样本数据字段使用情况:');
      const sample = sampleData[0];
      targetFields.forEach(field => {
        const value = sample[field];
        if (value !== null && value !== undefined) {
          console.log(`  ${field}: ${value} (类型: ${typeof value})`);
        } else {
          console.log(`  ${field}: 空值`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 执行检查
checkGradeDataStructure()
  .then(() => {
    console.log('\n✅ 数据库结构检查完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  });