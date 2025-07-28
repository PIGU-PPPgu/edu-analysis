import { supabase } from "@/integrations/supabase/client";

/**
 * 增强的学生匹配服务
 * 提供智能学生匹配、缓存优化、性能监控等功能
 */

// 匹配类型枚举
export type MatchType =
  | "exact_id" // 精确学号匹配
  | "exact_name" // 精确姓名匹配
  | "exact_class_name" // 精确姓名+班级匹配
  | "fuzzy_name" // 模糊姓名匹配
  | "fuzzy_combined" // 模糊组合匹配
  | "none"; // 无匹配

// 匹配结果接口
export interface MatchResult {
  matchedStudent: any | null;
  multipleMatches: boolean;
  matchType: MatchType;
  confidence: number;
  matchReason: string;
}

// 学生信息接口
export interface StudentInfo {
  student_id?: string;
  name?: string;
  class_name?: string;
}

// 匹配统计接口
export interface MatchStats {
  totalAttempts: number;
  exactMatches: number;
  fuzzyMatches: number;
  noMatches: number;
  averageProcessingTime: number;
}

class EnhancedStudentMatcher {
  private cache: Map<string, any> = new Map();
  private stats: MatchStats = {
    totalAttempts: 0,
    exactMatches: 0,
    fuzzyMatches: 0,
    noMatches: 0,
    averageProcessingTime: 0,
  };
  private processingTimes: number[] = [];

  /**
   * 匹配单个学生
   */
  async matchSingleStudent(studentInfo: StudentInfo): Promise<MatchResult> {
    const startTime = Date.now();
    this.stats.totalAttempts++;

    try {
      // 生成缓存键
      const cacheKey = this.generateCacheKey(studentInfo);

      // 检查缓存
      if (this.cache.has(cacheKey)) {
        console.log(`🎯 从缓存中获取匹配结果: ${cacheKey}`);
        const cachedResult = this.cache.get(cacheKey);
        this.updateStats(startTime, cachedResult.matchType);
        return cachedResult;
      }

      // 执行匹配逻辑
      const matchResult = await this.performMatching(studentInfo);

      // 缓存结果
      this.cache.set(cacheKey, matchResult);

      // 更新统计
      this.updateStats(startTime, matchResult.matchType);

      return matchResult;
    } catch (error) {
      console.error("学生匹配失败:", error);
      this.updateStats(startTime, "none");

      return {
        matchedStudent: null,
        multipleMatches: false,
        matchType: "none",
        confidence: 0,
        matchReason: `匹配过程中发生错误: ${error instanceof Error ? error.message : "未知错误"}`,
      };
    }
  }

  /**
   * 批量匹配学生
   */
  async batchMatchStudents(students: StudentInfo[]): Promise<MatchResult[]> {
    console.log(`🔄 开始批量匹配 ${students.length} 个学生...`);

    const results: MatchResult[] = [];
    const batchSize = 50; // 批次大小

    // 分批处理
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      console.log(
        `📦 处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(students.length / batchSize)}`
      );

      const batchResults = await Promise.all(
        batch.map((student) => this.matchSingleStudent(student))
      );

      results.push(...batchResults);

      // 每处理一批后稍作停顿，避免过度占用资源
      if (i + batchSize < students.length) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    console.log(
      `✅ 批量匹配完成，成功匹配 ${results.filter((r) => r.matchedStudent).length}/${students.length} 个学生`
    );

    return results;
  }

  /**
   * 执行实际的匹配逻辑
   */
  private async performMatching(
    studentInfo: StudentInfo
  ): Promise<MatchResult> {
    // 1. 精确学号匹配（最高优先级）
    if (studentInfo.student_id && studentInfo.student_id.trim()) {
      const exactIdResult = await this.matchByStudentId(
        studentInfo.student_id.trim()
      );
      if (exactIdResult.matchedStudent) {
        return {
          ...exactIdResult,
          matchType: "exact_id",
          confidence: 1.0,
          matchReason: `通过学号精确匹配: ${studentInfo.student_id}`,
        };
      }
    }

    // 2. 精确姓名+班级匹配
    if (studentInfo.name && studentInfo.class_name) {
      const exactNameClassResult = await this.matchByNameAndClass(
        studentInfo.name.trim(),
        studentInfo.class_name.trim()
      );
      if (exactNameClassResult.matchedStudent) {
        return {
          ...exactNameClassResult,
          matchType: "exact_class_name",
          confidence: 0.95,
          matchReason: `通过姓名+班级精确匹配: ${studentInfo.name} (${studentInfo.class_name})`,
        };
      }
    }

    // 3. 精确姓名匹配
    if (studentInfo.name && studentInfo.name.trim()) {
      const exactNameResult = await this.matchByName(studentInfo.name.trim());
      if (exactNameResult.matchedStudent) {
        if (exactNameResult.multipleMatches) {
          return {
            ...exactNameResult,
            matchType: "exact_name",
            confidence: 0.8,
            matchReason: `通过姓名匹配到多个结果: ${studentInfo.name} (找到${exactNameResult.multipleMatches ? "多个" : "一个"}匹配)`,
          };
        } else {
          return {
            ...exactNameResult,
            matchType: "exact_name",
            confidence: 0.9,
            matchReason: `通过姓名精确匹配: ${studentInfo.name}`,
          };
        }
      }
    }

    // 4. 模糊姓名匹配（相似度匹配）
    if (studentInfo.name && studentInfo.name.trim()) {
      const fuzzyNameResult = await this.fuzzyMatchByName(
        studentInfo.name.trim()
      );
      if (fuzzyNameResult.matchedStudent) {
        return {
          ...fuzzyNameResult,
          matchType: "fuzzy_name",
          confidence: 0.7,
          matchReason: `通过模糊匹配找到相似姓名: ${studentInfo.name} → ${fuzzyNameResult.matchedStudent.name}`,
        };
      }
    }

    // 5. 无匹配
    return {
      matchedStudent: null,
      multipleMatches: false,
      matchType: "none",
      confidence: 0,
      matchReason: `未找到匹配的学生: ${JSON.stringify(studentInfo)}`,
    };
  }

