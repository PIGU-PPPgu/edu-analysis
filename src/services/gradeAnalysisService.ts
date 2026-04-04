import {
  supabase,
  checkTableExists as supabaseCheckTableExists,
} from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ExamInfo } from "@/components/analysis/ImportReviewDialog";
import { requestCache } from "@/utils/cacheUtils";
import { convertWideToLongFormat } from "@/lib/gradeDataConverter";
import { matchStudent } from "@/utils/studentMatcher";
import {
  PERFORMANCE_CONFIG,
  getOptimalBatchSize,
  PerformanceMonitor,
} from "./performanceConfig";
import {
  analyzeCSVHeaders,
  convertWideToLongFormatEnhanced,
  generateMappingSuggestions,
  type FieldMapping,
} from "./intelligentFieldMapper";
import { enhancedStudentMatcher } from "./enhancedStudentMatcher";

// 分析维度选项
export const ANALYSIS_DIMENSIONS = [
  { id: "class_name", name: "班级" },
  { id: "subject", name: "科目" },
  { id: "exam_date", name: "考试时间" },
  { id: "exam_type", name: "考试类型" },
  { id: "teacher", name: "任课教师" },
  { id: "grade", name: "年级" },
  { id: "score_level", name: "分数段" },
  { id: "gender", name: "性别" },
];

// 分析指标选项
export const ANALYSIS_METRICS = [
  { id: "avg_score", name: "平均分" },
  { id: "pass_rate", name: "及格率" },
  { id: "excellence_rate", name: "优秀率" },
  { id: "min_score", name: "最低分" },
  { id: "max_score", name: "最高分" },
  { id: "student_count", name: "学生人数" },
  { id: "standard_deviation", name: "标准差" },
];

export interface GradeData {
  id?: string;
  student_id: string;
  name: string;
  class_name: string;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  subject?: string;
  [key: string]: any;
}

export type MergeStrategy =
  | "replace"
  | "update"
  | "add_only"
  | "skip"
  | "append";

// 辅助方法: 检查表是否存在
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    // 尝试方法1: 使用SQL查询检查表是否存在
    const { data, error } = await supabase
      .from(tableName)
      .select("*", { count: "exact", head: true })
      .limit(1);

    // 如果没有错误，表存在
    if (!error) {
      return true;
    }

    // 特定的错误信息可能表示表不存在
    if (
      error.message &&
      (error.message.includes("does not exist") ||
        error.message.includes("不存在") ||
        error.message.includes("relation") ||
        error.message.includes("表"))
    ) {
      return false;
    }

    // 其他错误，可能是权限问题，尝试备用方法
    console.warn(`通过直接查询检查表 ${tableName} 失败:`, error);

    // 尝试方法2: 通过RPC函数检查
    try {
      const { data, error } = await supabase.rpc("table_exists", {
        table_name: tableName,
      });
      if (!error && data) {
        return data === true;
      }

      // 如果RPC失败，可能是函数不存在
      console.warn(`通过RPC检查表 ${tableName} 失败:`, error);
    } catch (rpcError) {
      console.warn(`RPC检查表 ${tableName} 失败:`, rpcError);
    }

    // 所有方法都失败，假设表不存在
    return false;
  } catch (e) {
    console.error(`检查表 ${tableName} 是否存在时出错:`, e);
    return false;
  }
}

/**
 * 安全查询函数 - 当表不存在或发生其他错误时返回空结果
 * @param tableName 表名
 * @param query 查询函数
 * @returns 查询结果
 */
const safeQuery = async (tableName: string, queryFn: () => Promise<any>) => {
  try {
    // 先检查表是否存在
    const tableExists = await checkTableExists(tableName);

    if (!tableExists) {
      console.warn(`表 ${tableName} 不存在，返回空结果`);
      return {
        data: [],
        error: new Error(`表 ${tableName} 不存在，请先执行迁移脚本创建所需表`),
      };
    }

    // 表存在，执行查询
    return await queryFn();
  } catch (error) {
    console.error(`查询表 ${tableName} 时发生错误:`, error);
    return { data: [], error };
  }
};

/**
 * 增强的学生匹配函数，使用智能匹配器
 */
const matchStudentEnhanced = async (studentInfo: {
  student_id?: string;
  name?: string;
  class_name?: string;
}): Promise<{
  matchedStudent: any | null;
  multipleMatches: boolean;
  matchType: "id" | "name_class" | "name" | "none";
  confidence: number;
  matchReason: string;
}> => {
  try {
    console.log(`🔍 匹配学生: ${JSON.stringify(studentInfo)}`);

    // 使用增强的学生匹配器
    const matchResult =
      await enhancedStudentMatcher.matchSingleStudent(studentInfo);

    // 转换匹配类型格式
    let legacyMatchType: "id" | "name_class" | "name" | "none";
    switch (matchResult.matchType) {
      case "exact_id":
        legacyMatchType = "id";
        break;
      case "exact_name":
      case "exact_class_name":
        legacyMatchType = "name_class";
        break;
      case "fuzzy_name":
      case "fuzzy_combined":
        legacyMatchType = "name";
        break;
      default:
        legacyMatchType = "none";
    }

    console.log(
      `✅ 匹配结果: ${matchResult.matchReason} (置信度: ${matchResult.confidence})`
    );

    return {
      matchedStudent: matchResult.matchedStudent,
      multipleMatches: matchResult.multipleMatches,
      matchType: legacyMatchType,
      confidence: matchResult.confidence,
      matchReason: matchResult.matchReason,
    };
  } catch (error) {
    console.error("❌ 增强学生匹配失败:", error);

    // 降级到原始匹配逻辑
    console.log("🔄 降级到原始匹配逻辑...");
    return await originalMatchStudent(studentInfo);
  }
};

