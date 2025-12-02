import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Award,
  AlertTriangle,
  BookOpen,
  Activity,
  Eye,
  Download,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  classAnalyticsService,
  type ClassBasicInfo,
  type ClassGradeOverview,
  type SubjectComparisonAnalysis,
  type StudentPerformanceTracking,
  type GradeDistributionAnalysis,
} from "@/services/classAnalyticsService";

interface ClassAnalyticsDashboardProps {
  className?: string;
  examTitle?: string;
}

const ClassAnalyticsDashboard: React.FC<ClassAnalyticsDashboardProps> = ({
  className: initialClassName,
  examTitle: initialExamTitle,
}) => {
  // 状态管理
  const [classes, setClasses] = useState<string[]>([]);
  const [exams, setExams] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(
    initialClassName || ""
  );
  const [selectedExam, setSelectedExam] = useState<string>(
    initialExamTitle || ""
  );
  const [isLoading, setIsLoading] = useState(false);

  // 分析数据状态
  const [basicInfo, setBasicInfo] = useState<ClassBasicInfo | null>(null);
  const [gradeOverview, setGradeOverview] = useState<ClassGradeOverview | null>(
    null
  );
  const [subjectComparison, setSubjectComparison] =
    useState<SubjectComparisonAnalysis | null>(null);
  const [studentTracking, setStudentTracking] =
    useState<StudentPerformanceTracking | null>(null);
  const [distributionAnalysis, setDistributionAnalysis] =
    useState<GradeDistributionAnalysis | null>(null);

  // 初始化数据加载
  useEffect(() => {
    loadAvailableData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassAnalytics();
    }
  }, [selectedClass, selectedExam]);

  // 加载可选的班级和考试数据
  const loadAvailableData = async () => {
    try {
      // 获取所有班级
      const { data: classData } = await supabase
        .from("grade_data")
        .select("class_name")
        .order("class_name");

      if (classData) {
        const uniqueClasses = [
          ...new Set(classData.map((item) => item.class_name)),
        ];
        setClasses(uniqueClasses);

        if (!selectedClass && uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0]);
        }
      }

      // 获取所有考试
      const { data: examData } = await supabase
        .from("grade_data")
        .select("exam_title, exam_date")
        .order("exam_date", { ascending: false });

      if (examData) {
        const uniqueExams = [
          ...new Set(examData.map((item) => item.exam_title)),
        ];
        setExams(uniqueExams);

        if (!selectedExam && uniqueExams.length > 0) {
          setSelectedExam(uniqueExams[0]);
        }
      }
    } catch (error) {
      console.error("加载可选数据失败:", error);
      toast.error("加载班级和考试信息失败");
    }
  };

  // 加载班级分析数据
  const loadClassAnalytics = async () => {
    if (!selectedClass) return;

    setIsLoading(true);
    try {
      console.log("🔄 开始加载班级分析数据:", { selectedClass, selectedExam });

      // 并行加载多个分析数据
      const [
        basicInfoData,
        gradeOverviewData,
        subjectComparisonData,
        studentTrackingData,
        distributionAnalysisData,
      ] = await Promise.all([
        classAnalyticsService.getClassBasicInfo(selectedClass),
        classAnalyticsService.getClassGradeOverview(
          selectedClass,
          selectedExam
        ),
        selectedExam
          ? classAnalyticsService.getSubjectComparisonAnalysis(
              selectedClass,
              selectedExam
            )
          : null,
        classAnalyticsService.getStudentPerformanceTracking(selectedClass, 20),
        selectedExam
          ? classAnalyticsService.getGradeDistributionAnalysis(
              selectedClass,
              selectedExam
            )
          : null,
      ]);

      setBasicInfo(basicInfoData);
      setGradeOverview(gradeOverviewData);
      setSubjectComparison(subjectComparisonData);
      setStudentTracking(studentTrackingData);
      setDistributionAnalysis(distributionAnalysisData);

      console.log("✅ 班级分析数据加载完成");
    } catch (error) {
      console.error("❌ 加载班级分析数据失败:", error);
      toast.error("加载班级分析数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染基本信息卡片
  const renderBasicInfoCards = () => {
    if (!basicInfo || !gradeOverview) return null;

    const cards = [
      {
        title: "学生总数",
        value: basicInfo.studentCount,
        icon: Users,
        color: "blue",
        description: `活跃学生 ${basicInfo.activeStudents} 名`,
      },
      {
        title: "班级平均分",
        value: gradeOverview.totalScore.average,
        icon: Target,
        color: "green",
        description: `标准差 ${gradeOverview.totalScore.standardDeviation}`,
      },
      {
        title: "及格率",
        value: `${gradeOverview.totalScore.passRate}%`,
        icon: Award,
        color:
          gradeOverview.totalScore.passRate >= 80
            ? "green"
            : gradeOverview.totalScore.passRate >= 60
              ? "yellow"
              : "red",
        description: `优秀率 ${gradeOverview.totalScore.excellenceRate}%`,
      },
      {
        title: "考试次数",
        value: basicInfo.examCount,
        icon: BookOpen,
        color: "purple",
        description: `科目数 ${basicInfo.subjectCount}`,
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold">{card.value}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {card.description}
                    </p>
                  </div>
                  <div
                    className={`p-2 rounded-lg ${
                      card.color === "blue"
                        ? "bg-blue-100 text-blue-600"
                        : card.color === "green"
                          ? "bg-green-100 text-green-600"
                          : card.color === "yellow"
                            ? "bg-yellow-100 text-yellow-600"
                            : card.color === "red"
                              ? "bg-red-100 text-red-600"
                              : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    <IconComponent className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // 渲染科目对比图表
  const renderSubjectComparison = () => {
    if (!subjectComparison) return null;

    const chartData = subjectComparison.subjectComparison.map((subject) => ({
      name: subject.subjectName,
      average: subject.average,
      passRate:
        subject.distribution.pass +
        subject.distribution.good +
        subject.distribution.excellent,
      excellenceRate: subject.distribution.excellent,
      strengthLevel: subject.strengthLevel,
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            科目横向对比分析
          </CardTitle>
          <CardDescription>各科目平均分、及格率和优秀率对比</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="#3b82f6" name="平均分" />
                <Bar dataKey="passRate" fill="#10b981" name="及格人数" />
                <Bar dataKey="excellenceRate" fill="#f59e0b" name="优秀人数" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 科目强弱分析 */}
          <div className="mt-6">
            <h4 className="font-semibold mb-3">科目强弱分析</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["strong", "average", "weak"].map((level) => {
                const subjects = subjectComparison.subjectComparison.filter(
                  (s) => s.strengthLevel === level
                );
                const levelNames = {
                  strong: "优势科目",
                  average: "一般科目",
                  weak: "薄弱科目",
                };
                const colors = {
                  strong: "bg-green-100 text-green-700",
                  average: "bg-blue-100 text-blue-700",
                  weak: "bg-red-100 text-red-700",
                };

                return (
                  <div
                    key={level}
                    className={`p-3 rounded-lg ${colors[level]}`}
                  >
                    <h5 className="font-medium">{levelNames[level]}</h5>
                    <div className="mt-2">
                      {subjects.map((subject) => (
                        <Badge
                          key={subject.subject}
                          variant="outline"
                          className="mr-1 mb-1"
                        >
                          {subject.subjectName} ({subject.average})
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 科目相关性分析 */}
          {subjectComparison.subjectCorrelations.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3">科目相关性分析</h4>
              <div className="space-y-2">
                {subjectComparison.subjectCorrelations.map(
                  (correlation, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="text-sm">
                        {correlation.subject1} ↔ {correlation.subject2}
                      </span>
                      <div className="flex items-center">
                        <span className="text-sm mr-2">
                          {correlation.correlation}
                        </span>
                        <Badge
                          variant={
                            correlation.strength === "strong"
                              ? "default"
                              : correlation.strength === "medium"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {correlation.strength === "strong"
                            ? "强相关"
                            : correlation.strength === "medium"
                              ? "中等相关"
                              : "弱相关"}
                        </Badge>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // 渲染成绩分布图表
  const renderGradeDistribution = () => {
    if (!distributionAnalysis) return null;

    const pieData = distributionAnalysis.scoreDistribution
      .filter((range) => range.count > 0)
      .map((range) => ({
        name: range.scoreRange,
        value: range.count,
        percentage: range.percentage,
      }));

    const COLORS = [
      "#0088FE",
      "#00C49F",
      "#FFBB28",
      "#FF8042",
      "#8884D8",
      "#82CA9D",
      "#FFC658",
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChartIcon className="h-5 w-5 mr-2" />
            成绩分布分析
          </CardTitle>
          <CardDescription>总分区间分布和形态分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 饼图 */}
            <div>
              <h4 className="font-semibold mb-3">分数区间分布</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) =>
                        `${name} (${percentage}%)`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 详细分布表 */}
            <div>
              <h4 className="font-semibold mb-3">详细分数分布</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {distributionAnalysis.scoreDistribution.map((range, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="font-medium">{range.scoreRange}</span>
                    <div className="flex items-center space-x-2">
                      <span>{range.count}人</span>
                      <Badge variant="outline">{range.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 分布形态分析 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">分布形态分析</h4>
            <p className="text-blue-700 mb-2">
              {distributionAnalysis.distributionShape.description}
            </p>
            <div className="space-y-1">
              {distributionAnalysis.distributionShape.implications.map(
                (implication, index) => (
                  <p key={index} className="text-sm text-blue-600">
                    • {implication}
                  </p>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染学生表现追踪
  const renderStudentTracking = () => {
    if (!studentTracking || studentTracking.studentProgress.length === 0)
      return null;

    // 准备趋势图表数据
    const trendData = studentTracking.studentProgress
      .slice(0, 8) // 只显示前8名学生
      .map((student) => {
        const data = student.rankingTrend.map((trend, index) => ({
          exam: `考试${index + 1}`,
          rank: trend.rank,
          score: trend.totalScore,
        }));
        return { studentName: student.studentName, data };
      });

    // 风险学生统计
    const riskStats = {
      high: studentTracking.studentProgress.filter(
        (s) => s.riskAssessment.riskLevel === "high"
      ).length,
      medium: studentTracking.studentProgress.filter(
        (s) => s.riskAssessment.riskLevel === "medium"
      ).length,
      low: studentTracking.studentProgress.filter(
        (s) => s.riskAssessment.riskLevel === "low"
      ).length,
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            学生表现追踪
          </CardTitle>
          <CardDescription>学生排名变化趋势和风险评估</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 风险统计 */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {riskStats.high}
              </div>
              <div className="text-sm text-red-700">高风险学生</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {riskStats.medium}
              </div>
              <div className="text-sm text-yellow-700">中风险学生</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {riskStats.low}
              </div>
              <div className="text-sm text-green-700">低风险学生</div>
            </div>
          </div>

          {/* 学生表现列表 */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {studentTracking.studentProgress
              .slice(0, 10)
              .map((student, index) => {
                const trendIcon =
                  student.progressAnalysis.trend === "improving"
                    ? TrendingUp
                    : student.progressAnalysis.trend === "declining"
                      ? TrendingDown
                      : Target;
                const TrendIcon = trendIcon;
                const trendColor =
                  student.progressAnalysis.trend === "improving"
                    ? "text-green-600"
                    : student.progressAnalysis.trend === "declining"
                      ? "text-red-600"
                      : "text-gray-600";

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1 rounded ${trendColor}`}>
                        <TrendIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium">{student.studentName}</div>
                        <div className="text-sm text-gray-600">
                          排名变化:{" "}
                          {student.progressAnalysis.avgRankChange > 0
                            ? "+"
                            : ""}
                          {student.progressAnalysis.avgRankChange}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          student.riskAssessment.riskLevel === "high"
                            ? "destructive"
                            : student.riskAssessment.riskLevel === "medium"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {student.riskAssessment.riskLevel === "high"
                          ? "高风险"
                          : student.riskAssessment.riskLevel === "medium"
                            ? "中风险"
                            : "低风险"}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {student.progressAnalysis.trend === "improving"
                          ? "进步"
                          : student.progressAnalysis.trend === "declining"
                            ? "退步"
                            : "稳定"}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 功能介绍 */}
      <Alert>
        <BarChart3 className="h-4 w-4" />
        <AlertDescription>
          班级成绩分析和可视化系统，提供全面的班级表现洞察，包括成绩分布、科目分析、学生排名变化等关键指标。
        </AlertDescription>
      </Alert>

      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              分析控制面板
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadClassAnalytics}
                disabled={isLoading || !selectedClass}
              >
                <Eye className="h-4 w-4 mr-1" />
                刷新分析
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                导出报告
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">选择班级</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择班级" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((className) => (
                    <SelectItem key={className} value={className}>
                      {className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">选择考试</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择考试" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((examTitle) => (
                    <SelectItem key={examTitle} value={examTitle}>
                      {examTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 基本信息卡片 */}
      {renderBasicInfoCards()}

      {/* 分析标签页 */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center">
            <Target className="h-4 w-4 mr-2" />
            成绩概览
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            科目对比
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center">
            <PieChartIcon className="h-4 w-4 mr-2" />
            分布分析
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            学生追踪
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {gradeOverview && (
            <Card>
              <CardHeader>
                <CardTitle>班级成绩概览 - {gradeOverview.examTitle}</CardTitle>
                <CardDescription>
                  考试日期：{gradeOverview.examDate} | 考试类型：
                  {gradeOverview.examType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-semibold">总分统计</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>平均分:</span>
                        <span className="font-medium">
                          {gradeOverview.totalScore.average}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>最高分:</span>
                        <span className="font-medium">
                          {gradeOverview.totalScore.highest}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>最低分:</span>
                        <span className="font-medium">
                          {gradeOverview.totalScore.lowest}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>标准差:</span>
                        <span className="font-medium">
                          {gradeOverview.totalScore.standardDeviation}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">通过率统计</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>及格率:</span>
                        <span className="font-medium">
                          {gradeOverview.totalScore.passRate}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>优秀率:</span>
                        <span className="font-medium">
                          {gradeOverview.totalScore.excellenceRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold">排名分布</h4>
                    <div className="space-y-1 text-sm">
                      {gradeOverview.rankDistribution.map((range, index) => (
                        <div key={index} className="flex justify-between">
                          <span>第{range.rankRange}名:</span>
                          <span className="font-medium">
                            {range.count}人 ({range.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          {renderSubjectComparison()}
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          {renderGradeDistribution()}
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          {renderStudentTracking()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function Label({ className, children, ...props }) {
  return (
    <label
      className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className || ""}`}
      {...props}
    >
      {children}
    </label>
  );
}

export default ClassAnalyticsDashboard;
