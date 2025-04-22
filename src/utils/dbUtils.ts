
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 数据库操作函数
export const db = {
  // 模拟获取学生预警列表
  async getStudentWarnings() {
    try {
      // 返回模拟数据
      return [
        {
          student_id: "S001",
          name: "张三",
          risk_level: "high",
          warning_subjects: ["数学", "物理"],
          trend: "down",
          last_update: new Date().toISOString()
        },
        {
          student_id: "S002",
          name: "李四",
          risk_level: "medium",
          warning_subjects: ["英语"],
          trend: "up",
          last_update: new Date().toISOString()
        },
        {
          student_id: "S003",
          name: "王五",
          risk_level: "low",
          warning_subjects: ["化学"],
          trend: "stable",
          last_update: new Date().toISOString()
        }
      ];
    } catch (error) {
      console.error('获取预警学生列表失败:', error);
      toast.error('获取预警学生列表失败');
      return [];
    }
  },

  // 获取预警统计信息 (模拟数据)
  async getWarningStatistics() {
    try {
      return {
        high_risk: 5,
        medium_risk: 12,
        low_risk: 24,
        total: 41
      };
    } catch (error) {
      console.error('获取预警统计信息失败:', error);
      toast.error('获取预警统计信息失败');
      return {
        high_risk: 0,
        medium_risk: 0,
        low_risk: 0,
        total: 0
      };
    }
  },

  // 获取风险因素数据 (模拟数据)
  async getRiskFactors() {
    try {
      return [
        { factor: "出勤率", value: 85 },
        { factor: "作业完成", value: 75 },
        { factor: "考试成绩", value: 65 },
        { factor: "课堂参与", value: 70 },
        { factor: "学习态度", value: 80 }
      ];
    } catch (error) {
      console.error('获取风险因素数据失败:', error);
      toast.error('获取风险因素数据失败');
      return [];
    }
  },
  
  // 模拟获取学生成绩趋势
  async getStudentPerformanceOverTime(studentId: string) {
    try {
      // 返回模拟数据
      return [
        { exam_date: '2023-09-15', subject: '数学', score: 85 },
        { exam_date: '2023-10-20', subject: '数学', score: 88 },
        { exam_date: '2023-11-18', subject: '数学', score: 92 },
        { exam_date: '2023-09-15', subject: '语文', score: 78 },
        { exam_date: '2023-10-20', subject: '语文', score: 82 },
        { exam_date: '2023-11-18', subject: '语文', score: 85 },
        { exam_date: '2023-09-15', subject: '英语', score: 90 },
        { exam_date: '2023-10-20', subject: '英语', score: 87 },
        { exam_date: '2023-11-18', subject: '英语', score: 91 }
      ];
    } catch (error) {
      console.error('获取学生成绩趋势失败:', error);
      toast.error('获取学生成绩趋势失败');
      return [];
    }
  },

  // 模拟获取班级学科成绩
  async getClassPerformanceBySubject(className: string) {
    try {
      // 返回模拟数据
      return [
        { subject: '数学', score: 82.5 },
        { subject: '语文', score: 78.3 },
        { subject: '英语', score: 85.7 },
        { subject: '物理', score: 76.8 },
        { subject: '化学', score: 79.2 }
      ];
    } catch (error) {
      console.error('获取班级学科成绩失败:', error);
      toast.error('获取班级学科成绩失败');
      return [];
    }
  }
};
