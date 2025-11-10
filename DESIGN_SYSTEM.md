# 设计系统 (Design System)

基于 Positivus 品牌设计的成绩分析系统设计规范文档。

---

## 🎨 颜色系统 (Color Palette)

### 品牌主色 (Primary Brand Colors)

```css
--brand-green: #B9FF66;     /* Positivus 主色 - 品牌绿 */
--brand-black: #191A23;      /* 主黑色 - 文本、边框 */
--brand-white: #FFFFFF;      /* 纯白 - 背景 */
--brand-gray: #F3F3F3;       /* 浅灰 - 辅助背景 */
```

### 语义色彩 (Semantic Colors)

**状态色彩** - 仅用于数据表达，不用于装饰：
```css
--success-green: #22C55E;    /* 成功、上升趋势 */
--error-red: #EF4444;        /* 错误、下降趋势、预警 */
--warning-yellow: #F59E0B;   /* 警告、中等风险 */
--info-blue: #3B82F6;        /* 信息提示 */
```

**灰度系统** - 文本和背景：
```css
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
```

### 使用原则

1. **装饰性元素**: 仅使用 #B9FF66、灰度、黑白
2. **数据可视化**: 可使用语义色（红/绿/黄/蓝）表达数据含义
3. **避免彩虹色**: 不使用 purple、orange、pink 等装饰色

**示例**：
```tsx
// ✅ 正确 - 品牌色装饰
<Button className="bg-[#B9FF66] hover:bg-[#B9FF66]/80">

// ✅ 正确 - 语义色表达数据
<TrendingUp className="text-green-500" /> // 表示上升

// ❌ 错误 - 彩色装饰
<Card className="bg-blue-50"> // 不要用彩色背景装饰
```

---

## 📐 间距系统 (Spacing)

### Tailwind 间距标准

遵循 4px 基础单位（Tailwind 默认）：

```
0    = 0px
1    = 4px
2    = 8px
3    = 12px
4    = 16px
5    = 20px
6    = 24px
8    = 32px
10   = 40px
12   = 48px
16   = 64px
20   = 80px
```

### 组件内部间距 (Padding)

- **Card**: `p-6` (24px)
- **CardHeader**: `pb-3` (12px bottom)
- **CardContent**: `pt-0` 或 `pt-6`
- **Button**: `px-4 py-2` (16px/8px)
- **Dialog**: `p-6` (24px)

### 组件外部间距 (Margin/Gap)

- **卡片间距**: `gap-4` 或 `gap-6` (16px/24px)
- **标题下方**: `mb-6` (24px)
- **小元素间**: `gap-2` (8px)

---

## 🔤 排版系统 (Typography)

### 字体家族

```css
font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
```

### 字号层级

```tsx
// 页面标题
<h1 className="text-3xl font-bold">     // 30px

// 卡片标题
<h2 className="text-xl font-semibold">  // 20px

// 子标题
<h3 className="text-lg font-medium">    // 18px

// 正文
<p className="text-base">               // 16px

// 辅助文本
<span className="text-sm">              // 14px

// 说明文字
<small className="text-xs">             // 12px
```

### 字重 (Font Weight)

```tsx
font-bold       // 700 - 重要标题
font-semibold   // 600 - 次级标题
font-medium     // 500 - 强调文本
font-normal     // 400 - 正文
```

---

## 📱 响应式断点 (Responsive Breakpoints)

### Tailwind 默认断点

```css
sm: 640px   // 小平板
md: 768px   // 平板
lg: 1024px  // 小桌面
xl: 1280px  // 桌面
2xl: 1536px // 大桌面
```

### 响应式设计原则

1. **移动优先**: 默认样式为移动端，使用 `sm:` `md:` 等前缀渐进增强
2. **网格自适应**: 使用 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
3. **固定宽度添加 max-w**: `w-full max-w-[1000px]`
4. **TabsList 响应式**: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4`

**示例**：
```tsx
// ✅ 正确 - 响应式网格
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// ✅ 正确 - 限制最大宽度
<TabsList className="w-full max-w-[400px]">

// ✅ 正确 - Dialog 响应式
<DialogContent className="sm:max-w-[600px]">

// ❌ 错误 - 固定宽度无响应式
<TabsList className="w-[1000px]">
```

---

## 🎭 组件使用指南

### 空状态 (Empty State)

**设计模式**：
- 渐变背景 `from-gray-50 to-gray-100`
- 虚线边框 `border-2 border-dashed border-gray-300`
- 大图标（h-12 w-12）+ 白色圆形背景
- 标题 + 描述文本

**模板**：
```tsx
{!data.length && (
  <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
    <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
      <IconName className="h-12 w-12 text-gray-400" />
    </div>
    <h3 className="text-xl font-bold mb-2 text-gray-800">
      暂无数据
    </h3>
    <p className="text-gray-600 text-center max-w-md">
      描述信息
    </p>
  </div>
)}
```

### 卡片 (Card)

**标准卡片**：
```tsx
<Card className="hover:shadow-md transition-shadow">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-medium">
      标题
    </CardTitle>
  </CardHeader>
  <CardContent className="pt-0">
    内容
  </CardContent>
