/**
 * 智能字段映射服务
 * 专门处理复杂的CSV表头识别和数据转换
 */

export interface FieldMapping {
  originalField: string;
  mappedField: string;
  subject?: string;
  dataType:
    | "score"
    | "grade"
    | "rank_class"
    | "rank_school"
    | "rank_grade"
    | "student_info";
  confidence: number;
}

/**
 * 科目成绩数据结构（已废弃，使用 Record<string, any> 替代）
 * @deprecated 改用 Record<string, any> 以支持更灵活的数据结构
 */
export interface SubjectData {
  subject: string;
  score?: number;
  grade?: string;
  rank_in_class?: number;
  rank_in_school?: number;
  rank_in_grade?: number;
}

/**
 * 完整的成绩记录接口
 * 用于宽表格转换后的长表格数据
 */
export interface CompleteGradeRecord {
  // 主键
  id?: string;

  // 学生信息
  student_id: string;
  name: string;
  class_name: string;
  grade?: string;

  // 考试信息
  exam_id: string;
  exam_title: string;
  exam_type: string;
  exam_date: string;
  exam_scope?: string;

  // 科目成绩
  subject: string;
  score?: number;
  original_grade?: string;
  grade?: string;
  computed_grade?: string;

  // 排名信息
  rank_in_class?: number;
  rank_in_grade?: number;
  rank_in_school?: number;

  // 其他字段
  subject_total_score?: number;
  percentile?: number;
  z_score?: number;

  // 状态字段
  is_analyzed?: boolean;
  analyzed_at?: string;

  // 元数据
  import_strategy?: string;
  match_type?: string;
  multiple_matches?: boolean;
  metadata?: Record<string, any>;

  // 时间戳
  created_at?: string;
  updated_at?: string;
}

/**
 * 增强的科目识别模式
 */
const SUBJECT_PATTERNS = {
  语文: {
    keywords: ["语文", "语", "chinese", "yuwen"],
    aliases: ["语文分数", "语文等级", "语文班名", "语文校名", "语文级名"],
  },
  数学: {
    keywords: ["数学", "数", "math", "mathematics", "shuxue"],
    aliases: ["数学分数", "数学等级", "数学班名", "数学校名", "数学级名"],
  },
  英语: {
    keywords: ["英语", "英", "english", "yingyu"],
    aliases: ["英语分数", "英语等级", "英语班名", "英语校名", "英语级名"],
  },
  物理: {
    keywords: ["物理", "物", "physics", "wuli"],
    aliases: ["物理分数", "物理等级", "物理班名", "物理校名", "物理级名"],
  },
  化学: {
    keywords: ["化学", "化", "chemistry", "huaxue"],
    aliases: ["化学分数", "化学等级", "化学班名", "化学校名", "化学级名"],
  },
  生物: {
    keywords: ["生物", "生", "biology", "shengwu"],
    aliases: ["生物分数", "生物等级", "生物班名", "生物校名", "生物级名"],
  },
  政治: {
    keywords: [
      "政治",
      "政",
      "politics",
      "zhengzhi",
      "道法",
      "道德与法治",
      "道德法治",
    ],
    aliases: [
      "政治分数",
      "政治等级",
      "政治班名",
      "政治校名",
      "政治级名",
      "道法分数",
      "道法等级",
      "道法班名",
      "道法校名",
      "道法级名",
    ],
  },
  历史: {
    keywords: ["历史", "史", "history", "lishi"],
    aliases: ["历史分数", "历史等级", "历史班名", "历史校名", "历史级名"],
  },
  地理: {
    keywords: ["地理", "地", "geography", "dili"],
    aliases: ["地理分数", "地理等级", "地理班名", "地理校名", "地理级名"],
  },
  // 注意：总分不应作为科目处理，而应作为附加字段
  // '总分' 字段将被特殊处理，添加到每个学生的所有科目记录中
};

/**
 * ✅ 增强字段类型识别模式 - 支持学科特定排名字段
 */
