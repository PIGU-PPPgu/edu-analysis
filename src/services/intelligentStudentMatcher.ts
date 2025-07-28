/**
 * 智能学生匹配服务
 * 实现基于学号、姓名、班级三选二的智能匹配算法
 */

export interface FileStudent {
  name: string;
  student_id?: string;
  class_name?: string;
  [key: string]: any; // 其他字段
}

export interface SystemStudent {
  id: string;
  name: string;
  student_id: string;
  class_name?: string;
  [key: string]: any; // 其他字段
}

export interface MatchResult {
  fileStudent: FileStudent;
  systemStudent?: SystemStudent;
  matchType:
    | "exact_id"
    | "exact_name"
    | "exact_class_name"
    | "fuzzy_name"
    | "fuzzy_combined"
    | "no_match";
  confidence: number; // 0-1之间的匹配置信度
  matchReason: string; // 匹配原因说明
  needsConfirmation: boolean; // 是否需要用户确认
}

export interface StudentMatchingResult {
  // 精确匹配的学生
  exactMatches: MatchResult[];
  // 模糊匹配的学生（需要用户确认）
  fuzzyMatches: MatchResult[];
  // 新学生（在文件中但不在系统中）
  newStudents: FileStudent[];
  // 缺失学生（在系统中但不在文件中）
  missingStudents: SystemStudent[];
  // 统计信息
  statistics: {
    totalFileStudents: number;
    totalSystemStudents: number;
    exactMatchCount: number;
    fuzzyMatchCount: number;
    newStudentCount: number;
    missingStudentCount: number;
    matchRate: number; // 匹配率 (精确匹配 + 确认的模糊匹配) / 文件学生总数
  };
}

/**
 * 计算字符串相似度（编辑距离算法）
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // 计算编辑距离
  const matrix = Array(s1.length + 1)
    .fill(null)
    .map(() => Array(s2.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 删除
          matrix[i][j - 1] + 1, // 插入
          matrix[i - 1][j - 1] + 1 // 替换
        );
      }
    }
  }

  const editDistance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - editDistance / maxLength;
}

/**
 * 智能学生匹配器类
 */
export class IntelligentStudentMatcher {
  private readonly EXACT_MATCH_THRESHOLD = 1.0;
  private readonly FUZZY_MATCH_THRESHOLD = 0.8;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6;

  /**
   * 执行智能学生匹配
   */
  public async matchStudents(
    fileStudents: FileStudent[],
    systemStudents: SystemStudent[],
    options: {
      enableFuzzyMatching?: boolean;
      fuzzyThreshold?: number;
      prioritizeExactMatches?: boolean;
      classFilter?: string[]; // 只匹配指定班级的学生
    } = {}
  ): Promise<StudentMatchingResult> {
    const {
      enableFuzzyMatching = true,
      fuzzyThreshold = this.FUZZY_MATCH_THRESHOLD,
      prioritizeExactMatches = true,
      classFilter,
    } = options;

    console.log(
      `🔍 开始智能学生匹配: 文件学生${fileStudents.length}人, 系统学生${systemStudents.length}人`
    );

    // 过滤系统学生（如果指定了班级过滤）
    const filteredSystemStudents =
      classFilter && classFilter.length > 0
        ? systemStudents.filter((s) => classFilter.includes(s.class_name || ""))
        : systemStudents;

    console.log(`📋 班级过滤后系统学生: ${filteredSystemStudents.length}人`);

    const exactMatches: MatchResult[] = [];
    const fuzzyMatches: MatchResult[] = [];
    const unmatchedFileStudents: FileStudent[] = [];
    const matchedSystemStudentIds = new Set<string>();

    // 第一轮：精确匹配
    for (const fileStudent of fileStudents) {
      const exactMatch = this.findExactMatch(
        fileStudent,
        filteredSystemStudents,
        matchedSystemStudentIds
      );

      if (exactMatch) {
        exactMatches.push(exactMatch);
        matchedSystemStudentIds.add(exactMatch.systemStudent!.id);
        console.log(
          `✅ 精确匹配: ${fileStudent.name} -> ${exactMatch.systemStudent!.name} (${exactMatch.matchType})`
        );
      } else {
        unmatchedFileStudents.push(fileStudent);
      }
    }

    // 第二轮：模糊匹配（如果启用）
    if (enableFuzzyMatching) {
      for (const fileStudent of unmatchedFileStudents) {
        const fuzzyMatch = this.findFuzzyMatch(
          fileStudent,
          filteredSystemStudents,
          matchedSystemStudentIds,
          fuzzyThreshold
        );

        if (fuzzyMatch) {
          fuzzyMatches.push(fuzzyMatch);
          console.log(
            `🔍 模糊匹配: ${fileStudent.name} -> ${fuzzyMatch.systemStudent!.name} (置信度: ${fuzzyMatch.confidence.toFixed(2)})`
          );
        }
      }
    }

    // 识别新学生
    const matchedFileStudents = new Set([
      ...exactMatches.map((m) => m.fileStudent),
      ...fuzzyMatches.map((m) => m.fileStudent),
    ]);

    const newStudents = fileStudents.filter(
      (fs) => !matchedFileStudents.has(fs)
    );

    // 识别缺失学生
    const missingStudents = filteredSystemStudents.filter(
      (ss) => !matchedSystemStudentIds.has(ss.id)
    );

    // 计算统计信息
    const statistics = {
      totalFileStudents: fileStudents.length,
      totalSystemStudents: filteredSystemStudents.length,
      exactMatchCount: exactMatches.length,
      fuzzyMatchCount: fuzzyMatches.length,
      newStudentCount: newStudents.length,
      missingStudentCount: missingStudents.length,
      matchRate: exactMatches.length / fileStudents.length,
    };

    console.log(`📊 匹配统计:`, statistics);

    return {
      exactMatches,
      fuzzyMatches,
      newStudents,
      missingStudents,
      statistics,
    };
  }

