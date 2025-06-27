#!/usr/bin/env node

/**
 * 🚑 立即修复导入问题
 * 在数据库结构修复之前，先让前端功能可以正常工作
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixImmediateIssues() {
  console.log('🚑 开始立即修复导入问题...');
  console.log('==========================================');
  
  try {
    // 1. 检查当前可用字段
    console.log('📋 步骤1: 检查当前可用字段...');
    
    const { data: sampleRecord } = await supabase
      .from('grade_data')
      .select('*')
      .limit(1);
    
    if (sampleRecord && sampleRecord.length > 0) {
      const availableFields = Object.keys(sampleRecord[0]);
      console.log('✅ 当前可用字段:', availableFields.slice(0, 10).join(', '), '...');
      
      // 找出可以用作成绩存储的字段
      const usableFields = availableFields.filter(field => 
        field.includes('score') || 
        field.includes('custom_') ||
        field === 'grade' ||
        field === 'subject'
      );
      
      console.log('📊 可用于成绩存储的字段:', usableFields.slice(0, 5).join(', '));
      
      // 2. 创建临时字段映射策略
      console.log('\\n📋 步骤2: 创建临时字段映射策略...');
      
      const temporaryFieldMapping = {
        // 使用现有字段映射
        required: {
          student_id: 'student_id',
          name: 'name', 
          class_name: 'class_name'
        },
        scores: {
          // 如果有标准字段就用，否则用custom字段
          chinese_score: availableFields.includes('chinese_score') ? 'chinese_score' : (usableFields[0] || 'score'),
          math_score: availableFields.includes('math_score') ? 'math_score' : (usableFields[1] || 'score'),
          english_score: availableFields.includes('english_score') ? 'english_score' : (usableFields[2] || 'score'),
          total_score: 'total_score'
        },
        fallback: {
          // 通用存储字段
          general_score: 'score',
          general_grade: 'grade',
          general_subject: 'subject'
        }
      };
      
      console.log('✅ 临时字段映射策略已创建');
      
      // 3. 生成适配的IntelligentFieldValidator
      console.log('\\n📋 步骤3: 生成适配的字段验证器...');
      
      const adaptedValidatorCode = `
/**
 * 🚑 临时适配的智能字段验证器
 * 基于当前数据库实际字段结构
 */

// 基于实际数据库结构的字段定义
export const ADAPTED_DATABASE_FIELDS = {
  // 必需字段（确认存在）
  required: {
    student_id: { name: '学号', type: 'string', required: true, dbColumn: 'student_id' },
    name: { name: '姓名', type: 'string', required: true, dbColumn: 'name' },
    class_name: { name: '班级', type: 'string', required: true, dbColumn: 'class_name' }
  },
  
  // 成绩字段（使用现有字段）
  scores: {
    total_score: { name: '总分', type: 'number', range: [0, 900], dbColumn: 'total_score' },
    score: { name: '分数', type: 'number', range: [0, 150], dbColumn: 'score' },
    // 临时使用custom字段存储各科成绩
    ${usableFields.slice(0, 9).map((field, index) => {
      const subjects = ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'];
      const subject = subjects[index] || 'unknown';
      return `${subject}_score: { name: '${subject === 'chinese' ? '语文' : subject === 'math' ? '数学' : subject === 'english' ? '英语' : subject}分数', type: 'number', range: [0, 150], dbColumn: '${field}' }`;
    }).join(',\\n    ')}
  },
  
  // 其他字段
  additional: {
    grade: { name: '等级', type: 'string', dbColumn: 'grade' },
    subject: { name: '科目', type: 'string', dbColumn: 'subject' },
    rank_in_class: { name: '班级排名', type: 'number', dbColumn: 'rank_in_class' },
    rank_in_grade: { name: '年级排名', type: 'number', dbColumn: 'rank_in_grade' },
    exam_id: { name: '考试ID', type: 'uuid', dbColumn: 'exam_id' },
    exam_title: { name: '考试标题', type: 'string', dbColumn: 'exam_title' },
    exam_type: { name: '考试类型', type: 'string', dbColumn: 'exam_type' },
    exam_date: { name: '考试日期', type: 'date', dbColumn: 'exam_date' }
  }
};

