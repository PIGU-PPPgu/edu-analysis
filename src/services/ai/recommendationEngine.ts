/**
 * 🧠 Master-AI-Data: 智能推荐引擎
 * 基于用户行为数据生成个性化推荐
 */

import { supabase } from "@/integrations/supabase/client";
import {
  // userBehaviorTracker, // 暂时禁用
  UserPreferences,
  UserActionType,
} from "./userBehaviorTracker";
import { warningAnalysisCache } from "@/utils/performanceCache";

// 推荐类型枚举
export enum RecommendationType {
  STUDENT_FOCUS = "student_focus", // 重点关注学生
  ANALYSIS_METHOD = "analysis_method", // 分析方法推荐
  PAGE_NAVIGATION = "page_navigation", // 页面导航推荐
  FILTER_SUGGESTION = "filter_suggestion", // 筛选器建议
  TIME_RANGE = "time_range", // 时间范围推荐
  SUBJECT_FOCUS = "subject_focus", // 科目关注推荐
  CLASS_ATTENTION = "class_attention", // 班级关注推荐
  WORKFLOW_OPTIMIZATION = "workflow_optimization", // 工作流优化
}

// 推荐项接口
export interface RecommendationItem {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  actionUrl?: string;
  priority: number; // 1-10, 10为最高优先级
  confidence: number; // 0-1, 推荐置信度
  reasoning: string; // 推荐理由
  metadata: Record<string, any>;
  expires_at?: string;
}

// 推荐配置
interface RecommendationConfig {
  maxRecommendations: number;
  minConfidence: number;
  diversityWeight: number; // 多样性权重
  recencyWeight: number; // 时效性权重
  personalityWeight: number; // 个性化权重
}

const DEFAULT_CONFIG: RecommendationConfig = {
  maxRecommendations: 8,
  minConfidence: 0.3,
  diversityWeight: 0.3,
  recencyWeight: 0.4,
  personalityWeight: 0.3,
};

class RecommendationEngine {
  private config: RecommendationConfig;
  private userCache: Map<
    string,
    { preferences: UserPreferences; timestamp: number }
  > = new Map();
  private cacheTTL = 10 * 60 * 1000; // 10分钟缓存

  constructor(config: Partial<RecommendationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 为用户生成个性化推荐
   */
  async generateRecommendations(userId: string): Promise<RecommendationItem[]> {
    try {
      const userPreferences = await this.getUserPreferences(userId);
      if (!userPreferences) {
        return this.getFallbackRecommendations();
      }

      const recommendations: RecommendationItem[] = [];

      // 生成不同类型的推荐
      recommendations.push(
        ...(await this.generateStudentFocusRecommendations(userPreferences))
      );
      recommendations.push(
        ...(await this.generateAnalysisMethodRecommendations(userPreferences))
      );
      recommendations.push(
        ...(await this.generateNavigationRecommendations(userPreferences))
      );
      recommendations.push(
        ...(await this.generateFilterRecommendations(userPreferences))
      );
      recommendations.push(
        ...(await this.generateWorkflowRecommendations(userPreferences))
      );

      // 过滤、排序和限制数量
      return this.rankAndFilterRecommendations(recommendations);
    } catch (error) {
      console.error(
        "[RecommendationEngine] Error generating recommendations:",
        error
      );
      return this.getFallbackRecommendations();
    }
  }

  /**
   * 生成学生关注推荐
   */
  private async generateStudentFocusRecommendations(
    preferences: UserPreferences
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];

    // 基于查看历史推荐重点关注学生
    if (preferences.analysis_patterns.frequently_viewed_classes.length > 0) {
      const topClass =
        preferences.analysis_patterns.frequently_viewed_classes[0];

      recommendations.push({
        id: `student_focus_${topClass}_${Date.now()}`,
        type: RecommendationType.STUDENT_FOCUS,
        title: `关注${topClass}班级学生`,
        description: `基于您的浏览习惯，建议重点关注${topClass}班级的学生表现`,
        actionUrl: `/student-management?class=${encodeURIComponent(topClass)}`,
        priority: 8,
        confidence: 0.8,
        reasoning: `您经常查看${topClass}班级的相关数据`,
        metadata: { class_name: topClass, action_type: "class_focus" },
      });
    }

    // 基于预警数据推荐需要关注的学生
    try {
      const { data: warningStudents } = await supabase
        .from("warning_records")
        .select("student_id, details")
        .eq("status", "active")
        .limit(3);

      if (warningStudents && warningStudents.length > 0) {
        recommendations.push({
          id: `warning_students_${Date.now()}`,
          type: RecommendationType.STUDENT_FOCUS,
          title: "需要关注的预警学生",
          description: `发现${warningStudents.length}名学生需要重点关注，建议及时跟进`,
          actionUrl: "/warning-analysis",
          priority: 9,
          confidence: 0.9,
          reasoning: "系统检测到有学生触发预警规则",
          metadata: {
            warning_count: warningStudents.length,
            students: warningStudents,
          },
        });
      }
    } catch (error) {
      console.warn("Failed to fetch warning students:", error);
    }

    return recommendations;
  }

