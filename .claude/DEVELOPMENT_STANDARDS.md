# 🛠️ 开发规范完整文档

> **团队协作标准** - 确保代码质量和一致性的开发规范

## 🎯 规范使用指南

### 📌 重要原则
1. **所有开发者必须严格遵循此规范**
2. **代码审查必须检查规范遵循度**
3. **新增规范必须团队讨论决定**
4. **违反规范的代码不得合并**

### 🔄 规范更新机制
- 发现问题 → 讨论改进 → 更新文档 → 团队培训

---

## 📋 代码风格规范

### 🎨 TypeScript/JavaScript 规范

#### 文件命名规范
```bash
# 组件文件 - PascalCase
ComponentName.tsx
ModernGradeAnalysis.tsx

# 工具文件 - camelCase  
utilityFunctions.ts
gradeCalculator.ts

# 页面文件 - PascalCase
GradeAnalysisPage.tsx
StudentManagement.tsx

# 类型定义文件 - camelCase
gradeTypes.ts
apiTypes.ts

# 测试文件 - 与原文件同名 + .test
ComponentName.test.tsx
utilityFunctions.test.ts
```

#### 变量命名规范
```typescript
// ✅ 正确的命名方式

// 常量 - SCREAMING_SNAKE_CASE
const DEFAULT_PAGE_SIZE = 20
const API_ENDPOINTS = {
  GRADES: '/api/grades',
  STUDENTS: '/api/students'
}

// 变量和函数 - camelCase
const studentData = await getStudentGrades()
const calculateAverageScore = (scores: number[]) => {}

// 组件名 - PascalCase
const GradeAnalysisComponent = () => {}

// 接口和类型 - PascalCase
interface StudentGrade {
  id: string
  score: number
}

// 枚举 - PascalCase
enum GradeLevel {
  Excellent = 'A',
  Good = 'B',
  Average = 'C',
  Poor = 'D'
}

// 泛型参数 - 单个大写字母
interface ApiResponse<T> {
  data: T
  success: boolean
}
```

#### 函数定义规范
```typescript
// ✅ 正确的函数定义

// 普通函数 - 使用function关键字或箭头函数
function calculateGradeAverage(scores: number[]): number {
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

// 箭头函数 - 简短逻辑使用
const formatGrade = (score: number): string => 
  score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D'

// 异步函数 - 明确返回类型
async function fetchStudentGrades(studentId: string): Promise<GradeData[]> {
  const response = await gradeService.getGrades(studentId)
  return response.data
}

// Hook函数 - use开头
const useGradeAnalysis = (examId: string) => {
  const [grades, setGrades] = useState<GradeData[]>([])
  // ...
  return { grades, loading, error }
}
```

#### 导入和导出规范
```typescript
// ✅ 正确的导入顺序和格式

// 1. React和第三方库
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// 2. 内部模块 - 按相对路径排序
import { GradeData, Student } from '@/types/grade'
import { gradeService } from '@/services/gradeService'
import { cn } from '@/lib/utils'

// 3. 相对导入
import './ComponentName.css'

// ✅ 正确的导出方式
// 默认导出 - 组件
export default function GradeAnalysisComponent() {}

// 命名导出 - 工具函数和类型
export { calculateAverage, formatGrade }
export type { GradeData, AnalysisResult }
```

#### 注释规范
```typescript
/**
 * 计算学生成绩的统计信息
 * 
 * @param grades - 成绩数据数组
 * @param options - 计算选项
 * @returns 包含平均分、最高分、最低分的统计对象
 * 
 * @example
 * ```typescript
 * const stats = calculateGradeStatistics(
 *   [85, 92, 78, 95],
 *   { includePercentile: true }
 * )
 * console.log(stats.average) // 87.5
 * ```
 */
function calculateGradeStatistics(
  grades: number[],
  options: CalculationOptions = {}
): GradeStatistics {
  // 输入验证
  if (!grades.length) {
    throw new Error('成绩数组不能为空')
  }

  // 计算基础统计
  const average = grades.reduce((sum, grade) => sum + grade, 0) / grades.length
  const max = Math.max(...grades)
  const min = Math.min(...grades)

  return { average, max, min }
}
```

### 🎨 React组件规范

#### 组件结构模板
```typescript
// ✅ 标准组件结构
import React from 'react'
import { cn } from '@/lib/utils'

// 1. 类型定义
interface GradeCardProps {
  grade: GradeData
  isSelected?: boolean
  onClick?: (grade: GradeData) => void
  className?: string
}

// 2. 组件实现
export const GradeCard: React.FC<GradeCardProps> = ({
  grade,
  isSelected = false,
  onClick,
  className
}) => {
  // 3. 状态定义
  const [isHovered, setIsHovered] = useState(false)

  // 4. 副作用
  useEffect(() => {
    // 组件挂载后的逻辑
  }, [])

  // 5. 事件处理函数
  const handleClick = () => {
    onClick?.(grade)
  }

  // 6. 渲染函数
  return (
    <div
      className={cn(
        "grade-card base-styles",
        isSelected && "selected-styles",
        className
      )}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="grade-score">{grade.score}</div>
      <div className="grade-level">{grade.grade}</div>
    </div>
  )
}

// 7. 类型导出
export type { GradeCardProps }
```

#### Props设计规范
```typescript
// ✅ 良好的Props设计

interface ComponentProps {
  // 必需的数据props
  data: GradeData[]
  examId: string

  // 可选的配置props (提供默认值)
  pageSize?: number
  sortDirection?: 'asc' | 'desc'
  showFilters?: boolean

  // 回调函数props
  onGradeSelect?: (grade: GradeData) => void
  onDataChange?: (data: GradeData[]) => void
  onError?: (error: Error) => void

  // 样式和可访问性props
  className?: string
  ariaLabel?: string
  disabled?: boolean

  // 子组件props
  children?: React.ReactNode
}

// ✅ 提供默认props
const defaultProps: Partial<ComponentProps> = {
  pageSize: 20,
  sortDirection: 'desc',
  showFilters: true,
  disabled: false
}
```

#### Hooks使用规范
```typescript
// ✅ 正确的Hooks使用

const GradeAnalysisComponent = () => {
  // 1. useState - 按逻辑分组
  const [grades, setGrades] = useState<GradeData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const [filters, setFilters] = useState<GradeFilters>({
    subject: '',
    class: '',
    dateRange: null
  })

  // 2. useEffect - 明确依赖项
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        setLoading(true)
        const data = await gradeService.getGrades(filters)
        setGrades(data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchGrades()
  }, [filters]) // 明确依赖

  // 3. 自定义hooks
  const { exportData } = useGradeExport()
  const { theme } = useTheme()

  // 4. useMemo - 优化昂贵计算
  const statistics = useMemo(() => {
    return calculateGradeStatistics(grades)
  }, [grades])

  // 5. useCallback - 优化回调函数
  const handleGradeSelect = useCallback((grade: GradeData) => {
    // 处理选择逻辑
  }, [])

  return (
    // JSX 渲染
  )
}
```

### 🎨 CSS/Tailwind规范

#### Tailwind类名组织
```tsx
// ✅ 正确的Tailwind类名组织

// 按功能分组，使用cn工具合并
<div className={cn(
  // 布局
  "flex items-center justify-between",
  "w-full min-h-screen",
  
  // 外观
  "bg-white rounded-lg shadow-md",
  "border border-gray-200",
  
  // 文字
  "text-gray-900 font-medium",
  
  // 交互
  "hover:shadow-lg transition-shadow",
  "focus:outline-none focus:ring-2 focus:ring-blue-500",
  
  // 响应式
  "md:flex-row md:space-x-4",
  "lg:max-w-6xl lg:mx-auto",
  
  // 条件样式
  isActive && "bg-blue-50 border-blue-200",
  isDisabled && "opacity-50 cursor-not-allowed",
  
  // 外部样式
  className
)}>
```

#### 自定义CSS规范
```css
/* ✅ 正确的CSS组织 */

/* 1. CSS变量定义 */
:root {
  --primary-green: #B9FF66;
  --accent-blue: #4F9CF9;
  --text-primary: #1a1a1a;
  --border-radius: 8px;
}

/* 2. 基础样式 */
.grade-card {
  @apply relative overflow-hidden;
  border-radius: var(--border-radius);
  transition: all 0.2s ease-in-out;
}

/* 3. 状态样式 */
.grade-card:hover {
  @apply shadow-lg transform scale-105;
}

.grade-card.selected {
  @apply border-2 border-blue-500;
}

/* 4. 响应式样式 */
@media (max-width: 768px) {
  .grade-card {
    @apply w-full;
  }
}

/* 5. 主题支持 */
.dark .grade-card {
  @apply bg-gray-800 text-white;
}
```

