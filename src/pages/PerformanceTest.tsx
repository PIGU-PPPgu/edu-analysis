/**
 * Performance Test Page for Virtual Scrolling
 * Tests and validates VirtualGradeTable and VirtualStudentTable performance
 */

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VirtualGradeTable } from "@/components/tables/VirtualGradeTable";
import { VirtualStudentTable } from "@/components/tables/VirtualStudentTable";
import { generateGradeDataset } from "@/test/generate-test-grade-data";
import { Activity, Zap, Clock, Database, TrendingUp } from "lucide-react";

interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  datasetSize: number;
  scrolling: boolean;
}

const DATASET_SIZES = [100, 500, 1000, 5000, 10000];

export default function PerformanceTestPage() {
  const [selectedSize, setSelectedSize] = useState(1000);
  const [gradeData, setGradeData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    datasetSize: 0,
    scrolling: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [testRunning, setTestRunning] = useState(false);

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  const fpsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 生成测试数据
  const generateTestData = async (size: number) => {
    setIsGenerating(true);
    const startTime = performance.now();

    // 使用setTimeout模拟异步生成，避免阻塞UI
    await new Promise((resolve) => setTimeout(resolve, 10));

    const data = generateGradeDataset(size);
    const renderTime = performance.now() - startTime;

    setGradeData(data);
    setMetrics((prev) => ({
      ...prev,
      renderTime: Math.round(renderTime),
      datasetSize: size,
    }));

    setIsGenerating(false);
  };

  // FPS计算器
  const startFPSCounter = () => {
    frameCountRef.current = 0;
    lastFrameTimeRef.current = Date.now();

    const updateFPS = () => {
      const now = Date.now();
      const delta = now - lastFrameTimeRef.current;

      if (delta >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / delta);
        setMetrics((prev) => ({ ...prev, fps }));

        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      frameCountRef.current++;
      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  };

  // 内存监控
  useEffect(() => {
    const updateMemory = () => {
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMetrics((prev) => ({ ...prev, memoryUsage: usedMB }));
      }
    };

    const interval = setInterval(updateMemory, 1000);
    return () => clearInterval(interval);
  }, []);

  // 启动FPS监控
  useEffect(() => {
    if (testRunning) {
      startFPSCounter();
    }
  }, [testRunning]);

  // 自动化性能测试
  const runPerformanceTest = async () => {
    setTestRunning(true);

    for (const size of DATASET_SIZES) {
      console.log(`\n=== Testing with ${size} records ===`);

      // 生成数据
      await generateTestData(size);

      // 等待渲染完成
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 模拟滚动
      console.log("Simulating scroll...");
      const scrollContainer = document.querySelector("[role='rowgroup']");

      if (scrollContainer) {
        // 快速滚动测试
        for (let i = 0; i < 10; i++) {
          scrollContainer.scrollTop =
            Math.random() * scrollContainer.scrollHeight;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // 记录结果
      console.log(`FPS: ${metrics.fps}`);
      console.log(`Render Time: ${metrics.renderTime}ms`);
      console.log(`Memory: ${metrics.memoryUsage}MB`);

      // 等待下一次测试
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    setTestRunning(false);
    console.log("\n=== Performance Test Complete ===");
  };

  // 初始化默认数据
  useEffect(() => {
    generateTestData(selectedSize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">
            Virtual Scrolling Performance Test
          </h1>
          <p className="text-muted-foreground mt-2">
            Phase 1.2 Performance Validation - Target: 55+ FPS with 10,000+
            records
          </p>
        </div>

        {/* 性能指标卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">FPS</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.fps}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.fps >= 55 ? (
                  <Badge variant="default" className="bg-green-500">
                    Excellent
                  </Badge>
                ) : metrics.fps >= 30 ? (
                  <Badge variant="secondary">Good</Badge>
                ) : (
                  <Badge variant="destructive">Poor</Badge>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Render Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.renderTime}ms</div>
              <p className="text-xs text-muted-foreground">
                {metrics.renderTime < 100 ? (
                  <Badge variant="default" className="bg-green-500">
                    Fast
                  </Badge>
                ) : metrics.renderTime < 500 ? (
                  <Badge variant="secondary">Normal</Badge>
                ) : (
                  <Badge variant="destructive">Slow</Badge>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.memoryUsage}MB</div>
              <p className="text-xs text-muted-foreground">JS Heap Size</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dataset</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {gradeData.length.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </CardContent>
          </Card>
        </div>

        {/* 控制面板 */}
        <Card>
          <CardHeader>
            <CardTitle>Test Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Dataset Size:</span>
                {DATASET_SIZES.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedSize(size);
                      generateTestData(size);
                    }}
                    disabled={isGenerating || testRunning}
                  >
                    {size.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={runPerformanceTest}
                disabled={testRunning || isGenerating}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                {testRunning ? "Testing..." : "Run Full Performance Test"}
              </Button>

              <Button
                variant="outline"
                onClick={() => generateTestData(selectedSize)}
                disabled={isGenerating || testRunning}
              >
                {isGenerating ? "Generating..." : "Regenerate Data"}
              </Button>
            </div>

            {testRunning && (
              <div className="text-sm text-muted-foreground">
                Running automated performance tests... Check console for
                detailed results.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 测试表格 */}
        <Card>
          <CardHeader>
            <CardTitle>
              Virtual Grade Table - {gradeData.length.toLocaleString()} Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gradeData.length > 0 ? (
              <VirtualGradeTable
                grades={gradeData}
                onRowClick={(grade) => console.log("Clicked:", grade)}
                height={600}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Click "Regenerate Data" to load test data
              </div>
            )}
          </CardContent>
        </Card>

        {/* 性能指标说明 */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-green-500">
                Target Met
              </Badge>
              <span>FPS ≥ 55, Render Time &lt; 100ms</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Acceptable</Badge>
              <span>FPS 30-54, Render Time 100-500ms</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive">Needs Improvement</Badge>
              <span>FPS &lt; 30, Render Time &gt; 500ms</span>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <p>
                <strong>Phase 1.2 Goals:</strong>
              </p>
              <ul className="list-disc list-inside ml-2 mt-1">
                <li>55+ FPS scrolling with 10,000+ grade records</li>
                <li>90% performance improvement over traditional table</li>
                <li>Memory usage reduced by ~80% for large datasets</li>
                <li>
                  Render only visible rows (10-12 rows) instead of all rows
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
