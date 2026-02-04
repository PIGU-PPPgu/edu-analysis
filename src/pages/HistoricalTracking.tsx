"use client";

/**
 * 历次追踪主页面
 * 提供考试序列管理和历次追踪分析功能
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListOrdered, TrendingUp } from "lucide-react";
import { ExamSeriesManager } from "@/components/value-added/tracking/ExamSeriesManager";
import { TrackingDashboard } from "@/components/value-added/tracking/TrackingDashboard";

export default function HistoricalTrackingPage() {
  const [activeTab, setActiveTab] = useState("series");
  const [selectedTracking, setSelectedTracking] = useState<{
    entityType: "class" | "teacher" | "student";
    entityName: string;
    seriesName: string;
  } | null>(null);

  // 当选择查看追踪时,切换到追踪视图标签页
  const handleViewTracking = (
    entityType: "class" | "teacher" | "student",
    entityName: string,
    seriesName: string
  ) => {
    setSelectedTracking({ entityType, entityName, seriesName });
    setActiveTab("tracking");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面头部 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">历次追踪分析</h1>
        <p className="text-gray-600 mt-1">
          追踪学生、班级、教师在多次考试中的增值变化趋势
        </p>
      </div>

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="series" className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" />
            考试序列管理
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            历次追踪分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="series" className="space-y-6">
          <ExamSeriesManager />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          {selectedTracking ? (
            <TrackingDashboard
              entityType={selectedTracking.entityType}
              entityName={selectedTracking.entityName}
              seriesName={selectedTracking.seriesName}
            />
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                请先选择考试序列
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                从考试序列管理页面选择一个序列,查看历次追踪分析
              </p>
              <button
                onClick={() => setActiveTab("series")}
                className="text-blue-600 hover:underline"
              >
                前往考试序列管理 →
              </button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
