/**
 * AI报告生成器
 * 将AI分析结果格式化为可导出的报告
 */

import { marked } from "marked";
import {
  type AIInsight,
  InsightType,
  InsightPriority,
  InsightSentiment,
} from "@/types/aiInsights";
import type { DiagnosticResult } from "./diagnosticRules";

export interface ReportConfig {
  title: string;
  subtitle?: string;
  author?: string;
  date?: Date;
  includeCharts?: boolean;
  includeRawData?: boolean;
  template?: ReportTemplate;
  customSections?: ReportSection[];
}

export enum ReportTemplate {
  COMPREHENSIVE = "comprehensive", // 综合报告
  EXECUTIVE_SUMMARY = "executive_summary", // 执行摘要
  DIAGNOSTIC = "diagnostic", // 诊断报告
  PROGRESS = "progress", // 进度报告
  COMPARISON = "comparison", // 对比报告
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  visible?: boolean;
}

export interface ReportData {
  config: ReportConfig;
  sections: ReportSection[];
  metadata: {
    generatedAt: Date;
    dataRange?: { start: Date; end: Date };
    entityCount?: number;
    insightCount?: number;
  };
}

/**
 * AI报告生成器类
 */
export class AIReportGenerator {
  private insights: AIInsight[];
  private rawData: any[];
  private context: any;

  constructor(insights: AIInsight[], rawData: any[] = [], context: any = {}) {
    this.insights = insights;
    this.rawData = rawData;
    this.context = context;
  }

  /**
   * 生成完整报告
   */
  generateReport(config: ReportConfig): ReportData {
    const template = config.template || ReportTemplate.COMPREHENSIVE;
    const sections = this.generateSections(template, config);

    return {
      config,
      sections,
      metadata: {
        generatedAt: new Date(),
        insightCount: this.insights.length,
        entityCount: this.rawData.length,
      },
    };
  }

  /**
   * 生成报告章节
   */
  private generateSections(
    template: ReportTemplate,
    config: ReportConfig
  ): ReportSection[] {
    let sections: ReportSection[] = [];

    switch (template) {
      case ReportTemplate.COMPREHENSIVE:
        sections = this.generateComprehensiveSections(config);
        break;
      case ReportTemplate.EXECUTIVE_SUMMARY:
        sections = this.generateExecutiveSummarySections(config);
        break;
      case ReportTemplate.DIAGNOSTIC:
        sections = this.generateDiagnosticSections(config);
        break;
      case ReportTemplate.PROGRESS:
        sections = this.generateProgressSections(config);
        break;
      case ReportTemplate.COMPARISON:
        sections = this.generateComparisonSections(config);
        break;
    }

    // 添加自定义章节
    if (config.customSections) {
      sections.push(...config.customSections);
    }

    // 按order排序
    sections.sort((a, b) => a.order - b.order);

    return sections.filter((s) => s.visible !== false);
  }

  /**
   * 生成综合报告章节
   * 针对AI生成的完整分析报告，避免内容重复
   */
  private generateComprehensiveSections(config: ReportConfig): ReportSection[] {
    // 检测是否是AI完整分析报告（只有一个high priority的完整内容）
    const hasFullAIAnalysis =
      this.insights.length === 1 &&
      this.insights[0].priority === InsightPriority.HIGH &&
      this.insights[0].description.length > 500; // 完整报告通常很长

    if (hasFullAIAnalysis) {
      // 对于AI完整分析，使用简化的章节结构，避免重复
      return [
        {
          id: "cover",
          title: "报告封面",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "executive_summary",
          title: "执行摘要",
          content: this.generateExecutiveSummarySimple(),
          order: 1,
        },
        {
          id: "ai_full_analysis",
          title: "AI完整分析",
          content: this.generateAIFullAnalysis(),
          order: 2,
        },
        {
          id: "data_analysis",
          title: "数据分析",
          content: this.generateDataAnalysis(),
          order: 3,
          visible: config.includeRawData,
        },
        {
          id: "appendix",
          title: "附录",
          content: this.generateAppendix(),
          order: 4,
        },
      ];
    } else {
      // 对于常规分析洞察，使用完整的章节结构
      return [
        {
          id: "cover",
          title: "报告封面",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "executive_summary",
          title: "执行摘要",
          content: this.generateExecutiveSummary(),
          order: 1,
        },
        {
          id: "key_findings",
          title: "关键发现",
          content: this.generateKeyFindings(),
          order: 2,
        },
        {
          id: "detailed_insights",
          title: "详细洞察",
          content: this.generateDetailedInsights(),
          order: 3,
        },
        {
          id: "recommendations",
          title: "改进建议",
          content: this.generateRecommendations(),
          order: 4,
        },
        {
          id: "action_plan",
          title: "行动计划",
          content: this.generateActionPlan(),
          order: 5,
        },
        {
          id: "data_analysis",
          title: "数据分析",
          content: this.generateDataAnalysis(),
          order: 6,
          visible: config.includeRawData,
        },
        {
          id: "appendix",
          title: "附录",
          content: this.generateAppendix(),
          order: 7,
        },
      ];
    }
  }

