
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
import { getCurrentUser } from "./utils/auth";

const queryClient = new QueryClient();

// 路由保护组件
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user && !location.pathname.includes('/login') && !location.pathname.includes('/')) {
          navigate('/login');
        }
      } catch (error) {
        console.error('验证用户状态失败:', error);
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate, location]);
  
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
              <Route path="/grade-analysis" element={<GradeAnalysis />} />
              <Route path="/warning-analysis" element={<WarningAnalysis />} />
              <Route path="/student-management" element={<StudentManagement />} />
              <Route path="/class-management" element={<ClassManagement />} />
              <Route path="/student-profile/:studentId" element={<StudentProfile />} />
              <Route path="/ai-settings" element={<AISettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ProtectedRoute>
        </BrowserRouter>
      </DatabaseInitializer>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
