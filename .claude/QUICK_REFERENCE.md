# ⚡ 快速参考手册

> **多Agent协作速查** - 最常用的接口、命令和规范的快速查询指南

## 🎯 使用说明

- **日常开发必备** - 快速查找常用API和命令
- **问题排查指南** - 快速定位和解决常见问题
- **最佳实践速查** - 快速应用开发规范

---

## 📊 核心数据库表速查

### 🔥 最常用表

| 表名 | 主键 | 用途 | 常用字段 |
|------|------|------|----------|
| **grade_data** | `id` | 成绩数据 ⭐️ | exam_id, student_id, subject, score, grade |
| **exams** | `id` | 考试信息 | title, type, date, subject |
| **students** | `id` | 学生信息 | name, student_number, class_id |
| **classes** | `id` | 班级信息 | name, grade, class_teacher_id |
| **ai_analysis_results** | `id` | AI分析结果 | user_id, analysis_type, analysis_data |

### 🔗 关键关联关系
```sql
-- 成绩 → 考试
grade_data.exam_id → exams.id

-- 成绩 → 学生 (通过student_id字段)
grade_data.student_id = students.student_number OR students.id

-- 学生 → 班级
students.class_id → classes.id
```

### ⚡ 常用查询模板

#### 获取考试成绩
```sql
-- 获取某考试的成绩数据
SELECT gd.*, e.title as exam_title
FROM grade_data gd
JOIN exams e ON gd.exam_id = e.id
WHERE gd.exam_id = $1
ORDER BY gd.score DESC;

-- 获取学生各科成绩
SELECT * FROM get_student_subject_scores($1, $2);

-- 获取科目统计分析
SELECT * FROM get_subject_analysis($1);
```

---

## 🔧 核心API接口速查

### 📊 成绩分析接口

```typescript
// 获取成绩统计
const stats = await gradeAnalysisService.getGradeStats(examId, filters)

// 获取成绩分布
const distribution = await gradeAnalysisService.getGradeDistribution(examId, subject)

// 获取班级对比
const comparison = await gradeAnalysisService.getClassComparison(examId)

// 获取学生成绩
const grades = await gradeAnalysisService.getStudentGrades(studentId)
```

### 🤖 AI服务接口

```typescript
// AI成绩分析
const analysis = await aiService.analyzeGrades(gradeData)

// 学生诊断
const diagnosis = await aiService.diagnoseStudent(studentId)

// 班级诊断
const classDiagnosis = await aiService.diagnoseClass(classId)

// 个性化建议
const recommendations = await aiService.getPersonalizedRecommendations(studentId)
```

### 📁 文件处理接口

```typescript
// 智能文件解析
const parseResult = await intelligentFileParser.parseFile(file)

// AI增强解析
const aiParseResult = await aiEnhancedFileParser.aiAssistedParse(file)

// 字段映射
const mapping = await intelligentFileParser.intelligentMapping(headers)
```

### ⚠️ 预警系统接口

```typescript
// 检查学生预警
const warnings = await warningService.checkStudentWarnings(studentId)

// 获取预警统计
const stats = await warningService.getWarningStatistics(timeRange)

// 创建预警规则
const rule = await warningService.createWarningRule(ruleData)
```

---

## 🎨 组件使用速查

### 📊 成绩分析组件

```tsx
// 主仪表板
<ModernGradeAnalysisProvider>
  <ModernGradeAnalysisDashboard examId="exam-123" />
</ModernGradeAnalysisProvider>

// 统计概览
<StatisticsOverview examId="exam-123" />

// 筛选器
<ModernGradeFilters 
  filters={filters}
  onFiltersChange={setFilters}
  availableExams={exams}
/>

// 数据导入
<GradeImporter 
  onImportComplete={handleComplete}
  onError={handleError}
/>
```

### 🎯 常用UI组件

