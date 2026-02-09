/**
 * 诊断班级名称和科目名称不匹配问题
 * 对比Excel、teacher_student_subjects表、grade_data表的实际数据
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 读取Excel文件
function readExcel(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}

// 显示字符串的详细信息
function analyzeString(str: string, label: string) {
  console.log(`\n${label}:`);
  console.log(`  原始: "${str}"`);
  console.log(`  长度: ${str.length}`);
  console.log(`  字符码: [${Array.from(str).map(c => c.charCodeAt(0)).join(', ')}]`);
  console.log(`  字符: [${Array.from(str).map(c => `'${c}'(${c.charCodeAt(0)})`).join(', ')}]`);

  // 检测特殊字符
  const hasLeadingSpace = /^\s/.test(str);
  const hasTrailingSpace = /\s$/.test(str);
  const hasFullWidth = /[\uFF00-\uFFEF]/.test(str);
  const hasZeroWidth = /[\u200B-\u200D\uFEFF]/.test(str);

  if (hasLeadingSpace) console.log(`  ⚠️  有前导空格`);
  if (hasTrailingSpace) console.log(`  ⚠️  有尾随空格`);
  if (hasFullWidth) console.log(`  ⚠️  包含全角字符`);
  if (hasZeroWidth) console.log(`  ⚠️  包含零宽字符`);
}

async function diagnose() {
  console.log('🔍 开始诊断班级和科目名称不匹配问题...\n');
  console.log('='.repeat(80));

  // 1. 读取ph教学编排表
  console.log('\n📄 第一步：读取Excel文件');
  console.log('-'.repeat(80));

  const phTeachingPath = resolve(process.cwd(), '.doc/ph教学编排表.xlsx');
  const phTeachingData = readExcel(phTeachingPath);

  console.log(`\n✅ ph教学编排表: ${phTeachingData.length} 行`);
  console.log(`\n表头:`, Object.keys(phTeachingData[0] || {}));
  console.log(`\n前3行样本:`);
  phTeachingData.slice(0, 3).forEach((row: any, idx) => {
    console.log(`\n  行 ${idx + 1}:`);
    Object.entries(row).slice(0, 5).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`);
    });
  });

  // 分析班级名称格式
  console.log(`\n\n📊 班级名称详细分析 (前3个):`);
  const classNames = new Set<string>();
  phTeachingData.slice(0, 3).forEach((row: any, idx) => {
    const className = row['班级名称'] || row['班级'] || row['class_name'] || '';
    classNames.add(className);
    analyzeString(className, `Excel行${idx + 1}班级名称`);
  });

  // 分析科目名称格式
  console.log(`\n\n📊 科目名称详细分析 (前3个):`);
  phTeachingData.slice(0, 3).forEach((row: any, idx) => {
    const subject = row['科目'] || row['subject'] || '';
    analyzeString(subject, `Excel行${idx + 1}科目`);
  });

  // 2. 查询teacher_student_subjects表
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 第二步：查询teacher_student_subjects表');
  console.log('-'.repeat(80));

  const { data: tssData, error: tssError } = await supabase
    .from('teacher_student_subjects')
    .select('class_name, subject, teacher_name, student_id')
    .limit(5);

  if (tssError) {
    console.error('❌ 查询失败:', tssError);
  } else {
    console.log(`\n✅ 查到 ${tssData?.length} 条记录`);
    console.log('\n样本数据:');
    tssData?.slice(0, 3).forEach((row, idx) => {
      console.log(`\n  记录 ${idx + 1}:`);
      console.log(`    班级: ${row.class_name}`);
      console.log(`    科目: ${row.subject}`);
      console.log(`    教师: ${row.teacher_name}`);

      analyzeString(row.class_name, `  TSS记录${idx + 1}班级名称`);
      analyzeString(row.subject, `  TSS记录${idx + 1}科目`);
    });
  }

  // 3. 查询grade_data表
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 第三步：查询grade_data表');
  console.log('-'.repeat(80));

  const { data: gradeData, error: gradeError } = await supabase
    .from('grade_data')
    .select('class_name, student_id, name, exam_title')
    .limit(5);

  if (gradeError) {
    console.error('❌ 查询失败:', gradeError);
  } else {
    console.log(`\n✅ 查到 ${gradeData?.length} 条记录`);
    console.log('\n样本数据:');
    gradeData?.slice(0, 3).forEach((row, idx) => {
      console.log(`\n  记录 ${idx + 1}:`);
      console.log(`    班级: ${row.class_name}`);
      console.log(`    学生: ${row.name}`);
      console.log(`    考试: ${row.exam_title}`);

      analyzeString(row.class_name, `  grade_data记录${idx + 1}班级名称`);
    });
  }

  // 4. 对比分析
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 第四步：对比分析');
  console.log('-'.repeat(80));

  // 获取所有唯一的班级名称
  const { data: tssClasses } = await supabase
    .from('teacher_student_subjects')
    .select('class_name')
    .limit(1000);

  const { data: gradeClasses } = await supabase
    .from('grade_data')
    .select('class_name')
    .limit(1000);

  const tssClassSet = new Set(tssClasses?.map(r => r.class_name) || []);
  const gradeClassSet = new Set(gradeClasses?.map(r => r.class_name) || []);

  console.log(`\nteacher_student_subjects 唯一班级数: ${tssClassSet.size}`);
  console.log(`grade_data 唯一班级数: ${gradeClassSet.size}`);

  // 找出不匹配的班级
  const inTSSNotInGrade = Array.from(tssClassSet).filter(c => !gradeClassSet.has(c));
  const inGradeNotInTSS = Array.from(gradeClassSet).filter(c => !tssClassSet.has(c));

  if (inTSSNotInGrade.length > 0) {
    console.log(`\n⚠️  在TSS但不在grade_data的班级 (${inTSSNotInGrade.length}个):`);
    inTSSNotInGrade.slice(0, 5).forEach(cls => {
      console.log(`   "${cls}"`);
    });
  }

  if (inGradeNotInTSS.length > 0) {
    console.log(`\n⚠️  在grade_data但不在TSS的班级 (${inGradeNotInTSS.length}个):`);
    inGradeNotInTSS.slice(0, 5).forEach(cls => {
      console.log(`   "${cls}"`);
    });
  }

  // 5. 查找最相似的班级名称
  if (inGradeNotInTSS.length > 0) {
    console.log('\n\n🔎 查找可能匹配的班级名称:');
    inGradeNotInTSS.slice(0, 3).forEach(gradeName => {
      console.log(`\ngrade_data中的: "${gradeName}"`);

      // 查找最相似的TSS班级名称
      const similar = Array.from(tssClassSet).filter(tssName => {
        const cleaned1 = gradeName.trim().replace(/\s+/g, '');
        const cleaned2 = tssName.trim().replace(/\s+/g, '');
        return cleaned1 === cleaned2 ||
               gradeName.includes(tssName) ||
               tssName.includes(gradeName);
      });

      if (similar.length > 0) {
        console.log(`  可能匹配的TSS班级:`);
        similar.forEach(s => console.log(`    "${s}"`));
      }
    });
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('💡 诊断完成');
  console.log('='.repeat(80));
}

diagnose();
