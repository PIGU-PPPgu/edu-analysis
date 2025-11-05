/**
 * 增强的AI解析服务 - 确保AI功能真正工作
 * 解决原有AI解析可能失败的问题
 */

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// 字段映射接口
export interface FieldMapping {
  original: string;
  mapped: string;
  confidence: number;
  source: "ai" | "rule" | "manual";
}

// AI解析结果接口
export interface AIParsingResult {
  mappings: Record<string, string>;
  dataTypes: Record<string, string>;
  suggestions: string;
  confidence: number;
  source: "ai" | "rule" | "hybrid";
}

// 增强的字段识别规则
const ENHANCED_FIELD_RULES = {
  // 学生标识
  student_id: [
    "学号",
    "考号",
    "学生号",
    "学生编号",
    "准考证号",
    "student_id",
    "id",
    "编号",
    "学籍号",
    "考生号",
    "序号",
    "no",
    "number",
    "学生学号",
  ],

  // 学生姓名
  name: [
    "姓名",
    "学生姓名",
    "name",
    "student_name",
    "名字",
    "学生",
    "考生姓名",
    "考生",
    "fullname",
    "full_name",
  ],

  // 班级信息 - 扩展识别模式
  class_name: [
    "班级",
    "班级名称",
    "现班",
    "行政班级",
    "教学班",
    "所在班级",
    "class",
    "class_name",
    "班次",
    "班别",
    "年级班级",
    "分班",
    "班组",
    "组别",
    "学习小组",
    "classroom",
    "班",
    "年班",
    "级班",
    "grade_class",
    "届",
    "年级",
    "班号",
  ],

  // 成绩相关
  score: [
    "成绩",
    "分数",
    "得分",
    "score",
    "总分",
    "总成绩",
    "卷面分",
    "实际得分",
    "原始分",
    "标准分",
    "total_score",
    "合计",
    "总计",
  ],

  // 各科目成绩
  chinese_score: ["语文", "语文成绩", "语文分数", "chinese", "中文"],
  math_score: ["数学", "数学成绩", "数学分数", "math", "mathematics"],
  english_score: ["英语", "英语成绩", "英语分数", "english", "外语"],
  physics_score: ["物理", "物理成绩", "物理分数", "physics"],
  chemistry_score: ["化学", "化学成绩", "化学分数", "chemistry"],
  politics_score: [
    "政治",
    "道法",
    "思政",
    "道德与法治",
    "politics",
    "思想品德",
  ],
  history_score: ["历史", "历史成绩", "历史分数", "history"],

  // 排名信息 - 关键修复点
  rank_in_class: [
    "班排名",
    "班级排名",
    "班内排名",
    "班排",
    "班次排名",
    "class_rank",
    "本班排名",
    "班排序",
    "班位次",
    "班级名次",
    "年级排名(班)",
    "班内名次",
  ],

  rank_in_grade: [
    "年级排名",
    "级排名",
    "年排",
    "全年级排名",
    "grade_rank",
    "级排",
    "年级名次",
    "级内排名",
    "年级位次",
    "全级排名",
    "学校排名",
    "校排名",
  ],

  rank_in_school: [
    "校排名",
    "学校排名",
    "全校排名",
    "school_rank",
    "总排名",
    "全校名次",
    "学校位次",
    "校内排名",
  ],

  // 等级信息
  grade_level: [
    "等级",
    "级别",
    "层次",
    "grade",
    "level",
    "评级",
    "档次",
    "水平",
    "标准",
    "总等级",
    "综合等级",
  ],

  // 科目等级
  chinese_grade: ["语文等级", "语文级别", "语文评级"],
  math_grade: ["数学等级", "数学级别", "数学评级"],
  english_grade: ["英语等级", "英语级别", "英语评级"],
  physics_grade: ["物理等级", "物理级别", "物理评级"],
  chemistry_grade: ["化学等级", "化学级别", "化学评级"],
  politics_grade: ["政治等级", "道法等级", "思政等级"],
  history_grade: ["历史等级", "历史级别", "历史评级"],

  // 其他字段
  subject: ["科目", "学科", "课程", "subject", "门类"],
  exam_date: ["考试日期", "日期", "date", "时间", "exam_date", "考试时间"],
  exam_type: ["考试类型", "考试种类", "exam_type", "类型", "考试性质"],
  max_score: ["满分", "总满分", "最高分", "max_score", "总分值"],
};

/**
 * 使用增强规则进行字段映射
 */
