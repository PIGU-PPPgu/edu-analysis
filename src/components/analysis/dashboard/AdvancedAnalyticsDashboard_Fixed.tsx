/**
 * 高级成绩分析仪表板 - 修复版本
 * 移除了有问题的依赖，保留核心功能
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  Target,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Brain,
  Activity,
  LineChart,
  PieChart,
  BarChart,
  Radar,
  Layers,
  Info,
  User,
  UserCog,
  Sparkles,
} from "lucide-react";

import { useAppGrade } from "@/contexts/unified/UnifiedAppContext";

// 导入核心分析组件
import PredictiveAnalysis from "@/components/analysis/advanced/PredictiveAnalysis";
import AnomalyDetectionAnalysis from "@/components/analysis/advanced/AnomalyDetectionAnalysis";
import EnhancedSubjectCorrelationMatrix from "@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix";
import StudentTrendAnalysis from "@/components/analysis/advanced/StudentTrendAnalysis";
import MultiDimensionalRankingSystem from "@/components/analysis/advanced/MultiDimensionalRankingSystem";
import ChartGallery from "@/components/analysis/charts/ChartGallery";
import LearningBehaviorAnalysis from "@/components/analysis/advanced/LearningBehaviorAnalysis";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  color?: "green" | "red" | "blue" | "gray";
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = "blue",
}) => {
  const colorClasses = {
    green: "border-green-200 bg-green-50 text-green-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    gray: "border-gray-200 bg-gray-50 text-gray-900",
  };

  const trendIcon =
    trend === "up" ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : trend === "down" ? (
      <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
    ) : null;

  return (
    <Card className={`${colorClasses[color]} border-l-4`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-70">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-60 mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center space-x-2">
            {trendIcon}
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 模拟数据生成器
const generateMockData = () => {
  return {
    classAverages: {
      current: 78.5,
      previous: 76.2,
      trend: "up" as const,
    },
    riskStudents: {
      high: 3,
      medium: 7,
      total: 10,
    },
    subjectPerformance: [
      { subject: "数学", average: 82, trend: "up" },
      { subject: "语文", average: 79, trend: "neutral" },
      { subject: "英语", average: 75, trend: "down" },
    ],
  };
};

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedComplexity, setSelectedComplexity] = useState<
    "simple" | "advanced"
  >("simple");

  // 使用统一上下文
  const {
    gradeData,
    filteredData,
    isLoading: contextLoading,
    error: contextError,
  } = useAppGrade();

  // 确保数据安全性
  const safeGradeData = useMemo(() => {
    return Array.isArray(filteredData) ? filteredData : [];
  }, [filteredData]);

  // 生成模拟数据
  const mockData = useMemo(() => generateMockData(), []);

  const handleRefresh = async () => {
    setIsLoading(true);
    // 模拟数据刷新
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  if (contextError) {
    return (
      <div className="p-6">
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            数据加载失败: {contextError}。请刷新页面重试。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页头 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              高级成绩分析
            </h1>
            <p className="text-gray-600">深度数据洞察，助力教学决策优化</p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelectedComplexity(
                  selectedComplexity === "simple" ? "advanced" : "simple"
                )
              }
            >
              <Settings className="w-4 h-4 mr-2" />
              {selectedComplexity === "simple" ? "简化模式" : "高级模式"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新数据
            </Button>
          </div>
        </div>
      </div>

      {/* 概览统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="班级平均分"
          value={mockData.classAverages.current}
          subtitle={`较上次提升 ${(mockData.classAverages.current - mockData.classAverages.previous).toFixed(1)} 分`}
          trend={mockData.classAverages.trend}
          icon={<Target className="w-6 h-6" />}
          color="green"
        />

        <StatCard
          title="高风险学生"
          value={mockData.riskStudents.high}
          subtitle={`共 ${mockData.riskStudents.total} 名学生需要关注`}
          icon={<AlertCircle className="w-6 h-6" />}
          color="red"
        />

        <StatCard
          title="数据记录"
          value={safeGradeData.length}
          subtitle="本学期成绩记录"
          icon={<BarChart className="w-6 h-6" />}
          color="blue"
        />

        <StatCard
          title="分析维度"
          value="12+"
          subtitle="多维度深度分析"
          icon={<Brain className="w-6 h-6" />}
          color="gray"
        />
      </div>

      {/* 主要分析区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-2" />
            概览
          </TabsTrigger>
          <TabsTrigger value="trends">
            <LineChart className="w-4 h-4 mr-2" />
            趋势
          </TabsTrigger>
          <TabsTrigger value="correlations">
            <Radar className="w-4 h-4 mr-2" />
            相关性
          </TabsTrigger>
          <TabsTrigger value="predictions">
            <Sparkles className="w-4 h-4 mr-2" />
            预测
          </TabsTrigger>
          <TabsTrigger value="behavior">
            <User className="w-4 h-4 mr-2" />
            行为
          </TabsTrigger>
          <TabsTrigger value="charts">
            <PieChart className="w-4 h-4 mr-2" />
            图表
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="w-5 h-5 mr-2" />
                  多维度排名系统
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MultiDimensionalRankingSystem gradeData={safeGradeData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  异常检测分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnomalyDetectionAnalysis gradeData={safeGradeData} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                学生成绩趋势分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StudentTrendAnalysis gradeData={safeGradeData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Radar className="w-5 h-5 mr-2" />
                科目相关性矩阵
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedSubjectCorrelationMatrix gradeData={safeGradeData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                AI预测分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PredictiveAnalysis gradeData={safeGradeData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCog className="w-5 h-5 mr-2" />
                学习行为分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LearningBehaviorAnalysis gradeData={safeGradeData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="w-5 h-5 mr-2" />
                图表库
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartGallery gradeData={safeGradeData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 底部信息 */}
      <div className="mt-8 text-center">
        <Badge variant="outline" className="text-xs">
          <Info className="w-3 h-3 mr-1" />
          高级分析 - 数据驱动的教学决策支持
        </Badge>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;
