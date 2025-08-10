/**
 * 成绩数据中心 - 简化版本
 * 避免复杂导入，确保快速加载
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  BarChart3,
  FileText,
  Settings,
  TrendingUp,
  Users,
  RefreshCw,
  Download,
  Activity,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

// 导入考试管理组件
import ExamManagementCenterNew from "@/components/exam/ExamManagementCenterNew";

const GradeDataCenterSimple: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 从URL参数获取初始tab，默认为overview
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  // 简化的统计数据
  const [stats, setStats] = useState({
    totalExams: 0,
    totalStudents: 0,
    totalGrades: 0,
    averageScore: 0,
  });

  // 标签页配置
  const tabs = [
    {
      id: "overview",
      label: "数据概览",
      icon: <Database className="h-4 w-4" />,
      description: "查看整体数据统计",
    },
    {
      id: "exams",
      label: "考试管理",
      icon: <FileText className="h-4 w-4" />,
      description: "创建、编辑和管理考试",
    },
    {
      id: "grades",
      label: "成绩分析",
      icon: <BarChart3 className="h-4 w-4" />,
      description: "成绩数据分析",
    },
    {
      id: "students",
      label: "学生管理",
      icon: <Users className="h-4 w-4" />,
      description: "学生信息管理",
    },
  ];

  // 更新URL参数
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // 加载基础统计数据
  const loadStats = async () => {
    try {
      setIsLoading(true);

      // 模拟加载统计数据
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setStats({
        totalExams: 25,
        totalStudents: 1200,
        totalGrades: 5400,
        averageScore: 78.5,
      });
    } catch (error) {
      console.error("加载统计数据失败:", error);
      toast.error("加载数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-6">
        {/* 页面标题栏 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg">
                <Database className="h-8 w-8" />
              </div>
              成绩数据中心
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              统一的教育数据管理和分析平台
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadStats}
              disabled={isLoading}
              className="bg-white"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新数据
            </Button>
          </div>
        </div>

        {/* 快速统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">总考试数</p>
                  <p className="text-3xl font-bold">{stats.totalExams}</p>
                </div>
                <FileText className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">总学生数</p>
                  <p className="text-3xl font-bold">{stats.totalStudents}</p>
                </div>
                <Users className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">成绩记录</p>
                  <p className="text-3xl font-bold">{stats.totalGrades}</p>
                </div>
                <BarChart3 className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">平均分</p>
                  <p className="text-3xl font-bold">{stats.averageScore}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <Card className="shadow-xl border-0">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* 标签栏 */}
            <div className="border-b bg-white rounded-t-lg">
              <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-gray-100">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      {tab.icon}
                      <span className="text-sm font-medium">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* 标签描述 */}
              <div className="px-6 pb-4 mt-4">
                <p className="text-sm text-gray-600">
                  {tabs.find((tab) => tab.id === activeTab)?.description}
                </p>
              </div>
            </div>

            {/* 标签内容 */}
            <div className="bg-gray-50 rounded-b-lg">
              {/* 数据概览 */}
              <TabsContent value="overview" className="m-0 p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        系统状态
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>数据库连接</span>
                          <Badge variant="default" className="bg-green-500">
                            正常
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>缓存状态</span>
                          <Badge variant="default" className="bg-blue-500">
                            活跃
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>最后更新</span>
                          <span className="text-sm text-gray-500">
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-blue-600" />
                        最近活动
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                          <div>
                            <p className="text-sm font-medium">系统启动</p>
                            <p className="text-xs text-gray-500">
                              数据中心已成功加载
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                          <div>
                            <p className="text-sm font-medium">数据同步</p>
                            <p className="text-xs text-gray-500">
                              统计数据已更新
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 考试管理 */}
              <TabsContent value="exams" className="m-0">
                <div className="p-6">
                  <ExamManagementCenterNew />
                </div>
              </TabsContent>

              {/* 成绩分析 */}
              <TabsContent value="grades" className="m-0 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>成绩分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">成绩分析功能开发中...</p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        📊 <strong>即将推出:</strong>{" "}
                        成绩统计、趋势分析、班级对比
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 学生管理 */}
              <TabsContent value="students" className="m-0 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>学生管理</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">学生管理功能开发中...</p>
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">
                        👥 <strong>计划功能:</strong>{" "}
                        学生档案、学习轨迹、个性化推荐
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default GradeDataCenterSimple;
