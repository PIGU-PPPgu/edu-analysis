"use client";

/**
 * Demo对比页面
 * 4个Tab选择不同的UI交互方案
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DemoASidebarLayout } from "./Demo-A-SidebarLayout";
import { DemoBTabsLayout } from "./Demo-B-TabsLayout";
import { DemoCSmartDashboard } from "./Demo-C-SmartDashboard";
import { DemoDRouterLayout } from "./Demo-D-RouterLayout";
import { Info } from "lucide-react";

export function DemoComparison() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b p-6">
        <h1 className="text-3xl font-bold mb-2">增值评价UI交互方案对比</h1>
        <p className="text-gray-600">
          4个完整可交互的demo方案，选择最适合的交互模式
        </p>
      </div>

      <Tabs defaultValue="a" className="p-6">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="a">
            方案A: 侧边栏
            <span className="ml-2 text-xs text-gray-500">(专业工具)</span>
          </TabsTrigger>
          <TabsTrigger value="b">
            方案B: Tab分类
            <span className="ml-2 text-xs text-gray-500">(最小改动)</span>
          </TabsTrigger>
          <TabsTrigger value="c">
            方案C: 智能工作台
            <span className="ml-2 text-xs text-gray-500">(用户体验)</span>
          </TabsTrigger>
          <TabsTrigger value="d">
            方案D: URL路由
            <span className="ml-2 text-xs text-gray-500">(技术最优)</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="a">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>方案A优势:</strong> 报告间切换1次点击 |
              侧边栏始终可见不迷路 | 面包屑显示位置 |
              专业分析工具风格(类似Figma/Notion)
            </AlertDescription>
          </Alert>
          <div
            className="bg-white rounded-lg border overflow-hidden"
            style={{ height: "calc(100vh - 280px)" }}
          >
            <DemoASidebarLayout />
          </div>
        </TabsContent>

        <TabsContent value="b">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>方案B优势:</strong> 代码改动最小(~150行) |
              Tab减少视觉信息量 | 卡片点击展开无需跳转 | 保持现有设计语言
            </AlertDescription>
          </Alert>
          <div
            className="bg-white rounded-lg border overflow-hidden"
            style={{ height: "calc(100vh - 280px)" }}
          >
            <DemoBTabsLayout />
          </div>
        </TabsContent>

        <TabsContent value="c">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>方案C优势:</strong> 全局搜索快速定位 |
              常用报告和历史记录提效 | 相关推荐引导发现 | 个性化用户体验
            </AlertDescription>
          </Alert>
          <div
            className="bg-white rounded-lg border overflow-hidden"
            style={{ height: "calc(100vh - 280px)" }}
          >
            <DemoCSmartDashboard />
          </div>
        </TabsContent>

        <TabsContent value="d">
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>方案D优势:</strong> URL路由支持书签/分享 |
              全局筛选状态保留不丢失 | 浏览器前进/后退支持 | 符合Web标准
            </AlertDescription>
          </Alert>
          <div
            className="bg-white rounded-lg border overflow-hidden"
            style={{ height: "calc(100vh - 280px)" }}
          >
            <DemoDRouterLayout />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
