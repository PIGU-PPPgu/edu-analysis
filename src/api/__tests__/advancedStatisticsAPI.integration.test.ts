/**
 * 🧪 AdvancedStatisticsAPI 集成测试
 *
 * 测试重点：
 * - 高级统计分析功能
 * - 缓存机制验证
 * - 复杂计算准确性
 * - 多维度分组统计
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AdvancedStatisticsAPI } from "../advancedStatisticsAPI";
import {
  StatisticMetric,
  PredictionModelType,
  AnomalyAlgorithm,
  BatchStatisticsRequest,
} from "@/types/advancedAnalysisAPI";
import { cleanTestData, insertTestData } from "@/test/db-setup";
import { generateStudentsByClassNames } from "@/test/generators/studentGenerator";
import { generateExam } from "@/test/generators/examGenerator";
import { generateGradesForStudents } from "@/test/generators/gradeGenerator";

describe("AdvancedStatisticsAPI Integration Tests", () => {
  let testExamId: string;

  beforeEach(async () => {
    // 清理测试数据
    await cleanTestData(["grade_data", "exams", "students"]);
  });

  afterEach(async () => {
    // 测试后清理
    await cleanTestData(["grade_data", "exams", "students"]);
  });

  describe("batchStatistics - 批量统计", () => {
    beforeEach(async () => {
      // 准备：3个班级，每班30人
      const students = generateStudentsByClassNames(90, {
        classNames: ["高一(1)班", "高一(2)班", "高一(3)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "批量统计测试考试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math", "english"],
        scoreRange: [60, 100],
      });
      await insertTestData("grade_data", grades);
    });

    it("应按班级分组统计成绩", async () => {
      // 执行：调用API
      const result = await AdvancedStatisticsAPI.batchStatistics({
        examIds: [testExamId],
        groupBy: ["class"],
        metrics: [StatisticMetric.MEAN, StatisticMetric.COUNT],
      });

      // 验证：
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.data).toBeDefined();
      expect(result.data!.data.length).toBeGreaterThanOrEqual(3); // 至少3个班级

      // 验证数据结构
      const firstGroup = result.data!.data[0];
      expect(firstGroup).toHaveProperty("groupValues");
      expect(firstGroup.groupValues).toHaveProperty("class");
      expect(firstGroup).toHaveProperty("metrics");

      // 验证数值合理性
      expect(firstGroup.metrics[StatisticMetric.MEAN]).toBeGreaterThan(0);
      expect(firstGroup.sampleSize).toBeGreaterThan(0);
    });

    it("应支持多维度分组（班级+科目）", async () => {
      const result = await AdvancedStatisticsAPI.batchStatistics({
        examIds: [testExamId],
        groupBy: ["class", "subject"],
        metrics: [StatisticMetric.MEAN],
      });

      expect(result.success).toBe(true);
      expect(result.data?.data).toBeDefined();

      // 验证：每个班级×每个科目都有统计
      // 3个班级 × 3个科目 = 9个分组
      expect(result.data!.data.length).toBeGreaterThanOrEqual(9);

      // 验证分组唯一性
      const uniqueGroups = new Set(
        result.data!.data.map(
          (d) => `${d.groupValues.class}-${d.groupValues.subject}`
        )
      );
      expect(uniqueGroups.size).toBe(result.data!.data.length);
    });

    it("应正确计算聚合指标（min/max/count）", async () => {
      const result = await AdvancedStatisticsAPI.batchStatistics({
        examIds: [testExamId],
        groupBy: ["class"],
        metrics: [
          StatisticMetric.MIN,
          StatisticMetric.MAX,
          StatisticMetric.COUNT,
        ],
      });

      expect(result.success).toBe(true);
      expect(result.data?.data).toBeDefined();

      result.data!.data.forEach((group) => {
        // 验证最小值 <= 最大值
        expect(group.metrics[StatisticMetric.MIN]).toBeLessThanOrEqual(
          group.metrics[StatisticMetric.MAX]
        );

        // 验证学生数量合理
        expect(group.sampleSize).toBeGreaterThan(0);

        // 验证分数在合理范围内
        expect(group.metrics[StatisticMetric.MIN]).toBeGreaterThanOrEqual(0);
        expect(group.metrics[StatisticMetric.MAX]).toBeLessThanOrEqual(150); // 某些科目满分150
      });
    });
  });

  describe("Cache Mechanism - 缓存机制测试", () => {
    beforeEach(async () => {
      // 准备基础测试数据
      const students = generateStudentsByClassNames(30, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "缓存测试考试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades);
    });

    it("第二次相同请求应使用缓存", async () => {
      const request: BatchStatisticsRequest = {
        examIds: [testExamId],
        groupBy: ["class"],
        metrics: [StatisticMetric.MEAN],
      };

      // 第一次请求
      const result1 = await AdvancedStatisticsAPI.batchStatistics(request);
      expect(result1.metadata?.cached).toBe(false);
      const time1 = result1.metadata?.executionTime || 0;

      // 等待一小段时间确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 第二次请求（应使用缓存）
      const result2 = await AdvancedStatisticsAPI.batchStatistics(request);
      expect(result2.metadata?.cached).toBe(true);
      const time2 = result2.metadata?.executionTime || 0;

      // 缓存查询应该更快
      expect(time2).toBeLessThan(time1);

      // 数据应完全一致
      expect(result2.data).toEqual(result1.data);
    });

    it("不同请求应分别缓存", async () => {
      const request1: BatchStatisticsRequest = {
        examIds: [testExamId],
        groupBy: ["class"],
        metrics: [StatisticMetric.MEAN],
      };

      const request2: BatchStatisticsRequest = {
        examIds: [testExamId],
        groupBy: ["subject"],
        metrics: [StatisticMetric.MEAN],
      };

      const result1 = await AdvancedStatisticsAPI.batchStatistics(request1);
      const result2 = await AdvancedStatisticsAPI.batchStatistics(request2);

      // 两个都不应该是缓存（首次请求）
      expect(result1.metadata?.cached).toBe(false);
      expect(result2.metadata?.cached).toBe(false);

      // 数据应不同（不同的分组维度）
      expect(result1.data).not.toEqual(result2.data);
    });

    it("缓存应在TTL后失效", async () => {
      const request: BatchStatisticsRequest = {
        examIds: [testExamId],
        groupBy: ["class"],
        metrics: [StatisticMetric.MEAN],
      };

      // 第一次请求
      const result1 = await AdvancedStatisticsAPI.batchStatistics(request, {
        enabled: true,
        ttl: 0.1, // 100ms
      });
      expect(result1.metadata?.cached).toBe(false);

      // 等待缓存过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 再次请求（缓存已过期，应重新计算）
      const result2 = await AdvancedStatisticsAPI.batchStatistics(request, {
        enabled: true,
        ttl: 0.1,
      });
      expect(result2.metadata?.cached).toBe(false);
    }, 10000); // 延长测试超时时间
  });

  describe("correlationAnalysis - 相关性分析", () => {
    beforeEach(async () => {
      // 准备：创建有相关性的成绩数据
      const students = generateStudentsByClassNames(50, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "相关性测试考试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      // 生成相关成绩（数学和物理高度相关）
      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math", "physics"],
        scoreRange: [60, 100],
      });
      await insertTestData("grade_data", grades);
    });

    it("应计算科目间相关系数", async () => {
      const result = await AdvancedStatisticsAPI.correlationAnalysis({
        variables: [
          { name: "chinese", source: "grade", field: "chinese_score" },
          { name: "math", source: "grade", field: "math_score" },
          { name: "physics", source: "grade", field: "physics_score" },
        ],
        method: "pearson",
      });

      expect(result.success).toBe(true);
      expect(result.data?.correlationMatrix).toBeDefined();

      // 验证矩阵维度
      const matrix = result.data!.correlationMatrix.values;
      expect(matrix.length).toBe(3); // 3×3矩阵
      expect(matrix[0].length).toBe(3);

      // 验证相关系数在[-1, 1]范围内
      matrix.forEach((row) => {
        row.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        });
      });

      // 验证对角线为1（自相关）
      expect(matrix[0][0]).toBeCloseTo(1, 2);
      expect(matrix[1][1]).toBeCloseTo(1, 2);
      expect(matrix[2][2]).toBeCloseTo(1, 2);
    });
  });

  describe("prediction - 预测分析", () => {
    beforeEach(async () => {
      const students = generateStudentsByClassNames(30, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "预测测试考试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["math"],
        scoreRange: [60, 100],
      });
      await insertTestData("grade_data", grades);
    });

    it("应使用线性回归进行成绩预测", async () => {
      const result = await AdvancedStatisticsAPI.prediction({
        modelType: PredictionModelType.LINEAR_REGRESSION,
        targetVariable: { field: "math_score" },
        features: ["study_hours", "previous_score"],
        trainingData: { examIds: [testExamId] },
        predictionScope: { students: [] },
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("model");
      expect(result.data).toHaveProperty("predictions");

      // 验证预测结果的合理性
      if (result.data?.predictions) {
        result.data.predictions.forEach((pred) => {
          expect(pred.predictions[0].value).toBeGreaterThanOrEqual(0);
          expect(pred.predictions[0].value).toBeLessThanOrEqual(150);
        });
      }
    });
  });

  describe("anomalyDetection - 异常检测", () => {
    it("应检测统计异常（Z-score方法）", async () => {
      // 准备：99个正常分数 + 1个极端异常
      const normalStudents = generateStudentsByClassNames(99, {
        classNames: ["高一(1)班"],
      });

      // 创建一个异常低分学生
      const anomalyStudent = generateStudentsByClassNames(1, {
        classNames: ["高一(1)班"],
      })[0];

      const allStudents = [...normalStudents, anomalyStudent];
      await insertTestData("students", allStudents);

      const exam = generateExam({ title: "异常检测测试" });
      await insertTestData("exams", [exam]);

      // 正常成绩：75分左右
      const normalGrades = generateGradesForStudents(normalStudents, {
        exam,
        subjects: ["chinese"],
        scoreRange: [70, 80],
      });

      // 异常成绩：30分（极端低分）
      const anomalyGrades = generateGradesForStudents([anomalyStudent], {
        exam,
        subjects: ["chinese"],
        scoreRange: [25, 35],
      });

      const allGrades = [...normalGrades, ...anomalyGrades];
      await insertTestData("grade_data", allGrades);

      // 执行异常检测
      const result = await AdvancedStatisticsAPI.anomalyDetection({
        algorithm: AnomalyAlgorithm.STATISTICAL,
        sensitivity: 0.95,
        scope: {
          examIds: [exam.id],
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.anomalies).toBeDefined();
      expect(result.data!.anomalies.length).toBeGreaterThan(0);

      // 验证检测到了极端低分
      const hasLowScore = result.data!.anomalies.some((a) => a.score < 40);
      expect(hasLowScore).toBe(true);
    });
  });

  describe("multiDimensionalAggregation - 多维聚合", () => {
    beforeEach(async () => {
      const students = generateStudentsByClassNames(60, {
        classNames: ["高一(1)班", "高一(2)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "多维聚合测试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math"],
        scoreRange: [60, 100],
      });
      await insertTestData("grade_data", grades);
    });

    it("应支持多维度复杂聚合", async () => {
      const result = await AdvancedStatisticsAPI.multiDimensionalAggregation({
        dimensions: [
          { field: "class", type: "categorical" as const },
          { field: "subject", type: "categorical" as const },
          { field: "time", type: "temporal" as const },
        ],
        metrics: [
          { field: "score", aggregation: "count" as const },
          { field: "score", aggregation: "avg" as const },
          { field: "score", aggregation: "sum" as const },
        ],
        filters: { exam_id: testExamId },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.data)).toBe(true);

      // 验证聚合结果存在
      if (result.data?.data && result.data.data.length > 0) {
        const firstItem = result.data.data[0];
        expect(firstItem).toBeDefined();
      }
    });
  });

  describe("Error Handling - 错误处理", () => {
    it("应处理空数据集", async () => {
      const result = await AdvancedStatisticsAPI.batchStatistics({
        examIds: ["nonexistent-exam-id-12345"],
        groupBy: ["class"],
        metrics: [StatisticMetric.MEAN],
      });

      expect(result.success).toBe(true);
      expect(result.data?.data).toEqual([]);
    });

    it("应验证请求参数", async () => {
      const result = await AdvancedStatisticsAPI.batchStatistics({
        groupBy: [], // 空分组（无效）
        metrics: [StatisticMetric.MEAN],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toContain("VALIDATION");
    });

    it("应优雅处理无效的聚合指标", async () => {
      // 准备基础数据
      const students = generateStudentsByClassNames(10, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "错误处理测试" });
      await insertTestData("exams", [exam]);

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades);

      const result = await AdvancedStatisticsAPI.batchStatistics({
        examIds: [exam.id],
        groupBy: ["class"],
        metrics: ["invalid_metric" as any], // 无效指标
      });

      // 应该返回错误或忽略无效指标
      expect(result.success).toBe(false);
    });
  });
});
