import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import StatisticsOverview from "@/components/analysis/StatisticsOverview";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { calculateStatistics } from "@/utils/chartGenerationUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
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
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
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
        setIsCalculating(true);
        setCalculationProgress(0);
        
        console.log(`获取到考试成绩数据: ${gradeData.length} 条记录`);
        
        // 模拟进度更新
        setCalculationProgress(20);
        
        // 确保数据中有score字段并且是数字类型
        const validGrades = gradeData.filter(
          (grade) => grade.score !== null && !isNaN(Number(grade.score))
        );
        
        setCalculationProgress(40);
        
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
        
        setCalculationProgress(60);
        
        // 计算基本统计数据
        const scores = validGrades.map(grade => Number(grade.score));
        const total = validGrades.length;
        const sum = scores.reduce((acc, score) => acc + score, 0);
        const avg = sum / total;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        
        setCalculationProgress(80);
        
        // 计算及格率（默认60分及格）
        const passingThreshold = 60;
        const passingCount = scores.filter(score => score >= passingThreshold).length;
        
        setCalculationProgress(100);
        
        // 短暂延迟以显示完成状态
        setTimeout(() => {
          setStats({
            avg: avg,
            max: max,
            min: min,
            passing: passingCount,
            total: total
          });
          setIsCalculating(false);
          setCalculationProgress(0);
        }, 500);
        
      } catch (error) {
        console.error("计算成绩统计数据时出错:", error);
        setIsCalculating(false);
        setCalculationProgress(0);
        toast.error("计算成绩统计失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      }
    };

    calculateGradeStatistics();
  }, [gradeData]);

  // 加载状态组件
  const LoadingState = () => (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-pulse opacity-30"></div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-blue-700">加载成绩数据中...</p>
              <p className="text-sm text-blue-500">正在从数据库获取最新成绩信息</p>
            </div>
            <div className="w-64 bg-blue-100 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: '60%' }}
              ></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 计算状态组件
  const CalculatingState = () => (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <RefreshCw className="h-6 w-6 text-green-600 animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-green-700">计算统计数据中...</p>
              <p className="text-sm text-green-500">正在分析 {gradeData.length} 条成绩记录</p>
            </div>
            <div className="w-64 bg-green-100 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${calculationProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-green-400">{calculationProgress}% 完成</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 错误状态组件
  const ErrorState = () => (
    <Card className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-6">
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="space-y-2">
              <p className="text-lg font-medium text-red-700">数据解析错误</p>
              <p className="text-sm text-red-500 max-w-md">{parsingError}</p>
            </div>
            <Button 
              onClick={() => navigate('/upload')}
              className="inline-flex items-center bg-red-500 hover:bg-red-600 text-white"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              重新上传成绩
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 空数据状态组件
  const EmptyState = () => (
    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-md">
      <CardContent className="pt-6">
        <div className="text-center py-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-amber-700">尚未找到成绩数据</p>
              <p className="text-sm text-amber-600">请先导入学生成绩数据以开始分析</p>
            </div>
            <Button 
              onClick={() => navigate('/upload')}
              className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-white"
            >
              上传成绩 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 成功状态组件
  const SuccessState = () => (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-700">
              数据加载完成，共 {stats.total} 条成绩记录
            </p>
          </div>
        </CardContent>
      </Card>
      <StatisticsOverview 
        avg={stats.avg}
        max={stats.max}
        min={stats.min}
        passing={stats.passing}
        total={stats.total}
      />
    </div>
  );

  // 根据状态渲染对应组件
  if (parsingError) {
    return <ErrorState />;
  }

  if (!isDataLoaded) {
    return <LoadingState />;
  }

  if (isCalculating) {
    return <CalculatingState />;
  }

  if (gradeData.length === 0) {
    return <EmptyState />;
  }

  return <SuccessState />;
};

export default GradeOverview;