```tsx
// 数据表格
<DataTable 
  data={gradeData}
  columns={gradeColumns}
  pagination={true}
/>

// 图表组件
<BarChart 
  data={chartData}
  dataKey="score"
  fill="#B9FF66"
/>

// 加载状态
<LoadingStates type="spinner" size="lg" text="加载中..." />

// 错误边界
<ErrorBoundary fallback={<ErrorFallback />}>
  <YourComponent />
</ErrorBoundary>
```

---

## 🎨 样式和设计速查

### 🌈 Figma Positivus 颜色

```css
/* 主色调 */
--primary-green: #B9FF66;     /* 主绿色 */
--primary-green-dark: #8fd13f; /* 深绿色 */

/* 辅助色 */
--accent-blue: #4F9CF9;       /* 蓝色 */
--accent-yellow: #FFD700;     /* 黄色 */
--accent-purple: #9B59B6;     /* 紫色 */

/* 语义色彩 */
--success: #10B981;           /* 成功绿 */
--warning: #F59E0B;           /* 警告黄 */
--error: #EF4444;             /* 错误红 */
--info: #3B82F6;              /* 信息蓝 */
```

### 📐 常用Tailwind类名

```tsx
// 布局
className="flex items-center justify-between w-full min-h-screen"

// 卡片样式
className="bg-white rounded-lg shadow-md border border-gray-200 p-6"

// 按钮样式 (Positivus风格)
className="bg-[#B9FF66] text-black font-bold px-6 py-3 rounded-lg border-2 border-black hover:bg-[#8fd13f] transition-colors"

// 输入框样式
className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"

// 响应式网格
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
```

### 🎯 成绩等级颜色映射

```tsx
const gradeColors = {
  'A': 'text-green-600 bg-green-100',    // 优秀 - 绿色
  'B': 'text-blue-600 bg-blue-100',      // 良好 - 蓝色  
  'C': 'text-yellow-600 bg-yellow-100',  // 中等 - 黄色
  'D': 'text-orange-600 bg-orange-100',  // 待改进 - 橙色
  'F': 'text-red-600 bg-red-100'         // 不及格 - 红色
}

// 使用
<span className={`px-2 py-1 rounded-full text-sm font-medium ${gradeColors[grade]}`}>
  {grade}
</span>
```

---

## ⚡ 常用命令速查

### 🔧 开发命令

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码格式化
npm run lint:fix
npm run format

# 构建项目
npm run build
npm run build:dev

# 运行测试
npm run test
npm run test:coverage
npm run test:e2e
```

### 🗄️ 数据库命令

```bash
# 生成类型定义
npm run db:generate-types

# 重置数据库
npm run db:reset

# 运行迁移
npm run db:migrate

# 初始化数据库
npm run db:init
```

### 🚀 部署命令

```bash
# 预览构建
npm run preview

# 部署到测试环境
npm run deploy:staging

# 部署到生产环境
npm run deploy:production
```

---

## 🐛 常见问题速查

### ❌ 构建错误

#### TypeScript 错误
```bash
# 问题: 类型错误
# 解决: 运行类型检查找到具体错误
npm run type-check

# 问题: 缺少类型定义
# 解决: 重新生成数据库类型
npm run db:generate-types
```

#### 依赖问题
```bash
# 问题: 依赖冲突
# 解决: 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 问题: 版本不兼容
# 解决: 检查package.json中的版本约束
npm audit fix
```

### 🔌 API连接问题

#### Supabase连接
```typescript
// 检查环境变量
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY)

// 测试连接
const { data, error } = await supabase.from('students').select('*').limit(1)
if (error) console.error('Supabase连接错误:', error)
```

#### AI服务连接
```typescript
// 检查AI服务配置
const providers = await aiProviderManager.getAvailableProviders()
console.log('可用的AI提供商:', providers)

