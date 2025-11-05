import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 定义CORS头部，确保跨域请求能够被正确处理
// 允许所有来源，允许特定的头部字段
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 允许任何源发起的请求
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // 允许的请求头
};

// 定义箱线图数据的接口，与前端ClassBoxPlotChart.tsx中的类型保持一致
interface BoxPlotData {
  subject: string;    // 科目名称
  min: number;        // 最小值
  max: number;        // 最大值
  median: number;     // 中位数
  q1: number;         // 第一四分位数
  q3: number;         // 第三四分位数
  mean: number;       // 平均数
  outliers: Array<{   // 异常值列表
    value: number;         // 异常值的分数
    studentName: string;   // 异常值对应的学生姓名 (可能需要从students表关联查询)
    studentId: string;     // 异常值对应的学生ID
  }>;
}

// 规范化科目名称
function normalizeSubjectName(subject: string): string {
  if (!subject) return '未知科目';
  
  // 转换为小写并去除空格进行比较
  const normalized = String(subject).toLowerCase().trim();
  
  // 常见科目名称映射
  const subjectMapping: Record<string, string> = {
    // 中文科目
    '语': '语文', '语文': '语文', 'chinese': '语文', 'yuwen': '语文',
    '数': '数学', '数学': '数学', 'math': '数学', 'mathematics': '数学', 'shuxue': '数学',
    '英': '英语', '英语': '英语', 'english': '英语', 'yingyu': '英语',
    '物': '物理', '物理': '物理', 'physics': '物理', 'wuli': '物理',
    '化': '化学', '化学': '化学', 'chemistry': '化学', 'huaxue': '化学',
    '生': '生物', '生物': '生物', 'biology': '生物', 'shengwu': '生物',
    '政': '政治', '政治': '政治', 'politics': '政治', 'zhenzhi': '政治',
    '史': '历史', '历史': '历史', 'history': '历史', 'lishi': '历史',
    '地': '地理', '地理': '地理', 'geography': '地理', 'dili': '地理',
    // 常见组合和缩写
    '文综': '文科综合', '文科综合': '文科综合',
    '理综': '理科综合', '理科综合': '理科综合',
    '总分': '总分', 'total': '总分', '总': '总分',
  };
  
  // 检查科目名称映射
  for (const [key, value] of Object.entries(subjectMapping)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // 如果没有匹配到，返回原始值
  return subject;
}

console.log("get-class-boxplot-data function initializing.");

serve(async (req) => {
  console.log(`[get-class-boxplot-data] Received request: ${req.method}`);

  // 处理浏览器的CORS预检请求 (OPTIONS请求)
  if (req.method === 'OPTIONS') {
    console.log("[get-class-boxplot-data] Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 从请求体中解析参数
    const { examId, className } = await req.json();
    console.log(`[get-class-boxplot-data] Parsed params: examId=${examId}, className=${className}`);

    // 校验examId是否存在，这是必须的参数
    if (!examId) {
      console.error("[get-class-boxplot-data] Error: examId is required.");
      throw new Error("examId is required");
    }

    // 初始化Supabase客户端
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用Service Role Key以确保权限
    );
    console.log("[get-class-boxplot-data] Supabase client initialized.");

    // 从数据库中获取数据
    console.log("[get-class-boxplot-data] Querying database for exam and score data...");

    // 1. 获取考试信息
    const { data: examData, error: examError } = await supabaseClient
      .from('exams')
      .select('id, title, date, type, subject')
      .eq('id', examId)
      .single();

    if (examError) {
      console.error("[get-class-boxplot-data] Error fetching exam data:", examError);
      throw new Error(`Failed to fetch exam data: ${examError.message}`);
    }

    if (!examData) {
      console.error("[get-class-boxplot-data] No exam found with id:", examId);
      throw new Error(`No exam found with id: ${examId}`);
    }

    console.log("[get-class-boxplot-data] Exam data retrieved:", examData);

    // 2. 获取成绩数据
    let gradeQuery = supabaseClient
      .from('grade_data_new')
      .select('id, student_id, name, COALESCE(class_name, \'未知班级\') as class_name, total_score, chinese_score, math_score, english_score, physics_score, chemistry_score, politics_score, history_score')
      .eq('exam_id', examId)
      .not('total_score', 'is', null); // 过滤掉没有分数的记录

    // 如果指定了班级，则进一步过滤数据
    if (className && className !== '全部班级') {
      gradeQuery = gradeQuery.eq('class_name', className);
    }

    const { data: gradeData, error: gradeError } = await gradeQuery;

    if (gradeError) {
      console.error("[get-class-boxplot-data] Error fetching grade data:", gradeError);
      throw new Error(`Failed to fetch grade data: ${gradeError.message}`);
    }

    if (!gradeData || gradeData.length === 0) {
      console.warn("[get-class-boxplot-data] No grade data found for the exam, returning empty result");
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[get-class-boxplot-data] Retrieved ${gradeData.length} grade records`);

    // 3. 转换wide table为long format并按科目分组
    const subjectMap = new Map<string, number[]>();
    
    // 为每个学生的每个科目创建记录
    gradeData.forEach(student => {
      const subjects = [
        { name: '总分', score: student.total_score },
        { name: '语文', score: student.chinese_score },
        { name: '数学', score: student.math_score },
        { name: '英语', score: student.english_score },
        { name: '物理', score: student.physics_score },
        { name: '化学', score: student.chemistry_score },
        { name: '道法', score: student.politics_score },
        { name: '历史', score: student.history_score }
      ];
      
      subjects.forEach(({ name, score }) => {
        if (score !== null && score !== undefined) {
          if (!subjectMap.has(name)) {
            subjectMap.set(name, []);
          }
          subjectMap.get(name)!.push(parseFloat(score.toString()));
        }
      });
    });

    // 4. 计算每个科目的箱线图统计数据
    const results = Array.from(subjectMap.entries()).map(([subject, scores]) => {
      if (scores.length === 0) return null;
      
      // 排序分数用于计算统计值
      const sortedScores = scores.sort((a, b) => a - b);
      const n = sortedScores.length;
      
      // 计算箱线图统计值
      const min = sortedScores[0];
      const max = sortedScores[n - 1];
      const q1 = sortedScores[Math.floor(n * 0.25)];
      const median = sortedScores[Math.floor(n * 0.5)];
      const q3 = sortedScores[Math.floor(n * 0.75)];
      
      return {
        subject,
        min,
        q1,
        median,
        q3,
        max,
        count: n,
        scores: sortedScores // 可选：返回原始分数用于调试
      };
    }).filter(result => result !== null);

    console.log(`[get-class-boxplot-data] Processed ${results.length} subjects`);
    
    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("[get-class-boxplot-data] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
