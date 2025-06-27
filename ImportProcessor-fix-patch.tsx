/**
 * 🚑 ImportProcessor 修复补丁
 * 
 * 使用方法：
 * 1. 在ImportProcessor.tsx中添加这些修复函数
 * 2. 替换有问题的查询逻辑
 * 3. 避免406错误，让导入功能正常工作
 */

import { supabase } from '@/integrations/supabase/client';

// 🚑 修复1: 安全的考试查询（避免subject字段问题）
const checkExamDuplicateSafe = async (examInfo: ExamInfo) => {
  try {
    console.log('检查考试重复，使用安全查询...');
    
    const { data, error } = await supabase
      .from('exams')
      .select('id, title, type, date, created_at, updated_at, created_by')
      .eq('title', examInfo.title)
      .eq('type', examInfo.type)
      .eq('date', examInfo.date);
    
    if (error) {
      console.error('安全考试查询失败:', error);
      return { data: null, error };
    }
    
    console.log('安全考试查询成功:', data?.length || 0, '条记录');
    return { data, error: null };
    
  } catch (err) {
    console.error('考试查询异常:', err);
    return { data: null, error: err };
  }
};

// 🚑 修复2: 安全的成绩数据查询
const checkGradeDataDuplicateSafe = async (examId: string, studentId: string) => {
  try {
    console.log('检查成绩重复，学生:', studentId);
    
    const { data, error } = await supabase
      .from('grade_data')
      .select('id, student_id, exam_id')
      .eq('exam_id', examId)
      .eq('student_id', studentId);
    
    if (error) {
      console.error('成绩查询失败:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
    
  } catch (err) {
    console.error('成绩查询异常:', err);
    return { data: null, error: err };
  }
};

// 🚑 修复3: 安全的成绩数据插入
const insertGradeDataSafe = async (gradeRecord: any) => {
  try {
    console.log('安全插入成绩数据，学生:', gradeRecord.student_id);
    
    // 构建安全的数据记录，只使用确认存在的字段
    const safeRecord = {
      exam_id: gradeRecord.exam_id,
      student_id: gradeRecord.student_id,
      name: gradeRecord.name,
      class_name: gradeRecord.class_name,
      
      // 成绩数据 - 使用已确认存在的字段
      total_score: gradeRecord.total_score || gradeRecord.score || null,
      score: gradeRecord.score || gradeRecord.total_score || null,
      grade: gradeRecord.grade || null,
      
      // 排名数据
      rank_in_class: gradeRecord.rank_in_class || null,
      rank_in_grade: gradeRecord.rank_in_grade || null,
      rank_in_school: gradeRecord.rank_in_school || null,
      
      // 考试信息
      exam_title: gradeRecord.exam_title || '',
      exam_type: gradeRecord.exam_type || '',
      exam_date: gradeRecord.exam_date || null,
      
      // 科目信息（如果需要）
      subject: gradeRecord.subject || '',
      
      // 元数据
      metadata: gradeRecord.metadata || {},
      
      // 时间戳
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 如果有具体的科目分数，尝试存储到custom字段
    if (gradeRecord.chinese_score) {
      safeRecord['custom_1d8d05c1-e4d7-4c79-ab48-f3063656be90'] = gradeRecord.chinese_score;
    }
    if (gradeRecord.math_score) {
      safeRecord['custom_c316f6bf-684e-4d2a-b510-2ab1e33911e2'] = gradeRecord.math_score;
    }
    if (gradeRecord.english_score) {
      safeRecord['custom_0afe3098-4bc1-498f-8b66-9cdc19039acf'] = gradeRecord.english_score;
    }
    
    const { data, error } = await supabase
      .from('grade_data')
      .insert(safeRecord)
      .select('id, student_id, name, total_score')
      .single();
    
    if (error) {
      console.error('成绩插入失败:', error);
      return { data: null, error };
    }
    
    console.log('成绩插入成功:', data);
    return { data, error: null };
    
  } catch (err) {
    console.error('成绩插入异常:', err);
    return { data: null, error: err };
  }
};

// 🚑 修复4: 安全的考试创建
const createExamSafe = async (examInfo: ExamInfo) => {
  try {
    console.log('安全创建考试:', examInfo.title);
    
    const examRecord = {
      title: examInfo.title,
      type: examInfo.type,
      date: examInfo.date,
      // 不包含subject字段，避免查询问题
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('exams')
      .insert(examRecord)
      .select('id, title, type, date')
      .single();
    
    if (error) {
      console.error('考试创建失败:', error);
      return { data: null, error };
    }
    
    console.log('考试创建成功:', data);
    return { data, error: null };
    
  } catch (err) {
    console.error('考试创建异常:', err);
    return { data: null, error: err };
  }
};

// 🚑 修复5: 替换原有的导入逻辑
const performSafeImport = async (validData: any[], examInfo: ExamInfo, progressCallback?: (progress: any) => void) => {
  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];
  
  try {
    // 1. 安全检查考试是否存在
    let examRecord;
    const duplicateCheck = await checkExamDuplicateSafe(examInfo);
    
    if (duplicateCheck.error) {
      throw new Error(`考试检查失败: ${duplicateCheck.error.message}`);
    }
    
    if (duplicateCheck.data && duplicateCheck.data.length > 0) {
      examRecord = duplicateCheck.data[0];
      console.log('使用现有考试:', examRecord.id);
    } else {
      // 创建新考试
      const createResult = await createExamSafe(examInfo);
      if (createResult.error) {
        throw new Error(`考试创建失败: ${createResult.error.message}`);
      }
      examRecord = createResult.data;
      console.log('创建新考试:', examRecord.id);
    }
    
    // 2. 安全导入成绩数据
    const total = validData.length;
    
    for (let i = 0; i < validData.length; i++) {
      const record = validData[i];
      
      try {
        // 检查是否已存在
        const existingCheck = await checkGradeDataDuplicateSafe(examRecord.id, record.student_id);
        
        if (existingCheck.data && existingCheck.data.length > 0) {
          console.log(`跳过重复记录: ${record.student_id}`);
          continue;
        }
        
        // 安全插入
        const gradeRecord = {
          ...record,
          exam_id: examRecord.id,
          exam_title: examRecord.title,
          exam_type: examRecord.type,
          exam_date: examRecord.date
        };
        
        const insertResult = await insertGradeDataSafe(gradeRecord);
        
        if (insertResult.error) {
          errorCount++;
          errors.push(`学生 ${record.student_id}: ${insertResult.error.message}`);
        } else {
          successCount++;
        }
        
        // 更新进度
        if (progressCallback) {
          progressCallback({
            total,
            processed: i + 1,
            successful: successCount,
            failed: errorCount,
            percentage: Math.round(((i + 1) / total) * 100)
          });
        }
        
        // 添加小延迟避免过快请求
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (recordError) {
        errorCount++;
        errors.push(`学生 ${record.student_id}: ${recordError.message}`);
        console.error(`处理记录失败:`, recordError);
      }
    }
    
    return {
      success: true,
      successCount,
      errorCount,
      errors,
      examId: examRecord.id
    };
    
  } catch (error) {
    console.error('导入过程失败:', error);
    return {
      success: false,
      successCount,
      errorCount,
      errors: [...errors, error.message],
      examId: null
    };
  }
};

// 🚑 使用示例：在ImportProcessor组件中替换相关函数
/*
// 在handleImport函数中替换为：
const importResult = await performSafeImport(
  validData, 
  examInfo, 
  (progress) => setImportProgress(progress)
);

if (importResult.success) {
  toast.success(`导入完成！成功 ${importResult.successCount} 条，失败 ${importResult.errorCount} 条`);
  onImportComplete({
    success: true,
    successCount: importResult.successCount,
    errorCount: importResult.errorCount,
    errors: importResult.errors
  });
} else {
  toast.error('导入失败，请检查数据格式');
  onError('导入过程中发生错误');
}
*/

export {
  checkExamDuplicateSafe,
  checkGradeDataDuplicateSafe,
  insertGradeDataSafe,
  createExamSafe,
  performSafeImport
};