/**
 * 数据映射修复脚本
 * 建立students表和grade_data_new表之间的关联映射
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://giluhqotfjpmofowvogn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpbHVocW90ZmpwbW9mb3d2b2duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDIwMDQsImV4cCI6MjA2MDg3ODAwNH0.NkVIqDlRM-qh8HoFR-nZMfXKWT0lDMeNSk5EPJiprZQ'
);

async function createDataMapping() {
  console.log('🔗 开始创建数据映射关联...\n');

  try {
    // 1. 获取所有学生数据
    console.log('=== 1. 获取学生表数据 ===');
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('student_id, name, class_name')
      .not('name', 'is', null)
      .not('class_name', 'is', null);

    if (studentsError) {
      console.error('❌ 获取学生数据失败:', studentsError);
      return;
    }

    console.log(`✅ 获取到 ${studentsData.length} 名学生数据`);

    // 2. 获取所有成绩数据中的学生信息
    console.log('\n=== 2. 获取成绩表中的学生信息 ===');
    const { data: gradeStudentsData, error: gradeError } = await supabase
      .from('grade_data_new')
      .select('student_id, name, class_name')
      .not('name', 'is', null);

    if (gradeError) {
      console.error('❌ 获取成绩学生数据失败:', gradeError);
      return;
    }

    // 去重成绩表中的学生信息
    const uniqueGradeStudents = new Map();
    gradeStudentsData.forEach(student => {
      const key = `${student.name}-${student.class_name}`;
      if (!uniqueGradeStudents.has(key)) {
        uniqueGradeStudents.set(key, student);
      }
    });

    console.log(`✅ 成绩表中有 ${uniqueGradeStudents.size} 个唯一学生`);

    // 3. 创建映射关系
    console.log('\n=== 3. 建立映射关系 ===');
    const mappingResults = {
      exactMatches: [],        // 精确匹配（姓名+班级）
      nameMatches: [],         // 姓名匹配但班级不同
      noMatches: [],           // 无法匹配
      conflicts: []            // 冲突（多个匹配）
    };

    for (const student of studentsData) {
      const studentKey = `${student.name}-${student.class_name}`;
      const gradeStudent = uniqueGradeStudents.get(studentKey);

      if (gradeStudent) {
        // 精确匹配
        mappingResults.exactMatches.push({
          student_table_id: student.student_id,
          grade_table_id: gradeStudent.student_id,
          name: student.name,
          class_name: student.class_name,
          match_type: 'exact'
        });
      } else {
        // 尝试只通过姓名匹配
        const nameMatches = Array.from(uniqueGradeStudents.values())
          .filter(gs => gs.name === student.name);

        if (nameMatches.length === 1) {
          mappingResults.nameMatches.push({
            student_table_id: student.student_id,
            grade_table_id: nameMatches[0].student_id,
            name: student.name,
            student_class: student.class_name,
            grade_class: nameMatches[0].class_name,
            match_type: 'name_only'
          });
        } else if (nameMatches.length > 1) {
          mappingResults.conflicts.push({
            student_table_id: student.student_id,
            name: student.name,
            class_name: student.class_name,
            possible_matches: nameMatches.length,
            match_type: 'conflict'
          });
        } else {
          mappingResults.noMatches.push({
            student_table_id: student.student_id,
            name: student.name,
            class_name: student.class_name,
            match_type: 'no_match'
          });
        }
      }
    }

    // 4. 显示映射结果统计
    console.log('📊 映射结果统计:');
    console.log(`  精确匹配: ${mappingResults.exactMatches.length}`);
    console.log(`  姓名匹配: ${mappingResults.nameMatches.length}`);
    console.log(`  无法匹配: ${mappingResults.noMatches.length}`);
    console.log(`  冲突记录: ${mappingResults.conflicts.length}`);

    const totalMappable = mappingResults.exactMatches.length + mappingResults.nameMatches.length;
    const mappingRate = (totalMappable / studentsData.length) * 100;
    console.log(`  总体映射率: ${Math.round(mappingRate * 10) / 10}%`);

    // 5. 显示映射样本
    if (mappingResults.exactMatches.length > 0) {
      console.log('\n精确匹配示例:');
      mappingResults.exactMatches.slice(0, 3).forEach(match => {
        console.log(`  👤 ${match.name} (${match.class_name})`);
        console.log(`    学生表ID: ${match.student_table_id}`);
        console.log(`    成绩表ID: ${match.grade_table_id}`);
      });
    }

    if (mappingResults.nameMatches.length > 0) {
      console.log('\n姓名匹配示例:');
      mappingResults.nameMatches.slice(0, 3).forEach(match => {
        console.log(`  👤 ${match.name}`);
        console.log(`    学生表: ${match.student_class} (${match.student_table_id})`);
        console.log(`    成绩表: ${match.grade_class} (${match.grade_table_id})`);
      });
    }

    // 6. 尝试创建映射表（如果权限允许）
    console.log('\n=== 6. 创建数据映射表 ===');

    try {
      // 先检查映射表是否存在
      const { data: existingMappings, error: checkError } = await supabase
        .from('student_id_mapping')
        .select('id')
        .limit(1);

      if (checkError && checkError.code === '42P01') {
        console.log('⚠️  映射表不存在，需要先创建表结构');
        console.log('SQL创建语句:');
        console.log(`
CREATE TABLE student_id_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_table_id TEXT NOT NULL,
  grade_table_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_name TEXT,
  match_type TEXT NOT NULL,
  confidence NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_table_id, grade_table_id)
);
        `);
      } else {
        // 如果表存在，插入映射数据
        console.log('📝 准备插入映射数据...');

        const allMappings = [
          ...mappingResults.exactMatches.map(m => ({
            student_table_id: m.student_table_id,
            grade_table_id: m.grade_table_id,
            student_name: m.name,
            class_name: m.class_name,
            match_type: m.match_type,
            confidence: 1.0
          })),
          ...mappingResults.nameMatches.map(m => ({
            student_table_id: m.student_table_id,
            grade_table_id: m.grade_table_id,
            student_name: m.name,
            class_name: m.student_class,
            match_type: m.match_type,
            confidence: 0.8
          }))
        ];

        if (allMappings.length > 0) {
          // 先清空现有映射
          await supabase.from('student_id_mapping').delete().neq('id', '00000000-0000-0000-0000-000000000000');

          // 插入新映射
          const { data: insertResult, error: insertError } = await supabase
            .from('student_id_mapping')
            .insert(allMappings)
            .select();

          if (insertError) {
            console.error('❌ 插入映射数据失败:', insertError);
          } else {
            console.log(`✅ 成功插入 ${insertResult.length} 条映射记录`);
          }
        }
      }
    } catch (mappingError) {
      console.log('⚠️  无法直接创建映射表，可能需要管理员权限');
      console.log('错误:', mappingError.message);
    }

    // 7. 创建映射服务函数
    console.log('\n=== 7. 生成映射服务代码 ===');

    const mappingServiceCode = `
/**
 * 学生ID映射服务
 * 提供students表和grade_data_new表之间的ID转换
 */