// 原始的学生匹配函数（作为备用）
const originalMatchStudent = async (studentInfo: {
  student_id?: string;
  name?: string;
  class_name?: string;
}): Promise<{
  matchedStudent: any | null;
  multipleMatches: boolean;
  matchType: "id" | "name_class" | "name" | "none";
}> => {
  try {
    // 如果有学号，优先使用学号匹配
    if (studentInfo.student_id) {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("student_id", studentInfo.student_id)
        .limit(1);

      if (data && data.length > 0) {
        return {
          matchedStudent: data[0],
          multipleMatches: false,
          matchType: "id",
        };
      }
    }

    // 如果有姓名和班级，使用姓名+班级匹配
    if (studentInfo.name && studentInfo.class_name) {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("name", studentInfo.name)
        .eq("class_name", studentInfo.class_name);

      if (data && data.length > 0) {
        return {
          matchedStudent: data[0],
          multipleMatches: data.length > 1,
          matchType: "name_class",
        };
      }
    }

    // 如果只有姓名，尝试仅通过姓名匹配，但可能会有多个结果
    if (studentInfo.name) {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("name", studentInfo.name);

      if (data && data.length > 0) {
        return {
          matchedStudent: data[0], // 返回第一个匹配的学生
          multipleMatches: data.length > 1,
          matchType: "name",
        };
      }
    }

    // 没有找到匹配的学生
    return {
      matchedStudent: null,
      multipleMatches: false,
      matchType: "none",
    };
  } catch (error) {
    console.error("匹配学生信息失败:", error);
    return {
      matchedStudent: null,
      multipleMatches: false,
      matchType: "none",
    };
  }
};

