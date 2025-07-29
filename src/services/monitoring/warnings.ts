/**
 * 预警系统服务 - 学生预警监控
 *
 * 功能：
 * - 预警规则管理
 * - 实时预警检测
 * - 预警记录管理
 * - 预警统计分析
 */

import { logError, logInfo } from "@/utils/logger";
import { apiClient } from "../core/api";
import { alertCache } from "../core/cache";
import type { APIResponse } from "../core/api";

export interface WarningRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    metric: string;
    operator: "lt" | "lte" | "gt" | "gte" | "eq" | "neq";
    value: number;
    timeframe?: number; // 时间窗口（天）
  }[];
  severity: "low" | "medium" | "high" | "critical";
  is_active: boolean;
  is_system: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface WarningRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  rule_id: string;
  rule_name: string;
  severity: "low" | "medium" | "high" | "critical";
  trigger_data: {
    metric: string;
    value: number;
    threshold: number;
    description: string;
  };
  status: "active" | "acknowledged" | "resolved" | "dismissed";
  created_at: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface WarningStatistics {
  summary: {
    total_warnings: number;
    active_warnings: number;
    resolved_warnings: number;
    critical_warnings: number;
  };
  by_severity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  by_status: {
    active: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
  };
  trend_data: Array<{
    date: string;
    count: number;
    severity_breakdown: Record<string, number>;
  }>;
  top_rules: Array<{
    rule_id: string;
    rule_name: string;
    trigger_count: number;
  }>;
}

export interface StudentWarningProfile {
  student_id: string;
  student_name: string;
  warning_history: {
    total_warnings: number;
    recent_warnings: number;
    severity_distribution: Record<string, number>;
    resolution_rate: number;
  };
  current_warnings: WarningRecord[];
  risk_factors: Array<{
    factor: string;
    score: number;
    description: string;
  }>;
  recommended_actions: Array<{
    action: string;
    priority: "high" | "medium" | "low";
    expected_impact: string;
  }>;
}

/**
 * 预警系统服务类
 */
export class WarningService {
  private readonly cachePrefix = "warnings_";
  private readonly cacheTTL = 10 * 60 * 1000; // 10分钟