  /**
   * 生成执行摘要报告章节
   */
  private generateExecutiveSummarySections(
    config: ReportConfig
  ): ReportSection[] {
    // 检测是否是AI完整分析报告
    const hasFullAIAnalysis =
      this.insights.length === 1 &&
      this.insights[0].priority === InsightPriority.HIGH &&
      this.insights[0].description.length > 500;

    if (hasFullAIAnalysis) {
      // 对于AI完整分析，使用简化结构
      return [
        {
          id: "cover",
          title: "报告封面",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "executive_summary",
          title: "执行摘要",
          content: this.generateAIFullAnalysis(),
          order: 1,
        },
      ];
    } else {
      // 常规执行摘要
      return [
        {
          id: "cover",
          title: "报告封面",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "executive_summary",
          title: "执行摘要",
          content: this.generateExecutiveSummary(),
          order: 1,
        },
        {
          id: "key_metrics",
          title: "关键指标",
          content: this.generateKeyMetrics(),
          order: 2,
        },
        {
          id: "top_recommendations",
          title: "优先建议",
          content: this.generateTopRecommendations(),
          order: 3,
        },
      ];
    }
  }

  /**
   * 生成诊断报告章节
   */
  private generateDiagnosticSections(config: ReportConfig): ReportSection[] {
    // 检测是否是AI完整分析报告
    const hasFullAIAnalysis =
      this.insights.length === 1 &&
      this.insights[0].priority === InsightPriority.HIGH &&
      this.insights[0].description.length > 500;

    if (hasFullAIAnalysis) {
      // 对于AI完整分析，提取诊断相关内容
      return [
        {
          id: "cover",
          title: "诊断报告",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "diagnostic_summary",
          title: "诊断概要",
          content: this.generateExecutiveSummarySimple(),
          order: 1,
        },
        {
          id: "ai_diagnostic_analysis",
          title: "AI诊断分析",
          content: this.generateAIFullAnalysis(),
          order: 2,
        },
        {
          id: "appendix",
          title: "附录",
          content: this.generateAppendix(),
          order: 3,
        },
      ];
    } else {
      // 常规诊断报告
      return [
        {
          id: "cover",
          title: "诊断报告",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "diagnostic_summary",
          title: "诊断概要",
          content: this.generateDiagnosticSummary(),
          order: 1,
        },
        {
          id: "weaknesses",
          title: "薄弱环节分析",
          content: this.generateWeaknessAnalysis(),
          order: 2,
        },
        {
          id: "root_causes",
          title: "根因分析",
          content: this.generateRootCauseAnalysis(),
          order: 3,
        },
        {
          id: "improvement_strategies",
          title: "改进策略",
          content: this.generateImprovementStrategies(),
          order: 4,
        },
      ];
    }
  }

