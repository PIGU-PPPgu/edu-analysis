/**
 * 高级数据转换服务
 * 负责数据预处理、转换和聚合操作
 */

import {
  GradeRecord,
  GradeData,
  Subject,
  GradeStatistics,
  GradeLevelDistribution,
} from "@/types/grade";
import {
  DataPoint,
  StatisticMetric,
  AggregationDimension,
  CorrelationVariable,
  TimeRange,
} from "@/types/advancedAnalysisAPI";

/**
 * 数据转换和预处理类
 */
export class AdvancedDataTransformer {
  /**
   * 将GradeData转换为标准化的GradeRecord格式
   */
  static normalizeGradeData(data: GradeData[]): GradeRecord[] {
    return data.map((record) => ({
      id: record.id,
      student_id: record.student_id,
      student_name: record.name || "",
      class_name: record.class_name || "",
      subject: Subject.TOTAL,
      score: record.total_score || 0,
      grade_level: record.total_grade,
      exam_id: record.exam_id,
      exam_name: record.exam_title,
      exam_date: record.exam_date,
      created_at: record.created_at,
      updated_at: record.updated_at,

      // 保留原始数据中的所有字段
      总分分数: record.total_score,
      总分等级: record.total_grade,
      总分班名: record.total_rank_in_class,
      总分校名: record.total_rank_in_school,
      总分级名: record.total_rank_in_grade,

      语文分数: record.chinese_score,
      语文等级: record.chinese_grade,
      语文班名: record.chinese_rank_in_class,

      数学分数: record.math_score,
      数学等级: record.math_grade,
      数学班名: record.math_rank_in_class,

      英语分数: record.english_score,
      英语等级: record.english_grade,
      英语班名: record.english_rank_in_class,

      物理分数: record.physics_score,
      物理等级: record.physics_grade,
      物理班名: record.physics_rank_in_class,

      化学分数: record.chemistry_score,
      化学等级: record.chemistry_grade,
      化学班名: record.chemistry_rank_in_class,

      道法分数: record.politics_score,
      道法等级: record.politics_grade,
      道法班名: record.politics_rank_in_class,

      历史分数: record.history_score,
      历史等级: record.history_grade,
      历史班名: record.history_rank_in_class,
    }));
  }

  /**
   * 提取特定科目的成绩数据
   */
  static extractSubjectScores(
    data: GradeData[],
    subject: Subject | string
  ): { studentId: string; score: number; date?: string }[] {
    const subjectFieldMap: Record<string, string> = {
      [Subject.CHINESE]: "chinese_score",
      [Subject.MATH]: "math_score",
      [Subject.ENGLISH]: "english_score",
      [Subject.PHYSICS]: "physics_score",
      [Subject.CHEMISTRY]: "chemistry_score",
      [Subject.POLITICS]: "politics_score",
      [Subject.HISTORY]: "history_score",
      [Subject.TOTAL]: "total_score",
    };

    const field = subjectFieldMap[subject] || "total_score";

    return data
      .filter((record) => record[field as keyof GradeData] !== null)
      .map((record) => ({
        studentId: record.student_id,
        score: Number(record[field as keyof GradeData]) || 0,
        date: record.exam_date,
      }));
  }

