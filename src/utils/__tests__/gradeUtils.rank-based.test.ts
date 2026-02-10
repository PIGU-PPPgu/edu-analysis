/**
 * 基于排名的等级计算测试
 * 验证新的等级分配逻辑
 */

import {
  calculateGradeByRank,
  assignGradesByRank,
  GRADE_LEVELS,
} from "../gradeUtils";
import { GradeLevel } from "../../types/grade";

describe("基于排名的等级计算", () => {
  describe("calculateGradeByRank", () => {
    test("前5%应该是A+", () => {
      // 100人班级，前5名（5%）
      expect(calculateGradeByRank(1, 100).level).toBe(GradeLevel.A_PLUS);
      expect(calculateGradeByRank(5, 100).level).toBe(GradeLevel.A_PLUS);
    });

    test("5-25%应该是A", () => {
      // 100人班级，第6-25名
      expect(calculateGradeByRank(6, 100).level).toBe(GradeLevel.A);
      expect(calculateGradeByRank(25, 100).level).toBe(GradeLevel.A);
    });

    test("25-50%应该是B+", () => {
      expect(calculateGradeByRank(26, 100).level).toBe(GradeLevel.B_PLUS);
      expect(calculateGradeByRank(50, 100).level).toBe(GradeLevel.B_PLUS);
    });

    test("50-75%应该是B", () => {
      expect(calculateGradeByRank(51, 100).level).toBe(GradeLevel.B);
      expect(calculateGradeByRank(75, 100).level).toBe(GradeLevel.B);
    });

    test("75-95%应该是C+", () => {
      expect(calculateGradeByRank(76, 100).level).toBe(GradeLevel.C_PLUS);
      expect(calculateGradeByRank(95, 100).level).toBe(GradeLevel.C_PLUS);
    });

    test("后5%应该是C", () => {
      expect(calculateGradeByRank(96, 100).level).toBe(GradeLevel.C);
      expect(calculateGradeByRank(100, 100).level).toBe(GradeLevel.C);
    });

    test("小班级（20人）的等级分配", () => {
      // 前5% = 第1名（1/20 = 5%）
      expect(calculateGradeByRank(1, 20).level).toBe(GradeLevel.A_PLUS);
      // 第2名 = 10%，应该是A
      expect(calculateGradeByRank(2, 20).level).toBe(GradeLevel.A);
      // 第5名 = 25%，应该是A
      expect(calculateGradeByRank(5, 20).level).toBe(GradeLevel.A);
      // 第6名 = 30%，应该是B+
      expect(calculateGradeByRank(6, 20).level).toBe(GradeLevel.B_PLUS);
    });

    test("边界情况：无效输入", () => {
      // 学生数为0
      expect(calculateGradeByRank(1, 0).level).toBe(GradeLevel.C);
      // 排名为0
      expect(calculateGradeByRank(0, 100).level).toBe(GradeLevel.C);
    });
  });

  describe("assignGradesByRank", () => {
    test("应该按分数排序并分配等级", () => {
      const students = [
        { id: "1", name: "张三", total_score: 600 },
        { id: "2", name: "李四", total_score: 550 },
        { id: "3", name: "王五", total_score: 650 }, // 第一名
        { id: "4", name: "赵六", total_score: 500 },
      ];

      const result = assignGradesByRank(students, "总分", "total_score");

      // 验证排序
      expect(result[0].name).toBe("王五");
      expect(result[0].rank).toBe(1);
      expect(result[0].total_score).toBe(650);

      // 验证等级（4人班级：前5%=第1名，5-25%=第2名，25-50%=第3名，50-75%=第4名）
      expect(result[0].calculatedGrade.level).toBe(GradeLevel.A_PLUS); // 第1名
      expect(result[1].calculatedGrade.level).toBe(GradeLevel.A); // 第2名 (50%)
      expect(result[2].calculatedGrade.level).toBe(GradeLevel.B); // 第3名 (75%)
      expect(result[3].calculatedGrade.level).toBe(GradeLevel.C); // 第4名 (100%)
    });

    test("空数组应返回空数组", () => {
      const result = assignGradesByRank([], "总分", "total_score");
      expect(result).toEqual([]);
    });

    test("100人班级的等级分布应合理", () => {
      const students = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `学生${i + 1}`,
        total_score: 700 - i, // 分数从700递减
      }));

      const result = assignGradesByRank(students, "总分", "total_score");

      // 统计各等级人数
      const gradeCounts = result.reduce(
        (acc, student) => {
          acc[student.calculatedGrade.level] =
            (acc[student.calculatedGrade.level] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // 验证等级分布（允许±1的误差）
      expect(gradeCounts[GradeLevel.A_PLUS]).toBeLessThanOrEqual(6); // 前5%
      expect(gradeCounts[GradeLevel.A]).toBeGreaterThanOrEqual(19); // 5-25%
      expect(gradeCounts[GradeLevel.B_PLUS]).toBeGreaterThanOrEqual(24); // 25-50%
      expect(gradeCounts[GradeLevel.B]).toBeGreaterThanOrEqual(24); // 50-75%
      expect(gradeCounts[GradeLevel.C_PLUS]).toBeGreaterThanOrEqual(19); // 75-95%
      expect(gradeCounts[GradeLevel.C]).toBeLessThanOrEqual(6); // 后5%
    });
  });

  describe("GRADE_LEVELS配置验证", () => {
    test("等级配置应该覆盖0-100%的排名范围", () => {
      const levels = Object.values(GRADE_LEVELS);
      const sortedLevels = levels.sort(
        (a, b) => a.minPercentage - b.minPercentage
      );

      // 验证覆盖范围
      expect(sortedLevels[0].minPercentage).toBe(0);
      expect(sortedLevels[sortedLevels.length - 1].maxPercentage).toBe(100);

      // 验证没有间隙
      for (let i = 0; i < sortedLevels.length - 1; i++) {
        expect(sortedLevels[i].maxPercentage).toBe(
          sortedLevels[i + 1].minPercentage
        );
      }
    });
  });
});
