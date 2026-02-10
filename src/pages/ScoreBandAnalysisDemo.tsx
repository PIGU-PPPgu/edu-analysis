"use client";

/**
 * 分数段对比分析演示页面
 * Task #22: 展示入口/出口考试的等级分布对比功能
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScoreBandComparison } from "@/components/value-added/analysis/ScoreBandComparison";
import { calculateScoreBandAnalysisFromGradeData } from "@/services/scoreBandAnalysisService";
import { adaptAnalysisResultToUI } from "@/services/scoreBandAnalysisAdapter";
import type { ScoreBandAnalysis } from "@/services/scoreBandAnalysisAdapter";

export default function ScoreBandAnalysisDemo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<ScoreBandAnalysis | null>(
    null
  );

  // 示例：分析ph学校初一数学的分数段变化
  const handleLoadExample = async () => {
    setLoading(true);
    setError(null);

    try {
      // 调用计算服务
      const result = await calculateScoreBandAnalysisFromGradeData(
        "ph七上期中成绩", // 入口考试
        "ph七上期末成绩", // 出口考试
        [
          "总分",
          "语文",
          "数学",
          "英语",
          "物理",
          "化学",
          "生物",
          "政治",
          "历史",
          "地理",
        ], // 科目列表
        {
          school_name: "ph", // 可选：限制学校
        }
      );

      // 使用适配器转换为UI格式
      const uiData = adaptAnalysisResultToUI(result);
      setAnalysisData(uiData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>分数段对比分析演示</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={handleLoadExample} disabled={loading}>
              {loading ? "加载中..." : "加载示例数据（ph学校初一）"}
            </Button>
            {analysisData && (
              <Button variant="outline" onClick={() => setAnalysisData(null)}>
                清空
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {analysisData && (
            <ScoreBandComparison
              data={analysisData}
              showCumulative={true}
              showRank={false}
            />
          )}

          {!analysisData && !loading && (
            <div className="text-center text-muted-foreground py-12">
              点击上方按钮加载示例数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle>功能说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong className="text-foreground">功能特点：</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>对比入口考试和出口考试的等级分布（A+、A、B+、B、C+、C）</li>
                <li>显示累计统计（A+以上、A以上、B+以上、B以上、C+以上）</li>
                <li>标注人数和比例的变化（绿色↑增加、红色↓减少、灰色-不变）</li>
                <li>自动适配Excel导入的等级数据或基于排名计算等级</li>
              </ul>
            </div>
            <div>
              <strong className="text-foreground">
                等级定义（按排名百分位）：
              </strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>A+：前5%</li>
                <li>A：5%-25%</li>
                <li>B+：25%-50%</li>
                <li>B：50%-75%</li>
                <li>C+：75%-95%</li>
                <li>C：后5%</li>
              </ul>
            </div>
            <div>
              <strong className="text-foreground">API使用示例：</strong>
              <pre className="bg-muted p-3 rounded-md mt-2 overflow-x-auto">
                {`import { calculateScoreBandAnalysisFromGradeData } from '@/services/scoreBandAnalysisService';
import { adaptAnalysisToUI } from '@/services/scoreBandAdapter';

const result = await calculateScoreBandAnalysisFromGradeData(
  "入口考试名称",
  "出口考试名称",
  ["总分", "语文", "数学"], // 科目列表
  { class_name: "初一1班" } // 可选过滤
);

const uiData = adaptAnalysisToUI(result);
// uiData 可直接传给 <ScoreBandComparison data={uiData} />`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
