
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/analysis/Navbar";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import GradeTable from "@/components/analysis/GradeTable";
import IntelligentFileParser from "@/components/analysis/IntelligentFileParser";
import AIDataAnalysis from "@/components/analysis/AIDataAnalysis";

const scoreDistributionData = [
  { range: "90-100分", count: 15, color: "#4CAF50" },
  { range: "80-89分", count: 23, color: "#8BC34A" },
  { range: "70-79分", count: 18, color: "#CDDC39" },
  { range: "60-69分", count: 12, color: "#FFEB3B" },
  { range: "60分以下", count: 7, color: "#F44336" },
];

const boxPlotData = [
  { subject: "语文", min: 52, q1: 68, median: 78, q3: 88, max: 98 },
  { subject: "数学", min: 45, q1: 62, median: 75, q3: 85, max: 97 },
  { subject: "英语", min: 50, q1: 65, median: 76, q3: 86, max: 95 },
  { subject: "物理", min: 48, q1: 60, median: 72, q3: 82, max: 94 },
  { subject: "化学", min: 55, q1: 66, median: 77, q3: 87, max: 96 },
];

const GradeAnalysis: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [showCharts, setShowCharts] = useState(false);

  const handleDataParsed = (parsedData: any[]) => {
    setData(parsedData);
    setShowCharts(true);
  };

  // 模拟成绩数据
  const mockGradeData = data.length > 0 ? data : [
    { studentId: "2024001", name: "张三", subject: "语文", score: 92, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024001", name: "张三", subject: "数学", score: 85, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024001", name: "张三", subject: "英语", score: 78, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "语文", score: 88, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "数学", score: 95, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024002", name: "李四", subject: "英语", score: 82, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "语文", score: 75, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "数学", score: 67, examDate: "2023-09-01", examType: "期中考试" },
    { studentId: "2024003", name: "王五", subject: "英语", score: 85, examDate: "2023-09-01", examType: "期中考试" },
  ];

  // 统计数据
  const scores = mockGradeData.map(item => item.score);
  const statData = {
    avg: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    max: Math.max(...scores),
    min: Math.min(...scores),
    passing: scores.filter(score => score >= 60).length,
    total: scores.length,
  };

  // 生成的图表组件
  const chartComponents = [
    <ScoreDistribution key="distribution" data={scoreDistributionData} />,
    <ScoreBoxPlot key="boxplot" data={boxPlotData} />
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">成绩分析</h1>
            <p className="text-gray-500 mt-1">
              导入和分析学生成绩数据，生成统计图表和报告
            </p>
          </div>
          
          <IntelligentFileParser onDataParsed={handleDataParsed} />
          
          {showCharts && (
            <>
              <StatisticsOverview {...statData} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <ScoreDistribution data={scoreDistributionData} />
                <ScoreBoxPlot data={boxPlotData} />
              </div>
              
              <GradeTable data={mockGradeData} />
              
              <AIDataAnalysis data={mockGradeData} charts={chartComponents} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeAnalysis;
