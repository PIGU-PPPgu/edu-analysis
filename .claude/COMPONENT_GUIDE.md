# 🧩 组件架构完整指南

> **多Agent协作核心** - 前端组件架构和使用规范的统一参考

## 🎯 使用指南

### 📌 重要约定
1. **所有Agent必须严格遵循此组件架构**
2. **新增组件必须放入正确的目录结构**
3. **组件修改必须更新此文档**
4. **复用组件优先于创建新组件**

### 🔄 更新机制
- 新增组件 → 立即更新此文档
- 组件重构 → 立即更新此文档
- API变更 → 立即更新此文档

---

## 🏗️ 项目架构总览

### 📊 技术栈
- **框架**: React 18.3.1 + TypeScript
- **构建工具**: Vite 5.4.1
- **UI库**: Radix UI + Shadcn/ui + Tailwind CSS
- **图表库**: Recharts + Nivo + Chart.js
- **状态管理**: React Context + React Query
- **路由**: React Router DOM 6.26.2
- **数据库**: Supabase + PostgreSQL

### 📁 目录结构
```
src/
├── components/          # 组件库
│   ├── analysis/       # 成绩分析组件
│   ├── auth/          # 认证相关组件
│   ├── homework/      # 作业管理组件
│   ├── profile/       # 学生画像组件
│   ├── warning/       # 预警系统组件
│   ├── ui/           # 基础UI组件
│   └── shared/       # 共享组件
├── pages/             # 页面组件
├── contexts/          # 状态管理
├── services/          # 业务逻辑
├── hooks/            # 自定义Hooks
├── utils/            # 工具函数
└── types/            # 类型定义
```

---

## 📊 成绩分析组件架构

### 🎯 核心组件层级

#### 1. **GradeAnalysisLayout** - 主布局组件
- **路径**: `src/pages/GradeAnalysisLayout.tsx`
- **用途**: 成绩分析模块的主布局容器
- **Provider**: `ModernGradeAnalysisProvider`

```typescript
// 使用示例
import { GradeAnalysisLayout } from '@/pages/GradeAnalysisLayout'

<GradeAnalysisLayout>
  {/* 分析内容 */}
</GradeAnalysisLayout>
```

#### 2. **ModernGradeAnalysisDashboard** - 现代化仪表板
- **路径**: `src/components/analysis/dashboard/ModernGradeAnalysisDashboard.tsx`
- **用途**: 成绩分析的主仪表板
- **特性**: Figma Positivus设计风格

**组件结构**:
```typescript
interface DashboardProps {
  examId?: string
  initialFilters?: GradeFilters
  onExamChange?: (examId: string) => void
}

export const ModernGradeAnalysisDashboard: React.FC<DashboardProps>
```

### 📈 分析子组件

#### 核心分析组件 (src/components/analysis/core/)

##### **StatisticsOverview** - 统计概览
- **路径**: `src/components/analysis/statistics/StatisticsOverview.tsx`
- **用途**: 显示核心统计指标
- **包含**: 4张指标卡片 + 等级分布图

```typescript
interface StatisticsProps {
  examId: string
  filters?: GradeFilters
}

export const StatisticsOverview: React.FC<StatisticsProps>
```

##### **BasicGradeStats** - 基础成绩统计
- **路径**: `src/components/analysis/core/BasicGradeStats.tsx`
- **用途**: 基础统计卡片组件

##### **EnhancedScoreDistribution** - 增强分数分布
- **路径**: `src/components/analysis/core/EnhancedScoreDistribution.tsx`
- **用途**: 分数分布可视化

#### 高级分析组件 (src/components/analysis/advanced/)

##### **PredictiveAnalysis** - 预测分析
- **路径**: `src/components/analysis/advanced/PredictiveAnalysis.tsx`
- **用途**: AI驱动的成绩预测
- **依赖**: aiService

```typescript
interface PredictiveProps {
  studentData: StudentGrade[]
  timeRange: TimeRange
}

export const PredictiveAnalysis: React.FC<PredictiveProps>
```

##### **AnomalyDetectionAnalysis** - 异常检测
- **路径**: `src/components/analysis/advanced/AnomalyDetectionAnalysis.tsx`
- **用途**: 检测成绩异常模式

