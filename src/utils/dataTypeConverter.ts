/**
 * 🔧 数据类型检测和转换工具
 *
 * 解决混合数据类型问题：
 * - 识别分数字段 vs 等级字段
 * - 安全转换数据类型
 * - 处理字母等级到数字的映射
 */

// 等级到分数的映射表
export const GRADE_TO_SCORE_MAP: Record<string, number> = {
  "A+": 95,
  A: 90,
  "A-": 85,
  "B+": 82,
  B: 78,
  "B-": 75,
  "C+": 72,
  C: 68,
  "C-": 65,
  "D+": 62,
  D: 58,
  "D-": 55,
  F: 50,
  优: 90,
  良: 80,
  中: 70,
  差: 60,
  不及格: 50,
};

// 数据类型检测结果
export interface DataTypeDetectionResult {
  type: "score" | "grade" | "rank" | "text" | "mixed";
  confidence: number;
  samples: any[];
  issues: string[];
  suggestions: string[];
}

// 字段类型检测结果
export interface FieldTypeDetectionResult {
  fieldName: string;
  detectedType: DataTypeDetectionResult;
  recommendedAction:
    | "use_as_score"
    | "convert_to_score"
    | "use_as_text"
    | "split_field";
  conversionMap?: Record<string, number>;
}

/**
 * 检测数据类型
 */
export const detectDataType = (
  values: any[],
  fieldName: string = ""
): DataTypeDetectionResult => {
  const samples = values.slice(0, 20); // 取前20个样本
  const nonEmptyValues = samples.filter(
    (v) => v !== null && v !== undefined && v !== ""
  );

  if (nonEmptyValues.length === 0) {
    return {
      type: "text",
      confidence: 0,
      samples: [],
      issues: ["字段为空"],
      suggestions: ["请检查数据完整性"],
    };
  }

  let numericCount = 0;
  let gradeCount = 0;
  let rankCount = 0;
  let textCount = 0;
  const issues: string[] = [];
  const suggestions: string[] = [];

  nonEmptyValues.forEach((value) => {
    const strValue = String(value).trim();

    // 检测数字分数
    if (/^\d+\.?\d*$/.test(strValue)) {
      const numValue = parseFloat(strValue);
      if (numValue >= 0 && numValue <= 100) {
        numericCount++;
      } else if (numValue > 100) {
        numericCount++;
        issues.push(`发现超过100分的数值: ${numValue}`);
      }
    }
    // 检测字母等级
    else if (
      /^[A-F][+-]?$/.test(strValue) ||
      /^(优|良|中|差|不及格)$/.test(strValue)
    ) {
      gradeCount++;
    }
    // 检测排名（纯数字，但通常大于100）
    else if (/^\d+$/.test(strValue)) {
      const numValue = parseInt(strValue);
      if (
        numValue > 100 ||
        fieldName.includes("排名") ||
        fieldName.includes("名次")
      ) {
        rankCount++;
      } else {
        numericCount++;
      }
    }
    // 其他文本
    else {
      textCount++;
    }
  });

  const total = nonEmptyValues.length;
  const scoreRatio = numericCount / total;
  const gradeRatio = gradeCount / total;
  const rankRatio = rankCount / total;
  const textRatio = textCount / total;

  // 确定主要类型
  let type: DataTypeDetectionResult["type"];
  let confidence: number;

  if (scoreRatio > 0.8) {
    type = "score";
    confidence = scoreRatio;
    if (gradeRatio > 0) {
      suggestions.push("检测到混合数据：主要是分数，但包含等级字母");
    }
  } else if (gradeRatio > 0.8) {
    type = "grade";
    confidence = gradeRatio;
    suggestions.push("建议转换为分数存储，或存储为文本字段");
  } else if (rankRatio > 0.8) {
    type = "rank";
    confidence = rankRatio;
    suggestions.push("排名数据建议存储为整数类型");
  } else if (scoreRatio + gradeRatio > 0.7) {
    type = "mixed";
    confidence = (scoreRatio + gradeRatio) / 2;
    issues.push("检测到混合分数和等级数据");
    suggestions.push("建议分离存储或统一转换为分数");
  } else {
    type = "text";
    confidence = 1 - Math.max(scoreRatio, gradeRatio, rankRatio);
    suggestions.push("建议作为文本字段处理");
  }

  return {
    type,
    confidence,
    samples: nonEmptyValues.slice(0, 5),
    issues,
    suggestions,
  };
};

/**
 * 安全转换为数字分数
 */
export const convertToScore = (value: any): number | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const strValue = String(value).trim();

  // 直接是数字
  if (/^\d+\.?\d*$/.test(strValue)) {
    const numValue = parseFloat(strValue);
    return numValue >= 0 ? numValue : null;
  }

  // 字母等级转换
  if (GRADE_TO_SCORE_MAP[strValue]) {
    return GRADE_TO_SCORE_MAP[strValue];
  }

  // 无法转换
  return null;
};

