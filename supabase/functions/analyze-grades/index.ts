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
    stdDev: number;
    classBreakdown: Record<string, {
      average: number;
      max: number;
      min: number;
    }>;
  }>;
}

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // 解析请求
    const { examId } = await req.json();
    
    if (!examId) {
      return new Response(
        JSON.stringify({ error: 'Missing examId parameter' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          } 
        }
      );
    }
    
    // 创建Supabase客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') as string;
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { 
        global: { 
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    );
    
    // 获取考试信息
    const { data: examInfo, error: examError } = await supabaseClient
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();
    
    if (examError) {
      throw new Error(`获取考试信息失败: ${examError.message}`);
    }
    
    // 获取成绩数据
    const { data: gradeData, error: gradeError } = await supabaseClient
      .from('grade_data')
      .select('*')
      .eq('exam_id', examId);
    
    if (gradeError) {
      throw new Error(`获取成绩数据失败: ${gradeError.message}`);
    }
    
    // 分析数据
    const analysis = analyzeGradeData(gradeData as GradeRecord[]);
    
    // 返回分析结果
    return new Response(
      JSON.stringify({
        examInfo,
        ...analysis
      }),
      { 
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    );
  }
});

/**
 * 分析成绩数据
 */
function analyzeGradeData(gradeData: GradeRecord[]): AnalysisResult {
  if (!gradeData.length) {
    return getEmptyAnalysisResult();
  }
  
  // 获取总分数据
  const totalScores = gradeData
    .map(record => parseFloat(record.total_score?.toString() || '0'))
    .filter(score => !isNaN(score));
  
  // 获取所有班级
  const classes = [...new Set(gradeData.map(record => record.class_name))];
  
  // 获取所有可能的科目字段
  const subjectFields = Object.keys(gradeData[0])
    .filter(key => key.endsWith('_score') && key !== 'total_score')
    .map(key => key.replace('_score', ''));
  
  // 计算总体统计
  const overallStats = {
    average: calculateAverage(totalScores),
    median: calculateMedian(totalScores),
    min: Math.min(...totalScores),
    max: Math.max(...totalScores),
    stdDev: calculateStandardDeviation(totalScores)
  };
  
  // 计算分数分布
  const scoreDistribution = [
    { range: '90-100', count: 0 },
    { range: '80-89', count: 0 },
    { range: '70-79', count: 0 },
    { range: '60-69', count: 0 },
    { range: '0-59', count: 0 }
  ];
  
  totalScores.forEach(score => {
    if (score >= 90) scoreDistribution[0].count++;
    else if (score >= 80) scoreDistribution[1].count++;
    else if (score >= 70) scoreDistribution[2].count++;
    else if (score >= 60) scoreDistribution[3].count++;
    else scoreDistribution[4].count++;
  });
  
  // 计算各班级成绩表现
  const classPerformance = classes.map(className => {
    const classScores = gradeData
      .filter(record => record.class_name === className)
      .map(record => parseFloat(record.total_score?.toString() || '0'))
      .filter(score => !isNaN(score));
    
    const passCount = classScores.filter(score => score >= 60).length;
    
    return {
      className,
      count: classScores.length,
      average: calculateAverage(classScores),
      max: Math.max(...classScores),
      min: Math.min(...classScores),
      passRate: classScores.length > 0 ? passCount / classScores.length : 0
    };
  });
  
  // 计算各科目成绩表现
  const subjectPerformance: Record<string, any> = {};
  
  subjectFields.forEach(subject => {
    const fieldName = `${subject}_score`;
    const subjectScores = gradeData
      .map(record => parseFloat(record[fieldName]?.toString() || '0'))
      .filter(score => !isNaN(score));
    
    if (subjectScores.length === 0) return;
    
    // 计算各班级在该科目的表现
    const classBreakdown: Record<string, any> = {};
    
    classes.forEach(className => {
      const classSubjectScores = gradeData
        .filter(record => record.class_name === className)
        .map(record => parseFloat(record[fieldName]?.toString() || '0'))
        .filter(score => !isNaN(score));
      
      if (classSubjectScores.length === 0) return;
      
      classBreakdown[className] = {
        average: calculateAverage(classSubjectScores),
        max: Math.max(...classSubjectScores),
        min: Math.min(...classSubjectScores)
      };
    });
    
    subjectPerformance[subject] = {
      average: calculateAverage(subjectScores),
      max: Math.max(...subjectScores),
      min: Math.min(...subjectScores),
      stdDev: calculateStandardDeviation(subjectScores),
      classBreakdown
    };
  });
  
  return {
    totalStudents: gradeData.length,
    overallStats,
    scoreDistribution,
    classPerformance,
    subjectPerformance
  };
}

/**
 * 计算平均值
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return sum / numbers.length;
}

/**
 * 计算中位数
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}

/**
 * 计算标准差
 */
function calculateStandardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const avg = calculateAverage(numbers);
  const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
  const avgSquareDiff = calculateAverage(squareDiffs);
  
  return Math.sqrt(avgSquareDiff);
}

/**
 * 返回空的分析结果
 */
function getEmptyAnalysisResult(): AnalysisResult {
  return {
    totalStudents: 0,
    overallStats: {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0
    },
    scoreDistribution: [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '60-69', count: 0 },
      { range: '0-59', count: 0 }
    ],
    classPerformance: [],
    subjectPerformance: {}
  };
} 