##### **LearningBehaviorAnalysis** - 学习行为分析
- **路径**: `src/components/analysis/advanced/LearningBehaviorAnalysis.tsx`
- **用途**: 分析学习行为模式

#### AI分析组件 (src/components/analysis/ai/)

##### **ClassAIDiagnostician** - 班级AI诊断
- **路径**: `src/components/analysis/ai/ClassAIDiagnostician.tsx`
- **用途**: AI驱动的班级诊断

```typescript
interface ClassAIProps {
  classId: string
  examId: string
  onDiagnosisComplete?: (result: AIAnalysisResult) => void
}

export const ClassAIDiagnostician: React.FC<ClassAIProps>
```

##### **StudentAIAdvisor** - 学生AI顾问
- **路径**: `src/components/analysis/ai/StudentAIAdvisor.tsx`
- **用途**: 为学生提供个性化AI建议

##### **AIGradePatternAnalysis** - AI成绩模式分析
- **路径**: `src/components/analysis/ai/AIGradePatternAnalysis.tsx`
- **用途**: 分析成绩模式并提供洞察

### 🔧 数据导入组件架构

#### 导入流程组件 (src/components/analysis/core/grade-importer/)

##### **GradeImporter** - 主导入器
- **路径**: `src/components/analysis/core/grade-importer/GradeImporter.tsx`
- **用途**: 成绩导入的主控制器

```typescript
interface ImporterProps {
  onImportComplete?: (result: ImportResult) => void
  onError?: (error: Error) => void
}

export const GradeImporter: React.FC<ImporterProps>
```

##### **FileUploader** - 文件上传器
- **路径**: `src/components/analysis/core/grade-importer/components/FileUploader.tsx`
- **用途**: 处理文件上传和基本验证

##### **ImportProcessor** - 导入处理器
- **路径**: `src/components/analysis/core/grade-importer/components/ImportProcessor.tsx`
- **用途**: 处理数据导入逻辑

##### **PostImportReview** - 导入后检查
- **路径**: `src/components/analysis/core/grade-importer/components/PostImportReview.tsx`
- **用途**: 导入后的字段检查和修复

```typescript
interface PostImportProps {
  headers: string[]
  sampleData: any[]
  currentMapping: FieldMapping
  aiAnalysis?: AIAnalysisResult
  onFixComplete?: () => void
}

export const PostImportReview: React.FC<PostImportProps>
```

##### **MappingEditor** - 映射编辑器
- **路径**: `src/components/analysis/core/grade-importer/components/MappingEditor.tsx`
- **用途**: 编辑已导入数据的字段映射

### 🎨 筛选和控制组件

#### **ModernGradeFilters** - 现代化筛选器
- **路径**: `src/components/analysis/filters/ModernGradeFilters.tsx`
- **用途**: 统一的筛选控制组件
- **设计**: 标签式筛选，Figma风格

```typescript
interface FiltersProps {
  filters: GradeFilters
  onFiltersChange: (filters: GradeFilters) => void
  availableExams: Exam[]
  availableClasses: string[]
  availableSubjects: string[]
}

export const ModernGradeFilters: React.FC<FiltersProps>
```

---

## 📝 作业管理组件架构

### 🏠 核心作业组件 (src/components/homework/)

#### **HomeworkManagementPage** - 作业管理主页
- **路径**: `src/components/homework/HomeworkManagementPage.tsx`
- **用途**: 作业管理的主界面

#### **HomeworkDetail** - 作业详情
- **路径**: `src/components/homework/HomeworkDetail.tsx`
- **用途**: 显示和编辑作业详情
- **特性**: 支持AI分析和知识点管理

```typescript
interface HomeworkDetailProps {
  homeworkId: string
  mode?: 'view' | 'edit' | 'grade'
  onUpdate?: (homework: Homework) => void
}

export const HomeworkDetail: React.FC<HomeworkDetailProps>
```

#### **KnowledgePointAnalysis** - 知识点分析
- **路径**: `src/components/homework/KnowledgePointAnalysis.tsx`
- **用途**: 分析作业涉及的知识点

#### **AIKnowledgePointAnalyzer** - AI知识点分析器
- **路径**: `src/components/homework/AIKnowledgePointAnalyzer.tsx`
- **用途**: 使用AI自动识别知识点

