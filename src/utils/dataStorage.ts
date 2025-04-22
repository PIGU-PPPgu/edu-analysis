
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
    total: data.length,
    errors: [] as string[]
  };

  // 批量处理前先提取所有唯一的班级信息
  const uniqueClasses = new Set<string>();
  const classGrades = new Map<string, string>();
  
  data.forEach(record => {
    const className = record.class_name || record.className || record.班级;
    const grade = record.grade || record.年级;
    if (className) {
      uniqueClasses.add(className);
      if (grade) classGrades.set(className, grade);
    }
  });

  // 预先保存所有班级信息
  const classIds = new Map<string, string>();
  for (const className of uniqueClasses) {
    try {
      const classData = await saveClassData(className, classGrades.get(className) || '');
      if (classData?.id) {
        classIds.set(className, classData.id);
      }
    } catch (error) {
      console.error('保存班级数据失败:', error);
      results.errors.push(`班级 ${className} 保存失败`);
    }
  }

  // 处理每条记录
  for (const record of data) {
    try {
      // 规范化学生信息
      const studentData: StudentData = {
        student_id: record.student_id || record.studentId || record.学号,
        name: record.name || record.student_name || record.姓名,
        class_name: record.class_name || record.className || record.班级,
        grade: record.grade || record.年级
      };

      // 保存学生信息
      const savedStudent = await saveStudentData(studentData);
      if (!savedStudent) continue;

      // 保存成绩信息
      const gradeData: GradeData = {
        student_id: studentData.student_id,
        subject: record.subject || record.科目,
        score: Number(record.score || record.分数),
        exam_date: record.exam_date || record.date || record.考试日期,
        exam_type: record.exam_type || record.type || record.考试类型
      };

      await saveGradeData(gradeData);
      results.success++;
    } catch (error) {
      console.error('处理数据记录失败:', error);
      results.failed++;
      results.errors.push(`记录 ${record.student_id || record.学号} 处理失败`);
    }
  }

  // 显示处理结果通知
  if (results.failed > 0) {
    toast.warning(`部分数据导入失败`, {
      description: `成功: ${results.success}条, 失败: ${results.failed}条`
    });
  } else {
    toast.success(`数据导入成功`, {
      description: `已导入${results.success}条记录`
    });
  }

  return results;
}
