import { z } from "zod";

// 用户认证验证schema
export const userAuthSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少需要6个字符"),
});

// 学生数据验证schema
export const studentSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  class_name: z.string().min(1, "班级不能为空"),
  admission_year: z.string().optional(),
  gender: z.enum(["男", "女", "其他"]).optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  user_id: z.string().optional(), // 关联到用户表的ID
});

// 成绩数据验证schema
export const gradeSchema = z.object({
  student_id: z.string().min(1, "学号不能为空"),
  subject: z.string().min(1, "科目不能为空"),
  score: z.number()
    .min(0, "分数不能小于0")
    .max(100, "分数不能大于100"),
  exam_date: z.string().min(1, "考试日期不能为空"),
  exam_type: z.string().min(1, "考试类型不能为空"),
  semester: z.string().optional(),
  teacher_id: z.string().optional(),
  comments: z.string().optional(),
});

// 班级信息验证schema
export const classInfoSchema = z.object({
  class_name: z.string().min(1, "班级名称不能为空"),
  grade_level: z.string().min(1, "年级不能为空"),
  academic_year: z.string().min(1, "学年不能为空"),
  homeroom_teacher: z.string().optional(),
  student_count: z.number().optional(),
  department: z.string().optional(),
});

// 科目信息验证schema
export const subjectSchema = z.object({
  subject_code: z.string().min(1, "科目代码不能为空"),
  subject_name: z.string().min(1, "科目名称不能为空"),
  credit: z.number().optional(),
  category: z.string().optional(),
  is_required: z.boolean().optional(),
});

// 教师信息验证schema
export const teacherSchema = z.object({
  teacher_id: z.string().min(1, "教师ID不能为空"),
  name: z.string().min(1, "姓名不能为空"),
  department: z.string().optional(),
  title: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().optional(),
  user_id: z.string().optional(), // 关联到用户表的ID
});

// 数据验证函数
export const validateData = {
  // 验证用户认证数据
  async validateUserAuth(data: any) {
    try {
      return await userAuthSchema.parseAsync(data);
    } catch (error) {
      throw new Error("用户认证数据验证失败: " + error);
    }
  },

  // 验证学生数据
  async validateStudent(data: any) {
    try {
      return await studentSchema.parseAsync(data);
    } catch (error) {
      throw new Error("学生数据验证失败: " + error);
    }
  },

  // 验证成绩数据
  async validateGrade(data: any) {
    try {
      return await gradeSchema.parseAsync(data);
    } catch (error) {
      throw new Error("成绩数据验证失败: " + error);
    }
  },

  // 验证班级信息
  async validateClassInfo(data: any) {
    try {
      return await classInfoSchema.parseAsync(data);
    } catch (error) {
      throw new Error("班级信息验证失败: " + error);
    }
  },

  // 验证科目信息
  async validateSubject(data: any) {
    try {
      return await subjectSchema.parseAsync(data);
    } catch (error) {
      throw new Error("科目信息验证失败: " + error);
    }
  },

  // 验证教师信息
  async validateTeacher(data: any) {
    try {
      return await teacherSchema.parseAsync(data);
    } catch (error) {
      throw new Error("教师信息验证失败: " + error);
    }
  },

  // 批量验证学生数据
  async validateStudents(dataArray: any[]) {
    return Promise.all(dataArray.map(data => this.validateStudent(data)));
  },

  // 批量验证成绩数据
  async validateGrades(dataArray: any[]) {
    return Promise.all(dataArray.map(data => this.validateGrade(data)));
  }
};