  /**
   * 通过学号匹配
   */
  private async matchByStudentId(
    studentId: string
  ): Promise<Partial<MatchResult>> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("student_id", studentId)
        .limit(2); // 限制2条，用于检测重复

      if (error) {
        console.error("学号匹配查询失败:", error);
        return { matchedStudent: null, multipleMatches: false };
      }

      if (!data || data.length === 0) {
        return { matchedStudent: null, multipleMatches: false };
      }

      return {
        matchedStudent: data[0],
        multipleMatches: data.length > 1,
      };
    } catch (error) {
      console.error("学号匹配异常:", error);
      return { matchedStudent: null, multipleMatches: false };
    }
  }

  /**
   * 通过姓名和班级匹配
   */
  private async matchByNameAndClass(
    name: string,
    className: string
  ): Promise<Partial<MatchResult>> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("name", name)
        .eq("class_name", className)
        .limit(2);

      if (error) {
        console.error("姓名+班级匹配查询失败:", error);
        return { matchedStudent: null, multipleMatches: false };
      }

      if (!data || data.length === 0) {
        return { matchedStudent: null, multipleMatches: false };
      }

      return {
        matchedStudent: data[0],
        multipleMatches: data.length > 1,
      };
    } catch (error) {
      console.error("姓名+班级匹配异常:", error);
      return { matchedStudent: null, multipleMatches: false };
    }
  }

  /**
   * 通过姓名匹配
   */
  private async matchByName(name: string): Promise<Partial<MatchResult>> {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("name", name)
        .limit(5); // 允许更多结果，因为同名的情况可能存在

      if (error) {
        console.error("姓名匹配查询失败:", error);
        return { matchedStudent: null, multipleMatches: false };
      }

      if (!data || data.length === 0) {
        return { matchedStudent: null, multipleMatches: false };
      }

      return {
        matchedStudent: data[0],
        multipleMatches: data.length > 1,
      };
    } catch (error) {
      console.error("姓名匹配异常:", error);
      return { matchedStudent: null, multipleMatches: false };
    }
  }

  /**
   * 模糊姓名匹配（基于相似度）
   */
  private async fuzzyMatchByName(name: string): Promise<Partial<MatchResult>> {
    try {
      // 获取所有学生数据进行本地模糊匹配
      // 注意：这里为了简化，只获取前100个学生。在实际应用中可能需要分页处理
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .limit(100);

      if (error || !data || data.length === 0) {
        return { matchedStudent: null, multipleMatches: false };
      }

      // 计算字符串相似度
      const candidates = data
        .map((student) => ({
          student,
          similarity: this.calculateSimilarity(name, student.name || ""),
        }))
        .filter((candidate) => candidate.similarity > 0.6) // 相似度阈值
        .sort((a, b) => b.similarity - a.similarity);

      if (candidates.length === 0) {
        return { matchedStudent: null, multipleMatches: false };
      }

      return {
        matchedStudent: candidates[0].student,
        multipleMatches: candidates.length > 1,
      };
    } catch (error) {
      console.error("模糊姓名匹配异常:", error);
      return { matchedStudent: null, multipleMatches: false };
    }
  }

  /**
   * 计算字符串相似度（简单的Levenshtein距离算法）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix = Array(len2 + 1)
      .fill(null)
      .map(() => Array(len1 + 1).fill(null));

    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
      for (let i = 1; i <= len1; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const distance = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);

    return 1 - distance / maxLen;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(studentInfo: StudentInfo): string {
    return `${studentInfo.student_id || ""}-${studentInfo.name || ""}-${studentInfo.class_name || ""}`;
  }

  /**
   * 更新统计信息
   */
  private updateStats(startTime: number, matchType: MatchType): void {
    const processingTime = Date.now() - startTime;
    this.processingTimes.push(processingTime);

    // 保持最近1000次的处理时间记录
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000);
    }

    // 更新统计
    if (matchType.includes("exact")) {
      this.stats.exactMatches++;
    } else if (matchType.includes("fuzzy")) {
      this.stats.fuzzyMatches++;
    } else if (matchType === "none") {
      this.stats.noMatches++;
    }

    this.stats.averageProcessingTime =
      this.processingTimes.reduce((sum, time) => sum + time, 0) /
      this.processingTimes.length;
  }

  /**
   * 获取匹配统计信息
   */
  getStats(): MatchStats {
    return { ...this.stats };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log("🧹 学生匹配缓存已清除");
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      exactMatches: 0,
      fuzzyMatches: 0,
      noMatches: 0,
      averageProcessingTime: 0,
    };
    this.processingTimes = [];
    console.log("📊 学生匹配统计已重置");
  }
}

// 创建单例实例
export const enhancedStudentMatcher = new EnhancedStudentMatcher();

// 默认导出
export default enhancedStudentMatcher;
