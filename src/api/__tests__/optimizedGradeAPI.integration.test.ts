/**
 * 🧪 OptimizedGradeAPI 集成测试
 *
 * 测试重点：
 * - RPC函数调用优化
 * - 重试机制验证
 * - 缓存性能测试
 * - 数据预取功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fetchOptimizedGradeData,
  clearGradeDataCache,
  prefetchGradeData,
  checkDataFreshness,
} from "../optimizedGradeAPI";
import { cleanTestData, insertTestData } from "@/test/db-setup";
import { generateStudents } from "@/test/generators/studentGenerator";
import { generateExam } from "@/test/generators/examGenerator";
import { generateGradesForStudents } from "@/test/generators/gradeGenerator";
import { supabase } from "@/lib/supabase";

describe("OptimizedGradeAPI Integration Tests", () => {
  let testExamId: string;

  beforeEach(async () => {
    // 清理测试数据
    await cleanTestData(["grade_data", "exams", "students"]);

    // 清理缓存
    await clearGradeDataCache();
  });

  afterEach(async () => {
    // 恢复所有mock
    vi.restoreAllMocks();

    // 测试后清理
    await cleanTestData(["grade_data", "exams", "students"]);
  });

  describe("fetchOptimizedGradeData - RPC优化查询", () => {
    beforeEach(async () => {
      // 准备测试数据
      const students = generateStudents(50, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "RPC测试考试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math"],
      });
      await insertTestData("grade_data", grades);
    });

    it("应使用RPC函数获取数据", async () => {
      // Mock RPC调用以验证是否被调用
      const rpcSpy = vi.spyOn(supabase, "rpc");

      const result = await fetchOptimizedGradeData(testExamId, {
        class_name: "高一(1)班",
      });

      // 验证RPC被调用
      expect(rpcSpy).toHaveBeenCalledWith(
        "get_grade_data_optimized",
        expect.objectContaining({
          p_exam_id: testExamId,
          p_class_filter: "高一(1)班",
        })
      );

      // 验证返回数据
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("RPC失败时应降级到普通查询", async () => {
      // Mock RPC失败
      const rpcSpy = vi
        .spyOn(supabase, "rpc")
        .mockRejectedValueOnce(new Error("RPC function not available"));

      const result = await fetchOptimizedGradeData(testExamId);

      // 验证RPC被尝试调用
      expect(rpcSpy).toHaveBeenCalled();

      // 应该成功返回数据（通过降级查询）
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("应正确应用筛选条件", async () => {
      const result = await fetchOptimizedGradeData(testExamId, {
        class_name: "高一(1)班",
        subject: "chinese",
      });

      expect(result.data).toBeDefined();
      if (result.data.length > 0) {
        // 验证所有数据都符合筛选条件
        expect(
          result.data.every(
            (record) =>
              record.class_name === "高一(1)班" && record.subject === "chinese"
          )
        ).toBe(true);
      }
    });
  });

  describe("Retry Mechanism - 重试机制", () => {
    it("应在临时失败时重试", async () => {
      let attemptCount = 0;

      // Mock前2次失败，第3次成功
      const fromSpy = vi.spyOn(supabase, "from").mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Temporary database error");
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      });

      const result = await fetchOptimizedGradeData("test-exam-id");

      // 验证重试了2次（总共3次尝试）
      expect(attemptCount).toBe(3);

      // 最终应该成功
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("应在达到最大重试次数后返回错误", async () => {
      // Mock持续失败
      vi.spyOn(supabase, "from").mockImplementation(() => {
        throw new Error("Persistent database error");
      });

      const result = await fetchOptimizedGradeData("test-exam-id");

      // 应该返回错误
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Persistent database error");
    });

    it("应使用指数退避策略", async () => {
      const startTime = Date.now();
      let attemptTimes: number[] = [];

      // Mock失败并记录时间
      vi.spyOn(supabase, "from").mockImplementation(() => {
        attemptTimes.push(Date.now());
        throw new Error("Test error");
      });

      await fetchOptimizedGradeData("test-exam-id");

      // 验证重试间隔递增
      if (attemptTimes.length >= 3) {
        const interval1 = attemptTimes[1] - attemptTimes[0];
        const interval2 = attemptTimes[2] - attemptTimes[1];

        // 第二次重试间隔应大于第一次
        expect(interval2).toBeGreaterThan(interval1);
      }
    }, 15000); // 延长超时时间以容纳重试延迟
  });

  describe("Cache Performance - 缓存性能", () => {
    beforeEach(async () => {
      // 准备较大数据集以测试缓存效果
      const students = generateStudents(100, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "缓存性能测试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math", "english"],
      });
      await insertTestData("grade_data", grades);
    });

    it("缓存命中应显著提升性能", async () => {
      // 第一次查询（无缓存）
      const start1 = Date.now();
      const result1 = await fetchOptimizedGradeData(testExamId);
      const time1 = Date.now() - start1;

      // 等待一小段时间
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 第二次查询（缓存命中）
      const start2 = Date.now();
      const result2 = await fetchOptimizedGradeData(testExamId);
      const time2 = Date.now() - start2;

      // 缓存查询应至少快50%
      expect(time2).toBeLessThan(time1 * 0.5);

      // 数据应一致
      expect(result2.data).toEqual(result1.data);
    });

    it("clearGradeDataCache应清除特定考试缓存", async () => {
      // 先查询并缓存
      const result1 = await fetchOptimizedGradeData(testExamId);
      expect(result1.data).toBeDefined();

      // 清除缓存
      await clearGradeDataCache(testExamId);

      // 再次查询（应重新获取数据）
      const start = Date.now();
      const result2 = await fetchOptimizedGradeData(testExamId);
      const time = Date.now() - start;

      // 查询时间应接近第一次（说明缓存已清除）
      expect(time).toBeGreaterThan(50); // 非缓存查询至少需要50ms
      expect(result2.data).toEqual(result1.data);
    });

    it("不同考试应有独立缓存", async () => {
      // 创建第二个考试
      const exam2 = generateExam({ title: "第二个考试" });
      await insertTestData("exams", [exam2]);

      const students = generateStudents(20, {
        classNames: ["高一(1)班"],
      });
      const grades2 = generateGradesForStudents(students, {
        exam: exam2,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades2);

      // 查询两个考试
      await fetchOptimizedGradeData(testExamId);
      await fetchOptimizedGradeData(exam2.id);

      // 清除第一个考试的缓存
      await clearGradeDataCache(testExamId);

      // 第二个考试的缓存应该还在
      const start = Date.now();
      await fetchOptimizedGradeData(exam2.id);
      const time = Date.now() - start;

      // 应该很快（缓存命中）
      expect(time).toBeLessThan(50);
    });
  });

  describe("Prefetch - 数据预取", () => {
    it("应预取多个考试数据", async () => {
      // 创建3个考试
      const exams = [
        generateExam({ title: "考试1" }),
        generateExam({ title: "考试2" }),
        generateExam({ title: "考试3" }),
      ];
      await insertTestData("exams", exams);

      const students = generateStudents(30, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      // 为每个考试生成成绩
      for (const exam of exams) {
        const grades = generateGradesForStudents(students, {
          exam,
          subjects: ["chinese"],
        });
        await insertTestData("grade_data", grades);
      }

      const examIds = exams.map((e) => e.id);

      // 预取数据
      await prefetchGradeData(examIds);

      // 验证：后续查询应全部命中缓存
      for (const examId of examIds) {
        const start = Date.now();
        const result = await fetchOptimizedGradeData(examId);
        const time = Date.now() - start;

        // 缓存查询应非常快
        expect(time).toBeLessThan(10);
        expect(result.data).toBeDefined();
      }
    });

    it("预取应支持筛选条件", async () => {
      const exam = generateExam({ title: "预取筛选测试" });
      await insertTestData("exams", [exam]);

      const students = generateStudents(20, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math"],
      });
      await insertTestData("grade_data", grades);

      // 预取特定科目数据
      await prefetchGradeData([exam.id], {
        subject: "chinese",
      });

      // 查询应命中缓存
      const start = Date.now();
      const result = await fetchOptimizedGradeData(exam.id, {
        subject: "chinese",
      });
      const time = Date.now() - start;

      expect(time).toBeLessThan(10);
      expect(result.data.every((r) => r.subject === "chinese")).toBe(true);
    });
  });

  describe("Data Freshness - 数据新鲜度", () => {
    it("应检测数据是否过期", async () => {
      const exam = generateExam({ title: "新鲜度测试" });
      await insertTestData("exams", [exam]);

      const students = generateStudents(10, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades);

      const freshness = await checkDataFreshness(exam.id);

      // 验证返回的数据结构
      expect(freshness).toHaveProperty("isFresh");
      expect(freshness).toHaveProperty("lastUpdated");
      expect(typeof freshness.isFresh).toBe("boolean");

      // 刚插入的数据应该是新鲜的
      expect(freshness.isFresh).toBe(true);
    });

    it("应返回最后更新时间", async () => {
      const exam = generateExam({ title: "更新时间测试" });
      await insertTestData("exams", [exam]);

      const students = generateStudents(5, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const beforeInsert = new Date();

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades);

      const afterInsert = new Date();

      const freshness = await checkDataFreshness(exam.id);

      // 最后更新时间应在插入前后之间
      const lastUpdated = new Date(freshness.lastUpdated);
      expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(
        beforeInsert.getTime()
      );
      expect(lastUpdated.getTime()).toBeLessThanOrEqual(
        afterInsert.getTime() + 1000
      ); // 允许1秒误差
    });
  });

  describe("Performance Benchmarks - 性能基准", () => {
    it("100学生查询应在500ms内完成（无缓存）", async () => {
      const students = generateStudents(100, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "性能测试" });
      await insertTestData("exams", [exam]);

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math", "english"],
      });
      await insertTestData("grade_data", grades);

      // 清除缓存确保测试无缓存性能
      await clearGradeDataCache(exam.id);

      const start = Date.now();
      const result = await fetchOptimizedGradeData(exam.id);
      const time = Date.now() - start;

      expect(result.data).toBeDefined();
      expect(time).toBeLessThan(500);
    });

    it("缓存查询应在50ms内完成", async () => {
      const students = generateStudents(50, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "缓存性能测试" });
      await insertTestData("exams", [exam]);

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades);

      // 第一次查询建立缓存
      await fetchOptimizedGradeData(exam.id);

      // 第二次查询测试缓存性能
      const start = Date.now();
      const result = await fetchOptimizedGradeData(exam.id);
      const time = Date.now() - start;

      expect(result.data).toBeDefined();
      expect(time).toBeLessThan(50);
    });
  });

  describe("Error Scenarios - 错误场景", () => {
    it("应处理不存在的考试ID", async () => {
      const result = await fetchOptimizedGradeData("nonexistent-exam-id-99999");

      // 应返回空数据而不是错误
      expect(result.data).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it("应处理数据库连接失败", async () => {
      // Mock数据库连接失败
      vi.spyOn(supabase, "from").mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const result = await fetchOptimizedGradeData("test-exam-id");

      // 应返回错误信息
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Database connection failed");
    });

    it("应处理无效的筛选条件", async () => {
      const exam = generateExam({ title: "错误测试" });
      await insertTestData("exams", [exam]);

      // 使用无效的筛选条件
      const result = await fetchOptimizedGradeData(exam.id, {
        invalid_field: "invalid_value",
      } as any);

      // 应该优雅处理（忽略无效字段或返回错误）
      expect(result.data !== undefined || result.error !== undefined).toBe(
        true
      );
    });
  });
});
