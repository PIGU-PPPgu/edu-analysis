import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassProfileCard from "@/components/analysis/ClassProfileCard";
import HeatmapChart from "@/components/analysis/HeatmapChart";
import ClassTrendChart from "@/components/analysis/ClassTrendChart";
import ClassWeaknessAnalysis from "@/components/analysis/ClassWeaknessAnalysis";
import ClassReportGenerator from "@/components/analysis/ClassReportGenerator";
import ClassStudentsList from "@/components/analysis/ClassStudentsList";
import Navbar from "@/components/analysis/Navbar";
import { Button } from "@/components/ui/button";
import { FileText, Users } from "lucide-react";
import { Link } from "react-router-dom";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import ExamComparison from "@/components/analysis/ExamComparison";

// Mock class data
const mockClasses = [
  {
    id: "class001",
    className: "高二(1)班",
    studentCount: 42,
    avgScore: 85.7,
    passRate: 97.6,
    topStudents: ["张三", "李四", "王五"],
    subjectScores: [
      { subject: "语文", score: 87.5, fullmarks: 5 },
      { subject: "数学", score: 84.2, fullmarks: 8 },
      { subject: "英语", score: 88.1, fullmarks: 6 },
      { subject: "物理", score: 82.6, fullmarks: 3 },
      { subject: "化学", score: 86.3, fullmarks: 4 },
      { subject: "生物", score: 85.4, fullmarks: 2 }
    ],
    competencies: [
      { name: "知识掌握", value: 85 },
      { name: "解题能力", value: 83 },
      { name: "创新思维", value: 75 },
      { name: "团队协作", value: 90 },
      { name: "学习态度", value: 88 }
    ]
  },
  {
    id: "class002",
    className: "高二(2)班",
    studentCount: 44,
    avgScore: 83.2,
    passRate: 95.4,
    topStudents: ["赵六", "钱七", "孙八"],
    subjectScores: [
      { subject: "语文", score: 82.5, fullmarks: 3 },
      { subject: "数学", score: 88.2, fullmarks: 7 },
      { subject: "英语", score: 81.1, fullmarks: 4 },
      { subject: "物理", score: 84.6, fullmarks: 5 },
      { subject: "化学", score: 82.3, fullmarks: 2 },
      { subject: "生物", score: 80.4, fullmarks: 1 }
    ],
    competencies: [
      { name: "知识掌握", value: 83 },
      { name: "解题能力", value: 86 },
      { name: "创新思维", value: 78 },
      { name: "团队协作", value: 82 },
      { name: "学习态度", value: 85 }
    ]
  }
];

const ClassManagement: React.FC = () => {
  const [selectedTab, setSelectedTab] = React.useState("overview");
  const [selectedClass, setSelectedClass] = React.useState(mockClasses[0]);
  const [detailTab, setDetailTab] = React.useState("analysis");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6" value={selectedTab} onValueChange={setSelectedTab}>
          <div className="flex justify-between items-center mb-2">
            <TabsList className="grid w-full max-w-[600px] grid-cols-3 gap-4">
              <TabsTrigger value="overview">班级总览</TabsTrigger>
              <TabsTrigger value="comparison">班级对比</TabsTrigger>
              <TabsTrigger value="detail">班级详情</TabsTrigger>
            </TabsList>

            {selectedTab === "detail" && (
              <div className="flex gap-2">
                {mockClasses.map((classData) => (
                  <Button 
                    key={classData.id} 
                    variant={selectedClass.id === classData.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedClass(classData)}
                  >
                    {classData.className}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockClasses.map((classData) => (
                <Card key={classData.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {classData.className}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">学生人数:</span>
                        <span className="font-medium">{classData.studentCount}人</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">平均分:</span>
                        <span className="font-medium">{classData.avgScore}分</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">及格率:</span>
                        <span className="font-medium">{classData.passRate}%</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full mt-4" size="sm" asChild>
                      <Link to={`#${classData.id}`} onClick={() => {
                        setSelectedTab("detail");
                        setSelectedClass(classData);
                      }}>
                        查看详情
                      </Link>
                    </Button>
                  </CardContent>
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
            
            <ExamComparison />
            
            <div className="flex justify-end">
              <Button asChild>
                <Link to="/student-management">
                  <FileText className="mr-2 h-4 w-4" />
                  查看学生管理
                </Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <HeatmapChart 
              title="班级对比分析" 
              description="各班级在不同维度上的表现对比" 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>班级间学生表现对比</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="font-medium mb-2">高二(1)班 vs 高二(2)班</h3>
                    <p className="text-sm text-muted-foreground">
                      高二(1)班在语文和英语方面表现更好，团队协作能力突出；
                      高二(2)班在数学和物理方面有优势，解题能力更强。
                      两个班级的整体平均分相差2.5分，高二(1)班略高。
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>教学建议</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md">
                    <p className="text-sm text-muted-foreground">
                      建议高二(1)班加强数学和物理教学，可以借鉴高二(2)班的教学方法；
                      高二(2)班需要提升语文和英语水平，可以通过阅读训练和口语练习来改善。
                      两个班级可以进行学习经验交流活动，取长补短。
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClassTrendChart className="高二(1)班" />
              <ClassTrendChart className="高二(2)班" />
            </div>
          </TabsContent>

          <TabsContent value="detail" className="space-y-6">
            <div id={selectedClass.id}>
              <ClassProfileCard classData={selectedClass} />
            </div>
            
            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="w-full max-w-[400px] mb-6">
                <TabsTrigger value="analysis">班级分析</TabsTrigger>
                <TabsTrigger value="students">学生列表</TabsTrigger>
                <TabsTrigger value="report">报告生成</TabsTrigger>
              </TabsList>
              
              <TabsContent value="analysis" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ClassTrendChart className={selectedClass.className} />
                  <ClassWeaknessAnalysis className={selectedClass.className} />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <ExamComparison />
                  <ScoreBoxPlot 
                    title={`${selectedClass.className}成绩分布`}
                    description="各科目成绩四分位数分布"
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
              </TabsContent>
              
              <TabsContent value="students">
                <ClassStudentsList 
                  classId={selectedClass.id}
                  className={selectedClass.className}
                  studentCount={selectedClass.studentCount}
                />
              </TabsContent>
              
              <TabsContent value="report">
                <ClassReportGenerator className={selectedClass.className} />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClassManagement;
