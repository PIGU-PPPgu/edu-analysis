/**
 * 考试重复检查服务
 * 功能：解决exams_title_date_type_key约束冲突，提供智能合并和用户选择策略
 */

import { supabase } from "@/integrations/supabase/client";

export interface ExamInfo {
  title: string;
  type: string;
  date: string;
  subject?: string;
  scope?: string;
}

export interface ExistingExam {
  id: string;
  title: string;
  type: string;
  date: string;
  subject?: string;
  scope?: string;
  created_at: string;
  grade_count?: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingExam?: ExistingExam;
  conflictType: "exact" | "similar" | "none";
  similarity?: number;
  suggestions: DuplicateResolutionSuggestion[];
}

export interface DuplicateResolutionSuggestion {
  action: "merge" | "replace" | "rename" | "skip";
  title: string;
  description: string;
  confidence: number;
  autoApplicable: boolean;
}

export type ResolutionStrategy =
  | "ask_user" // 询问用户选择
  | "auto_merge" // 自动合并到现有考试
  | "auto_rename" // 自动重命名新考试
  | "auto_replace" // 自动替换现有考试
  | "skip_duplicates"; // 跳过重复考试

/**
 * 考试重复检查器类
 */
export class ExamDuplicateChecker {
  private strategy: ResolutionStrategy;
  private autoRenamePattern: string;

  constructor(
    strategy: ResolutionStrategy = "ask_user",
    autoRenamePattern: string = "{title} ({type}) - 副本{index}"
  ) {
    this.strategy = strategy;
    this.autoRenamePattern = autoRenamePattern;
  }

  /**
   * 检查考试是否重复
   */
  async checkDuplicate(examInfo: ExamInfo): Promise<DuplicateCheckResult> {
    try {
      // 1. 精确匹配检查
      const exactMatch = await this.findExactMatch(examInfo);
      if (exactMatch) {
        return {
          isDuplicate: true,
          existingExam: exactMatch,
          conflictType: "exact",
          similarity: 1.0,
          suggestions: await this.generateSuggestions(
            examInfo,
            exactMatch,
            "exact"
          ),
        };
      }

      // 2. 相似度匹配检查
      const similarMatch = await this.findSimilarMatch(examInfo);
      if (similarMatch.exam && similarMatch.similarity > 0.8) {
        return {
          isDuplicate: true,
          existingExam: similarMatch.exam,
          conflictType: "similar",
          similarity: similarMatch.similarity,
          suggestions: await this.generateSuggestions(
            examInfo,
            similarMatch.exam,
            "similar"
          ),
        };
      }

      return {
        isDuplicate: false,
        conflictType: "none",
        suggestions: [],
      };
    } catch (error) {
      console.error("检查考试重复时发生错误:", error);
      throw new Error(`重复检查失败: ${error}`);
    }
  }

  /**
   * 智能解决重复冲突
   */
  async resolveDuplicate(
    examInfo: ExamInfo,
    duplicateResult: DuplicateCheckResult,
    userChoice?: string
  ): Promise<{ examId: string; action: string; message: string }> {
    if (!duplicateResult.isDuplicate || !duplicateResult.existingExam) {
      // 没有重复，直接创建
      const newExam = await this.createExam(examInfo);
      return {
        examId: newExam.id,
        action: "created",
        message: "成功创建新考试记录",
      };
    }

    // 根据策略处理重复
    switch (this.strategy) {
      case "ask_user":
        return await this.handleUserChoice(
          examInfo,
          duplicateResult,
          userChoice
        );

      case "auto_merge":
        return await this.mergeToExisting(duplicateResult.existingExam);

      case "auto_rename":
        return await this.createWithAutoRename(examInfo);

      case "auto_replace":
        return await this.replaceExisting(
          examInfo,
          duplicateResult.existingExam
        );

      case "skip_duplicates":
        return {
          examId: duplicateResult.existingExam.id,
          action: "skipped",
          message: "跳过重复考试，使用现有记录",
        };

      default:
        throw new Error(`未知的解决策略: ${this.strategy}`);
    }
  }

  /**
   * 查找精确匹配的考试
   */
  private async findExactMatch(
    examInfo: ExamInfo
  ): Promise<ExistingExam | null> {
    const { data, error } = await supabase
      .from("exams")
      .select(
        `
        id, title, type, date, subject, scope, created_at,
        grade_data_new(count)
      `
      )
      .eq("title", examInfo.title)
      .eq("type", examInfo.type)
      .eq("date", examInfo.date)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    if (data) {
      return {
        ...data,
        grade_count: data.grade_data_new?.[0]?.count || 0,
      };
    }

    return null;
  }

