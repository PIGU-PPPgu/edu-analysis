# 高级统计分析API文档

## 概述

高级统计分析API提供了一套完整的数据分析工具，包括批量统计、相关性分析、预测模型、异常检测、多维度聚合和趋势分析等功能。这些API基于Supabase数据源，支持缓存和批量请求，并提供完整的TypeScript类型定义。

## 核心功能

### 1. 批量统计计算 (Batch Statistics)

执行大规模的统计计算，支持多种统计指标和分组维度。

```typescript
import { advancedStatisticsAPI } from "@/api/advancedStatisticsAPI";
import { StatisticMetric } from "@/types/advancedAnalysisAPI";

const response = await advancedStatisticsAPI.batchStatistics(
  {
    examIds: ["exam1", "exam2"],
    classNames: ["九(1)班", "九(2)班"],
    metrics: [
      StatisticMetric.MEAN,
      StatisticMetric.MEDIAN,
      StatisticMetric.STD_DEV,
      StatisticMetric.PERCENTILE,
    ],
    groupBy: ["exam", "class"],
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
```

**支持的统计指标：**

- `MEAN` - 平均值
- `MEDIAN` - 中位数
- `MODE` - 众数
- `VARIANCE` - 方差
- `STD_DEV` - 标准差
- `MIN` - 最小值
- `MAX` - 最大值
- `SUM` - 总和
- `COUNT` - 计数
- `PERCENTILE` - 百分位数

### 2. 相关性分析 (Correlation Analysis)

分析不同变量之间的相关关系，支持多种相关系数计算方法。

```typescript
const response = await advancedStatisticsAPI.correlationAnalysis({
  variables: [
    {
      name: "数学成绩",
      source: "grade",
      field: "math_score",
      transformation: "none",
    },
    {
      name: "物理成绩",
      source: "grade",
      field: "physics_score",
      transformation: "none",
    },
  ],
  method: "pearson", // 'pearson' | 'spearman' | 'kendall'
  includeSignificance: true,
});
```

**相关性方法：**

- `pearson` - 皮尔逊相关系数（线性相关）
- `spearman` - 斯皮尔曼等级相关系数
- `kendall` - 肯德尔等级相关系数

### 3. 预测模型 (Prediction Models)

基于历史数据训练模型并进行预测。

```typescript
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
    students: ["student1", "student2"],
  },
});
```

**支持的模型类型：**

- `LINEAR_REGRESSION` - 线性回归
- `POLYNOMIAL_REGRESSION` - 多项式回归
- `TIME_SERIES` - 时间序列
- `NEURAL_NETWORK` - 神经网络
- `RANDOM_FOREST` - 随机森林

### 4. 异常检测 (Anomaly Detection)

识别数据中的异常模式和离群值。

```typescript
const response = await advancedStatisticsAPI.anomalyDetection({
  algorithm: AnomalyAlgorithm.STATISTICAL,
  scope: {
    examIds: ["exam1"],
    classNames: ["九(1)班"],
    timeRange: {
      start: "2024-01-01",
      end: "2024-12-31",
    },
  },
  sensitivity: 0.7, // 0-1, 越高越敏感
  dimensions: ["score", "rank"],
  contextual: true,
});
```

**异常检测算法：**

- `STATISTICAL` - 统计方法（基于IQR）
- `ISOLATION_FOREST` - 隔离森林
- `LOF` - 局部异常因子
- `CLUSTERING` - 聚类方法
- `NEURAL` - 神经网络方法

### 5. 多维度聚合 (Multi-Dimensional Aggregation)

按多个维度对数据进行聚合分析。

```typescript
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
```

**聚合函数：**

- `sum` - 求和
- `avg` - 平均值
- `min` - 最小值
- `max` - 最大值
- `count` - 计数
- `distinct` - 去重计数
- `percentile` - 百分位数

### 6. 趋势分析 (Trend Analysis)

分析数据随时间的变化趋势并进行预测。

```typescript
const response = await advancedStatisticsAPI.trendAnalysis({
  metric: {
    field: "total_score",
    aggregation: "avg",
  },
  timeRange: {
    start: "2023-01-01",
    end: "2024-12-31",
    granularity: "month",
  },
  smoothing: {
    method: "moving_average",
    window: 3,
  },
  forecast: {
    periods: 6,
    method: "linear",
  },
});
```

**平滑方法：**

- `moving_average` - 移动平均
- `exponential` - 指数平滑
- `loess` - 局部加权回归

**预测方法：**

- `linear` - 线性预测
- `exponential` - 指数预测
- `arima` - ARIMA模型
- `prophet` - Prophet模型

## 数据转换服务

`AdvancedDataTransformer` 类提供了丰富的数据预处理和转换功能：

### 主要功能

1. **数据标准化**
   - `normalizeGradeData()` - 将原始数据转换为标准格式
   - `standardize()` - Z-score标准化
   - `normalize()` - Min-Max归一化

2. **统计计算**
   - `calculateMetrics()` - 计算各种统计指标
   - `calculatePercentile()` - 计算百分位数
   - `calculateCorrelation()` - 计算相关系数

3. **数据处理**
   - `groupByDimensions()` - 多维度分组
   - `toTimeSeries()` - 转换为时间序列
   - `calculateMovingAverage()` - 计算移动平均
   - `interpolateMissingValues()` - 插值缺失数据

4. **异常检测**
   - `detectOutliers()` - 基于IQR的异常检测
   - `binData()` - 数据分箱

## 缓存策略

所有API都支持可配置的缓存策略：

```typescript
const cacheStrategy: CacheStrategy = {
  enabled: true,
  ttl: 300, // 缓存时间（秒）
  key: "custom_cache_key", // 可选，自定义缓存键
  invalidateOn: ["data_update"], // 可选，触发缓存失效的事件
};

const response = await advancedStatisticsAPI.batchStatistics(
  request,
  cacheStrategy
);
```

## 错误处理

所有API响应都遵循统一的格式：

```typescript
interface AdvancedAnalysisResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: AnalysisErrorCode;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    executionTime: number;
    cached: boolean;
    version: string;
  };
}
```

错误代码：

- `INVALID_REQUEST` - 无效请求
- `INSUFFICIENT_DATA` - 数据不足
- `MODEL_TRAINING_FAILED` - 模型训练失败
- `COMPUTATION_ERROR` - 计算错误
- `TIMEOUT` - 超时
- `RATE_LIMIT` - 速率限制
- `UNAUTHORIZED` - 未授权

## 性能优化建议

1. **使用缓存**：对于计算密集型操作，启用缓存可以显著提升性能。

2. **批量请求**：尽可能使用批量API而不是多次单独请求。

3. **合理的数据范围**：使用时间范围和过滤条件限制数据量。

4. **异步处理**：对于长时间运行的分析，考虑使用异步处理模式。

5. **数据预聚合**：对于频繁查询的聚合数据，考虑在数据库层面创建物化视图。

## 使用示例

完整的使用示例请参考 `advancedStatisticsAPI.example.ts` 文件，其中包含了所有API的详细使用方法和综合分析流程示例。

## 扩展性

该API设计具有良好的扩展性：

1. **新增统计指标**：在 `StatisticMetric` 枚举中添加新指标，并在 `calculateMetrics` 方法中实现计算逻辑。

2. **新增预测模型**：在 `PredictionModelType` 枚举中添加新模型类型，并实现相应的训练和预测方法。

3. **新增数据源**：通过修改 `CorrelationVariable.source` 支持更多数据源类型。

4. **自定义转换器**：扩展 `AdvancedDataTransformer` 类添加自定义的数据转换方法。

## 注意事项

1. 部分高级功能（如神经网络预测）目前是简化实现，生产环境中建议集成专业的机器学习库。

2. 大数据量处理时注意内存使用，必要时考虑分批处理。

3. 敏感数据分析时确保遵守数据隐私和安全规范。

4. API版本更新时注意向后兼容性。
