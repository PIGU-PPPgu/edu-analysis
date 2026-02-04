/**
 * 数据转换和存储服务
 * 将Excel导入的数据转换为数据库格式并存储
 */

import { supabase } from "@/lib/supabase";
import type {
  StudentInfo,
  TeachingArrangement,
  ElectiveCourse,
  GradeScores,
  TeacherStudentSubject,
} from "@/types/valueAddedTypes";

// ============================================
// 数据转换
// ============================================

/**
 * 构建教师-学生-科目关联关系
 */
export async function buildTeacherStudentSubjectRelations(
  studentInfo: StudentInfo[],
  teachingArrangement: TeachingArrangement[],
  electiveCourses: ElectiveCourse[] = [],
  academicYear: string,
  semester: string
): Promise<TeacherStudentSubject[]> {
  const relations: TeacherStudentSubject[] = [];

  // 建立班级-教师-科目映射
  const classTeacherMap = new Map<string, Map<string, TeachingArrangement>>();

  teachingArrangement.forEach((ta) => {
    if (!classTeacherMap.has(ta.class_name)) {
      classTeacherMap.set(ta.class_name, new Map());
    }
    classTeacherMap.get(ta.class_name)!.set(ta.subject, ta);
  });

  // 为每个学生建立关联关系
  for (const student of studentInfo) {
    const classTeachers = classTeacherMap.get(student.class_name);

    if (!classTeachers) {
      console.warn(`班级 ${student.class_name} 没有找到教学编排信息`);
      continue;
    }

    // 处理行政班的科目
    for (const [subject, ta] of classTeachers.entries()) {
      if (!ta.is_elective) {
        // 查询或创建教师记录
        const teacherId = await ensureTeacherExists(
          ta.teacher_name,
          ta.teacher_id
        );

        relations.push({
          id: "", // 数据库自动生成
          teacher_id: teacherId,
          teacher_name: ta.teacher_name,
          student_id: student.student_id,
          student_name: student.student_name,
          subject: subject,
          class_name: student.class_name,
          class_type: "administrative",
          academic_year: academicYear,
          semester: semester,
          is_elective: false,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  // 处理走班选课
  if (electiveCourses.length > 0) {
    for (const elective of electiveCourses) {
      // 找到该选课班级的教师
      const classTeachers = classTeacherMap.get(elective.class_name);
      const ta = classTeachers?.get(elective.subject);

      if (!ta) {
        console.warn(
          `走班班级 ${elective.class_name} 的 ${elective.subject} 没有找到教师信息`
        );
        continue;
      }

      const teacherId = await ensureTeacherExists(
        ta.teacher_name,
        ta.teacher_id
      );

      relations.push({
        id: "",
        teacher_id: teacherId,
        teacher_name: ta.teacher_name,
        student_id: elective.student_id,
        student_name: elective.student_name,
        subject: elective.subject,
        class_name: elective.class_name,
        class_type: "teaching",
        academic_year: academicYear,
        semester: semester,
        is_elective: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  return relations;
}

/**
 * 确保教师记录存在，如果不存在则创建
 */
async function ensureTeacherExists(
  teacherName: string,
  teacherId?: string
): Promise<string> {
  // 先尝试通过姓名查找
  const { data: existingTeacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("name", teacherName)
    .maybeSingle();

  if (existingTeacher) {
    return existingTeacher.id;
  }

  // 如果不存在，创建新教师记录
  const { data: newTeacher, error } = await supabase
    .from("teachers")
    .insert({
      name: teacherName,
      email: teacherId ? `${teacherId}@school.edu` : undefined,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`创建教师记录失败: ${error.message}`);
  }

  return newTeacher.id;
}

// ============================================
// 数据存储
// ============================================

/**
 * 保存学生信息到数据库
 */
export async function saveStudentInfo(students: StudentInfo[]): Promise<void> {
  // 构建upsert数据
  const records = students.map((s) => ({
    student_id: s.student_id,
    name: s.student_name,
    class_name: s.class_name,
    // 其他字段根据需要添加
  }));

  const { error } = await supabase.from("students").upsert(records, {
    onConflict: "student_id",
    ignoreDuplicates: false,
  });

  if (error) {
    throw new Error(`保存学生信息失败: ${error.message}`);
  }
}

/**
 * 保存教师-学生-科目关联关系
 */
export async function saveTeacherStudentSubjects(
  relations: TeacherStudentSubject[]
): Promise<void> {
  // 删除旧的关联关系（同一学年学期）
  if (relations.length > 0) {
    const { academic_year, semester } = relations[0];

    await supabase
      .from("teacher_student_subjects")
      .delete()
      .eq("academic_year", academic_year)
      .eq("semester", semester);
  }

  // 批量插入新关联关系（分批处理，每批1000条）
  const batchSize = 1000;
  for (let i = 0; i < relations.length; i += batchSize) {
    const batch = relations.slice(i, i + batchSize);

    const { error } = await supabase.from("teacher_student_subjects").insert(
      batch.map((r) => ({
        teacher_id: r.teacher_id,
        teacher_name: r.teacher_name,
        student_id: r.student_id,
        student_name: r.student_name,
        subject: r.subject,
        class_name: r.class_name,
        class_type: r.class_type,
        academic_year: r.academic_year,
        semester: r.semester,
        is_elective: r.is_elective,
      }))
    );

    if (error) {
      throw new Error(
        `保存关联关系失败(批次${i / batchSize + 1}): ${error.message}`
      );
    }
  }
}

/**
 * 保存成绩数据到grade_data表
 */
export async function saveGradeData(
  gradeScores: GradeScores[],
  examId: string,
  examTitle: string,
  examType: string,
  examDate: Date
): Promise<void> {
  const records = gradeScores.map((gs) => {
    const record: any = {
      exam_id: examId,
      student_id: gs.student_id,
      name: gs.student_name,
      exam_title: examTitle,
      exam_type: examType,
      exam_date: examDate,
    };

    // 提取各科目成绩
    const subjectMapping: Record<string, string> = {
      语文: "chinese",
      数学: "math",
      英语: "english",
      物理: "physics",
      化学: "chemistry",
      政治: "politics",
      历史: "history",
      生物: "biology",
      地理: "geography",
    };

    Object.entries(gs.scores).forEach(([subject, score]) => {
      const fieldName = subjectMapping[subject] || subject.toLowerCase();

      if (typeof score === "number") {
        record[`${fieldName}_score`] = score;
      } else {
        // Q/N等特殊标记，存为null或特殊标识
        record[`${fieldName}_score`] = null;
      }
    });

    return record;
  });

  // 批量插入
  const batchSize = 1000;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const { error } = await supabase.from("grade_data").upsert(batch, {
      onConflict: "exam_id,student_id",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(
        `保存成绩数据失败(批次${i / batchSize + 1}): ${error.message}`
      );
    }
  }
}

// ============================================
// 完整导入流程
// ============================================

export interface ImportParams {
  studentInfo: StudentInfo[];
  teachingArrangement: TeachingArrangement[];
  electiveCourses?: ElectiveCourse[];
  entryGrades: GradeScores[];
  exitGrades: GradeScores[];
  academicYear: string;
  semester: string;
  entryExamId: string;
  entryExamTitle: string;
  entryExamDate: Date;
  exitExamId: string;
  exitExamTitle: string;
  exitExamDate: Date;
}

export interface ImportResult {
  success: boolean;
  message?: string;
  error?: string;
  stats?: {
    studentsImported: number;
    relationsCreated: number;
    entryGradesImported: number;
    exitGradesImported: number;
  };
}

/**
 * 执行完整的数据导入流程
 */
export async function executeFullImport(
  params: ImportParams
): Promise<ImportResult> {
  try {
    console.log("开始导入数据...");

    // 1. 保存学生信息
    console.log("保存学生信息...");
    await saveStudentInfo(params.studentInfo);

    // 2. 构建并保存教师-学生-科目关联
    console.log("构建教师-学生-科目关联...");
    const relations = await buildTeacherStudentSubjectRelations(
      params.studentInfo,
      params.teachingArrangement,
      params.electiveCourses,
      params.academicYear,
      params.semester
    );

    console.log("保存关联关系...");
    await saveTeacherStudentSubjects(relations);

    // 3. 保存入口考试成绩
    console.log("保存入口考试成绩...");
    await saveGradeData(
      params.entryGrades,
      params.entryExamId,
      params.entryExamTitle,
      "入口考试",
      params.entryExamDate
    );

    // 4. 保存出口考试成绩
    console.log("保存出口考试成绩...");
    await saveGradeData(
      params.exitGrades,
      params.exitExamId,
      params.exitExamTitle,
      "出口考试",
      params.exitExamDate
    );

    console.log("数据导入完成！");

    return {
      success: true,
      message: "数据导入成功",
      stats: {
        studentsImported: params.studentInfo.length,
        relationsCreated: relations.length,
        entryGradesImported: params.entryGrades.length,
        exitGradesImported: params.exitGrades.length,
      },
    };
  } catch (error) {
    console.error("导入失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}
