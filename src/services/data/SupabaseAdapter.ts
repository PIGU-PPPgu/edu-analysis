/**
 * Supabase数据适配器
 * 将Supabase的数据访问方式标准化为统一接口
 */

import { supabase } from "@/integrations/supabase/client";
import {
  DataAdapter,
  DataResponse,
  GradeFilter,
  ExamFilter,
  StudentFilter,
} from "./types";

export class SupabaseAdapter implements DataAdapter {
  constructor(private config: { url: string; key: string }) {
    // 可以在这里初始化特定的Supabase客户端配置
  }

  // 成绩数据相关方法
  async getGrades(filter: GradeFilter): Promise<DataResponse<any>> {
    try {
      console.log("[SupabaseAdapter] 获取成绩数据，筛选条件:", filter);

      let query = supabase
        .from("grade_data_new")
        .select("*", { count: "exact" });

      // 应用筛选条件
      if (filter.studentId) {
        query = query.eq("student_id", filter.studentId);
      }
      if (filter.examId) {
        query = query.eq("exam_id", filter.examId);
      }
      if (filter.examTitle) {
        query = query.eq("exam_title", filter.examTitle);
      }
      if (filter.className) {
        query = query.eq("class_name", filter.className);
      }
      if (filter.dateRange?.from) {
        query = query.gte("exam_date", filter.dateRange.from);
      }
      if (filter.dateRange?.to) {
        query = query.lte("exam_date", filter.dateRange.to);
      }

      // 应用排序
      if (filter.orderBy) {
        query = query.order(filter.orderBy, {
          ascending: filter.orderDirection === "asc",
        });
      } else {
        query = query.order("exam_date", { ascending: false });
      }

      // 应用分页
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      if (filter.offset) {
        query = query.range(
          filter.offset,
          filter.offset + (filter.limit || 50) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("[SupabaseAdapter] 获取成绩数据失败:", error);
        throw error;
      }

      return {
        data: data || [],
        total: count || 0,
        hasMore: filter.limit
          ? (count || 0) > (filter.offset || 0) + (filter.limit || 0)
          : false,
      };
    } catch (error) {
      console.error("[SupabaseAdapter] getGrades error:", error);
      return {
        data: [],
        error: error instanceof Error ? error.message : "获取成绩数据失败",
      };
    }
  }

  async createGrade(data: any): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from("grade_data_new")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("[SupabaseAdapter] createGrade error:", error);
      throw error;
    }
  }

  async updateGrade(id: string, data: any): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from("grade_data_new")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("[SupabaseAdapter] updateGrade error:", error);
      throw error;
    }
  }

  async deleteGrade(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("grade_data_new")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("[SupabaseAdapter] deleteGrade error:", error);
      return false;
    }
  }

  // 考试数据相关方法
  async getExams(filter: ExamFilter): Promise<DataResponse<any>> {
    try {
      console.log("[SupabaseAdapter] 获取考试数据，筛选条件:", filter);

      let query = supabase.from("exams").select("*", { count: "exact" });

      // 应用筛选条件
      if (filter.examId) {
        query = query.eq("id", filter.examId);
      }
      if (filter.title) {
        query = query.ilike("title", `%${filter.title}%`);
      }
      if (filter.type) {
        query = query.eq("type", filter.type);
      }
      if (filter.subject) {
        query = query.eq("subject", filter.subject);
      }
      if (filter.status) {
        query = query.eq("status", filter.status);
      }
      if (filter.termId && filter.termId !== "all") {
        query = query.eq("academic_term_id", filter.termId);
      }
      if (filter.dateRange?.from) {
        query = query.gte("date", filter.dateRange.from);
      }
      if (filter.dateRange?.to) {
        query = query.lte("date", filter.dateRange.to);
      }

      // 应用排序
      if (filter.orderBy) {
        query = query.order(filter.orderBy, {
          ascending: filter.orderDirection === "asc",
        });
      } else {
        query = query.order("date", { ascending: false });
      }

      // 应用分页
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      if (filter.offset) {
        query = query.range(
          filter.offset,
          filter.offset + (filter.limit || 50) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("[SupabaseAdapter] 获取考试数据失败:", error);
        throw error;
      }

      return {
        data: data || [],
        total: count || 0,
        hasMore: filter.limit
          ? (count || 0) > (filter.offset || 0) + (filter.limit || 0)
          : false,
      };
    } catch (error) {
      console.error("[SupabaseAdapter] getExams error:", error);
      return {
        data: [],
        error: error instanceof Error ? error.message : "获取考试数据失败",
      };
    }
  }

  async createExam(data: any): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from("exams")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("[SupabaseAdapter] createExam error:", error);
      throw error;
    }
  }

  async updateExam(id: string, data: any): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from("exams")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("[SupabaseAdapter] updateExam error:", error);
      throw error;
    }
  }

  async deleteExam(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("exams").delete().eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("[SupabaseAdapter] deleteExam error:", error);
      return false;
    }
  }

  // 学生数据相关方法
  async getStudents(filter: StudentFilter): Promise<DataResponse<any>> {
    try {
      console.log("[SupabaseAdapter] 获取学生数据，筛选条件:", filter);

      let query = supabase.from("students").select("*", { count: "exact" });

      // 应用筛选条件
      if (filter.studentId) {
        query = query.eq("student_id", filter.studentId);
      }
      if (filter.name) {
        query = query.ilike("name", `%${filter.name}%`);
      }
      if (filter.className) {
        query = query.eq("class_name", filter.className);
      }
      if (filter.grade) {
        query = query.eq("grade", filter.grade);
      }

      // 应用排序
      if (filter.orderBy) {
        query = query.order(filter.orderBy, {
          ascending: filter.orderDirection === "asc",
        });
      } else {
        query = query.order("name");
      }

      // 应用分页
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      if (filter.offset) {
        query = query.range(
          filter.offset,
          filter.offset + (filter.limit || 50) - 1
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("[SupabaseAdapter] 获取学生数据失败:", error);
        throw error;
      }

      return {
        data: data || [],
        total: count || 0,
        hasMore: filter.limit
          ? (count || 0) > (filter.offset || 0) + (filter.limit || 0)
          : false,
      };
    } catch (error) {
      console.error("[SupabaseAdapter] getStudents error:", error);
      return {
        data: [],
        error: error instanceof Error ? error.message : "获取学生数据失败",
      };
    }
  }

  async createStudent(data: any): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from("students")
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("[SupabaseAdapter] createStudent error:", error);
      throw error;
    }
  }

  async updateStudent(id: string, data: any): Promise<any> {
    try {
      const { data: result, error } = await supabase
        .from("students")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    } catch (error) {
      console.error("[SupabaseAdapter] updateStudent error:", error);
      throw error;
    }
  }

  async deleteStudent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("students").delete().eq("id", id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("[SupabaseAdapter] deleteStudent error:", error);
      return false;
    }
  }

  // 统计数据方法
  async getStatistics(
    type: "exam" | "grade" | "student",
    id?: string
  ): Promise<any> {
    try {
      console.log(`[SupabaseAdapter] 获取${type}统计数据, ID:`, id);

      switch (type) {
        case "exam":
          return await this.getExamStatistics(id);
        case "grade":
          return await this.getGradeStatistics(id);
        case "student":
          return await this.getStudentStatistics(id);
        default:
          throw new Error(`不支持的统计类型: ${type}`);
      }
    } catch (error) {
      console.error("[SupabaseAdapter] getStatistics error:", error);
      throw error;
    }
  }

  private async getExamStatistics(examId?: string): Promise<any> {
    if (!examId) {
      // 获取整体考试统计
      const { data, error } = await supabase
        .from("exams")
        .select("id, title, date", { count: "exact" });

      if (error) throw error;
      return { totalExams: data?.length || 0, exams: data };
    } else {
      // 获取特定考试的统计
      const [examInfo, gradeStats] = await Promise.all([
        supabase.from("exams").select("*").eq("id", examId).single(),
        supabase.from("grade_data_new").select("*").eq("exam_id", examId),
      ]);

      if (examInfo.error) throw examInfo.error;
      if (gradeStats.error) throw gradeStats.error;

      const scores =
        gradeStats.data?.map((g) => g.total_score).filter((s) => s !== null) ||
        [];
      const participantCount = gradeStats.data?.length || 0;
      const averageScore =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0;

      return {
        exam: examInfo.data,
        participantCount,
        averageScore: Math.round(averageScore * 100) / 100,
        maxScore: scores.length > 0 ? Math.max(...scores) : 0,
        minScore: scores.length > 0 ? Math.min(...scores) : 0,
        grades: gradeStats.data,
      };
    }
  }

  private async getGradeStatistics(studentId?: string): Promise<any> {
    // 实现成绩统计逻辑
    const query = supabase.from("grade_data_new").select("*");

    if (studentId) {
      query.eq("student_id", studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      totalRecords: data?.length || 0,
      data: data || [],
    };
  }

  private async getStudentStatistics(classId?: string): Promise<any> {
    // 实现学生统计逻辑
    const query = supabase.from("students").select("*", { count: "exact" });

    if (classId) {
      query.eq("class_id", classId);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      totalStudents: count || 0,
      students: data || [],
    };
  }

  // 批量操作方法
  async batchOperation(
    operation: "create" | "update" | "delete",
    data: any[]
  ): Promise<any[]> {
    try {
      console.log(
        `[SupabaseAdapter] 批量${operation}操作，数据量:`,
        data.length
      );

      // 这里需要根据具体的表和操作类型来实现
      // 暂时返回空数组，后续根据需要实现
      return [];
    } catch (error) {
      console.error("[SupabaseAdapter] batchOperation error:", error);
      throw error;
    }
  }
}
