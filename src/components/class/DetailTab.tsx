import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassProfileCard from "@/components/analysis/ClassProfileCard";
import ClassTrendChart from "@/components/analysis/ClassTrendChart";
import ClassWeaknessAnalysis from "@/components/analysis/ClassWeaknessAnalysis";
import ClassReportGenerator from "@/components/analysis/ClassReportGenerator";
import ClassStudentsList from "@/components/analysis/ClassStudentsList";
import ExamComparison from "@/components/analysis/ExamComparison";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import CompetencyRadar from "@/components/analysis/CompetencyRadar";
import CorrelationBubble from "@/components/analysis/CorrelationBubble";
import AIDataAnalysis from "@/components/analysis/AIDataAnalysis";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// Define interfaces for mock data if not already available from props or other imports
interface ExamData {
  examName: string;
  classAvg: number;
  gradeAvg: number;
}

interface WeaknessSubjectData {
  subject: string;
  classAvg: number;
  gradeAvg: number;
  gap: string;
  isWeak: boolean;
}

interface StudentListData {
  studentId: string;
  name: string;
  averageScore: number;
  trend: number;
}

interface ExamComparisonExam {
  id: string;
  name: string;
  date: string;
}

interface Props {
  selectedClass: any; // Consider defining a more specific type for selectedClass
  competencyData?: any[]; // Made optional
  correlationData?: any[]; // Made optional
  scoreDistributionData?: any[]; // Made optional
}

