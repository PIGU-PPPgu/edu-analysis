/**
 * GlobalLoading使用示例
 *
 * 演示如何在实际场景中使用全局加载状态管理
 */

import React, { useState } from "react";
import {
  useGlobalLoading,
  useLoadingOperation,
} from "@/contexts/GlobalLoadingContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationManager } from "@/services/NotificationManager";

/**
 * 示例1: 使用useLoadingOperation Hook
 * 适用场景: 组件级操作，需要独立的加载状态
 */
export const Example1_SpecificOperation: React.FC = () => {
  const { isLoading, progress, start, stop, update } =
    useLoadingOperation("data-import");

  const handleImport = async () => {
    start({
      message: "正在导入学生数据...",
      timeoutMs: 30000, // 30秒超时
      retryable: true,
      onRetry: handleImport,
    });

    try {
      // 模拟数据导入流程
      update(20, "正在解析文件...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      update(40, "正在验证数据...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      update(60, "正在写入数据库...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      update(80, "正在同步索引...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      update(100, "导入完成!");
      await new Promise((resolve) => setTimeout(resolve, 500));

      stop();
      NotificationManager.success("数据导入成功", {
        description: "成功导入150名学生信息",
      });
    } catch (error) {
      stop();
      NotificationManager.error("导入失败", {
        description: error instanceof Error ? error.message : "未知错误",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例1: 特定操作加载状态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleImport} disabled={isLoading}>
          {isLoading ? `导入中... ${progress}%` : "导入学生数据"}
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * 示例2: 使用withLoading包装器
 * 适用场景: 简单异步操作，自动管理加载状态
 */
export const Example2_WithLoadingWrapper: React.FC = () => {
  const { withLoading } = useGlobalLoading();

  const handleSync = async () => {
    try {
      await withLoading(
        "grade-sync",
        async () => {
          // 模拟数据同步
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return { success: true };
        },
        {
          message: "正在同步成绩数据...",
          timeoutMs: 10000,
        }
      );

      NotificationManager.success("同步完成");
    } catch (error) {
      NotificationManager.error("同步失败");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例2: withLoading包装器</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSync}>同步成绩数据</Button>
      </CardContent>
    </Card>
  );
};

/**
 * 示例3: 全局覆盖层加载
 * 适用场景: 阻塞性操作，需要全屏遮罩
 */
export const Example3_GlobalOverlay: React.FC = () => {
  const { startLoading, stopLoading } = useGlobalLoading();

  const handleHeavyOperation = async () => {
    startLoading("heavy-operation", {
      message: "正在处理大量数据，请稍候...",
      showGlobalOverlay: true, // 显示全局遮罩
      timeoutMs: 60000, // 60秒超时
    });

    try {
      // 模拟长时间操作
      await new Promise((resolve) => setTimeout(resolve, 3000));
      stopLoading("heavy-operation");
      NotificationManager.success("处理完成");
    } catch (error) {
      stopLoading("heavy-operation");
      NotificationManager.error("处理失败");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例3: 全局覆盖层</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleHeavyOperation}>执行重型操作</Button>
      </CardContent>
    </Card>
  );
};

/**
 * 示例4: 多操作并发管理
 * 适用场景: 需要同时追踪多个独立的加载操作
 */
export const Example4_ConcurrentOperations: React.FC = () => {
  const studentOp = useLoadingOperation("fetch-students");
  const gradeOp = useLoadingOperation("fetch-grades");
  const warningOp = useLoadingOperation("fetch-warnings");

  const fetchAllData = async () => {
    // 并发启动三个操作
    studentOp.start({ message: "加载学生数据..." });
    gradeOp.start({ message: "加载成绩数据..." });
    warningOp.start({ message: "加载预警数据..." });

    try {
      await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 1000)).then(() =>
          studentOp.stop()
        ),
        new Promise((resolve) => setTimeout(resolve, 1500)).then(() =>
          gradeOp.stop()
        ),
        new Promise((resolve) => setTimeout(resolve, 800)).then(() =>
          warningOp.stop()
        ),
      ]);

      NotificationManager.success("所有数据加载完成");
    } catch (error) {
      studentOp.stop();
      gradeOp.stop();
      warningOp.stop();
      NotificationManager.error("数据加载失败");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例4: 并发操作管理</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={fetchAllData}>加载所有数据</Button>
        <div className="text-sm text-muted-foreground space-y-1">
          <div>学生数据: {studentOp.isLoading ? "加载中..." : "就绪"}</div>
          <div>成绩数据: {gradeOp.isLoading ? "加载中..." : "就绪"}</div>
          <div>预警数据: {warningOp.isLoading ? "加载中..." : "就绪"}</div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 示例5: 超时和重试机制
 * 适用场景: 可能超时的操作，需要用户手动重试
 */
export const Example5_TimeoutAndRetry: React.FC = () => {
  const [retryCount, setRetryCount] = useState(0);
  const { start, stop, isLoading } = useLoadingOperation("flaky-operation");

  const handleFlakyOperation = async () => {
    const currentRetryCount = retryCount;
    setRetryCount((prev) => prev + 1);

    start({
      message: `正在执行操作 (尝试 ${currentRetryCount + 1})...`,
      timeoutMs: 5000, // 5秒即触发超时提醒
      retryable: true,
      onRetry: handleFlakyOperation, // 自动提供重试按钮
    });

    try {
      // 模拟可能失败的操作
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.5) {
            resolve("成功");
          } else {
            reject(new Error("操作失败"));
          }
        }, 2000);
      });

      stop();
      NotificationManager.success("操作成功", {
        description: `第 ${currentRetryCount + 1} 次尝试成功`,
      });
      setRetryCount(0);
    } catch (error) {
      stop();
      NotificationManager.error("操作失败", {
        description: "请点击重试按钮继续",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>示例5: 超时和重试</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={handleFlakyOperation} disabled={isLoading}>
          执行不稳定操作
        </Button>
        <div className="text-sm text-muted-foreground">
          已尝试: {retryCount} 次
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * 示例汇总页面
 */
export const GlobalLoadingExamples: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">GlobalLoading 使用示例</h1>
        <p className="text-muted-foreground">
          演示如何在不同场景下使用全局加载状态管理系统
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Example1_SpecificOperation />
        <Example2_WithLoadingWrapper />
        <Example3_GlobalOverlay />
        <Example4_ConcurrentOperations />
        <Example5_TimeoutAndRetry />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>使用指南</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h3>基本用法</h3>
          <ul>
            <li>
              <strong>useLoadingOperation(id)</strong>:
              为特定操作创建独立的加载控制器
            </li>
            <li>
              <strong>useGlobalLoading()</strong>: 获取全局加载状态管理器
            </li>
            <li>
              <strong>withLoading()</strong>: 包装异步函数，自动管理加载状态
            </li>
          </ul>

          <h3>高级特性</h3>
          <ul>
            <li>自动超时提醒 (默认15秒)</li>
            <li>可重试操作</li>
            <li>进度追踪</li>
            <li>并发操作管理</li>
            <li>全局覆盖层</li>
          </ul>

          <h3>最佳实践</h3>
          <ul>
            <li>为每个独立操作使用唯一ID</li>
            <li>设置合理的超时时间</li>
            <li>为耗时操作提供进度更新</li>
            <li>为可能失败的操作启用重试</li>
            <li>使用全局覆盖层阻止用户操作</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
