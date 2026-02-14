/**
 * 数据完整性校验器
 * 在数据导入前执行严格校验，防止脏数据进入系统
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  StudentInfo,
  TeachingArrangement,
  GradeScores,
  DetailedError,
} from "@/types/valueAddedTypes";
import {
  SUBJECT_CONFIGS,
  GRADE_CONFIGS,
  ValidationSeverity,
} from "./dataValidationRules";

// ============================================
// 校验报告类型
// ============================================

export interface ValidationReport {
  isValid: boolean;
  errors: DetailedError[];
  warnings: DetailedError[];
  summary: {
    totalRows: number;
    errorRows: number;
    warningRows: number;
    criticalErrors: number;
  };
}

// ============================================
// 1. 学生信息校验
// ============================================

/**
 * 校验学生信息
 */
export async function validateStudentData(
  students: StudentInfo[]
): Promise<ValidationReport> {
  const errors: DetailedError[] = [];
  const warnings: DetailedError[] = [];
  const studentIdSet = new Set<string>();

  // 查询数据库中已存在的学号
  const studentIds = students.map((s) => s.student_id).filter(Boolean);
  const { data: existingStudents } = await supabase
    .from("students")
    .select("student_id")
    .in("student_id", studentIds);

  const existingStudentIds = new Set(
    existingStudents?.map((s) => s.student_id) || []
  );

  // 逐行校验
  students.forEach((student, index) => {
    const rowNum = index + 1;

    // 1. 学号必填
    if (!student.student_id || String(student.student_id).trim() === "") {
      errors.push({
        row: rowNum,
        field: "student_id",
        message: "学号不能为空",
        currentValue: student.student_id,
        suggestion: "请确保每个学生都有唯一的学号",
      });
    } else {
      // 2. 学号唯一性（批次内）
      if (studentIdSet.has(student.student_id)) {
        errors.push({
          row: rowNum,
          field: "student_id",
          message: "学号重复",
          currentValue: student.student_id,
          suggestion: "同一批次中学号必须唯一",
        });
      }
      studentIdSet.add(student.student_id);

      // 3. 学号格式
      if (!/^[A-Za-z0-9]{4,20}$/.test(student.student_id)) {
        warnings.push({
          row: rowNum,
          field: "student_id",
          message: "学号格式不标准",
          currentValue: student.student_id,
          suggestion: "学号应为4-20位字母数字组合",
        });
      }

      // 4. 学号在数据库中已存在（可能需要更新而非新增）
      if (existingStudentIds.has(student.student_id)) {
        warnings.push({
          row: rowNum,
          field: "student_id",
          message: "学号已存在于数据库",
          currentValue: student.student_id,
          suggestion: "将执行upsert更新现有记录",
        });
      }
    }

    // 5. 姓名必填
    if (!student.student_name || String(student.student_name).trim() === "") {
      errors.push({
        row: rowNum,
        field: "student_name",
        message: "学生姓名不能为空",
        currentValue: student.student_name,
        suggestion: "请确保每个学生都有姓名",
      });
    } else {
      // 6. 姓名格式
      if (!/^[\u4e00-\u9fa5a-zA-Z\s]{2,20}$/.test(student.student_name)) {
        warnings.push({
          row: rowNum,
          field: "student_name",
          message: "姓名格式不标准",
          currentValue: student.student_name,
          suggestion: "姓名应为2-20位中文或英文字符",
        });
      }
    }

    // 7. 班级必填
    if (!student.class_name || String(student.class_name).trim() === "") {
      errors.push({
        row: rowNum,
        field: "class_name",
        message: "班级名称不能为空",
        currentValue: student.class_name,
        suggestion: "请确保每个学生都有所属班级",
      });
    } else {
      // 8. 班级格式（建议：高一(1)班、2024级1班等）
      if (
        !/^(高|初)?[一二三四五六七八九十\d]+[\(\（]?\d{1,2}[\)\）]?班$/.test(
          student.class_name
        )
      ) {
        warnings.push({
          row: rowNum,
          field: "class_name",
          message: "班级名称格式不标准",
          currentValue: student.class_name,
          suggestion: "建议格式：高一(1)班、初三2班等",
        });
      }
    }

    // 9. 性别枚举值
    if (student.gender && !["男", "女", "其他"].includes(student.gender)) {
      warnings.push({
        row: rowNum,
        field: "gender",
        message: "性别值不在允许范围",
        currentValue: student.gender,
        suggestion: "允许值：男、女、其他",
      });
    }

    // 10. 入学年份格式
    if (student.enrollment_year && !/^\d{4}$/.test(student.enrollment_year)) {
      warnings.push({
        row: rowNum,
        field: "enrollment_year",
        message: "入学年份格式不正确",
        currentValue: student.enrollment_year,
        suggestion: "应为4位数字，如：2024",
      });
    }
  });

  return generateReport(students.length, errors, warnings);
}