---

## 🗄️ 数据库规范

### 📊 SQL编写规范

#### 查询格式规范
```sql
-- ✅ 正确的SQL格式

-- 简单查询
SELECT 
  id,
  name,
  score,
  grade,
  created_at
FROM grade_data
WHERE exam_id = $1
  AND score >= 60
ORDER BY score DESC
LIMIT 20;

-- 复杂查询
WITH grade_statistics AS (
  SELECT 
    exam_id,
    AVG(score) AS avg_score,
    COUNT(*) AS student_count,
    STDDEV(score) AS std_dev
  FROM grade_data
  WHERE exam_id = $1
    AND score IS NOT NULL
  GROUP BY exam_id
),
ranked_grades AS (
  SELECT 
    gd.*,
    ROW_NUMBER() OVER (ORDER BY score DESC) AS rank
  FROM grade_data gd
  WHERE gd.exam_id = $1
)
SELECT 
  rg.id,
  rg.name,
  rg.score,
  rg.rank,
  gs.avg_score,
  gs.student_count
FROM ranked_grades rg
CROSS JOIN grade_statistics gs
WHERE rg.rank <= 10;
```

#### 函数定义规范
```sql
-- ✅ 正确的函数定义

-- 函数注释和文档
COMMENT ON FUNCTION get_subject_analysis(UUID) IS 
'获取指定考试的科目分析统计信息，包括平均分、及格率、标准差等指标';

-- 函数实现
CREATE OR REPLACE FUNCTION get_subject_analysis(p_exam_id UUID)
RETURNS TABLE (
    subject TEXT,
    student_count INTEGER,
    avg_score NUMERIC,
    max_score NUMERIC,
    min_score NUMERIC,
    std_dev NUMERIC,
    pass_rate NUMERIC
) AS $$
BEGIN
    -- 输入验证
    IF p_exam_id IS NULL THEN
        RAISE EXCEPTION '考试ID不能为空';
    END IF;

    -- 主查询逻辑
    RETURN QUERY
    SELECT 
        gd.subject,
        COUNT(*)::INTEGER AS student_count,
        ROUND(AVG(gd.score), 2)::NUMERIC AS avg_score,
        MAX(gd.score)::NUMERIC AS max_score,
        MIN(gd.score)::NUMERIC AS min_score,
        ROUND(STDDEV(gd.score), 2)::NUMERIC AS std_dev,
        ROUND(
            COUNT(CASE WHEN gd.score >= 60 THEN 1 END)::NUMERIC / 
            NULLIF(COUNT(*)::NUMERIC, 0) * 100, 
            2
        )::NUMERIC AS pass_rate
    FROM grade_data gd
    WHERE gd.exam_id = p_exam_id 
      AND gd.subject IS NOT NULL
      AND gd.score IS NOT NULL
    GROUP BY gd.subject
    ORDER BY 
        CASE gd.subject 
            WHEN '总分' THEN 1 
            ELSE 2 
        END,
        gd.subject;

    -- 检查结果
    IF NOT FOUND THEN
        RAISE NOTICE '未找到考试ID % 的成绩数据', p_exam_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

#### 索引命名规范
```sql
-- ✅ 正确的索引命名

-- 主键索引 (自动创建，无需命名)
-- PRIMARY KEY (id)

-- 唯一索引 - unique_表名_字段名
CREATE UNIQUE INDEX unique_grade_data_exam_student_subject 
ON grade_data(exam_id, student_id, subject);

-- 普通索引 - idx_表名_字段名
CREATE INDEX idx_grade_data_exam_id ON grade_data(exam_id);
CREATE INDEX idx_grade_data_student_id ON grade_data(student_id);

-- 复合索引 - idx_表名_字段1_字段2
CREATE INDEX idx_grade_data_exam_student ON grade_data(exam_id, student_id);

-- 条件索引 - idx_表名_字段名_条件
CREATE INDEX idx_grade_data_subject_notnull 
ON grade_data(subject) WHERE subject IS NOT NULL;

-- 表达式索引 - idx_表名_表达式描述
CREATE INDEX idx_students_name_tsvector 
ON students USING GIN(to_tsvector('chinese', name));
```

### 🔒 数据安全规范

#### RLS策略规范
```sql
-- ✅ 正确的RLS策略实现

-- 1. 启用RLS
ALTER TABLE sensitive_table ENABLE ROW LEVEL SECURITY;

-- 2. 创建策略 - 策略名要描述具体权限
CREATE POLICY "users_can_view_own_data" ON sensitive_table
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_data" ON sensitive_table
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_data" ON sensitive_table
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. 管理员特殊权限
CREATE POLICY "admins_full_access" ON sensitive_table
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );
```

#### 数据验证规范
```sql
-- ✅ 正确的数据约束定义

-- 检查约束
ALTER TABLE grade_data 
ADD CONSTRAINT check_score_range 
CHECK (score >= 0 AND score <= 100);

ALTER TABLE grade_data 
ADD CONSTRAINT check_grade_values 
CHECK (grade IN ('A', 'B', 'C', 'D', 'F'));

-- 外键约束
ALTER TABLE grade_data 
ADD CONSTRAINT fk_grade_data_exam 
FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE;

-- 触发器验证
CREATE OR REPLACE FUNCTION validate_grade_data()
RETURNS TRIGGER AS $$
BEGIN
    -- 自定义验证逻辑
    IF NEW.score IS NOT NULL AND NEW.grade IS NULL THEN
        NEW.grade := CASE 
            WHEN NEW.score >= 90 THEN 'A'
            WHEN NEW.score >= 80 THEN 'B'
            WHEN NEW.score >= 70 THEN 'C'
            WHEN NEW.score >= 60 THEN 'D'
            ELSE 'F'
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔧 API开发规范

### 📡 RESTful API设计

#### URL命名规范
```typescript
// ✅ 正确的API路径设计

// 资源集合 - 复数名词
GET    /api/grades           // 获取成绩列表
POST   /api/grades           // 创建成绩记录
PUT    /api/grades/batch     // 批量更新成绩

// 单个资源 - 资源ID
GET    /api/grades/123       // 获取特定成绩
PUT    /api/grades/123       // 更新特定成绩
DELETE /api/grades/123       // 删除特定成绩

// 嵌套资源 - 体现层级关系
GET    /api/exams/456/grades          // 获取考试的成绩
POST   /api/exams/456/grades          // 为考试添加成绩
GET    /api/students/789/grades       // 获取学生的成绩

// 资源操作 - 动词形式
POST   /api/grades/import             // 导入成绩
POST   /api/grades/export             // 导出成绩
POST   /api/grades/123/calculate-rank // 计算排名

// 查询参数 - snake_case
GET /api/grades?exam_id=456&class_name=三年级1班&page=1&limit=20
```

#### 响应格式规范
```typescript
// ✅ 统一的API响应格式

// 成功响应
interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// 错误响应
interface ErrorResponse {
  success: false
  error: {
    code: string           // 错误代码，用于程序处理
    message: string        // 用户友好的错误信息
    details?: any         // 详细错误信息（开发环境）
    field?: string        // 字段级错误（表单验证）
  }
}

// 具体实现示例
const successResponse = <T>(data: T, message?: string): SuccessResponse<T> => ({
  success: true,
  data,
  message
})

const errorResponse = (code: string, message: string, details?: any): ErrorResponse => ({
  success: false,
  error: { code, message, details }
})

// 使用示例
export const getGradeData = async (examId: string): Promise<SuccessResponse<GradeData[]>> => {
  try {
    const grades = await gradeService.findByExamId(examId)
    return successResponse(grades, '成绩数据获取成功')
  } catch (error) {
    throw errorResponse('GRADE_FETCH_ERROR', '获取成绩数据失败', error)
  }
}
```

