/**
 * 🎯 IntelligentFieldValidator - 智能字段验证服务
 *
 * 功能：
 * 1. 验证字段映射是否与数据库对接
 * 2. 检测未映射的关键字段
 * 3. 智能推荐字段类型
 * 4. 生成用户友好的确认对话框数据
 */

// 数据库字段定义（完全基于实际grade_data表结构 - 已验证2116条记录）
export const DATABASE_FIELDS = {
  // 必需字段
  required: {
    student_id: {
      name: "学号",
      type: "string",
      required: true,
      dbColumn: "student_id",
    },
    name: { name: "姓名", type: "string", required: true, dbColumn: "name" },
    class_name: {
      name: "班级",
      type: "string",
      required: true,
      dbColumn: "class_name",
    },
  },

  // 科目分数字段（与数据库表完全匹配）
  scores: {
    chinese_score: {
      name: "语文分数",
      type: "number",
      range: [0, 150],
      dbColumn: "chinese_score",
      subject: "chinese",
    },
    math_score: {
      name: "数学分数",
      type: "number",
      range: [0, 150],
      dbColumn: "math_score",
      subject: "math",
    },
    english_score: {
      name: "英语分数",
      type: "number",
      range: [0, 150],
      dbColumn: "english_score",
      subject: "english",
    },
    physics_score: {
      name: "物理分数",
      type: "number",
      range: [0, 100],
      dbColumn: "physics_score",
      subject: "physics",
    },
    chemistry_score: {
      name: "化学分数",
      type: "number",
      range: [0, 100],
      dbColumn: "chemistry_score",
      subject: "chemistry",
    },
    biology_score: {
      name: "生物分数",
      type: "number",
      range: [0, 100],
      dbColumn: "biology_score",
      subject: "biology",
    },
    politics_score: {
      name: "政治分数",
      type: "number",
      range: [0, 100],
      dbColumn: "politics_score",
      subject: "politics",
    },
    history_score: {
      name: "历史分数",
      type: "number",
      range: [0, 100],
      dbColumn: "history_score",
      subject: "history",
    },
    geography_score: {
      name: "地理分数",
      type: "number",
      range: [0, 100],
      dbColumn: "geography_score",
      subject: "geography",
    },
    total_score: {
      name: "总分",
      type: "number",
      range: [0, 900],
      dbColumn: "total_score",
      subject: "total",
    },
  },

  // 等级字段（标准等级系统）
  grades: {
    chinese_grade: {
      name: "语文等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "chinese_grade",
      subject: "chinese",
    },
    math_grade: {
      name: "数学等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "math_grade",
      subject: "math",
    },
    english_grade: {
      name: "英语等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "english_grade",
      subject: "english",
    },
    physics_grade: {
      name: "物理等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "physics_grade",
      subject: "physics",
    },
    chemistry_grade: {
      name: "化学等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "chemistry_grade",
      subject: "chemistry",
    },
    biology_grade: {
      name: "生物等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "biology_grade",
      subject: "biology",
    },
    politics_grade: {
      name: "政治等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "politics_grade",
      subject: "politics",
    },
    history_grade: {
      name: "历史等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "history_grade",
      subject: "history",
    },
    geography_grade: {
      name: "地理等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "geography_grade",
      subject: "geography",
    },
    total_grade: {
      name: "总分等级",
      type: "string",
      values: [
        "A+",
        "A",
        "A-",
        "B+",
        "B",
        "B-",
        "C+",
        "C",
        "C-",
        "D+",
        "D",
        "E",
      ],
      dbColumn: "total_grade",
      subject: "total",
    },
  },

  // 排名字段（与实际数据库结构匹配）
  ranks: {
    rank_in_class: {
      name: "班级排名",
      type: "number",
      range: [1, 100],
      dbColumn: "rank_in_class",
    },
    rank_in_grade: {
      name: "年级排名",
      type: "number",
      range: [1, 1000],
      dbColumn: "rank_in_grade",
    },
    rank_in_school: {
      name: "校排名",
      type: "number",
      range: [1, 3000],
      dbColumn: "rank_in_school",
    },
  },

  // 考试信息字段（grade_data表中的冗余字段）
  examInfo: {
    exam_id: { name: "考试ID", type: "uuid", auto: true, dbColumn: "exam_id" },
    exam_title: { name: "考试标题", type: "string", dbColumn: "exam_title" },
    exam_type: { name: "考试类型", type: "string", dbColumn: "exam_type" },
    exam_date: { name: "考试日期", type: "date", dbColumn: "exam_date" },
    exam_scope: {
      name: "考试范围",
      type: "string",
      values: ["class", "grade", "school"],
      dbColumn: "exam_scope",
    },
  },

  // 系统元数据字段
  metadata: {
    metadata: {
      name: "元数据",
      type: "jsonb",
      auto: true,
      dbColumn: "metadata",
    },
    created_by: {
      name: "创建者",
      type: "uuid",
      auto: true,
      dbColumn: "created_by",
    },
    created_at: {
      name: "创建时间",
      type: "timestamp",
      auto: true,
      dbColumn: "created_at",
    },
    updated_at: {
      name: "更新时间",
      type: "timestamp",
      auto: true,
      dbColumn: "updated_at",
    },
  },
};

