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
    // SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 从环境变量中获取，确保在Supabase项目设置中已配置
    // 使用 service_role key 给予函数足够的权限执行数据库操作，特别是调用RPC函数
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // 使用Service Role Key以确保权限
      // global: { headers: { Authorization: req.headers.get('Authorization')! } } // 如果用anon key + RLS + rpc安全定义器，则需要传递用户token
    );
    console.log("[get-class-boxplot-data] Supabase client initialized.");

    // TODO: 调用实际的数据库RPC函数来获取和处理数据
    // 示例:
    // const { data: rpcResult, error: rpcError } = await supabaseClient.rpc(
    //   'calculate_subject_boxplot_stats_for_exam', // 假设的RPC函数名
    //   { p_exam_id: examId, p_class_name: className || null } // RPC参数
    // );
    // if (rpcError) {
    //   console.error("[get-class-boxplot-data] RPC error:", rpcError);
    //   throw rpcError;
    // }
    // console.log("[get-class-boxplot-data] RPC call successful, data:", rpcResult);
    // const formattedData: BoxPlotData[] = transformRpcResultToBoxPlotData(rpcResult);

    // --- START: Mock Data (用于临时替代RPC调用，直到RPC开发完成) ---
    console.log("[get-class-boxplot-data] Using mock data for now.");
    const mockBoxplotStats: BoxPlotData[] = [
      { subject: '语文', min: 50, max: 95, median: 75, q1: 60, q3: 85, mean: 78.5, outliers: [{value: 40, studentId: 's1001', studentName: '张小明'}, {value: 98, studentId: 's1002', studentName: '李小红'}] },
      { subject: '数学', min: 60, max: 100, median: 80, q1: 70, q3: 90, mean: 82.1, outliers: [] },
      { subject: '英语', min: 55, max: 98, median: 78, q1: 65, q3: 88, mean: 79.3, outliers: [{value: 45, studentId: 's1003', studentName: '王小刚'}] },
      { subject: '物理', min: 65, max: 99, median: 85, q1: 75, q3: 92, mean: 83.0, outliers: [{value: 100, studentId: 's1004', studentName: '赵小花'}, {value: 50, studentId: 's1005', studentName: '刘小强'}] },
      { subject: '化学', min: 70, max: 96, median: 82, q1: 78, q3: 89, mean: 81.5, outliers: [] },
    ];
    // --- END: Mock Data ---

    console.log("[get-class-boxplot-data] Successfully prepared data (mocked). Sending response.");
    // 返回处理后的数据 (当前是mock数据)
    return new Response(
      JSON.stringify(mockBoxplotStats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("[get-class-boxplot-data] Critical error in function execution:", error.message, error.stack);
    // 返回错误信息
    return new Response(JSON.stringify({ error: error.message || 'An unknown error occurred' }), {
      status: 500, // 服务器内部错误
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 辅助函数：将RPC返回的结果转换为前端期望的BoxPlotData[]格式
// function transformRpcResultToBoxPlotData(rpcResult: any[]): BoxPlotData[] {
//   // 这个函数的具体实现将依赖于RPC 'calculate_subject_boxplot_stats_for_exam' 返回的数据结构
//   // 假设RPC返回类似: [{ subject_name: '语文', min_score: 50, max_score: 95, ... , outliers_json: '[{...}]' }, ...]
//   if (!rpcResult) return [];
//   return rpcResult.map(item => ({
//     subject: item.subject_name,
//     min: item.min_score,
//     max: item.max_score,
//     median: item.median_score,
//     q1: item.q1_score,
//     q3: item.q3_score,
//     mean: item.mean_score,
//     outliers: item.outliers_json ? JSON.parse(item.outliers_json) : [],
//   }));
// }

console.log("get-class-boxplot-data function script parsed."); 