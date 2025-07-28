import { useEffect, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface CacheInfo {
  cache_key: string;
  last_updated: string;
  expiry_seconds: number;
  version: number;
  is_active: boolean;
  is_valid: boolean;
}

interface CachedQueryOptions<T> {
  // 缓存键名，用于识别此查询
  cacheKey: string;

  // 获取数据的查询函数，当缓存失效或不存在时调用
  queryFn: () => Promise<T>;

  // 缓存有效期(毫秒)，默认10分钟
  cacheDuration?: number;

  // 是否使用服务器缓存控制，如果为true，将首先检查服务器缓存是否有效
  useServerCache?: boolean;

  // 是否在挂载时自动获取数据
  autoFetch?: boolean;

  // Supabase 客户端，默认使用全局配置的客户端
  client?: SupabaseClient;

  // 调试模式
  debug?: boolean;
}

interface CachedQueryResult<T> {
  // 查询数据
  data: T | null;

  // 是否正在加载
  loading: boolean;

  // 错误信息
  error: Error | null;

  // 数据是否来自缓存
  fromCache: boolean;

  // 缓存信息
  cacheInfo: {
    timestamp: number;
    expires: number;
    isValid: boolean;
    serverControlled: boolean;
    version?: number;
  } | null;

  // 刷新数据的函数
  refetch: () => Promise<void>;

  // 清除缓存的函数
  clearCache: () => void;
}

// 客户端缓存存储
const clientCache: Record<
  string,
  {
    data: any;
    timestamp: number;
    expires: number;
    version?: number;
  }
> = {};

/**
 * 使用缓存的查询钩子
 * 自动管理客户端缓存和服务器缓存，提高查询性能
 */
export function useCachedQuery<T = any>(
  options: CachedQueryOptions<T>
): CachedQueryResult<T> {
  const {
    cacheKey,
    queryFn,
    cacheDuration = 10 * 60 * 1000, // 默认10分钟
    useServerCache = true,
    autoFetch = true,
    client = supabase,
    debug = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [cacheInfo, setCacheInfo] =
    useState<CachedQueryResult<T>["cacheInfo"]>(null);

  // 调试日志
  const logDebug = (...args: any[]) => {
    if (debug) {
      console.log(`[CachedQuery:${cacheKey}]`, ...args);
    }
  };

  // 检查客户端缓存
  const checkClientCache = () => {
    const cache = clientCache[cacheKey];
    if (cache && cache.expires > Date.now()) {
      logDebug("使用客户端缓存", cache);
      setData(cache.data);
      setLoading(false);
      setFromCache(true);
      setCacheInfo({
        timestamp: cache.timestamp,
        expires: cache.expires,
        isValid: true,
        serverControlled: false,
        version: cache.version,
      });
      return true;
    }
    return false;
  };

  // 检查服务器缓存控制
  const checkServerCache = async (cachedVersion?: number): Promise<boolean> => {
    if (!useServerCache) return false;

    try {
      const { data: cacheData, error } = await client.rpc("get_cache_info", {
        p_cache_key: cacheKey,
      });

      if (error) {
        logDebug("服务器缓存检查失败", error);
        return false;
      }

      const serverCacheInfo: CacheInfo = cacheData[0];

      if (!serverCacheInfo) {
        logDebug("服务器缓存信息不存在");
        return false;
      }

      // 如果提供了版本号，检查是否匹配
      if (
        cachedVersion !== undefined &&
        serverCacheInfo.version !== cachedVersion
      ) {
        logDebug("缓存版本不匹配", {
          cachedVersion,
          serverVersion: serverCacheInfo.version,
        });
        return false;
      }

      logDebug("服务器缓存信息", serverCacheInfo);

      // 更新缓存信息状态
      setCacheInfo({
        timestamp: new Date(serverCacheInfo.last_updated).getTime(),
        expires:
          new Date(serverCacheInfo.last_updated).getTime() +
          serverCacheInfo.expiry_seconds * 1000,
        isValid: serverCacheInfo.is_valid,
        serverControlled: true,
        version: serverCacheInfo.version,
      });

      return serverCacheInfo.is_valid;
    } catch (e) {
      logDebug("服务器缓存检查异常", e);
      return false;
    }
  };

  // 执行查询并更新缓存
  const executeQuery = async () => {
    setLoading(true);
    setError(null);

    try {
      // 执行查询函数
      const result = await queryFn();

      // 获取服务器缓存版本(如果使用服务器缓存)
      let serverVersion: number | undefined;
      if (useServerCache) {
        try {
          const { data: cacheData } = await client.rpc("get_cache_info", {
            p_cache_key: cacheKey,
          });
          serverVersion = cacheData?.[0]?.version;
        } catch (e) {
          logDebug("获取服务器缓存版本失败", e);
        }
      }

      // 更新数据和缓存
      setData(result);
      setFromCache(false);

      // 更新客户端缓存
      const now = Date.now();
      clientCache[cacheKey] = {
        data: result,
        timestamp: now,
        expires: now + cacheDuration,
        version: serverVersion,
      };

      // 更新缓存信息状态
      setCacheInfo({
        timestamp: now,
        expires: now + cacheDuration,
        isValid: true,
        serverControlled: useServerCache,
        version: serverVersion,
      });

      logDebug("查询执行成功，已更新缓存", {
        result,
        cacheInfo: clientCache[cacheKey],
      });
    } catch (e: any) {
      setError(e instanceof Error ? e : new Error(e.message || "查询失败"));
      logDebug("查询执行失败", e);
    } finally {
      setLoading(false);
    }
  };

  // 刷新数据
  const refetch = async () => {
    logDebug("手动刷新数据");
    await executeQuery();
  };

  // 清除缓存
  const clearCache = () => {
    logDebug("清除缓存");
    delete clientCache[cacheKey];
    setCacheInfo(null);
    setFromCache(false);

    // 如果使用服务器缓存，也尝试使其失效
    if (useServerCache) {
      client
        .rpc("invalidate_cache", { p_cache_key: cacheKey })
        .then(() => logDebug("服务器缓存已失效"))
        .catch((e) => logDebug("使服务器缓存失效失败", e));
    }
  };

  // 数据获取逻辑
  const fetchData = async () => {
    // 1. 首先检查客户端缓存
    if (checkClientCache()) {
      // 异步检查服务器缓存是否仍然有效(如果使用)
      if (useServerCache) {
        const cachedVersion = clientCache[cacheKey]?.version;
        const isServerCacheValid = await checkServerCache(cachedVersion);

        // 如果服务器缓存无效，重新获取数据
        if (!isServerCacheValid) {
          logDebug("服务器缓存已失效，重新获取数据");
          await executeQuery();
        }
      }
      return;
    }

    // 2. 如果客户端缓存无效且使用服务器缓存，检查服务器缓存状态
    if (useServerCache) {
      const isServerCacheValid = await checkServerCache();
      // 如果服务器端认为缓存有效，但客户端缓存已过期或不存在
      // 这表示需要从数据库获取实际数据，但不必使服务器缓存失效
      if (isServerCacheValid) {
        logDebug("服务器缓存有效，但客户端缓存无效，执行查询获取数据");
      }
    }

    // 3. 都无效或不使用服务器缓存，直接查询
    await executeQuery();
  };

  // 组件挂载或缓存键变化时获取数据
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    } else {
      setLoading(false);
    }

    // 清理函数
    return () => {
      // 如需清理特定资源，可在此处理
    };
  }, [cacheKey]); // 仅当缓存键变化时重新获取

  return {
    data,
    loading,
    error,
    fromCache,
    cacheInfo,
    refetch,
    clearCache,
  };
}

export default useCachedQuery;
