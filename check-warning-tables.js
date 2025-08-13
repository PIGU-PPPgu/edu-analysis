/**
 * 检查预警系统相关数据库表和数据
 */

import { createClient } from '@supabase/supabase-js';

// 从环境变量获取Supabase配置  
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://giluhqotfjpmofowvogn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWarningTables() {
  console.log('🔍 检查预警系统数据库表...\n');

  try {
    // 1. 检查 warning_rules 表
    console.log('📋 检查 warning_rules 表:');
    const { data: rules, error: rulesError, count: rulesCount } = await supabase
      .from('warning_rules')
      .select('*', { count: 'exact' })
      .limit(5);

    if (rulesError) {
      console.log('❌ warning_rules 表不存在或无权限访问:', rulesError.message);
    } else {
      console.log(`✅ warning_rules 表存在，共有 ${rulesCount} 条记录`);
      if (rules && rules.length > 0) {
        console.log('   示例数据:', rules[0]);
      }
    }

    // 2. 检查 warning_records 表
    console.log('\n📋 检查 warning_records 表:');
    const { data: records, error: recordsError, count: recordsCount } = await supabase
      .from('warning_records')
      .select('*', { count: 'exact' })
      .limit(5);

    if (recordsError) {
      console.log('❌ warning_records 表不存在或无权限访问:', recordsError.message);
    } else {
      console.log(`✅ warning_records 表存在，共有 ${recordsCount} 条记录`);
      if (records && records.length > 0) {
        console.log('   示例数据:', records[0]);
      }
    }

    // 3. 检查 warning_statistics 表
    console.log('\n📋 检查 warning_statistics 表:');
    const { data: stats, error: statsError, count: statsCount } = await supabase
      .from('warning_statistics')
      .select('*', { count: 'exact' })
      .limit(1);

    if (statsError) {
      console.log('❌ warning_statistics 表不存在或无权限访问:', statsError.message);
    } else {
      console.log(`✅ warning_statistics 表存在，共有 ${statsCount} 条记录`);
      if (stats && stats.length > 0) {
        console.log('   统计数据:', {
          students: stats[0].students,
          warnings: stats[0].warnings,
          risk_factors: stats[0].risk_factors?.slice(0, 2) // 只显示前两个风险因素
        });
      }
    }

    // 4. 检查 students 表（预警系统依赖）
    console.log('\n📋 检查 students 表:');
    const { data: students, error: studentsError, count: studentsCount } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
      .limit(1);

    if (studentsError) {
      console.log('❌ students 表不存在或无权限访问:', studentsError.message);
    } else {
      console.log(`✅ students 表存在，共有 ${studentsCount} 条记录`);
    }

    // 5. 测试预警统计计算
    console.log('\n🧪 测试预警统计计算...');
    
    try {
      // 获取基础数据
      const totalStudents = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      const warningRecords = await supabase
        .from('warning_records')
        .select('student_id')
        .in('status', ['active', 'resolved', 'dismissed']);

      console.log('✅ 基础数据获取成功:');
      console.log(`   总学生数: ${totalStudents.count}`);
      console.log(`   预警记录数: ${warningRecords.data?.length || 0}`);
      
      // 计算统计数据
      const uniqueWarningStudents = [...new Set(warningRecords.data?.map(r => r.student_id) || [])];
      const warningRatio = totalStudents.count > 0 ? (uniqueWarningStudents.length / totalStudents.count * 100).toFixed(1) : 0;
      
      console.log(`   有预警的学生数: ${uniqueWarningStudents.length}`);
      console.log(`   预警学生比例: ${warningRatio}%`);
      
    } catch (serviceError) {
      console.log('❌ 预警统计计算失败:', serviceError.message);
    }

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  }
}

// 运行检查
checkWarningTables().then(() => {
  console.log('\n✨ 检查完成！');
  process.exit(0);
}).catch(error => {
  console.error('💥 检查失败:', error);
  process.exit(1);
});