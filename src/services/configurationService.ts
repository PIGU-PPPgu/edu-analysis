/**
 * 导入配置服务
 * 管理学生信息和教学编排的配置，简化后续成绩导入
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  ImportConfiguration,
  CreateConfigurationParams,
  ConfigurationDetail,
  ConfigurationImportResult,
  StudentInfo,
  TeachingArrangement,
} from "@/types/valueAddedTypes";
import { saveStudentInfo, saveTeachingArrangement } from "./dataStorageService";

// ============================================
// 配置名称生成
// ============================================

/**
 * 从学生信息中提取年级列表
 */
function extractGradeLevels(studentInfo: StudentInfo[]): string[] {
  const gradeLevels = new Set<string>();

  studentInfo.forEach((student) => {
    // 从班级名称中提取年级，如 "高一1班" -> "高一"
    const match = student.class_name.match(/^(初[一二三]|高[一二三])/);
    if (match) {
      gradeLevels.add(match[1]);
    }
  });

  return Array.from(gradeLevels).sort();
}

/**
 * 从教学编排中提取学年学期（如果有）
 */
function extractAcademicInfo(teachingArrangement: TeachingArrangement[]): {
  academicYear?: string;
  semester?: string;
} {
  if (teachingArrangement.length === 0) {
    return {};
  }

  // 尝试从第一条记录中提取
  const first = teachingArrangement[0];
  return {
    academicYear: first.academic_year,
    semester: first.semester,
  };
}

/**
 * 生成推荐的配置名称
 */
export function generateRecommendedConfigName(params: {
  studentInfo: StudentInfo[];
  teachingArrangement: TeachingArrangement[];
}): string {
  const gradeLevels = extractGradeLevels(params.studentInfo);
  const { academicYear, semester } = extractAcademicInfo(
    params.teachingArrangement
  );

  const parts: string[] = [];

  // 年级部分
  if (gradeLevels.length > 0) {
    parts.push(gradeLevels.join("、"));
  }

  // 学年部分
  if (academicYear) {
    parts.push(`${academicYear}学年`);
  }

  // 学期部分
  if (semester) {
    parts.push(semester);
  }

  // 如果没有任何信息，使用默认名称
  if (parts.length === 0) {
    const now = new Date();
    parts.push(
      `配置_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}`
    );
  }

  return parts.join(" ");
}

// ============================================
// 配置CRUD操作
// ============================================

/**
 * 确保配置名称唯一（如果重复则自动添加序号）
 */
async function ensureUniqueName(baseName: string): Promise<string> {
  // 检查基础名称是否存在
  const { data: existing } = await supabase
    .from("import_configurations")
    .select("name")
    .eq("name", baseName)
    .maybeSingle(); // ✅ 使用 maybeSingle 允许不存在的情况

  if (!existing) {
    return baseName; // 名称不存在，直接使用
  }

  // 名称已存在，尝试添加序号
  let counter = 2;
  while (counter <= 100) {
    const newName = `${baseName} (${counter})`;
    const { data: duplicate } = await supabase
      .from("import_configurations")
      .select("name")
      .eq("name", newName)
      .maybeSingle(); // ✅ 使用 maybeSingle 允许不存在的情况

    if (!duplicate) {
      console.log(`配置名称重复，自动重命名为: ${newName}`);
      return newName;
    }

    counter++;
  }

  // 如果尝试100次还是重复，使用时间戳
  const timestamp = Date.now();
  return `${baseName} (${timestamp})`;
}

/**
 * 创建导入配置
 */
