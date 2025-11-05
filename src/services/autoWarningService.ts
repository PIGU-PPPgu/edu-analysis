import { supabase } from "@/integrations/supabase/client";

export interface AutoWarningAnalysisResult {
  success: boolean;
  message: string;
  analysis_time: string;
  statistics: {
    total_students: number;
    active_rules: number;
    warnings_found: number;
    new_warnings: number;
    updated_warnings: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
  };
  ai_summary: {
    overview: string;
    risk_distribution: {
      high: number;
      medium: number;
      low: number;
    };
    risk_percentage: number;
    top_risk_factors: Array<{ factor: string; count: number }>;
    recommendations: string[];
  };
  warning_details: any[];
  error?: string;
}

export interface WarningScheduleConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  time: string; // HH:MM格式
  days?: number[]; // 周几执行，0=周日，1=周一...
  notify_high_risk: boolean;
  notify_email?: string;
  auto_create_tasks: boolean;
}

/**
 * 自动预警服务类
 * 提供预警分析、调度管理、通知等功能
 */
export class AutoWarningService {
  /**
   * 手动触发预警分析
   */
  static async runAnalysis(): Promise<AutoWarningAnalysisResult> {
    try {
      console.log("🚀 开始手动预警分析...");

      const { data, error } = await supabase.functions.invoke(
        "auto-warning-analysis",
        {
          body: {
            trigger_type: "manual",
            timestamp: new Date().toISOString(),
          },
        }
      );

      if (error) {
        throw new Error(`预警分析失败: ${error.message}`);
      }

      console.log("✅ 预警分析完成:", data);
      return data as AutoWarningAnalysisResult;
    } catch (error) {
      console.error("❌ 预警分析失败:", error);
      throw error;
    }
  }

  /**
   * 获取预警分析历史记录
   */
  static async getAnalysisHistory(limit: number = 10) {
    try {
      // 从数据库获取分析历史
      const { data, error } = await supabase
        .from("warning_analysis_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error && error.code !== "PGRST116") {
        // 忽略表不存在的错误
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("获取分析历史失败:", error);
      return [];
    }
  }

  /**
   * 创建预警规则
   */
  static async createWarningRule(rule: {
    name: string;
    description?: string;
    conditions: any;
    severity: "low" | "medium" | "high";
    is_active?: boolean;
  }) {
    try {
      const { data, error } = await supabase
        .from("warning_rules")
        .insert({
          ...rule,
          is_active: rule.is_active ?? true,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`创建预警规则失败: ${error.message}`);
      }

      console.log("✅ 预警规则创建成功:", data);
      return data;
    } catch (error) {
      console.error("❌ 创建预警规则失败:", error);
      throw error;
    }
  }

  /**
   * 获取所有预警规则
   */
  static async getWarningRules() {
    try {
      const { data, error } = await supabase
        .from("warning_rules")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("获取预警规则失败:", error);
      throw error;
    }
  }

  /**
   * 更新预警规则
   */
  static async updateWarningRule(ruleId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from("warning_rules")
        .update(updates)
        .eq("id", ruleId)
        .select()
        .single();

      if (error) {
        throw new Error(`更新预警规则失败: ${error.message}`);
      }

      console.log("✅ 预警规则更新成功:", data);
      return data;
    } catch (error) {
      console.error("❌ 更新预警规则失败:", error);
      throw error;
    }
  }

  /**
   * 删除预警规则
   */
  static async deleteWarningRule(ruleId: string) {
    try {
      const { error } = await supabase
        .from("warning_rules")
        .delete()
        .eq("id", ruleId);

      if (error) {
        throw new Error(`删除预警规则失败: ${error.message}`);
      }

      console.log("✅ 预警规则删除成功");
    } catch (error) {
      console.error("❌ 删除预警规则失败:", error);
      throw error;
    }
  }