// 映射数据（从映射分析中生成）
const studentIdMapping = new Map([
${mappingResults.exactMatches.map(m =>
  `  ['${m.student_table_id}', '${m.grade_table_id}'] // ${m.name} - ${m.class_name}`
).join(',\n')}
]);

const gradeIdMapping = new Map([
${mappingResults.exactMatches.map(m =>
  `  ['${m.grade_table_id}', '${m.student_table_id}'] // ${m.name} - ${m.class_name}`
).join(',\n')}
]);

export function getGradeTableId(studentTableId) {
  return studentIdMapping.get(studentTableId);
}

export function getStudentTableId(gradeTableId) {
  return gradeIdMapping.get(gradeTableId);
}

export function getMappingStats() {
  return {
    totalMappings: ${mappingResults.exactMatches.length},
    exactMatches: ${mappingResults.exactMatches.length},
    nameMatches: ${mappingResults.nameMatches.length},
    mappingRate: ${Math.round(mappingRate * 10) / 10}
  };
}
`;

    // 写入映射服务文件 (使用ES modules)
    const fs = await import('fs');
    fs.writeFileSync('src/services/studentIdMappingService.ts', mappingServiceCode);
    console.log('✅ 已生成 src/services/studentIdMappingService.ts');

    // 8. 验证映射效果
    console.log('\n=== 8. 验证映射效果 ===');

    if (mappingResults.exactMatches.length > 0) {
      const testMapping = mappingResults.exactMatches[0];

      // 验证学生数据
      const { data: studentData } = await supabase
        .from('students')
        .select('name, class_name')
        .eq('student_id', testMapping.student_table_id)
        .single();

      // 验证成绩数据
      const { data: gradeData } = await supabase
        .from('grade_data_new')
        .select('name, class_name, total_score')
        .eq('student_id', testMapping.grade_table_id)
        .limit(1);

      if (studentData && gradeData && gradeData.length > 0) {
        console.log('✅ 映射验证成功:');
        console.log(`  学生表: ${studentData.name} - ${studentData.class_name}`);
        console.log(`  成绩表: ${gradeData[0].name} - ${gradeData[0].class_name} (${gradeData[0].total_score}分)`);
      }
    }

    console.log('\n🎉 数据映射创建完成！');
    return {
      success: true,
      mappingRate,
      exactMatches: mappingResults.exactMatches.length,
      totalMappable
    };

  } catch (error) {
    console.error('❌ 创建数据映射失败:', error);
    return { success: false, error: error.message };
  }
}

// 运行映射创建
createDataMapping()
  .then(result => {
    console.log('\n📊 最终结果:', result);
  })
  .catch(console.error);