  /**
   * 查找相似的考试
   */
  private async findSimilarMatch(
    examInfo: ExamInfo
  ): Promise<{ exam: ExistingExam | null; similarity: number }> {
    // 获取时间范围内的考试（前后7天）
    const startDate = new Date(examInfo.date);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(examInfo.date);
    endDate.setDate(endDate.getDate() + 7);

    const { data, error } = await supabase
      .from("exams")
      .select(
        `
        id, title, type, date, subject, scope, created_at,
        grade_data_new(count)
      `
      )
      .gte("date", startDate.toISOString().split("T")[0])
      .lte("date", endDate.toISOString().split("T")[0])
      .eq("type", examInfo.type);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return { exam: null, similarity: 0 };
    }

    // 计算相似度
    let bestMatch: { exam: ExistingExam; similarity: number } | null = null;

    for (const exam of data) {
      const similarity = this.calculateSimilarity(examInfo, exam);
      if (
        similarity > 0.8 &&
        (!bestMatch || similarity > bestMatch.similarity)
      ) {
        bestMatch = {
          exam: {
            ...exam,
            grade_count: exam.grade_data_new?.[0]?.count || 0,
          },
          similarity,
        };
      }
    }

    return bestMatch || { exam: null, similarity: 0 };
  }

  /**
   * 计算考试相似度
   */
  private calculateSimilarity(examInfo: ExamInfo, existingExam: any): number {
    let similarity = 0;
    let factors = 0;

    // 标题相似度 (权重: 40%)
    const titleSimilarity = this.calculateStringSimilarity(
      examInfo.title,
      existingExam.title
    );
    similarity += titleSimilarity * 0.4;
    factors += 0.4;

    // 类型匹配 (权重: 30%)
    if (examInfo.type === existingExam.type) {
      similarity += 0.3;
    }
    factors += 0.3;

    // 日期接近度 (权重: 20%)
    const dateDiff = Math.abs(
      new Date(examInfo.date).getTime() - new Date(existingExam.date).getTime()
    );
    const daysDiff = dateDiff / (1000 * 60 * 60 * 24);
    const dateProximity = Math.max(0, 1 - daysDiff / 7); // 7天内线性衰减
    similarity += dateProximity * 0.2;
    factors += 0.2;

    // 科目匹配 (权重: 10%)
    if (examInfo.subject && existingExam.subject) {
      if (examInfo.subject === existingExam.subject) {
        similarity += 0.1;
      }
      factors += 0.1;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * 计算字符串相似度 (Levenshtein Distance)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.getLevenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private getLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 生成解决方案建议
   */
  private async generateSuggestions(
    examInfo: ExamInfo,
    existingExam: ExistingExam,
    conflictType: "exact" | "similar"
  ): Promise<DuplicateResolutionSuggestion[]> {
    const suggestions: DuplicateResolutionSuggestion[] = [];

    if (conflictType === "exact") {
      // 精确重复的建议
      suggestions.push({
        action: "merge",
        title: "合并到现有考试",
        description: `将成绩数据合并到现有考试"${existingExam.title}"中`,
        confidence: 0.9,
        autoApplicable: existingExam.grade_count === 0,
      });

      if (existingExam.grade_count > 0) {
        suggestions.push({
          action: "replace",
          title: "替换现有考试",
          description: `删除现有考试数据，创建新的考试记录（将丢失${existingExam.grade_count}条成绩记录）`,
          confidence: 0.3,
          autoApplicable: false,
        });
      }

      suggestions.push({
        action: "rename",
        title: "重命名新考试",
        description: "为新考试生成不同的名称，避免冲突",
        confidence: 0.7,
        autoApplicable: true,
      });
    } else {
      // 相似重复的建议
      suggestions.push({
        action: "merge",
        title: "合并到相似考试",
        description: `可能是同一次考试，合并到"${existingExam.title}"`,
        confidence: 0.6,
        autoApplicable: false,
      });

      suggestions.push({
        action: "rename",
        title: "创建新考试",
        description: "这是不同的考试，创建新的考试记录",
        confidence: 0.8,
        autoApplicable: true,
      });
    }

    suggestions.push({
      action: "skip",
      title: "跳过导入",
      description: "跳过这次导入，保持现有数据不变",
      confidence: 0.5,
      autoApplicable: true,
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 处理用户选择
   */
  private async handleUserChoice(
    examInfo: ExamInfo,
    duplicateResult: DuplicateCheckResult,
    userChoice?: string
  ): Promise<{ examId: string; action: string; message: string }> {
    if (!userChoice) {
      throw new Error("需要用户选择解决方案");
    }

    switch (userChoice) {
      case "merge":
        return await this.mergeToExisting(duplicateResult.existingExam!);

      case "replace":
        return await this.replaceExisting(
          examInfo,
          duplicateResult.existingExam!
        );

      case "rename":
        return await this.createWithAutoRename(examInfo);

      case "skip":
        return {
          examId: duplicateResult.existingExam!.id,
          action: "skipped",
          message: "用户选择跳过，使用现有考试记录",
        };

      default:
        throw new Error(`未知的用户选择: ${userChoice}`);
    }
  }

  /**
   * 合并到现有考试
   */
  private async mergeToExisting(
    existingExam: ExistingExam
  ): Promise<{ examId: string; action: string; message: string }> {
    return {
      examId: existingExam.id,
      action: "merged",
      message: `成功合并到现有考试"${existingExam.title}"`,
    };
  }

  /**
   * 自动重命名创建
   */
  private async createWithAutoRename(
    examInfo: ExamInfo
  ): Promise<{ examId: string; action: string; message: string }> {
    let index = 1;
    const newTitle = examInfo.title;

    while (true) {
      const newExamInfo = {
        ...examInfo,
        title: this.autoRenamePattern
          .replace("{title}", examInfo.title)
          .replace("{type}", examInfo.type)
          .replace("{index}", index > 1 ? ` ${index}` : ""),
      };

      // 检查新名称是否还有冲突
      const conflict = await this.findExactMatch(newExamInfo);
      if (!conflict) {
        const newExam = await this.createExam(newExamInfo);
        return {
          examId: newExam.id,
          action: "renamed",
          message: `自动重命名为"${newExamInfo.title}"并创建成功`,
        };
      }

      index++;
      if (index > 10) {
        throw new Error("无法生成唯一的考试名称");
      }
    }
  }

  /**
   * 替换现有考试
   */
  private async replaceExisting(
    examInfo: ExamInfo,
    existingExam: ExistingExam
  ): Promise<{ examId: string; action: string; message: string }> {
    // 删除现有考试（级联删除相关数据）
    const { error: deleteError } = await supabase
      .from("exams")
      .delete()
      .eq("id", existingExam.id);

    if (deleteError) {
      throw new Error(`删除现有考试失败: ${deleteError.message}`);
    }

    // 创建新考试
    const newExam = await this.createExam(examInfo);

    return {
      examId: newExam.id,
      action: "replaced",
      message: `已替换现有考试，删除了${existingExam.grade_count}条旧记录`,
    };
  }

  /**
   * 创建新考试
   */
  private async createExam(examInfo: ExamInfo): Promise<{ id: string }> {
    const { data, error } = await supabase
      .from("exams")
      .insert({
        title: examInfo.title,
        type: examInfo.type,
        date: examInfo.date,
        subject: examInfo.subject,
        scope: examInfo.scope || "class",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`创建考试失败: ${error.message}`);
    }

    return data;
  }

  /**
   * 设置解决策略
   */
  setStrategy(strategy: ResolutionStrategy): void {
    this.strategy = strategy;
  }

  /**
   * 获取当前策略
   */
  getStrategy(): ResolutionStrategy {
    return this.strategy;
  }
}

/**
 * 默认考试重复检查器实例
 */
export const examDuplicateChecker = new ExamDuplicateChecker();

/**
 * 工具函数：快速检查并解决重复
 */
export async function quickDuplicateCheck(
  examInfo: ExamInfo,
  strategy: ResolutionStrategy = "auto_merge"
): Promise<{ examId: string; action: string; message: string }> {
  const checker = new ExamDuplicateChecker(strategy);
  const duplicateResult = await checker.checkDuplicate(examInfo);
  return await checker.resolveDuplicate(examInfo, duplicateResult);
}

/**
 * 批量检查考试重复
 */
export async function batchDuplicateCheck(
  exams: ExamInfo[],
  strategy: ResolutionStrategy = "ask_user"
): Promise<Array<{ exam: ExamInfo; result: DuplicateCheckResult }>> {
  const checker = new ExamDuplicateChecker(strategy);
  const results: Array<{ exam: ExamInfo; result: DuplicateCheckResult }> = [];

  for (const exam of exams) {
    const result = await checker.checkDuplicate(exam);
    results.push({ exam, result });
  }

  return results;
}
