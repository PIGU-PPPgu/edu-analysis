/**
 * 高级成绩分析仪表板
 * 面向数据分析师和教学主管的深度分析工具
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
  Minus,
  Brain,
  Zap,
  Eye,
  Activity,
  LineChart,
  PieChart,
  BarChart,
  Radar,
  Layers
} from 'lucide-react';

import { useModernGradeAnalysis } from '@/contexts/ModernGradeAnalysisContext';
import ModernGradeFilters from '@/components/analysis/filters/ModernGradeFilters';
import FloatingChatAssistant from '@/components/ai/FloatingChatAssistant';

// 导入高级分析组件
import { PredictiveAnalysis } from '@/components/analysis/advanced/PredictiveAnalysis';
import AnomalyDetectionAnalysis from '@/components/analysis/advanced/AnomalyDetectionAnalysis';
import EnhancedSubjectCorrelationMatrix from '@/components/analysis/advanced/EnhancedSubjectCorrelationMatrix';
import StudentTrendAnalysis from '@/components/analysis/advanced/StudentTrendAnalysis';
import MultiDimensionalRankingSystem from '@/components/analysis/advanced/MultiDimensionalRankingSystem';
import CorrelationAnalysisDashboard from '@/components/analysis/dashboard/CorrelationAnalysisDashboard';
import ChartGallery from '@/components/analysis/charts/ChartGallery';

// Positivus 4色设计系统
const POSITIVUS_COLORS = {
  primary: '#B9FF66',    // 绿色
  secondary: '#191A23',  // 黑色
  accent: '#6B7280',     // 灰色
  white: '#FFFFFF',      // 白色
}

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

// 高级统计卡片
const AdvancedStatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'green',
  className
}) => {
  const colorClasses = {
    green: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]',
    black: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#191A23]',
    gray: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]',
    white: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#F59E0B]'
  };

  const iconBgClasses = {
    green: 'bg-[#B9FF66]',
    black: 'bg-[#191A23]',
    gray: 'bg-[#6B7280]',
    white: 'bg-[#F59E0B]'
  };

  const iconColorClasses = {
    green: 'text-black',
    black: 'text-white',
    gray: 'text-white',
    white: 'text-white'
  };

  return (
    <Card className={cn(
      'transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:shadow-[9px_9px_0px_0px_currentColor]',
      colorClasses[color], 
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-3 rounded-xl border-2 border-black',
                iconBgClasses[color]
              )}>
                <Icon className={cn('w-6 h-6', iconColorClasses[color])} />
              </div>
              <div>
                <p className="text-sm font-black text-[#191A23] uppercase tracking-wider">{title}</p>
                <h3 className="text-3xl font-black text-[#191A23] leading-none">{value}</h3>
              </div>
            </div>
            
            {trend && trendValue && (
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-black text-sm font-bold",
                trend === 'up' && "bg-[#B9FF66] text-black",
                trend === 'down' && "bg-[#EF4444] text-white",
                trend === 'neutral' && "bg-[#6B7280] text-white"
              )}>
                {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                {trend === 'neutral' && <Minus className="w-4 h-4" />}
                <span className="uppercase tracking-wide">{trendValue}</span>
              </div>
            )}

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

const AdvancedAnalyticsDashboard: React.FC = () => {
  const {
    allGradeData,
    wideGradeData,
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
    refreshData
  } = useModernGradeAnalysis();

  const [activeTab, setActiveTab] = useState('machine-learning');
  const [showSidebar, setShowSidebar] = useState(true);

  // 高级统计计算
  const advancedStats = useMemo(() => {
    if (!statistics || !filteredGradeData.length) return null;

    // 计算更复杂的统计指标
    const scores = filteredGradeData.map(record => record.score).filter(Boolean);
    const variance = scores.reduce((acc, score) => acc + Math.pow(score - statistics.avgScore, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 偏度计算 (数据分布的对称性)
    const skewness = scores.reduce((acc, score) => acc + Math.pow((score - statistics.avgScore) / standardDeviation, 3), 0) / scores.length;
    
    // 峰度计算 (数据分布的尖锐程度)
    const kurtosis = scores.reduce((acc, score) => acc + Math.pow((score - statistics.avgScore) / standardDeviation, 4), 0) / scores.length - 3;

    return {
      standardDeviation: standardDeviation.toFixed(2),
      variance: variance.toFixed(2),
      skewness: skewness.toFixed(3),
      kurtosis: kurtosis.toFixed(3),
      coefficientOfVariation: ((standardDeviation / statistics.avgScore) * 100).toFixed(2)
    };
  }, [statistics, filteredGradeData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#B9FF66] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#191A23] font-bold text-lg">正在加载高级分析引擎...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto border-2 border-black shadow-[6px_6px_0px_0px_#EF4444]">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-bold">{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            className="ml-4 border-2 border-black bg-[#EF4444] text-white font-bold hover:bg-[#DC2626]"
          >
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex bg-white min-h-screen">
      {/* 侧边筛选栏 */}
      {showSidebar && (
        <>
          {/* 移动端背景遮罩 */}
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
          
          {/* 筛选栏 - 移动端为覆盖层，桌面端为侧边栏 */}
          <div className="fixed lg:static inset-y-0 left-0 z-50 w-80 lg:w-96 bg-[#F8F8F8] border-r-2 border-black p-6 overflow-y-auto transform lg:transform-none transition-transform lg:transition-none">
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
              onClose={() => setShowSidebar(false)}
              compact={false}
            />
          </div>
        </>
      )}

      {/* 主内容区域 */}
      <div className="flex-1 space-y-10 p-8">
        {/* 高级分析标题 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-5xl font-black text-[#191A23] leading-tight">
              高级分析
              <span className="inline-block ml-3 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
                ADVANCED
              </span>
            </h1>
            <p className="text-lg text-[#6B7280] font-medium max-w-2xl">
              基于机器学习和深度统计的教育数据科学分析平台
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowSidebar(!showSidebar)}
              className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">{showSidebar ? '隐藏筛选栏' : '显示筛选栏'}</span>
              <span className="sm:hidden">筛选</span>
            </Button>
            
            <Button
              onClick={refreshData}
              className="flex items-center gap-2 border-2 border-black bg-[#B9FF66] hover:bg-[#B9FF66] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              重新分析
            </Button>
          </div>
        </div>

        {/* 高级统计指标卡片 */}
        {advancedStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <AdvancedStatCard
              title="标准差"
              value={advancedStats.standardDeviation}
              subtitle="数据离散程度的衡量"
              icon={Activity}
              color="green"
            />
            
            <AdvancedStatCard
              title="变异系数"
              value={`${advancedStats.coefficientOfVariation}%`}
              subtitle="相对变异程度指标"
              icon={BarChart}
              color="black"
            />
            
            <AdvancedStatCard
              title="分布偏度"
              value={advancedStats.skewness}
              subtitle={`数据分布${parseFloat(advancedStats.skewness) > 0 ? '右偏' : parseFloat(advancedStats.skewness) < 0 ? '左偏' : '对称'}`}
              icon={LineChart}
              color="gray"
              trend={parseFloat(advancedStats.skewness) > 0.5 ? 'up' : parseFloat(advancedStats.skewness) < -0.5 ? 'down' : 'neutral'}
              trendValue={Math.abs(parseFloat(advancedStats.skewness)) > 0.5 ? '显著偏斜' : '接近对称'}
            />
            
            <AdvancedStatCard
              title="分布峰度"
              value={advancedStats.kurtosis}
              subtitle={`尾部${parseFloat(advancedStats.kurtosis) > 0 ? '较重' : '较轻'}`}
              icon={PieChart}
              color="white"
              trend={parseFloat(advancedStats.kurtosis) > 0 ? 'up' : 'down'}
              trendValue={Math.abs(parseFloat(advancedStats.kurtosis)) > 1 ? '显著' : '一般'}
            />
          </div>
        )}

        {/* 高级分析功能模块 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="overflow-x-auto">
            <TabsList className="grid w-fit grid-cols-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
              <TabsTrigger 
                value="machine-learning" 
                className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-3"
              >
                <Brain className="w-5 h-5" />
                <span>机器学习</span>
              </TabsTrigger>
              <TabsTrigger 
                value="predictive" 
                className="flex items-center gap-2 data-[state=active]:bg-[#F59E0B] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-3"
              >
                <TrendingUp className="w-5 h-5" />
                <span>预测建模</span>
              </TabsTrigger>
              <TabsTrigger 
                value="anomaly" 
                className="flex items-center gap-2 data-[state=active]:bg-[#EF4444] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-3"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>异常检测</span>
              </TabsTrigger>
              <TabsTrigger 
                value="correlation" 
                className="flex items-center gap-2 data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-3"
              >
                <Layers className="w-5 h-5" />
                <span>关联分析</span>
              </TabsTrigger>
              <TabsTrigger 
                value="multidimensional" 
                className="flex items-center gap-2 data-[state=active]:bg-[#06B6D4] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-3"
              >
                <Radar className="w-5 h-5" />
                <span>多维度分析</span>
              </TabsTrigger>
              <TabsTrigger 
                value="visualization" 
                className="flex items-center gap-2 data-[state=active]:bg-[#191A23] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black uppercase tracking-wide px-4 py-3"
              >
                <Eye className="w-5 h-5" />
                <span>高级可视化</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 机器学习分析 */}
          <TabsContent value="machine-learning" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <EnhancedSubjectCorrelationMatrix
                gradeData={wideGradeData || []}
                title="科目相关性矩阵 (皮尔逊相关系数)"
                className="w-full"
                showHeatMap={true}
                filterSignificance="all"
              />
              
              <StudentTrendAnalysis 
                gradeData={wideGradeData || []}
                className="w-full"
              />
            </div>
            
            <MultiDimensionalRankingSystem 
              gradeData={wideGradeData || []}
              className="w-full"
            />
          </TabsContent>

          {/* 预测建模 */}
          <TabsContent value="predictive" className="space-y-6">
            <PredictiveAnalysis 
              selectedStudents={[]}
              timeframe="semester"
            />
          </TabsContent>

          {/* 异常检测 */}
          <TabsContent value="anomaly" className="space-y-6">
            <AnomalyDetectionAnalysis 
              gradeData={filteredGradeData}
              className="border-2 border-black shadow-[6px_6px_0px_0px_#EF4444]"
            />
          </TabsContent>

          {/* 关联分析 */}
          <TabsContent value="correlation" className="space-y-6">
            <CorrelationAnalysisDashboard className="w-full" />
          </TabsContent>

          {/* 多维度分析 */}
          <TabsContent value="multidimensional" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <MultiDimensionalRankingSystem 
                gradeData={wideGradeData || []}
                className="w-full"
              />
              
              <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#06B6D4]">
                <CardHeader className="bg-[#06B6D4] border-b-2 border-black">
                  <CardTitle className="text-white font-black flex items-center gap-2">
                    <Radar className="w-5 h-5" />
                    学习能力雷达图 (开发中)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center h-64 text-[#6B7280]">
                    <div className="text-center">
                      <Zap className="w-12 h-12 mx-auto mb-4" />
                      <p className="font-bold">多维度能力评估系统</p>
                      <p className="text-sm mt-2">即将上线</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 高级可视化 */}
          <TabsContent value="visualization" className="space-y-6">
            <ChartGallery 
              gradeData={filteredGradeData}
              className=""
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 浮动AI聊天助手 */}
      <FloatingChatAssistant defaultMinimized={true} />
    </div>
  );
};

export default AdvancedAnalyticsDashboard;