#### 错误处理规范
```typescript
// ✅ 标准化错误代码

// 错误代码命名规范: 模块_操作_错误类型
export const ErrorCodes = {
  // 认证错误
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // 验证错误
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',

  // 业务逻辑错误
  GRADE_DUPLICATE_ENTRY: 'GRADE_DUPLICATE_ENTRY',
  GRADE_EXAM_NOT_FOUND: 'GRADE_EXAM_NOT_FOUND',
  GRADE_STUDENT_NOT_FOUND: 'GRADE_STUDENT_NOT_FOUND',

  // 系统错误
  DATABASE_CONNECTION_ERROR: 'DATABASE_CONNECTION_ERROR',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED'
} as const

// 错误处理中间件
export const errorHandler = (error: any): ErrorResponse => {
  // 已知业务错误
  if (error.code && ErrorCodes[error.code as keyof typeof ErrorCodes]) {
    return errorResponse(error.code, error.message)
  }

  // 数据库错误
  if (error.code === '23505') { // PostgreSQL唯一约束冲突
    return errorResponse('GRADE_DUPLICATE_ENTRY', '该学生在此考试中已有成绩记录')
  }

  // 未知错误
  console.error('Unexpected error:', error)
  return errorResponse('INTERNAL_SERVER_ERROR', '服务器内部错误')
}
```

### 🔒 API安全规范

#### 认证和权限检查
```typescript
// ✅ 正确的权限检查实现

// 权限装饰器
export const requireAuth = (requiredRole?: UserRole) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const { user } = this.context

      // 检查用户认证
      if (!user) {
        throw errorResponse('AUTH_REQUIRED', '需要登录访问')
      }

      // 检查用户角色
      if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
        throw errorResponse('AUTH_INSUFFICIENT_PERMISSIONS', '权限不足')
      }

      // 检查用户状态
      if (user.status !== 'active') {
        throw errorResponse('AUTH_ACCOUNT_DISABLED', '账户已被禁用')
      }

      return method.apply(this, args)
    }
  }
}

// 使用示例
class GradeController {
  @requireAuth('teacher')
  async createGrade(gradeData: CreateGradeData) {
    // 只有教师可以创建成绩
  }

  @requireAuth()
  async getMyGrades() {
    // 任何登录用户都可以查看自己的成绩
  }
}
```

#### 数据验证规范
```typescript
// ✅ 使用Zod进行数据验证

import { z } from 'zod'

// 基础验证模式
const GradeDataSchema = z.object({
  exam_id: z.string().uuid('考试ID格式不正确'),
  student_id: z.string().min(1, '学生ID不能为空'),
  name: z.string().min(1, '学生姓名不能为空'),
  subject: z.string().optional(),
  score: z.number()
    .min(0, '分数不能小于0')
    .max(100, '分数不能大于100')
    .optional(),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']).optional()
})

// 批量导入验证
const BatchGradeImportSchema = z.object({
  exam_id: z.string().uuid(),
  grades: z.array(GradeDataSchema).min(1, '至少需要一条成绩数据')
})

// 验证中间件
export const validateData = <T>(schema: z.ZodSchema<T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body)
      req.validatedData = validatedData
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorDetails = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
        
        throw errorResponse(
          'VALIDATION_ERROR',
          '数据验证失败',
          errorDetails
        )
      }
      throw error
    }
  }
}

// 使用示例
app.post('/api/grades', 
  validateData(GradeDataSchema),
  gradeController.createGrade
)
```

---

## 🧪 测试规范

### 🔬 单元测试规范

#### 测试文件组织
```typescript
// ✅ 正确的测试文件结构

// src/services/__tests__/gradeAnalysisService.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { gradeAnalysisService } from '../gradeAnalysisService'
import { mockGradeData } from '../../__mocks__/gradeData'

describe('GradeAnalysisService', () => {
  // 测试分组 - 按功能模块
  describe('getGradeStatistics', () => {
    test('should calculate correct average score', () => {
      const stats = gradeAnalysisService.getGradeStatistics(mockGradeData)
      expect(stats.averageScore).toBe(85.5)
    })

    test('should handle empty grade data', () => {
      expect(() => {
        gradeAnalysisService.getGradeStatistics([])
      }).toThrow('成绩数据不能为空')
    })

    test('should filter out invalid scores', () => {
      const dataWithInvalidScores = [
        ...mockGradeData,
        { id: '1', score: null, grade: 'A' },
        { id: '2', score: -10, grade: 'F' }
      ]
      
      const stats = gradeAnalysisService.getGradeStatistics(dataWithInvalidScores)
      expect(stats.validScoreCount).toBe(mockGradeData.length)
    })
  })

  describe('getGradeDistribution', () => {
    test('should return correct grade distribution', () => {
      const distribution = gradeAnalysisService.getGradeDistribution(mockGradeData)
      
      expect(distribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            grade: 'A',
            count: expect.any(Number),
            percentage: expect.any(Number)
          })
        ])
      )
    })
  })
})
```