### 📋 作业相关对话框

#### **CreateHomeworkDialog** - 创建作业对话框
- **路径**: `src/components/homework/CreateHomeworkDialog.tsx`
- **用途**: 创建新作业的表单对话框

#### **GradeHomeworkDialog** - 批改作业对话框
- **路径**: `src/components/homework/GradeHomeworkDialog.tsx`
- **用途**: 批改作业的界面

---

## ⚠️ 预警系统组件架构

### 🚨 核心预警组件 (src/components/warning/)

#### **WarningDashboard** - 预警仪表板
- **路径**: `src/components/warning/WarningDashboard.tsx`
- **用途**: 预警系统的主仪表板

```typescript
interface WarningDashboardProps {
  timeRange?: TimeRange
  studentId?: string
  classId?: string
}

export const WarningDashboard: React.FC<WarningDashboardProps>
```

#### **AutoWarningManager** - 自动预警管理器
- **路径**: `src/components/warning/AutoWarningManager.tsx`
- **用途**: 管理自动预警规则和状态

#### **WarningAnalysis** - 预警分析
- **路径**: `src/components/warning/WarningAnalysis.tsx`
- **用途**: 深度分析预警数据

#### **InterventionWorkflow** - 干预工作流
- **路径**: `src/components/warning/InterventionWorkflow.tsx`
- **用途**: 管理预警后的干预流程

---

## 👤 学生画像组件架构

### 🎯 画像核心组件 (src/components/profile/)

#### **StudentLearningTags** - 学生学习标签
- **路径**: `src/components/profile/StudentLearningTags.tsx`
- **用途**: 显示和管理学生标签

#### **LearningBehaviorAnalysis** - 学习行为分析
- **路径**: `src/components/profile/LearningBehaviorAnalysis.tsx`
- **用途**: 分析学生学习行为

#### **LearningProgressTracker** - 学习进度跟踪
- **路径**: `src/components/profile/LearningProgressTracker.tsx`
- **用途**: 跟踪学生学习进度

### 🔍 高级画像组件 (src/components/portrait/advanced/)

#### **EnhancedStudentPortrait** - 增强学生画像
- **路径**: `src/components/portrait/advanced/EnhancedStudentPortrait.tsx`
- **用途**: 综合学生画像展示

#### **IntelligentPortraitAnalysis** - 智能画像分析
- **路径**: `src/components/portrait/advanced/IntelligentPortraitAnalysis.tsx`
- **用途**: AI驱动的画像分析

---

## 🎨 基础UI组件架构

### 🧩 Shadcn/ui组件 (src/components/ui/)

#### 核心组件列表
- **Button** (`button.tsx`) - 按钮组件
- **Card** (`card.tsx`) - 卡片组件
- **Dialog** (`dialog.tsx`) - 对话框组件
- **Table** (`table.tsx`) - 表格组件
- **Form** (`form.tsx`) - 表单组件
- **Input** (`input.tsx`) - 输入框组件
- **Select** (`select.tsx`) - 选择器组件
- **Toast** (`toast.tsx`) - 提示组件

#### 图表组件
- **Chart** (`chart.tsx`) - 基础图表组件
- **ChartExportButton** (`ChartExportButton.tsx`) - 图表导出按钮
- **ChartLegendToggle** (`ChartLegendToggle.tsx`) - 图表图例切换
- **ChartZoomControls** (`ChartZoomControls.tsx`) - 图表缩放控制

#### 数据组件
- **DataTable** (`data-table.tsx`) - 数据表格
- **PaginatedTable** (`paginated-table.tsx`) - 分页表格
- **DataExport** (`data-export.tsx`) - 数据导出

#### 筛选组件
- **GradeFilters** (`grade-filters.tsx`) - 成绩筛选器
- **CompactGradeFilters** (`compact-grade-filters.tsx`) - 紧凑筛选器
- **SmartFilter** (`smart-filter.tsx`) - 智能筛选器

### 🔧 自定义UI组件

#### **LoadingStates** - 加载状态
- **路径**: `src/components/shared/LoadingStates.tsx`
- **用途**: 统一的加载状态组件

```typescript
interface LoadingProps {
  type?: 'spinner' | 'skeleton' | 'dots'
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export const LoadingStates: React.FC<LoadingProps>
```