export async function createConfiguration(
  params: CreateConfigurationParams
): Promise<ConfigurationImportResult> {
  try {
    // 1. 提取基础信息
    const gradeLevels = extractGradeLevels(params.studentInfo);
    const { academicYear, semester } = extractAcademicInfo(
      params.teachingArrangement
    );

    // 2. 统计数据
    const classNames = new Set(params.studentInfo.map((s) => s.class_name));
    const teacherNames = new Set(
      params.teachingArrangement.map((t) => t.teacher_name)
    );
    const subjects = new Set(params.teachingArrangement.map((t) => t.subject));

    // 3. 确保配置名称唯一
    const uniqueName = await ensureUniqueName(params.name);

    // 4. 创建配置记录
    const { data: config, error: configError } = await supabase
      .from("import_configurations")
      .insert({
        name: uniqueName, // 使用确保唯一的名称
        description: params.description,
        academic_year: params.academic_year || academicYear,
        semester: params.semester || semester,
        grade_levels: gradeLevels,
        student_count: params.studentInfo.length,
        class_count: classNames.size,
        teacher_count: teacherNames.size,
        subject_count: subjects.size,
      })
      .select()
      .single();

    if (configError) {
      console.error("创建配置失败:", configError);
      throw new Error(`创建配置失败: ${configError.message}`);
    }

    const configId = config.id;

    // 5. 保存学生信息（带 config_id）
    const studentResult = await saveStudentInfo(params.studentInfo, configId);

    // 6. 保存教学编排（带 config_id）
    const teacherResult = await saveTeachingArrangement(
      params.teachingArrangement,
      params.studentInfo,
      params.academic_year || academicYear || "2024-2025",
      params.semester || semester || "第一学期",
      configId
    );

    return {
      success: true,
      config_id: configId,
      students_created: studentResult.count,
      teachers_created: teacherResult.createdTeachers || 0,
    };
  } catch (error) {
    console.error("创建配置异常:", error);
    return {
      success: false,
      config_id: "",
      students_created: 0,
      teachers_created: 0,
      errors: [error instanceof Error ? error.message : "未知错误"],
    };
  }
}

/**
 * 获取配置列表
 */
export async function listConfigurations(options?: {
  activeOnly?: boolean;
  orderBy?: "created_at" | "last_used_at" | "name";
  limit?: number;
}): Promise<ImportConfiguration[]> {
  try {
    let query = supabase.from("import_configurations").select("*");

    // 只显示活跃配置
    if (options?.activeOnly !== false) {
      query = query.eq("is_active", true);
    }

    // 排序
    const orderBy = options?.orderBy || "last_used_at";
    query = query.order(orderBy, {
      ascending: false,
      nullsFirst: orderBy === "last_used_at", // last_used_at 可能为 null
    });

    // 限制数量
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取配置列表失败:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("获取配置列表异常:", error);
    return [];
  }
}

/**
 * 获取配置详情
 */
export async function getConfiguration(
  id: string
): Promise<ConfigurationDetail | null> {
  try {
    // 1. 获取配置基本信息
    const { data: config, error: configError } = await supabase
      .from("import_configurations")
      .select("*")
      .eq("id", id)
      .single();

    if (configError) {
      console.error("获取配置失败:", configError);
      throw configError;
    }

    // 2. 获取关联的班级统计
    const { data: classes, error: classError } = await supabase
      .from("students")
      .select("class_name")
      .eq("config_id", id);

    if (classError) {
      console.error("获取班级列表失败:", classError);
    }

    const classStats = new Map<string, number>();
    classes?.forEach((s) => {
      classStats.set(s.class_name, (classStats.get(s.class_name) || 0) + 1);
    });

    // 3. 获取关联的教师和科目
    const { data: teacherSubjects, error: tsError } = await supabase
      .from("teacher_student_subjects")
      .select("teacher_id, teacher_name, subject")
      .eq("config_id", id);

    if (tsError) {
      console.error("获取教师科目失败:", tsError);
    }

    // 获取去重的教师ID列表
    const teacherIds = Array.from(
      new Set(teacherSubjects?.map((ts) => ts.teacher_id) || [])
    );

    // 从teachers表获取教师详细信息
    const { data: teachersInfo } = await supabase
      .from("teachers")
      .select("id, name, email, subject")
      .in("id", teacherIds);

    // 创建教师详细信息映射
    const teacherInfoMap = new Map(
      teachersInfo?.map((t) => [
        t.id,
        { email: t.email, mainSubject: t.subject },
      ]) || []
    );

    const teacherSubjectsMap = new Map<
      string,
      {
        teacher_id: string;
        subjects: Set<string>;
        email?: string | null;
        mainSubject?: string | null;
      }
    >();
    const allSubjects = new Set<string>();

    teacherSubjects?.forEach((ts) => {
      if (!teacherSubjectsMap.has(ts.teacher_name)) {
        const info = teacherInfoMap.get(ts.teacher_id);
        teacherSubjectsMap.set(ts.teacher_name, {
          teacher_id: ts.teacher_id,
          subjects: new Set(),
          email: info?.email,
          mainSubject: info?.mainSubject,
        });
      }
      teacherSubjectsMap.get(ts.teacher_name)!.subjects.add(ts.subject);
      allSubjects.add(ts.subject);
    });

    // 4. 组装详情
    const detail: ConfigurationDetail = {
      ...config,
      classes: Array.from(classStats.entries()).map(
        ([class_name, student_count]) => ({
          class_name,
          student_count,
        })
      ),
      teachers: Array.from(teacherSubjectsMap.entries()).map(
        ([teacher_name, info]) => ({
          teacher_name,
          subjects: Array.from(info.subjects),
          email: info.email || undefined,
          teacher_id: info.teacher_id,
        })
      ),
      subjects: Array.from(allSubjects),
    };

    return detail;
  } catch (error) {
    console.error("获取配置详情异常:", error);
    return null;
  }
}

