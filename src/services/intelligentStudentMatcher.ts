/**
 * 智能学生匹配服务
 * 实现基于学号、姓名、班级严格三选二的智能匹配算法
 *
 * 匹配规则：
 * 1. 学号+姓名 匹配 -> 精确匹配
 * 2. 学号+班级 匹配 -> 精确匹配
 * 3. 姓名+班级 匹配 -> 精确匹配
 * 4. 任意两项不匹配 -> 需要教师手动处理
 */

import { CacheManager } from './CacheManager';

export interface FileStudent {
  name: string;
  student_id?: string;
  class_name?: string;
  [key: string]: any; // 其他字段
}

export interface SystemStudent {
  id: string;
  name: string;
  student_id: string;
  class_name?: string;
  [key: string]: any; // 其他字段
}

export interface MatchResult {
  fileStudent: FileStudent;
  systemStudent?: SystemStudent;
  matchType:
    | "id_name" // 学号+姓名匹配
    | "id_class" // 学号+班级匹配
    | "name_class" // 姓名+班级匹配
    | "no_match"; // 无匹配,需要教师手动处理
  confidence: number; // 0-1之间的匹配置信度
  matchReason: string; // 匹配原因说明
  needsConfirmation: boolean; // 是否需要用户确认
  matchedFields?: string[]; // 匹配成功的字段列表
}

export interface StudentMatchingResult {
  // 精确匹配的学生 (三选二成功)
  exactMatches: MatchResult[];
  // 需要手动处理的学生 (三选二失败)
  manualReviewNeeded: MatchResult[];
  // 新学生（在文件中但不在系统中）
  newStudents: FileStudent[];
  // 缺失学生（在系统中但不在文件中）
  missingStudents: SystemStudent[];
  // 统计信息
  statistics: {
    totalFileStudents: number;
    totalSystemStudents: number;
    exactMatchCount: number;
    manualReviewCount: number;
    newStudentCount: number;
    missingStudentCount: number;
    matchRate: number; // 匹配率 (精确匹配) / 文件学生总数
  };
}

// 性能统计接口
export interface MatchPerformanceStats {
  totalMatches: number;
  averageMatchTime: number; // 毫秒
  cacheHitRate: number; // 缓存命中率
  batchProcessed: number; // 批量处理的学生数
}

/**
 * 计算字符串相似度（编辑距离算法）
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  // 计算编辑距离
  const matrix = Array(s1.length + 1)
    .fill(null)
    .map(() => Array(s2.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 删除
          matrix[i][j - 1] + 1, // 插入
          matrix[i - 1][j - 1] + 1 // 替换
        );
      }
    }
  }

  const editDistance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - editDistance / maxLength;
}

/**
 * 智能学生匹配器类
 */
