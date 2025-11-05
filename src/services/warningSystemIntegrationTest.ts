/**
 * 预警系统集成测试服务
 * 完整测试整个预警系统工作流程：从Edge Functions到实时通知到追踪记录
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  createExecution,
  updateExecutionStatus,
  createExecutionStep,
  updateExecutionStep,
  logExecutionError,
  recordPerformanceMetrics,
  getExecutionDetails,
} from "./warningTrackingService";

// 测试结果接口
export interface TestResult {
  testName: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  details: string;
  error?: string;
  data?: any;
}

export interface IntegrationTestReport {
  testSuiteId: string;
  startTime: string;
  endTime: string;
  totalDuration: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  testResults: TestResult[];
  systemStatus: {
    edgeFunctionsStatus: "healthy" | "unhealthy" | "unknown";
    databaseStatus: "healthy" | "unhealthy" | "unknown";
    notificationStatus: "healthy" | "unhealthy" | "unknown";
    trackingStatus: "healthy" | "unhealthy" | "unknown";
  };
  recommendations: string[];
}

// 测试数据生成器
class TestDataGenerator {
  // 生成测试学生数据
  static generateTestStudents(count: number = 5) {
    const students = [];
    for (let i = 1; i <= count; i++) {
      students.push({
        student_id: `TEST_${Date.now()}_${i}`,
        name: `测试学生${i}`,
        class_name: "测试班级",
        created_at: new Date().toISOString(),
      });
    }
    return students;
  }

  // 生成测试成绩数据
  static generateTestGrades(studentIds: string[]) {
    const grades = [];
    const subjects = ["chinese", "math", "english", "physics"];

    studentIds.forEach((studentId) => {
      // 为每个学生生成成绩数据，确保有一些会触发预警
      const gradeData = {
        student_id: studentId,
        exam_title: "集成测试考试",
        exam_type: "test",
        exam_date: new Date().toISOString().split("T")[0],
        total_score: Math.random() < 0.3 ? 200 : 400, // 30%概率低分
        total_max_score: 500,
      };

      // 添加各科目成绩
      subjects.forEach((subject) => {
        gradeData[`${subject}_score`] = Math.random() < 0.3 ? 30 : 80; // 30%概率低分
      });

      grades.push(gradeData);
    });

    return grades;
  }

  // 生成测试预警规则
  static generateTestRule() {
    return {
      name: "集成测试规则",
      description: "用于集成测试的临时预警规则",
      conditions: {
        type: "composite",
        operator: "OR",
        rules: [
          {
            field: "total_score",
            operator: "<",
            value: 250,
            weight: 1,
          },
          {
            field: "chinese_score",
            operator: "<",
            value: 40,
            weight: 1,
          },
        ],
      },
      severity: "medium",
      is_active: true,
      is_system: false,
    };
  }
}

// 集成测试管理器
export class WarningSystemIntegrationTester {
  private testSuiteId: string;
  private startTime: Date;
  private testResults: TestResult[] = [];
  private testData: {
    students: any[];
    grades: any[];
    rule: any;
    ruleId?: string;
    executionId?: string;
  } = {
    students: [],
    grades: [],
    rule: {},
  };

  constructor() {
    this.testSuiteId = `test_${Date.now()}`;
    this.startTime = new Date();
  }

  // 执行完整的集成测试
  async runFullIntegrationTest(
    options: {
      testDataCount?: number;
      cleanupAfterTest?: boolean;
      testRealTimeNotifications?: boolean;
      testPerformance?: boolean;
    } = {}
  ): Promise<IntegrationTestReport> {
    const {
      testDataCount = 5,
      cleanupAfterTest = true,
      testRealTimeNotifications = true,
      testPerformance = true,
    } = options;

    toast.info("开始预警系统集成测试", {
      description: "正在测试完整工作流程...",
    });

    try {
      // 1. 测试系统基础设施
      await this.testSystemInfrastructure();

      // 2. 准备测试数据
      await this.prepareTestData(testDataCount);

      // 3. 测试Edge Functions
      await this.testEdgeFunctions();

      // 4. 测试自动触发机制
      await this.testAutoTriggerMechanism();

      // 5. 测试实时通知系统
      if (testRealTimeNotifications) {
        await this.testRealTimeNotifications();
      }

      // 6. 测试追踪和记录系统
      await this.testTrackingSystem();

      // 7. 测试性能优化
      if (testPerformance) {
        await this.testPerformanceOptimizations();
      }

      // 8. 验证数据一致性
      await this.testDataConsistency();

      // 9. 清理测试数据
      if (cleanupAfterTest) {
        await this.cleanupTestData();
      }

      const report = this.generateTestReport();

      toast.success("集成测试完成", {
        description: `通过 ${report.passedTests}/${report.totalTests} 项测试`,
      });

      return report;
    } catch (error) {
      console.error("集成测试失败:", error);
      toast.error("集成测试失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });

      return this.generateTestReport();
    }
  }

  // 测试系统基础设施
  private async testSystemInfrastructure(): Promise<void> {
    await this.runTest("系统基础设施检查", async () => {
      // 检查数据库连接
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError) throw new Error(`认证检查失败: ${authError.message}`);

      // 检查关键表是否存在
      const tables = [
        "warning_rules",
        "warning_records",
        "warning_executions",
        "warning_execution_steps",
        "warning_execution_errors",
        "notification_templates",
        "notifications",
      ];

      for (const table of tables) {
        const { error } = await supabase.from(table).select("*").limit(1);
        if (error) throw new Error(`表 ${table} 不可访问: ${error.message}`);
      }

      return "所有基础设施检查通过";
    });
  }

  // 准备测试数据
  private async prepareTestData(testDataCount: number): Promise<void> {
    await this.runTest("准备测试数据", async () => {
      // 生成测试学生
      this.testData.students =
        TestDataGenerator.generateTestStudents(testDataCount);

      // 插入测试学生
      const { error: studentsError } = await supabase
        .from("students")
        .insert(this.testData.students);

      if (studentsError)
        throw new Error(`插入测试学生失败: ${studentsError.message}`);

      // 生成测试成绩
      const studentIds = this.testData.students.map((s) => s.student_id);
      this.testData.grades = TestDataGenerator.generateTestGrades(studentIds);

      // 插入测试成绩
      const { error: gradesError } = await supabase
        .from("grade_data")
        .insert(this.testData.grades);

      if (gradesError)
        throw new Error(`插入测试成绩失败: ${gradesError.message}`);

      // 创建测试预警规则
      this.testData.rule = TestDataGenerator.generateTestRule();
      const { data: ruleData, error: ruleError } = await supabase
        .from("warning_rules")
        .insert(this.testData.rule)
        .select("id")
        .single();

      if (ruleError) throw new Error(`创建测试规则失败: ${ruleError.message}`);
      this.testData.ruleId = ruleData.id;

      return `成功准备测试数据: ${testDataCount}个学生, ${this.testData.grades.length}条成绩, 1条预警规则`;
    });
  }

  // 测试Edge Functions
  private async testEdgeFunctions(): Promise<void> {
    await this.runTest("Edge Functions执行测试", async () => {
      // 创建执行记录
      const executionId = await createExecution("manual", "integration_test", {
        testSuiteId: this.testSuiteId,
        testType: "edge_function_test",
      });

      if (!executionId) throw new Error("创建执行记录失败");
      this.testData.executionId = executionId;

      // 调用Edge Function
      const { data, error } = await supabase.functions.invoke(
        "warning-engine",
        {
          body: {
            trigger: "manual",
            ruleIds: this.testData.ruleId ? [this.testData.ruleId] : undefined,
            executionId: executionId,
          },
        }
      );

      if (error) throw new Error(`Edge Function调用失败: ${error.message}`);
      if (!data.success)
        throw new Error(`Edge Function执行失败: ${data.error}`);

      // 验证结果
      if (!data.summary) throw new Error("Edge Function未返回执行摘要");
      if (data.summary.totalRules === 0) throw new Error("未处理任何预警规则");

      return `Edge Function成功执行: 处理${data.summary.totalRules}条规则, 匹配${data.summary.matchedStudents}名学生, 生成${data.summary.generatedWarnings}条预警`;
    });
  }

  // 测试自动触发机制
  private async testAutoTriggerMechanism(): Promise<void> {
    await this.runTest("自动触发机制测试", async () => {
      // 创建新的成绩数据来触发自动预警
      const newGrade = {
        student_id: this.testData.students[0].student_id,
        exam_title: "自动触发测试考试",
        exam_type: "test",
        exam_date: new Date().toISOString().split("T")[0],
        total_score: 180, // 低分触发预警
        total_max_score: 500,
        chinese_score: 35, // 低分触发预警
      };

      // 插入新成绩，应该触发自动预警
      const { error: insertError } = await supabase
        .from("grade_data")
        .insert(newGrade);

      if (insertError)
        throw new Error(`插入触发成绩失败: ${insertError.message}`);

      // 等待自动触发处理
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 检查是否生成了新的预警记录
      const { data: warnings, error: warningsError } = await supabase
        .from("warning_records")
        .select("*")
        .eq("student_id", this.testData.students[0].student_id)
        .eq("status", "active");

      if (warningsError)
        throw new Error(`查询预警记录失败: ${warningsError.message}`);

      if (!warnings || warnings.length === 0) {
        throw new Error("自动触发机制未生成预警记录");
      }

      return `自动触发成功: 生成${warnings.length}条预警记录`;
    });
  }

  // 测试实时通知系统
  private async testRealTimeNotifications(): Promise<void> {
    await this.runTest("实时通知系统测试", async () => {
      // 检查通知模板是否存在
      const { data: templates, error: templatesError } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("name", "warning_generated")
        .eq("is_active", true);

      if (templatesError)
        throw new Error(`查询通知模板失败: ${templatesError.message}`);
      if (!templates || templates.length === 0) {
        throw new Error("预警通知模板不存在或未激活");
      }

      // 获取当前用户ID
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("未找到当前用户");

      // 发送测试通知
      const { error: notifyError } = await supabase.rpc("send_notification", {
        p_template_name: "warning_generated",
        p_recipient_id: userData.user.id,
        p_data: {
          student_name: this.testData.students[0].name,
          warning_type: "集成测试预警",
          severity: "medium",
        },
        p_priority: "normal",
      });

      if (notifyError) throw new Error(`发送通知失败: ${notifyError.message}`);

      // 检查通知是否创建
      const { data: notifications, error: checkError } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userData.user.id)
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(1);

      if (checkError) throw new Error(`查询通知失败: ${checkError.message}`);
      if (!notifications || notifications.length === 0) {
        throw new Error("通知未成功创建");
      }

      return `实时通知系统正常: 成功发送并记录通知`;
    });
  }

  // 测试追踪系统
  private async testTrackingSystem(): Promise<void> {
    await this.runTest("追踪系统测试", async () => {
      if (!this.testData.executionId) throw new Error("缺少执行ID");

      // 获取执行详情
      const details = await getExecutionDetails(this.testData.executionId);

      if (!details.execution) throw new Error("执行记录不存在");
      if (details.steps.length === 0) throw new Error("缺少执行步骤记录");

      // 验证执行记录的完整性
      const execution = details.execution;
      if (!execution.start_time) throw new Error("执行记录缺少开始时间");
      if (execution.execution_status === "pending")
        throw new Error("执行状态未更新");

      // 检查性能指标
      if (!details.performance) throw new Error("缺少性能指标记录");

      // 测试手动记录追踪信息
      const stepId = await createExecutionStep(
        this.testData.executionId,
        "rule_validation",
        "集成测试验证步骤",
        this.testData.ruleId,
        this.testData.students[0].student_id,
        { testType: "integration" }
      );

      if (!stepId) throw new Error("创建测试步骤失败");

      await updateExecutionStep(stepId, "completed", { result: "success" });

      return `追踪系统正常: 执行记录完整, ${details.steps.length}个步骤, 有性能指标`;
    });
  }

  // 测试性能优化
  private async testPerformanceOptimizations(): Promise<void> {
    await this.runTest("性能优化测试", async () => {
      // 测试优化的统计查询
      const startTime = Date.now();

      const { data: stats, error } = await supabase.rpc(
        "get_warning_statistics_optimized",
        {
          time_range_days: 30,
        }
      );

      const queryTime = Date.now() - startTime;

      if (error) throw new Error(`优化统计查询失败: ${error.message}`);
      if (!stats || stats.length === 0) throw new Error("优化统计查询无结果");

      // 验证返回数据结构
      const stat = stats[0];
      const requiredFields = [
        "total_students",
        "warning_students",
        "total_warnings",
      ];
      for (const field of requiredFields) {
        if (stat[field] === undefined)
          throw new Error(`统计结果缺少字段: ${field}`);
      }

      // 测试执行统计查询
      const { data: execStats, error: execError } = await supabase.rpc(
        "get_execution_statistics",
        {
          p_start_date: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
          p_end_date: new Date().toISOString(),
        }
      );

      if (execError) throw new Error(`执行统计查询失败: ${execError.message}`);

      return `性能优化正常: 统计查询耗时${queryTime}ms, 执行统计完整`;
    });
  }

  // 测试数据一致性
  private async testDataConsistency(): Promise<void> {
    await this.runTest("数据一致性验证", async () => {
      // 检查预警记录与执行记录的一致性
      const { data: warnings, error: warningsError } = await supabase
        .from("warning_records")
        .select("*")
        .in(
          "student_id",
          this.testData.students.map((s) => s.student_id)
        );

      if (warningsError)
        throw new Error(`查询预警记录失败: ${warningsError.message}`);

      const { data: executions, error: execError } = await supabase
        .from("warning_executions")
        .select("*")
        .eq("trigger_source", "integration_test");

      if (execError) throw new Error(`查询执行记录失败: ${execError.message}`);

      // 验证数据关联性
      if (
        warnings &&
        warnings.length > 0 &&
        executions &&
        executions.length > 0
      ) {
        const warningCount = warnings.length;
        const executionWarningCount = executions.reduce(
          (sum, exec) => sum + exec.generated_warnings,
          0
        );

        // 允许一定的数据延迟和差异
        if (
          Math.abs(warningCount - executionWarningCount) >
          warningCount * 0.5
        ) {
          throw new Error(
            `数据不一致: 预警记录${warningCount}条, 执行记录显示${executionWarningCount}条`
          );
        }
      }

      return `数据一致性验证通过: 预警记录${warnings?.length || 0}条, 执行记录${executions?.length || 0}条`;
    });
  }

  // 清理测试数据
  private async cleanupTestData(): Promise<void> {
    await this.runTest("清理测试数据", async () => {
      const cleanupErrors = [];

      try {
        // 清理预警记录
        const { error: warningsError } = await supabase
          .from("warning_records")
          .delete()
          .in(
            "student_id",
            this.testData.students.map((s) => s.student_id)
          );
        if (warningsError)
          cleanupErrors.push(`清理预警记录: ${warningsError.message}`);

        // 清理成绩数据
        const { error: gradesError } = await supabase
          .from("grade_data")
          .delete()
          .in(
            "student_id",
            this.testData.students.map((s) => s.student_id)
          );
        if (gradesError)
          cleanupErrors.push(`清理成绩数据: ${gradesError.message}`);

        // 清理学生数据
        const { error: studentsError } = await supabase
          .from("students")
          .delete()
          .in(
            "student_id",
            this.testData.students.map((s) => s.student_id)
          );
        if (studentsError)
          cleanupErrors.push(`清理学生数据: ${studentsError.message}`);

        // 清理测试规则
        if (this.testData.ruleId) {
          const { error: ruleError } = await supabase
            .from("warning_rules")
            .delete()
            .eq("id", this.testData.ruleId);
          if (ruleError)
            cleanupErrors.push(`清理测试规则: ${ruleError.message}`);
        }

        // 清理执行记录会通过CASCADE自动清理
      } catch (error) {
        cleanupErrors.push(`清理过程异常: ${error}`);
      }

      if (cleanupErrors.length > 0) {
        throw new Error(`清理时发生错误: ${cleanupErrors.join(", ")}`);
      }

      return `成功清理所有测试数据`;
    });
  }

  // 运行单个测试
  private async runTest(
    testName: string,
    testFunction: () => Promise<string>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;

      this.testResults.push({
        testName,
        status: "passed",
        duration,
        details: result,
      });

      console.log(`✅ ${testName}: ${result} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.testResults.push({
        testName,
        status: "failed",
        duration,
        details: errorMessage,
        error: errorMessage,
      });

      console.error(`❌ ${testName}: ${errorMessage} (${duration}ms)`);
    }
  }

  // 生成测试报告
  private generateTestReport(): IntegrationTestReport {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    const passedTests = this.testResults.filter(
      (r) => r.status === "passed"
    ).length;
    const failedTests = this.testResults.filter(
      (r) => r.status === "failed"
    ).length;
    const skippedTests = this.testResults.filter(
      (r) => r.status === "skipped"
    ).length;

    // 评估系统状态
    const systemStatus = {
      edgeFunctionsStatus: this.getComponentStatus(["Edge Functions执行测试"]),
      databaseStatus: this.getComponentStatus([
        "系统基础设施检查",
        "数据一致性验证",
      ]),
      notificationStatus: this.getComponentStatus(["实时通知系统测试"]),
      trackingStatus: this.getComponentStatus(["追踪系统测试"]),
    };

    // 生成建议
    const recommendations = this.generateRecommendations();

    return {
      testSuiteId: this.testSuiteId,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalDuration,
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      skippedTests,
      testResults: this.testResults,
      systemStatus,
      recommendations,
    };
  }

  // 获取组件状态
  private getComponentStatus(
    testNames: string[]
  ): "healthy" | "unhealthy" | "unknown" {
    const relevantTests = this.testResults.filter((r) =>
      testNames.some((name) => r.testName.includes(name))
    );

    if (relevantTests.length === 0) return "unknown";

    const failedCount = relevantTests.filter(
      (r) => r.status === "failed"
    ).length;
    return failedCount === 0 ? "healthy" : "unhealthy";
  }

  // 生成改进建议
  private generateRecommendations(): string[] {
    const recommendations = [];
    const failedTests = this.testResults.filter((r) => r.status === "failed");

    if (failedTests.length === 0) {
      recommendations.push("🎉 所有测试通过！预警系统运行正常。");
    } else {
      recommendations.push(`⚠️  发现 ${failedTests.length} 个问题需要解决。`);

      failedTests.forEach((test) => {
        if (test.testName.includes("Edge Functions")) {
          recommendations.push("🔧 检查Edge Functions部署状态和权限配置");
        } else if (test.testName.includes("自动触发")) {
          recommendations.push("🔧 检查数据库触发器和队列处理机制");
        } else if (test.testName.includes("通知")) {
          recommendations.push("🔧 检查通知模板配置和实时连接状态");
        } else if (test.testName.includes("追踪")) {
          recommendations.push("🔧 检查追踪服务和数据库记录功能");
        } else if (test.testName.includes("性能")) {
          recommendations.push("🔧 检查数据库函数和缓存配置");
        }
      });
    }

    // 性能建议
    const avgDuration =
      this.testResults.reduce((sum, r) => sum + r.duration, 0) /
      this.testResults.length;
    if (avgDuration > 2000) {
      recommendations.push("⚡ 考虑优化响应时间，平均测试耗时较长");
    }

    return recommendations;
  }
}

// 导出便捷函数
export async function runQuickIntegrationTest() {
  const tester = new WarningSystemIntegrationTester();
  return await tester.runFullIntegrationTest({
    testDataCount: 3,
    cleanupAfterTest: true,
    testRealTimeNotifications: false, // 快速测试跳过通知
    testPerformance: false, // 快速测试跳过性能测试
  });
}

export async function runComprehensiveIntegrationTest() {
  const tester = new WarningSystemIntegrationTester();
  return await tester.runFullIntegrationTest({
    testDataCount: 10,
    cleanupAfterTest: true,
    testRealTimeNotifications: true,
    testPerformance: true,
  });
}
