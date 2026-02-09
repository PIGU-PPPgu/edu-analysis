/**
 * 诊断NaN问题 - 检查增值活动和缓存数据
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseNaNIssue() {
  console.log('\n🔍 诊断班级增值率NaN问题...\n');

  // 1. 检查是否有增值活动
  console.log('1️⃣ 检查增值活动...');
  const { data: activities, error: actError } = await supabase
    .from('value_added_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (actError) {
    console.error('   ❌ 查询失败:', actError.message);
    return;
  }

  if (!activities || activities.length === 0) {
    console.log('   ❌ 没有增值活动记录');
    console.log('\n💡 原因: 数据库中没有增值活动，需要先创建活动');
    console.log('解决方案:');
    console.log('  1. 进入系统，创建增值评价活动');
    console.log('  2. 选择入口考试和出口考试');
    console.log('  3. 等待计算完成');
    return;
  }

  console.log(`   ✅ 找到 ${activities.length} 个增值活动\n`);

  // 2. 检查每个活动的缓存数据
  for (const activity of activities) {
    console.log(`\n2️⃣ 检查活动: ${activity.name} (${activity.id})`);
    console.log(`   状态: ${activity.status}`);
    console.log(`   创建时间: ${activity.created_at}`);

    const { data: cacheData, error: cacheError } = await supabase
      .from('value_added_cache')
      .select('*')
      .eq('activity_id', activity.id);

    if (cacheError) {
      console.error('   ❌ 缓存查询失败:', cacheError.message);
      continue;
    }

    if (!cacheData || cacheData.length === 0) {
      console.log('   ⚠️  缓存数据为空');
      console.log('   💡 原因: 活动可能还在计算中，或计算失败');
      continue;
    }

    console.log(`   ✅ 找到 ${cacheData.length} 条缓存记录\n`);

    // 按维度分组统计
    const byDimension = new Map<string, any[]>();
    cacheData.forEach((row) => {
      const dim = row.dimension;
      if (!byDimension.has(dim)) {
        byDimension.set(dim, []);
      }
      byDimension.get(dim)!.push(row);
    });

    // 3. 检查class维度的数据
    console.log('   📊 班级维度数据检查:');
    const classCache = byDimension.get('class') || [];

    if (classCache.length === 0) {
      console.log('      ❌ 没有班级缓存数据');
      console.log('      💡 这就是NaN的原因: classData为空数组');
    } else {
      console.log(`      ✅ 班级记录数: ${classCache.length}`);

      // 检查前3条数据
      console.log('\n      样本数据 (前3条):');
      classCache.slice(0, 3).forEach((row, idx) => {
        const result = row.result;
        console.log(`\n      记录 ${idx + 1}:`);
        console.log(`        班级名称: ${result?.class_name || 'N/A'}`);
        console.log(`        科目: ${result?.subject || 'N/A'}`);
        console.log(`        增值率: ${result?.avg_score_value_added_rate}`);
        console.log(`        增值率类型: ${typeof result?.avg_score_value_added_rate}`);

        // 检查是否为null/undefined/NaN
        if (result?.avg_score_value_added_rate === null) {
          console.log('        ⚠️  增值率为 null');
        } else if (result?.avg_score_value_added_rate === undefined) {
          console.log('        ⚠️  增值率为 undefined');
        } else if (isNaN(result?.avg_score_value_added_rate)) {
          console.log('        ⚠️  增值率为 NaN');
        }
      });

      // 统计有多少条数据的增值率有问题
      const invalidCount = classCache.filter(row => {
        const rate = row.result?.avg_score_value_added_rate;
        return rate === null || rate === undefined || isNaN(rate);
      }).length;

      console.log(`\n      数据质量:`);
      console.log(`        有效数据: ${classCache.length - invalidCount} 条`);
      console.log(`        无效数据: ${invalidCount} 条`);

      if (invalidCount > 0) {
        console.log('\n      ❌ 存在无效数据!');
        console.log('      💡 原因: 增值计算时产生了null/undefined/NaN');
        console.log('      可能的原因:');
        console.log('        1. 入口或出口考试数据缺失');
        console.log('        2. 学生数量太少导致计算异常');
        console.log('        3. 分数数据异常（如全为0）');
      }
    }

    // 4. 检查teacher维度
    console.log('\n   📊 教师维度数据检查:');
    const teacherCache = byDimension.get('teacher') || [];
    console.log(`      教师记录数: ${teacherCache.length}`);

    if (teacherCache.length > 0) {
      const invalidTeacherCount = teacherCache.filter(row => {
        const rate = row.result?.avg_score_value_added_rate;
        return rate === null || rate === undefined || isNaN(rate);
      }).length;
      console.log(`      有效数据: ${teacherCache.length - invalidTeacherCount} 条`);
      console.log(`      无效数据: ${invalidTeacherCount} 条`);
    }

    // 5. 检查student维度
    console.log('\n   📊 学生维度数据检查:');
    const studentCache = byDimension.get('student') || [];
    console.log(`      学生记录数: ${studentCache.length}`);

    if (studentCache.length > 0) {
      const invalidStudentCount = studentCache.filter(row => {
        const rate = row.result?.avg_score_value_added_rate;
        return rate === null || rate === undefined || isNaN(rate);
      }).length;
      console.log(`      有效数据: ${studentCache.length - invalidStudentCount} 条`);
      console.log(`      无效数据: ${invalidStudentCount} 条`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 总结');
  console.log('='.repeat(80));
  console.log('\n如果看到 NaN%，可能的原因:');
  console.log('  1. ❌ 没有增值活动 → 需要创建活动');
  console.log('  2. ❌ 缓存数据为空 → 活动还在计算中，或计算失败');
  console.log('  3. ❌ 增值率字段为null/undefined/NaN → 计算逻辑有问题');
  console.log('\n');
}

diagnoseNaNIssue();
