/**
 * 相对进步率计算工具
 * 基于深圳市教科院增值评价模型
 *
 * 核心指标：
 * - 保持值：高考等级与中考等级相同（且非最低等级9段）的学生加权比例
 * - 进步值：高考等级比中考等级提升的学生加权比例
 * - 退步值：高考等级比中考等级下降的学生加权比例
 * - 相对进步率 = (保持值 + 进步值×2) / (退步值×1.5)
 */

import type { AbilityLevel } from "@/types/valueAddedTypes";

/** 等级数字映射（1段=最高=权重9，9段=最低=权重1） */
const LEVEL_TO_NUMBER: Record<AbilityLevel, number> = {
  "1段": 1,
  "2段": 2,
  "3段": 3,
  "4段": 4,
  "5段": 5,
  "6段": 6,
  "7段": 7,
  "8段": 8,
  "9段": 9,
  // 六段映射（A+=1, A=2, B+=3, B=4, C+=5, C=6）
  "A+": 1,
  A: 2,
  "B+": 3,
  B: 4,
  "C+": 5,
  C: 6,
};

/** 等级权重（等级数字越小=越高，权重越大） */
function levelWeight(level: AbilityLevel, totalLevels: number): number {
  const n = LEVEL_TO_NUMBER[level];
  if (n === undefined) return 0;
  return totalLevels + 1 - n; // 1段→权重9，9段→权重1（9段制）
}

export interface StudentLevelData {
  student_id: string;
  entry_level: AbilityLevel;
  exit_level: AbilityLevel;
}

export interface RelativeProgressMetrics {
  /** 保持值：等级不变（排除最低段）的加权比例 */
  maintenanceValue: number;
  /** 进步值：等级提升的加权比例 */
  progressValue: number;
  /** 退步值：等级下降的加权比例 */
  regressValue: number;
  /** 相对进步率 = (保持值 + 进步值×2) / (退步值×1.5) */
  relativeProgressRate: number;
  /** 各类学生数量 */
  counts: {
    maintained: number;
    progressed: number;
    regressed: number;
    total: number;
  };
  /** 各类学生比例 */
  ratios: {
    maintained: number;
    progressed: number;
    regressed: number;
  };
}

/**
 * 计算相对进步率指标
 * @param students 学生入口/出口等级数据
 * @param totalLevels 总等级数（9段制传9，6段制传6）
 */
export function calculateRelativeProgressMetrics(
  students: StudentLevelData[],
  totalLevels: number = 9
): RelativeProgressMetrics {
  const lowestLevel = totalLevels; // 最低等级数字（9段制=9）
  const N = students.length;

  if (N === 0) {
    return {
      maintenanceValue: 0,
      progressValue: 0,
      regressValue: 0,
      relativeProgressRate: 0,
      counts: { maintained: 0, progressed: 0, regressed: 0, total: 0 },
      ratios: { maintained: 0, progressed: 0, regressed: 0 },
    };
  }

  let maintenanceSum = 0;
  let progressSum = 0;
  let regressSum = 0;
  let maintainedCount = 0;
  let progressedCount = 0;
  let regressedCount = 0;

  for (const s of students) {
    const entryN = LEVEL_TO_NUMBER[s.entry_level];
    const exitN = LEVEL_TO_NUMBER[s.exit_level];
    if (entryN === undefined || exitN === undefined) continue;

    const entryW = levelWeight(s.entry_level, totalLevels);
    const exitW = levelWeight(s.exit_level, totalLevels);

    if (exitN < entryN) {
      // 等级数字减小 = 进步（1段最高）
      progressSum += exitW;
      progressedCount++;
    } else if (exitN > entryN) {
      // 等级数字增大 = 退步
      regressSum += entryW;
      regressedCount++;
    } else {
      // 等级相同 = 保持（排除最低段）
      if (entryN !== lowestLevel) {
        maintenanceSum += entryW;
      }
      maintainedCount++;
    }
  }

  const maintenanceValue = maintenanceSum / N;
  const progressValue = progressSum / N;
  const regressValue = regressSum / N;

  // 相对进步率：分母为0时返回正无穷（全部进步/保持，无退步）
  const denominator = regressValue * 1.5;
  const relativeProgressRate =
    denominator === 0
      ? progressValue + maintenanceValue > 0
        ? Infinity
        : 1 // 全部保持且无进步退步，视为1
      : (maintenanceValue + progressValue * 2) / denominator;

  return {
    maintenanceValue,
    progressValue,
    regressValue,
    relativeProgressRate,
    counts: {
      maintained: maintainedCount,
      progressed: progressedCount,
      regressed: regressedCount,
      total: N,
    },
    ratios: {
      maintained: maintainedCount / N,
      progressed: progressedCount / N,
      regressed: regressedCount / N,
    },
  };
}

/**
 * 按班级分组计算相对进步率
 */
export function calculateByClass(
  students: (StudentLevelData & { class_name: string })[],
  totalLevels: number = 9
): Array<{ class_name: string } & RelativeProgressMetrics> {
  const byClass = new Map<string, typeof students>();
  for (const s of students) {
    const arr = byClass.get(s.class_name) ?? [];
    arr.push(s);
    byClass.set(s.class_name, arr);
  }

  return Array.from(byClass.entries())
    .map(([class_name, classStudents]) => ({
      class_name,
      ...calculateRelativeProgressMetrics(classStudents, totalLevels),
    }))
    .sort((a, b) => {
      const ra = isFinite(a.relativeProgressRate)
        ? a.relativeProgressRate
        : 999;
      const rb = isFinite(b.relativeProgressRate)
        ? b.relativeProgressRate
        : 999;
      return rb - ra;
    });
}

/** 格式化相对进步率显示 */
export function formatRelativeProgressRate(value: number): string {
  if (!isFinite(value)) return "∞";
  return value.toFixed(2);
}

/** 判断相对进步率等级 */
export function classifyRate(rate: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (!isFinite(rate) || rate >= 2)
    return { label: "优秀", color: "text-green-700", bg: "bg-green-50" };
  if (rate >= 1.5)
    return { label: "良好", color: "text-blue-700", bg: "bg-blue-50" };
  if (rate >= 1)
    return { label: "达标", color: "text-yellow-700", bg: "bg-yellow-50" };
  return { label: "待提升", color: "text-red-700", bg: "bg-red-50" };
}
