import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { calculateStatistics } from "@/utils/chartGenerationUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GradeOverviewProps {
  parsingError?: string | null;
}

const GradeOverview: React.FC<GradeOverviewProps> = ({ parsingError }) => {
  const { gradeData, isDataLoaded, selectedExam } = useGradeAnalysis();
  const [stats, setStats] = useState({
    avg: 0,
    max: 0,
    min: 0,
    passing: 0,
    total: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const calculateGradeStatistics = async () => {
      if (!gradeData || gradeData.length === 0) {
        console.log("没有可用的成绩数据，无法计算统计信息");
        setStats({
          avg: 0,
          max: 0,
          min: 0,
          passing: 0,
          total: 0
        });
        return;
      }

      try {
        console.log(`获取到考试成绩数据: ${gradeData.length} 条记录`);
        
        // 确保数据中有score字段并且是数字类型
        const validGrades = gradeData.filter(
          (grade) => grade.score !== null && !isNaN(Number(grade.score))
        );
        
        if (validGrades.length === 0) {
          console.warn("没有有效的成绩数据（所有成绩为null或非数字）");
          setStats({
            avg: 0,
            max: 0,
            min: 0,
            passing: 0,
            total: gradeData.length
          });
          return;
        }
        
        // 计算基本统计数据
        const scores = validGrades.map(grade => Number(grade.score));
        const total = validGrades.length;
        const sum = scores.reduce((acc, score) => acc + score, 0);
        const avg = sum / total;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        
        // 计算及格率（默认60分及格）
        const passingThreshold = 60;
        const passingCount = scores.filter(score => score >= passingThreshold).length;
        
        setStats({
          avg: avg,
          max: max,
          min: min,
          passing: passingCount,
          total: total
        });
      } catch (error) {
        console.error("计算成绩统计数据时出错:", error);
        toast.error("计算成绩统计失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      }
    };

    calculateGradeStatistics();
  }, [gradeData]);

  return (
    <Card className="shadow-sm mb-6">
      <CardContent className="pt-6">
        {parsingError ? (
          <div className="text-center py-4">
            <p className="text-red-500 mb-4">{parsingError}</p>
            <Button 
              onClick={() => navigate('/upload')}
              className="inline-flex items-center"
            >
              重新上传成绩 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : !isDataLoaded ? (
          <div className="text-center py-4">
            <div className="animate-pulse flex space-x-4 justify-center">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            </div>
            <p className="text-gray-500 mt-2">加载成绩数据中...</p>
          </div>
        ) : gradeData.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-amber-500 mb-4">尚未找到成绩数据</p>
            <Button 
              onClick={() => navigate('/upload')}
              className="inline-flex items-center"
            >
              上传成绩 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <StatisticsOverview
            avg={stats.avg}
            max={stats.max}
            min={stats.min}
            passing={stats.passing}
            total={stats.total}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default GradeOverview;
