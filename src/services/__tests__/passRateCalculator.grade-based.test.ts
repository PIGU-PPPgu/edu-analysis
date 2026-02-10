/**
 * 基于等级的及格率/优秀率计算测试
 * 验证新的等级定义方案
 */

import {
  calculatePassRateByGrade,
  calculateExcellentRateByGrade,
  calculateFailRateByGrade,
  calculateBatchRatesByGrade,
} from "../passRateCalculator";
import { GradeLevel } from "../../types/grade";

describe("基于等级的及格率/优秀率计算", () => {
  // 模拟100人班级的数据
  const mock100Students = Array.from({ length: 100 }, (_, i) => ({
    student_id: `${i + 1}`,
    name: `学生${i + 1}`,
    total_score: 700 - i, // 分数从700递减
    total_rank: i + 1, // 排名从1到100
  }));

  describe("calculateExcellentRateByGrade", () => {
    test("优秀率应该约等于25%（A+ + A）", () => {
      const excellentRate = calculateExcellentRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );

      // 前25名应该是A+和A，即25%
      expect(excellentRate).toBeGreaterThanOrEqual(24);
      expect(excellentRate).toBeLessThanOrEqual(26);
    });

    test("空数组应返回0", () => {
      const rate = calculateExcellentRateByGrade([], "总分", "total_score");
      expect(rate).toBe(0);
    });
  });

  describe("calculatePassRateByGrade", () => {
    test("及格率应该约等于95%（A+到C+）", () => {
      const passRate = calculatePassRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );

      // 前95名应该是A+到C+，即95%
      expect(passRate).toBeGreaterThanOrEqual(94);
      expect(passRate).toBeLessThanOrEqual(96);
    });

    test("空数组应返回0", () => {
      const rate = calculatePassRateByGrade([], "总分", "total_score");
      expect(rate).toBe(0);
    });
  });

  describe("calculateFailRateByGrade", () => {
    test("不及格率应该约等于5%（C等级）", () => {
      const failRate = calculateFailRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );

      // 后5名应该是C，即5%
      expect(failRate).toBeGreaterThanOrEqual(4);
      expect(failRate).toBeLessThanOrEqual(6);
    });

    test("空数组应返回0", () => {
      const rate = calculateFailRateByGrade([], "总分", "total_score");
      expect(rate).toBe(0);
    });
  });

  describe("calculateBatchRatesByGrade", () => {
    test("应该正确计算多个科目的及格率和优秀率", () => {
      const subjects = [
        { name: "总分", scoreField: "total_score" },
        { name: "语文", scoreField: "chinese_score" },
      ];

      const mockData = mock100Students.map((s, index) => ({
        ...s,
        chinese_score: s.total_score * 0.3, // 模拟语文分数
        chinese_rank: index + 1, // 添加语文排名
      }));

      const result = calculateBatchRatesByGrade(mockData, subjects);

      expect(result["总分"]).toBeDefined();
      expect(result["总分"].excellentRate).toBeGreaterThan(20);
      expect(result["总分"].passRate).toBeGreaterThan(90);
      expect(result["总分"].failRate).toBeLessThan(10);

      expect(result["语文"]).toBeDefined();
      expect(result["语文"].excellentRate).toBeGreaterThan(20);
    });
  });

  describe("优先使用导入等级", () => {
    test("当提供等级字段时应优先使用导入等级", () => {
      const mockWithGrades = [
        {
          student_id: "1",
          total_score: 650,
          total_rank: 1,
          total_grade: "A+",
        },
        {
          student_id: "2",
          total_score: 600,
          total_rank: 2,
          total_grade: "A",
        },
        {
          student_id: "3",
          total_score: 550,
          total_rank: 3,
          total_grade: "B+",
        },
        { student_id: "4", total_score: 500, total_rank: 4, total_grade: "C" },
      ];

      const excellentRate = calculateExcellentRateByGrade(
        mockWithGrades,
        "总分",
        "total_score",
        "total_grade"
      );

      // A+ 和 A 有2个，4个学生中占50%
      expect(excellentRate).toBe(50);

      const failRate = calculateFailRateByGrade(
        mockWithGrades,
        "总分",
        "total_score",
        "total_grade"
      );

      // C 有1个，占25%
      expect(failRate).toBe(25);
    });
  });

  describe("三率之和验证", () => {
    test("优秀率 + 及格但不优秀 + 不及格率 应该等于100%", () => {
      const excellentRate = calculateExcellentRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );
      const passRate = calculatePassRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );
      const failRate = calculateFailRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );

      // 及格但不优秀 = 及格率 - 优秀率
      const passNotExcellent = passRate - excellentRate;

      // 三率之和应该接近100%（允许±1的浮点误差）
      const sum = excellentRate + passNotExcellent + failRate;
      expect(sum).toBeGreaterThanOrEqual(99);
      expect(sum).toBeLessThanOrEqual(101);
    });
  });

  describe("等级定义一致性验证", () => {
    test("优秀率应该对应前25%（A+前5% + A的5-25%）", () => {
      const excellentRate = calculateExcellentRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );

      // 前25名 = 25%
      expect(Math.abs(excellentRate - 25)).toBeLessThanOrEqual(1);
    });

    test("不及格率应该对应后5%（C等级）", () => {
      const failRate = calculateFailRateByGrade(
        mock100Students,
        "总分",
        "total_score"
      );

      // 后5名 = 5%
      expect(Math.abs(failRate - 5)).toBeLessThanOrEqual(1);
    });
  });
});
