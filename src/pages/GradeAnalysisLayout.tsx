
import React, { useEffect, useState } from "react";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import GradeOverview from "@/components/analysis/GradeOverview";
import ScoreDistribution from "@/components/analysis/ScoreDistribution";
import ScoreBoxPlot from "@/components/analysis/ScoreBoxPlot";
import Navbar from "@/components/analysis/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { AIAnalysisController } from "@/components/analysis/AIAnalysisController";
import { BarChartBig, ChevronLeft, LineChart, PieChart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClassStudentsList from "@/components/analysis/ClassStudentsList";

// Updated to match what Supabase actually returns
interface StudentGrade {
  id: string;
  student_id: string;
  score: number;
  subject: string;
  exam_date: string | null;
  exam_type: string | null;
  students?: {
    name?: string;
    student_id?: string;
  };
}

const GradeAnalysisLayout = () => {
  const { gradeData, isDataLoaded, calculateStatistics, setGradeData } = useGradeAnalysis();
  const [boxPlotData, setBoxPlotData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 获取成绩数据
  useEffect(() => {
    const fetchGradeData = async () => {
      if (isDataLoaded) return;
      
      try {
        setIsLoading(true);
        
        // 从数据库加载成绩数据
        const { data, error } = await supabase
          .from('grades')
          .select(`
            id, 
            student_id,
            score,
            subject,
            exam_date,
            exam_type,
            students ( name, student_id )
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // 格式化数据
          const formattedData = data.map((item: any) => ({
            id: item.id,
            studentId: item.student_id,
            name: item.students?.name || '未知学生',
            subject: item.subject,
            score: item.score,
            examDate: item.exam_date,
            examType: item.exam_type || '未知考试',
            className: '未知班级' // Since class_name isn't available, we set a default
          }));
          
          setGradeData(formattedData);
        }
      } catch (error) {
        console.error("加载成绩数据失败:", error);
        toast.error("加载成绩数据失败", {
          description: error instanceof Error ? error.message : "未知错误"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGradeData();
  }, [isDataLoaded, setGradeData]);

  // 计算箱线图数据
  useEffect(() => {
    if (gradeData.length > 0) {
      // 按学科分组
      const subjectGroups: Record<string, number[]> = {};
      
      gradeData.forEach(item => {
        if (!subjectGroups[item.subject]) {
          subjectGroups[item.subject] = [];
        }
        subjectGroups[item.subject].push(item.score);
      });
      
      // 计算每个学科的箱线图数据
      const boxPlotDataArray = Object.entries(subjectGroups).map(([subject, scores]) => {
        // 排序分数
        scores.sort((a, b) => a - b);
        
        // 计算统计值
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const q1 = scores[Math.floor(scores.length * 0.25)];
        const median = scores[Math.floor(scores.length * 0.5)];
        const q3 = scores[Math.floor(scores.length * 0.75)];
        
        return {
          subject,
          min,
          q1,
          median,
          q3,
          max
        };
      });
      
      setBoxPlotData(boxPlotDataArray);
    }
  }, [gradeData]);

  // Handler for AI Analysis start
  const handleStartAnalysis = async (config: {
    provider: string;
    model: string;
    temperature: number;
    language: string;
  }) => {
    setIsAnalyzing(true);
    try {
      // Placeholder for actual analysis logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("分析完成");
    } catch (error) {
      toast.error("分析失败");
      console.error("AI分析失败:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden md:flex" 
            onClick={() => navigate("/")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h1 className="text-2xl font-bold">成绩分析</h1>
        </div>
        
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChartBig className="h-4 w-4" />
              数据看板
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-1.5">
              <Users className="h-4 w-4" />
              班级分析
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <PieChart className="h-4 w-4" />
              智能分析
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <GradeOverview />
            
            {isDataLoaded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScoreDistribution />
                
                {boxPlotData.length > 0 && (
                  <ScoreBoxPlot data={boxPlotData} />
                )}
              </div>
            )}
            
            {!isDataLoaded && !isLoading && (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">暂无成绩数据</p>
                <p className="text-gray-500 mt-2">请先导入学生成绩数据</p>
                <Button 
                  className="mt-4" 
                  onClick={() => navigate("/")}
                >
                  前往导入数据
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="classes">
            {isDataLoaded ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ClassStudentsList 
                  classId="1"
                  className="高一1班"
                  studentCount={15} 
                />
                <ClassStudentsList 
                  classId="2"
                  className="高一2班"
                  studentCount={18} 
                />
                <ClassStudentsList 
                  classId="3"
                  className="高一3班"
                  studentCount={17} 
                />
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">暂无班级数据</p>
                <p className="text-gray-500 mt-2">请先导入学生和成绩数据</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="ai">
            {isDataLoaded ? (
              <AIAnalysisController 
                onStartAnalysis={handleStartAnalysis}
                isAnalyzing={isAnalyzing}
              />
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-xl text-gray-600">智能分析需要数据</p>
                <p className="text-gray-500 mt-2">请先导入学生成绩数据</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GradeAnalysisLayout;
