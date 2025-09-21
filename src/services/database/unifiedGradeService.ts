/**
 * 统一成绩数据访问服务
 * 解决 grade_data、grade_data_new、grades 表的命名混乱问题
 */
import { supabase } from "@/integrations/supabase/client";

// 统一的成绩数据类型
export interface UnifiedGradeData {
  id: string;
  student_id: string;
  name?: string;
  class_name?: string;
  exam_id?: string;
  exam_title?: string;
  exam_type?: string;
  exam_date?: string;
  subject?: string;
  score: number;
  max_score?: number;
  grade?: string;
  rank_in_class?: number;
  rank_in_grade?: number;
  rank_in_school?: number;
  created_at?: string;
}

// 综合成绩数据类型 (多科目)
export interface ComprehensiveGradeData {
  id: string;
  exam_id: string;
  student_id: string;
  name: string;
  class_name: string;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  total_score: number;
  total_max_score: number;
  total_grade: string;
  total_rank_in_class: number;
  total_rank_in_school: number;
  total_rank_in_grade: number;
  // 各科目成绩
  chinese_score?: number;
  chinese_grade?: string;
  chinese_rank_in_class?: number;
  math_score?: number;
  math_grade?: string;
  math_rank_in_class?: number;
  english_score?: number;
  english_grade?: string;
  english_rank_in_class?: number;
  physics_score?: number;
  chemistry_score?: number;
  biology_score?: number;
  history_score?: number;
  geography_score?: number;
  politics_score?: number;
  created_at: string;
  updated_at: string;
}

export class UnifiedGradeService {
  