  /**
   * 计算统计指标
   */
  static calculateMetrics(
    values: number[],
    metrics: StatisticMetric[]
  ): Record<StatisticMetric, number> {
    const result: Partial<Record<StatisticMetric, number>> = {};

    if (values.length === 0) {
      metrics.forEach((metric) => (result[metric] = 0));
      return result as Record<StatisticMetric, number>;
    }

    const sortedValues = [...values].sort((a, b) => a - b);

    metrics.forEach((metric) => {
      switch (metric) {
        case StatisticMetric.MEAN:
          result[metric] = values.reduce((a, b) => a + b, 0) / values.length;
          break;

        case StatisticMetric.MEDIAN:
          const mid = Math.floor(sortedValues.length / 2);
          result[metric] =
            sortedValues.length % 2 === 0
              ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
              : sortedValues[mid];
          break;

        case StatisticMetric.MODE:
          const frequency: Record<number, number> = {};
          values.forEach((v) => (frequency[v] = (frequency[v] || 0) + 1));
          const maxFreq = Math.max(...Object.values(frequency));
          const modes = Object.entries(frequency)
            .filter(([_, freq]) => freq === maxFreq)
            .map(([val]) => Number(val));
          result[metric] = modes[0]; // 返回第一个众数
          break;

        case StatisticMetric.VARIANCE:
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          result[metric] =
            values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
            values.length;
          break;

        case StatisticMetric.STD_DEV:
          const variance = this.calculateMetrics(values, [
            StatisticMetric.VARIANCE,
          ])[StatisticMetric.VARIANCE];
          result[metric] = Math.sqrt(variance);
          break;

        case StatisticMetric.MIN:
          result[metric] = Math.min(...values);
          break;

        case StatisticMetric.MAX:
          result[metric] = Math.max(...values);
          break;

        case StatisticMetric.SUM:
          result[metric] = values.reduce((a, b) => a + b, 0);
          break;

        case StatisticMetric.COUNT:
          result[metric] = values.length;
          break;
      }
    });

    return result as Record<StatisticMetric, number>;
  }

  /**
   * 数据分组聚合
   */
  static groupByDimensions(
    data: GradeRecord[],
    dimensions: string[]
  ): Map<string, GradeRecord[]> {
    const groups = new Map<string, GradeRecord[]>();

    data.forEach((record) => {
      const key = dimensions
        .map((dim) => record[dim as keyof GradeRecord] || "unknown")
        .join("|");

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record);
    });

