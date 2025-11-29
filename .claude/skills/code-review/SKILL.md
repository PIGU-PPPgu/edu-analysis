---
name: Code Review
description: 自动代码审查，检查代码质量、性能和安全问题
tags: [code-quality, review, best-practices]
---

# Code Review Skill

自动执行代码审查，确保代码质量。

## 何时使用

在以下情况自动激活代码审查：
- 完成功能开发后
- 创建 Pull Request 前
- 重构代码后
- 发现 Bug 修复后
- 用户要求代码审查时

## 审查检查清单

### 1. 代码结构和组织

#### ✅ 良好实践
- 单一职责原则：每个函数/组件只做一件事
- 文件大小合理：< 500 行（建议 < 300 行）
- 逻辑分层清晰：UI / 业务逻辑 / 数据访问
- 代码复用：提取重复逻辑为函数/组件

#### ❌ 需要改进
- 巨型组件（> 500 行）
- 深层嵌套（> 3 层）
- 重复代码
- 混乱的导入顺序

### 2. TypeScript 类型安全

#### ✅ 良好实践
```typescript
// 明确的类型定义
interface StudentProps {
  student: Student;
  onEdit: (id: string) => void;
}

// 使用类型守卫
function isStudent(obj: unknown): obj is Student {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

// 泛型使用
function fetchData<T>(url: string): Promise<T> {
  // ...
}
```

#### ❌ 需要改进
```typescript
// 避免 any
const data: any = fetchData();

// 避免类型断言滥用
const student = data as Student;

// 避免隐式 any
function process(value) {  // 应该标注类型
  // ...
}
```

### 3. React 最佳实践

#### ✅ 良好实践
```typescript
// 使用 React.FC 和 Props interface
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  // ...
};

// 合理使用 hooks
const [state, setState] = useState(initialValue);
const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b]);

// 条件渲染清晰
{isLoading ? <Loader /> : <Content />}

// 事件处理器命名统一
const handleClick = () => {};
const handleSubmit = () => {};
```

#### ❌ 需要改进
```typescript
// 避免在渲染中定义函数
<Button onClick={() => {
  // 大量逻辑...应该提取到外部
}} />

// 避免过度使用 useEffect
useEffect(() => {
  // 应该使用更合适的 hook 或放在事件处理器中
}, [dep1, dep2, dep3, dep4]);

// 避免条件 hooks
if (condition) {
  useState(value);  // 违反 hooks 规则
}
```

### 4. 性能优化

#### ✅ 良好实践
```typescript
// 大列表使用 memo
const StudentItem = React.memo(({ student }) => {
  // ...
});

// 昂贵计算使用 useMemo
const sortedStudents = useMemo(() =>
  students.sort((a, b) => a.score - b.score),
  [students]
);

// 回调函数使用 useCallback
const handleDelete = useCallback((id: string) => {
  // ...
}, []);
```

#### ❌ 需要改进
```typescript
// 避免每次渲染都创建新对象
<Component style={{ margin: 10 }} />  // 应该提取到变量

// 避免在渲染中执行昂贵计算
{students.sort(...).filter(...).map(...)}  // 应该使用 useMemo

// 避免不必要的重渲染
// 缺少 React.memo 或 useMemo
```

### 5. 安全性

#### ✅ 良好实践
```typescript
// 输入验证
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// XSS 防护（React 默认转义）
<div>{userInput}</div>  // 安全

// SQL 注入防护（使用参数化查询）
supabase.from('students').select('*').eq('id', userId);  // 安全

// 敏感信息不硬编码
const apiKey = process.env.VITE_API_KEY;
```

#### ❌ 需要改进
```typescript
// 避免 dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // 危险！

// 避免硬编码敏感信息
const apiKey = 'sk-1234567890';  // 不安全！

// 避免直接拼接 SQL（虽然 Supabase 已处理）
const query = `SELECT * FROM users WHERE id = ${userId}`;  // 危险模式
```

### 6. 错误处理

#### ✅ 良好实践
```typescript
// 完整的错误处理
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  console.error('Failed to fetch data:', error);
  toast.error('加载失败，请重试');
  setError(error instanceof Error ? error.message : '未知错误');
}

// 边界情况处理
if (!data || data.length === 0) {
  return <EmptyState />;
}

// 加载状态
{isLoading && <Loader />}
{error && <ErrorMessage error={error} />}
```

#### ❌ 需要改进
```typescript
// 避免忽略错误
try {
  await riskyOperation();
} catch (e) {
  // 空的 catch - 错误被静默吞没
}

// 避免不处理 Promise 拒绝
fetchData();  // 应该 await 或 .catch()

// 避免缺少边界检查
data.map(item => item.name);  // data 可能为 undefined
```

### 7. 可访问性 (a11y)

