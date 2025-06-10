# 📋 成绩分析系统统一API接口指南

## 🎯 目标

本文档介绍了成绩分析系统的统一API接口设计，旨在解决以下问题：
- 数据类型定义不统一
- 字段访问逻辑重复
- 数据获取方式不一致
- 工具函数调用不统一

## 📁 架构概览

```
src/
├── types/
│   └── grade.ts                    # 统一的数据类型定义
├── utils/
│   ├── gradeFieldUtils.ts          # 统一的字段访问工具
│   └── gradeUtils.ts               # 统一的等级计算工具
├── api/
│   └── gradeDataAPI.ts             # 统一的数据查询API
├── contexts/
│   └── GradeAnalysisContext.tsx    # 统一的状态管理
└── components/
    └── analysis/                   # 使用统一接口的组件
```

## 🏗️ 核心接口

### 1. 数据类型定义 (`src/types/grade.ts`)

#### 基础接口
```typescript
// 科目枚举
export enum Subject {
  TOTAL = '总分',
  CHINESE = '语文',
  MATH = '数学',
  // ...
}

// 等级枚举
export enum GradeLevel {
  A_PLUS = 'A+',
  A = 'A',
  B_PLUS = 'B+',
  // ...
}

// 统一的成绩记录接口
export interface GradeRecord extends BaseGradeRecord {
  // 标准字段
  student_id: string;
  student_name: string;
  class_name: string;
  subject: Subject | string;
  score: number;
  grade_level?: GradeLevel | string;
  
  // CSV兼容字段
  总分分数?: number;
  总分等级?: string;
  // ...
}
```

#### 响应接口
```typescript
export interface GradeDataResponse<T = GradeRecord> {
  data: T[];
  total: number;
  statistics?: GradeStatistics;
  error?: string;
}

export interface GradeStatistics {
  total: number;
  average: number;
  max: number;
  min: number;
  median: number;
  standardDeviation: number;
  passRate: number;
  excellentRate: number;
  distribution: GradeLevelDistribution[];
}
```

### 2. 字段访问工具 (`src/utils/gradeFieldUtils.ts`)

#### 核心功能
```typescript
// 获取学生信息
export function getStudentName(record: GradeRecord): string;
export function getClassName(record: GradeRecord): string;

// 获取科目数据
export function getSubjectScore(record: GradeRecord, subject: Subject | string): number;
export function getSubjectGrade(record: GradeRecord, subject: Subject | string): string;

// 数据筛选
export function filterBySubject(records: GradeRecord[], subject: Subject | string): GradeRecord[];

// 等级规范化
export function normalizeGradeLevel(grade: string): GradeLevel | string;
```

#### 使用示例
```typescript
// ❌ 旧方式 - 每个组件都重复这样的逻辑
const gradeLevel = record.总分等级 || record.grade_level || record.total_grade || '';

// ✅ 新方式 - 使用统一的工具函数
const gradeLevel = getSubjectGrade(record, Subject.TOTAL);
```

### 3. 等级计算工具 (`src/utils/gradeUtils.ts`)

#### 核心功能
```typescript
// 获取等级信息
export function getGradeLevelInfo(
  record: GradeRecord | number | string,
  subject: Subject | string = Subject.TOTAL,
  originalGrade?: string
): GradeLevelInfo;

// 计算等级分布
export const calculateGradeLevelDistribution = (
  gradeData: GradeRecord[],
  subject: Subject | string
): GradeLevelDistribution[];

// 等级配置
export const GRADE_LEVELS: Record<GradeLevel | string, GradeLevelInfo>;
export const SUBJECT_MAX_SCORES: Record<Subject | string, number>;
```

#### 使用示例
```typescript
// ✅ 统一的等级计算
const gradeInfo = getGradeLevelInfo(record, Subject.TOTAL);
console.log(`${gradeInfo.icon} ${gradeInfo.level} ${gradeInfo.displayName}`);
// 输出: 🥈 B+ 中上
```

### 4. 数据查询API (`src/api/gradeDataAPI.ts`)

#### 核心功能
```typescript
// 基础查询
export async function fetchGradeData(examId?: string, filter?: GradeFilter): Promise<GradeDataResponse>;
export async function fetchGradeDataBySubject(subject: Subject | string, examId?: string): Promise<GradeDataResponse>;
export async function fetchGradeDataByClass(className: string, examId?: string): Promise<GradeDataResponse>;

// 考试管理
export async function fetchExamList(): Promise<{ data: ExamInfo[], error?: string }>;
export async function fetchExamInfo(examId: string): Promise<{ data: ExamInfo | null, error?: string }>;

// 数据操作
export async function upsertGradeData(gradeData: GradeRecord[]): Promise<{ success: boolean, error?: string }>;
export async function deleteGradeData(examId: string): Promise<{ success: boolean, error?: string }>;

// 统计计算
export function calculateGradeStatistics(data: GradeRecord[]): GradeStatistics;
```

#### 使用示例
```typescript
// ✅ 统一的数据获取方式
const response = await fetchGradeDataBySubject(Subject.MATH, '907九下月考');
if (response.error) {
  console.error(response.error);
} else {
  console.log(`获取到 ${response.data.length} 条数学成绩`);
}
```

