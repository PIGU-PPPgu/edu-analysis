/**
 * 成绩数据中心 - 统一的数据管理和分析平台
 * 整合考试管理、成绩分析、高级分析功能
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Database,
  BarChart3,
  FileText,
  Settings,
  TrendingUp,
  Users,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Bell,
  Activity,
  PieChart,
  LineChart,
} from "lucide-react";
import { toast } from "sonner";

// 导入统一数据服务
import { domainServices } from "@/services/domains";
import { examDataService } from "@/services/domains/ExamDataService";
import { gradeDataService } from "@/services/domains/GradeDataService";
import { studentDataService } from "@/services/domains/StudentDataService";
import { analysisDataService } from "@/services/domains/AnalysisDataService";

// 导入考试管理组件
import ExamManagementCenterNew from "@/components/exam/ExamManagementCenterNew";

// 导入现有分析组件
import StatisticsOverview from "@/components/analysis/statistics/StatisticsOverview";
import OptimizedGradeDataTable from "@/components/analysis/OptimizedGradeDataTable";

// 临时导入，后续会被新组件替换
import CompleteAnalyticsDashboard from "@/components/analysis/dashboard/CompleteAnalyticsDashboard_Safe";

interface DataCenterStats {
  totalExams: number;
  totalStudents: number;
  totalGrades: number;
  averageScore: number;
  recentActivity: Array<{
    id: string;
    type: "exam_created" | "grade_added" | "analysis_run";
    title: string;
    timestamp: string;
    description: string;
  }>;
  systemHealth: {
    dataGateway: "healthy" | "degraded" | "unhealthy";
    cacheHitRate: number;
    responseTime: number;
  };
}

const GradeDataCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 从URL参数获取初始tab，默认为overview
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);

  // 数据中心状态
  const [stats, setStats] = useState<DataCenterStats>({
    totalExams: 0,
    totalStudents: 0,
    totalGrades: 0,
    averageScore: 0,
    recentActivity: [],
    systemHealth: {
      dataGateway: "healthy",
      cacheHitRate: 0,
      responseTime: 0,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());

  // 标签页配置
  const tabs = [
    {
      id: "overview",
      label: "数据概览",
      icon: <Database className="h-4 w-4" />,
      description: "查看整体数据统计和系统健康状况",
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
      description: "成绩数据分析和统计",
    },
    {
      id: "advanced",
      label: "高级分析",
      icon: <TrendingUp className="h-4 w-4" />,
      description: "多维度数据分析和预测",
    },
    {
      id: "students",
      label: "学生管理",
      icon: <Users className="h-4 w-4" />,
      description: "学生信息和学习档案",
    },
    {
      id: "settings",
      label: "系统设置",
      icon: <Settings className="h-4 w-4" />,
      description: "系统配置和数据管理",
    },
  ];

  // 更新URL参数
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // 加载数据中心统计信息
  const loadDataCenterStats = async () => {
    try {
      setIsLoading(true);
      console.log("[GradeDataCenter] 加载数据中心统计信息");

      // 并行获取各类数据统计
      const [exams, students, healthCheck] = await Promise.all([
        examDataService.getExams({ limit: 1000 }),
        studentDataService.getStudents({ limit: 1000 }),
        domainServices.healthCheck(),
      ]);

      // 获取缓存统计
      const serviceStats = await domainServices.getServicesStats();

      // 获取真实的最近活动数据
      const recentActivity = await analysisDataService.getRecentActivity();

      const newStats: DataCenterStats = {
        totalExams: exams.length,
        totalStudents: students.length,
        totalGrades: exams.reduce(
          (sum, exam) => sum + (exam.participantCount || 0),
          0
        ),
        averageScore: await gradeDataService.getAverageScore(),
        recentActivity,
        systemHealth: {
          dataGateway: healthCheck.status,
          cacheHitRate: serviceStats.cacheHitRate,
          responseTime: serviceStats.averageResponseTime,
        },
      };

      setStats(newStats);
      setLastRefreshTime(new Date());

      console.log("[GradeDataCenter] 统计信息加载完成:", newStats);
    } catch (error) {
      console.error("[GradeDataCenter] 加载统计信息失败:", error);
      toast.error("加载数据统计失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新数据
  const handleRefreshData = async () => {
    console.log("[GradeDataCenter] 手动刷新数据");
    await Promise.all([domainServices.clearAllCaches(), loadDataCenterStats()]);
    toast.success("数据已刷新");
  };

  // 导出数据
  const handleExportData = () => {
    console.log("[GradeDataCenter] 导出数据");
    toast.info("数据导出功能开发中...");
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadDataCenterStats();
  }, []);

  // 定期刷新数据（每5分钟）
  useEffect(() => {
    const interval = setInterval(
      () => {
        loadDataCenterStats();
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-6">
        {/* Positivus风格页面标题栏 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-black text-black flex items-center gap-4 uppercase">
              <div className="p-4 bg-[#B9FF66] border-3 border-black shadow-[4px_4px_0px_0px_#000]">
                <Database className="h-10 w-10 text-black" />
              </div>
              成绩数据中心
            </h1>
            <p className="text-black mt-2 text-lg font-medium bg-white px-4 py-2 border-2 border-black inline-block">
              统一的教育数据管理和分析平台 • 最后更新:{" "}
              {lastRefreshTime.toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Positivus风格系统健康状态指示器 */}
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-3 border-black shadow-[2px_2px_0px_0px_#000]">
              <div
                className={`w-3 h-3 border-2 border-black ${
                  stats.systemHealth.dataGateway === "healthy"
                    ? "bg-[#B9FF66]"
                    : stats.systemHealth.dataGateway === "degraded"
                      ? "bg-yellow-400"
                      : "bg-red-500"
                }`}
              />
              <span className="text-sm font-bold text-black uppercase tracking-wide">
                系统
                {stats.systemHealth.dataGateway === "healthy" ? "正常" : "异常"}
              </span>
            </div>

            <Button
              onClick={handleRefreshData}
              disabled={isLoading}
              className="bg-[#B9FF66] hover:bg-[#A8F055] text-black font-bold border-3 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] uppercase tracking-wide"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新数据
            </Button>

            <Button
              onClick={handleExportData}
              className="bg-black hover:bg-gray-800 text-white font-bold border-3 border-black shadow-[2px_2px_0px_0px_#B9FF66] hover:shadow-[4px_4px_0px_0px_#B9FF66] uppercase tracking-wide"
            >
              <Download className="h-4 w-4 mr-2" />
              导出数据
            </Button>
          </div>
        </div>

        {/* Positivus风格统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-[#B9FF66] border-3 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black font-medium text-sm uppercase tracking-wide">
                    总考试数
                  </p>
                  <p className="text-4xl font-black text-black">
                    {stats.totalExams.toLocaleString()}
                  </p>
                </div>
                <div className="bg-black rounded-full p-3">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-3 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black font-medium text-sm uppercase tracking-wide">
                    总学生数
                  </p>
                  <p className="text-4xl font-black text-black">
                    {stats.totalStudents.toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#B9FF66] rounded-full p-3">
                  <Users className="h-8 w-8 text-black" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-3 border-black shadow-[4px_4px_0px_0px_#B9FF66] hover:shadow-[6px_6px_0px_0px_#B9FF66] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium text-sm uppercase tracking-wide">
                    成绩记录
                  </p>
                  <p className="text-4xl font-black text-white">
                    {stats.totalGrades.toLocaleString()}
                  </p>
                </div>
                <div className="bg-[#B9FF66] rounded-full p-3">
                  <BarChart3 className="h-8 w-8 text-black" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#B9FF66] border-3 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black font-medium text-sm uppercase tracking-wide">
                    平均分
                  </p>
                  <p className="text-4xl font-black text-black">
                    {stats.averageScore.toFixed(1)}
                  </p>
                </div>
                <div className="bg-black rounded-full p-3">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Positivus风格主要内容区域 */}
        <Card className="border-3 border-black shadow-[4px_4px_0px_0px_#000] bg-white">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            {/* Positivus风格标签栏 */}
            <div className="border-b-3 border-black bg-white">
              <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-6 h-auto p-0 bg-transparent gap-2">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-black data-[state=active]:bg-[#B9FF66] data-[state=active]:border-3 data-[state=active]:shadow-[2px_2px_0px_0px_#000] font-bold uppercase text-xs tracking-wide"
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Positivus风格标签描述 */}
              <div className="px-6 pb-4 mt-4">
                <p className="text-sm font-medium text-black bg-[#B9FF66] inline-block px-3 py-1 border-2 border-black">
                  {tabs.find((tab) => tab.id === activeTab)?.description}
                </p>
              </div>
            </div>

            {/* Positivus风格标签内容 */}
            <div className="bg-white">
              {/* 数据概览 */}
              <TabsContent value="overview" className="m-0 p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 系统健康状况 */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        系统健康状况
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {stats.systemHealth.dataGateway === "healthy"
                              ? "正常"
                              : "异常"}
                          </div>
                          <div className="text-sm text-gray-600">数据网关</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {stats.systemHealth.cacheHitRate.toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">
                            缓存命中率
                          </div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {stats.systemHealth.responseTime}ms
                          </div>
                          <div className="text-sm text-gray-600">响应时间</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 最近活动 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-blue-600" />
                        最近活动
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          {stats.recentActivity.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                            >
                              <div
                                className={`w-2 h-2 rounded-full mt-2 ${
                                  activity.type === "exam_created"
                                    ? "bg-blue-500"
                                    : activity.type === "grade_added"
                                      ? "bg-green-500"
                                      : "bg-purple-500"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {activity.title}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(
                                    activity.timestamp
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                {/* 数据统计图表预览 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-indigo-600" />
                        考试类型分布
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        图表组件开发中...
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5 text-emerald-600" />
                        成绩趋势分析
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 flex items-center justify-center text-gray-500">
                        图表组件开发中...
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
              <TabsContent value="grades" className="m-0 p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  {/* 统计概览 */}
                  <StatisticsOverview />

                  <Separator />

                  {/* 成绩数据表 */}
                  <OptimizedGradeDataTable />
                </div>
              </TabsContent>

              {/* 高级分析 */}
              <TabsContent value="advanced" className="m-0">
                <div className="p-6">
                  <CompleteAnalyticsDashboard />
                </div>
              </TabsContent>

              {/* 学生管理 */}
              <TabsContent value="students" className="m-0 p-6">
                <Card>
                  <CardHeader>
                    <CardTitle>学生管理</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">学生管理功能开发中...</p>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        📋 <strong>计划功能:</strong>{" "}
                        学生档案管理、学习轨迹分析、个性化推荐
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* 系统设置 */}
              <TabsContent value="settings" className="m-0 p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>数据源配置</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div>
                            <p className="font-medium">Supabase</p>
                            <p className="text-sm text-gray-600">当前数据源</p>
                          </div>
                          <Badge variant="secondary">活跃</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">自建服务器</p>
                            <p className="text-sm text-gray-600">备用数据源</p>
                          </div>
                          <Badge variant="outline">未配置</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>缓存管理</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>缓存命中率</span>
                          <span className="font-semibold">
                            {stats.systemHealth.cacheHitRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>平均响应时间</span>
                          <span className="font-semibold">
                            {stats.systemHealth.responseTime}ms
                          </span>
                        </div>
                        <Separator />
                        <Button
                          variant="outline"
                          onClick={() => domainServices.clearAllCaches()}
                          className="w-full"
                        >
                          清理所有缓存
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default GradeDataCenter;
