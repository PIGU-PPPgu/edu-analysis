
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentData {
  student_id: string;
  name: string;
  class_name?: string;
  grade?: string;
}

interface GradeData {
  student_id: string;
  subject: string;
  score: number;
  exam_date?: string;
  exam_type?: string;
}

export async function saveClassData(className: string, grade: string) {
  try {
    const { data, error } = await supabase
      .from('classes')
      .insert({ name: className, grade })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('保存班级数据失败:', error);
    throw error;
  }
}

export async function saveStudentData(student: StudentData) {
  try {
    // 如果提供了班级信息，先保存或获取班级ID
    let classId = null;
    if (student.class_name && student.grade) {
      try {
        const classData = await saveClassData(student.class_name, student.grade);
        classId = classData.id;
      } catch (error) {
        // 如果班级已存在，尝试获取已存在的班级ID
        const { data } = await supabase
          .from('classes')
          .select('id')
          .eq('name', student.class_name)
          .eq('grade', student.grade)
          .single();
        if (data) classId = data.id;
      }
    }

    // 保存学生信息
    const { data, error } = await supabase
      .from('students')
      .insert({
        student_id: student.student_id,
        name: student.name,
        class_id: classId
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('保存学生数据失败:', error);
    throw error;
  }
}

export async function saveGradeData(grade: GradeData) {
  try {
    // 获取学生ID
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', grade.student_id)
      .single();
      
    if (!studentData) {
      throw new Error(`未找到学生信息: ${grade.student_id}`);
    }

    // 保存成绩数据
    const { data, error } = await supabase
      .from('grades')
      .insert({
        student_id: studentData.id,
        subject: grade.subject,
        score: grade.score,
        exam_date: grade.exam_date,
        exam_type: grade.exam_type
      })
      .select();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('保存成绩数据失败:', error);
    throw error;
  }
}

export async function processAndSaveData(data: any[]) {
  const results = {
    success: 0,
    failed: 0,
    total: data.length
  };

  for (const record of data) {
    try {
      // 尝试保存学生信息
      await saveStudentData({
        student_id: record.student_id || record.studentId || record.学号,
        name: record.name || record.student_name || record.姓名,
        class_name: record.class_name || record.className || record.班级,
        grade: record.grade || record.年级
      });

      // 保存成绩信息
      await saveGradeData({
        student_id: record.student_id || record.studentId || record.学号,
        subject: record.subject || record.科目,
        score: Number(record.score || record.分数),
        exam_date: record.exam_date || record.date || record.考试日期,
        exam_type: record.exam_type || record.type || record.考试类型
      });

      results.success++;
    } catch (error) {
      console.error('处理数据记录失败:', error);
      results.failed++;
    }
  }

  return results;
}
