"use client";

/**
 * 分数段对比分析 - 使用示例页面
 * 展示如何在班级报告或AI分析中集成ScoreBandComparison组件
 */

import { useState } from "react";
import { ScoreBandComparison } from "./ScoreBandComparison";
import { mockScoreBandData } from "./mockScoreBandData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ScoreBandComparisonDemo() {
  const [loading, setLoading] = useState(false);
  const [showCumulative, setShowCumulative] = useState(true);
  const [showRank, setShowRank] = useState(true);

  // 模拟加载数据
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">分数段对比分析</h1>
          <p className="text-muted-foreground mt-2">
            对比入口考试和出口考试的各等级人数分布变化
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              加载中...
            </>
          ) : (
            "刷新数据"
          )}
        </Button>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">显示选项</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-cumulative"
              checked={showCumulative}
              onCheckedChange={setShowCumulative}
            />
            <Label htmlFor="show-cumulative">显示累计列（A以上）</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="show-rank"
              checked={showRank}
              onCheckedChange={setShowRank}
            />
            <Label htmlFor="show-rank">显示平均分排名</Label>
          </div>
        </CardContent>
      </Card>

      {/* 分数段对比组件 */}
      {loading ? (
        <Card>
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </CardContent>
        </Card>
      ) : (
        <ScoreBandComparison
          data={mockScoreBandData}
          showCumulative={showCumulative}
          showRank={showRank}
        />
      )}

      {/* 集成说明 */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-base">集成说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p className="font-semibold">如何在班级报告中使用：</p>
          <pre className="bg-white p-4 rounded-lg overflow-x-auto">
            {`import { ScoreBandComparison } from "@/components/value-added/analysis/ScoreBandComparison";
import { calculateScoreBandAnalysis } from "@/services/scoreBandAnalysisService";

// 在组件中
const [scoreBandData, setScoreBandData] = useState<ScoreBandAnalysis | null>(null);

useEffect(() => {
  const fetchData = async () => {
    const data = await calculateScoreBandAnalysis(activityId);
    setScoreBandData(data);
  };
  fetchData();
}, [activityId]);

// 渲染
{scoreBandData && (
  <ScoreBandComparison
    data={scoreBandData}
    showCumulative={true}
    showRank={true}
  />
)}`}
          </pre>

          <p className="font-semibold mt-4">等待calc-architect提供：</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li>
              <code className="bg-white px-2 py-0.5 rounded">
                scoreBandAnalysisService.ts
              </code>{" "}
              - 数据计算服务
            </li>
            <li>
              <code className="bg-white px-2 py-0.5 rounded">
                calculateScoreBandAnalysis(activityId: string)
              </code>{" "}
              - 计算函数
            </li>
            <li>确认数据接口格式是否与当前设计一致</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
