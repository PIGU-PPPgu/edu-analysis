import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  BarChart,
  LineChart,
  AreaChart,
  ChevronDown,
  ChevronUp,
  Calculator,
  BookOpen,
  CircleDot,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import { toast } from "sonner";

interface AdvancedDashboardProps {
  examId?: string;
  examTitle?: string;
  examDate?: string;
  examType?: string;
  gradeData?: any[];
}

export const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({
  examId,
  examTitle = "未知考试",
  examDate = "",
  examType = "",
  gradeData: propGradeData,
}) => {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [classRanking, setClassRanking] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("总分");
  const [subjectList, setSubjectList] = useState<string[]>(["总分"]);

  // 使用传入的gradeData，如果没有则使用空数组
  const gradeData = propGradeData || [];

  // Helper to ensure scoreDistributionData is always a 5-element array
  const getDefaultScoreDistribution = () => [
    { range: "90-100", count: 0, percentage: 0 },
    { range: "80-89", count: 0, percentage: 0 },
    { range: "70-79", count: 0, percentage: 0 },
    { range: "60-69", count: 0, percentage: 0 },
    { range: "0-59", count: 0, percentage: 0 },
  ];

  const getSafeScoreDistributionData = () => {
    const defaultDist = getDefaultScoreDistribution().map((d) => ({
      range: d.range,
      count: d.count,
    }));
    const rawData = analysisResult?.scoreDistribution;

    if (Array.isArray(rawData)) {
      const processedData = [];
      for (let i = 0; i < 5; i++) {
        const defaultItem = defaultDist[i]; // e.g. { range: '90-100', count: 0 }
        const rawItem = rawData[i];
        processedData.push({
          range: rawItem?.range || defaultItem.range,
          count:
            typeof rawItem?.count === "number"
              ? rawItem.count
              : defaultItem.count,
        });
      }
      return processedData;
    }
    return defaultDist; // Fallback if rawData is not an array
  };

  // 获取分析数据
  useEffect(() => {
    if (!examId) return;

    const fetchAnalysisData = async () => {
      setIsLoading(true);

      try {
        const { data, error } =
          await gradeAnalysisService.analyzeExamData(examId);

        if (error) throw error;

        setAnalysisResult(data);

        // 提取科目列表 - 不再包含总分
        if (data?.subjectPerformance) {
          const subjects = Object.keys(data.subjectPerformance);
          setSubjectList(subjects);
        }

        // 如果有班级数据，默认选中第一个班级
        if (data?.classPerformance?.length > 0) {
          setSelectedClass(data.classPerformance[0].className);
        }
      } catch (error) {
        console.error("获取分析数据失败:", error);
        toast.error("分析数据加载失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalysisData();
  }, [examId]);

  // 获取班级排名
  useEffect(() => {
    if (!examId) return;

    const fetchClassRanking = async () => {
      try {
        const { data, error } =
          await gradeAnalysisService.getClassRanking(examId);

        if (error) throw error;

        setClassRanking(data || []);
      } catch (error) {
        console.error("获取班级排名失败:", error);
      }
    };

    fetchClassRanking();
  }, [examId]);

  // 根据分析结果构建分数分布数据
  const scoreDistributionData = getSafeScoreDistributionData();

  // 计算各分数段百分比
  const totalCount = scoreDistributionData.reduce(
    (sum, item) => sum + (item?.count || 0),
    0
  );
  const scoreDistributionPercentages = scoreDistributionData.map((item) => ({
    range: item?.range || "N/A",
    count: item?.count || 0,
    percentage: totalCount > 0 ? ((item?.count || 0) / totalCount) * 100 : 0,
  }));

  // 获取总体统计数据
  const overallStats = analysisResult?.overallStats || {
    average: 0,
    median: 0,
    min: 0,
    max: 0,
    stdDev: 0,
  };

  // 获取选中科目的数据
  const getSubjectData = () => {
    if (!analysisResult) return null;

    if (selectedSubject === "总分") {
      return overallStats;
    }

    return analysisResult.subjectPerformance?.[selectedSubject] || null;
  };

  const subjectData = getSubjectData();

  // 获取选中班级的科目数据
  const getClassSubjectData = () => {
    if (!analysisResult || !selectedClass || !selectedSubject) return null;

    if (selectedSubject === "总分") {
      return analysisResult.classPerformance?.find(
        (c: any) => c.className === selectedClass
      );
    }

    return analysisResult.subjectPerformance?.[selectedSubject]
      ?.classBreakdown?.[selectedClass];
  };

  const classSubjectData = getClassSubjectData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-solid border-purple-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">正在加载分析数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 考试信息卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            {examTitle}
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 pt-1">
            <span>考试类型: {examType}</span>
            {examDate && (
              <span>考试日期: {new Date(examDate).toLocaleDateString()}</span>
            )}
            <span>学生数量: {analysisResult?.totalStudents || 0}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 总体统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              平均分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold">
                {overallStats.average.toFixed(1)}
              </p>
              <span className="text-sm text-gray-500 ml-2">分</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              中位数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold">
                {overallStats.median.toFixed(1)}
              </p>
              <span className="text-sm text-gray-500 ml-2">分</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              最高分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-green-600">
                {overallStats.max.toFixed(1)}
              </p>
              <span className="text-sm text-gray-500 ml-2">分</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              最低分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline">
              <p className="text-2xl font-bold text-red-500">
                {overallStats.min.toFixed(1)}
              </p>
              <span className="text-sm text-gray-500 ml-2">分</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要分析内容 */}
      <Tabs defaultValue="distribution">
        <TabsList className="bg-white border">
          <TabsTrigger value="distribution" className="gap-1.5">
            <PieChart className="h-4 w-4" />
            分数分布
          </TabsTrigger>
          <TabsTrigger value="classes" className="gap-1.5">
            <BarChart className="h-4 w-4" />
            班级分析
          </TabsTrigger>
          <TabsTrigger value="subjects" className="gap-1.5">
            <LineChart className="h-4 w-4" />
            学科分析
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 分数分布图表卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">分数分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {scoreDistributionPercentages.map((item, index) => (
                    <div key={item.range} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block h-3 w-3 rounded-full ${
                              index === 0
                                ? "bg-purple-500"
                                : index === 1
                                  ? "bg-green-500"
                                  : index === 2
                                    ? "bg-blue-500"
                                    : index === 3
                                      ? "bg-amber-500"
                                      : "bg-red-500"
                            }`}
                          ></span>
                          <span className="text-sm font-medium">
                            {item.range}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.count}人 ({item.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">统计分析</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">标准差</p>
                      <p className="text-lg font-bold">
                        {overallStats.stdDev.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-500">及格率</p>
                      <p className="text-lg font-bold">
                        {totalCount > 0
                          ? (
                              (((scoreDistributionData[0]?.count || 0) +
                                (scoreDistributionData[1]?.count || 0) +
                                (scoreDistributionData[2]?.count || 0) +
                                (scoreDistributionData[3]?.count || 0)) /
                                totalCount) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 成绩区间分析卡片 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">
                  成绩区间分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      优秀率 (90分以上)
                    </h4>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          totalCount > 0
                            ? ((scoreDistributionData[0]?.count || 0) /
                                totalCount) *
                              100
                            : 0
                        }
                        className="h-2.5"
                      />
                      <span className="text-sm font-medium">
                        {totalCount > 0
                          ? (
                              ((scoreDistributionData[0]?.count || 0) /
                                totalCount) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      良好率 (80-89分)
                    </h4>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          totalCount > 0
                            ? ((scoreDistributionData[1]?.count || 0) /
                                totalCount) *
                              100
                            : 0
                        }
                        className="h-2.5"
                      />
                      <span className="text-sm font-medium">
                        {totalCount > 0
                          ? (
                              ((scoreDistributionData[1]?.count || 0) /
                                totalCount) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      中等率 (70-79分)
                    </h4>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          totalCount > 0
                            ? ((scoreDistributionData[2]?.count || 0) /
                                totalCount) *
                              100
                            : 0
                        }
                        className="h-2.5"
                      />
                      <span className="text-sm font-medium">
                        {totalCount > 0
                          ? (
                              ((scoreDistributionData[2]?.count || 0) /
                                totalCount) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      及格率 (60-69分)
                    </h4>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          totalCount > 0
                            ? ((scoreDistributionData[3]?.count || 0) /
                                totalCount) *
                              100
                            : 0
                        }
                        className="h-2.5"
                      />
                      <span className="text-sm font-medium">
                        {totalCount > 0
                          ? (
                              ((scoreDistributionData[3]?.count || 0) /
                                totalCount) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      不及格率 (60分以下)
                    </h4>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={
                          totalCount > 0
                            ? ((scoreDistributionData[4]?.count || 0) /
                                totalCount) *
                              100
                            : 0
                        }
                        className="h-2.5 bg-red-100"
                      />
                      <span className="text-sm font-medium text-red-500">
                        {totalCount > 0
                          ? (
                              ((scoreDistributionData[4]?.count || 0) /
                                totalCount) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="pt-4">
          {classRanking.length > 0 ? (
            <div className="space-y-6">
              {/* 班级排名表 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">
                    班级排名
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">排名</TableHead>
                        <TableHead>班级</TableHead>
                        <TableHead className="text-right">平均分</TableHead>
                        <TableHead className="text-right">最高分</TableHead>
                        <TableHead className="text-right">最低分</TableHead>
                        <TableHead className="text-right">及格率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classRanking.map((classData, index) => (
                        <TableRow
                          key={classData.className || index}
                          className={index < 3 ? "bg-green-50" : undefined}
                        >
                          <TableCell className="text-center font-medium">
                            {index < 3 ? (
                              <Badge
                                variant={index === 0 ? "default" : "outline"}
                              >
                                {index + 1}
                              </Badge>
                            ) : (
                              index + 1
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {classData.className}
                            {index === 0 && (
                              <Badge className="ml-2 bg-green-600">最优</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {classData.averageScore.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {classData.maxScore.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            {classData.minScore.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span
                                className={
                                  classData.passRate < 0.6
                                    ? "text-red-500"
                                    : "text-green-600"
                                }
                              >
                                {(classData.passRate * 100).toFixed(1)}%
                              </span>
                              <div className="w-16">
                                <Progress
                                  value={classData.passRate * 100}
                                  className={`h-1.5 ${classData.passRate < 0.6 ? "bg-red-200" : "bg-green-200"}`}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* 班级详情卡片 */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium">
                      班级详情
                    </CardTitle>
                    <Select
                      value={selectedClass || ""}
                      onValueChange={setSelectedClass}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="选择班级" />
                      </SelectTrigger>
                      <SelectContent>
                        {classRanking.map((classData) => (
                          <SelectItem
                            key={classData.className}
                            value={classData.className}
                          >
                            {classData.className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedClass ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">班级基本情况</h3>
                        <dl className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-xs text-gray-500">学生人数</dt>
                            <dd className="text-lg font-semibold">
                              {classRanking.find(
                                (c) => c.className === selectedClass
                              )?.studentCount || 0}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">班级排名</dt>
                            <dd className="text-lg font-semibold">
                              {classRanking.findIndex(
                                (c) => c.className === selectedClass
                              ) + 1}
                              /{classRanking.length}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">平均分</dt>
                            <dd className="text-lg font-semibold">
                              {classRanking
                                .find((c) => c.className === selectedClass)
                                ?.averageScore.toFixed(1) || 0}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">及格率</dt>
                            <dd className="text-lg font-semibold">
                              {(
                                classRanking.find(
                                  (c) => c.className === selectedClass
                                )?.passRate * 100 || 0
                              ).toFixed(1)}
                              %
                            </dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium mb-4">各科成绩</h3>
                        <div className="space-y-3">
                          {subjectList.map((subject) => {
                            const subjectData =
                              subject === "总分"
                                ? classRanking.find(
                                    (c) => c.className === selectedClass
                                  )
                                : analysisResult?.subjectPerformance?.[subject]
                                    ?.classBreakdown?.[selectedClass];

                            if (!subjectData) return null;

                            return (
                              <div
                                key={subject}
                                className="flex items-center justify-between"
                              >
                                <span className="text-sm">{subject}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">
                                    {subject === "总分"
                                      ? subjectData.averageScore?.toFixed(1)
                                      : subjectData.average?.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      请选择一个班级查看详情
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">暂无班级分析数据</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subjects" className="pt-4">
          <div className="space-y-6">
            {/* 学科选择器 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">
                    学科分析
                  </CardTitle>
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="选择科目" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectList.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {subjectData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">
                        平均分
                      </p>
                      <p className="text-2xl font-bold">
                        {selectedSubject === "总分"
                          ? subjectData.average?.toFixed(1)
                          : subjectData.average?.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">
                        最高分
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedSubject === "总分"
                          ? subjectData.max?.toFixed(1)
                          : subjectData.max?.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">
                        最低分
                      </p>
                      <p className="text-2xl font-bold text-red-500">
                        {selectedSubject === "总分"
                          ? subjectData.min?.toFixed(1)
                          : subjectData.min?.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-500">
                        标准差
                      </p>
                      <p className="text-2xl font-bold">
                        {selectedSubject === "总分"
                          ? subjectData.stdDev?.toFixed(2)
                          : subjectData.stdDev?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    暂无{selectedSubject}学科数据
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 学科班级对比 */}
            {selectedSubject && subjectData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">
                    {selectedSubject}班级对比
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>班级</TableHead>
                          <TableHead className="text-right">平均分</TableHead>
                          <TableHead className="text-right">最高分</TableHead>
                          <TableHead className="text-right">最低分</TableHead>
                          <TableHead className="text-right">
                            对比全校平均
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSubject === "总分"
                          ? // 总分的班级数据来自classPerformance
                            analysisResult?.classPerformance?.map(
                              (classData: any, index: number) => {
                                const diff =
                                  classData.average - overallStats.average;

                                return (
                                  <TableRow key={classData.className || index}>
                                    <TableCell className="font-medium">
                                      {classData.className}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {classData.average.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {classData.max.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {classData.min.toFixed(1)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end">
                                        {diff >= 0 ? (
                                          <ChevronUp className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-red-500" />
                                        )}
                                        <span
                                          className={
                                            diff >= 0
                                              ? "text-green-600"
                                              : "text-red-500"
                                          }
                                        >
                                          {Math.abs(diff).toFixed(1)}
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              }
                            )
                          : // 单科数据来自subjectPerformance
                            Object.entries(
                              subjectData.classBreakdown || {}
                            ).map(([className, data]: [string, any]) => {
                              const diff = data.average - subjectData.average;

                              return (
                                <TableRow key={className}>
                                  <TableCell className="font-medium">
                                    {className}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {data.average.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {data.max.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {data.min.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end">
                                      {diff >= 0 ? (
                                        <ChevronUp className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-red-500" />
                                      )}
                                      <span
                                        className={
                                          diff >= 0
                                            ? "text-green-600"
                                            : "text-red-500"
                                        }
                                      >
                                        {Math.abs(diff).toFixed(1)}
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