#### Mock数据规范
```typescript
// ✅ 正确的Mock数据设计

// src/__mocks__/gradeData.ts
export const mockGradeData: GradeData[] = [
  {
    id: 'grade-1',
    exam_id: 'exam-1',
    student_id: 'student-1',
    name: '张三',
    subject: '数学',
    score: 95,
    grade: 'A',
    rank_in_class: 1,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'grade-2',
    exam_id: 'exam-1',
    student_id: 'student-2',
    name: '李四',
    subject: '数学',
    score: 88,
    grade: 'B',
    rank_in_class: 2,
    created_at: '2024-01-01T00:00:00Z'
  }
  // ... 更多测试数据
]

// Mock服务
export const mockGradeService = {
  getGradeData: vi.fn().mockResolvedValue(mockGradeData),
  createGrade: vi.fn().mockResolvedValue({ success: true }),
  updateGrade: vi.fn().mockResolvedValue({ success: true }),
  deleteGrade: vi.fn().mockResolvedValue({ success: true })
}
```

### 🎭 组件测试规范

#### React组件测试
```typescript
// ✅ 正确的组件测试

// src/components/__tests__/GradeCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import { GradeCard } from '../GradeCard'
import { mockGradeData } from '../../__mocks__/gradeData'

describe('GradeCard', () => {
  const defaultProps = {
    grade: mockGradeData[0],
    onClick: vi.fn()
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  // 渲染测试
  test('should render grade information correctly', () => {
    render(<GradeCard {...defaultProps} />)
    
    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('张三')).toBeInTheDocument()
  })

  // 交互测试
  test('should call onClick when clicked', () => {
    render(<GradeCard {...defaultProps} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(defaultProps.onClick).toHaveBeenCalledWith(mockGradeData[0])
  })

  // 条件渲染测试
  test('should show selected state when isSelected is true', () => {
    render(<GradeCard {...defaultProps} isSelected />)
    
    expect(screen.getByRole('button')).toHaveClass('selected')
  })

  // 可访问性测试
  test('should be accessible', () => {
    render(<GradeCard {...defaultProps} />)
    
    const card = screen.getByRole('button')
    expect(card).toHaveAttribute('aria-label')
    expect(card).toHaveAttribute('tabIndex', '0')
  })

  // 错误边界测试
  test('should handle missing grade data gracefully', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    expect(() => {
      render(<GradeCard grade={null as any} />)
    }).not.toThrow()
    
    consoleError.mockRestore()
  })
})
```

### 🔗 集成测试规范

#### API集成测试
```typescript
// ✅ 正确的API集成测试

// src/api/__tests__/gradeAPI.integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { createTestDatabase, cleanupTestDatabase } from '../test-utils'
import { gradeAPI } from '../gradeAPI'

describe('Grade API Integration', () => {
  let testDb: any

  beforeAll(async () => {
    testDb = await createTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase(testDb)
  })

  test('should create and retrieve grade data', async () => {
    // 创建测试数据
    const newGrade = {
      exam_id: 'test-exam-1',
      student_id: 'test-student-1',
      name: '测试学生',
      score: 90,
      grade: 'A'
    }

    // 创建成绩
    const createResponse = await gradeAPI.createGrade(newGrade)
    expect(createResponse.success).toBe(true)

    // 获取成绩
    const getResponse = await gradeAPI.getGradesByExam('test-exam-1')
    expect(getResponse.success).toBe(true)
    expect(getResponse.data).toHaveLength(1)
    expect(getResponse.data[0]).toMatchObject(newGrade)
  })

  test('should handle concurrent grade creation', async () => {
    const grades = Array.from({ length: 10 }, (_, i) => ({
      exam_id: 'test-exam-2',
      student_id: `test-student-${i}`,
      name: `测试学生${i}`,
      score: 80 + i,
      grade: 'B'
    }))

    // 并发创建
    const promises = grades.map(grade => gradeAPI.createGrade(grade))
    const results = await Promise.all(promises)

    // 验证所有创建都成功
    results.forEach(result => {
      expect(result.success).toBe(true)
    })

    // 验证数据完整性
    const getResponse = await gradeAPI.getGradesByExam('test-exam-2')
    expect(getResponse.data).toHaveLength(10)
  })
})
```

