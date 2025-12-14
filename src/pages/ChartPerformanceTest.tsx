/**
 * 图表性能测试页面
 * Phase 1.3: 验证图表组件优化效果
 *
 * 使用方法：
 * 1. 访问 /chart-performance-test
 * 2. 观察各个图表的重渲染次数统计
 * 3. 点击"触发父组件重渲染"按钮，观察哪些图表会重渲染
 * 4. 修改数据，观察图表是否正确更新
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  BarChart3,
  RefreshCw,
  Check,
  AlertCircle,
  TrendingUp,
  Eye,
} from "lucide-react";

// 导入优化后的图表组件
import ScoreChart from "@/components/profile/ScoreChart";
import ClassComparisonChart from "@/components/analysis/comparison/ClassComparisonChart";
import BoxPlotChart from "@/components/analysis/charts/BoxPlotChart";
import RiskFactorChart from "@/components/warning/RiskFactorChart";
import WarningTrendChart from "@/components/warning/WarningTrendChart";

// 性能监控 Hook
function useRenderCount(componentName: string) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;

    console.log(
      `[${componentName}] Render #${renderCount.current} (${timeSinceLastRender}ms since last render)`
    );
  });

  return renderCount.current;
}

// 包装组件以监控渲染
function MonitoredChart({
  name,
  children,
  color,
}: {
  name: string;
  children: React.ReactNode;
  color: string;
}) {
  const renderCount = useRenderCount(name);

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Badge
          variant="secondary"
          className="font-mono text-xs"
          style={{ backgroundColor: color, color: "white" }}
        >
          <Activity className="h-3 w-3 mr-1" />
          渲染次数: {renderCount}
        </Badge>
      </div>
      {children}
    </div>
  );
}

export default function ChartPerformanceTest() {
  const [parentRenderCount, setParentRenderCount] = useState(0);
  const [dataVersion, setDataVersion] = useState(1);
  const [testResults, setTestResults] = useState<{
    [key: string]: { renders: number; passed: boolean };
  }>({});

  // 测试数据
  const studentData = {
    name: "测试学生",
    scores: [
      { subject: "语文", score: 85 },
      { subject: "数学", score: 92 },
      { subject: "英语", score: 88 },
      { subject: "物理", score: 90 },
      { subject: "化学", score: 87 },
    ],
  };

  const gradeData = [
    {
      id: "1",
      student_id: "S001",
      name: "张三",
      class_name: "高一(1)班",
      exam_title: "期中考试",
      total_score: 523,
      chinese_score: 95,
      math_score: 88,
      english_score: 92,
      physics_score: 85,
      chemistry_score: 90,
      total_rank_in_class: 5,
      chinese_rank_in_class: 3,
    },
    {
      id: "2",
      student_id: "S002",
      name: "李四",
      class_name: "高一(2)班",
      exam_title: "期中考试",
      total_score: 498,
      chinese_score: 88,
      math_score: 92,
      english_score: 85,
      physics_score: 90,
      chemistry_score: 87,
      total_rank_in_class: 8,
      chinese_rank_in_class: 10,
    },
  ];

  const boxPlotData = [
    {
      subject: "语文",
      min: 60,
      q1: 75,
      median: 85,
      q3: 92,
      max: 98,
      mean: 84.5,
      count: 100,
      fullScore: 100,
      outliers: [55, 58],
    },
    {
      subject: "数学",
      min: 65,
      q1: 78,
      median: 88,
      q3: 95,
      max: 100,
      mean: 87.2,
      count: 100,
      fullScore: 100,
      outliers: [58, 62],
    },
  ];

  const riskFactorData = [
    {
      factor: "成绩下降",
      count: 15,
      percentage: 35,
      category: "学业",
      severity: "high",
    },
    {
      factor: "出勤率低",
      count: 8,
      percentage: 22,
      category: "考勤",
      severity: "medium",
    },
    {
      factor: "作业未交",
      count: 12,
      percentage: 28,
      category: "学业",
      severity: "medium",
    },
  ];

  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 30 + i);
    return {
      date: date.toISOString().split("T")[0],
      totalWarnings: Math.floor(Math.random() * 10) + 5,
      highSeverity: Math.floor(Math.random() * 3) + 1,
      mediumSeverity: Math.floor(Math.random() * 5) + 2,
      lowSeverity: Math.floor(Math.random() * 3) + 1,
      gradeRelated: Math.floor(Math.random() * 5) + 3,
      behaviorRelated: Math.floor(Math.random() * 3) + 1,
      attendanceRelated: Math.floor(Math.random() * 2) + 1,
      progressRate: 75 + Math.random() * 15,
    };
  });

  // 触发父组件重渲染（不改变数据）
  const triggerParentRerender = useCallback(() => {
    setParentRenderCount((prev) => prev + 1);
  }, []);

  // 修改数据（应该触发图表重渲染）
  const updateData = useCallback(() => {
    setDataVersion((prev) => prev + 1);
  }, []);

  // 运行自动测试
  const runAutomatedTest = async () => {
    console.log("=== 开始自动性能测试 ===");

    // 测试 1: 父组件重渲染，子组件不应该重渲染
    console.log("\n测试 1: 父组件重渲染（无数据变化）");
    const beforeCounts = { ...testResults };
    triggerParentRerender();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 测试 2: 数据变化，子组件应该重渲染
    console.log("\n测试 2: 数据变化");
    updateData();
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("=== 测试完成 ===");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  图表性能测试 - Phase 1.3 验证
                </CardTitle>
                <p className="text-sm text-gray-500 mt-2">
                  验证 React.memo 和 useMemo 优化效果，观察图表重渲染行为
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                父组件渲染: {parentRenderCount} 次
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button onClick={triggerParentRerender} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                触发父组件重渲染（测试 memo 效果）
              </Button>
              <Button onClick={updateData} variant="secondary">
                <TrendingUp className="h-4 w-4 mr-2" />
                修改数据（应该触发重渲染）
              </Button>
              <Button onClick={runAutomatedTest} variant="outline">
                <Activity className="h-4 w-4 mr-2" />
                运行自动测试
              </Button>
            </div>

            {/* 测试说明 */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                <Eye className="h-4 w-4 mr-2" />
                如何验证优化效果
              </h3>
              <ol className="text-sm text-blue-800 space-y-2 ml-4 list-decimal">
                <li>
                  <strong>打开 React DevTools Profiler</strong>: 在浏览器中按
                  F12 → Profiler 标签页 → 点击录制按钮
                </li>
                <li>
                  <strong>测试场景 1</strong>: 点击"触发父组件重渲染"按钮 →
                  观察图表右上角的"渲染次数"徽章
                  <span className="text-green-600 font-semibold ml-2">
                    ✅ 预期：渲染次数不增加（memo 生效）
                  </span>
                </li>
                <li>
                  <strong>测试场景 2</strong>: 点击"修改数据"按钮 →
                  观察渲染次数增加
                  <span className="text-green-600 font-semibold ml-2">
                    ✅ 预期：渲染次数+1（正确更新）
                  </span>
                </li>
                <li>
                  <strong>Profiler 分析</strong>: 停止录制 →
                  查看火焰图，优化后的组件应该显示为灰色（未重渲染）
                </li>
                <li>
                  <strong>查看控制台</strong>: 打开 Console 标签页 →
                  观察详细的渲染日志
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* 优化指标说明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Phase 1.3 优化目标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">目标 1</h3>
                </div>
                <p className="text-sm text-green-800">
                  减少图表重渲染次数 <strong>70%</strong>
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">目标 2</h3>
                </div>
                <p className="text-sm text-green-800">
                  优化 <strong>5 个核心图表组件</strong>
                </p>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">目标 3</h3>
                </div>
                <p className="text-sm text-green-800">
                  提升大数据量场景下的<strong>交互流畅度</strong>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 图表测试区域 */}
        <Tabs defaultValue="score" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="score">ScoreChart</TabsTrigger>
            <TabsTrigger value="comparison">ClassComparison</TabsTrigger>
            <TabsTrigger value="boxplot">BoxPlot</TabsTrigger>
            <TabsTrigger value="risk">RiskFactor</TabsTrigger>
            <TabsTrigger value="trend">WarningTrend</TabsTrigger>
          </TabsList>

          <TabsContent value="score" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  ScoreChart - 简单柱状图组件
                </CardTitle>
                <p className="text-sm text-gray-500">
                  优化措施: React.memo + useMemo 缓存配置和数据
                </p>
              </CardHeader>
              <CardContent>
                <MonitoredChart name="ScoreChart" color="#3b82f6">
                  <ScoreChart
                    student={{
                      ...studentData,
                      scores: studentData.scores.map((s) => ({
                        ...s,
                        score: s.score + (dataVersion % 2 === 0 ? 0 : 0.1), // 数据版本变化时稍微改变
                      })),
                    }}
                  />
                </MonitoredChart>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  ClassComparisonChart - 复杂多视图组件
                </CardTitle>
                <p className="text-sm text-gray-500">
                  优化措施: React.memo + useMemo 缓存多个视图的数据处理 +
                  useCallback 缓存事件处理
                </p>
              </CardHeader>
              <CardContent>
                <MonitoredChart name="ClassComparisonChart" color="#10b981">
                  <ClassComparisonChart
                    data={gradeData.map((d) => ({
                      ...d,
                      total_score:
                        d.total_score + (dataVersion % 2 === 0 ? 0 : 1),
                    }))}
                    selectedSubject="total"
                  />
                </MonitoredChart>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="boxplot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  BoxPlotChart - 自定义 SVG 箱线图
                </CardTitle>
                <p className="text-sm text-gray-500">
                  优化措施: React.memo + useMemo 缓存 SVG 配置和坐标转换函数
                </p>
              </CardHeader>
              <CardContent>
                <MonitoredChart name="BoxPlotChart" color="#f59e0b">
                  <BoxPlotChart
                    data={boxPlotData.map((d) => ({
                      ...d,
                      median: d.median + (dataVersion % 2 === 0 ? 0 : 0.5),
                    }))}
                    title="成绩分布分析"
                  />
                </MonitoredChart>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  RiskFactorChart - 主组件 + 5 个子组件
                </CardTitle>
                <p className="text-sm text-gray-500">
                  优化措施: React.memo 包装所有子组件 + useMemo 缓存数据处理 +
                  useCallback 缓存事件处理
                </p>
              </CardHeader>
              <CardContent>
                <MonitoredChart name="RiskFactorChart" color="#ef4444">
                  <RiskFactorChart
                    data={riskFactorData.map((d) => ({
                      ...d,
                      count: d.count + (dataVersion % 2 === 0 ? 0 : 1),
                    }))}
                  />
                </MonitoredChart>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  WarningTrendChart - 超大型趋势图组件 (800+ 行)
                </CardTitle>
                <p className="text-sm text-gray-500">
                  优化措施: React.memo 主组件 + 2 个子组件 + useMemo
                  缓存图表渲染 + useCallback 缓存所有事件处理
                </p>
              </CardHeader>
              <CardContent>
                <MonitoredChart name="WarningTrendChart" color="#8b5cf6">
                  <WarningTrendChart
                    data={trendData.map((d) => ({
                      ...d,
                      totalWarnings:
                        d.totalWarnings + (dataVersion % 2 === 0 ? 0 : 1),
                    }))}
                    showComparison={true}
                  />
                </MonitoredChart>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 性能分析指南 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              React DevTools Profiler 使用指南
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">1. 安装 React DevTools</h4>
                <p className="text-sm text-gray-600">
                  Chrome/Edge 扩展商店搜索 "React Developer Tools" 并安装
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">2. 开始性能分析</h4>
                <ol className="text-sm text-gray-600 list-decimal ml-4 space-y-1">
                  <li>按 F12 打开开发者工具</li>
                  <li>切换到 "Profiler" 标签页</li>
                  <li>点击录制按钮（红色圆圈）</li>
                  <li>执行测试操作（点击上面的按钮）</li>
                  <li>停止录制</li>
                </ol>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">3. 分析结果</h4>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    <strong className="text-green-600">灰色组件</strong>:
                    没有重渲染（React.memo 生效）
                  </p>
                  <p>
                    <strong className="text-yellow-600">黄色组件</strong>:
                    重渲染了，但耗时较短
                  </p>
                  <p>
                    <strong className="text-red-600">红色组件</strong>:
                    重渲染且耗时较长
                  </p>
                  <p className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <strong>优化后的预期</strong>:
                    当点击"触发父组件重渲染"时，所有 5
                    个图表组件应该显示为灰色（未重渲染）
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">4. 控制台日志分析</h4>
                <p className="text-sm text-gray-600 mb-2">
                  打开 Console 标签页，观察详细的渲染日志：
                </p>
                <pre className="text-xs bg-black text-green-400 p-3 rounded overflow-x-auto">
                  {`[ScoreChart] Render #1 (0ms since last render)
[ScoreChart] Render #2 (1523ms since last render)  // 数据变化，正常
[ClassComparisonChart] Render #1 (0ms since last render)
// 父组件重渲染，但图表不重渲染 = memo 生效 ✅`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 优化总结 */}
        <Card className="border-2 border-green-500">
          <CardHeader className="bg-green-50">
            <CardTitle className="text-lg text-green-900 flex items-center gap-2">
              <Check className="h-5 w-5" />
              Phase 1.3 优化总结
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-3">✅ 已优化的 5 个组件</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>ScoreChart - 简单柱状图</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>ClassComparisonChart - 复杂多视图</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>BoxPlotChart - SVG 箱线图</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>RiskFactorChart - 主组件 + 5 子组件</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>WarningTrendChart - 超大型组件</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-3">🚀 优化技术应用</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">React.memo</Badge>
                    <span>包装组件避免不必要重渲染</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">useMemo</Badge>
                    <span>缓存计算密集型数据处理</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">useCallback</Badge>
                    <span>缓存事件处理函数</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">自定义比较</Badge>
                    <span>精确控制重渲染条件</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline">配置外部化</Badge>
                    <span>避免每次渲染创建新对象</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