  /**
   * 查找精确匹配
   */
  private findExactMatch(
    fileStudent: FileStudent,
    systemStudents: SystemStudent[],
    excludeIds: Set<string>
  ): MatchResult | null {
    // 1. 学号精确匹配（最高优先级）
    if (fileStudent.student_id) {
      const match = systemStudents.find(
        (ss) =>
          !excludeIds.has(ss.id) && ss.student_id === fileStudent.student_id
      );

      if (match) {
        return {
          fileStudent,
          systemStudent: match,
          matchType: "exact_id",
          confidence: 1.0,
          matchReason: `学号精确匹配: ${fileStudent.student_id}`,
          needsConfirmation: false,
        };
      }
    }

    // 2. 姓名 + 班级精确匹配
    if (fileStudent.class_name) {
      const match = systemStudents.find(
        (ss) =>
          !excludeIds.has(ss.id) &&
          ss.name === fileStudent.name &&
          ss.class_name === fileStudent.class_name
      );

      if (match) {
        return {
          fileStudent,
          systemStudent: match,
          matchType: "exact_name",
          confidence: 1.0,
          matchReason: `姓名+班级精确匹配: ${fileStudent.name} (${fileStudent.class_name})`,
          needsConfirmation: false,
        };
      }
    }

    // 3. 姓名精确匹配（同班级优先）
    const nameMatches = systemStudents.filter(
      (ss) => !excludeIds.has(ss.id) && ss.name === fileStudent.name
    );

    if (nameMatches.length === 1) {
      return {
        fileStudent,
        systemStudent: nameMatches[0],
        matchType: "exact_name",
        confidence: 1.0,
        matchReason: `姓名精确匹配: ${fileStudent.name}`,
        needsConfirmation: false,
      };
    }

    // 如果有多个同名学生，优先选择同班级的
    if (nameMatches.length > 1 && fileStudent.class_name) {
      const sameClassMatch = nameMatches.find(
        (ss) => ss.class_name === fileStudent.class_name
      );
      if (sameClassMatch) {
        return {
          fileStudent,
          systemStudent: sameClassMatch,
          matchType: "exact_name",
          confidence: 1.0,
          matchReason: `姓名+班级精确匹配: ${fileStudent.name} (${fileStudent.class_name})`,
          needsConfirmation: false,
        };
      }
    }

    return null;
  }

  /**
   * 查找模糊匹配
   */
  private findFuzzyMatch(
    fileStudent: FileStudent,
    systemStudents: SystemStudent[],
    excludeIds: Set<string>,
    threshold: number
  ): MatchResult | null {
    let bestMatch: {
      student: SystemStudent;
      confidence: number;
      reason: string;
    } | null = null;

    for (const systemStudent of systemStudents) {
      if (excludeIds.has(systemStudent.id)) continue;

      const confidence = this.calculateMatchConfidence(
        fileStudent,
        systemStudent
      );

      if (
        confidence >= threshold &&
        (!bestMatch || confidence > bestMatch.confidence)
      ) {
        bestMatch = {
          student: systemStudent,
          confidence,
          reason: this.generateMatchReason(
            fileStudent,
            systemStudent,
            confidence
          ),
        };
      }
    }

    if (bestMatch) {
      return {
        fileStudent,
        systemStudent: bestMatch.student,
        matchType: "fuzzy_combined",
        confidence: bestMatch.confidence,
        matchReason: bestMatch.reason,
        needsConfirmation: true,
      };
    }

    return null;
  }

