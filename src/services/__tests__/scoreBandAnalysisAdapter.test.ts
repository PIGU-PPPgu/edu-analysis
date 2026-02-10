/**
 * 数据适配层测试
 * 验证扁平结构到嵌套结构的转换
 */

import { describe, test, expect } from "vitest";
import {
  adaptScoreBandSnapshot,
  adaptScoreBandAnalysis,
} from "../scoreBandAnalysisAdapter";
import type {
  ScoreBandSnapshot,
  ScoreBandAnalysisResult,
} from "@/types/scoreBandTypes";

describe("scoreBandAnalysisAdapter", () => {
  describe("adaptScoreBandSnapshot", () => {
    test("应该正确转换扁平结构到嵌套结构", () => {
      const flatSnapshot: ScoreBandSnapshot = {
        subject: "总分",
        totalStudents: 100,
        avgScore: 620.5,
        avgScoreRank: 1,

        // 各等级
        aPlusCount: 5,
        aPlusRate: 5.0,
        aCount: 20,
        aRate: 20.0,
        bPlusCount: 25,
        bPlusRate: 25.0,
        bCount: 25,
        bRate: 25.0,
        cPlusCount: 20,
        cPlusRate: 20.0,
        cCount: 5,
        cRate: 5.0,

        // 累计项
        aPlusAboveCount: 5,
        aPlusAboveRate: 5.0,
        aAboveCount: 25,
        aAboveRate: 25.0,
        bPlusAboveCount: 50,
        bPlusAboveRate: 50.0,
        bAboveCount: 75,
        bAboveRate: 75.0,
        cPlusAboveCount: 95,
        cPlusAboveRate: 95.0,
      };

      const nested = adaptScoreBandSnapshot(flatSnapshot);

      // 基本字段
      expect(nested.subject).toBe("总分");
      expect(nested.totalCount).toBe(100); // 字段名转换
      expect(nested.avgScore).toBe(620.5);
      expect(nested.avgScoreRank).toBe(1);

      // 等级统计（嵌套格式 + 0-1 比例）
      expect(nested.gradeStats["A+"]).toEqual({
        count: 5,
        percentage: 0.05, // 5.0 / 100
      });
      expect(nested.gradeStats["A"]).toEqual({
        count: 20,
        percentage: 0.2,
      });
      expect(nested.gradeStats["B+"]).toEqual({
        count: 25,
        percentage: 0.25,
      });
      expect(nested.gradeStats["B"]).toEqual({
        count: 25,
        percentage: 0.25,
      });
      expect(nested.gradeStats["C+"]).toEqual({
        count: 20,
        percentage: 0.2,
      });
      expect(nested.gradeStats["C"]).toEqual({
        count: 5,
        percentage: 0.05,
      });

      // 累计统计
      expect(nested.cumulativeStats?.["A+以上"]).toEqual({
        count: 5,
        percentage: 0.05,
      });
      expect(nested.cumulativeStats?.["A以上"]).toEqual({
        count: 25,
        percentage: 0.25,
      });
      expect(nested.cumulativeStats?.["B+以上"]).toEqual({
        count: 50,
        percentage: 0.5,
      });
      expect(nested.cumulativeStats?.["B以上"]).toEqual({
        count: 75,
        percentage: 0.75,
      });
      expect(nested.cumulativeStats?.["C+以上"]).toEqual({
        count: 95,
        percentage: 0.95,
      });
    });

    test("应该正确处理小数比例", () => {
      const flatSnapshot: ScoreBandSnapshot = {
        subject: "语文",
        totalStudents: 97,
        avgScore: 100.0,

        aPlusCount: 4,
        aPlusRate: 4.12, // 非整数
        aCount: 20,
        aRate: 20.62,
        bPlusCount: 24,
        bPlusRate: 24.74,
        bCount: 24,
        bRate: 24.74,
        cPlusCount: 20,
        cPlusRate: 20.62,
        cCount: 5,
        cRate: 5.15,

        aPlusAboveCount: 4,
        aPlusAboveRate: 4.12,
        aAboveCount: 24,
        aAboveRate: 24.74,
        bPlusAboveCount: 48,
        bPlusAboveRate: 49.48,
        bAboveCount: 72,
        bAboveRate: 74.23,
        cPlusAboveCount: 92,
        cPlusAboveRate: 94.85,
      };

      const nested = adaptScoreBandSnapshot(flatSnapshot);

      // 验证小数转换精度
      expect(nested.gradeStats["A+"].percentage).toBeCloseTo(0.0412, 4);
      expect(nested.gradeStats["A"].percentage).toBeCloseTo(0.2062, 4);
    });
  });

  describe("adaptScoreBandAnalysis", () => {
    test("应该正确转换完整的分析结果", () => {
      const entrySnapshot: ScoreBandSnapshot = {
        subject: "总分",
        totalStudents: 100,
        avgScore: 600.0,

        aPlusCount: 5,
        aPlusRate: 5.0,
        aCount: 20,
        aRate: 20.0,
        bPlusCount: 25,
        bPlusRate: 25.0,
        bCount: 25,
        bRate: 25.0,
        cPlusCount: 20,
        cPlusRate: 20.0,
        cCount: 5,
        cRate: 5.0,

        aPlusAboveCount: 5,
        aPlusAboveRate: 5.0,
        aAboveCount: 25,
        aAboveRate: 25.0,
        bPlusAboveCount: 50,
        bPlusAboveRate: 50.0,
        bAboveCount: 75,
        bAboveRate: 75.0,
        cPlusAboveCount: 95,
        cPlusAboveRate: 95.0,
      };

      const exitSnapshot: ScoreBandSnapshot = {
        ...entrySnapshot,
        avgScore: 620.0,
        aPlusCount: 8, // 增加3人
        aPlusRate: 8.0,
        aAboveCount: 28, // A以上增加3人
        aAboveRate: 28.0,
      };

      const rawResult: ScoreBandAnalysisResult = {
        entryExam: [entrySnapshot],
        exitExam: [exitSnapshot],
        changes: {
          总分: {
            "A+": {
              countChange: 3,
              rateChange: 3.0,
            },
            A以上: {
              countChange: 3,
              rateChange: 3.0,
            },
          },
        },
      };

      const adapted = adaptScoreBandAnalysis(rawResult);

      // 验证结构
      expect(adapted.entryExam).toHaveLength(1);
      expect(adapted.exitExam).toHaveLength(1);
      expect(adapted.changes["总分"]).toBeDefined();

      // 验证入口快照
      expect(adapted.entryExam[0].subject).toBe("总分");
      expect(adapted.entryExam[0].totalCount).toBe(100);
      expect(adapted.entryExam[0].gradeStats["A+"].count).toBe(5);

      // 验证出口快照
      expect(adapted.exitExam[0].avgScore).toBe(620.0);
      expect(adapted.exitExam[0].gradeStats["A+"].count).toBe(8);

      // 验证变化统计（0-1 格式）
      expect(adapted.changes["总分"]["A+"]).toEqual({
        countChange: 3,
        percentageChange: 0.03, // 3.0 / 100
      });
      expect(adapted.changes["总分"]["A以上"]).toEqual({
        countChange: 3,
        percentageChange: 0.03,
      });
    });

    test("应该处理多个科目", () => {
      const createSnapshot = (subject: string): ScoreBandSnapshot => ({
        subject,
        totalStudents: 100,
        avgScore: 100.0,
        aPlusCount: 5,
        aPlusRate: 5.0,
        aCount: 20,
        aRate: 20.0,
        bPlusCount: 25,
        bPlusRate: 25.0,
        bCount: 25,
        bRate: 25.0,
        cPlusCount: 20,
        cPlusRate: 20.0,
        cCount: 5,
        cRate: 5.0,
        aPlusAboveCount: 5,
        aPlusAboveRate: 5.0,
        aAboveCount: 25,
        aAboveRate: 25.0,
        bPlusAboveCount: 50,
        bPlusAboveRate: 50.0,
        bAboveCount: 75,
        bAboveRate: 75.0,
        cPlusAboveCount: 95,
        cPlusAboveRate: 95.0,
      });

      const rawResult: ScoreBandAnalysisResult = {
        entryExam: [
          createSnapshot("总分"),
          createSnapshot("语文"),
          createSnapshot("数学"),
        ],
        exitExam: [
          createSnapshot("总分"),
          createSnapshot("语文"),
          createSnapshot("数学"),
        ],
        changes: {
          总分: { "A+": { countChange: 0, rateChange: 0 } },
          语文: { "A+": { countChange: 0, rateChange: 0 } },
          数学: { "A+": { countChange: 0, rateChange: 0 } },
        },
      };

      const adapted = adaptScoreBandAnalysis(rawResult);

      expect(adapted.entryExam).toHaveLength(3);
      expect(adapted.exitExam).toHaveLength(3);
      expect(Object.keys(adapted.changes)).toHaveLength(3);

      expect(adapted.entryExam[0].subject).toBe("总分");
      expect(adapted.entryExam[1].subject).toBe("语文");
      expect(adapted.entryExam[2].subject).toBe("数学");
    });
  });
});