// 测试AI连接
const testResult = await aiProviderManager.testProvider('openai')
console.log('AI服务测试结果:', testResult)
```

### 📊 数据问题

#### 成绩数据不显示
```sql
-- 检查数据完整性
SELECT * FROM check_grade_data_integrity();

-- 检查考试是否存在
SELECT * FROM exams WHERE id = 'your-exam-id';

-- 检查成绩数据
SELECT COUNT(*) FROM grade_data WHERE exam_id = 'your-exam-id';
```

#### 字段映射问题
```typescript
// 检查映射配置
console.log('当前映射配置:', mappingConfig)

// 重置映射
const defaultMapping = await intelligentFieldMapper.getDefaultMapping()

// 手动映射
const manualMapping = {
  '学生姓名': 'name',
  '数学成绩': 'math_score',
  '语文成绩': 'chinese_score'
}
```

### 🎨 样式问题

#### 样式不生效
```bash
# 问题: Tailwind样式不生效
# 解决: 检查Tailwind配置和导入
# 确保在main.tsx中导入了index.css

# 问题: 自定义样式被覆盖
# 解决: 使用!important或调整CSS优先级
className="!bg-red-500" # 强制应用
```

#### 响应式问题
```tsx
// 使用断点前缀
className="w-full md:w-1/2 lg:w-1/3"

// 检查屏幕尺寸
const isMobile = window.innerWidth < 768
```

---

## 🔒 安全检查清单

### ✅ 基础安全检查

```markdown
□ 环境变量中没有硬编码密钥
□ API密钥通过环境变量管理
□ 用户输入已进行验证和清理
□ 数据库查询使用参数化查询
□ RLS策略已正确配置
□ 文件上传有大小和类型限制
□ 错误信息不泄露敏感信息
□ HTTPS在生产环境中启用
```

### 🛡️ RLS策略检查

```sql
-- 检查表是否启用RLS
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

-- 检查策略是否生效
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public';

-- 测试用户权限
SELECT * FROM your_table; -- 应该只返回用户有权限的数据
```

---

## 📈 性能优化速查

### ⚡ 前端性能

```typescript
// 组件懒加载
const LazyComponent = lazy(() => import('./HeavyComponent'))

// 使用Suspense
<Suspense fallback={<LoadingSpinner />}>
  <LazyComponent />
</Suspense>

// 虚拟化长列表
import { FixedSizeList as List } from 'react-window'

// useMemo优化计算
const expensiveValue = useMemo(() => 
  heavyCalculation(data), [data]
)

// useCallback优化函数
const memoizedCallback = useCallback(() => {
  doSomething(a, b)
}, [a, b])
```

### 🗄️ 数据库性能

```sql
-- 查看慢查询
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 检查索引使用
EXPLAIN ANALYZE SELECT * FROM grade_data WHERE exam_id = $1;

-- 创建缺失索引
CREATE INDEX CONCURRENTLY idx_grade_data_exam_id 
ON grade_data(exam_id);
```

---

## 🧪 测试速查

### 🔬 单元测试模板

```typescript
// 组件测试
import { render, screen, fireEvent } from '@testing-library/react'
import { YourComponent } from './YourComponent'

test('should render correctly', () => {
  render(<YourComponent />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})

// 服务测试
import { yourService } from './yourService'

test('should return correct data', async () => {
  const result = await yourService.getData()
  expect(result).toEqual(expectedData)
})
```

### 🎭 Mock数据模板

```typescript
// API Mock
export const mockAPI = {
  getGrades: vi.fn().mockResolvedValue(mockGradeData),
  createGrade: vi.fn().mockResolvedValue({ success: true })
}

// 组件Mock
vi.mock('./HeavyComponent', () => ({
  default: () => <div>Mocked Component</div>
}))
```

---

## 🔧 开发工具配置

### VS Code 推荐设置

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### 推荐扩展

```json
// .vscode/extensions.json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss"
  ]
}
```

---

## 📞 紧急联系和支持

### 🚨 紧急问题处理

```markdown
🔥 生产环境问题:
1. 立即通知团队
2. 检查错误监控系统
3. 查看应用日志
4. 必要时回滚部署