### 5. 状态管理 (`src/contexts/GradeAnalysisContext.tsx`)

#### 核心功能
```typescript
interface GradeAnalysisContextType {
  // 基础数据
  gradeData: GradeRecord[];
  filteredGradeData: GradeRecord[];
  
  // 筛选条件
  filter: GradeFilter;
  setFilter: (filter: GradeFilter) => void;
  
  // 筛选方法
  filterBySubject: (subject: Subject | string) => GradeRecord[];
  filterByClass: (className: string) => GradeRecord[];
  filterByGradeLevel: (gradeLevel: string) => GradeRecord[];
  
  // 统计计算
  calculateStatistics: (data: GradeRecord[]) => GradeStatistics;
}
```

#### 使用示例
```typescript
// ✅ 统一的状态访问
const { gradeData, filter, setFilter, filterBySubject } = useGradeAnalysis();

// 筛选总分数据
const totalScoreData = filterBySubject(Subject.TOTAL);

// 设置筛选条件
setFilter({ subject: Subject.MATH, class: '907班' });
```

## 🚀 最佳实践

### 1. 数据查询
```typescript
// ✅ 推荐：使用统一API
import { fetchGradeDataBySubject } from '@/api/gradeDataAPI';

const mathGrades = await fetchGradeDataBySubject(Subject.MATH);

// ❌ 避免：直接使用Supabase查询
const { data } = await supabase.from('grade_data').select('*');
```

### 2. 字段访问
```typescript
// ✅ 推荐：使用统一工具函数
import { getSubjectScore, getSubjectGrade } from '@/utils/gradeFieldUtils';

const score = getSubjectScore(record, Subject.TOTAL);
const grade = getSubjectGrade(record, Subject.TOTAL);

// ❌ 避免：重复的字段映射逻辑
const score = record.总分分数 || record.score || record.total_score || 0;
```

### 3. 等级计算
```typescript
// ✅ 推荐：使用统一等级计算
import { getGradeLevelInfo } from '@/utils/gradeUtils';

const gradeInfo = getGradeLevelInfo(record, Subject.TOTAL);

// ❌ 避免：自定义等级计算
const percentage = (score / maxScore) * 100;
const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : 'B';
```

### 4. 组件开发
```typescript
// ✅ 推荐：使用Context获取数据
import { useGradeAnalysis } from '@/contexts/GradeAnalysisContext';

const MyComponent: React.FC = () => {
  const { filteredGradeData, filter, setFilter } = useGradeAnalysis();
  
  // 使用过滤后的数据...
};

// ❌ 避免：组件内部直接查询数据
const MyComponent: React.FC = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // 直接查询数据库...
  }, []);
};
```

## 🔧 迁移指南

### 步骤1：更新导入
```typescript
// 旧导入
import { GradeRecord } from '@/contexts/GradeAnalysisContext';

// 新导入
import { GradeRecord } from '@/types/grade';
import { getSubjectScore, getSubjectGrade } from '@/utils/gradeFieldUtils';
import { getGradeLevelInfo } from '@/utils/gradeUtils';
```

### 步骤2：替换字段访问
```typescript
// 旧代码
const gradeLevel = record.总分等级 || record.grade_level || record.total_grade || '';

// 新代码
const gradeLevel = getSubjectGrade(record, Subject.TOTAL);
```

### 步骤3：使用统一API
```typescript
// 旧代码
const { data } = await supabase.from('grade_data').select('*').eq('subject', '总分');

// 新代码
const response = await fetchGradeDataBySubject(Subject.TOTAL);
const data = response.data;
```

### 步骤4：更新等级计算
```typescript
// 旧代码
const gradeInfo = getGradeLevelInfo(item.score, subject, originalGrade);

// 新代码
const gradeInfo = getGradeLevelInfo(item, subject, originalGrade);
```

## ✅ 检查清单

在开发新功能或重构现有组件时，请确保：

- [ ] 使用 `@/types/grade` 中的统一类型定义
- [ ] 使用 `@/utils/gradeFieldUtils` 中的字段访问函数
- [ ] 使用 `@/utils/gradeUtils` 中的等级计算函数
- [ ] 使用 `@/api/gradeDataAPI` 中的数据查询函数
- [ ] 通过 `useGradeAnalysis` 获取状态和数据
- [ ] 避免重复的字段映射逻辑
- [ ] 避免直接的Supabase查询（除非必要）
- [ ] 确保类型安全（避免使用 `any`）

## 🎯 预期收益

1. **代码一致性**: 所有组件使用统一的接口和工具函数
2. **维护性**: 字段映射逻辑集中管理，便于维护
3. **类型安全**: 强类型定义减少运行时错误
4. **开发效率**: 标准化的API减少重复开发
5. **扩展性**: 统一的架构便于添加新功能
6. **可测试性**: 明确的接口便于单元测试

---

## 💡 技术支持

如果在使用过程中遇到问题，请：
1. 检查类型定义是否正确导入
2. 确认使用的是最新的工具函数
3. 查看控制台错误信息
4. 参考现有组件的实现方式 