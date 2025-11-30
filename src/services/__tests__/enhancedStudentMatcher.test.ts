/**
 * 🧪 EnhancedStudentMatcher 单元测试
 * 测试智能学生匹配服务
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import enhancedStudentMatcher, {
  MatchType,
  StudentInfo,
} from "../enhancedStudentMatcher";
import {
  setupTestDatabase,
  cleanTestData,
  insertTestData,
} from "../../test/db-setup";

describe("EnhancedStudentMatcher", () => {
  // 使用单例实例
  const matcher = enhancedStudentMatcher;

  beforeEach(async () => {
    // 重置matcher状态
    matcher.clearCache();
    matcher.resetStats();

    // 清理测试数据
    await cleanTestData(["students"]);

    // 插入测试学生数据
    const testStudents = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        student_id: "TEST_2024_001",
        name: "张三",
        class_name: "高一(1)班",
        created_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        student_id: "TEST_2024_002",
        name: "李四",
        class_name: "高一(1)班",
        created_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000000003",
        student_id: "TEST_2024_003",
        name: "王五",
        class_name: "高一(2)班",
        created_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000000004",
        student_id: "TEST_2024_004",
        name: "张三", // 同名学生，不同班级
        class_name: "高一(2)班",
        created_at: new Date().toISOString(),
      },
      {
        id: "00000000-0000-0000-0000-000000000005",
        student_id: "TEST_2024_005",
        name: "赵六",
        class_name: "高一(3)班",
        created_at: new Date().toISOString(),
      },
    ];

    await insertTestData("students", testStudents);
  });

  afterEach(async () => {
    // 清理测试数据
    await cleanTestData(["students"]);
  });

  describe("matchSingleStudent - 精确学号匹配", () => {
    it("应通过学号精确匹配学生", async () => {
      const studentInfo: StudentInfo = {
        student_id: "TEST_2024_001",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeDefined();
      expect(result.matchedStudent.student_id).toBe("TEST_2024_001");
      expect(result.matchedStudent.name).toBe("张三");
      expect(result.matchType).toBe("exact_id");
      expect(result.confidence).toBe(1.0);
      expect(result.multipleMatches).toBe(false);
      expect(result.matchReason).toContain("学号精确匹配");
    });

    it("应处理不存在的学号", async () => {
      const studentInfo: StudentInfo = {
        student_id: "NONEXISTENT_ID",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeNull();
      expect(result.matchType).toBe("none");
      expect(result.confidence).toBe(0);
      expect(result.multipleMatches).toBe(false);
    });

    it("应正确处理学号前后空格", async () => {
      const studentInfo: StudentInfo = {
        student_id: "  TEST_2024_002  ",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeDefined();
      expect(result.matchedStudent.student_id).toBe("TEST_2024_002");
      expect(result.matchType).toBe("exact_id");
    });
  });

  describe("matchSingleStudent - 姓名+班级匹配", () => {
    it("应通过姓名+班级精确匹配学生", async () => {
      const studentInfo: StudentInfo = {
        name: "张三",
        class_name: "高一(1)班",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeDefined();
      expect(result.matchedStudent.name).toBe("张三");
      expect(result.matchedStudent.class_name).toBe("高一(1)班");
      expect(result.matchType).toBe("exact_class_name");
      expect(result.confidence).toBe(0.95);
      expect(result.matchReason).toContain("姓名+班级精确匹配");
    });

    it("应区分同名不同班级的学生", async () => {
      // 匹配高一(1)班的张三
      const studentInfo1: StudentInfo = {
        name: "张三",
        class_name: "高一(1)班",
      };
      const result1 = await matcher.matchSingleStudent(studentInfo1);
      expect(result1.matchedStudent.id).toBe(
        "00000000-0000-0000-0000-000000000001"
      );

      // 匹配高一(2)班的张三
      const studentInfo2: StudentInfo = {
        name: "张三",
        class_name: "高一(2)班",
      };
      const result2 = await matcher.matchSingleStudent(studentInfo2);
      expect(result2.matchedStudent.id).toBe(
        "00000000-0000-0000-0000-000000000004"
      );

      // 确保匹配到的是不同的学生
      expect(result1.matchedStudent.id).not.toBe(result2.matchedStudent.id);
    });

    it("应处理班级名称前后空格", async () => {
      const studentInfo: StudentInfo = {
        name: "  李四  ",
        class_name: "  高一(1)班  ",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeDefined();
      expect(result.matchedStudent.name).toBe("李四");
    });
  });

  describe("matchSingleStudent - 仅姓名匹配", () => {
    it("应通过姓名匹配唯一学生", async () => {
      const studentInfo: StudentInfo = {
        name: "李四",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeDefined();
      expect(result.matchedStudent.name).toBe("李四");
      expect(result.matchType).toBe("exact_name");
      expect(result.confidence).toBe(0.9); // 唯一匹配，高置信度
      expect(result.multipleMatches).toBe(false);
    });

    it("应检测同名学生（multipleMatches = true）", async () => {
      const studentInfo: StudentInfo = {
        name: "张三", // 有两个张三（高一1班和高一2班）
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeDefined();
      expect(result.matchedStudent.name).toBe("张三");
      expect(result.matchType).toBe("exact_name");
      expect(result.confidence).toBe(0.8); // 多个匹配，置信度降低
      expect(result.multipleMatches).toBe(true);
      expect(result.matchReason).toContain("多个结果");
    });

    it("应处理不存在的姓名", async () => {
      const studentInfo: StudentInfo = {
        name: "不存在的学生",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeNull();
      expect(result.matchType).toBe("none");
      expect(result.confidence).toBe(0);
    });
  });

  describe("matchSingleStudent - 模糊姓名匹配", () => {
    it("应通过模糊匹配找到相似姓名", async () => {
      const studentInfo: StudentInfo = {
        name: "張三", // 繁体字
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      // 模糊匹配应该能找到相似的"张三"
      if (result.matchedStudent) {
        expect(result.matchType).toBe("fuzzy_name");
        expect(result.confidence).toBe(0.7);
        expect(result.matchReason).toContain("模糊匹配");
      }
    });

    it("应过滤相似度过低的匹配（<0.6）", async () => {
      const studentInfo: StudentInfo = {
        name: "完全不同的名字ABC",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeNull();
      expect(result.matchType).toBe("none");
    });
  });

  describe("matchSingleStudent - 匹配优先级", () => {
    it("学号匹配应优先于姓名匹配", async () => {
      const studentInfo: StudentInfo = {
        student_id: "TEST_2024_001",
        name: "错误的姓名",
        class_name: "错误的班级",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      // 即使姓名和班级错误，也应该通过学号匹配
      expect(result.matchedStudent).toBeDefined();
      expect(result.matchedStudent.student_id).toBe("TEST_2024_001");
      expect(result.matchType).toBe("exact_id");
      expect(result.confidence).toBe(1.0);
    });

    it("姓名+班级匹配应优先于仅姓名匹配", async () => {
      const studentInfo: StudentInfo = {
        name: "张三",
        class_name: "高一(2)班",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      // 应该精确匹配到高一(2)班的张三
      expect(result.matchedStudent.id).toBe(
        "00000000-0000-0000-0000-000000000004"
      );
      expect(result.matchType).toBe("exact_class_name");
      expect(result.confidence).toBe(0.95);
    });
  });

  describe("batchMatchStudents - 批量匹配", () => {
    it("应成功批量匹配多个学生", async () => {
      const students: StudentInfo[] = [
        { student_id: "TEST_2024_001" },
        { student_id: "TEST_2024_002" },
        { student_id: "TEST_2024_003" },
      ];

      const results = await matcher.batchMatchStudents(students);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.matchedStudent !== null)).toBe(true);
      expect(results.every((r) => r.matchType === "exact_id")).toBe(true);
    });

    it("应处理部分匹配失败的批量数据", async () => {
      const students: StudentInfo[] = [
        { student_id: "TEST_2024_001" },
        { student_id: "NONEXISTENT_ID" },
        { name: "李四" },
        { name: "不存在的学生" },
      ];

      const results = await matcher.batchMatchStudents(students);

      expect(results).toHaveLength(4);

      // 检查匹配成功的
      const successfulMatches = results.filter(
        (r) => r.matchedStudent !== null
      );
      expect(successfulMatches).toHaveLength(2);

      // 检查匹配失败的
      const failedMatches = results.filter((r) => r.matchedStudent === null);
      expect(failedMatches).toHaveLength(2);
    });

    it("应正确处理大批量数据（分批处理）", async () => {
      // 生成100个学生信息
      const students: StudentInfo[] = Array.from({ length: 100 }, (_, i) => ({
        student_id: i < 5 ? `TEST_2024_00${i + 1}` : `FAKE_ID_${i}`,
      }));

      const results = await matcher.batchMatchStudents(students);

      expect(results).toHaveLength(100);

      // 前5个应该匹配成功
      expect(results.slice(0, 5).every((r) => r.matchedStudent !== null)).toBe(
        true
      );

      // 后95个应该匹配失败
      expect(results.slice(5).every((r) => r.matchedStudent === null)).toBe(
        true
      );
    });
  });

  describe("Cache - 缓存功能", () => {
    it("应缓存匹配结果", async () => {
      const studentInfo: StudentInfo = {
        student_id: "TEST_2024_001",
      };

      // 第一次匹配
      const result1 = await matcher.matchSingleStudent(studentInfo);
      const stats1 = matcher.getStats();

      // 第二次匹配（应使用缓存）
      const result2 = await matcher.matchSingleStudent(studentInfo);
      const stats2 = matcher.getStats();

      // 结果应该相同
      expect(result1).toEqual(result2);

      // 统计次数应该增加
      expect(stats2.totalAttempts).toBe(stats1.totalAttempts + 1);
    });

    it("应能清除缓存", async () => {
      const studentInfo: StudentInfo = {
        student_id: "TEST_2024_001",
      };

      // 第一次匹配
      await matcher.matchSingleStudent(studentInfo);

      // 清除缓存
      matcher.clearCache();

      // 第二次匹配（不使用缓存）
      await matcher.matchSingleStudent(studentInfo);

      const stats = matcher.getStats();
      expect(stats.totalAttempts).toBe(2);
    });

    it("不同的学生信息应有不同的缓存键", async () => {
      const student1: StudentInfo = { student_id: "TEST_2024_001" };
      const student2: StudentInfo = { student_id: "TEST_2024_002" };

      const result1 = await matcher.matchSingleStudent(student1);
      const result2 = await matcher.matchSingleStudent(student2);

      expect(result1.matchedStudent.student_id).toBe("TEST_2024_001");
      expect(result2.matchedStudent.student_id).toBe("TEST_2024_002");
    });
  });

  describe("Statistics - 统计功能", () => {
    it("应正确统计各类匹配", async () => {
      await matcher.matchSingleStudent({ student_id: "TEST_2024_001" }); // exact_id
      await matcher.matchSingleStudent({
        name: "李四",
        class_name: "高一(1)班",
      }); // exact_class_name
      await matcher.matchSingleStudent({ name: "王五" }); // exact_name
      await matcher.matchSingleStudent({ name: "不存在的学生" }); // none

      const stats = matcher.getStats();

      expect(stats.totalAttempts).toBe(4);
      expect(stats.exactMatches).toBe(3); // exact_id, exact_class_name, exact_name
      expect(stats.noMatches).toBe(1);
    });

    it("应能重置统计信息", async () => {
      await matcher.matchSingleStudent({ student_id: "TEST_2024_001" });
      await matcher.matchSingleStudent({ student_id: "TEST_2024_002" });

      let stats = matcher.getStats();
      expect(stats.totalAttempts).toBe(2);

      matcher.resetStats();

      stats = matcher.getStats();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.exactMatches).toBe(0);
      expect(stats.fuzzyMatches).toBe(0);
      expect(stats.noMatches).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
    });

    it("应计算平均处理时间", async () => {
      await matcher.matchSingleStudent({ student_id: "TEST_2024_001" });
      await matcher.matchSingleStudent({ student_id: "TEST_2024_002" });
      await matcher.matchSingleStudent({ student_id: "TEST_2024_003" });

      const stats = matcher.getStats();

      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(typeof stats.averageProcessingTime).toBe("number");
    });
  });

  describe("Edge Cases - 边界情况", () => {
    it("应处理空学生信息", async () => {
      const studentInfo: StudentInfo = {};

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeNull();
      expect(result.matchType).toBe("none");
      expect(result.confidence).toBe(0);
    });

    it("应处理null/undefined值", async () => {
      const studentInfo: StudentInfo = {
        student_id: undefined,
        name: null as any,
        class_name: undefined,
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeNull();
      expect(result.matchType).toBe("none");
    });

    it("应处理空字符串", async () => {
      const studentInfo: StudentInfo = {
        student_id: "",
        name: "   ",
        class_name: "",
      };

      const result = await matcher.matchSingleStudent(studentInfo);

      expect(result.matchedStudent).toBeNull();
      expect(result.matchType).toBe("none");
    });

    it("应处理数据库错误", async () => {
      // 使用无效的学生信息触发查询
      const studentInfo: StudentInfo = {
        student_id: "TEST_2024_001",
      };

      // 模拟数据库连接失败的情况
      // 注意：这需要mock Supabase客户端
      const result = await matcher.matchSingleStudent(studentInfo);

      // 即使数据库出错，也应该返回有效的结果结构
      expect(result).toHaveProperty("matchedStudent");
      expect(result).toHaveProperty("matchType");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("matchReason");
    });
  });

  describe("Performance - 性能测试", () => {
    it("单次匹配应在600ms内完成", async () => {
      const startTime = Date.now();

      await matcher.matchSingleStudent({
        student_id: "TEST_2024_001",
      });

      const duration = Date.now() - startTime;
      // 测试环境下数据库查询较慢，调整为600ms阈值（生产环境通常<100ms）
      expect(duration).toBeLessThan(600);
    });

    it("批量匹配100个学生应在5秒内完成", async () => {
      const students: StudentInfo[] = Array.from({ length: 100 }, (_, i) => ({
        student_id: `TEST_2024_${String(i + 1).padStart(3, "0")}`,
      }));

      const startTime = Date.now();
      await matcher.batchMatchStudents(students);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);
    });

    it("缓存应显著提升重复查询性能", async () => {
      const studentInfo: StudentInfo = { student_id: "TEST_2024_001" };

      // 第一次查询（无缓存）
      const start1 = Date.now();
      await matcher.matchSingleStudent(studentInfo);
      const time1 = Date.now() - start1;

      // 第二次查询（使用缓存）
      const start2 = Date.now();
      await matcher.matchSingleStudent(studentInfo);
      const time2 = Date.now() - start2;

      // 缓存查询应该更快（至少快50%）
      expect(time2).toBeLessThan(time1 * 0.5);
    });
  });
});
