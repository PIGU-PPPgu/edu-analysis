import React from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeatmapChart from "@/components/analysis/HeatmapChart";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import ExamComparison from "@/components/analysis/ExamComparison";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import CompetencyRadar from "@/components/analysis/CompetencyRadar";
import CorrelationBubble from "@/components/analysis/CorrelationBubble";

interface Class {
  id: string;
  name: string;
  grade: string;
  created_at?: string;
}

interface Props {
  mockClasses: Class[];
}

const OverviewTab: React.FC<Props> = ({ mockClasses }) => {
  const scoreDistributionData = [
    { range: "90-100分", count: 12, color: "#8884d8" },
    { range: "80-89分", count: 18, color: "#82ca9d" },
    { range: "70-79分", count: 15, color: "#ffc658" },
    { range: "60-69分", count: 8, color: "#ff8042" },
    { range: "60分以下", count: 3, color: "#ff6347" }
  ];

  const competencyData = [
    { name: "知识理解", current: 85, average: 78, fullScore: 100 },
    { name: "应用能力", current: 76, average: 70, fullScore: 100 },
    { name: "分析能力", current: 68, average: 65, fullScore: 100 },
    { name: "创新思维", current: 72, average: 62, fullScore: 100 },
    { name: "表达能力", current: 80, average: 75, fullScore: 100 },
    { name: "合作学习", current: 88, average: 82, fullScore: 100 },
  ];

  const correlationData = [
    { name: "学生A", xValue: 85, yValue: 90, zValue: 75, subject: "语文" },
    { name: "学生B", xValue: 78, yValue: 82, zValue: 85, subject: "语文" },
    { name: "学生C", xValue: 92, yValue: 85, zValue: 65, subject: "语文" },
    { name: "学生D", xValue: 65, yValue: 75, zValue: 90, subject: "数学" },
    { name: "学生E", xValue: 72, yValue: 68, zValue: 78, subject: "数学" },
    { name: "学生F", xValue: 83, yValue: 77, zValue: 82, subject: "数学" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClasses.map((classData) => (
          <Card key={classData.id} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-center gap-2 text-base font-semibold mb-4">
                {classData.name}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">年级:</span>
                  <span className="font-medium">{classData.grade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">创建时间:</span>
                  <span className="font-medium">{new Date(classData.created_at || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm" asChild>
                <Link to={`#${classData.id}`}>查看详情</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeatmapChart />
        <ScoreBoxPlot 
          data={[
            { subject: "语文", min: 65, q1: 75, median: 82, q3: 88, max: 95 },
            { subject: "数学", min: 60, q1: 72, median: 80, q3: 85, max: 98 },
            { subject: "英语", min: 62, q1: 73, median: 81, q3: 87, max: 96 },
            { subject: "物理", min: 58, q1: 70, median: 78, q3: 84, max: 93 },
            { subject: "化学", min: 63, q1: 74, median: 83, q3: 89, max: 97 },
            { subject: "生物", min: 67, q1: 76, median: 84, q3: 90, max: 99 }
          ]}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExamComparison />
        <ScoreDistribution data={scoreDistributionData} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetencyRadar data={competencyData} />
        <CorrelationBubble 
          data={correlationData} 
          xName="课堂表现" 
          yName="作业质量" 
          zName="考试成绩"
          title="学习表现关联分析"
          description="课堂表现、作业质量与考试成绩的关联性"
        />
      </div>
      
      <div className="flex justify-end">
        <Button asChild>
          <Link to="/student-management">
            <FileText className="mr-2 h-4 w-4" />
            查看学生管理
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default OverviewTab;
