const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase配置缺失');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 检查数据库表结构\n');

  try {
    // 1. 列出所有表
    console.log('1️⃣ 检查数据库中的所有表...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_list');
    
    if (tablesError) {
      // 尝试直接查询表
      console.log('尝试直接查询已知表...');
      const knownTables = ['grades', 'exams', 'students', 'class_info', 'subjects', 'teachers'];
      for (const tableName of knownTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(0);
          if (!error) {
            console.log(`✅ 表 ${tableName} 存在`);
          } else {
            console.log(`❌ 表 ${tableName} 不存在或无法访问:`, error.message);
          }
        } catch (e) {
          console.log(`❌ 表 ${tableName} 检查失败:`, e.message);
        }
      }
    } else {
      console.log('✅ 数据库中的表:', tables);
    }

    // 2. 检查grades表的具体结构
    console.log('\n2️⃣ 检查grades表结构...');
    try {
      // 尝试查询grades表的字段
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .limit(1);
      
      if (gradesError) {
        console.error('❌ grades表查询错误:', gradesError);
      } else {
        console.log('✅ grades表可以访问，样本数据:', gradesData);
      }
    } catch (e) {
      console.error('❌ grades表访问失败:', e.message);
    }

    // 3. 检查exams表的具体结构
    console.log('\n3️⃣ 检查exams表结构...');
    try {
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .limit(1);
      
      if (examsError) {
        console.error('❌ exams表查询错误:', examsError);
      } else {
        console.log('✅ exams表可以访问，样本数据:', examsData);
      }
    } catch (e) {
      console.error('❌ exams表访问失败:', e.message);
    }

    // 4. 检查students表
    console.log('\n4️⃣ 检查students表结构...');
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .limit(1);
      
      if (studentsError) {
        console.error('❌ students表查询错误:', studentsError);
      } else {
        console.log('✅ students表可以访问，样本数据:', studentsData);
      }
    } catch (e) {
      console.error('❌ students表访问失败:', e.message);
    }

    // 5. 检查是否有其他相关表
    console.log('\n5️⃣ 检查其他相关表...');
    const otherTables = ['class_info', 'subjects', 'teachers', 'user_profiles'];
    for (const tableName of otherTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        if (!error) {
          console.log(`✅ 表 ${tableName} 存在，记录数:`, data?.length || 0);
        } else {
          console.log(`❌ 表 ${tableName} 不存在或无法访问:`, error.message);
        }
      } catch (e) {
        console.log(`❌ 表 ${tableName} 检查失败:`, e.message);
      }
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

checkTableStructure(); 