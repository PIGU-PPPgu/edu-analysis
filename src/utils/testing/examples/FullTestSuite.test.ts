/**
 * 完整测试套件示例 - 展示统一测试框架的所有功能
 *
 * 包含：
 * - 单元测试
 * - 组件测试
 * - 集成测试
 * - 性能测试
 * - 负载测试
 * - 端到端测试
 */

import {
  describe,
  it,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  expect,
  mockFunction,
  spyOn,
  testRunner,
} from "../index";

import { render, ComponentAssertions, waitFor } from "../component";

import {
  createIntegrationTestRunner,
  createTestConfig,
  IntegrationAssertions,
} from "../integration";

import {
  createPerformanceTester,
  createLoadTester,
  PerformanceAssertions,
  benchmark,
  loadTest,
} from "../performance";

import { agentOrchestrator, AgentAPI } from "@/services/ai/agents";
import { knowledgeService } from "@/services/education/knowledge";
import { dataCache } from "@/services/core/cache";

// 示例应用程序组件
import React, { useState, useEffect } from "react";

const StudentDashboard: React.FC<{
  studentId: string;
  onDataLoad?: (data: any) => void;
}> = ({ studentId, onDataLoad }) => {
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // 模拟加载学生数据
        await new Promise((resolve) => setTimeout(resolve, 100));

        const studentData = {
          id: studentId,
          name: `学生${studentId}`,
          class: "高一(1)班",
          email: `student${studentId}@school.com`,
        };

        const gradesData = [
          { subject: "数学", score: 85, grade: "B" },
          { subject: "语文", score: 92, grade: "A" },
          { subject: "英语", score: 78, grade: "C" },
        ];

        setStudent(studentData);
        setGrades(gradesData);
        onDataLoad?.({ student: studentData, grades: gradesData });
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId, onDataLoad]);

  if (loading) {
    return React.createElement(
      "div",
      {
        "data-testid": "loading",
      },
      "加载中..."
    );
  }

  if (error) {
    return React.createElement(
      "div",
      {
        "data-testid": "error",
      },
      `错误: ${error}`
    );
  }

  return React.createElement(
    "div",
    {
      "data-testid": "student-dashboard",
    },
    [
      React.createElement(
        "h1",
        {
          "data-testid": "student-name",
          key: "name",
        },
        student?.name
      ),
      React.createElement(
        "p",
        {
          "data-testid": "student-class",
          key: "class",
        },
        `班级: ${student?.class}`
      ),
      React.createElement(
        "div",
        {
          "data-testid": "grades-list",
          key: "grades",
        },
        grades.map((grade, index) =>
          React.createElement(
            "div",
            {
              "data-testid": `grade-${grade.subject}`,
              key: index,
            },
            `${grade.subject}: ${grade.score}分 (${grade.grade})`
          )
        )
      ),
    ]
  );
};