#### **ErrorBoundary** - 错误边界
- **路径**: `src/components/shared/ErrorBoundary.tsx`
- **用途**: 捕获和处理组件错误

#### **ResponsiveLayout** - 响应式布局
- **路径**: `src/components/shared/ResponsiveLayout.tsx`
- **用途**: 提供响应式布局容器

---

## 🔄 状态管理架构

### 📊 Context Providers

#### **ModernGradeAnalysisContext** - 现代成绩分析上下文
- **路径**: `src/contexts/ModernGradeAnalysisContext.tsx`
- **用途**: 统一管理成绩分析状态

```typescript
interface GradeAnalysisContextType {
  // 数据状态
  exams: Exam[]
  students: Student[]
  gradeData: GradeData[]
  
  // 筛选状态
  filters: GradeFilters
  setFilters: (filters: GradeFilters) => void
  
  // 加载状态
  loading: boolean
  error: Error | null
  
  // 操作方法
  refreshData: () => Promise<void>
  exportData: (format: 'csv' | 'excel') => Promise<void>
}

export const useGradeAnalysis = () => useContext(ModernGradeAnalysisContext)
```

#### **AuthContext** - 认证上下文
- **路径**: `src/contexts/AuthContext.tsx`
- **用途**: 管理用户认证状态

#### **FilterContext** - 筛选上下文
- **路径**: `src/contexts/FilterContext.tsx`
- **用途**: 全局筛选状态管理

### 🎣 自定义Hooks

#### **useGradeImporter** - 成绩导入Hook
- **路径**: `src/components/analysis/core/grade-importer/hooks/useGradeImporter.ts`
- **用途**: 管理成绩导入状态和逻辑

```typescript
interface ImporterState {
  step: ImportStep
  uploadedData: any[]
  mappingConfig: FieldMapping
  validationResult: ValidationResult
  isProcessing: boolean
  error: Error | null
}

export const useGradeImporter = () => {
  // 状态管理
  const [state, setState] = useState<ImporterState>(initialState)
  
  // 操作方法
  const handleFileUpload = (file: File) => Promise<void>
  const handleMappingConfirm = (mapping: FieldMapping) => void
  const handleStartImport = () => Promise<void>
  
  return { state, handleFileUpload, handleMappingConfirm, handleStartImport }
}
```

#### **useCachedQuery** - 缓存查询Hook
- **路径**: `src/hooks/useCachedQuery.ts`
- **用途**: 带缓存的数据查询

#### **useErrorHandling** - 错误处理Hook
- **路径**: `src/hooks/useErrorHandling.ts`
- **用途**: 统一错误处理逻辑

---

## 📱 页面组件架构

### 🏠 主要页面

#### **Index** - 首页
- **路径**: `src/pages/Index.tsx`
- **用途**: 应用主页

#### **GradeAnalysisLayout** - 成绩分析布局
- **路径**: `src/pages/GradeAnalysisLayout.tsx`
- **用途**: 成绩分析模块的布局容器

#### **StudentManagement** - 学生管理
- **路径**: `src/pages/StudentManagement.tsx`
- **用途**: 学生信息管理页面

#### **HomeworkManagement** - 作业管理
- **路径**: `src/pages/HomeworkManagement.tsx`
- **用途**: 作业管理主页面

#### **WarningAnalysis** - 预警分析
- **路径**: `src/pages/WarningAnalysis.tsx`
- **用途**: 预警分析页面

---

## 🎨 设计系统

### 🌈 颜色主题

#### Figma Positivus风格
```css
:root {
  /* 主色调 - 绿色 */
  --primary-green: #B9FF66;
  --primary-green-dark: #8fd13f;
  
  /* 辅助色 */
  --accent-blue: #4F9CF9;
  --accent-yellow: #FFD700;
  --accent-purple: #9B59B6;
  
  /* 语义色彩 */
  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;
}
```

#### 成绩等级色彩
```css
/* 成绩等级颜色映射 */
.grade-a { color: #10B981; } /* 绿色 - 优秀 */
.grade-b { color: #3B82F6; } /* 蓝色 - 良好 */
.grade-c { color: #F59E0B; } /* 黄色 - 中等 */
.grade-d { color: #EF4444; } /* 红色 - 需改进 */
```

