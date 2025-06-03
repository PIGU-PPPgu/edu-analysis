import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

serve(async (req) => {
  // 处理CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { records, examInfo } = await req.json();
    
    if (!examInfo.title || !examInfo.type) {
      return new Response(
        JSON.stringify({ error: '考试标题和类型为必填字段' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const results = {
      success: [],
      errors: []
    };
    
    // 检查是否是批量导入
    if (!Array.isArray(records) || records.length === 0) {
      return new Response(
        JSON.stringify({ error: '未提供有效数据记录' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 首先创建或获取考试记录
    let examId;
    try {
      // 检查是否已存在相同的考试
      const { data: existingExam, error: examQueryError } = await supabase
        .from('exams')
        .select('id')
        .eq('title', examInfo.title)
        .eq('type', examInfo.type)
        .eq('date', examInfo.date)
        .maybeSingle();

      if (examQueryError) throw examQueryError;

      if (existingExam) {
        examId = existingExam.id;
        console.log(`使用现有考试记录: ${examId}`);
      } else {
        // 创建新的考试记录
        const { data: newExam, error: examCreateError } = await supabase
          .from('exams')
          .insert({
            title: examInfo.title,
            type: examInfo.type,
            date: examInfo.date,
            subject: examInfo.subject || null
          })
          .select('id')
          .single();

        if (examCreateError) throw examCreateError;
        examId = newExam.id;
        console.log(`创建新考试记录: ${examId}`);
      }
    } catch (error) {
      console.error('处理考试记录失败:', error);
      return new Response(
        JSON.stringify({ error: `处理考试记录失败: ${error.message}` }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // 批量处理学生记录
    for (const item of records) {
      try {
        // 检查必要字段
        if (!item.student_id || (!item.score && !item.total_score)) {
          results.errors.push(`记录缺少必要字段: ${JSON.stringify(item)}`);
          continue;
        }
        
        // 查找或创建学生
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('student_id')
          .eq('student_id', item.student_id)
          .maybeSingle();
          
        if (studentError) throw studentError;
        
        if (!studentData) {
          // 创建新学生
          const { error: createError } = await supabase
            .from('students')
            .insert({
              student_id: item.student_id,
              name: item.name || `未知学生(${item.student_id})`,
              class_name: item.class_name || '未分配班级'
            });
            
          if (createError) {
            console.warn(`创建学生失败，可能已存在: ${createError.message}`);
          }
        }
        
        // 准备成绩数据
        const gradeData = {
          exam_id: examId,
          student_id: item.student_id,
          name: item.name,
          class_name: item.class_name,
          subject: item.subject || examInfo.subject || '未知科目',
          score: item.score ? parseFloat(item.score) : null,
          total_score: item.total_score ? parseFloat(item.total_score) : null,
          rank_in_class: item.rank_in_class ? parseInt(item.rank_in_class) : null,
          rank_in_grade: item.rank_in_grade ? parseInt(item.rank_in_grade) : null,
          grade: item.grade || null,
          exam_date: examInfo.date,
          exam_type: examInfo.type,
          exam_title: examInfo.title,
          exam_scope: examInfo.scope || 'class',
          metadata: item.metadata || null
        };
        
        // 保存成绩记录到grade_data表
        const { error: gradeError } = await supabase
          .from('grade_data')
          .upsert(gradeData, {
            onConflict: 'exam_id,student_id'
          });
          
        if (gradeError) throw gradeError;
        
        results.success.push(item.student_id);
      } catch (error) {
        console.error(`处理数据记录失败:`, error);
        results.errors.push(`处理 ${item.student_id || '未知学生'} 的记录时出错: ${error.message || '未知错误'}`);
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
    console.error('处理考试数据失败:', error);
    
    return new Response(
      JSON.stringify({ 
        error: '处理数据失败', 
        message: error instanceof Error ? error.message : '发生未知错误' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 