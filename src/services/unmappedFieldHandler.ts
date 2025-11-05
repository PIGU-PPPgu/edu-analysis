/**
 * 🔧 未映射字段处理服务
 *
 * 当AI未能成功映射某些字段时，提供智能处理方案：
 * 1. 自动检测未处理字段
 * 2. 提供候选映射建议
 * 3. 支持用户手动映射
 * 4. 创建自定义字段
 */

export interface UnmappedField {
  name: string;
  sampleValues: (string | number)[];
  detectedType: "score" | "grade" | "rank" | "text" | "unknown";
  confidence: number;
  suggestions: FieldSuggestion[];
}

export interface FieldSuggestion {
  targetField: string;
  displayName: string;
  confidence: number;
  reason: string;
  isCustomField?: boolean;
}

export interface FieldMappingResult {
  mappedFields: Record<string, string>;
  unmappedFields: UnmappedField[];
  customFieldsNeeded: string[];
  warnings: string[];
}

export class UnmappedFieldHandler {
  // 系统标准字段定义
  private readonly standardFields = {
    // 基础信息
    student_id: {
      display: "学号",
      patterns: ["学号", "id", "student_id", "考生号", "编号"],
    },
    name: {
      display: "姓名",
      patterns: ["姓名", "name", "学生姓名", "考生姓名"],
    },
    class_name: {
      display: "班级",
      patterns: ["班级", "class", "现班", "所在班级"],
    },

    // 主要科目成绩
    chinese_score: { display: "语文成绩", patterns: ["语文", "chinese"] },
    math_score: { display: "数学成绩", patterns: ["数学", "math"] },
    english_score: { display: "英语成绩", patterns: ["英语", "english"] },
    physics_score: { display: "物理成绩", patterns: ["物理", "physics"] },
    chemistry_score: { display: "化学成绩", patterns: ["化学", "chemistry"] },
    biology_score: { display: "生物成绩", patterns: ["生物", "biology"] },
    politics_score: {
      display: "政治成绩",
      patterns: ["政治", "politics", "道法"],
    },
    history_score: { display: "历史成绩", patterns: ["历史", "history"] },
    geography_score: { display: "地理成绩", patterns: ["地理", "geography"] },
    total_score: {
      display: "总分",
      patterns: ["总分", "total", "合计", "总成绩"],
    },

    // 排名字段
    rank_in_class: {
      display: "班级排名",
      patterns: ["班级排名", "班排名", "班内排名"],
    },
    rank_in_grade: {
      display: "年级排名",
      patterns: ["年级排名", "年排名", "级排名"],
    },
    rank_in_school: {
      display: "学校排名",
      patterns: ["学校排名", "校排名", "全校排名"],
    },
  };

  /**
   * 🔍 检测和处理未映射字段
   */
  analyzeUnmappedFields(
    headers: string[],
    sampleData: any[],
    existingMappings: Record<string, string>
  ): FieldMappingResult {
    console.log("[UnmappedFieldHandler] 🔍 分析未映射字段...");

    // 找出未映射的字段
    const unmappedFieldNames = headers.filter(
      (header) => !existingMappings[header]
    );
    const unmappedFields: UnmappedField[] = [];
    const customFieldsNeeded: string[] = [];
    const warnings: string[] = [];

    // 分析每个未映射字段
    for (const fieldName of unmappedFieldNames) {
      const analysis = this.analyzeField(fieldName, sampleData);
      unmappedFields.push(analysis);

      // 检查是否需要创建自定义字段
      if (analysis.suggestions.some((s) => s.isCustomField)) {
        customFieldsNeeded.push(fieldName);
      }

      // 添加警告
      if (analysis.confidence < 0.5) {
        warnings.push(`字段"${fieldName}"的类型识别置信度较低，建议人工确认`);
      }
    }

    console.log("[UnmappedFieldHandler] ✅ 分析完成:", {
      unmappedCount: unmappedFields.length,
      customFieldsNeeded: customFieldsNeeded.length,
      warnings: warnings.length,
    });

    return {
      mappedFields: existingMappings,
      unmappedFields,
      customFieldsNeeded,
      warnings,
    };
  }

  /**
   * 🧠 智能分析单个字段
   */
  private analyzeField(fieldName: string, sampleData: any[]): UnmappedField {
    // 提取样本值
    const sampleValues = sampleData
      .map((row) => row[fieldName])
      .filter((val) => val !== null && val !== undefined && val !== "")
      .slice(0, 5); // 只取前5个样本

    // 检测数据类型
    const typeAnalysis = this.detectFieldType(fieldName, sampleValues);

    // 生成映射建议
    const suggestions = this.generateFieldSuggestions(fieldName, typeAnalysis);

    return {
      name: fieldName,
      sampleValues,
      detectedType: typeAnalysis.type,
      confidence: typeAnalysis.confidence,
      suggestions,
    };
  }

