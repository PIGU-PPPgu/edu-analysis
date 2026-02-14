/**
 * 数据校验器单元测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validateStudentData,
  validateGradeData,
  validateTeachingArrangement,
  validateRelationalIntegrity,
} from "../dataValidator";
import type {
  StudentInfo,
  GradeScores,
  TeachingArrangement,
} from "@/types/valueAddedTypes";

// Mock Supabase客户端
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: (fields: string) => ({
        in: (field: string, values: any[]) => ({
          then: (callback: any) =>
            callback({
              data:
                table === "students"
                  ? values.map((id) => ({ student_id: id }))
                  : table === "exams"
                    ? [{ id: values[0] }]
                    : table === "teachers"
                      ? values.map((name) => ({ name }))
                      : [],
              error: null,
            }),
        }),
        eq: (field: string, value: any) => ({
          maybeSingle: () => ({
            then: (callback: any) =>
              callback({
                data: table === "exams" ? { id: value } : null,
                error: null,
              }),
          }),
        }),
      }),
    }),
  },
}));

describe("validateStudentData", () => {
  it("应通过合法学生数据的校验", async () => {
    const students: StudentInfo[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        name: "张三",
        class_name: "高一(1)班",
        class_code: "C001",
        gender: "男",
        enrollment_year: "2024",
      },
    ];

    const result = await validateStudentData(students);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("应拒绝缺少学号的学生", async () => {
    const students: StudentInfo[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "",
        student_name: "张三",
        name: "张三",
        class_name: "高一(1)班",
        class_code: "C001",
      },
    ];

    const result = await validateStudentData(students);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "student_id")).toBe(true);
  });

  it("应拒绝缺少姓名的学生", async () => {
    const students: StudentInfo[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "",
        name: "",
        class_name: "高一(1)班",
        class_code: "C001",
      },
    ];

    const result = await validateStudentData(students);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "student_name")).toBe(true);
  });

  it("应拒绝缺少班级的学生", async () => {
    const students: StudentInfo[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        name: "张三",
        class_name: "",
        class_code: "C001",
      },
    ];

    const result = await validateStudentData(students);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "class_name")).toBe(true);
  });

  it("应检测批次内学号重复", async () => {
    const students: StudentInfo[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        name: "张三",
        class_name: "高一(1)班",
        class_code: "C001",
      },
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001", // 重复学号
        student_name: "李四",
        name: "李四",
        class_name: "高一(2)班",
        class_code: "C002",
      },
    ];

    const result = await validateStudentData(students);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("重复"))).toBe(true);
  });

  it("应对不标准学号格式发出警告", async () => {
    const students: StudentInfo[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "123", // 格式不正确（少于4位）
        student_name: "张三",
        name: "张三",
        class_name: "高一(1)班",
        class_code: "C001",
      },
    ];

    const result = await validateStudentData(students);
    expect(result.warnings.some((w) => w.field === "student_id")).toBe(true);
  });
});

describe("validateGradeData", () => {
  const validExamId = "550e8400-e29b-41d4-a716-446655440000";

  it("应通过合法成绩数据的校验", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        scores: { 语文: 120, 数学: 130 },
        total_score: 250,
        chinese_score: 120,
        math_score: 130,
      },
    ];

    const result = await validateGradeData(scores, validExamId);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("应拒绝分数超出范围的成绩", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        scores: { 语文: 160 }, // 超过150分
        chinese_score: 160,
      },
    ];

    const result = await validateGradeData(scores, validExamId);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("超出范围"))).toBe(
      true
    );
  });

  it("应拒绝缺考标记与分数冲突的情况", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        scores: { 语文: 120 },
        chinese_score: 120,
        chinese_absent: true, // 冲突：既有分数又标记缺考
      } as any,
    ];

    const result = await validateGradeData(scores, validExamId);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("冲突"))).toBe(true);
  });

  it("应对等级格式不正确发出警告", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        scores: { 语文: 120 },
        chinese_score: 120,
        chinese_grade: "X", // 不合法的等级
      },
    ];

    const result = await validateGradeData(scores, validExamId);
    expect(result.warnings.some((w) => w.field === "chinese_grade")).toBe(true);
  });

  it("应对总分与各科分数不匹配发出警告", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        scores: { 语文: 120, 数学: 130 },
        chinese_score: 120,
        math_score: 130,
        total_score: 300, // 错误：应该是250
      },
    ];

    const result = await validateGradeData(scores, validExamId);
    expect(result.warnings.some((w) => w.field === "total_score")).toBe(true);
  });
});

describe("validateTeachingArrangement", () => {
  const studentInfo: StudentInfo[] = [
    {
      school_name: "测试学校",
      school_code: "SC001",
      student_id: "20240001",
      student_name: "张三",
      name: "张三",
      class_name: "高一(1)班",
      class_code: "C001",
    },
  ];

  it("应通过合法教学编排的校验", async () => {
    const arrangements: TeachingArrangement[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        class_name: "高一(1)班",
        class_code: "C001",
        teacher_id: "T001",
        teacher_name: "王老师",
        subject: "语文",
        is_elective: false,
        academic_year: "2024-2025",
        semester: "第一学期",
      },
    ];

    const result = await validateTeachingArrangement(arrangements, studentInfo);
    expect(result.isValid).toBe(true);
  });

  it("应拒绝缺少教师姓名的编排", async () => {
    const arrangements: TeachingArrangement[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        class_name: "高一(1)班",
        class_code: "C001",
        teacher_id: "T001",
        teacher_name: "",
        subject: "语文",
        is_elective: false,
      },
    ];

    const result = await validateTeachingArrangement(arrangements, studentInfo);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.field === "teacher_name")).toBe(true);
  });

  it("应拒绝班级不存在于学生信息的编排", async () => {
    const arrangements: TeachingArrangement[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        class_name: "不存在的班级",
        class_code: "C999",
        teacher_id: "T001",
        teacher_name: "王老师",
        subject: "语文",
        is_elective: false,
      },
    ];

    const result = await validateTeachingArrangement(arrangements, studentInfo);
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("不存在于学生信息"))
    ).toBe(true);
  });

  it("应对学年格式不正确发出警告", async () => {
    const arrangements: TeachingArrangement[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        class_name: "高一(1)班",
        class_code: "C001",
        teacher_id: "T001",
        teacher_name: "王老师",
        subject: "语文",
        is_elective: false,
        academic_year: "2024", // 格式错误
      },
    ];

    const result = await validateTeachingArrangement(arrangements, studentInfo);
    expect(result.warnings.some((w) => w.field === "academic_year")).toBe(true);
  });
});

describe("validateRelationalIntegrity", () => {
  const students: StudentInfo[] = [
    {
      school_name: "测试学校",
      school_code: "SC001",
      student_id: "20240001",
      student_name: "张三",
      name: "张三",
      class_name: "高一(1)班",
      class_code: "C001",
    },
  ];

  it("应通过关联一致的数据", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        class_name: "高一(1)班",
        scores: { 语文: 120 },
        chinese_score: 120,
      },
    ];

    const arrangements: TeachingArrangement[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        class_name: "高一(1)班",
        class_code: "C001",
        teacher_id: "T001",
        teacher_name: "王老师",
        subject: "语文",
        is_elective: false,
      },
    ];

    const result = await validateRelationalIntegrity({
      students,
      scores,
      arrangements,
    });
    expect(result.isValid).toBe(true);
  });

  it("应检测成绩数据中不存在的学号", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "99999999", // 不存在的学号
        student_name: "不存在的学生",
        scores: { 语文: 120 },
        chinese_score: 120,
      },
    ];

    const result = await validateRelationalIntegrity({
      students,
      scores,
      arrangements: [],
    });
    expect(result.isValid).toBe(false);
    expect(
      result.errors.some((e) => e.message.includes("不存在于学生信息"))
    ).toBe(true);
  });

  it("应对班级不一致发出警告", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        class_name: "高一(2)班", // 与学生信息中的班级不一致
        scores: { 语文: 120 },
        chinese_score: 120,
      },
    ];

    const result = await validateRelationalIntegrity({
      students,
      scores,
      arrangements: [],
    });
    expect(result.warnings.some((w) => w.message.includes("不一致"))).toBe(
      true
    );
  });

  it("应对缺少教学编排的班级发出警告", async () => {
    const result = await validateRelationalIntegrity({
      students,
      scores: [],
      arrangements: [], // 没有教学编排
    });
    expect(
      result.warnings.some((w) => w.message.includes("缺少教学编排"))
    ).toBe(true);
  });
});

describe("边界情况测试", () => {
  it("应处理空数组", async () => {
    const result = await validateStudentData([]);
    expect(result.isValid).toBe(true);
    expect(result.summary.totalRows).toBe(0);
  });

  it("应处理满分成绩", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        scores: { 语文: 150, 数学: 150, 英语: 150 },
        chinese_score: 150,
        math_score: 150,
        english_score: 150,
      },
    ];

    const validExamId = "550e8400-e29b-41d4-a716-446655440000";
    const result = await validateGradeData(scores, validExamId);
    expect(result.isValid).toBe(true);
  });

  it("应处理0分成绩", async () => {
    const scores: GradeScores[] = [
      {
        school_name: "测试学校",
        school_code: "SC001",
        student_id: "20240001",
        student_name: "张三",
        scores: { 语文: 0 },
        chinese_score: 0,
      },
    ];

    const validExamId = "550e8400-e29b-41d4-a716-446655440000";
    const result = await validateGradeData(scores, validExamId);
    expect(result.isValid).toBe(true);
  });
});
