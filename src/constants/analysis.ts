import { KnowledgePoint } from "@/types/homework";

/**
 * 分析提示词模板
 */
export const ANALYSIS_PROMPT_TEMPLATE = `
分析以下作业内容，识别出其中包含的知识点，并评估学生对这些知识点的掌握程度。

已知知识点列表（如果有）：
{{EXISTING_KNOWLEDGE_POINTS}}

作业内容：
{{HOMEWORK_CONTENT}}

请以JSON格式返回分析结果，包含以下字段：
- knowledgePoints: 知识点数组，每个知识点包含：
  - name: 知识点名称
  - description: 知识点描述（简要解释该知识点）
  - importance: 重要性(1-5，5表示最重要)
  - masteryLevel: 掌握程度(1-5，5表示完全掌握)
  - confidence: 识别置信度(0-100)
  - isNew: 是否为新发现的知识点(相对于已知知识点)

请对importance和masteryLevel使用1-5的评分标准：
1 = 非常低/基础/不熟练
2 = 低/初级/了解基础
3 = 中等/必要/基本掌握
4 = 高/重要/熟练
5 = 非常高/核心/精通

响应格式示例：
{
  "knowledgePoints": [
    {
      "name": "知识点名称",
      "description": "知识点描述",
      "importance": 4,
      "masteryLevel": 3,
      "confidence": 95,
      "isNew": false
    }
  ]
}
`;

/**
 * 分析超时时间(毫秒)
 */
export const ANALYSIS_TIMEOUT = 60000; // 60秒

/**
 * 分析频率限制(毫秒)
 * 防止用户过于频繁地请求AI分析
 */
export const ANALYSIS_RATE_LIMIT = 5000; // 5秒
