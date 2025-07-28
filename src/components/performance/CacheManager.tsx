import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, BarChart3, Zap, Clock, TrendingUp } from "lucide-react";
import { warningAnalysisCache } from "../../utils/performanceCache";
import { getWarningStatistics } from "../../services/warningService";
import { getExams } from "../../services/examService";
import { getWarningHistoryComparison } from "../../services/warningHistoryService";

interface CacheStats {
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  topKeys: Array<{ key: string; hits: number; misses: number; ratio: number }>;
}

function CacheManager() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [lastPreload, setLastPreload] = useState<Date | null>(null);

  // 获取缓存统计
  const loadCacheStats = async () => {
    try {
      const cacheStats = warningAnalysisCache["cacheManager"].getStats();
      setStats(cacheStats);
    } catch (error) {
      console.error("获取缓存统计失败:", error);
    }
  };

  // 预热缓存
  const preloadCache = async () => {
    setIsPreloading(true);
    try {
      console.log("[CacheManager] 开始预热缓存...");

      // 并行预热常用数据
      await Promise.allSettled([
        // 预警统计数据
        warningAnalysisCache.getWarningStats(() => getWarningStatistics()),

        // 考试数据
        warningAnalysisCache.getExamData(() => getExams()),

        // 历史对比数据 - 最近7天
        warningAnalysisCache.getHistoryComparison(
          () => getWarningHistoryComparison("7d"),
          "7d"
        ),

        // 历史对比数据 - 最近30天
        warningAnalysisCache.getHistoryComparison(
          () => getWarningHistoryComparison("30d"),
          "30d"
        ),
      ]);

      setLastPreload(new Date());
      console.log("[CacheManager] 缓存预热完成");

      // 更新统计
      await loadCacheStats();
    } catch (error) {
      console.error("[CacheManager] 缓存预热失败:", error);
    } finally {
      setIsPreloading(false);
    }
  };

  // 清除缓存
  const clearCache = () => {
    warningAnalysisCache.invalidateWarningData();
    warningAnalysisCache.invalidateExamData();
    setStats(null);
    console.log("[CacheManager] 缓存已清除");
  };

  // 组件挂载时加载统计
  useEffect(() => {
    loadCacheStats();

    // 定期更新统计
    const interval = setInterval(loadCacheStats, 30000); // 30秒更新一次

    return () => clearInterval(interval);
  }, []);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <div className="space-y-6">
      {/* 缓存概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            缓存性能概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPercentage(stats.hitRate)}
                </div>
                <div className="text-sm text-gray-500">命中率</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(stats.totalHits)}
                </div>
                <div className="text-sm text-gray-500">总命中数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatNumber(stats.totalMisses)}
                </div>
                <div className="text-sm text-gray-500">总未命中数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(stats.totalHits + stats.totalMisses)}
                </div>
                <div className="text-sm text-gray-500">总请求数</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">加载中...</div>
          )}
        </CardContent>
      </Card>

      {/* 缓存操作 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            缓存管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={preloadCache}
              disabled={isPreloading}
              className="flex items-center gap-2"
              variant="default"
            >
              <RefreshCw
                className={`h-4 w-4 ${isPreloading ? "animate-spin" : ""}`}
              />
              {isPreloading ? "预热中..." : "预热缓存"}
            </Button>

            <Button
              onClick={clearCache}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              清除缓存
            </Button>

            <Button
              onClick={loadCacheStats}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              刷新统计
            </Button>
          </div>

          {lastPreload && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              上次预热: {lastPreload.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 热门缓存键 */}
      {stats && stats.topKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              热门缓存键
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topKeys.map((item, index) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">
                      {item.key}
                    </div>
                    <div className="text-xs text-gray-500">
                      命中: {item.hits} | 未命中: {item.misses}
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <Badge
                      variant={
                        item.ratio > 0.8
                          ? "default"
                          : item.ratio > 0.5
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {formatPercentage(item.ratio)}
                    </Badge>
                    <div className="text-sm text-gray-500">#{index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 性能建议 */}
      <Card>
        <CardHeader>
          <CardTitle>性能建议</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats && (
              <>
                {stats.hitRate < 0.7 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="font-medium text-orange-800">
                      命中率偏低
                    </div>
                    <div className="text-sm text-orange-600">
                      建议增加缓存时间或优化缓存策略
                    </div>
                  </div>
                )}

                {stats.totalHits + stats.totalMisses < 100 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="font-medium text-blue-800">
                      数据样本较少
                    </div>
                    <div className="text-sm text-blue-600">
                      建议使用一段时间后再查看缓存效果
                    </div>
                  </div>
                )}

                {stats.hitRate > 0.9 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-green-800">
                      缓存效果优秀
                    </div>
                    <div className="text-sm text-green-600">
                      当前缓存策略工作良好，继续保持
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="font-medium text-gray-800">自动优化</div>
              <div className="text-sm text-gray-600">
                系统会根据使用模式自动调整缓存策略，无需手动干预
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CacheManager;
