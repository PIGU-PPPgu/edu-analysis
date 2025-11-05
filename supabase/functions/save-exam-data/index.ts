import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// 数据转换函数：Wide format → Long format
function transformToLongFormat(wideRecord: any): any[] {
  const baseRecord = {
    exam_id: wideRecord.exam_id,
    student_id: wideRecord.student_id,
    name: wideRecord.name,
    class_name: wideRecord.class_name,
    exam_title: wideRecord.exam_title,
    exam_type: wideRecord.exam_type,
    exam_date: wideRecord.exam_date,
    created_at: wideRecord.created_at,
    updated_at: wideRecord.updated_at
  };
  
  const subjects = [
    { name: '总分', scoreField: 'total_score', gradeField: 'total_grade' },
    { name: '语文', scoreField: 'chinese_score', gradeField: 'chinese_grade' },
    { name: '数学', scoreField: 'math_score', gradeField: 'math_grade' },
    { name: '英语', scoreField: 'english_score', gradeField: 'english_grade' },
    { name: '物理', scoreField: 'physics_score', gradeField: 'physics_grade' },
    { name: '化学', scoreField: 'chemistry_score', gradeField: 'chemistry_grade' },
    { name: '道法', scoreField: 'politics_score', gradeField: 'politics_grade' },
    { name: '历史', scoreField: 'history_score', gradeField: 'history_grade' },
    { name: '生物', scoreField: 'biology_score', gradeField: 'biology_grade' },
    { name: '地理', scoreField: 'geography_score', gradeField: 'geography_grade' }
  ];
  
  const longRecords = [];
  
  for (const subject of subjects) {
    const score = wideRecord[subject.scoreField];
    const grade = wideRecord[subject.gradeField];
    
    // 只有当分数存在时才创建记录
    if (score !== null && score !== undefined) {
      longRecords.push({
        ...baseRecord,
        subject: subject.name,
        score: parseFloat(score),
        grade: grade || null,
        max_score: 100 // 默认满分
      });
    }
  }
  
  return longRecords;
}

