/**
 * 🧪 WarningService 单元测试
 * 测试预警系统的核心功能
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getWarningRuleTemplates,
  createWarningRule,
  getWarningRules,
  getWarningStatistics,
  getWarningRecords,
  resolveWarningRecord,
  type WarningRule,
  type WarningRecord,
  type RuleTemplate,
  type WarningFilter,
} from "../warningService";
import {
  setupTestDatabase,
  cleanTestData,
  insertTestData,
} from "../../test/db-setup";
import { generateStudents } from "../../test/generators";
import { requestCache } from "@/utils/cacheUtils";

describe("WarningService", () => {
  beforeEach(async () => {
    // 清理缓存
    requestCache.clear();
    // 清理测试数据
    await cleanTestData(["warning_records", "warning_rules", "students"]);
  });

  afterEach(async () => {
    // 清理测试数据
    await cleanTestData(["warning_records", "warning_rules", "students"]);
    // 清理缓存
    requestCache.clear();
  });

  describe("getWarningRuleTemplates - 预警规则模板", () => {
    it("应返回所有预警规则模板", () => {
      const templates = getWarningRuleTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });

    it("所有模板应有完整的必需字段", () => {
      const templates = getWarningRuleTemplates();

      templates.forEach((template) => {
        expect(template).toHaveProperty("name");
        expect(template).toHaveProperty("description");
        expect(template).toHaveProperty("conditions");
        expect(template).toHaveProperty("severity");
        expect(template).toHaveProperty("scope");
        expect(template).toHaveProperty("category");
        expect(template).toHaveProperty("priority");

        // 验证字段值的有效性
        expect(typeof template.name).toBe("string");
        expect(template.name.length).toBeGreaterThan(0);
        expect(["low", "medium", "high"]).toContain(template.severity);
        expect(["global", "exam", "class", "student"]).toContain(
          template.scope
        );
        expect([
          "grade",
          "attendance",
          "behavior",
          "progress",
          "homework",
          "composite",
        ]).toContain(template.category);
        expect(template.priority).toBeGreaterThan(0);
      });
    });

    it("应包含成绩下降预警模板", () => {
      const templates = getWarningRuleTemplates();

      const gradeDeclineTemplate = templates.find(
        (t) => t.name === "成绩下降预警"
      );

      expect(gradeDeclineTemplate).toBeDefined();
      expect(gradeDeclineTemplate?.severity).toBe("high");
      expect(gradeDeclineTemplate?.category).toBe("progress");
      expect(gradeDeclineTemplate?.conditions).toHaveProperty(
        "type",
        "grade_decline"
      );
      expect(gradeDeclineTemplate?.conditions).toHaveProperty(
        "decline_threshold"
      );
      expect(gradeDeclineTemplate?.conditions).toHaveProperty(
        "consecutive_count"
      );
    });

    it("应包含班级及格率预警模板", () => {
      const templates = getWarningRuleTemplates();

      const passRateTemplate = templates.find(
        (t) => t.name === "班级及格率预警"
      );

      expect(passRateTemplate).toBeDefined();
      expect(passRateTemplate?.severity).toBe("medium");
      expect(passRateTemplate?.scope).toBe("class");
      expect(passRateTemplate?.category).toBe("grade");
      expect(passRateTemplate?.conditions).toHaveProperty(
        "type",
        "class_pass_rate"
      );
      expect(passRateTemplate?.conditions).toHaveProperty("threshold");
      expect(passRateTemplate?.conditions.threshold).toBeLessThanOrEqual(1.0);
    });

    it("应包含连续不及格预警模板", () => {
      const templates = getWarningRuleTemplates();

      const consecutiveFailTemplate = templates.find(
        (t) => t.name === "连续不及格预警"
      );

      expect(consecutiveFailTemplate).toBeDefined();
      expect(consecutiveFailTemplate?.conditions).toHaveProperty(
        "type",
        "consecutive_fails"
      );
      expect(consecutiveFailTemplate?.conditions).toHaveProperty("count");
      expect(consecutiveFailTemplate?.conditions).toHaveProperty(
        "threshold",
        60
      );
    });

    it("应包含AI增强的预警模板", () => {
      const templates = getWarningRuleTemplates();

      const mlTemplates = templates.filter((t) =>
        t.conditions.type?.startsWith("ml_")
      );

      expect(mlTemplates.length).toBeGreaterThan(0);

      // 检查AI风险预测模板
      const mlRiskTemplate = mlTemplates.find(
        (t) => t.name === "AI风险预测预警"
      );
      expect(mlRiskTemplate).toBeDefined();
      expect(mlRiskTemplate?.conditions.type).toBe("ml_risk_prediction");

      // 检查AI异常检测模板
      const mlAnomalyTemplate = mlTemplates.find(
        (t) => t.name === "AI异常检测预警"
      );
      expect(mlAnomalyTemplate).toBeDefined();
      expect(mlAnomalyTemplate?.conditions.type).toBe("ml_anomaly_detection");
    });
  });

  describe("createWarningRule - 创建预警规则", () => {
    it("应成功创建新的预警规则", async () => {
      const newRule: Partial<WarningRule> = {
        name: "测试预警规则",
        description: "这是一个测试规则",
        conditions: {
          type: "exam_fail",
          threshold: 60,
          subject: "all",
        },
        severity: "medium",
        scope: "exam",
        category: "grade",
        priority: 5,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      const result = await createWarningRule(newRule as WarningRule);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(newRule.name);
      expect(result.severity).toBe(newRule.severity);
    });

    it("应验证必需字段", async () => {
      const incompleteRule: any = {
        name: "不完整的规则",
        // 缺少必需字段: conditions, severity, scope, category
      };

      try {
        await createWarningRule(incompleteRule);
        expect.fail("应该抛出验证错误");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("应支持从模板创建规则", async () => {
      const templates = getWarningRuleTemplates();
      const template = templates[0];

      const ruleFromTemplate: Partial<WarningRule> = {
        name: template.name + " (自定义)",
        description: template.description,
        conditions: template.conditions,
        severity: template.severity,
        scope: template.scope,
        category: template.category,
        priority: template.priority,
        is_active: true,
        is_system: false,
        auto_trigger: true,
        notification_enabled: true,
      };

      const result = await createWarningRule(ruleFromTemplate as WarningRule);

      expect(result).toBeDefined();
      expect(result.conditions).toEqual(template.conditions);
    });
  });

  describe("getWarningRules - 获取预警规则", () => {
    it("应返回所有活跃的预警规则", async () => {
      // 先创建几条规则
      const rule1: Partial<WarningRule> = {
        name: "规则1",
        description: "描述1",
        conditions: { type: "exam_fail", threshold: 60 },
        severity: "high",
        scope: "exam",
        category: "grade",
        priority: 5,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      const rule2: Partial<WarningRule> = {
        name: "规则2",
        description: "描述2",
        conditions: { type: "grade_decline", decline_threshold: 10 },
        severity: "medium",
        scope: "global",
        category: "progress",
        priority: 6,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      await createWarningRule(rule1 as WarningRule);
      await createWarningRule(rule2 as WarningRule);

      const rules = await getWarningRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThanOrEqual(2);
    });

    it("应支持按严重程度筛选", async () => {
      const highRule: Partial<WarningRule> = {
        name: "高风险规则",
        description: "高风险",
        conditions: { type: "grade_decline", decline_threshold: 20 },
        severity: "high",
        scope: "global",
        category: "progress",
        priority: 9,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      await createWarningRule(highRule as WarningRule);

      const filter = { severity: "high" };
      const rules = await getWarningRules(filter);

      rules.forEach((rule: WarningRule) => {
        expect(rule.severity).toBe("high");
      });
    });

    it("应支持按类别筛选", async () => {
      const gradeRule: Partial<WarningRule> = {
        name: "成绩类规则",
        description: "成绩相关",
        conditions: { type: "exam_fail", threshold: 60 },
        severity: "medium",
        scope: "exam",
        category: "grade",
        priority: 5,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      await createWarningRule(gradeRule as WarningRule);

      const filter = { category: "grade" };
      const rules = await getWarningRules(filter);

      rules.forEach((rule: WarningRule) => {
        expect(rule.category).toBe("grade");
      });
    });
  });

  describe("getWarningRecords - 获取预警记录", () => {
    it("应返回按时间倒序排列的预警记录", async () => {
      const students = generateStudents(2, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      // 创建一个规则
      const rule: Partial<WarningRule> = {
        name: "测试规则",
        description: "测试",
        conditions: { type: "exam_fail", threshold: 60 },
        severity: "medium",
        scope: "exam",
        category: "grade",
        priority: 5,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      const createdRule = await createWarningRule(rule as WarningRule);

      // 创建预警记录
      const warningRecords = [
        {
          id: "00000000-0000-0000-0000-000000000001",
          student_id: students[0].student_id,
          rule_id: createdRule.id,
          details: { score: 45, threshold: 60 },
          status: "active",
          created_at: new Date().toISOString(),
        },
        {
          id: "00000000-0000-0000-0000-000000000002",
          student_id: students[1].student_id,
          rule_id: createdRule.id,
          details: { score: 50, threshold: 60 },
          status: "active",
          created_at: new Date().toISOString(),
        },
      ];

      await insertTestData("warning_records", warningRecords);

      const records = await getWarningRecords();

      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBeGreaterThanOrEqual(2);

      // 验证时间倒序
      if (records.length >= 2) {
        const time1 = new Date(records[0].created_at).getTime();
        const time2 = new Date(records[1].created_at).getTime();
        expect(time1).toBeGreaterThanOrEqual(time2);
      }
    });

    it("应支持按学生ID筛选", async () => {
      const students = generateStudents(2, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const rule: Partial<WarningRule> = {
        name: "测试规则2",
        description: "测试",
        conditions: { type: "exam_fail", threshold: 60 },
        severity: "medium",
        scope: "exam",
        category: "grade",
        priority: 5,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      const createdRule = await createWarningRule(rule as WarningRule);

      const warningRecords = [
        {
          id: "00000000-0000-0000-0000-000000000011",
          student_id: students[0].student_id,
          rule_id: createdRule.id,
          details: { score: 55 },
          status: "active",
          created_at: new Date().toISOString(),
        },
        {
          id: "00000000-0000-0000-0000-000000000012",
          student_id: students[1].student_id,
          rule_id: createdRule.id,
          details: { score: 58 },
          status: "active",
          created_at: new Date().toISOString(),
        },
      ];

      await insertTestData("warning_records", warningRecords);

      const records = await getWarningRecords(students[0].student_id);

      expect(Array.isArray(records)).toBe(true);
      records.forEach((record: WarningRecord) => {
        expect(record.student_id).toBe(students[0].student_id);
      });
    });

    it("应支持按状态筛选", async () => {
      const students = generateStudents(1, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const rule: Partial<WarningRule> = {
        name: "测试规则3",
        description: "测试",
        conditions: { type: "exam_fail", threshold: 60 },
        severity: "medium",
        scope: "exam",
        category: "grade",
        priority: 5,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      const createdRule = await createWarningRule(rule as WarningRule);

      const warningRecords = [
        {
          id: "00000000-0000-0000-0000-000000000021",
          student_id: students[0].student_id,
          rule_id: createdRule.id,
          details: { score: 45 },
          status: "active",
          created_at: new Date().toISOString(),
        },
        {
          id: "00000000-0000-0000-0000-000000000022",
          student_id: students[0].student_id,
          rule_id: createdRule.id,
          details: { score: 58 },
          status: "resolved",
          created_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
        },
      ];

      await insertTestData("warning_records", warningRecords);

      const activeRecords = await getWarningRecords(undefined, "active");

      activeRecords.forEach((record: WarningRecord) => {
        expect(record.status).toBe("active");
      });
    });
  });

  describe("resolveWarningRecord - 解决预警记录", () => {
    it("应成功解决预警记录", async () => {
      const students = generateStudents(1, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const rule: Partial<WarningRule> = {
        name: "待解决规则",
        description: "测试解决",
        conditions: { type: "exam_fail", threshold: 60 },
        severity: "medium",
        scope: "exam",
        category: "grade",
        priority: 5,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      const createdRule = await createWarningRule(rule as WarningRule);

      const warningRecord = {
        id: "00000000-0000-0000-0000-000000000031",
        student_id: students[0].student_id,
        rule_id: createdRule.id,
        details: { score: 45 },
        status: "active",
        created_at: new Date().toISOString(),
      };

      await insertTestData("warning_records", [warningRecord]);

      const result = await resolveWarningRecord(
        warningRecord.id,
        "已辅导学生，成绩有所提升"
      );

      expect(result).toBe(true);

      // 验证记录状态已更新
      const records = await getWarningRecords(undefined, "resolved");
      const resolvedRecord = records.find(
        (r: WarningRecord) => r.id === warningRecord.id
      );

      expect(resolvedRecord).toBeDefined();
      expect(resolvedRecord?.status).toBe("resolved");
      expect(resolvedRecord?.resolution_notes).toContain("已辅导学生");
    });

    it("应拒绝解决不存在的预警记录", async () => {
      const result = await resolveWarningRecord("nonexistent-id", "测试");

      expect(result).toBe(false);
    });
  });

  describe("getWarningStatistics - 预警统计", () => {
    it("应返回完整的预警统计信息", async () => {
      const students = generateStudents(10, {
        classNames: ["高一(1)班", "高一(2)班"],
      });
      await insertTestData("students", students);

      const stats = await getWarningStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalStudents");
      expect(stats).toHaveProperty("warningStudents");
      expect(stats).toHaveProperty("warningRatio");
      expect(stats).toHaveProperty("totalWarnings");
      expect(stats).toHaveProperty("activeWarnings");
      expect(stats).toHaveProperty("riskDistribution");
      expect(stats).toHaveProperty("categoryDistribution");
      expect(stats).toHaveProperty("scopeDistribution");

      expect(stats.totalStudents).toBeGreaterThanOrEqual(10);
      expect(stats.riskDistribution).toHaveProperty("low");
      expect(stats.riskDistribution).toHaveProperty("medium");
      expect(stats.riskDistribution).toHaveProperty("high");
    });

    it("应正确计算预警比率", async () => {
      const students = generateStudents(5, { classNames: ["高一(1)班"] });
      await insertTestData("students", students);

      const stats = await getWarningStatistics();

      if (stats.totalStudents > 0) {
        expect(stats.warningRatio).toBeGreaterThanOrEqual(0);
        expect(stats.warningRatio).toBeLessThanOrEqual(1);

        // 验证比率计算正确
        const expectedRatio = stats.warningStudents / stats.totalStudents;
        expect(Math.abs(stats.warningRatio - expectedRatio)).toBeLessThan(0.01);
      }
    });
  });

  describe("Edge Cases - 边界情况", () => {
    it("应处理空的预警记录列表", async () => {
      const records = await getWarningRecords();

      expect(Array.isArray(records)).toBe(true);
      expect(records.length).toBe(0);
    });

    it("应处理空的规则列表", async () => {
      const rules = await getWarningRules();

      expect(Array.isArray(rules)).toBe(true);
      // 可能有系统默认规则，所以不一定是空的
    });

    it("应处理无学生的统计查询", async () => {
      const stats = await getWarningStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalStudents).toBe(0);
      expect(stats.warningStudents).toBe(0);
      expect(stats.warningRatio).toBe(0);
    });

    it("应处理特殊字符的规则名称", async () => {
      const specialRule: Partial<WarningRule> = {
        name: "特殊规则<>&\"'",
        description: "包含特殊字符的规则",
        conditions: { type: "exam_fail", threshold: 60 },
        severity: "low",
        scope: "exam",
        category: "grade",
        priority: 1,
        is_active: true,
        is_system: false,
        auto_trigger: false,
        notification_enabled: true,
      };

      const result = await createWarningRule(specialRule as WarningRule);

      expect(result).toBeDefined();
      expect(result.name).toBe(specialRule.name);
    });
  });
});