function performRuleBasedMapping(headers: string[]): AIParsingResult {
  const mappings: Record<string, string> = {};
  const dataTypes: Record<string, string> = {};
  const suggestions: string[] = [];

  console.log("🔍 开始增强规则映射，表头:", headers);

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();
    let mapped = false;

    // 遍历所有字段规则
    for (const [standardField, patterns] of Object.entries(
      ENHANCED_FIELD_RULES
    )) {
      for (const pattern of patterns) {
        const lowerPattern = pattern.toLowerCase();

        // 精确匹配
        if (lowerHeader === lowerPattern) {
          mappings[header] = standardField;
          dataTypes[header] = inferDataType(standardField, header);
          mapped = true;
          console.log(`✅ 精确匹配: "${header}" -> "${standardField}"`);
          break;
        }

        // 包含匹配
        if (
          lowerHeader.includes(lowerPattern) ||
          lowerPattern.includes(lowerHeader)
        ) {
          // 排除一些可能的误匹配
          const excludePatterns = ["排行", "排版", "排列", "排期"];
          const shouldExclude = excludePatterns.some((exclude) =>
            lowerHeader.includes(exclude.toLowerCase())
          );

          if (!shouldExclude) {
            mappings[header] = standardField;
            dataTypes[header] = inferDataType(standardField, header);
            mapped = true;
            console.log(`✅ 包含匹配: "${header}" -> "${standardField}"`);
            break;
          }
        }
      }

      if (mapped) break;
    }

    // 如果未映射，添加建议
    if (!mapped) {
      suggestions.push(`字段 "${header}" 未能自动识别，可能需要手动映射`);
      console.log(`⚠️  未识别字段: "${header}"`);
    }
  });

  return {
    mappings,
    dataTypes,
    suggestions: suggestions.join("; "),
    confidence: 0.85,
    source: "rule",
  };
}

/**
 * 推断数据类型
 */
function inferDataType(standardField: string, originalHeader: string): string {
  if (standardField.includes("score") || standardField.includes("rank")) {
    return "number";
  }
  if (
    standardField.includes("date") ||
    originalHeader.includes("时间") ||
    originalHeader.includes("日期")
  ) {
    return "date";
  }
  if (standardField.includes("grade") || standardField.includes("level")) {
    return "string";
  }
  return "string";
}

/**
 * 使用AI进行字段映射（通过Edge Function）
 */
async function performAIMapping(
  headers: string[],
  sampleData: any[]
): Promise<AIParsingResult | null> {
  try {
    console.log("🤖 尝试使用AI进行字段映射...");

    // 限制样本数据大小以避免token过多
    const limitedSampleData = sampleData.slice(0, 3);

    // 构建AI分析的Prompt
    const prompt = `你是一个专业的教育数据分析助手。请分析以下CSV文件的表头和样本数据，并将表头映射到标准字段名称。

表头列表: ${JSON.stringify(headers)}
样本数据: ${JSON.stringify(limitedSampleData)}

标准字段名称包括（但不限于）：
- student_id: 学号/考号
- name: 学生姓名  
- class_name: 班级
- chinese_score, math_score, english_score, physics_score, chemistry_score, politics_score, history_score: 各科成绩
- total_score: 总分
- rank_in_class: 班级排名
- rank_in_grade: 年级排名  
- rank_in_school: 学校排名
- chinese_grade, math_grade, english_grade: 各科等级
- total_grade: 总分等级

请返回JSON格式的映射结果：
{
  "mappings": {"原表头": "标准字段名"},
  "dataTypes": {"原表头": "数据类型"},
  "suggestions": "处理建议"
}

只返回JSON，不要其他解释。`;

    // 调用Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(
      "proxy-ai-request",
      {
        body: {
          provider: "doubao",
          model: "doubao-pro-32k",
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的教育数据分析助手，专门处理学生成绩数据的字段映射。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.2,
          max_tokens: 2000,
        },
      }
    );

    if (error) {
      console.error("AI请求失败:", error);
      throw error;
    }

    if (data && data.content) {
      // 尝试解析AI返回的JSON
      const jsonMatch = data.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log("🤖 AI映射成功:", result);

        return {
          mappings: result.mappings || {},
          dataTypes: result.dataTypes || {},
          suggestions: result.suggestions || "",
          confidence: 0.9,
          source: "ai",
        };
      }
    }

    throw new Error("AI返回格式无效");
  } catch (error) {
    console.error("AI映射失败:", error);
    return null;
  }
}

/**
 * 主要的增强AI解析函数
 */
