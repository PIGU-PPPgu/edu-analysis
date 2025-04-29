import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import Login from "./pages/Login";
import GradeAnalysis from "./pages/GradeAnalysis";
import StudentProfile from "./pages/StudentProfile";
import StudentManagement from "./pages/StudentManagement";
import ClassManagement from "./pages/ClassManagement";
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

const queryClient = new QueryClient();

// 数据库初始化组件
const DatabaseInitializer = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initializeDatabase();
        await setupInitialData();
      } catch (error) {
        console.error('数据库初始化失败:', error);
      }
    };
    
    setupDatabase();
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
            <BrowserRouter>
              <Routes>
                {/* 公开路由 - 无需身份验证 */}
                <Route path="/login" element={<Login />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/test/cascade-analysis" element={<CascadeAnalysisTestPage />} />
                
                {/* 需要认证的路由 */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  
                  {/* 需要特定角色的路由 */}
                  <Route element={<ProtectedRoute allowedRoles={['admin', 'teacher']} />}>
                    <Route path="/grade-analysis" element={<GradeAnalysis />} />
                    <Route path="/warning-analysis" element={<WarningAnalysis />} />
                    <Route path="/student-management" element={<StudentManagement />} />
                    <Route path="/class-management" element={<ClassManagement />} />
                  </Route>
                  
                  {/* 学生和教师都可访问的路由 */}
                  <Route path="/student-profile/:studentId" element={<StudentProfile />} />
                  <Route path="/ai-settings" element={<AISettings />} />
                  
                  {/* 作业相关路由 */}
                  <Route path="/homework" element={<HomeworkManagement />} />
                  <Route path="/homework/edit/:homeworkId" element={<HomeworkManagement />} />
                  <Route path="/homework/:homeworkId" element={<HomeworkDetailPage />} />
                  <Route path="/student-homework" element={<StudentManagement />} />
                </Route>
                
                {/* 默认404路由 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </DatabaseInitializer>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
