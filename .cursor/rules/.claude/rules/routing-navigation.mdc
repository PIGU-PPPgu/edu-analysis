---
description: 
globs: 
alwaysApply: false
---
# 路由和导航

本应用使用React Router进行路由管理。以下是路由结构和导航组件的说明。

## 路由配置

应用的主要路由配置位于[src/App.tsx](mdc:src/App.tsx)文件中：

```tsx
<BrowserRouter>
  <ProtectedRoute>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/grade-analysis" element={<GradeAnalysis />} />
      <Route path="/warning-analysis" element={<WarningAnalysis />} />
      <Route path="/student-management" element={<StudentManagement />} />
      <Route path="/class-management" element={<ClassManagement />} />
      <Route path="/student-profile/:studentId" element={<StudentProfile />} />
      <Route path="/ai-settings" element={<AISettings />} />
      <Route path="/homework" element={<HomeworkManagement />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </ProtectedRoute>
</BrowserRouter>
```

## 主要页面

- **首页**：`/` - 应用程序的首页/仪表板
- **登录页**：`/login` - 用户登录页面
- **成绩分析**：`/grade-analysis` - 学生成绩分析页面
- **预警分析**：`/warning-analysis` - 学生学业预警分析页面
- **学生管理**：`/student-management` - 学生信息管理页面
- **班级管理**：`/class-management` - 班级信息管理页面
- **学生档案**：`/student-profile/:studentId` - 学生个人档案页面（动态路由）
- **AI设置**：`/ai-settings` - AI功能设置页面
- **作业管理**：`/homework` - 作业管理页面
- **404页面**：`*` - 未找到页面的处理

## 路由保护

应用使用`ProtectedRoute`组件保护需要登录才能访问的路由：

```tsx
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        // 公开页面列表
        const publicPages = ['/', '/login'];
        const isPublicPage = publicPages.includes(location.pathname);
        
        // 只有在非公开页面且未登录的情况下才重定向到登录页
        if (!data.session && !isPublicPage) {
          navigate('/login');
        }
      } catch (error) {
        console.error('验证用户状态失败:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [navigate, location.pathname]);
  
  // ...其余代码
};
```

## 导航组件

应用使用自定义导航组件进行页面间导航：

### 侧边栏导航

侧边栏导航组件位于[src/components/layout/Sidebar.tsx](mdc:src/components/layout/Sidebar.tsx)中，提供主要页面的导航链接。

### 页内导航

对于复杂页面，使用标签页组件进行页内导航：

```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList>
    <TabsTrigger value="tab1">标签页1</TabsTrigger>
    <TabsTrigger value="tab2">标签页2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    {/* 标签页1内容 */}
  </TabsContent>
  <TabsContent value="tab2">
    {/* 标签页2内容 */}
  </TabsContent>
</Tabs>
```

## 编程式导航

在组件中进行编程式导航：

```tsx
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    // 导航到另一个页面
    navigate('/student-profile/S001');
    
    // 携带状态导航
    navigate('/student-management', { state: { filter: 'active' } });
    
    // 替换当前历史记录
    navigate('/login', { replace: true });
  };
  
  return (
    <Button onClick={handleClick}>导航到学生档案</Button>
  );
}
```

## 获取路由参数

获取URL参数：

```tsx
import { useParams } from 'react-router-dom';

function StudentProfile() {
  const { studentId } = useParams();
  
  // 使用studentId获取学生信息
  
  return (
    <div>学生ID: {studentId}</div>
  );
}
```

获取查询参数：

```tsx
import { useSearchParams } from 'react-router-dom';

function StudentList() {
  const [searchParams] = useSearchParams();
  const classFilter = searchParams.get('class') || '';
  
  // 使用classFilter过滤学生列表
  
  return (
    <div>班级过滤: {classFilter}</div>
  );
}
```

## 开发者须知

1. 所有路由配置应在App.tsx中集中管理
2. 使用`ProtectedRoute`确保需要认证的路由受到保护
3. 使用适当的钩子（`useNavigate`、`useParams`、`useSearchParams`）进行路由操作
4. 对于动态路由参数，始终进行验证和错误处理