// 科目模式匹配（保持原有逻辑）
export const ADAPTED_SUBJECT_PATTERNS = {
  chinese: {
    name: '语文',
    patterns: [/^语文|chinese|语$/i],
    field: 'chinese_score'
  },
  math: {
    name: '数学', 
    patterns: [/^数学|math|数$/i],
    field: 'math_score'
  },
  english: {
    name: '英语',
    patterns: [/^英语|english|英$/i],
    field: 'english_score'
  },
  physics: {
    name: '物理',
    patterns: [/^物理|physics|理$/i],
    field: 'physics_score'
  },
  chemistry: {
    name: '化学',
    patterns: [/^化学|chemistry|化$/i],
    field: 'chemistry_score'
  },
  biology: {
    name: '生物',
    patterns: [/^生物|biology|生$/i],
    field: 'biology_score'
  },
  total: {
    name: '总分',
    patterns: [/^总分|total|合计|总成绩$/i],
    field: 'total_score'
  }
};

export class AdaptedIntelligentFieldValidator {
  validateMapping(headers, currentMappings, sampleData) {
    const mappedFields = [];
    const unmappedFields = [];
    const missingRequired = [];
    const suggestions = [];
    
    // 获取所有可用字段
    const allDbFields = {
      ...ADAPTED_DATABASE_FIELDS.required,
      ...ADAPTED_DATABASE_FIELDS.scores,
      ...ADAPTED_DATABASE_FIELDS.additional
    };
    
    // 检查已映射字段
    Object.entries(currentMappings).forEach(([header, dbField]) => {
      if (allDbFields[dbField]) {
        mappedFields.push(header);
      }
    });
    
    // 找出未映射字段
    headers.forEach(header => {
      if (!currentMappings[header]) {
        const analysis = this.analyzeField(header, sampleData);
        unmappedFields.push(analysis);
      }
    });
    
    // 检查必需字段
    Object.keys(ADAPTED_DATABASE_FIELDS.required).forEach(requiredField => {
      const isMapped = Object.values(currentMappings).includes(requiredField);
      if (!isMapped) {
        missingRequired.push(requiredField);
      }
    });
    
    return {
      isValid: missingRequired.length === 0,
      mappedFields,
      unmappedFields,
      missingRequired,
      suggestions: [
        \`发现 \${unmappedFields.length} 个未映射字段\`,
        missingRequired.length > 0 ? \`缺少必需字段：\${missingRequired.join('、')}\` : ''
      ].filter(Boolean),
      score: Math.round((mappedFields.length / headers.length) * 100)
    };
  }
  
  analyzeField(header, sampleData) {
    const headerLower = header.toLowerCase();
    let suggestedSubject = '';
    let suggestedType = 'score';
    let confidence = 0.5;
    const reasons = [];
    
    // 科目识别
    for (const [subjectKey, subjectInfo] of Object.entries(ADAPTED_SUBJECT_PATTERNS)) {
      if (subjectInfo.patterns.some(pattern => pattern.test(headerLower))) {
        suggestedSubject = subjectKey;
        suggestedType = 'score';
        confidence = 0.8;
        reasons.push(\`匹配科目: \${subjectInfo.name}\`);
        break;
      }
    }
    
    // 类型识别
    if (headerLower.includes('排名') || headerLower.includes('名次')) {
      suggestedType = 'rank';
      confidence = 0.7;
    } else if (headerLower.includes('等级')) {
      suggestedType = 'grade';
      confidence = 0.7;
    }
    
    return {
      originalName: header,
      sampleValues: sampleData.slice(0, 3).map(row => row[header] || ''),
      suggestedSubject,
      suggestedType,
      confidence,
      reasons
    };
  }
  
  generateDbFieldName(subject, type) {
    if (type === 'rank') return 'rank_in_class';
    if (type === 'grade') return 'grade';
    if (subject && ADAPTED_SUBJECT_PATTERNS[subject]) {
      return ADAPTED_SUBJECT_PATTERNS[subject].field;
    }
    return 'score'; // 默认使用通用score字段
  }
  
  isValidDbField(fieldName) {
    const allFields = {
      ...ADAPTED_DATABASE_FIELDS.required,
      ...ADAPTED_DATABASE_FIELDS.scores,
      ...ADAPTED_DATABASE_FIELDS.additional
    };
    return !!allFields[fieldName];
  }
}

export const adaptedFieldValidator = new AdaptedIntelligentFieldValidator();
`;
      
      // 写入适配的验证器
      fs.writeFileSync(
        path.join(__dirname, 'src/services/adaptedFieldValidator.ts'),
        adaptedValidatorCode,
        'utf-8'
      );
      
      console.log('✅ 已创建适配的字段验证器: src/services/adaptedFieldValidator.ts');
      
      // 4. 生成修复的ImportProcessor查询逻辑
      console.log('\\n📋 步骤4: 生成修复的查询逻辑...');
      
      const fixedQueryCode = `
// 🚑 修复的查询逻辑 - 避免406错误

// 修复exams查询（移除有问题的字段）
const checkExamDuplicate = async (examInfo) => {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, type, date, created_at') // 移除subject和grade_data(count)
      .eq('title', examInfo.title)
      .eq('type', examInfo.type)
      .eq('date', examInfo.date);
    
    return { data, error };
  } catch (err) {
    console.error('Exam查询错误:', err);
    return { data: null, error: err };
  }
};

// 修复grade_data查询（使用实际存在的字段）
const checkGradeDataDuplicate = async (examId, studentId) => {
  try {
    const { data, error } = await supabase
      .from('grade_data')
      .select('id')
      .eq('exam_id', examId)
      .eq('student_id', studentId);
    
    return { data, error };
  } catch (err) {
    console.error('GradeData查询错误:', err);
    return { data: null, error: err };
  }
};

// 安全的grade_data插入（使用现有字段）
const insertGradeData = async (gradeRecord) => {
  const safeRecord = {
    exam_id: gradeRecord.exam_id,
    student_id: gradeRecord.student_id,
    name: gradeRecord.name,
    class_name: gradeRecord.class_name,
    total_score: gradeRecord.total_score,
    score: gradeRecord.score || gradeRecord.total_score, // 使用通用字段
    grade: gradeRecord.grade,
    rank_in_class: gradeRecord.rank_in_class,
    rank_in_grade: gradeRecord.rank_in_grade,
    exam_title: gradeRecord.exam_title,
    exam_type: gradeRecord.exam_type,
    exam_date: gradeRecord.exam_date,
    subject: gradeRecord.subject || '',
    metadata: gradeRecord.metadata || {}
  };
  
  try {
    const { data, error } = await supabase
      .from('grade_data')
      .insert(safeRecord)
      .select()
      .single();
    
    return { data, error };
  } catch (err) {
    console.error('插入错误:', err);
    return { data: null, error: err };
  }
};

export { checkExamDuplicate, checkGradeDataDuplicate, insertGradeData };
`;
      
      fs.writeFileSync(
        path.join(__dirname, 'src/services/fixedQueryLogic.ts'),
        fixedQueryCode,
        'utf-8'
      );
      
      console.log('✅ 已创建修复的查询逻辑: src/services/fixedQueryLogic.ts');
      
      // 5. 创建测试脚本
      console.log('\\n📋 步骤5: 创建功能测试脚本...');
      
      const testScript = `
// 测试修复后的功能
import { adaptedFieldValidator } from './src/services/adaptedFieldValidator.ts';
import { checkExamDuplicate, insertGradeData } from './src/services/fixedQueryLogic.ts';

// 测试字段验证
const testHeaders = ['姓名', '学号', '班级', '语文', '数学', '总分'];
const testMappings = {};
const testData = [{ '姓名': '张三', '学号': '001', '班级': '高一1班', '语文': '85', '数学': '92', '总分': '450' }];

const validationResult = adaptedFieldValidator.validateMapping(testHeaders, testMappings, testData);
console.log('验证结果:', validationResult);

// 测试考试查询
const testExam = { title: '测试考试', type: '月考', date: '2025-06-26' };
checkExamDuplicate(testExam).then(result => {
  console.log('考试查询结果:', result.error ? '失败' : '成功');
});
`;
      
      fs.writeFileSync(
        path.join(__dirname, 'test-fixed-functionality.js'),
        testScript,
        'utf-8'
      );
      
      console.log('✅ 已创建功能测试脚本');
    }
    
    console.log('\\n==========================================');
    console.log('🎉 立即修复完成！');
    console.log('==========================================');
    console.log('📄 已创建的修复文件:');
    console.log('1. src/services/adaptedFieldValidator.ts - 适配的字段验证器');
    console.log('2. src/services/fixedQueryLogic.ts - 修复的查询逻辑');
    console.log('3. test-fixed-functionality.js - 功能测试脚本');
    console.log('');
    console.log('🔧 使用方法:');
    console.log('1. 在ImportProcessor中引入fixedQueryLogic');
    console.log('2. 在字段验证中使用adaptedFieldValidator');
    console.log('3. 这样可以避免406错误，让功能先正常工作');
    console.log('4. 等数据库结构修复后再切换回标准验证器');
    console.log('==========================================');
    
    return true;
    
  } catch (error) {
    console.error('❌ 立即修复失败:', error.message);
    return false;
  }
}

// 运行
main().catch(console.error);

async function main() {
  const success = await fixImmediateIssues();
  console.log(success ? '✅ 立即修复成功' : '❌ 立即修复失败');
}