export class IntelligentStudentMatcher {
  private cacheManager: CacheManager;
  private performanceStats: MatchPerformanceStats = {
    totalMatches: 0,
    averageMatchTime: 0,
    cacheHitRate: 0,
    batchProcessed: 0,
  };
  private matchTimes: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.cacheManager = new CacheManager({ ttl: 3600000 }); // 1小时缓存
  }

  /**
   * 执行智能学生匹配 (严格三选二)
   */
  public async matchStudents(
    fileStudents: FileStudent[],
    systemStudents: SystemStudent[],
    options: {
      classFilter?: string[]; // 只匹配指定班级的学生
      useCache?: boolean; // 是否使用缓存
    } = {}
  ): Promise<StudentMatchingResult> {
    const startTime = Date.now();
    const { classFilter, useCache = true } = options;

    console.log(
      `🔍 开始严格三选二匹配: 文件学生${fileStudents.length}人, 系统学生${systemStudents.length}人`
    );

    // 过滤系统学生（如果指定了班级过滤）
    const filteredSystemStudents =
      classFilter && classFilter.length > 0
        ? systemStudents.filter((s) => classFilter.includes(s.class_name || ""))
        : systemStudents;

    console.log(`📋 班级过滤后系统学生: ${filteredSystemStudents.length}人`);

    // 创建系统学生索引以提高查找性能
    const systemStudentIndex = this.buildStudentIndex(filteredSystemStudents);

    const exactMatches: MatchResult[] = [];
    const manualReviewNeeded: MatchResult[] = [];
    const matchedSystemStudentIds = new Set<string>();

    // 执行三选二匹配
    for (const fileStudent of fileStudents) {
      const cacheKey = this.generateCacheKey(fileStudent);

      // 检查缓存
      let matchResult: MatchResult | null = null;
      if (useCache) {
        matchResult = this.cacheManager.get<MatchResult>(cacheKey);
        if (matchResult) {
          this.cacheHits++;
          console.log(`💾 缓存命中: ${fileStudent.name}`);
        }
      }

      // 未命中缓存，执行匹配
      if (!matchResult) {
        this.cacheMisses++;
        matchResult = this.performThreeChooseTwo(
          fileStudent,
          systemStudentIndex,
          matchedSystemStudentIds
        );

        // 缓存结果
        if (useCache && matchResult) {
          this.cacheManager.set(cacheKey, matchResult);
        }
      }

      if (matchResult.systemStudent) {
        exactMatches.push(matchResult);
        matchedSystemStudentIds.add(matchResult.systemStudent.id);
        console.log(
          `✅ 三选二匹配成功: ${fileStudent.name} -> ${matchResult.systemStudent.name} (${matchResult.matchType})`
        );
      } else {
        manualReviewNeeded.push(matchResult);
        console.log(
          `⚠️  需要手动处理: ${fileStudent.name} - ${matchResult.matchReason}`
        );
      }
    }

    // 识别新学生（所有未匹配的文件学生）
    const newStudents = manualReviewNeeded.map((m) => m.fileStudent);

    // 识别缺失学生
    const missingStudents = filteredSystemStudents.filter(
      (ss) => !matchedSystemStudentIds.has(ss.id)
    );

    // 计算统计信息
    const statistics = {
      totalFileStudents: fileStudents.length,
      totalSystemStudents: filteredSystemStudents.length,
      exactMatchCount: exactMatches.length,
      manualReviewCount: manualReviewNeeded.length,
      newStudentCount: newStudents.length,
      missingStudentCount: missingStudents.length,
      matchRate: exactMatches.length / fileStudents.length,
    };

    // 更新性能统计
    const matchTime = Date.now() - startTime;
    this.updatePerformanceStats(matchTime, fileStudents.length);

    console.log(`📊 匹配统计:`, statistics);
    console.log(`⚡ 性能统计:`, this.getPerformanceStats());

    return {
      exactMatches,
      manualReviewNeeded,
      newStudents,
      missingStudents,
      statistics,
    };
  }

  /**
   * 批量匹配学生（性能优化版本）
   */
  public async batchMatchStudents(
    fileStudents: FileStudent[],
    systemStudents: SystemStudent[],
    options: {
      classFilter?: string[];
      batchSize?: number;
    } = {}
  ): Promise<StudentMatchingResult> {
    const { batchSize = 100 } = options;

    console.log(`📦 开始批量匹配，批次大小: ${batchSize}`);

    // 直接调用matchStudents，内部已有索引优化
    const result = await this.matchStudents(fileStudents, systemStudents, {
      classFilter: options.classFilter,
      useCache: true,
    });

    this.performanceStats.batchProcessed += fileStudents.length;

    return result;
  }

  /**
   * 构建系统学生索引（性能优化）
   */
  private buildStudentIndex(systemStudents: SystemStudent[]): {
    byStudentId: Map<string, SystemStudent>;
    byNameAndClass: Map<string, SystemStudent>;
    byStudentIdAndClass: Map<string, SystemStudent>;
  } {
    const byStudentId = new Map<string, SystemStudent>();
    const byNameAndClass = new Map<string, SystemStudent>();
    const byStudentIdAndClass = new Map<string, SystemStudent>();

    for (const student of systemStudents) {
      // 学号索引
      if (student.student_id) {
        byStudentId.set(student.student_id.trim(), student);
      }

      // 姓名+班级索引
      if (student.name && student.class_name) {
        const key = `${student.name.trim()}_${student.class_name.trim()}`;
        byNameAndClass.set(key, student);
      }

      // 学号+班级索引
      if (student.student_id && student.class_name) {
        const key = `${student.student_id.trim()}_${student.class_name.trim()}`;
        byStudentIdAndClass.set(key, student);
      }
    }

    return { byStudentId, byNameAndClass, byStudentIdAndClass };
  }

  /**
   * 执行严格三选二匹配
   * 规则：学号、姓名、班级任意两项匹配即可
   */
  private performThreeChooseTwo(
    fileStudent: FileStudent,
    systemStudentIndex: {
      byStudentId: Map<string, SystemStudent>;
      byNameAndClass: Map<string, SystemStudent>;
      byStudentIdAndClass: Map<string, SystemStudent>;
    },
    excludeIds: Set<string>
  ): MatchResult {
    const hasStudentId = !!fileStudent.student_id?.trim();
    const hasName = !!fileStudent.name?.trim();
    const hasClassName = !!fileStudent.class_name?.trim();

    // 场景1: 学号+姓名匹配（最高优先级）
    if (hasStudentId && hasName) {
      const studentByIdMatch = systemStudentIndex.byStudentId.get(
        fileStudent.student_id!.trim()
      );
      if (
        studentByIdMatch &&
        !excludeIds.has(studentByIdMatch.id) &&
        studentByIdMatch.name.trim() === fileStudent.name.trim()
      ) {
        return {
          fileStudent,
          systemStudent: studentByIdMatch,
          matchType: "id_name",
          confidence: 1.0,
          matchReason: `学号+姓名匹配: ${fileStudent.student_id} + ${fileStudent.name}`,
          needsConfirmation: false,
          matchedFields: ["student_id", "name"],
        };
      }
    }

    // 场景2: 学号+班级匹配
    if (hasStudentId && hasClassName) {
      const key = `${fileStudent.student_id!.trim()}_${fileStudent.class_name!.trim()}`;
      const studentByIdClassMatch = systemStudentIndex.byStudentIdAndClass.get(key);
      if (studentByIdClassMatch && !excludeIds.has(studentByIdClassMatch.id)) {
        return {
          fileStudent,
          systemStudent: studentByIdClassMatch,
          matchType: "id_class",
          confidence: 1.0,
          matchReason: `学号+班级匹配: ${fileStudent.student_id} + ${fileStudent.class_name}`,
          needsConfirmation: false,
          matchedFields: ["student_id", "class_name"],
        };
      }
    }

    // 场景3: 姓名+班级匹配
    if (hasName && hasClassName) {
      const key = `${fileStudent.name.trim()}_${fileStudent.class_name!.trim()}`;
      const studentByNameClassMatch = systemStudentIndex.byNameAndClass.get(key);
      if (studentByNameClassMatch && !excludeIds.has(studentByNameClassMatch.id)) {
        return {
          fileStudent,
          systemStudent: studentByNameClassMatch,
          matchType: "name_class",
          confidence: 1.0,
          matchReason: `姓名+班级匹配: ${fileStudent.name} + ${fileStudent.class_name}`,
          needsConfirmation: false,
          matchedFields: ["name", "class_name"],
        };
      }
    }

    // 无法通过三选二匹配，需要手动处理
    const availableFields = [
      hasStudentId ? "学号" : null,
      hasName ? "姓名" : null,
      hasClassName ? "班级" : null,
    ].filter(Boolean);

    return {
      fileStudent,
      systemStudent: undefined,
      matchType: "no_match",
      confidence: 0,
      matchReason: `无法通过三选二匹配 (提供的字段: ${availableFields.join("、")})，需要教师手动处理`,
      needsConfirmation: true,
      matchedFields: [],
    };
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(student: FileStudent): string {
    return `match_${student.student_id || ''}_${student.name || ''}_${student.class_name || ''}`;
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(matchTime: number, studentCount: number): void {
    this.matchTimes.push(matchTime);
    if (this.matchTimes.length > 100) {
      this.matchTimes = this.matchTimes.slice(-100); // 保留最近100次
    }

    const totalRequests = this.cacheHits + this.cacheMisses;
    this.performanceStats = {
      totalMatches: this.performanceStats.totalMatches + studentCount,
      averageMatchTime: this.matchTimes.reduce((a, b) => a + b, 0) / this.matchTimes.length,
      cacheHitRate: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
      batchProcessed: this.performanceStats.batchProcessed,
    };
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(): MatchPerformanceStats {
    return { ...this.performanceStats };
  }

  /**
   * 清除缓存
   */
  public clearCache(): void {
    this.cacheManager.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('🧹 学生匹配缓存已清除');
  }

  /**
   * 重置性能统计
   */
  public resetStats(): void {
    this.performanceStats = {
      totalMatches: 0,
      averageMatchTime: 0,
      cacheHitRate: 0,
      batchProcessed: 0,
    };
    this.matchTimes = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('📊 性能统计已重置');
  }

  /**
   * 获取匹配建议
   */
  public getMatchingSuggestions(result: StudentMatchingResult): {
    recommendations: string[];
    warnings: string[];
    actions: string[];
  } {
    const recommendations: string[] = [];
    const warnings: string[] = [];
    const actions: string[] = [];

    const { statistics, manualReviewNeeded, newStudents, missingStudents } = result;

    // 匹配率分析
    if (statistics.matchRate >= 0.9) {
      recommendations.push(
        `✅ 三选二匹配率很高 (${(statistics.matchRate * 100).toFixed(1)}%)，数据质量良好`
      );
    } else if (statistics.matchRate >= 0.7) {
      recommendations.push(
        `⚠️ 三选二匹配率中等 (${(statistics.matchRate * 100).toFixed(1)}%)，建议检查数据完整性`
      );
    } else {
      warnings.push(
        `❌ 三选二匹配率较低 (${(statistics.matchRate * 100).toFixed(1)}%)，请确认学生信息是否完整（学号、姓名、班级）`
      );
    }

    // 手动处理建议
    if (manualReviewNeeded.length > 0) {
      actions.push(
        `⚠️  需要教师手动处理 ${manualReviewNeeded.length} 个学生（无法通过三选二匹配）`
      );
      recommendations.push(
        "这些学生可能是新学生，或信息不完整，请教师逐一确认"
      );
    }

    // 新学生处理建议
    if (newStudents.length > 0) {
      actions.push(`➕ 发现 ${newStudents.length} 个新学生，需要决定是否创建`);
      if (newStudents.length / statistics.totalFileStudents > 0.2) {
        warnings.push(
          "新学生比例较高，请确认这是否是首次导入，或检查学生基础信息是否已维护"
        );
      }
    }

    // 缺失学生处理建议
    if (missingStudents.length > 0) {
      actions.push(
        `❓ 发现 ${missingStudents.length} 个学生在系统中但不在导入文件中`
      );
      if (missingStudents.length / statistics.totalSystemStudents > 0.1) {
        warnings.push("缺失学生比例较高，可能是部分学生缺考或数据不完整");
      }
    }

    return { recommendations, warnings, actions };
  }
}

// 导出默认实例
export const intelligentStudentMatcher = new IntelligentStudentMatcher();
