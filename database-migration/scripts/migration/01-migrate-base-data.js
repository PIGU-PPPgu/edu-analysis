#!/usr/bin/env node

/**
 * 基础数据迁移脚本
 * 迁移班级、学生、教师等基础数据
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const chalk = require('chalk');

// Supabase配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://giluhqotfjpmofowvogn.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// PostgreSQL配置（目标数据库）
const PG_CONFIG = {
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'edu_system',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || ''
};

// 初始化连接
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const pgClient = new Client(PG_CONFIG);

// 日志工具
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warning: (msg) => console.log(chalk.yellow('⚠'), msg)
};

/**
 * 迁移班级数据
 */
async function migrateClasses() {
  log.info('开始迁移班级数据...');
  
  try {
    // 从Supabase获取班级数据
    // 需要合并多个班级表的数据
    const { data: classInfo, error: error1 } = await supabase
      .from('class_info')
      .select('*');
    
    const { data: classes, error: error2 } = await supabase
      .from('classes')
      .select('*');
    
    if (error1 || error2) {
      throw new Error('获取班级数据失败');
    }
    
    // 合并和去重班级数据
    const classMap = new Map();
    
    // 优先使用class_info的数据
    if (classInfo) {
      classInfo.forEach(cls => {
        classMap.set(cls.class_name, {
          class_name: cls.class_name,
          grade: cls.grade_level || extractGrade(cls.class_name),
          grade_number: extractGradeNumber(cls.class_name),
          class_number: extractClassNumber(cls.class_name),
          academic_year: cls.academic_year || '2024-2025',
          teacher_id: cls.homeroom_teacher_id || null,
          student_count: cls.student_count || 0,
          status: 'active',
          metadata: {
            original_id: cls.id,
            source: 'class_info',
            department: cls.department
          }
        });
      });
    }
    
    // 补充classes表的数据
    if (classes) {
      classes.forEach(cls => {
        if (!classMap.has(cls.name)) {
          classMap.set(cls.name, {
            class_name: cls.name,
            grade: cls.grade,
            grade_number: extractGradeNumber(cls.name),
            class_number: extractClassNumber(cls.name),
            academic_year: '2024-2025',
            teacher_id: null,
            student_count: 0,
            status: 'active',
            metadata: {
              original_id: cls.id,
              source: 'classes'
            }
          });
        }
      });
    }
    
    // 插入到新数据库
    let insertCount = 0;
    for (const [className, classData] of classMap) {
      const query = `
        INSERT INTO classes (
          class_name, grade, grade_number, class_number,
          academic_year, teacher_id, student_count, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (class_name) DO UPDATE SET
          grade = EXCLUDED.grade,
          student_count = EXCLUDED.student_count,
          metadata = EXCLUDED.metadata
        RETURNING id
      `;
      
      const values = [
        classData.class_name,
        classData.grade,
        classData.grade_number,
        classData.class_number,
        classData.academic_year,
        classData.teacher_id,
        classData.student_count,
        classData.status,
        JSON.stringify(classData.metadata)
      ];
      
      try {
        const result = await pgClient.query(query, values);
        insertCount++;
      } catch (err) {
        log.error(`插入班级失败 ${className}: ${err.message}`);
      }
    }
    
    log.success(`班级数据迁移完成：${insertCount}/${classMap.size} 条`);
    return { total: classMap.size, success: insertCount };
    
  } catch (error) {
    log.error(`班级数据迁移失败: ${error.message}`);
    throw error;
  }
}

/**
 * 迁移学生数据
 */
async function migrateStudents() {
  log.info('开始迁移学生数据...');
  
  try {
    // 获取学生数据
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at');
    
    if (error) {
      throw new Error(`获取学生数据失败: ${error.message}`);
    }
    
    // 获取班级映射
    const classMapping = await getClassMapping();
    
    // 批量插入学生数据
    let insertCount = 0;
    let skipCount = 0;
    
    for (const student of students || []) {
      // 查找对应的新班级ID
      let newClassId = null;
      if (student.class_id) {
        newClassId = classMapping[student.class_id];
        if (!newClassId) {
          log.warning(`找不到班级映射: ${student.class_id}`);
          // 尝试通过班级名称查找
          const className = await getClassNameById(student.class_id);
          if (className) {
            newClassId = await getNewClassIdByName(className);
          }
        }
      }
      
      if (!newClassId) {
        log.warning(`跳过学生 ${student.name}: 无法找到班级`);
        skipCount++;
        continue;
      }
      
      const query = `
        INSERT INTO students (
          id, student_no, name, gender, class_id,
          admission_year, id_card, phone, email, address,
          status, user_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (student_no) DO UPDATE SET
          name = EXCLUDED.name,
          class_id = EXCLUDED.class_id,
          metadata = EXCLUDED.metadata
      `;
      
      const values = [
        student.id,
        student.student_id || student.student_no,
        student.name,
        student.gender,
        newClassId,
        student.admission_year || '2024',
        student.id_card,
        student.contact_phone || student.phone,
        student.contact_email || student.email,
        student.address,
        'active',
        student.user_id,
        JSON.stringify({
          original_id: student.id,
          original_class_id: student.class_id,
          ...student.metadata
        }),
        student.created_at
      ];
      
      try {
        await pgClient.query(query, values);
        insertCount++;
      } catch (err) {
        log.error(`插入学生失败 ${student.name}: ${err.message}`);
      }
    }
    
    log.success(`学生数据迁移完成：${insertCount}/${students?.length || 0} 条，跳过 ${skipCount} 条`);
    return { total: students?.length || 0, success: insertCount, skipped: skipCount };
    
  } catch (error) {
    log.error(`学生数据迁移失败: ${error.message}`);
    throw error;
  }
}

