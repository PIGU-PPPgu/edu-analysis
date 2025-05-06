import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, Settings, Sliders, BookOpen, Clock, BarChart, ChevronRight, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/shared/Navbar";
import GradingSettingsDialog from "@/components/homework/GradingSettingsDialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { HomeworkTable } from "@/components/homework/HomeworkTable";
import { 
  PlusCircle, 
  FileText, 
  Search, 
  BarChart3
} from "lucide-react";
import { HomeworkAnalysisDashboard } from "@/components/analysis";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllHomeworks, getHomeworkSubmissions } from "@/services/homeworkService";
import { getAllClasses } from "@/services/classService";

// 导入模拟数据
import { getUserRoles } from "@/data/mockData";

const HomeworkManagement = () => {
  const [userRoles, setUserRoles] = useState<string[]>(['teacher']); // 默认只有教师角色
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // 统计数据
  const [stats, setStats] = useState({
    totalHomeworks: 0,
    pendingGrading: 0,
    totalClasses: 0,
    overdueHomeworks: 0
  });
  
  const [loading, setLoading] = useState(true);
  
  // 模拟的状态选项
  const statusOptions = [
    {
      label: "已发布",
      value: "published",
      icon: FileText,
    },
    {
      label: "草稿",
      value: "draft",
      icon: FileText,
    },
    {
      label: "已归档",
      value: "archived",
      icon: FileText,
    },
  ];

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

  // 获取统计数据
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // 获取所有作业
        const homeworks = await getAllHomeworks();
        
        // 获取所有班级
        const classes = await getAllClasses();
        
        // 统计逾期作业数量
        const now = new Date();
        const overdueCount = homeworks.filter(hw => {
          if (!hw.due_date) return false;
          return new Date(hw.due_date) < now;
        }).length;
        
        // 计算待批改的作业数量 - 这里需要额外请求各作业的提交情况
        let pendingCount = 0;
        for (const homework of homeworks) {
          try {
            // 调用服务获取提交数据
            const result = await getHomeworkSubmissions(homework.id);
            
            // 检查返回结果是否成功，并且 submissions 确实是数组
            if (result.success && Array.isArray(result.submissions)) {
              // 在真实的 submissions 数组上执行 filter 操作
              pendingCount += result.submissions.filter(sub => sub.status === 'submitted').length;
            } else if (!result.success) {
              // 如果获取失败，可以选择记录错误或跳过
              console.warn(`获取作业 ${homework.id} 的提交数据失败:`, result.error);
            }
            // 如果 result.submissions 不是数组 (例如 null 或 undefined)，也会被跳过
            
          } catch (submissionError) {
            // 处理 getHomeworkSubmissions 可能抛出的异常
            console.error(`处理作业 ${homework.id} 的提交时发生错误:`, submissionError);
          }
        }
        
        setStats({
          totalHomeworks: homeworks.length,
          pendingGrading: pendingCount,
          totalClasses: classes.length,
          overdueHomeworks: overdueCount
        });
        
      } catch (error) {
        console.error("获取统计数据失败:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
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
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    总作业数
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.totalHomeworks}</div>
                  <p className="text-xs text-muted-foreground">
                    已发布的作业数量
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    待批改
                  </CardTitle>
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.pendingGrading}</div>
                  <p className="text-xs text-muted-foreground">
                    待批改的提交数量
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    关联班级
                  </CardTitle>
                  <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.totalClasses}</div>
                  <p className="text-xs text-muted-foreground">
                    关联的班级数量
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    已截止作业
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? '...' : stats.overdueHomeworks}</div>
                  <p className="text-xs text-muted-foreground">
                    已截止的作业数量
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList>
                <TabsTrigger value="list">作业列表</TabsTrigger>
                <TabsTrigger value="analysis">数据分析</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      placeholder="搜索作业..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-xs"
                    />
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <HomeworkTable searchTerm={searchTerm} />
              </TabsContent>
              
              <TabsContent value="analysis">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">作业数据分析</h2>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      导出报告
                    </Button>
                  </div>
                  
                  <HomeworkAnalysisDashboard />
                </div>
              </TabsContent>
            </Tabs>
          </>
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
