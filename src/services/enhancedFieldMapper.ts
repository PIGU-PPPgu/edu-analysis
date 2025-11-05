/**
 * 增强字段映射服务
 * 功能：提升Excel/CSV文件的字段识别准确率，支持模糊匹配和AI辅助识别
 */

export interface FieldMappingConfig {
  confidence: number;
  alternatives: string[];
  contextClues: string[];
  validationRules: ValidationRule[];
  aiSuggestions?: AiFieldSuggestion[];
}

export interface ValidationRule {
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  dataType?: "string" | "number" | "date" | "email" | "phone";
}

export interface AiFieldSuggestion {
  suggestedField: string;
  confidence: number;
  reasoning: string;
}

export interface FieldMappingResult {
  field: string;
  confidence: number;
  suggestion: string;
  alternatives: string[];
  needsManualReview: boolean;
}

/**
 * 增强的字段映射模式 - 支持模糊匹配和多语言
 */
export const ENHANCED_FIELD_PATTERNS: Record<string, FieldMappingConfig> = {
  student_id: {
    confidence: 0.95,
    alternatives: [
      "学号",
      "学生编号",
      "学生ID",
      "ID",
      "编号",
      "序号",
      "student_no",
      "stu_id",
      "学籍号",
    ],
    contextClues: ["学生", "编号", "号码", "序列"],
    validationRules: [
      { pattern: /^\d{8,12}$/, dataType: "string", required: true },
    ],
  },

  name: {
    confidence: 0.9,
    alternatives: [
      "姓名",
      "学生姓名",
      "名字",
      "真实姓名",
      "name",
      "student_name",
      "学员姓名",
    ],
    contextClues: ["姓名", "名称", "学生"],
    validationRules: [
      { minLength: 2, maxLength: 10, dataType: "string", required: true },
    ],
  },

  class_name: {
    confidence: 0.85,
    alternatives: [
      "班级",
      "班级名称",
      "所属班级",
      "班名",
      "class",
      "class_name",
      "年级班级",
    ],
    contextClues: ["班级", "班", "年级"],
    validationRules: [
      { pattern: /^(初|高)?\d{1,2}[班级]?\d{0,2}$/, dataType: "string" },
    ],
  },

  // 成绩科目字段
  chinese: {
    confidence: 0.9,
    alternatives: ["语文", "语文成绩", "语文分数", "chinese", "中文"],
    contextClues: ["语文", "中文"],
    validationRules: [{ pattern: /^\d{1,3}(\.\d{1,2})?$/, dataType: "number" }],
  },

  math: {
    confidence: 0.9,
    alternatives: ["数学", "数学成绩", "数学分数", "math", "数学科目"],
    contextClues: ["数学", "数字"],
    validationRules: [{ pattern: /^\d{1,3}(\.\d{1,2})?$/, dataType: "number" }],
  },

  english: {
    confidence: 0.9,
    alternatives: ["英语", "英语成绩", "英语分数", "english", "外语"],
    contextClues: ["英语", "外语", "english"],
    validationRules: [{ pattern: /^\d{1,3}(\.\d{1,2})?$/, dataType: "number" }],
  },

  physics: {
    confidence: 0.85,
    alternatives: ["物理", "物理成绩", "物理分数", "physics"],
    contextClues: ["物理"],
    validationRules: [{ pattern: /^\d{1,3}(\.\d{1,2})?$/, dataType: "number" }],
  },

  chemistry: {
    confidence: 0.85,
    alternatives: ["化学", "化学成绩", "化学分数", "chemistry"],
    contextClues: ["化学"],
    validationRules: [{ pattern: /^\d{1,3}(\.\d{1,2})?$/, dataType: "number" }],
  },

  // 排名字段
  rank_in_class: {
    confidence: 0.8,
    alternatives: [
      "班级排名",
      "班内排名",
      "班排名",
      "班级名次",
      "class_rank",
      "总分班排",
      "总分班级排名",
      "总分班名",
    ],
    contextClues: ["班级", "排名", "名次", "总分"],
    validationRules: [{ pattern: /^\d{1,3}$/, dataType: "number" }],
  },

  rank_in_grade: {
    confidence: 0.8,
    alternatives: [
      "年级排名",
      "年级名次",
      "级排名",
      "grade_rank",
      "总分级排",
      "总分年级排名",
      "总分级名",
    ],
    contextClues: ["年级", "排名", "名次", "总分"],
    validationRules: [{ pattern: /^\d{1,3}$/, dataType: "number" }],
  },

  rank_in_school: {
    confidence: 0.8,
    alternatives: [
      "校排名",
      "学校排名",
      "校内排名",
      "school_rank",
      "总分校排",
      "总分学校排名",
      "总分校名",
    ],
    contextClues: ["学校", "校内", "排名", "名次", "总分"],
    validationRules: [{ pattern: /^\d{1,4}$/, dataType: "number" }],
  },

  // 总分
  total_score: {
    confidence: 0.85,
    alternatives: [
      "总分",
      "总成绩",
      "合计分数",
      "total",
      "total_score",
      "总计",
    ],
    contextClues: ["总分", "总计", "合计"],
    validationRules: [{ pattern: /^\d{1,4}(\.\d{1,2})?$/, dataType: "number" }],
  },

  // 总分等级 (匹配数据库的grade_level字段)
  grade_level: {
    confidence: 0.8,
    alternatives: [
      "总分等级",
      "总等级",
      "总分级别",
      "total_grade",
      "grade_level",
    ],
    contextClues: ["等级", "级别", "总分"],
    validationRules: [
      { pattern: /^[A-F]$|^优秀|良好|中等|及格|不及格$/, dataType: "string" },
    ],
  },
};