  /**
   * 生成分析方法推荐
   */
  private async generateAnalysisMethodRecommendations(
    preferences: UserPreferences
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];

    // 基于用户偏好推荐图表类型
    if (preferences.learning_style.prefers_visual) {
      recommendations.push({
        id: `visual_analysis_${Date.now()}`,
        type: RecommendationType.ANALYSIS_METHOD,
        title: "可视化分析工具",
        description: "您偏好可视化分析，推荐使用高级图表分析功能",
        actionUrl: "/advanced-analysis?tab=charts",
        priority: 7,
        confidence: 0.75,
        reasoning: "您的图表交互频率较高，偏好可视化分析",
        metadata: {
          analysis_type: "visual",
          interaction_rate: preferences.analysis_patterns.preferred_chart_types,
        },
      });
    }

    // 基于使用频率推荐AI分析
    const aiUsageFreq = preferences.frequent_actions.filter(
      (action) => action === UserActionType.RUN_AI_ANALYSIS
    ).length;

    if (aiUsageFreq < 2) {
      recommendations.push({
        id: `ai_analysis_intro_${Date.now()}`,
        type: RecommendationType.ANALYSIS_METHOD,
        title: "尝试AI智能分析",
        description: "AI分析能够自动发现数据中的关键洞察，提升分析效率",
        actionUrl: "/advanced-analysis?tab=ai",
        priority: 6,
        confidence: 0.6,
        reasoning: "您较少使用AI分析功能，建议尝试提升效率",
        metadata: {
          current_usage: aiUsageFreq,
          suggestion_type: "feature_discovery",
        },
      });
    }

