/**
 * 数据存储服务
 * 将导入的数据保存到Supabase数据库
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  StudentInfo,
  TeachingArrangement,
  ElectiveCourse,
  GradeScores,
} from "@/types/valueAddedTypes";

/**
 * 保存学生信息
 * @param configId 可选的配置ID，用于数据隔离
 */
export async function saveStudentInfo(
  students: StudentInfo[],
  configId?: string
) {
  try {
    // 准备插入数据 - 修复字段映射
    const insertData = students.map((student) => ({
      student_id: student.student_id,
      name: student.student_name, // ✅ 映射 student_name -> name
      class_name: student.class_name, // ✅ 添加班级字段！
      gender: student.gender || null,
      admission_year: student.enrollment_year || null, // ✅ 映射 enrollment_year -> admission_year
      contact_phone: null,
      contact_email: null,
      config_id: configId || null, // ✅ 添加配置ID
    }));

    // 使用upsert避免重复
    const { data, error } = await supabase
      .from("students")
      .upsert(insertData, {
        onConflict: "student_id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("保存学生信息失败:", error);
      throw new Error(`保存学生信息失败: ${error.message}`);
    }

    return {
      success: true,
      count: data?.length || 0,
      data,
    };
  } catch (error) {
    console.error("保存学生信息异常:", error);
    throw error;
  }
}

/**
 * 保存教学编排
 * 注意: teacher_student_subjects 是三方关联表,需要按学生展开
 * @param configId 可选的配置ID，用于数据隔离
 */
export async function saveTeachingArrangement(
  arrangements: TeachingArrangement[],
  studentInfo: StudentInfo[],
  academicYear: string = "2024-2025",
  semester: string = "第一学期",
  configId?: string
) {
  try {
    // 🔍 添加诊断日志
    console.log(
      `[教学编排] 开始保存，共 ${arrangements.length} 条教学编排记录`
    );
    console.log(`[教学编排] 学生信息：${studentInfo.length} 人`);

    if (arrangements.length === 0) {
      console.warn("⚠️ [教学编排] arrangements为空数组，无数据可保存");
      return {
        success: true,
        count: 0,
        message: "教学编排数据为空，请检查Excel文件是否正确上传",
        skippedRecords: [],
        createdTeachers: 0,
      };
    }

    if (studentInfo.length === 0) {
      console.warn("⚠️ [教学编排] studentInfo为空，无法展开教学关联");
      return {
        success: true,
        count: 0,
        message: "学生信息为空，无法保存教学编排",
        skippedRecords: [],
        createdTeachers: 0,
      };
    }

    // 打印前3条样本数据
    console.log("[教学编排] 样本数据:", arrangements.slice(0, 3));

    // 构建 class_name -> students 映射
    const classStudentsMap = new Map<string, StudentInfo[]>();
    studentInfo.forEach((student) => {
      const students = classStudentsMap.get(student.class_name) || [];
      students.push(student);
      classStudentsMap.set(student.class_name, students);
    });

    console.log(`[教学编排] 班级映射：${classStudentsMap.size} 个班级`);

    // 🔍 通过教师姓名查询或创建教师
    const teacherNameToIdMap = new Map<string, string>();
    const uniqueTeacherNames = [
      ...new Set(arrangements.map((a) => a.teacher_name)),
    ];
    let createdTeachers = 0;

    for (const teacherName of uniqueTeacherNames) {
      if (!teacherName || teacherName.trim() === "") continue;

      // 1. 先查询教师是否存在
      const { data: existingTeacher } = await supabase
        .from("teachers")
        .select("id, name")
        .eq("name", teacherName)
        .limit(1)
        .single();

      if (existingTeacher) {
        // ✅ 教师已存在，使用现有UUID
        teacherNameToIdMap.set(teacherName, existingTeacher.id);
        console.log(`✅ 找到现有教师: ${teacherName} → ${existingTeacher.id}`);
      } else {
        // 🆕 教师不存在，自动创建
        const { data: newTeacher, error: createError } = await supabase
          .from("teachers")
          .insert({
            name: teacherName,
            email: null, // 邮箱可选
            subject: null, // 科目可选
          })
          .select("id, name")
          .single();

        if (createError) {
          console.error(`❌ 创建教师"${teacherName}"失败:`, createError);
          continue; // 创建失败则跳过
        }

        if (newTeacher) {
          teacherNameToIdMap.set(teacherName, newTeacher.id);
          createdTeachers++;
          console.log(`🆕 自动创建教师: ${teacherName} → ${newTeacher.id}`);
        }
      }
    }

    if (createdTeachers > 0) {
      console.log(`[教学编排] 自动创建了 ${createdTeachers} 个教师账号`);
    }

    // 展开为 teacher-student-subject 记录
    const insertData: any[] = [];
    const skippedRecords: string[] = [];

    for (const arr of arrangements) {
      // 🔍 获取教师UUID
      const teacherId = teacherNameToIdMap.get(arr.teacher_name);

      if (!teacherId) {
        skippedRecords.push(`跳过：教师"${arr.teacher_name}"无法获取UUID`);
        continue;
      }

      const classStudents = classStudentsMap.get(arr.class_name) || [];

      for (const student of classStudents) {
        insertData.push({
          teacher_id: teacherId, // ✅ 使用UUID（查询到的或新创建的）
          teacher_name: arr.teacher_name,
          student_id: student.student_id,
          student_name: student.student_name,
          subject: arr.subject,
          class_name: arr.class_name,
          class_type: arr.class_type || "administrative",
          academic_year: arr.academic_year || academicYear,
          semester: arr.semester || semester,
          is_elective: arr.is_elective || false,
          config_id: configId || null, // ✅ 添加配置ID
        });
      }
    }

    if (insertData.length === 0) {
      console.warn("⚠️ [教学编排] 展开后的数据为空！");
      console.warn("   可能原因：班级名称不匹配，或教师UUID获取失败");
      console.warn("   跳过的记录：", skippedRecords);
      return {
        success: true,
        count: 0,
        message: "没有需要保存的教学编排数据（展开后为空）",
        skippedRecords,
        createdTeachers,
      };
    }

    console.log(
      `[教学编排] 准备插入 ${insertData.length} 条记录到teacher_student_subjects表`
    );

    // 使用upsert - 修复冲突键
    const { data, error } = await supabase
      .from("teacher_student_subjects")
      .upsert(insertData, {
        onConflict: "student_id,subject,academic_year,semester",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("❌ [教学编排] 保存失败:", error);
      console.error("   错误详情:", error.message);
      console.error("   尝试插入的数据量:", insertData.length);
      throw new Error(`保存教学编排失败: ${error.message}`);
    }

    console.log(`✅ [教学编排] 成功保存 ${data?.length || 0} 条记录`);

    if (skippedRecords.length > 0) {
      console.warn("⚠️ [教学编排] 跳过的记录:", skippedRecords);
    }

    return {
      success: true,
      count: data?.length || 0,
      data,
      skippedRecords,
      createdTeachers,
    };
  } catch (error) {
    console.error("保存教学编排异常:", error);
    throw error;
  }
}

/**
 * 保存选课信息
 */
export async function saveElectiveCourses(courses: ElectiveCourse[]) {
  try {
    // 这里可以保存到一个专门的选课表
    // 暂时跳过,因为数据库schema中没有专门的选课表
    // 可以考虑将选课信息合并到teacher_student_subjects表

    return {
      success: true,
      count: courses.length,
      message: "选课信息处理完成",
    };
  } catch (error) {
    console.error("保存选课信息异常:", error);
    throw error;
  }
}

/**
 * 保存成绩数据
 * @param configId 可选的配置ID，用于数据隔离和关联学生信息
 */
export async function saveGradeScores(
  scores: GradeScores[],
  examInfo: {
    exam_id: string;
    exam_title: string;
    exam_type: string;
    exam_date: string;
  },
  configId?: string
) {
  try {
    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      );

    if (!isUuid(examInfo.exam_id)) {
      throw new Error(
        `exam_id 必须是 exams.id(UUID)，当前值: ${examInfo.exam_id}`
      );
    }

    // ✅ 如果有 configId，从配置中加载学生信息（包含班级）
    let studentInfoMap: Map<string, { name: string; class_name: string }> =
      new Map();

    if (configId) {
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select("student_id, name, class_name")
        .eq("config_id", configId);

      if (studentError) {
        console.error("获取学生信息失败:", studentError);
      } else if (students) {
        students.forEach((s) => {
          studentInfoMap.set(s.student_id, {
            name: s.name,
            class_name: s.class_name,
          });
        });
        console.log(`✅ 已加载 ${students.length} 个学生的信息（包含班级）`);
      }
    }

    // 准备插入数据 - 从配置中获取班级信息
    const insertData = scores.map((score) => {
      const studentInfo = studentInfoMap.get(score.student_id);

      return {
        student_id: score.student_id,
        name: studentInfo?.name || score.student_name, // ✅ 优先使用配置中的姓名
        exam_id: examInfo.exam_id,
        exam_title: examInfo.exam_title,
        exam_type: examInfo.exam_type,
        exam_date: examInfo.exam_date,
        class_name: studentInfo?.class_name || score.class_name || null, // ✅ 从配置中获取班级

        // 总分信息 - 保留 0 分
        total_score: score.total_score ?? null,

        // ✅ 各科成绩 - 缺考标记的科目设为null（防御性过滤）
        chinese_score: (score as any).chinese_absent
          ? null
          : (score.chinese_score ?? score.scores?.["语文"] ?? null),
        math_score: (score as any).math_absent
          ? null
          : (score.math_score ?? score.scores?.["数学"] ?? null),
        english_score: (score as any).english_absent
          ? null
          : (score.english_score ?? score.scores?.["英语"] ?? null),
        physics_score: (score as any).physics_absent
          ? null
          : (score.physics_score ?? score.scores?.["物理"] ?? null),
        chemistry_score: (score as any).chemistry_absent
          ? null
          : (score.chemistry_score ?? score.scores?.["化学"] ?? null),
        biology_score: (score as any).biology_absent
          ? null
          : (score.biology_score ?? score.scores?.["生物"] ?? null),
        politics_score: (score as any).politics_absent
          ? null
          : (score.politics_score ?? score.scores?.["政治"] ?? null),
        history_score: (score as any).history_absent
          ? null
          : (score.history_score ?? score.scores?.["历史"] ?? null),
        geography_score: (score as any).geography_absent
          ? null
          : (score.geography_score ?? score.scores?.["地理"] ?? null),

        // ✅ 保存缺考标记字段
        chinese_absent: (score as any).chinese_absent || false,
        math_absent: (score as any).math_absent || false,
        english_absent: (score as any).english_absent || false,
        physics_absent: (score as any).physics_absent || false,
        chemistry_absent: (score as any).chemistry_absent || false,
        biology_absent: (score as any).biology_absent || false,
        politics_absent: (score as any).politics_absent || false,
        history_absent: (score as any).history_absent || false,
        geography_absent: (score as any).geography_absent || false,

        config_id: configId || null,
      };
    });

    // 防御性剔除 id（避免显式id导致主键冲突）
    insertData.forEach((row) => {
      delete (row as { id?: unknown }).id;
    });

    // ✅ 使用 upsert 并指定 (exam_id, student_id) 唯一约束
    // 注意：数据库中已修复了重复主键问题，现在应该可以正常工作
    const { data, error } = await supabase
      .from("grade_data")
      .upsert(insertData, {
        onConflict: "exam_id,student_id",
      })
      .select();

    if (error) {
      console.error("保存成绩数据失败:", error);
      throw new Error(`保存成绩数据失败: ${error.message}`);
    }

    return {
      success: true,
      count: data?.length || 0,
      data,
    };
  } catch (error) {
    console.error("保存成绩数据异常:", error);
    throw error;
  }
}

/**
 * 创建考试记录
 */
export async function createExamRecord(examInfo: {
  business_id: string; // ✅ 重命名：exam_id -> business_id
  exam_title: string;
  exam_type: string;
  exam_date: string;
  grade_level: string;
  academic_year: string;
  semester: string;
  original_filename?: string; // ✅ 新增：原始文件名
}) {
  try {
    const selectFields =
      "id, business_id, title, type, date, grade_level, academic_year, semester, original_filename"; // ✅ 包含文件名

    // 1. 先检查是否已存在（基于唯一约束：title + date + type）
    const { data: existingByConstraint } = await supabase
      .from("exams")
      .select(selectFields)
      .eq("title", examInfo.exam_title)
      .eq("date", examInfo.exam_date)
      .eq("type", examInfo.exam_type)
      .maybeSingle();

    if (existingByConstraint) {
      console.log(
        "考试记录已存在（基于 title+date+type）:",
        existingByConstraint
      );
      return {
        success: true,
        isExisting: true,
        data: existingByConstraint,
      };
    }

    // 2. 创建新考试记录
    const { data, error } = await supabase
      .from("exams")
      .insert({
        business_id: examInfo.business_id, // ✅ 更新字段名
        title: examInfo.exam_title,
        type: examInfo.exam_type,
        date: examInfo.exam_date,
        grade_level: examInfo.grade_level,
        academic_year: examInfo.academic_year,
        semester: examInfo.semester,
        original_filename: examInfo.original_filename, // ✅ 保存文件名
      })
      .select(selectFields)
      .single();

    if (error) {
      // 并发插入时可能触发唯一约束，回读已有记录
      if (error.code === "23505") {
        const { data: conflictData } = await supabase
          .from("exams")
          .select(selectFields)
          .eq("title", examInfo.exam_title)
          .eq("date", examInfo.exam_date)
          .eq("type", examInfo.exam_type)
          .maybeSingle();

        if (conflictData) {
          return {
            success: true,
            isExisting: true,
            data: conflictData,
          };
        }
      }

      console.error("创建考试记录失败:", error);
      throw new Error(`创建考试记录失败: ${error.message}`);
    }

    console.log("考试记录创建成功:", data);
    return {
      success: true,
      isExisting: false,
      data,
    };
  } catch (error) {
    console.error("创建考试记录异常:", error);
    throw error;
  }
}

/**
 * 批量导入所有数据
 */
export async function importAllData(params: {
  studentInfo: StudentInfo[];
  teachingArrangement: TeachingArrangement[];
  electiveCourse?: ElectiveCourse[];
  entryGrades: GradeScores[];
  exitGrades: GradeScores[];
  entryExamInfo: {
    exam_id: string;
    exam_title: string;
    exam_type: string;
    exam_date: string;
    grade_level: string;
    academic_year: string;
    semester: string;
  };
  exitExamInfo: {
    exam_id: string;
    exam_title: string;
    exam_type: string;
    exam_date: string;
    grade_level: string;
    academic_year: string;
    semester: string;
  };
  onProgress?: (step: string, progress: number, message: string) => void;
}) {
  const results = {
    students: 0,
    teachers: 0,
    entryScores: 0,
    exitScores: 0,
    errors: [] as string[],
  };

  try {
    // 1. 保存学生信息
    params.onProgress?.("students", 10, "保存学生信息...");
    const studentResult = await saveStudentInfo(params.studentInfo);
    results.students = studentResult.count;

    // 2. 保存教学编排 (修复: 传入学生信息和学年学期)
    params.onProgress?.("teachers", 30, "保存教学编排...");
    const teacherResult = await saveTeachingArrangement(
      params.teachingArrangement,
      params.studentInfo, // ✅ 传入学生信息用于展开
      params.entryExamInfo.academic_year, // ✅ 传入学年
      params.entryExamInfo.semester // ✅ 传入学期
    );
    results.teachers = teacherResult.count;

    // 3. 保存选课信息(如果有)
    if (params.electiveCourse && params.electiveCourse.length > 0) {
      params.onProgress?.("elective", 40, "保存选课信息...");
      await saveElectiveCourses(params.electiveCourse);
    }

    // 4. 创建入口考试记录
    params.onProgress?.("entry_exam", 50, "创建入口考试记录...");
    await createExamRecord(params.entryExamInfo);

    // 5. 保存入口成绩
    params.onProgress?.("entry_scores", 60, "保存入口考试成绩...");
    const entryResult = await saveGradeScores(
      params.entryGrades,
      params.entryExamInfo
    );
    results.entryScores = entryResult.count;

    // 6. 创建出口考试记录
    params.onProgress?.("exit_exam", 80, "创建出口考试记录...");
    await createExamRecord(params.exitExamInfo);

    // 7. 保存出口成绩
    params.onProgress?.("exit_scores", 90, "保存出口考试成绩...");
    const exitResult = await saveGradeScores(
      params.exitGrades,
      params.exitExamInfo
    );
    results.exitScores = exitResult.count;

    params.onProgress?.("complete", 100, "数据导入完成!");

    return {
      success: true,
      results,
      message: "数据导入成功",
    };
  } catch (error) {
    console.error("批量导入数据失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    results.errors.push(errorMessage);

    return {
      success: false,
      results,
      error: errorMessage,
      message: "数据导入失败",
    };
  }
}

/**
 * 检查数据完整性
 */
export async function checkDataIntegrity(params: {
  studentIds: string[];
  entryExamId: string;
  exitExamId: string;
}) {
  try {
    // 检查学生记录
    const { count: studentCount, error: studentError } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .in("student_id", params.studentIds);

    if (studentError) throw studentError;

    // 检查入口成绩
    const { count: entryCount, error: entryError } = await supabase
      .from("grade_data")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", params.entryExamId)
      .in("student_id", params.studentIds);

    if (entryError) throw entryError;

    // 检查出口成绩
    const { count: exitCount, error: exitError } = await supabase
      .from("grade_data")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", params.exitExamId)
      .in("student_id", params.studentIds);

    if (exitError) throw exitError;

    return {
      success: true,
      totalStudents: params.studentIds.length,
      savedStudents: studentCount || 0,
      entryScores: entryCount || 0,
      exitScores: exitCount || 0,
      isComplete:
        studentCount === params.studentIds.length &&
        entryCount === params.studentIds.length &&
        exitCount === params.studentIds.length,
    };
  } catch (error) {
    console.error("检查数据完整性失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
