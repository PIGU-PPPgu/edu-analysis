/**
 * 动态等级计算器
 * 支持根据数据库配置动态计算学生等级
 *
 * 使用场景：
 * - 高中9段评价：按照用户自定义的9段比例计算
 * - 标准6级评价：按照固定的A+~C等级计算
 *
 * 核心原理：
 * 1. 从grade_levels_config表读取等级配置
 * 2. 根据学生排名百分位动态匹配等级
 * 3. 支持任意数量的等级段位
 */

import { getGradeLevelConfigById } from "@/services/gradeLevelConfigService";

/**
 * 数据库中的等级定义
 */
export interface GradeLevelInDB {
  level: string; // "A+" 或 "1段" 或 "2段"
  label: string; // "优秀+" 或 "顶尖生"
  percentile: {
    min: number; // 0.00-1.00
    max: number; // 0.00-1.00
  };
  color?: string; // 颜色代码
  description: string; // 描述
}

/**
 * 动态等级配置缓存
 * 避免重复查询数据库
 */
const configCache = new Map<
  string,
  {
    levels: GradeLevelInDB[];
    timestamp: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 根据配置ID加载等级定义（带缓存）
 */
export async function loadGradeLevelConfig(
  configId: string
): Promise<GradeLevelInDB[] | null> {
  // 检查缓存
  const cached = configCache.get(configId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.levels;
  }

  // 从数据库加载
  const result = await getGradeLevelConfigById(configId);
  if (!result.success || !result.config) {
    console.error(`加载等级配置失败: ${result.error}`);
    return null;
  }

  const levels = result.config.levels as GradeLevelInDB[];

  // 更新缓存
  configCache.set(configId, {
    levels,
    timestamp: Date.now(),
  });

  return levels;
}

/**
 * 根据动态配置计算学生等级
 * @param rank 学生排名（1开始，越小越靠前）
 * @param totalStudents 总学生数
 * @param levels 等级配置（从数据库加载）
 * @returns 匹配的等级定义
 */
export function calculateGradeByDynamicConfig(
  rank: number,
  totalStudents: number,
  levels: GradeLevelInDB[]
): GradeLevelInDB | null {
  if (totalStudents <= 0 || rank <= 0 || levels.length === 0) {
    return null;
  }

  // 计算排名百分位（0.00-1.00）
  // 例如：rank=1, total=100 → percentile=0.01 (前1%)
  const rankPercentile = rank / totalStudents;

  // 从前往后匹配等级
  for (const level of levels) {
    if (
      rankPercentile >= level.percentile.min &&
      rankPercentile < level.percentile.max
    ) {
      return level;
    }
  }

  // 如果没有匹配（通常是最后一段），返回最后一个等级
  return levels[levels.length - 1];
}

/**
 * 批量计算学生等级（带配置ID）
 * @param students 学生列表（包含排名）
 * @param totalStudents 总学生数
 * @param configId 等级配置ID
 * @returns 学生ID到等级的映射
 */
export async function batchCalculateGrades(
  students: Array<{ id: string; rank: number }>,
  totalStudents: number,
  configId: string
): Promise<Map<string, GradeLevelInDB>> {
  const result = new Map<string, GradeLevelInDB>();

  // 加载配置
  const levels = await loadGradeLevelConfig(configId);
  if (!levels) {
    console.error("无法加载等级配置，批量计算失败");
    return result;
  }

  // 批量计算
  for (const student of students) {
    const grade = calculateGradeByDynamicConfig(
      student.rank,
      totalStudents,
      levels
    );
    if (grade) {
      result.set(student.id, grade);
    }
  }

  return result;
}

/**
 * 计算等级流转矩阵
 * 用于展示学生从入口等级到出口等级的流转情况
 *
 * @param students 学生列表（包含入口和出口排名）
 * @param totalStudents 总学生数
 * @param levels 等级配置
 * @returns 等级流转矩阵 [入口等级][出口等级] = 学生数
 */
export function calculateGradeTransitionMatrix(
  students: Array<{ entryRank: number; exitRank: number }>,
  totalStudents: number,
  levels: GradeLevelInDB[]
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();

  // 初始化矩阵
  for (const entryLevel of levels) {
    const row = new Map<string, number>();
    for (const exitLevel of levels) {
      row.set(exitLevel.level, 0);
    }
    matrix.set(entryLevel.level, row);
  }

  // 统计流转
  for (const student of students) {
    const entryGrade = calculateGradeByDynamicConfig(
      student.entryRank,
      totalStudents,
      levels
    );
    const exitGrade = calculateGradeByDynamicConfig(
      student.exitRank,
      totalStudents,
      levels
    );

    if (entryGrade && exitGrade) {
      const row = matrix.get(entryGrade.level);
      if (row) {
        row.set(exitGrade.level, (row.get(exitGrade.level) || 0) + 1);
      }
    }
  }

  return matrix;
}

/**
 * 计算各等级的巩固率和转化率（适用于9段评价）
 *
 * 巩固率：入口在该等级的学生，出口仍保持或提升的比例
 * 转化率：入口低于该等级的学生，出口提升到该等级的比例
 *
 * @param students 学生列表
 * @param totalStudents 总学生数
 * @param levels 等级配置
 * @returns 各等级的巩固率和转化率
 */
export function calculateLevelRetentionAndTransformation(
  students: Array<{ entryRank: number; exitRank: number }>,
  totalStudents: number,
  levels: GradeLevelInDB[]
): Map<
  string,
  {
    consolidationRate: number;
    transformationRate: number;
    entryCount: number;
    maintainedOrImproved: number;
    transformedIn: number;
  }
> {
  const result = new Map();

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];

    // 入口在该等级的学生
    const entryInLevel = students.filter((s) => {
      const entryGrade = calculateGradeByDynamicConfig(
        s.entryRank,
        totalStudents,
        levels
      );
      return entryGrade?.level === level.level;
    });

    // 这些学生中，出口仍保持或提升的数量
    const maintainedOrImproved = entryInLevel.filter((s) => {
      const exitGrade = calculateGradeByDynamicConfig(
        s.exitRank,
        totalStudents,
        levels
      );
      if (!exitGrade) return false;

      // 找到出口等级的索引
      const exitIndex = levels.findIndex((l) => l.level === exitGrade.level);
      // 如果出口等级索引 <= 当前等级索引，说明保持或提升了
      return exitIndex <= i;
    }).length;

    // 巩固率
    const consolidationRate =
      entryInLevel.length > 0 ? maintainedOrImproved / entryInLevel.length : 0;

    // 入口低于该等级的学生
    const entryBelowLevel = students.filter((s) => {
      const entryGrade = calculateGradeByDynamicConfig(
        s.entryRank,
        totalStudents,
        levels
      );
      if (!entryGrade) return false;
      const entryIndex = levels.findIndex((l) => l.level === entryGrade.level);
      return entryIndex > i; // 索引大于当前等级，说明排名更靠后
    });

    // 这些学生中，出口提升到该等级或更高的数量
    const transformedIn = entryBelowLevel.filter((s) => {
      const exitGrade = calculateGradeByDynamicConfig(
        s.exitRank,
        totalStudents,
        levels
      );
      if (!exitGrade) return false;
      const exitIndex = levels.findIndex((l) => l.level === exitGrade.level);
      return exitIndex <= i; // 出口等级索引 <= 当前等级，说明提升到该等级或更高
    }).length;

    // 转化率
    const transformationRate =
      entryBelowLevel.length > 0 ? transformedIn / entryBelowLevel.length : 0;

    result.set(level.level, {
      consolidationRate,
      transformationRate,
      entryCount: entryInLevel.length,
      maintainedOrImproved,
      transformedIn,
    });
  }

  return result;
}

/**
 * 清除配置缓存
 * 用于配置更新后强制重新加载
 */
export function clearConfigCache(configId?: string) {
  if (configId) {
    configCache.delete(configId);
  } else {
    configCache.clear();
  }
}
