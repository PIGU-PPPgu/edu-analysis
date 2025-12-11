/**
 * 🔒 生产数据脱敏工具
 * 将生产数据转换为可用于测试的脱敏数据
 *
 * 使用方法:
 * ```bash
 * npx tsx scripts/desensitize-data.ts --input=prod-export.json --output=test-data.json
 * ```
 */

import fs from 'fs/promises';
import path from 'path';
import { generateChineseName, generateStudentId, generatePhoneNumber, generateEmail } from '../src/test/generators/studentGenerator';

interface StudentRecord {
  student_id: string;
  name: string;
  class_name: string;
  class_id?: string;
  contact_phone?: string;
  contact_email?: string;
  [key: string]: any;
}

interface GradeRecord {
  id?: string;
  exam_id: string;
  student_id: string;
  name: string;
  class_name: string;
  [key: string]: any;
}

interface ExamRecord {
  id: string;
  title: string;
  exam_type: string;
  exam_date: string;
  [key: string]: any;
}

interface ProductionData {
  students?: StudentRecord[];
  grades?: GradeRecord[];
  exams?: ExamRecord[];
}

/**
 * 生成一致的映射关系
 * 同一个真实姓名总是映射到同一个假名
 */
class NameMapper {
  private nameMap = new Map<string, string>();
  private studentIdMap = new Map<string, string>();
  private examIdMap = new Map<string, string>();
  private usedNames = new Set<string>();

  getAnonymousName(realName: string): string {
    if (this.nameMap.has(realName)) {
      return this.nameMap.get(realName)!;
    }

    let fakeName = generateChineseName();
    // 确保生成的假名不重复
    while (this.usedNames.has(fakeName)) {
      fakeName = generateChineseName();
    }

    this.nameMap.set(realName, fakeName);
    this.usedNames.add(fakeName);
    return fakeName;
  }

  getAnonymousStudentId(realId: string): string {
    if (this.studentIdMap.has(realId)) {
      return this.studentIdMap.get(realId)!;
    }

    const fakeId = generateStudentId('TEST');
    this.studentIdMap.set(realId, fakeId);
    return fakeId;
  }

