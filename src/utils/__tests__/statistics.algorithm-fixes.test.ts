/**
 * Phase 1 算法修复验证测试
 * 验证4个P0算法问题的修复
 */

import { describe, it, expect } from "vitest";
import {
  calculateStandardDeviation,
  calculatePercentile,
  calculateScoreValueAddedRate,
  calculateContributionRate,
} from "../statistics";
import { calculateStandardDeviation as calculateStdAI } from "@/services/ai/statisticalAnalysis";

describe("Phase 1 算法修复验证", () => {
  describe("修复1: 增值率公式 (P0)", () => {
    it("应该使用Z-score差值，避免负数分母问题", () => {
      // 场景：入口Z分数 = -5.2（极低分），出口Z分数 = -1.0（进步明显）
      const entryZScore = -5.2;
      const exitZScore = -1.0;

      const valueAddedRate = calculateScoreValueAddedRate(
        entryZScore,
        exitZScore
      );

      // 期望：出口 - 入口 = -1.0 - (-5.2) = 4.2（显著进步）
      expect(valueAddedRate).toBeCloseTo(4.2, 2);
      expect(valueAddedRate).toBeGreaterThan(0); // 应该是正数，表示进步
    });

    it("应该正确处理正常Z-score范围", () => {
      // 场景：入口Z分数 = 0.5，出口Z分数 = 1.2
      const entryZScore = 0.5;
      const exitZScore = 1.2;

      const valueAddedRate = calculateScoreValueAddedRate(
        entryZScore,
        exitZScore
      );

      // 期望：1.2 - 0.5 = 0.7
      expect(valueAddedRate).toBeCloseTo(0.7, 2);
    });

    it("应该正确处理退步情况", () => {
      // 场景：入口Z分数 = 1.0，出口Z分数 = -0.5（退步）
      const entryZScore = 1.0;
      const exitZScore = -0.5;

      const valueAddedRate = calculateScoreValueAddedRate(
        entryZScore,
        exitZScore
      );

      // 期望：-0.5 - 1.0 = -1.5（退步）
      expect(valueAddedRate).toBeCloseTo(-1.5, 2);
      expect(valueAddedRate).toBeLessThan(0); // 应该是负数，表示退步
    });
  });

  describe("修复2: 百分位语义统一 (P0)", () => {
    it("应该确保高分=高百分位", () => {
      const scores = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];

      // 最高分（100）应该有最高百分位
      const topPercentile = calculatePercentile(100, scores);
      expect(topPercentile).toBeGreaterThan(0.85); // 接近1

      // 最低分（10）应该有最低百分位
      const bottomPercentile = calculatePercentile(10, scores);
      expect(bottomPercentile).toBeLessThan(0.15); // 接近0

      // 中等分（60）应该在中间
      const midPercentile = calculatePercentile(60, scores);
      expect(midPercentile).toBeGreaterThan(0.3);
      expect(midPercentile).toBeLessThan(0.7);
    });

    it("应该保证百分位单调性", () => {
      const scores = [100, 80, 60, 40, 20];

      const p100 = calculatePercentile(100, scores);
      const p80 = calculatePercentile(80, scores);
      const p60 = calculatePercentile(60, scores);
      const p40 = calculatePercentile(40, scores);
      const p20 = calculatePercentile(20, scores);

      // 分数越高，百分位越高
      expect(p100).toBeGreaterThan(p80);
      expect(p80).toBeGreaterThan(p60);
      expect(p60).toBeGreaterThan(p40);
      expect(p40).toBeGreaterThan(p20);
    });
  });

  describe("修复3: 贡献率负值处理 (P0)", () => {
    it("应该正确处理年级下降但教师上升的情况", () => {
      // 场景：年级优秀人数净减少10人，但该教师净增加5人（逆势增长）
      const teacherGain = 5;
      const gradeGain = -10;

      const contributionRate = calculateContributionRate(
        teacherGain,
        gradeGain
      );

      // 期望：abs(5 / -10) = 0.5（正向贡献，逆势增长）
      expect(contributionRate).toBeCloseTo(0.5, 2);
      expect(contributionRate).toBeGreaterThan(0); // 应该是正数
    });

    it("应该正确处理正常情况（年级上升）", () => {
      // 场景：年级优秀人数净增加20人，该教师净增加8人
      const teacherGain = 8;
      const gradeGain = 20;

      const contributionRate = calculateContributionRate(
        teacherGain,
        gradeGain
      );

      // 期望：8 / 20 = 0.4（40%贡献率）
      expect(contributionRate).toBeCloseTo(0.4, 2);
    });

    it("应该正确处理教师与年级同向下降", () => {
      // 场景：年级下降10人，教师也下降3人（同向）
      const teacherGain = -3;
      const gradeGain = -10;

      const contributionRate = calculateContributionRate(
        teacherGain,
        gradeGain
      );

      // 期望：-3 / -10 = 0.3（正常计算）
      expect(contributionRate).toBeCloseTo(0.3, 2);
    });

    it("应该处理年级无变化的情况", () => {
      // 场景：年级优秀人数不变
      const teacherGain = 5;
      const gradeGain = 0;

      const contributionRate = calculateContributionRate(
        teacherGain,
        gradeGain
      );

      // 期望：0（分母为0，返回0）
      expect(contributionRate).toBe(0);
    });
  });

  describe("修复4: 标准差公式 (P0)", () => {
    it("statistics.ts应该使用样本标准差（n-1）", () => {
      // 小样本数据
      const values = [100, 90, 80, 70, 60];
      const n = values.length;

      const std = calculateStandardDeviation(values);

      // 手动计算样本标准差
      const mean = values.reduce((sum, v) => sum + v, 0) / n;
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1); // n-1
      const expectedStd = Math.sqrt(variance);

      expect(std).toBeCloseTo(expectedStd, 2);
      expect(std).toBeCloseTo(15.81, 2); // 预期结果
    });

    it("statisticalAnalysis.ts应该使用样本标准差（n-1）", () => {
      // 小样本数据
      const values = [100, 90, 80, 70, 60];
      const n = values.length;

      const std = calculateStdAI(values);

      // 手动计算样本标准差
      const mean = values.reduce((sum, v) => sum + v, 0) / n;
      const variance =
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1); // n-1
      const expectedStd = Math.sqrt(variance);

      expect(std).toBeCloseTo(expectedStd, 2);
      expect(std).toBeCloseTo(15.81, 2); // 预期结果
    });

    it("应该正确处理单个样本（标准差为0）", () => {
      const values = [100];

      const std1 = calculateStandardDeviation(values);
      const std2 = calculateStdAI(values);

      expect(std1).toBe(0);
      expect(std2).toBe(0);
    });

    it("应该正确处理完全相同的值", () => {
      const values = [80, 80, 80, 80, 80];

      const std1 = calculateStandardDeviation(values);
      const std2 = calculateStdAI(values);

      expect(std1).toBe(0);
      expect(std2).toBe(0);
    });

    it("样本标准差应该大于总体标准差", () => {
      const values = [100, 90, 80, 70, 60];
      const n = values.length;

      // 样本标准差（n-1）
      const mean = values.reduce((sum, v) => sum + v, 0) / n;
      const sampleStd = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
      );

      // 总体标准差（n）
      const populationStd = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n
      );

      // 验证修复后使用的是样本标准差
      const actualStd = calculateStandardDeviation(values);
      expect(actualStd).toBeCloseTo(sampleStd, 2);
      expect(actualStd).toBeGreaterThan(populationStd); // 样本标准差更大
    });
  });

  describe("集成验证：算法一致性", () => {
    it("两个标准差实现应该产生相同结果", () => {
      const testCases = [
        [100, 90, 80, 70, 60],
        [95, 85, 75, 65, 55, 45],
        [120, 110, 100, 90, 80, 70, 60],
      ];

      testCases.forEach((values) => {
        const std1 = calculateStandardDeviation(values);
        const std2 = calculateStdAI(values);
        expect(std1).toBeCloseTo(std2, 2);
      });
    });

    it("算法修复不应影响空数组处理", () => {
      const emptyValues: number[] = [];

      expect(calculateStandardDeviation(emptyValues)).toBe(0);
      expect(calculateStdAI(emptyValues)).toBe(0);
      expect(calculatePercentile(100, emptyValues)).toBe(0);
      expect(calculateContributionRate(5, 0)).toBe(0);
    });
  });
});
