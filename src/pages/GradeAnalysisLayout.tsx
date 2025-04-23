
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/analysis/Navbar";
import GradeOverview from "@/components/analysis/GradeOverview";
import GradeTabs from "@/components/analysis/GradeTabs";
import { Card } from "@/components/ui/card";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import ExamComparison from "@/components/analysis/ExamComparison";
import HeatmapChart from "@/components/analysis/HeatmapChart";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import SubjectAverages from "@/components/analysis/SubjectAverages";
import CorrelationBubble from "@/components/analysis/CorrelationBubble";
import CustomChartsSection from "@/components/analysis/CustomChartsSection";
import AdvancedAnalysis from "@/components/analysis/AdvancedAnalysis";
import AIDataAnalysis from "@/components/analysis/AIDataAnalysis";

const GradeAnalysisLayout: React.FC = () => {
  const { setGradeData, calculateStatistics, customCharts, isLoading, setIsLoading } = useGradeAnalysis();
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();

  // 检查用户身份
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          navigate('/login');
        }
      } catch (error) {
        console.error("验证会话失败:", error);
      } finally {
        setIsLoadingAuth(false);
      }
    };
    
    checkUserSession();
  }, [navigate]);

  // 从数据库加载成绩数据
  useEffect(() => {
    const fetchGradeData = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('grades')
          .select(`
            id,
            student_id,
            score,
            subject,
            exam_date,
            exam_type,
            students (
              name,
              class_name
            )
          `)
          .order('exam_date', { ascending: false });
        
        if (error) throw error;
        
        // 转换数据格式以适应组件需求
        const formattedData = data?.map(item => ({
          id: item.id,
          studentId: item.student_id,
          studentName: item.students?.name || '未知',
          className: item.students?.class_name || '未知',
          score: item.score,
          subject: item.subject,
          examDate: item.exam_date,
          examType: item.exam_type || '普通考试'
        })) || [];
        
        console.log("从数据库获取成绩数据:", formattedData.length);
        setGradeData(formattedData);
      } catch (error) {
        console.error("加载成绩数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!isLoadingAuth) {
      fetchGradeData();
    }
  }, [isLoadingAuth, setGradeData, setIsLoading]);

  if (isLoadingAuth) {
    return <div className="flex items-center justify-center h-screen">验证登录状态...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-4">成绩分析</h1>
        <p className="text-gray-500 mb-8">
          全面分析学生成绩数据，获取教学洞察
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <GradeOverview />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="p-4">
            <SubjectAverages />
          </Card>
          <Card className="p-4">
            <ScoreDistribution />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <ExamComparison />
          <HeatmapChart />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-6">
          <CorrelationBubble />
        </div>

        <div className="mb-6">
          <CustomChartsSection />
        </div>

        <div className="mb-10">
          <GradeTabs />
        </div>

        <div className="mb-10">
          <AIDataAnalysis />
        </div>

        <div className="mb-10">
          <AdvancedAnalysis />
        </div>
      </div>
    </div>
  );
};

export default GradeAnalysisLayout;