#### ✅ 良好实践
```typescript
// 语义化 HTML
<button onClick={handleClick}>提交</button>
<nav><a href="/home">首页</a></nav>

// ARIA 属性
<DialogTitle>标题</DialogTitle>
<DialogDescription>描述</DialogDescription>

// 键盘导航
<Button tabIndex={0} onKeyDown={handleKeyDown}>
```

#### ❌ 需要改进
```typescript
// 避免用 div 代替 button
<div onClick={handleClick}>提交</div>  // 应该用 <button>

// 避免缺少替代文本
<img src="photo.jpg" />  // 应该有 alt 属性

// 避免缺少 ARIA 标签
<DialogContent>  // 缺少 DialogTitle
```

### 8. 样式和 UI

#### ✅ 良好实践
```typescript
// 使用 Tailwind + cn 工具
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className
)}>
```

#### ❌ 需要改进
```typescript
// 避免内联样式（特殊情况除外）
<div style={{ color: 'red', fontSize: 14 }}>

// 避免魔法数字
<div className="w-[237px]">  // 应该使用语义化的值

// 避免不统一的颜色
<div className="bg-green-500">  // 应该使用 #B9FF66
```

### 9. 数据库查询

#### ✅ 良好实践
```typescript
// 使用 Supabase MCP 工具
await mcp__supabase__execute_sql({
  project_id: 'giluhqotfjpmofowvogn',
  query: 'SELECT * FROM students WHERE class_id = $1',
});

// 启用 RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

// 合理的索引
CREATE INDEX idx_students_class ON students(class_id);
```

#### ❌ 需要改进
```typescript
// 避免 N+1 查询
for (const student of students) {
  const grades = await getGrades(student.id);  // 应该批量查询
}

// 避免查询所有字段
.select('*')  // 只选择需要的字段

// 避免缺少 RLS 策略
// 没有 CREATE POLICY 的表
```

### 10. 测试覆盖

#### ✅ 良好实践
```typescript
// 单元测试
describe('StudentCard', () => {
  it('renders student name', () => {
    // ...
  });
});

// 边界测试
it('handles empty data', () => {
  render(<Component data={[]} />);
  // ...
});
```

## 审查流程

### 1. 自动检查
```bash
# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 格式检查
npm run format:check
```

### 2. 人工审查要点

#### 功能正确性
- [ ] 功能按预期工作
- [ ] 边界情况处理正确
- [ ] 错误处理完善

#### 代码质量
- [ ] 代码清晰易读
- [ ] 命名语义化
- [ ] 注释适当
- [ ] 无冗余代码

#### 性能
- [ ] 无不必要的重渲染
- [ ] 大数据集处理优化
- [ ] API 调用次数合理

#### 安全性
- [ ] 输入验证
- [ ] 权限检查
- [ ] 敏感信息保护

#### 可维护性
- [ ] 代码结构清晰
- [ ] 易于测试
- [ ] 易于扩展

## 常见问题修复模式

### 问题：组件过大
```typescript
// 之前：1000+ 行的巨型组件
const ExamManagement = () => {
  // 所有逻辑...
};

// 之后：拆分为多个小组件
const ExamManagement = () => {
  return (
    <>
      <ExamList />
      <ExamFilters />
      <ExamActions />
    </>
  );
};
```

### 问题：重复代码
```typescript
// 之前：重复的按钮样式
<Button className="border-2 border-black shadow-[2px_2px_0px_0px_#000] ...">
<Button className="border-2 border-black shadow-[2px_2px_0px_0px_#000] ...">

// 之后：提取为常量
const BUTTON_STYLE = "border-2 border-black shadow-[2px_2px_0px_0px_#000] ...";
<Button className={BUTTON_STYLE}>
```

### 问题：缺少类型
```typescript
// 之前
const data = await fetch('/api/students');

// 之后
const data: Student[] = await fetch('/api/students');
```

## 输出格式

审查完成后，输出以下格式的报告：

```markdown
## 代码审查报告

### ✅ 优点
- 使用了 TypeScript 类型定义
- 组件结构清晰
- 错误处理完善

### ⚠️ 需要改进
1. **性能**: 第45行应该使用 useMemo 优化计算
2. **类型安全**: 第78行使用了 any，应该定义具体类型
3. **可访问性**: 第120行的 Dialog 缺少 DialogTitle

### 📝 建议
- 考虑拆分 ExamCard 组件（当前 300+ 行）
- 提取重复的样式类到常量
- 添加单元测试覆盖边界情况

### 📊 评分
- 代码质量: 8/10
- 性能: 7/10
- 安全性: 9/10
- 可维护性: 8/10
```

## 注意事项

- 代码审查应该是建设性的，不是批评
- 关注代码质量，而不是个人风格偏好
- 提供具体的改进建议，而不只是指出问题
- 认可好的代码实践
