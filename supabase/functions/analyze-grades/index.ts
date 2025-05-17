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

    // 1. Get Exam Info (as before)
    const { data: examInfo, error: examError } = await supabaseClient
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    if (examError) throw new Error(`获取考试信息失败: ${examError.message}`);

    // 2. Call RPC for overall_stats and total_students
    const { data: overallAnalysisData, error: overallError } = await supabaseClient
      .rpc('get_exam_analysis', { p_exam_id: examId })
      .single(); // Expects a single row

    if (overallError) throw new Error(`RPC get_exam_analysis error: ${overallError.message}`);
    if (!overallAnalysisData) throw new Error('No data from get_exam_analysis');
    
    // 3. Call RPC for score_distribution
    const { data: scoreDistributionData, error: distributionError } = await supabaseClient
      .rpc('get_score_distribution', { p_exam_id: examId });

    if (distributionError) throw new Error(`RPC get_score_distribution error: ${distributionError.message}`);
    
    // 4. Call RPC for class_performance
    const { data: classPerformanceData, error: classPerfError } = await supabaseClient
      .rpc('get_class_performance', { p_exam_id: examId });

    if (classPerfError) throw new Error(`RPC get_class_performance error: ${classPerfError.message}`);

    // 5. Call RPC for subject_performance (simplified for 'total_score')
    const { data: subjectPerformanceRows, error: subjectPerfError } = await supabaseClient
        .rpc('get_subject_performance', { p_exam_id: examId, p_subject_name: 'total_score' });

    if (subjectPerfError) throw new Error(`RPC get_subject_performance error: ${subjectPerfError.message}`);

    // Transform data to match expected AnalysisResult structure
    const overallStats = {
      average: Number(overallAnalysisData.avg_score || 0),
      median: 0, // TODO: Median is not directly provided by this RPC. Calculate if needed or set to 0/null.
      min: Number(overallAnalysisData.min_score || 0),
      max: Number(overallAnalysisData.max_score || 0),
      stdDev: 0, // TODO: StdDev is not directly provided. Calculate if needed or set to 0/null.
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
            stdDev: 0, 
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
    
    return new Response(JSON.stringify(analysisResult), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error("Error in analyze-grades function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}); 