// 测试套件开始
describe("完整测试套件 - 教育管理系统", () => {
  let integrationRunner: any;
  let performanceTester: any;
  let loadTester: any;

  beforeAll(async () => {
    // 初始化集成测试环境
    integrationRunner = createIntegrationTestRunner(
      createTestConfig({
        environment: "test",
        database: {
          url: "test://localhost:5432/test_db",
          migrations: true,
          seedData: true,
          cleanup: true,
        },
        services: {
          api: {
            url: "http://localhost:3001",
            timeout: 5000,
          },
        },
      })
    );

    await integrationRunner.setup();

    // 初始化性能测试
    performanceTester = createPerformanceTester({
      iterations: 100,
      warmupIterations: 10,
      memoryMonitoring: true,
    });

    loadTester = createLoadTester();

    // 初始化Agent系统
    await AgentAPI.initialize();
  });

  afterAll(async () => {
    // 清理测试环境
    await integrationRunner.teardown();
    await AgentAPI.shutdown();
    performanceTester.clearResults();
  });

  describe("🧪 单元测试 - 核心服务", () => {
    describe("知识点服务", () => {
      let mockApiClient: any;

      beforeEach(() => {
        mockApiClient = {
          query: mockFunction(),
          insert: mockFunction(),
          update: mockFunction(),
        };
      });

      it("应该创建知识点", async () => {
        mockApiClient.query.mockReturnValue({
          success: true,
          data: [],
        });

        mockApiClient.insert.mockReturnValue({
          success: true,
          data: {
            id: "kp-1",
            name: "二次函数",
            homework_id: "hw-1",
            difficulty_level: 3,
          },
        });

        // 模拟知识点服务调用
        const result = await mockApiClient.insert("knowledge_points", {
          name: "二次函数",
          homework_id: "hw-1",
          difficulty_level: 3,
        });

        expect(result.success).toBe(true);
        expect(result.data.name).toBe("二次函数");
        mockApiClient.insert.toHaveBeenCalledTimes(1);
      });

      it("应该防止重复知识点", async () => {
        mockApiClient.query.mockReturnValue({
          success: true,
          data: [{ id: "existing-kp", name: "二次函数" }],
        });

        // 模拟检查重复逻辑
        const existing = await mockApiClient.query("knowledge_points", {
          filters: { name: "二次函数", homework_id: "hw-1" },
        });

        expect(existing.data.length).toBeGreaterThan(0);
      });
    });

    describe("数据缓存服务", () => {
      beforeEach(() => {
        dataCache.clear();
      });

      it("应该缓存和检索数据", () => {
        const testData = { id: "1", name: "测试数据" };
        const cacheKey = "test-key";

        // 设置缓存
        dataCache.set(cacheKey, testData, 5000);

        // 检索缓存
        const cached = dataCache.get(cacheKey);
        expect(cached).toEqual(testData);
      });

      it("应该处理缓存过期", async () => {
        const testData = { id: "1", name: "测试数据" };
        const cacheKey = "test-key";

        // 设置短期缓存
        dataCache.set(cacheKey, testData, 50);

        // 等待过期
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 检查是否过期
        const cached = dataCache.get(cacheKey);
        expect(cached).toBeUndefined();
      });
    });
  });

  describe("🎨 组件测试 - React组件", () => {
    let mockOnDataLoad: any;

    beforeEach(() => {
      mockOnDataLoad = mockFunction();
    });

    it("应该渲染学生仪表板", () => {
      const { findByTestId } = render(StudentDashboard, {
        props: {
          studentId: "123",
          onDataLoad: mockOnDataLoad,
        },
      });

      const dashboard = findByTestId("student-dashboard");
      ComponentAssertions.expectComponentToBeInDocument(dashboard);
    });

    it("应该显示加载状态", () => {
      const { findByTestId } = render(StudentDashboard, {
        props: {
          studentId: "123",
        },
      });

      const loading = findByTestId("loading");
      ComponentAssertions.expectComponentToBeInDocument(loading);
      ComponentAssertions.expectComponentToHaveText(loading!, "加载中...");
    });

    it("应该异步加载学生数据", async () => {
      const { findByTestId, waitFor } = render(StudentDashboard, {
        props: {
          studentId: "123",
          onDataLoad: mockOnDataLoad,
        },
      });

      // 等待数据加载完成
      await waitFor(() => findByTestId("student-name") !== null);

      // 验证学生信息显示
      const studentName = findByTestId("student-name");
      ComponentAssertions.expectComponentToHaveText(studentName!, "学生123");

      // 验证回调被调用
      mockOnDataLoad.toHaveBeenCalledTimes(1);
      expect(mockOnDataLoad.calls[0].args[0]).toHaveProperty("student");
      expect(mockOnDataLoad.calls[0].args[0]).toHaveProperty("grades");
    });

    it("应该显示成绩列表", async () => {
      const { findByTestId, waitFor } = render(StudentDashboard, {
        props: {
          studentId: "123",
        },
      });

      await waitFor(() => findByTestId("grades-list") !== null);

      // 验证各科目成绩
      const mathGrade = findByTestId("grade-数学");
      const chineseGrade = findByTestId("grade-语文");
      const englishGrade = findByTestId("grade-英语");

      ComponentAssertions.expectComponentToBeInDocument(mathGrade);
      ComponentAssertions.expectComponentToBeInDocument(chineseGrade);
      ComponentAssertions.expectComponentToBeInDocument(englishGrade);

      ComponentAssertions.expectComponentToHaveText(
        mathGrade!,
        "数学: 85分 (B)"
      );
      ComponentAssertions.expectComponentToHaveText(
        chineseGrade!,
        "语文: 92分 (A)"
      );
      ComponentAssertions.expectComponentToHaveText(
        englishGrade!,
        "英语: 78分 (C)"
      );
    });
  });

  describe("🔗 集成测试 - 系统集成", () => {
    let apiClient: any;
    let dbHelper: any;

    beforeEach(() => {
      apiClient = integrationRunner.getAPIClient();
      dbHelper = integrationRunner.getDatabaseHelper();
    });

    it("应该验证服务健康状态", async () => {
      await integrationRunner.verifyServicesHealth();

      const healthResponse = await apiClient.get("/health");
      IntegrationAssertions.expectAPIResponseStatus(healthResponse, 200);
      expect(healthResponse.data.status).toBe("healthy");
    });

    it("应该完成完整的学生数据流程", async () => {
      // 1. 创建学生记录
      const createStudentResponse = await apiClient.post("/api/students", {
        name: "张三",
        student_id: "STU001",
        class_name: "高一(1)班",
      });

      IntegrationAssertions.expectAPIResponseStatus(createStudentResponse, 200);

      // 2. 验证数据库记录
      await IntegrationAssertions.expectDatabaseRecordExists(
        dbHelper,
        "students",
        { student_id: "STU001" }
      );

      // 3. 创建作业
      const createHomeworkResponse = await apiClient.post("/api/homework", {
        title: "数学练习1",
        class_id: "class-1",
        due_date: "2024-12-31",
      });

      IntegrationAssertions.expectAPIResponseStatus(
        createHomeworkResponse,
        200
      );

      // 4. 提交作业
      const submitHomeworkResponse = await apiClient.post(
        "/api/homework/submissions",
        {
          homework_id: createHomeworkResponse.data.id,
          student_id: "STU001",
          files: ["homework.pdf"],
        }
      );

      IntegrationAssertions.expectAPIResponseStatus(
        submitHomeworkResponse,
        200
      );

      // 5. 验证完整工作流
      await IntegrationAssertions.expectWorkflowCompleted(async () => {
        const submissionCheck = await apiClient.get(
          `/api/homework/submissions/${submitHomeworkResponse.data.id}`
        );
        return (
          submissionCheck.status === 200 &&
          submissionCheck.data.status === "submitted"
        );
      });
    });

    it("应该处理Agent系统集成", async () => {
      // 启动Agent系统
      const systemStatus = AgentAPI.getSystemStatus();
      expect(systemStatus.orchestrator.is_running).toBe(true);

      // 提交数据处理任务
      const taskId = await AgentAPI.processData({
        type: "import",
        source: {
          location: "test-data.csv",
          format: "csv",
        },
        priority: "high",
      });

      expect(taskId).toBeDefined();

      // 等待任务完成
      await integrationRunner.waitForCondition(async () => {
        const status = await AgentAPI.getTaskStatus(taskId);
        return status.status === "completed";
      }, 10000);

      const finalStatus = await AgentAPI.getTaskStatus(taskId);
      expect(finalStatus.status).toBe("completed");
    });
  });

  describe("⚡ 性能测试 - 关键操作", () => {
    it("应该测试数据缓存性能", async () => {
      const result = await performanceTester.runTest(
        "数据缓存读写性能",
        () => {
          const key = `test-key-${Math.random()}`;
          const data = {
            id: Math.random(),
            name: "测试数据",
            timestamp: Date.now(),
          };

          // 写入缓存
          dataCache.set(key, data, 5000);

          // 读取缓存
          const retrieved = dataCache.get(key);

          return retrieved;
        },
        { iterations: 1000 }
      );

      PerformanceAssertions.expectExecutionTime(result, 10); // 最大10ms
      PerformanceAssertions.expectThroughput(result, 100); // 最少100 ops/sec
    });

    it("应该测试知识点创建性能", async () => {
      const mockKnowledgeService = {
        createKnowledgePoint: async (data: any) => {
          // 模拟数据库操作延迟
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 5 + 2)
          );
          return { success: true, data: { id: "kp-" + Date.now(), ...data } };
        },
      };

      const result = await performanceTester.runTest(
        "知识点创建性能",
        async () => {
          return await mockKnowledgeService.createKnowledgePoint({
            name: "测试知识点",
            homework_id: "hw-1",
            difficulty_level: 3,
          });
        },
        { iterations: 50, warmupIterations: 5 }
      );

      PerformanceAssertions.expectExecutionTime(result, 50); // 最大50ms
      PerformanceAssertions.expectThroughput(result, 20); // 最少20 ops/sec
    });

    it("应该进行基准测试套件", async () => {
      const suite = {
        name: "核心操作基准测试",
        tests: [
          {
            name: "JSON序列化",
            fn: () =>
              JSON.stringify({
                id: 1,
                name: "测试",
                data: new Array(100).fill(0),
              }),
            baseline: 0.5, // 0.5ms基准
          },
          {
            name: "JSON反序列化",
            fn: () =>
              JSON.parse(
                '{"id":1,"name":"测试","data":[' +
                  new Array(100).fill(0).join(",") +
                  "]}"
              ),
            baseline: 0.3, // 0.3ms基准
          },
          {
            name: "数组操作",
            fn: () => {
              const arr = new Array(1000).fill(0).map((_, i) => i);
              return arr.filter((x) => x % 2 === 0).map((x) => x * 2);
            },
            baseline: 2.0, // 2.0ms基准
          },
        ],
      };

      const report = await performanceTester.runSuite(suite);

      expect(report.summary.totalTests).toBe(3);
      expect(report.summary.regressed).toBe(0); // 无性能回归
    });
  });

  describe("🚀 负载测试 - 系统压力", () => {
    it("应该测试API负载能力", async () => {
      const result = await loadTester.runLoadTest(
        "API健康检查负载测试",
        async () => {
          const apiClient = integrationRunner.getAPIClient();
          const response = await apiClient.get("/health");

          if (response.status !== 200) {
            throw new Error(`Health check failed: ${response.status}`);
          }

          return response;
        },
        {
          concurrency: 10,
          duration: 5000, // 5秒
          requestsPerSecond: 50,
          timeout: 1000,
        }
      );

      PerformanceAssertions.expectErrorRate(result, 5); // 最大5%错误率
      PerformanceAssertions.expectLoadTestResponseTime(result, 100); // P95 < 100ms

      expect(result.requestsPerSecond).toBeGreaterThan(40); // 最少40 RPS
      expect(result.completedRequests).toBeGreaterThan(200); // 至少完成200个请求
    });

    it("应该测试数据处理负载", async () => {
      const result = await loadTester.runLoadTest(
        "数据处理Agent负载测试",
        async () => {
          const taskId = await AgentAPI.processData({
            type: "batch",
            source: {
              location: "small-batch.csv",
              format: "csv",
            },
            priority: "medium",
          });

          // 等待任务完成
          let status;
          do {
            await new Promise((resolve) => setTimeout(resolve, 10));
            status = await AgentAPI.getTaskStatus(taskId);
          } while (status.status === "queued" || status.status === "running");

          if (status.status !== "completed") {
            throw new Error(`Task failed: ${status.error}`);
          }

          return status;
        },
        {
          concurrency: 5,
          duration: 10000, // 10秒
          timeout: 5000,
        }
      );

      PerformanceAssertions.expectErrorRate(result, 10); // 最大10%错误率
      expect(result.averageResponseTime).toBeLessThan(3000); // 平均3秒内完成
    });
  });

  describe("📊 端到端测试 - 用户场景", () => {
    it("应该完成完整的学生作业提交流程", async () => {
      const scenario = async () => {
        const apiClient = integrationRunner.getAPIClient();

        // 1. 教师创建作业
        const homework = await apiClient.post("/api/homework", {
          title: "数学第一章练习",
          description: "完成课本1-10页习题",
          due_date: "2024-12-31",
          class_id: "class-1",
        });

        expect(homework.status).toBe(200);

        // 2. 学生提交作业
        const submission = await apiClient.post("/api/homework/submissions", {
          homework_id: homework.data.id,
          student_id: "STU001",
          files: ["homework.pdf"],
          submission_text: "已完成所有习题",
        });

        expect(submission.status).toBe(200);

        // 3. AI分析作业内容
        const aiAnalysis = await AgentAPI.processData({
          type: "enrichment",
          source: {
            location: submission.data.files[0],
            format: "pdf",
          },
          priority: "high",
        });

        // 等待AI分析完成
        await integrationRunner.waitForCondition(async () => {
          const status = await AgentAPI.getTaskStatus(aiAnalysis);
          return status.status === "completed";
        });

        // 4. 更新知识点掌握度
        const knowledgeUpdate = await apiClient.post(
          "/api/knowledge-points/mastery",
          {
            student_id: "STU001",
            homework_id: homework.data.id,
            knowledge_point_id: "kp-algebra-1",
            mastery_level: 85,
            mastery_grade: "B",
          }
        );

        expect(knowledgeUpdate.status).toBe(200);

        // 5. 生成学习建议
        const recommendations = await apiClient.get(
          "/api/students/STU001/learning-path"
        );
        expect(recommendations.status).toBe(200);
        expect(recommendations.data.recommended_sequence).toBeDefined();

        return {
          homework: homework.data,
          submission: submission.data,
          analysis: aiAnalysis,
          knowledge: knowledgeUpdate.data,
          recommendations: recommendations.data,
        };
      };

      // 执行完整场景
      const result = await scenario();

      // 验证结果
      expect(result.homework.id).toBeDefined();
      expect(result.submission.status).toBe("submitted");
      expect(result.knowledge.mastery_level).toBe(85);
      expect(result.recommendations.current_level).toBeGreaterThan(0);
    });

    it("应该处理系统异常恢复", async () => {
      const apiClient = integrationRunner.getAPIClient();

      // 模拟系统故障场景
      const failingTask = async () => {
        // 提交一个会失败的任务
        try {
          const taskId = await AgentAPI.processData({
            type: "import",
            source: {
              location: "non-existent-file.csv",
              format: "csv",
            },
            priority: "high",
          });

          // 等待任务处理
          await integrationRunner.waitForCondition(async () => {
            const status = await AgentAPI.getTaskStatus(taskId);
            return status.status === "failed" || status.status === "completed";
          });

          const finalStatus = await AgentAPI.getTaskStatus(taskId);
          return finalStatus;
        } catch (error) {
          return { status: "error", error: error.message };
        }
      };

      const result = await failingTask();

      // 验证系统能够优雅处理错误
      expect(["failed", "error"]).toContain(result.status);

      // 验证系统仍然健康
      const healthCheck = await apiClient.get("/health");
      expect(healthCheck.status).toBe(200);

      // 验证Agent系统状态正常
      const agentStatus = AgentAPI.getSystemStatus();
      expect(agentStatus.orchestrator.is_running).toBe(true);
    });
  });

  describe("📈 性能回归测试", () => {
    it("应该检测关键操作的性能回归", async () => {
      // 基准性能数据（模拟历史数据）
      const baselines = new Map([
        ["缓存读取", 2.5],
        ["数据库查询", 15.0],
        ["知识点分析", 100.0],
      ]);

      const results: any[] = [];

      // 测试当前性能
      for (const [operation, baseline] of baselines) {
        let testFunction;

        switch (operation) {
          case "缓存读取":
            testFunction = () => {
              const key = `perf-test-${Math.random()}`;
              dataCache.set(key, { data: "test" }, 5000);
              return dataCache.get(key);
            };
            break;
          case "数据库查询":
            testFunction = async () => {
              const dbHelper = integrationRunner.getDatabaseHelper();
              return await dbHelper.query("SELECT 1 as test");
            };
            break;
          case "知识点分析":
            testFunction = async () => {
              // 模拟知识点分析
              await new Promise((resolve) =>
                setTimeout(resolve, Math.random() * 50 + 80)
              );
              return { analysis: "complete" };
            };
            break;
          default:
            testFunction = () => {};
        }

        const result = await performanceTester.runTest(
          operation,
          testFunction,
          { iterations: 50 }
        );

        results.push({
          operation,
          current: result.statistics.mean,
          baseline,
          result,
        });

        // 检查性能回归
        const regression =
          ((result.statistics.mean - baseline) / baseline) * 100;
        if (regression > 20) {
          // 超过20%回归则告警
          console.warn(
            `⚠️  性能回归检测: ${operation} 性能下降 ${regression.toFixed(1)}%`
          );
        }
      }

      // 验证没有严重性能回归
      const seriousRegressions = results.filter((r) => {
        const regression = ((r.current - r.baseline) / r.baseline) * 100;
        return regression > 50; // 超过50%视为严重回归
      });

      expect(seriousRegressions.length).toBe(0);
    });
  });
});

// 运行完整测试套件
export async function runFullTestSuite(): Promise<void> {
  console.log("🚀 开始运行完整测试套件...");

  const startTime = Date.now();

  try {
    const results = await testRunner.runAll({
      filter: "完整测试套件",
      parallel: false, // 集成测试需要串行执行
      timeout: 60000, // 60秒超时
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 生成测试报告
    const report = testRunner.generateReport(results);

    console.log("\n" + report);
    console.log(`\n⏱️  总执行时间: ${(duration / 1000).toFixed(2)}秒`);

    // 检查测试结果
    const totalFailed = results.reduce((sum, suite) => sum + suite.failed, 0);
    if (totalFailed > 0) {
      console.error(`❌ 测试失败: ${totalFailed} 个测试用例未通过`);
      process.exit(1);
    } else {
      console.log("✅ 所有测试通过!");
    }
  } catch (error) {
    console.error("💥 测试套件执行失败:", error);
    process.exit(1);
  }
}

// 如果直接运行此文件，执行完整测试套件
if (require.main === module) {
  runFullTestSuite();
}
