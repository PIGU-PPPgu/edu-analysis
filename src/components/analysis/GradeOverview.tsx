
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import IntelligentFileParser from "@/components/analysis/IntelligentFileParser";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { calculateStatistics } from "@/utils/chartGenerationUtils";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  onDataParsed: (parsedData: any[]) => void;
  parsingError: string | null;
}

const GradeOverview: React.FC<Props> = ({ onDataParsed, parsingError }) => {
  const { gradeData, isDataLoaded, setGradeData } = useGradeAnalysis();
  const [stats, setStats] = useState({
    avg: 0,
    max: 0,
    min: 0,
    passing: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">成绩分析</h1>
        <p className="text-gray-500 mt-1">
          导入和分析学生成绩数据，生成统计图表和报告
        </p>
      </div>
      <IntelligentFileParser onDataParsed={onDataParsed} />
      {parsingError && (
        <Card className="mt-4 border-red-300">
          <CardContent className="p-4">
            <p className="text-red-500 font-medium">解析错误: {parsingError}</p>
            <p className="text-sm text-gray-600 mt-1">
              请检查您的数据格式，确保是纯文本CSV文件，而不是二进制Excel文件。
              如果您有Excel文件，请先在Excel中"另存为" CSV格式。
            </p>
          </CardContent>
        </Card>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2 w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <StatisticsOverview {...stats} />
      )}
    </>
  );
};

export default GradeOverview;
