
import { z } from "zod";

// 基础学生信息验证
const studentSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  class_name: z.string().optional(),
  grade: z.string().optional()
});

// 成绩数据验证
const gradeSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  subject: z.string().min(1, "科目不能为空"),
  score: z.number()
    .min(0, "分数不能小于0")
    .max(100, "分数不能大于100")
    .transform(val => Number(val)),
  exam_date: z.string().optional(),
  exam_type: z.string().optional()
});

// 班级信息验证
const classSchema = z.object({
  name: z.string().min(1, "班级名称不能为空"),
  grade: z.string().optional()
});

export const validateImportedData = (data: any[]) => {
  const errors: { row: number; errors: string[] }[] = [];
  const validData: any[] = [];

  data.forEach((row, index) => {
    try {
      // 验证学生基本信息
      const studentData = studentSchema.parse({
        student_id: row.student_id || row.学号,
        name: row.name || row.姓名,
        class_name: row.class_name || row.班级,
        grade: row.grade || row.年级
      });

      // 验证成绩信息
      const gradeData = gradeSchema.parse({
        student_id: studentData.student_id,
        subject: row.subject || row.科目,
        score: row.score || row.分数,
        exam_date: row.exam_date || row.考试日期,
        exam_type: row.exam_type || row.考试类型
      });

      validData.push({
        ...studentData,
        ...gradeData
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push({
          row: index + 1,
          errors: error.errors.map(e => e.message)
        });
      }
    }
  });

  return { validData, errors };
};