// ============================================
// 2. 成绩数据校验
// ============================================

/**
 * 校验成绩数据
 */
export async function validateGradeData(
  scores: GradeScores[],
  examId: string
): Promise<ValidationReport> {
  const errors: DetailedError[] = [];
  const warnings: DetailedError[] = [];

  // 1. 验证考试ID存在性
  const { data: examExists, error: examError } = await supabase
    .from("exams")
    .select("id")
    .eq("id", examId)
    .maybeSingle();

  if (examError || !examExists) {
    errors.push({
      row: 0,
      field: "exam_id",
      message: "考试ID不存在于数据库",
      currentValue: examId,
      suggestion: "请先创建考试记录",
    });
    // 考试ID不存在时，直接返回，避免后续无效检查
    return generateReport(scores.length, errors, warnings);
  }

  // 2. 批量查询学生ID存在性
  const studentIds = scores.map((s) => s.student_id).filter(Boolean);
  const { data: existingStudents } = await supabase
    .from("students")
    .select("student_id")
    .in("student_id", studentIds);

  const validStudentIds = new Set(
    existingStudents?.map((s) => s.student_id) || []
  );

  // 3. 逐行校验
  const examStudentSet = new Set<string>();

  scores.forEach((score, index) => {
    const rowNum = index + 1;

    // 3.1 学号必填
    if (!score.student_id || String(score.student_id).trim() === "") {
      errors.push({
        row: rowNum,
        field: "student_id",
        message: "学号不能为空",
        currentValue: score.student_id,
        suggestion: "成绩记录必须关联到具体学生",
      });
    } else {
      // 3.2 学号存在性
      if (!validStudentIds.has(score.student_id)) {
        errors.push({
          row: rowNum,
          field: "student_id",
          message: "学号不存在于学生表",
          currentValue: score.student_id,
          suggestion: "请先导入学生信息",
        });
      }

      // 3.3 同一考试中学号唯一性
      const uniqueKey = `${examId}-${score.student_id}`;
      if (examStudentSet.has(uniqueKey)) {
        errors.push({
          row: rowNum,
          field: "student_id",
          message: "同一考试中学生成绩重复",
          currentValue: score.student_id,
          suggestion: "一个学生在同一考试中只能有一条成绩记录",
        });
      }
      examStudentSet.add(uniqueKey);
    }

    // 3.4 校验各科目分数
    const subjects = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "politics",
      "history",
      "geography",
    ];

    subjects.forEach((subject) => {
      const scoreField = `${subject}_score` as keyof typeof score;
      const absentField = `${subject}_absent`;
      const scoreValue = score[scoreField];
      const isAbsent = (score as any)[absentField];

      if (scoreValue !== null && scoreValue !== undefined) {
        const numScore = Number(scoreValue);
        const config = SUBJECT_CONFIGS[subject as keyof typeof SUBJECT_CONFIGS];

        // 3.5 分数范围校验
        if (isNaN(numScore) || numScore < 0 || numScore > config.maxScore) {
          errors.push({
            row: rowNum,
            field: scoreField,
            message: `${config.name}分数超出范围`,
            currentValue: String(scoreValue),
            suggestion: `${config.name}分数应在0-${config.maxScore}之间`,
          });
        }

        // 3.6 缺考标记与分数互斥
        if (isAbsent === true) {
          errors.push({
            row: rowNum,
            field: scoreField,
            message: `${config.name}缺考标记与分数冲突`,
            currentValue: `分数=${scoreValue}, 缺考=${isAbsent}`,
            suggestion: "缺考时分数应为null，或取消缺考标记",
          });
        }
      }

      // 3.7 等级格式校验
      const gradeField = `${subject}_grade` as keyof typeof score;
      const gradeValue = score[gradeField];
      if (
        gradeValue &&
        !GRADE_CONFIGS.validGrades.includes(String(gradeValue).toUpperCase())
      ) {
        warnings.push({
          row: rowNum,
          field: gradeField,
          message: `${SUBJECT_CONFIGS[subject as keyof typeof SUBJECT_CONFIGS].name}等级格式不正确`,
          currentValue: String(gradeValue),
          suggestion: `有效等级：${GRADE_CONFIGS.validGrades.join(", ")}`,
        });
      }
    });

    // 3.8 总分逻辑校验
    if (score.total_score !== null && score.total_score !== undefined) {
      const subjectScores = subjects
        .map((subject) => {
          const value = score[`${subject}_score` as keyof typeof score];
          return value !== null && value !== undefined ? Number(value) : 0;
        })
        .filter((v) => !isNaN(v));

      const calculatedTotal = subjectScores.reduce((sum, v) => sum + v, 0);
      const actualTotal = Number(score.total_score);

      // 允许5分的误差
      if (Math.abs(calculatedTotal - actualTotal) > 5) {
        warnings.push({
          row: rowNum,
          field: "total_score",
          message: "总分与各科分数之和不匹配",
          currentValue: `实际=${actualTotal}, 计算=${calculatedTotal}`,
          suggestion: "检查总分是否为各科分数的正确汇总",
        });
      }
    }
  });

  return generateReport(scores.length, errors, warnings);
}