### 🎯 组件设计原则

#### 1. **一致性原则**
- 所有组件使用统一的设计语言
- 颜色、字体、间距保持一致
- 交互行为统一标准

#### 2. **可复用原则**
- 组件高度可复用，支持props配置
- 避免硬编码，使用可配置参数
- 提供清晰的API接口

#### 3. **响应式原则**
- 所有组件支持移动端适配
- 使用Tailwind响应式类名
- 关键信息在小屏幕上优先显示

#### 4. **可访问性原则**
- 支持键盘导航
- 提供合适的ARIA标签
- 颜色对比度符合标准

---

## 🔧 组件开发规范

### 📝 组件结构模板

```typescript
// ComponentName.tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface ComponentNameProps {
  // Props定义
  className?: string
  children?: React.ReactNode
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {children}
    </div>
  )
}

// 导出类型
export type { ComponentNameProps }
```

### 🎯 Props设计规范

#### 1. **必需Props**
- 组件正常工作必须的数据
- 不提供默认值的关键配置

#### 2. **可选Props**
- 提供合理默认值
- 支持自定义配置
- className和style支持

#### 3. **回调Props**
- 事件处理函数
- 使用统一的命名约定 (onXxx)
- 提供详细的事件参数

### 🔄 状态管理规范

#### 1. **本地状态**
- 使用useState管理组件内部状态
- 状态尽可能简单和扁平
- 避免不必要的状态

#### 2. **全局状态**
- 使用Context管理跨组件状态
- 配合useReducer处理复杂逻辑
- 状态更新保持不可变性

#### 3. **服务器状态**
- 使用React Query管理服务器数据
- 实现适当的缓存策略
- 处理加载和错误状态

---

## 📊 图表组件使用指南

### 📈 图表库选择

#### 1. **Recharts** - 主要图表库
- **用途**: 基础图表 (柱状图、折线图、饼图)
- **优势**: 轻量、易用、响应式
- **适用**: 成绩分布、趋势分析

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

// 成绩分布柱状图
<BarChart width={600} height={300} data={gradeDistribution}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="grade" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="count" fill="#B9FF66" />
</BarChart>
```

#### 2. **Nivo** - 高级图表
- **用途**: 复杂可视化 (热图、散点图、关系图)
- **优势**: 功能强大、动画效果好
- **适用**: 相关性分析、学习行为分析

```typescript
import { ResponsiveHeatMap } from '@nivo/heatmap'

// 科目相关性热图
<ResponsiveHeatMap
  data={correlationData}
  margin={{ top: 60, right: 90, bottom: 60, left: 90 }}
  valueFormat=">-.2s"
  axisTop={{
    tickSize: 5,
    tickPadding: 5,
    tickRotation: -90
  }}
/>
```

#### 3. **Chart.js** - 通用图表
- **用途**: 特殊需求的图表
- **优势**: 功能全面、插件丰富
- **适用**: 复杂的自定义图表

### 📊 图表使用最佳实践

#### 1. **数据准备**
```typescript
// 标准化图表数据格式
interface ChartDataPoint {
  label: string
  value: number
  category?: string
  metadata?: Record<string, any>
}

// 成绩分布数据示例
const gradeDistribution: ChartDataPoint[] = [
  { label: 'A', value: 25, category: '优秀' },
  { label: 'B', value: 35, category: '良好' },
  { label: 'C', value: 30, category: '中等' },
  { label: 'D', value: 10, category: '需改进' }
]
```

#### 2. **响应式设计**
```typescript
// 响应式图表容器
<div className="w-full h-64 md:h-80 lg:h-96">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data}>
      {/* 图表配置 */}
    </BarChart>
  </ResponsiveContainer>
</div>
```

#### 3. **主题一致性**
```typescript
// 图表主题配置
const chartTheme = {
  colors: ['#B9FF66', '#4F9CF9', '#FFD700', '#9B59B6'],
  grid: {
    strokeDasharray: '3 3',
    stroke: '#e2e8f0'
  },
  text: {
    fontSize: 12,
    fill: '#64748b'
  }
}
```

---

## 🚨 重要约定和最佳实践

### ⚡ 性能优化

#### 1. **组件懒加载**
```typescript
// 重型组件使用懒加载
const HeavyAnalysisComponent = lazy(() => import('./HeavyAnalysisComponent'))

