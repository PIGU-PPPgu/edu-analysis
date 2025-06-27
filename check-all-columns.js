import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllColumns() {
  console.log('🔍 获取grade_data表的所有字段...\n');
  
  try {
    // 直接查询information_schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'grade_data')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (error) {
      console.error('❌ 查询失败:', error);
      
      // 尝试获取一条记录来查看字段
      console.log('\n🔄 尝试通过查询数据来获取字段信息...');
      const { data: sampleData, error: sampleError } = await supabase
        .from('grade_data')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.error('❌ 无法获取样本数据:', sampleError);
        return;
      } else if (sampleData && sampleData.length > 0) {
        console.log('✅ 通过样本数据发现的字段:');
        const fields = Object.keys(sampleData[0]);
        fields.forEach((field, index) => {
          const value = sampleData[0][field];
          const type = typeof value;
          console.log(`${index + 1}. ${field}: ${type} (示例值: ${value})`);
        });
        
        // 重点关注排名相关字段
        console.log('\n🎯 排名相关字段检查:');
        const rankFields = fields.filter(f => 
          f.includes('rank') || 
          f.includes('排名') || 
          f.includes('名次') || 
          f.includes('等级') ||
          f.includes('grade')
        );
        
        if (rankFields.length > 0) {
          console.log('✅ 发现可能的排名/等级字段:', rankFields);
          rankFields.forEach(field => {
            console.log(`  ${field}: ${sampleData[0][field]}`);
          });
        } else {
          console.log('❌ 没有发现明显的排名/等级字段');
        }
        
        return fields;
      }
    } else {
      console.log('✅ 成功获取所有字段信息:');
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // 重点关注排名相关字段
      console.log('\n🎯 排名相关字段检查:');
      const rankColumns = columns.filter(col => 
        col.column_name.includes('rank') || 
        col.column_name.includes('排名') || 
        col.column_name.includes('名次') || 
        col.column_name.includes('等级') ||
        col.column_name.includes('grade')
      );
      
      if (rankColumns.length > 0) {
        console.log('✅ 发现排名/等级相关字段:');
        rankColumns.forEach(col => {
          console.log(`  ${col.column_name}: ${col.data_type}`);
        });
      } else {
        console.log('❌ 没有发现排名/等级相关字段');
      }
      
      return columns.map(col => col.column_name);
    }
    
  } catch (error) {
    console.error('❌ 查询过程中发生错误:', error);
  }
}

// 执行查询
getAllColumns()
  .then((fields) => {
    if (fields) {
      console.log(`\n✅ 总共发现 ${fields.length} 个字段`);
    }
    console.log('\n✅ 字段检查完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  });