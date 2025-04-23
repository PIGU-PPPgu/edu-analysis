import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/analysis/Navbar";
import { Button } from "@/components/ui/button";
import OverviewTab from "@/components/class/OverviewTab";
import ComparisonTab from "@/components/class/ComparisonTab";
import DetailTab from "@/components/class/DetailTab";

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

  const scoreDistributionData = [
    { range: "90-100分", count: 12, color: "#8884d8" },
    { range: "80-89分", count: 18, color: "#82ca9d" },
    { range: "70-79分", count: 15, color: "#ffc658" },
    { range: "60-69分", count: 8, color: "#ff8042" },
    { range: "60分以下", count: 3, color: "#ff6347" }
  ];

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

          <TabsContent value="overview">
            <OverviewTab mockClasses={mockClasses} />
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonTab />
          </TabsContent>

          <TabsContent value="detail">
            <DetailTab 
              selectedClass={selectedClass}
              competencyData={competencyData}
              correlationData={correlationData}
              scoreDistributionData={scoreDistributionData}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClassManagement;