/**
 * 增强字段映射器类
 */
export class EnhancedFieldMapper {
  private aiProvider: string;
  private confidenceThreshold: number;

  constructor(
    aiProvider: string = "openai",
    confidenceThreshold: number = 0.7
  ) {
    this.aiProvider = aiProvider;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * 智能字段映射 - 结合规则匹配和AI分析
   */
  async mapFields(
    headers: string[]
  ): Promise<Record<string, FieldMappingResult>> {
    const results: Record<string, FieldMappingResult> = {};

    for (const header of headers) {
      const mapping = await this.analyzeField(header, headers);
      if (mapping) {
        results[header] = mapping;
      }
    }

    // AI二次验证
    if (this.shouldUseAiValidation(results)) {
      const aiResults = await this.getAiFieldSuggestions(headers, results);
      return this.mergeAiSuggestions(results, aiResults);
    }

    return results;
  }

  /**
   * 分析单个字段
   */
  private async analyzeField(
    header: string,
    allHeaders: string[]
  ): Promise<FieldMappingResult | null> {
    const normalizedHeader = this.normalizeHeader(header);

    // 规则匹配
    const ruleMatch = this.findRuleMatch(normalizedHeader);
    if (ruleMatch) {
      return ruleMatch;
    }

    // 模糊匹配
    const fuzzyMatch = this.findFuzzyMatch(normalizedHeader);
    if (fuzzyMatch) {
      return fuzzyMatch;
    }

    // 上下文分析
    const contextMatch = this.analyzeContext(header, allHeaders);
    if (contextMatch) {
      return contextMatch;
    }

    return null;
  }

  /**
   * 标准化表头 - 去除特殊字符、统一格式
   */
  private normalizeHeader(header: string): string {
    return header
      .trim()
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9]/g, "") // 保留中文、英文、数字
      .replace(/\s+/g, "");
  }

  /**
   * 规则精确匹配
   */
  private findRuleMatch(normalizedHeader: string): FieldMappingResult | null {
    for (const [field, config] of Object.entries(ENHANCED_FIELD_PATTERNS)) {
      const normalizedAlternatives = config.alternatives.map((alt) =>
        this.normalizeHeader(alt)
      );

      if (normalizedAlternatives.includes(normalizedHeader)) {
        return {
          field,
          confidence: config.confidence,
          suggestion: field,
          alternatives: config.alternatives,
          needsManualReview: config.confidence < this.confidenceThreshold,
        };
      }
    }

    return null;
  }

  /**
   * 模糊匹配 - 基于编辑距离和相似度
   */
  private findFuzzyMatch(normalizedHeader: string): FieldMappingResult | null {
    let bestMatch: {
      field: string;
      similarity: number;
      config: FieldMappingConfig;
    } | null = null;

    for (const [field, config] of Object.entries(ENHANCED_FIELD_PATTERNS)) {
      for (const alternative of config.alternatives) {
        const normalizedAlt = this.normalizeHeader(alternative);
        const similarity = this.calculateSimilarity(
          normalizedHeader,
          normalizedAlt
        );

        if (
          similarity > 0.8 &&
          (!bestMatch || similarity > bestMatch.similarity)
        ) {
          bestMatch = { field, similarity, config };
        }
      }
    }

    if (bestMatch) {
      const adjustedConfidence =
        bestMatch.config.confidence * bestMatch.similarity;
      return {
        field: bestMatch.field,
        confidence: adjustedConfidence,
        suggestion: bestMatch.field,
        alternatives: bestMatch.config.alternatives,
        needsManualReview: adjustedConfidence < this.confidenceThreshold,
      };
    }

    return null;
  }

  /**
   * 上下文分析 - 基于相邻字段推断
   */
  private analyzeContext(
    header: string,
    allHeaders: string[]
  ): FieldMappingResult | null {
    const normalizedHeader = this.normalizeHeader(header);

    // 检查是否包含上下文线索
    for (const [field, config] of Object.entries(ENHANCED_FIELD_PATTERNS)) {
      for (const clue of config.contextClues) {
        if (normalizedHeader.includes(this.normalizeHeader(clue))) {
          return {
            field,
            confidence: config.confidence * 0.7, // 上下文匹配置信度降低
            suggestion: field,
            alternatives: config.alternatives,
            needsManualReview: true,
          };
        }
      }
    }

    return null;
  }

  /**
   * 计算字符串相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
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
   * 判断是否需要AI验证
   */
  private shouldUseAiValidation(
    results: Record<string, FieldMappingResult>
  ): boolean {
    const lowConfidenceCount = Object.values(results).filter(
      (result) => result.confidence < this.confidenceThreshold
    ).length;

    return lowConfidenceCount > 0 || Object.keys(results).length < 3;
  }

  /**
   * 获取AI字段建议
   */
  private async getAiFieldSuggestions(
    headers: string[],
    currentResults: Record<string, FieldMappingResult>
  ): Promise<Record<string, AiFieldSuggestion[]>> {
    try {
      const prompt = this.buildAiPrompt(headers, currentResults);

      // 调用Supabase Edge Function进行AI分析
      const response = await fetch("/api/ai-field-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers,
          currentResults,
          prompt,
          provider: this.aiProvider,
        }),
      });

      if (!response.ok) {
        throw new Error("AI分析请求失败");
      }

      return await response.json();
    } catch (error) {
      console.warn("AI字段分析失败，使用规则匹配结果:", error);
      return {};
    }
  }

  /**
   * 构建AI提示词
   */
  private buildAiPrompt(
    headers: string[],
    currentResults: Record<string, FieldMappingResult>
  ): string {
    return `
作为教育数据分析专家，请分析以下Excel表头字段，将它们映射到学生成绩管理系统的标准字段。

表头字段: ${headers.join(", ")}

标准字段类型：
- student_id: 学号
- name: 学生姓名  
- class_name: 班级名称
- chinese, math, english, physics, chemistry: 各科成绩
- total_score: 总分
- rank_in_class, rank_in_grade: 排名

当前规则匹配结果：
${JSON.stringify(currentResults, null, 2)}

请为每个表头字段提供：
1. 最可能的标准字段映射
2. 置信度 (0-1)
3. 映射理由

返回JSON格式，例如：
{
  "语文成绩": {
    "suggestedField": "chinese",
    "confidence": 0.95,
    "reasoning": "明确包含'语文'关键词"
  }
}
`;
  }

  /**
   * 合并AI建议和规则匹配结果
   */
  private mergeAiSuggestions(
    ruleResults: Record<string, FieldMappingResult>,
    aiSuggestions: Record<string, AiFieldSuggestion[]>
  ): Record<string, FieldMappingResult> {
    const mergedResults = { ...ruleResults };

    for (const [header, suggestions] of Object.entries(aiSuggestions)) {
      if (suggestions.length > 0) {
        const topSuggestion = suggestions[0];
        const currentResult = mergedResults[header];

        if (
          !currentResult ||
          topSuggestion.confidence > currentResult.confidence
        ) {
          mergedResults[header] = {
            field: topSuggestion.suggestedField,
            confidence: topSuggestion.confidence,
            suggestion: topSuggestion.suggestedField,
            alternatives: currentResult?.alternatives || [],
            needsManualReview:
              topSuggestion.confidence < this.confidenceThreshold,
          };
        }
      }
    }

    return mergedResults;
  }

  /**
   * 验证字段映射结果
   */
  validateMapping(
    data: Record<string, any>[],
    mapping: Record<string, FieldMappingResult>
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查必需字段
    const requiredFields = ["student_id", "name"];
    const mappedFields = Object.values(mapping).map((m) => m.field);

    for (const required of requiredFields) {
      if (!mappedFields.includes(required)) {
        errors.push(`缺少必需字段: ${required}`);
      }
    }

    // 验证数据格式
    if (data.length > 0) {
      const sampleRow = data[0];
      for (const [header, result] of Object.entries(mapping)) {
        const value = sampleRow[header];
        const config = ENHANCED_FIELD_PATTERNS[result.field];

        if (config && value != null) {
          for (const rule of config.validationRules) {
            if (rule.pattern && !rule.pattern.test(String(value))) {
              warnings.push(`字段 ${header} 的数据格式可能不正确: ${value}`);
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * 默认字段映射器实例
 */
export const enhancedFieldMapper = new EnhancedFieldMapper();

/**
 * 工具函数：快速字段映射
 */
export async function quickFieldMapping(
  headers: string[]
): Promise<Record<string, string>> {
  const mapper = new EnhancedFieldMapper();
  const results = await mapper.mapFields(headers);

  const simpleMapping: Record<string, string> = {};
  for (const [header, result] of Object.entries(results)) {
    if (result.confidence >= 0.7) {
      simpleMapping[header] = result.field;
    }
  }

  return simpleMapping;
}