⚠️ 数据问题:
1. 停止相关操作
2. 备份当前数据状态
3. 分析问题根因
4. 制定修复方案

🐛 功能异常:
1. 复现问题步骤
2. 检查相关日志
3. 查看最近代码变更
4. 提交Bug报告
```

### 📚 获取帮助

```markdown
📖 文档资源:
- API_REFERENCE.md - API接口文档
- DATABASE_SCHEMA.md - 数据库架构
- COMPONENT_GUIDE.md - 组件使用指南
- AGENT_ROLES.md - 多Agent协作
- DEVELOPMENT_STANDARDS.md - 开发规范

🔗 外部资源:
- React文档: https://react.dev
- TypeScript文档: https://typescriptlang.org
- Tailwind CSS: https://tailwindcss.com
- Supabase文档: https://supabase.com/docs
- Vite文档: https://vitejs.dev
```

---

## 🎯 快速启动检查清单

### 🚀 新环境设置

```markdown
✅ 环境准备:
□ Node.js >= 18.0.0 已安装
□ npm >= 8.0.0 已安装
□ Git 已配置
□ VS Code 及推荐扩展已安装

✅ 项目设置:
□ 代码已克隆到本地
□ 依赖已安装 (npm install)
□ 环境变量已配置 (.env.local)
□ 数据库连接已测试
□ 开发服务器可正常启动

✅ 开发准备:
□ 已阅读项目文档
□ 了解代码规范
□ 熟悉组件架构
□ 清楚API接口
□ 知道测试流程
```

### 🎨 Agent A (前端) 快速启动

```markdown
✅ 必读文档:
□ COMPONENT_GUIDE.md
□ API_REFERENCE.md  
□ DEVELOPMENT_STANDARDS.md

✅ 开发环境:
□ React DevTools 已安装
□ Tailwind CSS IntelliSense 已启用
□ ESLint 和 Prettier 已配置

✅ 开发流程:
□ 创建 feature/ui-* 分支
□ 开发UI组件
□ 集成API接口
□ 编写组件测试
□ 提交代码审查
```

### 🔧 Agent B (后端) 快速启动

```markdown
✅ 必读文档:
□ DATABASE_SCHEMA.md
□ API_REFERENCE.md
□ DEVELOPMENT_STANDARDS.md

✅ 开发环境:
□ Supabase CLI 已安装
□ PostgreSQL 客户端已配置
□ API测试工具已准备

✅ 开发流程:
□ 创建 feature/api-* 分支
□ 设计数据库schema
□ 实现业务逻辑
□ 编写API测试
□ 与前端联调测试
```

---

**⚡ 提示**: 
- 此手册是日常开发的快速参考
- 遇到问题优先查阅相关章节
- 常用命令建议加入个人快捷方式
- 定期更新和完善参考内容

**🔄 文档版本**: v1.0 | **最后更新**: 2025-01-04

---

## 📋 常用代码片段

### React组件模板

```tsx
import React from 'react'
import { cn } from '@/lib/utils'

interface ${ComponentName}Props {
  className?: string
}

export const ${ComponentName}: React.FC<${ComponentName}Props> = ({
  className
}) => {
  return (
    <div className={cn("base-styles", className)}>
      {/* 组件内容 */}
    </div>
  )
}
```

### API调用模板

```typescript
export const ${serviceName} = {
  async get${ResourceName}(id: string): Promise<${ResourceType}> {
    const { data, error } = await supabase
      .from('${table_name}')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}
```

### 测试模板

```typescript
describe('${ComponentName}', () => {
  test('should render correctly', () => {
    render(<${ComponentName} />)
    expect(screen.getByText('${expected_text}')).toBeInTheDocument()
  })
})
```

**Happy Coding! 🎉**