  /**
   * 🔬 检测字段数据类型
   */
  private detectFieldType(
    fieldName: string,
    sampleValues: any[]
  ): {
    type: "score" | "grade" | "rank" | "text" | "unknown";
    confidence: number;
  } {
    if (sampleValues.length === 0) {
      return { type: "unknown", confidence: 0 };
    }

    const fieldLower = fieldName.toLowerCase();

    // 基于字段名的类型推断
    if (
      fieldLower.includes("分数") ||
      fieldLower.includes("成绩") ||
      fieldLower.includes("score")
    ) {
      // 检查是否都是数字且在合理范围内
      const numericValues = sampleValues
        .filter((val) => !isNaN(Number(val)))
        .map(Number);
      if (numericValues.length / sampleValues.length > 0.8) {
        const maxValue = Math.max(...numericValues);
        if (maxValue <= 150) {
          return { type: "score", confidence: 0.9 };
        }
      }
    }

    if (
      fieldLower.includes("排名") ||
      fieldLower.includes("名次") ||
      fieldLower.includes("rank")
    ) {
      const numericValues = sampleValues
        .filter((val) => !isNaN(Number(val)))
        .map(Number);
      if (numericValues.length / sampleValues.length > 0.8) {
        const minValue = Math.min(...numericValues);
        if (minValue >= 1) {
          return { type: "rank", confidence: 0.9 };
        }
      }
    }

    if (fieldLower.includes("等级") || fieldLower.includes("grade")) {
      const gradePattern = /^[A-E][+-]?$/;
      const gradeMatches = sampleValues.filter(
        (val) =>
          typeof val === "string" && gradePattern.test(val.toString().trim())
      );
      if (gradeMatches.length / sampleValues.length > 0.5) {
        return { type: "grade", confidence: 0.8 };
      }
    }

    // 基于样本数据的类型推断
    const numericValues = sampleValues.filter((val) => !isNaN(Number(val)));
    const numericRatio = numericValues.length / sampleValues.length;

    if (numericRatio > 0.8) {
      const numbers = numericValues.map(Number);
      const maxValue = Math.max(...numbers);
      const minValue = Math.min(...numbers);

      // 分数特征：0-150之间的数值
      if (maxValue <= 150 && minValue >= 0) {
        return { type: "score", confidence: 0.7 };
      }

      // 排名特征：正整数
      if (minValue >= 1 && numbers.every((n) => Number.isInteger(n))) {
        return { type: "rank", confidence: 0.6 };
      }
    }

    // 默认为文本类型
    return { type: "text", confidence: 0.3 };
  }

