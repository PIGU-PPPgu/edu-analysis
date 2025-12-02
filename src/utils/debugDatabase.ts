import { supabase } from "@/integrations/supabase/client";

export async function debugDatabaseData() {
  console.log("🔍 开始检查数据库数据...");

  try {
    // 检查 grade_data 表
    const { data: gradeDataNew, error: gradeError } = await supabase
      .from("grade_data")
      .select("*")
      .limit(5);

    console.log("📊 grade_data 表:", {
      hasError: !!gradeError,
      error: gradeError?.message,
      dataCount: gradeDataNew?.length || 0,
      sample: gradeDataNew?.[0] || null,
    });

    if (gradeDataNew && gradeDataNew.length > 0) {
      console.log("📋 grade_data 表字段:", Object.keys(gradeDataNew[0]));
    }

    // 检查 exams 表
    const { data: exams, error: examError } = await supabase
      .from("exams")
      .select("*")
      .limit(5);

    console.log("📝 exams 表:", {
      hasError: !!examError,
      error: examError?.message,
      dataCount: exams?.length || 0,
      sample: exams?.[0] || null,
    });

    // 检查 students 表
    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("*")
      .limit(5);

    console.log("👥 students 表:", {
      hasError: !!studentError,
      error: studentError?.message,
      dataCount: students?.length || 0,
      sample: students?.[0] || null,
    });

    // 检查总记录数
    const { count: gradeCount } = await supabase
      .from("grade_data")
      .select("*", { count: "exact", head: true });

    const { count: examCount } = await supabase
      .from("exams")
      .select("*", { count: "exact", head: true });

    console.log("📈 数据库总计:", {
      gradeRecords: gradeCount,
      examRecords: examCount,
    });

    // 新增：检查两表关联情况
    console.log("\n🔗 检查数据表关联关系...");

    // 获取grade_data中的exam_id分布
    const { data: examIdStats } = await supabase
      .from("grade_data")
      .select("exam_id");

    if (examIdStats) {
      const examIdCounts = examIdStats.reduce(
        (acc: Record<string, number>, curr) => {
          const examId = curr.exam_id || "null";
          acc[examId] = (acc[examId] || 0) + 1;
          return acc;
        },
        {}
      );

      console.log("📊 grade_data中exam_id分布:", examIdCounts);
    }

    // 检查有多少成绩数据没有对应的考试信息
    const { data: orphanedGrades } = await supabase
      .from("grade_data")
      .select("exam_id")
      .not(
        "exam_id",
        "in",
        `(${exams?.map((e) => `'${e.id}'`).join(",") || "''"})`
      )
      .limit(10);

    console.log(
      "⚠️ 没有对应考试信息的成绩记录数:",
      orphanedGrades?.length || 0
    );

    // 检查最近的数据变化
    const { data: recentGrades } = await supabase
      .from("grade_data")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3);

    console.log("🕐 最近添加的成绩数据:", recentGrades);
  } catch (error) {
    console.error("❌ 数据库检查失败:", error);
  }
}

// 立即执行检查
debugDatabaseData();
