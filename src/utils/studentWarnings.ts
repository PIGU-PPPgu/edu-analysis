
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const studentWarnings = {
  // 获取学生预警列表
  async getStudentWarnings() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          student_id,
          grades (
            subject,
            score,
            exam_date,
            exam_type
          )
        `)
        .order('name');
      
      if (error) throw error;
      
      if (!data || data.length === 0) return [];
      
      // 计算预警学生
      const warningStudents = data.map(student => {
        const grades = student.grades || [];
        if (grades.length === 0) return null;
        
        // 计算不及格科目
        const warningSubjects = grades
          .filter(grade => grade.score < 60)
          .map(grade => grade.subject);
        
        if (warningSubjects.length === 0) return null;
        
        // 计算风险等级
        let riskLevel = 'low';
        if (warningSubjects.length >= 3) {
          riskLevel = 'high';
        } else if (warningSubjects.length >= 2) {
          riskLevel = 'medium';
        }
        
        // 计算趋势 (如果有多个考试的成绩)
        const sortedGrades = [...grades].sort((a, b) => 
          new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
        );
        
        let trend = 'stable';
        if (sortedGrades.length >= 2) {
          const firstExam = sortedGrades[0];
          const lastExam = sortedGrades[sortedGrades.length - 1];
          
          if (lastExam.score > firstExam.score + 5) {
            trend = 'up';
          } else if (lastExam.score < firstExam.score - 5) {
            trend = 'down';
          }
        }
        
        return {
          student_id: student.student_id,
          name: student.name,
          risk_level: riskLevel,
          warning_subjects: warningSubjects,
          trend,
          last_update: new Date().toISOString()
        };
      }).filter(Boolean);
      
      return warningStudents;
    } catch (error) {
      console.error('获取预警学生列表失败:', error);
      toast.error('获取预警学生列表失败');
      return [];
    }
  },

  // 获取预警统计信息
  async getWarningStatistics() {
    try {
      const warningStudents = await this.getStudentWarnings();
      
      const highRisk = warningStudents.filter(s => s.risk_level === 'high').length;
      const mediumRisk = warningStudents.filter(s => s.risk_level === 'medium').length;
      const lowRisk = warningStudents.filter(s => s.risk_level === 'low').length;
      
      return {
        high_risk: highRisk,
        medium_risk: mediumRisk,
        low_risk: lowRisk,
        total: warningStudents.length
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

  // 获取风险因素数据
  async getRiskFactors() {
    try {
      // 获取最近一次考试的分数
      const { data: latestGradesData, error: latestGradesError } = await supabase
        .from('grades')
        .select('score')
        .order('exam_date', { ascending: false })
        .limit(100);
      
      if (latestGradesError) throw latestGradesError;
      
      // 如果没有成绩数据，无法计算风险因素
      if (!latestGradesData || latestGradesData.length === 0) {
        return [
          { factor: "出勤率", value: 0 },
          { factor: "作业完成", value: 0 },
          { factor: "考试成绩", value: 0 },
          { factor: "课堂参与", value: 0 },
          { factor: "学习态度", value: 0 }
        ];
      }
      
      // 计算考试成绩风险因素 (不及格率相关)
      const scores = latestGradesData.map(grade => grade.score);
      const failRatio = scores.filter(score => score < 60).length / scores.length;
      const scoreRiskFactor = 100 - Math.round(failRatio * 100);
      
      // 其他风险因素基于成绩风险因素进行模拟
      return [
        { factor: "出勤率", value: Math.min(100, scoreRiskFactor + Math.round(Math.random() * 20)) },
        { factor: "作业完成", value: Math.min(100, scoreRiskFactor - Math.round(Math.random() * 15)) },
        { factor: "考试成绩", value: scoreRiskFactor },
        { factor: "课堂参与", value: Math.min(100, scoreRiskFactor - Math.round(Math.random() * 10)) },
        { factor: "学习态度", value: Math.min(100, scoreRiskFactor + Math.round(Math.random() * 15)) }
      ];
    } catch (error) {
      console.error('获取风险因素数据失败:', error);
      toast.error('获取风险因素数据失败');
      return [];
    }
  }
};
