import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KnowledgePoint } from "@/types/homework";
import { OpenAI } from "openai";
import { env } from "@/env";
import { cacheManager, CacheTTL } from "@/services/CacheManager";

// 获取API密钥，避免直接使用process.env
const OPENAI_API_KEY = env.NEXT_PUBLIC_OPENAI_API_KEY || "";

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // 允许在浏览器环境中使用
});

// 扩展KnowledgePoint接口，添加合并功能所需的属性
interface EnhancedKnowledgePoint extends KnowledgePoint {
  mergedFromPoints?: string[];
}

// 辅助函数 - 简单的字符串相似度比较
function areStringSimilar(str1: string, str2: string): boolean {
  const normalize = (s: string) => s.toLowerCase().trim();
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return true;

  // 如果一个字符串是另一个的子串，则认为相似
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // 简单编辑距离判断
  if (s1.length > 3 && s2.length > 3) {
    let commonChars = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s2.includes(s1[i])) commonChars++;
    }
    const similarity = commonChars / Math.max(s1.length, s2.length);
    return similarity > 0.7;
  }

  return false;
}

// ✅ 缓存键前缀
const CACHE_PREFIX = {
  EMBEDDING: 'kp_embedding_',
};

// 知识点服务
export class knowledgePointService {
  // 计算两个知识点的语义相似度
  static async calculateSimilarity(
    point1: string,
    point2: string
  ): Promise<number> {
    try {
      // 1. 首先使用基本的字符串相似度进行快速评估
      if (point1 === point2) return 1.0;
      if (areStringSimilar(point1, point2)) return 0.8;

      // 如果两个字符串差异很大，先通过基本方法快速筛选
      const normalizedPoint1 = point1.toLowerCase().trim();
      const normalizedPoint2 = point2.toLowerCase().trim();

      // 如果完全不同，避免调用AI API
      if (normalizedPoint1.length > 0 && normalizedPoint2.length > 0) {
        const wordOverlap = this.calculateWordOverlap(
          normalizedPoint1,
          normalizedPoint2
        );
        if (wordOverlap < 0.1) return wordOverlap; // 如果词汇重叠度过低，直接返回
      }

      // 2. 使用缓存减少API调用
      const embedding1 = await this.getEmbedding(point1);
      const embedding2 = await this.getEmbedding(point2);

      // 3. 计算余弦相似度
      const similarity = this.cosineSimilarity(embedding1, embedding2);

      // 4. 结合多种相似度评估方法，增强准确性
      const finalSimilarity = Math.max(
        similarity,
        areStringSimilar(point1, point2) ? 0.8 : 0
      );

      return finalSimilarity;
    } catch (error) {
      console.error("计算语义相似度失败:", error);
      // 失败时降级为文本相似度
      return areStringSimilar(point1, point2) ? 0.7 : 0.1;
    }
  }

  // 将文本转换为嵌入向量
  private static async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = CACHE_PREFIX.EMBEDDING + text;

