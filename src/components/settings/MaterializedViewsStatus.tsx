import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Database, BarChart2 } from "lucide-react";
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ViewStatus {
  view_name: string;
  view_exists: boolean;
  last_refresh: string | null;
  row_count: number;
}

interface CacheInfo {
  cache_key: string;
  last_updated: string;
  expiry_seconds: number;
  version: number;
  is_active: boolean;
  is_valid: boolean;
}

interface SystemEvent {
  id: string;
  event_type: string;
  event_details: any;
  created_at: string;
  severity: string;
  is_resolved: boolean;
}

// 视图名称映射表
const viewNameMapping: Record<string, string> = {
  'mv_class_score_overview': '班级统计数据',
  'mv_class_subject_stats': '学科统计数据',
  'mv_class_exam_trends': '考试趋势数据',
  'mv_class_subject_competency': '学科能力数据',
  'mv_class_subject_correlation': '学科相关性数据'
};

// 视图描述
const viewDescriptions: Record<string, string> = {
  'mv_class_score_overview': '包含班级的学生数量、作业数量、平均分和优秀率等基本统计信息',
  'mv_class_subject_stats': '按学科分组的班级成绩统计，包括平均分、中位数、及格率等',
  'mv_class_exam_trends': '班级考试成绩趋势数据，按时间和考试类型分组',
  'mv_class_subject_competency': '班级学科能力掌握情况，基于知识点的掌握度',
  'mv_class_subject_correlation': '不同学科之间的成绩相关性系数'
};

// 缓存键名称映射
const cacheKeyMapping: Record<string, string> = {
  'class_analytics': '班级分析数据',
  'subject_analytics': '学科分析数据',
  'student_profiles': '学生档案数据',
  'dashboard_stats': '仪表盘统计数据'
};

