import React, { useMemo, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  AlertTriangle,
  BookOpen,
  LineChart,
  BarChart2,
  BarChart4,
  PieChart,
  RefreshCcw,
  ArrowLeft,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ClassData } from "@/types/database";
import { toast } from "sonner";

// 更新接口定义，添加错误状态和刷新函数
interface SubjectAnalysisTabProps {
  selectedClass: {
    id: string;
    name: string;
    grade?: string;
  };
  data: {
    performance: Record<string, any[]>;
    correlation: Record<string, number>;
    trends: Record<string, any[]>;
    knowledgePoints: Record<string, any[]>;
  } | null;
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onBack?: () => void;
}

const SubjectAnalysisTab: React.FC<SubjectAnalysisTabProps> = ({
  selectedClass,
  data,
  isLoading,
  error,
  onRefresh,
  onBack,
}) => {
  const [analysisTab, setAnalysisTab] = useState("performance");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [lastSelectedSubject, setLastSelectedSubject] = useState<string>("");

  // 从数据中提取可用的学科列表
  const subjects = useMemo(() => {
    if (!data) return [];

    // 从performance数据中提取学科
    const subjectNames = Object.keys(data.performance || {});

    return subjectNames.map((name) => {
      const subjectData = data.performance[name]?.[0];
      return {
        id: name,
        name: name,
        averageScore: subjectData?.averageScore,
        passRate: subjectData?.passRate,
      };
    });
  }, [data]);

  // 自动选择第一个学科
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].id);
      setLastSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  // 当切换学科时保持当前的分析标签页状态
  const handleSubjectChange = (newSubject: string) => {
    setLastSelectedSubject(selectedSubject);
    setSelectedSubject(newSubject);
  };

  const currentSubjectName = useMemo(() => {
    return subjects.find((s) => s.id === selectedSubject)?.name || "未选择学科";
  }, [subjects, selectedSubject]);

  const hasData = useMemo(() => {
    return !!(data && data.performance && data.knowledgePoints && data.trends);
  }, [data]);

  // 找出该学科的强势和弱势知识点
  const subjectInsights = useMemo(() => {
    if (!data?.knowledgePoints || !selectedSubject) {
      return { strengths: [], weaknesses: [] };
    }

    const pointsData = data.knowledgePoints[selectedSubject] || [];

    // 按掌握度排序
    const sortedPoints = [...pointsData].sort(
      (a, b) => (b.masteryRate || 0) - (a.masteryRate || 0)
    );

    return {
      strengths: sortedPoints.slice(0, 3),
      weaknesses: sortedPoints.slice(-3).reverse(),
    };
  }, [data, selectedSubject]);

  // 如果有错误信息，显示错误状态
  if (error) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
        <p className="text-lg font-semibold">获取数据失败</p>
        <p className="text-sm max-w-md mx-auto mb-4">
          {error || "加载学科分析数据时出现错误，请稍后再试。"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="mx-auto"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  // 改进加载状态，使用骨架屏
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-[180px]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-2 w-full mb-4" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-2 w-full mb-4" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
        <p className="text-lg font-semibold">暂无学科分析数据</p>
        <p className="text-sm max-w-md mx-auto">
          未能获取到该班级的学科分析数据，请确保已完成数据录入或联系管理员。
        </p>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
        <p className="text-lg font-semibold">暂无可用学科数据</p>
        <p className="text-sm max-w-md mx-auto">
          该班级目前没有任何学科的数据记录，请先添加学科成绩数据。
        </p>
      </div>
    );
  }

  if (!selectedSubject) {
    return (
      <div className="text-center py-10 text-gray-500 dark:text-gray-400">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
        <p className="text-lg font-semibold">请选择一个学科进行分析</p>
        <p className="text-sm max-w-md mx-auto">
          从下拉菜单中选择一个学科，查看详细的学科分析数据，包括成绩分布、知识点掌握情况和学习趋势。
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">
                {selectedClass.name} 学科分析
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedClass.grade || ""} - 学科详细数据与指标分析
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-10"
              >
                <RefreshCcw className="h-4 w-4 mr-1" />
                刷新
              </Button>
            )}
            <Select value={selectedSubject} onValueChange={handleSubjectChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择学科" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs
          value={analysisTab}
          onValueChange={setAnalysisTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg shadow-inner">
            <TabsTrigger
              value="performance"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400"
            >
              <BarChart2 className="mr-2 h-4 w-4" />
              成绩分析
            </TabsTrigger>
            <TabsTrigger
              value="knowledge"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400"
            >
              <BarChart4 className="mr-2 h-4 w-4" />
              知识点分布
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400"
            >
              <LineChart className="mr-2 h-4 w-4" />
              趋势分析
            </TabsTrigger>
            <TabsTrigger
              value="correlations"
              className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-lime-600 dark:data-[state=active]:text-lime-400"
            >
              <PieChart className="mr-2 h-4 w-4" />
              学科相关性
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    {currentSubjectName}成绩分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.performance[selectedSubject]?.[0] ? (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">
                              班级平均分
                            </div>
                            <div className="text-3xl font-bold text-blue-600">
                              {data.performance[
                                selectedSubject
                              ][0].averageScore?.toFixed(1) || "N/A"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">
                              及格率
                            </div>
                            <div className="text-3xl font-bold text-green-600">
                              {data.performance[
                                selectedSubject
                              ][0].passRate?.toFixed(1) || "N/A"}
                              %
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">
                              优秀率
                            </div>
                            <div className="text-3xl font-bold text-purple-600">
                              {data.performance[
                                selectedSubject
                              ][0].excellentRate?.toFixed(1) || "N/A"}
                              %
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">
                              标准差
                            </div>
                            <div className="text-3xl font-bold text-orange-600">
                              {data.performance[
                                selectedSubject
                              ][0].scoreDeviation?.toFixed(2) || "N/A"}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">暂无该科目的成绩数据</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    关键指标
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.performance[selectedSubject]?.[0] ? (
                    <>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">平均分</span>
                          <span className="text-sm font-semibold">
                            {data?.performance[
                              selectedSubject
                            ][0].averageScore?.toFixed(1) || "N/A"}
                          </span>
                        </div>
                        <Progress
                          value={
                            data?.performance[selectedSubject][0].averageScore
                          }
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">及格率</span>
                          <span className="text-sm font-semibold">
                            {data?.performance[
                              selectedSubject
                            ][0].passRate?.toFixed(1)}
                            %
                          </span>
                        </div>
                        <Progress
                          value={data?.performance[selectedSubject][0].passRate}
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">优秀率</span>
                          <span className="text-sm font-semibold">
                            {data?.performance[
                              selectedSubject
                            ][0].excellentRate?.toFixed(1)}
                            %
                          </span>
                        </div>
                        <Progress
                          value={
                            data?.performance[selectedSubject][0].excellentRate
                          }
                          className="h-2"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">成绩标准差</span>
                          <span className="text-sm font-semibold">
                            {data?.performance[
                              selectedSubject
                            ][0].scoreDeviation?.toFixed(2) || "N/A"}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(
                            data?.performance[selectedSubject][0]
                              .scoreDeviation * 5 || 0,
                            100
                          )}
                          className="h-2"
                        />
                      </div>

                      <Separator className="my-3" />

                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          <div className="text-xs text-gray-500">最高分</div>
                          <div className="font-bold">
                            {data?.performance[selectedSubject][0].maxScore ||
                              "N/A"}
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                          <div className="text-xs text-gray-500">最低分</div>
                          <div className="font-bold">
                            {data?.performance[selectedSubject][0].minScore ||
                              "N/A"}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                      <AlertTriangle className="mx-auto h-6 w-6 mb-2" />
                      <p className="text-sm">暂无数据</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    {currentSubjectName}知识点掌握热力图
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data?.knowledgePoints[selectedSubject] &&
                    data.knowledgePoints[selectedSubject].length > 0 ? (
                      <>
                        <div className="grid grid-cols-4 gap-2">
                          {data.knowledgePoints[selectedSubject].map(
                            (point: any, index: number) => {
                              const masteryRate = point.masteryRate || 0;
                              let color = "bg-red-200";
                              let level = "待加强";

                              if (masteryRate >= 85) {
                                color = "bg-green-200";
                                level = "掌握";
                              } else if (masteryRate >= 70) {
                                color = "bg-blue-200";
                                level = "熟练";
                              } else if (masteryRate >= 60) {
                                color = "bg-yellow-200";
                                level = "及格";
                              }

                              return (
                                <div
                                  key={index}
                                  className={`p-3 rounded-lg ${color} text-center`}
                                >
                                  <div
                                    className="text-xs font-medium truncate"
                                    title={point.name}
                                  >
                                    {point.name}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {level}
                                  </div>
                                  <div className="text-xs font-bold mt-1">
                                    {masteryRate.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>

                        <div className="mt-4 space-y-2">
                          <h4 className="font-medium text-sm">
                            知识点掌握度统计
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-green-200 rounded"></div>
                                <span className="text-sm">掌握 (≥85%)</span>
                              </div>
                              <span className="text-sm font-medium">
                                {
                                  data.knowledgePoints[selectedSubject].filter(
                                    (p: any) => p.masteryRate >= 85
                                  ).length
                                }
                                个
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-blue-200 rounded"></div>
                                <span className="text-sm">熟练 (70-85%)</span>
                              </div>
                              <span className="text-sm font-medium">
                                {
                                  data.knowledgePoints[selectedSubject].filter(
                                    (p: any) =>
                                      p.masteryRate >= 70 && p.masteryRate < 85
                                  ).length
                                }
                                个
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-yellow-200 rounded"></div>
                                <span className="text-sm">及格 (60-70%)</span>
                              </div>
                              <span className="text-sm font-medium">
                                {
                                  data.knowledgePoints[selectedSubject].filter(
                                    (p: any) =>
                                      p.masteryRate >= 60 && p.masteryRate < 70
                                  ).length
                                }
                                个
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-red-200 rounded"></div>
                                <span className="text-sm">
                                  待加强 (&lt;60%)
                                </span>
                              </div>
                              <span className="text-sm font-medium">
                                {
                                  data.knowledgePoints[selectedSubject].filter(
                                    (p: any) => p.masteryRate < 60
                                  ).length
                                }
                                个
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">暂无知识点数据</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    知识点掌握情况
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-600 dark:text-green-400 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-2"></span>
                      优势知识点
                    </h4>
                    {subjectInsights.strengths.length > 0 ? (
                      <ul className="space-y-1">
                        {subjectInsights.strengths.map((point, idx) => (
                          <li
                            key={idx}
                            className="text-sm flex justify-between"
                          >
                            <span className="truncate">{point.name}</span>
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                            >
                              {point.masteryRate.toFixed(1)}%
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">暂无数据</p>
                    )}
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400 flex items-center">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                      薄弱知识点
                    </h4>
                    {subjectInsights.weaknesses.length > 0 ? (
                      <ul className="space-y-1">
                        {subjectInsights.weaknesses.map((point, idx) => (
                          <li
                            key={idx}
                            className="text-sm flex justify-between"
                          >
                            <span className="truncate">{point.name}</span>
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300"
                            >
                              {point.masteryRate.toFixed(1)}%
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">暂无数据</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {currentSubjectName}知识点详细列表
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.knowledgePoints[selectedSubject] &&
                  data.knowledgePoints[selectedSubject].length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {data.knowledgePoints[selectedSubject].map(
                        (point: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">
                                {point.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {point.studentCount || "N/A"}人参与
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-full rounded-full ${
                                    point.masteryRate >= 85
                                      ? "bg-green-500"
                                      : point.masteryRate >= 70
                                        ? "bg-blue-500"
                                        : point.masteryRate >= 60
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                  }`}
                                  style={{ width: `${point.masteryRate}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">
                                {point.masteryRate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无知识点详细数据</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {currentSubjectName}学科成绩趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.trends[selectedSubject] &&
                  data.trends[selectedSubject].length > 0 ? (
                    <>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-3">
                          近期考试趋势
                        </h4>
                        <div className="space-y-3">
                          {data.trends[selectedSubject].map(
                            (item: any, index: number) => {
                              const prevScore =
                                index > 0
                                  ? data.trends[selectedSubject][index - 1]
                                      .averageScore
                                  : item.averageScore;
                              const trend =
                                item.averageScore > prevScore
                                  ? "up"
                                  : item.averageScore < prevScore
                                    ? "down"
                                    : "stable";

                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between border-b pb-2"
                                >
                                  <div>
                                    <div className="text-sm font-medium">
                                      {item.examTitle || `考试 ${index + 1}`}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {item.examDate || "N/A"}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">
                                      {item.averageScore?.toFixed(1) || "N/A"}
                                    </span>
                                    <span
                                      className={`text-xs ${
                                        trend === "up"
                                          ? "text-green-600"
                                          : trend === "down"
                                            ? "text-red-600"
                                            : "text-gray-600"
                                      }`}
                                    >
                                      {trend === "up"
                                        ? "↗"
                                        : trend === "down"
                                          ? "↘"
                                          : "→"}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>

                      {data.trends[selectedSubject].length >= 2 && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium text-sm mb-3">
                            学科发展趋势
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>平均分变化</span>
                              <span
                                className={`font-medium ${
                                  data.trends[selectedSubject][
                                    data.trends[selectedSubject].length - 1
                                  ].averageScore -
                                    data.trends[selectedSubject][0]
                                      .averageScore >=
                                  0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {data.trends[selectedSubject][
                                  data.trends[selectedSubject].length - 1
                                ].averageScore -
                                  data.trends[selectedSubject][0]
                                    .averageScore >=
                                0
                                  ? "+"
                                  : ""}
                                {(
                                  data.trends[selectedSubject][
                                    data.trends[selectedSubject].length - 1
                                  ].averageScore -
                                  data.trends[selectedSubject][0].averageScore
                                ).toFixed(1)}
                                分
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无趋势数据</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correlations" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  与{currentSubjectName}相关的学科
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.correlation &&
                  Object.keys(data.correlation).length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-3">
                          科目间相关性
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(data.correlation)
                            .filter(([subject]) => subject !== selectedSubject)
                            .map(
                              (
                                [subject, correlation]: [string, any],
                                index: number
                              ) => {
                                const corrValue =
                                  typeof correlation === "number"
                                    ? correlation
                                    : 0;
                                let level = "弱相关";
                                if (corrValue >= 0.7) level = "强相关";
                                else if (corrValue >= 0.5) level = "中等相关";

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between"
                                  >
                                    <span className="text-sm">与{subject}</span>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-24 bg-gray-200 rounded-full h-2">
                                        <div
                                          className={`h-full rounded-full ${
                                            corrValue >= 0.7
                                              ? "bg-green-500"
                                              : corrValue >= 0.5
                                                ? "bg-blue-500"
                                                : "bg-yellow-500"
                                          }`}
                                          style={{
                                            width: `${Math.abs(corrValue) * 100}%`,
                                          }}
                                        ></div>
                                      </div>
                                      <span className="text-xs text-gray-600 w-16">
                                        {level}
                                      </span>
                                      <span className="text-xs font-medium w-12 text-right">
                                        {corrValue.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">暂无相关性数据</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>相关性解释</AlertTitle>
              <AlertDescription className="text-sm text-gray-600 dark:text-gray-300">
                相关性系数值介于-1到1之间。接近1表示强正相关（一门学科成绩高，另一门也高），接近-1表示强负相关（一门学科成绩高，另一门往往低），接近0表示几乎无相关性。
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SubjectAnalysisTab;
