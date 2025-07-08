/**
 * 🚀 性能监控页面
 * 集成性能仪表板和系统监控功能的综合页面
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Activity,
  Monitor,
  BarChart3,
  Shield,
  Zap,
  Info,
  AlertTriangle,
  CheckCircle,
  Database,
  Globe,
  TrendingUp
} from 'lucide-react';

import PerformanceDashboard from '@/components/performance/PerformanceDashboard';
import SystemMonitoringDashboard from '@/components/monitoring/SystemMonitoringDashboard';
import ErrorBoundary from '@/components/performance/ErrorBoundary';

const PerformanceMonitoring: React.FC = () => {
  const [activeTab, setActiveTab] = useState('performance');

  return (
    <div className="min-h-screen bg-white">
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-black text-[#191A23] leading-tight">
            性能监控中心
            <span className="inline-block ml-4 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-2xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
              MONITORING
            </span>
          </h1>
          <p className="text-xl text-[#6B7280] font-medium max-w-3xl mx-auto">
            实时监控系统性能、追踪错误、分析用户行为，确保最佳的用户体验
          </p>
        </div>

        {/* 快速状态概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66] transition-all">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-[#B9FF66] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-black" />
              </div>
              <h3 className="font-black text-black text-lg">系统状态</h3>
              <p className="text-sm text-[#6B7280] font-medium">运行正常</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280] transition-all">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-[#6B7280] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-black text-lg">性能优化</h3>
              <p className="text-sm text-[#6B7280] font-medium">已启用</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#F59E0B] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#F59E0B] transition-all">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-[#F59E0B] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-black text-lg">错误追踪</h3>
              <p className="text-sm text-[#6B7280] font-medium">实时监控</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all">
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-[#191A23] border-2 border-black rounded-full flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-black text-black text-lg">数据优化</h3>
              <p className="text-sm text-[#6B7280] font-medium">高性能</p>
            </CardContent>
          </Card>
        </div>

        {/* 重要提示 */}
        <Alert className="border-2 border-[#B9FF66] bg-[#B9FF66]/10">
          <Info className="h-4 w-4" />
          <AlertDescription className="font-medium">
            <div className="space-y-2">
              <p className="font-bold text-black">
                🚀 系统性能优化功能已启用
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-[#6B7280]">
                <ul className="space-y-1 list-disc list-inside">
                  <li>虚拟滚动和懒加载优化大数据渲染</li>
                  <li>智能缓存减少重复数据请求</li>
                  <li>错误边界自动恢复异常组件</li>
                  <li>内存监控防止资源泄露</li>
                </ul>
                <ul className="space-y-1 list-disc list-inside">
                  <li>数据库查询优化提升响应速度</li>
                  <li>物化视图缓存常用统计数据</li>
                  <li>批量处理减少网络请求</li>
                  <li>性能指标实时监控和预警</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="grid w-fit grid-cols-2 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
              <TabsTrigger 
                value="performance" 
                className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-8 py-4 text-lg"
              >
                <BarChart3 className="w-6 h-6" />
                <span>性能仪表板</span>
              </TabsTrigger>
              <TabsTrigger 
                value="monitoring" 
                className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-8 py-4 text-lg"
              >
                <Monitor className="w-6 h-6" />
                <span>系统监控</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 性能仪表板 */}
          <TabsContent value="performance" className="space-y-6">
            <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
              <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                <CardTitle className="text-black font-black text-2xl flex items-center gap-3">
                  <BarChart3 className="w-8 h-8" />
                  组件性能监控
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-bold">实时监控中</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ErrorBoundary 
                  componentName="PerformanceDashboard"
                  enableRecovery={true}
                  showErrorDetails={true}
                >
                  <PerformanceDashboard />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 系统监控 */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#191A23]">
              <CardHeader className="bg-[#191A23] border-b-2 border-black">
                <CardTitle className="text-white font-black text-2xl flex items-center gap-3">
                  <Monitor className="w-8 h-8" />
                  系统健康监控
                  <div className="flex items-center gap-2 ml-auto">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-bold">运行正常</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ErrorBoundary 
                  componentName="SystemMonitoringDashboard"
                  enableRecovery={true}
                  showErrorDetails={true}
                >
                  <SystemMonitoringDashboard />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 技术说明 */}
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
          <CardHeader className="bg-[#6B7280] border-b-2 border-black">
            <CardTitle className="text-white font-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              性能优化技术栈
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-black text-black text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#B9FF66]" />
                  前端优化
                </h4>
                <ul className="space-y-2 text-sm text-[#6B7280] list-disc list-inside">
                  <li>React.memo 和 useMemo 避免不必要渲染</li>
                  <li>虚拟滚动处理大数据集</li>
                  <li>懒加载和代码分割</li>
                  <li>Web Workers 处理重计算</li>
                  <li>Service Worker 缓存策略</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-black text-lg flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#F59E0B]" />
                  数据库优化
                </h4>
                <ul className="space-y-2 text-sm text-[#6B7280] list-disc list-inside">
                  <li>复合索引优化查询性能</li>
                  <li>物化视图缓存聚合数据</li>
                  <li>批量操作减少I/O</li>
                  <li>连接池和查询优化</li>
                  <li>数据分页和过滤</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-black text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#EF4444]" />
                  监控体系
                </h4>
                <ul className="space-y-2 text-sm text-[#6B7280] list-disc list-inside">
                  <li>Web Vitals 性能指标</li>
                  <li>错误边界和自动恢复</li>
                  <li>实时日志和告警</li>
                  <li>用户行为分析</li>
                  <li>健康检查和预警</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceMonitoring;