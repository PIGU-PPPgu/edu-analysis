
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

const queryClient = new QueryClient();

// 路由保护组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsCheckingAuth(true);
        const session = await getSession();
        console.log('ProtectedRoute - 当前路径:', location.pathname);
        console.log('ProtectedRoute - 认证状态:', session ? '已登录' : '未登录');
        
        // 如果未登录且不在公开页面，则跳转到登录页
        if (!session && !location.pathname.includes('/login') && !location.pathname === '/') {
          console.log('ProtectedRoute - 未登录，跳转到登录页');
          navigate('/login');
        }
      } catch (error) {
        console.error('验证用户状态失败:', error);
        navigate('/login');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [navigate, location.pathname]);
  
  // 添加认证状态变化监听
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('认证状态变化:', event, session ? '已登录' : '未登录');
      
      // 如果登出，跳转到首页
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
      
      // 如果登录，跳转到成绩分析页
      if (event === 'SIGNED_IN') {
        navigate('/grade-analysis');
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);
  
  if (isCheckingAuth) {
    return <div className="flex items-center justify-center h-screen">正在加载...</div>;
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

const App = () => (
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
                element={
                  <RoleGuard allowedRoles={['admin', 'teacher', 'student']}>
                    <GradeAnalysis />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/warning-analysis" 
                element={
                  <RoleGuard allowedRoles={['admin', 'teacher']}>
                    <WarningAnalysis />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/student-management" 
                element={
                  <RoleGuard allowedRoles={['admin', 'teacher']}>
                    <StudentManagement />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/class-management" 
                element={
                  <RoleGuard allowedRoles={['admin', 'teacher']}>
                    <ClassManagement />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/student-profile/:studentId" 
                element={
                  <RoleGuard allowedRoles={['admin', 'teacher', 'student']}>
                    <StudentProfile />
                  </RoleGuard>
                } 
              />
              <Route 
                path="/ai-settings" 
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <AISettings />
                  </RoleGuard>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProtectedRoute>
        </BrowserRouter>
      </DatabaseInitializer>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
