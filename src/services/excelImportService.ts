/**
 * Excel 导入服务
 * 用于解析和处理增值评价系统的4种Excel文件
 */

import * as XLSX from "xlsx";
import type {
  StudentInfo,
  TeachingArrangement,
  ElectiveCourse,
  GradeScores,
  ValidationResult,
} from "@/types/valueAddedTypes";

// ============================================
// Excel 文件解析
// ============================================

/**
 * 读取Excel文件
 */
export async function readExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        resolve(workbook);
      } catch (error) {
        reject(new Error("Excel文件格式错误"));
      }
    };

    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsBinaryString(file);
  });
}

/**
 * 解析学生信息表
 */
export function parseStudentInfo(workbook: XLSX.WorkBook): StudentInfo[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  return data.map((row) => {
    const studentName = String(row["姓名"] || row["student_name"] || "");
    return {
      school_name: String(row["学校名称"] || row["school_name"] || ""),
      school_code: String(row["学校代码"] || row["school_code"] || ""),
      student_id: String(row["学号"] || row["student_id"] || ""),
      student_name: studentName,
      name: studentName, // ✅ 添加 name 字段（与 student_name 相同）
      class_name: String(
        row["班级名称"] || row["班级"] || row["class_name"] || ""
      ),
      class_code: String(row["班级代码"] || row["class_code"] || ""),
      gender: row["性别"] || row["gender"] || undefined,
      enrollment_year: row["入学年份"] || row["enrollment_year"] || undefined,
    };
  });
}

/**
 * 解析教学编排表
 */
export function parseTeachingArrangement(
  workbook: XLSX.WorkBook
): TeachingArrangement[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  return data.map((row) => ({
    school_name: String(row["学校名称"] || row["school_name"] || ""),
    school_code: String(row["学校代码"] || row["school_code"] || ""),
    class_name: String(
      row["班级名称"] || row["班级"] || row["class_name"] || ""
    ), // ✅ 添加 '班级名称'
    class_code: String(row["班级代码"] || row["class_code"] || ""),
    teacher_id: String(row["教师工号"] || row["teacher_id"] || ""),
    teacher_name: String(row["教师姓名"] || row["teacher_name"] || ""),
    subject: String(row["科目"] || row["subject"] || ""),
    is_elective: Boolean(row["是否选课"] || row["is_elective"] || false),
  }));
}

/**
 * 解析学生走班信息表
 */
export function parseElectiveCourse(workbook: XLSX.WorkBook): ElectiveCourse[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  return data.map((row) => ({
    school_name: String(row["学校名称"] || row["school_name"] || ""),
    school_code: String(row["学校代码"] || row["school_code"] || ""),
    student_id: String(row["学号"] || row["student_id"] || ""),
    student_name: String(row["姓名"] || row["student_name"] || ""),
    subject: String(row["科目"] || row["subject"] || ""),
    class_name: String(row["走班班级"] || row["class_name"] || ""),
    class_code: String(row["走班班级代码"] || row["class_code"] || ""),
  }));
}

/**
 * 解析成绩数据表
 */
export function parseGradeScores(workbook: XLSX.WorkBook): GradeScores[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const data: any[] = XLSX.utils.sheet_to_json(sheet);

  return data.map((row) => {
    // 提取固定字段
    const baseInfo = {
      school_name: String(row["学校名称"] || row["school_name"] || ""),
      school_code: String(row["学校代码"] || row["school_code"] || ""),
      student_id: String(row["学号"] || row["student_id"] || ""),
      student_name: String(row["姓名"] || row["student_name"] || ""),
      class_name: String(
        row["班级名称"] || row["班级"] || row["class_name"] || ""
      ), // ✅ 添加 class_name
    };

    // 提取所有科目成绩（动态列）
    const scores: Record<string, number | string> = {};
    const fixedFields = [
      "学校名称",
      "school_name",
      "学校代码",
      "school_code",
      "学号",
      "student_id",
      "姓名",
      "student_name",
      "班级名称",
      "班级",
      "class_name",
    ];

    Object.keys(row).forEach((key) => {
      if (!fixedFields.includes(key)) {
        const value = row[key];

        // ✅ 优先处理空值：Excel空单元格 → null
        if (value === undefined || value === null || value === "") {
          scores[key] = null;
        }
        // 处理缺考(Q)、未参加(N)等特殊标记
        else if (
          value === "Q" ||
          value === "N" ||
          value === "缺考" ||
          value === "未参加"
        ) {
          scores[key] = value;
        }
        // 处理数字分数
        else {
          const numValue = Number(value);
          // ✅ 修复：非数字 → null（而不是0）
          scores[key] = isNaN(numValue) ? null : numValue;
        }
      }
    });

    // ✅ 展开常见科目到扁平字段（便于存储）
    const flattenedScores: Partial<GradeScores> = {
      chinese_score: scores["语文"] ?? undefined,
      math_score: scores["数学"] ?? undefined,
      english_score: scores["英语"] ?? undefined,
      physics_score: scores["物理"] ?? undefined,
      chemistry_score: scores["化学"] ?? undefined,
      biology_score: scores["生物"] ?? undefined,
      politics_score: scores["道法"] ?? scores["政治"] ?? undefined,
      history_score: scores["历史"] ?? undefined,
      geography_score: scores["地理"] ?? undefined,
    };

    // 计算总分（如果没有提供）
    const totalScore =
      scores["总分"] ??
      Object.values(scores)
        .filter((v) => typeof v === "number")
        .reduce((sum: number, v) => sum + (v as number), 0);

    return {
      ...baseInfo,
      scores,
      ...flattenedScores,
      total_score: totalScore as number,
    };
  });
}

