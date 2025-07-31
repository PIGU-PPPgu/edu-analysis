/**
 * 高级统计API使用示例
 * 展示如何使用批量统计、相关性分析、预测和异常检测功能
 */

import { advancedStatisticsAPI } from "./advancedStatisticsAPI";
import {
  StatisticMetric,
  PredictionModelType,
  AnomalyAlgorithm,
  Subject,
} from "@/types/advancedAnalysisAPI";

/**
 * 示例1: 批量统计计算
 * 获取多个考试、班级的综合统计数据
 */
export async function exampleBatchStatistics() {
  const response = await advancedStatisticsAPI.batchStatistics(
    {
      examIds: ["exam1", "exam2", "exam3"],
      classNames: ["九(1)班", "九(2)班"],
      subjects: [Subject.MATH, Subject.CHINESE],
      metrics: [
        StatisticMetric.MEAN,
        StatisticMetric.MEDIAN,
        StatisticMetric.STD_DEV,
        StatisticMetric.PERCENTILE,
      ],
      groupBy: ["exam", "class", "subject"],
      filters: {
        minScore: 60,
        maxScore: 100,
      },
    },
    {
      enabled: true,
      ttl: 300, // 缓存5分钟
    }
  );

  if (response.success && response.data) {
    console.log("批量统计结果:");
    response.data.data.forEach((result) => {
      console.log(`组: ${result.groupKey}`);
      console.log(`样本量: ${result.sampleSize}`);
      console.log(`平均分: ${result.metrics[StatisticMetric.MEAN]}`);
      console.log(`标准差: ${result.metrics[StatisticMetric.STD_DEV]}`);
    });
  }
}

/**
 * 示例2: 相关性分析
 * 分析不同科目成绩之间的相关性
 */
export async function exampleCorrelationAnalysis() {
  const response = await advancedStatisticsAPI.correlationAnalysis({
    variables: [
      {
        name: "数学成绩",
        source: "grade",
        field: "math_score",
        subject: Subject.MATH,
      },
      {
        name: "物理成绩",
        source: "grade",
        field: "physics_score",
        subject: Subject.PHYSICS,
      },
      {
        name: "英语成绩",
        source: "grade",
        field: "english_score",
        subject: Subject.ENGLISH,
      },
    ],
    method: "pearson",
    includeSignificance: true,
    timeRange: {
      start: "2024-01-01",
      end: "2024-12-31",
    },
  });

  if (response.success && response.data) {
    console.log("相关性矩阵:");
    const { correlationMatrix, interpretation } = response.data;

    // 打印相关性矩阵
    correlationMatrix.variables.forEach((var1, i) => {
      correlationMatrix.variables.forEach((var2, j) => {
        console.log(
          `${var1} vs ${var2}: ${correlationMatrix.values[i][j].toFixed(3)}`
        );
      });
    });

    // 打印解释
    interpretation?.forEach((text) => console.log(text));
  }
}

/**
 * 示例3: 成绩预测
 * 基于历史数据预测学生未来成绩
 */
export async function examplePrediction() {
  const response = await advancedStatisticsAPI.prediction({
    modelType: PredictionModelType.LINEAR_REGRESSION,
    targetVariable: {
      field: "total_score",
      subject: Subject.TOTAL,
    },
    features: ["math_score", "chinese_score", "english_score"],
    trainingData: {
      examIds: ["exam1", "exam2", "exam3"],
      timeRange: {
        start: "2023-09-01",
        end: "2024-06-30",
      },
    },
    predictionScope: {
      students: ["student1", "student2", "student3"],
    },
    confidence: 0.95,
  });

  if (response.success && response.data) {
    console.log("预测结果:");
    response.data.predictions.forEach((pred) => {
      console.log(`学生 ${pred.studentId}:`);
      pred.predictions.forEach((p) => {
        console.log(`  预测分数: ${p.value.toFixed(2)}`);
        console.log(`  置信度: ${p.confidence}`);
        console.log(
          `  置信区间: [${p.confidenceInterval[0]}, ${p.confidenceInterval[1]}]`
        );
      });
    });

    console.log("\n模型信息:");
    console.log(`准确度: ${response.data.model.accuracy}`);
    console.log(`RMSE: ${response.data.validation?.rmse}`);
  }
}

/**
 * 示例4: 异常检测
 * 检测成绩数据中的异常情况
 */
export async function exampleAnomalyDetection() {
  const response = await advancedStatisticsAPI.anomalyDetection({
    algorithm: AnomalyAlgorithm.STATISTICAL,
    scope: {
      examIds: ["exam1"],
      classNames: ["九(1)班", "九(2)班"],
      timeRange: {
        start: "2024-01-01",
        end: "2024-12-31",
      },
    },
    sensitivity: 0.7, // 较高的灵敏度
    dimensions: ["score", "rank"],
    contextual: true,
  });

  if (response.success && response.data) {
    console.log("异常检测结果:");
    console.log(`总记录数: ${response.data.statistics.totalRecords}`);
    console.log(`异常数量: ${response.data.statistics.anomalyCount}`);
    console.log(
      `异常率: ${(response.data.statistics.anomalyRate * 100).toFixed(2)}%`
    );

    response.data.anomalies.forEach((anomaly) => {
      console.log(`\n异常ID: ${anomaly.id}`);
      console.log(`类型: ${anomaly.type}`);
      console.log(`严重程度: ${anomaly.severity}`);
      console.log(`原因: ${anomaly.reason}`);
      console.log(`建议: ${anomaly.suggestions?.join(", ")}`);
    });
  }
}

