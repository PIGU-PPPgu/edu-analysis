/**
 * 🚀 App.tsx - UnifiedAppContext集成版本
 *
 * 特性:
 * - 与现有架构并存
 * - 优雅的加载和错误处理
 * - 渐进迁移支持
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { initializeDatabase, setupInitialData } from "./utils/dbSetup";
// import { AuthProvider } from "./contexts/AuthContext"; // 🔧 移除：现在使用UnifiedAppProvider中的AuthModule
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { initDefaultAIConfig } from "./utils/userAuth";
import { PageLoadingFallback } from "./components/ui/loading-fallback";

// 🚀 Master-Frontend: 组件懒加载优化
// 公开页面 - 立即加载
import ModernHomepage from "./pages/ModernHomepage";
import Login from "./pages/Login";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ICPNotice from "./pages/ICPNotice";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import NotFound from "./pages/NotFound";

// 主要业务页面 - 懒加载
const Index = lazy(() => import("./pages/Index"));
const GradeAnalysis = lazy(() => import("./pages/GradeAnalysis"));
const AdvancedAnalysis = lazy(() => import("./pages/AdvancedAnalysis"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const StudentManagement = lazy(() => import("./pages/StudentManagement"));
const ClassManagement = lazy(() => import("./pages/ClassManagement"));
const ClassProfile = lazy(() => import("./pages/ClassProfile"));
const AISettings = lazy(() => import("./pages/AISettings"));
const WarningAnalysis = lazy(() => import("./pages/WarningAnalysis"));
const HomeworkManagement = lazy(() => import("./pages/HomeworkManagement"));
const HomeworkDetailPage = lazy(() => import("./pages/HomeworkDetail"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const StudentPortraitManagement = lazy(
  () => import("./pages/StudentPortraitManagement")
);
const ExamManagement = lazy(() => import("./pages/ExamManagement"));

// 工具和测试页面 - 懒加载
const CascadeAnalysisTestPage = lazy(
  () => import("./pages/test/cascade-analysis")
);
const AnalysisDashboardComparison = lazy(
  () => import("./pages/test/AnalysisDashboardComparison")
);
const DiagnosticsTool = lazy(() =>
  import("./tools/diagnostics-ui").then((module) => ({
    default: module.DiagnosticsTool,
  }))
);
const InitTables = lazy(() => import("./pages/InitTables"));
const CreateWarningTablePage = lazy(
  () => import("./pages/tools/CreateWarningTable")
);
const DiagnosisPage = lazy(() => import("./pages/DiagnosisPage"));
import {
  initGlobalErrorHandlers,
  reduceBrowserWorkload,
  checkBrowserResources,
} from "./utils/errorHandlers";
import ErrorBoundary from "./components/performance/ErrorBoundary";
import {
  initializePerformanceOptimizer,
  removeProductionLogs,
} from "./utils/performanceOptimizer";
// import { multiLevelCache } from "./services/cache/MultiLevelCache";
// import { queryOptimizer } from "./services/database/queryOptimizer";
import SystemMonitor, { LogLevel, LogCategory } from "./utils/systemMonitor";
import PerformanceMonitoring from "./pages/PerformanceMonitoring";
import { ContextTest } from "./TestContext";
import { ThemeTest } from "./ThemeTest";

// 🚀 新增: UnifiedAppContext相关导入
import { UnifiedAppProvider } from "./contexts/unified/UnifiedAppContext";
// 🧠 Master-AI-Data: 用户行为追踪系统
// import { userBehaviorTracker } from "./services/ai/userBehaviorTracker"; // Disabled for development
// import { useInitializeApp } from "./hooks/useInitializeApp"; // 暂时未使用
// import { LoadingScreen } from "./components/ui/loading-screen"; // 暂时未使用
// import { ErrorScreen } from "./components/ui/error-screen"; // 暂时未使用
import React from "react";

// 全局配置QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 10 * 60 * 1000, // 10分钟缓存
    },
  },
});

// 初始化全局错误处理器和性能优化
initGlobalErrorHandlers();
initializePerformanceOptimizer();

// 在生产环境清理日志输出
removeProductionLogs();

// 🚀 新增: 简化的应用初始化组件（暂时禁用useInitializeApp以避免冲突）
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 暂时直接渲染子组件，让UnifiedAppContext处理初始化
  // TODO: 后续整合两个初始化系统或选择其中一个
  return <>{children}</>;
};

// 数据库初始化组件（保持现有逻辑）
const DatabaseInitializer = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        await setupInitialData();
        // 初始化默认AI配置（豆包API），强制重置配置
        await initDefaultAIConfig(true);

        // 🚀 第6周新增: 预热缓存系统
        console.log("🚀 性能优化系统已启动，缓存系统已预热");
      } catch (error) {
        console.error("数据库初始化失败:", error);
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
      flushInterval: 30000,
    });

    monitor.log(
      LogLevel.INFO,
      LogCategory.SYSTEM,
      "Application initialized successfully",
      {
        environment: isDev ? "development" : "production",
        version: import.meta.env.VITE_APP_VERSION || "unknown",
        timestamp: Date.now(),
      }
    );

    // 🧠 Master-AI-Data: 初始化用户行为追踪（暂时禁用）
    // console.log("🧠 [Master-AI-Data] 用户行为追踪系统已启动");
    // 监听路由变化以记录页面访问
    // window.addEventListener("popstate", () => {
    //   userBehaviorTracker.trackPageView();
    // });
  }, []);

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* 🚀 UnifiedAppProvider包装整个应用，移除重复的AuthProvider */}
        <UnifiedAppProvider
          config={{
            modules: {
              auth: { enabled: true, lazy: false, initializationOrder: 1 },
              grade: {
                enabled: true,
                lazy: false,
                initializationOrder: 3,
                dependencies: ["auth"],
              },
              filter: { enabled: true, lazy: false, initializationOrder: 2 },
              ui: { enabled: true, lazy: false, initializationOrder: 0 },
            },
            enableDevTools: import.meta.env.DEV,
            performanceLogging: import.meta.env.DEV,
            errorBoundary: true,
            persistState: true,
            legacyContextSupport: false, // 🔧 禁用遗留兼容，完全使用新Context
            migrationMode: false, // 🔧 禁用迁移模式，完全使用新架构
          }}
        >
          <DatabaseInitializer>
            {/* 🚀 应用初始化器 */}
            <AppInitializer>
              <ErrorBoundary
                componentName="App"
                enableRecovery={true}
                showErrorDetails={true}
                isolateFailures={false}
              >
                <BrowserRouter>
                  <Suspense fallback={<PageLoadingFallback />}>
                    <Routes>
                      {/* 公开路由 */}
                      <Route path="/" element={<ModernHomepage />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/icp-notice" element={<ICPNotice />} />
                      <Route
                        path="/unauthorized"
                        element={<UnauthorizedPage />}
                      />
                      <Route
                        path="/test/cascade-analysis"
                        element={<CascadeAnalysisTestPage />}
                      />
                      <Route
                        path="/test/analysis-dashboards"
                        element={<AnalysisDashboardComparison />}
                      />

                      {/* 诊断工具路由（保持公开用于系统维护） */}
                      <Route
                        path="/tools/diagnostics"
                        element={<DiagnosticsTool />}
                      />
                      <Route
                        path="/tools/init-tables"
                        element={<InitTables />}
                      />
                      <Route
                        path="/tools/create-warning-table"
                        element={<CreateWarningTablePage />}
                      />
                      <Route
                        path="/performance-monitoring"
                        element={<PerformanceMonitoring />}
                      />
                      <Route path="/diagnosis" element={<DiagnosisPage />} />
                      <Route path="/test-context" element={<ContextTest />} />
                      <Route path="/test-theme" element={<ThemeTest />} />

                      {/* 受保护的路由 - 需要登录验证 */}
                      <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<Index />} />
                        <Route path="/data-import" element={<Index />} />
                        <Route path="/simple-import" element={<Index />} />
                        <Route path="/profile" element={<ProfilePage />} />

                        <Route
                          element={
                            <ProtectedRoute
                              allowedRoles={["admin", "teacher"]}
                            />
                          }
                        >
                          <Route
                            path="/grade-analysis"
                            element={<GradeAnalysis />}
                          />
                          <Route
                            path="/advanced-analysis"
                            element={<AdvancedAnalysis />}
                          />
                          <Route
                            path="/warning-analysis"
                            element={<WarningAnalysis />}
                          />
                          <Route
                            path="/exam-management"
                            element={<ExamManagement />}
                          />
                          <Route
                            path="/student-management"
                            element={<StudentManagement />}
                          />
                          <Route
                            path="/class-management"
                            element={<ClassManagement />}
                          />
                          <Route
                            path="/class-profile/:classId"
                            element={<ClassProfile />}
                          />
                          <Route
                            path="/student-portrait-management"
                            element={<StudentPortraitManagement />}
                          />
                        </Route>

                        <Route
                          path="/student-profile/:studentId"
                          element={<StudentProfile />}
                        />
                        <Route path="/ai-settings" element={<AISettings />} />

                        <Route
                          path="/homework"
                          element={<HomeworkManagement />}
                        />
                        <Route
                          path="/homework/edit/:homeworkId"
                          element={<HomeworkManagement />}
                        />
                        <Route
                          path="/homework/:homeworkId"
                          element={<HomeworkDetailPage />}
                        />
                        <Route
                          path="/student-homework"
                          element={<StudentManagement />}
                        />
                      </Route>

                      {/* 默认404路由 */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </ErrorBoundary>
            </AppInitializer>
          </DatabaseInitializer>
        </UnifiedAppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
