
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AutoChart } from "@/components/ui/chart";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import { getChartData } from "@/utils/chartGenerationUtils";
import { ChartData } from "@/contexts/GradeAnalysisContext";

interface Props {
  customCharts: ChartData[];
}

const scoreDistributionData = [
  { range: "90-100分", count: 15, color: "#4CAF50" },
  { range: "80-89分", count: 23, color: "#8BC34A" },
  { range: "70-79分", count: 18, color: "#CDDC39" },
  { range: "60-69分", count: 12, color: "#FFEB3B" },
  { range: "60分以下", count: 7, color: "#F44336" }
];

const boxPlotData = [
  { subject: "语文", min: 52, q1: 68, median: 78, q3: 88, max: 98 },
  { subject: "数学", min: 45, q1: 62, median: 75, q3: 85, max: 97 },
  { subject: "英语", min: 50, q1: 65, median: 76, q3: 86, max: 95 },
  { subject: "物理", min: 48, q1: 60, median: 72, q3: 82, max: 94 },
  { subject: "化学", min: 55, q1: 66, median: 77, q3: 87, max: 96 }
];

const CustomChartsSection: React.FC<Props> = ({ customCharts }) => {
  if (customCharts.length > 0) {
    // 渲染自动生成的图表
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {customCharts.map((chart, index) => (
          <Card key={index} className="relative overflow-visible animate-fade-in">
            <CardHeader>
              <CardTitle>
                {chart.id === "subjectAverages" ? "各科目平均分" :
                  chart.id === "scoreDistribution" ? "分数段分布" :
                  chart.id === "scoreTrend" ? "成绩趋势变化" :
                  chart.id === "examTypeComparison" ? "考试类型成绩对比" :
                  "分析图表"}
              </CardTitle>
              <CardDescription>
                {(chart.id === "subjectAverages" && "各学科的平均成绩对比") ||
                  (chart.id === "scoreDistribution" && "学生成绩在各分数段的分布情况") ||
                  (chart.id === "scoreTrend" && "各学科成绩随时间的变化趋势") ||
                  (chart.id === "examTypeComparison" && "不同考试类型的平均成绩对比") ||
                  ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 增强用户体验与动效 */}
              <div className="relative">
                {chart.id === "subjectAverages" ? (
                  <AutoChart 
                    data={getChartData(chart)}
                    xKey="subject"
                    yKeys={["averageScore"]}
                    colors={["#B9FF66"]}
                    chartType="bar"
                    height={300}
                  />
                ) : chart.id === "scoreDistribution" ? (
                  <AutoChart 
                    data={getChartData(chart)}
                    xKey="range"
                    yKeys={["count"]}
                    colors={["#B9FF66"]}
                    chartType="bar"
                    height={300}
                  />
                ) : chart.id === "scoreTrend" ? (
                  <AutoChart 
                    data={getChartData(chart)}
                    xKey="date"
                    yKeys={Object.keys(getChartData(chart)[0] || {}).filter(k => k !== "date")}
                    chartType="line"
                    height={300}
                  />
                ) : chart.id === "examTypeComparison" ? (
                  <AutoChart 
                    data={getChartData(chart)}
                    xKey="examType"
                    yKeys={["averageScore"]}
                    colors={["#B9FF66"]}
                    chartType="bar"
                    height={300}
                  />
                ) : (
                  <AutoChart 
                    data={[{ value: 0 }]}
                    xKey="value"
                    yKeys={["value"]}
                    chartType="bar"
                    height={300}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  // 若无自动图表，渲染默认静态
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ScoreDistribution data={scoreDistributionData} />
      <ScoreBoxPlot data={boxPlotData} />
    </div>
  );
};

export default CustomChartsSection;
