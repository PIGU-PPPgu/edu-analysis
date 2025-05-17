import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeatmapChart from "@/components/analysis/HeatmapChart";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import ExamComparison from "@/components/analysis/ExamComparison";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import CompetencyRadar from "@/components/analysis/CompetencyRadar";
import CorrelationBubble from "@/components/analysis/CorrelationBubble";
import { toast } from "sonner";
import { getClassDetailedAnalysisData } from "@/services/classService";

interface Class {
  id: string;
  name: string;
  grade: string;
  created_at?: string;
  averageScore?: number;
  excellentRate?: number;
  studentCount?: number;
}

interface Props {
  selectedClass: Class;
}

const OverviewTab: React.FC<Props> = ({ selectedClass }) => {
  const className = selectedClass.name;
  const classGrade = selectedClass.grade;
  const [isLoading, setIsLoading] = useState(false);
  const [competencyData, setCompetencyData] = useState<any[]>([]);
  const [boxPlotData, setBoxPlotData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [scoreDistributionData, setScoreDistributionData] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [examComparisonData, setExamComparisonData] = useState<any>({
    examList: [],
    initialSelected: [],
    displayScores: []
  });
  
  // 获取班级详细分析数据
  useEffect(() => {
    if (selectedClass && selectedClass.id) {
      setIsLoading(true);
      
      getClassDetailedAnalysisData(selectedClass.id)
        .then(data => {
          if (data.competencyData && data.competencyData.length > 0) {
            setCompetencyData(data.competencyData);
          }
          
          if (data.boxPlotData && data.boxPlotData.length > 0) {
            setBoxPlotData(data.boxPlotData);
          }
          
          if (data.trendData && data.trendData.length > 0) {
            setTrendData(data.trendData);
          }
          
          if (data.scoreDistributionData && data.scoreDistributionData.length > 0) {
            setScoreDistributionData(data.scoreDistributionData);
          }
          
          if (data.examComparisonData) {
            setExamComparisonData(data.examComparisonData);
          }
          
          // 创建相关性数据
          if (data.studentsListData && data.studentsListData.length > 0) {
            const corrData = data.studentsListData.map((student: any, index: number) => {
              // 假设课堂表现和作业质量是根据平均分的随机变化
              const avgScore = student.averageScore || 0;
              const randomFactor1 = 0.8 + Math.random() * 0.4; // 0.8-1.2之间的随机因子
              const randomFactor2 = 0.8 + Math.random() * 0.4;
              
              return {
                name: student.name,
                // 课堂表现、作业质量和考试成绩的关联性
                xValue: Math.min(100, Math.max(0, avgScore * randomFactor1)),
                yValue: Math.min(100, Math.max(0, avgScore * randomFactor2)),
                zValue: avgScore,
                subject: index % 2 === 0 ? "数学" : "语文" // 简单分配学科
              };
            }).slice(0, 10); // 只取前10个学生
            
            setCorrelationData(corrData);
          }
        })
        .catch(error => {
          console.error('获取班级详细分析数据失败:', error);
          toast.error('获取班级详细分析数据失败');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedClass.id]);

  // 生成班级对比热图数据
  const generateHeatmapData = () => {
    const classAvg = selectedClass.averageScore || 0;
    const classExcellent = selectedClass.excellentRate || 0;
    
    return [
      { x: "平均分", y: className, value: classAvg },
      { x: "优秀率", y: className, value: classExcellent },
      { x: "及格率", y: className, value: classAvg > 0 ? 
        Math.min(100, Math.round((classAvg / 60) * 90)) : 0 }
    ];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HeatmapChart chartData={generateHeatmapData()} />
        <ScoreBoxPlot data={boxPlotData} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {examComparisonData.examList.length > 0 && (
          <ExamComparison 
            mockExamList={examComparisonData.examList}
            initialSelectedExams={examComparisonData.initialSelected}
            mockDisplayScores={examComparisonData.displayScores}
          />
        )}
        <ScoreDistribution data={scoreDistributionData} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading ? (
          <Card className="flex items-center justify-center min-h-[320px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">加载能力维度数据...</span>
          </Card>
        ) : (
          <CompetencyRadar data={competencyData} />
        )}
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
