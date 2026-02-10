/**
 * 数据质量分析服务
 * 用于导入数据的质量评估和异常检测
 *
 * TODO: 未来可考虑添加审计字段到数据库
 * - import_source_row: Excel原始行号
 * - import_timestamp: 导入时间
 * - data_quality_flags: JSONB标记
 */

import type { GradeScores } from "@/types/valueAddedTypes";

/**
 * 数据质量指标
 */
export interface DataQualityMetrics {
  // 基础统计
  totalRecords: number; // 总记录数
  totalStudents: number; // 学生人数
  totalSubjects: number; // 科目数

  // 缺考统计
  absentRate: number; // 缺考率 (0-1)
  absentRecordCount: number; // 缺考记录总数
  absentBySubject: Record<string, number>; // 各科目缺考人数
  absentByClass: Record<string, number>; // 各班级缺考人数

  // 异常值统计
  zeroScoreCount: number; // 0分记录数（未标记缺考的）
  nullScoreCount: number; // null分数记录数
  anomalyStudents: string[]; // 异常学生ID列表

  // 样本质量
  sampleSize: number; // 有效样本量
  completeness: number; // 数据完整性 (0-1)
  validRecordRate: number; // 有效记录率 (0-1)

  // 警告标记
  anomalyFlags: string[]; // 异常标记列表
  warnings: string[]; // 警告信息
}

/**
 * 科目列表
 */
const SUBJECT_FIELDS = [
  { field: "chinese_score", name: "语文", absentField: "chinese_absent" },
  { field: "math_score", name: "数学", absentField: "math_absent" },
  { field: "english_score", name: "英语", absentField: "english_absent" },
  { field: "physics_score", name: "物理", absentField: "physics_absent" },
  { field: "chemistry_score", name: "化学", absentField: "chemistry_absent" },
  { field: "biology_score", name: "生物", absentField: "biology_absent" },
  { field: "politics_score", name: "政治", absentField: "politics_absent" },
  { field: "history_score", name: "历史", absentField: "history_absent" },
  { field: "geography_score", name: "地理", absentField: "geography_absent" },
];

/**
 * 计算数据质量指标
 */
export function calculateDataQuality(
  grades: GradeScores[]
): DataQualityMetrics {
  // 初始化统计
  const metrics: DataQualityMetrics = {
    totalRecords: grades.length,
    totalStudents: new Set(grades.map((g) => g.student_id)).size,
    totalSubjects: SUBJECT_FIELDS.length,
    absentRate: 0,
    absentRecordCount: 0,
    absentBySubject: {},
    absentByClass: {},
    zeroScoreCount: 0,
    nullScoreCount: 0,
    anomalyStudents: [],
    sampleSize: 0,
    completeness: 0,
    validRecordRate: 0,
    anomalyFlags: [],
    warnings: [],
  };

  // 初始化科目统计
  SUBJECT_FIELDS.forEach((subject) => {
    metrics.absentBySubject[subject.name] = 0;
  });

  // 统计各项指标
  let totalScoreFields = 0;
  let validScoreFields = 0;
  let absentScoreFields = 0;
  const anomalyStudentSet = new Set<string>();

  grades.forEach((grade) => {
    const className = grade.class_name || "未知班级";

    // 遍历所有科目
    SUBJECT_FIELDS.forEach((subject) => {
      totalScoreFields++;

      const score = (grade as any)[subject.field];
      const isAbsent = (grade as any)[subject.absentField];

      // 统计缺考
      if (isAbsent) {
        absentScoreFields++;
        metrics.absentBySubject[subject.name]++;
        metrics.absentByClass[className] =
          (metrics.absentByClass[className] || 0) + 1;
      }
      // 统计0分（未标记缺考的）
      else if (score === 0) {
        metrics.zeroScoreCount++;
        anomalyStudentSet.add(grade.student_id);
      }
      // 统计null值
      else if (score === null || score === undefined) {
        metrics.nullScoreCount++;
      }
      // 有效分数
      else if (typeof score === "number" && score > 0) {
        validScoreFields++;
      }
    });
  });

  // 计算派生指标
  metrics.absentRecordCount = absentScoreFields;
  metrics.absentRate =
    totalScoreFields > 0 ? absentScoreFields / totalScoreFields : 0;
  metrics.anomalyStudents = Array.from(anomalyStudentSet);
  metrics.sampleSize = grades.length - metrics.anomalyStudents.length;
  metrics.completeness =
    totalScoreFields > 0 ? validScoreFields / totalScoreFields : 0;
  metrics.validRecordRate =
    totalScoreFields > 0
      ? (validScoreFields + absentScoreFields) / totalScoreFields
      : 0;

  // 生成警告标记
  if (metrics.absentRate > 0.3) {
    metrics.anomalyFlags.push("high_absent_rate");
    metrics.warnings.push(
      `缺考率过高 (${(metrics.absentRate * 100).toFixed(1)}%)，可能影响统计有效性`
    );
  }

  if (metrics.zeroScoreCount > 0) {
    metrics.anomalyFlags.push("unconfirmed_zero_scores");
    metrics.warnings.push(
      `检测到 ${metrics.zeroScoreCount} 条0分记录未标记缺考，请确认是否为真实成绩`
    );
  }

  if (metrics.sampleSize < 30) {
    metrics.anomalyFlags.push("small_sample_size");
    metrics.warnings.push(
      `有效样本量不足30 (当前: ${metrics.sampleSize})，统计结果可能不稳定`
    );
  }

  if (metrics.completeness < 0.7) {
    metrics.anomalyFlags.push("low_completeness");
    metrics.warnings.push(
      `数据完整性低于70% (${(metrics.completeness * 100).toFixed(1)}%)，建议检查数据源`
    );
  }

  // 检查各班级缺考率
  Object.entries(metrics.absentByClass).forEach(([className, absentCount]) => {
    const classStudents = grades.filter(
      (g) => (g.class_name || "未知班级") === className
    ).length;
    const classAbsentRate =
      absentCount / (classStudents * SUBJECT_FIELDS.length);

    if (classAbsentRate > 0.5) {
      metrics.warnings.push(
        `${className} 缺考率过高 (${(classAbsentRate * 100).toFixed(1)}%)，建议核查原因`
      );
    }
  });

  return metrics;
}

