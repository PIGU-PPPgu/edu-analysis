#!/usr/bin/env node

// 测试并修复警告列表查询问题
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://giluhqotfjpmofowvogn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔧 测试并修复警告列表查询问题');
console.log('================================');

async function testWarningQueries() {
  
  // 1. 测试当前可能有问题的查询方式
  console.log('\n1️⃣ 测试当前的查询方式');
  console.log('========================');
  
  try {
    // 这是当前 WarningList 组件中的查询方式
    let query = supabase
      .from('warning_records')
      .select(`
        *,
        warning_rules(name, severity),
        students(name, student_id)
      `)
      .order('created_at', { ascending: false });

    // 模拟当前代码中传递 true 作为 studentId 的情况
    const studentId = true; // 这是有问题的
    if (studentId && studentId !== 'true' && studentId !== '') {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.log(`❌ 当前查询方式失败: ${error.message}`);
    } else {
      console.log(`✅ 当前查询方式成功: 获取了 ${data.length} 条记录`);
    }
  } catch (error) {
    console.log(`❌ 当前查询方式出错: ${error.message}`);
  }

  // 2. 测试修复后的查询方式
  console.log('\n2️⃣ 测试修复后的查询方式');
  console.log('=========================');
  
  try {
    // 修复后的查询方式 - 不传递有问题的参数
    const { data: fixedData, error: fixedError } = await supabase
      .from('warning_records')
      .select(`
        *,
        warning_rules(name, severity, description),
        students(name, student_id, class_name)
      `)
      .order('created_at', { ascending: false });
    
    if (fixedError) {
      console.log(`❌ 修复后查询失败: ${fixedError.message}`);
    } else {
      console.log(`✅ 修复后查询成功: 获取了 ${fixedData.length} 条记录`);
      
      if (fixedData.length > 0) {
        console.log('\n📋 示例记录详情:');
        const record = fixedData[0];
        console.log(`  ID: ${record.id}`);
        console.log(`  学生: ${record.students?.name || '未知'} (${record.students?.student_id || 'N/A'})`);
        console.log(`  班级: ${record.students?.class_name || '未知班级'}`);
        console.log(`  规则: ${record.warning_rules?.name || '未知规则'}`);
        console.log(`  严重程度: ${record.warning_rules?.severity || 'N/A'}`);
        console.log(`  状态: ${record.status}`);
        console.log(`  创建时间: ${record.created_at}`);
        console.log(`  详情: ${JSON.stringify(record.details, null, 2)}`);
      }
    }
  } catch (error) {
    console.log(`❌ 修复后查询出错: ${error.message}`);
  }

  // 3. 测试特定学生的查询
  console.log('\n3️⃣ 测试特定学生查询');
  console.log('===================');
  
  try {
    // 获取一个真实的学生ID进行测试
    const { data: studentData } = await supabase
      .from('students')
      .select('student_id')
      .limit(1);
    
    if (studentData && studentData.length > 0) {
      const realStudentId = studentData[0].student_id;
      console.log(`使用学生ID: ${realStudentId}`);
      
      const { data: studentWarnings, error: studentError } = await supabase
        .from('warning_records')
        .select(`
          *,
          warning_rules(name, severity),
          students(name, student_id, class_name)
        `)
        .eq('student_id', realStudentId)
        .order('created_at', { ascending: false });
      
      if (studentError) {
        console.log(`❌ 特定学生查询失败: ${studentError.message}`);
      } else {
        console.log(`✅ 特定学生查询成功: 获取了 ${studentWarnings.length} 条记录`);
      }
    } else {
      console.log('⚠️  没有找到学生数据用于测试特定学生查询');
    }
  } catch (error) {
    console.log(`❌ 特定学生查询出错: ${error.message}`);
  }

  // 4. 测试状态筛选查询
  console.log('\n4️⃣ 测试状态筛选查询');
  console.log('===================');
  
  const statuses = ['active', 'resolved', 'dismissed'];
  
  for (const status of statuses) {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('warning_records')
        .select(`
          *,
          warning_rules(name, severity),
          students(name, student_id, class_name)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false });
      
      if (statusError) {
        console.log(`❌ 状态 ${status} 查询失败: ${statusError.message}`);
      } else {
        console.log(`✅ 状态 ${status} 查询成功: ${statusData.length} 条记录`);
      }
    } catch (error) {
      console.log(`❌ 状态 ${status} 查询出错: ${error.message}`);
    }
  }

  // 5. 测试时间范围查询
  console.log('\n5️⃣ 测试时间范围查询');
  console.log('===================');
  
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const { data: timeData, error: timeError } = await supabase
      .from('warning_records')
      .select(`
        *,
        warning_rules(name, severity),
        students(name, student_id, class_name)
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false });
    
    if (timeError) {
      console.log(`❌ 时间范围查询失败: ${timeError.message}`);
    } else {
      console.log(`✅ 时间范围查询成功: 最近30天有 ${timeData.length} 条记录`);
    }
  } catch (error) {
    console.log(`❌ 时间范围查询出错: ${error.message}`);
  }

  // 6. 生成修复建议
  console.log('\n6️⃣ 问题分析和修复建议');
  console.log('======================');
  
  console.log('\n🔍 发现的问题:');
  console.log('1. WarningList.tsx 第133行: getWarningRecords(true) - 传递了错误的参数类型');
  console.log('2. warningService.ts getWarningRecords 函数的第一个参数应该是 studentId: string | undefined');
  console.log('3. 传递 true 会导致不必要的查询条件');
  
  console.log('\n💡 修复建议:');
  console.log('1. 修改 WarningList.tsx 中的调用: getWarningRecords() - 不传递参数');
  console.log('2. 如果需要获取所有记录，应该传递 undefined 或不传递参数');
  console.log('3. 确保前端查询逻辑与后端服务函数签名一致');
  
  console.log('\n📋 正确的查询示例:');
  console.log('// 获取所有警告记录');
  console.log('const allWarnings = await getWarningRecords();');
  console.log('');
  console.log('// 获取特定学生的警告记录');
  console.log('const studentWarnings = await getWarningRecords("108110907001");');
  console.log('');
  console.log('// 获取特定状态的警告记录');
  console.log('const activeWarnings = await getWarningRecords(undefined, "active");');
}

// 运行测试
testWarningQueries().catch(console.error);