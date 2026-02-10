/**
 * 基于排名的等级计算测试
 * 验证新的等级分配逻辑
 */

import {
  calculateGradeByRank,
  assignGradesByRank,
  normalizeGradeLevel,
  assignGradesWithFallback,
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

      // 验证等级（4人班级的正确计算）
      // 第1名: 1/4*100 = 25% → rankPercentile <= 25 → A (5-25%)
      // 第2名: 2/4*100 = 50% → rankPercentile <= 50 → B+ (25-50%)
      // 第3名: 3/4*100 = 75% → rankPercentile <= 75 → B (50-75%)
      // 第4名: 4/4*100 = 100% → rankPercentile > 95 → C (后5%)
      expect(result[0].calculatedGrade.level).toBe(GradeLevel.A); // 第1名 25%
      expect(result[1].calculatedGrade.level).toBe(GradeLevel.B_PLUS); // 第2名 50%
      expect(result[2].calculatedGrade.level).toBe(GradeLevel.B); // 第3名 75%
      expect(result[3].calculatedGrade.level).toBe(GradeLevel.C); // 第4名 100%
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

  describe("灵活等级来源策略", () => {
    describe("normalizeGradeLevel", () => {
      test("应该正确识别标准字母等级", () => {
        expect(normalizeGradeLevel("A+")).toBe(GradeLevel.A_PLUS);
        expect(normalizeGradeLevel("A")).toBe(GradeLevel.A);
        expect(normalizeGradeLevel("B+")).toBe(GradeLevel.B_PLUS);
        expect(normalizeGradeLevel("B")).toBe(GradeLevel.B);
        expect(normalizeGradeLevel("C+")).toBe(GradeLevel.C_PLUS);
        expect(normalizeGradeLevel("C")).toBe(GradeLevel.C);
      });

      test("应该忽略大小写和空格", () => {
        expect(normalizeGradeLevel(" a+ ")).toBe(GradeLevel.A_PLUS);
        expect(normalizeGradeLevel("  A  ")).toBe(GradeLevel.A);
      });

      test("应该正确识别中文等级", () => {
        expect(normalizeGradeLevel("优秀")).toBe(GradeLevel.A_PLUS);
        expect(normalizeGradeLevel("优")).toBe(GradeLevel.A_PLUS);
        expect(normalizeGradeLevel("良好")).toBe(GradeLevel.A);
        expect(normalizeGradeLevel("良")).toBe(GradeLevel.A);
        expect(normalizeGradeLevel("中等")).toBe(GradeLevel.B);
        expect(normalizeGradeLevel("及格")).toBe(GradeLevel.C_PLUS);
        expect(normalizeGradeLevel("不及格")).toBe(GradeLevel.C);
      });

      test("应该正确识别传统等第", () => {
        expect(normalizeGradeLevel("甲")).toBe(GradeLevel.A_PLUS);
        expect(normalizeGradeLevel("乙")).toBe(GradeLevel.A);
        expect(normalizeGradeLevel("丙")).toBe(GradeLevel.B);
        expect(normalizeGradeLevel("丁")).toBe(GradeLevel.C);
      });

      test("无法识别的等级应返回null", () => {
        expect(normalizeGradeLevel("X")).toBeNull();
        expect(normalizeGradeLevel("未知")).toBeNull();
        expect(normalizeGradeLevel("")).toBeNull();
        expect(normalizeGradeLevel(null)).toBeNull();
        expect(normalizeGradeLevel(undefined)).toBeNull();
      });
    });

    describe("assignGradesWithFallback", () => {
      test("优先级1：应该优先使用导入的等级", () => {
        const records = [
          {
            student_id: "001",
            total_score: 650,
            total_rank_in_class: 1,
            total_grade: "A+",
          },
          {
            student_id: "002",
            total_score: 600,
            total_rank_in_class: 2,
            total_grade: "A",
          },
        ];

        const result = assignGradesWithFallback(
          records,
          "总分",
          "total_score",
          "total_grade"
        );

        expect(result[0].resolvedGrade.level).toBe(GradeLevel.A_PLUS);
        expect(result[0].gradeSource).toBe("imported");
        expect(result[1].resolvedGrade.level).toBe(GradeLevel.A);
        expect(result[1].gradeSource).toBe("imported");
      });

      test("优先级2：等级缺失时应使用排名计算", () => {
        const records = [
          { student_id: "001", total_score: 650, total_rank_in_class: 1 },
          { student_id: "002", total_score: 600, total_rank_in_class: 50 },
          { student_id: "003", total_score: 550, total_rank_in_class: 80 },
        ];

        const result = assignGradesWithFallback(records, "总分", "total_score");

        // 1/3 = 33.3% → A (5-25%不满足，应该是B+)
        expect(result[0].resolvedGrade.level).toBe(GradeLevel.B_PLUS);
        expect(result[0].gradeSource).toBe("calculated");

        // 80/3 = 2666.7% → 应该是C（超过95%）
        expect(result[2].resolvedGrade.level).toBe(GradeLevel.C);
        expect(result[2].gradeSource).toBe("calculated");
      });

      test("优先级3：排名和等级都缺失时应使用默认等级C", () => {
        const records = [
          { student_id: "001", total_score: 650 }, // 无rank，无grade
        ];

        const result = assignGradesWithFallback(records, "总分", "total_score");

        expect(result[0].resolvedGrade.level).toBe(GradeLevel.C);
        expect(result[0].gradeSource).toBe("default");
      });

      test("应该支持中文等级导入", () => {
        const records = [
          {
            student_id: "001",
            chinese_score: 110,
            chinese_rank_in_class: 1,
            chinese_grade: "优秀",
          },
          {
            student_id: "002",
            chinese_score: 100,
            chinese_rank_in_class: 20,
            chinese_grade: "良好",
          },
        ];

        const result = assignGradesWithFallback(
          records,
          "语文",
          "chinese_score",
          "chinese_grade"
        );

        expect(result[0].resolvedGrade.level).toBe(GradeLevel.A_PLUS);
        expect(result[0].gradeSource).toBe("imported");
        expect(result[1].resolvedGrade.level).toBe(GradeLevel.A);
        expect(result[1].gradeSource).toBe("imported");
      });

      test("无效的导入等级应降级到排名计算", () => {
        const records = [
          {
            student_id: "001",
            total_score: 650,
            total_rank_in_class: 1,
            total_grade: "无效等级", // 无法识别
          },
        ];

        const result = assignGradesWithFallback(
          records,
          "总分",
          "total_score",
          "total_grade"
        );

        // 应该fallback到排名计算
        expect(result[0].gradeSource).toBe("calculated");
      });

      test("空数组应返回空结果", () => {
        const result = assignGradesWithFallback([], "总分", "total_score");
        expect(result).toEqual([]);
      });

      test("应该保留原始记录的所有字段", () => {
        const records = [
          {
            student_id: "001",
            name: "张三",
            total_score: 650,
            total_rank_in_class: 1,
            total_grade: "A+",
            class_name: "初一1班",
          },
        ];

        const result = assignGradesWithFallback(
          records,
          "总分",
          "total_score",
          "total_grade"
        );

        expect(result[0].student_id).toBe("001");
        expect(result[0].name).toBe("张三");
        expect(result[0].class_name).toBe("初一1班");
        expect(result[0].resolvedGrade).toBeDefined();
        expect(result[0].gradeSource).toBe("imported");
      });
    });
  });
});