  /**
   * 计算匹配置信度
   */
  private calculateMatchConfidence(
    fileStudent: FileStudent,
    systemStudent: SystemStudent
  ): number {
    let totalWeight = 0;
    let weightedScore = 0;

    // 姓名相似度（权重：0.5）
    const nameSimilarity = calculateStringSimilarity(
      fileStudent.name,
      systemStudent.name
    );
    weightedScore += nameSimilarity * 0.5;
    totalWeight += 0.5;

    // 学号匹配（权重：0.3）
    if (fileStudent.student_id && systemStudent.student_id) {
      const idSimilarity =
        fileStudent.student_id === systemStudent.student_id ? 1.0 : 0.0;
      weightedScore += idSimilarity * 0.3;
      totalWeight += 0.3;
    }

    // 班级匹配（权重：0.2）
    if (fileStudent.class_name && systemStudent.class_name) {
      const classSimilarity =
        fileStudent.class_name === systemStudent.class_name
          ? 1.0
          : calculateStringSimilarity(
              fileStudent.class_name,
              systemStudent.class_name
            );
      weightedScore += classSimilarity * 0.2;
      totalWeight += 0.2;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * 生成匹配原因说明
   */
  private generateMatchReason(
    fileStudent: FileStudent,
    systemStudent: SystemStudent,
    confidence: number
  ): string {
    const reasons: string[] = [];

    // 姓名相似度
    const nameSimilarity = calculateStringSimilarity(
      fileStudent.name,
      systemStudent.name
    );
    if (nameSimilarity >= 0.8) {
      reasons.push(`姓名相似度${(nameSimilarity * 100).toFixed(0)}%`);
    }

    // 学号匹配
    if (fileStudent.student_id && systemStudent.student_id) {
      if (fileStudent.student_id === systemStudent.student_id) {
        reasons.push("学号完全匹配");
      }
    }

    // 班级匹配
    if (fileStudent.class_name && systemStudent.class_name) {
      if (fileStudent.class_name === systemStudent.class_name) {
        reasons.push("班级完全匹配");
      } else {
        const classSimilarity = calculateStringSimilarity(
          fileStudent.class_name,
          systemStudent.class_name
        );
        if (classSimilarity >= 0.8) {
          reasons.push(`班级相似度${(classSimilarity * 100).toFixed(0)}%`);
        }
      }
    }

    return `${reasons.join(", ")} (总置信度: ${(confidence * 100).toFixed(0)}%)`;
  }

  /**
   * 获取匹配建议
   */
  public getMatchingSuggestions(result: StudentMatchingResult): {
    recommendations: string[];
    warnings: string[];
    actions: string[];
  } {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const actions: string[] = [];

    const { statistics, fuzzyMatches, newStudents, missingStudents } = result;

    // 匹配率分析
    if (statistics.matchRate >= 0.9) {
      recommendations.push(
        `✅ 匹配率很高 (${(statistics.matchRate * 100).toFixed(1)}%)，数据质量良好`
      );
    } else if (statistics.matchRate >= 0.7) {
      recommendations.push(
        `⚠️ 匹配率中等 (${(statistics.matchRate * 100).toFixed(1)}%)，建议检查数据一致性`
      );
    } else {
      warnings.push(
        `❌ 匹配率较低 (${(statistics.matchRate * 100).toFixed(1)}%)，可能存在数据质量问题`
      );
    }

    // 模糊匹配处理建议
    if (fuzzyMatches.length > 0) {
      actions.push(`🔍 需要确认 ${fuzzyMatches.length} 个模糊匹配结果`);
      recommendations.push("建议逐一检查模糊匹配结果，确保匹配准确性");
    }

    // 新学生处理建议
    if (newStudents.length > 0) {
      actions.push(`➕ 发现 ${newStudents.length} 个新学生，需要决定是否创建`);
      if (newStudents.length / statistics.totalFileStudents > 0.2) {
        warnings.push("新学生比例较高，请确认文件数据和班级设置是否正确");
      }
    }

    // 缺失学生处理建议
    if (missingStudents.length > 0) {
      actions.push(
        `❓ 发现 ${missingStudents.length} 个学生在系统中但不在导入文件中`
      );
      if (missingStudents.length / statistics.totalSystemStudents > 0.1) {
        warnings.push("缺失学生比例较高，可能是部分学生缺考或数据不完整");
      }
    }

    return { recommendations, warnings, actions };
  }
}

// 导出默认实例
export const intelligentStudentMatcher = new IntelligentStudentMatcher();
