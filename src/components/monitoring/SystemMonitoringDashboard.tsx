/**
 * 🚀 系统监控仪表板
 * 实时显示系统状态、性能指标、错误日志和健康检查
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Filter,
  MemoryStick,
  Monitor,
  RefreshCw,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  Bug,
  Database,
  Globe,
  HardDrive,
  Cpu,
  AlertCircle,
  Settings,
  BarChart3
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import SystemMonitor, { LogLevel, LogCategory, LogEntry, SystemMetrics } from '@/utils/systemMonitor';

// 状态颜色配置
const STATUS_COLORS = {
  healthy: {
    bg: 'bg-[#B9FF66]',
    text: 'text-black',
    border: 'border-[#B9FF66]',
    shadow: 'shadow-[6px_6px_0px_0px_#B9FF66]'
  },
  warning: {
    bg: 'bg-[#F59E0B]',
    text: 'text-white',
    border: 'border-[#F59E0B]',
    shadow: 'shadow-[6px_6px_0px_0px_#F59E0B]'
  },
  critical: {
    bg: 'bg-[#EF4444]',
    text: 'text-white',
    border: 'border-[#EF4444]',
    shadow: 'shadow-[6px_6px_0px_0px_#EF4444]'
  }
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'healthy' | 'warning' | 'critical';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  status = 'healthy',
  className
}) => {
  const colors = STATUS_COLORS[status];

  return (
    <Card className={cn(
      'bg-white border-2 border-black transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]',
      colors.shadow,
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-full border-2 border-black',
                colors.bg,
                colors.text
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-base font-bold text-black uppercase tracking-wide">{title}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-black leading-none">{value}</h3>
              {trend && trendValue && (
                <div className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-sm font-bold",
                  trend === 'up' && status === 'critical' && "bg-[#EF4444] text-white",
                  trend === 'up' && status === 'warning' && "bg-[#F59E0B] text-white",
                  trend === 'up' && status === 'healthy' && "bg-[#B9FF66] text-black",
                  trend === 'down' && "bg-[#6B7280] text-white",
                  trend === 'neutral' && "bg-white text-black"
                )}>
                  {trend === 'up' && <TrendingUp className="w-4 h-4" />}
                  {trend === 'down' && <TrendingDown className="w-4 h-4" />}
                  <span className="uppercase tracking-wide">{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-[#6B7280] font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SystemMonitoringDashboard: React.FC = () => {
  const [monitor] = useState(() => SystemMonitor.getInstance({
    logLevel: LogLevel.INFO,
    enableConsoleOutput: true,
    enableRemoteLogging: false,
    enablePerformanceMonitoring: true,
    enableErrorTracking: true,
    enableUserTracking: true
  }));

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [healthStatus, setHealthStatus] = useState<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  }>({ status: 'healthy', issues: [] });
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedLogLevel, setSelectedLogLevel] = useState<LogLevel>(LogLevel.INFO);
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'all'>('all');
  const [realTimeData, setRealTimeData] = useState<Array<{
    time: string;
    memory: number;
    errors: number;
    requests: number;
  }>>([]);

  // 实时数据更新
  useEffect(() => {
    if (!isMonitoring) return;

    const updateData = async () => {
      try {
        const currentMetrics = monitor.getSystemMetrics();
        setMetrics(currentMetrics);

        const currentLogs = monitor.getLogs({ limit: 100 });
        setLogs(currentLogs);

        const health = await monitor.healthCheck();
        setHealthStatus({ status: health.status, issues: health.issues });

        // 更新实时图表数据
        setRealTimeData(prev => {
          const newData = [...prev, {
            time: new Date().toLocaleTimeString(),
            memory: currentMetrics.performance.memory.used / 1024 / 1024, // MB
            errors: currentMetrics.errors.totalErrors,
            requests: currentMetrics.performance.resources.totalRequests
          }];
          return newData.slice(-20); // 只保留最近20个数据点
        });
      } catch (error) {
        monitor.logError('Failed to update monitoring data', error);
      }
    };

    updateData();
    const interval = setInterval(updateData, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, [monitor, isMonitoring]);

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const levelMatch = log.level >= selectedLogLevel;
    const categoryMatch = selectedCategory === 'all' || log.category === selectedCategory;
    return levelMatch && categoryMatch;
  });

  // 导出日志
  const handleExportLogs = useCallback(() => {
    const exportData = {
      logs: filteredLogs,
      metrics,
      healthStatus,
      exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-monitoring-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs, metrics, healthStatus]);

  // 清空日志
  const handleClearLogs = useCallback(() => {
    monitor.clearLogs();
    setLogs([]);
  }, [monitor]);

  // 格式化日志级别
  const formatLogLevel = (level: LogLevel): string => {
    return LogLevel[level];
  };

  // 获取日志级别颜色
  const getLogLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'bg-[#6B7280] text-white';
      case LogLevel.INFO:
        return 'bg-[#B9FF66] text-black';
      case LogLevel.WARN:
        return 'bg-[#F59E0B] text-white';
      case LogLevel.ERROR:
        return 'bg-[#EF4444] text-white';
      case LogLevel.CRITICAL:
        return 'bg-[#991B1B] text-white';
      default:
        return 'bg-[#6B7280] text-white';
    }
  };

  // 获取系统状态
  const getSystemStatus = () => {
    if (!metrics) return { status: 'healthy', color: STATUS_COLORS.healthy };
    
    const memoryUsage = (metrics.performance.memory.used / metrics.performance.memory.limit) * 100;
    const errorRate = metrics.errors.errorRate;

    if (memoryUsage > 90 || errorRate > 0.1 || healthStatus.status === 'critical') {
      return { status: 'critical', color: STATUS_COLORS.critical };
    }
    
    if (memoryUsage > 75 || errorRate > 0.05 || healthStatus.status === 'warning') {
      return { status: 'warning', color: STATUS_COLORS.warning };
    }
    
    return { status: 'healthy', color: STATUS_COLORS.healthy };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="space-y-8 p-6">
      {/* 页面标题和控制 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-[#191A23] leading-tight">
            系统监控
            <span className={cn(
              "inline-block ml-3 px-4 py-2 text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]",
              systemStatus.color.bg,
              systemStatus.color.text
            )}>
              {systemStatus.status.toUpperCase()}
            </span>
          </h1>
          <p className="text-lg text-[#6B7280] font-medium max-w-2xl">
            实时监控系统健康状态和性能指标
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={cn(
              "flex items-center gap-2 border-2 border-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all",
              isMonitoring ? "bg-[#EF4444] hover:bg-[#EF4444] text-white" : "bg-[#B9FF66] hover:bg-[#B9FF66] text-black"
            )}
          >
            {isMonitoring ? (
              <>
                <AlertCircle className="w-4 h-4" />
                停止监控
              </>
            ) : (
              <>
                <Activity className="w-4 h-4" />
                开始监控
              </>
            )}
          </Button>
          
          <Button
            onClick={handleExportLogs}
            variant="outline"
            className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
          >
            <Download className="w-4 h-4" />
            导出数据
          </Button>
        </div>
      </div>

      {/* 健康状态警告 */}
      {healthStatus.issues.length > 0 && (
        <Alert className={cn(
          "border-2 border-black",
          healthStatus.status === 'critical' ? "bg-[#EF4444]/10 border-[#EF4444]" : "bg-[#F59E0B]/10 border-[#F59E0B]"
        )}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="font-medium">
            <div className="space-y-2">
              <p className="font-bold text-black">
                检测到 {healthStatus.issues.length} 个系统问题:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
                {healthStatus.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 核心指标卡片 */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="内存使用"
            value={`${(metrics.performance.memory.used / 1024 / 1024).toFixed(1)}MB`}
            subtitle={`总量: ${(metrics.performance.memory.limit / 1024 / 1024).toFixed(1)}MB`}
            icon={MemoryStick}
            status={((metrics.performance.memory.used / metrics.performance.memory.limit) * 100) > 90 ? 'critical' : 
                   ((metrics.performance.memory.used / metrics.performance.memory.limit) * 100) > 75 ? 'warning' : 'healthy'}
            trend={((metrics.performance.memory.used / metrics.performance.memory.limit) * 100) > 75 ? 'up' : 'neutral'}
            trendValue={`${((metrics.performance.memory.used / metrics.performance.memory.limit) * 100).toFixed(1)}%`}
          />
          
          <StatCard
            title="错误数量"
            value={metrics.errors.totalErrors}
            subtitle={`错误率: ${(metrics.errors.errorRate * 100).toFixed(2)}%`}
            icon={Bug}
            status={metrics.errors.errorRate > 0.1 ? 'critical' : metrics.errors.errorRate > 0.05 ? 'warning' : 'healthy'}
            trend={metrics.errors.totalErrors > 0 ? 'up' : 'down'}
            trendValue={`${metrics.errors.criticalErrors} 严重`}
          />
          
          <StatCard
            title="网络请求"
            value={metrics.performance.resources.totalRequests}
            subtitle={`失败: ${metrics.performance.resources.failedRequests} 次`}
            icon={Globe}
            status={metrics.performance.resources.failedRequests > 10 ? 'warning' : 'healthy'}
            trend={metrics.performance.resources.avgResponseTime > 2000 ? 'up' : 'neutral'}
            trendValue={`${metrics.performance.resources.avgResponseTime.toFixed(0)}ms 平均`}
          />
          
          <StatCard
            title="运行时长"
            value={`${Math.floor(metrics.system.uptime / 60000)}分钟`}
            subtitle={`用户操作: ${metrics.user.userActions} 次`}
            icon={Clock}
            status="healthy"
            trend="neutral"
            trendValue="稳定运行"
          />
        </div>
      )}

      {/* 监控面板主要内容 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-fit grid-cols-4 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
          >
            <Monitor className="w-5 h-5" />
            概览
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
          >
            <BarChart3 className="w-5 h-5" />
            性能
          </TabsTrigger>
          <TabsTrigger 
            value="logs" 
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
          >
            <Eye className="w-5 h-5" />
            日志
          </TabsTrigger>
          <TabsTrigger 
            value="system" 
            className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-6 py-3"
          >
            <Server className="w-5 h-5" />
            系统
          </TabsTrigger>
        </TabsList>

        {/* 概览页面 */}
        <TabsContent value="overview" className="space-y-6">
          {realTimeData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 实时内存使用 */}
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="text-black font-black flex items-center gap-2">
                    <MemoryStick className="w-5 h-5" />
                    实时内存使用
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={realTimeData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="time" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid black',
                          borderRadius: '8px',
                          boxShadow: '4px 4px 0px 0px #191A23'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="memory" 
                        stroke="#B9FF66" 
                        fill="#B9FF66" 
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 错误趋势 */}
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#EF4444]">
                <CardHeader className="bg-[#EF4444] border-b-2 border-black">
                  <CardTitle className="text-white font-black flex items-center gap-2">
                    <Bug className="w-5 h-5" />
                    错误趋势
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={realTimeData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="time" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                      <YAxis tick={{ fontSize: 12, fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid black',
                          borderRadius: '8px',
                          boxShadow: '4px 4px 0px 0px #EF4444'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="errors" 
                        stroke="#EF4444" 
                        strokeWidth={3}
                        dot={{ fill: '#EF4444', strokeWidth: 2, stroke: '#191A23' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 系统状态总览 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#191A23]">
            <CardHeader className="bg-[#191A23] border-b-2 border-black">
              <CardTitle className="text-white font-black flex items-center gap-2">
                <Shield className="w-5 h-5" />
                系统状态总览
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className={cn(
                    "w-20 h-20 rounded-full border-4 border-black flex items-center justify-center mx-auto mb-3",
                    systemStatus.color.bg
                  )}>
                    {systemStatus.status === 'healthy' && <CheckCircle className="w-10 h-10 text-black" />}
                    {systemStatus.status === 'warning' && <AlertTriangle className="w-10 h-10 text-white" />}
                    {systemStatus.status === 'critical' && <AlertCircle className="w-10 h-10 text-white" />}
                  </div>
                  <h3 className="text-xl font-black text-black mb-1">系统健康度</h3>
                  <Badge className={cn(
                    "font-bold border-2 border-black text-lg px-4 py-2",
                    systemStatus.color.bg,
                    systemStatus.color.text
                  )}>
                    {systemStatus.status === 'healthy' && '健康'}
                    {systemStatus.status === 'warning' && '警告'}
                    {systemStatus.status === 'critical' && '严重'}
                  </Badge>
                </div>

                {metrics && (
                  <>
                    <div className="text-center">
                      <div className="text-4xl font-black text-black mb-2">
                        {((metrics.performance.memory.used / metrics.performance.memory.limit) * 100).toFixed(1)}%
                      </div>
                      <h3 className="text-lg font-bold text-black mb-1">内存使用率</h3>
                      <p className="text-sm text-[#6B7280]">
                        {(metrics.performance.memory.used / 1024 / 1024).toFixed(1)}MB / {(metrics.performance.memory.limit / 1024 / 1024).toFixed(1)}MB
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="text-4xl font-black text-black mb-2">
                        {(metrics.errors.errorRate * 100).toFixed(2)}%
                      </div>
                      <h3 className="text-lg font-bold text-black mb-1">错误率</h3>
                      <p className="text-sm text-[#6B7280]">
                        {metrics.errors.totalErrors} 总错误，{metrics.errors.criticalErrors} 严重
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 性能页面 */}
        <TabsContent value="performance" className="space-y-6">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 资源使用情况 */}
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
                <CardHeader className="bg-[#6B7280] border-b-2 border-black">
                  <CardTitle className="text-white font-black flex items-center gap-2">
                    <HardDrive className="w-5 h-5" />
                    资源使用情况
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-black">内存使用</span>
                        <span className="text-sm text-[#6B7280]">
                          {(metrics.performance.memory.used / 1024 / 1024).toFixed(1)}MB
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 border-2 border-black">
                        <div 
                          className="bg-[#B9FF66] h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (metrics.performance.memory.used / metrics.performance.memory.limit) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-black">请求成功率</span>
                        <span className="text-sm text-[#6B7280]">
                          {(((metrics.performance.resources.totalRequests - metrics.performance.resources.failedRequests) / metrics.performance.resources.totalRequests) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 border-2 border-black">
                        <div 
                          className="bg-[#B9FF66] h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${((metrics.performance.resources.totalRequests - metrics.performance.resources.failedRequests) / metrics.performance.resources.totalRequests) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 性能指标 */}
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#F59E0B]">
                <CardHeader className="bg-[#F59E0B] border-b-2 border-black">
                  <CardTitle className="text-white font-black flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    性能指标
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-black">平均响应时间</span>
                      <Badge className="bg-white border-2 border-black text-black font-bold">
                        {metrics.performance.resources.avgResponseTime.toFixed(0)}ms
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-black">会话时长</span>
                      <Badge className="bg-white border-2 border-black text-black font-bold">
                        {Math.floor(metrics.user.sessionDuration / 60000)}分钟
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-black">用户操作</span>
                      <Badge className="bg-white border-2 border-black text-black font-bold">
                        {metrics.user.userActions}次
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-black">系统版本</span>
                      <Badge className="bg-white border-2 border-black text-black font-bold">
                        {metrics.system.version}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* 日志页面 */}
        <TabsContent value="logs" className="space-y-6">
          {/* 日志过滤器 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
            <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
              <CardTitle className="text-black font-black flex items-center gap-2">
                <Filter className="w-5 h-5" />
                日志过滤器
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="font-bold text-black">级别:</label>
                  <select
                    value={selectedLogLevel}
                    onChange={(e) => setSelectedLogLevel(Number(e.target.value) as LogLevel)}
                    className="border-2 border-black rounded px-3 py-1 font-bold bg-white"
                  >
                    <option value={LogLevel.DEBUG}>DEBUG</option>
                    <option value={LogLevel.INFO}>INFO</option>
                    <option value={LogLevel.WARN}>WARN</option>
                    <option value={LogLevel.ERROR}>ERROR</option>
                    <option value={LogLevel.CRITICAL}>CRITICAL</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="font-bold text-black">类别:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as LogCategory | 'all')}
                    className="border-2 border-black rounded px-3 py-1 font-bold bg-white"
                  >
                    <option value="all">全部</option>
                    <option value={LogCategory.SYSTEM}>系统</option>
                    <option value={LogCategory.PERFORMANCE}>性能</option>
                    <option value={LogCategory.ERROR}>错误</option>
                    <option value={LogCategory.USER_ACTION}>用户操作</option>
                    <option value={LogCategory.API}>API</option>
                    <option value={LogCategory.DATABASE}>数据库</option>
                    <option value={LogCategory.SECURITY}>安全</option>
                  </select>
                </div>

                <Button
                  onClick={handleClearLogs}
                  variant="outline"
                  size="sm"
                  className="border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  清空日志
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 日志列表 */}
          <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#191A23]">
            <CardHeader className="bg-[#191A23] border-b-2 border-black">
              <CardTitle className="text-white font-black flex items-center gap-2">
                <Eye className="w-5 h-5" />
                系统日志 ({filteredLogs.length} 条)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <Eye className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
                    <p className="text-xl font-bold text-black">暂无日志</p>
                    <p className="text-[#6B7280] font-medium">调整过滤条件或等待新的日志生成</p>
                  </div>
                ) : (
                  <div className="divide-y-2 divide-black">
                    {filteredLogs.slice(0, 50).map((log) => (
                      <div key={log.id} className="p-4 hover:bg-[#F9F9F9] transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className={cn(
                                "font-bold border-2 border-black",
                                getLogLevelColor(log.level)
                              )}>
                                {formatLogLevel(log.level)}
                              </Badge>
                              <Badge variant="outline" className="border-2 border-black font-bold">
                                {log.category}
                              </Badge>
                              <span className="text-sm text-[#6B7280] font-medium">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="font-bold text-black">{log.message}</p>
                            {log.data && (
                              <details className="text-sm text-[#6B7280]">
                                <summary className="cursor-pointer font-medium hover:text-black">
                                  查看详情
                                </summary>
                                <pre className="mt-2 p-3 bg-black text-green-400 rounded text-xs overflow-auto max-h-32 font-mono">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 系统页面 */}
        <TabsContent value="system" className="space-y-6">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 系统信息 */}
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
                <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                  <CardTitle className="text-black font-black flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    系统信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">版本</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {metrics.system.version}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">环境</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {metrics.system.environment}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">运行时长</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {Math.floor(metrics.system.uptime / 3600000)}小时 {Math.floor((metrics.system.uptime % 3600000) / 60000)}分钟
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">构建时间</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {metrics.system.buildTime}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 用户会话 */}
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
                <CardHeader className="bg-[#6B7280] border-b-2 border-black">
                  <CardTitle className="text-white font-black flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    用户会话
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">活跃用户</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {metrics.user.activeUsers}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">会话时长</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {Math.floor(metrics.user.sessionDuration / 60000)}分钟
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">用户操作</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {metrics.user.userActions}次
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-black">跳出率</span>
                    <Badge className="bg-white border-2 border-black text-black font-bold">
                      {metrics.user.bounceRate.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemMonitoringDashboard;