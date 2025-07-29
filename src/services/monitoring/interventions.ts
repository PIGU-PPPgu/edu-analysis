/**
 * 干预措施服务 - 学生干预管理
 *
 * 功能：
 * - 干预策略制定
 * - 干预计划执行
 * - 干预效果跟踪
 * - 干预数据分析
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { interventionCache } from "../core/cache";
import { aiOrchestrator } from "../ai/orchestrator";
import type { APIResponse } from "../core/api";

export interface InterventionStrategy {
  id: string;
  name: string;
  description: string;
  category: "academic" | "behavioral" | "social" | "personal";
  target_group: "individual" | "small_group" | "class" | "grade";
  intervention_type: "immediate" | "short_term" | "long_term";
  methods: Array<{
    method_id: string;
    name: string;
    description: string;
    duration_weeks: number;
    frequency: string;
    resources_required: string[];
  }>;
  success_criteria: Array<{
    metric: string;
    target_value: number;
    measurement_method: string;
  }>;
  created_by: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface InterventionPlan {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  strategy_id: string;
  strategy_name: string;
  created_by: string;
  assigned_to: string;

  plan_details: {
    identified_issues: string[];
    intervention_goals: Array<{
      goal: string;
      target_date: string;
      success_criteria: string;
    }>;
    action_steps: Array<{
      step_id: string;
      description: string;
      responsible_party: string;
      due_date: string;
      status: "pending" | "in_progress" | "completed" | "overdue";
      completion_notes?: string;
    }>;
    resources_allocated: Array<{
      resource_type: string;
      description: string;
      quantity?: number;
      cost?: number;
    }>;
  };

  timeline: {
    start_date: string;
    expected_end_date: string;
    actual_end_date?: string;
    review_dates: string[];
  };

  status: "draft" | "active" | "paused" | "completed" | "cancelled";
  progress: {
    overall_progress: number; // 0-100
    milestones_achieved: number;
    total_milestones: number;
    last_review_date?: string;
    next_review_date?: string;
  };

  created_at: string;
  updated_at: string;
}

export interface InterventionRecord {
  id: string;
  plan_id: string;
  student_id: string;
  date: string;
  session_type: "individual" | "group" | "class" | "parent_meeting";
  duration_minutes: number;

  session_details: {
    activities_conducted: string[];
    materials_used: string[];
    student_participation: "excellent" | "good" | "fair" | "poor";
    student_response: string;
    challenges_observed: string[];
    breakthroughs: string[];
  };

  outcomes: {
    immediate_results: string[];
    behavioral_changes: string[];
    academic_improvements: string[];
    concerns_raised: string[];
  };

  next_steps: string[];
  conducted_by: string;
  notes: string;
  attachments?: Array<{
    filename: string;
    file_type: string;
    file_url: string;
  }>;

  created_at: string;
}

export interface InterventionEffectiveness {
  plan_id: string;
  student_id: string;
  evaluation_period: {
    start_date: string;
    end_date: string;
  };

  quantitative_metrics: {
    academic_performance: {
      baseline_scores: Record<string, number>;
      current_scores: Record<string, number>;
      improvement_percentage: Record<string, number>;
    };
    behavioral_indicators: {
      attendance_rate: { before: number; after: number };
      homework_completion: { before: number; after: number };
      participation_score: { before: number; after: number };
    };
    engagement_metrics: {
      session_attendance_rate: number;
      active_participation_rate: number;
      goal_achievement_rate: number;
    };
  };

  qualitative_assessment: {
    teacher_feedback: Array<{
      teacher_name: string;
      subject: string;
      observations: string;
      rating: 1 | 2 | 3 | 4 | 5;
    }>;
    parent_feedback: Array<{
      feedback_date: string;
      content: string;
      satisfaction_rating: 1 | 2 | 3 | 4 | 5;
    }>;
    student_self_assessment: {
      confidence_level: 1 | 2 | 3 | 4 | 5;
      motivation_level: 1 | 2 | 3 | 4 | 5;
      perceived_support: 1 | 2 | 3 | 4 | 5;
      comments: string;
    };
  };

  overall_effectiveness: {
    success_rating:
      | "highly_effective"
      | "effective"
      | "partially_effective"
      | "ineffective";
    key_success_factors: string[];
    areas_for_improvement: string[];
    recommendations: string[];
  };

  generated_at: string;
  generated_by: string;
}

export interface InterventionAnalytics {
  summary: {
    total_plans: number;
    active_plans: number;
    completed_plans: number;
    success_rate: number;
    average_duration_weeks: number;
  };

  effectiveness_by_category: Record<
    string,
    {
      total_interventions: number;
      success_rate: number;
      average_improvement: number;
    }
  >;

  trending_strategies: Array<{
    strategy_id: string;
    strategy_name: string;
    usage_count: number;
    success_rate: number;
    effectiveness_score: number;
  }>;

  resource_utilization: {
    most_used_resources: Array<{
      resource_type: string;
      usage_count: number;
      cost_effectiveness: number;
    }>;
    budget_analysis: {
      total_allocated: number;
      total_spent: number;
      cost_per_student: number;
      roi_estimate: number;
    };
  };

  timeline_analysis: {
    completion_rate_by_duration: Record<string, number>;
    optimal_duration_recommendations: Record<string, number>;
  };
}

/**
 * 干预措施服务类
 */