---

## 📦 部署和运维规范

### 🚀 构建和部署

#### 环境配置规范
```bash
# ✅ 正确的环境变量配置

# .env.example - 环境变量模板
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_APP_ENV=development

# .env.local - 本地开发配置
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=local_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_APP_ENV=development
VITE_DEBUG=true

# .env.production - 生产环境配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=production_anon_key
VITE_OPENAI_API_KEY=production_openai_key
VITE_APP_ENV=production
VITE_DEBUG=false
```

#### 构建脚本规范
```json
// ✅ package.json 脚本配置
{
  "scripts": {
    // 开发环境
    "dev": "vite",
    "dev:host": "vite --host",
    
    // 构建相关
    "build": "npm run type-check && vite build",
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "build:production": "vite build --mode production",
    
    // 代码质量
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    
    // 测试相关
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    
    // 数据库相关
    "db:generate-types": "supabase gen types typescript --local > src/types/database.ts",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase migration up",
    
    // 部署相关
    "preview": "vite preview",
    "deploy:staging": "npm run build:staging && vercel --prod",
    "deploy:production": "npm run build:production && vercel --prod"
  }
}
```

### 📊 监控和日志

#### 错误监控规范
```typescript
// ✅ 正确的错误监控实现

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到监控系统
    this.logErrorToService(error, errorInfo)
  }

  logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // 发送到错误监控服务
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(console.error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>出现了意外错误</h2>
          <p>我们已记录此错误，请刷新页面重试</p>
          <button onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

#### 性能监控规范
```typescript
// ✅ 正确的性能监控实现

// 性能监控工具
export const performanceMonitor = {
  // 组件渲染性能
  measureComponentRender: (componentName: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      if (renderTime > 16) { // 超过一帧时间
        console.warn(`Component ${componentName} render time: ${renderTime}ms`)
        
        // 记录到监控系统
        this.logPerformanceMetric({
          type: 'component_render',
          component: componentName,
          duration: renderTime,
          timestamp: Date.now()
        })
      }
    }
  },

  // API请求性能
  measureAPICall: async <T>(
    apiCall: () => Promise<T>,
    apiName: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.logPerformanceMetric({
        type: 'api_call',
        api: apiName,
        duration,
        status: 'success',
        timestamp: Date.now()
      })
      
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.logPerformanceMetric({
        type: 'api_call',
        api: apiName,
        duration,
        status: 'error',
        error: error.message,
        timestamp: Date.now()
      })
      
      throw error
    }
  },

  // 记录性能指标
  logPerformanceMetric: (metric: PerformanceMetric) => {
    // 批量发送到监控系统
    this.metricsQueue.push(metric)
    
    if (this.metricsQueue.length >= 10) {
      this.flushMetrics()
    }
  },

  metricsQueue: [] as PerformanceMetric[],
  
  flushMetrics: () => {
    if (this.metricsQueue.length === 0) return
    
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.metricsQueue)
    }).then(() => {
      this.metricsQueue = []
    }).catch(console.error)
  }
}

// 使用示例
const GradeAnalysisComponent = () => {
  const measureRender = performanceMonitor.measureComponentRender('GradeAnalysis')
  
  useEffect(() => {
    return measureRender
  })

  const fetchGrades = async () => {
    return performanceMonitor.measureAPICall(
      () => gradeService.getGrades(),
      'getGrades'
    )
  }

  return <div>组件内容</div>
}
```

---

## 📚 文档规范

### 📝 代码文档规范

#### JSDoc注释规范
```typescript
/**
 * 计算学生成绩的各项统计指标
 * 
 * @description 
 * 此函数用于分析学生成绩数据，计算包括平均分、最高分、最低分、
 * 标准差、及格率等多项统计指标。支持按科目分组统计。
 * 
 * @param grades - 成绩数据数组，每个元素包含学生成绩信息
 * @param options - 计算选项配置
 * @param options.groupBySubject - 是否按科目分组统计，默认为false
 * @param options.includePercentile - 是否包含百分位数计算，默认为false
 * @param options.excludeInvalidScores - 是否排除无效成绩，默认为true
 * 
 * @returns 返回统计结果对象
 * @returns returns.overall - 整体统计信息
 * @returns returns.bySubject - 按科目的统计信息（当groupBySubject为true时）
 * 
 * @throws {Error} 当成绩数组为空时抛出错误
 * @throws {ValidationError} 当成绩数据格式不正确时抛出错误
 * 
 * @example
 * ```typescript
 * // 基本用法
 * const stats = calculateGradeStatistics(gradeData)
 * console.log(stats.overall.averageScore)
 * 
 * // 按科目分组统计
 * const statsBySubject = calculateGradeStatistics(gradeData, {
 *   groupBySubject: true,
 *   includePercentile: true
 * })
 * console.log(statsBySubject.bySubject['数学'].averageScore)
 * ```
 * 
 * @since 1.0.0
 * @version 1.2.0
 * @author 张三 <zhangsan@example.com>
 */
