import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0';

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  exam_id: string;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  subject?: string;
  total_score?: number;
  [key: string]: any;
}

interface AnalysisResult {
  totalStudents: number;
  overallStats: {
    average: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
  };
  scoreDistribution: Array<{
    range: string;
    count: number;
  }>;
  classPerformance: Array<{
    className: string;
    count: number;
    average: number;
    max: number;
    min: number;
    passRate: number;
  }>;
  subjectPerformance: Record<string, {
    average: number;
    max: number;
    min: number;
    stdDev?: number;
    classBreakdown: Record<string, {
      average: number;
      max: number;
      min: number;
    }>;
  }>;
  examInfo?: any;
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { examId } = await req.json();

    if (!examId) {
      return new Response(JSON.stringify({ error: 'Missing examId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    console.log(`开始分析考试数据，考试ID: ${examId}`);

    // 确保排名和其他统计数据已计算
    try {
      await supabaseClient.rpc('update_grade_data_ranks', { p_exam_id: examId });
      console.log(`排名和统计数据已更新`);
    } catch (rankError) {
      console.error(`计算排名失败: ${rankError.message || '未知错误'}`);
      // 继续执行，因为其他数据可能仍然可用
    }

    // 1. 获取考试信息
    const { data: examInfo, error: examError } = await supabaseClient
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examError) throw new Error(`获取考试信息失败: ${examError.message}`);
    console.log(`获取到考试信息: ${examInfo.title}`);

    // 2. 调用RPC函数获取整体分析
    const { data: overallAnalysisData, error: overallError } = await supabaseClient
      .rpc('get_exam_analysis', { p_exam_id: examId })
      .single();

    if (overallError) throw new Error(`RPC get_exam_analysis 错误: ${overallError.message}`);
    if (!overallAnalysisData) throw new Error('get_exam_analysis 未返回数据');
    console.log(`获取到总体分析数据，学生总数: ${overallAnalysisData.total_students}`);
    
    // 3. 调用RPC函数获取分数分布
    const { data: scoreDistributionData, error: distributionError } = await supabaseClient
      .rpc('get_score_distribution', { p_exam_id: examId });

    if (distributionError) throw new Error(`RPC get_score_distribution 错误: ${distributionError.message}`);
    console.log(`获取到分数分布数据，共 ${scoreDistributionData?.length || 0} 组`);
    
    // 4. 调用RPC函数获取班级表现
    const { data: classPerformanceData, error: classPerfError } = await supabaseClient
      .rpc('get_class_performance', { p_exam_id: examId });

    if (classPerfError) throw new Error(`RPC get_class_performance 错误: ${classPerfError.message}`);
    console.log(`获取到班级表现数据，共 ${classPerformanceData?.length || 0} 个班级`);

    // 5. 调用RPC函数获取科目表现（针对总分）
    const { data: subjectPerformanceRows, error: subjectPerfError } = await supabaseClient
      .rpc('get_subject_performance', { 
        p_exam_id: examId, 
        p_subject_name: 'total_score' 
      });

    if (subjectPerfError) throw new Error(`RPC get_subject_performance 错误: ${subjectPerfError.message}`);
    console.log(`获取到科目表现数据，共 ${subjectPerformanceRows?.length || 0} 条记录`);

    // 格式化数据为前端所需格式
    const overallStats = {
      average: Number(overallAnalysisData.avg_score || 0),
      median: 0, // 目前RPC不计算中位数，设为0
      min: Number(overallAnalysisData.min_score || 0),
      max: Number(overallAnalysisData.max_score || 0),
      stdDev: Number(overallAnalysisData.std_dev || 0),
    };
    
    const transformedClassPerformance = (classPerformanceData || []).map(cp => ({
      className: cp.class_name,
      count: Number(cp.student_count || 0),
      average: Number(cp.average_score || 0),
      max: Number(cp.max_score || 0),
      min: Number(cp.min_score || 0),
      passRate: Number(cp.pass_rate || 0) / 100, 
    }));

    const subjectPerformance: AnalysisResult['subjectPerformance'] = {};
    if (subjectPerformanceRows && subjectPerformanceRows.length > 0) {
      const firstRow = subjectPerformanceRows[0];
      subjectPerformance['total_score'] = { 
        average: Number(firstRow.overall_average_score || 0),
        max: Number(firstRow.overall_max_score || 0),
        min: Number(firstRow.overall_min_score || 0),
        stdDev: 0, // 目前RPC不返回此字段，设为0
        classBreakdown: {},
      };
      
      subjectPerformanceRows.forEach(row => {
        if (row.class_name) { 
          subjectPerformance['total_score'].classBreakdown[row.class_name] = {
            average: Number(row.class_average_score || 0),
            max: Number(row.class_max_score || 0),
            min: Number(row.class_min_score || 0),
          };
        }
      });
    }

    // 构建最终结果
    const analysisResult: AnalysisResult = {
      totalStudents: Number(overallAnalysisData.total_students || 0),
      overallStats,
      scoreDistribution: (scoreDistributionData || []).map(sd => ({
        range: sd.score_range,
        count: Number(sd.count || 0)
      })),
      classPerformance: transformedClassPerformance,
      subjectPerformance,
      examInfo 
    };
    
    console.log(`分析完成，返回结果`);
    return new Response(JSON.stringify(analysisResult), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error("Error in analyze-grades function:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      status: 'error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}); 