  /**
   * 生成进度报告章节
   */
  private generateProgressSections(config: ReportConfig): ReportSection[] {
    // 检测是否是AI完整分析报告
    const hasFullAIAnalysis =
      this.insights.length === 1 &&
      this.insights[0].priority === InsightPriority.HIGH &&
      this.insights[0].description.length > 500;

    if (hasFullAIAnalysis) {
      // 对于AI完整分析，展示完整内容
      return [
        {
          id: "cover",
          title: "进度报告",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "progress_overview",
          title: "进度概览",
          content: this.generateExecutiveSummarySimple(),
          order: 1,
        },
        {
          id: "ai_progress_analysis",
          title: "AI进度分析",
          content: this.generateAIFullAnalysis(),
          order: 2,
        },
        {
          id: "appendix",
          title: "附录",
          content: this.generateAppendix(),
          order: 3,
        },
      ];
    } else {
      // 常规进度报告
      return [
        {
          id: "cover",
          title: "进度报告",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "progress_overview",
          title: "进度概览",
          content: this.generateProgressOverview(),
          order: 1,
        },
        {
          id: "achievements",
          title: "成就与亮点",
          content: this.generateAchievements(),
          order: 2,
        },
        {
          id: "challenges",
          title: "挑战与问题",
          content: this.generateChallenges(),
          order: 3,
        },
        {
          id: "next_steps",
          title: "下一步计划",
          content: this.generateNextSteps(),
          order: 4,
        },
      ];
    }
  }

  /**
   * 生成对比报告章节
   */
  private generateComparisonSections(config: ReportConfig): ReportSection[] {
    // 检测是否是AI完整分析报告
    const hasFullAIAnalysis =
      this.insights.length === 1 &&
      this.insights[0].priority === InsightPriority.HIGH &&
      this.insights[0].description.length > 500;

    if (hasFullAIAnalysis) {
      // 对于AI完整分析，展示完整内容
      return [
        {
          id: "cover",
          title: "对比分析报告",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "comparison_summary",
          title: "对比概要",
          content: this.generateExecutiveSummarySimple(),
          order: 1,
        },
        {
          id: "ai_comparison_analysis",
          title: "AI对比分析",
          content: this.generateAIFullAnalysis(),
          order: 2,
        },
        {
          id: "appendix",
          title: "附录",
          content: this.generateAppendix(),
          order: 3,
        },
      ];
    } else {
      // 常规对比报告
      return [
        {
          id: "cover",
          title: "对比分析报告",
          content: this.generateCover(config),
          order: 0,
        },
        {
          id: "comparison_summary",
          title: "对比概要",
          content: this.generateComparisonSummary(),
          order: 1,
        },
        {
          id: "performance_comparison",
          title: "表现对比",
          content: this.generatePerformanceComparison(),
          order: 2,
        },
        {
          id: "trends_comparison",
          title: "趋势对比",
          content: this.generateTrendsComparison(),
          order: 3,
        },
      ];
    }
  }

  // ============================================================================
  // 章节内容生成方法
  // ============================================================================

  /**
   * 生成报告封面
   */
  private generateCover(config: ReportConfig): string {
    let content = `# ${config.title}\n\n`;

    if (config.subtitle) {
      content += `## ${config.subtitle}\n\n`;
    }

    content += "---\n\n";
    content += `**生成日期：** ${(config.date || new Date()).toLocaleDateString("zh-CN")}\n\n`;

    if (config.author) {
      content += `**报告人：** ${config.author}\n\n`;
    }

    content += `**数据范围：** ${this.rawData.length}个实体，${this.insights.length}条洞察\n\n`;
    content += "---\n\n";
    content += "> 本报告由AI智能分析引擎自动生成\n\n";

    return content;
  }

  /**
   * 生成执行摘要（完整版 - 用于常规分析）
   */
  private generateExecutiveSummary(): string {
    let content = "## 执行摘要\n\n";

    // 统计关键指标
    const highPriority = this.filterByPriority(InsightPriority.HIGH);
    const warnings = this.filterByType(InsightType.WARNING);
    const anomalies = this.filterByType(InsightType.ANOMALY);
    const achievements = this.filterByType(InsightType.ACHIEVEMENT);

    content += "### 概览\n\n";
    content += `本报告基于${this.rawData.length}个实体的数据分析，生成了${this.insights.length}条智能洞察。`;
    content += `其中包含${highPriority.length}个高优先级问题`;

    if (warnings.length > 0) {
      content += `，${warnings.length}个预警信号`;
    }
    if (anomalies.length > 0) {
      content += `，${anomalies.length}个异常检测`;
    }
    if (achievements.length > 0) {
      content += `，${achievements.length}项突出成就`;
    }
    content += "。\n\n";

    // Top 3关键发现
    content += "### 关键发现\n\n";
    const topInsights = this.insights
      .filter((i) => i.priority === InsightPriority.HIGH)
      .slice(0, 3);

    if (topInsights.length > 0) {
      topInsights.forEach((insight, index) => {
        content += `${index + 1}. **${insight.title}**\n\n`;
      });
    } else {
      content += "暂无高优先级发现。\n\n";
    }

    // 整体评价
    content += "### 整体评价\n\n";
    content += this.generateOverallAssessment();

    return content;
  }

