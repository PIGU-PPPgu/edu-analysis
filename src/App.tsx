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
import { useEffect } from "react";
import ModernHomepage from "./pages/ModernHomepage";
import Index from "./pages/Index";
import Login from "./pages/Login";
import GradeAnalysis from "./pages/GradeAnalysis";
import AdvancedAnalysis from "./pages/AdvancedAnalysis";
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
import CascadeAnalysisTestPage from "./pages/test/cascade-analysis";
import { initDefaultAIConfig } from "./utils/userAuth";
import StudentPortraitManagement from "./pages/StudentPortraitManagement";
import { DiagnosticsTool } from "./tools/diagnostics-ui";
import InitTables from "./pages/InitTables";
import CreateWarningTablePage from "./pages/tools/CreateWarningTable";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ICPNotice from "./pages/ICPNotice";
import DiagnosisPage from "./pages/DiagnosisPage";
import {
  initGlobalErrorHandlers,
  reduceBrowserWorkload,
  checkBrowserResources,
} from "./utils/errorHandlers";
import ErrorBoundary from "./components/performance/ErrorBoundary";
import { initializePerformanceOptimizer } from "./utils/performanceOptimizer";
import SystemMonitor, { LogLevel, LogCategory } from "./utils/systemMonitor";
import PerformanceMonitoring from "./pages/PerformanceMonitoring";

// 🚀 新增: UnifiedAppContext相关导入
import { UnifiedAppProvider } from "./contexts/unified/UnifiedAppContext";
import { useInitializeApp } from "./hooks/useInitializeApp";
import { LoadingScreen } from "./components/ui/loading-screen";
import { ErrorScreen } from "./components/ui/error-screen";
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

// 初始化全局错误处理器
initGlobalErrorHandlers();

// 🚀 新增: 应用初始化组件
const AppInitializer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { initialized, loading, error, progress, retry } = useInitializeApp({
    preloadGradeData: true,
    enablePerformanceMode: true,
    onInitComplete: () => {
      console.log("🎉 UnifiedAppContext 初始化完成");
    },
    onError: (error) => {
      console.error("❌ UnifiedAppContext 初始化失败:", error);
    },
  });

  // 显示加载状态
  if (loading) {
    return (
      <LoadingScreen
        progress={progress}
        title="正在初始化应用..."
        description="请耐心等待，首次加载可能需要一些时间"
      />
    );
  }

  // 显示错误状态
  if (error && error.recoverable) {
    return (
      <ErrorScreen
        error={error}
        onRetry={retry}
        title="初始化失败"
        description="应用初始化时遇到问题，请点击重试"
      />
    );
  }

  // 如果有不可恢复的错误，显示严重错误页面
  if (error && !error.recoverable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">严重错误</h1>
          <p className="text-red-700 mb-4">{error.message}</p>
          <p className="text-sm text-red-600">请刷新页面或联系系统管理员</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            刷新页面
          </button>
        </div>
      </div>
    );
  }

  // 如果未初始化，显示初始化中
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">准备就绪...</p>
        </div>
      </div>
    );
  }

  // 初始化完成，渲染应用内容
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
  }, []);

  return <>{children}</>;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* 🚀 新增: UnifiedAppProvider包装整个应用 */}
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
            legacyContextSupport: true, // 🔄 启用向后兼容
            migrationMode: true, // 🔄 启用迁移模式
          }}
        >
          {/* 🔄 保持现有AuthProvider以确保向后兼容 */}
          <AuthProvider>
            <DatabaseInitializer>
              {/* 🚀 新增: 应用初始化器 */}
              <AppInitializer>
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
                      <Route
                        path="/unauthorized"
                        element={<UnauthorizedPage />}
                      />
                      <Route
                        path="/test/cascade-analysis"
                        element={<CascadeAnalysisTestPage />}
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
                  </BrowserRouter>
                </ErrorBoundary>
              </AppInitializer>
            </DatabaseInitializer>
          </AuthProvider>
        </UnifiedAppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