  getAnonymousExamId(realId: string): string {
    if (this.examIdMap.has(realId)) {
      return this.examIdMap.get(realId)!;
    }

    const fakeId = `TEST_EXAM_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.examIdMap.set(realId, fakeId);
    return fakeId;
  }
}

/**
 * 脱敏学生数据
 */
function desensitizeStudent(student: StudentRecord, mapper: NameMapper): StudentRecord {
  return {
    ...student,
    student_id: mapper.getAnonymousStudentId(student.student_id),
    name: mapper.getAnonymousName(student.name),
    // 保留班级名称（不包含敏感信息）
    class_name: student.class_name,
    // 替换联系方式
    contact_phone: student.contact_phone ? generatePhoneNumber() : undefined,
    contact_email: student.contact_email ? generateEmail(mapper.getAnonymousName(student.name)) : undefined,
    // 删除可能的敏感字段
    user_id: undefined,
    id_card: undefined,
    address: undefined,
    parent_phone: undefined,
  };
}

/**
 * 脱敏成绩数据
 */
function desensitizeGrade(grade: GradeRecord, mapper: NameMapper): GradeRecord {
  return {
    ...grade,
    id: undefined, // 移除真实ID，让数据库重新生成
    student_id: mapper.getAnonymousStudentId(grade.student_id),
    name: mapper.getAnonymousName(grade.name),
    exam_id: mapper.getAnonymousExamId(grade.exam_id),
    class_name: grade.class_name,
    // 保留所有成绩相关字段（不敏感）
    // total_score, chinese_score 等保持不变
  };
}

/**
 * 脱敏考试数据
 */
function desensitizeExam(exam: ExamRecord, mapper: NameMapper): ExamRecord {
  return {
    ...exam,
    id: mapper.getAnonymousExamId(exam.id),
    // 保留考试标题和类型（不敏感）
    title: exam.title,
    exam_type: exam.exam_type,
    exam_date: exam.exam_date,
    // 移除创建者信息
    created_by: undefined,
  };
}

/**
 * 主脱敏函数
 */
async function desensitizeData(inputPath: string, outputPath: string) {
  console.log('🔒 开始数据脱敏处理...');
  console.log(`📁 输入文件: ${inputPath}`);
  console.log(`📁 输出文件: ${outputPath}`);

  try {
    // 读取原始数据
    const rawData = await fs.readFile(inputPath, 'utf-8');
    const productionData: ProductionData = JSON.parse(rawData);

    console.log('📊 原始数据统计:');
    console.log(`   学生: ${productionData.students?.length || 0} 条`);
    console.log(`   成绩: ${productionData.grades?.length || 0} 条`);
    console.log(`   考试: ${productionData.exams?.length || 0} 条`);

    // 创建映射器
    const mapper = new NameMapper();

    // 脱敏处理
    const desensitizedData: ProductionData = {};

    if (productionData.students) {
      console.log('🔄 处理学生数据...');
      desensitizedData.students = productionData.students.map((s) => desensitizeStudent(s, mapper));
    }

    if (productionData.exams) {
      console.log('🔄 处理考试数据...');
      desensitizedData.exams = productionData.exams.map((e) => desensitizeExam(e, mapper));
    }

    if (productionData.grades) {
      console.log('🔄 处理成绩数据...');
      desensitizedData.grades = productionData.grades.map((g) => desensitizeGrade(g, mapper));
    }

    // 写入输出文件
    await fs.writeFile(outputPath, JSON.stringify(desensitizedData, null, 2), 'utf-8');

    console.log('✅ 数据脱敏完成!');
    console.log(`📁 脱敏数据已保存到: ${outputPath}`);
    console.log('📊 脱敏数据统计:');
    console.log(`   学生: ${desensitizedData.students?.length || 0} 条`);
    console.log(`   成绩: ${desensitizedData.grades?.length || 0} 条`);
    console.log(`   考试: ${desensitizedData.exams?.length || 0} 条`);
    console.log('');
    console.log('🔐 脱敏规则:');
    console.log('   ✅ 姓名: 已替换为随机中文姓名');
    console.log('   ✅ 学号: 已替换为TEST_前缀的测试学号');
    console.log('   ✅ 联系方式: 已替换为随机手机号和邮箱');
    console.log('   ✅ 考试ID: 已替换为测试ID');
    console.log('   ✅ 敏感字段: 已删除（user_id, id_card, address等）');
    console.log('   ✅ 成绩数据: 保留原值（用于准确测试）');
    console.log('   ✅ 班级信息: 保留原值（无敏感信息）');
  } catch (error) {
    console.error('❌ 数据脱敏失败:', error);
    throw error;
  }
}

/**
 * 从Supabase直接导出并脱敏
 */
async function exportAndDesensitizeFromSupabase(options: {
  tables: string[];
  limit?: number;
  outputPath: string;
}) {
  console.log('🔄 从Supabase导出数据...');
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase配置未设置! 请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const productionData: ProductionData = {};

  for (const table of options.tables) {
    console.log(`📥 导出表: ${table}`);

    let query = supabase.from(table).select('*');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ 导出表 ${table} 失败:`, error);
      continue;
    }

    (productionData as any)[table] = data;
    console.log(`✅ 已导出 ${data?.length || 0} 条记录`);
  }

  // 保存原始导出（可选）
  const rawExportPath = options.outputPath.replace('.json', '-raw.json');
  await fs.writeFile(rawExportPath, JSON.stringify(productionData, null, 2), 'utf-8');
  console.log(`📁 原始导出已保存到: ${rawExportPath}`);

  // 执行脱敏
  await desensitizeData(rawExportPath, options.outputPath);

  // 清理原始文件（可选）
  // await fs.unlink(rawExportPath);
}

/**
 * CLI入口
 */
async function main() {
  const args = process.argv.slice(2);
  const params = args.reduce((acc, arg) => {
    const [key, value] = arg.split('=');
    acc[key.replace('--', '')] = value;
    return acc;
  }, {} as Record<string, string>);

  // 使用示例1: 脱敏已导出的JSON文件
  if (params.input && params.output) {
    await desensitizeData(params.input, params.output);
  }
  // 使用示例2: 从Supabase直接导出并脱敏
  else if (params.export && params.output) {
    const tables = params.tables?.split(',') || ['students', 'grades', 'exams'];
    const limit = params.limit ? parseInt(params.limit) : undefined;

    await exportAndDesensitizeFromSupabase({
      tables,
      limit,
      outputPath: params.output,
    });
  } else {
    console.log('用法:');
    console.log('');
    console.log('1. 脱敏已导出的数据:');
    console.log('   npx tsx scripts/desensitize-data.ts --input=prod-export.json --output=test-data.json');
    console.log('');
    console.log('2. 从Supabase直接导出并脱敏:');
    console.log('   npx tsx scripts/desensitize-data.ts --export=true --output=test-data.json --tables=students,grades,exams --limit=1000');
    console.log('');
    process.exit(1);
  }
}

// 只在直接运行时执行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

// 导出函数供其他脚本使用
export { desensitizeData, exportAndDesensitizeFromSupabase, NameMapper };
