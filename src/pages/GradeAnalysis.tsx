
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import SubjectAverages from "@/components/analysis/SubjectAverages";
import ClassComparison from "@/components/analysis/ClassComparison";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import StudentGradeTrend from "@/components/analysis/StudentGradeTrend";
import StudentReportExport from "@/components/analysis/StudentReportExport";
import Navbar from "@/components/analysis/Navbar";

// Mock data for testing
const mockDistributionData = [
  { range: "90-100", count: 5, color: "#B9FF66" },
  { range: "80-89", count: 15, color: "#8884d8" },
  { range: "70-79", count: 20, color: "#82ca9d" },
  { range: "60-69", count: 8, color: "#ffc658" },
  { range: "<60", count: 2, color: "#ff8042" }
];

const mockSubjectData = [
  { subject: "语文", average: 85 },
  { subject: "数学", average: 82 },
  { subject: "英语", average: 78 },
  { subject: "物理", average: 80 },
  { subject: "化学", average: 83 }
];

const mockStudentData = {
  studentId: "2024001",
  name: "张三",
  className: "高二(1)班",
  scores: [
    { subject: "语文", score: 88, examDate: "2024-03", examType: "月考" },
    { subject: "数学", score: 92, examDate: "2024-03", examType: "月考" },
    { subject: "英语", score: 85, examDate: "2024-03", examType: "月考" },
  ]
};

const GradeAnalysis: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-4">
            <TabsTrigger value="overview">总览分析</TabsTrigger>
            <TabsTrigger value="individual">个人分析</TabsTrigger>
            <TabsTrigger value="comparison">对比分析</TabsTrigger>
            <TabsTrigger value="reports">报告导出</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatisticsOverview />
              <ScoreDistribution data={mockDistributionData} />
              <SubjectAverages data={mockSubjectData} />
            </div>
          </TabsContent>

          <TabsContent value="individual" className="space-y-6">
            <StudentGradeTrend 
              studentId={mockStudentData.studentId}
              studentName={mockStudentData.name}
            />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <ClassComparison 
              studentId={mockStudentData.studentId}
              studentName={mockStudentData.name}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StudentReportExport student={mockStudentData} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GradeAnalysis;

