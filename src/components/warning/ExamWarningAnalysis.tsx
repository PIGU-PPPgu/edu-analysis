import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  Target,
  Clock,
  BookOpen,
  Zap,
  Brain,
  Lightbulb,
} from "lucide-react";
import {
  getExamWarningStatistics,
  getExamStatistics,
  type Exam,
} from "@/services/examService";
import { formatNumber } from "@/utils/formatUtils";
import ExamSelector from "./ExamSelector";
import WarningDashboard from "./WarningDashboard";
import AIAnalysisPanel from "./AIAnalysisPanel";

interface ExamWarningAnalysisProps {
  className?: string;
}

const ExamWarningAnalysis: React.FC<ExamWarningAnalysisProps> = ({
  className = "",
}) => {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examWarningData, setExamWarningData] = useState<any>(null);
  const [examStatistics, setExamStatistics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // 当选择的考试改变时，获取预警数据
  useEffect(() => {
    if (selectedExam) {
      fetchExamWarningData();
    } else {
      setExamWarningData(null);
      setExamStatistics(null);
    }
  }, [selectedExam]);

  const fetchExamWarningData = async () => {
    if (!selectedExam) return;

    setIsLoading(true);
    try {
      const [warningData, statsData] = await Promise.all([
        getExamWarningStatistics(selectedExam.id),
        getExamStatistics(selectedExam.id),
      ]);

      setExamWarningData(warningData);
      setExamStatistics(statsData);
    } catch (error) {
      console.error("获取考试预警数据失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染考试概览统计
  const renderExamOverview = () => {
    if (!selectedExam || !examStatistics) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-800">
            <BookOpen className="h-5 w-5 mr-2 text-[#c0ff3f]" />
            考试概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-800">
                {formatNumber(examStatistics.totalStudents)}
              </h3>
              <p className="text-sm text-gray-600">参考学生</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-800">
                {examStatistics.averageScore}
              </h3>
              <p className="text-sm text-gray-600">平均分</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-800">
                {examStatistics.passRate}%
              </h3>
              <p className="text-sm text-gray-600">及格率</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="text-2xl font-bold text-gray-800">
                {examStatistics.maxScore} / {examStatistics.minScore}
              </h3>
              <p className="text-sm text-gray-600">最高分 / 最低分</p>
            </div>
          </div>

          {/* 及格率进度条 */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                及格率分析
              </span>
              <span className="text-sm text-gray-600">
                {examStatistics.passRate}%
              </span>
            </div>
            <Progress
              value={examStatistics.passRate}
              className="h-3"
              // @ts-ignore
              style={{
                "--progress-color":
                  examStatistics.passRate >= 80
                    ? "#c0ff3f"
                    : examStatistics.passRate >= 60
                      ? "#fbbf24"
                      : "#ef4444",
              }}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染预警分析建议
  const renderWarningInsights = () => {
    if (!selectedExam || !examWarningData || !examStatistics) return null;

    const riskLevel =
      examStatistics.passRate >= 80
        ? "low"
        : examStatistics.passRate >= 60
          ? "medium"
          : "high";
    const riskLevelConfig = {
      low: {
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200",
        icon: Target,
        text: "低风险",
        description: "考试整体表现良好",
      },
      medium: {
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200",
        icon: Clock,
        text: "中等风险",
        description: "需要关注部分学生表现",
      },
      high: {
        color: "text-red-600",
        bgColor: "bg-red-50 border-red-200",
        icon: AlertTriangle,
        text: "高风险",
        description: "需要立即干预和支持",
      },
    };

    const config = riskLevelConfig[riskLevel];
    const Icon = config.icon;

    const insights = generateExamInsights(examStatistics, examWarningData);

    return (
      <div className="space-y-6">
        {/* 风险等级 */}
        <Alert className={`${config.bgColor} border`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <span className={`font-semibold ${config.color}`}>
                {config.text}
              </span>
              <span className="ml-2 text-gray-600">{config.description}</span>
            </div>
            <Badge variant="outline" className={config.color}>
              {selectedExam.type}
            </Badge>
          </AlertDescription>
        </Alert>

        {/* AI分析建议 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-gray-800">
              <Brain className="h-5 w-5 mr-2 text-[#c0ff3f]" />
              智能分析建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
              >
                <Lightbulb className="h-5 w-5 text-[#c0ff3f] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-800 mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-600">{insight.description}</p>
                  {insight.action && (
                    <p className="text-sm text-[#c0ff3f] font-medium mt-1">
                      建议：{insight.action}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 考试选择器 */}
      <ExamSelector
        selectedExamId={selectedExam?.id}
        onExamSelect={setSelectedExam}
        showStatistics={true}
      />

      {/* 考试分析内容 */}
      {selectedExam ? (
        <div>
          {/* 考试基本信息 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-[#c0ff3f]/10 to-[#c0ff3f]/5 border border-[#c0ff3f]/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedExam.title}
                </h2>
                <p className="text-gray-600 mt-1">
                  {selectedExam.type} • {selectedExam.date}
                  {selectedExam.subject && ` • ${selectedExam.subject}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchExamWarningData}
                disabled={isLoading}
                className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black"
              >
                <Zap className="h-4 w-4 mr-1" />
                刷新分析
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <div className="animate-spin h-8 w-8 border-4 border-[#c0ff3f] border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>正在分析考试数据...</p>
                </div>
              </CardContent>
            </Card>
          ) : examWarningData ? (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
                >
                  考试概览
                </TabsTrigger>
                <TabsTrigger
                  value="warnings"
                  className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
                >
                  预警分析
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
                >
                  智能建议
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {renderExamOverview()}
              </TabsContent>

              <TabsContent value="warnings" className="space-y-6">
                <WarningDashboard
                  warningData={examWarningData}
                  isLoading={false}
                  factorStats={examWarningData.commonRiskFactors}
                />
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                {renderWarningInsights()}
              </TabsContent>

              <TabsContent value="suggestions" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* AI智能分析 */}
                  <div className="lg:col-span-2">
                    <AIAnalysisPanel
                      request={{
                        dataType: "exam_analysis",
                        scope: "exam",
                        targetId: selectedExam?.id,
                        analysisDepth: "detailed",
                      }}
                      onRefresh={() => {
                        console.log("[ExamWarningAnalysis] AI分析刷新触发");
                        loadExamAnalysis();
                      }}
                    />
                  </div>

                  {/* 风险等级分布 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        风险等级分布
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analysis?.riskLevels && (
                        <div className="space-y-3">
                          {Object.entries(analysis.riskLevels).map(
                            ([level, data]) => (
                              <div
                                key={level}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-3 h-3 rounded-full ${
                                      level === "high"
                                        ? "bg-red-500"
                                        : level === "medium"
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                    }`}
                                  />
                                  <span className="text-sm capitalize">
                                    {level === "high"
                                      ? "高风险"
                                      : level === "medium"
                                        ? "中风险"
                                        : "低风险"}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {(data as any).count} 人 (
                                  {(data as any).percentage.toFixed(1)}%)
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 改进建议 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        改进建议
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analysis?.suggestions && (
                        <div className="space-y-3">
                          {analysis.suggestions.map((suggestion, index) => (
                            <div
                              key={index}
                              className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                            >
                              <div className="flex items-start gap-2">
                                <Badge
                                  variant={
                                    suggestion.priority === "high"
                                      ? "destructive"
                                      : suggestion.priority === "medium"
                                        ? "default"
                                        : "secondary"
                                  }
                                  className="mt-0.5"
                                >
                                  {suggestion.priority === "high"
                                    ? "高"
                                    : suggestion.priority === "medium"
                                      ? "中"
                                      : "低"}
                                </Badge>
                                <div className="flex-1">
                                  <p className="text-sm font-medium mb-1">
                                    {suggestion.action}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {suggestion.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">暂无考试数据</p>
                  <p className="text-sm">
                    该考试可能还没有成绩数据，请先导入成绩后再进行分析。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">请选择考试</p>
              <p className="text-sm">选择一个考试以查看详细的预警分析报告。</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// 生成考试分析建议
const generateExamInsights = (statistics: any, warningData: any) => {
  const insights = [];

  // 基于及格率的分析
  if (statistics.passRate < 60) {
    insights.push({
      title: "及格率偏低",
      description: `本次考试及格率仅为 ${statistics.passRate}%，明显低于正常水平。`,
      action:
        "建议对不及格学生进行个别辅导，分析失分原因并制定针对性提升方案。",
    });
  } else if (statistics.passRate < 80) {
    insights.push({
      title: "及格率需要提升",
      description: `本次考试及格率为 ${statistics.passRate}%，有进一步提升空间。`,
      action: "关注临界学生群体，通过小组辅导等方式帮助他们突破及格线。",
    });
  }

  // 基于分数分布的分析
  const scoreRange = statistics.maxScore - statistics.minScore;
  if (scoreRange > 70) {
    insights.push({
      title: "成绩分化明显",
      description: `最高分与最低分相差 ${scoreRange} 分，学生能力差异较大。`,
      action: "实施分层教学，为不同水平学生制定个性化学习计划。",
    });
  }

  // 基于预警学生数量的分析
  if (warningData.atRiskStudents > 0) {
    const riskRate = (
      (warningData.atRiskStudents / warningData.totalStudents) *
      100
    ).toFixed(1);
    insights.push({
      title: "风险学生关注",
      description: `共发现 ${warningData.atRiskStudents} 名风险学生，占比 ${riskRate}%。`,
      action: "建立风险学生档案，安排班主任和任课教师重点关注和帮扶。",
    });
  }

  // 基于班级风险分布的分析
  if (warningData.riskByClass && warningData.riskByClass.length > 0) {
    const highRiskClasses = warningData.riskByClass.filter(
      (cls: any) => cls.atRiskCount / cls.studentCount > 0.3
    );

    if (highRiskClasses.length > 0) {
      insights.push({
        title: "班级差异明显",
        description: `发现 ${highRiskClasses.length} 个班级风险学生比例较高。`,
        action: "分析班级教学差异，加强班级间的教学交流与协作。",
      });
    }
  }

  // 如果没有明显问题，提供积极建议
  if (insights.length === 0) {
    insights.push({
      title: "整体表现良好",
      description: "本次考试学生整体表现达到预期，及格率和分数分布都比较理想。",
      action: "继续保持现有教学方法，可适当提高教学难度以进一步提升学生能力。",
    });
  }

  return insights;
};

export default ExamWarningAnalysis;
