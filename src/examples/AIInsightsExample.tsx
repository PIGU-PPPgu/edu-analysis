/**
 * AI洞察功能使用示例
 * 展示如何在页面中集成智能分析引擎
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles } from "lucide-react";
import { AIInsightsPanel } from "@/components/analysis/ai/AIInsightsPanel";
import { advancedAnalysisEngine } from "@/services/ai/advancedAnalysisEngine";
import { toast } from "sonner";

// 模拟数据
const mockGradeData = [
  {
    student_id: "001",
    student_name: "张三",
    class_name: "高一(1)班",
    total_score: 95,
    chinese_score: 92,
    math_score: 98,
    english_score: 95,
  },
  {
    student_id: "002",
    student_name: "李四",
    class_name: "高一(1)班",
    total_score: 88,
    chinese_score: 85,
    math_score: 90,
    english_score: 89,
  },
  {
    student_id: "003",
    student_name: "王五",
    class_name: "高一(1)班",
    total_score: 45,
    chinese_score: 42,
    math_score: 48,
    english_score: 45,
  },
  {
    student_id: "004",
    student_name: "赵六",
    class_name: "高一(2)班",
    total_score: 92,
    chinese_score: 90,
    math_score: 94,
    english_score: 92,
  },
  {
    student_id: "005",
    student_name: "钱七",
    class_name: "高一(2)班",
    total_score: 78,
    chinese_score: 75,
    math_score: 80,
    english_score: 79,
  },
];

export const AIInsightsExample: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = React.useState<string | null>(
    null
  );
  const [explanation, setExplanation] = React.useState<string>("");

  // 解释统计指标
  const explainMetric = async (metric: string, value: number) => {
    setSelectedMetric(metric);
    const result = advancedAnalysisEngine.explainStatistic(metric, value, {
      examName: "期中考试",
      subject: "总分",
    });

    setExplanation(`
      ${result.meaning}
      
      详细说明：${result.context}
      
      重要性：${
        result.significance === "very_good"
          ? "非常好"
          : result.significance === "good"
            ? "良好"
            : result.significance === "average"
              ? "一般"
              : result.significance === "concerning"
                ? "需关注"
                : "需要改进"
      }
      
      ${
        result.comparison
          ? `与${result.comparison.benchmarkLabel}相比：${result.comparison.difference > 0 ? "+" : ""}${result.comparison.difference.toFixed(1)}`
          : ""
      }
    `);

    toast.success("指标解释已生成");
  };

  // 处理洞察操作
  const handleInsightAction = (actionId: string, actionData?: any) => {
    console.log("执行洞察操作:", actionId, actionData);
    toast.info(`操作触发: ${actionId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            AI智能分析功能示例
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 功能介绍 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">功能特点</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• 自动识别数据中的关键发现</li>
              <li>• 将专业统计术语翻译成通俗语言</li>
              <li>• 生成可操作的建议</li>
              <li>• 提供趋势预测和异常解释</li>
            </ul>
          </div>

          {/* AI洞察面板 */}
          <div>
            <h3 className="font-semibold mb-3">智能洞察示例</h3>
            <AIInsightsPanel
              data={mockGradeData}
              context={{
                examId: "exam_001",
                className: "高一(1)班",
              }}
              autoAnalyze={true}
              maxInsights={5}
              onActionTriggered={handleInsightAction}
            />
          </div>

          {/* 统计指标解释示例 */}
          <div>
            <h3 className="font-semibold mb-3">统计指标解释</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={() => explainMetric("average", 78.4)}
                className="text-sm"
              >
                平均分: 78.4
              </Button>
              <Button
                variant="outline"
                onClick={() => explainMetric("passRate", 0.85)}
                className="text-sm"
              >
                及格率: 85%
              </Button>
              <Button
                variant="outline"
                onClick={() => explainMetric("standardDeviation", 15.2)}
                className="text-sm"
              >
                标准差: 15.2
              </Button>
              <Button
                variant="outline"
                onClick={() => explainMetric("variance", 231.04)}
                className="text-sm"
              >
                方差: 231.04
              </Button>
            </div>

            {selectedMetric && explanation && (
              <Card className="mt-4 bg-purple-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-900 mb-1">
                        {selectedMetric === "average"
                          ? "平均分"
                          : selectedMetric === "passRate"
                            ? "及格率"
                            : selectedMetric === "standardDeviation"
                              ? "标准差"
                              : "方差"}
                        解释
                      </h4>
                      <p className="text-sm text-purple-800 whitespace-pre-line">
                        {explanation}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 使用说明 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">集成方式</h3>
            <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
              {`// 1. 导入组件
import { AIInsightsPanel } from '@/components/analysis/ai/AIInsightsPanel';

// 2. 在组件中使用
<AIInsightsPanel 
  data={gradeData}
  context={{
    examId: 'exam_001',
    className: '高一(1)班',
  }}
  autoAnalyze={true}
  onActionTriggered={handleAction}
/>`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIInsightsExample;