export const gradeAnalysisService = {
  /**
   * 保存考试数据，使用增强的学生匹配逻辑（批量优化版本）
   */
  async saveExamData(
    processedData: Record<string, any>[],
    examInfo: ExamInfo,
    mergeStrategy: MergeStrategy = "replace",
    options?: {
      examScope?: "class" | "grade";
      newStudentStrategy?: "create" | "ignore";
    }
  ) {
    try {
      if (!examInfo || !examInfo.title) {
        throw new Error("考试信息不完整，请提供有效的考试标题");
      }

      console.log(
        `[性能优化] 保存考试数据: ${examInfo.title}，合并策略: ${mergeStrategy}，数据量: ${processedData.length} 条`
      );
      const startTime = Date.now();

      // 确保考试记录存在
      const examId = await this.ensureExamExists(examInfo);

      if (!examId) {
        throw new Error("创建考试记录失败");
      }

      // 🚀 智能重复数据检测和处理
      console.log(`[智能检测] 检查考试 ${examId} 是否已有数据...`);
      const { data: existingData, error: checkError } = await supabase
        .from("grade_data")
        .select("student_id, subject")
        .eq("exam_id", examId);

      if (checkError) {
        console.warn(`[智能检测] 检查重复数据失败: ${checkError.message}`);
      } else if (existingData && existingData.length > 0) {
        // 存在数据，根据策略处理
        console.log(`[智能检测] 发现考试已有 ${existingData.length} 条记录`);

        if (mergeStrategy === "skip") {
          console.log(`[智能检测] 使用跳过策略，不导入已存在的考试数据`);
          return {
            success: true,
            message: "考试数据已存在，根据策略跳过导入",
            examId,
          };
        }
      } else {
        console.log(`[智能检测] 未发现重复数据，可以安全导入`);
      }

      // 🚀 智能字段分析：分析CSV表头结构
      if (processedData.length > 0) {
        const headers = Object.keys(processedData[0]);
        console.log("[智能分析] 检测到的CSV表头:", headers);

        const headerAnalysis = analyzeCSVHeaders(headers);
        console.log("[智能分析] 表头分析结果:", {
          识别的科目: headerAnalysis.subjects,
          学生字段: headerAnalysis.studentFields.map((f) => f.originalField),
          置信度: headerAnalysis.confidence,
        });

        // 如果是宽表格格式（包含多个科目），使用增强转换
        if (
          headerAnalysis.subjects.length > 1 &&
          headerAnalysis.confidence > 0.7
        ) {
          console.log("[智能分析] 检测到宽表格格式，使用增强转换逻辑");

          // 转换宽表格为长表格
          const convertedData: Record<string, any>[] = [];

          processedData.forEach((row, index) => {
            try {
              // 修复：传递正确的参数，包括examInfo
              const result = convertWideToLongFormatEnhanced(
                row,
                headerAnalysis,
                {
                  title: examInfo.title,
                  type: examInfo.type,
                  date: examInfo.date,
                  exam_id: examId,
                }
              );
              convertedData.push(...result);
            } catch (error) {
              console.error(
                `[智能分析] 转换第 ${index + 1} 行数据失败:`,
                error
              );
            }
          });

          console.log(
            `[智能分析] 宽表格转换完成: ${processedData.length} 行原始数据 → ${convertedData.length} 行转换后数据`
          );
          console.log(
            `[智能分析] 转换效果: 平均每个学生生成 ${(convertedData.length / processedData.length).toFixed(1)} 条科目记录`
          );
          processedData = convertedData;
        }
      }

      // 已经包含完整的考试信息，不需要重复添加exam_id
      const gradeDataWithExamId = processedData;

      console.log(`[性能优化] 处理 ${gradeDataWithExamId.length} 条成绩数据`);

      // 根据不同的合并策略处理数据
      if (mergeStrategy === "replace") {
        // 🚀 性能优化：先删除旧数据，然后批量插入新数据
        console.log(`[性能优化] 使用replace策略，先删除旧数据再批量插入`);

        // 删除该考试的所有现有数据
        const { error: deleteError } = await supabase
          .from("grade_data")
          .delete()
          .eq("exam_id", examId);

        if (deleteError) {
          console.error(`删除旧数据失败: ${deleteError.message}`);
          throw new Error(`删除旧数据失败: ${deleteError.message}`);
        }

        // 批量插入新数据
        const batchSize = 500; // 每批处理的记录数
        const batches = [];

        for (let i = 0; i < gradeDataWithExamId.length; i += batchSize) {
          batches.push(gradeDataWithExamId.slice(i, i + batchSize));
        }

        console.log(
          `[性能优化] 将数据分成 ${batches.length} 批进行插入，每批最多 ${batchSize} 条记录`
        );

        let totalInserted = 0;
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          console.log(
            `[性能优化] 处理第 ${i + 1}/${batches.length} 批数据，共 ${batch.length} 条记录`
          );

          const { error: insertError } = await supabase
            .from("grade_data")
            .insert(batch);

          if (insertError) {
            console.error(`批次 ${i + 1} 插入失败: `, insertError);
            throw insertError;
          }

          totalInserted += batch.length;
          console.log(
            `[性能优化] 批次 ${i + 1} 插入成功，累计插入 ${totalInserted}/${gradeDataWithExamId.length} 条记录`
          );
        }
      } else if (mergeStrategy === "update") {
        // 🚀 性能优化：使用Supabase的upsert功能进行批量更新/插入
        console.log(`[性能优化] 使用upsert策略批量处理数据`);

        const batchSize = 300; // 对于upsert，使用稍小的批次以避免超时
        const batches = [];

        for (let i = 0; i < gradeDataWithExamId.length; i += batchSize) {
          batches.push(gradeDataWithExamId.slice(i, i + batchSize));
        }

        console.log(
          `[性能优化] 将数据分成 ${batches.length} 批进行upsert，每批最多 ${batchSize} 条记录`
        );

        let totalUpserted = 0;
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          console.log(
            `[性能优化] 处理第 ${i + 1}/${batches.length} 批数据，共 ${batch.length} 条记录`
          );

          // 修复：使用正确的约束字段 (exam_id, student_id, subject) 而不是 (exam_id, student_id)
          const { error: upsertError } = await supabase
            .from("grade_data")
            .upsert(batch, {
              onConflict: "exam_id,student_id,subject", // 修改：包含subject字段，使不同学科成绩可以共存
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error(`批次 ${i + 1} upsert失败: `, upsertError);

            // 尝试使用替代方案：如果upsert失败，尝试使用replace策略
            console.log(
              `[恢复策略] upsert失败，尝试使用replace策略作为备选方案...`
            );

            // 删除该考试的所有现有数据
            const { error: deleteError } = await supabase
              .from("grade_data")
              .delete()
              .eq("exam_id", examId);

            if (deleteError) {
              console.error(`删除旧数据失败: ${deleteError.message}`);
              throw new Error(
                `更新数据失败，备选方案也失败: ${deleteError.message}`
              );
            }

            // 批量插入所有数据
            const { error: insertError } = await supabase
              .from("grade_data")
              .insert(gradeDataWithExamId);

            if (insertError) {
              console.error(`备选方案插入失败: `, insertError);
              throw new Error(
                `更新数据失败，备选方案也失败: ${insertError.message}`
              );
            }

            console.log(
              `[恢复策略] 备选方案成功: 已删除旧数据并插入 ${gradeDataWithExamId.length} 条新记录`
            );
            totalUpserted = gradeDataWithExamId.length;
            break;
          }

          totalUpserted += batch.length;
          console.log(
            `[性能优化] 批次 ${i + 1} upsert成功，累计处理 ${totalUpserted}/${gradeDataWithExamId.length} 条记录`
          );
        }
      } else if (mergeStrategy === "append") {
        // 🚀 性能优化：仅插入新记录，忽略已存在的记录
        console.log(`[性能优化] 使用append策略批量插入新记录`);

        const batchSize = 500;
        const batches = [];

        for (let i = 0; i < gradeDataWithExamId.length; i += batchSize) {
          batches.push(gradeDataWithExamId.slice(i, i + batchSize));
        }

        console.log(
          `[性能优化] 将数据分成 ${batches.length} 批进行插入，每批最多 ${batchSize} 条记录`
        );

        let totalInserted = 0;
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          console.log(
            `[性能优化] 处理第 ${i + 1}/${batches.length} 批数据，共 ${batch.length} 条记录`
          );

          // 使用upsert但设置ignoreDuplicates为true
          const { error: insertError } = await supabase
            .from("grade_data")
            .upsert(batch, {
              onConflict: "exam_id,student_id,subject",
              ignoreDuplicates: true, // 忽略已存在的记录
            });

          if (insertError) {
            console.error(`批次 ${i + 1} 插入失败: `, insertError);
            throw insertError;
          }

          totalInserted += batch.length;
          console.log(
            `[性能优化] 批次 ${i + 1} 插入成功，累计插入 ${totalInserted}/${gradeDataWithExamId.length} 条记录`
          );
        }
      } else if (mergeStrategy === "skip") {
        // skip策略：不进行任何数据操作，直接返回成功
        console.log(
          `[性能优化] 使用skip策略，跳过数据导入（无现有数据检测到）`
        );

        // 计算耗时
        const endTime = Date.now();
        const timeUsed = (endTime - startTime) / 1000;
        console.log(
          `[性能优化] 跳过数据导入完成，耗时: ${timeUsed.toFixed(2)}秒`
        );

        return {
          success: true,
          message: `考试数据已存在或无需导入，根据策略跳过导入`,
          examId,
        };
      } else {
        throw new Error(`不支持的合并策略: ${mergeStrategy}`);
      }

      // 计算耗时
      const endTime = Date.now();
      const timeUsed = (endTime - startTime) / 1000;
      console.log(
        `[性能优化] 保存考试数据完成，耗时: ${timeUsed.toFixed(2)}秒`
      );

      return {
        success: true,
        message: `成功保存考试数据，共 ${gradeDataWithExamId.length} 条记录`,
        examId,
      };
    } catch (error: any) {
      console.error("保存成绩数据失败: ", error);
      return {
        success: false,
        message: `保存成绩数据失败: ${error.message || "未知错误"}`,
        error,
      };
    }
  },

  /**
   * 获取考试列表
   */
  async getExamList() {
    return requestCache.get("exams_list", async () => {
      return safeQuery("exams", async () => {
        const { data, error } = await supabase
          .from("exams")
          .select("id, title, type, date, subject, scope")
          .order("date", { ascending: false });

        if (error) throw error;

        return { data, error: null };
      });
    });
  },

  /**
   * 获取考试成绩数据
   */
  async getExamResults(examId: string) {
    return requestCache.get(`exam_results_${examId}`, async () => {
      return safeQuery("grade_data", async () => {
        const { data, error } = await supabase
          .from("grade_data")
          .select("*")
          .eq("exam_id", examId);

        if (error) throw error;

        return { data, error: null };
      });
    });
  },

  /**
   * 获取学生历次成绩
   */
  async getStudentResults(studentId: string) {
    try {
      const { data, error } = await supabase
        .from("grade_data")
        .select("*, exams!inner(id, title, type, date, subject, scope)")
        .eq("student_id", studentId)
        .order("exams.date", { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("获取学生成绩失败:", error);
      return { data: [], error };
    }
  },

  /**
   * 分析考试数据
   */
  async analyzeExamData(examId: string) {
    try {
      // 调用 Edge Function 分析成绩数据
      const { data, error } = await supabase.functions.invoke(
        "analyze-grades",
        {
          body: { examId },
        }
      );

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("分析成绩数据失败:", error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error("未知错误"),
      };
    }
  },

  /**
   * 使用AI分析成绩数据
   */
  async aiAnalyzeExamData(examData: any[], examInfo: any) {
    try {
      // 调用 AI 分析 Edge Function
      const { data, error } = await supabase.functions.invoke(
        "ai-grade-analysis",
        {
          body: {
            examData,
            examInfo,
          },
        }
      );

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("AI分析失败:", error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error("AI分析发生错误"),
      };
    }
  },

  /**
   * 获取学生成绩趋势
   */
  async getStudentTrend(studentId: string, subjectFilter?: string[]) {
    try {
      let query = supabase
        .from("grade_data")
        .select("*, exams!inner(id, title, type, date, subject, scope)")
        .eq("student_id", studentId)
        .order("exams.date", { ascending: true });

      if (subjectFilter && subjectFilter.length > 0) {
        query = query.in("subject", subjectFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("获取学生成绩趋势失败:", error);
      return { data: [], error };
    }
  },

  /**
   * 班级排名分析
   */
  async getClassRanking(examId: string) {
    try {
      const { data, error } = await supabase.rpc("get_class_ranking", {
        p_exam_id: examId,
      });
      if (error) throw error;
      // Normalize snake_case RPC response to camelCase for callers
      const rankingData = (data ?? []).map((row: any) => ({
        className: row.class_name,
        averageScore: Number(row.average_score),
        maxScore: Number(row.max_score),
        minScore: Number(row.min_score),
        studentCount: Number(row.student_count),
        passCount: Number(row.pass_count),
        passRate: Number(row.pass_rate),
      }));
      return { data: rankingData, error: null };
    } catch (error) {
      console.error("获取班级排名失败:", error);
      return { data: [], error };
    }
  },

  /**
   * 获取学生排名情况
   */
  async getStudentRanking(examId: string, classFilter?: string) {
    try {
      const { data, error } = await supabase.rpc("get_student_ranking", {
        p_exam_id: examId,
        p_class_name: classFilter ?? null,
      });
      if (error) throw error;
      return { data: data ?? [], error: null };
    } catch (error) {
      console.error("获取学生排名失败:", error);
      return { data: [], error };
    }
  },

  /**
   * 获取学生进步情况分析
   */
  async getStudentProgress(studentId: string, limit = 5) {
    try {
      // 获取学生最近几次考试成绩
      const { data, error } = await supabase
        .from("grade_data")
        .select("*, exams!inner(*)")
        .eq("student_id", studentId)
        .order("exams.date", { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data || data.length <= 1) {
        return { data: { exams: [], progressData: {} }, error: null };
      }

      // 整理考试信息
      const exams = data.map((record) => ({
        id: record.exam_id,
        title: record.exams.title,
        date: record.exams.date,
        type: record.exams.type,
      }));

      // 计算进步情况
      const progressData: Record<string, any> = {};

      // 总分进步情况
      const totalScores = data.map((record) => ({
        examId: record.exam_id,
        score: record.total_score || 0,
        examTitle: record.exams.title,
        examDate: record.exams.date,
      }));

      if (totalScores.length >= 2) {
        progressData.totalScore = {
          current: totalScores[0].score,
          previous: totalScores[1].score,
          difference: totalScores[0].score - totalScores[1].score,
          percentChange:
            totalScores[1].score !== 0
              ? ((totalScores[0].score - totalScores[1].score) /
                  totalScores[1].score) *
                100
              : 0,
          trend: totalScores.map((item) => ({
            examId: item.examId,
            examTitle: item.examTitle,
            score: item.score,
            date: item.examDate,
          })),
        };
      }

      // 分析各科目进步情况
      // 需要确保数据中有科目字段，这里假设存储在metadata中
      const subjects = new Set<string>();

      // 首先找出所有科目
      data.forEach((record) => {
        if (record.metadata) {
          Object.keys(record.metadata).forEach((key) => {
            if (key.endsWith("_score")) {
              subjects.add(key.replace("_score", ""));
            }
          });
        }
      });

      // 然后分析每个科目的进步情况
      subjects.forEach((subject) => {
        const fieldName = `${subject}_score`;
        const subjectScores = data
          .filter(
            (record) =>
              record.metadata && record.metadata[fieldName] !== undefined
          )
          .map((record) => ({
            examId: record.exam_id,
            score: record.metadata[fieldName],
            examTitle: record.exams.title,
            examDate: record.exams.date,
          }));

        if (subjectScores.length >= 2) {
          progressData[subject] = {
            current: subjectScores[0].score,
            previous: subjectScores[1].score,
            difference: subjectScores[0].score - subjectScores[1].score,
            percentChange:
              subjectScores[1].score !== 0
                ? ((subjectScores[0].score - subjectScores[1].score) /
                    subjectScores[1].score) *
                  100
                : 0,
            trend: subjectScores.map((item) => ({
              examId: item.examId,
              examTitle: item.examTitle,
              score: item.score,
              date: item.examDate,
            })),
          };
        }
      });

      return {
        data: {
          exams,
          progressData,
        },
        error: null,
      };
    } catch (error) {
      console.error("获取学生进步情况失败:", error);
      return { data: null, error };
    }
  },

  /**
   * 创建成绩标签
   */
  async createTag(name: string, description?: string, color?: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "grade_tags")
        .eq("table_schema", "public");

      if (tableCheckError) throw tableCheckError;

      if (!tables || tables.length === 0) {
        console.error("grade_tags表不存在，请先创建表");
        return {
          data: null,
          error: new Error("grade_tags表不存在，请先执行迁移脚本创建所需表"),
        };
      }

      const { data, error } = await supabase
        .from("grade_tags")
        .insert([{ name, description, color }])
        .select();

      if (error) throw error;

      return { data: data?.[0], error: null };
    } catch (error) {
      console.error("创建标签失败:", error);
      return { data: null, error };
    }
  },

  /**
   * 获取标签列表
   */
  async getTags() {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "grade_tags")
        .eq("table_schema", "public");

      if (tableCheckError) throw tableCheckError;

      if (!tables || tables.length === 0) {
        console.warn("grade_tags表不存在");
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from("grade_tags")
        .select("*")
        .order("name");

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("获取标签列表失败:", error);
      return { data: [], error };
    }
  },

  /**
   * 为成绩添加标签
   */
  async addTagToGradeData(gradeDataId: string, tagId: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "grade_data_tags")
        .eq("table_schema", "public");

      if (tableCheckError) throw tableCheckError;

      if (!tables || tables.length === 0) {
        console.error("grade_data_tags表不存在");
        return {
          data: null,
          error: new Error(
            "grade_data_tags表不存在，请先执行迁移脚本创建所需表"
          ),
        };
      }

      const { data, error } = await supabase
        .from("grade_data_tags")
        .insert([{ grade_id: gradeDataId, tag_id: tagId }])
        .select();

      if (error) throw error;

      return { data: data?.[0], error: null };
    } catch (error) {
      console.error("添加标签失败:", error);
      return { data: null, error };
    }
  },

  /**
   * 从成绩中移除标签
   */
  async removeTagFromGradeData(gradeDataId: string, tagId: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "grade_data_tags")
        .eq("table_schema", "public");

      if (tableCheckError) throw tableCheckError;

      if (!tables || tables.length === 0) {
        console.warn("grade_data_tags表不存在");
        return { success: true, error: null };
      }

      const { data, error } = await supabase
        .from("grade_data_tags")
        .delete()
        .eq("grade_id", gradeDataId)
        .eq("tag_id", tagId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (error) {
      console.error("移除标签失败:", error);
      return { success: false, error };
    }
  },

  /**
   * 获取带有特定标签的成绩数据
   */
  async getGradesByTag(tagId: string) {
    try {
      // 首先检查表是否存在
      const { data: tables, error: tableCheckError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_name", "grade_data_tags")
        .eq("table_schema", "public");

      if (tableCheckError) throw tableCheckError;

      if (!tables || tables.length === 0) {
        console.warn("grade_data_tags表不存在");
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from("grade_data_tags")
        .select("grade_id")
        .eq("tag_id", tagId);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { data: [], error: null };
      }

      const gradeIds = data.map((item) => item.grade_id);

      const { data: gradeData, error: gradeError } = await supabase
        .from("grade_data")
        .select("*, exams!inner(*)")
        .in("id", gradeIds);

      if (gradeError) throw gradeError;

      return { data: gradeData, error: null };
    } catch (error) {
      console.error("获取标签成绩数据失败:", error);
      return { data: [], error };
    }
  },

  /**
   * 班级成绩对比
   */
  async compareClassPerformance(examId: string, classNames: string[]) {
    try {
      if (!classNames || classNames.length === 0) {
        return { data: [], error: null };
      }
      const { data, error } = await supabase.rpc("compare_class_performance", {
        p_exam_id: examId,
        p_class_names: classNames,
      });
      if (error) throw error;
      const classStats = (data ?? []).map((row: any) => ({
        className: row.class_name,
        averageScore: Number(row.average_score),
        maxScore: Number(row.max_score),
        minScore: Number(row.min_score),
        passRate: Number(row.pass_rate),
        studentCount: Number(row.student_count),
      }));
      return { data: classStats, error: null };
    } catch (error) {
      console.error("比较班级表现失败:", error);
      return { data: [], error };
    }
  },

  /**
   * 导出分析报告
   */
  async exportAnalysisReport(examId: string) {
    try {
      // 获取考试信息
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", examId)
        .single();

      if (examError) throw examError;

      // 获取考试成绩数据
      const { data: gradeData, error: gradeError } = await supabase
        .from("grade_data")
        .select("*")
        .eq("exam_id", examId);

      if (gradeError) throw gradeError;

      // 获取班级排名
      const { data: classRanking, error: rankingError } =
        await this.getClassRanking(examId);

      if (rankingError) throw rankingError;

      // 生成报告内容
      const reportContent = {
        examInfo: examData,
        gradeData,
        classRanking,
        timestamp: new Date().toISOString(),
      };

      return { data: reportContent, error: null };
    } catch (error) {
      console.error("导出分析报告失败:", error);
      return { data: null, error };
    }
  },

  /**
   * @deprecated DDL 已迁移到 supabase/migrations/。此方法保留仅为兼容旧调用，不再执行任何操作。
   */
  async initializeTables() {
    console.warn(
      "[DEPRECATED] initializeTables() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动初始化。",
    };
    // eslint-disable-next-line no-unreachable
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixStudentsTable() {
    console.warn("[DEPRECATED] checkAndFixStudentsTable() 已废弃。");
    return { success: true };
  },

  /**
   * 检查并修复成绩数据表 - 简化健壮版本
   */
  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixGradeDataTable() {
    console.warn("[DEPRECATED] checkAndFixGradeDataTable() 已废弃。");
    return { success: true };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async ensureStudentsTableExists() {
    console.warn("[DEPRECATED] ensureStudentsTableExists() 已废弃。");
    return { success: true };
  },

  /**
   * 获取交叉分析数据
   * @param rowDimension 行维度
   * @param colDimension 列维度
   * @param metric 分析指标
   */
  getCrossDimensionData: async (
    rowDimension: string,
    colDimension: string,
    metric: string
  ) => {
    try {
      // 构建查询参数
      const params = new URLSearchParams({
        row_dimension: rowDimension,
        col_dimension: colDimension,
        metric: metric,
      });

      // 使用Supabase函数获取数据
      const { data, error } = await supabase.functions.invoke("analyze-data", {
        body: {
          row_dimension: rowDimension,
          col_dimension: colDimension,
          metric: metric,
        },
      });

      if (error) {
        console.error("调用交叉分析API失败:", error);
        throw new Error("获取交叉维度分析数据失败");
      }

      return data;
    } catch (error) {
      console.error("获取交叉维度分析数据失败:", error);
      throw new Error("获取交叉维度分析数据失败");
    }
  },

  // 尝试初始化或验证数据库
  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async initializeDatabase() {
    console.warn("[DEPRECATED] initializeDatabase() 已废弃。");
    return { success: true };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixExamsTable() {
    console.warn("[DEPRECATED] checkAndFixExamsTable() 已废弃。");
    return { success: true };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async fixGradeDataTable() {
    console.warn("[DEPRECATED] fixGradeDataTable() 已废弃。");
    return { success: true };
  },

  /** @deprecated 安全敏感：不再从前端授予 exec_sql 权限。 */
  async createHelperFunctions() {
    console.warn("[DEPRECATED] createHelperFunctions() 已废弃。");
    return { success: true };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async fixAllTables() {
    console.warn("[DEPRECATED] fixAllTables() 已废弃。");
    return { success: true };
  },

  async deleteExam(
    examId: string
  ): Promise<{ success: boolean; error?: any; message?: string }> {
    if (!examId) {
      return { success: false, message: "考试ID不能为空" };
    }

    try {
      console.log(`[GradeAnalysisService] 开始删除考试: ${examId}`);

      // 执行级联删除：先删除成绩数据，再删除考试记录
      // 1. 删除相关的成绩数据
      const { error: gradeDeleteError } = await supabase
        .from("grade_data")
        .delete()
        .eq("exam_id", examId);

      if (gradeDeleteError) {
        console.error("删除成绩数据失败:", gradeDeleteError);
        return {
          success: false,
          error: gradeDeleteError,
          message: `删除成绩数据失败: ${gradeDeleteError.message}`,
        };
      }

      // 2. 删除考试记录
      const { error: examDeleteError } = await supabase
        .from("exams")
        .delete()
        .eq("id", examId);

      if (examDeleteError) {
        console.error("删除考试记录失败:", examDeleteError);
        return {
          success: false,
          error: examDeleteError,
          message: `删除考试记录失败: ${examDeleteError.message}`,
        };
      }

      console.log(`[GradeAnalysisService] 考试 ${examId} 删除成功`);
      return { success: true, message: "考试删除成功" };
    } catch (error) {
      console.error("删除考试时发生错误:", error);
      return {
        success: false,
        error,
        message:
          error instanceof Error ? error.message : "删除考试时发生未知错误",
      };
    }
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async fixExamsTable() {
    console.warn(
      "[DEPRECATED] fixExamsTable() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixGradeColumn() {
    console.warn(
      "[DEPRECATED] checkAndFixGradeColumn() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixImportStrategyColumn() {
    console.warn(
      "[DEPRECATED] checkAndFixImportStrategyColumn() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixMatchTypeColumn() {
    console.warn(
      "[DEPRECATED] checkAndFixMatchTypeColumn() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixMultipleMatchesColumn() {
    console.warn(
      "[DEPRECATED] checkAndFixMultipleMatchesColumn() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixRankInClassColumn() {
    console.warn(
      "[DEPRECATED] checkAndFixRankInClassColumn() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixRankInGradeColumn() {
    console.warn(
      "[DEPRECATED] checkAndFixRankInGradeColumn() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async checkAndFixRankInSchoolColumn() {
    console.warn(
      "[DEPRECATED] checkAndFixRankInSchoolColumn() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /** @deprecated Schema 由 supabase/migrations/ 管理。 */
  async ensureAllRequiredColumns() {
    console.warn(
      "[DEPRECATED] ensureAllRequiredColumns() 已废弃，请使用 supabase/migrations/ 管理 schema。"
    );
    return {
      success: true,
      message: "Schema 由 Supabase migrations 管理，无需手动修复。",
    };
  },

  /**
   * 确保考试记录存在，如果不存在则创建
   * @param examInfo 考试信息
   * @returns 考试ID
   */
  async ensureExamExists(examInfo: ExamInfo): Promise<string> {
    // 准备考试数据
    const examData = {
      title: examInfo.title,
      type: examInfo.type,
      date: examInfo.date,
      subject: examInfo.subject || null,
      scope: "class", // 默认考试范围
    };

    // 保存考试信息
    const { data: examRecord, error: examError } = await supabase
      .from("exams")
      .upsert([examData], {
        onConflict: "title,date,type",
        ignoreDuplicates: false,
      })
      .select();

    if (examError) throw examError;

    // 获取考试ID
    const examId = examRecord?.[0]?.id;
    if (!examId) throw new Error("考试保存失败");

    return examId;
  },

  /**
   * 增强学生匹配函数
   */
  async matchStudentEnhanced(studentInfo: {
    student_id?: string;
    name?: string;
    class_name?: string;
  }) {
    return await matchStudentEnhanced(studentInfo);
  },

  /**
   * 原始学生匹配函数（备用）
   */
  async originalMatchStudent(studentInfo: {
    student_id?: string;
    name?: string;
    class_name?: string;
  }) {
    return await originalMatchStudent(studentInfo);
  },
};

// 类型扩展
interface RecordWithExamInfo extends Record<string, any> {
  exam_date?: string;
  exam_id?: string;
}

// 常见科目名称的英文与中文对应
const COMMON_SUBJECTS = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  history: "历史",
  geography: "地理",
  politics: "政治",
  society: "社会",
  science: "科学",
  music: "音乐",
  art: "美术",
  pe: "体育",
  technology: "信息技术",
  moral: "思想品德",
};

/**
 * 将宽表格式的成绩数据转换为长表格式
 * @param item 宽表格式的单条学生记录
 * @param baseStudentRecord 基础学生信息记录
 * @param examInfo 考试信息
 * @returns 转换后的长表格式记录数组
 */
function convertWideToLongFormat(
  item: Record<string, any>,
  baseStudentRecord: Record<string, any>,
  examInfo: ExamInfo & { exam_id?: string }
): RecordWithExamInfo[] {
  const result: RecordWithExamInfo[] = [];

  // 记录班级信息初始状态
  console.log(
    `[convertWideToLongFormat] 开始处理数据行，原始班级信息: ${item.class_name || "未设置"}`
  );

  // 提取数据行中的学生基本信息
  const studentInfo: Record<string, any> = {
    student_id:
      baseStudentRecord.student_id || item.student_id || item.学号 || "",
    name: baseStudentRecord.name || item.name || item.姓名 || "",
    class_name:
      item.class_name ||
      item.班级 ||
      baseStudentRecord.class_name ||
      "未知班级", // 优先使用数据行的班级信息
    grade_level:
      item.grade_level || item.年级 || baseStudentRecord.grade_level || null,
  };

  console.log(
    `[convertWideToLongFormat] 提取的学生信息: ID=${studentInfo.student_id}, 姓名=${studentInfo.name}, 班级=${studentInfo.class_name}`
  );

  // 提取考试信息
  const examinationInfo: Record<string, any> = {
    exam_title: examInfo.title || "",
    exam_type: examInfo.type || "",
    exam_date: examInfo.date || new Date().toISOString().split("T")[0],
    exam_scope: examInfo.scope || "class", // 默认班级范围
    // 确保exam_id从baseStudentRecord传递过来
    exam_id: baseStudentRecord.exam_id,
  };

  // 记录exam_id，便于调试
  console.log(
    `[convertWideToLongFormat] 使用的exam_id: ${examinationInfo.exam_id}`
  );

  // 增强的科目识别模式
  const ENHANCED_SUBJECT_PATTERNS = {
    语文: ["语文", "语", "chinese", "yuwen"],
    数学: ["数学", "数", "math", "mathematics", "shuxue"],
    英语: ["英语", "英", "english", "yingyu"],
    物理: ["物理", "物", "physics", "wuli"],
    化学: ["化学", "化", "chemistry", "huaxue"],
    生物: ["生物", "生", "biology", "shengwu"],
    政治: ["政治", "政", "politics", "zhengzhi", "道法", "道德与法治"],
    历史: ["历史", "史", "history", "lishi"],
    地理: ["地理", "地", "geography", "dili"],
    总分: ["总分", "总", "total", "合计"],
  };

  // 扫描每个列，寻找科目相关数据
  const allColumns = Object.keys(item);
  const subjectData: Record<string, any> = {};

  // 智能识别科目字段
  allColumns.forEach((col) => {
    // 跳过非科目字段 (姓名、班级、学号等)
    if (
      [
        "姓名",
        "名字",
        "班级",
        "学号",
        "年级",
        "student_id",
        "name",
        "class_name",
        "grade_level",
      ].includes(col)
    ) {
      return;
    }

    // 遍历所有科目模式进行匹配
    for (const [subject, patterns] of Object.entries(
      ENHANCED_SUBJECT_PATTERNS
    )) {
      for (const pattern of patterns) {
        if (col.toLowerCase().includes(pattern.toLowerCase())) {
          // 初始化科目数据对象
          if (!subjectData[subject]) {
            subjectData[subject] = {};
          }

          // 判断字段类型（支持新的字段结构）
          if (
            col.includes("分数") ||
            col.includes("score") ||
            col.includes("成绩")
          ) {
            subjectData[subject].score = parseFloat(item[col]) || 0;
          } else if (col.includes("总分") && !col.includes("满分")) {
            subjectData[subject].total_score = parseFloat(item[col]) || 0;
          } else if (
            col.includes("满分") ||
            col.includes("总分满分") ||
            col.includes("subject_total_score")
          ) {
            subjectData[subject].subject_total_score =
              parseFloat(item[col]) || 100;
          } else if (
            col.includes("等级") ||
            col.includes("grade") ||
            col.includes("评级") ||
            col.includes("等第")
          ) {
            subjectData[subject].original_grade = item[col]; // 使用新的原始等级字段
          } else if (
            col.includes("班名") ||
            col.includes("class_rank") ||
            col.includes("班级排名")
          ) {
            subjectData[subject].rank_in_class = parseInt(item[col]) || 0;
          } else if (
            col.includes("校名") ||
            col.includes("级名") ||
            col.includes("grade_rank") ||
            col.includes("年级排名")
          ) {
            subjectData[subject].rank_in_grade = parseInt(item[col]) || 0;
          } else if (col.includes("百分位") || col.includes("percentile")) {
            subjectData[subject].percentile = parseFloat(item[col]) || null;
          } else if (
            col.includes("标准分") ||
            col.includes("z_score") ||
            col.includes("zscore")
          ) {
            subjectData[subject].z_score = parseFloat(item[col]) || null;
          } else {
            // 如果没有明确的类型标识，尝试根据数据类型推断
            const value = item[col];
            if (
              typeof value === "number" ||
              (typeof value === "string" && /^\d+\.?\d*$/.test(value))
            ) {
              // 数值类型，可能是分数
              if (!subjectData[subject].score) {
                subjectData[subject].score = parseFloat(value) || 0;
              }
            } else {
              // 文本类型，可能是等级
              if (!subjectData[subject].original_grade) {
                subjectData[subject].original_grade = value;
              }
            }
          }
          break;
        }
      }
    }
  });

  // 为每个识别到的科目创建记录（使用新的字段结构）
  Object.entries(subjectData).forEach(([subject, data]) => {
    if (
      data.score !== undefined ||
      data.total_score !== undefined ||
      data.original_grade !== undefined
    ) {
      const subjectRecord: Record<string, any> = {
        ...studentInfo,
        ...examinationInfo,
        subject,
        // 分数字段（优先使用score，然后是total_score）
        score: data.score || null,
        total_score: data.total_score || null,
        subject_total_score: data.subject_total_score || 100, // 默认满分100
        // 等级字段（新结构）
        original_grade: data.original_grade || null, // 原始等级（CSV中的等级）
        computed_grade: null, // 计算等级（由系统自动计算）
        grade: data.original_grade || null, // 向后兼容的等级字段
        // 排名字段
        rank_in_class: data.rank_in_class || null,
        rank_in_grade: data.rank_in_grade || null,
        // 统计字段
        percentile: data.percentile || null,
        z_score: data.z_score || null,
      };

      result.push(subjectRecord);
    }
  });

  // 如果没有识别到任何科目数据，尝试传统方法作为后备
  if (result.length === 0) {
    console.log("[convertWideToLongFormat] 使用传统方法作为后备");

    // 检查是否存在"总分"字段
    const hasTotalScore = Object.keys(item).some(
      (key) => key.includes("总分") && key.includes("分数")
    );

    const subjectColumns = new Set<string>();

    // 识别科目字段（传统方法）
    allColumns.forEach((col) => {
      // 跳过非科目字段 (姓名、班级、学号等)
      if (
        [
          "姓名",
          "名字",
          "班级",
          "学号",
          "年级",
          "student_id",
          "name",
          "class_name",
          "grade_level",
        ].includes(col)
      ) {
        return;
      }

      // 识别科目列，通常为 "科目名+分数/等级/排名" 的格式，如 "语文分数"，"数学等级"
      const subjectMatch = col.match(
        /^([\u4e00-\u9fa5a-zA-Z]+)(分数|成绩|等级|评级|排名|校名|班名|级名|满分|总分)/
      );
      if (subjectMatch) {
        const subject = subjectMatch[1];
        if (subject !== "总分") {
          // 排除"总分"字段，单独处理
          subjectColumns.add(subject);
        }
      }
    });

    // 对于每个识别到的科目，创建一条记录
    subjectColumns.forEach((subject) => {
      const scoreColumn = `${subject}分数`;
      const totalScoreColumn = `${subject}总分`;
      const totalScoreFullColumn = `${subject}满分`;
      const gradeColumn = `${subject}等级`;
      const classRankColumn = `${subject}班名`;
      const gradeRankColumn = `${subject}校名`;

      if (
        item[scoreColumn] !== undefined ||
        item[totalScoreColumn] !== undefined
      ) {
        const subjectRecord: Record<string, any> = {
          ...studentInfo,
          ...examinationInfo,
          subject,
          score: item[scoreColumn] ? parseFloat(item[scoreColumn]) : null,
          total_score: item[totalScoreColumn]
            ? parseFloat(item[totalScoreColumn])
            : null,
          subject_total_score: item[totalScoreFullColumn]
            ? parseFloat(item[totalScoreFullColumn])
            : 100,
        };

        // 添加可选字段（使用新的字段结构）
        if (item[gradeColumn] !== undefined) {
          subjectRecord.original_grade = item[gradeColumn]; // 原始等级
          subjectRecord.grade = item[gradeColumn]; // 向后兼容
        }

        if (item[classRankColumn] !== undefined) {
          subjectRecord.rank_in_class = parseInt(item[classRankColumn]) || 0;
        }

        if (item[gradeRankColumn] !== undefined) {
          subjectRecord.rank_in_grade = parseInt(item[gradeRankColumn]) || 0;
        }

        result.push(subjectRecord);
      }
    });
  }

  console.log(
    `[convertWideToLongFormat] 处理完成，共生成 ${result.length} 条科目记录，班级信息为 ${studentInfo.class_name}，exam_id为 ${examinationInfo.exam_id}`
  );

  return result;
}

// 自动分析成绩数据
export async function autoAnalyzeGradeData(data: any[], examInfo?: any) {
  try {
    const { data: response, error } = await supabase.functions.invoke(
      "auto-analyze-data",
      {
        body: { data, examInfo },
      }
    );

    if (error) {
      console.error("自动分析数据失败:", error);
      throw new Error(`自动分析数据失败: ${error.message}`);
    }

    return response;
  } catch (error) {
    console.error("自动分析数据错误:", error);
    throw error;
  }
}

// 规范化科目名称
export function normalizeSubjectName(subject: string): string {
  if (!subject) return "未知科目";

  // 转换为小写并去除空格进行比较
  const normalized = String(subject).toLowerCase().trim();

  // 常见科目名称映射
  const subjectMapping: Record<string, string> = {
    // 中文科目
    语: "语文",
    语文: "语文",
    chinese: "语文",
    yuwen: "语文",
    数: "数学",
    数学: "数学",
    math: "数学",
    mathematics: "数学",
    shuxue: "数学",
    英: "英语",
    英语: "英语",
    english: "英语",
    yingyu: "英语",
    物: "物理",
    物理: "物理",
    physics: "物理",
    wuli: "物理",
    化: "化学",
    化学: "化学",
    chemistry: "化学",
    huaxue: "化学",
    生: "生物",
    生物: "生物",
    biology: "生物",
    shengwu: "生物",
    政: "政治",
    政治: "政治",
    politics: "政治",
    zhenzhi: "政治",
    道法: "政治",
    道德与法治: "政治",
    道德法治: "政治",
    思政: "政治",
    思想政治: "政治",
    德育: "政治",
    史: "历史",
    历史: "历史",
    history: "历史",
    lishi: "历史",
    地: "地理",
    地理: "地理",
    geography: "地理",
    dili: "地理",
    // 常见组合和缩写
    文综: "文科综合",
    文科综合: "文科综合",
    理综: "理科综合",
    理科综合: "理科综合",
    总分: "总分",
    total: "总分",
    总: "总分",
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

/**
 * 获取系统中所有不同的班级名称
 * @returns 不同班级名称的数组
 */
export async function getDistinctClassNames(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("grade_data")
      .select("class_name")
      .not("class_name", "is", null)
      .order("class_name");

    if (error) {
      console.error("获取班级名称失败:", error);
      throw error;
    }

    // 提取班级名称并去重
    const classNames = data
      .map((row) => row.class_name)
      .filter(Boolean)
      .map((name) => String(name).trim())
      .filter((name) => name !== "");

    // 使用Set去重
    return [...new Set(classNames)];
  } catch (error) {
    console.error("获取班级名称出错:", error);
    return [];
  }
}

/**
 * 保存考试数据
 * 直接导出 gradeAnalysisService.saveExamData 以便兼容现有代码
 *
 * 支持两种调用方式：
 * 1. saveExamData({examName, examDate, examType, examId, data, dataFormat}) - 新的对象参数方式
 * 2. saveExamData(processedData, examInfo, mergeStrategy, options) - 原始参数列表方式
 */
export const saveExamData = (
  dataOrParams: Record<string, any> | Record<string, any>[],
  examInfo?: ExamInfo,
  mergeStrategy?: MergeStrategy,
  options?: {
    examScope?: "class" | "grade";
    newStudentStrategy?: "create" | "ignore";
  }
) => {
  // 检测是否使用了新的对象参数方式调用
  if (
    dataOrParams &&
    !Array.isArray(dataOrParams) &&
    typeof dataOrParams === "object" &&
    "data" in dataOrParams
  ) {
    const params = dataOrParams;
    console.log("[saveExamData适配器] 检测到对象参数调用方式");

    // 构造考试信息对象
    const constructedExamInfo = {
      title: params.examName,
      type: params.examType || params.examId,
      date: params.examDate || new Date().toISOString().split("T")[0],
      subject: params.subject || "",
    };

    console.log("[saveExamData适配器] 构造的考试信息:", constructedExamInfo);

    // 确保考试信息完整
    if (!constructedExamInfo.title) {
      throw new Error("考试标题不能为空");
    }

    // 传递给原始服务方法
    return gradeAnalysisService.saveExamData(
      params.data,
      constructedExamInfo as ExamInfo,
      params.mergeStrategy || "replace",
      {
        examScope: params.examScope || "class",
        newStudentStrategy: params.newStudentStrategy || "create",
      }
    );
  }

  // 原始调用方式 - 直接传递各个参数
  return gradeAnalysisService.saveExamData(
    dataOrParams as Record<string, any>[],
    examInfo!,
    mergeStrategy || "replace",
    options
  );
};