  /**
   * 生成执行摘要（简化版 - 用于AI完整分析，只显示统计）
   */
  private generateExecutiveSummarySimple(): string {
    let content = "## 执行摘要\n\n";

    content += "### 概览\n\n";
    content += `本报告基于${this.rawData.length}个实体的数据分析，通过AI智能分析引擎生成综合评价报告。\n\n`;

    // 整体评价
    content += "### 整体评价\n\n";
    content += this.generateOverallAssessment();

    return content;
  }

  /**
   * 生成AI完整分析内容（直接展示AI生成的完整报告）
   */
  private generateAIFullAnalysis(): string {
    if (this.insights.length === 0) {
      return "## AI完整分析\n\n暂无分析内容。\n\n";
    }

    // 直接展示第一个insight的完整内容（AI生成的报告）
    const aiAnalysis = this.insights[0];
    let content = `## ${aiAnalysis.title}\n\n`;
    content += aiAnalysis.description;

    return content;
  }

  /**
   * 生成整体评价
   */
  private generateOverallAssessment(): string {
    const positiveCount = this.insights.filter(
      (i) => i.sentiment === InsightSentiment.POSITIVE
    ).length;
    const negativeCount = this.insights.filter(
      (i) => i.sentiment === InsightSentiment.NEGATIVE
    ).length;
    const neutralCount = this.insights.filter(
      (i) => i.sentiment === InsightSentiment.NEUTRAL
    ).length;

    const total = this.insights.length;
    const positiveRatio = positiveCount / total;
    const negativeRatio = negativeCount / total;

    let assessment = "";

    if (positiveRatio > 0.6) {
      assessment =
        "📈 整体表现优秀，多项指标达到预期目标，呈现积极发展态势。建议继续保持当前策略，并在优势领域进一步深化。";
    } else if (positiveRatio > 0.4) {
      assessment =
        "📊 整体表现良好，有改进空间。建议重点关注已识别的问题领域，同时巩固已有优势。";
    } else if (negativeRatio > 0.5) {
      assessment =
        "⚠️ 整体表现需要改进，存在多个需要重点关注的问题。建议立即采取干预措施，优先处理高优先级问题。";
    } else {
      assessment =
        "📋 整体表现平稳，部分领域表现出色，部分领域需要加强。建议制定针对性改进计划。";
    }

    assessment += `\n\n📊 **情绪分布：** 积极${positiveCount}项（${(positiveRatio * 100).toFixed(1)}%）、中性${neutralCount}项（${((neutralCount / total) * 100).toFixed(1)}%）、需改进${negativeCount}项（${(negativeRatio * 100).toFixed(1)}%）\n\n`;

    return assessment;
  }

  /**
   * 生成关键发现（完整版）
   */
  private generateKeyFindings(): string {
    let content = "## 关键发现\n\n";

    // 按类型分组
    const warnings = this.filterByType(InsightType.WARNING);
    const anomalies = this.filterByType(InsightType.ANOMALY);
    const patterns = this.filterByType(InsightType.PATTERN);
    const achievements = this.filterByType(InsightType.ACHIEVEMENT);

    if (warnings.length > 0) {
      content += "### ⚠️ 预警信号\n\n";
      warnings.slice(0, 5).forEach((insight, index) => {
        content += this.formatInsight(insight, index + 1);
      });
      content += "\n";
    }

    if (anomalies.length > 0) {
      content += "### 🔍 异常检测\n\n";
      anomalies.slice(0, 5).forEach((insight, index) => {
        content += this.formatInsight(insight, index + 1);
      });
      content += "\n";
    }

    if (patterns.length > 0) {
      content += "### 📊 数据模式\n\n";
      patterns.slice(0, 5).forEach((insight, index) => {
        content += this.formatInsight(insight, index + 1);
      });
      content += "\n";
    }

    if (achievements.length > 0) {
      content += "### 🏆 突出成就\n\n";
      achievements.slice(0, 5).forEach((insight, index) => {
        content += this.formatInsight(insight, index + 1);
      });
      content += "\n";
    }

    return content;
  }

