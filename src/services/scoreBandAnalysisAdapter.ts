/**
 * 数据适配层：将 calc-architect 的扁平结构转换为 ux-architect 的嵌套结构
 *
 * 用途：对接 ScoreBandComparison 组件
 * 位置：UI 层导入此适配器使用
 */

import type {
  ScoreBandSnapshot,
  ScoreBandAnalysisResult,
  GradeChangeStats,
} from "@/types/scoreBandTypes";

// ============================================
// ux-architect 的接口定义
// ============================================

/** ux-architect 期望的等级统计格式 */
interface GradeStatsNested {
  count: number;
  percentage: number; // 0-1 格式（如 0.25 表示 25%）
}

/** ux-architect 期望的科目快照格式 */
export interface ScoreBandStats {
  subject: string;
  totalCount: number; // 注意：calc-architect 使用 totalStudents
  avgScore: number;
  avgScoreRank?: number;

  // 嵌套的等级统计
  gradeStats: {
    [grade: string]: GradeStatsNested; // "A+", "A", "B+", "B", "C+", "C"
  };

  // 嵌套的累计统计（可选）
  cumulativeStats?: {
    [key: string]: GradeStatsNested; // "A+以上", "A以上", "B+以上", "B以上", "C+以上"
  };
}

/** ux-architect 期望的变化统计格式 */
export interface ChangeStatsNested {
  countChange: number;
  percentageChange: number; // 0-1 格式
}

/** ux-architect 期望的完整分析结果 */
export interface ScoreBandAnalysis {
  entryExam: ScoreBandStats[];
  exitExam: ScoreBandStats[];
  changes: {
    [subject: string]: {
      [grade: string]: ChangeStatsNested;
    };
  };
}

// ============================================
// 适配函数
// ============================================

/**
 * 将扁平的 ScoreBandSnapshot 转换为嵌套的 ScoreBandStats
 */
export function adaptScoreBandSnapshot(
  snapshot: ScoreBandSnapshot
): ScoreBandStats {
  return {
    subject: snapshot.subject,
    totalCount: snapshot.totalStudents, // 字段名转换
    avgScore: snapshot.avgScore,
    avgScoreRank: snapshot.avgScoreRank,

    // 嵌套的等级统计（6个等级）
    gradeStats: {
      "A+": {
        count: snapshot.aPlusCount,
        percentage: snapshot.aPlusRate / 100, // 转换为 0-1 格式
      },
      A: {
        count: snapshot.aCount,
        percentage: snapshot.aRate / 100,
      },
      "B+": {
        count: snapshot.bPlusCount,
        percentage: snapshot.bPlusRate / 100,
      },
      B: {
        count: snapshot.bCount,
        percentage: snapshot.bRate / 100,
      },
      "C+": {
        count: snapshot.cPlusCount,
        percentage: snapshot.cPlusRate / 100,
      },
      C: {
        count: snapshot.cCount,
        percentage: snapshot.cRate / 100,
      },
    },

    // 嵌套的累计统计（5个累计项）
    cumulativeStats: {
      "A+以上": {
        count: snapshot.aPlusAboveCount,
        percentage: snapshot.aPlusAboveRate / 100,
      },
      A以上: {
        count: snapshot.aAboveCount,
        percentage: snapshot.aAboveRate / 100,
      },
      "B+以上": {
        count: snapshot.bPlusAboveCount,
        percentage: snapshot.bPlusAboveRate / 100,
      },
      B以上: {
        count: snapshot.bAboveCount,
        percentage: snapshot.bAboveRate / 100,
      },
      "C+以上": {
        count: snapshot.cPlusAboveCount,
        percentage: snapshot.cPlusAboveRate / 100,
      },
    },
  };
}

/**
 * 转换变化统计（包括等级和累计项）
 */
function adaptChangeStats(
  changes: Record<string, GradeChangeStats>
): Record<string, ChangeStatsNested> {
  const result: Record<string, ChangeStatsNested> = {};

  for (const [key, stats] of Object.entries(changes)) {
    result[key] = {
      countChange: stats.countChange,
      percentageChange: stats.rateChange / 100, // 转换为 0-1 格式
    };
  }

  return result;
}

/**
 * 完整的适配函数：将 calc-architect 的结果转换为 ux-architect 期望的格式
 *
 * @param result - calc-architect 的计算结果（ScoreBandAnalysisResult）
 * @returns ux-architect 期望的格式（ScoreBandAnalysis）
 *
 * @example
 * import { calculateScoreBandAnalysis } from '@/services/scoreBandAnalysisService';
 * import { adaptScoreBandAnalysis } from '@/services/scoreBandAnalysisAdapter';
 *
 * const rawResult = await calculateScoreBandAnalysis(activityId);
 * const adaptedResult = adaptScoreBandAnalysis(rawResult);
 *
 * return <ScoreBandComparison data={adaptedResult} />;
 */
export function adaptScoreBandAnalysis(
  result: ScoreBandAnalysisResult
): ScoreBandAnalysis {
  // 转换入口考试快照
  const entryExam = result.entryExam.map(adaptScoreBandSnapshot);

  // 转换出口考试快照
  const exitExam = result.exitExam.map(adaptScoreBandSnapshot);

  // 转换变化统计
  const changes: Record<string, Record<string, ChangeStatsNested>> = {};
  for (const [subject, subjectChanges] of Object.entries(result.changes)) {
    changes[subject] = adaptChangeStats(subjectChanges);
  }

  return {
    entryExam,
    exitExam,
    changes,
  };
}
