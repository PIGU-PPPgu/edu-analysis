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
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, Suspense, lazy, useRef } from "react";
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
import MethodologyDoc from "./pages/MethodologyDoc";

// 主要业务页面 - 懒加载
const Index = lazy(() => import("./pages/Index"));
const GradeAnalysisLayout = lazy(() => import("./pages/GradeAnalysisLayout"));
const ValueAddedAnalysis = lazy(() => import("./pages/ValueAddedAnalysis"));
const AIAnalysisPage = lazy(() =>
  import("./components/value-added/analysis/AIAnalysisPage").then((module) => ({
    default: module.AIAnalysisPage,
  }))
);
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const StudentManagement = lazy(() => import("./pages/StudentManagement"));
const ClassManagement = lazy(() => import("./pages/ClassManagement"));
const ClassProfile = lazy(() => import("./pages/ClassProfile"));
const AISettings = lazy(
  () => import("./pages/settings/AISettingsPage-Enhanced")
);
const WarningAnalysis = lazy(() => import("./pages/WarningAnalysis"));
const HomeworkManagement = lazy(() => import("./pages/HomeworkManagement"));
const HomeworkDetailPage = lazy(() => import("./pages/HomeworkDetail"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ClassAnalytics = lazy(() => import("./pages/ClassAnalytics"));
const ExamManagement = lazy(() => import("./pages/ExamManagement"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const ConfigurationManagement = lazy(
  () => import("./pages/ConfigurationManagement")
);
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const GradeReportPage = lazy(() => import("./pages/GradeReport"));

// 工具和测试页面 - 懒加载
// 已删除测试文件: CascadeAnalysisTestPage, AnalysisDashboardComparison
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
const HistoricalTrackingPage = lazy(() => import("./pages/HistoricalTracking"));
const CleanDuplicateStudents = lazy(
  () => import("./pages/CleanDuplicateStudents")
);
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
import { GlobalLoadingProvider } from "./contexts/GlobalLoadingContext";
import { DataFlowProvider } from "./contexts/DataFlowContext";
import { useAuth } from "./contexts/unified/modules/AuthModule";
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

// 数据库初始化组件（带 localStorage 缓存，避免每次刷新都串行执行 DDL）
const DB_INIT_CACHE_KEY = "db_init_done_v1";
const DB_INIT_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

const DatabaseInitializer = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthReady } = useAuth();
  const initializedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    if (initializedUserIdRef.current === user.id) return;
    initializedUserIdRef.current = user.id;

    const setupDatabase = async () => {
      try {
        const cached = localStorage.getItem(DB_INIT_CACHE_KEY);
        const skipHeavyInit =
          cached && Date.now() - Number(cached) < DB_INIT_TTL_MS;

        if (!skipHeavyInit) {
          // 首次（或缓存过期）：执行完整的 DDL 初始化
          await initializeDatabase();
          await setupInitialData();
          await initDefaultAIConfig(true);
          localStorage.setItem(DB_INIT_CACHE_KEY, String(Date.now()));
          console.log("🚀 数据库完整初始化完成");
        } else {
          console.log("🚀 跳过数据库 DDL 初始化（24h 缓存有效）");
        }
      } catch (error) {
        console.error("数据库初始化失败:", error);
        localStorage.removeItem(DB_INIT_CACHE_KEY);
      }
    };

    setupDatabase();
  }, [isAuthReady, user]);

  useEffect(() => {
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
          {/* 🌟 Week 5: 全局加载状态管理 */}
          <GlobalLoadingProvider>
            {/* 🌟 Week 6: 全局数据流状态管理 */}
            <DataFlowProvider>
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
                            path="/docs/methodology"
                            element={<MethodologyDoc />}
                          />
                          <Route
                            path="/unauthorized"
                            element={<UnauthorizedPage />}
                          />
                          {/* 已移除测试路由: /test/cascade-analysis, /test/analysis-dashboards */}

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
                          <Route
                            path="/diagnosis"
                            element={<DiagnosisPage />}
                          />
                          <Route
                            path="/test-context"
                            element={<ContextTest />}
                          />
                          <Route path="/test-theme" element={<ThemeTest />} />
                          <Route
                            path="/clean-duplicates"
                            element={<CleanDuplicateStudents />}
                          />

                          {/* 受保护的路由 - 需要登录验证 */}
                          <Route element={<ProtectedRoute />}>
                            <Route path="/dashboard" element={<Index />} />
                            <Route
                              path="/grade-report"
                              element={<GradeReportPage />}
                            />
                            <Route
                              path="/teacher-dashboard"
                              element={<TeacherDashboard />}
                            />
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
                                path="/analysis/:examId"
                                element={<GradeAnalysisLayout />}
                              />
                              <Route
                                path="/value-added"
                                element={<ValueAddedAnalysis />}
                              />
                              <Route
                                path="/value-added/ai-analysis"
                                element={<AIAnalysisPage />}
                              />
                              <Route
                                path="/historical-tracking"
                                element={<HistoricalTrackingPage />}
                              />
                              {/* 配置管理已移至增值评价系统内 */}
                              {/* <Route
                                path="/configuration-management"
                                element={<ConfigurationManagement />}
                              /> */}
                              <Route
                                path="/grade-analysis"
                                element={
                                  <Navigate to="/exam-management" replace />
                                }
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
                            </Route>

                            {/* 管理员专属路由 */}
                            <Route
                              element={
                                <ProtectedRoute allowedRoles={["admin"]} />
                              }
                            >
                              <Route
                                path="/admin"
                                element={<AdminDashboard />}
                              />
                            </Route>

                            <Route
                              path="/student-profile/:studentId"
                              element={<StudentProfile />}
                            />
                            <Route
                              path="/ai-settings"
                              element={<AISettings />}
                            />

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
            </DataFlowProvider>
          </GlobalLoadingProvider>
        </UnifiedAppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
