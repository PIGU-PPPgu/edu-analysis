/**
 * 🧠 SmartFallbackEngine - 智能回退引擎
 *
 * 核心目标：确保任何数据都能成功导入
 * 策略层次：AI识别 → 模式匹配 → 智能推断 → 最小可用 → 强制成功
 */

import type { MappingConfig } from "../components/analysis/core/grade-importer/types";

// 回退策略类型
export type FallbackStrategy =
  | "ai_success" // AI识别成功
  | "pattern_match" // 模式匹配成功
  | "intelligent_guess" // 智能推断
  | "minimal_viable" // 最小可用数据
  | "force_success"; // 强制成功（创建默认映射）

// 字段重要性等级
export type FieldImportance =
  | "critical"
  | "important"
  | "optional"
  | "nice_to_have";

// 智能回退结果
export interface SmartFallbackResult {
  strategy: FallbackStrategy;
  confidence: number;
  mappingConfig: MappingConfig;
  missingFields: MissingFieldInfo[];
  warnings: string[];
  canProceed: boolean;
  postImportActions: PostImportAction[];
}

// 缺失字段信息
export interface MissingFieldInfo {
  systemField: string;
  displayName: string;
  importance: FieldImportance;
  suggestedSources: string[];
  canBeAddedLater: boolean;
  defaultValue?: any;
}

// 导入后操作
export interface PostImportAction {
  type: "suggest_field_mapping" | "calculate_derived" | "prompt_manual_input";
  description: string;
  targetField: string;
  priority: number;
}

export class SmartFallbackEngine {
  // 字段重要性定义
  private readonly fieldImportance: Record<string, FieldImportance> = {
    // 关键字段（必须有）
    name: "critical",

    // 重要字段（强烈建议有）
    student_id: "important",
    class_name: "important",

    // 可选字段（有最好）
    total_score: "optional",
    chinese_score: "optional",
    math_score: "optional",
    english_score: "optional",
    rank_in_class: "optional",

    // 加分字段（锦上添花）
    rank_in_grade: "nice_to_have",
    rank_in_school: "nice_to_have",
    original_grade: "nice_to_have",
  };

  // 字段显示名称
  private readonly fieldDisplayNames: Record<string, string> = {
    name: "学生姓名",
    student_id: "学号",
    class_name: "班级",
    total_score: "总分",
    chinese_score: "语文成绩",
    math_score: "数学成绩",
    english_score: "英语成绩",
    physics_score: "物理成绩",
    chemistry_score: "化学成绩",
    biology_score: "生物成绩",
    politics_score: "政治成绩",
    history_score: "历史成绩",
    geography_score: "地理成绩",
    rank_in_class: "班级排名",
    rank_in_grade: "年级排名",
    rank_in_school: "学校排名",
    original_grade: "成绩等级",
  };

  // 字段识别模式
  private readonly recognitionPatterns: Record<string, string[]> = {
    name: ["姓名", "学生姓名", "考生姓名", "name", "学生", "考生"],
    student_id: [
      "学号",
      "考生号",
      "学生号",
      "id",
      "student_id",
      "编号",
      "考号",
    ],
    class_name: ["班级", "所在班级", "现班", "class", "班", "年班"],
    total_score: ["总分", "总成绩", "合计", "total", "总计", "总得分"],
    chinese_score: ["语文", "chinese", "语", "语文成绩"],
    math_score: ["数学", "math", "数", "数学成绩"],
    english_score: ["英语", "english", "英", "英语成绩"],
    physics_score: ["物理", "physics", "理", "物理成绩"],
    chemistry_score: ["化学", "chemistry", "化", "化学成绩"],
    biology_score: ["生物", "biology", "生", "生物成绩"],
    politics_score: ["政治", "politics", "政", "道法", "政治成绩"],
    history_score: ["历史", "history", "史", "历史成绩"],
    geography_score: ["地理", "geography", "地", "地理成绩"],
    rank_in_class: ["班级排名", "班排名", "班内排名", "排名", "rank"],
    rank_in_grade: ["年级排名", "年排名", "级排名", "全年级排名"],
    rank_in_school: ["学校排名", "校排名", "全校排名"],
    original_grade: ["等级", "评级", "成绩等级", "grade", "级别"],
  };

