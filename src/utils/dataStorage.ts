import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateImportedData } from './gradeValidation';

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

interface ProcessingResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
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
    let classId = null;
    if (student.class_name && student.grade) {
      try {
        const classData = await saveClassData(student.class_name, student.grade);
        classId = classData.id;
      } catch (error) {
        const { data } = await supabase
          .from('classes')
          .select('id')
          .eq('name', student.class_name)
          .eq('grade', student.grade)
          .single();
        if (data) classId = data.id;
      }
    }

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
    const { data: studentData } = await supabase
      .from('students')
      .select('id')
      .eq('student_id', grade.student_id)
      .single();
      
    if (!studentData) {
      throw new Error(`未找到学生信息: ${grade.student_id}`);
    }

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

export async function processAndSaveData(data: any[]): Promise<ProcessingResult> {
  const results: ProcessingResult = {
    success: 0,
    failed: 0,
    total: data.length,
    errors: []
  };

  const { validData, errors } = validateImportedData(data);
  
  if (errors.length > 0) {
    errors.forEach(error => {
      results.errors.push(`第${error.row}行: ${error.errors.join(', ')}`);
    });
    results.failed += errors.length;
    
    if (validData.length === 0) {
      toast.error("数据验证失败", {
        description: "所有数据都未通过验证，请检查数据格式"
      });
      return results;
    }
  }

  const uniqueClasses = new Set<string>();
  const classGrades = new Map<string, string>();
  
  validData.forEach(record => {
    if (record.class_name) {
      uniqueClasses.add(record.class_name);
      if (record.grade) classGrades.set(record.class_name, record.grade);
    }
  });

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

  for (const record of validData) {
    try {
      const savedStudent = await saveStudentData({
        student_id: record.student_id,
        name: record.name,
        class_name: record.class_name,
        grade: record.grade
      });

      if (savedStudent) {
        await saveGradeData({
          student_id: record.student_id,
          subject: record.subject,
          score: record.score,
          exam_date: record.exam_date,
          exam_type: record.exam_type
        });
        results.success++;
      }
    } catch (error) {
      console.error('处理记录失败:', error);
      results.failed++;
      results.errors.push(`记录 ${record.student_id} 处理失败`);
    }
  }

  if (results.failed > 0) {
    toast.warning(`部分数据导入失败`, {
      description: `成功: ${results.success}条, 失败: ${results.failed}条`
    });
  } else if (results.success > 0) {
    toast.success(`数据导入成功`, {
      description: `已导入${results.success}条记录`
    });
  }

  return results;
}