serve(async (req) => {
  // 处理CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { examData, gradeData } = await req.json();
    
    console.log('[Edge Function] 收到请求:', { 
      examData: examData ? { title: examData.title, type: examData.type } : null,
      gradeDataCount: Array.isArray(gradeData) ? gradeData.length : 0,
      firstRecord: gradeData?.[0] ? Object.keys(gradeData[0]) : []
    });
    
    if (!examData || !examData.title || !examData.type) {
      return new Response(
        JSON.stringify({ error: '考试标题和类型为必填字段' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!Array.isArray(gradeData) || gradeData.length === 0) {
      return new Response(
        JSON.stringify({ error: '未提供有效数据记录' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 生成UUID格式的考试ID（如果没有提供的话）
    const examId = examData.id || examData.exam_id || crypto.randomUUID();
    console.log('[Edge Function] 使用考试ID:', examId);
    
    // 首先确保考试记录存在
    console.log('[Edge Function] 检查考试记录是否存在:', examId);
    
    const { data: existingExam, error: examCheckError } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .maybeSingle(); // 使用maybeSingle而不是single，避免没找到记录时报错
    
    if (!existingExam) {
      console.log('[Edge Function] 考试记录不存在，创建新记录:', examId);
      const { data: newExam, error: examInsertError } = await supabase
        .from('exams')
        .insert({
          id: examId,
          title: examData.title || '未命名考试',
          type: examData.type || '月考',
          date: examData.date || new Date().toISOString().split('T')[0],
          subject: '综合',
          scope: 'all',
          created_at: new Date().toISOString(),
          created_by: crypto.randomUUID()
        })
        .select()
        .single();
      
      if (examInsertError) {
        console.error('[Edge Function] 创建考试记录失败:', examInsertError);
        return new Response(
          JSON.stringify({ 
            error: '创建考试记录失败', 
            details: examInsertError.message 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      } else {
        console.log('[Edge Function] 成功创建考试记录:', newExam);
      }
    } else {
      console.log('[Edge Function] 使用现有考试记录:', existingExam.id);
    }
    
    const results = {
      success: [],
      errors: []
    };
    
    // 处理每条记录
    for (let i = 0; i < gradeData.length; i++) {
      const record = gradeData[i];
      
      try {
        console.log(`[Edge Function] 处理记录 ${i + 1}/${gradeData.length}:`, {
          student_id: record.student_id,
          name: record.name,
          total_score: record.total_score,
          班级: record.class_name
        });
        
        // 详细打印记录结构以便调试
        console.log(`[Edge Function] 完整记录结构:`, Object.keys(record));
        
        // 准备插入数据 - 只包含grade_data表中实际存在的字段
        const mappedRecord = {
          exam_id: examId,
          student_id: record.student_id || record.name || `temp_${Date.now()}`,
          name: record.name || '未知学生',
          class_name: record.class_name || '未知班级',
          exam_title: record.exam_title || examData.title,
          exam_type: record.exam_type || examData.type,
          exam_date: record.exam_date ? new Date(record.exam_date).toISOString().split('T')[0] : null,
          
          // 总分信息
          total_score: record.total_score ? parseFloat(record.total_score) : null,
          total_max_score: record.total_max_score ? parseFloat(record.total_max_score) : null,
          total_grade: record.total_grade || null,
          total_rank_in_class: record.total_rank_in_class ? parseInt(record.total_rank_in_class) : null,
          total_rank_in_school: record.total_rank_in_school ? parseInt(record.total_rank_in_school) : null,
          total_rank_in_grade: record.total_rank_in_grade ? parseInt(record.total_rank_in_grade) : null,
          
          // 各科目成绩
          chinese_score: record.chinese_score ? parseFloat(record.chinese_score) : null,
          chinese_grade: record.chinese_grade || null,
          chinese_rank_in_class: record.chinese_rank_in_class ? parseInt(record.chinese_rank_in_class) : null,
          chinese_rank_in_school: record.chinese_rank_in_school ? parseInt(record.chinese_rank_in_school) : null,
          chinese_rank_in_grade: record.chinese_rank_in_grade ? parseInt(record.chinese_rank_in_grade) : null,
          
          math_score: record.math_score ? parseFloat(record.math_score) : null,
          math_grade: record.math_grade || null,
          math_rank_in_class: record.math_rank_in_class ? parseInt(record.math_rank_in_class) : null,
          math_rank_in_school: record.math_rank_in_school ? parseInt(record.math_rank_in_school) : null,
          math_rank_in_grade: record.math_rank_in_grade ? parseInt(record.math_rank_in_grade) : null,
          
          english_score: record.english_score ? parseFloat(record.english_score) : null,
          english_grade: record.english_grade || null,
          english_rank_in_class: record.english_rank_in_class ? parseInt(record.english_rank_in_class) : null,
          english_rank_in_school: record.english_rank_in_school ? parseInt(record.english_rank_in_school) : null,
          english_rank_in_grade: record.english_rank_in_grade ? parseInt(record.english_rank_in_grade) : null,
          
          physics_score: record.physics_score ? parseFloat(record.physics_score) : null,
          physics_grade: record.physics_grade || null,
          physics_rank_in_class: record.physics_rank_in_class ? parseInt(record.physics_rank_in_class) : null,
          physics_rank_in_school: record.physics_rank_in_school ? parseInt(record.physics_rank_in_school) : null,
          physics_rank_in_grade: record.physics_rank_in_grade ? parseInt(record.physics_rank_in_grade) : null,
          
          chemistry_score: record.chemistry_score ? parseFloat(record.chemistry_score) : null,
          chemistry_grade: record.chemistry_grade || null,
          chemistry_rank_in_class: record.chemistry_rank_in_class ? parseInt(record.chemistry_rank_in_class) : null,
          chemistry_rank_in_school: record.chemistry_rank_in_school ? parseInt(record.chemistry_rank_in_school) : null,
          chemistry_rank_in_grade: record.chemistry_rank_in_grade ? parseInt(record.chemistry_rank_in_grade) : null,
          
          politics_score: record.politics_score ? parseFloat(record.politics_score) : null,
          politics_grade: record.politics_grade || null,
          politics_rank_in_class: record.politics_rank_in_class ? parseInt(record.politics_rank_in_class) : null,
          politics_rank_in_school: record.politics_rank_in_school ? parseInt(record.politics_rank_in_school) : null,
          politics_rank_in_grade: record.politics_rank_in_grade ? parseInt(record.politics_rank_in_grade) : null,
          
          history_score: record.history_score ? parseFloat(record.history_score) : null,
          history_grade: record.history_grade || null,
          history_rank_in_class: record.history_rank_in_class ? parseInt(record.history_rank_in_class) : null,
          history_rank_in_school: record.history_rank_in_school ? parseInt(record.history_rank_in_school) : null,
          history_rank_in_grade: record.history_rank_in_grade ? parseInt(record.history_rank_in_grade) : null,
          
          biology_score: record.biology_score ? parseFloat(record.biology_score) : null,
          biology_grade: record.biology_grade || null,
          
          geography_score: record.geography_score ? parseFloat(record.geography_score) : null,
          geography_grade: record.geography_grade || null,
          
          // 时间戳
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // 移除null/undefined值以避免数据库插入问题
        const cleanedRecord = Object.fromEntries(
          Object.entries(mappedRecord).filter(([key, value]) => value !== null && value !== undefined)
        );
        
        console.log(`[Edge Function] 清理后的记录:`, {
          student_id: cleanedRecord.student_id,
          name: cleanedRecord.name,
          total_score: cleanedRecord.total_score,
          字段数量: Object.keys(cleanedRecord).length
        });
        
        // 先只写入新表，确保基本功能正常
        console.log(`[Edge Function] 准备插入到grade_data_new，记录字段:`, Object.keys(cleanedRecord).join(', '));
        
        const { error: insertError } = await supabase
          .from('grade_data_new')
          .insert(cleanedRecord);
        
        // TODO: 后续会重新启用双写模式
          
        if (insertError) {
          console.error('[Edge Function] 插入错误:', insertError);
          console.error('[Edge Function] 错误详情:', {
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            code: insertError.code
          });
          
          results.errors.push(`学生 ${record.name || record.student_id}: ${insertError.message}`);
        } else {
          results.success.push(record.name || record.student_id);
          console.log(`[Edge Function] 成功插入学生 ${record.name} 到 grade_data_new`);
        }
        
      } catch (error) {
        console.error(`[Edge Function] 处理记录失败:`, error);
        results.errors.push(`学生 ${record.name || record.student_id}: ${error.message}`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: results.success.length,
        errors: results.errors.length > 0 ? results.errors : null,
        message: `成功导入 ${results.success.length} 条记录${results.errors.length > 0 ? `，失败 ${results.errors.length} 条` : ''}`,
        examId: examId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('[Edge Function] 整体处理失败:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '处理数据失败', 
        message: error instanceof Error ? error.message : '发生未知错误',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});