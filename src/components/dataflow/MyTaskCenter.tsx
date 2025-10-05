/**
 * MyTaskCenter - 个人任务中心
 *
 * 展示当前用户的所有DataFlow任务
 * 支持实时查看、控制和管理任务
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { useDataFlow } from "@/contexts/DataFlowContext";
import { TaskCard } from "./TaskCard";
import { DataFlowState } from "@/types/dataFlow";

export const MyTaskCenter: React.FC = () => {
  const {
    tasks,
    startTask,
    pauseTask,
    resumeTask,
    cancelTask,
    deleteTask,
    queuedTasks,
    activeTasks,
    completedTasks,
  } = useDataFlow();

  const [activeTab, setActiveTab] = useState<string>("active");

  /**
   * 按状态分类任务
   */
  const categorizedTasks = useMemo(() => {
    const allTasks = Array.from(tasks.values());

    return {
      active: allTasks.filter(
        (task) =>
          task.state === DataFlowState.PROCESSING ||
          task.state === DataFlowState.VALIDATING ||
          task.state === DataFlowState.PREPARING ||
          task.state === DataFlowState.RESUMING ||
          task.state === DataFlowState.PAUSED
      ),
      queued: allTasks.filter(
        (task) =>
          task.state === DataFlowState.IDLE ||
          task.state === DataFlowState.QUEUED
      ),
      completed: allTasks.filter((task) => task.state === DataFlowState.COMPLETED),
      failed: allTasks.filter(
        (task) =>
          task.state === DataFlowState.FAILED ||
          task.state === DataFlowState.CANCELLED
      ),
      all: allTasks,
    };
  }, [tasks]);

  /**
   * 清理所有已完成任务
   */
  const handleClearCompleted = async () => {
    if (confirm(`确定要删除所有已完成的任务吗？(${categorizedTasks.completed.length}个)`)) {
      for (const task of categorizedTasks.completed) {
        await deleteTask(task.id);
      }
    }
  };

  /**
   * 清理所有失败任务
   */
  const handleClearFailed = async () => {
    if (confirm(`确定要删除所有失败的任务吗？(${categorizedTasks.failed.length}个)`)) {
      for (const task of categorizedTasks.failed) {
        await deleteTask(task.id);
      }
    }
  };

  /**
   * 渲染空状态
   */
  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <Activity className="w-12 h-12 mb-3 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            我的任务中心
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* 统计徽章 */}
            {activeTasks.length > 0 && (
              <Badge variant="default" className="bg-blue-600">
                {activeTasks.length} 个进行中
              </Badge>
            )}
            {queuedTasks.length > 0 && (
              <Badge variant="secondary">
                {queuedTasks.length} 个等待
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="active" className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>进行中</span>
              {categorizedTasks.active.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {categorizedTasks.active.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="queued" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>等待中</span>
              {categorizedTasks.queued.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {categorizedTasks.queued.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="completed" className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>已完成</span>
              {categorizedTasks.completed.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {categorizedTasks.completed.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="failed" className="flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              <span>失败</span>
              {categorizedTasks.failed.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-[10px]">
                  {categorizedTasks.failed.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="all" className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              <span>全部</span>
              <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">
                {categorizedTasks.all.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* 进行中任务 */}
          <TabsContent value="active">
            <ScrollArea className="h-[600px] pr-4">
              {categorizedTasks.active.length === 0 ? (
                renderEmptyState("暂无进行中的任务")
              ) : (
                <div className="space-y-3">
                  {categorizedTasks.active.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onPause={pauseTask}
                      onResume={resumeTask}
                      onCancel={cancelTask}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 等待中任务 */}
          <TabsContent value="queued">
            <ScrollArea className="h-[600px] pr-4">
              {categorizedTasks.queued.length === 0 ? (
                renderEmptyState("暂无等待中的任务")
              ) : (
                <div className="space-y-3">
                  {categorizedTasks.queued.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStart={startTask}
                      onCancel={cancelTask}
                      onDelete={deleteTask}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* 已完成任务 */}
          <TabsContent value="completed">
            <div className="space-y-3">
              {categorizedTasks.completed.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleClearCompleted}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    清空已完成任务
                  </Button>
                </div>
              )}
              <ScrollArea className="h-[550px] pr-4">
                {categorizedTasks.completed.length === 0 ? (
                  renderEmptyState("暂无已完成的任务")
                ) : (
                  <div className="space-y-3">
                    {categorizedTasks.completed.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* 失败任务 */}
          <TabsContent value="failed">
            <div className="space-y-3">
              {categorizedTasks.failed.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    onClick={handleClearFailed}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    清空失败任务
                  </Button>
                </div>
              )}
              <ScrollArea className="h-[550px] pr-4">
                {categorizedTasks.failed.length === 0 ? (
                  renderEmptyState("暂无失败的任务")
                ) : (
                  <div className="space-y-3">
                    {categorizedTasks.failed.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* 全部任务 */}
          <TabsContent value="all">
            <ScrollArea className="h-[600px] pr-4">
              {categorizedTasks.all.length === 0 ? (
                renderEmptyState("还没有任何任务")
              ) : (
                <div className="space-y-3">
                  {categorizedTasks.all
                    .sort((a, b) => b.createdAt - a.createdAt) // 按创建时间倒序
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStart={startTask}
                        onPause={pauseTask}
                        onResume={resumeTask}
                        onCancel={cancelTask}
                        onDelete={deleteTask}
                      />
                    ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
