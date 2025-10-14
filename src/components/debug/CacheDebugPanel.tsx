/**
 * 缓存调试面板
 * 用于开发环境下监控缓存性能和状态
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCacheStats, clearAllCache } from "@/utils/cacheHelpers";
import { Trash2, RefreshCw, BarChart3, Database } from "lucide-react";

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  hitRatio: number;
}

export function CacheDebugPanel() {
  const [stats, setStats] = useState<CacheStats>({
    totalEntries: 0,
    validEntries: 0,
    expiredEntries: 0,
    hitRatio: 0,
  });
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  const updateStats = () => {
    setStats(getCacheStats());
  };

  useEffect(() => {
    updateStats();

    // 每5秒更新一次统计
    const interval = setInterval(updateStats, 5000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleClearCache = () => {
    clearAllCache();
    updateStats();
  };

  const handleRefresh = () => {
    updateStats();
  };

  const getHitRatioColor = (ratio: number) => {
    if (ratio >= 0.8) return "bg-green-100 text-green-800";
    if (ratio >= 0.6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getHealthStatus = () => {
    const { validEntries, totalEntries, hitRatio } = stats;

    if (totalEntries === 0)
      return { status: "idle", color: "bg-gray-100 text-gray-800" };
    if (hitRatio >= 0.8 && validEntries > totalEntries * 0.7) {
      return { status: "excellent", color: "bg-green-100 text-green-800" };
    }
    if (hitRatio >= 0.6) {
      return { status: "good", color: "bg-yellow-100 text-yellow-800" };
    }
    return { status: "needs-attention", color: "bg-red-100 text-red-800" };
  };

  const health = getHealthStatus();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            缓存监控
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCache}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* 整体健康状态 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">健康状态:</span>
          <Badge variant="secondary" className={health.color}>
            {health.status}
          </Badge>
        </div>

        {/* 缓存统计 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-600">总条目:</span>
            <span className="font-mono">{stats.totalEntries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">有效:</span>
            <span className="font-mono text-green-600">
              {stats.validEntries}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">过期:</span>
            <span className="font-mono text-red-600">
              {stats.expiredEntries}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">命中率:</span>
            <Badge
              variant="secondary"
              className={getHitRatioColor(stats.hitRatio)}
            >
              {(stats.hitRatio * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* 性能指标 */}
        <div className="border-t pt-2">
          <div className="flex items-center gap-1 mb-2">
            <BarChart3 className="h-3 w-3" />
            <span className="text-gray-600">性能指标</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">内存效率:</span>
              <span className="font-mono">
                {stats.validEntries > 0
                  ? `${((stats.validEntries / stats.totalEntries) * 100).toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">缓存收益:</span>
              <span className="font-mono">
                {stats.hitRatio > 0
                  ? `${(stats.hitRatio * stats.totalEntries).toFixed(0)}次命中`
                  : "无数据"}
              </span>
            </div>
          </div>
        </div>

        {/* 操作建议 */}
        {stats.expiredEntries > stats.totalEntries * 0.3 && (
          <div className="border-t pt-2">
            <div className="text-amber-600 text-xs">⚠️ 建议清理过期缓存</div>
          </div>
        )}

        {stats.hitRatio < 0.5 && stats.totalEntries > 10 && (
          <div className="border-t pt-2">
            <div className="text-red-600 text-xs">
              🔴 缓存命中率偏低，检查缓存策略
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
