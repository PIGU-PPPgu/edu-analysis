---
description: 
globs: 
alwaysApply: true
---
# UI组件和样式规范

> 🎯 **使用场景**: 开发UI界面、样式调整、组件选择、表单设计时使用此规则

本应用使用Shadcn UI（基于Radix UI）和Tailwind CSS进行界面设计。下面是UI组件和样式相关的指导。

## 🎨 设计系统概览

基于教育管理系统的特点，我们的设计系统强调：
- **简洁清晰**: 界面简洁，信息层次分明
- **数据友好**: 适合展示大量数据和图表
- **响应式**: 支持桌面和移动设备
- **现代化**: 符合现代Web应用设计趋势

## 🧩 组件库架构

- **UI组件基础**：[src/components/ui/](mdc:src/components/ui) 包含Shadcn UI组件
- **业务组件**：[src/components/](mdc:src/components) 包含基于基础UI组件构建的业务组件

## 主要UI组件

项目使用Shadcn UI提供的以下主要组件：

- **Button**：按钮组件，支持不同的变体和尺寸
- **Input**：输入框组件
- **Dialog**：对话框组件
- **Table**：表格组件
- **Tabs**：标签页组件
- **Form**：表单组件，与React Hook Form集成
- **Card**：卡片组件
- **Toast**：提示通知组件

## 样式约定

项目使用Tailwind CSS进行样式管理，主要约定如下：

### 主题配置

主题配置在[tailwind.config.ts](mdc:tailwind.config.ts)文件中定义。包括颜色、间距、边框半径等设计标记。

### 常用布局模式

```tsx
// 页面容器布局
<div className="container mx-auto py-6 space-y-6">
  {/* 内容 */}
</div>

// 卡片布局
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 内容 */}
  </CardContent>
  <CardFooter>
    {/* 页脚 */}
  </CardFooter>
</Card>

// 表单布局
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>姓名</FormLabel>
          <FormControl>
            <Input placeholder="请输入姓名" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">提交</Button>
  </form>
</Form>
```

### 响应式设计