  /**
   * 获取综合成绩数据 (多科目一体化)
   * 使用 grade_data_new 表
   */
  static async getComprehensiveGrades(filters: {
    student_id?: string;
    class_name?: string;
    exam_id?: string;
    exam_type?: string;
    limit?: number;
  } = {}): Promise<ComprehensiveGradeData[]> {
    try {
      let query = supabase.from('grade_data_new').select('*');
      
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters.class_name) {
        query = query.eq('class_name', filters.class_name);
      }
      if (filters.exam_id) {
        query = query.eq('exam_id', filters.exam_id);
      }
      if (filters.exam_type) {
        query = query.eq('exam_type', filters.exam_type);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      query = query.order('exam_date', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('获取综合成绩数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取单科目成绩数据
   * 使用 grades 表
   */
  static async getSubjectGrades(filters: {
    student_id?: string;
    subject?: string;
    exam_type?: string;
    exam_title?: string;
    limit?: number;
  } = {}): Promise<UnifiedGradeData[]> {
    try {
      let query = supabase.from('grades').select('*');
      
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters.subject) {
        query = query.eq('subject', filters.subject);
      }
      if (filters.exam_type) {
        query = query.eq('exam_type', filters.exam_type);
      }
      if (filters.exam_title) {
        query = query.eq('exam_title', filters.exam_title);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      query = query.order('exam_date', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('获取单科目成绩数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取作业成绩数据
   * 使用 homework_submissions 表
   */
  static async getHomeworkScores(filters: {
    student_id?: string;
    homework_id?: string;
    status?: string;
    limit?: number;
  } = {}) {
    try {
      let query = supabase
        .from('homework_submissions')
        .select(`
          id,
          homework_id,
          student_id,
          score,
          grade,
          status,
          teacher_feedback,
          submitted_at,
          updated_at,
          homework:homework_id (
            id,
            title,
            due_date
          )
        `);
      
      if (filters.student_id) {
        query = query.eq('student_id', filters.student_id);
      }
      if (filters.homework_id) {
        query = query.eq('homework_id', filters.homework_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      query = query.order('submitted_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('获取作业成绩数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取学生最近的成绩数据 (用于学生画像)
   * 自动选择最合适的数据源
   */
  static async getStudentRecentScores(student_id: string, limit: number = 10): Promise<UnifiedGradeData[]> {
    try {
      // 优先使用综合成绩数据
      const comprehensiveScores = await this.getComprehensiveGrades({
        student_id,
        limit: Math.ceil(limit / 2)
      });
      
      // 如果综合成绩不足，补充单科目成绩
      if (comprehensiveScores.length < limit) {
        const subjectScores = await this.getSubjectGrades({
          student_id,
          limit: limit - comprehensiveScores.length
        });
        
        // 转换为统一格式
        const unifiedSubjectScores: UnifiedGradeData[] = subjectScores.map(score => ({
          id: score.id,
          student_id: score.student_id,
          subject: score.subject,
          score: score.score,
          max_score: score.max_score,
          grade: score.grade_level, // 注意：grades表中是grade_level字段
          rank_in_class: score.rank_in_class,
          rank_in_grade: score.rank_in_grade,
          exam_title: score.exam_title,
          exam_type: score.exam_type,
          exam_date: score.exam_date,
          created_at: score.created_at
        }));
        
        return [...this.transformComprehensiveToUnified(comprehensiveScores), ...unifiedSubjectScores]
          .sort((a, b) => new Date(b.exam_date || b.created_at || 0).getTime() - 
                          new Date(a.exam_date || a.created_at || 0).getTime())
          .slice(0, limit);
      }
      
      return this.transformComprehensiveToUnified(comprehensiveScores);
    } catch (error) {
      console.error('获取学生最近成绩失败:', error);
      // 降级到单科目成绩
      return await this.getSubjectGrades({ student_id, limit });
    }
  }

  /**
   * 转换综合成绩为统一格式 (取总分)
   */
  private static transformComprehensiveToUnified(comprehensiveScores: ComprehensiveGradeData[]): UnifiedGradeData[] {
    return comprehensiveScores.map(score => ({
      id: score.id,
      student_id: score.student_id,
      name: score.name,
      class_name: score.class_name,
      exam_id: score.exam_id,
      exam_title: score.exam_title,
      exam_type: score.exam_type,
      exam_date: score.exam_date,
      subject: '总分',
      score: score.total_score,
      max_score: score.total_max_score,
      grade: score.total_grade,
      rank_in_class: score.total_rank_in_class,
      rank_in_grade: score.total_rank_in_grade,
      rank_in_school: score.total_rank_in_school,
      created_at: score.created_at
    }));
  }

  /**
   * 获取班级平均分统计
   */
  static async getClassAverageStats(class_name: string) {
    try {
      // 使用综合成绩表计算
      const { data, error } = await supabase
        .from('grade_data_new')
        .select('total_score, chinese_score, math_score, english_score, physics_score, chemistry_score')
        .eq('class_name', class_name);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          totalAvg: 0,
          subjectAvgs: {},
          studentCount: 0
        };
      }
      
      const subjects = ['chinese', 'math', 'english', 'physics', 'chemistry'];
      const subjectAvgs: Record<string, number> = {};
      
      subjects.forEach(subject => {
        const scores = data
          .map(row => row[`${subject}_score`])
          .filter(score => score != null && score > 0);
          
        subjectAvgs[subject] = scores.length > 0 
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
          : 0;
      });
      
      const totalScores = data
        .map(row => row.total_score)
        .filter(score => score != null && score > 0);
        
      return {
        totalAvg: totalScores.length > 0 
          ? totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length 
          : 0,
        subjectAvgs,
        studentCount: data.length
      };
      
    } catch (error) {
      console.error('获取班级平均分统计失败:', error);
      throw error;
    }
  }

  /**
   * 兼容性方法：处理旧代码中对grade_data表的引用
   * @deprecated 请使用getComprehensiveGrades替代
   */
  static async getGradeData(filters: any = {}) {
    console.warn('⚠️ getGradeData 方法已废弃，请使用 getComprehensiveGrades');
    return await this.getComprehensiveGrades(filters);
  }
}

// 导出兼容性常量
export const GRADE_TABLES = {
  COMPREHENSIVE: 'grade_data_new', // 多科目综合成绩
  SUBJECT: 'grades',               // 单科目成绩  
  HOMEWORK: 'homework_submissions' // 作业成绩
} as const;

// 默认导出
export default UnifiedGradeService;