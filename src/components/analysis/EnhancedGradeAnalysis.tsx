import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Download,
  Filter,
  TrendingUp,
  Users,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 导入图表组件
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// 导入UX增强组件
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import {
  TableSkeleton,
  ChartSkeleton,
  ErrorState,
  EmptyState,
} from "@/components/shared/LoadingStates";
import {
  ResponsiveContainer as LayoutContainer,
  ResponsiveGrid,
  MobileCard,
  ResponsiveTable,
  ResponsiveButtonGroup,
} from "@/components/shared/ResponsiveLayout";

// 类型定义
interface GradeData {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  subject: string;
  score: number;
  total_score: number;
  rank_in_class?: number;
  exam_title: string;
  exam_date: string;
}

// 数据获取hooks
const useGradeData = (examId?: string, classFilter?: string) => {
  return useQuery({
    queryKey: ["gradeData", examId, classFilter],
    queryFn: async () => {
      console.log("[调试] 开始查询grade_data...", { examId, classFilter });

      let query = supabase
        .from("grade_data")
        .select("*")
        .order("total_score", { ascending: false });

      if (examId) {
        query = query.eq("exam_id", examId);
      }

      if (classFilter && classFilter !== "__all_classes__") {
        query = query.eq("class_name", classFilter);
      }

      const { data, error } = await query;

      console.log("[调试] 查询结果:", { data, error, count: data?.length });

      if (error) {
        console.error("[调试] 查询错误:", error);
        throw new Error(`数据加载失败: ${error.message}`);
      }

      return data as GradeData[];
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  className?: string;
}> = ({ title, value, icon, trend, className }) => {
  return (
    <MobileCard className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend !== undefined && (
                <Badge
                  variant={trend >= 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {trend >= 0 ? "+" : ""}
                  {trend}%
                </Badge>
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </MobileCard>
  );
};

// 成绩表格组件
const GradeTable: React.FC<{ data: GradeData[]; isLoading: boolean }> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return <TableSkeleton rows={10} columns={6} />;
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="暂无成绩数据"
        message="当前筛选条件下没有找到成绩记录"
        icon={<BookOpen className="w-8 h-8 text-gray-400" />}
      />
    );
  }

  return (
    <ResponsiveTable>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 font-semibold text-gray-900">
                学号
              </th>
              <th className="text-left p-3 font-semibold text-gray-900">
                姓名
              </th>
              <th className="text-left p-3 font-semibold text-gray-900">
                班级
              </th>
              <th className="text-left p-3 font-semibold text-gray-900">
                科目
              </th>
              <th className="text-left p-3 font-semibold text-gray-900">
                分数
              </th>
              <th className="text-left p-3 font-semibold text-gray-900">
                排名
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((grade) => (
              <tr
                key={grade.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="p-3 font-mono text-sm">{grade.student_id}</td>
                <td className="p-3 font-medium">{grade.name}</td>
                <td className="p-3">
                  <Badge variant="outline">{grade.class_name}</Badge>
                </td>
                <td className="p-3">{grade.subject}</td>
                <td className="p-3">
                  <span
                    className={`font-semibold ${
                      grade.score >= 90
                        ? "text-green-600"
                        : grade.score >= 80
                          ? "text-blue-600"
                          : grade.score >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                    }`}
                  >
                    {grade.score}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">
                    /{grade.total_score}
                  </span>
                </td>
                <td className="p-3">
                  {grade.rank_in_class && (
                    <Badge variant="secondary">第{grade.rank_in_class}名</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ResponsiveTable>
  );
};

// 主组件
const EnhancedGradeAnalysis: React.FC = () => {
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>("__all_classes__");
  const { toast } = useToast();

  // 数据查询
  const {
    data: gradeData,
    isLoading: gradeLoading,
    error: gradeError,
    refetch: refetchGrades,
  } = useGradeData(selectedExam, classFilter);

  // 计算成绩分布数据
  const gradeDistributionData = React.useMemo(() => {
    if (!gradeData || gradeData.length === 0) return [];

    const ranges = [
      { range: "90-100", min: 90, max: 100, count: 0 },
      { range: "80-89", min: 80, max: 89, count: 0 },
      { range: "70-79", min: 70, max: 79, count: 0 },
      { range: "60-69", min: 60, max: 69, count: 0 },
      { range: "0-59", min: 0, max: 59, count: 0 },
    ];

    gradeData.forEach((grade) => {
      const range = ranges.find(
        (r) => grade.score >= r.min && grade.score <= r.max
      );
      if (range) range.count++;
    });

    return ranges;
  }, [gradeData]);

  // 计算班级对比数据
  const classComparisonData = React.useMemo(() => {
    if (!gradeData || gradeData.length === 0) return [];

    const classStats = new Map();

    gradeData.forEach((grade) => {
      const className = grade.class_name;
      if (!classStats.has(className)) {
        classStats.set(className, {
          className,
          totalScore: 0,
          count: 0,
          averageScore: 0,
        });
      }

      const stats = classStats.get(className);
      stats.totalScore += grade.score;
      stats.count++;
      stats.averageScore =
        Math.round((stats.totalScore / stats.count) * 10) / 10;
    });

    return Array.from(classStats.values());
  }, [gradeData]);

  // 计算统计数据
  const stats = React.useMemo(() => {
    if (!gradeData || gradeData.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        passRate: 0,
      };
    }

    const scores = gradeData.map((g) => g.score);
    const passCount = scores.filter((score) => score >= 60).length;

    return {
      totalStudents: gradeData.length,
      averageScore:
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) /
        10,
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      passRate: Math.round((passCount / scores.length) * 100),
    };
  }, [gradeData]);

  // 导出数据
  const handleExport = async () => {
    if (!gradeData || gradeData.length === 0) {
      toast({
        title: "导出失败",
        description: "没有可导出的数据",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "导出成功",
        description: `已导出 ${gradeData.length} 条记录`,
      });
    } catch (error) {
      toast({
        title: "导出失败",
        description: "导出过程中发生错误",
        variant: "destructive",
      });
    }
  };

  // 错误处理
  if (gradeError) {
    return (
      <ErrorState
        title="数据加载失败"
        message={gradeError?.message || "未知错误"}
        onRetry={() => {
          refetchGrades();
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <LayoutContainer maxWidth="full" className="space-y-6">
        {/* 页面标题和操作 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              成绩分析
            </h1>
            <p className="text-gray-600 mt-1">查看和分析学生成绩数据</p>
          </div>

          <ResponsiveButtonGroup>
            <Button
              variant="outline"
              onClick={() => refetchGrades()}
              disabled={gradeLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${gradeLoading ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
            <Button
              onClick={handleExport}
              disabled={!gradeData || gradeData.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
          </ResponsiveButtonGroup>
        </div>

        {/* 筛选器 */}
        <MobileCard title="筛选条件" collapsible defaultCollapsed={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择考试
              </label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择考试" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exam1">907九下月考</SelectItem>
                  <SelectItem value="exam2">期中考试</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                筛选班级
              </label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全部班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all_classes__">全部班级</SelectItem>
                  <SelectItem value="初三7班">初三7班</SelectItem>
                  <SelectItem value="初三8班">初三8班</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                应用筛选
              </Button>
            </div>
          </div>
        </MobileCard>

        {/* 统计卡片 */}
        {selectedExam && (
          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} gap="md">
            <StatCard
              title="学生总数"
              value={stats.totalStudents}
              icon={<Users className="w-6 h-6 text-blue-600" />}
            />
            <StatCard
              title="平均分"
              value={stats.averageScore}
              icon={<TrendingUp className="w-6 h-6 text-green-600" />}
            />
            <StatCard
              title="最高分"
              value={stats.maxScore}
              icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
            />
            <StatCard
              title="及格率"
              value={`${stats.passRate}%`}
              icon={<BookOpen className="w-6 h-6 text-orange-600" />}
            />
          </ResponsiveGrid>
        )}

        {/* 图表区域 */}
        {selectedExam && (
          <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="lg">
            <MobileCard title="成绩分布" description="查看分数段分布情况">
              {gradeLoading ? (
                <ChartSkeleton />
              ) : (
                <div className="h-64 sm:h-72 lg:h-80 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={gradeDistributionData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="range"
                        stroke="#374151"
                        fontSize={12}
                        fontWeight="500"
                      />
                      <YAxis stroke="#374151" fontSize={12} fontWeight="500" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "2px solid #000000",
                          borderRadius: "8px",
                          boxShadow: "2px 2px 0px 0px #000",
                          color: "#000000",
                          fontWeight: "500",
                        }}
                        labelStyle={{ color: "#000000", fontWeight: "bold" }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#B9FF66"
                        stroke="#000000"
                        strokeWidth={2}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </MobileCard>

            <MobileCard title="班级对比" description="各班级成绩对比">
              {gradeLoading ? (
                <ChartSkeleton />
              ) : (
                <div className="h-64 sm:h-72 lg:h-80 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classComparisonData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="className"
                        stroke="#374151"
                        fontSize={12}
                        fontWeight="500"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#374151" fontSize={12} fontWeight="500" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#FFFFFF",
                          border: "2px solid #000000",
                          borderRadius: "8px",
                          boxShadow: "2px 2px 0px 0px #000",
                          color: "#000000",
                          fontWeight: "500",
                        }}
                        labelStyle={{ color: "#000000", fontWeight: "bold" }}
                        formatter={(value: number) => [`${value}分`, "平均分"]}
                      />
                      <Bar
                        dataKey="averageScore"
                        fill="#B9FF66"
                        stroke="#000000"
                        strokeWidth={2}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </MobileCard>
          </ResponsiveGrid>
        )}

        {/* 成绩表格 */}
        {selectedExam && (
          <MobileCard
            title="详细成绩"
            description={`共 ${stats.totalStudents} 条记录`}
            collapsible
          >
            <GradeTable data={gradeData || []} isLoading={gradeLoading} />
          </MobileCard>
        )}

        {/* 空状态 */}
        {!selectedExam && (
          <EmptyState
            title="请选择考试"
            message="选择一个考试来查看成绩分析"
            icon={<BookOpen className="w-8 h-8 text-gray-400" />}
          />
        )}
      </LayoutContainer>
    </ErrorBoundary>
  );
};

export default EnhancedGradeAnalysis;
