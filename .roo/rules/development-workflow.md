---
description: 
globs: 
alwaysApply: true
---
# 开发工作流和最佳实践

> 🎯 **使用场景**: 开发新功能、代码规范检查、项目部署、团队协作开发时使用此规则

## 🚀 新功能开发工作流

### 1. 需求分析阶段
```
📋 需求确认
├── 确定功能属于哪个模块 (参考: feature-modules.md)
├── 分析技术实现方案 (参考: project-architecture.md)  
├── 评估数据库变更需求 (参考: database-operations.md)
└── 确定UI组件需求 (参考: ui-components.md)
```

### 2. 技术设计阶段
```
🏗️ 技术方案设计
├── 组件设计: 确定需要哪些新组件，复用哪些现有组件
├── 数据流设计: 定义数据如何在组件间流动
├── API设计: 确定需要的Supabase查询和Edge Functions
├── 状态管理: 决定使用React Query还是Context
└── 路由设计: 确定页面路由和导航结构
```

### 3. 开发实施阶段

#### 3.1 环境准备
```bash
# 确保依赖最新
npm install

# 启动开发服务器
npm run dev

# 同时启动Supabase本地环境(如需要)
npx supabase start
```

#### 3.2 代码开发顺序
```
1️⃣ 数据层开发
├── 数据库表结构设计 (migrations/)
├── TypeScript类型定义 (types/)
└── API服务函数 (services/)

2️⃣ 组件层开发  
├── 基础UI组件 (components/ui/)
├── 业务组件 (components/[module]/)
└── 页面组件 (pages/)

3️⃣ 状态管理
├── React Query queries
├── Context providers
└── 自定义hooks

4️⃣ 路由和导航
├── 路由配置更新
├── 导航菜单更新
└── 权限控制集成
```

## 📝 代码规范和约定

### 文件命名规范
```
📁 文件夹: kebab-case (小写+短划线)
   例: student-analysis, grade-import

📄 组件文件: PascalCase.tsx
   例: StudentList.tsx, GradeAnalytics.tsx

📄 工具文件: camelCase.ts
   例: formatGrade.ts, validateStudent.ts

📄 常量文件: UPPER_SNAKE_CASE.ts  
   例: API_ENDPOINTS.ts, GRADE_CONSTANTS.ts
```

### 组件开发规范

#### React组件结构
```tsx
// 1. 导入顺序: React → 第三方库 → 本地组件 → 类型
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StudentType } from '@/types/student';

// 2. 类型定义
interface StudentListProps {
  classId: string;
  onStudentSelect: (student: StudentType) => void;
}

// 3. 组件实现
export function StudentList({ classId, onStudentSelect }: StudentListProps) {
  // Hooks顺序: state → effect → query → callback
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const { data: students, isLoading } = useQuery({
    queryKey: ['students', classId],
    queryFn: () => fetchStudentsByClass(classId),
  });

  const handleStudentClick = useCallback((student: StudentType) => {
    setSelectedId(student.id);
    onStudentSelect(student);
  }, [onStudentSelect]);

  // 4. 渲染逻辑
  if (isLoading) return <div>加载中...</div>;

  return (
    <div className="space-y-4">
      {students?.map((student) => (
        <StudentCard 
          key={student.id}
          student={student}
          isSelected={selectedId === student.id}
          onClick={() => handleStudentClick(student)}
        />
      ))}
    </div>
  );
}
```

#### 自定义Hook规范
```tsx
// hooks/useStudentGrades.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useStudentGrades(studentId: string) {
  return useQuery({
    queryKey: ['student-grades', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId, // 只有当studentId存在时才执行查询
  });
}
```

### 样式规范

#### Tailwind CSS使用约定
```tsx
// ✅ 推荐: 使用语义化的class组合
<div className="container mx-auto py-6 space-y-6">
  <Card className="p-6">
    <CardHeader>
      <CardTitle className="text-2xl font-bold text-gray-900">
        学生成绩分析
      </CardTitle>
    </CardHeader>
  </Card>
</div>

// ❌ 避免: 过长的class字符串
<div className="w-full max-w-4xl mx-auto px-4 py-8 bg-white rounded-lg shadow-lg border border-gray-200 space-y-6">
```

