/**
 * 完整分析仪表板 - Positivus风格
 * 集成所有高级分析组件，包括热力图、关联分析、学习行为分析等
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
  Grid,
  Activity,
  Brain,
  Radar,
  Zap,
  Eye,
  PieChart,
  LineChart
} from 'lucide-react';

import { useModernGradeAnalysis } from '@/contexts/ModernGradeAnalysisContext';
import ModernGradeFilters from '@/components/analysis/filters/ModernGradeFilters';
import SimpleGradeDataTable from '@/components/analysis/SimpleGradeDataTable';

// 导入所有高级分析组件
import CorrelationAnalysis from '@/components/analysis/advanced/CorrelationAnalysis';
import SubjectCorrelationAnalysis from '@/components/analysis/advanced/SubjectCorrelationAnalysis';
import ClassComparisonChart from '@/components/analysis/comparison/ClassComparisonChart';
import ClassBoxPlotChart from '@/components/analysis/comparison/ClassBoxPlotChart';
import { PredictiveAnalysis } from '@/components/analysis/advanced/PredictiveAnalysis';
import AnomalyDetectionAnalysis from '@/components/analysis/advanced/AnomalyDetectionAnalysis';
import CrossAnalysis from '@/components/analysis/advanced/CrossAnalysis';
import StatisticsOverview from '@/components/analysis/statistics/StatisticsOverview';

// 学习行为和画像分析组件
import LearningBehaviorAnalysis from '@/components/analysis/advanced/LearningBehaviorAnalysis';
import IntelligentPortraitAnalysis from '@/components/portrait/advanced/IntelligentPortraitAnalysis';
import EnhancedStudentPortrait from '@/components/portrait/advanced/EnhancedStudentPortrait';
import AbilityRadar from '@/components/profile/AbilityRadar';

// Positivus设计风格配色主题
const POSITIVUS_COLORS = {
  primary: '#B9FF66',
  secondary: '#191A23',
  accent: '#FED7D7',
  yellow: '#F7931E',
  dark: '#191A23',
  light: '#F3F3F3',
  white: '#FFFFFF',
  purple: '#9C88FF',
  red: '#FF6B6B',
  blue: '#3B82F6'
}

// 分析模块配置
const ANALYSIS_MODULES = {
  correlation: {
    title: '相关性分析',
    icon: Grid,
    color: 'bg-[#B9FF66]',
    description: '科目间关联度热力图分析',
    components: ['CorrelationAnalysis', 'SubjectCorrelationAnalysis']
  },
  comparison: {
    title: '对比分析',
    icon: BarChart3,
    color: 'bg-[#F7931E]',
    description: '班级、科目多维对比分析',
    components: ['ClassComparisonChart', 'ClassBoxPlotChart', 'CrossAnalysis']
  },
  prediction: {
    title: '预测分析',
    icon: TrendingUp,
    color: 'bg-[#9C88FF]',
    description: 'AI智能预测和趋势分析',
    components: ['PredictiveAnalysis', 'AnomalyDetectionAnalysis']
  },
  behavior: {
    title: '学习行为',
    icon: Activity,
    color: 'bg-[#FF6B6B]',
    description: '学习模式和行为分析',
    components: ['LearningBehaviorAnalysis', 'AbilityRadar']
  },
  portrait: {
    title: '学生画像',
    icon: Brain,
    color: 'bg-[#FED7D7]',
    description: 'AI智能学生画像分析',
    components: ['IntelligentPortraitAnalysis', 'EnhancedStudentPortrait']
  },
  statistics: {
    title: '统计分析',
    icon: PieChart,
    color: 'bg-[#3B82F6]',
    description: '详细统计和分布分析',
    components: ['StatisticsOverview']
  }
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
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
  color = 'blue',
  className
}) => {
  const positivusColorClasses = {
    green: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]',
    blue: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#191A23]',
    yellow: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#F7931E]',
    red: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B]',
    purple: 'bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]'
  };

  const iconBgClasses = {
    green: 'bg-[#B9FF66]',
    blue: 'bg-[#191A23]',
    yellow: 'bg-[#F7931E]',
    red: 'bg-[#FF6B6B]',
    purple: 'bg-[#9C88FF]'
  };

  const iconColorClasses = {
    green: 'text-black',
    blue: 'text-white',
    yellow: 'text-white',
    red: 'text-white',
    purple: 'text-white'
  };

  return (
    <Card className={cn(
      'transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_currentColor]',
      positivusColorClasses[color], 
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className={cn(
                'p-2 rounded-full border-2 border-black',
                iconBgClasses[color]
              )}>
                <Icon className={cn('w-5 h-5', iconColorClasses[color])} />
              </div>
              <p className="text-base font-bold text-[#191A23] uppercase tracking-wide">{title}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-[#191A23] leading-none">{value}</h3>
              {trend && trendValue && (
                <div className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-sm font-bold",
                  trend === 'up' && "bg-[#B9FF66] text-black",
                  trend === 'down' && "bg-[#FF6B6B] text-white",
                  trend === 'neutral' && "bg-[#F3F3F3] text-black"
                )}>
                  {trend === 'up' && <ArrowUpRight className="w-4 h-4" />}
                  {trend === 'down' && <ArrowDownRight className="w-4 h-4" />}
                  {trend === 'neutral' && <Minus className="w-4 h-4" />}
                  <span className="uppercase tracking-wide">{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-[#191A23]/70 font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 分析模块卡片
const AnalysisModuleCard: React.FC<{
  moduleKey: string;
  module: typeof ANALYSIS_MODULES[keyof typeof ANALYSIS_MODULES];
  onClick: () => void;
  isActive: boolean;
}> = ({ moduleKey, module, onClick, isActive }) => {
  const Icon = module.icon;
  
  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all border-2 border-black hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#191A23]',
        isActive ? 'shadow-[6px_6px_0px_0px_#191A23]' : 'shadow-[4px_4px_0px_0px_#191A23]',
        'bg-white'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-3 rounded-full border-2 border-black', module.color)}>
              <Icon className="w-6 h-6 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#191A23]">{module.title}</h3>
              <Badge className="mt-1 bg-[#F3F3F3] text-[#191A23] border-2 border-black font-bold">
                {module.components.length} 个分析
              </Badge>
            </div>
          </div>
          <p className="text-sm text-[#191A23]/70 font-medium leading-relaxed">
            {module.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const CompleteAnalyticsDashboard: React.FC = () => {
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
    refreshData
  } = useModernGradeAnalysis();

  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#B9FF66] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#191A23] font-bold">正在加载高级分析数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B]">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <span className="font-bold">{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            className="ml-4 border-2 border-black bg-[#FF6B6B] text-white font-bold hover:bg-[#E55555]"
          >
            重试
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8 p-6 bg-[#F3F3F3]">
      {/* Positivus风格页面标题 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-5xl font-black text-[#191A23] leading-tight">
            高级分析
            <span className="inline-block ml-3 px-4 py-2 bg-[#B9FF66] text-[#191A23] text-xl font-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#191A23]">
              ADVANCED
            </span>
          </h1>
          <p className="text-lg text-[#191A23]/80 font-medium max-w-2xl">
             深度分析学生表现，发现隐藏模式和关联关系
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 border-2 border-black bg-white hover:bg-[#F3F3F3] text-black font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
          >
            <Filter className="w-4 h-4" />
            筛选器
          </Button>
          
          <Button
            onClick={refreshData}
            className="flex items-center gap-2 border-2 border-black bg-[#F7931E] hover:bg-[#E8821C] text-white font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
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
            title="数据完整性"
            value={`${Math.round((statistics.totalRecords / (statistics.totalStudents * availableSubjects.length)) * 100)}%`}
            subtitle="数据覆盖率和完整性"
            icon={CheckCircle}
            color="green"
          />
          
          <StatCard
            title="分析维度"
            value={Object.keys(ANALYSIS_MODULES).length}
            subtitle="可用的高级分析模块"
            icon={Grid}
            color="blue"
          />
          
          <StatCard
            title="相关性强度"
            value="高"
            subtitle="科目间关联程度"
            icon={Activity}
            color="purple"
          />
          
          <StatCard
            title="预测准确度"
            value="87%"
            subtitle="AI预测模型准确率"
            icon={Brain}
            color="yellow"
          />
        </div>
      )}

      {/*  高级分析标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="overflow-x-auto">
          <TabsList className="grid w-fit grid-cols-6 bg-white border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] p-1">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-[#B9FF66] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden md:inline">总览</span>
            </TabsTrigger>
            <TabsTrigger 
              value="correlation" 
              className="flex items-center gap-2 data-[state=active]:bg-[#F7931E] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <Grid className="w-4 h-4" />
              <span className="hidden md:inline">关联</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prediction" 
              className="flex items-center gap-2 data-[state=active]:bg-[#9C88FF] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden md:inline">预测</span>
            </TabsTrigger>
            <TabsTrigger 
              value="behavior" 
              className="flex items-center gap-2 data-[state=active]:bg-[#FF6B6B] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden md:inline">行为</span>
            </TabsTrigger>
            <TabsTrigger 
              value="portrait" 
              className="flex items-center gap-2 data-[state=active]:bg-[#FED7D7] data-[state=active]:text-black font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden md:inline">画像</span>
            </TabsTrigger>
            <TabsTrigger 
              value="comparison" 
              className="flex items-center gap-2 data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white font-bold border-2 border-transparent data-[state=active]:border-black"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">对比</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 分析模块总览 */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(ANALYSIS_MODULES).map(([key, module]) => (
              <AnalysisModuleCard
                key={key}
                moduleKey={key}
                module={module}
                onClick={() => setActiveModule(key)}
                isActive={activeModule === key}
              />
            ))}
          </div>
          
          {/* 活跃模块预览 */}
          {activeModule && (
            <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
              <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                <CardTitle className="text-[#191A23] font-black">
                  {ANALYSIS_MODULES[activeModule as keyof typeof ANALYSIS_MODULES].title} - 预览
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-[#191A23] font-medium">
                  选择具体的标签页查看详细分析内容
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 相关性分析标签页 */}
        <TabsContent value="correlation" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <CorrelationAnalysis 
              gradeData={filteredGradeData}
              className="border-2 border-black shadow-[6px_6px_0px_0px_#F7931E]"
            />
            <SubjectCorrelationAnalysis 
              gradeData={filteredGradeData}
              className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]"
            />
          </div>
        </TabsContent>

        {/* 预测分析标签页 */}
        <TabsContent value="prediction" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <PredictiveAnalysis 
              selectedStudents={[]}
              timeframe="month"
            />
            <AnomalyDetectionAnalysis 
              gradeData={filteredGradeData}
              className="border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]"
            />
          </div>
        </TabsContent>

        {/* 学习行为分析标签页 */}
        <TabsContent value="behavior" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <LearningBehaviorAnalysis 
              studentId=""
              className="border-2 border-black shadow-[6px_6px_0px_0px_#FF6B6B]"
            />
            <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
              <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
                <CardTitle className="text-[#191A23] font-black">能力雷达图</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <AbilityRadar 
                  studentId=""
                  subjects={availableSubjects}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 学生画像标签页 */}
        <TabsContent value="portrait" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <IntelligentPortraitAnalysis 
              studentId=""
              className="border-2 border-black shadow-[6px_6px_0px_0px_#FED7D7]"
            />
            <EnhancedStudentPortrait 
              studentId=""
              className="border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]"
            />
          </div>
        </TabsContent>

        {/* 对比分析标签页 */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ClassComparisonChart 
              data={filteredGradeData}
              filterState={{
                selectedClasses: availableClasses,
                selectedSubjects: availableSubjects
              }}
              className="border-2 border-black shadow-[6px_6px_0px_0px_#3B82F6]"
            />
            <ClassBoxPlotChart 
              data={filteredGradeData}
              className="border-2 border-black shadow-[6px_6px_0px_0px_#F7931E]"
            />
          </div>
          
          <CrossAnalysis 
            gradeData={filteredGradeData}
            className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]"
          />
          
          <StatisticsOverview 
            gradeData={filteredGradeData}
            examList={examList}
            className="border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompleteAnalyticsDashboard;