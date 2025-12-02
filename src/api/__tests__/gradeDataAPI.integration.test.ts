/**
 * 🧪 GradeDataAPI 集成测试
 *
 * 测试重点：
 * - 基础成绩数据API查询
 * - 数据库集成
 * - 统计计算准确性
 * - 分页和筛选功能
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  fetchGradeData,
  fetchGradeDataBySubject,
  fetchGradeDataByClass,
  fetchExamList,
  fetchExamInfo,
  calculateGradeStatistics,
  fetchClassList,
  fetchSubjectList,
} from "../gradeDataAPI";
import { cleanTestData, insertTestData } from "@/test/db-setup";
import { generateStudents } from "@/test/generators/studentGenerator";
import { generateExam } from "@/test/generators/examGenerator";
import { generateGradesForStudents } from "@/test/generators/gradeGenerator";
import type { GradeRecord } from "@/types/grade";

describe("GradeDataAPI Integration Tests", () => {
  let testExamId: string;

  beforeEach(async () => {
    // 清理测试数据
    await cleanTestData(["grade_data", "exams", "students"]);
  });

  afterEach(async () => {
    // 测试后清理
    await cleanTestData(["grade_data", "exams", "students"]);
  });

  describe("fetchGradeData - 成绩数据查询", () => {
    it("应成功获取考试成绩数据（无筛选）", async () => {
      // 准备：插入100条测试数据
      const students = generateStudents(100, {
        classNames: ["高一(1)班", "高一(2)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({
        title: "期中考试",
        date: "2024-11-01",
        type: "期中",
      });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math", "english"],
      });
      await insertTestData("grade_data", grades);

      // 执行：调用API
      const result = await fetchGradeData(exam.id);

      // 验证：
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();

      // 验证数据结构
      const firstRecord = result.data[0];
      expect(firstRecord).toHaveProperty("id");
      expect(firstRecord).toHaveProperty("student_id");
      expect(firstRecord).toHaveProperty("exam_id");
      expect(firstRecord).toHaveProperty("score");
    });

    it("应正确应用班级筛选", async () => {
      // 准备：2个班级的数据
      const class1Students = generateStudents(30, {
        classNames: ["高一(1)班"],
      });
      const class2Students = generateStudents(30, {
        classNames: ["高一(2)班"],
      });
      const allStudents = [...class1Students, ...class2Students];
      await insertTestData("students", allStudents);

      const exam = generateExam({ title: "筛选测试考试" });
      await insertTestData("exams", [exam]);

      const grades = generateGradesForStudents(allStudents, {
        exam,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades);

      // 执行：只查询高一(1)班
      const result = await fetchGradeData(exam.id, {
        class_name: "高一(1)班",
      });

      // 验证：所有记录都是高一(1)班
      expect(result.data.length).toBeGreaterThan(0);
      expect(
        result.data.every((record) => record.class_name === "高一(1)班")
      ).toBe(true);
    });

    it("应正确实现分页", async () => {
      // 准备：200条数据
      const students = generateStudents(200, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "分页测试考试" });
      await insertTestData("exams", [exam]);

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese"],
      });
      await insertTestData("grade_data", grades);

      // 执行：查询第1页和第2页
      const page1 = await fetchGradeData(
        exam.id,
        {},
        { page: 1, pageSize: 50 }
      );
      const page2 = await fetchGradeData(
        exam.id,
        {},
        { page: 2, pageSize: 50 }
      );

      // 验证：
      expect(page1.data.length).toBe(50);
      expect(page2.data.length).toBe(50);

      // 验证不同页的数据不重复
      const page1Ids = new Set(page1.data.map((d) => d.id));
      const page2Ids = new Set(page2.data.map((d) => d.id));
      const intersection = [...page1Ids].filter((id) => page2Ids.has(id));
      expect(intersection.length).toBe(0);
    });

    it("应处理空结果集", async () => {
      // 执行：查询不存在的考试
      const result = await fetchGradeData("nonexistent-exam-id-12345");

      // 验证：返回空数据，不报错
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.error).toBeUndefined();
    });
  });

  describe("fetchGradeDataBySubject/ByClass - 专项查询", () => {
    beforeEach(async () => {
      // 准备通用测试数据
      const students = generateStudents(30, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "专项查询测试" });
      await insertTestData("exams", [exam]);
      testExamId = exam.id;

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math", "english"],
      });
      await insertTestData("grade_data", grades);
    });

    it("应按科目过滤成绩", async () => {
      const result = await fetchGradeDataBySubject("chinese", testExamId);

      // 验证：所有记录都是语文科目
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every((record) => record.subject === "chinese")).toBe(
        true
      );
    });

    it("应按班级获取成绩", async () => {
      const result = await fetchGradeDataByClass("高一(1)班", testExamId);

      // 验证：所有记录都是高一(1)班
      expect(result.data.length).toBeGreaterThan(0);
      expect(
        result.data.every((record) => record.class_name === "高一(1)班")
      ).toBe(true);
    });
  });

  describe("calculateGradeStatistics - 统计计算", () => {
    it("应正确计算平均分", () => {
      const testData: GradeRecord[] = [
        { id: "1", score: 80 } as GradeRecord,
        { id: "2", score: 85 } as GradeRecord,
        { id: "3", score: 90 } as GradeRecord,
        { id: "4", score: 95 } as GradeRecord,
        { id: "5", score: 100 } as GradeRecord,
      ];
      const expectedAvg = 90;

      const stats = calculateGradeStatistics(testData);

      expect(stats.average).toBeCloseTo(expectedAvg, 2);
    });

    it("应正确计算中位数", () => {
      const testData: GradeRecord[] = [
        { id: "1", score: 60 } as GradeRecord,
        { id: "2", score: 70 } as GradeRecord,
        { id: "3", score: 80 } as GradeRecord, // 中位数
        { id: "4", score: 90 } as GradeRecord,
        { id: "5", score: 100 } as GradeRecord,
      ];

      const stats = calculateGradeStatistics(testData);

      expect(stats.median).toBe(80);
    });

    it("应正确计算标准差", () => {
      const scores = [60, 70, 80, 90, 100];
      const mean = 80;
      const variance =
        scores.reduce((sum, x) => sum + (x - mean) ** 2, 0) / scores.length;
      const expectedStdDev = Math.sqrt(variance); // ≈14.14

      const testData: GradeRecord[] = scores.map(
        (score, i) =>
          ({
            id: `${i}`,
            score,
          }) as GradeRecord
      );

      const stats = calculateGradeStatistics(testData);

      expect(stats.standardDeviation).toBeCloseTo(expectedStdDev, 1);
    });

    it("应正确计算及格率和优秀率", () => {
      // 100个学生：60个及格（≥60分），40个不及格
      const passScores = Array(60).fill(80);
      const failScores = Array(40).fill(50);
      const allScores = [...passScores, ...failScores];

      const testData: GradeRecord[] = allScores.map(
        (score, i) =>
          ({
            id: `${i}`,
            score,
            max_score: 100,
          }) as GradeRecord
      );

      const stats = calculateGradeStatistics(testData);

      expect(stats.passRate).toBeCloseTo(60, 0);
      expect(stats.excellentRate).toBeDefined();
      expect(stats.excellentRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe("fetchExamList/Info - 考试信息查询", () => {
    it("应获取所有考试列表", async () => {
      // 准备：插入3个考试
      const exams = [
        generateExam({ title: "期中考试", date: "2024-11-01" }),
        generateExam({ title: "期末考试", date: "2024-12-15" }),
        generateExam({ title: "月考", date: "2024-10-15" }),
      ];
      await insertTestData("exams", exams);

      // 执行
      const result = await fetchExamList();

      // 验证
      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.data[0]).toHaveProperty("id");
      expect(result.data[0]).toHaveProperty("title");
    });

    it("应获取单个考试详情", async () => {
      const exam = generateExam({ title: "测试考试详情" });
      await insertTestData("exams", [exam]);

      // 执行
      const result = await fetchExamInfo(exam.id);

      // 验证
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe(exam.id);
      expect(result.data.title).toBe("测试考试详情");
    });
  });

  describe("fetchClassList/SubjectList - 列表查询", () => {
    it("应获取班级列表", async () => {
      // 准备：创建多个班级的学生
      const students = generateStudents(60, {
        classNames: ["高一(1)班", "高一(2)班", "高一(3)班"],
      });
      await insertTestData("students", students);

      // 执行
      const result = await fetchClassList();

      // 验证：至少包含3个班级
      expect(result.data.length).toBeGreaterThanOrEqual(3);
      expect(result.data).toContain("高一(1)班");
      expect(result.data).toContain("高一(2)班");
      expect(result.data).toContain("高一(3)班");
    });

    it("应获取科目列表", async () => {
      // 准备：创建多科目成绩数据
      const students = generateStudents(10, {
        classNames: ["高一(1)班"],
      });
      await insertTestData("students", students);

      const exam = generateExam({ title: "科目列表测试" });
      await insertTestData("exams", [exam]);

      const grades = generateGradesForStudents(students, {
        exam,
        subjects: ["chinese", "math", "english", "physics"],
      });
      await insertTestData("grade_data", grades);

      // 执行
      const result = await fetchSubjectList(exam.id);

      // 验证：应包含4个科目
      expect(result.data.length).toBeGreaterThanOrEqual(4);
      expect(result.data).toContain("chinese");
      expect(result.data).toContain("math");
      expect(result.data).toContain("english");
      expect(result.data).toContain("physics");
    });
  });
});