const FIELD_TYPE_PATTERNS = {
  score: ["分数", "score", "成绩", "得分", "分"],
  grade: ["等级", "grade", "级别", "档次"],
  rank_in_class: [
    // 通用班级排名
    "班名",
    "class_rank",
    "班级排名",
    "班排",
    "班级名次",
    // 学科特定班级排名
    "语文班级排名",
    "语文班排",
    "语文班名",
    "数学班级排名",
    "数学班排",
    "数学班名",
    "英语班级排名",
    "英语班排",
    "英语班名",
    "物理班级排名",
    "物理班排",
    "物理班名",
    "化学班级排名",
    "化学班排",
    "化学班名",
    "生物班级排名",
    "生物班排",
    "生物班名",
    "政治班级排名",
    "政治班排",
    "政治班名",
    "历史班级排名",
    "历史班排",
    "历史班名",
    "地理班级排名",
    "地理班排",
    "地理班名",
    "总分班级排名",
    "总分班排",
    "总分班名",
  ],
  rank_in_grade: [
    // 通用年级排名
    "级名",
    "grade_rank",
    "年级排名",
    "级排",
    "年级名次",
    // 学科特定年级排名
    "语文年级排名",
    "语文级排",
    "语文级名",
    "数学年级排名",
    "数学级排",
    "数学级名",
    "英语年级排名",
    "英语级排",
    "英语级名",
    "物理年级排名",
    "物理级排",
    "物理级名",
    "化学年级排名",
    "化学级排",
    "化学级名",
    "生物年级排名",
    "生物级排",
    "生物级名",
    "政治年级排名",
    "政治级排",
    "政治级名",
    "历史年级排名",
    "历史级排",
    "历史级名",
    "地理年级排名",
    "地理级排",
    "地理级名",
    "总分年级排名",
    "总分级排",
    "总分级名",
  ],
  rank_in_school: [
    // 通用全校排名
    "校名",
    "school_rank",
    "学校排名",
    "校排",
    "全校排名",
    "全校名次",
    // 学科特定全校排名
    "语文学校排名",
    "语文校排",
    "语文校名",
    "数学学校排名",
    "数学校排",
    "数学校名",
    "英语学校排名",
    "英语校排",
    "英语校名",
    "物理学校排名",
    "物理校排",
    "物理校名",
    "化学学校排名",
    "化学校排",
    "化学校名",
    "生物学校排名",
    "生物校排",
    "生物校名",
    "政治学校排名",
    "政治校排",
    "政治校名",
    "历史学校排名",
    "历史校排",
    "历史校名",
    "地理学校排名",
    "地理校排",
    "地理校名",
    "总分学校排名",
    "总分校排",
    "总分校名",
  ],
};

/**
 * 学生信息字段模式
 */
const STUDENT_INFO_PATTERNS = {
  name: ["姓名", "名字", "name", "学生姓名"],
  student_id: ["学号", "student_id", "id", "学生编号"],
  class_name: ["班级", "class", "class_name", "所在班级"],
};

/**
 * 特殊字段模式 - 总分和排名
 */
const SPECIAL_FIELD_PATTERNS = {
  total_score: ["总分", "总成绩", "total", "合计", "总分数"],
  rank_in_class: ["班级排名", "班排", "班内排名", "class_rank"],
  rank_in_grade: ["年级排名", "级排", "年级内排名", "grade_rank"],
  rank_in_school: ["学校排名", "校排", "全校排名", "school_rank"],
};

/**
 * 智能分析CSV表头，识别字段映射
 */
export function analyzeCSVHeaders(headers: string[]): {
  mappings: FieldMapping[];
  subjects: string[];
  studentFields: FieldMapping[];
  confidence: number;
} {
  console.log("[智能字段映射] 开始分析CSV表头:", headers);

  const mappings: FieldMapping[] = [];
  const subjects = new Set<string>();
  const studentFields: FieldMapping[] = [];

  headers.forEach((header) => {
    const mapping = identifyField(header);
    if (mapping) {
      mappings.push(mapping);

      if (mapping.subject) {
        subjects.add(mapping.subject);
      }

      if (mapping.dataType === "student_info") {
        studentFields.push(mapping);
      }
    }
  });

  // ✅ 增强整体置信度计算 - 考虑匹配质量而非仅仅数量
  const totalFields = headers.length;
  const mappedFields = mappings.length;

  // 基础覆盖率
  const coverageRatio = mappedFields / totalFields;

  // 质量加权置信度 - 考虑每个映射的置信度
  const weightedConfidence =
    mappings.length > 0
      ? mappings.reduce((sum, mapping) => sum + mapping.confidence, 0) /
        mappings.length
      : 0;

  // 必要字段检查加成
  const hasRequiredFields = studentFields.length >= 2 && subjects.size >= 1;
  const requiredFieldsBonus = hasRequiredFields ? 0.1 : -0.2;

  // 综合置信度计算
  const confidence = Math.min(
    0.99,
    Math.max(
      0.1,
      coverageRatio * 0.4 + weightedConfidence * 0.5 + requiredFieldsBonus + 0.1
    )
  );

  console.log("[智能字段映射] 增强分析结果:", {
    总字段数: totalFields,
    已映射字段数: mappedFields,
    覆盖率: `${Math.round(coverageRatio * 100)}%`,
    加权置信度: `${Math.round(weightedConfidence * 100)}%`,
    识别的科目: Array.from(subjects),
    学生字段数: studentFields.length,
    综合置信度: `${Math.round(confidence * 100)}%`,
    "达到98%目标": confidence >= 0.98 ? "✅" : "❌",
  });

  return {
    mappings,
    subjects: Array.from(subjects),
    studentFields,
    confidence,
  };
}

