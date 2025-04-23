
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// 数据库操作函数
export const db = {
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
      // 在实际应用中，这些应该从相关系统中获取
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
  },
  
  // 获取学生成绩趋势
  async getStudentPerformanceOverTime(studentId) {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('subject, score, exam_date')
        .eq('student_id', studentId)
        .order('exam_date', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('获取学生成绩趋势失败:', error);
      toast.error('获取学生成绩趋势失败');
      return [];
    }
  },

  // 获取班级学科成绩
  async getClassPerformanceBySubject(className) {
    try {
      if (!className) {
        // 获取所有成绩按学科分组
        const { data, error } = await supabase
          .from('grades')
          .select('subject, score');
        
        if (error) throw error;
        
        // 按科目计算平均分
        const subjectGroups = {};
        data?.forEach(item => {
          if (!subjectGroups[item.subject]) {
            subjectGroups[item.subject] = [];
          }
          subjectGroups[item.subject].push(item.score);
        });
        
        return Object.entries(subjectGroups).map(([subject, scores]) => ({
          subject,
          score: scores.reduce((sum, score) => sum + score, 0) / scores.length
        }));
      } else {
        // 获取班级ID
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('name', className)
          .maybeSingle();
        
        if (classError) throw classError;
        
        if (!classData) return [];
        
        // 获取班级学生
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classData.id);
        
        if (studentsError) throw studentsError;
        
        if (!studentsData || studentsData.length === 0) return [];
        
        // 获取班级学生的成绩
        const studentIds = studentsData.map(s => s.id);
        const { data: gradesData, error: gradesError } = await supabase
          .from('grades')
          .select('subject, score')
          .in('student_id', studentIds);
        
        if (gradesError) throw gradesError;
        
        // 按科目计算平均分
        const subjectGroups = {};
        gradesData?.forEach(item => {
          if (!subjectGroups[item.subject]) {
            subjectGroups[item.subject] = [];
          }
          subjectGroups[item.subject].push(item.score);
        });
        
        return Object.entries(subjectGroups).map(([subject, scores]) => ({
          subject,
          score: scores.reduce((sum, score) => sum + score, 0) / scores.length
        }));
      }
    } catch (error) {
      console.error('获取班级学科成绩失败:', error);
      toast.error('获取班级学科成绩失败');
      return [];
    }
  },
  
  // 保存导入的成绩数据
  async saveGradeData(data) {
    try {
      // 检查数据必需的字段
      const requiredFields = ['studentId', 'name', 'subject', 'score'];
      const isValid = data.every(item => 
        requiredFields.every(field => item[field] !== undefined)
      );
      
      if (!isValid) {
        throw new Error('数据格式不正确，缺少必需字段');
      }
      
      // 处理结果统计
      const results = {
        success: 0,
        errors: []
      };
      
      // 批量处理数据
      for (const item of data) {
        try {
          // 1. 检查/创建学生记录
          let studentId;
          const { data: existingStudent, error: studentError } = await supabase
            .from('students')
            .select('id')
            .eq('student_id', item.studentId)
            .maybeSingle();
          
          if (studentError) throw studentError;
          
          if (existingStudent) {
            studentId = existingStudent.id;
          } else {
            // 创建新学生
            const { data: newStudent, error: createError } = await supabase
              .from('students')
              .insert({
                student_id: item.studentId,
                name: item.name
              })
              .select('id')
              .single();
            
            if (createError) throw createError;
            studentId = newStudent.id;
          }
          
          // 2. 创建成绩记录
          const { error: gradeError } = await supabase
            .from('grades')
            .insert({
              student_id: studentId,
              subject: item.subject,
              score: item.score,
              exam_date: item.examDate || null,
              exam_type: item.examType || null
            });
          
          if (gradeError) throw gradeError;
          
          results.success++;
        } catch (error) {
          console.error(`处理记录失败:`, item, error);
          results.errors.push(`学生 ${item.name}(${item.studentId}) 的 ${item.subject} 成绩保存失败: ${error.message}`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('保存成绩数据失败:', error);
      toast.error('保存成绩数据失败');
      throw error;
    }
  }
};