  /**
   * 执行智能回退分析
   */
  public async executeSmartFallback(
    headers: string[],
    sampleData: any[],
    aiMapping?: Record<string, string>,
    aiConfidence?: number
  ): Promise<SmartFallbackResult> {
    console.log("[SmartFallback] 开始智能回退分析...");

    // 1. 评估AI结果
    const aiResult = this.evaluateAIResult(aiMapping, aiConfidence);

    if (aiResult.canUse) {
      return this.createSuccessResult(
        "ai_success",
        aiResult.confidence,
        aiMapping!,
        headers,
        sampleData
      );
    }

    // 2. 执行模式匹配
    const patternResult = this.executePatternMatching(headers, sampleData);

    if (patternResult.confidence >= 0.6) {
      return this.createSuccessResult(
        "pattern_match",
        patternResult.confidence,
        patternResult.mappings,
        headers,
        sampleData
      );
    }

    // 3. 智能推断
    const guessResult = this.executeIntelligentGuess(headers, sampleData);

    if (guessResult.confidence >= 0.4) {
      return this.createSuccessResult(
        "intelligent_guess",
        guessResult.confidence,
        guessResult.mappings,
        headers,
        sampleData
      );
    }

    // 4. 最小可用策略
    const minimalResult = this.executeMinimalViable(headers, sampleData);

    if (minimalResult.hasCriticalFields) {
      return this.createSuccessResult(
        "minimal_viable",
        minimalResult.confidence,
        minimalResult.mappings,
        headers,
        sampleData
      );
    }

    // 5. 强制成功（最后的兜底）
    return this.executeForceSuccess(headers, sampleData);
  }

  /**
   * 评估AI识别结果
   */
  private evaluateAIResult(
    aiMapping?: Record<string, string>,
    aiConfidence?: number
  ): { canUse: boolean; confidence: number } {
    if (!aiMapping || Object.keys(aiMapping).length === 0) {
      return { canUse: false, confidence: 0 };
    }

    // 检查是否包含关键字段
    const hasCriticalFields = Object.values(aiMapping).some(
      (field) => this.fieldImportance[field] === "critical"
    );

    const confidence = aiConfidence || 0.5;
    const canUse = hasCriticalFields && confidence >= 0.7;

    return { canUse, confidence };
  }

  /**
   * 执行模式匹配
   */
  private executePatternMatching(
    headers: string[],
    sampleData: any[]
  ): { mappings: Record<string, string>; confidence: number } {
    const mappings: Record<string, string> = {};
    let totalScore = 0;
    let maxScore = 0;

    Object.entries(this.recognitionPatterns).forEach(
      ([systemField, patterns]) => {
        maxScore += this.getFieldWeight(systemField);

        const bestMatch = this.findBestMatch(headers, patterns);
        if (bestMatch.header) {
          mappings[bestMatch.header] = systemField;
          totalScore += this.getFieldWeight(systemField) * bestMatch.confidence;
        }
      }
    );

    const confidence = maxScore > 0 ? totalScore / maxScore : 0;
    return { mappings, confidence };
  }

  /**
   * 智能推断
   */
  private executeIntelligentGuess(
    headers: string[],
    sampleData: any[]
  ): { mappings: Record<string, string>; confidence: number } {
    const mappings: Record<string, string> = {};

    // 基于数据类型和特征进行推断
    headers.forEach((header) => {
      const analysis = this.analyzeFieldCharacteristics(header, sampleData);

      if (analysis.likelySystemField && analysis.confidence >= 0.3) {
        mappings[header] = analysis.likelySystemField;
      }
    });

    // 计算整体置信度
    const confidence = this.calculateOverallConfidence(mappings, headers);

    return { mappings, confidence };
  }

  /**
   * 最小可用策略
   */
  private executeMinimalViable(
    headers: string[],
    sampleData: any[]
  ): {
    mappings: Record<string, string>;
    confidence: number;
    hasCriticalFields: boolean;
  } {
    const mappings: Record<string, string> = {};

    // 只映射最关键的字段
    const criticalFields = ["name"];
    let foundCritical = false;

    criticalFields.forEach((field) => {
      const patterns = this.recognitionPatterns[field];
      const match = this.findBestMatch(headers, patterns, 0.1); // 降低阈值

      if (match.header) {
        mappings[match.header] = field;
        foundCritical = true;
      }
    });

    return {
      mappings,
      confidence: foundCritical ? 0.3 : 0,
      hasCriticalFields: foundCritical,
    };
  }

