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
    
    // 批量处理学生记录
    for (const item of records) {
      try {
        // 检查必要字段
        if (!item.studentId || !item.score) {
          results.errors.push(`记录缺少必要字段: ${JSON.stringify(item)}`);
          continue;
        }
        
        // 查找或创建学生
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('id')
          .eq('student_id', item.studentId)
          .maybeSingle();
          
        if (studentError) throw studentError;
        
        let studentId;
        
        if (!studentData) {
          // 创建新学生
          const { data: newStudent, error: createError } = await supabase
            .from('students')
            .insert({
              student_id: item.studentId,
              name: item.name || `未知学生(${item.studentId})`,
              class_name: item.className || '未分配班级'
            })
            .select('id')
            .single();
            
          if (createError) throw createError;
          studentId = newStudent.id;
        } else {
          studentId = studentData.id;
        }
        
        // 合并考试信息
        const examTitle = examInfo.title;
        const examType = examInfo.type;
        const examDate = item.examDate || examInfo.date || null;
        
        // 处理科目信息 - 优先使用全局统一科目设置
        const subject = (examInfo.subject) ? 
          examInfo.subject : 
          (item.subject || '未知科目');
        
        // 保存成绩记录
        const { error: gradeError } = await supabase
          .from('grades')
          .insert({
            student_id: item.studentId,
            score: item.score,
            subject: subject,
            exam_date: examDate,
            exam_type: examType,
            exam_title: examTitle,
            student_ref_id: studentId
          });
          
        if (gradeError) throw gradeError;
        
        results.success.push(item.studentId);
      } catch (error) {
        console.error(`处理数据记录失败:`, error);
        results.errors.push(`处理 ${item.studentId || '未知学生'} 的记录时出错: ${error.message || '未知错误'}`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: results.success.length,
        errors: results.errors.length > 0 ? results.errors : null,
        message: `成功导入 ${results.success.length} 条记录${results.errors.length > 0 ? `，失败 ${results.errors.length} 条` : ''}`
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