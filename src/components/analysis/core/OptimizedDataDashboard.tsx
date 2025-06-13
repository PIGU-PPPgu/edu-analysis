import React, { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  PieChart as PieChartIcon
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

interface ScoreRange {
  range: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  minScore: number;
  maxScore: number;
}

interface BasicStats {
  totalStudents: number;
  totalRecords: number;
  averageScore: number;
  maxScore: number;
  minScore: number;
  passRate: number;
  excellentRate: number;
  goodRate: number;
  standardDeviation: number;
}

interface OptimizedDataDashboardProps {
  gradeData: GradeRecord[];
  title?: string;
  showScoreDistribution?: boolean;
  showDetailedStats?: boolean;
  className?: string;
  loading?: boolean;
}

// ============================================================================
// 常量配置
// ============================================================================

const SCORE_RANGES = [
  { min: 90, max: 100, label: '优秀', color: '#10B981', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  { min: 80, max: 89, label: '良好', color: '#3B82F6', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  { min: 70, max: 79, label: '中等', color: '#F59E0B', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  { min: 60, max: 69, label: '及格', color: '#F97316', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  { min: 0, max: 59, label: '不及格', color: '#EF4444', bgColor: 'bg-red-50', textColor: 'text-red-700' }
] as const;

// ============================================================================
// 工具函数 - 使用 useMemo 优化
// ============================================================================

const calculateBasicStats = (gradeData: GradeRecord[]): BasicStats => {
  if (!gradeData || gradeData.length === 0) {
    return {
      totalStudents: 0,
      totalRecords: 0,
      averageScore: 0,
      maxScore: 0,
      minScore: 0,
      passRate: 0,
      excellentRate: 0,
      goodRate: 0,
      standardDeviation: 0
    };
  }

  const validScores = gradeData
    .filter(record => record.score && !isNaN(Number(record.score)))
    .map(record => Number(record.score));

  if (validScores.length === 0) {
    return {
      totalStudents: new Set(gradeData.map(r => r.student_id)).size,
      totalRecords: gradeData.length,
      averageScore: 0,
      maxScore: 0,
      minScore: 0,
      passRate: 0,
      excellentRate: 0,
      goodRate: 0,
      standardDeviation: 0
    };
  }

  const uniqueStudents = new Set(gradeData.map(r => r.student_id));
  const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  const maxScore = Math.max(...validScores);
  const minScore = Math.min(...validScores);
  
  // 计算各种比率
  const passCount = validScores.filter(score => score >= 60).length;
  const excellentCount = validScores.filter(score => score >= 90).length;
  const goodCount = validScores.filter(score => score >= 80).length;
  
  const passRate = (passCount / validScores.length) * 100;
  const excellentRate = (excellentCount / validScores.length) * 100;
  const goodRate = (goodCount / validScores.length) * 100;
  
  // 计算标准差
  const variance = validScores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / validScores.length;
  const standardDeviation = Math.sqrt(variance);

  return {
    totalStudents: uniqueStudents.size,
    totalRecords: validScores.length,
    averageScore,
    maxScore,
    minScore,
    passRate,
    excellentRate,
    goodRate,
    standardDeviation
  };
};

const calculateScoreDistribution = (gradeData: GradeRecord[]): ScoreRange[] => {
  const validScores = gradeData
    .filter(record => record.score && !isNaN(Number(record.score)))
    .map(record => Number(record.score));

  if (validScores.length === 0) {
    return SCORE_RANGES.map(range => ({
      range: `${range.min}-${range.max}`,
      label: range.label,
      count: 0,
      percentage: 0,
      color: range.color,
      minScore: range.min,
      maxScore: range.max
    }));
  }

  return SCORE_RANGES.map(range => {
    const count = validScores.filter(score => score >= range.min && score <= range.max).length;
    const percentage = (count / validScores.length) * 100;
    
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
};

// ============================================================================
// 子组件 - 使用 memo 优化
// ============================================================================

const StatCard = memo<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}>(({ title, value, icon, color, subtitle }) => (
  <Card className="hover:shadow-md transition-shadow duration-200">
    <CardContent className="p-4">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
));

const ScoreDistributionChart = memo<{
  data: ScoreRange[];
  type: 'bar' | 'pie';
}>(({ data, type }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-semibold">{data.label}</p>
          <p className="text-blue-600">人数: {data.count}</p>
          <p className="text-gray-600">占比: {data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
            label={({ label, percentage }) => `${label} ${percentage.toFixed(1)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="label" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

const LoadingSkeleton = memo(() => (
  <div className="space-y-6">
    {/* 统计卡片骨架 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* 图表骨架 */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
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

const OptimizedDataDashboard: React.FC<OptimizedDataDashboardProps> = ({
  gradeData,
  title = "成绩数据概览",
  showScoreDistribution = true,
  showDetailedStats = true,
  className = "",
  loading = false
}) => {
  // 使用 useMemo 优化计算
  const basicStats = useMemo(() => calculateBasicStats(gradeData), [gradeData]);
  const scoreDistribution = useMemo(() => calculateScoreDistribution(gradeData), [gradeData]);
  
  const [chartType, setChartType] = React.useState<'bar' | 'pie'>('bar');

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center text-gray-500">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">暂无成绩数据</p>
            <p className="text-sm mt-1">请先导入学生成绩数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题区域 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            共 {basicStats.totalStudents} 名学生 • {basicStats.totalRecords} 条记录
          </p>
        </div>
        {showDetailedStats && (
          <Badge variant="outline" className="self-start sm:self-center">
            标准差: {basicStats.standardDeviation.toFixed(2)}
          </Badge>
        )}
      </div>

      {/* 核心统计指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="总人数"
          value={basicStats.totalStudents}
          icon={<Users className="h-5 w-5" />}
          color="text-blue-600"
          subtitle={`${basicStats.totalRecords} 条记录`}
        />
        
        <StatCard
          title="平均分"
          value={basicStats.averageScore.toFixed(1)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-green-600"
          subtitle={`${basicStats.minScore.toFixed(1)} - ${basicStats.maxScore.toFixed(1)}`}
        />
        
        <StatCard
          title="及格率"
          value={`${basicStats.passRate.toFixed(1)}%`}
          icon={<Target className="h-5 w-5" />}
          color="text-orange-600"
          subtitle={`优秀率 ${basicStats.excellentRate.toFixed(1)}%`}
        />
        
        <StatCard
          title="良好率"
          value={`${basicStats.goodRate.toFixed(1)}%`}
          icon={<Award className="h-5 w-5" />}
          color="text-purple-600"
          subtitle="80分以上"
        />
      </div>

      {/* 分数段分布图表 */}
      {showScoreDistribution && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                分数段分布
              </CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-2 rounded-lg transition-colors ${
                    chartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartType('pie')}
                  className={`p-2 rounded-lg transition-colors ${
                    chartType === 'pie' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <PieChartIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScoreDistributionChart data={scoreDistribution} type={chartType} />
            
            {/* 分数段统计表格 */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {scoreDistribution.map((range, index) => (
                <div key={index} className="text-center p-3 rounded-lg border">
                  <div 
                    className="w-4 h-4 rounded mx-auto mb-2"
                    style={{ backgroundColor: range.color }}
                  />
                  <p className="font-semibold text-sm">{range.label}</p>
                  <p className="text-lg font-bold">{range.count}</p>
                  <p className="text-xs text-gray-600">{range.percentage.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(OptimizedDataDashboard); 