  /**
   * 强制成功策略
   */
  private executeForceSuccess(
    headers: string[],
    sampleData: any[]
  ): SmartFallbackResult {
    console.log("[SmartFallback] 执行强制成功策略");

    // 创建基础映射 - 至少要有一个字段作为学生标识
    const mappings: Record<string, string> = {};

    if (headers.length > 0) {
      // 使用第一个字段作为学生姓名
      mappings[headers[0]] = "name";
    }

    const missingFields: MissingFieldInfo[] = [
      {
        systemField: "student_id",
        displayName: "学号",
        importance: "important",
        suggestedSources: headers.slice(1, 3),
        canBeAddedLater: true,
        defaultValue: null,
      },
      {
        systemField: "class_name",
        displayName: "班级",
        importance: "important",
        suggestedSources: headers.slice(1, 3),
        canBeAddedLater: true,
        defaultValue: "未指定班级",
      },
    ];

    return {
      strategy: "force_success",
      confidence: 0.2,
      mappingConfig: {
        fieldMappings: mappings,
        customFields: {},
      },
      missingFields,
      warnings: [
        "使用强制导入模式，数据可能不完整",
        "建议导入后手动补充关键字段信息",
      ],
      canProceed: true,
      postImportActions: [
        {
          type: "suggest_field_mapping",
          description: "建议补充学号字段映射",
          targetField: "student_id",
          priority: 1,
        },
        {
          type: "suggest_field_mapping",
          description: "建议补充班级字段映射",
          targetField: "class_name",
          priority: 2,
        },
      ],
    };
  }

  /**
   * 创建成功结果
   */
  private createSuccessResult(
    strategy: FallbackStrategy,
    confidence: number,
    mappings: Record<string, string>,
    headers: string[],
    sampleData: any[]
  ): SmartFallbackResult {
    const missingFields = this.identifyMissingFields(mappings);
    const postImportActions = this.generatePostImportActions(
      missingFields,
      headers
    );

    return {
      strategy,
      confidence,
      mappingConfig: {
        fieldMappings: mappings,
        customFields: this.generateCustomFields(mappings),
      },
      missingFields,
      warnings: this.generateWarnings(strategy, confidence, missingFields),
      canProceed: true,
      postImportActions,
    };
  }

  /**
   * 寻找最佳匹配
   */
  private findBestMatch(
    headers: string[],
    patterns: string[],
    threshold: number = 0.5
  ): { header: string | null; confidence: number } {
    let bestMatch: string | null = null;
    let bestConfidence = 0;

    headers.forEach((header) => {
      const headerLower = header.toLowerCase();

      patterns.forEach((pattern) => {
        const patternLower = pattern.toLowerCase();
        let confidence = 0;

        // 完全匹配
        if (headerLower === patternLower) {
          confidence = 1.0;
        }
        // 包含匹配
        else if (
          headerLower.includes(patternLower) ||
          patternLower.includes(headerLower)
        ) {
          confidence = 0.8;
        }
        // 模糊匹配
        else {
          confidence = this.calculateSimilarity(headerLower, patternLower);
        }

        if (confidence > bestConfidence && confidence >= threshold) {
          bestMatch = header;
          bestConfidence = confidence;
        }
      });
    });

    return { header: bestMatch, confidence: bestConfidence };
  }

