import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AIAnalysisRequest,
  AIAnalysisResponse,
  ChartGenerationConfig,
  AIModelConfig,
} from "@/components/analysis/types";

// 默认的AI分析配置
const DEFAULT_AI_CONFIG: AIModelConfig = {
  provider: "openai",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 2000,
};

/**
 * 生成用于AI分析的提示词
 */
export const generateAnalysisPrompt = (
  data: any[],
  language: string = "zh"
): string => {
  // 提取学科和成绩数据
  const subjectScores: Record<string, number[]> = {};

  data.forEach((item) => {
    const subject = item.subject || "";
    const score = parseFloat(String(item.score));

    if (subject && !isNaN(score)) {
      if (!subjectScores[subject]) {
        subjectScores[subject] = [];
      }
      subjectScores[subject].push(score);
    }
  });

  // 计算每个学科的平均分
  const subjectAverages: Record<string, number> = {};
  Object.entries(subjectScores).forEach(([subject, scores]) => {
    if (scores.length > 0) {
      const sum = scores.reduce((acc, score) => acc + score, 0);
      subjectAverages[subject] = sum / scores.length;
    }
  });

  // 根据语言构建提示词
  const prompts = {
    zh: `基于以下数据，为教师生成详细的教学分析报告。\n\n学生成绩数据摘要：\n${Object.entries(
      subjectAverages
    )
      .map(([subject, average]) => `- ${subject} 平均分: ${average.toFixed(1)}`)
      .join(
        "\n"
      )}\n\n请提供：\n1. 整体数据分析概述\n2. 关键发现（至少4点）\n3. 教学建议（至少4点）\n\n使用专业但易懂的语言，针对教育工作者提供有价值的见解。`,

    en: `Based on the following data, generate a detailed teaching analysis report for educators.\n\nStudent grades summary:\n${Object.entries(
      subjectAverages
    )
      .map(
        ([subject, average]) =>
          `- ${subject} average score: ${average.toFixed(1)}`
      )
      .join(
        "\n"
      )}\n\nPlease provide:\n1. Overall data analysis overview\n2. Key findings (at least 4 points)\n3. Teaching recommendations (at least 4 points)\n\nUse professional yet accessible language to provide valuable insights for educators.`,
  };

  return prompts[language as keyof typeof prompts] || prompts.zh;
};

/**
 * 发送AI分析请求
 */
export const performAIAnalysis = async (
  request: AIAnalysisRequest
): Promise<AIAnalysisResponse> => {
  const { data, config = {}, language = "zh" } = request;

  // 如果没有数据，返回默认结果
  if (!data || data.length === 0) {
    return {
      overview: "没有足够的数据进行分析",
      insights: ["需要提供学生成绩数据才能生成分析"],
      recommendations: ["请导入或输入学生成绩数据"],
    };
  }

  // 生成提示词
  const prompt = request.prompt || generateAnalysisPrompt(data, language);

  try {
    console.log("发送AI分析请求:", { config, prompt });

    // 调用Supabase Edge Function进行AI分析
    const { data: responseData, error } = await supabase.functions.invoke(
      "analyze-data",
      {
        body: { prompt, config: { ...DEFAULT_AI_CONFIG, ...config } },
      }
    );

    if (error) {
      console.error("AI分析API调用失败:", error);

      // 返回友好的错误信息，同时包含一些默认的分析结果
      return {
        overview: "AI分析服务暂时不可用，以下是基本统计分析",
        insights: [
          "当前共有 " + data.length + " 条成绩记录",
          "成绩统计基于现有数据生成",
          "建议配置AI服务获取更深入的分析",
          "查看系统日志了解详细错误信息",
        ],
        recommendations: [
          "检查AI服务配置和API密钥",
          "确保网络连接正常",
          "尝试使用不同的AI模型或提供商",
          "手动分析数据表格和图表",
        ],
        error: error.message,
      };
    }

    console.log("AI分析响应:", responseData);

    return responseData as AIAnalysisResponse;
  } catch (error) {
    console.error("AI分析过程中出错:", error);

    // 返回更友好的错误信息和默认分析结果
    return {
      overview: "AI分析过程中出现问题，以下是基本统计信息",
      insights: [
        "成绩数据包含 " + data.length + " 条记录",
        "请检查AI设置和网络连接",
        "可以尝试使用其他AI模型",
        "本地统计分析仍可用于决策参考",
      ],
      recommendations: [
        "确保AI服务配置正确",
        "重试分析或使用不同的API密钥",
        "参考图表和表格数据进行手动分析",
        "考虑升级到更稳定的AI服务提供商",
      ],
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
};

/**
 * 自动分析数据并生成推荐图表
 */
export const generateChartRecommendations = async (
  data: any[]
): Promise<ChartGenerationConfig[]> => {
  if (data.length === 0) return [];

  try {
    // 调用Supabase Edge Function进行图表推荐
    const { data: responseData, error } = await supabase.functions.invoke(
      "recommend-charts",
      {
        body: { data: data.slice(0, 10) }, // 只发送少量数据样本进行分析
      }
    );

    if (error) {
      console.error("图表推荐API调用失败:", error);
      throw new Error(`图表推荐失败: ${error.message}`);
    }

    return responseData as ChartGenerationConfig[];
  } catch (error) {
    console.error("生成图表推荐时出错:", error);
    // 返回默认的图表推荐
    return generateDefaultChartConfigs(data);
  }
};

/**
 * 根据数据特征生成默认的图表配置
 * 这是在API调用失败时的备选方案
 */
const generateDefaultChartConfigs = (data: any[]): ChartGenerationConfig[] => {
  if (data.length === 0) return [];

  const configs: ChartGenerationConfig[] = [];
  const firstRecord = data[0];
  const fields = Object.keys(firstRecord);

  // 查找可能的成绩字段
  const scoreField = fields.find(
    (f) =>
      f.toLowerCase().includes("score") ||
      f.toLowerCase().includes("分数") ||
      f.toLowerCase().includes("成绩")
  );

  // 查找可能的学科字段
  const subjectField = fields.find(
    (f) =>
      f.toLowerCase().includes("subject") ||
      f.toLowerCase().includes("科目") ||
      f.toLowerCase().includes("学科")
  );

  // 查找可能的日期字段
  const dateField = fields.find(
    (f) =>
      f.toLowerCase().includes("date") ||
      f.toLowerCase().includes("日期") ||
      f.toLowerCase().includes("time") ||
      f.toLowerCase().includes("时间")
  );

  // 如果找到学科和分数字段，添加柱状图配置
  if (subjectField && scoreField) {
    configs.push({
      chartType: "bar",
      dataFields: {
        xAxis: subjectField,
        yAxis: [scoreField],
      },
      options: {
        title: "各科目平均分",
      },
    });
  }

  // 如果找到日期和分数字段，添加折线图配置
  if (dateField && scoreField) {
    configs.push({
      chartType: "line",
      dataFields: {
        xAxis: dateField,
        yAxis: [scoreField],
        groupBy: subjectField,
      },
      options: {
        title: "成绩趋势变化",
      },
    });
  }

  // 始终添加分数分布图配置
  if (scoreField) {
    configs.push({
      chartType: "pie",
      dataFields: {
        groupBy: scoreField,
      },
      options: {
        title: "分数段分布",
      },
    });
  }

  return configs;
};