项目使用Tailwind CSS的响应式前缀进行响应式设计：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 内容 */}
</div>
```

## 数据展示组件

### 表格组件

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>学号</TableHead>
      <TableHead>姓名</TableHead>
      <TableHead>班级</TableHead>
      <TableHead>操作</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {students.map((student) => (
      <TableRow key={student.student_id}>
        <TableCell>{student.student_id}</TableCell>
        <TableCell>{student.name}</TableCell>
        <TableCell>{student.class_name}</TableCell>
        <TableCell>
          <Button variant="outline" size="sm">查看</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 图表组件

项目使用Recharts库创建图表：

```tsx
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// 成绩分布图表
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={scoreData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="value" fill="#8884d8" />
  </BarChart>
</ResponsiveContainer>
```

## 表单处理

项目使用React Hook Form和Zod进行表单处理：

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// 定义表单模式
const formSchema = z.object({
  name: z.string().min(2, "姓名至少需要2个字符"),
  class_name: z.string().min(1, "请选择班级"),
  // 其他字段...
});

// 使用表单
function StudentForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      class_name: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // 处理表单提交...
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* 表单字段 */}
      </form>
    </Form>
  );
}
```

## 📊 教育应用专用组件模式

### 成绩展示组件
```tsx
// 成绩卡片组件
<Card className="border border-blue-200 hover:border-blue-300 transition-colors">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg font-semibold text-gray-900">
        数学成绩
      </CardTitle>
      <Badge variant={score >= 90 ? "default" : score >= 80 ? "secondary" : "destructive"}>
        {score}分
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">班级平均分</span>
        <span className="font-medium">{classAverage}分</span>
      </div>
      <Progress value={(score / 100) * 100} className="h-2" />
    </div>
  </CardContent>
</Card>
```

### 学生列表组件
```tsx
// 学生列表表格
<Table>
  <TableHeader>
    <TableRow className="border-b border-gray-200">
      <TableHead className="font-semibold text-gray-900">学号</TableHead>
      <TableHead className="font-semibold text-gray-900">姓名</TableHead>
      <TableHead className="font-semibold text-gray-900">班级</TableHead>
      <TableHead className="font-semibold text-gray-900">平均分</TableHead>
      <TableHead className="font-semibold text-gray-900">操作</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {students.map((student) => (
      <TableRow key={student.id} className="hover:bg-gray-50 transition-colors">
        <TableCell className="font-mono text-sm">{student.student_id}</TableCell>
        <TableCell className="font-medium">{student.name}</TableCell>
        <TableCell>
          <Badge variant="outline">{student.class_name}</Badge>
        </TableCell>
        <TableCell>
          <span className={cn(
            "font-semibold",
            student.average >= 90 ? "text-green-600" : 
            student.average >= 80 ? "text-blue-600" : 
            student.average >= 60 ? "text-yellow-600" : "text-red-600"
          )}>
            {student.average.toFixed(1)}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => viewStudent(student.id)}>
              查看
            </Button>
            <Button variant="outline" size="sm" onClick={() => editStudent(student.id)}>
              编辑
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 统计卡片组件
```tsx
// 统计信息卡片
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <Card className="border-0 shadow-md bg-gradient-to-r from-blue-50 to-blue-100">
    <CardContent className="p-6">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-600">总学生数</p>
          <p className="text-3xl font-bold text-blue-900">{totalStudents}</p>
        </div>
        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <Users className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
  
  <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-green-100">
    <CardContent className="p-6">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-green-600">平均分</p>
          <p className="text-3xl font-bold text-green-900">{averageScore.toFixed(1)}</p>
        </div>
        <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
</div>
```

## 📱 响应式设计模式

### 移动优先的布局
```tsx
// 主容器布局 - 移动优先
<div className="min-h-screen bg-gray-50">
  <div className="container mx-auto px-4 py-6 space-y-6">
    {/* 头部信息 */}
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
        成绩分析
      </h1>
      <p className="text-sm md:text-base text-gray-600 mt-2">
        查看和分析学生成绩数据
      </p>
    </div>
    
    {/* 内容区域 */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 主要内容 */}
      <div className="lg:col-span-2 space-y-6">
        {/* 图表区域 */}
        <Card>
          <CardHeader>
            <CardTitle>成绩分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80 lg:h-96">
              {/* 图表组件 */}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 侧边栏 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              添加学生
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              导入成绩
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</div>
```

### 数据密集型界面设计
```tsx
// 数据分析页面布局
<div className="space-y-6">
  {/* 筛选器栏 */}
  <Card className="border-dashed border-2 border-gray-300">
    <CardContent className="p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择班级" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="选择科目" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button>
          <Filter className="w-4 h-4 mr-2" />
          应用筛选
        </Button>
        
        <Button variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          重置
        </Button>
      </div>
    </CardContent>
  </Card>
  
  {/* 数据展示区域 */}
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    {/* 图表卡片 */}
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>成绩趋势</CardTitle>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          导出
        </Button>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {/* 图表组件 */}
        </div>
      </CardContent>
    </Card>
  </div>
</div>
```

## 🎨 色彩系统

### 教育应用色彩规范
```css
/* 主色调 - 蓝色系 (专业、信任) */
primary: #3B82F6      /* 主要按钮、链接 */
primary-foreground: #FFFFFF

/* 辅助色 - 绿色系 (成功、正面) */
success: #10B981      /* 成功状态、优秀成绩 */
warning: #F59E0B      /* 警告状态、中等成绩 */
destructive: #EF4444  /* 错误状态、低分成绩 */

/* 中性色 */
background: #FFFFFF   /* 页面背景 */
card: #FFFFFF        /* 卡片背景 */
border: #E5E7EB      /* 边框颜色 */
muted: #F3F4F6       /* 次要背景 */
```

### 成绩等级色彩映射
```tsx
const getGradeColor = (score: number) => {
  if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
  if (score >= 80) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  if (score >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
  return "text-red-600 bg-red-50 border-red-200";
};
```

## 🔧 组件使用最佳实践

### 表单组件组合
```tsx
// 学生信息表单
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField
        control={form.control}
        name="student_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              学号 <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <Input 
                placeholder="请输入学号" 
                className="border-gray-300 focus:border-blue-500"
                {...field} 
              />
            </FormControl>
            <FormDescription className="text-xs text-gray-500">
              学号必须唯一，不能重复
            </FormDescription>
            <FormMessage className="text-xs text-red-600" />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              姓名 <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <Input 
                placeholder="请输入学生姓名" 
                className="border-gray-300 focus:border-blue-500"
                {...field} 
              />
            </FormControl>
            <FormMessage className="text-xs text-red-600" />
          </FormItem>
        )}
      />
    </div>
    
    <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
      <Button type="button" variant="outline" onClick={onCancel}>
        取消
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            保存中...
          </>
        ) : (
          '保存'
        )}
      </Button>
    </div>
  </form>
</Form>
```

## 📚 开发者须知

1. **优先使用Shadcn UI组件**：保持界面一致性，除非有特殊需求
2. **响应式优先**：始终考虑移动端体验，使用响应式设计模式
3. **语义化颜色**：使用定义好的色彩系统，特别是成绩相关的颜色映射
4. **加载状态**：所有异步操作都要有加载状态提示
5. **错误处理**：表单验证和错误信息要清晰明确
6. **可访问性**：确保组件支持键盘操作和屏幕阅读器

## 🔗 相关规则
- [main-guide.md](mdc:main-guide.md) - 项目总览
- [project-architecture.md](mdc:project-architecture.md) - 技术架构
- [development-workflow.md](mdc:development-workflow.md) - 开发流程
