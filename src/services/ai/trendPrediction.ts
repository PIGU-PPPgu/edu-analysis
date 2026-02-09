/**
 * 趋势预测引擎
 * 基于历史数据预测未来表现
 */

export interface PredictionPoint {
  timeIndex: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface TrendPredictionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predictions: PredictionPoint[];
  trend: "increasing" | "decreasing" | "stable";
  trendStrength: "strong" | "moderate" | "weak";
}

/**
 * 线性回归预测
 * y = slope * x + intercept
 */
export function linearRegressionPredict(
  historicalData: number[],
  futureSteps: number = 3
): TrendPredictionResult {
  if (historicalData.length < 2) {
    return {
      slope: 0,
      intercept: historicalData[0] || 0,
      rSquared: 0,
      predictions: [],
      trend: "stable",
      trendStrength: "weak",
    };
  }

  const n = historicalData.length;
  const xValues = Array.from({ length: n }, (_, i) => i);

  // 计算均值
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = historicalData.reduce((sum, y) => sum + y, 0) / n;

  // 计算斜率和截距
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (historicalData[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // 计算R²（决定系数）
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssTotal += Math.pow(historicalData[i] - yMean, 2);
    ssResidual += Math.pow(historicalData[i] - predicted, 2);
  }

  const rSquared = ssTotal === 0 ? 0 : Math.max(0, 1 - ssResidual / ssTotal);

  // 计算标准误差（用于置信区间）
  const standardError =
    ssResidual === 0 ? 0 : Math.sqrt(ssResidual / Math.max(1, n - 2));

  // 生成未来预测
  const predictions: PredictionPoint[] = [];
  for (let i = 1; i <= futureSteps; i++) {
    const timeIndex = n + i - 1;
    const predicted = slope * timeIndex + intercept;

    // 95%置信区间（±1.96 * SE）
    const margin =
      1.96 *
      standardError *
      Math.sqrt(1 + 1 / n + Math.pow(timeIndex - xMean, 2) / denominator);

    predictions.push({
      timeIndex,
      predicted,
      lowerBound: predicted - margin,
      upperBound: predicted + margin,
      confidence: rSquared,
    });
  }

  // 判断趋势
  let trend: "increasing" | "decreasing" | "stable";
  if (Math.abs(slope) < 0.5) {
    trend = "stable";
  } else if (slope > 0) {
    trend = "increasing";
  } else {
    trend = "decreasing";
  }

  // 判断趋势强度
  let trendStrength: "strong" | "moderate" | "weak";
  if (rSquared > 0.7) {
    trendStrength = "strong";
  } else if (rSquared > 0.4) {
    trendStrength = "moderate";
  } else {
    trendStrength = "weak";
  }

  return {
    slope,
    intercept,
    rSquared,
    predictions,
    trend,
    trendStrength,
  };
}

/**
 * 移动平均预测
 * 使用简单移动平均(SMA)进行短期预测
 */
export function movingAveragePredict(
  historicalData: number[],
  windowSize: number = 3,
  futureSteps: number = 3
): PredictionPoint[] {
  if (historicalData.length < windowSize) {
    return [];
  }

  const predictions: PredictionPoint[] = [];
  let currentData = [...historicalData];

  for (let step = 0; step < futureSteps; step++) {
    // 计算最近windowSize个数据的平均值
    const recentData = currentData.slice(-windowSize);
    const average = recentData.reduce((sum, val) => sum + val, 0) / windowSize;

    // 计算标准差作为置信区间
    const mean = average;
    const variance =
      recentData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      windowSize;
    const std = Math.sqrt(variance);

    predictions.push({
      timeIndex: currentData.length + step,
      predicted: average,
      lowerBound: average - 1.96 * std,
      upperBound: average + 1.96 * std,
      confidence: 0.7, // 移动平均的置信度相对较低
    });

    // 将预测值添加到数据中，用于下一步预测
    currentData.push(average);
  }

  return predictions;
}

/**
 * 指数平滑预测
 * 适用于有趋势的时间序列
 */
export function exponentialSmoothingPredict(
  historicalData: number[],
  alpha: number = 0.3,
  futureSteps: number = 3
): PredictionPoint[] {
  if (historicalData.length === 0) {
    return [];
  }

  const predictions: PredictionPoint[] = [];

  // 初始化平滑值
  let smoothed = historicalData[0];
  const smoothedSeries: number[] = [smoothed];

  // 计算历史平滑值
  for (let i = 1; i < historicalData.length; i++) {
    smoothed = alpha * historicalData[i] + (1 - alpha) * smoothed;
    smoothedSeries.push(smoothed);
  }

  // 计算残差标准差
  const residuals = historicalData.map((val, i) => val - smoothedSeries[i]);
  const residualMean =
    residuals.reduce((sum, r) => sum + r, 0) / residuals.length;
  const residualStd = Math.sqrt(
    residuals.reduce((sum, r) => sum + Math.pow(r - residualMean, 2), 0) /
      residuals.length
  );

  // 生成未来预测（使用最后一个平滑值）
  const lastSmoothed = smoothedSeries[smoothedSeries.length - 1];
  for (let i = 0; i < futureSteps; i++) {
    predictions.push({
      timeIndex: historicalData.length + i,
      predicted: lastSmoothed,
      lowerBound: lastSmoothed - 1.96 * residualStd,
      upperBound: lastSmoothed + 1.96 * residualStd,
      confidence: 0.65,
    });
  }

  return predictions;
}

/**
 * 综合预测
 * 结合多种方法的预测结果
 */
export function ensemblePredict(
  historicalData: number[],
  futureSteps: number = 3
): {
  primary: TrendPredictionResult;
  alternatives: {
    movingAverage: PredictionPoint[];
    exponentialSmoothing: PredictionPoint[];
  };
  recommendation: string;
} {
  const linearPrediction = linearRegressionPredict(historicalData, futureSteps);
  const maPrediction = movingAveragePredict(historicalData, 3, futureSteps);
  const esPrediction = exponentialSmoothingPredict(
    historicalData,
    0.3,
    futureSteps
  );

  // 根据R²选择最佳方法
  let recommendation = "";
  if (linearPrediction.rSquared > 0.7) {
    recommendation = "线性趋势明显，建议采用线性回归预测";
  } else if (linearPrediction.rSquared > 0.4) {
    recommendation = "存在一定趋势，建议结合线性回归和移动平均预测";
  } else {
    recommendation = "趋势不明显，建议采用移动平均或指数平滑预测";
  }

  return {
    primary: linearPrediction,
    alternatives: {
      movingAverage: maPrediction,
      exponentialSmoothing: esPrediction,
    },
    recommendation,
  };
}

/**
 * 评估预测准确度（基于历史数据的交叉验证）
 */
export function evaluatePredictionAccuracy(
  historicalData: number[],
  testSize: number = 3
): {
  mae: number; // 平均绝对误差
  rmse: number; // 均方根误差
  mape: number; // 平均绝对百分比误差
} {
  if (historicalData.length < testSize + 3) {
    return { mae: 0, rmse: 0, mape: 0 };
  }

  const trainData = historicalData.slice(0, -testSize);
  const testData = historicalData.slice(-testSize);

  const prediction = linearRegressionPredict(trainData, testSize);
  const predictedValues = prediction.predictions.map((p) => p.predicted);

  // 计算误差指标
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let sumPercentError = 0;

  for (let i = 0; i < testSize; i++) {
    const actual = testData[i];
    const predicted = predictedValues[i];
    const absError = Math.abs(actual - predicted);

    sumAbsError += absError;
    sumSquaredError += Math.pow(absError, 2);

    if (actual !== 0) {
      sumPercentError += Math.abs((actual - predicted) / actual);
    }
  }

  const mae = sumAbsError / testSize;
  const rmse = Math.sqrt(sumSquaredError / testSize);
  const mape = (sumPercentError / testSize) * 100;

  return { mae, rmse, mape };
}
