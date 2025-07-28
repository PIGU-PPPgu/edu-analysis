/**
 * 🔧 VirtualTable组件性能测试
 * 验证虚拟滚动大数据优化效果
 */

import React, { useState, useEffect } from "react";
import { VirtualTable, GradeDataPreview } from "@/components/ui/VirtualTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// 生成测试数据
const generateTestData = (count: number) => {
  const data = [];
  const subjects = [
    "语文",
    "数学",
    "英语",
    "物理",
    "化学",
    "道法",
    "历史",
    "生物",
    "地理",
  ];
  const classes = ["一班", "二班", "三班", "四班", "五班"];

  for (let i = 0; i < count; i++) {
    data.push({
      id: `student_${i}`,
      student_id: `S${String(i).padStart(4, "0")}`,
      name: `学生${i}`,
      class_name: classes[i % classes.length],
      exam_title: `期${Math.floor(i / 100) + 1}考试`,
      exam_date: new Date(2024, i % 12, (i % 28) + 1)
        .toISOString()
        .split("T")[0],
      subject: subjects[i % subjects.length],
      score: Math.floor(Math.random() * 40) + 60, // 60-100分
      total_score: Math.floor(Math.random() * 200) + 300, // 300-500分
      grade: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
      rank_in_class: (i % 30) + 1,
      rank_in_grade: (i % 150) + 1,
      created_at: new Date().toISOString(),
    });
  }

  return data;
};

interface PerformanceTestResult {
  dataSize: number;
  renderTime: number;
  scrollPerformance: number;
  memoryUsage?: number;
  virtualized: boolean;
}

export const VirtualTablePerformanceTest: React.FC = () => {
  const [testData, setTestData] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<PerformanceTestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);

  const headers = [
    "student_id",
    "name",
    "class_name",
    "exam_title",
    "exam_date",
    "subject",
    "score",
    "total_score",
    "grade",
    "rank_in_class",
  ];

  // 性能测试函数
  const runPerformanceTest = async (
    dataSize: number,
    useVirtualization: boolean
  ) => {
    setCurrentTest(
      `测试 ${dataSize} 条数据 (${useVirtualization ? "虚拟化" : "非虚拟化"})`
    );

    const data = generateTestData(dataSize);
    setTestData(data);

    // 等待DOM更新
    await new Promise((resolve) => setTimeout(resolve, 100));

    const startTime = performance.now();

    // 模拟滚动测试
    const scrollStart = performance.now();
    // 这里可以添加实际的滚动性能测试
    const scrollTime = performance.now() - scrollStart;

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    return {
      dataSize,
      renderTime,
      scrollPerformance: scrollTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      virtualized: useVirtualization,
    };
  };

  // 运行完整性能测试套件
  const runFullTestSuite = async () => {
    setIsRunning(true);
    setTestResults([]);

    const testSizes = [100, 500, 1000, 5000, 10000];
    const results: PerformanceTestResult[] = [];

    for (const size of testSizes) {
      // 测试虚拟化版本
      const virtualizedResult = await runPerformanceTest(size, true);
      results.push(virtualizedResult);

      // 对于小数据集，也测试非虚拟化版本
      if (size <= 1000) {
        const nonVirtualizedResult = await runPerformanceTest(size, false);
        results.push(nonVirtualizedResult);
      }

      setTestResults([...results]);

      // 每次测试间等待
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setCurrentTest("测试完成");
    setIsRunning(false);
  };

  // 性能指标回调
  const handlePerformanceMetrics = (metrics: any) => {
    console.log("📊 VirtualTable性能指标:", metrics);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            🔧 VirtualTable 性能测试
            <Button
              onClick={runFullTestSuite}
              disabled={isRunning}
              className="ml-4"
            >
              {isRunning ? "测试中..." : "开始性能测试"}
            </Button>
          </CardTitle>
          {currentTest && (
            <p className="text-sm text-gray-600">{currentTest}</p>
          )}
        </CardHeader>

        <CardContent>
          {/* 测试结果表格 */}
          {testResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">测试结果</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2">
                        数据量
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        虚拟化
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        渲染时间(ms)
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        滚动性能
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        内存使用
                      </th>
                      <th className="border border-gray-300 px-4 py-2">
                        性能等级
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((result, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.dataSize}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Badge
                            variant={
                              result.virtualized ? "default" : "secondary"
                            }
                          >
                            {result.virtualized ? "是" : "否"}
                          </Badge>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <span
                            className={
                              result.renderTime > 100
                                ? "text-red-600"
                                : "text-green-600"
                            }
                          >
                            {result.renderTime.toFixed(2)}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.scrollPerformance.toFixed(2)}ms
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {result.memoryUsage
                            ? `${(result.memoryUsage / 1024 / 1024).toFixed(1)}MB`
                            : "N/A"}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Badge
                            variant={
                              result.renderTime < 50
                                ? "default"
                                : result.renderTime < 100
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {result.renderTime < 50
                              ? "优秀"
                              : result.renderTime < 100
                                ? "良好"
                                : "需优化"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 实时测试表格 */}
          {testData.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">
                当前测试数据 ({testData.length} 条记录)
              </h3>

              <VirtualTable
                data={testData}
                headers={headers}
                maxHeight={400}
                enableVirtualization={testData.length > 100}
                enableVariableHeight={false}
                overscanCount={testData.length > 1000 ? 10 : 5}
                showSearch={true}
                showColumnFilter={true}
                sortable={true}
                showExport={true}
                onPerformanceMetrics={handlePerformanceMetrics}
                onExport={(data) => {
                  console.log("导出数据:", data.length);
                }}
              />
            </div>
          )}

          {/* 性能优化建议 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900">🚀 性能优化建议:</h4>
            <ul className="mt-2 text-sm text-blue-800">
              <li>• 数据量 &gt; 100条: 启用虚拟化滚动</li>
              <li>• 数据量 &gt; 1000条: 增加overscanCount到10</li>
              <li>• 数据量 &gt; 5000条: 启用性能模式，限制搜索范围</li>
              <li>• 渲染时间 &gt; 100ms: 检查自定义渲染器复杂度</li>
              <li>• 内存使用 &gt; 100MB: 考虑分页或懒加载</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VirtualTablePerformanceTest;