  /**
   * 创建预警规则
   */
  async createWarningRule(
    ruleData: Omit<WarningRule, "id" | "created_at" | "updated_at">
  ): Promise<APIResponse<WarningRule>> {
    try {
      logInfo("创建预警规则", { name: ruleData.name });

      // 验证规则数据
      const validation = this.validateRuleData(ruleData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      const rule: WarningRule = {
        ...ruleData,
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const response = await apiClient.insert<WarningRule>(
        "warning_rules",
        rule
      );

      if (response.success) {
        // 清除相关缓存
        alertCache.delete(`${this.cachePrefix}rules`);
        logInfo("预警规则创建成功", { ruleId: rule.id, name: rule.name });
      }

      return response;
    } catch (error) {
      logError("创建预警规则失败", error);
      return {
        success: false,
        error: error.message || "创建预警规则失败",
      };
    }
  }

  /**
   * 获取所有预警规则
   */
  async getWarningRules(
    filters: {
      is_active?: boolean;
      severity?: string[];
      created_by?: string;
    } = {}
  ): Promise<APIResponse<WarningRule[]>> {
    try {
      logInfo("获取预警规则", { filters });

      const cacheKey = `${this.cachePrefix}rules_${JSON.stringify(filters)}`;
      const cached = alertCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      const queryFilters: any = {};
      if (filters.is_active !== undefined) {
        queryFilters.is_active = filters.is_active;
      }
      if (filters.severity?.length) {
        queryFilters.severity = { in: filters.severity };
      }
      if (filters.created_by) {
        queryFilters.created_by = filters.created_by;
      }

      const response = await apiClient.query<WarningRule>("warning_rules", {
        filters: queryFilters,
        orderBy: [{ column: "created_at", ascending: false }],
      });

      if (response.success) {
        alertCache.set(cacheKey, response.data, this.cacheTTL);
      }

      return response;
    } catch (error) {
      logError("获取预警规则失败", { filters, error });
      return {
        success: false,
        error: error.message || "获取预警规则失败",
      };
    }
  }

  /**
   * 执行预警检测
   */
  async executeWarningDetection(
    targetScope: {
      type: "student" | "class" | "all";
      ids?: string[];
    } = { type: "all" }
  ): Promise<
    APIResponse<{
      processed_count: number;
      new_warnings: number;
      updated_warnings: number;
      errors: string[];
    }>
  > {
    try {
      logInfo("执行预警检测", { targetScope });

      // 获取活跃的预警规则
      const rulesResponse = await this.getWarningRules({ is_active: true });
      if (!rulesResponse.success || !rulesResponse.data?.length) {
        return {
          success: false,
          error: "没有找到活跃的预警规则",
        };
      }

      const rules = rulesResponse.data;
      let processedCount = 0;
      let newWarnings = 0;
      let updatedWarnings = 0;
      const errors: string[] = [];

      // 获取目标学生列表
      const targetStudents = await this.getTargetStudents(targetScope);

      // 为每个学生执行预警检测
      for (const student of targetStudents) {
        try {
          const studentWarnings = await this.detectStudentWarnings(
            student,
            rules
          );
          processedCount++;
          newWarnings += studentWarnings.newCount;
          updatedWarnings += studentWarnings.updatedCount;
        } catch (error) {
          errors.push(
            `学生 ${student.student_id} 预警检测失败: ${error.message}`
          );
        }
      }

      const result = {
        processed_count: processedCount,
        new_warnings: newWarnings,
        updated_warnings: updatedWarnings,
        errors,
      };

      logInfo("预警检测完成", result);
      return { success: true, data: result };
    } catch (error) {
      logError("预警检测失败", { targetScope, error });
      return {
        success: false,
        error: error.message || "预警检测失败",
      };
    }
  }

  /**
   * 获取预警记录
   */
  async getWarningRecords(
    filters: {
      student_id?: string;
      class_name?: string;
      severity?: string[];
      status?: string[];
      startDate?: string;
      endDate?: string;
    } = {},
    pagination: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<
    APIResponse<{
      records: WarningRecord[];
      total: number;
      page: number;
      limit: number;
    }>
  > {
    try {
      logInfo("获取预警记录", { filters, pagination });

      const queryFilters: any = {};

      if (filters.student_id) {
        queryFilters.student_id = filters.student_id;
      }
      if (filters.class_name) {
        queryFilters.class_name = filters.class_name;
      }
      if (filters.severity?.length) {
        queryFilters.severity = { in: filters.severity };
      }
      if (filters.status?.length) {
        queryFilters.status = { in: filters.status };
      }
      if (filters.startDate) {
        queryFilters.created_at = { gte: filters.startDate };
      }
      if (filters.endDate) {
        queryFilters.created_at = {
          ...queryFilters.created_at,
          lte: filters.endDate,
        };
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;

      const response = await apiClient.query<WarningRecord>("warning_records", {
        filters: queryFilters,
        orderBy: [{ column: "created_at", ascending: false }],
        limit,
        offset,
      });

      if (!response.success) {
        return response;
      }

      // 获取总数
      const countResponse = await apiClient.query("warning_records", {
        filters: queryFilters,
        select: ["id"],
      });

      const total = countResponse.success ? countResponse.data?.length || 0 : 0;

      return {
        success: true,
        data: {
          records: response.data || [],
          total,
          page,
          limit,
        },
      };
    } catch (error) {
      logError("获取预警记录失败", { filters, error });
      return {
        success: false,
        error: error.message || "获取预警记录失败",
      };
    }
  }

  /**
   * 确认预警
   */
  async acknowledgeWarning(
    warningId: string,
    acknowledgedBy: string,
    notes?: string
  ): Promise<APIResponse<WarningRecord>> {
    try {
      logInfo("确认预警", { warningId, acknowledgedBy });

      const response = await apiClient.update<WarningRecord>(
        "warning_records",
        warningId,
        {
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: acknowledgedBy,
          resolution_notes: notes,
          updated_at: new Date().toISOString(),
        }
      );

      if (response.success) {
        // 清除相关缓存
        this.clearWarningCache();
        logInfo("预警确认成功", { warningId });
      }

      return response;
    } catch (error) {
      logError("确认预警失败", { warningId, error });
      return {
        success: false,
        error: error.message || "确认预警失败",
      };
    }
  }

  /**
   * 解决预警
   */
  async resolveWarning(
    warningId: string,
    resolvedBy: string,
    resolutionNotes: string
  ): Promise<APIResponse<WarningRecord>> {
    try {
      logInfo("解决预警", { warningId, resolvedBy });

      const response = await apiClient.update<WarningRecord>(
        "warning_records",
        warningId,
        {
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy,
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString(),
        }
      );

      if (response.success) {
        // 清除相关缓存
        this.clearWarningCache();
        logInfo("预警解决成功", { warningId });
      }

      return response;
    } catch (error) {
      logError("解决预警失败", { warningId, error });
      return {
        success: false,
        error: error.message || "解决预警失败",
      };
    }
  }

  /**
   * 获取预警统计
   */
  async getWarningStatistics(
    timeRange: {
      startDate: string;
      endDate: string;
    },
    scope?: {
      class_names?: string[];
      student_ids?: string[];
    }
  ): Promise<APIResponse<WarningStatistics>> {
    try {
      logInfo("获取预警统计", { timeRange, scope });

      const cacheKey = `${this.cachePrefix}stats_${JSON.stringify(timeRange)}_${JSON.stringify(scope)}`;
      const cached = alertCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 构建查询条件
      const baseFilters: any = {
        created_at: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      };

      if (scope?.class_names?.length) {
        baseFilters.class_name = { in: scope.class_names };
      }
      if (scope?.student_ids?.length) {
        baseFilters.student_id = { in: scope.student_ids };
      }

      // 获取所有预警记录
      const recordsResponse = await apiClient.query<WarningRecord>(
        "warning_records",
        {
          filters: baseFilters,
          select: ["severity", "status", "created_at", "rule_id", "rule_name"],
        }
      );

      if (!recordsResponse.success) {
        return recordsResponse;
      }

      const records = recordsResponse.data || [];

      // 计算统计数据
      const statistics = this.calculateWarningStatistics(records, timeRange);

      alertCache.set(cacheKey, statistics, this.cacheTTL);
      return { success: true, data: statistics };
    } catch (error) {
      logError("获取预警统计失败", { timeRange, error });
      return {
        success: false,
        error: error.message || "获取预警统计失败",
      };
    }
  }

  /**
   * 获取学生预警画像
   */
  async getStudentWarningProfile(
    studentId: string
  ): Promise<APIResponse<StudentWarningProfile>> {
    try {
      logInfo("获取学生预警画像", { studentId });

      const cacheKey = `${this.cachePrefix}profile_${studentId}`;
      const cached = alertCache.get(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 获取学生信息
      const studentResponse = await apiClient.query("students", {
        filters: { student_id: studentId },
        select: ["name"],
        limit: 1,
      });

      const studentName =
        studentResponse.success && studentResponse.data?.length
          ? studentResponse.data[0].name
          : "未知学生";

      // 获取学生所有预警记录
      const warningsResponse = await this.getWarningRecords({
        student_id: studentId,
      });

      if (!warningsResponse.success) {
        return warningsResponse;
      }

      const allWarnings = warningsResponse.data.records;
      const currentWarnings = allWarnings.filter((w) => w.status === "active");

      // 计算预警历史
      const warningHistory = this.calculateWarningHistory(allWarnings);

      // 分析风险因素
      const riskFactors = await this.analyzeRiskFactors(studentId, allWarnings);

      // 生成建议行动
      const recommendedActions = this.generateRecommendedActions(
        allWarnings,
        riskFactors
      );

      const profile: StudentWarningProfile = {
        student_id: studentId,
        student_name: studentName,
        warning_history: warningHistory,
        current_warnings: currentWarnings,
        risk_factors: riskFactors,
        recommended_actions: recommendedActions,
      };

      alertCache.set(cacheKey, profile, this.cacheTTL);
      return { success: true, data: profile };
    } catch (error) {
      logError("获取学生预警画像失败", { studentId, error });
      return {
        success: false,
        error: error.message || "获取学生预警画像失败",
      };
    }
  }

  /**
   * 批量处理预警
   */
  async batchProcessWarnings(
    warningIds: string[],
    action: "acknowledge" | "resolve" | "dismiss",
    processedBy: string,
    notes?: string
  ): Promise<
    APIResponse<{
      successful: number;
      failed: number;
      errors: string[];
    }>
  > {
    try {
      logInfo("批量处理预警", { warningIds, action, processedBy });

      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const warningId of warningIds) {
        try {
          let result: APIResponse<WarningRecord>;

          switch (action) {
            case "acknowledge":
              result = await this.acknowledgeWarning(
                warningId,
                processedBy,
                notes
              );
              break;
            case "resolve":
              result = await this.resolveWarning(
                warningId,
                processedBy,
                notes || "批量解决"
              );
              break;
            case "dismiss":
              result = await apiClient.update<WarningRecord>(
                "warning_records",
                warningId,
                {
                  status: "dismissed",
                  resolved_at: new Date().toISOString(),
                  resolved_by: processedBy,
                  resolution_notes: notes || "批量忽略",
                  updated_at: new Date().toISOString(),
                }
              );
              break;
            default:
              throw new Error(`不支持的操作: ${action}`);
          }

          if (result.success) {
            successful++;
          } else {
            failed++;
            errors.push(`预警 ${warningId}: ${result.error}`);
          }
        } catch (error) {
          failed++;
          errors.push(`预警 ${warningId}: ${error.message}`);
        }
      }

      const result = { successful, failed, errors };
      logInfo("批量处理预警完成", result);

      return { success: true, data: result };
    } catch (error) {
      logError("批量处理预警失败", { warningIds, action, error });
      return {
        success: false,
        error: error.message || "批量处理预警失败",
      };
    }
  }

  /**
   * 验证预警规则数据
   */
  private validateRuleData(
    ruleData: Omit<WarningRule, "id" | "created_at" | "updated_at">
  ): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!ruleData.name?.trim()) {
      errors.push("规则名称不能为空");
    }

    if (!ruleData.conditions || ruleData.conditions.length === 0) {
      errors.push("规则必须包含至少一个条件");
    }

    if (ruleData.conditions) {
      ruleData.conditions.forEach((condition, index) => {
        if (!condition.metric) {
          errors.push(`条件 ${index + 1}: 指标名称不能为空`);
        }
        if (!condition.operator) {
          errors.push(`条件 ${index + 1}: 操作符不能为空`);
        }
        if (typeof condition.value !== "number") {
          errors.push(`条件 ${index + 1}: 阈值必须是数字`);
        }
      });
    }

    if (!["low", "medium", "high", "critical"].includes(ruleData.severity)) {
      errors.push("严重程度必须是 low、medium、high 或 critical");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取目标学生列表
   */
  private async getTargetStudents(targetScope: {
    type: "student" | "class" | "all";
    ids?: string[];
  }): Promise<Array<{ student_id: string; name: string; class_name: string }>> {
    try {
      let filters: any = {};

      switch (targetScope.type) {
        case "student":
          if (targetScope.ids?.length) {
            filters.student_id = { in: targetScope.ids };
          } else {
            return [];
          }
          break;
        case "class":
          if (targetScope.ids?.length) {
            filters.class_name = { in: targetScope.ids };
          } else {
            return [];
          }
          break;
        case "all":
          // 不设置过滤条件，获取所有学生
          break;
      }

      const response = await apiClient.query("students", {
        filters,
        select: ["student_id", "name", "class_name"],
      });

      return response.success ? response.data || [] : [];
    } catch (error) {
      logError("获取目标学生失败", { targetScope, error });
      return [];
    }
  }

  /**
   * 检测单个学生的预警
   */
  private async detectStudentWarnings(
    student: { student_id: string; name: string; class_name: string },
    rules: WarningRule[]
  ): Promise<{ newCount: number; updatedCount: number }> {
    let newCount = 0;
    let updatedCount = 0;

    for (const rule of rules) {
      try {
        const triggerResult = await this.evaluateWarningRule(student, rule);

        if (triggerResult.triggered) {
          // 检查是否已存在相同的预警
          const existingWarning = await this.findExistingWarning(
            student.student_id,
            rule.id
          );

          if (existingWarning) {
            // 更新现有预警
            await this.updateExistingWarning(
              existingWarning.id,
              triggerResult.data
            );
            updatedCount++;
          } else {
            // 创建新预警
            await this.createNewWarning(student, rule, triggerResult.data);
            newCount++;
          }
        }
      } catch (error) {
        logError("评估预警规则失败", {
          studentId: student.student_id,
          ruleId: rule.id,
          error,
        });
      }
    }

    return { newCount, updatedCount };
  }

  /**
   * 评估预警规则
   */
  private async evaluateWarningRule(
    student: { student_id: string; name: string; class_name: string },
    rule: WarningRule
  ): Promise<{
    triggered: boolean;
    data?: {
      metric: string;
      value: number;
      threshold: number;
      description: string;
    };
  }> {
    for (const condition of rule.conditions) {
      const metricValue = await this.getStudentMetricValue(
        student.student_id,
        condition.metric,
        condition.timeframe
      );

      if (metricValue === null) {
        continue; // 无法获取指标值，跳过此条件
      }

      const triggered = this.evaluateCondition(
        metricValue,
        condition.operator,
        condition.value
      );

      if (triggered) {
        return {
          triggered: true,
          data: {
            metric: condition.metric,
            value: metricValue,
            threshold: condition.value,
            description: `${condition.metric} ${condition.operator} ${condition.value}`,
          },
        };
      }
    }

    return { triggered: false };
  }

  /**
   * 获取学生指标值
   */
  private async getStudentMetricValue(
    studentId: string,
    metric: string,
    timeframeDays?: number
  ): Promise<number | null> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      if (timeframeDays) {
        startDate.setDate(startDate.getDate() - timeframeDays);
      } else {
        startDate.setDate(startDate.getDate() - 30); // 默认30天
      }

      switch (metric) {
        case "average_score":
          return await this.getAverageScore(studentId, startDate, endDate);
        case "homework_completion_rate":
          return await this.getHomeworkCompletionRate(
            studentId,
            startDate,
            endDate
          );
        case "attendance_rate":
          return await this.getAttendanceRate(studentId, startDate, endDate);
        case "grade_trend":
          return await this.getGradeTrend(studentId, startDate, endDate);
        default:
          logError("未知的预警指标", { metric });
          return null;
      }
    } catch (error) {
      logError("获取学生指标值失败", { studentId, metric, error });
      return null;
    }
  }

  /**
   * 评估条件
   */
  private evaluateCondition(
    value: number,
    operator: string,
    threshold: number
  ): boolean {
    switch (operator) {
      case "lt":
        return value < threshold;
      case "lte":
        return value <= threshold;
      case "gt":
        return value > threshold;
      case "gte":
        return value >= threshold;
      case "eq":
        return value === threshold;
      case "neq":
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * 获取平均分
   */
  private async getAverageScore(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number | null> {
    const response = await apiClient.query("grade_data", {
      filters: {
        student_id: studentId,
        exam_date: {
          gte: startDate.toISOString().split("T")[0],
          lte: endDate.toISOString().split("T")[0],
        },
      },
      select: ["total_score"],
    });

    if (!response.success || !response.data?.length) {
      return null;
    }

    const scores = response.data
      .map((record: any) => record.total_score)
      .filter((score: any) => typeof score === "number" && score > 0);

    return scores.length > 0
      ? scores.reduce((sum: number, score: number) => sum + score, 0) /
          scores.length
      : null;
  }

  /**
   * 获取作业完成率
   */
  private async getHomeworkCompletionRate(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number | null> {
    const response = await apiClient.query("homework_submissions", {
      filters: {
        student_id: studentId,
        submitted_at: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      select: ["status"],
    });

    if (!response.success || !response.data?.length) {
      return null;
    }

    const submissions = response.data;
    const completed = submissions.filter(
      (sub: any) => sub.status !== "missing"
    ).length;

    return (completed / submissions.length) * 100;
  }

  /**
   * 获取出勤率（模拟实现）
   */
  private async getAttendanceRate(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number | null> {
    // 这里应该连接实际的考勤系统
    // 暂时返回模拟数据
    return 95; // 95%出勤率
  }

  /**
   * 获取成绩趋势
   */
  private async getGradeTrend(
    studentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number | null> {
    const response = await apiClient.query("grade_data", {
      filters: {
        student_id: studentId,
        exam_date: {
          gte: startDate.toISOString().split("T")[0],
          lte: endDate.toISOString().split("T")[0],
        },
      },
      select: ["total_score", "exam_date"],
      orderBy: [{ column: "exam_date", ascending: true }],
    });

    if (
      !response.success ||
      !response.data?.length ||
      response.data.length < 2
    ) {
      return null;
    }

    const scores = response.data
      .map((record: any) => record.total_score)
      .filter((score: any) => typeof score === "number" && score > 0);

    if (scores.length < 2) return null;

    // 简单的线性趋势计算
    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];

    return ((lastScore - firstScore) / firstScore) * 100; // 返回百分比变化
  }

  /**
   * 查找现有预警
   */
  private async findExistingWarning(
    studentId: string,
    ruleId: string
  ): Promise<WarningRecord | null> {
    const response = await apiClient.query<WarningRecord>("warning_records", {
      filters: {
        student_id: studentId,
        rule_id: ruleId,
        status: "active",
      },
      limit: 1,
    });

    return response.success && response.data?.length ? response.data[0] : null;
  }

  /**
   * 更新现有预警
   */
  private async updateExistingWarning(
    warningId: string,
    triggerData: any
  ): Promise<void> {
    await apiClient.update("warning_records", warningId, {
      trigger_data: triggerData,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * 创建新预警
   */
  private async createNewWarning(
    student: { student_id: string; name: string; class_name: string },
    rule: WarningRule,
    triggerData: any
  ): Promise<void> {
    const warningRecord: Omit<WarningRecord, "id"> = {
      student_id: student.student_id,
      student_name: student.name,
      class_name: student.class_name,
      rule_id: rule.id,
      rule_name: rule.name,
      severity: rule.severity,
      trigger_data: triggerData,
      status: "active",
      created_at: new Date().toISOString(),
    };

    await apiClient.insert("warning_records", {
      ...warningRecord,
      id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  /**
   * 计算预警统计
   */
  private calculateWarningStatistics(
    records: WarningRecord[],
    timeRange: { startDate: string; endDate: string }
  ): WarningStatistics {
    const summary = {
      total_warnings: records.length,
      active_warnings: records.filter((r) => r.status === "active").length,
      resolved_warnings: records.filter((r) => r.status === "resolved").length,
      critical_warnings: records.filter((r) => r.severity === "critical")
        .length,
    };

    const by_severity = {
      low: records.filter((r) => r.severity === "low").length,
      medium: records.filter((r) => r.severity === "medium").length,
      high: records.filter((r) => r.severity === "high").length,
      critical: records.filter((r) => r.severity === "critical").length,
    };

    const by_status = {
      active: records.filter((r) => r.status === "active").length,
      acknowledged: records.filter((r) => r.status === "acknowledged").length,
      resolved: records.filter((r) => r.status === "resolved").length,
      dismissed: records.filter((r) => r.status === "dismissed").length,
    };

    // 简化的趋势数据（按天统计）
    const trend_data = this.calculateTrendData(records, timeRange);

    // 触发次数最多的规则
    const ruleStats = new Map<string, { rule_name: string; count: number }>();
    records.forEach((record) => {
      const existing = ruleStats.get(record.rule_id);
      if (existing) {
        existing.count++;
      } else {
        ruleStats.set(record.rule_id, {
          rule_name: record.rule_name,
          count: 1,
        });
      }
    });

    const top_rules = Array.from(ruleStats.entries())
      .map(([rule_id, data]) => ({
        rule_id,
        rule_name: data.rule_name,
        trigger_count: data.count,
      }))
      .sort((a, b) => b.trigger_count - a.trigger_count)
      .slice(0, 5);

    return {
      summary,
      by_severity,
      by_status,
      trend_data,
      top_rules,
    };
  }

  /**
   * 计算趋势数据
   */
  private calculateTrendData(
    records: WarningRecord[],
    timeRange: { startDate: string; endDate: string }
  ): WarningStatistics["trend_data"] {
    const dailyStats = new Map<
      string,
      { count: number; severities: Record<string, number> }
    >();

    records.forEach((record) => {
      const date = record.created_at.split("T")[0];
      const existing = dailyStats.get(date);

      if (existing) {
        existing.count++;
        existing.severities[record.severity] =
          (existing.severities[record.severity] || 0) + 1;
      } else {
        dailyStats.set(date, {
          count: 1,
          severities: { [record.severity]: 1 },
        });
      }
    });

    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        severity_breakdown: stats.severities,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * 计算预警历史
   */
  private calculateWarningHistory(
    warnings: WarningRecord[]
  ): StudentWarningProfile["warning_history"] {
    const total_warnings = warnings.length;
    const recent_warnings = warnings.filter((w) => {
      const createdDate = new Date(w.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate >= thirtyDaysAgo;
    }).length;

    const severity_distribution: Record<string, number> = {};
    warnings.forEach((warning) => {
      severity_distribution[warning.severity] =
        (severity_distribution[warning.severity] || 0) + 1;
    });

    const resolved_count = warnings.filter(
      (w) => w.status === "resolved"
    ).length;
    const resolution_rate =
      total_warnings > 0 ? (resolved_count / total_warnings) * 100 : 0;

    return {
      total_warnings,
      recent_warnings,
      severity_distribution,
      resolution_rate: Math.round(resolution_rate * 100) / 100,
    };
  }

  /**
   * 分析风险因素
   */
  private async analyzeRiskFactors(
    studentId: string,
    warnings: WarningRecord[]
  ): Promise<StudentWarningProfile["risk_factors"]> {
    const riskFactors: StudentWarningProfile["risk_factors"] = [];

    // 基于预警频率的风险
    if (warnings.length >= 5) {
      riskFactors.push({
        factor: "预警频发",
        score: 0.8,
        description: "预警次数较多，需要重点关注",
      });
    }

    // 基于严重程度的风险
    const criticalWarnings = warnings.filter((w) => w.severity === "critical");
    if (criticalWarnings.length > 0) {
      riskFactors.push({
        factor: "严重预警",
        score: 0.9,
        description: "存在严重级别预警，需要立即干预",
      });
    }

    // 基于解决率的风险
    const resolvedCount = warnings.filter(
      (w) => w.status === "resolved"
    ).length;
    const resolutionRate =
      warnings.length > 0 ? resolvedCount / warnings.length : 1;
    if (resolutionRate < 0.5) {
      riskFactors.push({
        factor: "预警解决率低",
        score: 0.7,
        description: "预警解决率偏低，可能存在持续性问题",
      });
    }

    return riskFactors;
  }

  /**
   * 生成建议行动
   */
  private generateRecommendedActions(
    warnings: WarningRecord[],
    riskFactors: StudentWarningProfile["risk_factors"]
  ): StudentWarningProfile["recommended_actions"] {
    const actions: StudentWarningProfile["recommended_actions"] = [];

    // 基于活跃预警的建议
    const activeWarnings = warnings.filter((w) => w.status === "active");
    if (activeWarnings.length > 0) {
      actions.push({
        action: "处理活跃预警",
        priority: "high",
        expected_impact: "解决当前存在的问题",
      });
    }

    // 基于风险因素的建议
    const highRiskFactors = riskFactors.filter((rf) => rf.score >= 0.8);
    if (highRiskFactors.length > 0) {
      actions.push({
        action: "制定个性化干预计划",
        priority: "high",
        expected_impact: "针对性解决高风险问题",
      });
    }

    // 基于预警模式的建议
    const recentWarnings = warnings.filter((w) => {
      const createdDate = new Date(w.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate >= weekAgo;
    });

    if (recentWarnings.length >= 2) {
      actions.push({
        action: "加强监控频率",
        priority: "medium",
        expected_impact: "及时发现和处理新问题",
      });
    }

    return actions;
  }

  /**
   * 清除预警缓存
   */
  private clearWarningCache(): void {
    const patterns = [
      `${this.cachePrefix}rules`,
      `${this.cachePrefix}stats`,
      `${this.cachePrefix}profile`,
    ];

    patterns.forEach((pattern) => {
      // 清除匹配模式的所有缓存键
      alertCache.clear(); // 简化实现，清除所有缓存
    });

    logInfo("预警缓存已清除");
  }
}

// 导出服务实例
export const warningService = new WarningService();