export class InterventionService {
  private readonly cachePrefix = "interventions_";
  private readonly cacheTTL = 30 * 60 * 1000; // 30分钟

  /**
   * 创建干预策略
   */
  async createInterventionStrategy(
    strategyData: Omit<InterventionStrategy, "id" | "created_at" | "updated_at">
  ): Promise<APIResponse<InterventionStrategy>> {
    try {
      logInfo("创建干预策略", { name: strategyData.name });

      // 验证策略数据
      const validation = this.validateStrategyData(strategyData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      const strategy: InterventionStrategy = {
        ...strategyData,
        id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await apiClient.insert<InterventionStrategy>(
        "intervention_strategies",
        strategy
      );

      if (response.success) {
        // 清除相关缓存
        interventionCache.delete(`${this.cachePrefix}strategies`);
        logInfo("干预策略创建成功", {
          strategyId: strategy.id,
          name: strategy.name,
        });
      }

      return response;
    } catch (error) {
      logError("创建干预策略失败", error);
      return {
        success: false,
        error: error.message || "创建干预策略失败",
      };
    }
  }

  /**
   * 获取干预策略列表
   */
  async getInterventionStrategies(
    filters: {
      category?: string[];
      target_group?: string[];
      intervention_type?: string[];
      is_template?: boolean;
    } = {}
  ): Promise<APIResponse<InterventionStrategy[]>> {
    try {
      logInfo("获取干预策略列表", { filters });

      const cacheKey = `${this.cachePrefix}strategies_${JSON.stringify(filters)}`;
      const cached = interventionCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const queryFilters: any = {};
      if (filters.category?.length) {
        queryFilters.category = { in: filters.category };
      }
      if (filters.target_group?.length) {
        queryFilters.target_group = { in: filters.target_group };
      }
      if (filters.intervention_type?.length) {
        queryFilters.intervention_type = { in: filters.intervention_type };
      }
      if (filters.is_template !== undefined) {
        queryFilters.is_template = filters.is_template;
      }

      const response = await apiClient.query<InterventionStrategy>(
        "intervention_strategies",
        {
          filters: queryFilters,
          orderBy: [{ column: "created_at", ascending: false }],
        }
      );

      if (response.success) {
        interventionCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取干预策略列表失败", { filters, error });
      return {
        success: false,
        error: error.message || "获取干预策略列表失败",
      };
    }
  }

  /**
   * 基于学生情况推荐干预策略
   */
  async recommendInterventionStrategies(
    studentId: string,
    issues: string[],
    constraints?: {
      max_duration_weeks?: number;
      available_resources?: string[];
      preferred_methods?: string[];
    }
  ): Promise<
    APIResponse<{
      recommendations: Array<{
        strategy: InterventionStrategy;
        match_score: number;
        rationale: string;
        customizations: string[];
      }>;
      ai_analysis: {
        student_profile_summary: string;
        key_intervention_areas: string[];
        success_predictors: string[];
        risk_factors: string[];
      };
    }>
  > {
    try {
      logInfo("推荐干预策略", { studentId, issues, constraints });

      // 获取学生详细信息
      const studentInfo = await this.getStudentInterventionProfile(studentId);
      if (!studentInfo.success) {
        return {
          success: false,
          error: "无法获取学生信息",
        };
      }

      // 获取所有可用策略
      const strategiesResponse = await this.getInterventionStrategies();
      if (!strategiesResponse.success || !strategiesResponse.data?.length) {
        return {
          success: false,
          error: "没有可用的干预策略",
        };
      }

      const strategies = strategiesResponse.data;

      // 使用AI分析学生情况并推荐策略
      const aiAnalysis = await this.performAIRecommendationAnalysis(
        studentInfo.data,
        issues,
        strategies,
        constraints
      );

      // 计算策略匹配度
      const recommendations = await Promise.all(
        strategies.map(async (strategy) => {
          const matchScore = this.calculateStrategyMatch(
            strategy,
            issues,
            constraints
          );
          const rationale = this.generateMatchRationale(
            strategy,
            issues,
            matchScore
          );
          const customizations = this.suggestCustomizations(
            strategy,
            studentInfo.data,
            issues
          );

          return {
            strategy,
            match_score: matchScore,
            rationale,
            customizations,
          };
        })
      );

      // 按匹配度排序，取前5个
      const topRecommendations = recommendations
        .filter((rec) => rec.match_score > 0.3) // 只返回匹配度>30%的策略
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 5);

      return {
        success: true,
        data: {
          recommendations: topRecommendations,
          ai_analysis: aiAnalysis,
        },
      };
    } catch (error) {
      logError("推荐干预策略失败", { studentId, issues, error });
      return {
        success: false,
        error: error.message || "推荐干预策略失败",
      };
    }
  }

  /**
   * 创建干预计划
   */
  async createInterventionPlan(planData: {
    student_id: string;
    strategy_id: string;
    created_by: string;
    assigned_to: string;
    identified_issues: string[];
    intervention_goals: Array<{
      goal: string;
      target_date: string;
      success_criteria: string;
    }>;
    start_date: string;
    expected_duration_weeks: number;
  }): Promise<APIResponse<InterventionPlan>> {
    try {
      logInfo("创建干预计划", {
        studentId: planData.student_id,
        strategyId: planData.strategy_id,
      });

      // 获取策略信息
      const strategyResponse = await apiClient.query<InterventionStrategy>(
        "intervention_strategies",
        {
          filters: { id: planData.strategy_id },
          limit: 1,
        }
      );

      if (!strategyResponse.success || !strategyResponse.data?.length) {
        return {
          success: false,
          error: "未找到指定的干预策略",
        };
      }

      const strategy = strategyResponse.data[0];

      // 获取学生信息
      const studentResponse = await apiClient.query("students", {
        filters: { student_id: planData.student_id },
        select: ["name", "class_name"],
        limit: 1,
      });

      const studentName =
        studentResponse.success && studentResponse.data?.length
          ? studentResponse.data[0].name
          : "未知学生";
      const className =
        studentResponse.success && studentResponse.data?.length
          ? studentResponse.data[0].class_name
          : "未知班级";

      // 生成行动步骤
      const actionSteps = this.generateActionSteps(
        strategy,
        planData.intervention_goals
      );

      // 计算预期结束日期
      const startDate = new Date(planData.start_date);
      const expectedEndDate = new Date(startDate);
      expectedEndDate.setDate(
        expectedEndDate.getDate() + planData.expected_duration_weeks * 7
      );

      // 生成复查日期
      const reviewDates = this.generateReviewDates(startDate, expectedEndDate);

      const plan: InterventionPlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        student_id: planData.student_id,
        student_name: studentName,
        class_name: className,
        strategy_id: planData.strategy_id,
        strategy_name: strategy.name,
        created_by: planData.created_by,
        assigned_to: planData.assigned_to,

        plan_details: {
          identified_issues: planData.identified_issues,
          intervention_goals: planData.intervention_goals,
          action_steps: actionSteps,
          resources_allocated: this.extractResourcesFromStrategy(strategy),
        },

        timeline: {
          start_date: planData.start_date,
          expected_end_date: expectedEndDate.toISOString().split("T")[0],
          review_dates: reviewDates,
        },

        status: "draft",
        progress: {
          overall_progress: 0,
          milestones_achieved: 0,
          total_milestones: actionSteps.length,
          next_review_date: reviewDates[0],
        },

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await apiClient.insert<InterventionPlan>(
        "intervention_plans",
        plan
      );

      if (response.success) {
        // 清除相关缓存
        this.clearInterventionCache(planData.student_id);
        logInfo("干预计划创建成功", { planId: plan.id });
      }

      return response;
    } catch (error) {
      logError("创建干预计划失败", error);
      return {
        success: false,
        error: error.message || "创建干预计划失败",
      };
    }
  }

  /**
   * 获取学生的干预计划
   */
  async getStudentInterventionPlans(
    studentId: string,
    filters: {
      status?: string[];
      date_range?: {
        start_date: string;
        end_date: string;
      };
    } = {}
  ): Promise<APIResponse<InterventionPlan[]>> {
    try {
      logInfo("获取学生干预计划", { studentId, filters });

      const queryFilters: any = { student_id: studentId };

      if (filters.status?.length) {
        queryFilters.status = { in: filters.status };
      }

      if (filters.date_range) {
        queryFilters.created_at = {
          gte: filters.date_range.start_date,
          lte: filters.date_range.end_date,
        };
      }

      const response = await apiClient.query<InterventionPlan>(
        "intervention_plans",
        {
          filters: queryFilters,
          orderBy: [{ column: "created_at", ascending: false }],
        }
      );

      return response;
    } catch (error) {
      logError("获取学生干预计划失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取学生干预计划失败",
      };
    }
  }

  /**
   * 记录干预会话
   */
  async recordInterventionSession(
    sessionData: Omit<InterventionRecord, "id" | "created_at">
  ): Promise<APIResponse<InterventionRecord>> {
    try {
      logInfo("记录干预会话", { planId: sessionData.plan_id });

      const record: InterventionRecord = {
        ...sessionData,
        id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
      };

      const response = await apiClient.insert<InterventionRecord>(
        "intervention_records",
        record
      );

      if (response.success) {
        // 更新计划进度
        await this.updatePlanProgress(sessionData.plan_id);

        // 清除相关缓存
        this.clearInterventionCache(sessionData.student_id);

        logInfo("干预会话记录成功", { recordId: record.id });
      }

      return response;
    } catch (error) {
      logError("记录干预会话失败", error);
      return {
        success: false,
        error: error.message || "记录干预会话失败",
      };
    }
  }

  /**
   * 评估干预效果
   */
  async evaluateInterventionEffectiveness(
    planId: string,
    evaluationPeriod: {
      start_date: string;
      end_date: string;
    }
  ): Promise<APIResponse<InterventionEffectiveness>> {
    try {
      logInfo("评估干预效果", { planId, evaluationPeriod });

      const cacheKey = `${this.cachePrefix}effectiveness_${planId}_${evaluationPeriod.start_date}_${evaluationPeriod.end_date}`;
      const cached = interventionCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取计划信息
      const planResponse = await apiClient.query<InterventionPlan>(
        "intervention_plans",
        {
          filters: { id: planId },
          limit: 1,
        }
      );

      if (!planResponse.success || !planResponse.data?.length) {
        return {
          success: false,
          error: "未找到指定的干预计划",
        };
      }

      const plan = planResponse.data[0];

      // 收集量化指标
      const quantitativeMetrics = await this.collectQuantitativeMetrics(
        plan.student_id,
        evaluationPeriod
      );

      // 收集定性评估
      const qualitativeAssessment = await this.collectQualitativeAssessment(
        plan.student_id,
        planId,
        evaluationPeriod
      );

      // 计算整体效果
      const overallEffectiveness = this.calculateOverallEffectiveness(
        quantitativeMetrics,
        qualitativeAssessment
      );

      const effectiveness: InterventionEffectiveness = {
        plan_id: planId,
        student_id: plan.student_id,
        evaluation_period: evaluationPeriod,
        quantitative_metrics: quantitativeMetrics,
        qualitative_assessment: qualitativeAssessment,
        overall_effectiveness: overallEffectiveness,
        generated_at: new Date().toISOString(),
        generated_by: "system",
      };

      interventionCache.set(cacheKey, effectiveness, this.cacheTTL);
      return { success: true, data: effectiveness };
    } catch (error) {
      logError("评估干预效果失败", { planId, error });
      return {
        success: false,
        error: error.message || "评估干预效果失败",
      };
    }
  }

  /**
   * 获取干预分析报告
   */
  async getInterventionAnalytics(scope: {
    time_range: {
      start_date: string;
      end_date: string;
    };
    filters?: {
      student_ids?: string[];
      class_names?: string[];
      strategy_categories?: string[];
    };
  }): Promise<APIResponse<InterventionAnalytics>> {
    try {
      logInfo("获取干预分析报告", { scope });

      const cacheKey = `${this.cachePrefix}analytics_${JSON.stringify(scope)}`;
      const cached = interventionCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 构建查询条件
      const queryFilters: any = {
        created_at: {
          gte: scope.time_range.start_date,
          lte: scope.time_range.end_date,
        },
      };

      if (scope.filters?.student_ids?.length) {
        queryFilters.student_id = { in: scope.filters.student_ids };
      }
      if (scope.filters?.class_names?.length) {
        queryFilters.class_name = { in: scope.filters.class_names };
      }

      // 获取干预计划数据
      const plansResponse = await apiClient.query<InterventionPlan>(
        "intervention_plans",
        {
          filters: queryFilters,
        }
      );

      if (!plansResponse.success) {
        return plansResponse;
      }

      const plans = plansResponse.data || [];

      // 计算分析数据
      const analytics = await this.calculateInterventionAnalytics(plans, scope);

      interventionCache.set(cacheKey, analytics, this.cacheTTL);
      return { success: true, data: analytics };
    } catch (error) {
      logError("获取干预分析报告失败", { scope, error });
      return {
        success: false,
        error: error.message || "获取干预分析报告失败",
      };
    }
  }

  /**
   * 验证策略数据
   */
  private validateStrategyData(
    strategyData: Omit<InterventionStrategy, "id" | "created_at" | "updated_at">
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!strategyData.name?.trim()) {
      errors.push("策略名称不能为空");
    }

    if (!strategyData.description?.trim()) {
      errors.push("策略描述不能为空");
    }

    if (
      !["academic", "behavioral", "social", "personal"].includes(
        strategyData.category
      )
    ) {
      errors.push("策略类别必须是 academic、behavioral、social 或 personal");
    }

    if (
      !["individual", "small_group", "class", "grade"].includes(
        strategyData.target_group
      )
    ) {
      errors.push("目标群体必须是 individual、small_group、class 或 grade");
    }

    if (
      !["immediate", "short_term", "long_term"].includes(
        strategyData.intervention_type
      )
    ) {
      errors.push("干预类型必须是 immediate、short_term 或 long_term");
    }

    if (!strategyData.methods || strategyData.methods.length === 0) {
      errors.push("策略必须包含至少一个方法");
    }

    if (
      !strategyData.success_criteria ||
      strategyData.success_criteria.length === 0
    ) {
      errors.push("策略必须包含至少一个成功标准");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取学生干预档案
   */
  private async getStudentInterventionProfile(
    studentId: string
  ): Promise<APIResponse<any>> {
    try {
      // 获取学生基本信息
      const studentResponse = await apiClient.query("students", {
        filters: { student_id: studentId },
        limit: 1,
      });

      // 获取学生成绩数据
      const gradesResponse = await apiClient.query("grade_data", {
        filters: { student_id: studentId },
        orderBy: [{ column: "exam_date", ascending: false }],
        limit: 10,
      });

      // 获取学生作业数据
      const homeworkResponse = await apiClient.query("homework_submissions", {
        filters: { student_id: studentId },
        orderBy: [{ column: "submitted_at", ascending: false }],
        limit: 20,
      });

      // 获取学生预警记录
      const warningsResponse = await apiClient.query("warning_records", {
        filters: { student_id: studentId },
        orderBy: [{ column: "created_at", ascending: false }],
        limit: 10,
      });

      return {
        success: true,
        data: {
          student_info: studentResponse.data?.[0] || null,
          recent_grades: gradesResponse.data || [],
          recent_homework: homeworkResponse.data || [],
          recent_warnings: warningsResponse.data || [],
        },
      };
    } catch (error) {
      logError("获取学生干预档案失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取学生干预档案失败",
      };
    }
  }

  /**
   * 执行AI推荐分析
   */
  private async performAIRecommendationAnalysis(
    studentProfile: any,
    issues: string[],
    strategies: InterventionStrategy[],
    constraints?: any
  ): Promise<any> {
    try {
      const analysisPrompt = {
        task: "analyze_student_intervention_needs",
        data: {
          student_profile: studentProfile,
          identified_issues: issues,
          available_strategies: strategies.map((s) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            methods: s.methods.map((m) => m.name),
          })),
          constraints: constraints || {},
        },
        requirements: [
          "Provide student profile summary",
          "Identify key intervention areas",
          "List success predictors",
          "Identify risk factors",
        ],
      };

      const aiResponse = await aiOrchestrator.process({
        type: "analysis",
        data: analysisPrompt,
        options: {
          model_preference: "analytical",
          response_format: "structured",
        },
      });

      if (aiResponse.success) {
        return (
          aiResponse.data.analysis || {
            student_profile_summary: "需要进一步分析学生情况",
            key_intervention_areas: issues,
            success_predictors: ["学生配合度", "家庭支持", "教师参与"],
            risk_factors: ["缺乏动机", "学习困难", "环境因素"],
          }
        );
      }

      // AI分析失败时的默认返回
      return {
        student_profile_summary: "需要进一步分析学生情况",
        key_intervention_areas: issues,
        success_predictors: ["学生配合度", "家庭支持", "教师参与"],
        risk_factors: ["缺乏动机", "学习困难", "环境因素"],
      };
    } catch (error) {
      logError("AI推荐分析失败", error);
      return {
        student_profile_summary: "分析过程中出现错误",
        key_intervention_areas: issues,
        success_predictors: [],
        risk_factors: [],
      };
    }
  }

  /**
   * 计算策略匹配度
   */
  private calculateStrategyMatch(
    strategy: InterventionStrategy,
    issues: string[],
    constraints?: any
  ): number {
    let score = 0;

    // 基于问题类型的匹配
    const issueKeywords = issues.join(" ").toLowerCase();
    const strategyKeywords = (
      strategy.name +
      " " +
      strategy.description
    ).toLowerCase();

    if (issueKeywords.includes("成绩") || issueKeywords.includes("学习")) {
      if (strategy.category === "academic") score += 0.4;
    }
    if (issueKeywords.includes("行为") || issueKeywords.includes("纪律")) {
      if (strategy.category === "behavioral") score += 0.4;
    }
    if (issueKeywords.includes("社交") || issueKeywords.includes("人际")) {
      if (strategy.category === "social") score += 0.4;
    }

    // 基于约束条件的匹配
    if (constraints?.max_duration_weeks) {
      const avgDuration =
        strategy.methods.reduce(
          (sum, method) => sum + method.duration_weeks,
          0
        ) / strategy.methods.length;
      if (avgDuration <= constraints.max_duration_weeks) {
        score += 0.3;
      } else {
        score -= 0.2;
      }
    }

    // 基于资源可用性的匹配
    if (constraints?.available_resources) {
      const requiredResources = strategy.methods.flatMap(
        (method) => method.resources_required
      );
      const matchingResources = requiredResources.filter((resource) =>
        constraints.available_resources.includes(resource)
      );
      score += (matchingResources.length / requiredResources.length) * 0.3;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * 生成匹配理由
   */
  private generateMatchRationale(
    strategy: InterventionStrategy,
    issues: string[],
    matchScore: number
  ): string {
    const reasons: string[] = [];

    if (matchScore > 0.7) {
      reasons.push("该策略与学生问题高度匹配");
    } else if (matchScore > 0.5) {
      reasons.push("该策略与学生问题较好匹配");
    } else {
      reasons.push("该策略与学生问题部分匹配");
    }

    reasons.push(`策略类别(${strategy.category})适合当前干预需求`);
    reasons.push(`适用于${strategy.target_group}类型的干预`);

    return reasons.join("；");
  }

  /**
   * 建议自定义设置
   */
  private suggestCustomizations(
    strategy: InterventionStrategy,
    studentProfile: any,
    issues: string[]
  ): string[] {
    const customizations: string[] = [];

    // 基于学生特点的自定义建议
    if (studentProfile.recent_grades?.length) {
      const avgScore =
        studentProfile.recent_grades.reduce(
          (sum: number, grade: any) => sum + (grade.total_score || 0),
          0
        ) / studentProfile.recent_grades.length;
      if (avgScore < 60) {
        customizations.push("增加基础知识巩固环节");
      }
    }

    if (studentProfile.recent_homework?.length) {
      const completionRate =
        studentProfile.recent_homework.filter(
          (hw: any) => hw.status !== "missing"
        ).length / studentProfile.recent_homework.length;
      if (completionRate < 0.8) {
        customizations.push("重点关注作业完成习惯的培养");
      }
    }

    // 基于问题类型的自定义建议
    if (issues.some((issue) => issue.includes("注意力"))) {
      customizations.push("采用短时间、高频次的干预方式");
    }

    if (issues.some((issue) => issue.includes("自信"))) {
      customizations.push("增加正面激励和成功经验分享");
    }

    return customizations;
  }

  /**
   * 生成行动步骤
   */
  private generateActionSteps(
    strategy: InterventionStrategy,
    goals: Array<{
      goal: string;
      target_date: string;
      success_criteria: string;
    }>
  ): InterventionPlan["plan_details"]["action_steps"] {
    const actionSteps: InterventionPlan["plan_details"]["action_steps"] = [];

    strategy.methods.forEach((method, methodIndex) => {
      goals.forEach((goal, goalIndex) => {
        actionSteps.push({
          step_id: `step_${methodIndex}_${goalIndex}_${Date.now()}`,
          description: `使用${method.name}方法实现目标：${goal.goal}`,
          responsible_party: "待分配",
          due_date: goal.target_date,
          status: "pending",
        });
      });
    });

    return actionSteps;
  }

  /**
   * 从策略中提取资源
   */
  private extractResourcesFromStrategy(
    strategy: InterventionStrategy
  ): InterventionPlan["plan_details"]["resources_allocated"] {
    const resources: InterventionPlan["plan_details"]["resources_allocated"] =
      [];
    const uniqueResources = new Set<string>();

    strategy.methods.forEach((method) => {
      method.resources_required.forEach((resource) => {
        if (!uniqueResources.has(resource)) {
          uniqueResources.add(resource);
          resources.push({
            resource_type: "material",
            description: resource,
            quantity: 1,
          });
        }
      });
    });

    return resources;
  }

  /**
   * 生成复查日期
   */
  private generateReviewDates(startDate: Date, endDate: Date): string[] {
    const reviewDates: string[] = [];
    const current = new Date(startDate);

    // 每两周安排一次复查
    while (current <= endDate) {
      current.setDate(current.getDate() + 14);
      if (current <= endDate) {
        reviewDates.push(current.toISOString().split("T")[0]);
      }
    }

    return reviewDates;
  }

  /**
   * 更新计划进度
   */
  private async updatePlanProgress(planId: string): Promise<void> {
    try {
      // 获取计划信息
      const planResponse = await apiClient.query<InterventionPlan>(
        "intervention_plans",
        {
          filters: { id: planId },
          limit: 1,
        }
      );

      if (!planResponse.success || !planResponse.data?.length) {
        return;
      }

      const plan = planResponse.data[0];

      // 获取会话记录数
      const recordsResponse = await apiClient.query("intervention_records", {
        filters: { plan_id: planId },
        select: ["id"],
      });

      const sessionCount = recordsResponse.success
        ? recordsResponse.data?.length || 0
        : 0;

      // 计算进度（基于会话数量和目标里程碑）
      const totalMilestones = plan.progress.total_milestones;
      const progress = Math.min(
        100,
        Math.round((sessionCount / Math.max(1, totalMilestones)) * 100)
      );

      // 更新进度
      await apiClient.update("intervention_plans", planId, {
        "progress.overall_progress": progress,
        "progress.last_review_date": new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      logError("更新计划进度失败", { planId, error });
    }
  }

  /**
   * 收集量化指标
   */
  private async collectQuantitativeMetrics(
    studentId: string,
    evaluationPeriod: { start_date: string; end_date: string }
  ): Promise<InterventionEffectiveness["quantitative_metrics"]> {
    // 获取基线数据（评估期开始前30天）
    const baselineStart = new Date(evaluationPeriod.start_date);
    baselineStart.setDate(baselineStart.getDate() - 30);
    const baselineEnd = new Date(evaluationPeriod.start_date);

    // 获取当前数据（评估期内）
    const currentStart = new Date(evaluationPeriod.start_date);
    const currentEnd = new Date(evaluationPeriod.end_date);

    // 获取基线成绩
    const baselineGrades = await this.getStudentGradesInPeriod(
      studentId,
      baselineStart,
      baselineEnd
    );
    const currentGrades = await this.getStudentGradesInPeriod(
      studentId,
      currentStart,
      currentEnd
    );

    // 计算学术表现变化
    const academicPerformance = this.calculateAcademicPerformanceChange(
      baselineGrades,
      currentGrades
    );

    // 计算行为指标变化
    const behavioralIndicators = await this.calculateBehavioralIndicatorChanges(
      studentId,
      { start: baselineStart, end: baselineEnd },
      { start: currentStart, end: currentEnd }
    );

    // 计算参与度指标
    const engagementMetrics = await this.calculateEngagementMetrics(
      studentId,
      evaluationPeriod
    );

    return {
      academic_performance: academicPerformance,
      behavioral_indicators: behavioralIndicators,
      engagement_metrics: engagementMetrics,
    };
  }

  /**
   * 收集定性评估
   */
  private async collectQualitativeAssessment(
    studentId: string,
    planId: string,
    evaluationPeriod: { start_date: string; end_date: string }
  ): Promise<InterventionEffectiveness["qualitative_assessment"]> {
    // 这里应该实际收集教师、家长和学生的反馈
    // 暂时返回模拟数据
    return {
      teacher_feedback: [
        {
          teacher_name: "张老师",
          subject: "数学",
          observations: "学生在课堂参与度有明显提升",
          rating: 4,
        },
      ],
      parent_feedback: [
        {
          feedback_date: new Date().toISOString().split("T")[0],
          content: "孩子在家学习更主动了",
          satisfaction_rating: 4,
        },
      ],
      student_self_assessment: {
        confidence_level: 4,
        motivation_level: 3,
        perceived_support: 5,
        comments: "感觉学习有了方向",
      },
    };
  }

  /**
   * 计算整体效果
   */
  private calculateOverallEffectiveness(
    quantitativeMetrics: InterventionEffectiveness["quantitative_metrics"],
    qualitativeAssessment: InterventionEffectiveness["qualitative_assessment"]
  ): InterventionEffectiveness["overall_effectiveness"] {
    // 简化的效果评估逻辑
    const academicImprovement = Object.values(
      quantitativeMetrics.academic_performance.improvement_percentage
    );
    const avgImprovement =
      academicImprovement.length > 0
        ? academicImprovement.reduce((sum, val) => sum + val, 0) /
          academicImprovement.length
        : 0;

    const behavioralImprovement =
      quantitativeMetrics.behavioral_indicators.homework_completion.after -
      quantitativeMetrics.behavioral_indicators.homework_completion.before;

    const qualitativeScore =
      (qualitativeAssessment.teacher_feedback.reduce(
        (sum, feedback) => sum + feedback.rating,
        0
      ) /
        Math.max(1, qualitativeAssessment.teacher_feedback.length)) *
      20; // 转换为百分制

    const overallScore =
      avgImprovement * 0.4 +
      behavioralImprovement * 0.3 +
      qualitativeScore * 0.3;

    let successRating: InterventionEffectiveness["overall_effectiveness"]["success_rating"];
    if (overallScore >= 80) successRating = "highly_effective";
    else if (overallScore >= 60) successRating = "effective";
    else if (overallScore >= 40) successRating = "partially_effective";
    else successRating = "ineffective";

    return {
      success_rating: successRating,
      key_success_factors: ["学生配合度高", "教师支持到位", "家长积极参与"],
      areas_for_improvement: ["需要更多练习时间", "可以增加多样化的学习方式"],
      recommendations: ["继续当前干预策略", "适当调整难度和节奏"],
    };
  }

  /**
   * 获取学生在指定期间的成绩
   */
  private async getStudentGradesInPeriod(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const response = await apiClient.query("grade_data", {
      filters: {
        student_id: studentId,
        exam_date: {
          gte: startDate.toISOString().split("T")[0],
          lte: endDate.toISOString().split("T")[0],
        },
      },
      select: ["total_score", "chinese_score", "math_score", "english_score"],
    });

    return response.success ? response.data || [] : [];
  }

  /**
   * 计算学术表现变化
   */
  private calculateAcademicPerformanceChange(
    baselineGrades: any[],
    currentGrades: any[]
  ): any {
    const subjects = ["总分", "语文", "数学", "英语"];
    const fields = [
      "total_score",
      "chinese_score",
      "math_score",
      "english_score",
    ];

    const baseline_scores: Record<string, number> = {};
    const current_scores: Record<string, number> = {};
    const improvement_percentage: Record<string, number> = {};

    subjects.forEach((subject, index) => {
      const field = fields[index];

      // 计算基线平均分
      const baselineScores = baselineGrades
        .map((grade) => grade[field])
        .filter((score) => typeof score === "number" && score > 0);
      baseline_scores[subject] =
        baselineScores.length > 0
          ? baselineScores.reduce((sum, score) => sum + score, 0) /
            baselineScores.length
          : 0;

      // 计算当前平均分
      const currentScores = currentGrades
        .map((grade) => grade[field])
        .filter((score) => typeof score === "number" && score > 0);
      current_scores[subject] =
        currentScores.length > 0
          ? currentScores.reduce((sum, score) => sum + score, 0) /
            currentScores.length
          : 0;

      // 计算改进百分比
      improvement_percentage[subject] =
        baseline_scores[subject] > 0
          ? ((current_scores[subject] - baseline_scores[subject]) /
              baseline_scores[subject]) *
            100
          : 0;
    });

    return {
      baseline_scores,
      current_scores,
      improvement_percentage,
    };
  }

  /**
   * 计算行为指标变化
   */
  private async calculateBehavioralIndicatorChanges(
    studentId: string,
    baselinePeriod: { start: Date; end: Date },
    currentPeriod: { start: Date; end: Date }
  ): Promise<any> {
    // 简化实现，返回模拟数据
    return {
      attendance_rate: { before: 85, after: 92 },
      homework_completion: { before: 70, after: 85 },
      participation_score: { before: 3.2, after: 4.1 },
    };
  }

  /**
   * 计算参与度指标
   */
  private async calculateEngagementMetrics(
    studentId: string,
    evaluationPeriod: { start_date: string; end_date: string }
  ): Promise<any> {
    // 简化实现，返回模拟数据
    return {
      session_attendance_rate: 95,
      active_participation_rate: 88,
      goal_achievement_rate: 75,
    };
  }

  /**
   * 计算干预分析数据
   */
  private async calculateInterventionAnalytics(
    plans: InterventionPlan[],
    scope: any
  ): Promise<InterventionAnalytics> {
    const totalPlans = plans.length;
    const activePlans = plans.filter((p) => p.status === "active").length;
    const completedPlans = plans.filter((p) => p.status === "completed").length;
    const successRate =
      completedPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;

    // 计算平均持续时间
    const completedPlansWithDuration = plans.filter(
      (p) => p.status === "completed" && p.timeline.actual_end_date
    );
    const averageDurationWeeks =
      completedPlansWithDuration.length > 0
        ? completedPlansWithDuration.reduce((sum, plan) => {
            const start = new Date(plan.timeline.start_date);
            const end = new Date(plan.timeline.actual_end_date!);
            const durationWeeks = Math.ceil(
              (end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)
            );
            return sum + durationWeeks;
          }, 0) / completedPlansWithDuration.length
        : 0;

    // 简化的其他分析数据
    const effectivenessByCategory: Record<string, any> = {
      academic: {
        total_interventions: 0,
        success_rate: 0,
        average_improvement: 0,
      },
      behavioral: {
        total_interventions: 0,
        success_rate: 0,
        average_improvement: 0,
      },
      social: {
        total_interventions: 0,
        success_rate: 0,
        average_improvement: 0,
      },
      personal: {
        total_interventions: 0,
        success_rate: 0,
        average_improvement: 0,
      },
    };

    return {
      summary: {
        total_plans: totalPlans,
        active_plans: activePlans,
        completed_plans: completedPlans,
        success_rate: Math.round(successRate * 100) / 100,
        average_duration_weeks: Math.round(averageDurationWeeks * 100) / 100,
      },
      effectiveness_by_category: effectivenessByCategory,
      trending_strategies: [],
      resource_utilization: {
        most_used_resources: [],
        budget_analysis: {
          total_allocated: 0,
          total_spent: 0,
          cost_per_student: 0,
          roi_estimate: 0,
        },
      },
      timeline_analysis: {
        completion_rate_by_duration: {},
        optimal_duration_recommendations: {},
      },
    };
  }

  /**
   * 清除干预相关缓存
   */
  private clearInterventionCache(studentId?: string): void {
    if (studentId) {
      interventionCache.delete(`${this.cachePrefix}profile_${studentId}`);
    }

    // 清除其他相关缓存
    interventionCache.delete(`${this.cachePrefix}strategies`);
    interventionCache.delete(`${this.cachePrefix}analytics`);

    logInfo("干预缓存已清除", { studentId });
  }
}

// 导出服务实例
export const interventionService = new InterventionService();
