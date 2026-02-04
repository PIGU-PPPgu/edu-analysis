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
      "思政",
      "思想政治",
      "德育",
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
      "思政分数",
      "思政等级",
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
 * 学生信息字段模式 - 扩展别名库
 */
const STUDENT_INFO_PATTERNS = {
  name: [
    "姓名",
    "名字",
    "name",
    "学生姓名",
    "student_name",
    "fullname",
    "学生",
    "考生姓名",
    "考生",
    "姓 名",
  ],
  student_id: [
    "学号",
    "student_id",
    "id",
    "学生编号",
    "考号",
    "准考证号",
    "考生号",
    "学籍号",
    "编号",
    "序号",
    "学生学号",
    "报名号",
  ],
  class_name: [
    "班级",
    "class",
    "class_name",
    "所在班级",
    "班级名称",
    "班",
    "行政班",
    "教学班",
    "class_id",
    "班级编号",
  ],
};

/**
 * 特殊字段模式 - 总分和排名（扩展别名）
 */
const SPECIAL_FIELD_PATTERNS = {
  total_score: [
    "总分",
    "总成绩",
    "total",
    "total_score", // 英文格式
    "totalscore",
    "合计",
    "总分数",
    "总计",
    "sum",
    "全科总分",
    "各科总分",
    "成绩总分",
    "总",
  ],
  total_grade: ["总分等级", "总等级", "总评等级", "综合等级"],
  rank_in_class: [
    "班级排名",
    "班排",
    "班内排名",
    "class_rank",
    "班名次",
    "班级名次",
    "班内名次",
    "总分班名",
    "总分班排",
  ],
  rank_in_grade: [
    "年级排名",
    "级排",
    "年级内排名",
    "grade_rank",
    "年级名次",
    "级内排名",
    "级名次",
    "总分级名",
    "总分年排",
    "总分级排",
  ],
  rank_in_school: [
    "学校排名",
    "校排",
    "全校排名",
    "school_rank",
    "校名次",
    "全校名次",
    "总分校名",
    "总分校排",
  ],
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

  // 🔧 BUG修复：按目标字段去重（保留置信度最高的映射）
  // 避免同一个系统字段被多个源字段映射
  const dedupedMap = new Map<string, FieldMapping>();
  mappings.forEach((mapping) => {
    // 生成唯一key：对于科目字段使用 "科目:字段"，非科目字段直接使用字段名
    const key = mapping.subject
      ? `${mapping.subject}:${mapping.mappedField}`
      : mapping.mappedField;

    const existing = dedupedMap.get(key);
    if (!existing || mapping.confidence > existing.confidence) {
      dedupedMap.set(key, mapping);
    } else {
      console.log(
        `[去重] 丢弃低置信度映射: ${mapping.originalField} → ${mapping.mappedField} (${mapping.confidence.toFixed(2)} < ${existing.confidence.toFixed(2)})`
      );
    }
  });

  const dedupedMappings = Array.from(dedupedMap.values());

  // 重新计算subjects和studentFields
  const dedupedSubjects = new Set<string>();
  const dedupedStudentFields: FieldMapping[] = [];
  dedupedMappings.forEach((mapping) => {
    if (mapping.subject) dedupedSubjects.add(mapping.subject);
    if (mapping.dataType === "student_info") dedupedStudentFields.push(mapping);
  });

  console.log(
    `[去重] 映射数量: ${mappings.length} → ${dedupedMappings.length}`
  );

  // ✅ 增强整体置信度计算 - 考虑匹配质量而非仅仅数量
  const totalFields = headers.length;
  const mappedFields = dedupedMappings.length;

  // 基础覆盖率
  const coverageRatio = mappedFields / totalFields;

  // 质量加权置信度 - 考虑每个映射的置信度
  const weightedConfidence =
    dedupedMappings.length > 0
      ? dedupedMappings.reduce((sum, mapping) => sum + mapping.confidence, 0) /
        dedupedMappings.length
      : 0;

  // 必要字段检查加成
  const hasRequiredFields =
    dedupedStudentFields.length >= 2 && dedupedSubjects.size >= 1;
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
    识别的科目: Array.from(dedupedSubjects),
    学生字段数: dedupedStudentFields.length,
    综合置信度: `${Math.round(confidence * 100)}%`,
    "达到98%目标": confidence >= 0.98 ? "✅" : "❌",
  });

  return {
    mappings: dedupedMappings,
    subjects: Array.from(dedupedSubjects),
    studentFields: dedupedStudentFields,
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

  // 1.2 特殊字段识别 - 总分、排名、等级等 (使用候选评分机制)
  const specialCandidates: Array<{
    field: string;
    dataType: FieldMapping["dataType"];
    confidence: number;
    patternLength: number;
  }> = [];

  for (const [field, patterns] of Object.entries(SPECIAL_FIELD_PATTERNS)) {
    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase();

      // 确定匹配类型
      let matchType: "exact" | "prefix" | "suffix" | "contains" | "none" =
        "none";
      if (normalizedHeader === normalizedPattern) {
        matchType = "exact";
      } else if (normalizedHeader.startsWith(normalizedPattern)) {
        matchType = "prefix";
      } else if (normalizedHeader.endsWith(normalizedPattern)) {
        matchType = "suffix";
      } else if (normalizedHeader.includes(normalizedPattern)) {
        matchType = "contains";
      }

      if (matchType === "none") continue;

      // 确定数据类型
      let dataType: FieldMapping["dataType"] = "score";
      if (field.includes("rank")) {
        if (field === "rank_in_class") dataType = "rank_class";
        else if (field === "rank_in_grade") dataType = "rank_grade";
        else if (field === "rank_in_school") dataType = "rank_school";
        else dataType = "rank_class";
      } else if (field === "total_grade") {
        dataType = "grade";
      }

      // 计算置信度
      let confidence =
        matchType === "exact"
          ? 1.0
          : matchType === "prefix" || matchType === "suffix"
            ? 0.95
            : 0.9;

      // 模式长度加成（越长越精确）
      const lengthBoost = Math.min(
        0.05,
        (normalizedPattern.length / Math.max(1, normalizedHeader.length)) * 0.05
      );
      confidence = Math.min(1.0, confidence + lengthBoost);

      // 🔧 BUG修复：对 total_score 的"排名/等级/班名/校名/级名"特征降权
      // 避免"总分班名"、"总分校名"等被误判为 total_score
      if (
        field === "total_score" &&
        /班|级|校|排名|等级|名次/.test(normalizedHeader)
      ) {
        confidence = Math.max(0.1, confidence - 0.3);
      }

      specialCandidates.push({
        field,
        dataType,
        confidence,
        patternLength: normalizedPattern.length,
      });
    }
  }

  // 从候选中选择最佳匹配（置信度最高，相同时选模式最长的）
  if (specialCandidates.length > 0) {
    const best = specialCandidates.sort(
      (a, b) => b.confidence - a.confidence || b.patternLength - a.patternLength
    )[0];

    console.log(
      `[算法识别] ✅ 特殊字段最佳匹配: ${best.field}, 置信度: ${best.confidence.toFixed(2)}`
    );

    return {
      originalField: header,
      mappedField: best.field,
      dataType: best.dataType,
      confidence: best.confidence,
    };
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
            dataType = "rank_class";
          } else if (type === "rank_in_grade") {
            dataType = "rank_grade";
          } else if (type === "rank_in_school") {
            dataType = "rank_school";
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
 * ✅ 完全动态映射：使用智能分析结果，支持任意表头格式
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
  console.log("[动态映射模式] 开始处理CSV行:", rowData);
  console.log("[动态映射模式] 使用字段映射:", headerAnalysis.mappings);

  // 🎯 第一步：构建反向映射表 - 从目标字段找回原始CSV列名
  const reverseMapping: Record<string, string> = {};
  const subjectMapping: Record<string, Record<string, string>> = {};

  headerAnalysis.mappings.forEach((mapping) => {
    const originalField = mapping.originalField;
    const mappedField = mapping.mappedField;

    if (mapping.dataType === "student_info") {
      // 学生信息字段：name, student_id, class_name
      reverseMapping[mappedField] = originalField;
      console.log(`[反向映射] 学生字段: ${mappedField} ← "${originalField}"`);
    } else if (mapping.subject) {
      // 科目字段：按科目分组
      const subject = mapping.subject;
      if (!subjectMapping[subject]) {
        subjectMapping[subject] = {};
      }

      // 映射数据类型到数据库字段
      if (mapping.dataType === "score") {
        subjectMapping[subject].score = originalField;
      } else if (mapping.dataType === "grade") {
        subjectMapping[subject].grade = originalField;
      } else if (mapping.dataType === "rank_class") {
        subjectMapping[subject].rank_in_class = originalField;
      } else if (mapping.dataType === "rank_grade") {
        subjectMapping[subject].rank_in_grade = originalField;
      } else if (mapping.dataType === "rank_school") {
        subjectMapping[subject].rank_in_school = originalField;
      }

      console.log(
        `[反向映射] 科目字段: ${subject} ${mapping.dataType} ← "${originalField}"`
      );
    } else if (mappedField === "total_score") {
      // 总分字段
      reverseMapping.total_score = originalField;
      console.log(`[反向映射] 总分: total_score ← "${originalField}"`);
    } else if (mappedField === "total_grade") {
      // 总分等级字段
      reverseMapping.total_grade = originalField;
      console.log(`[反向映射] 总等级: total_grade ← "${originalField}"`);
    } else if (mappedField.startsWith("rank_")) {
      // 排名字段
      reverseMapping[mappedField] = originalField;
      console.log(`[反向映射] 排名: ${mappedField} ← "${originalField}"`);
    }
  });

  // 🎯 第二步：动态构建数据记录
  const record: Record<string, any> = {
    // 考试信息
    exam_id: examInfo?.exam_id,
    exam_title: examInfo?.title,
    exam_type: examInfo?.type,
    exam_date: examInfo?.date,

    // 动态学生信息映射
    student_id:
      rowData[reverseMapping.student_id] ||
      rowData[reverseMapping.name] ||
      `temp_${Date.now()}`,
    name: rowData[reverseMapping.name] || "未知学生",
    class_name: rowData[reverseMapping.class_name] || "未知班级",

    // 动态总分信息映射
    total_score: reverseMapping.total_score
      ? parseFloat(rowData[reverseMapping.total_score]) || null
      : null,
    total_grade: reverseMapping.total_grade
      ? rowData[reverseMapping.total_grade]
      : null,
    total_rank_in_class: reverseMapping.total_rank_in_class
      ? parseInt(rowData[reverseMapping.total_rank_in_class]) || null
      : null,
    total_rank_in_school: reverseMapping.total_rank_in_school
      ? parseInt(rowData[reverseMapping.total_rank_in_school]) || null
      : null,
    total_rank_in_grade: reverseMapping.total_rank_in_grade
      ? parseInt(rowData[reverseMapping.total_rank_in_grade]) || null
      : null,

    // 时间戳
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 🎯 第三步：动态映射各科目数据
  const subjectDbMapping: Record<string, string> = {
    语文: "chinese",
    数学: "math",
    英语: "english",
    物理: "physics",
    化学: "chemistry",
    生物: "biology",
    政治: "politics",
    历史: "history",
    地理: "geography",
  };

  Object.entries(subjectMapping).forEach(([subject, fields]) => {
    const dbSubject = subjectDbMapping[subject] || subject.toLowerCase();

    // 分数字段
    if (fields.score) {
      const scoreValue = parseFloat(rowData[fields.score]);
      record[`${dbSubject}_score`] = isNaN(scoreValue) ? null : scoreValue;
      console.log(
        `[科目映射] ${dbSubject}_score = ${record[`${dbSubject}_score`]} (来自 "${fields.score}")`
      );
    }

    // 等级字段
    if (fields.grade) {
      record[`${dbSubject}_grade`] = rowData[fields.grade] || null;
    }

    // 排名字段
    if (fields.rank_in_class) {
      const rankValue = parseInt(rowData[fields.rank_in_class]);
      record[`${dbSubject}_rank_in_class`] = isNaN(rankValue)
        ? null
        : rankValue;
    }

    if (fields.rank_in_grade) {
      const rankValue = parseInt(rowData[fields.rank_in_grade]);
      record[`${dbSubject}_rank_in_grade`] = isNaN(rankValue)
        ? null
        : rankValue;
    }

    if (fields.rank_in_school) {
      const rankValue = parseInt(rowData[fields.rank_in_school]);
      record[`${dbSubject}_rank_in_school`] = isNaN(rankValue)
        ? null
        : rankValue;
    }
  });

  console.log("[动态映射模式] 处理结果:", {
    学生: record.name,
    班级: record.class_name,
    总分: record.total_score,
    语文: record.chinese_score,
    数学: record.math_score,
    英语: record.english_score,
    原始数据关键字段: {
      name列名: reverseMapping.name,
      name值: rowData[reverseMapping.name],
      class列名: reverseMapping.class_name,
      class值: rowData[reverseMapping.class_name],
    },
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

// ============================================================================
// 📦 字段映射缓存系统 - 记住用户的成功映射
// ============================================================================

const CACHE_KEY = "grade_import_field_mappings_cache";
const CACHE_VERSION = "v1";

interface CachedMapping {
  originalField: string;
  mappedField: string;
  subject?: string;
  dataType: FieldMapping["dataType"];
  usageCount: number;
  lastUsed: string;
}

interface MappingCache {
  version: string;
  mappings: Record<string, CachedMapping>;
  updatedAt: string;
}

/**
 * 从缓存加载字段映射
 */
export function loadMappingCache(): MappingCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const cache = JSON.parse(cached) as MappingCache;
    if (cache.version !== CACHE_VERSION) {
      console.log("[缓存] 版本不匹配，清除旧缓存");
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    console.log(
      `[缓存] 加载成功，包含 ${Object.keys(cache.mappings).length} 个映射`
    );
    return cache;
  } catch (e) {
    console.error("[缓存] 加载失败:", e);
    return null;
  }
}

/**
 * 保存字段映射到缓存
 */
export function saveMappingToCache(mappings: FieldMapping[]): void {
  try {
    const cache = loadMappingCache() || {
      version: CACHE_VERSION,
      mappings: {},
      updatedAt: new Date().toISOString(),
    };

    mappings.forEach((mapping) => {
      const key = mapping.originalField.toLowerCase();
      const existing = cache.mappings[key];

      cache.mappings[key] = {
        originalField: mapping.originalField,
        mappedField: mapping.mappedField,
        subject: mapping.subject,
        dataType: mapping.dataType,
        usageCount: existing ? existing.usageCount + 1 : 1,
        lastUsed: new Date().toISOString(),
      };
    });

    cache.updatedAt = new Date().toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(
      `[缓存] 保存成功，共 ${Object.keys(cache.mappings).length} 个映射`
    );
  } catch (e) {
    console.error("[缓存] 保存失败:", e);
  }
}

/**
 * 清除字段映射缓存
 */
export function clearMappingCache(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log("[缓存] 已清除");
}

/**
 * 使用缓存增强字段分析
 * 优先使用缓存的映射，未命中则使用智能分析
 */
export function analyzeCSVHeadersWithCache(headers: string[]): {
  mappings: FieldMapping[];
  subjects: string[];
  studentFields: FieldMapping[];
  confidence: number;
  cacheHits: number;
} {
  const cache = loadMappingCache();
  const result = analyzeCSVHeaders(headers);

  if (!cache) {
    return { ...result, cacheHits: 0 };
  }

  let cacheHits = 0;

  // 用缓存的映射覆盖智能分析结果
  result.mappings = result.mappings.map((mapping) => {
    const key = mapping.originalField.toLowerCase();
    const cached = cache.mappings[key];

    if (cached && cached.usageCount >= 2) {
      // 至少使用过2次才信任缓存
      cacheHits++;
      console.log(
        `[缓存命中] "${mapping.originalField}" → ${cached.mappedField} (使用${cached.usageCount}次)`
      );

      return {
        originalField: mapping.originalField,
        mappedField: cached.mappedField,
        subject: cached.subject,
        dataType: cached.dataType,
        confidence: Math.min(1.0, 0.95 + cached.usageCount * 0.01),
      };
    }

    return mapping;
  });

  console.log(`[缓存增强] 命中 ${cacheHits}/${headers.length} 个字段`);

  return { ...result, cacheHits };
}

/**
 * 获取缓存统计信息
 */
export function getMappingCacheStats(): {
  totalMappings: number;
  mostUsed: { field: string; count: number }[];
  lastUpdated: string | null;
} {
  const cache = loadMappingCache();
  if (!cache) {
    return { totalMappings: 0, mostUsed: [], lastUpdated: null };
  }

  const sorted = Object.values(cache.mappings)
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5)
    .map((m) => ({ field: m.originalField, count: m.usageCount }));

  return {
    totalMappings: Object.keys(cache.mappings).length,
    mostUsed: sorted,
    lastUpdated: cache.updatedAt,
  };
}

// ============================================================================
// 🔍 字段映射错误自动检测
// ============================================================================

export interface MappingDiagnostic {
  field: string;
  issue: "all_null" | "all_same" | "no_valid_scores" | "low_coverage";
  severity: "error" | "warning" | "info";
  message: string;
  suggestion: string;
}

/**
 * 诊断字段映射问题
 * 分析转换后的记录，检测可能的映射错误
 */
export function diagnoseMappingIssues(
  records: Record<string, any>[],
  headerAnalysis: {
    mappings: FieldMapping[];
    subjects: string[];
  }
): MappingDiagnostic[] {
  if (records.length === 0) return [];

  const diagnostics: MappingDiagnostic[] = [];
  const sampleSize = Math.min(records.length, 20);
  const sample = records.slice(0, sampleSize);

  // 检查学生信息字段
  const nameValues = sample.map((r) => r.name).filter(Boolean);
  if (nameValues.length === 0) {
    diagnostics.push({
      field: "name",
      issue: "all_null",
      severity: "error",
      message: "所有记录的姓名字段都为空",
      suggestion: '请检查表头是否包含"姓名"、"学生姓名"等字段',
    });
  } else if (nameValues.every((v) => v === "未知学生")) {
    diagnostics.push({
      field: "name",
      issue: "all_same",
      severity: "error",
      message: '所有姓名都显示为"未知学生"，字段映射可能有误',
      suggestion: "请检查CSV表头中的姓名列名是否被正确识别",
    });
  }

  // 检查成绩字段
  const scoreFields = [
    "total_score",
    "chinese_score",
    "math_score",
    "english_score",
    "physics_score",
    "chemistry_score",
    "biology_score",
    "politics_score",
    "history_score",
    "geography_score",
  ];

  let validScoreCount = 0;
  const nullScoreFields: string[] = [];

  scoreFields.forEach((field) => {
    const values = sample.map((r) => r[field]).filter((v) => v != null);
    if (values.length > 0) {
      validScoreCount++;
    } else if (
      headerAnalysis.subjects.some((s) => field.includes(s.toLowerCase()))
    ) {
      nullScoreFields.push(field);
    }
  });

  // 总分特殊检查
  const totalScores = sample.map((r) => r.total_score).filter((v) => v != null);
  if (
    totalScores.length === 0 &&
    headerAnalysis.mappings.some((m) => m.mappedField === "total_score")
  ) {
    diagnostics.push({
      field: "total_score",
      issue: "all_null",
      severity: "warning",
      message: "总分字段映射存在但所有值为空",
      suggestion: '请检查CSV中的总分列名（如"总分"、"合计"）',
    });
  }

  // 检查是否有任何有效成绩
  if (validScoreCount === 0) {
    diagnostics.push({
      field: "scores",
      issue: "no_valid_scores",
      severity: "error",
      message: "未找到任何有效的成绩数据",
      suggestion: '请确认CSV包含成绩列（如"语文"、"数学"等）',
    });
  }

  // 检查科目覆盖率
  const expectedSubjects = headerAnalysis.subjects.length;
  if (expectedSubjects > 0 && validScoreCount < expectedSubjects * 0.5) {
    diagnostics.push({
      field: "subjects",
      issue: "low_coverage",
      severity: "warning",
      message: `识别到 ${expectedSubjects} 个科目，但只有 ${validScoreCount} 个有有效数据`,
      suggestion: "部分科目的成绩列可能未被正确识别",
    });
  }

  // 检查班级字段
  const classValues = sample.map((r) => r.class_name).filter(Boolean);
  if (classValues.length === 0 || classValues.every((v) => v === "未知班级")) {
    diagnostics.push({
      field: "class_name",
      issue: "all_null",
      severity: "warning",
      message: "班级字段可能未正确识别",
      suggestion: '请检查表头是否包含"班级"、"班"等字段',
    });
  }

  // 打印诊断结果
  if (diagnostics.length > 0) {
    console.log("[映射诊断] 发现以下问题:");
    diagnostics.forEach((d) => {
      const icon =
        d.severity === "error" ? "❌" : d.severity === "warning" ? "⚠️" : "ℹ️";
      console.log(`  ${icon} [${d.field}] ${d.message}`);
      console.log(`     建议: ${d.suggestion}`);
    });
  } else {
    console.log("[映射诊断] ✅ 未发现明显的映射问题");
  }

  return diagnostics;
}

/**
 * 快速验证映射结果是否合理
 */
export function validateMappingResults(records: Record<string, any>[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (records.length === 0) {
    errors.push("没有可验证的记录");
    return { valid: false, errors };
  }

  const sample = records.slice(0, 10);

  // 必须有姓名
  const hasNames = sample.some((r) => r.name && r.name !== "未知学生");
  if (!hasNames) {
    errors.push("所有记录都缺少有效的姓名");
  }

  // 必须有至少一个成绩
  const hasScores = sample.some(
    (r) =>
      r.total_score != null ||
      r.chinese_score != null ||
      r.math_score != null ||
      r.english_score != null
  );
  if (!hasScores) {
    errors.push("所有记录都缺少有效的成绩数据");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