/**
 * 更新配置
 */
export async function updateConfiguration(
  id: string,
  updates: Partial<
    Pick<ImportConfiguration, "name" | "description" | "is_active">
  >
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("import_configurations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("更新配置失败:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("更新配置异常:", error);
    return false;
  }
}

/**
 * 删除配置
 */
export async function deleteConfiguration(
  id: string,
  options?: { cascade?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    // 如果需要级联删除，先删除关联数据
    if (options?.cascade) {
      // 删除学生记录
      await supabase.from("students").delete().eq("config_id", id);

      // 删除教学编排记录
      await supabase
        .from("teacher_student_subjects")
        .delete()
        .eq("config_id", id);

      // 删除成绩记录
      await supabase.from("grade_data").delete().eq("config_id", id);
    } else {
      // 检查是否有关联数据
      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("config_id", id);

      if (studentCount && studentCount > 0) {
        return {
          success: false,
          error: `配置包含 ${studentCount} 条学生记录，请先删除关联数据或使用级联删除`,
        };
      }
    }

    // 删除配置记录
    const { error } = await supabase
      .from("import_configurations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("删除配置失败:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("删除配置异常:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 更新配置的最后使用时间
 */
export async function updateConfigLastUsed(id: string): Promise<void> {
  try {
    await supabase
      .from("import_configurations")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", id);
  } catch (error) {
    console.error("更新配置使用时间失败:", error);
  }
}

/**
 * 获取配置的数据导入状态
 */
export async function getConfigurationDataStatus(id: string): Promise<{
  studentInfo: boolean;
  teachingArrangement: boolean;
  electiveCourse: boolean;
  gradeScores: boolean;
}> {
  try {
    const [studentResult, teacherResult, gradeResult] = await Promise.all([
      // 检查学生信息
      supabase.from("students").select("id").eq("config_id", id).limit(1),

      // 检查教学编排
      supabase
        .from("teacher_student_subjects")
        .select("id")
        .eq("config_id", id)
        .limit(1),

      // 检查成绩数据
      supabase.from("grade_data").select("id").eq("config_id", id).limit(1),
    ]);

    return {
      studentInfo: (studentResult.data?.length || 0) > 0,
      teachingArrangement: (teacherResult.data?.length || 0) > 0,
      electiveCourse: false, // 暂不支持走班
      gradeScores: (gradeResult.data?.length || 0) > 0,
    };
  } catch (error) {
    console.error("获取配置数据状态失败:", error);
    return {
      studentInfo: false,
      teachingArrangement: false,
      electiveCourse: false,
      gradeScores: false,
    };
  }
}

// ============================================
// Phase 2: 高级功能
// ============================================

/**
 * 复制配置（深拷贝）
 */
export async function copyConfiguration(
  id: string,
  newName?: string
): Promise<ConfigurationImportResult> {
  try {
    // 1. 获取原配置
    const { data: originalConfig, error: configError } = await supabase
      .from("import_configurations")
      .select("*")
      .eq("id", id)
      .single();

    if (configError || !originalConfig) {
      throw new Error("原配置不存在");
    }

    // 2. 生成新配置名称
    const baseName = newName || `${originalConfig.name} 副本`;
    const uniqueName = await ensureUniqueName(baseName);

    // 3. 创建新配置记录
    const { data: newConfig, error: newConfigError } = await supabase
      .from("import_configurations")
      .insert({
        name: uniqueName,
        description: originalConfig.description,
        academic_year: originalConfig.academic_year,
        semester: originalConfig.semester,
        grade_levels: originalConfig.grade_levels,
        student_count: originalConfig.student_count,
        class_count: originalConfig.class_count,
        teacher_count: originalConfig.teacher_count,
        subject_count: originalConfig.subject_count,
        is_active: false, // 新配置默认未激活
      })
      .select()
      .single();

    if (newConfigError || !newConfig) {
      throw new Error(`创建配置失败: ${newConfigError?.message}`);
    }

    const newConfigId = newConfig.id;

    // 4. 复制学生数据
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("config_id", id);

    if (studentsError) {
      throw new Error(`获取学生数据失败: ${studentsError.message}`);
    }

    let copiedStudentsCount = 0;
    if (students && students.length > 0) {
      const newStudents = students.map((student) => ({
        student_id: student.student_id,
        name: student.name,
        class_id: student.class_id,
        class_name: student.class_name,
        gender: student.gender,
        contact_phone: student.contact_phone,
        contact_email: student.contact_email,
        admission_year: student.admission_year,
        config_id: newConfigId,
      }));

      const { error: insertStudentsError, count } = await supabase
        .from("students")
        .insert(newStudents)
        .select("id", { count: "exact" });

      if (insertStudentsError) {
        throw new Error(`复制学生数据失败: ${insertStudentsError.message}`);
      }
      copiedStudentsCount = count || 0;
    }

    // 5. 复制教学编排数据
    const { data: teacherSubjects, error: tsError } = await supabase
      .from("teacher_student_subjects")
      .select("*")
      .eq("config_id", id);

    if (tsError) {
      throw new Error(`获取教学编排失败: ${tsError.message}`);
    }

    let copiedTeachersCount = 0;
    if (teacherSubjects && teacherSubjects.length > 0) {
      const newTeacherSubjects = teacherSubjects.map((ts) => ({
        teacher_id: ts.teacher_id,
        teacher_name: ts.teacher_name,
        student_id: ts.student_id,
        student_name: ts.student_name,
        subject: ts.subject,
        class_name: ts.class_name,
        class_type: ts.class_type,
        academic_year: ts.academic_year,
        semester: ts.semester,
        is_elective: ts.is_elective,
        config_id: newConfigId,
      }));

      const { error: insertTsError } = await supabase
        .from("teacher_student_subjects")
        .insert(newTeacherSubjects);

      if (insertTsError) {
        throw new Error(`复制教学编排失败: ${insertTsError.message}`);
      }

      // 统计去重的教师数量
      const uniqueTeachers = new Set(
        teacherSubjects.map((ts) => ts.teacher_id)
      );
      copiedTeachersCount = uniqueTeachers.size;
    }

    return {
      success: true,
      config_id: newConfigId,
      students_created: copiedStudentsCount,
      teachers_created: copiedTeachersCount,
    };
  } catch (error) {
    console.error("复制配置失败:", error);
    return {
      success: false,
      config_id: "",
      students_created: 0,
      teachers_created: 0,
      errors: [error instanceof Error ? error.message : "未知错误"],
    };
  }
}

/**
 * 批量更新配置
 */
export async function batchUpdateConfigurations(
  ids: string[],
  updates: Partial<Pick<ImportConfiguration, "is_active">>
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const id of ids) {
    const { error } = await supabase
      .from("import_configurations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      results.failed++;
      results.errors.push(`配置 ${id} 更新失败: ${error.message}`);
    } else {
      results.success++;
    }
  }

  return results;
}

/**
 * 批量删除配置
 */
export async function batchDeleteConfigurations(
  ids: string[],
  cascade: boolean = true
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const id of ids) {
    const result = await deleteConfiguration(id, { cascade });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(result.error || `删除配置 ${id} 失败`);
    }
  }

  return results;
}

/**
 * 导出配置为JSON
 */
export async function exportConfiguration(id: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // 1. 获取配置基本信息
    const { data: config, error: configError } = await supabase
      .from("import_configurations")
      .select("*")
      .eq("id", id)
      .single();

    if (configError || !config) {
      return { success: false, error: "配置不存在" };
    }

    // 2. 获取学生数据
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .eq("config_id", id);

    if (studentsError) {
      return {
        success: false,
        error: `获取学生数据失败: ${studentsError.message}`,
      };
    }

    // 3. 获取教学编排数据
    const { data: teacherSubjects, error: tsError } = await supabase
      .from("teacher_student_subjects")
      .select("*")
      .eq("config_id", id);

    if (tsError) {
      return {
        success: false,
        error: `获取教学编排失败: ${tsError.message}`,
      };
    }

    // 4. 组装导出数据
    const exportData = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      configuration: config,
      students: students || [],
      teacher_student_subjects: teacherSubjects || [],
      metadata: {
        student_count: students?.length || 0,
        teacher_count: new Set(
          teacherSubjects?.map((ts) => ts.teacher_id) || []
        ).size,
        class_count: new Set(students?.map((s) => s.class_name) || []).size,
      },
    };

    return { success: true, data: exportData };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "导出失败",
    };
  }
}

