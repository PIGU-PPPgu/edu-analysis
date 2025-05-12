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
  const { gradeData, isDataLoaded, setGradeData } = useGradeAnalysis();
  const [stats, setStats] = useState({
    avg: 0,
    max: 0,
    min: 0,
    passing: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGradeData = async () => {
      if (isDataLoaded) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('grades')
          .select('*, students(name)')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // 格式化数据
          const formattedData = data.map(item => ({
            studentId: item.student_id,
            name: item.students?.name || '未知学生',
            subject: item.subject,
            score: item.score,
            examDate: item.exam_date,
            examType: item.exam_type || '未知考试'
          }));
          
          setGradeData(formattedData);
          const calculatedStats = calculateStatistics(formattedData);
          setStats(calculatedStats);
        }
      } catch (error) {
        console.error("加载成绩数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGradeData();
  }, [isDataLoaded, setGradeData]);
  
  useEffect(() => {
    if (isDataLoaded) {
      const calculatedStats = calculateStatistics(gradeData);
      setStats(calculatedStats);
    }
  }, [gradeData, isDataLoaded]);

  // 如果没有数据，显示引导用户前往首页导入数据的提示
  if (gradeData.length === 0 && !isLoading) {
    return (
      <Card className="bg-white p-4 rounded-lg shadow">
        <CardContent className="pt-6 text-center">
          <p className="text-xl text-gray-600 mb-4">暂无成绩数据</p>
          <p className="text-gray-500 mb-6">请先从首页导入学生成绩数据</p>
          <Button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            前往导入数据
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 显示成绩统计数据
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">成绩概览</h2>
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatisticsOverview 
              averageScore={stats.avg} 
              maxScore={stats.max} 
              minScore={stats.min} 
              passingRate={stats.passing} 
              totalStudents={stats.total}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GradeOverview;