const DetailTab: React.FC<Props> = ({ 
  selectedClass,
  competencyData: competencyDataProp, // Renamed to avoid conflict with internal mock
  correlationData: correlationDataProp, // Renamed
  scoreDistributionData: scoreDistributionDataProp // Renamed
}) => {
  const [detailTab, setDetailTab] = React.useState("analysis");

  // Ensure selectedClass is not null/undefined for mock data generation if it's a dependency
  const safeClassName = selectedClass?.name || "未知班级";
  const safeClassAvgScore = selectedClass?.averageScore || 85; // Default if undefined

  // --- Mock Data Definitions (Ensuring they have content) ---
  const mockClassTrendData: ExamData[] = [
    { examName: "期中考试", classAvg: safeClassAvgScore - 2, gradeAvg: 85 },
    { examName: "第一次月考", classAvg: safeClassAvgScore + 1, gradeAvg: 87 },
    { examName: "第二次月考", classAvg: safeClassAvgScore - 1, gradeAvg: 84 },
    { examName: "期末考试", classAvg: safeClassAvgScore, gradeAvg: 88 },
  ];

  const mockWeaknessAnalysisData: WeaknessSubjectData[] = [
    { subject: "物理", classAvg: 75, gradeAvg: 82, gap: "-8.5%", isWeak: true },
    { subject: "化学", classAvg: 78, gradeAvg: 81, gap: "-3.7%", isWeak: true },
    { subject: "语文", classAvg: 82, gradeAvg: 80, gap: "+2.5%", isWeak: false },
    { subject: "数学", classAvg: 81, gradeAvg: 83, gap: "-2.4%", isWeak: true },
    { subject: "英语", classAvg: 79, gradeAvg: 82, gap: "-3.7%", isWeak: true },
    { subject: "历史", classAvg: 85, gradeAvg: 83, gap: "+2.4%", isWeak: false },
    { subject: "地理", classAvg: 88, gradeAvg: 85, gap: "+3.5%", isWeak: false },
  ];

  const mockExamListForComparison: ExamComparisonExam[] = [
    { id: "期中考-2023-11-01", name: "期中考", date: "2023-11-01" },
    { id: "期末考-2024-01-15", name: "期末考", date: "2024-01-15" },
    { id: "一模考-2024-03-10", name: "一模考", date: "2024-03-10" }, // Changed name slightly for key uniqueness if needed
  ];
  // Ensure initialSelectedExams uses valid IDs from the list and list is not empty
  const initialSelectedExamsForComparison = mockExamListForComparison.length >= 2 
    ? [mockExamListForComparison[0].id, mockExamListForComparison[1].id] 
    : mockExamListForComparison.length === 1
      ? [mockExamListForComparison[0].id]
      : [];

  const mockDisplayScoresForComparison = initialSelectedExamsForComparison.length > 0 ? [
    { subject: "语文", [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[0])?.name || "Exam1"]: 85, ...(initialSelectedExamsForComparison.length > 1 && { [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[1])?.name || "Exam2"]: 88 }) },
    { subject: "数学", [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[0])?.name || "Exam1"]: 90, ...(initialSelectedExamsForComparison.length > 1 && { [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[1])?.name || "Exam2"]: 87 }) },
    { subject: "英语", [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[0])?.name || "Exam1"]: 82, ...(initialSelectedExamsForComparison.length > 1 && { [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[1])?.name || "Exam2"]: 85 }) },
    { subject: "物理", [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[0])?.name || "Exam1"]: 78, ...(initialSelectedExamsForComparison.length > 1 && { [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[1])?.name || "Exam2"]: 80 }) },
    { subject: "化学", [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[0])?.name || "Exam1"]: 80, ...(initialSelectedExamsForComparison.length > 1 && { [mockExamListForComparison.find(e=>e.id === initialSelectedExamsForComparison[1])?.name || "Exam2"]: 77 }) },
  ] : [];


  const mockStudentsForList: StudentListData[] = [
    { studentId: "S001", name: "张三丰", averageScore: 92.5, trend: 2 },
    { studentId: "S002", name: "李莫愁", averageScore: 88.0, trend: -1 },
    { studentId: "S003", name: "王重阳", averageScore: 95.0, trend: 0 },
    { studentId: "S004", name: "赵敏", averageScore: 78.5, trend: 3 },
    { studentId: "S005", name: "孙悟空", averageScore: 82.0, trend: -2 },
    { studentId: "S006", name: "周芷若", averageScore: 89.0, trend: 1 },
  ];
  // --- End of Mock Data Definitions ---

  // Use prop data if available, otherwise use internal mock or empty array
  const scoreDistributionData = scoreDistributionDataProp || [
    { range: "90-100分", count: selectedClass?.studentCount ? Math.max(Math.floor(selectedClass.studentCount * 0.3), 5) : 10, color: "#82ca9d" },
    { range: "80-89分", count: selectedClass?.studentCount ? Math.max(Math.floor(selectedClass.studentCount * 0.4), 8) : 15, color: "#8884d8" },
    { range: "70-79分", count: selectedClass?.studentCount ? Math.max(Math.floor(selectedClass.studentCount * 0.2), 4) : 8, color: "#ffc658" },
    { range: "60-69分", count: selectedClass?.studentCount ? Math.max(Math.floor(selectedClass.studentCount * 0.05), 2) : 2, color: "#ff8042" },
    { range: "<60分", count: selectedClass?.studentCount ? Math.max(Math.floor(selectedClass.studentCount * 0.05), 1) : 1, color: "#f55656" },
  ];

  const competencyData = competencyDataProp || [
    { name: "知识掌握", current: Math.floor(Math.random() * 20) + 75, average: 78, fullScore: 100 },
    { name: "解题技巧", current: Math.floor(Math.random() * 20) + 70, average: 75, fullScore: 100 },
    { name: "逻辑思维", current: Math.floor(Math.random() * 20) + 80, average: 82, fullScore: 100 },
    { name: "创新应用", current: Math.floor(Math.random() * 20) + 65, average: 70, fullScore: 100 },
    { name: "学习态度", current: Math.floor(Math.random() * 10) + 90, average: 88, fullScore: 100 },
  ];

  const correlationData = correlationDataProp || [
    { name: "学生A", xValue: 85, yValue: 90, zValue: 1200, subject: "数学" },
    { name: "学生B", xValue: 70, yValue: 75, zValue: 800, subject: "物理" },
    { name: "学生C", xValue: 92, yValue: 88, zValue: 1500, subject: "语文" },
    { name: "学生D", xValue: 60, yValue: 65, zValue: 600, subject: "英语" },
    { name: "学生E", xValue: 78, yValue: 82, zValue: 1000, subject: "化学" },
  ];

  const mockCharts = [
    <ScoreDistribution key="chart-1" data={scoreDistributionData} />, // This uses data from props
    <CompetencyRadar 
      key="chart-2"
      data={competencyData} // This uses data from props
      title={`${safeClassName}能力维度`}
      description="班级多维度能力评估"
    />
  ];

  return (
    <div className="space-y-6">
      <div id={selectedClass.id}>
        {/* ClassProfileCard uses selectedClass which might be missing some fields, handled by its internal mock/defaults */}
        <ClassProfileCard classData={selectedClass} />
      </div>
      
      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className="w-full grid grid-cols-2 max-w-[300px] mb-6">
          <TabsTrigger value="analysis">班级分析</TabsTrigger>
          <TabsTrigger value="students">学生列表</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>班级成绩趋势</CardTitle>
                <CardDescription>{safeClassName}与年级平均分对比趋势</CardDescription>
              </CardHeader>
              <CardContent>
                <ClassTrendChart 
                  className={safeClassName} 
                  mockData={mockClassTrendData} 
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>学科优劣势分析</CardTitle>
                <CardDescription>{safeClassName}需要重点关注的学科</CardDescription>
              </CardHeader>
              <CardContent>
                <ClassWeaknessAnalysis 
                  className={safeClassName} 
                  mockData={mockWeaknessAnalysisData} 
                />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>考试成绩对比</CardTitle>
                <CardDescription>选择考试进行成绩对比分析</CardDescription>
              </CardHeader>
              <CardContent>
                <ExamComparison 
                  mockExamList={mockExamListForComparison}
                  initialSelectedExams={initialSelectedExamsForComparison}
                  mockDisplayScores={mockDisplayScoresForComparison}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>分数段分布</CardTitle>
                <CardDescription>各分数段学生人数</CardDescription>
              </CardHeader>
              <CardContent>
            <ScoreDistribution data={scoreDistributionData} />
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{safeClassName}成绩分布</CardTitle>
                <CardDescription>各科目成绩四分位数分布</CardDescription>
              </CardHeader>
              <CardContent>
            <ScoreBoxPlot 
                  data={[ // 确保提供更明确的数据结构
                { subject: "语文", min: 65, q1: 75, median: 82, q3: 88, max: 95 },
                { subject: "数学", min: 60, q1: 72, median: 80, q3: 85, max: 98 },
                { subject: "英语", min: 62, q1: 73, median: 81, q3: 87, max: 96 },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{safeClassName}能力维度</CardTitle>
                <CardDescription>班级多维度能力评估</CardDescription>
              </CardHeader>
              <CardContent>
            <CompetencyRadar 
              data={competencyData}
            />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>{safeClassName}学习表现关联分析</CardTitle>
              <CardDescription>课堂表现、作业质量与考试成绩的关联性</CardDescription>
            </CardHeader>
            <CardContent>
          <CorrelationBubble 
            data={correlationData} 
            xName="课堂表现" 
            yName="作业质量" 
            zName="考试成绩"
            className="w-full"
          />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="students">
          <ClassStudentsList 
            classId={selectedClass?.id || ""}
            className={safeClassName}
            studentCount={mockStudentsForList.length} 
            mockStudentData={mockStudentsForList}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailTab;
