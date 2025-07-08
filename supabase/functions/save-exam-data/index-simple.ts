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

    const examId = examData.id || examData.exam_id;
    console.log('[Edge Function] 使用考试ID:', examId);
    
    const results = {
      success: [],
      errors: []
    };
    
    // 简化版：只保存基础字段，先测试能否插入
    for (let i = 0; i < gradeData.length; i++) {
      const record = gradeData[i];
      
      try {
        console.log(`[Edge Function] 处理记录 ${i + 1}/${gradeData.length}:`, {
          student_id: record.student_id,
          name: record.name,
          total_score: record.total_score
        });
        
        // 最简版本，只保存必要字段
        const minimalRecord = {
          exam_id: examId,
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          exam_title: examData.title,
          exam_type: examData.type,
          exam_date: examData.date,
          total_score: record.total_score,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // 先测试插入最简版本
        const { error: insertError } = await supabase
          .from('grade_data_new')
          .insert(minimalRecord);
          
        if (insertError) {
          console.error('[Edge Function] 插入错误:', insertError);
          results.errors.push(`学生 ${record.student_id}: ${insertError.message}`);
        } else {
          results.success.push(record.student_id);
          console.log(`[Edge Function] 成功插入学生 ${record.name}`);
        }
        
      } catch (error) {
        console.error(`[Edge Function] 处理记录失败:`, error);
        results.errors.push(`学生 ${record.student_id}: ${error.message}`);
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