function calculateGradeStatistics(
  grades: GradeData[],
  options: CalculationOptions = {}
): GradeStatistics {
  // 函数实现...
}
```

#### README文档规范
```markdown
# 🎓 成绩分析系统

> 基于AI驱动的智能成绩分析和学生画像系统

## ✨ 主要功能

- 📊 **成绩分析**: 多维度成绩统计和可视化
- 🤖 **AI诊断**: 智能学习诊断和个性化建议  
- ⚠️ **预警系统**: 自动预警和干预工作流
- 👤 **学生画像**: comprehensive学习行为分析
- 📱 **响应式设计**: 支持桌面端和移动端

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 14.0.0

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-org/grade-analysis-system.git
   cd grade-analysis-system
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境**
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 填入配置信息
   ```

4. **初始化数据库**
   ```bash
   npm run db:migrate
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

## 📁 项目结构

```
src/
├── components/         # React组件
│   ├── analysis/      # 成绩分析组件
│   ├── homework/      # 作业管理组件
│   └── ui/           # 基础UI组件
├── pages/             # 页面组件
├── services/          # 业务逻辑
├── hooks/            # 自定义Hooks
├── utils/            # 工具函数
└── types/            # 类型定义
```

## 🔧 开发指南

### 代码规范

- 使用 TypeScript 进行开发
- 遵循 ESLint 和 Prettier 规范
- 组件使用函数式组件和Hooks
- 样式使用 Tailwind CSS

### 测试

```bash
# 运行单元测试
npm run test

# 运行集成测试
npm run test:e2e

# 查看测试覆盖率
npm run test:coverage
```

### 构建部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📖 API文档

详细的API文档请查看：[API Reference](./docs/API_REFERENCE.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

如有问题，请通过以下方式联系：

- 📧 Email: support@example.com
- 💬 Issues: [GitHub Issues](https://github.com/your-org/grade-analysis-system/issues)
- 📚 文档: [项目文档](https://docs.example.com)
```

---

## 🚨 规范执行和检查

### 🔍 代码审查清单

#### 基本检查项
```markdown
✅ 代码质量检查:
□ 代码遵循命名规范
□ 函数和组件有适当的注释
□ 没有未使用的导入和变量
□ 错误处理得当
□ 类型定义完整

✅ 功能检查:
□ 功能按需求正确实现
□ 边界情况处理正确
□ 用户体验良好
□ 性能表现满足要求

✅ 安全检查:
□ 没有硬编码敏感信息
□ 用户输入得到验证
□ 权限检查正确
□ XSS和CSRF防护

✅ 测试检查:
□ 单元测试覆盖关键逻辑
□ 集成测试验证功能
□ 测试用例设计合理
□ 测试数据准备充分
```

### 📊 自动化检查工具

#### Git Hooks配置
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 代码格式检查
npm run lint
npm run format

# 类型检查
npm run type-check

# 单元测试
npm run test:changed

echo "✅ Pre-commit checks passed"
```

#### CI/CD Pipeline
```yaml
# .github/workflows/quality-check.yml
name: Quality Check

on: [push, pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint check
      run: npm run lint
    
    - name: Type check
      run: npm run type-check
    
    - name: Run tests
      run: npm run test:coverage
    
    - name: Build check
      run: npm run build
    
    - name: Security audit
      run: npm audit --audit-level high
```

---

**📌 重要提醒**: 
- 此文档是所有开发活动的规范基础
- 任何规范变更都必须团队讨论决定
- 违反规范的代码不允许合并到主分支
- 定期回顾和更新开发规范

**🔄 文档版本**: v1.0 | **最后更新**: 2025-01-04