/**
 * 生成数据质量报告（可读格式）
 */
export function generateDataQualityReport(metrics: DataQualityMetrics): string {
  const lines: string[] = [];

  lines.push("📊 数据质量报告");
  lines.push("=".repeat(50));
  lines.push("");

  // 基础统计
  lines.push("✅ 基础统计：");
  lines.push(`  - 总记录数: ${metrics.totalRecords}`);
  lines.push(`  - 学生人数: ${metrics.totalStudents}`);
  lines.push(`  - 科目数量: ${metrics.totalSubjects}`);
  lines.push(`  - 有效样本量: ${metrics.sampleSize}`);
  lines.push("");

  // 数据质量
  lines.push("📈 数据质量：");
  lines.push(`  - 数据完整性: ${(metrics.completeness * 100).toFixed(1)}%`);
  lines.push(`  - 有效记录率: ${(metrics.validRecordRate * 100).toFixed(1)}%`);
  lines.push("");

  // 缺考统计
  lines.push("⚠️ 缺考统计：");
  lines.push(`  - 缺考率: ${(metrics.absentRate * 100).toFixed(1)}%`);
  lines.push(`  - 缺考记录数: ${metrics.absentRecordCount}`);

  if (Object.keys(metrics.absentBySubject).length > 0) {
    lines.push("  - 各科目缺考人数：");
    Object.entries(metrics.absentBySubject)
      .filter(([_, count]) => count > 0)
      .forEach(([subject, count]) => {
        lines.push(`    - ${subject}: ${count}人`);
      });
  }
  lines.push("");

  // 异常值
  if (
    metrics.zeroScoreCount > 0 ||
    metrics.nullScoreCount > 0 ||
    metrics.anomalyStudents.length > 0
  ) {
    lines.push("🚨 异常值检测：");
    if (metrics.zeroScoreCount > 0) {
      lines.push(`  - 未标记缺考的0分: ${metrics.zeroScoreCount}条`);
    }
    if (metrics.nullScoreCount > 0) {
      lines.push(`  - null分数记录: ${metrics.nullScoreCount}条`);
    }
    if (metrics.anomalyStudents.length > 0) {
      lines.push(`  - 异常学生数: ${metrics.anomalyStudents.length}人`);
    }
    lines.push("");
  }

  // 警告信息
  if (metrics.warnings.length > 0) {
    lines.push("⚠️ 警告信息：");
    metrics.warnings.forEach((warning) => {
      lines.push(`  - ${warning}`);
    });
    lines.push("");
  }

  // 质量评级
  let rating = "优秀";
  if (metrics.anomalyFlags.length > 0) {
    rating = "良好";
  }
  if (metrics.anomalyFlags.length > 2 || metrics.completeness < 0.7) {
    rating = "一般";
  }
  if (
    metrics.anomalyFlags.includes("small_sample_size") ||
    metrics.completeness < 0.5
  ) {
    rating = "较差";
  }

  lines.push(`📊 综合评级: ${rating}`);
  lines.push("=".repeat(50));

  return lines.join("\n");
}

/**
 * 检测批量导入数据的质量
 * @param entryGrades 入口成绩
 * @param exitGrades 出口成绩
 */
export function analyzeBatchImportQuality(params: {
  entryGrades: GradeScores[];
  exitGrades: GradeScores[];
}) {
  const entryMetrics = calculateDataQuality(params.entryGrades);
  const exitMetrics = calculateDataQuality(params.exitGrades);

  return {
    entry: entryMetrics,
    exit: exitMetrics,
    summary: {
      totalStudents: Math.max(
        entryMetrics.totalStudents,
        exitMetrics.totalStudents
      ),
      avgAbsentRate: (entryMetrics.absentRate + exitMetrics.absentRate) / 2,
      totalAnomalies:
        entryMetrics.anomalyStudents.length +
        exitMetrics.anomalyStudents.length,
      warnings: [...entryMetrics.warnings, ...exitMetrics.warnings],
    },
  };
}