/**
 * 检测字段类型并给出建议
 */
export const detectFieldType = (
  fieldName: string,
  values: any[]
): FieldTypeDetectionResult => {
  const detection = detectDataType(values, fieldName);
  let recommendedAction: FieldTypeDetectionResult["recommendedAction"];
  let conversionMap: Record<string, number> | undefined;

  // 根据字段名和检测结果决定处理方式
  const isScoreField = /分数|成绩|得分/.test(fieldName);
  const isGradeField = /等级|评级|级别/.test(fieldName);
  const isRankField = /排名|名次|排序/.test(fieldName);

  if (
    detection.type === "score" ||
    (isScoreField && detection.confidence > 0.5)
  ) {
    recommendedAction = "use_as_score";
  } else if (
    detection.type === "grade" ||
    (isGradeField && detection.confidence > 0.5)
  ) {
    if (isScoreField) {
      // 分数字段但包含等级，建议转换
      recommendedAction = "convert_to_score";
      conversionMap = GRADE_TO_SCORE_MAP;
    } else {
      // 等级字段，存储为文本
      recommendedAction = "use_as_text";
    }
  } else if (detection.type === "rank" || isRankField) {
    recommendedAction = "use_as_text"; // 排名存储为文本或整数
  } else if (detection.type === "mixed") {
    recommendedAction = "split_field"; // 建议拆分字段
  } else {
    recommendedAction = "use_as_text";
  }

  return {
    fieldName,
    detectedType: detection,
    recommendedAction,
    conversionMap,
  };
};

/**
 * 批量检测CSV数据的字段类型
 */
export const analyzeCSVFieldTypes = (
  headers: string[],
  data: any[][]
): FieldTypeDetectionResult[] => {
  return headers.map((header, index) => {
    const columnValues = data.map((row) => row[index]);
    return detectFieldType(header, columnValues);
  });
};

/**
 * 清理和转换单行数据
 */
export const cleanRowData = (
  rowData: Record<string, any>,
  fieldAnalysis: FieldTypeDetectionResult[]
): {
  scoreData: Record<string, number>;
  textData: Record<string, string>;
  metadata: Record<string, any>;
} => {
  const scoreData: Record<string, number> = {};
  const textData: Record<string, string> = {};
  const metadata: Record<string, any> = {};

  fieldAnalysis.forEach((analysis) => {
    const { fieldName, recommendedAction, conversionMap } = analysis;
    const value = rowData[fieldName];

    if (value === null || value === undefined || value === "") {
      return;
    }

    switch (recommendedAction) {
      case "use_as_score":
        const scoreValue = convertToScore(value);
        if (scoreValue !== null) {
          scoreData[fieldName] = scoreValue;
        }
        break;

      case "convert_to_score":
        const convertedScore = convertToScore(value);
        if (convertedScore !== null) {
          scoreData[fieldName] = convertedScore;
          // 保存原始等级到metadata
          metadata[`${fieldName}_original_grade`] = String(value);
        } else {
          textData[fieldName] = String(value);
        }
        break;

      case "use_as_text":
        textData[fieldName] = String(value);
        break;

      case "split_field":
        // 尝试转换为分数，失败则存储为文本
        const splitScore = convertToScore(value);
        if (splitScore !== null) {
          scoreData[`${fieldName}_score`] = splitScore;
        } else {
          textData[fieldName] = String(value);
        }
        break;
    }
  });

  return { scoreData, textData, metadata };
};

/**
 * 验证转换结果
 */
export const validateConversionResults = (
  originalData: any[],
  convertedData: any[]
): {
  success: boolean;
  errors: string[];
  warnings: string[];
  statistics: any;
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  let successfulConversions = 0;
  let failedConversions = 0;
  let mixedTypeIssues = 0;

  originalData.forEach((original, index) => {
    const converted = convertedData[index];

    if (!converted) {
      errors.push(`第${index + 1}行转换失败`);
      failedConversions++;
      return;
    }

    // 检查关键字段是否转换成功
    const hasScore = Object.keys(converted.scoreData || {}).length > 0;
    const hasText = Object.keys(converted.textData || {}).length > 0;

    if (hasScore || hasText) {
      successfulConversions++;
    } else {
      warnings.push(`第${index + 1}行没有有效数据`);
    }

    if (converted.metadata && Object.keys(converted.metadata).length > 0) {
      mixedTypeIssues++;
    }
  });

  const success = failedConversions === 0 && errors.length === 0;

  return {
    success,
    errors,
    warnings,
    statistics: {
      totalRows: originalData.length,
      successfulConversions,
      failedConversions,
      mixedTypeIssues,
      conversionRate: successfulConversions / originalData.length,
    },
  };
};