// 科目模式匹配
export const SUBJECT_PATTERNS = {
  chinese: {
    name: "语文",
    patterns: [/^语文|chinese|语$/i],
    fields: ["chinese_score", "chinese_grade"],
  },
  math: {
    name: "数学",
    patterns: [/^数学|math|数$/i],
    fields: ["math_score", "math_grade"],
  },
  english: {
    name: "英语",
    patterns: [/^英语|english|英$/i],
    fields: ["english_score", "english_grade"],
  },
  physics: {
    name: "物理",
    patterns: [/^物理|physics|理$/i],
    fields: ["physics_score", "physics_grade"],
  },
  chemistry: {
    name: "化学",
    patterns: [/^化学|chemistry|化$/i],
    fields: ["chemistry_score", "chemistry_grade"],
  },
  biology: {
    name: "生物",
    patterns: [/^生物|biology|生$/i],
    fields: ["biology_score", "biology_grade"],
  },
  politics: {
    name: "政治",
    patterns: [/^政治|politics|政|道法$/i],
    fields: ["politics_score", "politics_grade"],
  },
  history: {
    name: "历史",
    patterns: [/^历史|history|史$/i],
    fields: ["history_score", "history_grade"],
  },
  geography: {
    name: "地理",
    patterns: [/^地理|geography|地$/i],
    fields: ["geography_score", "geography_grade"],
  },
  total: {
    name: "总分",
    patterns: [/^总分|total|合计|总成绩$/i],
    fields: ["total_score", "total_grade"],
  },
};

// 字段类型识别
export const FIELD_TYPE_PATTERNS = {
  score: {
    patterns: [/分数|成绩|score|分$/i],
    description: "数值成绩",
  },
  grade: {
    patterns: [/等级|级别|grade|等$/i],
    description: "等级评定",
  },
  classRank: {
    patterns: [/班级排名|班排|班名次|总分班排|总分班级排名|总分班名$/i],
    description: "班级排名",
  },
  gradeRank: {
    patterns: [/年级排名|级排|年排|区排|总分级排|总分年级排名|总分级名$/i],
    description: "年级排名",
  },
  schoolRank: {
    patterns: [/校排名|校排|学校排名|总分校排|总分学校排名|总分校名$/i],
    description: "校排名",
  },
};

// 未映射字段信息
export interface UnmappedField {
  originalName: string;
  sampleValues: string[];
  suggestedSubject?: string;
  suggestedType?: string;
  confidence: number;
  reasons: string[];
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  mappedFields: string[];
  unmappedFields: UnmappedField[];
  missingRequired: string[];
  suggestions: string[];
  score: number; // 0-100的映射完整度评分
}