/**
 * 迁移教师数据
 */
async function migrateTeachers() {
  log.info('开始迁移教师数据...');
  
  try {
    const { data: teachers, error } = await supabase
      .from('teachers')
      .select('*');
    
    if (error) {
      throw new Error(`获取教师数据失败: ${error.message}`);
    }
    
    let insertCount = 0;
    
    for (const teacher of teachers || []) {
      const query = `
        INSERT INTO teachers (
          id, teacher_no, name, gender, phone, email,
          subjects, is_homeroom, user_id, status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          subjects = EXCLUDED.subjects,
          metadata = EXCLUDED.metadata
      `;
      
      const values = [
        teacher.id,
        teacher.teacher_no || `T${String(teacher.id).slice(0, 6)}`,
        teacher.name,
        teacher.gender,
        teacher.phone,
        teacher.email,
        teacher.subject ? [teacher.subject] : [],
        false, // is_homeroom
        teacher.id, // user_id就是teacher的id
        'active',
        JSON.stringify({
          original_subject: teacher.subject,
          ...teacher.metadata
        })
      ];
      
      try {
        await pgClient.query(query, values);
        insertCount++;
      } catch (err) {
        log.error(`插入教师失败 ${teacher.name}: ${err.message}`);
      }
    }
    
    log.success(`教师数据迁移完成：${insertCount}/${teachers?.length || 0} 条`);
    return { total: teachers?.length || 0, success: insertCount };
    
  } catch (error) {
    log.error(`教师数据迁移失败: ${error.message}`);
    throw error;
  }
}

// ========== 辅助函数 ==========

/**
 * 提取年级信息
 */
function extractGrade(className) {
  const match = className.match(/(七|八|九|高一|高二|高三)年级/);
  return match ? match[0] : '九年级';
}

/**
 * 提取年级数字
 */
function extractGradeNumber(className) {
  const gradeMap = {
    '七': 7, '八': 8, '九': 9,
    '高一': 10, '高二': 11, '高三': 12
  };
  
  for (const [key, value] of Object.entries(gradeMap)) {
    if (className.includes(key)) {
      return value;
    }
  }
  return 9; // 默认九年级
}

/**
 * 提取班号
 */
function extractClassNumber(className) {
  const match = className.match(/(\d+)班/);
  return match ? parseInt(match[1]) : 1;
}

/**
 * 获取班级映射关系
 */
async function getClassMapping() {
  const result = await pgClient.query(`
    SELECT 
      metadata->>'original_id' as old_id,
      id as new_id
    FROM classes
    WHERE metadata->>'original_id' IS NOT NULL
  `);
  
  const mapping = {};
  result.rows.forEach(row => {
    mapping[row.old_id] = row.new_id;
  });
  
  return mapping;
}

/**
 * 通过ID获取班级名称
 */
async function getClassNameById(classId) {
  const { data, error } = await supabase
    .from('class_info')
    .select('class_name')
    .eq('id', classId)
    .single();
  
  if (!error && data) {
    return data.class_name;
  }
  
  // 尝试从classes表获取
  const { data: data2 } = await supabase
    .from('classes')
    .select('name')
    .eq('id', classId)
    .single();
  
  return data2?.name || null;
}

/**
 * 通过班级名称获取新ID
 */
async function getNewClassIdByName(className) {
  const result = await pgClient.query(
    'SELECT id FROM classes WHERE class_name = $1',
    [className]
  );
  
  return result.rows[0]?.id || null;
}

// ========== 主函数 ==========

async function main() {
  console.log(chalk.cyan('====================================='));
  console.log(chalk.cyan('   基础数据迁移脚本 v1.0           '));
  console.log(chalk.cyan('=====================================\n'));
  
  try {
    // 连接数据库
    log.info('连接到PostgreSQL数据库...');
    await pgClient.connect();
    log.success('数据库连接成功');
    
    // 开始事务
    await pgClient.query('BEGIN');
    
    // 执行迁移
    const results = {
      classes: await migrateClasses(),
      teachers: await migrateTeachers(),
      students: await migrateStudents()
    };
    
    // 提交事务
    await pgClient.query('COMMIT');
    
    // 输出统计
    console.log('\n' + chalk.cyan('===== 迁移统计 ====='));
    console.log(chalk.green('班级：'), `${results.classes.success}/${results.classes.total}`);
    console.log(chalk.green('教师：'), `${results.teachers.success}/${results.teachers.total}`);
    console.log(chalk.green('学生：'), `${results.students.success}/${results.students.total}`);
    
    log.success('\n✨ 基础数据迁移完成！');
    
  } catch (error) {
    // 回滚事务
    await pgClient.query('ROLLBACK');
    log.error(`迁移失败: ${error.message}`);
    console.error(error);
    process.exit(1);
    
  } finally {
    // 关闭连接
    await pgClient.end();
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  migrateClasses,
  migrateStudents,
  migrateTeachers
};