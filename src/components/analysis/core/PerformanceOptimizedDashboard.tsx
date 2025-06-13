import React, { useMemo, memo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Award, 
  Target, 
  BookOpen,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';

// ============================================================================
// 类型定义
// ============================================================================

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
  exam_title?: string;
  exam_date?: string;
}

interface ScoreStats {
  totalStudents: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  passRate: number;
  excellentRate: number;
  standardDeviation: number;
  scoreDistribution: ScoreRange[];
}

interface ScoreRange {
  range: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  minScore: number;
  maxScore: number;
}

interface PerformanceOptimizedDashboardProps {
  gradeData: GradeRecord[];
  title?: string;
  loading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
}

// ============================================================================
// 常量配置
// ============================================================================

const SCORE_RANGES = [
  { min: 90, max: 100, label: '优秀', color: '#10B981' },
  { min: 80, max: 89, label: '良好', color: '#3B82F6' },
  { min: 70, max: 79, label: '中等', color: '#F59E0B' },
  { min: 60, max: 69, label: '及格', color: '#F97316' },
  { min: 0, max: 59, label: '不及格', color: '#EF4444' }
] as const;

// ============================================================================
// 优化的计算函数 - 使用 useMemo 和缓存
// ============================================================================

const calculateOptimizedStats = (gradeData: GradeRecord[]): ScoreStats => {
  if (!gradeData || gradeData.length === 0) {
    return {
      totalStudents: 0,
      averageScore: 0,
      maxScore: 0,
      minScore: 0,
      passRate: 0,
      excellentRate: 0,
      standardDeviation: 0,
      scoreDistribution: SCORE_RANGES.map(range => ({
        range: `${range.min}-${range.max}`,
        label: range.label,
        count: 0,
        percentage: 0,
        color: range.color,
        minScore: range.min,
        maxScore: range.max
      }))
    };
  }

  // 一次遍历完成所有计算，提高性能
  const validScores: number[] = [];
  const studentSet = new Set<string>();
  
  gradeData.forEach(record => {
    if (record.score && !isNaN(Number(record.score))) {
      validScores.push(Number(record.score));
    }
    if (record.student_id) {
      studentSet.add(record.student_id);
    }
  });

  if (validScores.length === 0) {
    return {
      totalStudents: studentSet.size,
      averageScore: 0,
      maxScore: 0,
      minScore: 0,
      passRate: 0,
      excellentRate: 0,
      standardDeviation: 0,
      scoreDistribution: SCORE_RANGES.map(range => ({
        range: `${range.min}-${range.max}`,
        label: range.label,
        count: 0,
        percentage: 0,
        color: range.color,
        minScore: range.min,
        maxScore: range.max
      }))
    };
  }

  // 基础统计
  const totalRecords = validScores.length;
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  const averageScore = sum / totalRecords;
  const maxScore = Math.max(...validScores);
  const minScore = Math.min(...validScores);
  
  // 计算比率
  const passCount = validScores.filter(score => score >= 60).length;
  const excellentCount = validScores.filter(score => score >= 90).length;
  const passRate = (passCount / totalRecords) * 100;
  const excellentRate = (excellentCount / totalRecords) * 100;
  
  // 计算标准差
  const variance = validScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / totalRecords;
  const standardDeviation = Math.sqrt(variance);

  // 计算分数段分布
  const scoreDistribution = SCORE_RANGES.map(range => {
    const count = validScores.filter(score => score >= range.min && score <= range.max).length;
    const percentage = (count / totalRecords) * 100;
    
    return {
      range: `${range.min}-${range.max}`,
      label: range.label,
      count,
      percentage,
      color: range.color,
      minScore: range.min,
      maxScore: range.max
    };
  });

  return {
    totalStudents: studentSet.size,
    averageScore,
    maxScore,
    minScore,
    passRate,
    excellentRate,
    standardDeviation,
    scoreDistribution
  };
};

// ============================================================================
// 优化的子组件 - 使用 memo 防止重新渲染
// ============================================================================

const StatisticCard = memo<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: number;
}>(({ title, value, icon, color, subtitle, trend }) => (
  <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color} mb-1`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className={`flex items-center mt-1 text-xs ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              <TrendingUp className={`w-3 h-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color.replace('text-', 'bg-').replace('-600', '-100')} ${color.replace('text-', 'text-')}`}>
          {icon}
        </div>
      </div>
    </CardContent>
    {/* 渐变背景装饰 */}
    <div className={`absolute inset-0 bg-gradient-to-br ${color.replace('text-', 'from-').replace('-600', '-50')} to-transparent opacity-5 pointer-events-none`} />
  </Card>
));

