
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Grade management functions
export const gradeUtils = {
  // Save imported grade data
  async saveGradeData(data: any[]) {
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
        errors: [] as string[]
      };
      
      // 批量处理数据
      for (const item of data) {
        try {
          // 1. 检查/创建学生记录
          let dbStudentId = null;
          // 查询是否已存在该student_id
          const { data: existingStudent, error: studentError } = await supabase
            .from('students')
            .select('id, student_id')
            .eq('student_id', item.studentId)
            .maybeSingle();
          
          if (studentError) throw studentError;
          
          if (existingStudent) {
            dbStudentId = existingStudent.id;
          } else {
            const { data: newStudent, error: createError } = await supabase
              .from('students')
              .insert({
                name: item.name,
                student_id: item.studentId
              })
              .select('id, student_id')
              .single();
            
            if (createError) throw createError;
            dbStudentId = newStudent.id;
          }
          
          // 2. 创建成绩记录
          const { error: gradeError } = await supabase
            .from('grades')
            .insert({
              student_id: dbStudentId,
              subject: item.subject,
              score: item.score,
              exam_date: item.examDate || null,
              exam_type: item.examType || null
            });
          
          if (gradeError) throw gradeError;
          
          results.success++;
        } catch (error: any) {
          console.error(`处理记录失败:`, item, error);
          results.errors.push(`学生 ${item.name}(${item.studentId}) 的 ${item.subject} 成绩保存失败: ${error.message}`);
        }
      }
      
      return results;
    } catch (error: any) {
      console.error('保存成绩数据失败:', error);
      toast.error('保存成绩数据失败');
      throw error;
    }
  },

  // 获取学生成绩趋势
  async getStudentPerformanceOverTime(studentId: string) {
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
  async getClassPerformanceBySubject(className?: string) {
    try {
      if (!className) {
        const { data, error } = await supabase
          .from('grades')
          .select('subject, score');
        
        if (error) throw error;
        
        const subjectGroups: Record<string, number[]> = {};
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
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id')
          .eq('name', className)
          .maybeSingle();
        
        if (classError) throw classError;
        
        if (!classData) return [];
        
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classData.id);
        
        if (studentsError) throw studentsError;
        
        if (!studentsData || studentsData.length === 0) return [];
        
        const studentIds = studentsData.map(s => s.id);
        const { data: gradesData, error: gradesError } = await supabase
          .from('grades')
          .select('subject, score')
          .in('student_id', studentIds);
        
        if (gradesError) throw gradesError;
        
        const subjectGroups: Record<string, number[]> = {};
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
  }
};
