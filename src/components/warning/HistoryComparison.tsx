import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3,
  Users,
  AlertTriangle,
  RefreshCw,
  LineChart,
  PieChart,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { formatNumber } from "@/utils/formatUtils";
import {
  getWarningHistoryComparison,
  getWarningTrendData,
  HistoryPeriod,
  HistoryComparison,
  WarningTrendData,
} from "@/services/warningHistoryService";
import { TrendDataPoint } from "@/components/warning/WarningTrendChart";

interface HistoryComparisonProps {
  onPeriodChange?: (period: HistoryPeriod) => void;
}

// 对比指标卡片组件
const ComparisonCard = ({
  title,
  current,
  previous,
  change,
  icon: Icon,
  unit = "",
  isPercentage = false,
}: {
  title: string;
  current: number;
  previous: number;
  change: number;
  icon: React.ElementType;
  unit?: string;
  isPercentage?: boolean;
}) => {
  const getTrendIcon = () => {
    if (Math.abs(change) < 0.1) return Minus;
    return change > 0 ? ArrowUpRight : ArrowDownRight;
  };

  const getTrendColor = () => {
    if (Math.abs(change) < 0.1) return "text-gray-500";
    if (title.includes("风险") || title.includes("预警")) {
      return change > 0 ? "text-red-500" : "text-green-500";
    }
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card className="overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition-all duration-200 rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-3xl font-bold text-gray-800">
                {formatNumber(current)}
                {unit}
              </p>
              <div className="flex items-center">
                <TrendIcon className={`h-4 w-4 ${getTrendColor()}`} />
                <span className={`text-xs font-medium ml-1 ${getTrendColor()}`}>
                  {change > 0 ? "+" : ""}
                  {change}
                  {isPercentage ? "%" : unit}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              上期: {formatNumber(previous)}
              {unit}
            </p>
          </div>
          <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 趋势图表组件
const TrendChart = ({
  data,
  metric,
  title,
}: {
  data: TrendDataPoint[];
  metric: keyof TrendDataPoint;
  title: string;
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>暂无趋势数据</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => Number(d[metric])));
  const minValue = Math.min(...data.map((d) => Number(d[metric])));
  const range = maxValue - minValue || 1;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-700">{title}</h4>
        <div className="text-sm text-gray-500">
          最高: {formatNumber(maxValue)} | 最低: {formatNumber(minValue)}
        </div>
      </div>

      <div className="relative h-48 bg-gray-50 rounded-lg p-4">
        <svg width="100%" height="100%" className="overflow-visible">
          {/* 网格线 */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <line
              key={percent}
              x1="0"
              y1={`${percent}%`}
              x2="100%"
              y2={`${percent}%`}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* 趋势线 */}
          <polyline
            points={data
              .map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y =
                  100 - ((Number(point[metric]) - minValue) / range) * 100;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#c0ff3f"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 数据点 */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - ((Number(point[metric]) - minValue) / range) * 100;
            return (
              <circle
                key={index}
                cx={`${x}%`}
                cy={`${y}%`}
                r="4"
                fill="#c0ff3f"
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        {/* X轴标签 */}
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {data.map((point, index) => {
            if (
              index % Math.ceil(data.length / 5) === 0 ||
              index === data.length - 1
            ) {
              return <span key={index}>{point.date}</span>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

// 分类变化条形图
const CategoryChangeChart = ({
  changes,
}: {
  changes: { [key: string]: number };
}) => {
  const categories = Object.entries(changes || {}).filter(
    ([_, change]) => Math.abs(change) > 0.1
  );

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        <p>各分类变化较小</p>
      </div>
    );
  }

  const maxChange = Math.max(
    ...categories.map(([_, change]) => Math.abs(change))
  );

  return (
    <div className="space-y-3">
      {categories.map(([category, change]) => {
        const width = Math.abs(change / maxChange) * 100;
        const isIncrease = change > 0;

        return (
          <div key={category} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-gray-700">
                {getCategoryDisplayName(category)}
              </span>
              <span
                className={`font-medium ${isIncrease ? "text-red-500" : "text-green-500"}`}
              >
                {change > 0 ? "+" : ""}
                {change.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${isIncrease ? "bg-red-400" : "bg-green-400"}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HistoryComparison: React.FC<HistoryComparisonProps> = ({
  onPeriodChange,
}) => {
  const [period, setPeriod] = useState<HistoryPeriod>("90d"); // 改为90天以显示现有数据
  const [comparison, setComparison] = useState<HistoryComparison | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [comparisonData, trendsData] = await Promise.all([
        getWarningHistoryComparison(period),
        getWarningTrendData(period),
      ]);

      setComparison(comparisonData);
      // 转换 WarningTrendData 到 TrendDataPoint 格式
      const convertedTrendData = trendsData.map((item) => ({
        date: item.date,
        totalWarnings: item.totalWarnings || 0,
        highSeverity: item.highSeverity || 0,
        mediumSeverity: item.mediumSeverity || 0,
        lowSeverity: item.lowSeverity || 0,
        gradeRelated: item.gradeRelated || 0,
        behaviorRelated: item.behaviorRelated || 0,
        attendanceRelated: item.attendanceRelated || 0,
        progressRate: item.progressRate || 0,
        predictionAccuracy: item.predictionAccuracy || 85,
      }));
      setTrendData(convertedTrendData);
    } catch (error) {
      console.error("获取历史对比数据失败:", error);
      toast.error("获取历史对比数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: HistoryPeriod) => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  const getPeriodDisplayName = (period: HistoryPeriod): string => {
    const map = {
      "7d": "近7天",
      "30d": "近30天",
      "90d": "近90天",
      "180d": "近180天",
      "1y": "近1年",
    };
    return map[period] || "近30天";
  };

  const getTrendBadge = (trend: string) => {
    const trendMap = {
      improving: {
        label: "改善中",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      worsening: {
        label: "恶化中",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      stable: {
        label: "保持稳定",
        className: "bg-gray-100 text-gray-800 border-gray-200",
      },
      increasing: {
        label: "上升",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      decreasing: {
        label: "下降",
        className: "bg-green-100 text-green-800 border-green-200",
      },
      up: {
        label: "上升",
        className: "bg-red-100 text-red-800 border-red-200",
      },
      down: {
        label: "下降",
        className: "bg-green-100 text-green-800 border-green-200",
      },
    };

    const config = trendMap[trend as keyof typeof trendMap] || {
      label: trend,
      className: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-[#c0ff3f]" />
            <p className="text-gray-500 ml-3">正在加载历史对比数据...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparison) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>暂无历史对比数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center">
                <Calendar className="h-5 w-5 text-[#c0ff3f] mr-2" />
                历史对比分析
              </CardTitle>
              <CardDescription>
                对比分析预警数据的历史变化趋势，识别改善或恶化的信号
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={period}
                onValueChange={(value: HistoryPeriod) =>
                  handlePeriodChange(value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">近7天</SelectItem>
                  <SelectItem value="30d">近30天</SelectItem>
                  <SelectItem value="90d">近90天</SelectItem>
                  <SelectItem value="180d">近180天</SelectItem>
                  <SelectItem value="1y">近1年</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={fetchData}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 总体趋势概览 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 text-[#c0ff3f] mr-2" />
            总体趋势概览 ({getPeriodDisplayName(period)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">整体趋势</div>
              <div>
                {getTrendBadge(
                  comparison?.comparison?.trends?.overall || "stable"
                )}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">风险水平</div>
              <div>
                {getTrendBadge(
                  comparison?.comparison?.trends?.riskLevel || "stable"
                )}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">主要变化</div>
              <div className="text-sm font-medium text-gray-700">
                {comparison?.comparison?.trends?.resolution
                  ? getTrendBadge(comparison.comparison.trends.resolution)
                  : "无显著变化"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 对比数据 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ComparisonCard
          title="预警学生数"
          current={comparison.current.studentsAtRisk || 0}
          previous={comparison.previous.studentsAtRisk || 0}
          change={comparison.comparison.studentsAtRiskChange || 0}
          icon={Users}
          unit="人"
          isPercentage={true}
        />
        <ComparisonCard
          title="预警比例"
          current={comparison.current.riskRatio || 0}
          previous={comparison.previous.riskRatio || 0}
          change={comparison.comparison.riskRatioChange || 0}
          icon={BarChart3}
          unit="%"
        />
        <ComparisonCard
          title="高风险学生"
          current={comparison.current.highRiskStudents || 0}
          previous={comparison.previous.highRiskStudents || 0}
          change={comparison.comparison.highRiskStudentsChange || 0}
          icon={AlertTriangle}
          unit="人"
          isPercentage={true}
        />
        <ComparisonCard
          title="活跃预警"
          current={comparison.current.newIssues || 0}
          previous={comparison.previous.newIssues || 0}
          change={
            (((comparison.current.newIssues || 0) -
              (comparison.previous.newIssues || 0)) /
              (comparison.previous.newIssues || 1)) *
            100
          }
          icon={TrendingUp}
          unit="条"
          isPercentage={true}
        />
      </div>

      {/* 详细分析标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full max-w-[400px] bg-gray-100 border border-gray-300 p-1 rounded-lg">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black rounded-md"
          >
            趋势图表
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black rounded-md"
          >
            分类变化
          </TabsTrigger>
          <TabsTrigger
            value="classes"
            className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black rounded-md"
          >
            班级对比
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 text-[#c0ff3f] mr-2" />
                  预警学生数趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trendData}
                  metric="totalWarnings"
                  title="预警总数变化"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 text-[#c0ff3f] mr-2" />
                  预警比例趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trendData}
                  metric="highSeverity"
                  title="高危预警变化"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 text-[#c0ff3f] mr-2" />
                  高风险学生趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trendData}
                  metric="mediumSeverity"
                  title="中危预警变化"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 text-[#c0ff3f] mr-2" />
                  活跃预警趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={trendData}
                  metric="lowSeverity"
                  title="低危预警变化"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 text-[#c0ff3f] mr-2" />
                  分类变化对比
                </CardTitle>
                <CardDescription>各预警分类的变化幅度</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChangeChart
                  changes={comparison.comparison.categoryChanges || {}}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-[#c0ff3f] mr-2" />
                  范围变化对比
                </CardTitle>
                <CardDescription>各应用范围的变化幅度</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChangeChart
                  changes={comparison.comparison.scopeChanges || {}}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 text-[#c0ff3f] mr-2" />
                班级风险对比
              </CardTitle>
              <CardDescription>
                当前期间与上一期间的班级风险对比
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    当前期间 ({comparison.current.period})
                  </h4>
                  <div className="space-y-3">
                    {(comparison.current.classRiskData || []).map(
                      (classData, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-700">
                            {classData.className}
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-800">
                              {classData.atRiskCount}/{classData.studentCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              {classData.riskRatio.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    上一期间 ({comparison.previous.period})
                  </h4>
                  <div className="space-y-3">
                    {(comparison.previous.classRiskData || []).map(
                      (classData, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-700">
                            {classData.className}
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-800">
                              {classData.atRiskCount}/{classData.studentCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              {classData.riskRatio.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// 工具函数
function getCategoryDisplayName(category: string): string {
  const map: { [key: string]: string } = {
    grade: "成绩",
    attendance: "出勤",
    behavior: "行为",
    progress: "进步",
    homework: "作业",
    composite: "综合",
    global: "全局",
    exam: "考试",
    class: "班级",
    student: "学生",
  };
  return map[category] || category;
}

export default HistoryComparison;