    return cacheManager.getOrSet(
      cacheKey,
      async () => {
        try {
          const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
          });

          const embedding = response.data[0].embedding;
          return embedding;
        } catch (error) {
          console.error("获取嵌入向量失败:", error);
          // 失败时返回一个随机向量
          return Array(1536)
            .fill(0)
            .map(() => Math.random());
        }
      },
      {
        ttl: CacheTTL.ONE_WEEK, // Embedding结果缓存1周
        persistent: true, // 持久化以减少API调用
      }
    );
  }

  // 计算余弦相似度
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("向量长度不匹配");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // 计算两个文本的词汇重叠度
  private static calculateWordOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    let intersection = 0;
    for (const word of words1) {
      if (words2.has(word)) intersection++;
    }

    const union = words1.size + words2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * 合并相似的知识点
   */
  static async mergeKnowledgePoints(
    knowledgePoints: KnowledgePoint[],
    similarityThreshold: number = 0.8
  ): Promise<KnowledgePoint[]> {
    // 已处理的知识点索引
    const processedIndices = new Set<number>();
    // 合并后的结果
    const mergedPoints: KnowledgePoint[] = [];

    for (let i = 0; i < knowledgePoints.length; i++) {
      // 跳过已处理的知识点
      if (processedIndices.has(i)) continue;

      const currentPoint = knowledgePoints[i];
      const similarPoints: KnowledgePoint[] = [currentPoint];

      // 标记当前索引为已处理
      processedIndices.add(i);

      // 寻找与当前知识点相似的其他知识点
      for (let j = i + 1; j < knowledgePoints.length; j++) {
        if (processedIndices.has(j)) continue;

        const otherPoint = knowledgePoints[j];
        const similarity = await this.calculateSimilarity(
          currentPoint.name,
          otherPoint.name
        );

        // 如果相似度超过阈值，合并这些知识点
        if (similarity >= similarityThreshold) {
          similarPoints.push(otherPoint);
          processedIndices.add(j);
        }
      }

      // 如果有多个相似的知识点，合并它们
      if (similarPoints.length > 1) {
        const mergedPoint = this.createMergedKnowledgePoint(similarPoints);
        mergedPoints.push(mergedPoint);
      } else {
        // 不需要合并，直接添加到结果中
        mergedPoints.push(currentPoint);
      }
    }

    return mergedPoints;
  }

  /**
   * 创建合并后的知识点
   */
  private static createMergedKnowledgePoint(
    points: KnowledgePoint[]
  ): KnowledgePoint {
    // 保留第一个点的ID和创建时间
    const basePoint = points[0];

    // 找出最全面的描述
    let bestDescription = "";
    for (const point of points) {
      if (
        point.description &&
        point.description.length > bestDescription.length
      ) {
        bestDescription = point.description;
      }
    }

    // 合并掌握度数据（如果有）
    let totalMasteryLevel = 0;
    let countWithMastery = 0;

    for (const point of points) {
      if (point.masteryLevel !== null && point.masteryLevel !== undefined) {
        totalMasteryLevel += point.masteryLevel;
        countWithMastery++;
      }
    }

    // 计算平均掌握度
    const avgMasteryLevel =
      countWithMastery > 0
        ? Math.round(totalMasteryLevel / countWithMastery)
        : null;

    // 创建合并后的知识点对象
    const merged = {
      ...basePoint,
      description: bestDescription || basePoint.description,
      masteryLevel: avgMasteryLevel,
      // 我们存储合并来源信息，但不保存在最终返回类型中
      // 因为KnowledgePoint类型中没有这个字段
      _mergedFrom: points.map((p) => p.id).join(","),
    } as KnowledgePoint;

    return merged;
  }

  /**
   * 保存知识点评分
   */
  static async saveKnowledgePointScores(
    assignmentId: string,
    studentId: string,
    scores: { pointId: string; score: number }[]
  ): Promise<boolean> {
    if (!assignmentId || !studentId || !scores || scores.length === 0) {
      return false;
    }

    try {
      // 首先检查表是否存在
      const { data: tableExists } = await supabase
        .from("submission_knowledge_points")
        .select("id")
        .limit(1);

      if (tableExists === null) {
        console.error("submission_knowledge_points表不存在");
        return false;
      }

      // 准备要更新的数据
      const upsertData = scores.map((item) => ({
        submission_id: assignmentId, // 使用submission_id而不是assignment_id
        student_id: studentId,
        knowledge_point_id: item.pointId,
        mastery_level: item.score, // 使用mastery_level保存评分
        updated_at: new Date().toISOString(),
      }));

      // 更新或插入评分
      const { error } = await supabase
        .from("submission_knowledge_points")
        .upsert(upsertData, {
          onConflict: "submission_id,knowledge_point_id",
          ignoreDuplicates: false,
        });

      if (error) {
        console.error("保存知识点评分失败:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("保存知识点评分异常:", error);
      return false;
    }
  }
}

// 从数据库获取作业的知识点
export async function getKnowledgePointsByHomeworkId(
  homeworkId: string
): Promise<KnowledgePoint[]> {
  if (!homeworkId) return [];

  try {
    const { data, error } = await supabase
      .from("knowledge_points")
      .select("*")
      .eq("homework_id", homeworkId);

    if (error) {
      console.error("获取知识点失败:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取知识点异常:", error);
    return [];
  }
}

/**
 * 获取所有知识点
 * @returns 所有知识点列表
 */
export async function getAllKnowledgePoints() {
  try {
    const { data, error } = await supabase
      .from("knowledge_points")
      .select("*")
      .order("name");

    if (error) {
      console.error("获取知识点列表失败:", error);
      toast.error(`获取知识点列表失败: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("获取知识点列表异常:", error);
    toast.error(`获取知识点列表失败: ${error.message}`);
    return [];
  }
}

/**
 * 创建新知识点
 * @param knowledgePoint 知识点数据
 * @returns 创建的知识点数据
 */
export async function createKnowledgePoint(knowledgePoint: {
  name: string;
  description?: string;
  homework_id: string;
}) {
  try {
    // 获取作业的所有现有知识点
    const { data: existingPoints, error: fetchError } = await supabase
      .from("knowledge_points")
      .select("id, name")
      .eq("homework_id", knowledgePoint.homework_id);

    if (fetchError) {
      console.error("获取现有知识点失败:", fetchError);
      toast.error(`创建知识点失败: ${fetchError.message}`);
      return { data: null, success: false, message: fetchError.message };
    }

    // 检查相似知识点
    for (const existing of existingPoints || []) {
      if (areStringSimilar(existing.name, knowledgePoint.name)) {
        console.log(
          `发现相似知识点: "${existing.name}" 与 "${knowledgePoint.name}"`
        );
        return {
          data: existing,
          success: true,
          message: `已存在相似知识点 "${existing.name}"，避免重复创建`,
        };
      }
    }

    // 创建新知识点
    const { data, error } = await supabase
      .from("knowledge_points")
      .insert(knowledgePoint)
      .select()
      .single();

    if (error) {
      console.error("创建知识点失败:", error);
      toast.error(`创建知识点失败: ${error.message}`);
      return { data: null, success: false, message: error.message };
    }

    return { data, success: true, message: "知识点创建成功" };
  } catch (error) {
    console.error("创建知识点异常:", error);
    toast.error(`创建知识点失败: ${error.message}`);
    return { data: null, success: false, message: error.message };
  }
}

/**
 * 批量创建知识点
 * @param knowledgePoints 知识点数据数组
 * @param homeworkId 作业ID
 * @returns 创建结果
 */
export async function bulkCreateKnowledgePoints(
  knowledgePoints: KnowledgePoint[],
  homeworkId: string
) {
  // 保存到localStorage作为备份
  try {
    const localStorageKey = `homework_${homeworkId}_knowledge_points`;
    localStorage.setItem(localStorageKey, JSON.stringify(knowledgePoints));
    console.log("已将知识点保存到本地存储作为备份", localStorageKey);
  } catch (localStoreError) {
    console.warn("保存到本地存储失败:", localStoreError);
  }

  try {
    // 先获取所有现有知识点，避免重复请求数据库
    const { data: existingPoints, error: fetchError } = await supabase
      .from("knowledge_points")
      .select("id, name")
      .eq("homework_id", homeworkId);

    if (fetchError) {
      console.error("获取现有知识点失败:", fetchError);
      toast.error(`创建知识点失败: ${fetchError.message}`);
      return {
        success: true,
        message: "保存到Supabase失败，但已保存到本地",
        skippedPoints: [],
        localSaved: true,
      };
    }

    const results = [];
    const skippedPoints = [];
    const successfulPoints = [];
    const createdKnowledgePointIds = []; // 存储新创建的知识点ID

    // 逐个创建知识点，避免批量操作失败
    for (const kp of knowledgePoints) {
      // 检查相似知识点
      let similarFound = false;

      for (const existing of existingPoints || []) {
        if (areStringSimilar(existing.name, kp.name)) {
          console.log(`跳过相似知识点: "${existing.name}" 与 "${kp.name}"`);
          skippedPoints.push({
            new: kp.name,
            existing: existing.name,
          });
          similarFound = true;
          break;
        }
      }

      if (!similarFound) {
        // 创建新知识点
        try {
          const result = await supabase
            .from("knowledge_points")
            .insert({
              name: kp.name,
              description: kp.description,
              homework_id: homeworkId,
              is_ai_generated: true, // 标记为AI生成的知识点
            })
            .select()
            .single();

          results.push({
            success: !result.error,
            message: result.error?.message || "创建成功",
            data: result.data,
          });

          // 如果创建成功，添加到现有知识点列表，防止后续重复创建
          if (result.data) {
            existingPoints.push(result.data);
            successfulPoints.push(result.data);
            createdKnowledgePointIds.push(result.data.id); // 存储ID以便于后续标记
          }
        } catch (insertError) {
          console.error("插入知识点失败:", insertError);
          results.push({
            success: false,
            message: insertError.message || "插入失败",
            data: null,
          });
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;

    // 如果有跳过的相似知识点
    if (skippedPoints.length > 0) {
      console.log("跳过了以下相似知识点:", skippedPoints);
    }

    // 构建消息
    let message = "";
    if (results.length === 0 && skippedPoints.length === 0) {
      message = "没有新知识点需要创建";
    } else if (results.length === 0 && skippedPoints.length > 0) {
      message = `所有 ${skippedPoints.length} 个知识点与现有知识点相似，已跳过`;
    } else if (successCount === results.length) {
      message =
        `成功创建 ${successCount} 个知识点` +
        (skippedPoints.length > 0
          ? `，跳过 ${skippedPoints.length} 个相似知识点`
          : "");
    } else {
      message =
        `部分知识点创建失败: ${successCount}/${results.length} 成功` +
        (skippedPoints.length > 0
          ? `，跳过 ${skippedPoints.length} 个相似知识点`
          : "");
    }

    // 显示适当的提示
    if (results.length === 0 || successCount === results.length) {
      toast.success(message);
      return {
        success: true,
        message,
        skippedPoints,
        knowledgePoints: successfulPoints,
      };
    } else {
      toast.warning(message);
      return {
        success: true, // 改为true，因为我们有本地备份
        message: message + "（已保存到本地作为备份）",
        skippedPoints,
        knowledgePoints: successfulPoints,
        localSaved: true,
      };
    }
  } catch (error) {
    console.error("批量创建知识点异常:", error);
    toast.warning(`保存到数据库失败，但已保存到本地: ${error.message}`);
    return {
      success: true,
      message: `保存到数据库失败，但已保存到本地: ${error.message}`,
      skippedPoints: [],
      localSaved: true,
    };
  }
}

/**
 * 更新知识点评估
 * @param submissionId 提交ID
 * @param evaluations 评估数据数组
 * @returns 更新结果
 */
export async function updateKnowledgePointEvaluations(
  submissionId: string,
  evaluations: Array<{
    knowledgePointId: string;
    masteryLevel: number;
    evaluationId?: string;
  }>,
  homeworkId?: string
) {
  try {
    if (!submissionId) {
      console.error("更新知识点评估失败: 缺少提交ID");
      return { success: false, message: "缺少提交ID", results: [] };
    }

    if (!evaluations || evaluations.length === 0) {
      console.log("没有知识点评估需要更新");
      return { success: true, message: "没有知识点评估需要更新", results: [] };
    }

    console.log(
      "开始更新知识点评估:",
      evaluations.length,
      "项，submissionId:",
      submissionId
    );

    // 获取提交记录的学生ID和作业ID
    const { data: submissionData, error: submissionError } = await supabase
      .from("homework_submissions")
      .select("id, student_id, homework_id")
      .eq("id", submissionId)
      .single();

    if (submissionError) {
      console.error("获取提交记录失败:", submissionError);
      return {
        success: false,
        message: `获取提交记录失败: ${submissionError.message}`,
        results: [],
      };
    }

    const studentId = submissionData.student_id;
    const homeworkIdFromSubmission = submissionData.homework_id;

    // 使用提交中的作业ID，如果未提供则使用参数中的
    const effectiveHomeworkId = homeworkId || homeworkIdFromSubmission;

    // 查询该学生在该作业中已有的知识点评估记录
    const { data: existingEvaluations, error: fetchError } = await supabase
      .from("student_knowledge_mastery")
      .select("id, knowledge_point_id, mastery_level")
      .eq("student_id", studentId)
      .eq("homework_id", effectiveHomeworkId);

    if (fetchError) {
      console.error("获取现有知识点评估失败:", fetchError);
    } else {
      console.log(
        "已有知识点评估:",
        existingEvaluations?.length || 0,
        "项",
        existingEvaluations
      );
    }

    // 创建知识点ID到评估ID的映射
    const existingMap = new Map();
    if (existingEvaluations && existingEvaluations.length > 0) {
      existingEvaluations.forEach((evaluation) => {
        existingMap.set(evaluation.knowledge_point_id, evaluation.id);
      });
      console.log("已创建现有评估映射:", [...existingMap.entries()]);
    }

    const results = [];
    let successCount = 0;

    // 处理每个知识点评估
    for (const evaluation of evaluations) {
      try {
        const knowledgePointId = evaluation.knowledgePointId;
        console.log(
          `处理知识点评估 [${knowledgePointId}], 掌握度: ${evaluation.masteryLevel}`
        );

        // 将百分比掌握度转换为字母等级
        const masteryGrade = masteryLevelToGrade(evaluation.masteryLevel);
        console.log(
          `掌握度${evaluation.masteryLevel}%转换为等级: ${masteryGrade}`
        );

        // 检查是否已有评估记录
        const existingId =
          existingMap.get(knowledgePointId) || evaluation.evaluationId;

        if (existingId) {
          console.log(`找到现有评估记录，ID: ${existingId}`);

          // 获取当前记录的评估次数
          const { data: currentRecord } = await supabase
            .from("student_knowledge_mastery")
            .select("assessment_count")
            .eq("id", existingId)
            .single();

          const newAssessmentCount = (currentRecord?.assessment_count || 0) + 1;

          // 更新现有记录
          const { data, error } = await supabase
            .from("student_knowledge_mastery")
            .update({
              mastery_level: evaluation.masteryLevel,
              mastery_grade: masteryGrade,
              submission_id: submissionId,
              assessment_count: newAssessmentCount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingId)
            .select()
            .single();

          if (error) {
            console.error(`更新知识点评估失败 [${knowledgePointId}]:`, error);
            results.push({
              success: false,
              knowledgePointId,
              error: error.message,
              message: `更新知识点评估失败: ${error.message}`,
            });
          } else {
            console.log(`知识点评估已更新 [${knowledgePointId}]`, data);
            successCount++;
            results.push({
              success: true,
              knowledgePointId,
              evaluationId: data.id,
              message: "知识点评估已更新",
            });
          }
        } else {
          console.log(`没有找到现有评估记录，创建新记录`);
          // 创建新记录
          const insertData = {
            student_id: studentId,
            knowledge_point_id: knowledgePointId,
            homework_id: effectiveHomeworkId,
            submission_id: submissionId,
            mastery_level: evaluation.masteryLevel,
            mastery_grade: masteryGrade,
            assessment_count: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from("student_knowledge_mastery")
            .insert(insertData)
            .select()
            .single();

          if (error) {
            console.error(`创建知识点评估失败 [${knowledgePointId}]:`, error);
            // 检查是否是唯一约束冲突
            if (
              error.message.includes("duplicate key") ||
              error.message.includes("unique constraint")
            ) {
              console.log("检测到唯一约束冲突，尝试更新现有记录");
              // 获取冲突记录
              const { data: conflictData, error: fetchConflictError } =
                await supabase
                  .from("student_knowledge_mastery")
                  .select("id")
                  .eq("student_id", studentId)
                  .eq("knowledge_point_id", knowledgePointId)
                  .eq("homework_id", effectiveHomeworkId)
                  .maybeSingle();

              if (!fetchConflictError && conflictData) {
                console.log(`找到冲突记录，ID: ${conflictData.id}`);
                // 获取当前记录的评估次数
                const { data: conflictRecord } = await supabase
                  .from("student_knowledge_mastery")
                  .select("assessment_count")
                  .eq("id", conflictData.id)
                  .single();

                const newConflictAssessmentCount =
                  (conflictRecord?.assessment_count || 0) + 1;

                // 更新现有记录
                const { data: updatedData, error: updateError } = await supabase
                  .from("student_knowledge_mastery")
                  .update({
                    mastery_level: evaluation.masteryLevel,
                    mastery_grade: masteryGrade,
                    submission_id: submissionId,
                    assessment_count: newConflictAssessmentCount,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", conflictData.id)
                  .select()
                  .single();

                if (!updateError) {
                  console.log(`通过冲突处理更新成功 [${knowledgePointId}]`);
                  successCount++;
                  results.push({
                    success: true,
                    knowledgePointId,
                    evaluationId: updatedData.id,
                    message: "通过冲突处理更新知识点评估成功",
                  });
                  continue;
                }
              }
            }

            results.push({
              success: false,
              knowledgePointId,
              error: error.message,
              message: `创建知识点评估失败: ${error.message}`,
            });
          } else {
            console.log(`知识点评估已创建 [${knowledgePointId}]`, data);
            successCount++;
            results.push({
              success: true,
              knowledgePointId,
              evaluationId: data.id,
              message: "知识点评估已创建",
            });
          }
        }
      } catch (evalError) {
        console.error(`处理知识点评估时出错:`, evalError);
        results.push({
          success: false,
          knowledgePointId: evaluation.knowledgePointId,
          error: evalError.message,
          message: `处理知识点评估时出错: ${evalError.message}`,
        });
      }
    }

    // 返回结果
    const allSuccess = successCount === evaluations.length;
    return {
      success: allSuccess,
      message: allSuccess
        ? `成功更新了 ${successCount} 个知识点评估`
        : `部分知识点评估更新失败: ${successCount}/${evaluations.length} 成功`,
      results,
    };
  } catch (error) {
    console.error("更新知识点评估过程中发生异常:", error);
    return {
      success: false,
      message: `更新知识点评估时发生异常: ${error.message}`,
      results: [],
    };
  }
}

/**
 * 创建子知识点（将知识点划分为更细粒度）
 * @param parentId 父知识点ID
 * @param childData 子知识点数据
 * @returns 创建的子知识点
 */
export async function createChildKnowledgePoint(
  parentId: string,
  childData: {
    name: string;
    description?: string;
  }
) {
  try {
    // 获取父知识点信息
    const { data: parentData, error: parentError } = await supabase
      .from("knowledge_points")
      .select("homework_id")
      .eq("id", parentId)
      .single();

    if (parentError) {
      console.error("获取父知识点失败:", parentError);
      toast.error(`创建子知识点失败: ${parentError.message}`);
      return { data: null, success: false, message: parentError.message };
    }

    // 创建子知识点
    const { data, error } = await supabase
      .from("knowledge_points")
      .insert({
        name: childData.name,
        description: childData.description,
        homework_id: parentData.homework_id,
        parent_id: parentId,
      })
      .select()
      .single();

    if (error) {
      console.error("创建子知识点失败:", error);
      toast.error(`创建子知识点失败: ${error.message}`);
      return { data: null, success: false, message: error.message };
    }

    toast.success("子知识点创建成功");
    return { data, success: true, message: "子知识点创建成功" };
  } catch (error) {
    console.error("创建子知识点异常:", error);
    toast.error(`创建子知识点失败: ${error.message}`);
    return { data: null, success: false, message: error.message };
  }
}

/**
 * 删除知识点
 * @param knowledgePointId 知识点ID
 * @returns 删除结果
 */
export async function deleteKnowledgePoint(knowledgePointId: string) {
  try {
    // 检查是否有评估记录引用此知识点
    const { data: evaluations, error: checkError } = await supabase
      .from("submission_knowledge_points")
      .select("count")
      .eq("knowledge_point_id", knowledgePointId);

    if (checkError) {
      console.error("检查知识点使用情况失败:", checkError);
      toast.error(`删除知识点失败: ${checkError.message}`);
      return { success: false, message: checkError.message };
    }

    // 如果有评估记录，则不允许删除
    if (evaluations && evaluations.length > 0) {
      toast.error("该知识点已被评估使用，无法删除");
      return { success: false, message: "该知识点已被评估使用，无法删除" };
    }

    // 删除知识点
    const { error } = await supabase
      .from("knowledge_points")
      .delete()
      .eq("id", knowledgePointId);

    if (error) {
      console.error("删除知识点失败:", error);
      toast.error(`删除知识点失败: ${error.message}`);
      return { success: false, message: error.message };
    }

    return { success: true, message: "知识点删除成功" };
  } catch (error) {
    console.error("删除知识点异常:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "删除知识点时发生错误",
    };
  }
}

/**
 * 批量删除作业的知识点
 * @param homeworkId 作业ID
 * @returns 删除结果
 */
export async function deleteAllKnowledgePoints(homeworkId: string) {
  try {
    if (!homeworkId) {
      return { success: false, message: "作业ID不能为空" };
    }

    // 首先获取该作业的所有知识点
    const { data: knowledgePoints, error: fetchError } = await supabase
      .from("knowledge_points")
      .select("id")
      .eq("homework_id", homeworkId);

    if (fetchError) {
      console.error("获取作业知识点失败:", fetchError);
      return { success: false, message: fetchError.message };
    }

    if (!knowledgePoints || knowledgePoints.length === 0) {
      return { success: true, message: "该作业没有知识点需要删除" };
    }

    // 获取知识点IDs
    const knowledgePointIds = knowledgePoints.map((point) => point.id);

    // 检查是否有评估记录引用这些知识点
    const { data: evaluations, error: checkError } = await supabase
      .from("submission_knowledge_points")
      .select("knowledge_point_id")
      .in("knowledge_point_id", knowledgePointIds);

    if (checkError) {
      console.error("检查知识点使用情况失败:", checkError);
      return { success: false, message: checkError.message };
    }

    // 过滤出未被引用的知识点ID
    const referencedIds = new Set(
      evaluations?.map((ref) => ref.knowledge_point_id) || []
    );
    const deleteableIds = knowledgePointIds.filter(
      (id) => !referencedIds.has(id)
    );

    if (deleteableIds.length === 0) {
      return {
        success: false,
        message: "所有知识点都已被用于评分，无法删除",
      };
    }

    // 删除知识点
    const { error: deleteError } = await supabase
      .from("knowledge_points")
      .delete()
      .in("id", deleteableIds);

    if (deleteError) {
      console.error("批量删除知识点失败:", deleteError);
      return { success: false, message: deleteError.message };
    }

    // 检查是否有被跳过的知识点
    const skippedCount = knowledgePointIds.length - deleteableIds.length;

    return {
      success: true,
      message:
        skippedCount > 0
          ? `成功删除 ${deleteableIds.length} 个知识点，${skippedCount} 个知识点因已被用于评分而无法删除`
          : `成功删除 ${deleteableIds.length} 个知识点`,
      count: deleteableIds.length,
      skippedCount,
    };
  } catch (error) {
    console.error("批量删除知识点异常:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "批量删除知识点时发生错误",
    };
  }
}

// 导出一个AI知识点分析服务
export class AIKnowledgePointAnalysisService {
  // 分析作业内容，提取知识点
  static async analyzeContent(content: string): Promise<string[]> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "你是一位教育专家，擅长从学生作业中提取重要知识点。请从提供的内容中识别出关键知识点，以简洁的方式列出。",
          },
          {
            role: "user",
            content: `请从以下学生作业内容中提取出关键知识点，每个知识点用简短的短语表示（不超过10个字），并以JSON数组格式返回，格式为["知识点1", "知识点2", ...]：\n\n${content}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      // 解析返回的JSON
      const result = JSON.parse(
        response.choices[0].message.content || '{"knowledge_points":[]}'
      );
      const extractedPoints = result.knowledge_points || [];

      // 将提取的知识点字符串数组转换为KnowledgePoint对象数组进行处理
      const knowledgePointObjects: KnowledgePoint[] = extractedPoints.map(
        (point: string) => ({
          id: "", // 临时ID
          name: point,
          homework_id: "",
          created_at: new Date().toISOString(),
        })
      );

      // 使用语义相似度合并相似知识点
      const mergedPoints = await knowledgePointService.mergeKnowledgePoints(
        knowledgePointObjects
      );

      // 返回合并后的知识点名称数组
      return mergedPoints.map((point) => point.name);
    } catch (error) {
      console.error("AI分析知识点失败:", error);
      return [];
    }
  }
}

/**
 * 将掌握度百分比转换为等级 (A-E)
 * @param level 掌握度百分比 (0-100)
 * @returns 字母等级 A-E
 */
export function masteryLevelToGrade(level: number): string {
  if (level >= 90) return "A";
  if (level >= 80) return "B";
  if (level >= 70) return "C";
  if (level >= 60) return "D";
  return "E";
}

/**
 * 将等级转换为描述性文本
 * @param grade 等级 (A-E)
 * @returns 描述性文本
 */
export function gradeToDescription(grade: string): string {
  switch (grade) {
    case "A":
      return "优秀 (完全掌握)";
    case "B":
      return "良好 (基本掌握)";
    case "C":
      return "中等 (部分掌握)";
    case "D":
      return "及格 (勉强掌握)";
    case "E":
      return "不及格 (未掌握)";
    default:
      return "未评估";
  }
}
