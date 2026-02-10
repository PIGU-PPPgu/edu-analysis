# 分数段对比分析服务 API 文档

## 概述

Task #22 的核心计算服务，用于统计和对比入口/出口考试的等级分布情况。

## 核心函数

### 1. `calculateScoreBandSnapshot()`

**签名**：

```typescript
function calculateScoreBandSnapshot(
  records: GradeRecord[],
  subject: string
): ScoreBandSnapshot;
```

**功能**：计算单次考试的分数段快照（扁平结构）

**参数**：

- `records` - 成绩记录数组
- `subject` - 科目名称（支持：总分、语文、数学、英语、物理、化学、生物、政治、历史、地理）

**返回值**：

```typescript
{
  subject: string;
  totalStudents: number;
  avgScore: number;

  // 各等级统计（6个等级）
  aPlusCount: number;
  aPlusRate: number;
  aCount: number;
  aRate: number;
  bPlusCount: number;
  bPlusRate: number;
  bCount: number;
  bRate: number;
  cPlusCount: number;
  cPlusRate: number;
  cCount: number;
  cRate: number;

  // 累计统计（5个累计项）
  aPlusAboveCount: number; // A+以上 = A+
  aPlusAboveRate: number;
  aAboveCount: number; // A以上 = A+ + A
  aAboveRate: number;
  bPlusAboveCount: number; // B+以上 = A+ + A + B+
  bPlusAboveRate: number;
  bAboveCount: number; // B以上 = A+ + A + B+ + B
  bAboveRate: number;
  cPlusAboveCount: number; // C+以上 = 前95%（及格线）
  cPlusAboveRate: number;
}
```

**使用示例**：

```typescript
import { calculateScoreBandSnapshot } from "@/services/scoreBandAnalysisService";

const records = [
  { student_id: "001", total_score: 650, total_rank: 1 },
  { student_id: "002", total_score: 600, total_rank: 50 },
  // ... 更多记录
];

const snapshot = calculateScoreBandSnapshot(records, "总分");

console.log(`科目：${snapshot.subject}`);
console.log(`分析人数：${snapshot.totalStudents}`);
console.log(`平均分：${snapshot.avgScore}`);
console.log(`A+等级：${snapshot.aPlusCount}人（${snapshot.aPlusRate}%）`);
console.log(
  `及格人数（C+以上）：${snapshot.cPlusAboveCount}人（${snapshot.cPlusAboveRate}%）`
);
```

---

### 2. `calculateScoreBandAnalysis()`

**签名**：

```typescript
async function calculateScoreBandAnalysis(
  activityId: string
): Promise<ScoreBandAnalysisResult>;
```

**功能**：从 value_added_cache 表读取数据并计算完整的分数段对比分析

**参数**：

- `activityId` - 增值评价活动ID

**返回值**：

```typescript
{
  entryExam: ScoreBandSnapshot[];  // 入口考试快照（多科目）
  exitExam: ScoreBandSnapshot[];   // 出口考试快照（多科目）
  changes: Record<string, Record<string, GradeChangeStats>>;  // 变化统计
}
```

**使用示例**：

```typescript
import { calculateScoreBandAnalysis } from "@/services/scoreBandAnalysisService";

const result = await calculateScoreBandAnalysis("activity-uuid");

// 查看总分的入口考试数据
const entryTotal = result.entryExam.find((s) => s.subject === "总分");
console.log(`入口考试A以上人数：${entryTotal.aAboveCount}`);

// 查看总分的出口考试数据
const exitTotal = result.exitExam.find((s) => s.subject === "总分");
console.log(`出口考试A以上人数：${exitTotal.aAboveCount}`);

// 查看变化
const totalChanges = result.changes["总分"];
console.log(`A以上人数变化：${totalChanges["A以上"].countChange}`);
console.log(`A以上比例变化：${totalChanges["A以上"].rateChange}%`);
```

---

### 3. `calculateScoreBandAnalysisFromGradeData()`

**签名**：

```typescript
async function calculateScoreBandAnalysisFromGradeData(
  entryExamTitle: string,
  exitExamTitle: string,
  subjects: string[],
  filters?: { class_name?: string; school_name?: string }
): Promise<ScoreBandAnalysisResult>;
```

**功能**：直接从 grade_data 表读取数据并计算（不依赖 value_added_cache）

**参数**：