// 使用Suspense包装
<Suspense fallback={<LoadingStates />}>
  <HeavyAnalysisComponent />
</Suspense>
```

#### 2. **数据缓存**
```typescript
// 使用React Query缓存数据
const { data: gradeData, isLoading, error } = useQuery({
  queryKey: ['grades', examId, filters],
  queryFn: () => gradeAnalysisService.getGradeData(examId, filters),
  staleTime: 5 * 60 * 1000, // 5分钟缓存
})
```

#### 3. **虚拟化长列表**
```typescript
// 大数据表格使用虚拟化
import { FixedSizeList as List } from 'react-window'

<List
  height={600}
  itemCount={largeDataset.length}
  itemSize={50}
  itemData={largeDataset}
>
  {({ index, style, data }) => (
    <div style={style}>
      <TableRow data={data[index]} />
    </div>
  )}
</List>
```

### 🔒 安全规范

#### 1. **数据验证**
```typescript
// 使用Zod进行数据验证
import { z } from 'zod'

const GradeDataSchema = z.object({
  student_id: z.string().min(1),
  score: z.number().min(0).max(100),
  grade: z.enum(['A', 'B', 'C', 'D', 'F'])
})

// 组件中验证数据
const validatedData = GradeDataSchema.parse(rawData)
```

#### 2. **XSS防护**
```typescript
// 渲染用户输入时使用安全方法
import DOMPurify from 'dompurify'

// 清理HTML内容
const cleanContent = DOMPurify.sanitize(userInput)
```

### 🎯 可访问性

#### 1. **键盘导航**
```typescript
// 支持键盘操作
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onClick()
  }
}

<div
  role="button"
  tabIndex={0}
  onKeyDown={handleKeyDown}
  onClick={onClick}
>
  Clickable Content
</div>
```

#### 2. **ARIA标签**
```typescript
// 提供语义化标签
<button
  aria-label="导出成绩数据为Excel格式"
  aria-describedby="export-help-text"
  onClick={handleExport}
>
  导出数据
</button>
<div id="export-help-text" className="sr-only">
  点击此按钮将当前筛选的成绩数据导出为Excel文件
</div>
```

---

## 📚 常用组件使用示例

### 🎯 成绩分析组件

```typescript
// 完整的成绩分析页面
import { ModernGradeAnalysisProvider } from '@/contexts/ModernGradeAnalysisContext'
import { ModernGradeFilters } from '@/components/analysis/filters/ModernGradeFilters'
import { StatisticsOverview } from '@/components/analysis/statistics/StatisticsOverview'
import { ModernGradeAnalysisDashboard } from '@/components/analysis/dashboard/ModernGradeAnalysisDashboard'

export const GradeAnalysisPage = () => {
  return (
    <ModernGradeAnalysisProvider>
      <div className="space-y-6">
        <ModernGradeFilters />
        <StatisticsOverview />
        <ModernGradeAnalysisDashboard />
      </div>
    </ModernGradeAnalysisProvider>
  )
}
```

### 📝 作业管理组件

```typescript
// 作业详情页面
import { HomeworkDetail } from '@/components/homework/HomeworkDetail'
import { KnowledgePointAnalysis } from '@/components/homework/KnowledgePointAnalysis'

export const HomeworkDetailPage = ({ homeworkId }: { homeworkId: string }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <HomeworkDetail homeworkId={homeworkId} />
      </div>
      <div>
        <KnowledgePointAnalysis homeworkId={homeworkId} />
      </div>
    </div>
  )
}
```

### ⚠️ 预警系统组件

```typescript
// 预警仪表板
import { WarningDashboard } from '@/components/warning/WarningDashboard'
import { AutoWarningManager } from '@/components/warning/AutoWarningManager'

export const WarningSystemPage = () => {
  return (
    <div className="space-y-6">
      <AutoWarningManager />
      <WarningDashboard />
    </div>
  )
}
```

---

**📌 重要提醒**: 
- 此文档是前端组件开发的权威参考
- 任何组件架构变更都必须立即更新此文档
- 新增组件必须遵循此文档的规范
- 组件复用优于重新创建

**🔄 文档版本**: v1.0 | **最后更新**: 2025-01-04