/**
 * 批量导出配置
 */
export async function exportConfigurations(ids: string[]): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const exports = await Promise.all(ids.map((id) => exportConfiguration(id)));

    const failedExports = exports.filter((e) => !e.success);
    if (failedExports.length > 0) {
      return {
        success: false,
        error: `${failedExports.length} 个配置导出失败`,
      };
    }

    return {
      success: true,
      data: exports.map((e) => e.data),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "批量导出失败",
    };
  }
}

/**
 * 导入配置
 */
export async function importConfiguration(
  data: any,
  mode: "overwrite" | "rename" = "rename"
): Promise<ConfigurationImportResult> {
  try {
    // 1. 验证数据格式
    if (!data.version || !data.configuration) {
      throw new Error("无效的配置文件格式");
    }

    const originalConfig = data.configuration;
    let configName = originalConfig.name;

    // 2. 处理重名冲突
    if (mode === "rename") {
      configName = await ensureUniqueName(configName);
    } else {
      // overwrite模式：删除同名配置
      const { data: existing } = await supabase
        .from("import_configurations")
        .select("id")
        .eq("name", configName)
        .maybeSingle();

      if (existing) {
        await deleteConfiguration(existing.id, { cascade: true });
      }
    }

    // 3. 创建新配置
    const { data: newConfig, error: configError } = await supabase
      .from("import_configurations")
      .insert({
        name: configName,
        description: originalConfig.description,
        academic_year: originalConfig.academic_year,
        semester: originalConfig.semester,
        grade_levels: originalConfig.grade_levels,
        student_count: data.metadata.student_count,
        class_count: data.metadata.class_count,
        teacher_count: data.metadata.teacher_count,
        subject_count: originalConfig.subject_count,
        is_active: false,
      })
      .select()
      .single();

    if (configError || !newConfig) {
      throw new Error(`创建配置失败: ${configError?.message}`);
    }

    const newConfigId = newConfig.id;

    // 4. 导入学生数据
    let studentsCount = 0;
    if (data.students && data.students.length > 0) {
      const newStudents = data.students.map((student: any) => ({
        ...student,
        config_id: newConfigId,
        id: undefined, // 移除原ID，让数据库生成新ID
        created_at: undefined,
        updated_at: undefined,
      }));

      const { error: studentsError, count } = await supabase
        .from("students")
        .insert(newStudents)
        .select("id", { count: "exact" });

      if (studentsError) {
        throw new Error(`导入学生数据失败: ${studentsError.message}`);
      }
      studentsCount = count || 0;
    }

    // 5. 导入教学编排数据
    let teachersCount = 0;
    if (
      data.teacher_student_subjects &&
      data.teacher_student_subjects.length > 0
    ) {
      const newTeacherSubjects = data.teacher_student_subjects.map(
        (ts: any) => ({
          ...ts,
          config_id: newConfigId,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
        })
      );

      const { error: tsError } = await supabase
        .from("teacher_student_subjects")
        .insert(newTeacherSubjects);

      if (tsError) {
        throw new Error(`导入教学编排失败: ${tsError.message}`);
      }

      teachersCount = new Set(
        data.teacher_student_subjects.map((ts: any) => ts.teacher_id)
      ).size;
    }

    return {
      success: true,
      config_id: newConfigId,
      students_created: studentsCount,
      teachers_created: teachersCount,
    };
  } catch (error) {
    console.error("导入配置失败:", error);
    return {
      success: false,
      config_id: "",
      students_created: 0,
      teachers_created: 0,
      errors: [error instanceof Error ? error.message : "未知错误"],
    };
  }
}

/**
 * 获取配置使用统计
 */
export async function getConfigurationUsageStats(id: string): Promise<{
  usage_count: number;
  last_usage_date?: string;
  exams_count: number;
}> {
  try {
    const { data, error } = await supabase
      .from("grade_data")
      .select("exam_id, created_at")
      .eq("config_id", id);

    if (error) {
      console.error("获取使用统计失败:", error);
      return { usage_count: 0, exams_count: 0 };
    }

    if (!data || data.length === 0) {
      return { usage_count: 0, exams_count: 0 };
    }

    // 统计不同考试数量
    const uniqueExams = new Set(data.map((d) => d.exam_id));

    // 获取最后使用时间
    const dates = data.map((d) => new Date(d.created_at).getTime());
    const lastUsageDate = new Date(Math.max(...dates)).toISOString();

    return {
      usage_count: data.length,
      last_usage_date: lastUsageDate,
      exams_count: uniqueExams.size,
    };
  } catch (error) {
    console.error("获取使用统计异常:", error);
    return { usage_count: 0, exams_count: 0 };
  }
}
