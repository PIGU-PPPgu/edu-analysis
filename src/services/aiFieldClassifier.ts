import { supabase } from "@/integrations/supabase/client";
import { FieldType } from "./intelligentFileParser";

// 字段分类结果接口
export interface FieldClassificationResult {
  fieldType: FieldType;
  confidence: number;
  reasoning: string;
  suggestions: Array<{
    type: FieldType;
    confidence: number;
    reason: string;
  }>;
}

// 字段询问请求接口
export interface FieldInquiryRequest {
  fieldName: string;
  userDescription: string;
  sampleValues?: string[];
  context?: {
    detectedSubjects: string[];
    fileStructure: "wide" | "long" | "mixed";
    otherFields: string[];
  };
}

// 常见字段类型的中文描述
const FIELD_TYPE_DESCRIPTIONS: Record<FieldType, string> = {
  [FieldType.STUDENT_ID]: "学号/学生编号",
  [FieldType.NAME]: "学生姓名",
  [FieldType.CLASS_NAME]: "班级名称",
  [FieldType.SCORE]: "分数/成绩",
  [FieldType.SUBJECT]: "科目名称",
  [FieldType.EXAM_DATE]: "考试日期",
  [FieldType.EXAM_TYPE]: "考试类型",
  [FieldType.EXAM_TITLE]: "考试标题",
  [FieldType.RANK_IN_CLASS]: "班级排名",
  [FieldType.RANK_IN_GRADE]: "年级排名",
  [FieldType.GRADE]: "等级评定",
  [FieldType.UNKNOWN]: "未知类型",
};

// 快速识别模式 - 基于关键词的快速匹配
const QUICK_PATTERNS: Record<string, FieldType> = {
  // 分数相关
  分数: FieldType.SCORE,
  成绩: FieldType.SCORE,
  得分: FieldType.SCORE,
  总分: FieldType.SCORE,

  // 排名相关
  排名: FieldType.RANK_IN_CLASS,
  名次: FieldType.RANK_IN_CLASS,
  班名: FieldType.RANK_IN_CLASS,
  校名: FieldType.RANK_IN_GRADE,
  级名: FieldType.RANK_IN_GRADE,

  // 等级相关
  等级: FieldType.GRADE,
  评级: FieldType.GRADE,
  级别: FieldType.GRADE,

  // 基础信息
  姓名: FieldType.NAME,
  学号: FieldType.STUDENT_ID,
  班级: FieldType.CLASS_NAME,
  科目: FieldType.SUBJECT,
  日期: FieldType.EXAM_DATE,
  类型: FieldType.EXAM_TYPE,
  标题: FieldType.EXAM_TITLE,
};

export class AIFieldClassifier {
  /**
   * 智能分类字段类型
   */
  async classifyField(
    request: FieldInquiryRequest
  ): Promise<FieldClassificationResult> {
    console.log("[AIFieldClassifier] 开始分类字段:", request.fieldName);

    // 1. 快速模式识别
    const quickResult = this.quickClassify(request);
    if (quickResult.confidence > 0.8) {
      console.log("[AIFieldClassifier] 快速识别成功:", quickResult);
      return quickResult;
    }

    // 2. AI增强识别
    try {
      const aiResult = await this.aiClassify(request);
      console.log("[AIFieldClassifier] AI识别结果:", aiResult);
      return aiResult;
    } catch (error) {
      console.warn("[AIFieldClassifier] AI识别失败，使用快速识别结果:", error);
      return quickResult;
    }
  }

  /**
   * 快速分类 - 基于关键词匹配
   */
  private quickClassify(
    request: FieldInquiryRequest
  ): FieldClassificationResult {
    const { fieldName, userDescription } = request;
    const text = `${fieldName} ${userDescription}`.toLowerCase();

    const suggestions: Array<{
      type: FieldType;
      confidence: number;
      reason: string;
    }> = [];

    // 检查关键词匹配
    for (const [keyword, fieldType] of Object.entries(QUICK_PATTERNS)) {
      if (text.includes(keyword)) {
        const confidence = this.calculateKeywordConfidence(keyword, text);
        suggestions.push({
          type: fieldType,
          confidence,
          reason: `包含关键词"${keyword}"`,
        });
      }
    }

    // 科目特定字段检测
    const subjectMatch = this.detectSubjectField(fieldName, userDescription);
    if (subjectMatch) {
      suggestions.push(subjectMatch);
    }

    // 排序并选择最佳匹配
    suggestions.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = suggestions[0] || {
      type: FieldType.UNKNOWN,
      confidence: 0.1,
      reason: "无法识别字段类型",
    };

    return {
      fieldType: bestMatch.type,
      confidence: bestMatch.confidence,
      reasoning: bestMatch.reason,
      suggestions: suggestions.slice(0, 3), // 返回前3个建议
    };
  }

  /**
   * AI增强分类
   */
  private async aiClassify(
    request: FieldInquiryRequest
  ): Promise<FieldClassificationResult> {
    const prompt = this.buildClassificationPrompt(request);

    const { data, error } = await supabase.functions.invoke(
      "proxy-ai-request",
      {
        body: {
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的教育数据字段分类专家。根据字段名称和用户描述，判断字段的类型。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: "gpt-3.5-turbo",
          temperature: 0.1,
        },
      }
    );

    if (error) {
      throw new Error(`AI分类失败: ${error.message}`);
    }

    return this.parseAIResponse(data.content);
  }

