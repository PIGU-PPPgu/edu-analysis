/**
 * 日常分析仪表板
 * 适合教师日常教学的快速查看界面
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  BookOpen,
  Target,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Download,
  RefreshCw,
  Filter,
  Search,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
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
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

import { useModernGradeAnalysis } from '@/contexts/ModernGradeAnalysisContext';
import ModernGradeFilters from '@/components/analysis/filters/ModernGradeFilters';
import SimpleGradeDataTable from '@/components/analysis/SimpleGradeDataTable';
import StudentDetailModal from '@/components/analysis/modals/StudentDetailModal';

// 导入高级分析组件
import ClassComparisonChart from '@/components/analysis/comparison/ClassComparisonChart';
import ClassBoxPlotChart from '@/components/analysis/comparison/ClassBoxPlotChart';
import { PredictiveAnalysis } from '@/components/analysis/advanced/PredictiveAnalysis';
import AnomalyDetectionAnalysis from '@/components/analysis/advanced/AnomalyDetectionAnalysis';
import SubjectCorrelationAnalysis from '@/components/analysis/advanced/SubjectCorrelationAnalysis';
import EnhancedSubjectCorrelationMatrix from '@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix';
import CorrelationAnalysisDashboard from '@/components/analysis/dashboard/CorrelationAnalysisDashboard';
import StatisticsOverview from '@/components/analysis/statistics/StatisticsOverview';
import DebugDataViewer from '@/components/analysis/DebugDataViewer';
import DataExport from '@/components/ui/data-export';
import ChartExportButton from '@/components/ui/ChartExportButton';
import FloatingChatAssistant from '@/components/ai/FloatingChatAssistant';

// 4色设计系统
const POSITIVUS_COLORS = {
  primary: '#B9FF66',    // 绿色
  secondary: '#191A23',  // 黑色
  accent: '#6B7280',     // 灰色
  white: '#FFFFFF',      // 白色
}

const CHART_COLORS = {
  primary: '#B9FF66',    // 绿色
  secondary: '#191A23',  // 黑色
  accent: '#6B7280',     // 灰色
  background: '#FFFFFF'  // 白色
};

const GRADE_COLORS = ['#B9FF66', '#191A23', '#6B7280', '#FFFFFF'];

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'green' | 'black' | 'gray' | 'white';
  className?: string;
}

// Positivus风格统计卡片
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'green',
  className
}) => {
  // 4色设计系统的卡片样式
  const positivusColorClasses = {
    green: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]',
    black: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#191A23]',
    gray: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]',
    white: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]'
  };

  const iconBgClasses = {
    green: 'bg-[#B9FF66]',
    black: 'bg-[#191A23]',
    gray: 'bg-[#6B7280]',
    white: 'bg-white'
  };

  const iconColorClasses = {
    green: 'text-black',
    black: 'text-white',
    gray: 'text-white',
    white: 'text-black'
  };

  return (
    <Card className={cn(
      'transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_currentColor]',
      positivusColorClasses[color], 
      className
    )}>
      <CardContent className="p-6 h-full">
        <div className="flex items-center justify-between h-full min-h-[120px]">
          <div className="space-y-3 flex-1">
            {/* Positivus风格标题 */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-full border-2 border-black',
                iconBgClasses[color]
              )}>
                <Icon className={cn('w-5 h-5', iconColorClasses[color])} />
              </div>
              <p className="text-base font-bold text-[#191A23] uppercase tracking-wide">{title}</p>
            </div>

            {/* 数值显示 */}
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-[#191A23] leading-none">{value}</h3>
              
              {/* 趋势指示器 */}
              {trend && trendValue && (
                <div className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-sm font-bold",
                  trend === 'up' && "bg-[#B9FF66] text-black",
                  trend === 'down' && "bg-[#6B7280] text-white",
                  trend === 'neutral' && "bg-white text-black"
                )}>
                  {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                  {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                  {trend === 'neutral' && <Minus className="w-4 h-4" />}
                  <span className="uppercase tracking-wide">{trendValue}</span>
                </div>
              )}
            </div>

            {/* 副标题 */}
            {subtitle && (
              <p className="text-sm text-[#6B7280] font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const DailyAnalysisDashboard: React.FC = () => {
  const {
    filteredGradeData,
    examList,
    statistics,
    filter,
    setFilter,
    loading,
    error,
    availableSubjects,
    availableClasses,
    availableGrades,
    availableExamTypes,
    refreshData,
    getStudentGrades
  } = useModernGradeAnalysis();

  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(true);
  
  // 学生详情模态框状态
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [studentDetailOpen, setStudentDetailOpen] = useState(false);

  // 处理学生点击事件
  const handleStudentClick = (studentId: string, studentName: string) => {
    setSelectedStudent({ id: studentId, name: studentName });
    setStudentDetailOpen(true);
  };

  // 图表数据处理
  const chartData = useMemo(() => {
    if (!statistics) return { scoreDistribution: [], subjectPerformance: [], classComparison: [] };

    // 分数分布数据
    const scoreRanges = [
      { range: '90-100', min: 90, max: 100, color: CHART_COLORS.primary },
      { range: '80-89', min: 80, max: 89, color: CHART_COLORS.secondary },
      { range: '70-79', min: 70, max: 79, color: CHART_COLORS.accent },
      { range: '60-69', min: 60, max: 69, color: CHART_COLORS.purple },
      { range: '0-59', min: 0, max: 59, color: CHART_COLORS.danger }
    ];

    const scoreDistribution = scoreRanges.map(range => {
      const count = filteredGradeData.filter(record => {
        const score = record.score || record.total_score;
        return score !== null && score !== undefined && score >= range.min && score <= range.max;
      }).length;

      return {
        range: range.range,
        count,
        percentage: statistics.totalRecords > 0 ? (count / statistics.totalRecords * 100) : 0,
        color: range.color
      };
    });

    // 科目表现数据
    const subjectPerformance = statistics.subjectStats.map(stat => ({
      subject: stat.subject,
      avgScore: Math.round(stat.avgScore * 10) / 10,
      passRate: Math.round(stat.passRate * 10) / 10,
      count: stat.count
    }));

    // 班级对比数据
    const classComparison = statistics.classStats.map(stat => ({
      className: stat.className,
      avgScore: Math.round(stat.avgScore * 10) / 10,
      passRate: Math.round(stat.passRate * 10) / 10,
      studentCount: stat.studentCount
    }));

    return { scoreDistribution, subjectPerformance, classComparison };
  }, [statistics, filteredGradeData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-[#B9FF66] mx-auto" />
          <p className="text-[#6B7280]">正在加载成绩数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            className="ml-4"
          >
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-white">
      {/* Positivus风格页面标题和操作栏 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-[#191A23] leading-tight">
            日常分析
            <span className="inline-block ml-3 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
              DAILY
            </span>
          </h1>
          <p className="text-lg text-[#6B7280] font-medium max-w-2xl">
            教师日常教学的快速成绩查看，关注当前班级状态
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 border-2 border-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all",
              showFilters 
                ? "bg-[#B9FF66] hover:bg-[#A8E055] text-black" 
                : "bg-white hover:bg-white text-black"
            )}
          >
            <Filter className="w-4 h-4" />
            {showFilters ? '隐藏筛选器' : '显示筛选器'}
            {Object.keys(filter).length > 0 && (
              <Badge className="ml-1 bg-[#191A23] text-white border-2 border-black">
                {Object.keys(filter).length}
              </Badge>
            )}
          </Button>
          
          <Button
            onClick={refreshData}
            className="flex items-center gap-2 border-2 border-black bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </Button>
          
          <Button className="flex items-center gap-2 border-2 border-black bg-[#6B7280] hover:bg-[#6B7280] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all">
            <Download className="w-4 h-4" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      {showFilters && (
        <ModernGradeFilters
          filter={filter}
          onFilterChange={setFilter}
          availableExams={examList}
          availableSubjects={availableSubjects}
          availableClasses={availableClasses}
          availableGrades={availableGrades}
          availableExamTypes={availableExamTypes}
          totalCount={filteredGradeData.length}
          filteredCount={filteredGradeData.length}
        />
      )}

      {/* 统计卡片 */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="学生总数"
            value={statistics.totalStudents}
            subtitle="参与分析的学生数量"
            icon={Users}
            color="black"
          />
          
          <StatCard
            title="平均分"
            value={`${Math.round(statistics.avgScore * 10) / 10}分`}
            subtitle={`最高: ${statistics.maxScore}分 | 最低: ${statistics.minScore}分`}
            icon={BarChart3}
            color="green"
            trend={statistics.avgScore >= 80 ? 'up' : statistics.avgScore >= 60 ? 'neutral' : 'down'}
            trendValue={statistics.avgScore >= 80 ? '优秀' : statistics.avgScore >= 60 ? '良好' : '待提升'}
          />
          
          <StatCard
            title="及格率"
            value={`${Math.round((statistics.totalScoreStats?.passRate || 0) * 10) / 10}%`}
            subtitle="分数 ≥ 60分的比例"
            icon={Target}
            color="gray"
            trend={(statistics.totalScoreStats?.passRate || 0) >= 80 ? 'up' : (statistics.totalScoreStats?.passRate || 0) >= 60 ? 'neutral' : 'down'}
            trendValue={(statistics.totalScoreStats?.passRate || 0) >= 80 ? '良好' : '需改进'}
          />
          
          <StatCard
            title="优秀率"
            value={`${Math.round((statistics.totalScoreStats?.excellentRate || 0) * 10) / 10}%`}
            subtitle="分数 ≥ 90分的比例"
            icon={Award}
            color="white"
            trend={(statistics.totalScoreStats?.excellentRate || 0) >= 20 ? 'up' : (statistics.totalScoreStats?.excellentRate || 0) >= 10 ? 'neutral' : 'down'}
            trendValue={(statistics.totalScoreStats?.excellentRate || 0) >= 20 ? '优秀' : '有潜力'}
          />
        </div>
      )}

      {/*  Positivus风格主要分析内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="overflow-x-auto">
          <TabsList className="grid w-fit grid-cols-5 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">总览</span>
            </TabsTrigger>
            <TabsTrigger 
              value="statistics" 
              className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <Target className="w-4 h-4" />
              <span className="hidden md:inline">统计</span>
            </TabsTrigger>
            <TabsTrigger 
              value="subjects" 
              className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline">科目</span>
            </TabsTrigger>
            <TabsTrigger 
              value="classes" 
              className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <Users className="w-4 h-4" />
              <span className="hidden md:inline">班级</span>
            </TabsTrigger>
            <TabsTrigger 
              value="details" 
              className="flex items-center gap-2 data-[state=active]:bg-[#191A23] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden md:inline">数据</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 总览标签页 */}
        <TabsContent value="overview" className="space-y-6">
          {/* 调试面板 - 临时添加 */}
          <DebugDataViewer />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 分数分布图 */}
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  分数分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 shadow-lg rounded-lg border">
                              <p className="font-medium">{label}分</p>
                              <p className="text-[#B9FF66]">
                                {payload[0].value}人 ({Math.round(Number(payload[0].payload.percentage) * 10) / 10}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 等级分布饼图 */}
            {statistics?.gradeDistribution && statistics.gradeDistribution.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#B9FF66]" />
                    等级分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statistics.gradeDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="count"
                        label={({ grade, percentage }) => `${grade}: ${Math.round(percentage * 10) / 10}%`}
                      >
                        {statistics.gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GRADE_COLORS[index % GRADE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 shadow-lg rounded-lg border">
                                <p className="font-medium">{payload[0].payload.grade}等级</p>
                                <p className="text-[#B9FF66]">
                                  {payload[0].value}人 ({Math.round(payload[0].payload.percentage * 10) / 10}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* 科目分析标签页 */}
        <TabsContent value="subjects" className="space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                科目表现分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.subjectPerformance} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="subject" 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 shadow-lg rounded-lg border">
                            <p className="font-medium">{label}</p>
                            <p className="text-blue-600">平均分: {payload[0].value}分</p>
                            <p className="text-green-600">及格率: {payload[0].payload.passRate}%</p>
                            <p className="text-gray-600">参与人数: {payload[0].payload.count}人</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="avgScore" 
                    fill={CHART_COLORS.secondary}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 班级对比标签页 */}
        <TabsContent value="classes" className="space-y-6">
          <ClassComparisonChart 
            data={filteredGradeData}
            filterState={{
              selectedClasses: availableClasses,
              selectedSubjects: availableSubjects
            }}
            className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]"
          />
        </TabsContent>

        {/* 统计分析标签页 */}
        <TabsContent value="statistics" className="space-y-6">
          <StatisticsOverview 
            className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]"
          />
        </TabsContent>


        {/* 详细数据标签页 */}
        <TabsContent value="details" className="space-y-6">
          <div className="space-y-6">
            {/* 数据导出功能 */}
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-[#191A23]">详细成绩数据</h3>
              <div className="flex gap-3">
                <DataExport 
                  data={filteredGradeData}
                  filename="成绩数据"
                  className="border-2 border-black bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23]"
                />
                <ChartExportButton 
                  chartId="grade-analysis-charts"
                  filename="成绩分析图表"
                  className="border-2 border-black bg-[#6B7280] hover:bg-[#6B7280] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23]"
                />
              </div>
            </div>
            
            <SimpleGradeDataTable 
              className="border-2 border-black shadow-[6px_6px_0px_0px_#191A23]"
              pageSize={20}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* 学生详情模态框 */}
      {selectedStudent && (
        <StudentDetailModal
          open={studentDetailOpen}
          onOpenChange={setStudentDetailOpen}
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          studentGrades={getStudentGrades(selectedStudent.id)}
          allGrades={filteredGradeData}
        />
      )}

      {/* 浮动AI聊天助手 */}
      <FloatingChatAssistant defaultMinimized={true} />
    </div>
  );
};

export default DailyAnalysisDashboard;