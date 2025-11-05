/**
 * 系统健康检查 - 全面诊断可能的问题
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function systemHealthCheck() {
  console.log('🔍 系统健康检查开始\n');

  const issues = [];
  const warnings = [];
  const summary = {
    criticalIssues: 0,
    warnings: 0,
    dataIntegrityIssues: 0,
    performanceIssues: 0
  };

  try {
    // 1. 数据库连接和基础数据检查
    console.log('=== 1. 数据库连接和基础数据检查 ===');

    const tables = ['students', 'grade_data_new', 'warning_rules', 'warning_records'];
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          issues.push(`❌ 表 ${table} 访问失败: ${error.message}`);
          summary.criticalIssues++;
        } else {
          console.log(`✅ 表 ${table}: ${count} 条记录`);

          // 数据量异常检查
          if (table === 'students' && count === 0) {
            issues.push(`❌ 关键表 ${table} 无数据`);
            summary.criticalIssues++;
          } else if (table === 'students' && count < 10) {
            warnings.push(`⚠️  表 ${table} 数据量过少: ${count} 条`);
            summary.warnings++;
          }
        }
      } catch (err) {
        issues.push(`❌ 表 ${table} 检查异常: ${err.message}`);
        summary.criticalIssues++;
      }
    }

    // 2. 数据一致性检查
    console.log('\n=== 2. 数据一致性检查 ===');

    // 检查学生表与成绩表的关联
    const { data: studentsData } = await supabase
      .from('students')
      .select('student_id, class_name')
      .limit(50);

    let studentsWithGrades = 0;
    let studentsWithoutGrades = 0;

    for (const student of studentsData || []) {
      const { data: grades } = await supabase
        .from('grade_data_new')
        .select('id')
        .eq('student_id', student.student_id)
        .limit(1);

      if (grades && grades.length > 0) {
        studentsWithGrades++;
      } else {
        studentsWithoutGrades++;
      }
    }

    const gradesCoverageRate = studentsData?.length > 0
      ? (studentsWithGrades / studentsData.length) * 100
      : 0;

    console.log(`📊 成绩数据覆盖率: ${Math.round(gradesCoverageRate)}% (${studentsWithGrades}/${studentsData?.length || 0})`);

    if (gradesCoverageRate < 30) {
      issues.push(`❌ 成绩数据覆盖率过低: ${Math.round(gradesCoverageRate)}%`);
      summary.dataIntegrityIssues++;
    } else if (gradesCoverageRate < 60) {
      warnings.push(`⚠️  成绩数据覆盖率偏低: ${Math.round(gradesCoverageRate)}%`);
      summary.warnings++;
    }

    // 3. 班级数据一致性检查
    console.log('\n=== 3. 班级数据一致性检查 ===');

    // 检查students表中的班级名称
    const { data: uniqueClasses } = await supabase
      .from('students')
      .select('class_name')
      .not('class_name', 'is', null);

    const classNames = [...new Set(uniqueClasses?.map(s => s.class_name))];
    console.log(`📋 发现班级数量: ${classNames.length}`);

    // 检查班级名称规范性
    const irregularClasses = classNames.filter(name =>
      !name.match(/^(高[一二三]|初[一二三]|九年级|八年级|七年级).*班$/) && name !== '未知班级'
    );

    if (irregularClasses.length > 0) {
      warnings.push(`⚠️  发现${irregularClasses.length}个不规范班级名称: ${irregularClasses.slice(0, 3).join(', ')}`);
      summary.warnings++;
    }

    // 4. API性能检查
    console.log('\n=== 4. API性能检查 ===');

    const performanceTests = [
      {
        name: '学生列表查询',
        test: async () => {
          const start = Date.now();
          await supabase.from('students').select('student_id, name, class_name').limit(100);
          return Date.now() - start;
        }
      },
      {
        name: '成绩数据查询',
        test: async () => {
          const start = Date.now();
          await supabase.from('grade_data_new').select('student_id, total_score').limit(100);
          return Date.now() - start;
        }
      },
      {
        name: '预警规则查询',
        test: async () => {
          const start = Date.now();
          await supabase.from('warning_rules').select('*').eq('is_active', true);
          return Date.now() - start;
        }
      }
    ];

    for (const test of performanceTests) {
      try {
        const duration = await test.test();
        console.log(`⏱️  ${test.name}: ${duration}ms`);

        if (duration > 2000) {
          issues.push(`❌ ${test.name} 响应时间过长: ${duration}ms`);
          summary.performanceIssues++;
        } else if (duration > 1000) {
          warnings.push(`⚠️  ${test.name} 响应时间偏慢: ${duration}ms`);
          summary.warnings++;
        }
      } catch (error) {
        issues.push(`❌ ${test.name} 执行失败: ${error.message}`);
        summary.performanceIssues++;
      }
    }

    // 5. Edge Function健康检查
    console.log('\n=== 5. Edge Function健康检查 ===');

    try {
      const start = Date.now();
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('warning-engine', {
        body: { action: 'execute_all_rules', trigger: 'health_check' }
      });
      const duration = Date.now() - start;

      if (edgeError) {
        issues.push(`❌ 预警引擎Edge Function失败: ${edgeError.message}`);
        summary.criticalIssues++;
      } else {
        console.log(`✅ 预警引擎Edge Function正常 (${duration}ms)`);

        if (duration > 10000) {
          warnings.push(`⚠️  预警引擎响应时间较长: ${duration}ms`);
          summary.performanceIssues++;
        }
      }
    } catch (error) {
      issues.push(`❌ Edge Function调用异常: ${error.message}`);
      summary.criticalIssues++;
    }

    // 6. 前端组件依赖检查
    console.log('\n=== 6. 前端组件依赖检查 ===');

    const criticalComponents = [
      'src/pages/ClassManagement.tsx',
      'src/pages/StudentPortraitManagement.tsx',
      'src/services/classService.ts',
      'src/services/realDataService.ts',
      'src/lib/api/portrait.ts'
    ];

    for (const component of criticalComponents) {
      try {
        if (fs.existsSync(component)) {
          const content = fs.readFileSync(component, 'utf8');

          // 检查是否有明显的语法错误标志
          if (content.includes('export default') && content.includes('export {')) {
            warnings.push(`⚠️  ${component} 混合导出方式可能导致问题`);
            summary.warnings++;
          }

          // 检查导入语句
          const imports = content.match(/import.*from.*['"`]/g) || [];
          const problematicImports = imports.filter(imp =>
            imp.includes('../') && imp.split('../').length > 3
          );

          if (problematicImports.length > 0) {
            warnings.push(`⚠️  ${component} 存在深层相对路径导入`);
            summary.warnings++;
          }

          console.log(`✅ ${component} 基本检查通过`);
        } else {
          issues.push(`❌ 关键组件缺失: ${component}`);
          summary.criticalIssues++;
        }
      } catch (error) {
        warnings.push(`⚠️  ${component} 检查异常: ${error.message}`);
        summary.warnings++;
      }
    }

    // 7. 数据完整性深度检查
    console.log('\n=== 7. 数据完整性深度检查 ===');

    // 检查成绩数据的时间分布
    const { data: gradeDates } = await supabase
      .from('grade_data_new')
      .select('exam_date')
      .not('exam_date', 'is', null)
      .order('exam_date', { ascending: false })
      .limit(100);

    if (gradeDates && gradeDates.length > 0) {
      const latestDate = new Date(gradeDates[0].exam_date);
      const now = new Date();
      const daysDiff = Math.floor((now - latestDate) / (1000 * 60 * 60 * 24));

      console.log(`📅 最新成绩数据时间: ${latestDate.toLocaleDateString()} (${daysDiff}天前)`);

      if (daysDiff > 365) {
        warnings.push(`⚠️  成绩数据过于陈旧: ${daysDiff}天前`);
        summary.dataIntegrityIssues++;
      } else if (daysDiff > 180) {
        warnings.push(`⚠️  成绩数据较为陈旧: ${daysDiff}天前`);
        summary.warnings++;
      }
    } else {
      issues.push(`❌ 无有效的成绩日期数据`);
      summary.dataIntegrityIssues++;
    }

  } catch (error) {
    console.error('系统检查过程中发生错误:', error);
    issues.push(`❌ 系统检查异常: ${error.message}`);
    summary.criticalIssues++;
  }

  // 生成诊断报告
  console.log('\n' + '='.repeat(50));
  console.log('📋 系统健康诊断报告');
  console.log('='.repeat(50));

  if (issues.length === 0 && warnings.length === 0) {
    console.log('🎉 系统运行状态良好，未发现问题！');
  } else {
    if (issues.length > 0) {
      console.log('\n🚨 关键问题:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  警告信息:');
      warnings.forEach(warning => console.log(`  ${warning}`));
    }
  }

  console.log('\n📊 问题统计:');
  console.log(`  关键问题: ${summary.criticalIssues}`);
  console.log(`  警告信息: ${summary.warnings}`);
  console.log(`  数据完整性问题: ${summary.dataIntegrityIssues}`);
  console.log(`  性能问题: ${summary.performanceIssues}`);

  // 生成建议
  console.log('\n💡 建议措施:');

  if (summary.criticalIssues > 0) {
    console.log('  🔴 立即处理关键问题，这些可能导致系统无法正常运行');
  }

  if (summary.dataIntegrityIssues > 0) {
    console.log('  🟡 检查数据同步和导入流程，确保数据完整性');
  }

  if (summary.performanceIssues > 0) {
    console.log('  🟠 优化查询性能，考虑添加索引或优化查询逻辑');
  }

  if (summary.warnings > 0 && summary.criticalIssues === 0) {
    console.log('  🟢 处理警告信息以提升系统稳定性');
  }

  console.log('\n✅ 系统健康检查完成！');

  return {
    healthy: summary.criticalIssues === 0,
    issues,
    warnings,
    summary
  };
}

// 运行检查
systemHealthCheck().catch(console.error);