/**
 * 分数段对比分析服务测试
 * 验证核心计算逻辑
 */

import { describe, test, expect } from "vitest";
import { calculateScoreBandSnapshot } from "../scoreBandAnalysisService";
import type { GradeRecord } from "@/types/scoreBandTypes";

describe("分数段对比分析服务", () => {
  // 模拟100人班级数据
  const mock100Students: GradeRecord[] = Array.from(
    { length: 100 },
    (_, i) => ({
      student_id: `${i + 1}`,
      name: `学生${i + 1}`,
      total_score: 700 - i,
      total_rank: i + 1,
    })
  );

  describe("calculateScoreBandSnapshot", () => {
    test("应该正确计算总分的分数段快照", () => {
      const snapshot = calculateScoreBandSnapshot(mock100Students, "总分");

      // 基本信息
      expect(snapshot.subject).toBe("总分");
      expect(snapshot.totalStudents).toBe(100);
      expect(snapshot.avgScore).toBeGreaterThan(0);

      // 各等级人数验证
      expect(snapshot.aPlusCount).toBeGreaterThanOrEqual(4);
      expect(snapshot.aPlusCount).toBeLessThanOrEqual(6); // 前5%约5人
      expect(snapshot.aCount).toBeGreaterThanOrEqual(19);
      expect(snapshot.aCount).toBeLessThanOrEqual(21); // 5-25%约20人

      // 比例验证
      expect(snapshot.aPlusRate).toBeCloseTo(5, 1);
      expect(snapshot.aRate).toBeCloseTo(20, 1);

      // 累计统计验证
      expect(snapshot.aPlusAboveCount).toBe(snapshot.aPlusCount);
      expect(snapshot.aAboveCount).toBe(snapshot.aPlusCount + snapshot.aCount);
      expect(snapshot.bPlusAboveCount).toBe(
        snapshot.aPlusCount + snapshot.aCount + snapshot.bPlusCount
      );
    });

    test("累计项应该正确累加", () => {
      const snapshot = calculateScoreBandSnapshot(mock100Students, "总分");

      // A+以上 = A+
      expect(snapshot.aPlusAboveCount).toBe(snapshot.aPlusCount);

      // A以上 = A+ + A
      expect(snapshot.aAboveCount).toBe(snapshot.aPlusCount + snapshot.aCount);

      // B+以上 = A+ + A + B+
      expect(snapshot.bPlusAboveCount).toBe(
        snapshot.aPlusCount + snapshot.aCount + snapshot.bPlusCount
      );

      // B以上 = A+ + A + B+ + B
      expect(snapshot.bAboveCount).toBe(
        snapshot.aPlusCount +
          snapshot.aCount +
          snapshot.bPlusCount +
          snapshot.bCount
      );

      // C+以上 = A+ + A + B+ + B + C+ (即及格线)
      expect(snapshot.cPlusAboveCount).toBe(
        snapshot.aPlusCount +
          snapshot.aCount +
          snapshot.bPlusCount +
          snapshot.bCount +
          snapshot.cPlusCount
      );
    });

    test("累计比例应该正确计算", () => {
      const snapshot = calculateScoreBandSnapshot(mock100Students, "总分");

      // 前95%应该及格（C+以上）
      expect(snapshot.cPlusAboveRate).toBeGreaterThanOrEqual(94);
      expect(snapshot.cPlusAboveRate).toBeLessThanOrEqual(96);

      // 前25%应该优秀（A以上）
      expect(snapshot.aAboveRate).toBeGreaterThanOrEqual(24);
      expect(snapshot.aAboveRate).toBeLessThanOrEqual(26);
    });

    test("所有等级人数之和应该等于总人数", () => {
      const snapshot = calculateScoreBandSnapshot(mock100Students, "总分");

      const totalCount =
        snapshot.aPlusCount +
        snapshot.aCount +
        snapshot.bPlusCount +
        snapshot.bCount +
        snapshot.cPlusCount +
        snapshot.cCount;

      expect(totalCount).toBe(snapshot.totalStudents);
    });

    test("所有等级比例之和应该约等于100%", () => {
      const snapshot = calculateScoreBandSnapshot(mock100Students, "总分");

      const totalRate =
        snapshot.aPlusRate +
        snapshot.aRate +
        snapshot.bPlusRate +
        snapshot.bRate +
        snapshot.cPlusRate +
        snapshot.cRate;

      expect(totalRate).toBeGreaterThanOrEqual(99);
      expect(totalRate).toBeLessThanOrEqual(101);
    });

    test("应该支持语文科目计算", () => {
      const mockWithChinese = mock100Students.map((s, index) => ({
        ...s,
        chinese_score: s.total_score! * 0.3,
        chinese_rank: index + 1,
      }));

      const snapshot = calculateScoreBandSnapshot(mockWithChinese, "语文");

      expect(snapshot.subject).toBe("语文");
      expect(snapshot.totalStudents).toBe(100);
      expect(snapshot.avgScore).toBeGreaterThan(0);
    });

    test("应该处理空数组", () => {
      const snapshot = calculateScoreBandSnapshot([], "总分");

      expect(snapshot.totalStudents).toBe(0);
      expect(snapshot.avgScore).toBe(0);
      expect(snapshot.aPlusCount).toBe(0);
      expect(snapshot.aPlusRate).toBe(0);
    });

    test("应该过滤无效数据（无分数记录）", () => {
      const mixedData: GradeRecord[] = [
        { student_id: "1", total_score: 100, total_rank: 1 },
        { student_id: "2", total_score: undefined }, // 无分数
        { student_id: "3", total_score: null }, // 无分数
        { student_id: "4", total_score: 80, total_rank: 2 },
      ];

      const snapshot = calculateScoreBandSnapshot(mixedData, "总分");

      // 只统计有分数的2条记录
      expect(snapshot.totalStudents).toBe(2);
    });

    test("应该正确处理导入的等级", () => {
      const mockWithGrades: GradeRecord[] = [
        { student_id: "1", total_score: 650, total_rank: 1, total_grade: "A+" },
        { student_id: "2", total_score: 600, total_rank: 2, total_grade: "A+" },
        { student_id: "3", total_score: 550, total_rank: 3, total_grade: "A" },
        { student_id: "4", total_score: 500, total_rank: 4, total_grade: "A" },
      ];

      const snapshot = calculateScoreBandSnapshot(mockWithGrades, "总分");

      // 应该使用导入的等级
      expect(snapshot.aPlusCount).toBe(2);
      expect(snapshot.aCount).toBe(2);
      expect(snapshot.aPlusRate).toBe(50);
      expect(snapshot.aRate).toBe(50);
    });

    test("平均分应该正确计算", () => {
      const mockData: GradeRecord[] = [
        { student_id: "1", total_score: 100, total_rank: 1 },
        { student_id: "2", total_score: 90, total_rank: 2 },
        { student_id: "3", total_score: 80, total_rank: 3 },
      ];

      const snapshot = calculateScoreBandSnapshot(mockData, "总分");

      // 平均分 = (100 + 90 + 80) / 3 = 90
      expect(snapshot.avgScore).toBe(90);
    });
  });
});