#### 响应式设计约定
```tsx
// 移动优先的响应式设计
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="p-4 md:p-6">
    <h3 className="text-lg md:text-xl font-semibold">标题</h3>
  </div>
</div>
```

### 数据库操作规范

#### Supabase查询模式
```tsx
// ✅ 推荐: 使用React Query包装Supabase查询
const { data, error, isLoading } = useQuery({
  queryKey: ['students', { classId, grade }],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        name,
        student_id,
        class_info (
          id,
          class_name,
          grade
        )
      `)
      .eq('class_id', classId)
      .order('name');
      
    if (error) throw error;
    return data;
  },
});

// ✅ 推荐: 使用useMutation处理数据修改
const addStudentMutation = useMutation({
  mutationFn: async (newStudent: CreateStudentType) => {
    const { data, error } = await supabase
      .from('students')
      .insert(newStudent)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['students'] });
    toast.success('学生添加成功');
  },
  onError: (error) => {
    toast.error(`添加失败: ${error.message}`);
  },
});
```

## 🧪 测试和调试

### 开发调试流程
```
🐛 问题排查步骤
1. 检查浏览器控制台错误
2. 确认网络请求状态
3. 验证Supabase数据状态  
4. 检查组件状态和props
5. 查看React DevTools
```

### 常用调试工具
```tsx
// 开发环境下的调试输出
if (process.env.NODE_ENV === 'development') {
  console.log('Student data:', students);
  console.log('Query state:', { isLoading, error });
}

// React Query DevTools (已在App.tsx中配置)
// 在浏览器中可以看到所有查询状态
```

## 🚢 部署和发布流程

### 构建前检查
```bash
# 1. 代码格式化
npm run format

# 2. 类型检查  
npm run type-check

# 3. 构建测试
npm run build
```

### Supabase部署
```bash
# 1. 应用数据库迁移
npx supabase db push

# 2. 部署Edge Functions
npx supabase functions deploy

# 3. 更新环境变量
# 在Supabase Dashboard中更新生产环境配置
```

### 前端部署
```bash
# 1. 构建生产版本
npm run build

# 2. 部署到托管服务 (Vercel/Netlify)
# 确保环境变量配置正确:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

## 🔧 开发工具和配置

### 推荐的VSCode扩展
```
必备扩展:
├── Tailwind CSS IntelliSense - Tailwind自动补全
├── TypeScript Importer - 自动导入类型
├── ES7+ React/Redux/React-Native snippets - React代码片段
├── Prettier - 代码格式化
└── GitLens - Git增强功能

推荐扩展:
├── Auto Rename Tag - 自动重命名标签
├── Bracket Pair Colorizer - 括号配色
├── Path Intellisense - 路径自动补全
└── Thunder Client - API测试
```

### 项目配置文件
```
关键配置文件:
├── tsconfig.json - TypeScript配置
├── tailwind.config.ts - Tailwind样式配置  
├── vite.config.ts - Vite构建配置
├── .env.local - 环境变量配置
└── supabase/config.toml - Supabase配置
```

## 🚨 常见问题和解决方案

### 性能优化
```tsx
// 1. 使用React.memo优化组件重渲染
export const StudentCard = React.memo(({ student, onClick }) => {
  return (
    <div onClick={() => onClick(student)}>
      {student.name}
    </div>
  );
});

// 2. 使用useMemo优化计算密集型操作
const sortedStudents = useMemo(() => {
  return students?.sort((a, b) => a.name.localeCompare(b.name));
}, [students]);

// 3. 使用useCallback优化事件处理器
const handleStudentSelect = useCallback((student) => {
  onStudentSelect(student);
}, [onStudentSelect]);
```

### 错误处理
```tsx
// 统一的错误边界组件
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 text-center">
          <p>抱歉，出现了一些问题</p>
          <Button onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
```

## 🔗 相关文档
- [main-guide.md](mdc:main-guide.md) - 项目总览
- [project-architecture.md](mdc:project-architecture.md) - 技术架构  
- [feature-modules.md](mdc:feature-modules.md) - 功能模块
- [ui-components.md](mdc:ui-components.md) - UI组件规范
- [database-operations.md](mdc:database-operations.md) - 数据库操作
- [ai-support.md](mdc:ai-support.md) - AI开发支持
