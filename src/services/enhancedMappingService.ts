/**
 * 增强版学生ID映射服务
 * 提供students表和grade_data_new表之间的ID转换
 * 支持数据库查询和缓存映射
 */

import { supabase } from "@/lib/supabase";

// 映射缓存
let mappingCache: Map<string, string> | null = null;
let reverseMappingCache: Map<string, string> | null = null;

/**
 * 初始化映射缓存
 */
async function initMappingCache() {
  if (mappingCache && reverseMappingCache) {
    return; // 已经初始化
  }

  try {
    const { data: mappings, error } = await supabase
      .from("student_id_mapping")
      .select("student_table_id, grade_table_id");

    if (error) {
      console.error("加载映射数据失败:", error);
      return;
    }

    mappingCache = new Map();
    reverseMappingCache = new Map();

    mappings?.forEach((mapping) => {
      mappingCache!.set(mapping.student_table_id, mapping.grade_table_id);
      reverseMappingCache!.set(
        mapping.grade_table_id,
        mapping.student_table_id
      );
    });

    console.log(`✅ 映射缓存初始化完成，共加载 ${mappings?.length} 条映射记录`);
  } catch (error) {
    console.error("初始化映射缓存失败:", error);
  }
}

/**
 * 获取学生表ID对应的成绩表ID
 */
export async function getGradeTableId(
  studentTableId: string
): Promise<string | null> {
  await initMappingCache();
  return mappingCache?.get(studentTableId) || null;
}

/**
 * 获取成绩表ID对应的学生表ID
 */
export async function getStudentTableId(
  gradeTableId: string
): Promise<string | null> {
  await initMappingCache();
  return reverseMappingCache?.get(gradeTableId) || null;
}

/**
 * 批量获取学生表ID对应的成绩表ID
 */
export async function batchGetGradeTableIds(
  studentTableIds: string[]
): Promise<Map<string, string>> {
  await initMappingCache();
  const result = new Map<string, string>();

  studentTableIds.forEach((studentId) => {
    const gradeId = mappingCache?.get(studentId);
    if (gradeId) {
      result.set(studentId, gradeId);
    }
  });

  return result;
}

/**
 * 批量获取成绩表ID对应的学生表ID
 */
export async function batchGetStudentTableIds(
  gradeTableIds: string[]
): Promise<Map<string, string>> {
  await initMappingCache();
  const result = new Map<string, string>();

  gradeTableIds.forEach((gradeId) => {
    const studentId = reverseMappingCache?.get(gradeId);
    if (studentId) {
      result.set(gradeId, studentId);
    }
  });

  return result;
}

/**
 * 获取映射统计信息
 */
export async function getMappingStats() {
  await initMappingCache();

  const { data: totalStudents } = await supabase
    .from("students")
    .select("student_id", { count: "exact" });

  const mappingCount = mappingCache?.size || 0;
  const mappingRate = totalStudents?.length
    ? Math.round((mappingCount / totalStudents.length) * 1000) / 10
    : 0;

  return {
    totalStudents: totalStudents?.length || 0,
    totalMappings: mappingCount,
    mappingRate,
    exactMatches: mappingCount,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 根据学生表ID查询成绩数据
 */
export async function getGradesByStudentTableId(studentTableId: string) {
  const gradeTableId = await getGradeTableId(studentTableId);
  if (!gradeTableId) {
    return { data: null, error: new Error("未找到对应的成绩表ID") };
  }

  return await supabase
    .from("grade_data_new")
    .select("*")
    .eq("student_id", gradeTableId);
}

/**
 * 根据班级名称获取所有学生的成绩数据（使用映射）
 */
export async function getGradesByClassName(className: string) {
  // 1. 获取班级内所有学生
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("student_id, name")
    .eq("class_name", className);

  if (studentsError || !students) {
    return { data: null, error: studentsError };
  }

  // 2. 批量获取映射的成绩表ID
  const studentIds = students.map((s) => s.student_id);
  const mappings = await batchGetGradeTableIds(studentIds);
  const gradeIds = Array.from(mappings.values());

  if (gradeIds.length === 0) {
    return { data: [], error: null };
  }

  // 3. 查询成绩数据
  const { data: grades, error: gradesError } = await supabase
    .from("grade_data_new")
    .select("*")
    .in("student_id", gradeIds);

  return { data: grades, error: gradesError };
}

/**
 * 清除映射缓存（用于重新加载）
 */
export function clearMappingCache() {
  mappingCache = null;
  reverseMappingCache = null;
}

/**
 * 验证映射有效性
 */
export async function validateMapping() {
  await initMappingCache();

  if (!mappingCache || mappingCache.size === 0) {
    return {
      valid: false,
      message: "映射数据为空或加载失败",
      details: null,
    };
  }

  // 随机选择一些映射进行验证
  const entries = Array.from(mappingCache.entries()).slice(0, 5);
  const validationResults = [];

  for (const [studentId, gradeId] of entries) {
    // 验证学生表记录存在
    const { data: student } = await supabase
      .from("students")
      .select("student_id, name, class_name")
      .eq("student_id", studentId)
      .single();

    // 验证成绩表记录存在
    const { data: grade } = await supabase
      .from("grade_data_new")
      .select("student_id, name, class_name")
      .eq("student_id", gradeId)
      .limit(1)
      .single();

    validationResults.push({
      studentId,
      gradeId,
      studentExists: !!student,
      gradeExists: !!grade,
      nameMatch: student?.name === grade?.name,
      classMatch: student?.class_name === grade?.class_name,
    });
  }

  const validCount = validationResults.filter(
    (r) => r.studentExists && r.gradeExists && r.nameMatch
  ).length;

  return {
    valid: validCount > 0,
    message: `验证了 ${validationResults.length} 条映射，${validCount} 条有效`,
    details: validationResults,
    validationRate: Math.round((validCount / validationResults.length) * 100),
  };
}
