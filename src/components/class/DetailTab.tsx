import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassProfileCard from "@/components/class/ClassProfileCard";
// import ClassTrendChart from "@/components/analysis/ClassTrendChart"; // 已删除
// import ClassWeaknessAnalysis from "@/components/analysis/ClassWeaknessAnalysis"; // 已删除
import ClassStudentsList from "@/components/class/ClassStudentsList";
import ExamComparison from "@/components/class/ExamComparison";
import ScoreDistribution from "@/components/analysis/statistics/ScoreDistribution";
import ScoreBoxPlot from "@/components/class/ScoreBoxPlot";
// import CompetencyRadar from "@/components/analysis/CompetencyRadar"; // 已删除
// import CorrelationBubble from "@/components/analysis/CorrelationBubble"; // 已删除
// import AIDataAnalysis from "@/components/analysis/AIDataAnalysis"; // 已删除
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getClassDetailedAnalysisData } from "@/services/classService";

// Define interfaces for mock data if not already available from props or other imports
interface ExamData {
  examName: string;
  classAvg: number;
  gradeAvg: number;
}

interface WeaknessSubjectData {
  subject: string;
  classAvg: number;
  gradeAvg: number;
  gap: string;
  isWeak: boolean;
}

interface StudentListData {
  studentId: string;
  name: string;
  averageScore: number;
  trend: number;
}

interface ExamComparisonExam {
  id: string;
  name: string;
  date: string;
}

interface Props {
  selectedClass: any; // Consider defining a more specific type for selectedClass
  competencyData?: any[]; // Made optional
  correlationData?: any[]; // Made optional
  scoreDistributionData?: any[]; // Made optional
}

