
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileText, ChartBar, ChartLine } from "lucide-react";
import GradeTable from "@/components/analysis/GradeTable";
import CustomChartsSection from "./CustomChartsSection";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import AIDataAnalysis from "@/components/analysis/AIDataAnalysis";
import { Button } from "@/components/ui/button";

const CHART_PRESETS = [
  { id: "distribution", name: "分数分布", icon: <ChartBar className="h-4 w-4" /> },
  { id: "subject", name: "学科对比", icon: <ChartBar className="h-4 w-4" /> },
  { id: "trend", name: "成绩趋势", icon: <ChartLine className="h-4 w-4" /> },
  { id: "boxplot", name: "箱线图分析", icon: <ChartBar className="h-4 w-4" /> },
  { id: "correlation", name: "相关性分析", icon: <ChartLine className="h-4 w-4" /> }
];

interface Props {
  data: any[];
  customCharts: any[];
  selectedCharts: string[];
  setSelectedCharts: (ids: string[]) => void;
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

const chartComponents = [
  <ScoreDistribution key="distribution" data={scoreDistributionData} />,
  <ScoreBoxPlot key="boxplot" data={boxPlotData} />
];

const GradeTabs: React.FC<Props> = ({
  data,
  customCharts,
  selectedCharts,
  setSelectedCharts
}) => {
  // 传递默认 gradeData 逻辑与原来一致
  const gradeData = data.length > 0 ? data : [
    { studentId: "2024001", name: "张三", subject: "语文", score: 92, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024001", name: "张三", subject: "数学", score: 85, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024001", name: "张三", subject: "英语", score: 78, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "语文", score: 88, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "数学", score: 95, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "英语", score: 82, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "语文", score: 75, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "数学", score: 67, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "英语", score: 85, examDate: "2023-09-01", examType: "期中考试" }
  ];

  return (
    <Tabs defaultValue="auto" className="mt-6">
      <TabsList>
        <TabsTrigger value="auto">
          <ChartBar className="h-4 w-4 mr-2" />
          自动分析
        </TabsTrigger>
        <TabsTrigger value="custom">
          <ChartBar className="h-4 w-4 mr-2" />
          自定义图表
        </TabsTrigger>
        <TabsTrigger value="data">
          <FileText className="h-4 w-4 mr-2" />
          原始数据
        </TabsTrigger>
      </TabsList>

      <TabsContent value="auto" className="space-y-6 mt-4">
        {/* 自动生成charts */}
        <CustomChartsSection customCharts={customCharts} />
        <AIDataAnalysis data={gradeData} charts={chartComponents} />
      </TabsContent>

      <TabsContent value="custom" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>自定义图表</CardTitle>
            <CardDescription>选择您想要的图表类型进行分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
              {CHART_PRESETS.map(preset => (
                <Button
                  key={preset.id}
                  variant={selectedCharts.includes(preset.id) ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => {
                    if (selectedCharts.includes(preset.id)) {
                      setSelectedCharts(selectedCharts.filter(id => id !== preset.id));
                    } else {
                      setSelectedCharts([...selectedCharts, preset.id]);
                    }
                  }}
                >
                  {preset.icon}
                  {preset.name}
                </Button>
              ))}
            </div>
            <div className="space-y-4 mt-4">
              {selectedCharts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  请选择至少一种图表类型
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedCharts.includes("distribution") && (
                    <ScoreDistribution data={scoreDistributionData} />
                  )}
                  {selectedCharts.includes("boxplot") && (
                    <ScoreBoxPlot data={boxPlotData} />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="data" className="mt-4">
        <GradeTable data={gradeData} />
      </TabsContent>
    </Tabs>
  );
};
export default GradeTabs;