// ============================================
// 3. 教学编排校验
// ============================================

/**
 * 校验教学编排
 */
export async function validateTeachingArrangement(
  arrangements: TeachingArrangement[],
  students: StudentInfo[]
): Promise<ValidationReport> {
  const errors: DetailedError[] = [];
  const warnings: DetailedError[] = [];

  // 1. 构建班级-学生映射
  const classStudentsMap = new Map<string, Set<string>>();
  students.forEach((student) => {
    if (!classStudentsMap.has(student.class_name)) {
      classStudentsMap.set(student.class_name, new Set());
    }
    classStudentsMap.get(student.class_name)!.add(student.student_id);
  });

  // 2. 查询教师存在性
  const teacherNames = [
    ...new Set(arrangements.map((a) => a.teacher_name).filter(Boolean)),
  ];
  const { data: existingTeachers } = await supabase
    .from("teachers")
    .select("name")
    .in("name", teacherNames);

  const validTeacherNames = new Set(existingTeachers?.map((t) => t.name) || []);

  // 3. 逐行校验
  arrangements.forEach((arr, index) => {
    const rowNum = index + 1;

    // 3.1 必填字段检查
    if (!arr.teacher_name || String(arr.teacher_name).trim() === "") {
      errors.push({
        row: rowNum,
        field: "teacher_name",
        message: "教师姓名不能为空",
        currentValue: arr.teacher_name,
        suggestion: "每条教学编排必须指定教师",
      });
    } else {
      // 3.2 教师存在性（警告，因为会自动创建）
      if (!validTeacherNames.has(arr.teacher_name)) {
        warnings.push({
          row: rowNum,
          field: "teacher_name",
          message: "教师不存在于数据库",
          currentValue: arr.teacher_name,
          suggestion: "将自动创建新教师账号",
        });
      }
    }

    if (!arr.class_name || String(arr.class_name).trim() === "") {
      errors.push({
        row: rowNum,
        field: "class_name",
        message: "班级名称不能为空",
        currentValue: arr.class_name,
        suggestion: "每条教学编排必须指定班级",
      });
    } else {
      // 3.3 班级-学生关联一致性
      if (!classStudentsMap.has(arr.class_name)) {
        errors.push({
          row: rowNum,
          field: "class_name",
          message: "班级不存在于学生信息",
          currentValue: arr.class_name,
          suggestion: "班级名称必须与学生信息中的班级匹配",
        });
      }
    }

    if (!arr.subject || String(arr.subject).trim() === "") {
      errors.push({
        row: rowNum,
        field: "subject",
        message: "科目不能为空",
        currentValue: arr.subject,
        suggestion: "每条教学编排必须指定科目",
      });
    }

    // 3.4 学年格式
    if (arr.academic_year && !/^\d{4}-\d{4}$/.test(arr.academic_year)) {
      warnings.push({
        row: rowNum,
        field: "academic_year",
        message: "学年格式不正确",
        currentValue: arr.academic_year,
        suggestion: "学年格式应为：2024-2025",
      });
    }

    // 3.5 学期格式
    if (arr.semester && !/^第[一二]学期$/.test(arr.semester)) {
      warnings.push({
        row: rowNum,
        field: "semester",
        message: "学期格式不正确",
        currentValue: arr.semester,
        suggestion: "学期格式应为：第一学期、第二学期",
      });
    }
  });

  return generateReport(arrangements.length, errors, warnings);
}

