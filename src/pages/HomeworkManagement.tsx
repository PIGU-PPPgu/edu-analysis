import React, { useState, useEffect } from "react";
import TeacherHomeworkList from "@/components/homework/TeacherHomeworkList";
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Settings, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/analysis/Navbar";
import GradingSettingsDialog from "@/components/homework/GradingSettingsDialog";

// 导入模拟数据
import { getUserRoles } from "@/data/mockData";

const HomeworkManagement = () => {
  const [userRoles, setUserRoles] = useState<string[]>(['teacher']); // 默认只有教师角色
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRoles = async () => {
      try {
        setError(null);
        
        console.log("正在获取用户角色...");
        // 使用模拟数据获取用户角色，但只关注教师角色
        const roles = getUserRoles().filter(role => role === 'teacher');
        console.log("获取到的用户角色:", roles);
        setUserRoles(roles);
        
        // 移除模拟网络延迟
      } catch (error) {
        console.error("获取用户角色出错:", error);
        // 出错时使用默认角色，确保页面能够正常展示
        setUserRoles(['teacher']);
        setError("获取用户角色失败，使用默认角色");
      }
    };
    
    checkRoles();
  }, []);

  const isTeacher = userRoles.includes('teacher');

  console.log("当前用户角色:", userRoles, "是否教师:", isTeacher);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">作业管理</h1>
          {isTeacher && (
            <Button 
              variant="outline" 
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2"
            >
              <Sliders className="h-4 w-4" />
              批改设置
            </Button>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>注意</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center"
              >
                <RefreshCw className="h-3 w-3 mr-1" /> 重试
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {isTeacher ? (
          <TeacherHomeworkList />
        ) : (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">未分配角色</h3>
            <p className="text-gray-600 mb-4">您的账户尚未分配教师角色，无法访问作业管理功能。</p>
            <Button onClick={() => navigate('/')}>返回首页</Button>
          </div>
        )}

        {/* 批改设置对话框 */}
        <GradingSettingsDialog 
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      </div>
    </div>
  );
};

export default HomeworkManagement;