    return groups;
  }

  /**
   * 时间序列数据转换
   */
  static toTimeSeries(
    data: GradeRecord[],
    valueField: string,
    timeField: string = "exam_date",
    aggregation: "avg" | "sum" | "min" | "max" = "avg"
  ): DataPoint[] {
    // 按时间分组
    const timeGroups = new Map<string, number[]>();

    data.forEach((record) => {
      const time = record[timeField as keyof GradeRecord] as string;
      const value = Number(record[valueField as keyof GradeRecord]) || 0;

      if (time) {
        if (!timeGroups.has(time)) {
          timeGroups.set(time, []);
        }
        timeGroups.get(time)!.push(value);
      }
    });

    // 聚合并转换为DataPoint
    return Array.from(timeGroups.entries())
      .map(([timestamp, values]) => {
        let aggregatedValue = 0;

        switch (aggregation) {
          case "avg":
            aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case "sum":
            aggregatedValue = values.reduce((a, b) => a + b, 0);
            break;
          case "min":
            aggregatedValue = Math.min(...values);
            break;
          case "max":
            aggregatedValue = Math.max(...values);
            break;
        }

        return {
          timestamp,
          value: aggregatedValue,
          label: `${timestamp} (${values.length} records)`,
        };
      })
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }

  /**
   * 计算移动平均
   */
  static calculateMovingAverage(
    dataPoints: DataPoint[],
    window: number
  ): DataPoint[] {
    if (dataPoints.length < window) return dataPoints;

    return dataPoints
      .map((point, index) => {
        if (index < window - 1) {
          return { ...point, value: NaN };
        }

        const windowValues = dataPoints
          .slice(index - window + 1, index + 1)
          .map((p) => p.value);

        const average = windowValues.reduce((a, b) => a + b, 0) / window;

        return {
          ...point,
          value: average,
          metadata: {
            ...point.metadata,
            smoothingMethod: "moving_average",
            window,
          },
        };
      })
      .filter((point) => !isNaN(point.value));
  }

  /**
   * 数据标准化（Z-score）
   */
  static standardize(values: number[]): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        values.length
    );

    if (stdDev === 0) return values.map(() => 0);

    return values.map((value) => (value - mean) / stdDev);
  }

  /**
   * 数据归一化（Min-Max）
   */
  static normalize(values: number[], min = 0, max = 1): number[] {
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin;

    if (range === 0) return values.map(() => (min + max) / 2);

    return values.map(
      (value) => min + ((value - dataMin) / range) * (max - min)
    );
  }

  /**
   * 计算百分位数
   */
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (lower === upper) return sorted[lower];

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * 数据分箱（用于连续变量离散化）
   */
  static binData(
    values: number[],
    method: "equal_width" | "equal_frequency" | "custom",
    bins: number | number[] = 5
  ): { value: number; bin: number }[] {
    if (values.length === 0) return [];

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    let binEdges: number[] = [];

    if (method === "equal_width" && typeof bins === "number") {
      const width = (max - min) / bins;
      binEdges = Array.from({ length: bins + 1 }, (_, i) => min + i * width);
    } else if (method === "equal_frequency" && typeof bins === "number") {
      const binSize = Math.ceil(sorted.length / bins);
      binEdges = [min];
      for (let i = binSize; i < sorted.length; i += binSize) {
        binEdges.push(sorted[i]);
      }
      binEdges.push(max);
    } else if (method === "custom" && Array.isArray(bins)) {
      binEdges = bins;
    }

    return values.map((value) => {
      const bin = binEdges.findIndex(
        (edge, i) =>
          i < binEdges.length - 1 && value >= edge && value < binEdges[i + 1]
      );
      return { value, bin: bin === -1 ? binEdges.length - 2 : bin };
    });
  }

  /**
   * 过滤时间范围内的数据
   */
  static filterByTimeRange(
    data: GradeRecord[],
    timeRange: TimeRange,
    timeField: string = "exam_date"
  ): GradeRecord[] {
    const startTime = new Date(timeRange.start).getTime();
    const endTime = new Date(timeRange.end).getTime();

    return data.filter((record) => {
      const recordTime = record[timeField as keyof GradeRecord];
      if (!recordTime) return false;

      const time = new Date(recordTime as string).getTime();
      return time >= startTime && time <= endTime;
    });
  }

  /**
   * 计算相关系数（皮尔逊相关）
   */
  static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * 检测异常值（基于IQR方法）
   */
  static detectOutliers(
    values: number[],
    multiplier: number = 1.5
  ): { value: number; index: number; isOutlier: boolean }[] {
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.calculatePercentile(sorted, 25);
    const q3 = this.calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - multiplier * iqr;
    const upperBound = q3 + multiplier * iqr;

    return values.map((value, index) => ({
      value,
      index,
      isOutlier: value < lowerBound || value > upperBound,
    }));
  }

  /**
   * 数据插值（线性插值）
   */
  static interpolateMissingValues(dataPoints: DataPoint[]): DataPoint[] {
    const result = [...dataPoints];

    for (let i = 0; i < result.length; i++) {
      if (isNaN(result[i].value) || result[i].value === null) {
        // 找到前后的有效值
        let prevIndex = i - 1;
        let nextIndex = i + 1;

        while (
          prevIndex >= 0 &&
          (isNaN(result[prevIndex].value) || result[prevIndex].value === null)
        ) {
          prevIndex--;
        }

        while (
          nextIndex < result.length &&
          (isNaN(result[nextIndex].value) || result[nextIndex].value === null)
        ) {
          nextIndex++;
        }

        if (prevIndex >= 0 && nextIndex < result.length) {
          // 线性插值
          const prevTime = new Date(result[prevIndex].timestamp).getTime();
          const nextTime = new Date(result[nextIndex].timestamp).getTime();
          const currentTime = new Date(result[i].timestamp).getTime();

          const ratio = (currentTime - prevTime) / (nextTime - prevTime);
          result[i].value =
            result[prevIndex].value +
            (result[nextIndex].value - result[prevIndex].value) * ratio;

          result[i].metadata = {
            ...result[i].metadata,
            interpolated: true,
            method: "linear",
          };
        }
      }
    }

    return result;
  }
}