  /**
   * 分析字段特征
   */
  private analyzeFieldCharacteristics(
    header: string,
    sampleData: any[]
  ): { likelySystemField: string | null; confidence: number } {
    const sampleValues = sampleData
      .slice(0, 5)
      .map((row) => row[header])
      .filter((val) => val !== null && val !== undefined && val !== "");

    if (sampleValues.length === 0) {
      return { likelySystemField: null, confidence: 0 };
    }

    // 基于数据特征推断
    const allNumeric = sampleValues.every((val) => !isNaN(Number(val)));
    const allString = sampleValues.every((val) => typeof val === "string");
    const maxValue = allNumeric ? Math.max(...sampleValues.map(Number)) : 0;
    const avgLength =
      sampleValues.reduce((sum, val) => sum + String(val).length, 0) /
      sampleValues.length;

    // 推断逻辑
    if (allString && avgLength <= 10 && !allNumeric) {
      return { likelySystemField: "name", confidence: 0.4 };
    }

    if (allNumeric && maxValue <= 150 && maxValue >= 50) {
      return { likelySystemField: "total_score", confidence: 0.3 };
    }

    if (allNumeric && maxValue <= 100 && maxValue >= 30) {
      return { likelySystemField: "chinese_score", confidence: 0.3 };
    }

    return { likelySystemField: null, confidence: 0 };
  }

  /**
   * 计算字符串相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 获取字段权重
   */
  private getFieldWeight(systemField: string): number {
    const importance = this.fieldImportance[systemField] || "nice_to_have";
    switch (importance) {
      case "critical":
        return 10;
      case "important":
        return 7;
      case "optional":
        return 4;
      case "nice_to_have":
        return 1;
      default:
        return 1;
    }
  }

  /**
   * 计算整体置信度
   */
  private calculateOverallConfidence(
    mappings: Record<string, string>,
    headers: string[]
  ): number {
    const mappedCount = Object.keys(mappings).length;
    const totalCount = headers.length;
    const coverageRatio = mappedCount / Math.max(totalCount, 1);

    // 检查关键字段覆盖
    const criticalCovered = Object.values(mappings).some(
      (field) => this.fieldImportance[field] === "critical"
    );

    let confidence = coverageRatio * 0.7;
    if (criticalCovered) confidence += 0.3;

    return Math.min(confidence, 1.0);
  }

  /**
   * 识别缺失字段
   */
  private identifyMissingFields(
    mappings: Record<string, string>
  ): MissingFieldInfo[] {
    const mappedSystemFields = Object.values(mappings);
    const missingFields: MissingFieldInfo[] = [];

    Object.entries(this.fieldImportance).forEach(
      ([systemField, importance]) => {
        if (!mappedSystemFields.includes(systemField)) {
          missingFields.push({
            systemField,
            displayName: this.fieldDisplayNames[systemField] || systemField,
            importance,
            suggestedSources: [],
            canBeAddedLater: importance !== "critical",
          });
        }
      }
    );

    return missingFields.filter((field) => field.importance !== "nice_to_have");
  }

  /**
   * 生成自定义字段
   */
  private generateCustomFields(
    mappings: Record<string, string>
  ): Record<string, string> {
    const customFields: Record<string, string> = {};

    Object.entries(mappings).forEach(([original, mapped]) => {
      if (!this.fieldDisplayNames[mapped]) {
        customFields[mapped] = original;
      }
    });

    return customFields;
  }

  /**
   * 生成警告信息
   */
  private generateWarnings(
    strategy: FallbackStrategy,
    confidence: number,
    missingFields: MissingFieldInfo[]
  ): string[] {
    const warnings: string[] = [];

    if (strategy === "force_success") {
      warnings.push("使用强制导入模式，数据可能不完整");
    }

    if (confidence < 0.6) {
      warnings.push("数据识别置信度较低，建议检查导入结果");
    }

    if (missingFields.some((f) => f.importance === "critical")) {
      warnings.push("缺少关键字段，可能影响后续分析");
    }

    if (missingFields.length > 3) {
      warnings.push("缺少较多字段，建议导入后补充完整");
    }

    return warnings;
  }

  /**
   * 生成导入后操作
   */
  private generatePostImportActions(
    missingFields: MissingFieldInfo[],
    headers: string[]
  ): PostImportAction[] {
    const actions: PostImportAction[] = [];

    missingFields.forEach((field, index) => {
      if (field.importance === "critical" || field.importance === "important") {
        actions.push({
          type: "suggest_field_mapping",
          description: `建议添加${field.displayName}字段`,
          targetField: field.systemField,
          priority: field.importance === "critical" ? 1 : 2,
        });
      }
    });

    return actions.sort((a, b) => a.priority - b.priority);
  }
}

// 导出单例实例
export const smartFallbackEngine = new SmartFallbackEngine();
