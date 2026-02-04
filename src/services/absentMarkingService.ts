/**
 * 缺考标记服务
 * 用于检测0分数据和更新缺考标记
 */

import { supabase } from "@/integrations/supabase/client";

interface ZeroScoreRecord {
  student_id: string;
  student_name: string;
  class_name: string;
  subject: string;
  score: number;
  grade_data_id?: number;
}

interface DetectZeroScoresParams {
  examId: string;
}

interface MarkAbsentParams {
  absentRecords: ZeroScoreRecord[];
}

/**
 * 检测指定考试中的0分记录
 */
export async function detectZeroScores(
  params: DetectZeroScoresParams
): Promise<ZeroScoreRecord[]> {
  const { examId } = params;

  try {
    // 查询该考试的所有成绩数据
    const { data, error } = await supabase
      .from("grade_data")
      .select("*")
      .eq("exam_id", examId);

    if (error) {
      console.error("查询成绩数据失败:", error);
      throw new Error(`查询成绩数据失败: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 科目映射
    const subjectMap: Record<string, string> = {
      chinese: "语文",
      math: "数学",
      english: "英语",
      physics: "物理",
      chemistry: "化学",
      biology: "生物",
      history: "历史",
      geography: "地理",
      politics: "政治",
    };

    // 检测每条记录的各科目0分
    const zeroScores: ZeroScoreRecord[] = [];

    for (const record of data) {
      for (const [field, subjectName] of Object.entries(subjectMap)) {
        const scoreField = `${field}_score`;
        const score = record[scoreField];

        // 检测0分（包括 0、0.0、null 等）
        if (score === 0 || score === 0.0) {
          zeroScores.push({
            student_id: record.student_id,
            student_name: record.name,
            class_name: record.class_name || "未知班级",
            subject: subjectName,
            score: 0,
            grade_data_id: record.id,
          });
        }
      }
    }

    console.log(
      `✅ 检测到 ${zeroScores.length} 条0分记录（考试ID: ${examId}）`
    );
    return zeroScores;
  } catch (error) {
    console.error("检测0分记录异常:", error);
    throw error;
  }
}

/**
 * 标记缺考记录
 */
export async function markAbsent(params: MarkAbsentParams): Promise<void> {
  const { absentRecords } = params;

  if (absentRecords.length === 0) {
    return;
  }

  try {
    // 按学生ID和科目分组，批量更新
    const updatePromises: Promise<any>[] = [];

    // 按 student_id 分组
    const recordsByStudent = absentRecords.reduce(
      (acc, record) => {
        if (!acc[record.student_id]) {
          acc[record.student_id] = [];
        }
        acc[record.student_id].push(record);
        return acc;
      },
      {} as Record<string, ZeroScoreRecord[]>
    );

    // 科目到字段的映射
    const subjectToField: Record<string, string> = {
      语文: "chinese_absent",
      数学: "math_absent",
      英语: "english_absent",
      物理: "physics_absent",
      化学: "chemistry_absent",
      生物: "biology_absent",
      历史: "history_absent",
      地理: "geography_absent",
      政治: "politics_absent",
    };

    // 为每个学生构建更新对象
    for (const [studentId, records] of Object.entries(recordsByStudent)) {
      // 构建更新数据
      const updateData: Record<string, boolean> = {};

      for (const record of records) {
        const absentField = subjectToField[record.subject];
        if (absentField) {
          updateData[absentField] = true;
        }
      }

      // 如果有字段需要更新
      if (Object.keys(updateData).length > 0) {
        // 使用第一条记录的 grade_data_id 来定位
        const gradeDataId = records[0].grade_data_id;

        if (gradeDataId) {
          updatePromises.push(
            supabase.from("grade_data").update(updateData).eq("id", gradeDataId)
          );
        }
      }
    }

    // 批量执行更新
    const results = await Promise.all(updatePromises);

    // 检查错误
    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("部分更新失败:", errors);
      throw new Error(`标记缺考失败: ${errors[0].error.message}`);
    }

    console.log(`✅ 成功标记 ${absentRecords.length} 条记录为缺考`);
  } catch (error) {
    console.error("标记缺考异常:", error);
    throw error;
  }
}

/**
 * 取消缺考标记
 */
export async function unmarkAbsent(params: {
  examId: string;
  studentIds?: string[];
}): Promise<void> {
  const { examId, studentIds } = params;

  try {
    const updateData = {
      chinese_absent: false,
      math_absent: false,
      english_absent: false,
      physics_absent: false,
      chemistry_absent: false,
      biology_absent: false,
      history_absent: false,
      geography_absent: false,
      politics_absent: false,
    };

    let query = supabase
      .from("grade_data")
      .update(updateData)
      .eq("exam_id", examId);

    if (studentIds && studentIds.length > 0) {
      query = query.in("student_id", studentIds);
    }

    const { error } = await query;

    if (error) {
      console.error("取消缺考标记失败:", error);
      throw new Error(`取消缺考标记失败: ${error.message}`);
    }

    console.log("✅ 已取消缺考标记");
  } catch (error) {
    console.error("取消缺考标记异常:", error);
    throw error;
  }
}