// ============================================
// 数据校验
// ============================================

/**
 * 校验学生信息表
 */
export function validateStudentInfo(data: StudentInfo[]): ValidationResult {
  const errors: string[] = [];

  // 1. 检查必填字段
  data.forEach((row, index) => {
    if (!row.student_id) errors.push(`第${index + 1}行: 学号不能为空`);
    if (!row.student_name) errors.push(`第${index + 1}行: 姓名不能为空`);
    if (!row.class_name) errors.push(`第${index + 1}行: 班级不能为空`);
  });

  // 2. 检查学号唯一性
  const studentIds = new Set<string>();
  data.forEach((row, index) => {
    if (studentIds.has(row.student_id)) {
      errors.push(`第${index + 1}行: 学号 ${row.student_id} 重复`);
    }
    studentIds.add(row.student_id);
  });

  return {
    rule: "学生信息表校验",
    status: errors.length === 0 ? "passed" : "failed",
    errors,
    error_count: errors.length,
  };
}

/**
 * 校验教学编排表
 */
export function validateTeachingArrangement(
  data: TeachingArrangement[]
): ValidationResult {
  const errors: string[] = [];

  data.forEach((row, index) => {
    if (!row.class_name) errors.push(`第${index + 1}行: 班级不能为空`);
    if (!row.teacher_name) errors.push(`第${index + 1}行: 教师姓名不能为空`);
    if (!row.subject) errors.push(`第${index + 1}行: 科目不能为空`);
  });

  return {
    rule: "教学编排表校验",
    status: errors.length === 0 ? "passed" : "failed",
    errors,
    error_count: errors.length,
  };
}

/**
 * 校验成绩数据表
 */
export function validateGradeScores(data: GradeScores[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  data.forEach((row, index) => {
    // ✅ 必填字段：只有学号是必须的
    if (!row.student_id) {
      errors.push(`第${index + 1}行: 学号不能为空`);
    }

    // ⚠️ 姓名为空：警告（增值计算时会自动跳过）
    if (!row.student_name || String(row.student_name).trim() === "") {
      warnings.push(`第${index + 1}行: 姓名为空，增值计算时将跳过此记录`);
    }

    // ⚠️ 成绩数据检查：所有科目都为空时警告
    const scoreCount = Object.keys(row.scores || {}).length;
    if (scoreCount === 0) {
      warnings.push(
        `第${index + 1}行: 没有任何科目成绩，增值计算时将跳过此记录`
      );
    }

    // 检查成绩值的合理性
    Object.entries(row.scores || {}).forEach(([subject, score]) => {
      if (typeof score === "number") {
        if (score < 0 || score > 150) {
          warnings.push(
            `第${index + 1}行: ${subject}成绩(${score})超出常规范围(0-150)`
          );
        }
      }
    });
  });

  return {
    rule: "成绩数据表校验",
    status:
      errors.length === 0
        ? warnings.length === 0
          ? "passed"
          : "warning"
        : "failed",
    errors,
    warnings,
    error_count: errors.length,
  };
}

/**
 * 交叉校验：学生信息与成绩数据的一致性
 */
export function validateCrossReference(
  studentInfo: StudentInfo[],
  gradeScores: GradeScores[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 建立学生ID索引
  const studentIdSet = new Set(studentInfo.map((s) => s.student_id));
  const gradeStudentIdSet = new Set(gradeScores.map((g) => g.student_id));

  // 检查成绩表中是否有学生信息表中不存在的学生
  gradeScores.forEach((grade) => {
    if (!studentIdSet.has(grade.student_id)) {
      warnings.push(
        `学号 ${grade.student_id}(${grade.student_name}) 在成绩表中存在，但学生信息表中缺失`
      );
    }
  });

  // 检查学生信息表中是否有成绩表中不存在的学生
  studentInfo.forEach((student) => {
    if (!gradeStudentIdSet.has(student.student_id)) {
      warnings.push(
        `学号 ${student.student_id}(${student.student_name}) 在学生信息表中存在，但成绩表中缺失`
      );
    }
  });

  return {
    rule: "数据交叉校验",
    status:
      errors.length === 0
        ? warnings.length === 0
          ? "passed"
          : "warning"
        : "failed",
    errors,
    warnings,
    error_count: errors.length,
  };
}

// ============================================
// 数据统计
// ============================================

/**
 * 统计导入数据概况
 */
export interface ImportSummary {
  studentCount: number;
  classCount: number;
  teacherCount: number;
  subjectCount: number;
  missingScoreCount: number;
  electiveCourseCount: number;
}

export function calculateImportSummary(
  studentInfo: StudentInfo[],
  teachingArrangement: TeachingArrangement[],
  gradeScores: GradeScores[],
  electiveCourse?: ElectiveCourse[]
): ImportSummary {
  // 统计班级数量
  const classSet = new Set(studentInfo.map((s) => s.class_name));

  // 统计教师数量
  const teacherSet = new Set(teachingArrangement.map((t) => t.teacher_name));

  // 统计科目数量
  const subjectSet = new Set(teachingArrangement.map((t) => t.subject));

  // 统计缺考和未参加人次
  let missingScoreCount = 0;
  gradeScores.forEach((grade) => {
    Object.values(grade.scores).forEach((score) => {
      if (
        score === "Q" ||
        score === "N" ||
        score === "缺考" ||
        score === "未参加"
      ) {
        missingScoreCount++;
      }
    });
  });

  return {
    studentCount: studentInfo.length,
    classCount: classSet.size,
    teacherCount: teacherSet.size,
    subjectCount: subjectSet.size,
    missingScoreCount,
    electiveCourseCount: electiveCourse?.length || 0,
  };
}
