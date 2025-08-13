import React, { useState, useEffect, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BarChart3, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// 直接导入重量级组件
import WarningDashboard from "./WarningDashboard";

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

// 基础预警分析组件（简化版本）
const WarningAnalysis: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // 刷新数据
  const handleRefresh = () => {
    setIsLoading(true);
    // 模拟数据刷新
    setTimeout(() => {
      setIsLoading(false);
      toast.success("数据已刷新");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#B9FF66] rounded-full border-2 border-black">
            <AlertTriangle className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#191A23] tracking-tight">
              预警分析
            </h1>
            <p className="text-[#191A23]/70 font-medium mt-1">
              学生预警数据分析与风险评估
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="border-2 border-black bg-white hover:bg-gray-50 font-bold shadow-[2px_2px_0px_0px_#000]"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          {isLoading ? "刷新中..." : "刷新数据"}
        </Button>
      </div>

      {/* 主要内容区域 */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            <BarChart3 className="h-4 w-4" />
            概览分析
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            预警列表
          </TabsTrigger>
          <TabsTrigger
            value="rules"
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black"
          >
            预警规则
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <WarningDashboard />
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
    </div>
  );
};

export default WarningAnalysis;
