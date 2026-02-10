/**
 * 分数段对比分析 - Mock数据
 * 用于UI开发和测试
 */

import type { ScoreBandAnalysis } from "./ScoreBandComparison";

export const mockScoreBandData: ScoreBandAnalysis = {
  entryExam: [
    {
      subject: "语文",
      totalCount: 50,
      avgScore: 82.5,
      avgScoreRank: 3,
      gradeStats: {
        "A+": { count: 3, percentage: 0.06 },
        A: { count: 10, percentage: 0.2 },
        "B+": { count: 12, percentage: 0.24 },
        B: { count: 15, percentage: 0.3 },
        "C+": { count: 8, percentage: 0.16 },
        C: { count: 2, percentage: 0.04 },
      },
      cumulativeStats: {
        "A+以上": { count: 3, percentage: 0.06 },
        A以上: { count: 13, percentage: 0.26 },
        "B+以上": { count: 25, percentage: 0.5 },
        B以上: { count: 40, percentage: 0.8 },
        "C+以上": { count: 48, percentage: 0.96 },
      },
    },
    {
      subject: "数学",
      totalCount: 50,
      avgScore: 78.3,
      avgScoreRank: 5,
      gradeStats: {
        "A+": { count: 2, percentage: 0.04 },
        A: { count: 8, percentage: 0.16 },
        "B+": { count: 15, percentage: 0.3 },
        B: { count: 13, percentage: 0.26 },
        "C+": { count: 10, percentage: 0.2 },
        C: { count: 2, percentage: 0.04 },
      },
      cumulativeStats: {
        "A+以上": { count: 2, percentage: 0.04 },
        A以上: { count: 10, percentage: 0.2 },
        "B+以上": { count: 25, percentage: 0.5 },
        B以上: { count: 38, percentage: 0.76 },
        "C+以上": { count: 48, percentage: 0.96 },
      },
    },
    {
      subject: "英语",
      totalCount: 50,
      avgScore: 85.2,
      avgScoreRank: 2,
      gradeStats: {
        "A+": { count: 4, percentage: 0.08 },
        A: { count: 12, percentage: 0.24 },
        "B+": { count: 14, percentage: 0.28 },
        B: { count: 12, percentage: 0.24 },
        "C+": { count: 6, percentage: 0.12 },
        C: { count: 2, percentage: 0.04 },
      },
      cumulativeStats: {
        "A+以上": { count: 4, percentage: 0.08 },
        A以上: { count: 16, percentage: 0.32 },
        "B+以上": { count: 30, percentage: 0.6 },
        B以上: { count: 42, percentage: 0.84 },
        "C+以上": { count: 48, percentage: 0.96 },
      },
    },
  ],

  exitExam: [
    {
      subject: "语文",
      totalCount: 50,
      avgScore: 84.8,
      avgScoreRank: 2,
      gradeStats: {
        "A+": { count: 5, percentage: 0.1 }, // +2人
        A: { count: 12, percentage: 0.24 }, // +2人
        "B+": { count: 13, percentage: 0.26 }, // +1人
        B: { count: 12, percentage: 0.24 }, // -3人
        "C+": { count: 6, percentage: 0.12 }, // -2人
        C: { count: 2, percentage: 0.04 }, // 持平
      },
      cumulativeStats: {
        "A+以上": { count: 5, percentage: 0.1 }, // +2人
        A以上: { count: 17, percentage: 0.34 }, // +4人
        "B+以上": { count: 30, percentage: 0.6 }, // +5人
        B以上: { count: 42, percentage: 0.84 }, // +2人
        "C+以上": { count: 48, percentage: 0.96 }, // 持平
      },
    },
    {
      subject: "数学",
      totalCount: 50,
      avgScore: 81.5,
      avgScoreRank: 3,
      gradeStats: {
        "A+": { count: 4, percentage: 0.08 }, // +2人
        A: { count: 11, percentage: 0.22 }, // +3人
        "B+": { count: 16, percentage: 0.32 }, // +1人
        B: { count: 10, percentage: 0.2 }, // -3人
        "C+": { count: 8, percentage: 0.16 }, // -2人
        C: { count: 1, percentage: 0.02 }, // -1人
      },
      cumulativeStats: {
        "A+以上": { count: 4, percentage: 0.08 }, // +2人
        A以上: { count: 15, percentage: 0.3 }, // +5人
        "B+以上": { count: 31, percentage: 0.62 }, // +6人
        B以上: { count: 41, percentage: 0.82 }, // +3人
        "C+以上": { count: 49, percentage: 0.98 }, // +1人
      },
    },
    {
      subject: "英语",
      totalCount: 50,
      avgScore: 86.7,
      avgScoreRank: 1,
      gradeStats: {
        "A+": { count: 6, percentage: 0.12 }, // +2人
        A: { count: 14, percentage: 0.28 }, // +2人
        "B+": { count: 15, percentage: 0.3 }, // +1人
        B: { count: 10, percentage: 0.2 }, // -2人
        "C+": { count: 4, percentage: 0.08 }, // -2人
        C: { count: 1, percentage: 0.02 }, // -1人
      },
      cumulativeStats: {
        "A+以上": { count: 6, percentage: 0.12 }, // +2人
        A以上: { count: 20, percentage: 0.4 }, // +4人
        "B+以上": { count: 35, percentage: 0.7 }, // +5人
        B以上: { count: 45, percentage: 0.9 }, // +3人
        "C+以上": { count: 49, percentage: 0.98 }, // +1人
      },
    },
  ],

  changes: {
    语文: {
      "A+": { countChange: 2, percentageChange: 0.04 },
      A: { countChange: 2, percentageChange: 0.04 },
      "B+": { countChange: 1, percentageChange: 0.02 },
      B: { countChange: -3, percentageChange: -0.06 },
      "C+": { countChange: -2, percentageChange: -0.04 },
      C: { countChange: 0, percentageChange: 0 },
      "A+以上": { countChange: 2, percentageChange: 0.04 },
      A以上: { countChange: 4, percentageChange: 0.08 },
      "B+以上": { countChange: 5, percentageChange: 0.1 },
      B以上: { countChange: 2, percentageChange: 0.04 },
      "C+以上": { countChange: 0, percentageChange: 0 },
    },
    数学: {
      "A+": { countChange: 2, percentageChange: 0.04 },
      A: { countChange: 3, percentageChange: 0.06 },
      "B+": { countChange: 1, percentageChange: 0.02 },
      B: { countChange: -3, percentageChange: -0.06 },
      "C+": { countChange: -2, percentageChange: -0.04 },
      C: { countChange: -1, percentageChange: -0.02 },
      "A+以上": { countChange: 2, percentageChange: 0.04 },
      A以上: { countChange: 5, percentageChange: 0.1 },
      "B+以上": { countChange: 6, percentageChange: 0.12 },
      B以上: { countChange: 3, percentageChange: 0.06 },
      "C+以上": { countChange: 1, percentageChange: 0.02 },
    },
    英语: {
      "A+": { countChange: 2, percentageChange: 0.04 },
      A: { countChange: 2, percentageChange: 0.04 },
      "B+": { countChange: 1, percentageChange: 0.02 },
      B: { countChange: -2, percentageChange: -0.04 },
      "C+": { countChange: -2, percentageChange: -0.04 },
      C: { countChange: -1, percentageChange: -0.02 },
      "A+以上": { countChange: 2, percentageChange: 0.04 },
      A以上: { countChange: 4, percentageChange: 0.08 },
      "B+以上": { countChange: 5, percentageChange: 0.1 },
      B以上: { countChange: 3, percentageChange: 0.06 },
      "C+以上": { countChange: 1, percentageChange: 0.02 },
    },
  },
};
