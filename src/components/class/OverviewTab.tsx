import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { FileText, Loader2, TrendingUp, TrendingDown, Minus, Users, Award, Target, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
// import CompetencyRadar from "@/components/analysis/CompetencyRadar"; // 已删除
// import CorrelationBubble from "@/components/analysis/CorrelationBubble"; // 已删除
import ScoreDistribution from "@/components/analysis/statistics/ScoreDistribution";
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
        <Card className="flex flex-col items-center justify-center min-h-[320px]">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="text-lg font-medium mb-2">能力雷达图</h3>
          <p className="text-gray-500 text-center">
            能力雷达图组件正在重构中
          </p>
        </Card>
        <Card className="flex flex-col items-center justify-center min-h-[320px]">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🔗</span>
          </div>
          <h3 className="text-lg font-medium mb-2">关联分析图</h3>
          <p className="text-gray-500 text-center">
            关联分析组件正在重构中
          </p>
        </Card>
      </div>
      
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
           <div className="text-center text-gray-500">
             <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
               📊
             </div>
             <p className="text-lg font-medium">考试对比功能正在重构中</p>
             <p className="text-sm">此功能将在后续版本中重新设计</p>
           </div>
         </div>
         <ScoreDistribution data={scoreDistributionData} />
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
