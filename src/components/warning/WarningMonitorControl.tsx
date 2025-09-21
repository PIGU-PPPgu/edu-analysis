import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlayIcon, 
  PauseIcon, 
  SettingsIcon, 
  ActivityIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  DatabaseIcon,
  BellIcon
} from 'lucide-react';
import { 
  warningMonitor, 
  startWarningMonitoring, 
  stopWarningMonitoring,
  getMonitoringStatus,
  configureMonitoring,
  triggerManualCheck,
  type MonitorStatus,
  type MonitorConfig
} from '@/services/warningMonitor';
import { toast } from 'sonner';

export function WarningMonitorControl() {
  const [status, setStatus] = useState<MonitorStatus>(getMonitoringStatus());
  const [config, setConfig] = useState(warningMonitor.getConfig());
  const [statistics, setStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 订阅状态变更
  useEffect(() => {
    const unsubscribe = warningMonitor.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  // 加载统计信息
  const loadStatistics = async () => {
    try {
      setIsLoading(true);
      const stats = await warningMonitor.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('加载统计信息失败:', error);
      toast.error('加载统计信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 启动监控
  const handleStartMonitoring = async () => {
    try {
      await startWarningMonitoring();
      toast.success('预警监控已启动');
      await loadStatistics();
    } catch (error) {
      console.error('启动监控失败:', error);
      toast.error('启动监控失败');
    }
  };

  // 停止监控
  const handleStopMonitoring = async () => {
    try {
      await stopWarningMonitoring();
      toast.success('预警监控已停止');
      await loadStatistics();
    } catch (error) {
      console.error('停止监控失败:', error);
      toast.error('停止监控失败');
    }
  };

  // 手动检查
  const handleManualCheck = async () => {
    try {
      setIsLoading(true);
      await triggerManualCheck();
      toast.success('手动检查完成');
      await loadStatistics();
    } catch (error) {
      console.error('手动检查失败:', error);
      toast.error('手动检查失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新配置
  const handleConfigChange = async (newConfig: Partial<MonitorConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      await configureMonitoring(updatedConfig);
      setConfig(updatedConfig);
      toast.success('监控配置已更新');
    } catch (error) {
      console.error('更新配置失败:', error);
      toast.error('更新配置失败');
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const getStatusBadge = (status: MonitorStatus) => {
    if (status.isRunning) {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">运行中</Badge>;
    } else if (status.lastError) {
      return <Badge variant="destructive">错误</Badge>;
    } else {
      return <Badge variant="outline">停止</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            预警监控控制
          </CardTitle>
          <CardDescription>
            实时监控预警系统运行状态，自动检测异常情况
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 监控状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label className="text-base font-medium">监控状态</Label>
              {getStatusBadge(status)}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={status.isRunning ? handleStopMonitoring : handleStartMonitoring}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {status.isRunning ? (
                  <>
                    <PauseIcon className="h-4 w-4" />
                    停止监控
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4" />
                    启动监控
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleManualCheck}
                disabled={isLoading}
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                手动检查
              </Button>
            </div>
          </div>

          {/* 状态详情 */}
          {status.isRunning && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">运行时长</div>
                    <div className="font-medium">
                      {Math.floor((Date.now() - (status.startTime || Date.now())) / 60000)} 分钟
                    </div>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <DatabaseIcon className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">检查次数</div>
                    <div className="font-medium">{status.checkCount || 0}</div>
                  </div>
                </div>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <BellIcon className="h-4 w-4 text-orange-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">发现异常</div>
                    <div className="font-medium">{status.alertCount || 0}</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 错误信息 */}
          {status.lastError && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-medium">监控异常</div>
                  <div className="text-sm">{status.lastError}</div>
                  <div className="text-xs text-muted-foreground">
                    {status.lastErrorTime && new Date(status.lastErrorTime).toLocaleString()}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* 监控配置 */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              监控配置
            </Label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkInterval">检查间隔 (分钟)</Label>
                <Input
                  id="checkInterval"
                  type="number"
                  value={config.checkInterval || 5}
                  onChange={(e) => handleConfigChange({ 
                    checkInterval: parseInt(e.target.value) 
                  })}
                  min={1}
                  max={60}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="alertThreshold">异常阈值</Label>
                <Input
                  id="alertThreshold"
                  type="number"
                  value={config.alertThreshold || 10}
                  onChange={(e) => handleConfigChange({ 
                    alertThreshold: parseInt(e.target.value) 
                  })}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="autoRestart"
                checked={config.autoRestart || false}
                onCheckedChange={(checked) => handleConfigChange({ autoRestart: checked })}
              />
              <Label htmlFor="autoRestart">异常时自动重启</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="emailAlerts"
                checked={config.emailAlerts || false}
                onCheckedChange={(checked) => handleConfigChange({ emailAlerts: checked })}
              />
              <Label htmlFor="emailAlerts">邮件通知</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 监控统计 */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">监控统计</CardTitle>
            <CardDescription>过去24小时的监控数据</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.totalChecks || 0}
                </div>
                <div className="text-sm text-muted-foreground">总检查次数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.healthyChecks || 0}
                </div>
                <div className="text-sm text-muted-foreground">健康检查</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.warnings || 0}
                </div>
                <div className="text-sm text-muted-foreground">预警次数</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {statistics.errors || 0}
                </div>
                <div className="text-sm text-muted-foreground">错误次数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>• 监控系统会定期检查预警引擎的运行状态</div>
          <div>• 发现异常时会自动记录并可选择发送通知</div>
          <div>• 可以调整检查间隔和异常阈值以适应不同需求</div>
          <div>• 启用自动重启可以在检测到问题时自动恢复服务</div>
          <div>• 手动检查功能可以立即执行一次状态检查</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WarningMonitorControl;