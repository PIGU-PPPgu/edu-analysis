
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import SubjectAverages from "@/components/analysis/SubjectAverages";
import ClassComparison from "@/components/analysis/ClassComparison";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import StudentGradeTrend from "@/components/analysis/StudentGradeTrend";
import StudentReportExport from "@/components/analysis/StudentReportExport";
import HeatmapChart from "@/components/analysis/HeatmapChart";
import ExamSelector from "@/components/analysis/ExamSelector";
import Navbar from "@/components/analysis/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

// Mock statistics data
const mockStatisticsData = {
  avg: 82.5,
  max: 98,
  min: 55,
  passing: 42,
  total: 50
};

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

// Mock exam data for selection
const mockExams = [
  { id: "exam1", name: "期初测试", date: "2023-02-15" },
  { id: "exam2", name: "第一次月考", date: "2023-03-20" },
  { id: "exam3", name: "期中考试", date: "2023-04-25" },
  { id: "exam4", name: "第二次月考", date: "2023-05-30" },
  { id: "exam5", name: "期末考试", date: "2023-06-28" },
  { id: "exam6", name: "高考模拟", date: "2023-12-15" }
];

const GradeAnalysis: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedExams, setSelectedExams] = useState<string[]>(["exam3", "exam4"]);

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
            <StatisticsOverview 
              avg={mockStatisticsData.avg}
              max={mockStatisticsData.max}
              min={mockStatisticsData.min}
              passing={mockStatisticsData.passing}
              total={mockStatisticsData.total}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ScoreDistribution data={mockDistributionData} />
              <SubjectAverages data={mockSubjectData} />
            </div>
            <HeatmapChart />
          </TabsContent>

          <TabsContent value="individual" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>选择对比考试</CardTitle>
              </CardHeader>
              <CardContent>
                <ExamSelector 
                  exams={mockExams}
                  selectedExams={selectedExams}
                  onChange={setSelectedExams}
                />
              </CardContent>
            </Card>
            <StudentGradeTrend 
              studentId={mockStudentData.studentId}
              studentName={mockStudentData.name}
            />
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>选择对比考试</CardTitle>
              </CardHeader>
              <CardContent>
                <ExamSelector 
                  exams={mockExams}
                  selectedExams={selectedExams}
                  onChange={setSelectedExams}
                />
              </CardContent>
            </Card>
            <ClassComparison 
              studentId={mockStudentData.studentId}
              studentName={mockStudentData.name}
            />
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <StudentReportExport student={mockStudentData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GradeAnalysis;
