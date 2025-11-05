/**
 * 学生数据业务服务
 * 基于统一DataGateway的学生相关业务逻辑
 */

import { getDataGateway } from "@/services/data";
import { toast } from "sonner";

// 导入现有的类型定义
interface Student {
  id: string;
  student_id: string;
  name: string;
  class_id?: string;
  class_name?: string;
  user_id?: string;
  admission_year?: string;
  gender?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

interface StudentFilter {
  studentId?: string;
  classId?: string;
  className?: string;
  name?: string;
  admissionYear?: string;
  gender?: string;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

interface CreateStudentInput {
  student_id: string;
  name: string;
  class_id?: string;
  class_name?: string;
  user_id?: string;
  admission_year?: string;
  gender?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface UpdateStudentInput {
  name?: string;
  class_id?: string;
  class_name?: string;
  admission_year?: string;
  gender?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface StudentStatistics {
  totalCount: number;
  classDistribution: Array<{ className: string; count: number }>;
  genderDistribution: Array<{ gender: string; count: number }>;
  admissionYearDistribution: Array<{ year: string; count: number }>;
  averageGrade?: number;
  recentPerformance?: Array<{
    studentId: string;
    studentName: string;
    averageScore: number;
    trend: "up" | "down" | "stable";
  }>;
}

interface StudentProfile {
  student: Student;
  gradeStatistics: {
    totalExams: number;
    averageScore: number;
    bestSubject: string;
    weakestSubject: string;
    recentTrend: "up" | "down" | "stable";
  };
  recentGrades: Array<{
    examTitle: string;
    subject: string;
    score: number;
    date: string;
  }>;
}

export class StudentDataService {
  private static instance: StudentDataService;

  // 单例模式
  public static getInstance(): StudentDataService {
    if (!StudentDataService.instance) {
      StudentDataService.instance = new StudentDataService();
    }
    return StudentDataService.instance;
  }

  private constructor() {
    console.log("[StudentDataService] 服务初始化");
  }

  /**
   * 获取学生列表
   */
  async getStudents(filter?: StudentFilter): Promise<Student[]> {
    try {
      console.log("[StudentDataService] 获取学生列表，筛选条件:", filter);

      // 转换筛选条件格式
      const dataFilter = {
        studentId: filter?.studentId,
        classId: filter?.classId,
        className: filter?.className,
        name: filter?.name,
        admissionYear: filter?.admissionYear,
        gender: filter?.gender,
        limit: filter?.limit || 100,
        offset: filter?.offset || 0,
        orderBy: filter?.orderBy || "created_at",
        orderDirection: filter?.orderDirection || "desc",
      };

      // 通过DataGateway获取数据
      const response = await getDataGateway().getStudents(dataFilter);

      if (response.error) {
        console.error("[StudentDataService] 获取学生列表失败:", response.error);
        toast.error("获取学生列表失败");
        return [];
      }

      console.log(`[StudentDataService] 获取到 ${response.data.length} 个学生`);
      return response.data;
    } catch (error) {
      console.error("[StudentDataService] getStudents 异常:", error);
      toast.error("获取学生列表失败");
      return [];
    }
  }

  /**
   * 根据ID获取学生详情
   */
  async getStudentById(studentId: string): Promise<Student | null> {
    try {
      console.log("[StudentDataService] 获取学生详情:", studentId);

      const response = await getDataGateway().getStudents({
        studentId,
        limit: 1,
      });

      if (response.error) {
        console.error("[StudentDataService] 获取学生详情失败:", response.error);
        toast.error("获取学生详情失败");
        return null;
      }

      return response.data[0] || null;
    } catch (error) {
      console.error("[StudentDataService] getStudentById 异常:", error);
      toast.error("获取学生详情失败");
      return null;
    }
  }

  /**
   * 根据学号获取学生
   */
  async getStudentByStudentId(studentId: string): Promise<Student | null> {
    try {
      console.log("[StudentDataService] 根据学号获取学生:", studentId);

      const students = await this.getStudents({ studentId });
      return students[0] || null;
    } catch (error) {
      console.error("[StudentDataService] getStudentByStudentId 异常:", error);
      return null;
    }
  }

  /**
   * 创建学生
   */
  async createStudent(
    studentData: CreateStudentInput
  ): Promise<Student | null> {
    try {
      console.log("[StudentDataService] 创建学生:", studentData.name);

      // 检查学号是否已存在
      const existingStudent = await this.getStudentByStudentId(
        studentData.student_id
      );
      if (existingStudent) {
        toast.error("学号已存在");
        return null;
      }

      const newStudent = await getDataGateway().createStudent({
        student_id: studentData.student_id,
        name: studentData.name,
        class_id: studentData.class_id,
        class_name: studentData.class_name,
        user_id: studentData.user_id,
        admission_year: studentData.admission_year,
        gender: studentData.gender,
        contact_phone: studentData.contact_phone,
        contact_email: studentData.contact_email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      toast.success("学生创建成功");
      console.log("[StudentDataService] 学生创建成功:", newStudent.id);

      return newStudent;
    } catch (error) {
      console.error("[StudentDataService] 创建学生失败:", error);
      toast.error("创建学生失败");
      return null;
    }
  }

  /**
   * 更新学生信息
   */
  async updateStudent(
    studentId: string,
    studentData: UpdateStudentInput
  ): Promise<Student | null> {
    try {
      console.log("[StudentDataService] 更新学生信息:", studentId);

      const updatedStudent = await getDataGateway().updateStudent(studentId, {
        ...studentData,
        updated_at: new Date().toISOString(),
      });

      toast.success("学生信息更新成功");
      console.log("[StudentDataService] 学生信息更新成功:", studentId);

      return updatedStudent;
    } catch (error) {
      console.error("[StudentDataService] 更新学生信息失败:", error);
      toast.error("更新学生信息失败");
      return null;
    }
  }

  /**
   * 删除学生
   */
  async deleteStudent(studentId: string): Promise<boolean> {
    try {
      console.log("[StudentDataService] 删除学生:", studentId);

      const success = await getDataGateway().deleteStudent(studentId);

      if (success) {
        toast.success("学生删除成功");
        console.log("[StudentDataService] 学生删除成功:", studentId);
      } else {
        toast.error("删除学生失败");
      }

      return success;
    } catch (error) {
      console.error("[StudentDataService] 删除学生失败:", error);
      toast.error("删除学生失败");
      return false;
    }
  }

  /**
   * 批量导入学生
   */
  async batchImportStudents(
    students: CreateStudentInput[]
  ): Promise<Student[]> {
    try {
      console.log("[StudentDataService] 批量导入学生:", students.length);

      // 检查学号重复
      const studentIds = students.map((s) => s.student_id);
      const duplicateCheck = new Set();
      const duplicates: string[] = [];

      for (const id of studentIds) {
        if (duplicateCheck.has(id)) {
          duplicates.push(id);
        } else {
          duplicateCheck.add(id);
        }
      }

      if (duplicates.length > 0) {
        toast.error(`发现重复学号: ${duplicates.join(", ")}`);
        return [];
      }

      // 检查数据库中是否存在
      const existingStudents = await this.getStudents({ limit: 1000 });
      const existingIds = new Set(existingStudents.map((s) => s.student_id));
      const conflicts = studentIds.filter((id) => existingIds.has(id));

      if (conflicts.length > 0) {
        toast.error(`以下学号已存在: ${conflicts.join(", ")}`);
        return [];
      }

      const enrichedStudents = students.map((student) => ({
        ...student,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const results = await getDataGateway().batchOperation(
        "create",
        enrichedStudents
      );

      toast.success(`成功导入${results.length}个学生`);
      console.log("[StudentDataService] 批量导入成功");

      return results;
    } catch (error) {
      console.error("[StudentDataService] 批量导入学生失败:", error);
      toast.error("批量导入学生失败");
      return [];
    }
  }

  /**
   * 获取学生统计信息
   */
  async getStudentStatistics(
    filter?: StudentFilter
  ): Promise<StudentStatistics | null> {
    try {
      console.log("[StudentDataService] 获取学生统计");

      const students = await this.getStudents(filter);
      if (students.length === 0) {
        return null;
      }

      // 班级分布
      const classDistribution = this.calculateClassDistribution(students);

      // 性别分布
      const genderDistribution = this.calculateGenderDistribution(students);

      // 入学年份分布
      const admissionYearDistribution =
        this.calculateAdmissionYearDistribution(students);

      const statistics: StudentStatistics = {
        totalCount: students.length,
        classDistribution,
        genderDistribution,
        admissionYearDistribution,
      };

      console.log("[StudentDataService] 学生统计数据计算完成");
      return statistics;
    } catch (error) {
      console.error("[StudentDataService] 获取学生统计失败:", error);
      return null;
    }
  }

  /**
   * 获取学生完整档案
   */
  async getStudentProfile(studentId: string): Promise<StudentProfile | null> {
    try {
      console.log("[StudentDataService] 获取学生完整档案:", studentId);

      // 获取学生基本信息
      const student = await this.getStudentById(studentId);
      if (!student) {
        toast.error("学生不存在");
        return null;
      }

      // 获取学生成绩统计（需要通过DataGateway获取成绩数据）
      const gradeStats = await getDataGateway().getStatistics(
        "student",
        studentId
      );

      // 获取最近成绩（需要通过DataGateway获取成绩数据）
      const recentGrades = await getDataGateway().getGrades({
        studentId,
        limit: 10,
        orderBy: "created_at",
        orderDirection: "desc",
      });

      const profile: StudentProfile = {
        student,
        gradeStatistics: {
          totalExams: gradeStats?.totalExams || 0,
          averageScore: gradeStats?.averageScore || 0,
          bestSubject: gradeStats?.bestSubject || "",
          weakestSubject: gradeStats?.weakestSubject || "",
          recentTrend: gradeStats?.trend || "stable",
        },
        recentGrades:
          recentGrades.data?.slice(0, 5).map((grade: any) => ({
            examTitle: grade.exam_title || "",
            subject: grade.subject_code || "",
            score: grade.score || 0,
            date: grade.created_at || "",
          })) || [],
      };

      console.log("[StudentDataService] 学生档案获取完成");
      return profile;
    } catch (error) {
      console.error("[StudentDataService] 获取学生档案失败:", error);
      toast.error("获取学生档案失败");
      return null;
    }
  }

  /**
   * 按班级获取学生列表
   */
  async getStudentsByClass(className: string): Promise<Student[]> {
    try {
      console.log("[StudentDataService] 获取班级学生:", className);
      return this.getStudents({ className });
    } catch (error) {
      console.error("[StudentDataService] 获取班级学生失败:", error);
      return [];
    }
  }

  /**
   * 搜索学生（支持姓名、学号模糊搜索）
   */
  async searchStudents(keyword: string): Promise<Student[]> {
    try {
      console.log("[StudentDataService] 搜索学生:", keyword);

      const students = await this.getStudents({ limit: 1000 });

      // 前端过滤（简单实现，实际应该在数据库层面进行）
      const filtered = students.filter(
        (student) =>
          student.name.includes(keyword) || student.student_id.includes(keyword)
      );

      console.log(`[StudentDataService] 搜索结果: ${filtered.length} 个学生`);
      return filtered;
    } catch (error) {
      console.error("[StudentDataService] 搜索学生失败:", error);
      return [];
    }
  }

  // 私有辅助方法
  private calculateClassDistribution(
    students: Student[]
  ): Array<{ className: string; count: number }> {
    const classCount = students.reduce(
      (acc, student) => {
        const className = student.class_name || "未分班";
        acc[className] = (acc[className] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(classCount).map(([className, count]) => ({
      className,
      count,
    }));
  }

  private calculateGenderDistribution(
    students: Student[]
  ): Array<{ gender: string; count: number }> {
    const genderCount = students.reduce(
      (acc, student) => {
        const gender = student.gender || "未知";
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(genderCount).map(([gender, count]) => ({
      gender,
      count,
    }));
  }

  private calculateAdmissionYearDistribution(
    students: Student[]
  ): Array<{ year: string; count: number }> {
    const yearCount = students.reduce(
      (acc, student) => {
        const year = student.admission_year || "未知";
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(yearCount)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year.localeCompare(a.year));
  }
}

// 导出单例实例
export const studentDataService = StudentDataService.getInstance();