/**
 * 示例5: 多维度聚合分析
 * 按班级、科目、时间等多个维度聚合数据
 */
export async function exampleMultiDimensionalAggregation() {
  const response = await advancedStatisticsAPI.multiDimensionalAggregation({
    dimensions: [
      {
        field: "class_name",
        type: "categorical",
      },
      {
        field: "exam_date",
        type: "temporal",
        timeGranularity: "month",
      },
    ],
    metrics: [
      {
        field: "total_score",
        aggregation: "avg",
      },
      {
        field: "student_id",
        aggregation: "count",
      },
      {
        field: "total_score",
        aggregation: "percentile",
        percentile: 75,
      },
    ],
    having: [
      {
        metric: "total_score",
        operator: ">",
        value: 350,
      },
    ],
    sort: [
      {
        field: "total_score",
        order: "desc",
      },
    ],
    limit: 10,
  });

  if (response.success && response.data) {
    console.log("聚合分析结果:");
    response.data.data.forEach((result) => {
      console.log(`\n维度: ${JSON.stringify(result.dimensions)}`);
      console.log(`平均分: ${result.metrics.total_score?.toFixed(2)}`);
      console.log(`学生数: ${result.metrics.student_id}`);
      console.log(`占比: ${result.percentage?.toFixed(2)}%`);
    });
  }
}

/**
 * 示例6: 趋势分析与预测
 * 分析成绩随时间的变化趋势并预测未来
 */
export async function exampleTrendAnalysis() {
  const response = await advancedStatisticsAPI.trendAnalysis({
    metric: {
      field: "total_score",
      subject: Subject.TOTAL,
      aggregation: "avg",
    },
    timeRange: {
      start: "2023-01-01",
      end: "2024-12-31",
      granularity: "month",
    },
    groupBy: ["class_name"],
    smoothing: {
      method: "moving_average",
      window: 3,
    },
    forecast: {
      periods: 6, // 预测未来6个月
      method: "linear",
    },
  });

  if (response.success && response.data) {
    console.log("趋势分析结果:");
    console.log(`整体趋势: ${response.data.statistics.overallTrend}`);
    console.log(`变化率: ${response.data.statistics.changeRate.toFixed(2)}%`);
    console.log(`波动性: ${response.data.statistics.volatility.toFixed(3)}`);

    if (response.data.forecast) {
      console.log("\n预测数据:");
      response.data.forecast.forEach((forecast) => {
        forecast.dataPoints.forEach((point) => {
          console.log(
            `时间: ${point.timestamp}, 预测值: ${point.value.toFixed(2)}`
          );
        });
      });
    }
  }
}

/**
 * 示例7: 综合分析流程
 * 结合多个API完成完整的分析任务
 */
export async function exampleComprehensiveAnalysis() {
  console.log("=== 开始综合分析 ===\n");

  // 步骤1: 批量统计获取基础数据
  console.log("1. 执行批量统计...");
  const statsResponse = await advancedStatisticsAPI.batchStatistics({
    examIds: ["exam1", "exam2"],
    metrics: [StatisticMetric.MEAN, StatisticMetric.STD_DEV],
    groupBy: ["exam"],
  });

  if (!statsResponse.success) {
    console.error("批量统计失败:", statsResponse.error);
    return;
  }

  // 步骤2: 基于统计结果进行异常检测
  console.log("\n2. 检测异常数据...");
  const anomalyResponse = await advancedStatisticsAPI.anomalyDetection({
    algorithm: AnomalyAlgorithm.STATISTICAL,
    scope: { examIds: ["exam1", "exam2"] },
    sensitivity: 0.8,
  });

  // 步骤3: 分析相关性
  console.log("\n3. 分析科目相关性...");
  const correlationResponse = await advancedStatisticsAPI.correlationAnalysis({
    variables: [
      { name: "数学", source: "grade", field: "math_score" },
      { name: "物理", source: "grade", field: "physics_score" },
    ],
    method: "pearson",
  });

  // 步骤4: 预测未来表现
  console.log("\n4. 预测学生表现...");
  const predictionResponse = await advancedStatisticsAPI.prediction({
    modelType: PredictionModelType.LINEAR_REGRESSION,
    targetVariable: { field: "total_score" },
    features: ["math_score", "chinese_score"],
    predictionScope: { students: ["student1"] },
  });

  console.log("\n=== 综合分析完成 ===");

  // 生成分析报告
  const report = {
    统计概览: statsResponse.data,
    异常情况: anomalyResponse.data?.statistics,
    相关性发现: correlationResponse.data?.interpretation,
    预测结果: predictionResponse.data?.predictions,
  };

  console.log("\n分析报告:", JSON.stringify(report, null, 2));
}

// 执行所有示例
export async function runAllExamples() {
  try {
    await exampleBatchStatistics();
    await exampleCorrelationAnalysis();
    await examplePrediction();
    await exampleAnomalyDetection();
    await exampleMultiDimensionalAggregation();
    await exampleTrendAnalysis();
    await exampleComprehensiveAnalysis();
  } catch (error) {
    console.error("示例执行失败:", error);
  }
}
