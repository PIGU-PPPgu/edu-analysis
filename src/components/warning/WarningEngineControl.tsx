import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  PlayIcon,
  StopIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";
import {
  executeWarningRules,
  getWarningEngineStatus as getEngineStatus,
  type WarningEngineResult as EngineExecutionResult,
} from "@/services/warningEngineService";
import { getRecentExecutionStatus } from "@/services/warningExecutionService";
import { toast } from "sonner";

interface ExecutionStats {
  isRunning: boolean;
  lastExecution?: any;
  todayStats?: {
    executionsCount: number;
    warningsGenerated: number;
    avgDuration: number;
    successRate: number;
  };
}

export function WarningEngineControl() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<EngineExecutionResult | null>(
    null
  );
  const [executionStats, setExecutionStats] = useState<ExecutionStats | null>(
    null
  );
  const [progress, setProgress] = useState(0);

  // 加载执行状态
  const loadExecutionStats = async () => {
    try {
      const stats = await getRecentExecutionStatus();
      setExecutionStats(stats);
    } catch (error) {
      console.error("加载执行状态失败:", error);
    }
  };

  // 执行预警引擎
  const handleExecuteRules = async () => {
    if (isExecuting) return;

    setIsExecuting(true);
    setProgress(0);
    setLastResult(null);

    try {
      toast.info("开始执行预警规则...");

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 200);

      const result = await executeWarningRules();

      clearInterval(progressInterval);
      setProgress(100);

      setLastResult(result);

      if (result.success) {
        toast.success("预警规则执行完成", {
          description: `处理了 ${result.studentsProcessed} 名学生，生成了 ${result.warningsGenerated} 条预警`,
        });
      } else {
        toast.error("预警规则执行失败", {
          description: result.error || "执行过程中出现错误",
        });
      }

      // 重新加载执行状态
      await loadExecutionStats();
    } catch (error) {
      console.error("执行预警规则失败:", error);
      toast.error("执行预警规则失败");
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
        studentsProcessed: 0,
        warningsGenerated: 0,
        executionTime: 0,
      });
    } finally {
      setIsExecuting(false);
      setProgress(0);
    }
  };

  useEffect(() => {
    loadExecutionStats();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayIcon className="h-5 w-5" />
            预警引擎控制
          </CardTitle>
          <CardDescription>
            手动执行预警规则，监控执行状态和结果
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 执行按钮 */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExecuteRules}
              disabled={isExecuting}
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <StopIcon className="h-4 w-4" />
                  执行中...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" />
                  执行预警规则
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={loadExecutionStats}
              disabled={isExecuting}
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              刷新状态
            </Button>

            {executionStats?.isRunning && (
              <Badge variant="secondary">引擎运行中</Badge>
            )}
          </div>

          {/* 执行进度 */}
          {isExecuting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>执行进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <Separator />

          {/* 执行结果 */}
          {lastResult && (
            <Alert variant={lastResult.success ? "default" : "destructive"}>
              {lastResult.success ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <XCircleIcon className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    {lastResult.success ? "执行成功" : "执行失败"}
                  </div>
                  {lastResult.success ? (
                    <div className="text-sm space-y-1">
                      <div>处理学生: {lastResult.studentsProcessed} 人</div>
                      <div>生成预警: {lastResult.warningsGenerated} 条</div>
                      <div>
                        执行时间: {(lastResult.executionTime / 1000).toFixed(1)}
                        s
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm">错误信息: {lastResult.error}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 今日统计 */}
          {executionStats?.todayStats && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">今日执行统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {executionStats.todayStats.executionsCount}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      执行次数
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {executionStats.todayStats.warningsGenerated}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      生成预警
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {executionStats.todayStats.avgDuration.toFixed(1)}s
                    </div>
                    <div className="text-sm text-muted-foreground">
                      平均时长
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {(executionStats.todayStats.successRate * 100).toFixed(1)}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">成功率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 最后执行记录 */}
          {executionStats?.lastExecution && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">最后执行记录</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>执行时间:</span>
                    <span>
                      {new Date(
                        executionStats.lastExecution.createdAt
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>执行状态:</span>
                    <Badge
                      variant={
                        executionStats.lastExecution.success
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {executionStats.lastExecution.success ? "成功" : "失败"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>处理学生:</span>
                    <span>
                      {executionStats.lastExecution.studentsProcessed || 0} 人
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>生成预警:</span>
                    <span>
                      {executionStats.lastExecution.warningsGenerated || 0} 条
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div>• 点击"执行预警规则"按钮手动触发预警引擎运行</div>
          <div>• 系统会根据当前激活的预警规则分析所有学生数据</div>
          <div>• 执行完成后会显示处理结果和生成的预警数量</div>
          <div>• 建议在数据更新后或需要刷新预警状态时执行</div>
          <div>• 执行过程通常需要几秒到几分钟，取决于数据量大小</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WarningEngineControl;
