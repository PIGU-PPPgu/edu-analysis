import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { getCurrentUser, getSession } from "./utils/auth";
import RoleGuard from "./components/auth/RoleGuard";
import { supabase } from "./integrations/supabase/client";
import HomeworkManagement from "./pages/HomeworkManagement";

const queryClient = new QueryClient();

// 路由保护组件 - 简化版本解决空白页问题
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.log('ProtectedRoute - 当前路径:', location.pathname);
        console.log('ProtectedRoute - 认证状态:', data.session ? '已登录' : '未登录');
        
        // 公开页面列表
        const publicPages = ['/', '/login'];
        const isPublicPage = publicPages.includes(location.pathname);
        
        // 只有在非公开页面且未登录的情况下才重定向到登录页
        if (!data.session && !isPublicPage) {
          console.log('ProtectedRoute - 未登录，跳转到登录页');
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
  
  // 简化认证状态监听，仅记录日志，不重定向
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('认证状态变化:', event, session ? '已登录' : '未登录');
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);
  
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p>正在验证登录状态...</p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

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
        <DatabaseInitializer>
          <BrowserRouter>
            <ProtectedRoute>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/grade-analysis" 
                  element={<GradeAnalysis />} 
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ProtectedRoute>
          </BrowserRouter>
        </DatabaseInitializer>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