  /**
   * 构建AI分类提示词
   */
  private buildClassificationPrompt(request: FieldInquiryRequest): string {
    const { fieldName, userDescription, sampleValues, context } = request;

    let prompt = `请分析以下字段的类型：

字段名称: ${fieldName}
用户描述: ${userDescription}`;

    if (sampleValues && sampleValues.length > 0) {
      prompt += `\n示例数据: ${sampleValues.slice(0, 5).join(", ")}`;
    }

    if (context) {
      prompt += `\n上下文信息:
- 检测到的科目: ${context.detectedSubjects.join(", ")}
- 文件结构: ${context.fileStructure}
- 其他字段: ${context.otherFields.slice(0, 10).join(", ")}`;
    }

    prompt += `

可选的字段类型:
${Object.entries(FIELD_TYPE_DESCRIPTIONS)
  .map(([type, desc]) => `- ${type}: ${desc}`)
  .join("\n")}

请以JSON格式返回分析结果:
{
  "fieldType": "最可能的字段类型",
  "confidence": 0.95,
  "reasoning": "判断理由",
  "suggestions": [
    {
      "type": "字段类型1",
      "confidence": 0.95,
      "reason": "理由1"
    },
    {
      "type": "字段类型2", 
      "confidence": 0.80,
      "reason": "理由2"
    }
  ]
}`;

    return prompt;
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(content: string): FieldClassificationResult {
    try {
      const result = JSON.parse(content);

      // 验证和标准化结果
      return {
        fieldType: result.fieldType || FieldType.UNKNOWN,
        confidence: Math.min(Math.max(result.confidence || 0, 0), 1),
        reasoning: result.reasoning || "AI分析结果",
        suggestions: (result.suggestions || []).map((s: any) => ({
          type: s.type || FieldType.UNKNOWN,
          confidence: Math.min(Math.max(s.confidence || 0, 0), 1),
          reason: s.reason || "无理由",
        })),
      };
    } catch (error) {
      console.error("[AIFieldClassifier] 解析AI响应失败:", error);
      return {
        fieldType: FieldType.UNKNOWN,
        confidence: 0.1,
        reasoning: "AI响应解析失败",
        suggestions: [],
      };
    }
  }

  /**
   * 计算关键词匹配置信度
   */
  private calculateKeywordConfidence(keyword: string, text: string): number {
    let confidence = 0.6; // 基础置信度

    // 完全匹配加分
    if (text === keyword) {
      confidence += 0.3;
    }

    // 字段名包含关键词加分
    if (text.startsWith(keyword) || text.endsWith(keyword)) {
      confidence += 0.2;
    }

    // 多个关键词匹配加分
    const keywordCount = (text.match(new RegExp(keyword, "g")) || []).length;
    if (keywordCount > 1) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * 检测科目特定字段
   */
  private detectSubjectField(
    fieldName: string,
    userDescription: string
  ): { type: FieldType; confidence: number; reason: string } | null {
    const text = `${fieldName} ${userDescription}`.toLowerCase();

    // 科目名称模式
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
      "道法",
      "总分",
    ];
    const subjectFound = subjects.find((subject) =>
      text.includes(subject.toLowerCase())
    );

    if (subjectFound) {
      // 判断是分数、等级还是排名
      if (
        text.includes("分数") ||
        text.includes("成绩") ||
        text.includes("得分")
      ) {
        return {
          type: FieldType.SCORE,
          confidence: 0.9,
          reason: `${subjectFound}科目的分数字段`,
        };
      } else if (text.includes("等级") || text.includes("评级")) {
        return {
          type: FieldType.GRADE,
          confidence: 0.9,
          reason: `${subjectFound}科目的等级字段`,
        };
      } else if (text.includes("班名") || text.includes("班级排名")) {
        return {
          type: FieldType.RANK_IN_CLASS,
          confidence: 0.9,
          reason: `${subjectFound}科目的班级排名字段`,
        };
      } else if (
        text.includes("校名") ||
        text.includes("级名") ||
        text.includes("年级排名")
      ) {
        return {
          type: FieldType.RANK_IN_GRADE,
          confidence: 0.9,
          reason: `${subjectFound}科目的年级排名字段`,
        };
      }
    }

    return null;
  }

  /**
   * 批量分类字段
   */
  async classifyFields(
    requests: FieldInquiryRequest[]
  ): Promise<Record<string, FieldClassificationResult>> {
    const results: Record<string, FieldClassificationResult> = {};

    // 并行处理多个字段
    const promises = requests.map(async (request) => {
      const result = await this.classifyField(request);
      results[request.fieldName] = result;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 获取字段类型的中文描述
   */
  getFieldTypeDescription(fieldType: FieldType): string {
    return FIELD_TYPE_DESCRIPTIONS[fieldType] || "未知类型";
  }

  /**
   * 获取所有可用的字段类型
   */
  getAllFieldTypes(): Array<{ type: FieldType; description: string }> {
    return Object.entries(FIELD_TYPE_DESCRIPTIONS)
      .filter(([type]) => type !== FieldType.UNKNOWN)
      .map(([type, description]) => ({
        type: type as FieldType,
        description,
      }));
  }
}

// 导出单例实例
export const aiFieldClassifier = new AIFieldClassifier();