// ============================================
// 4. 关联完整性校验
// ============================================

/**
 * 校验跨表关联完整性
 */
export async function validateRelationalIntegrity(data: {
  students: StudentInfo[];
  scores: GradeScores[];
  arrangements: TeachingArrangement[];
}): Promise<ValidationReport> {
  const errors: DetailedError[] = [];
  const warnings: DetailedError[] = [];

  // 1. 构建学生ID集合
  const studentIdSet = new Set(data.students.map((s) => s.student_id));

  // 2. 检查成绩数据中的学生ID是否存在于学生信息
  data.scores.forEach((score, index) => {
    if (score.student_id && !studentIdSet.has(score.student_id)) {
      errors.push({
        row: index + 1,
        field: "student_id",
        message: "成绩数据中的学号不存在于学生信息",
        currentValue: score.student_id,
        suggestion: "确保成绩数据对应的学生已存在于学生信息表",
      });
    }
  });

  // 3. 检查班级一致性（同一学生在不同表中的班级应一致）
  const studentClassMap = new Map<string, string>();
  data.students.forEach((student) => {
    if (student.student_id && student.class_name) {
      studentClassMap.set(student.student_id, student.class_name);
    }
  });

  data.scores.forEach((score, index) => {
    if (score.student_id && score.class_name) {
      const expectedClass = studentClassMap.get(score.student_id);
      if (expectedClass && expectedClass !== score.class_name) {
        warnings.push({
          row: index + 1,
          field: "class_name",
          message: "成绩数据中的班级与学生信息不一致",
          currentValue: `学生信息=${expectedClass}, 成绩数据=${score.class_name}`,
          suggestion: "确保同一学生在不同表中的班级名称一致",
        });
      }
    }
  });

  // 4. 检查教学编排覆盖率
  const classesWithStudents = new Set(data.students.map((s) => s.class_name));
  const classesWithArrangements = new Set(
    data.arrangements.map((a) => a.class_name)
  );

  classesWithStudents.forEach((className) => {
    if (!classesWithArrangements.has(className)) {
      warnings.push({
        row: 0,
        field: "class_name",
        message: "班级缺少教学编排",
        currentValue: className,
        suggestion: `班级 ${className} 有学生但缺少教学编排信息`,
      });
    }
  });

  const totalRows =
    data.students.length + data.scores.length + data.arrangements.length;
  return generateReport(totalRows, errors, warnings);
}

// ============================================
// 工具函数
// ============================================

/**
 * 生成校验报告
 */
function generateReport(
  totalRows: number,
  errors: DetailedError[],
  warnings: DetailedError[]
): ValidationReport {
  const criticalErrors = errors.filter((e) =>
    ["student_id", "exam_id"].includes(e.field)
  ).length;

  const errorRowsSet = new Set(errors.map((e) => e.row));
  const warningRowsSet = new Set(warnings.map((e) => e.row));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalRows,
      errorRows: errorRowsSet.size,
      warningRows: warningRowsSet.size,
      criticalErrors,
    },
  };
}

/**
 * 格式化校验报告为用户友好的字符串
 */
export function formatValidationReport(report: ValidationReport): string {
  const lines: string[] = [];

  lines.push("=== 数据校验报告 ===\n");
  lines.push(`总行数: ${report.summary.totalRows}`);
  lines.push(`错误行数: ${report.summary.errorRows}`);
  lines.push(`警告行数: ${report.summary.warningRows}`);
  lines.push(`严重错误数: ${report.summary.criticalErrors}\n`);

  if (report.errors.length > 0) {
    lines.push("❌ 错误明细:");
    report.errors.forEach((error) => {
      lines.push(`  第${error.row}行 [${error.field}]: ${error.message}`);
      lines.push(`    当前值: ${error.currentValue}`);
      if (error.suggestion) {
        lines.push(`    建议: ${error.suggestion}`);
      }
    });
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("⚠️  警告明细:");
    report.warnings.forEach((warning) => {
      lines.push(`  第${warning.row}行 [${warning.field}]: ${warning.message}`);
      lines.push(`    当前值: ${warning.currentValue}`);
      if (warning.suggestion) {
        lines.push(`    建议: ${warning.suggestion}`);
      }
    });
    lines.push("");
  }

  if (report.isValid) {
    lines.push("✅ 数据校验通过");
  } else {
    lines.push("❌ 数据校验失败，请修正错误后重新导入");
  }

  return lines.join("\n");
}
