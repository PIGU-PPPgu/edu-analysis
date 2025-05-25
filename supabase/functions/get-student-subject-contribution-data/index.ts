import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 定义CORS头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 与前端 StudentSubjectContribution.tsx 中的类型定义保持一致
interface SubjectPerformance {
  subject: string;
  score: number;
  avgScore: number;
  maxScore: number;
  contribution: number;
  performanceLevel: string;
  gap: number;
  gapPercentage: number;
  suggestion: string;
}

interface StudentData {
  id: string;
  name: string;
  className: string;
  subjects: SubjectPerformance[];
  totalContribution: number;
  strengthSubjects: string[];
  weakSubjects: string[];
}

console.log("get-student-subject-contribution-data function initializing.");

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

serve(async (req) => {
  console.log(`[get-student-subject-contribution-data] Received request: ${req.method}`);

  if (req.method === 'OPTIONS') {
    console.log("[get-student-subject-contribution-data] Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { examId, studentId } = await req.json(); // studentId 是可选的
    console.log(`[get-student-subject-contribution-data] Parsed params: examId=${examId}, studentId=${studentId}`);

    if (!examId) {
      console.error("[get-student-subject-contribution-data] Error: examId is required.");
      throw new Error("examId is required");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    console.log("[get-student-subject-contribution-data] Supabase client initialized.");

    // 从数据库中获取数据
    console.log("[get-student-subject-contribution-data] Querying database for data...");

    // 1. 获取考试信息
    const { data: examData, error: examError } = await supabaseClient
      .from('exams')
      .select('id, title, date, type, subject')
      .eq('id', examId)
      .single();

    if (examError) {
      console.error("[get-student-subject-contribution-data] Error fetching exam data:", examError);
      throw new Error(`Failed to fetch exam data: ${examError.message}`);
    }

    if (!examData) {
      console.error("[get-student-subject-contribution-data] No exam found with id:", examId);
      throw new Error(`No exam found with id: ${examId}`);
    }

    console.log("[get-student-subject-contribution-data] Exam data retrieved:", examData);

    // 2. 获取成绩数据
    let gradeQuery = supabaseClient
      .from('grade_data')
      .select('id, student_id, name, COALESCE(class_name, \'未知班级\') as class_name, subject, total_score')
      .eq('exam_id', examId)
      .not('total_score', 'is', null); // 过滤掉没有分数的记录

    // 如果指定了学生ID，则进一步过滤数据
    if (studentId) {
      gradeQuery = gradeQuery.eq('student_id', studentId);
    }

    const { data: gradeData, error: gradeError } = await gradeQuery;

    if (gradeError) {
      console.error("[get-student-subject-contribution-data] Error fetching grade data:", gradeError);
      throw new Error(`Failed to fetch grade data: ${gradeError.message}`);
    }

    if (!gradeData || gradeData.length === 0) {
      console.warn("[get-student-subject-contribution-data] No grade data found for the exam, returning empty result");
      return new Response(
        JSON.stringify([]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`[get-student-subject-contribution-data] Retrieved ${gradeData.length} grade records`);

    // 3. 按科目计算统计数据
    interface SubjectStats {
      avgScore: number;
      maxScore: number;
      count: number;
    }

    const subjectStats: Record<string, SubjectStats> = {};

    // 计算每个科目的平均分和最高分
    for (const grade of gradeData) {
      if (!grade.subject || typeof grade.total_score !== 'number') continue;

      if (!subjectStats[grade.subject]) {
        subjectStats[grade.subject] = {
          avgScore: 0,
          maxScore: 0,
          count: 0
        };
      }

      subjectStats[grade.subject].count++;
      subjectStats[grade.subject].avgScore += grade.total_score;
      subjectStats[grade.subject].maxScore = Math.max(
        subjectStats[grade.subject].maxScore, 
        grade.total_score
      );
    }

    // 计算平均分
    for (const subject in subjectStats) {
      if (subjectStats[subject].count > 0) {
        subjectStats[subject].avgScore /= subjectStats[subject].count;
      }
    }

    // 4. 按学生分组并生成结果
    const studentMap = new Map<string, {
      id: string;
      name: string;
      className: string;
      subjectScores: Map<string, number>;
    }>();

    // 为每个学生收集科目成绩
    for (const grade of gradeData) {
      if (!grade.student_id || !grade.subject || typeof grade.total_score !== 'number') continue;

      if (!studentMap.has(grade.student_id)) {
        studentMap.set(grade.student_id, {
          id: grade.student_id,
          name: grade.name || '未知',
          className: grade.class_name || '未知班级',
          subjectScores: new Map()
        });
      }

      // 规范化科目名称
      const normalizedSubject = normalizeSubjectName(grade.subject);
      
      studentMap.get(grade.student_id)!.subjectScores.set(normalizedSubject, grade.total_score);
    }

    // 5. 计算每个科目的表现水平和贡献度
    const calculatePerformanceLevel = (score: number, avgScore: number, maxScore: number): string => {
      const threshold = maxScore * 0.9;
      const gap = score - avgScore;
      
      if (score >= threshold) return '优秀';
      if (gap >= 10) return '良好';
      if (gap >= 0) return '中等';
      if (gap >= -10) return '一般';
      return '待提高';
    };

    const generateSuggestion = (subject: string, performanceLevel: string, gap: number): string => {
      const suggestions = {
        '语文': {
          '优秀': '语文基础扎实，继续保持阅读习惯，加强写作技巧。',
          '良好': '语文表现不错，可加强文言文阅读和写作深度。',
          '中等': '语文基本稳定，建议多读优秀文章，提高语感和表达能力。',
          '一般': '语文有待提高，建议加强基础知识巩固，增加阅读量。',
          '待提高': '语文基础薄弱，需要系统复习基础知识，多进行课文朗读和背诵。'
        },
        '数学': {
          '优秀': '数学思维敏捷，可挑战更多高难度题目拓展思路。',
          '良好': '数学基础扎实，多练习不同类型题目巩固知识点。',
          '中等': '数学掌握尚可，建议加强典型例题练习，提高解题技巧。',
          '一般': '数学需要加强，重点复习基础公式和概念，多做基础题。',
          '待提高': '数学基础薄弱，建议从基本概念开始，一步步构建知识体系。'
        },
        '英语': {
          '优秀': '英语能力出色，可尝试原版读物和写作训练提升水平。',
          '良好': '英语表现不错，继续积累词汇，提高听说读写综合能力。',
          '中等': '英语基础稳定，建议增加听力训练和口语练习。',
          '一般': '英语有待提高，需加强词汇记忆和语法学习。',
          '待提高': '英语基础薄弱，建议系统学习基础语法，扩大词汇量。'
        }
      };

      // 默认建议
      const defaultSuggestions = {
        '优秀': `${subject}学科表现出色，继续保持良好学习状态，可以尝试更有挑战性的学习内容。`,
        '良好': `${subject}学科掌握良好，继续巩固已有知识，多做拓展练习。`,
        '中等': `${subject}学科表现稳定，建议多做针对性练习，加强基础知识的掌握。`,
        '一般': `${subject}学科有待提高，需要加强课本知识的学习，多做基础题目。`,
        '待提高': `${subject}学科基础较弱，建议回归课本，系统复习基础知识点。`
      };

      // 使用特定科目的建议，如果没有则使用默认建议
      const subjectSuggestions = suggestions[subject as keyof typeof suggestions];
      if (subjectSuggestions) {
        return subjectSuggestions[performanceLevel as keyof typeof subjectSuggestions] || defaultSuggestions[performanceLevel as keyof typeof defaultSuggestions];
      }
      
      return defaultSuggestions[performanceLevel as keyof typeof defaultSuggestions];
    };

    // 6. 生成最终的学生数据
    const studentData: StudentData[] = [];

    for (const [studentId, data] of studentMap.entries()) {
      const subjects: SubjectPerformance[] = [];
      const contributions: number[] = [];
      const strengths: string[] = [];
      const weaknesses: string[] = [];

      for (const [subject, score] of data.subjectScores.entries()) {
        const stats = subjectStats[subject];
        if (!stats) continue;

        const gap = score - stats.avgScore;
        const gapPercentage = stats.avgScore > 0 ? (gap / stats.avgScore) * 100 : 0;
        const performanceLevel = calculatePerformanceLevel(score, stats.avgScore, stats.maxScore);
        
        // 计算贡献度 - 科目分数与平均分差距的标准化指标
        const contribution = gapPercentage / 10; // 简化的计算方式
        
        subjects.push({
          subject,
          score,
          avgScore: parseFloat(stats.avgScore.toFixed(2)),
          maxScore: stats.maxScore,
          contribution: parseFloat(contribution.toFixed(2)),
          performanceLevel,
          gap: parseFloat(gap.toFixed(2)),
          gapPercentage: parseFloat(gapPercentage.toFixed(2)),
          suggestion: generateSuggestion(subject, performanceLevel, gap)
        });
        
        contributions.push(contribution);
        
        // 判断强项和弱项
        if (gap >= 5) {
          strengths.push(subject);
        } else if (gap <= -5) {
          weaknesses.push(subject);
        }
      }

      // 计算总贡献度
      const totalContribution = contributions.length > 0
        ? parseFloat((contributions.reduce((sum, c) => sum + c, 0) / contributions.length).toFixed(2))
        : 0;

      studentData.push({
        id: studentId,
        name: data.name,
        className: data.className,
        subjects: subjects.sort((a, b) => b.contribution - a.contribution), // 按贡献度排序
        totalContribution,
        strengthSubjects: strengths,
        weakSubjects: weaknesses
      });
    }

    console.log(`[get-student-subject-contribution-data] Generated data for ${studentData.length} students`);

    // 返回成功结果
    return new Response(
      JSON.stringify(studentData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("[get-student-subject-contribution-data] Critical error in function execution:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

console.log("get-student-subject-contribution-data function script parsed."); 