  /**
   * 获取当前活跃预警
   */
  static async getActiveWarnings() {
    try {
      const { data, error } = await supabase
        .from("warning_records")
        .select(
          `
          *,
          rule:rule_id (
            name,
            description,
            severity
          ),
          student:student_id (
            name,
            class_name
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("获取活跃预警失败:", error);
      throw error;
    }
  }

  /**
   * 解决预警
   */
  static async resolveWarning(warningId: string, resolutionNotes?: string) {
    try {
      const { data, error } = await supabase
        .from("warning_records")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq("id", warningId)
        .select()
        .single();

      if (error) {
        throw new Error(`解决预警失败: ${error.message}`);
      }

      console.log("✅ 预警已解决:", data);
      return data;
    } catch (error) {
      console.error("❌ 解决预警失败:", error);
      throw error;
    }
  }

  /**
   * 忽略预警
   */
  static async dismissWarning(warningId: string, reason?: string) {
    try {
      const { data, error } = await supabase
        .from("warning_records")
        .update({
          status: "dismissed",
          resolved_at: new Date().toISOString(),
          resolution_notes: reason ? `忽略原因: ${reason}` : "预警已忽略",
        })
        .eq("id", warningId)
        .select()
        .single();

      if (error) {
        throw new Error(`忽略预警失败: ${error.message}`);
      }

      console.log("✅ 预警已忽略:", data);
      return data;
    } catch (error) {
      console.error("❌ 忽略预警失败:", error);
      throw error;
    }
  }

  /**
   * 获取预警统计信息
   */
  static async getWarningStatistics() {
    try {
      // 获取总体统计
      const { data: totalStats, error: totalError } = await supabase
        .from("warning_records")
        .select("status, details");

      if (totalError) {
        throw totalError;
      }

      // 计算统计信息
      const activeWarnings =
        totalStats?.filter((w) => w.status === "active") || [];
      const resolvedWarnings =
        totalStats?.filter((w) => w.status === "resolved") || [];
      const dismissedWarnings =
        totalStats?.filter((w) => w.status === "dismissed") || [];

      // 按严重程度分类
      const severityStats = {
        high: 0,
        medium: 0,
        low: 0,
      };

      activeWarnings.forEach((warning) => {
        const severity = warning.details?.severity || "low";
        if (severityStats.hasOwnProperty(severity)) {
          severityStats[severity as keyof typeof severityStats]++;
        }
      });

      // 最近7天的预警趋势
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentWarnings, error: recentError } = await supabase
        .from("warning_records")
        .select("created_at, status")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (recentError) {
        throw recentError;
      }

      return {
        total: totalStats?.length || 0,
        active: activeWarnings.length,
        resolved: resolvedWarnings.length,
        dismissed: dismissedWarnings.length,
        severity_distribution: severityStats,
        recent_count: recentWarnings?.length || 0,
        resolution_rate:
          totalStats?.length > 0
            ? ((resolvedWarnings.length / totalStats.length) * 100).toFixed(1)
            : "0",
      };
    } catch (error) {
      console.error("获取预警统计失败:", error);
      throw error;
    }
  }

  /**
   * 批量处理预警
   */
  static async batchProcessWarnings(
    warningIds: string[],
    action: "resolve" | "dismiss",
    notes?: string
  ) {
    try {
      const updateData =
        action === "resolve"
          ? {
              status: "resolved",
              resolved_at: new Date().toISOString(),
              resolution_notes: notes || "批量解决",
            }
          : {
              status: "dismissed",
              resolved_at: new Date().toISOString(),
              resolution_notes: notes || "批量忽略",
            };

      const { data, error } = await supabase
        .from("warning_records")
        .update(updateData)
        .in("id", warningIds)
        .select();

      if (error) {
        throw new Error(`批量处理预警失败: ${error.message}`);
      }

      console.log(
        `✅ 批量${action === "resolve" ? "解决" : "忽略"}预警成功:`,
        data?.length
      );
      return data;
    } catch (error) {
      console.error("❌ 批量处理预警失败:", error);
      throw error;
    }
  }

  /**
   * 创建预设预警规则
   */
  static async createPresetRules() {
    const presetRules = [
      {
        name: "连续两次考试不及格",
        description: "学生连续两次考试成绩低于60分",
        conditions: {
          type: "consecutive_fails",
          times: 2,
          score_threshold: 60,
          subject: null,
        },
        severity: "medium" as const,
      },
      {
        name: "成绩显著下降",
        description: "学生成绩相比之前下降超过15分",
        conditions: {
          type: "grade_decline",
          decline_threshold: 15,
          period_count: 3,
          subject: null,
        },
        severity: "high" as const,
      },
      {
        name: "作业问题频发",
        description: "学生作业迟交或缺交次数过多",
        conditions: {
          type: "homework_issues",
          late_threshold: 3,
          missing_threshold: 2,
          quality_threshold: 60,
        },
        severity: "medium" as const,
      },
      {
        name: "综合学习风险",
        description: "综合考虑成绩、作业等多个维度的风险评估",
        conditions: {
          type: "comprehensive",
          weight_grades: 0.4,
          weight_homework: 0.3,
          weight_participation: 0.3,
        },
        severity: "high" as const,
      },
    ];

    const results = [];
    for (const rule of presetRules) {
      try {
        const result = await this.createWarningRule(rule);
        results.push(result);
      } catch (error) {
        console.warn(`创建预设规则失败 "${rule.name}":`, error);
      }
    }

    console.log(
      `✅ 成功创建 ${results.length}/${presetRules.length} 个预设规则`
    );
    return results;
  }

  /**
   * 测试预警分析功能
   */
  static async testAnalysis() {
    try {
      console.log("🧪 开始测试预警分析功能...");

      // 1. 检查预警规则
      const rules = await this.getWarningRules();
      console.log(`📋 当前有 ${rules.length} 条预警规则`);

      if (rules.length === 0) {
        console.log("📝 创建预设规则...");
        await this.createPresetRules();
      }

      // 2. 运行分析
      const result = await this.runAnalysis();
      console.log("📊 分析结果:", result);

      // 3. 获取统计信息
      const stats = await this.getWarningStatistics();
      console.log("📈 预警统计:", stats);

      return {
        success: true,
        rules_count: rules.length,
        analysis_result: result,
        statistics: stats,
      };
    } catch (error) {
      console.error("❌ 测试预警分析失败:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// 导出默认实例
export const autoWarningService = AutoWarningService;
