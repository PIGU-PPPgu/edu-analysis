import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 考试信息接口
interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject?: string; // 新增科目字段（可选）
}

/**
 * 处理并保存学生成绩数据到数据库
 * @param data 成绩数据
 * @param examInfo 考试信息
 * @returns 处理结果
 */
export async function processAndSaveData(data: any[], examInfo?: ExamInfo) {
  const results = {
    success: [],
    errors: [],
  };

  for (const item of data) {
    try {
      // 检查必要字段
      if (!item.studentId || !item.score) {
        results.errors.push(`记录缺少必要字段: ${JSON.stringify(item)}`);
        continue;
      }

      // 查找或创建学生
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("student_id", item.studentId)
        .maybeSingle();

      if (studentError) throw studentError;

      let studentId;

      if (!studentData) {
        // 创建新学生
        const { data: newStudent, error: createError } = await supabase
          .from("students")
          .insert({
            student_id: item.studentId,
            name: item.name || `未知学生(${item.studentId})`,
            class_name: item.className || "未分配班级",
          })
          .select("id")
          .single();

        if (createError) throw createError;
        studentId = newStudent.id;
      } else {
        studentId = studentData.id;
      }

      // 合并考试信息
      const examTitle =
        item.examTitle || (examInfo ? examInfo.title : "未命名考试");
      const examType = item.examType || (examInfo ? examInfo.type : "未分类");
      const examDate = item.examDate || (examInfo ? examInfo.date : null);

      // 处理科目信息 - 优先使用全局统一科目设置
      const subject =
        examInfo && examInfo.subject
          ? examInfo.subject
          : item.subject || "未知科目";

      // 保存成绩记录
      const { error: gradeError } = await supabase.from("grades").insert({
        student_id: item.studentId,
        score: item.score,
        subject: subject, // 使用合并后的科目信息
        exam_date: examDate,
        exam_type: examType,
        exam_title: examTitle, // 新增字段
        student_ref_id: studentId,
      });

      if (gradeError) throw gradeError;

      results.success.push(item.studentId);
    } catch (error) {
      console.error(`处理数据记录失败:`, error, item);
      results.errors.push(
        `处理 ${item.studentId || "未知学生"} 的记录时出错: ${error.message || "未知错误"}`
      );
    }
  }

  return results;
}

/**
 * 批量删除成绩数据
 * @param ids 成绩ID数组
 * @returns 删除结果
 */
export async function deleteGrades(ids: string[]) {
  if (!ids || ids.length === 0) {
    return { success: false, message: "没有提供需要删除的ID" };
  }

  try {
    const { error } = await supabase.from("grades").delete().in("id", ids);

    if (error) throw error;

    return { success: true, message: `成功删除${ids.length}条记录` };
  } catch (error) {
    console.error("删除成绩数据失败:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "删除数据时发生未知错误",
    };
  }
}
