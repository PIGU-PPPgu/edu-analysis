/**
 * 统一的成绩数据API接口
 * 规范所有的数据查询和处理操作
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  GradeRecord, 
  ExamInfo, 
  GradeStatistics, 
  GradeFilter,
  Subject,
  GradeDataResponse,
  GradeLevelDistribution
} from '@/types/grade';
import { 
  filterBySubject, 
  getSubjectScore, 
  getSubjectGrade, 
  getStudentName,
  getClassName,
  createStandardGradeRecord
} from '@/utils/gradeFieldUtils';
import { calculateGradeLevelDistribution } from '@/utils/gradeUtils';

/**
 * 获取指定考试的成绩数据
 * @param examId 考试ID
 * @param filter 筛选条件
 * @returns 成绩数据响应
 */
export async function fetchGradeData(
  examId?: string, 
  filter?: GradeFilter
): Promise<GradeDataResponse> {
  try {
    let query = supabase
      .from('grade_data')
      .select('*')
      .order('score', { ascending: false });
    
    // 应用筛选条件
    if (examId) {
      query = query.eq('exam_id', examId);
    }
    
    if (filter?.subject) {
      query = query.eq('subject', filter.subject);
    }
    
    if (filter?.class) {
      query = query.eq('class_name', filter.class);
    }
    
    if (filter?.gradeLevel) {
      query = query.eq('grade_level', filter.gradeLevel);
    }
    
    if (filter?.scoreRange) {
      if (filter.scoreRange.min !== undefined) {
        query = query.gte('score', filter.scoreRange.min);
      }
      if (filter.scoreRange.max !== undefined) {
        query = query.lte('score', filter.scoreRange.max);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // 标准化数据格式
    const standardizedData: GradeRecord[] = (data || []).map(record => ({
      id: record.id,
      student_id: record.student_id,
      student_name: getStudentName(record),
      class_name: getClassName(record),
      subject: record.subject || Subject.TOTAL,
      score: record.score || 0,
      grade_level: record.grade_level,
      exam_id: record.exam_id,
      exam_name: record.exam_name,
      exam_date: record.exam_date,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...record // 保留所有原始字段
    }));
    
    return {
      data: standardizedData,
      total: standardizedData.length,
      error: undefined
    };
    
  } catch (error) {
    console.error('获取成绩数据失败:', error);
    return {
      data: [],
      total: 0,
      error: error instanceof Error ? error.message : '获取数据失败'
    };
  }
}

/**
 * 根据科目获取成绩数据
 * @param subject 科目
 * @param examId 考试ID（可选）
 * @returns 成绩数据响应
 */
export async function fetchGradeDataBySubject(
  subject: Subject | string,
  examId?: string
): Promise<GradeDataResponse> {
  return fetchGradeData(examId, { subject });
}

/**
 * 根据班级获取成绩数据
 * @param className 班级名称
 * @param examId 考试ID（可选）
 * @returns 成绩数据响应
 */
export async function fetchGradeDataByClass(
  className: string,
  examId?: string
): Promise<GradeDataResponse> {
  return fetchGradeData(examId, { class: className });
}

/**
 * 获取考试列表
 * @returns 考试信息列表
 */
export async function fetchExamList(): Promise<{ data: ExamInfo[], error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('exam_date', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    const examList: ExamInfo[] = (data || []).map(exam => ({
      id: exam.id,
      name: exam.name || exam.title,
      type: exam.type,
      date: exam.exam_date || exam.date,
      subjects: exam.subjects || [Subject.TOTAL],
      totalStudents: exam.total_students
    }));
    
    return { data: examList };
    
  } catch (error) {
    console.error('获取考试列表失败:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : '获取考试列表失败'
    };
  }
}

/**
 * 获取指定考试的详细信息
 * @param examId 考试ID
 * @returns 考试信息
 */
export async function fetchExamInfo(examId: string): Promise<{ data: ExamInfo | null, error?: string }> {
  try {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return { data: null, error: '考试不存在' };
    }
    
    const examInfo: ExamInfo = {
      id: data.id,
      name: data.name || data.title,
      type: data.type,
      date: data.exam_date || data.date,
      subjects: data.subjects || [Subject.TOTAL],
      totalStudents: data.total_students
    };
    
    return { data: examInfo };
    
  } catch (error) {
    console.error('获取考试信息失败:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : '获取考试信息失败'
    };
  }
}

/**
 * 计算成绩统计
 * @param data 成绩数据
 * @returns 统计信息
 */
export function calculateGradeStatistics(data: GradeRecord[]): GradeStatistics {
  if (!data || data.length === 0) {
    return { 
      total: 0, 
      average: 0, 
      max: 0, 
      min: 0, 
      median: 0,
      standardDeviation: 0,
      passRate: 0, 
      excellentRate: 0,
      distribution: []
    };
  }

  const scores = data.map(item => item.score).filter(score => !isNaN(Number(score)));
  
  if (scores.length === 0) {
    return { 
      total: 0, 
      average: 0, 
      max: 0, 
      min: 0, 
      median: 0,
      standardDeviation: 0,
      passRate: 0, 
      excellentRate: 0,
      distribution: []
    };
  }
  
  // 基础统计
  const total = scores.length;
  const sum = scores.reduce((a, b) => a + Number(b), 0);
  const average = sum / total;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  
  // 中位数
  const sortedScores = [...scores].sort((a, b) => a - b);
  const median = total % 2 === 0 
    ? (sortedScores[total / 2 - 1] + sortedScores[total / 2]) / 2
    : sortedScores[Math.floor(total / 2)];
  
  // 标准差
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / total;
  const standardDeviation = Math.sqrt(variance);
  
  // 及格率和优秀率
  const passCount = scores.filter(score => Number(score) >= 60).length;
  const excellentCount = scores.filter(score => Number(score) >= 90).length;
  const passRate = (passCount / total) * 100;
  const excellentRate = (excellentCount / total) * 100;
  
  // 等级分布
  const subject = data[0]?.subject || Subject.TOTAL;
  const distribution = calculateGradeLevelDistribution(data, subject);
  
  return {
    total,
    average: parseFloat(average.toFixed(2)),
    max,
    min,
    median: parseFloat(median.toFixed(2)),
    standardDeviation: parseFloat(standardDeviation.toFixed(2)),
    passRate: parseFloat(passRate.toFixed(2)),
    excellentRate: parseFloat(excellentRate.toFixed(2)),
    distribution
  };
}

/**
 * 获取班级列表
 * @returns 班级名称列表
 */
export async function fetchClassList(): Promise<{ data: string[], error?: string }> {
  try {
    const { data, error } = await supabase
      .from('grade_data')
      .select('class_name')
      .not('class_name', 'is', null);
    
    if (error) {
      throw error;
    }
    
    const classList = [...new Set((data || []).map(item => item.class_name).filter(Boolean))].sort();
    
    return { data: classList };
    
  } catch (error) {
    console.error('获取班级列表失败:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : '获取班级列表失败'
    };
  }
}

/**
 * 获取科目列表
 * @returns 科目列表
 */
export async function fetchSubjectList(): Promise<{ data: string[], error?: string }> {
  try {
    const { data, error } = await supabase
      .from('grade_data')
      .select('subject')
      .not('subject', 'is', null);
    
    if (error) {
      throw error;
    }
    
    const subjectList = [...new Set((data || []).map(item => item.subject).filter(Boolean))].sort();
    
    return { data: subjectList };
    
  } catch (error) {
    console.error('获取科目列表失败:', error);
    return {
      data: [],
      error: error instanceof Error ? error.message : '获取科目列表失败'
    };
  }
}

/**
 * 批量插入或更新成绩数据
 * @param gradeData 成绩数据数组
 * @returns 操作结果
 */
export async function upsertGradeData(gradeData: GradeRecord[]): Promise<{ success: boolean, error?: string }> {
  try {
    const { error } = await supabase
      .from('grade_data')
      .upsert(gradeData, { 
        onConflict: 'student_id,subject,exam_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      throw error;
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('保存成绩数据失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存数据失败'
    };
  }
}

/**
 * 删除指定考试的成绩数据
 * @param examId 考试ID
 * @returns 操作结果
 */
export async function deleteGradeData(examId: string): Promise<{ success: boolean, error?: string }> {
  try {
    const { error } = await supabase
      .from('grade_data')
      .delete()
      .eq('exam_id', examId);
    
    if (error) {
      throw error;
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('删除成绩数据失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '删除数据失败'
    };
  }
} 