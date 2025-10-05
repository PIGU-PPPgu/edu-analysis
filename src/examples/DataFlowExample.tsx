/**
 * DataFlowContext使用示例
 *
 * 演示如何使用全局数据流管理系统
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  useDataFlow,
  useTask,
} from "@/contexts/DataFlowContext";
import { TaskType, DataFlowState } from "@/types/dataFlow";

/**
 * 示例1: 创建和管理任务
 */
export const Example1_CreateTask: React.FC = () => {
  const { createTask, tasks } = useDataFlow();
  const [createdTaskId, setCreatedTaskId] = useState<string>();

  const handleCreateTask = () => {
    const mockData = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `学生${i + 1}`,
      score: Math.floor(Math.random() * 100),
    }));

    const taskId = createTask({
      type: TaskType.STUDENT_IMPORT,
      data: mockData,
      context: {
        fileName: "demo_students.xlsx",
        fileSize: 50 * 1024,
        config: {
          batchSize: 10,
          createMissingRecords: true,
          updateExistingData: true,
          skipDuplicates: true,
          enableBackup: true,
          enableRollback: true,
          parallelImport: false,
          strictMode: false,
        },
      },
      autoStart: false,
    });

    setCreatedTaskId(taskId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例1: 创建任务</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleCreateTask}>
          <PlayCircle className="w-4 h-4 mr-2" />
          创建导入任务
        </Button>

        {createdTaskId && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium mb-2">已创建任务</p>
            <p className="text-xs text-gray-600 font-mono">{createdTaskId}</p>
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>当前任务数: {tasks.size}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 示例2: 任务控制
 */
export const Example2_TaskControl: React.FC<{ taskId?: string }> = ({
  taskId,
}) => {
  const { task, state, progress, start, pause, resume, cancel } =
    useTask(taskId);

  if (!task) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>示例2: 任务控制</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            请先在示例1中创建任务
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStateColor = (state?: DataFlowState) => {
    switch (state) {
      case DataFlowState.IDLE:
        return "default";
      case DataFlowState.QUEUED:
        return "secondary";
      case DataFlowState.PROCESSING:
        return "default";
      case DataFlowState.PAUSED:
        return "secondary";
      case DataFlowState.COMPLETED:
        return "default";
      case DataFlowState.FAILED:
        return "destructive";
      case DataFlowState.CANCELLED:
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>示例2: 任务控制</span>
          <Badge variant={getStateColor(state)}>{state}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 任务信息 */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">任务类型</p>
            <p className="font-medium">{task.type}</p>
          </div>
          <div>
            <p className="text-gray-600">总记录数</p>
            <p className="font-medium">{progress?.total || 0}</p>
          </div>
          <div>
            <p className="text-gray-600">已处理</p>
            <p className="font-medium">{progress?.processed || 0}</p>
          </div>
          <div>
            <p className="text-gray-600">成功数</p>
            <p className="font-medium text-green-600">
              {progress?.successful || 0}
            </p>
          </div>
        </div>

        {/* 进度条 */}
        {progress && progress.percentage > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>进度</span>
              <span>{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex gap-2">
          {state === DataFlowState.IDLE && (
            <Button onClick={start} size="sm">
              <PlayCircle className="w-4 h-4 mr-2" />
              开始
            </Button>
          )}

          {state === DataFlowState.PROCESSING && (
            <Button onClick={pause} variant="outline" size="sm">
              <PauseCircle className="w-4 h-4 mr-2" />
              暂停
            </Button>
          )}

          {state === DataFlowState.PAUSED && (
            <Button onClick={resume} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              恢复
            </Button>
          )}

          {state !== DataFlowState.COMPLETED &&
            state !== DataFlowState.FAILED &&
            state !== DataFlowState.CANCELLED && (
              <Button onClick={cancel} variant="destructive" size="sm">
                <StopCircle className="w-4 h-4 mr-2" />
                取消
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 示例3: 任务列表
 */
export const Example3_TaskList: React.FC = () => {
  const { tasks, queuedTasks, activeTasks, completedTasks, deleteTask } =
    useDataFlow();

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例3: 任务列表</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">
              {queuedTasks.length}
            </p>
            <p className="text-sm text-gray-600">队列中</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {activeTasks.length}
            </p>
            <p className="text-sm text-gray-600">进行中</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {completedTasks.length}
            </p>
            <p className="text-sm text-gray-600">已完成</p>
          </div>
        </div>

        {/* 任务列表 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">所有任务</h4>
          {Array.from(tasks.values()).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {task.type} - {task.id.substring(0, 12)}...
                </p>
                <p className="text-xs text-gray-600">
                  {task.progress.processed} / {task.progress.total}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={task.state === DataFlowState.COMPLETED ? "default" : "outline"}>
                  {task.state}
                </Badge>
                <Button
                  onClick={() => deleteTask(task.id)}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {tasks.size === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              暂无任务
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 示例汇总页面
 */
export const DataFlowExamples: React.FC = () => {
  const [createdTaskId, setCreatedTaskId] = useState<string>();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">DataFlow 使用示例</h1>
        <p className="text-muted-foreground">
          演示全局数据流管理系统的核心功能
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const taskId = target.closest("[data-task-id]")?.getAttribute("data-task-id");
            if (taskId) setCreatedTaskId(taskId);
          }}
        >
          <Example1_CreateTask />
        </div>

        <Example2_TaskControl taskId={createdTaskId} />
      </div>

      <Example3_TaskList />

      <Card>
        <CardHeader>
          <CardTitle>使用指南</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h3>核心概念</h3>
          <ul>
            <li>
              <strong>DataFlowTask</strong>: 任务对象,包含状态、进度、配置等
            </li>
            <li>
              <strong>DataFlowState</strong>: 状态机,定义任务的生命周期
            </li>
            <li>
              <strong>Checkpoint</strong>: 检查点,支持断点续传
            </li>
            <li>
              <strong>TaskProgress</strong>: 进度信息,自动计算百分比和剩余时间
            </li>
          </ul>

          <h3>使用步骤</h3>
          <ol>
            <li>调用 <code>createTask()</code> 创建任务</li>
            <li>使用 <code>useTask(taskId)</code> 获取任务状态和操作</li>
            <li>调用 <code>start()</code> / <code>pause()</code> / <code>resume()</code> 控制任务</li>
            <li>监听进度更新,展示给用户</li>
            <li>任务完成后可删除或保留记录</li>
          </ol>

          <h3>高级特性</h3>
          <ul>
            <li>状态持久化 - 页面刷新不丢失进度 (需实现IndexedDB)</li>
            <li>断点续传 - 中断后可从检查点恢复</li>
            <li>错误恢复 - 详细的错误记录和重试机制</li>
            <li>任务队列 - 自动管理多个并发任务</li>
            <li>事件订阅 - 实时监听任务变化</li>
          </ul>

          <h3>最佳实践</h3>
          <ul>
            <li>大批量操作使用合适的批次大小 (50-100条)</li>
            <li>定期保存检查点 (每批次完成后)</li>
            <li>启用备份和回滚功能</li>
            <li>使用事件订阅实现实时UI更新</li>
            <li>完成的任务定期清理 (默认7天)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
