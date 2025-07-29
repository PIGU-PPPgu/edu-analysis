/**
 * 🚀 Master-Frontend: Bundle性能监控组件
 * 监控懒加载效果、Bundle大小和加载性能
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Package,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BarChart3,
  FileText,
} from "lucide-react";
import { useRoutePreloader } from "@/utils/routePreloader";

interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  preloadedRoutes: number;
  cacheHits: number;
  navigationTime: number;
  resourceTimings: PerformanceResourceTiming[];
}

interface BundleChunk {
  name: string;
  size: number;
  type: "js" | "css" | "asset";
  loadTime: number;
  cached: boolean;
}

const BundlePerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [chunks, setChunks] = useState<BundleChunk[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { getStats } = useRoutePreloader();

  useEffect(() => {
    collectPerformanceMetrics();
    const interval = setInterval(collectPerformanceMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const collectPerformanceMetrics = () => {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const preloaderStats = getStats();
      
      // 分析Bundle chunks
      const bundleChunks: BundleChunk[] = resources
        .filter(resource => {
          const url = new URL(resource.name);
          return url.pathname.includes('/js/') || url.pathname.includes('/css/');
        })
        .map(resource => {
          const url = new URL(resource.name);
          const fileName = url.pathname.split('/').pop() || '';
          const isJS = fileName.endsWith('.js');
          const isCSS = fileName.endsWith('.css');
          
          return {
            name: fileName.replace(/\-[a-f0-9]{8,}\./, '.'), // 移除hash
            size: resource.transferSize || 0,
            type: isJS ? 'js' : isCSS ? 'css' : 'asset',
            loadTime: resource.responseEnd - resource.startTime,
            cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
          } as BundleChunk;
        });

      setChunks(bundleChunks);

      const newMetrics: PerformanceMetrics = {
        bundleSize: bundleChunks.reduce((total, chunk) => total + chunk.size, 0),
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        preloadedRoutes: preloaderStats.preloadedCount,
        cacheHits: bundleChunks.filter(chunk => chunk.cached).length,
        navigationTime: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        resourceTimings: resources,
      };

      setMetrics(newMetrics);
    } catch (error) {
      console.warn('Failed to collect performance metrics:', error);
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const getPerformanceGrade = (loadTime: number): { grade: string; color: string } => {
    if (loadTime < 1000) return { grade: 'A+', color: 'bg-[#B9FF66] text-black' };
    if (loadTime < 2000) return { grade: 'A', color: 'bg-[#B9FF66] text-black' };
    if (loadTime < 3000) return { grade: 'B', color: 'bg-[#F7931E] text-white' };
    if (loadTime < 5000) return { grade: 'C', color: 'bg-[#6B7280] text-white' };
    return { grade: 'D', color: 'bg-[#EF4444] text-white' };
  };

  if (!metrics) {
    return (
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardContent className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-[#B9FF66] border-t-transparent rounded-full" />
          <span className="ml-3 font-bold text-[#191A23]">收集性能数据中...</span>
        </CardContent>
      </Card>
    );
  }

  const performanceGrade = getPerformanceGrade(metrics.loadTime);

  return (
    <div className="space-y-6">
      {/* 性能概览 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="flex items-center gap-2 text-[#191A23] font-black">
            <Zap className="w-5 h-5" />
            Bundle性能监控
            <Badge className={`ml-auto ${performanceGrade.color} border-2 border-black font-bold`}>
              {performanceGrade.grade}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[#F8F8F8] border-2 border-black rounded-lg">
              <Package className="w-8 h-8 mx-auto mb-2 text-[#191A23]" />
              <h3 className="text-2xl font-black text-[#191A23]">
                {formatSize(metrics.bundleSize)}
              </h3>
              <p className="text-sm text-[#6B7280] font-medium">Bundle大小</p>
            </div>

            <div className="text-center p-4 bg-[#F8F8F8] border-2 border-black rounded-lg">
              <Clock className="w-8 h-8 mx-auto mb-2 text-[#191A23]" />
              <h3 className="text-2xl font-black text-[#191A23]">
                {formatTime(metrics.loadTime)}
              </h3>
              <p className="text-sm text-[#6B7280] font-medium">加载时间</p>
            </div>

            <div className="text-center p-4 bg-[#F8F8F8] border-2 border-black rounded-lg">
              <Download className="w-8 h-8 mx-auto mb-2 text-[#191A23]" />
              <h3 className="text-2xl font-black text-[#191A23]">
                {metrics.preloadedRoutes}
              </h3>
              <p className="text-sm text-[#6B7280] font-medium">预加载路由</p>
            </div>

            <div className="text-center p-4 bg-[#F8F8F8] border-2 border-black rounded-lg">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-[#191A23]" />
              <h3 className="text-2xl font-black text-[#191A23]">
                {metrics.cacheHits}
              </h3>
              <p className="text-sm text-[#6B7280] font-medium">缓存命中</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bundle分析 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
        <CardHeader className="bg-[#6B7280] border-b-2 border-black">
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <BarChart3 className="w-5 h-5" />
            Bundle分析
            <Button
              variant="outline"
              size="sm"
              onClick={collectPerformanceMetrics}
              className="ml-auto border-2 border-white bg-white text-[#6B7280] font-bold hover:bg-gray-100"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              刷新
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {chunks
              .filter(chunk => chunk.type === 'js')
              .sort((a, b) => b.size - a.size)
              .slice(0, 10)
              .map((chunk, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#F8F8F8] border-2 border-black rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-[#191A23]" />
                    <div>
                      <h4 className="font-bold text-[#191A23]">{chunk.name}</h4>
                      <p className="text-sm text-[#6B7280]">
                        {formatTime(chunk.loadTime)} • {chunk.type.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {chunk.cached && (
                      <Badge className="bg-[#B9FF66] text-black border-2 border-black font-bold">
                        缓存
                      </Badge>
                    )}
                    <span className="font-bold text-[#191A23]">
                      {formatSize(chunk.size)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 性能建议 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#F7931E]">
        <CardHeader className="bg-[#F7931E] border-b-2 border-black">
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <AlertCircle className="w-5 h-5" />
            性能建议
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {metrics.bundleSize > 500000 && (
              <div className="p-3 bg-[#FEF3CD] border-2 border-[#F59E0B] rounded-lg">
                <p className="text-sm font-medium text-[#92400E]">
                  📦 Bundle大小超过500KB，建议进一步优化代码分割
                </p>
              </div>
            )}
            
            {metrics.loadTime > 3000 && (
              <div className="p-3 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-lg">
                <p className="text-sm font-medium text-[#991B1B]">
                  ⏱️ 页面加载时间超过3秒，考虑启用更多预加载策略
                </p>
              </div>
            )}
            
            {metrics.preloadedRoutes < 2 && (
              <div className="p-3 bg-[#E0F2FE] border-2 border-[#0284C7] rounded-lg">
                <p className="text-sm font-medium text-[#0C4A6E]">
                  🚀 预加载路由较少，可以增加更多关键路由的预加载
                </p>
              </div>
            )}
            
            {metrics.cacheHits < chunks.length * 0.3 && (
              <div className="p-3 bg-[#F3E8FF] border-2 border-[#9333EA] rounded-lg">
                <p className="text-sm font-medium text-[#581C87]">
                  💾 缓存命中率较低，检查缓存策略配置
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BundlePerformanceMonitor;