- `entryExamTitle` - 入口考试标题
- `exitExamTitle` - 出口考试标题
- `subjects` - 科目列表
- `filters` - 可选过滤条件

**使用示例**：

```typescript
import { calculateScoreBandAnalysisFromGradeData } from "@/services/scoreBandAnalysisService";

const result = await calculateScoreBandAnalysisFromGradeData(
  "七上期中考试",
  "七下期末考试",
  ["总分", "语文", "数学"],
  { class_name: "初一1班" }
);

console.log(`分析科目数：${result.entryExam.length}`);
```

---

## 数据结构

### ScoreBandSnapshot（分数段快照）

扁平结构，包含：

- **基本信息**：科目、人数、平均分
- **各等级统计**：A+、A、B+、B、C+、C 的人数和比例
- **累计统计**：A+以上、A以上、B+以上、B以上、C+以上的人数和比例

### GradeChangeStats（变化统计）

```typescript
{
  countChange: number; // 人数变化（出口 - 入口）
  rateChange: number; // 比例变化（出口 - 入口）
}
```

---

## 核心算法

### 等级分配

使用 `assignGradesWithFallback()` 函数（Task #20）：

1. 优先使用导入的等级（如 `total_grade` 字段）
2. 如果等级缺失，基于排名计算
3. 如果排名也缺失，默认分配 C 等级

### 累计分布计算

```typescript
// A+以上 = A+
aPlusAboveCount = aPlusCount;

// A以上 = A+ + A
aAboveCount = aPlusCount + aCount;

// B+以上 = A+ + A + B+
bPlusAboveCount = aPlusCount + aCount + bPlusCount;

// B以上 = A+ + A + B+ + B
bAboveCount = aPlusCount + aCount + bPlusCount + bCount;

// C+以上 = A+ + A + B+ + B + C+ (即及格线，前95%)
cPlusAboveCount = aPlusCount + aCount + bPlusCount + bCount + cPlusCount;
```

### 变化统计

```typescript
// 人数变化
countChange = exitSnapshot.aPlusCount - entrySnapshot.aPlusCount;

// 比例变化
rateChange = exitSnapshot.aPlusRate - entrySnapshot.aPlusRate;
```

---

## 边界情况处理

1. **空数组**：返回全0的快照
2. **无效数据**：过滤掉无分数的记录
3. **缺失排名**：使用 assignGradesWithFallback 的默认策略
4. **不支持的科目**：抛出错误

---

## 测试覆盖

✅ 10个单元测试全部通过：

- 总分快照计算
- 累计项正确累加
- 累计比例验证
- 等级人数求和
- 等级比例求和
- 语文科目支持
- 空数组处理
- 无效数据过滤
- 导入等级处理
- 平均分计算

---

## 性能考虑

- **时间复杂度**：O(n)，其中 n 为学生人数
- **空间复杂度**：O(n)
- **批量计算**：支持多科目并行计算

---

## 下一步集成

### 前端调用示例

```typescript
// 在 React 组件中使用
import { useEffect, useState } from 'react';
import { calculateScoreBandAnalysis } from '@/services/scoreBandAnalysisService';
import type { ScoreBandAnalysisResult } from '@/types/scoreBandTypes';

function ScoreBandComparisonPage({ activityId }: { activityId: string }) {
  const [data, setData] = useState<ScoreBandAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await calculateScoreBandAnalysis(activityId);
        setData(result);
      } catch (error) {
        console.error("加载分数段分析失败:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [activityId]);

  if (loading) return <div>加载中...</div>;
  if (!data) return <div>暂无数据</div>;

  return (
    <ScoreBandComparison data={data} />
  );
}
```

### 与 ux-architect 的 UI 组件对接

UI 组件期望的数据格式与我们的输出完全匹配：

```typescript
// ux-architect 的组件
<ScoreBandComparison data={result} />

// 组件会渲染两个表格：
// 1. 入口考试表格 - 使用 result.entryExam
// 2. 出口考试表格 - 使用 result.exitExam 和 result.changes
```

---

## 维护注意事项

1. **科目支持**：如需支持新科目，在 `SUBJECT_FIELD_MAP` 中添加映射
2. **等级定义**：如需修改等级规则，更新 `assignGradesWithFallback()` 函数
3. **累计项**：如需调整累计规则，修改 `calculateCumulativeDistribution()`
4. **数据源**：支持从 value_added_cache 或 grade_data 表读取