const DetailTab: React.FC<Props> = ({ 
  selectedClass,
  competencyData: initialCompetencyData,
  correlationData: initialCorrelationData,
  scoreDistributionData: initialScoreDistributionData
}) => {
  const [detailTab, setDetailTab] = React.useState("analysis");
  const [isLoading, setIsLoading] = useState(false);
  const [competencyData, setCompetencyData] = useState<any[]>(initialCompetencyData || []);
  const [correlationData, setCorrelationData] = useState<any[]>(initialCorrelationData || []);
  const [scoreDistributionData, setScoreDistributionData] = useState<any[]>(initialScoreDistributionData || []);
  const [classProfileData, setClassProfileData] = useState<any>({});
  const [classTrendData, setClassTrendData] = useState<any[]>([]);
  const [weaknessAnalysisData, setWeaknessAnalysisData] = useState<any[]>([]);
  const [examComparisonData, setExamComparisonData] = useState<{
    examList: any[],
    initialSelected: string[],
    displayScores: any[]
  }>({
    examList: [],
    initialSelected: [],
    displayScores: []
  });
  const [studentsListData, setStudentsListData] = useState<any[]>([]);
  const [boxPlotData, setBoxPlotData] = useState<any[]>([]);
  const [apiResponseData, setApiResponseData] = useState<any>(null); // 存储完整API响应以便调试

  // Ensure selectedClass is not null/undefined for some UI elements
  const safeClassName = selectedClass?.name || "未知班级";

  // 获取班级详细分析数据
  useEffect(() => {
    if (selectedClass && selectedClass.id) {
      setIsLoading(true);
      
      console.log(`正在获取班级 ${selectedClass.id} 的详细分析数据...`);
      
      getClassDetailedAnalysisData(selectedClass.id)
        .then(data => {
          console.log("API返回的数据:", data); // 记录API返回数据用于调试
          setApiResponseData(data);
          
          // 处理能力维度数据
          if (data.competencyData && data.competencyData.length > 0) {
            setCompetencyData(data.competencyData);
            console.log("能力维度数据:", data.competencyData);
          } else if (initialCompetencyData && initialCompetencyData.length > 0) {
            setCompetencyData(initialCompetencyData);
          }
          
          // 处理相关性数据
          if (data.studentsListData && data.studentsListData.length > 0) {
            // 创建相关性数据
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
                zValue: avgScore * 10, // 放大显示效果
                subject: index % 2 === 0 ? "数学" : "语文" // 简单分配学科
              };
            }).slice(0, 10); // 只取前10个学生
            
            setCorrelationData(corrData);
            console.log("相关性数据 (从学生列表生成):", corrData);
          } else if (initialCorrelationData && initialCorrelationData.length > 0) {
            setCorrelationData(initialCorrelationData);
          }
          
          // 处理分数分布数据
          if (data.scoreDistributionData && data.scoreDistributionData.length > 0) {
            setScoreDistributionData(data.scoreDistributionData);
            console.log("分数分布数据:", data.scoreDistributionData);
          } else if (initialScoreDistributionData && initialScoreDistributionData.length > 0) {
            setScoreDistributionData(initialScoreDistributionData);
          }
          
          // 处理班级趋势数据
          if (data.trendData && data.trendData.length > 0) {
            setClassTrendData(data.trendData);
            console.log("班级趋势数据:", data.trendData);
          }
          
          // 处理弱点分析数据
          if (data.weaknessAnalysisData && data.weaknessAnalysisData.length > 0) {
            setWeaknessAnalysisData(data.weaknessAnalysisData);
            console.log("弱点分析数据:", data.weaknessAnalysisData);
          }
          
          // 处理考试对比数据
          if (data.examComparisonData) {
            setExamComparisonData({
              examList: data.examComparisonData.examList || [],
              initialSelected: data.examComparisonData.initialSelected || [],
              displayScores: data.examComparisonData.displayScores || []
            });
            console.log("考试对比数据:", data.examComparisonData);
          }
          
          // 处理学生列表数据
          if (data.studentsListData && data.studentsListData.length > 0) {
            setStudentsListData(data.studentsListData);
            console.log("学生列表数据:", data.studentsListData);
          }
          
          // 班级概要数据
          if (data.classProfileData) {
            setClassProfileData(data.classProfileData);
            console.log("班级概要数据:", data.classProfileData);
          }
          
          // BoxPlot数据
          if (data.boxPlotData && data.boxPlotData.length > 0) {
            setBoxPlotData(data.boxPlotData);
            console.log("BoxPlot数据:", data.boxPlotData);
          } else {
            console.warn("API未返回有效的BoxPlot数据");
          }
        })
        .catch(error => {
          console.error('获取班级详细分析数据失败:', error);
          toast.error(`获取班级详细分析数据失败: ${error.message}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedClass.id, initialCompetencyData, initialCorrelationData, initialScoreDistributionData]);

  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">调试信息</h3>
          <p className="text-xs text-yellow-700 mt-1">选中班级ID: {selectedClass?.id}</p>
          <p className="text-xs text-yellow-700">BoxPlot数据长度: {boxPlotData?.length || 0}</p>
          <p className="text-xs text-yellow-700">学生数据长度: {studentsListData?.length || 0}</p>
          <p className="text-xs text-yellow-700">API是否返回数据: {apiResponseData ? '是' : '否'}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div id={selectedClass.id}>
        <ClassProfileCard classData={Object.keys(classProfileData).length > 0 ? classProfileData : selectedClass} />
        {renderDebugInfo()}
      </div>
      
      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className="w-full grid grid-cols-2 max-w-[300px] mb-6">
          <TabsTrigger value="analysis">班级分析</TabsTrigger>
          <TabsTrigger value="students">学生列表</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analysis" className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
              <span>加载班级分析数据...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>班级成绩趋势</CardTitle>
                    <CardDescription>{safeClassName}与年级平均分对比趋势</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {classTrendData.length > 0 ? (
                      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-center text-gray-500">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                            📈
                          </div>
                          <p className="text-lg font-medium">班级趋势图表正在重构中</p>
                          <p className="text-sm">此功能将在后续版本中重新设计</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        暂无成绩趋势数据
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>学科优劣势分析</CardTitle>
                    <CardDescription>{safeClassName}需要重点关注的学科</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {weaknessAnalysisData.length > 0 ? (
                      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-center text-gray-500">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                            📊
                          </div>
                          <p className="text-lg font-medium">班级弱点分析正在重构中</p>
                          <p className="text-sm">此功能将在后续版本中重新设计</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        暂无学科优劣势数据
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>考试成绩对比</CardTitle>
                    <CardDescription>选择考试进行成绩对比分析</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {examComparisonData.examList.length > 0 ? (
                      <ExamComparison 
                        mockExamList={examComparisonData.examList}
                        initialSelectedExams={examComparisonData.initialSelected}
                        mockDisplayScores={examComparisonData.displayScores}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        暂无考试对比数据
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>分数段分布</CardTitle>
                    <CardDescription>各分数段学生人数</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {scoreDistributionData.length > 0 ? (
                      <ScoreDistribution data={scoreDistributionData} />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        暂无分数分布数据
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{safeClassName}成绩分布</CardTitle>
                    <CardDescription>各科目成绩四分位数分布</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {boxPlotData.length > 0 ? (
                      <ScoreBoxPlot data={boxPlotData} />
                    ) : (
                      <div className="flex items-center justify-center h-64 text-gray-500">
                        暂无成绩分布数据
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{safeClassName}能力维度</CardTitle>
                    <CardDescription>班级多维度能力评估</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center justify-center h-64">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">📊</span>
                      </div>
                      <h3 className="text-lg font-medium mb-2">能力雷达图</h3>
                      <p className="text-gray-500 text-center">
                        能力雷达图组件正在重构中
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>{safeClassName}学习表现关联分析</CardTitle>
                  <CardDescription>课堂表现、作业质量与考试成绩的关联性</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">🔗</span>
                    </div>
                    <h3 className="text-lg font-medium mb-2">关联分析图</h3>
                    <p className="text-gray-500 text-center">
                      关联分析组件正在重构中
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="students">
          <ClassStudentsList 
            classId={selectedClass?.id || ""}
            students={studentsListData} 
            className={safeClassName}
            studentCount={studentsListData.length}
            mockStudentData={studentsListData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailTab;