const MaterializedViewsStatus: React.FC = () => {
  const [viewStatus, setViewStatus] = useState<ViewStatus[]>([]);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo[]>([]);
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [useConcurrent, setUseConcurrent] = useState(true);
  const [activeTab, setActiveTab] = useState("view-status");
  const [showMonitoringDialog, setShowMonitoringDialog] = useState(false);

  // 获取物化视图状态
  const fetchViewStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('check_materialized_views_status');
      
      if (error) {
        console.error('获取物化视图状态失败:', error);
        toast.error(`获取物化视图状态失败: ${error.message}`);
      } else {
        setViewStatus(data || []);
      }
    } catch (e: any) {
      console.error('获取物化视图状态异常:', e);
      toast.error(`获取物化视图状态失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取缓存信息
  const fetchCacheInfo = async () => {
    try {
      // 获取所有缓存键的信息
      const cacheKeys = ['class_analytics', 'subject_analytics', 'student_profiles', 'dashboard_stats'];
      const promises = cacheKeys.map(key => 
        supabase.rpc('get_cache_info', { p_cache_key: key })
      );
      
      const results = await Promise.all(promises);
      
      const allCacheInfo: CacheInfo[] = [];
      results.forEach((result, index) => {
        if (result.error) {
          console.error(`获取缓存信息失败 (${cacheKeys[index]}):`, result.error);
        } else if (result.data && result.data.length > 0) {
          allCacheInfo.push(result.data[0]);
        }
      });
      
      setCacheInfo(allCacheInfo);
    } catch (e: any) {
      console.error('获取缓存信息异常:', e);
      toast.error(`获取缓存信息失败: ${e.message}`);
    }
  };

  // 获取系统事件
  const fetchSystemEvents = async () => {
    try {
      const { data, error } = await supabase.rpc('get_system_monitoring', { 
        p_limit: 20,
        p_event_type: null,
        p_severity: null
      });
      
      if (error) {
        console.error('获取系统事件失败:', error);
      } else {
        setSystemEvents(data || []);
      }
    } catch (e: any) {
      console.error('获取系统事件异常:', e);
    }
  };

  // 刷新所有物化视图
  const refreshAllViews = async () => {
    if (!confirm('确定要刷新所有物化视图吗？根据数据量大小，这可能需要一些时间。')) {
      return;
    }
    
    setRefreshing(true);
    try {
      const { data, error } = await supabase.rpc('rpc_refresh_materialized_views', {
        p_concurrent: useConcurrent
      });
      
      if (error) {
        console.error('刷新物化视图失败:', error);
        toast.error(`刷新物化视图失败: ${error.message}`);
      } else {
        toast.success(data || '物化视图刷新成功');
        // 刷新状态
        fetchViewStatus();
        // 同时刷新系统事件
        fetchSystemEvents();
      }
    } catch (e: any) {
      console.error('刷新物化视图异常:', e);
      toast.error(`刷新物化视图失败: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // 使缓存失效
  const invalidateCache = async (cacheKey: string) => {
    try {
      const { data, error } = await supabase.rpc('invalidate_cache', {
        p_cache_key: cacheKey
      });
      
      if (error) {
        console.error(`使缓存失效失败 (${cacheKey}):`, error);
        toast.error(`使缓存失效失败: ${error.message}`);
      } else {
        toast.success(`${cacheKeyMapping[cacheKey] || cacheKey} 缓存已成功重置`);
        fetchCacheInfo();
      }
    } catch (e: any) {
      console.error('使缓存失效异常:', e);
      toast.error(`使缓存失效失败: ${e.message}`);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchViewStatus();
    fetchCacheInfo();
    fetchSystemEvents();

    // 设置自动刷新间隔 (每30秒)
    const interval = setInterval(() => {
      if (activeTab === "view-status") {
        fetchViewStatus();
      } else if (activeTab === "cache-info") {
        fetchCacheInfo();
      } else if (activeTab === "system-events") {
        fetchSystemEvents();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="view-status" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="view-status">
            <Database className="h-4 w-4 mr-2" />
            物化视图状态
          </TabsTrigger>
          <TabsTrigger value="cache-info">
            <Clock className="h-4 w-4 mr-2" />
            缓存管理
          </TabsTrigger>
          <TabsTrigger value="system-events">
            <BarChart2 className="h-4 w-4 mr-2" />
            系统事件
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="view-status" className="mt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">物化视图状态</CardTitle>
              <CardDescription>
                物化视图缓存了复杂查询的结果，提高了系统性能。查看所有物化视图的状态，管理刷新时间。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-lime-500 mr-2" />
                  <p>正在加载物化视图状态...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">物化视图</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>行数</TableHead>
                      <TableHead className="text-right">最后刷新时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewStatus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          没有找到物化视图信息
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewStatus.map((view) => (
                        <TableRow key={view.view_name}>
                          <TableCell className="font-medium">
                            {viewNameMapping[view.view_name] || view.view_name}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500 max-w-sm">
                            {viewDescriptions[view.view_name] || '无描述'}
                          </TableCell>
                          <TableCell>
                            {view.view_exists ? (
                              <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> 已创建
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                                <XCircle className="h-3.5 w-3.5 mr-1" /> 未创建
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{view.row_count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {view.last_refresh ? (
                              <div className="flex flex-col items-end text-sm">
                                <span>{format(new Date(view.last_refresh), 'yyyy-MM-dd HH:mm:ss', { locale: zhCN })}</span>
                                <span className="text-xs text-gray-500">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {formatDistanceToNow(new Date(view.last_refresh), { locale: zhCN, addSuffix: true })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">从未刷新</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              <div className="mt-6 flex items-center">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="concurrent-refresh"
                      checked={useConcurrent}
                      onCheckedChange={setUseConcurrent}
                    />
                    <Label htmlFor="concurrent-refresh">并发刷新 (减少锁定，但需要更多资源)</Label>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                        视图维护信息
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>物化视图维护指南</DialogTitle>
                        <DialogDescription>
                          物化视图维护的最佳实践和注意事项
                        </DialogDescription>
                      </DialogHeader>
                      <div className="text-sm space-y-3 max-h-80 overflow-y-auto">
                        <p>物化视图是提高查询性能的重要工具，但也需要合理维护：</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>物化视图刷新可能耗费较多资源，建议在系统负载较低时进行</li>
                          <li>并发刷新可以减少锁定，但会消耗更多系统资源</li>
                          <li>如遇刷新错误，可以检查数据一致性或联系系统管理员</li>
                          <li>在大型数据变更操作后，建议手动刷新相关物化视图</li>
                        </ul>
                        <Alert className="mt-4 bg-blue-50 text-blue-700 border-blue-200">
                          <AlertTitle className="flex items-center">
                            <InfoIcon className="h-4 w-4 mr-2" />
                            关于并发刷新
                          </AlertTitle>
                          <AlertDescription>
                            并发刷新(CONCURRENTLY)模式下，物化视图更新时不会锁定表，
                            但需要更多内存和处理时间。对于生产环境中的大型表，建议使用此模式。
                          </AlertDescription>
                        </Alert>
                      </div>
                      <DialogFooter>
                        <a href="/docs/MATERIALIZED_VIEWS.md" target="_blank" className="text-sm text-blue-500 hover:underline">
                          查看完整文档
                        </a>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchViewStatus}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新状态
              </Button>
              <Button 
                onClick={refreshAllViews}
                disabled={loading || refreshing}
                className="bg-lime-600 hover:bg-lime-700"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    正在刷新...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    刷新所有物化视图
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="cache-info" className="mt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">缓存管理</CardTitle>
              <CardDescription>
                管理系统中的各种数据缓存，包括前端和数据库缓存。当数据更新不及时时，可以在这里重置缓存。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">缓存名称</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后更新</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cacheInfo.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        没有找到缓存信息
                      </TableCell>
                    </TableRow>
                  ) : (
                    cacheInfo.map((cache) => (
                      <TableRow key={cache.cache_key}>
                        <TableCell className="font-medium">
                          {cacheKeyMapping[cache.cache_key] || cache.cache_key}
                        </TableCell>
                        <TableCell>{(cache.expiry_seconds / 60).toFixed(0)} 分钟</TableCell>
                        <TableCell>{cache.version}</TableCell>
                        <TableCell>
                          {cache.is_valid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> 有效
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                              <Clock className="h-3.5 w-3.5 mr-1" /> 已过期
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {cache.last_updated ? (
                            <div className="text-sm">
                              <span>{formatDistanceToNow(new Date(cache.last_updated), { locale: zhCN, addSuffix: true })}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">未知</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => invalidateCache(cache.cache_key)}
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            重置
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchCacheInfo}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新缓存状态
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="system-events" className="mt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">系统事件</CardTitle>
              <CardDescription>
                查看系统事件记录，包括物化视图刷新、错误和其他重要操作。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">事件类型</TableHead>
                    <TableHead>严重程度</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="text-right">详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        没有找到系统事件记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    systemEvents.slice(0, 10).map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">
                          {event.event_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {event.severity === 'error' ? (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> 错误
                            </Badge>
                          ) : event.severity === 'warning' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> 警告
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> 信息
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {event.created_at ? (
                            <div className="text-sm">
                              <span>{format(new Date(event.created_at), 'MM-dd HH:mm:ss', { locale: zhCN })}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">未知</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              // 在对话框中显示详细信息
                              alert(JSON.stringify(event.event_details, null, 2));
                            }}
                          >
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {systemEvents.length > 10 && (
                <div className="text-center mt-4">
                  <Button 
                    variant="link" 
                    onClick={() => setShowMonitoringDialog(true)}
                  >
                    查看更多事件记录
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSystemEvents}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新事件记录
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// 内部组件
const InfoIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default MaterializedViewsStatus; 