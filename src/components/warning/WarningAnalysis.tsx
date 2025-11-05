import React, { useState, useEffect, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Settings,
  Users,
  List,
  Activity,
  Grid3x3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// 教师友好的主要组件
import TeacherWarningDashboard from "./TeacherWarningDashboard";
import WarningHeatmap from "./WarningHeatmap";
import WarningDetailSidebar from "./WarningDetailSidebar";
import WarningTrendChart from "./WarningTrendChart";

// 懒加载次要组件
const WarningList = lazy(() => import("./WarningList"));
const WarningRules = lazy(() => import("./WarningRules"));

// 加载占位符组件
const LoadingFallback = () => (
  <Card className="p-8 flex items-center justify-center">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
      <p className="text-sm text-gray-500">加载中，请稍候...</p>
    </div>
  </Card>
);

// 教师友好的预警分析组件
const WarningAnalysis: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedWarning, setSelectedWarning] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 刷新数据
  const handleRefresh = () => {
    setIsLoading(true);
    // 模拟数据刷新
    setTimeout(() => {
      setIsLoading(false);
      toast.success("数据已刷新");
    }, 1000);
  };

  // 打开预警详情
  const handleWarningClick = (warning: any) => {
    setSelectedWarning(warning);
    setSidebarOpen(true);
  };

  // 处理预警
  const handleResolveWarning = (warningId: string) => {
    toast.success("预警已标记为已处理");
    setSidebarOpen(false);
  };

  // 忽略预警
  const handleDismissWarning = (warningId: string) => {
    toast.info("预警已暂时忽略");
    setSidebarOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* 主要内容区域 - 简化为单一的教师友好界面 */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-5 bg-gray-100">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <Users className="h-4 w-4" />
            学生预警
          </TabsTrigger>
          <TabsTrigger
            value="heatmap"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <Grid3x3 className="h-4 w-4" />
            热力图
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <Activity className="h-4 w-4" />
            趋势分析
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <List className="h-4 w-4" />
            详细列表
          </TabsTrigger>
          <TabsTrigger
            value="rules"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <Settings className="h-4 w-4" />
            规则设置
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <TeacherWarningDashboard />
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-6">
          <WarningHeatmap onRefresh={handleRefresh} />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <WarningTrendChart
            showPrediction={true}
            showComparison={true}
            onDataRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          <Suspense fallback={<LoadingFallback />}>
            <WarningList />
          </Suspense>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Suspense fallback={<LoadingFallback />}>
            <WarningRules />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* 预警详情侧边栏 */}
      <WarningDetailSidebar
        warning={selectedWarning}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onResolve={handleResolveWarning}
        onDismiss={handleDismissWarning}
      />
    </div>
  );
};

export default WarningAnalysis;
