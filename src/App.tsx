import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import ModernHomepage from "./pages/ModernHomepage";
import Index from "./pages/Index";
import Login from "./pages/Login";
import GradeAnalysis from "./pages/GradeAnalysis";
import StudentProfile from "./pages/StudentProfile";
import StudentManagement from "./pages/StudentManagement";
import ClassManagement from "./pages/ClassManagement";
import ClassProfile from "./pages/ClassProfile";
import AISettings from "./pages/AISettings";
import WarningAnalysis from "./pages/WarningAnalysis";
import NotFound from "./pages/NotFound";
import { initializeDatabase, setupInitialData } from "./utils/dbSetup";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import HomeworkManagement from "./pages/HomeworkManagement";
import HomeworkDetailPage from "./pages/HomeworkDetail";
import ProfilePage from "./pages/ProfilePage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import CascadeAnalysisTestPage from "./pages/test/CascadeAnalysisTest";
import { initDefaultAIConfig } from "./utils/userAuth";
import StudentPortraitManagement from "./pages/StudentPortraitManagement";
import { DiagnosticsTool } from "./tools/diagnostics-ui";
import InitTables from "./pages/InitTables";
import CreateWarningTablePage from "./pages/tools/CreateWarningTable";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ICPNotice from "./pages/ICPNotice";
import { initGlobalErrorHandlers, reduceBrowserWorkload, checkBrowserResources } from "./utils/errorHandlers";
import ErrorBoundary from "./components/performance/ErrorBoundary";
import { initializePerformanceOptimizer } from "./utils/performanceOptimizer";
import SystemMonitor, { LogLevel, LogCategory } from "./utils/systemMonitor";
import PerformanceMonitoring from "./pages/PerformanceMonitoring";


// 全局配置QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 10 * 60 * 1000, // 10分钟缓存
    },
  },
});

// 初始化全局错误处理器
initGlobalErrorHandlers();

// 数据库初始化组件
const DatabaseInitializer = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        await setupInitialData();
        // 初始化默认AI配置（豆包API），强制重置配置
        await initDefaultAIConfig(true);
      } catch (error) {
        console.error('数据库初始化失败:', error);
      }
    };
    
    setupDatabase();
    
    // 检查浏览器资源，如果资源不足，自动减少动画和特效
    if (!checkBrowserResources()) {
      reduceBrowserWorkload();
    }
    
    // 初始化性能优化系统
    initializePerformanceOptimizer();
    
    // 初始化系统监控
    const isDev = import.meta.env.DEV;
    const monitor = SystemMonitor.getInstance({
      logLevel: isDev ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsoleOutput: isDev,
      enableRemoteLogging: !isDev,
      enablePerformanceMonitoring: true,
      enableErrorTracking: true,
      enableUserTracking: true,
      maxLogEntries: 1000,
      flushInterval: 30000
    });
    
    monitor.log(LogLevel.INFO, LogCategory.SYSTEM, 'Application initialized successfully', {
      environment: isDev ? 'development' : 'production',
      version: import.meta.env.VITE_APP_VERSION || 'unknown',
      timestamp: Date.now()
    });
  }, []);
  
  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <DatabaseInitializer>
            <ErrorBoundary 
              componentName="App"
              enableRecovery={true}
              showErrorDetails={true}
              isolateFailures={false}
            >
              <BrowserRouter>
          <Routes>
                {/* 公开路由 */}
                <Route path="/" element={<ModernHomepage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/icp-notice" element={<ICPNotice />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/test/cascade-analysis" element={<CascadeAnalysisTestPage />} />
                
                {/* 诊断工具路由（保持公开用于系统维护） */}
                <Route path="/tools/diagnostics" element={<DiagnosticsTool />} />
                <Route path="/tools/init-tables" element={<InitTables />} />
                <Route path="/tools/create-warning-table" element={<CreateWarningTablePage />} />
                <Route path="/performance-monitoring" element={<PerformanceMonitoring />} />
                
                {/* 受保护的路由 - 需要登录验证 */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/data-import" element={<Index />} />
                  <Route path="/simple-import" element={<Index />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  
                  <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
                    <Route path="/grade-analysis" element={<GradeAnalysis />} />
                    <Route path="/warning-analysis" element={<WarningAnalysis />} />
                    <Route path="/student-management" element={<StudentManagement />} />
                    <Route path="/class-management" element={<ClassManagement />} />
                    <Route path="/class-profile/:classId" element={<ClassProfile />} />
                    <Route path="/student-portrait-management" element={<StudentPortraitManagement />} />
                  </Route>
            
                  <Route path="/student-profile/:studentId" element={<StudentProfile />} />
                  <Route path="/ai-settings" element={<AISettings />} />
                  
                  <Route path="/homework" element={<HomeworkManagement />} />
                  <Route path="/homework/edit/:homeworkId" element={<HomeworkManagement />} />
                  <Route path="/homework/:homeworkId" element={<HomeworkDetailPage />} />
                  <Route path="/student-homework" element={<StudentManagement />} />
                </Route>
                
                {/* 默认404路由 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </BrowserRouter>
            </ErrorBoundary>
          </DatabaseInitializer>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