  /**
   * 格式化单个洞察（完整版）
   */
  private formatInsight(insight: AIInsight, index?: number): string {
    let content = "";

    if (index !== undefined) {
      content += `#### ${index}. ${insight.title}\n\n`;
    } else {
      content += `#### ${insight.title}\n\n`;
    }

    content += `${insight.description}\n\n`;

    if (insight.detail) {
      content += `**详情：** ${insight.detail}\n\n`;
    }

    if (insight.metric) {
      content += `**指标：** ${insight.metric.value}${insight.metric.unit || ""}`;
      if (insight.metric.trend) {
        const trendIcon = insight.metric.trend === "up" ? "📈" : "📉";
        content += ` ${trendIcon}`;
      }
      content += "\n\n";
    }

    if (insight.confidence) {
      const confidencePercent = (insight.confidence * 100).toFixed(0);
      content += `**置信度：** ${confidencePercent}%\n\n`;
    }

    return content;
  }

  /**
   * 生成详细洞察
   */
  private generateDetailedInsights(): string {
    let content = "## 详细洞察分析\n\n";

    // 按优先级分组
    const high = this.filterByPriority(InsightPriority.HIGH);
    const medium = this.filterByPriority(InsightPriority.MEDIUM);
    const low = this.filterByPriority(InsightPriority.LOW);

    if (high.length > 0) {
      content += "### 🚨 高优先级洞察\n\n";
      high.forEach((insight, index) => {
        content += this.formatInsight(insight, index + 1);
        if (insight.actions && insight.actions.length > 0) {
          content += "**建议行动：**\n";
          insight.actions.forEach((action) => {
            content += `- ${action.label}`;
            if (action.description) {
              content += `：${action.description}`;
            }
            content += "\n";
          });
          content += "\n";
        }
      });
    }

    if (medium.length > 0) {
      content += "### 📊 中优先级洞察\n\n";
      medium.forEach((insight, index) => {
        content += this.formatInsight(insight, index + 1);
      });
    }

    if (low.length > 0) {
      content += "### ℹ️ 低优先级洞察\n\n";
      low.forEach((insight, index) => {
        content += this.formatInsight(insight, index + 1);
      });
    }

    return content;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(): string {
    let content = "## 改进建议\n\n";

    const suggestions = this.filterByType(InsightType.SUGGESTION);

    if (suggestions.length === 0) {
      content += "暂无改进建议。\n\n";
      return content;
    }

    content += "基于以上分析，我们提出以下改进建议：\n\n";

    // 按优先级分组建议
    const highPriority = suggestions.filter(
      (s) => s.priority === InsightPriority.HIGH
    );
    const mediumPriority = suggestions.filter(
      (s) => s.priority === InsightPriority.MEDIUM
    );

    if (highPriority.length > 0) {
      content += "### 🎯 优先建议（建议立即执行）\n\n";
      highPriority.forEach((suggestion, index) => {
        content += `#### ${index + 1}. ${suggestion.title}\n\n`;
        content += `${suggestion.description}\n\n`;
        if (suggestion.detail) {
          content += `${suggestion.detail}\n\n`;
        }
      });
    }

    if (mediumPriority.length > 0) {
      content += "### 📋 次要建议（建议1-2周内执行）\n\n";
      mediumPriority.forEach((suggestion, index) => {
        content += `${index + 1}. **${suggestion.title}**  \n`;
        content += `   ${suggestion.description}\n\n`;
      });
    }

    return content;
  }

  /**
   * 生成行动计划
   */
  private generateActionPlan(): string {
    let content = "## 行动计划\n\n";

    const suggestions = this.filterByType(InsightType.SUGGESTION);
    const highPriority = suggestions.filter(
      (s) => s.priority === InsightPriority.HIGH
    );

    if (highPriority.length === 0) {
      content += "暂无行动计划项。\n\n";
      return content;
    }

    content += "### 短期行动（1-2周）\n\n";
    content += "| 序号 | 行动项 | 预期效果 | 负责人 | 完成期限 |\n";
    content += "|------|--------|----------|--------|----------|\n";

    highPriority.slice(0, 5).forEach((suggestion, index) => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 14);
      content += `| ${index + 1} | ${suggestion.title} | 待定 | 待分配 | ${deadline.toLocaleDateString("zh-CN")} |\n`;
    });