  /**
   * 💡 生成字段映射建议
   */
  private generateFieldSuggestions(
    fieldName: string,
    typeAnalysis: { type: string; confidence: number }
  ): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];
    const fieldLower = fieldName.toLowerCase();

    // 1. 尝试匹配标准字段
    for (const [standardField, config] of Object.entries(this.standardFields)) {
      for (const pattern of config.patterns) {
        if (fieldLower.includes(pattern.toLowerCase())) {
          const confidence = this.calculateMatchConfidence(
            fieldName,
            pattern,
            typeAnalysis
          );
          suggestions.push({
            targetField: standardField,
            displayName: config.display,
            confidence,
            reason: `字段名包含"${pattern}"，匹配${config.display}`,
            isCustomField: false,
          });
        }
      }
    }

    // 2. 科目+类型的组合建议
    const subjects = [
      "语文",
      "数学",
      "英语",
      "物理",
      "化学",
      "生物",
      "政治",
      "历史",
      "地理",
    ];
    const subjectPatterns = [
      "chinese",
      "math",
      "english",
      "physics",
      "chemistry",
      "biology",
      "politics",
      "history",
      "geography",
    ];

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      const subjectEn = subjectPatterns[i];

      if (fieldLower.includes(subject) || fieldLower.includes(subjectEn)) {
        const confidence = this.calculateMatchConfidence(
          fieldName,
          subject,
          typeAnalysis
        );

        // 根据类型生成不同的建议
        switch (typeAnalysis.type) {
          case "score":
            suggestions.push({
              targetField: `${subjectEn}_score`,
              displayName: `${subject}成绩`,
              confidence,
              reason: `检测到${subject}相关的分数字段`,
              isCustomField: !this.standardFields[`${subjectEn}_score`],
            });
            break;
          case "grade":
            suggestions.push({
              targetField: `${subjectEn}_grade`,
              displayName: `${subject}等级`,
              confidence,
              reason: `检测到${subject}相关的等级字段`,
              isCustomField: true,
            });
            break;
          case "rank":
            if (fieldLower.includes("班") || fieldLower.includes("class")) {
              suggestions.push({
                targetField: `${subjectEn}_class_rank`,
                displayName: `${subject}班级排名`,
                confidence,
                reason: `检测到${subject}班级排名字段`,
                isCustomField: true,
              });
            } else if (
              fieldLower.includes("年级") ||
              fieldLower.includes("grade")
            ) {
              suggestions.push({
                targetField: `${subjectEn}_grade_rank`,
                displayName: `${subject}年级排名`,
                confidence,
                reason: `检测到${subject}年级排名字段`,
                isCustomField: true,
              });
            }
            break;
        }
      }
    }

    // 3. 如果没有好的建议，提供创建自定义字段的选项
    if (
      suggestions.length === 0 ||
      Math.max(...suggestions.map((s) => s.confidence)) < 0.5
    ) {
      const customFieldName = this.generateCustomFieldName(
        fieldName,
        typeAnalysis.type
      );
      suggestions.push({
        targetField: customFieldName,
        displayName: fieldName,
        confidence: 0.4,
        reason: "未找到匹配的标准字段，建议创建自定义字段",
        isCustomField: true,
      });
    }

    // 按置信度排序
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 📊 计算匹配置信度
   */
  private calculateMatchConfidence(
    fieldName: string,
    pattern: string,
    typeAnalysis: { type: string; confidence: number }
  ): number {
    const fieldLower = fieldName.toLowerCase();
    const patternLower = pattern.toLowerCase();

    // 基础匹配分数
    let baseScore = 0;
    if (fieldLower === patternLower) {
      baseScore = 1.0; // 完全匹配
    } else if (fieldLower.includes(patternLower)) {
      baseScore = 0.8; // 包含匹配
    } else if (this.fuzzyMatch(fieldLower, patternLower)) {
      baseScore = 0.6; // 模糊匹配
    }

    // 类型一致性加成
    const typeBonus = typeAnalysis.confidence * 0.3;

    // 最终置信度
    return Math.min(baseScore + typeBonus, 1.0);
  }

  /**
   * 🔍 模糊匹配算法
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    // 简单的编辑距离算法
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return distance / maxLength < 0.5; // 相似度超过50%
  }

  /**
   * 📏 计算编辑距离
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
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + cost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 🏷️ 生成自定义字段名
   */
  private generateCustomFieldName(originalName: string, type: string): string {
    // 移除特殊字符，转换为有效的字段名
    let fieldName = originalName
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9_]/g, "_") // 保留中文、字母、数字、下划线
      .replace(/^_+|_+$/g, "") // 去除首尾下划线
      .replace(/_+/g, "_"); // 合并多个下划线

    // 添加类型后缀
    const typeSuffix =
      {
        score: "_score",
        grade: "_grade",
        rank: "_rank",
        text: "_text",
      }[type] || "_field";

    if (!fieldName.endsWith(typeSuffix)) {
      fieldName += typeSuffix;
    }

    return fieldName;
  }

  /**
   * 🔧 应用用户的字段映射选择
   */
  applyUserMappings(
    unmappedFields: UnmappedField[],
    userSelections: Record<string, string>
  ): {
    mappings: Record<string, string>;
    customFieldsToCreate: Array<{
      name: string;
      type: string;
      displayName: string;
    }>;
  } {
    const mappings: Record<string, string> = {};
    const customFieldsToCreate: Array<{
      name: string;
      type: string;
      displayName: string;
    }> = [];

    for (const field of unmappedFields) {
      const selectedTarget = userSelections[field.name];
      if (selectedTarget) {
        mappings[field.name] = selectedTarget;

        // 检查是否需要创建自定义字段
        const suggestion = field.suggestions.find(
          (s) => s.targetField === selectedTarget
        );
        if (suggestion?.isCustomField) {
          customFieldsToCreate.push({
            name: selectedTarget,
            type: field.detectedType,
            displayName: suggestion.displayName,
          });
        }
      }
    }

    return { mappings, customFieldsToCreate };
  }

  /**
   * 📊 生成字段映射摘要报告
   */
  generateMappingSummary(result: FieldMappingResult): string {
    const totalFields =
      Object.keys(result.mappedFields).length + result.unmappedFields.length;
    const mappedCount = Object.keys(result.mappedFields).length;
    const unmappedCount = result.unmappedFields.length;

    let summary = `字段映射摘要：\n`;
    summary += `总字段数: ${totalFields}\n`;
    summary += `已映射: ${mappedCount} (${Math.round((mappedCount / totalFields) * 100)}%)\n`;
    summary += `未映射: ${unmappedCount} (${Math.round((unmappedCount / totalFields) * 100)}%)\n`;

    if (result.customFieldsNeeded.length > 0) {
      summary += `需要创建自定义字段: ${result.customFieldsNeeded.length}个\n`;
    }

    if (result.warnings.length > 0) {
      summary += `\n⚠️ 警告信息:\n`;
      result.warnings.forEach((warning) => {
        summary += `- ${warning}\n`;
      });
    }

    return summary;
  }
}

// 导出单例实例
export const unmappedFieldHandler = new UnmappedFieldHandler();
