/**
 * 科目和教师信息覆盖诊断脚本
 * 用于检查数据库中科目和教师信息的完整性
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载.env.local文件
config({ path: resolve(process.cwd(), '.env.local') });

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 错误: 缺少Supabase配置');
  console.error('请确保设置了 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface DiagnosticReport {
  timestamp: string;
  subjects: {
    inDatabase: string[];
    inTeacherStudentSubjects: Array<{ subject: string; recordCount: number }>;
    inValueAddedCache: Array<{ subject: string; count: number; dimension: string }>;
  };
  teachers: {
    total: number;
    withSubject: number;
    list: Array<{ id: string; name: string; subject: string | null }>;
  };
  dataCompleteness: {
    missingSubjects: string[];
    subjectsWithoutTeachers: string[];
    warnings: string[];
  };
}

async function runDiagnostics(): Promise<DiagnosticReport> {
  const report: DiagnosticReport = {
    timestamp: new Date().toISOString(),
    subjects: {
      inDatabase: [],
      inTeacherStudentSubjects: [],
      inValueAddedCache: [],
    },
    teachers: {
      total: 0,
      withSubject: 0,
      list: [],
    },
    dataCompleteness: {
      missingSubjects: [],
      subjectsWithoutTeachers: [],
      warnings: [],
    },
  };

  console.log('\n🔍 开始数据诊断...\n');

  // 1. 查询subjects表
  console.log('1️⃣ 检查subjects表...');
  try {
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('subject_code, subject_name')
      .order('subject_name');

    if (error) {
      console.error('   ❌ 查询失败:', error.message);
      report.dataCompleteness.warnings.push(`subjects表查询失败: ${error.message}`);
    } else if (subjects) {
      report.subjects.inDatabase = subjects.map((s) => s.subject_name);
      console.log(`   ✅ 找到 ${subjects.length} 个科目:`, subjects.map((s) => s.subject_name).join(', '));
    } else {
      console.log('   ⚠️  subjects表为空或不存在');
      report.dataCompleteness.warnings.push('subjects表为空或不存在');
    }
  } catch (err) {
    console.error('   ❌ 查询异常:', err);
  }

  // 2. 查询teacher_student_subjects表的科目覆盖
  console.log('\n2️⃣ 检查teacher_student_subjects表的科目覆盖...');
  try {
    const { data: tssSubjects, error } = await supabase.rpc('get_subject_coverage_in_tss');

    if (error) {
      // RPC可能不存在,尝试直接查询
      console.log('   ⚠️  RPC函数不存在,使用直接查询...');

      const { data: rawData, error: rawError } = await supabase
        .from('teacher_student_subjects')
        .select('subject');

      if (rawError) {
        console.error('   ❌ 查询失败:', rawError.message);
        report.dataCompleteness.warnings.push(`teacher_student_subjects表查询失败: ${rawError.message}`);
      } else if (rawData) {
        // 手动聚合
        const subjectCount = new Map<string, number>();
        rawData.forEach((row) => {
          const count = subjectCount.get(row.subject) || 0;
          subjectCount.set(row.subject, count + 1);
        });

        report.subjects.inTeacherStudentSubjects = Array.from(subjectCount.entries()).map(
          ([subject, count]) => ({ subject, recordCount: count })
        );

        console.log(`   ✅ 找到 ${subjectCount.size} 个科目:`);
        report.subjects.inTeacherStudentSubjects.forEach((item) => {
          console.log(`      - ${item.subject}: ${item.recordCount} 条记录`);
        });
      }
    } else if (tssSubjects) {
      report.subjects.inTeacherStudentSubjects = tssSubjects;
      console.log(`   ✅ 找到 ${tssSubjects.length} 个科目:`);
      tssSubjects.forEach((item: any) => {
        console.log(`      - ${item.subject}: ${item.record_count} 条记录`);
      });
    }
  } catch (err) {
    console.error('   ❌ 查询异常:', err);
  }

  // 3. 查询teachers表
  console.log('\n3️⃣ 检查teachers表...');
  try {
    const { data: teachers, error } = await supabase
      .from('teachers')
      .select('id, name, subject')
      .order('name');

    if (error) {
      console.error('   ❌ 查询失败:', error.message);
      report.dataCompleteness.warnings.push(`teachers表查询失败: ${error.message}`);
    } else if (teachers) {
      report.teachers.total = teachers.length;
      report.teachers.withSubject = teachers.filter((t) => t.subject).length;
      report.teachers.list = teachers.slice(0, 20); // 只保存前20个

      console.log(`   ✅ 找到 ${teachers.length} 位教师`);
      console.log(`      - 有科目信息: ${report.teachers.withSubject} 位`);
      console.log(`      - 无科目信息: ${teachers.length - report.teachers.withSubject} 位`);

      if (teachers.length <= 10) {
        console.log('      教师列表:');
        teachers.forEach((t) => {
          console.log(`        - ${t.name} (科目: ${t.subject || '未设置'})`);
        });
      }
    }
  } catch (err) {
    console.error('   ❌ 查询异常:', err);
  }

  // 4. 查询value_added_cache的科目分布
  console.log('\n4️⃣ 检查value_added_cache的科目分布...');
  try {
    // 先获取最新的活动ID
    const { data: latestActivity, error: activityError } = await supabase
      .from('value_added_activities')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (activityError || !latestActivity) {
      console.log('   ⚠️  未找到增值活动记录');
      report.dataCompleteness.warnings.push('未找到增值活动记录');
    } else {
      console.log(`   📊 分析最新活动: ${latestActivity.name} (${latestActivity.id})`);

      const { data: cacheData, error: cacheError } = await supabase
        .from('value_added_cache')
        .select('dimension, result')
        .eq('activity_id', latestActivity.id);

      if (cacheError) {
        console.error('   ❌ 查询失败:', cacheError.message);
        report.dataCompleteness.warnings.push(`value_added_cache查询失败: ${cacheError.message}`);
      } else if (cacheData) {
        // 统计每个维度的科目分布
        const subjectByDimension = new Map<string, Map<string, number>>();

        cacheData.forEach((row) => {
          const dimension = row.dimension;
          const subject = row.result?.subject;

          if (!subject) return;

          if (!subjectByDimension.has(dimension)) {
            subjectByDimension.set(dimension, new Map());
          }

          const dimMap = subjectByDimension.get(dimension)!;
          const count = dimMap.get(subject) || 0;
          dimMap.set(subject, count + 1);
        });

        console.log(`   ✅ 缓存数据统计:`);
        subjectByDimension.forEach((subjectMap, dimension) => {
          console.log(`\n      ${dimension} 维度:`);
          subjectMap.forEach((count, subject) => {
            console.log(`        - ${subject}: ${count} 条记录`);
            report.subjects.inValueAddedCache.push({ subject, count, dimension });
          });
        });
      }
    }
  } catch (err) {
    console.error('   ❌ 查询异常:', err);
  }

  // 5. 数据完整性分析
  console.log('\n5️⃣ 数据完整性分析...');

  // 标准科目列表
  const standardSubjects = [
    '语文', '数学', '英语',
    '物理', '化学', '生物',
    '政治', '历史', '地理'
  ];

  // 检查哪些标准科目缺失
  const tssSubjects = new Set(report.subjects.inTeacherStudentSubjects.map((s) => s.subject));
  report.dataCompleteness.missingSubjects = standardSubjects.filter(
    (subject) => !tssSubjects.has(subject)
  );

  if (report.dataCompleteness.missingSubjects.length > 0) {
    console.log('   ⚠️  缺失科目:', report.dataCompleteness.missingSubjects.join(', '));
  } else {
    console.log('   ✅ 所有标准科目都有数据');
  }

  // 检查哪些科目没有教师关联
  const teacherSubjects = new Set(
    report.teachers.list.filter((t) => t.subject).map((t) => t.subject)
  );

  report.dataCompleteness.subjectsWithoutTeachers = Array.from(tssSubjects).filter(
    (subject) => !teacherSubjects.has(subject)
  );

  if (report.dataCompleteness.subjectsWithoutTeachers.length > 0) {
    console.log('   ⚠️  没有教师科目信息的科目:', report.dataCompleteness.subjectsWithoutTeachers.join(', '));
    report.dataCompleteness.warnings.push(
      `以下科目在teacher_student_subjects中有数据,但没有对应的教师科目信息: ${report.dataCompleteness.subjectsWithoutTeachers.join(', ')}`
    );
  }

  return report;
}

async function main() {
  try {
    const report = await runDiagnostics();

    console.log('\n' + '='.repeat(80));
    console.log('📊 诊断报告摘要');
    console.log('='.repeat(80));

    console.log('\n【科目覆盖情况】');
    console.log(`  - 数据库定义: ${report.subjects.inDatabase.length} 个科目`);
    console.log(`  - 教学关联: ${report.subjects.inTeacherStudentSubjects.length} 个科目`);
    console.log(`  - 增值缓存: ${new Set(report.subjects.inValueAddedCache.map(s => s.subject)).size} 个科目`);

    console.log('\n【教师信息】');
    console.log(`  - 总计: ${report.teachers.total} 位教师`);
    console.log(`  - 有科目信息: ${report.teachers.withSubject} 位`);

    console.log('\n【数据完整性】');
    if (report.dataCompleteness.missingSubjects.length > 0) {
      console.log(`  ❌ 缺失科目 (${report.dataCompleteness.missingSubjects.length}): ${report.dataCompleteness.missingSubjects.join(', ')}`);
    } else {
      console.log('  ✅ 所有标准科目都有数据');
    }

    if (report.dataCompleteness.warnings.length > 0) {
      console.log('\n【警告信息】');
      report.dataCompleteness.warnings.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 建议');
    console.log('='.repeat(80));

    if (report.dataCompleteness.missingSubjects.length === 0) {
      console.log('\n✅ 数据完整性良好!');
      console.log('   问题原因: 代码中硬编码了科目列表,需要修改代码以识别所有科目。');
      console.log('   推荐方案: 扩展 advancedAnalysisEngine.ts 中的硬编码科目列表。');
    } else {
      console.log('\n⚠️  数据不完整!');
      console.log('   问题原因: 部分科目缺少教学编排数据。');
      console.log('   推荐方案:');
      console.log('     1. 检查并补充TeachingArrangement Excel数据');
      console.log('     2. 重新导入完整的教学编排');
      console.log('     3. 修改代码以支持动态科目识别');
    }

    // 保存报告到文件
    const fs = await import('fs/promises');
    const reportPath = './diagnostic-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n📄 完整报告已保存到: ${reportPath}`);

  } catch (error) {
    console.error('\n❌ 诊断过程出错:', error);
    process.exit(1);
  }
}

// 运行诊断
main();