    content += "\n";

    const mediumPriority = suggestions.filter(
      (s) => s.priority === InsightPriority.MEDIUM
    );

    if (mediumPriority.length > 0) {
      content += "### 中期行动（1-3个月）\n\n";
      content += "| 序号 | 行动项 | 预期效果 | 负责人 | 完成期限 |\n";
      content += "|------|--------|----------|--------|----------|\n";

      mediumPriority.slice(0, 5).forEach((suggestion, index) => {
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + 2);
        content += `| ${index + 1} | ${suggestion.title} | 待定 | 待分配 | ${deadline.toLocaleDateString("zh-CN")} |\n`;
      });

      content += "\n";
    }

    return content;
  }

  /**
   * 生成数据分析
   */
  private generateDataAnalysis(): string {
    let content = "## 数据分析\n\n";

    content += "### 数据概览\n\n";
    content += `- **分析实体数：** ${this.rawData.length}\n`;
    content += `- **生成洞察数：** ${this.insights.length}\n`;
    content += `- **平均置信度：** ${((this.insights.reduce((sum, i) => sum + (i.confidence || 0), 0) / this.insights.length) * 100).toFixed(1)}%\n\n`;

    // 如果有原始数据，生成数据表格
    if (this.rawData.length > 0 && this.rawData.length <= 10) {
      content += "### 数据明细\n\n";
      content += this.generateDataTable(this.rawData);
    }

    return content;
  }

  /**
   * 生成数据表格
   */
  private generateDataTable(data: any[]): string {
    if (data.length === 0) return "";

    const sample = data[0];
    const headers = Object.keys(sample).slice(0, 6); // 最多6列

    let table = "| " + headers.join(" | ") + " |\n";
    table += "|" + headers.map(() => "---").join("|") + "|\n";

    data.forEach((row) => {
      const values = headers.map((h) => {
        const val = row[h];
        if (typeof val === "number") return val.toFixed(2);
        return String(val || "-");
      });
      table += "| " + values.join(" | ") + " |\n";
    });

    return table + "\n";
  }

  /**
   * 生成附录
   */
  private generateAppendix(): string {
    let content = "## 附录\n\n";

    content += "### 术语表\n\n";
    content += "- **洞察（Insight）：** AI分析引擎从数据中发现的有价值的信息\n";
    content +=
      "- **置信度（Confidence）：** AI对洞察准确性的评估，范围0-100%\n";
    content +=
      "- **优先级（Priority）：** 洞察的重要程度，分为高、中、低三级\n";
    content += "- **情绪（Sentiment）：** 洞察的积极/消极倾向\n\n";

    content += "### 方法论\n\n";
    content +=
      "本报告采用AI智能分析引擎，结合统计学方法（Z-score、IQR等）、趋势预测算法（线性回归、指数平滑）";
    content +=
      "和诊断规则引擎，对数据进行多维度分析，生成客观、准确的洞察和建议。\n\n";

    return content;
  }

  /**
   * 生成关键指标
   */
  private generateKeyMetrics(): string {
    let content = "### 关键指标\n\n";

    // 从insights中提取带metric的洞察
    const metricsInsights = this.insights.filter((i) => i.metric);

    if (metricsInsights.length === 0) {
      content += "暂无关键指标数据。\n\n";
      return content;
    }

    content += "| 指标 | 当前值 | 趋势 |\n";
    content += "|------|--------|------|\n";

    metricsInsights.slice(0, 10).forEach((insight) => {
      const trend =
        insight.metric?.trend === "up"
          ? "📈 上升"
          : insight.metric?.trend === "down"
            ? "📉 下降"
            : "➡️ 稳定";
      content += `| ${insight.title} | ${insight.metric?.value}${insight.metric?.unit || ""} | ${trend} |\n`;
    });

    content += "\n";

    return content;
  }

  /**
   * 生成优先建议（Top 5）
   */
  private generateTopRecommendations(): string {
    let content = "### 优先建议\n\n";

    const suggestions = this.filterByType(InsightType.SUGGESTION)
      .filter((s) => s.priority === InsightPriority.HIGH)
      .slice(0, 5);

    if (suggestions.length === 0) {
      content += "暂无优先建议。\n\n";
      return content;
    }

    suggestions.forEach((suggestion, index) => {
      content += `#### ${index + 1}. ${suggestion.title}\n\n`;
      content += `${suggestion.description}\n\n`;
    });

    return content;
  }

  /**
   * 生成诊断概要
   */
  private generateDiagnosticSummary(): string {
    let content = "### 诊断概要\n\n";

    const criticalIssues = this.insights.filter(
      (i) =>
        i.type === InsightType.ANOMALY && i.priority === InsightPriority.HIGH
    );
    const warnings = this.filterByType(InsightType.WARNING);

    content += `本次诊断发现 **${criticalIssues.length}** 个严重问题和 **${warnings.length}** 个预警信号。\n\n`;

    if (criticalIssues.length > 0) {
      content += "**严重问题：**\n\n";
      criticalIssues.forEach((issue, index) => {
        content += `${index + 1}. ${issue.title}\n`;
      });
      content += "\n";
    }

    return content;
  }

  /**
   * 生成薄弱环节分析
   */
  private generateWeaknessAnalysis(): string {
    let content = "### 薄弱环节分析\n\n";

    const negativeInsights = this.insights.filter(
      (i) => i.sentiment === InsightSentiment.NEGATIVE
    );

    if (negativeInsights.length === 0) {
      content += "未发现明显薄弱环节。\n\n";
      return content;
    }

    negativeInsights.forEach((insight, index) => {
      content += this.formatInsight(insight, index + 1);
    });

    return content;
  }

  /**
   * 生成根因分析
   */
  private generateRootCauseAnalysis(): string {
    let content = "### 根因分析\n\n";

    const diagnosticInsights = this.insights.filter(
      (i) => i.detail && i.detail.length > 0
    );

    if (diagnosticInsights.length === 0) {
      content += "暂无根因分析数据。\n\n";
      return content;
    }

    diagnosticInsights.forEach((insight, index) => {
      content += `#### ${index + 1}. ${insight.title}\n\n`;
      if (insight.detail) {
        content += `${insight.detail}\n\n`;
      }
    });

    return content;
  }

  /**
   * 生成改进策略
   */
  private generateImprovementStrategies(): string {
    let content = "### 改进策略\n\n";

    const strategies = this.insights.filter((i) => i.title.includes("💡"));

    if (strategies.length === 0) {
      content += "暂无改进策略。\n\n";
      return content;
    }

    strategies.forEach((strategy, index) => {
      content += this.formatInsight(strategy, index + 1);
    });

    return content;
  }

  /**
   * 生成进度概览
   */
  private generateProgressOverview(): string {
    return "### 进度概览\n\n本期进度分析...\n\n";
  }

  /**
   * 生成成就亮点
   */
  private generateAchievements(): string {
    let content = "### 成就与亮点\n\n";

    const achievements = this.filterByType(InsightType.ACHIEVEMENT);

    if (achievements.length === 0) {
      content += "本期暂无突出成就。\n\n";
      return content;
    }

    achievements.forEach((achievement, index) => {
      content += this.formatInsight(achievement, index + 1);
    });

    return content;
  }

  /**
   * 生成挑战问题
   */
  private generateChallenges(): string {
    let content = "### 挑战与问题\n\n";

    const challenges = this.insights.filter(
      (i) => i.type === InsightType.WARNING || i.type === InsightType.ANOMALY
    );

    if (challenges.length === 0) {
      content += "本期未发现明显挑战或问题。\n\n";
      return content;
    }

    challenges.forEach((challenge, index) => {
      content += this.formatInsight(challenge, index + 1);
    });

    return content;
  }

  /**
   * 生成下一步计划
   */
  private generateNextSteps(): string {
    return "### 下一步计划\n\n根据本期进展，下一步建议...\n\n";
  }

  /**
   * 生成对比概要
   */
  private generateComparisonSummary(): string {
    return "### 对比概要\n\n本次对比分析...\n\n";
  }

  /**
   * 生成表现对比
   */
  private generatePerformanceComparison(): string {
    return "### 表现对比\n\n各实体表现对比...\n\n";
  }

  /**
   * 生成趋势对比
   */
  private generateTrendsComparison(): string {
    return "### 趋势对比\n\n趋势发展对比...\n\n";
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private filterByPriority(priority: InsightPriority): AIInsight[] {
    return this.insights.filter((i) => i.priority === priority);
  }

  private filterByType(type: InsightType): AIInsight[] {
    return this.insights.filter((i) => i.type === type);
  }

  /**
   * 导出为Markdown
   */
  exportAsMarkdown(reportData: ReportData): string {
    let markdown = "";

    reportData.sections.forEach((section) => {
      markdown += section.content;
      markdown += "\n\n---\n\n";
    });

    // 添加页脚
    markdown += `\n\n*报告生成时间：${reportData.metadata.generatedAt.toLocaleString("zh-CN")}*\n`;
    markdown += `*由AI智能分析引擎自动生成*\n`;

    return markdown;
  }

  /**
   * 导出为HTML
   */
  exportAsHTML(reportData: ReportData): string {
    const markdown = this.exportAsMarkdown(reportData);

    // 使用marked库将markdown转换为HTML
    const htmlContent = marked.parse(markdown);

    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportData.config.title}</title>
  <style>
    body {
      font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 10px;
      margin-top: 30px;
      margin-bottom: 20px;
      font-size: 2em;
    }
    h2 {
      color: #2c3e50;
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
      margin-top: 25px;
      margin-bottom: 15px;
      font-size: 1.5em;
    }
    h3 {
      color: #34495e;
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 1.25em;
    }
    h4 {
      color: #555;
      margin-top: 15px;
      margin-bottom: 8px;
      font-size: 1.1em;
    }
    p {
      margin: 12px 0;
      text-align: justify;
    }
    ul, ol {
      padding-left: 30px;
      margin: 12px 0;
    }
    li {
      margin: 6px 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #4CAF50;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    blockquote {
      border-left: 4px solid #4CAF50;
      padding-left: 20px;
      margin: 20px 0;
      color: #666;
      font-style: italic;
      background-color: #f9f9f9;
      padding: 15px 20px;
      border-radius: 4px;
    }
    code {
      background-color: #f4f4f4;
      padding: 3px 6px;
      border-radius: 4px;
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: 0.9em;
      color: #e74c3c;
    }
    pre {
      background-color: #2d2d2d;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 20px 0;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    hr {
      border: none;
      border-top: 2px solid #eee;
      margin: 30px 0;
    }
    strong {
      font-weight: 600;
      color: #2c3e50;
    }
    em {
      font-style: italic;
      color: #555;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 0.9em;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
    <div class="footer">
      <p>报告生成时间：${reportData.metadata.generatedAt.toLocaleString("zh-CN")}</p>
      <p>由AI智能分析引擎自动生成</p>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }
}

