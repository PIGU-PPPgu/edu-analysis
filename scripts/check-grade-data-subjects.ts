/**
 * 检查grade_data和value_added_cache表
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载.env.local文件
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkGradeDataAndCache() {
  console.log('\n🔍 检查增值评价数据来源...\n');

  // 1. 检查grade_data表的科目字段
  console.log('1️⃣ 检查grade_data表...');
  try {
    const { data, error, count } = await supabase
      .from('grade_data')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (error) {
      console.error('   ❌ 查询失败:', error.message);
    } else {
      console.log(`   ✅ 表中共有 ${count} 条记录`);

      if (data && data.length > 0) {
        console.log('   📊 样本数据 (前5条):');
        data.forEach((row, idx) => {
          console.log(`\n      记录 ${idx + 1}:`);
          console.log(`        学生: ${row.name || row.student_id}`);
          console.log(`        班级: ${row.class_name}`);
          console.log(`        考试: ${row.exam_title}`);

          // 检查有哪些科目有分数
          const subjects = [];
          if (row.chinese_score) subjects.push(`语文(${row.chinese_score})`);
          if (row.math_score) subjects.push(`数学(${row.math_score})`);
          if (row.english_score) subjects.push(`英语(${row.english_score})`);
          if (row.physics_score) subjects.push(`物理(${row.physics_score})`);
          if (row.chemistry_score) subjects.push(`化学(${row.chemistry_score})`);
          if (row.biology_score) subjects.push(`生物(${row.biology_score})`);
          if (row.politics_score) subjects.push(`政治(${row.politics_score})`);
          if (row.history_score) subjects.push(`历史(${row.history_score})`);
          if (row.geography_score) subjects.push(`地理(${row.geography_score})`);

          console.log(`        科目成绩: ${subjects.join(', ')}`);
        });

        // 统计每个科目有多少非空记录
        console.log('\n   📈 科目数据覆盖率:');
        const subjectFields = [
          { name: '语文', field: 'chinese_score' },
          { name: '数学', field: 'math_score' },
          { name: '英语', field: 'english_score' },
          { name: '物理', field: 'physics_score' },
          { name: '化学', field: 'chemistry_score' },
          { name: '生物', field: 'biology_score' },
          { name: '政治', field: 'politics_score' },
          { name: '历史', field: 'history_score' },
          { name: '地理', field: 'geography_score' },
        ];

        for (const { name, field } of subjectFields) {
          const { count: subjectCount } = await supabase
            .from('grade_data')
            .select('*', { count: 'exact', head: true })
            .not(field, 'is', null)
            .neq(field, 0);

          console.log(`      ${name}: ${subjectCount} 条记录有数据`);
        }
      }
    }
  } catch (err) {
    console.error('   ❌ 查询异常:', err);
  }

  // 2. 检查value_added_activities
  console.log('\n2️⃣ 检查value_added_activities表...');
  try {
    const { data: activities, error, count } = await supabase
      .from('value_added_activities')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('   ❌ 查询失败:', error.message);
    } else {
      console.log(`   ✅ 找到 ${count} 个增值活动`);

      if (activities && activities.length > 0) {
        console.log('   📋 最近的活动:');
        activities.forEach((activity, idx) => {
          console.log(`\n      ${idx + 1}. ${activity.name}`);
          console.log(`         ID: ${activity.id}`);
          console.log(`         状态: ${activity.status}`);
          console.log(`         入口考试: ${activity.entry_exam_title}`);
          console.log(`         出口考试: ${activity.exit_exam_title}`);
          console.log(`         创建时间: ${activity.created_at}`);
        });

        // 检查最新活动的缓存数据
        const latestActivity = activities[0];
        console.log(`\n3️⃣ 检查活动 "${latestActivity.name}" 的缓存数据...`);

        const { data: cacheData, error: cacheError } = await supabase
          .from('value_added_cache')
          .select('dimension, result')
          .eq('activity_id', latestActivity.id);

        if (cacheError) {
          console.error('   ❌ 查询失败:', cacheError.message);
        } else if (cacheData) {
          console.log(`   ✅ 找到 ${cacheData.length} 条缓存记录`);

          // 按维度统计
          const byDimension = new Map<string, number>();
          const subjectsByDimension = new Map<string, Set<string>>();

          cacheData.forEach((row) => {
            const dim = row.dimension;
            byDimension.set(dim, (byDimension.get(dim) || 0) + 1);

            const subject = row.result?.subject;
            if (subject) {
              if (!subjectsByDimension.has(dim)) {
                subjectsByDimension.set(dim, new Set());
              }
              subjectsByDimension.get(dim)!.add(subject);
            }
          });

          console.log('\n   📊 缓存数据统计:');
          byDimension.forEach((count, dimension) => {
            const subjects = subjectsByDimension.get(dimension);
            console.log(`      ${dimension}: ${count} 条记录`);
            if (subjects) {
              console.log(`        科目: ${Array.from(subjects).join(', ')}`);
            }
          });

          // 显示一些样本数据
          console.log('\n   📝 缓存数据样本:');
          cacheData.slice(0, 3).forEach((row, idx) => {
            console.log(`\n      样本 ${idx + 1}:`);
            console.log(`        维度: ${row.dimension}`);
            console.log(`        目标: ${row.result?.teacher_name || row.result?.class_name || row.result?.student_name || 'N/A'}`);
            console.log(`        科目: ${row.result?.subject || 'N/A'}`);
            console.log(`        增值率: ${row.result?.avg_score_value_added_rate ? (row.result.avg_score_value_added_rate * 100).toFixed(2) + '%' : 'N/A'}`);
          });
        }
      }
    }
  } catch (err) {
    console.error('   ❌ 查询异常:', err);
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 结论');
  console.log('='.repeat(80));
  console.log('\n如果:');
  console.log('  - grade_data表有所有9个科目的数据');
  console.log('  - 但value_added_cache只有语文和数学');
  console.log('\n则说明: **代码硬编码限制了科目识别**');
  console.log('解决方案: 扩展 advancedAnalysisEngine.ts 中的科目列表\n');
}

checkGradeDataAndCache();