export async function enhanceFileParsing(
  headers: string[],
  sampleData: any[]
): Promise<AIParsingResult> {
  console.log("🚀 开始增强文件解析...");
  console.log("📄 表头:", headers);
  console.log("📊 样本数据:", sampleData.length, "行");

  // 1. 首先尝试AI解析
  let aiResult: AIParsingResult | null = null;
  try {
    toast.info("AI正在分析数据结构...", { duration: 2000 });
    aiResult = await performAIMapping(headers, sampleData);

    if (aiResult && Object.keys(aiResult.mappings).length > 0) {
      toast.success("AI成功识别数据结构", {
        description: aiResult.suggestions || "表头字段已自动映射",
      });
      console.log("✅ AI解析成功");
      return aiResult;
    }
  } catch (error) {
    console.error("AI解析失败:", error);
  }

  // 2. AI解析失败，使用增强规则解析
  console.log("🔄 AI解析失败，使用增强规则解析...");
  toast.info("使用增强规则分析数据结构...", { duration: 2000 });

  const ruleResult = performRuleBasedMapping(headers);

  // 3. 如果规则解析也效果不佳，尝试混合方案
  if (Object.keys(ruleResult.mappings).length < headers.length * 0.5) {
    console.log("⚠️  规则解析效果不佳，尝试混合方案...");

    // 添加基于相似度的模糊匹配
    const fuzzyMappings = performFuzzyMapping(headers);
    Object.assign(ruleResult.mappings, fuzzyMappings);
    ruleResult.source = "hybrid";
    ruleResult.confidence = 0.7;
  }

  // 4. 验证映射结果
  const validatedResult = validateMappings(ruleResult, headers);

  if (Object.keys(validatedResult.mappings).length > 0) {
    toast.success(
      `成功识别 ${Object.keys(validatedResult.mappings).length} 个字段`,
      {
        description: validatedResult.suggestions || "字段已自动映射",
      }
    );
  } else {
    toast.warning("字段识别效果不佳", {
      description: "请手动检查字段映射",
    });
  }

  console.log("📋 最终映射结果:", validatedResult);
  return validatedResult;
}

/**
 * 基于相似度的模糊匹配
 */
function performFuzzyMapping(headers: string[]): Record<string, string> {
  const fuzzyMappings: Record<string, string> = {};

  headers.forEach((header) => {
    const lowerHeader = header.toLowerCase().trim();

    // 使用Levenshtein距离进行模糊匹配
    let bestMatch = "";
    let bestDistance = Infinity;
    let bestField = "";

    for (const [standardField, patterns] of Object.entries(
      ENHANCED_FIELD_RULES
    )) {
      for (const pattern of patterns) {
        const distance = levenshteinDistance(
          lowerHeader,
          pattern.toLowerCase()
        );
        const threshold = Math.min(pattern.length, lowerHeader.length) * 0.3; // 30%相似度阈值

        if (distance < threshold && distance < bestDistance) {
          bestDistance = distance;
          bestMatch = pattern;
          bestField = standardField;
        }
      }
    }

    if (bestField && !fuzzyMappings[header]) {
      fuzzyMappings[header] = bestField;
      console.log(
        `🔍 模糊匹配: "${header}" -> "${bestField}" (相似: "${bestMatch}")`
      );
    }
  });

  return fuzzyMappings;
}

/**
 * 计算Levenshtein距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * 验证和优化映射结果
 */
function validateMappings(
  result: AIParsingResult,
  headers: string[]
): AIParsingResult {
  const validatedMappings: Record<string, string> = {};
  const suggestions: string[] = [];

  // 检查必要字段
  const requiredFields = ["student_id", "name"];
  const foundFields = Object.values(result.mappings);

  for (const field of requiredFields) {
    if (!foundFields.includes(field)) {
      suggestions.push(`缺少必要字段: ${field}`);
    }
  }

  // 检查重复映射
  const fieldCounts: Record<string, number> = {};
  for (const [header, field] of Object.entries(result.mappings)) {
    if (field) {
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;

      if (fieldCounts[field] === 1) {
        validatedMappings[header] = field;
      } else {
        suggestions.push(`字段 ${field} 被重复映射`);
      }
    }
  }

  return {
    ...result,
    mappings: validatedMappings,
    suggestions: suggestions.join("; "),
  };
}

/**
 * 保存字段映射到数据库（用于学习和改进）
 */
export async function saveFieldMappings(
  batchId: string,
  mappings: Record<string, string>,
  source: "ai" | "rule" | "manual" = "ai"
): Promise<void> {
  try {
    const fieldMappingRecords = Object.entries(mappings).map(
      ([original, mapped]) => ({
        batch_id: batchId,
        original_field: original,
        mapped_field: mapped,
        mapping_source: source,
        confidence_score: source === "ai" ? 0.9 : 0.8,
      })
    );

    const { error } = await supabase
      .from("field_mappings")
      .insert(fieldMappingRecords);

    if (error) {
      console.error("保存字段映射失败:", error);
    } else {
      console.log("✅ 字段映射已保存到数据库");
    }
  } catch (error) {
    console.error("保存字段映射异常:", error);
  }
}

// 导出增强的AI服务对象，兼容原有接口
export const enhancedAIService = {
  enhanceFileParsing,
  saveFieldMappings,
  performRuleBasedMapping,
  performFuzzyMapping,
};