export class IntelligentFieldValidator {
  /**
   * 验证字段映射的完整性和准确性
   */
  validateMapping(
    headers: string[],
    currentMappings: Record<string, string>,
    sampleData: any[]
  ): ValidationResult {
    const mappedFields: string[] = [];
    const unmappedFields: UnmappedField[] = [];
    const missingRequired: string[] = [];
    const suggestions: string[] = [];

    // 获取所有可用的数据库字段（基于实际数据库结构）
    const allDbFields = {
      ...DATABASE_FIELDS.required,
      ...DATABASE_FIELDS.scores,
      ...DATABASE_FIELDS.grades,
      ...DATABASE_FIELDS.ranks,
      ...DATABASE_FIELDS.examInfo,
      ...DATABASE_FIELDS.metadata,
    };

    // 检查已映射字段
    Object.entries(currentMappings).forEach(([header, dbField]) => {
      if (allDbFields[dbField]) {
        mappedFields.push(header);
      }
    });

    // 找出未映射字段
    headers.forEach((header) => {
      if (!currentMappings[header]) {
        const analysis = this.analyzeUnmappedField(
          header,
          sampleData,
          headers.indexOf(header)
        );
        unmappedFields.push(analysis);
      }
    });

    // 检查必需字段
    Object.keys(DATABASE_FIELDS.required).forEach((requiredField) => {
      const isMapped = Object.values(currentMappings).includes(requiredField);
      if (!isMapped) {
        missingRequired.push(requiredField);
      }
    });

    // 生成详细建议
    if (unmappedFields.length > 0) {
      suggestions.push(
        `发现 ${unmappedFields.length} 个未映射字段，建议使用智能字段确认对话框进行映射`
      );

      // 统计未映射字段类型
      const scoreFields = unmappedFields.filter(
        (f) => f.suggestedType === "score"
      ).length;
      const gradeFields = unmappedFields.filter(
        (f) => f.suggestedType === "grade"
      ).length;
      const rankFields = unmappedFields.filter(
        (f) =>
          f.suggestedType === "classRank" ||
          f.suggestedType === "gradeRank" ||
          f.suggestedType === "schoolRank"
      ).length;

      if (scoreFields > 0)
        suggestions.push(`包含 ${scoreFields} 个可能的分数字段`);
      if (gradeFields > 0)
        suggestions.push(`包含 ${gradeFields} 个可能的等级字段`);
      if (rankFields > 0)
        suggestions.push(`包含 ${rankFields} 个可能的排名字段`);
    }

    if (missingRequired.length > 0) {
      suggestions.push(
        `⚠️ 缺少必需字段：${missingRequired.map((f) => DATABASE_FIELDS.required[f]?.name).join("、")}`
      );
      suggestions.push("请确保Excel文件包含学号、姓名、班级等基础信息");
    }

    // 计算映射完整度评分（优化算法）
    const totalFields = headers.length;
    const mappedCount = mappedFields.length;
    const hasRequiredFields = missingRequired.length === 0;
    const hasHighConfidenceUnmapped = unmappedFields.filter(
      (f) => f.confidence > 0.7
    ).length;

    let score = Math.round((mappedCount / totalFields) * 60);
    if (hasRequiredFields) score += 30;
    if (hasHighConfidenceUnmapped === 0) score += 10;

    return {
      isValid: missingRequired.length === 0 && unmappedFields.length === 0,
      mappedFields,
      unmappedFields,
      missingRequired,
      suggestions,
      score: Math.min(100, score),
    };
  }

  /**
   * 分析未映射字段
   */
  private analyzeUnmappedField(
    header: string,
    sampleData: any[],
    columnIndex: number
  ): UnmappedField {
    const headerLower = header.toLowerCase();
    const sampleValues = sampleData
      .map((row) => row[header] || (Array.isArray(row) ? row[columnIndex] : ""))
      .filter((val) => val !== null && val !== undefined && val !== "")
      .slice(0, 5)
      .map((val) => String(val));

    let suggestedSubject = "";
    let suggestedType = "";
    let confidence = 0;
    const reasons: string[] = [];

    // 1. 先识别科目
    for (const [subjectKey, subjectInfo] of Object.entries(SUBJECT_PATTERNS)) {
      if (subjectInfo.patterns.some((pattern) => pattern.test(headerLower))) {
        suggestedSubject = subjectKey;
        confidence += 0.4;
        reasons.push(`匹配科目模式: ${subjectInfo.name}`);
        break;
      }
    }

    // 2. 再识别字段类型
    for (const [typeKey, typeInfo] of Object.entries(FIELD_TYPE_PATTERNS)) {
      if (typeInfo.patterns.some((pattern) => pattern.test(headerLower))) {
        suggestedType = typeKey;
        confidence += 0.3;
        reasons.push(`匹配类型模式: ${typeInfo.description}`);
        break;
      }
    }

    // 3. 通过样本数据验证
    if (sampleValues.length > 0) {
      const dataAnalysis = this.analyzeSampleData(sampleValues);

      if (!suggestedType) {
        suggestedType = dataAnalysis.suggestedType;
        confidence += 0.2;
        reasons.push(`数据分析建议: ${dataAnalysis.reason}`);
      }

      if (dataAnalysis.confidence > 0.8) {
        confidence += 0.1;
        reasons.push("数据格式高度一致");
      }
    }

    // 4. 特殊字段识别
    if (!suggestedSubject) {
      if (/学号|id|编号|考生号/i.test(headerLower)) {
        confidence = 0.95;
        reasons.push("识别为学号字段");
      } else if (/姓名|name|学生/i.test(headerLower)) {
        confidence = 0.95;
        reasons.push("识别为姓名字段");
      } else if (/班级|class/i.test(headerLower)) {
        confidence = 0.95;
        reasons.push("识别为班级字段");
      }
    }

    return {
      originalName: header,
      sampleValues,
      suggestedSubject,
      suggestedType,
      confidence: Math.min(confidence, 1),
      reasons,
    };
  }

