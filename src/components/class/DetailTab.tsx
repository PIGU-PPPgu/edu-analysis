
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

interface Props {
  selectedClass: any;
  competencyData: any[];
  correlationData: any[];
  scoreDistributionData: any[];
}

const DetailTab: React.FC<Props> = ({ 
  selectedClass,
  competencyData,
  correlationData,
  scoreDistributionData
}) => {
  const [detailTab, setDetailTab] = React.useState("analysis");

  return (
    <div className="space-y-6">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ExamComparison />
            <ScoreDistribution data={scoreDistributionData} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <CompetencyRadar 
              data={competencyData}
              title={`${selectedClass.className}能力维度`}
              description="班级多维度能力评估"
            />
          </div>
          
          <CorrelationBubble 
            data={correlationData} 
            xName="课堂表现" 
            yName="作业质量" 
            zName="考试成绩"
            title={`${selectedClass.className}学习表现关联分析`}
            description="课堂表现、作业质量与考试成绩的关联性"
            className="w-full"
          />
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
    </div>
  );
};

export default DetailTab;