</Card>
```

**带品牌色强调**：
```tsx
<Card className="border-l-4 border-l-[#B9FF66] bg-[#B9FF66]/5">
```

### 按钮 (Button)

**Positivus 风格按钮**（粗体 + 阴影）：
```tsx
<Button className="border-2 border-black bg-white hover:bg-gray-50 text-black font-bold shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] transition-all">
  点击我
</Button>
```

**品牌绿色按钮**：
```tsx
<Button className="bg-[#B9FF66] hover:bg-[#B9FF66]/80 text-black font-bold">
  主要操作
</Button>
```

### Badge (标签)

**中性色** - 推荐：
```tsx
<Badge variant="secondary" className="bg-gray-50">
  班级名称
</Badge>

<Badge variant="outline" className="border-[#B9FF66] text-[#B9FF66]">
  特殊标记
</Badge>
```

**语义色** - 仅数据状态：
```tsx
// ✅ 表达风险等级
<Badge className="bg-red-100 text-red-800">高风险</Badge>

// ❌ 装饰性使用
<Badge className="bg-purple-100">普通标签</Badge>
```

### TabsList (标签列表)

**响应式 Tabs**：
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 w-full max-w-[800px] bg-gray-100 border border-gray-300 p-1 rounded-lg">
    <TabsTrigger
      value="tab1"
      className="data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black rounded-md"
    >
      标签1
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### 表格 (Table)

**响应式表格** - 必须添加横向滚动：
```tsx
<div className="rounded-md border overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>列1</TableHead>
        <TableHead>列2</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map(item => (
        <TableRow key={item.id}>
          <TableCell>{item.name}</TableCell>
          <TableCell>{item.value}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Dialog (对话框)

**响应式 Dialog**：
```tsx
<Dialog>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle>对话框标题</DialogTitle>
      <DialogDescription>
        描述信息
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      内容
    </div>
    <DialogFooter>
      <Button>确认</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 📊 数据可视化原则

### 图表配色

**单色系** - 使用灰度 + 品牌绿：
```tsx
const colors = {
  primary: '#B9FF66',
  secondary: '#9CA3AF',
  tertiary: '#6B7280',
}
```

**多色系** - 仅在必要时使用语义色：
```tsx
const trendColors = {
  up: '#22C55E',    // 绿色 - 上升
  down: '#EF4444',  // 红色 - 下降
  stable: '#9CA3AF' // 灰色 - 平稳
}
```

### 趋势指示器

```tsx
// ✅ 正确 - 语义色表达数据含义
{trend === 'up' && <TrendingUp className="text-green-500" />}
{trend === 'down' && <TrendingDown className="text-red-500" />}
{trend === 'stable' && <Minus className="text-gray-500" />}
```

---

## ⚡ 性能优化规范

### 代码分割 (Code Splitting)

**大组件 Lazy Loading** (>1000 lines):
```tsx
import { lazy, Suspense } from 'react';
import { PageLoadingFallback } from '@/components/ui/loading-fallback';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function Page() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 图片优化

- 使用 WebP 格式
- 提供不同尺寸版本（响应式图片）
- 添加 loading="lazy" 属性

---

## ✅ 质量检查清单

### 组件提交前检查

- [ ] 使用品牌色（#B9FF66、灰度、黑白）
- [ ] 空状态使用标准模板
- [ ] 响应式设计（mobile-first）
- [ ] 表格添加 overflow-x-auto
- [ ] Dialog 使用 sm:max-w-[Xpx]
- [ ] TabsList 使用响应式 grid-cols
- [ ] 无装饰性彩色（purple/orange/pink）
- [ ] 大组件考虑 lazy loading
- [ ] 代码通过 Prettier + ESLint 检查

### 设计一致性

- [ ] 间距符合 Tailwind 标准（4px 倍数）
- [ ] 字号符合层级规范
- [ ] 按钮使用 Positivus 风格（粗体+阴影）
- [ ] Badge 使用中性色（除语义色外）
- [ ] 卡片 hover 效果统一

---

## 📚 参考示例

### 优化过的组件 (作为参考)

- `src/pages/Index.tsx` - 主页空状态
- `src/pages/TeacherDashboard.tsx` - 响应式布局
- `src/components/teacher/QuickActions.tsx` - 品牌色统一
- `src/components/student/StudentQuickView.tsx` - 空状态模板
- `src/components/warning/WarningDashboard.tsx` - 响应式 Tabs
- `src/pages/StudentManagement.tsx` - 表格横向滚动

### Phase 4 优化 Checkpoints

- **CP 22-24**: 共享组件品牌色统一
- **CP 25**: 大组件 lazy loading
- **CP 26-27**: 响应式修复（Tabs、表格）
- **CP 28**: 代码清理

---

**版本**: v1.0
**最后更新**: 2025-01-10
**维护者**: Claude Code Assistant
**基于**: Positivus Design System + Tailwind CSS v3