    return recommendations;
  }

  /**
   * 生成导航推荐
   */
  private async generateNavigationRecommendations(
    preferences: UserPreferences
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];

    // 基于访问模式推荐页面
    const lessVisitedPages = [
      "/homework",
      "/warning-analysis",
      "/ai-settings",
    ].filter((page) => !preferences.preferred_pages.includes(page));

    if (lessVisitedPages.length > 0) {
      const recommendedPage = lessVisitedPages[0];
      const pageNames: Record<string, string> = {
        "/homework": "作业管理",
        "/warning-analysis": "预警分析",
        "/ai-settings": "AI设置",
      };

      recommendations.push({
        id: `navigation_${recommendedPage.replace("/", "")}_${Date.now()}`,
        type: RecommendationType.PAGE_NAVIGATION,
        title: `探索${pageNames[recommendedPage]}功能`,
        description: `${pageNames[recommendedPage]}可以帮助您更全面地管理和分析数据`,
        actionUrl: recommendedPage,
        priority: 5,
        confidence: 0.5,
        reasoning: "扩展功能使用范围，提升工作效率",
        metadata: { page: recommendedPage, usage_gap: true },
      });
    }

    return recommendations;
  }

  /**
   * 生成筛选器推荐
   */
  private async generateFilterRecommendations(
    preferences: UserPreferences
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];

    // 基于常用筛选器推荐时间范围
    if (preferences.analysis_patterns.preferred_time_ranges.length > 0) {
      const commonTimeRange =
        preferences.analysis_patterns.preferred_time_ranges[0];

      recommendations.push({
        id: `time_filter_${commonTimeRange}_${Date.now()}`,
        type: RecommendationType.TIME_RANGE,
        title: "应用常用时间筛选",
        description: `您经常使用"${commonTimeRange}"时间范围，快速应用此筛选`,
        priority: 4,
        confidence: 0.7,
        reasoning: `"${commonTimeRange}"是您最常使用的时间范围`,
        metadata: { time_range: commonTimeRange, usage_frequency: "high" },
      });
    }

    // 推荐科目筛选
    if (preferences.analysis_patterns.frequently_viewed_subjects.length > 0) {
      const topSubjects =
        preferences.analysis_patterns.frequently_viewed_subjects.slice(0, 2);

      recommendations.push({
        id: `subject_filter_${Date.now()}`,
        type: RecommendationType.SUBJECT_FOCUS,
        title: "重点科目分析",
        description: `重点分析${topSubjects.join("、")}等科目的学习情况`,
        priority: 6,
        confidence: 0.75,
        reasoning: `您经常关注这些科目的数据`,
        metadata: { subjects: topSubjects, focus_type: "subject_analysis" },
      });
    }

    return recommendations;
  }

  /**
   * 生成工作流优化推荐
   */
  private async generateWorkflowRecommendations(
    preferences: UserPreferences
  ): Promise<RecommendationItem[]> {
    const recommendations: RecommendationItem[] = [];

    // 基于页面停留时间推荐优化
    if (preferences.performance_preferences.preferred_load_speed === "fast") {
      recommendations.push({
        id: `performance_optimization_${Date.now()}`,
        type: RecommendationType.WORKFLOW_OPTIMIZATION,
        title: "启用数据缓存加速",
        description: "启用数据缓存可以显著提升页面加载速度，提高工作效率",
        actionUrl: "/ai-settings?tab=performance",
        priority: 7,
        confidence: 0.6,
        reasoning: "您偏好快速加载，缓存可以提升体验",
        metadata: { optimization_type: "caching", current_preference: "fast" },
      });
    }

    // 基于重复访问模式推荐自动刷新
    if (
      preferences.performance_preferences.auto_refresh_enabled === false &&
      preferences.performance_preferences.prefers_cached_data
    ) {
      recommendations.push({
        id: `auto_refresh_${Date.now()}`,
        type: RecommendationType.WORKFLOW_OPTIMIZATION,
        title: "考虑启用自动刷新",
        description: "基于您的访问模式，自动刷新可以确保数据实时性",
        priority: 4,
        confidence: 0.5,
        reasoning: "您经常重复访问相同页面，自动刷新能保持数据新鲜度",
        metadata: { feature: "auto_refresh", benefit: "data_freshness" },
      });
    }

    return recommendations;
  }

  /**
   * 排序和过滤推荐结果
   */
  private rankAndFilterRecommendations(
    recommendations: RecommendationItem[]
  ): RecommendationItem[] {
    // 过滤置信度低的推荐
    const filtered = recommendations.filter(
      (rec) => rec.confidence >= this.config.minConfidence
    );

    // 多因素排序
    const ranked = filtered.sort((a, b) => {
      const scoreA = this.calculateRecommendationScore(a);
      const scoreB = this.calculateRecommendationScore(b);
      return scoreB - scoreA;
    });

    // 确保类型多样性
    const diversified = this.ensureDiversity(ranked);

    // 限制数量
    return diversified.slice(0, this.config.maxRecommendations);
  }

  /**
   * 计算推荐得分
   */
  private calculateRecommendationScore(
    recommendation: RecommendationItem
  ): number {
    const priorityScore = recommendation.priority / 10;
    const confidenceScore = recommendation.confidence;
    const recencyScore = 1; // 新生成的推荐都是最新的

    return (
      priorityScore * this.config.personalityWeight +
      confidenceScore * this.config.personalityWeight +
      recencyScore * this.config.recencyWeight
    );
  }

  /**
   * 确保推荐类型多样性
   */
  private ensureDiversity(
    recommendations: RecommendationItem[]
  ): RecommendationItem[] {
    const typeCount: Record<string, number> = {};
    const maxPerType = Math.ceil(
      this.config.maxRecommendations / Object.keys(RecommendationType).length
    );

    return recommendations.filter((rec) => {
      const count = typeCount[rec.type] || 0;
      if (count < maxPerType) {
        typeCount[rec.type] = count + 1;
        return true;
      }
      return false;
    });
  }

  /**
   * 获取用户偏好（带缓存）
   */
  private async getUserPreferences(
    userId: string
  ): Promise<UserPreferences | null> {
    // 检查缓存
    const cached = this.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.preferences;
    }

    try {
      // 暂时禁用用户行为分析，返回默认偏好
      // const preferences = await userBehaviorTracker.analyzeUserPreferences(userId);
      const preferences: UserPreferences = {
        preferredPages: [],
        frequentActions: [],
        preferredFilters: {},
        analysisPatterns: {},
        learningStyle: {},
        performancePreferences: {},
      };

      // 更新缓存
      this.userCache.set(userId, {
        preferences,
        timestamp: Date.now(),
      });

      return preferences;
    } catch (error) {
      console.warn("Failed to get user preferences:", error);
      return null;
    }
  }

  /**
   * 获取默认推荐（当无法获取用户数据时）
   */
  private getFallbackRecommendations(): RecommendationItem[] {
    return [
      {
        id: `fallback_grade_analysis_${Date.now()}`,
        type: RecommendationType.PAGE_NAVIGATION,
        title: "开始成绩分析",
        description: "分析学生成绩数据，发现学习趋势和问题",
        actionUrl: "/grade-analysis",
        priority: 8,
        confidence: 0.8,
        reasoning: "成绩分析是教学管理的核心功能",
        metadata: { fallback: true, type: "basic_navigation" },
      },
      {
        id: `fallback_student_management_${Date.now()}`,
        type: RecommendationType.PAGE_NAVIGATION,
        title: "学生信息管理",
        description: "管理学生基本信息，跟踪学习状态",
        actionUrl: "/student-management",
        priority: 7,
        confidence: 0.7,
        reasoning: "学生管理是基础功能",
        metadata: { fallback: true, type: "basic_navigation" },
      },
      {
        id: `fallback_advanced_analysis_${Date.now()}`,
        type: RecommendationType.ANALYSIS_METHOD,
        title: "高级分析功能",
        description: "使用AI分析和高级图表，深入洞察数据",
        actionUrl: "/advanced-analysis",
        priority: 6,
        confidence: 0.6,
        reasoning: "高级分析提供更深入的数据洞察",
        metadata: { fallback: true, type: "feature_discovery" },
      },
    ];
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.userCache.clear();
  }

  /**
   * 获取推荐统计信息
   */
  getStats() {
    return {
      cacheSize: this.userCache.size,
      config: this.config,
    };
  }
}

// 导出单例实例
export const recommendationEngine = new RecommendationEngine();

// React Hook for easy integration
export const useRecommendationEngine = () => {
  return {
    generateRecommendations:
      recommendationEngine.generateRecommendations.bind(recommendationEngine),
    clearCache: recommendationEngine.clearCache.bind(recommendationEngine),
    getStats: recommendationEngine.getStats.bind(recommendationEngine),
  };
};

export default RecommendationEngine;
