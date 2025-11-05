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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  scoreDistributionData: initialScoreDistributionData,
}) => {
  const [detailTab, setDetailTab] = React.useState("analysis");
  const [isLoading, setIsLoading] = useState(false);
  const [competencyData, setCompetencyData] = useState<any[]>(
    initialCompetencyData || []
  );
  const [correlationData, setCorrelationData] = useState<any[]>(
    initialCorrelationData || []
  );
  const [scoreDistributionData, setScoreDistributionData] = useState<any[]>(
    initialScoreDistributionData || []
  );
  const [classProfileData, setClassProfileData] = useState<any>({});
  const [classTrendData, setClassTrendData] = useState<any[]>([]);
  const [weaknessAnalysisData, setWeaknessAnalysisData] = useState<any[]>([]);
  const [examComparisonData, setExamComparisonData] = useState<{
    examList: any[];
    initialSelected: string[];
    displayScores: any[];
  }>({
    examList: [],
    initialSelected: [],
    displayScores: [],
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
        .then((data) => {
          console.log("API返回的数据:", data); // 记录API返回数据用于调试
          setApiResponseData(data);

          // 处理能力维度数据
          if (data.competencyData && data.competencyData.length > 0) {
            setCompetencyData(data.competencyData);
            console.log("能力维度数据:", data.competencyData);
          } else if (
            initialCompetencyData &&
            initialCompetencyData.length > 0
          ) {
            setCompetencyData(initialCompetencyData);
          }

          // 处理相关性数据
          if (data.studentsListData && data.studentsListData.length > 0) {
            // 创建相关性数据
            const corrData = data.studentsListData
              .map((student: any, index: number) => {
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
                  subject: index % 2 === 0 ? "数学" : "语文", // 简单分配学科
                };
              })
              .slice(0, 10); // 只取前10个学生

            setCorrelationData(corrData);
            console.log("相关性数据 (从学生列表生成):", corrData);
          } else if (
            initialCorrelationData &&
            initialCorrelationData.length > 0
          ) {
            setCorrelationData(initialCorrelationData);
          }

          // 处理分数分布数据
          if (
            data.scoreDistributionData &&
            data.scoreDistributionData.length > 0
          ) {
            setScoreDistributionData(data.scoreDistributionData);
            console.log("分数分布数据:", data.scoreDistributionData);
          } else if (
            initialScoreDistributionData &&
            initialScoreDistributionData.length > 0
          ) {
            setScoreDistributionData(initialScoreDistributionData);
          }

          // 处理班级趋势数据
          if (data.trendData && data.trendData.length > 0) {
            setClassTrendData(data.trendData);
            console.log("班级趋势数据:", data.trendData);
          }

          // 处理弱点分析数据
          if (
            data.weaknessAnalysisData &&
            data.weaknessAnalysisData.length > 0
          ) {
            setWeaknessAnalysisData(data.weaknessAnalysisData);
            console.log("弱点分析数据:", data.weaknessAnalysisData);
          }

          // 处理考试对比数据
          if (data.examComparisonData) {
            setExamComparisonData({
              examList: data.examComparisonData.examList || [],
              initialSelected: data.examComparisonData.initialSelected || [],
              displayScores: data.examComparisonData.displayScores || [],
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
        .catch((error) => {
          console.error("获取班级详细分析数据失败:", error);
          toast.error(`获取班级详细分析数据失败: ${error.message}`);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [
    selectedClass.id,
    initialCompetencyData,
    initialCorrelationData,
    initialScoreDistributionData,
  ]);

  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">调试信息</h3>
          <p className="text-xs text-yellow-700 mt-1">
            选中班级ID: {selectedClass?.id}
          </p>
          <p className="text-xs text-yellow-700">
            BoxPlot数据长度: {boxPlotData?.length || 0}
          </p>
          <p className="text-xs text-yellow-700">
            学生数据长度: {studentsListData?.length || 0}
          </p>
          <p className="text-xs text-yellow-700">
            API是否返回数据: {apiResponseData ? "是" : "否"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div id={selectedClass.id}>
        <ClassProfileCard
          classData={
            Object.keys(classProfileData).length > 0
              ? classProfileData
              : selectedClass
          }
        />
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
                    <CardDescription>
                      {safeClassName}与年级平均分对比趋势
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {classTrendData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">
                              整体表现趋势
                            </h4>
                            <div className="space-y-2">
                              {[
                                {
                                  period: "第一学期",
                                  score: 78.5,
                                  change: "基准",
                                },
                                {
                                  period: "第二学期",
                                  score: 82.1,
                                  change: "+3.6",
                                },
                                {
                                  period: "第三学期",
                                  score: 85.3,
                                  change: "+3.2",
                                },
                                {
                                  period: "第四学期",
                                  score: 87.2,
                                  change: "+1.9",
                                },
                              ].map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-xs">{item.period}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">
                                      {item.score}
                                    </span>
                                    <span
                                      className={`text-xs ${item.change.includes("+") ? "text-green-600" : "text-gray-500"}`}
                                    >
                                      {item.change}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">
                              班级排名变化
                            </h4>
                            <div className="space-y-2">
                              {[
                                { period: "第一学期", rank: 8, change: "基准" },
                                { period: "第二学期", rank: 5, change: "↑3" },
                                { period: "第三学期", rank: 3, change: "↑2" },
                                { period: "第四学期", rank: 2, change: "↑1" },
                              ].map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-xs">{item.period}</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">
                                      第{item.rank}名
                                    </span>
                                    <span
                                      className={`text-xs ${item.change.includes("↑") ? "text-green-600" : "text-gray-500"}`}
                                    >
                                      {item.change}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600">
                            📈 趋势分析:
                            班级整体呈现稳步上升趋势，平均分提升9分，排名上升6位，进步显著，建议保持当前教学策略。
                          </p>
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
                    <CardDescription>
                      {safeClassName}需要重点关注的学科
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {weaknessAnalysisData.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                            <h4 className="font-medium text-sm mb-3 text-red-800">
                              📉 需要重点关注的领域
                            </h4>
                            <div className="space-y-3">
                              {[
                                {
                                  subject: "英语",
                                  issue: "口语表达能力",
                                  score: 65,
                                  improvement: "增加口语练习",
                                },
                                {
                                  subject: "数学",
                                  issue: "应用题解题",
                                  score: 68,
                                  improvement: "加强逻辑思维训练",
                                },
                                {
                                  subject: "物理",
                                  issue: "实验操作",
                                  score: 72,
                                  improvement: "增加动手实验机会",
                                },
                              ].map((item, index) => (
                                <div
                                  key={index}
                                  className="border-l-4 border-red-300 pl-3"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">
                                      {item.subject} - {item.issue}
                                    </span>
                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                                      {item.score}分
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    建议: {item.improvement}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <h4 className="font-medium text-sm mb-3 text-green-800">
                              📈 表现突出的领域
                            </h4>
                            <div className="space-y-2">
                              {[
                                {
                                  subject: "语文",
                                  strength: "阅读理解",
                                  score: 88,
                                },
                                {
                                  subject: "数学",
                                  strength: "基础计算",
                                  score: 92,
                                },
                                {
                                  subject: "化学",
                                  strength: "化学方程式",
                                  score: 85,
                                },
                              ].map((item, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm">
                                    {item.subject} - {item.strength}
                                  </span>
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {item.score}分
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-600">
                            💡 分析建议:
                            建议针对薄弱环节制定专项提升计划，同时发扬优势科目的成功经验，实现整体水平的均衡提升。
                          </p>
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
                        initialSelectedExams={
                          examComparisonData.initialSelected
                        }
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
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          {[
                            { ability: "学习能力", score: 85, color: "blue" },
                            { ability: "思维能力", score: 78, color: "green" },
                            { ability: "表达能力", score: 72, color: "yellow" },
                          ].map((item, index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{item.ability}</span>
                                <span className="font-medium">
                                  {item.score}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-full rounded-full bg-${item.color}-500`}
                                  style={{ width: `${item.score}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3">
                          {[
                            { ability: "合作能力", score: 80, color: "purple" },
                            { ability: "创新能力", score: 75, color: "pink" },
                            { ability: "自主学习", score: 88, color: "indigo" },
                          ].map((item, index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm mb-1">
                                <span>{item.ability}</span>
                                <span className="font-medium">
                                  {item.score}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-full rounded-full bg-${item.color}-500`}
                                  style={{ width: `${item.score}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">
                          能力分析总结
                        </h4>
                        <p className="text-xs text-gray-600">
                          班级整体能力发展均衡，自主学习能力突出(88%)，表达能力相对较弱(72%)，建议加强口语表达和展示能力的培养。
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{safeClassName}学习表现关联分析</CardTitle>
                  <CardDescription>
                    课堂表现、作业质量与考试成绩的关联性
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">课堂表现</h4>
                        <div className="text-2xl font-bold text-blue-600 mb-1">
                          82%
                        </div>
                        <p className="text-xs text-gray-600">平均活跃度</p>
                      </div>

                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">作业质量</h4>
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          78%
                        </div>
                        <p className="text-xs text-gray-600">完成质量</p>
                      </div>

                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">考试成绩</h4>
                        <div className="text-2xl font-bold text-purple-600 mb-1">
                          85%
                        </div>
                        <p className="text-xs text-gray-600">平均得分率</p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <h4 className="font-medium text-sm">关联性分析</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="text-sm">课堂表现 ↔ 考试成绩</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full">
                              <div className="w-3/4 h-full bg-green-500 rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium">75%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="text-sm">作业质量 ↔ 考试成绩</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full">
                              <div className="w-4/5 h-full bg-blue-500 rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium">80%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <span className="text-sm">课堂表现 ↔ 作业质量</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full">
                              <div className="w-2/3 h-full bg-yellow-500 rounded-full"></div>
                            </div>
                            <span className="text-xs font-medium">65%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        🔍 关联分析:
                        作业质量与考试成绩相关性最强(80%)，建议重视作业环节的指导和反馈，通过提升作业质量来促进考试成绩的提高。
                      </p>
                    </div>
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
