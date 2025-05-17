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

    // TODO: 实现RPC调用和数据转换逻辑
    // 1. 获取该考试下所有学生或特定学生的成绩数据 (可能需要 JOIN students 表获取姓名和班级)
    // 2. 对于每个学生，遍历其所有科目：
    //    a. 获取该科目的班级/年级平均分、最高分等统计数据 (可能需要另一个RPC或从步骤1的数据中计算)
    //    b. 计算该学生在该科目上的表现 (score, avgScore, maxScore, contribution, performanceLevel, gap, gapPercentage, suggestion)
    // 3. 汇总形成 StudentData[] 结构，包括 totalContribution, strengthSubjects, weakSubjects

    // --- START: Mock Data (临时替代，直到RPC和转换逻辑完成) ---
    console.log("[get-student-subject-contribution-data] Using mock data for now.");
    let mockStudentContributionData: StudentData[] = [
      {
        id: 's1001',
        name: '张小明',
        className: '高一(1)班',
        subjects: [
          { subject: '语文', score: 85, avgScore: 78, maxScore: 95, contribution: 1.5, performanceLevel: '良好', gap: 7, gapPercentage: 8.97, suggestion: '语文基础扎实，阅读理解有提升空间，可加强古诗文赏析。' },
          { subject: '数学', score: 72, avgScore: 80, maxScore: 100, contribution: -1.8, performanceLevel: '一般', gap: -8, gapPercentage: -10.0, suggestion: '数学概念理解需加强，多做典型例题，注意解题步骤的规范性。' },
          { subject: '英语', score: 90, avgScore: 82, maxScore: 98, contribution: 2.0, performanceLevel: '优秀', gap: 8, gapPercentage: 9.76, suggestion: '英语语感好，词汇量较大，写作和口语表达可进一步提升流利度。' },
        ],
        totalContribution: 1.7,
        strengthSubjects: ['英语', '语文'],
        weakSubjects: ['数学'],
      },
      {
        id: 's1002',
        name: '李小红',
        className: '高一(1)班',
        subjects: [
          { subject: '语文', score: 70, avgScore: 78, maxScore: 95, contribution: -1.2, performanceLevel: '一般', gap: -8, gapPercentage: -10.26, suggestion: '语文基础薄弱，识字量和阅读速度有待提高，多朗读课文。' },
          { subject: '数学', score: 95, avgScore: 80, maxScore: 100, contribution: 3.0, performanceLevel: '优秀', gap: 15, gapPercentage: 18.75, suggestion: '数学思维敏捷，解题能力强，可尝试挑战更高难度的题目。' },
          { subject: '英语', score: 78, avgScore: 82, maxScore: 98, contribution: -0.8, performanceLevel: '一般', gap: -4, gapPercentage: -4.88, suggestion: '英语听力和语法是薄弱环节，多进行专项训练，积累常用词汇和句型。' },
        ],
        totalContribution: 1.0,
        strengthSubjects: ['数学'],
        weakSubjects: ['语文', '英语'],
      },
    ];

    // 如果请求中指定了 studentId，则只返回该学生的数据
    if (studentId) {
      mockStudentContributionData = mockStudentContributionData.filter(s => s.id === studentId);
       if (mockStudentContributionData.length === 0) {
         // 如果特定学生ID没有mock数据，可以返回一个空数组或特定的提示
         console.log(`[get-student-subject-contribution-data] No mock data for studentId: ${studentId}, returning empty array.`);
       }
    }
    // --- END: Mock Data ---

    console.log("[get-student-subject-contribution-data] Successfully prepared data (mocked). Sending response.");
    return new Response(
      JSON.stringify(mockStudentContributionData),
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