/**
 * 便捷函数：生成综合报告
 */
export function generateComprehensiveReport(
  insights: AIInsight[],
  rawData: any[] = [],
  config: Partial<ReportConfig> = {}
): ReportData {
  const generator = new AIReportGenerator(insights, rawData);

  const fullConfig: ReportConfig = {
    title: "AI增值分析综合报告",
    subtitle: "数据驱动的教学质量分析",
    date: new Date(),
    includeCharts: true,
    includeRawData: false,
    template: ReportTemplate.COMPREHENSIVE,
    ...config,
  };

  return generator.generateReport(fullConfig);
}

/**
 * 便捷函数：生成执行摘要报告
 */
export function generateExecutiveSummary(
  insights: AIInsight[],
  config: Partial<ReportConfig> = {}
): ReportData {
  const generator = new AIReportGenerator(insights);

  const fullConfig: ReportConfig = {
    title: "AI分析执行摘要",
    date: new Date(),
    template: ReportTemplate.EXECUTIVE_SUMMARY,
    ...config,
  };

  return generator.generateReport(fullConfig);
}

/**
 * 便捷函数：生成诊断报告
 */
export function generateDiagnosticReport(
  insights: AIInsight[],
  config: Partial<ReportConfig> = {}
): ReportData {
  const generator = new AIReportGenerator(insights);

  const fullConfig: ReportConfig = {
    title: "AI诊断报告",
    subtitle: "薄弱环节识别与改进建议",
    date: new Date(),
    template: ReportTemplate.DIAGNOSTIC,
    ...config,
  };

  return generator.generateReport(fullConfig);
}