const OptimizedScoreChart = memo<{
  data: ScoreRange[];
  chartType: 'bar' | 'pie';
  height?: number;
}>(({ data, chartType, height = 300 }) => {
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 shadow-xl rounded-lg border border-gray-200 backdrop-blur-sm">
          <p className="font-semibold text-lg text-gray-900">{data.label}</p>
          <p className="text-blue-600 font-medium">人数: {data.count}</p>
          <p className="text-gray-600">占比: {data.percentage.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">分数段: {data.minScore}-{data.maxScore}</p>
        </div>
      );
    }
    return null;
  }, []);

  if (chartType === 'pie') {
    const filteredData = data.filter(item => item.count > 0);
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            outerRadius={Math.min(height * 0.35, 120)}
            fill="#8884d8"
            dataKey="count"
            label={({ label, percentage }) => `${label} ${percentage.toFixed(1)}%`}
            labelLine={false}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="label" 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6B7280' }}
          label={{ value: '人数', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="count" 
          radius={[6, 6, 0, 0]}
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

const QuickActionButtons = memo<{
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
}>(({ onRefresh, onExport, isLoading }) => (
  <div className="flex gap-2">
    {onRefresh && (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        刷新
      </Button>
    )}
    {onExport && (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onExport}
        className="flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        导出
      </Button>
    )}
  </div>
));

const LoadingDashboard = memo(() => (
  <div className="space-y-6">
    {/* 统计卡片骨架 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* 图表骨架 */}
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-80 w-full" />
      </CardContent>
    </Card>
  </div>
));

// ============================================================================
// 主组件
// ============================================================================

const PerformanceOptimizedDashboard: React.FC<PerformanceOptimizedDashboardProps> = ({
  gradeData,
  title = "成绩数据看板",
  loading = false,
  onRefresh,
  onExport,
  className = ""
}) => {
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // 使用 useMemo 优化统计计算，只有在 gradeData 变化时才重新计算
  const stats = useMemo(() => calculateOptimizedStats(gradeData), [gradeData]);

  // 使用 useCallback 优化事件处理函数
  const handleChartTypeChange = useCallback((type: 'bar' | 'pie') => {
    setChartType(type);
  }, []);

  if (loading) {
    return <LoadingDashboard />;
  }

  if (stats.totalStudents === 0) {
    return (
      <Card className={`shadow-sm ${className}`}>
        <CardContent className="p-12 text-center">
          <BookOpen className="h-16 w-16 mx-auto mb-6 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无成绩数据</h3>
          <p className="text-gray-500">请先导入学生成绩数据进行分析</p>
          {onRefresh && (
            <Button onClick={onRefresh} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新数据
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和操作区域 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>共 {stats.totalStudents} 名学生</span>
            <span>•</span>
            <span>平均分 {stats.averageScore.toFixed(1)}</span>
            <span>•</span>
            <span>标准差 {stats.standardDeviation.toFixed(2)}</span>
          </div>
        </div>
        <QuickActionButtons 
          onRefresh={onRefresh}
          onExport={onExport}
          isLoading={loading}
        />
      </div>

      {/* 核心统计指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatisticCard
          title="总学生数"
          value={stats.totalStudents}
          icon={<Users className="h-6 w-6" />}
          color="text-blue-600"
          subtitle="参与统计学生数量"
        />
        
        <StatisticCard
          title="平均成绩"
          value={stats.averageScore.toFixed(1)}
          icon={<TrendingUp className="h-6 w-6" />}
          color="text-green-600"
          subtitle={`${stats.minScore.toFixed(1)} - ${stats.maxScore.toFixed(1)}`}
        />
        
        <StatisticCard
          title="及格率"
          value={`${stats.passRate.toFixed(1)}%`}
          icon={<Target className="h-6 w-6" />}
          color="text-orange-600"
          subtitle="60分以上学生比例"
        />
        
        <StatisticCard
          title="优秀率"
          value={`${stats.excellentRate.toFixed(1)}%`}
          icon={<Award className="h-6 w-6" />}
          color="text-purple-600"
          subtitle="90分以上学生比例"
        />
      </div>

      {/* 分数段分布图表 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              分数段分布分析
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleChartTypeChange('bar')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                柱状图
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleChartTypeChange('pie')}
                className="flex items-center gap-2"
              >
                <PieChartIcon className="h-4 w-4" />
                饼图
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OptimizedScoreChart 
            data={stats.scoreDistribution} 
            chartType={chartType}
            height={350}
          />
          
          {/* 分数段统计摘要 */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.scoreDistribution.map((range, index) => (
              <div key={index} className="text-center p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                <div 
                  className="w-5 h-5 rounded-full mx-auto mb-2"
                  style={{ backgroundColor: range.color }}
                />
                <p className="font-semibold text-sm text-gray-900 mb-1">{range.label}</p>
                <p className="text-2xl font-bold text-gray-900">{range.count}</p>
                <p className="text-sm text-gray-600">{range.percentage.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(PerformanceOptimizedDashboard); 