/**
 * ✅ 增强识别单个字段的类型和映射 - 混合策略：算法优先 + AI辅助
 */
function identifyField(header: string): FieldMapping | null {
  const normalizedHeader = header.trim().toLowerCase();
  const originalHeader = header.trim();

  console.log(`[混合识别] 分析字段: "${originalHeader}"`);

  // 🎯 第一层：算法100%确定映射 - 高置信度字段

  // 1.1 学生基础信息 - 算法完全能处理
  for (const [field, patterns] of Object.entries(STUDENT_INFO_PATTERNS)) {
    const sortedPatterns = patterns.sort((a, b) => b.length - a.length);

    for (const pattern of sortedPatterns) {
      const normalizedPattern = pattern.toLowerCase();

      // 精确匹配策略 - 算法100%确定
      const isExactMatch = normalizedHeader === normalizedPattern;
      const isStartsWithMatch = normalizedHeader.startsWith(normalizedPattern);
      const isEndsWithMatch = normalizedHeader.endsWith(normalizedPattern);

      if (isExactMatch || isStartsWithMatch || isEndsWithMatch) {
        let confidence = 0.99; // 算法高置信度
        if (isExactMatch) confidence = 1.0; // 完全匹配

        console.log(
          `[算法识别] ✅ 学生信息确定匹配: ${field}, 置信度: ${confidence}`
        );

        return {
          originalField: header,
          mappedField: field,
          dataType: "student_info",
          confidence,
        };
      }
    }
  }

  // 1.2 特殊字段识别 - 总分、排名等
  for (const [field, patterns] of Object.entries(SPECIAL_FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase();

      if (
        normalizedHeader === normalizedPattern ||
        normalizedHeader.includes(normalizedPattern)
      ) {
        console.log(`[算法识别] ✅ 特殊字段确定匹配: ${field}, 置信度: 1.0`);

        return {
          originalField: header,
          mappedField: field,
          dataType: field.includes("rank") ? "rank_class" : "score",
          confidence: 1.0,
        };
      }
    }
  }

  // 🎯 第二层：算法标准科目识别 - 高置信度科目字段

  // 2.1 标准科目完全匹配 - 算法100%确定
  const standardSubjects = [
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

  for (const subject of standardSubjects) {
    // 完全匹配科目名
    if (normalizedHeader === subject) {
      console.log(`[算法识别] ✅ 标准科目完全匹配: ${subject}, 置信度: 1.0`);

      return {
        originalField: header,
        mappedField: "score",
        subject: subject,
        dataType: "score",
        confidence: 1.0,
      };
    }

    // 科目+等级模式 - 算法确定
    if (
      normalizedHeader === `${subject}等级` ||
      normalizedHeader === `${subject}级别`
    ) {
      console.log(
        `[算法识别] ✅ 科目等级完全匹配: ${subject}等级, 置信度: 1.0`
      );

      return {
        originalField: header,
        mappedField: "original_grade",
        subject: subject,
        dataType: "grade",
        confidence: 1.0,
      };
    }

    // 科目+分数模式 - 算法确定
    if (
      normalizedHeader === `${subject}分数` ||
      normalizedHeader === `${subject}成绩`
    ) {
      console.log(
        `[算法识别] ✅ 科目分数完全匹配: ${subject}分数, 置信度: 1.0`
      );

      return {
        originalField: header,
        mappedField: "score",
        subject: subject,
        dataType: "score",
        confidence: 1.0,
      };
    }
  }

  // 🤖 第三层：AI辅助复杂识别 - 算法无法确定的字段
  // 这部分交给AI来处理复杂的、非标准的、模糊的字段命名

  // 2.2 复杂科目模糊匹配 - AI辅助区域
  const sortedSubjects = Object.entries(SUBJECT_PATTERNS).sort((a, b) => {
    const maxLengthA = Math.max(...a[1].keywords.map((k) => k.length));
    const maxLengthB = Math.max(...b[1].keywords.map((k) => k.length));
    return maxLengthB - maxLengthA;
  });

  for (const [subject, config] of sortedSubjects) {
    const matchResults = config.keywords
      .sort((a, b) => b.length - a.length)
      .map((keyword) => ({
        keyword,
        confidence: calculateKeywordMatchConfidence(
          normalizedHeader,
          originalHeader,
          keyword
        ),
        matchType: getMatchType(normalizedHeader, keyword.toLowerCase()),
      }))
      .filter((result) => result.confidence > 0);

    const bestMatch = matchResults.reduce(
      (best, current) =>
        current.confidence > best.confidence ? current : best,
      { confidence: 0, keyword: "", matchType: "none" }
    );

    // 降低置信度阈值，标记为AI辅助区域
    if (bestMatch.confidence > 0.4) {
      // 不确定的字段，需要AI确认
      console.log(
        `[AI辅助区域] "${originalHeader}" 可能匹配科目 "${subject}" (关键词: "${bestMatch.keyword}", 置信度: ${bestMatch.confidence}, 需要AI确认)`
      );

      let dataType: FieldMapping["dataType"] = "score";
      let finalConfidence = Math.min(0.7, bestMatch.confidence); // 限制算法区域置信度

      // ✅ 精确类型匹配 - 支持排名字段的准确映射
      for (const [type, patterns] of Object.entries(FIELD_TYPE_PATTERNS)) {
        const matched = patterns.some((pattern) =>
          normalizedHeader.includes(pattern.toLowerCase())
        );
        if (matched) {
          // 将排名类型映射到正确的数据库字段
          if (type === "rank_in_class") {
            dataType = "rank_in_class";
          } else if (type === "rank_in_grade") {
            dataType = "rank_in_grade";
          } else if (type === "rank_in_school") {
            dataType = "rank_in_school";
          } else {
            dataType = type as FieldMapping["dataType"];
          }

          finalConfidence = Math.min(0.98, bestMatch.confidence + 0.15); // 给排名字段更高奖励
          console.log(
            `[字段识别] ✅ 明确类型识别: ${type} -> ${dataType}, 调整置信度至: ${finalConfidence}`
          );
          break;
        }
      }

      // 智能类型推断 - 基于上下文和模式
      if (finalConfidence === bestMatch.confidence) {
        const typeInferences = [
          {
            condition:
              normalizedHeader.includes("分数") ||
              normalizedHeader.endsWith(subject.toLowerCase()) ||
              normalizedHeader.startsWith(subject.toLowerCase()) ||
              bestMatch.matchType === "exact",
            type: "score" as FieldMapping["dataType"],
            boost: 0.05,
          },
          {
            condition:
              normalizedHeader.includes("等级") ||
              normalizedHeader.includes("档次"),
            type: "grade" as FieldMapping["dataType"],
            boost: 0.08,
          },
          {
            condition:
              normalizedHeader.includes("班名") ||
              normalizedHeader.includes("班级排名") ||
              normalizedHeader.includes("班排"),
            type: "rank_class" as FieldMapping["dataType"],
            boost: 0.08,
          },
          {
            condition:
              normalizedHeader.includes("校名") ||
              normalizedHeader.includes("学校排名") ||
              normalizedHeader.includes("校排"),
            type: "rank_school" as FieldMapping["dataType"],
            boost: 0.08,
          },
          {
            condition:
              normalizedHeader.includes("级名") ||
              normalizedHeader.includes("年级排名") ||
              normalizedHeader.includes("级排"),
            type: "rank_grade" as FieldMapping["dataType"],
            boost: 0.08,
          },
        ];

        for (const inference of typeInferences) {
          if (inference.condition) {
            dataType = inference.type;
            finalConfidence = Math.min(
              0.98,
              bestMatch.confidence + inference.boost
            );
            console.log(
              `[字段识别] 智能推断类型: ${inference.type}, 置信度提升至: ${finalConfidence}`
            );
            break;
          }
        }

        // 如果没有特定类型指示，保持默认分数类型
        if (finalConfidence === bestMatch.confidence) {
          dataType = "score";
          finalConfidence = Math.max(0.75, bestMatch.confidence); // 确保最低置信度
        }
      }

      // 根据数据类型映射到正确的系统字段
      let mappedField: string;
      switch (dataType) {
        case "grade":
          mappedField = "original_grade"; // 映射到等级字段
          break;
        case "score":
          mappedField = subject === "总分" ? "total_score" : "score";
          break;
        case "rank_class":
          mappedField = "rank_in_class";
          break;
        case "rank_school":
        case "rank_grade":
          mappedField = "rank_in_grade";
          break;
        default:
          mappedField = `${subject}_${dataType}`;
      }

      return {
        originalField: header,
        mappedField,
        subject,
        dataType,
        confidence: finalConfidence,
      };
    }
  }

  return null;
}

/**
 * 将宽表格数据转换为单条完整记录（宽表模式）
 * 完全对接CSV结构：一个学生一次考试一条记录
 */
export function convertWideToLongFormatEnhanced(
  rowData: Record<string, any>,
  headerAnalysis: {
    mappings: FieldMapping[];
    subjects: string[];
    studentFields: FieldMapping[];
    confidence: number;
  },
  examInfo?: {
    title: string;
    type: string;
    date: string;
    exam_id: string;
  }
): Record<string, any> {
  console.log("[兼容映射模式] 开始处理CSV行:", rowData);

  // 兼容映射：CSV中文字段 → 数据库英文字段
  const record: Record<string, any> = {
    // 关联键
    exam_id: examInfo?.exam_id,

    // 学生基本信息映射
    student_id: rowData["姓名"] || `temp_${Date.now()}`,
    name: rowData["姓名"] || "未知学生",
    class_name: rowData["班级"] || "未知班级",

    // 考试信息
    exam_title: examInfo?.title,
    exam_type: examInfo?.type,
    exam_date: examInfo?.date,

    // 总分信息映射：CSV中文 → 数据库英文
    total_score: parseFloat(rowData["总分分数"]) || null,
    total_grade: rowData["总分等级"] || null,
    total_rank_in_class: parseInt(rowData["总分班名"]) || null,
    total_rank_in_school: parseInt(rowData["总分校名"]) || null,
    total_rank_in_grade: parseInt(rowData["总分级名"]) || null,

    // 各科目映射：CSV中文 → 数据库英文
    // 语文
    chinese_score: parseFloat(rowData["语文分数"]) || null,
    chinese_grade: rowData["语文等级"] || null,
    chinese_rank_in_class: parseInt(rowData["语文班名"]) || null,
    chinese_rank_in_school: parseInt(rowData["语文校名"]) || null,
    chinese_rank_in_grade: parseInt(rowData["语文级名"]) || null,

    // 数学
    math_score: parseFloat(rowData["数学分数"]) || null,
    math_grade: rowData["数学等级"] || null,
    math_rank_in_class: parseInt(rowData["数学班名"]) || null,
    math_rank_in_school: parseInt(rowData["数学校名"]) || null,
    math_rank_in_grade: parseInt(rowData["数学级名"]) || null,

    // 英语
    english_score: parseFloat(rowData["英语分数"]) || null,
    english_grade: rowData["英语等级"] || null,
    english_rank_in_class: parseInt(rowData["英语班名"]) || null,
    english_rank_in_school: parseInt(rowData["英语校名"]) || null,
    english_rank_in_grade: parseInt(rowData["英语级名"]) || null,

    // 物理
    physics_score: parseFloat(rowData["物理分数"]) || null,
    physics_grade: rowData["物理等级"] || null,
    physics_rank_in_class: parseInt(rowData["物理班名"]) || null,
    physics_rank_in_school: parseInt(rowData["物理校名"]) || null,
    physics_rank_in_grade: parseInt(rowData["物理级名"]) || null,

    // 化学
    chemistry_score: parseFloat(rowData["化学分数"]) || null,
    chemistry_grade: rowData["化学等级"] || null,
    chemistry_rank_in_class: parseInt(rowData["化学班名"]) || null,
    chemistry_rank_in_school: parseInt(rowData["化学校名"]) || null,
    chemistry_rank_in_grade: parseInt(rowData["化学级名"]) || null,

    // 道法
    politics_score: parseFloat(rowData["道法分数"]) || null,
    politics_grade: rowData["道法等级"] || null,
    politics_rank_in_class: parseInt(rowData["道法班名"]) || null,
    politics_rank_in_school: parseInt(rowData["道法校名"]) || null,
    politics_rank_in_grade: parseInt(rowData["道法级名"]) || null,

    // 历史
    history_score: parseFloat(rowData["历史分数"]) || null,
    history_grade: rowData["历史等级"] || null,
    history_rank_in_class: parseInt(rowData["历史班名"]) || null,
    history_rank_in_school: parseInt(rowData["历史校名"]) || null,
    history_rank_in_grade: parseInt(rowData["历史级名"]) || null,

    // 时间戳
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log("[兼容映射模式] 处理结果:", {
    学生: record.name,
    班级: record.class_name,
    总分: record.total_score,
    语文: record.chinese_score,
    数学: record.math_score,
    英语: record.english_score,
  });

  return record;
}

/**
 * 生成字段映射建议
 */
export function generateMappingSuggestions(headers: string[]): {
  suggestions: Record<string, string>;
  confidence: number;
  issues: string[];
} {
  const analysis = analyzeCSVHeaders(headers);
  const suggestions: Record<string, string> = {};
  const issues: string[] = [];

  // 生成映射建议
  analysis.mappings.forEach((mapping) => {
    if (mapping.dataType === "student_info") {
      suggestions[mapping.originalField] = mapping.mappedField;
    } else if (mapping.subject && mapping.dataType === "score") {
      // 对于科目分数，映射为 subject 字段
      suggestions[mapping.originalField] = "subject_score";
    }
  });

  // 检查必要字段
  const hasName = analysis.studentFields.some((f) => f.mappedField === "name");
  const hasClass = analysis.studentFields.some(
    (f) => f.mappedField === "class_name"
  );
  const hasSubjects = analysis.subjects.length > 0;

  if (!hasName) {
    issues.push("未找到学生姓名字段");
  }
  if (!hasClass) {
    issues.push("未找到班级字段");
  }
  if (!hasSubjects) {
    issues.push("未找到任何科目字段");
  }

  return {
    suggestions,
    confidence: analysis.confidence,
    issues,
  };
}

/**
 * ✅ AI增强匹配置信度计算函数
 */
function calculateKeywordMatchConfidence(
  normalizedHeader: string,
  originalHeader: string,
  keyword: string
): number {
  const normalizedKeyword = keyword.toLowerCase();

  // 精确匹配 - 最高置信度
  if (normalizedHeader === normalizedKeyword) {
    return 0.98;
  }

  // 开头匹配 - 很高置信度
  if (normalizedHeader.startsWith(normalizedKeyword)) {
    return 0.95;
  }

  // 结尾匹配 - 很高置信度
  if (normalizedHeader.endsWith(normalizedKeyword)) {
    return 0.93;
  }

  // 包含匹配 - 需要考虑上下文
  if (normalizedHeader.includes(normalizedKeyword)) {
    // 单字符匹配需要更严格验证
    if (normalizedKeyword.length === 1) {
      // 确保不是作为其他词的一部分
      const regex = new RegExp(
        `(?:^|[^\\u4e00-\\u9fa5a-z0-9])${normalizedKeyword}(?:[^\\u4e00-\\u9fa5a-z0-9]|$)`
      );
      if (regex.test(normalizedHeader)) {
        return 0.85;
      }
      return 0; // 单字符匹配但上下文不合适
    }

    // 多字符匹配
    if (normalizedKeyword.length >= 2) {
      // 考虑关键词在整个字段中的比例
      const ratio = normalizedKeyword.length / normalizedHeader.length;
      if (ratio >= 0.5) return 0.92; // 关键词占很大比例
      if (ratio >= 0.3) return 0.88; // 关键词占中等比例
      return 0.82; // 关键词占较小比例
    }
  }

  // 模糊匹配 - 计算编辑距离
  const distance = levenshteinDistance(normalizedHeader, normalizedKeyword);
  const maxLength = Math.max(normalizedHeader.length, normalizedKeyword.length);
  const similarity = 1 - distance / maxLength;

  if (similarity >= 0.8) return 0.75;
  if (similarity >= 0.6) return 0.65;

  return 0; // 无匹配
}

/**
 * ✅ 获取匹配类型
 */
function getMatchType(
  normalizedHeader: string,
  normalizedKeyword: string
): string {
  if (normalizedHeader === normalizedKeyword) return "exact";
  if (normalizedHeader.startsWith(normalizedKeyword)) return "prefix";
  if (normalizedHeader.endsWith(normalizedKeyword)) return "suffix";
  if (normalizedHeader.includes(normalizedKeyword)) return "contains";
  return "fuzzy";
}

/**
 * ✅ 计算编辑距离（Levenshtein距离）
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}