  /**
   * 分析样本数据
   */
  private analyzeSampleData(sampleValues: string[]): {
    suggestedType: string;
    confidence: number;
    reason: string;
  } {
    const numericValues = sampleValues.filter((val) => !isNaN(Number(val)));
    const gradeValues = sampleValues.filter((val) => /^[A-F][+-]?$/i.test(val));

    // 检查是否为等级
    if (gradeValues.length > sampleValues.length * 0.5) {
      return {
        suggestedType: "grade",
        confidence: 0.9,
        reason: "检测到等级格式数据",
      };
    }

    // 检查是否为数值
    if (numericValues.length > sampleValues.length * 0.8) {
      const avgValue =
        numericValues.reduce((sum, val) => sum + Number(val), 0) /
        numericValues.length;

      if (avgValue > 50) {
        return {
          suggestedType: "score",
          confidence: 0.8,
          reason: "数值较大，可能是分数",
        };
      } else if (avgValue < 30) {
        return {
          suggestedType: "classRank",
          confidence: 0.7,
          reason: "数值较小，可能是排名",
        };
      }
    }

    return {
      suggestedType: "score",
      confidence: 0.3,
      reason: "无法确定具体类型",
    };
  }

  /**
   * 生成标准数据库字段名
   */
  generateDbFieldName(subject: string, type: string): string {
    const typeMapping = {
      score: "score",
      grade: "grade",
      classRank: "rank_in_class",
      gradeRank: "rank_in_grade",
      schoolRank: "rank_in_school",
    };

    if (type === "classRank" || type === "gradeRank" || type === "schoolRank") {
      return typeMapping[type];
    }

    return `${subject}_${typeMapping[type] || type}`;
  }

  /**
   * 检查字段是否存在于数据库
   */
  isValidDbField(fieldName: string): boolean {
    const allDbFields = {
      ...DATABASE_FIELDS.required,
      ...DATABASE_FIELDS.scores,
      ...DATABASE_FIELDS.grades,
      ...DATABASE_FIELDS.ranks,
      ...DATABASE_FIELDS.examInfo,
      ...DATABASE_FIELDS.metadata,
    };

    return !!allDbFields[fieldName];
  }

  /**
   * 获取字段的数据库列名
   */
  getDbColumnName(fieldName: string): string {
    const allDbFields = {
      ...DATABASE_FIELDS.required,
      ...DATABASE_FIELDS.scores,
      ...DATABASE_FIELDS.grades,
      ...DATABASE_FIELDS.ranks,
      ...DATABASE_FIELDS.examInfo,
      ...DATABASE_FIELDS.metadata,
    };

    const field = allDbFields[fieldName];
    return field?.dbColumn || fieldName;
  }

  /**
   * 获取所有可用的数据库字段列表（用于前端显示）
   */
  getAllAvailableFields(): Array<{
    key: string;
    name: string;
    type: string;
    category: string;
    dbColumn: string;
    subject?: string;
  }> {
    const fields: Array<{
      key: string;
      name: string;
      type: string;
      category: string;
      dbColumn: string;
      subject?: string;
    }> = [];

    // 必需字段
    Object.entries(DATABASE_FIELDS.required).forEach(([key, field]) => {
      fields.push({
        key,
        name: field.name,
        type: field.type,
        category: "required",
        dbColumn: field.dbColumn,
      });
    });

    // 分数字段
    Object.entries(DATABASE_FIELDS.scores).forEach(([key, field]) => {
      fields.push({
        key,
        name: field.name,
        type: field.type,
        category: "score",
        dbColumn: field.dbColumn,
        subject: field.subject,
      });
    });

    // 等级字段
    Object.entries(DATABASE_FIELDS.grades).forEach(([key, field]) => {
      fields.push({
        key,
        name: field.name,
        type: field.type,
        category: "grade",
        dbColumn: field.dbColumn,
        subject: field.subject,
      });
    });

    // 排名字段
    Object.entries(DATABASE_FIELDS.ranks).forEach(([key, field]) => {
      fields.push({
        key,
        name: field.name,
        type: field.type,
        category: "rank",
        dbColumn: field.dbColumn,
      });
    });

    return fields;
  }
}

// 导出单例实例
export const fieldValidator = new IntelligentFieldValidator();
