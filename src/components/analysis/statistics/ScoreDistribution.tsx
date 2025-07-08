import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Award, Users, TrendingUp, PieChart as PieChartIcon, Download, AlertTriangle } from 'lucide-react';
import { useGradeAnalysis } from '@/contexts/GradeAnalysisContext';
import { 
  analyzeScoreRanges, 
  calculateBasicStatistics,
  calculateRates,
  groupBy,
  type ScoreRangeConfig 
} from '@/components/analysis/services/calculationUtils';
import { 
  formatScoreRangeData,
  CHART_COLORS,
  type ChartDataPoint 
} from '@/components/analysis/services/chartUtils';
import { UnifiedDataService, type GradeRecord } from '@/components/analysis/services/unifiedDataService';

// ============================================================================
// 类型定义
// ============================================================================

interface ScoreDistributionProps {
  /** 考试ID（可选，如果未提供将使用当前选择的考试） */
  examId?: string;
  /** 班级筛选（可选） */
  classFilter?: string[];
  /** 自定义样式类名 */
  className?: string;
  /** 显示模式：bar | pie | both */
  displayMode?: 'bar' | 'pie' | 'both';
  /** 是否显示详细统计 */
  showDetailedStats?: boolean;
  /** 直接传入的数据（可选，用于不依赖Context的场景） */
  data?: any[];
}

interface ScoreRangeData {
  range: string;
  count: number;
  percentage: number;
  color: string;
  minScore: number;
  maxScore: number;
}

interface SubjectStatistics {
  subject: string;
  count: number;
  average: number;
  min: number;
  max: number;
  passRate: number;
  excellentRate: number;
}

// ============================================================================
// 常量定义 - 符合UI规范的色彩系统
// ============================================================================

const DEFAULT_SCORE_RANGES: ScoreRangeConfig = {
  ranges: [
    { min: 90, max: 100, label: '优秀 (90-100)', color: '#10B981' }, // success color
    { min: 80, max: 89, label: '良好 (80-89)', color: '#3B82F6' },   // primary color
    { min: 70, max: 79, label: '中等 (70-79)', color: '#F59E0B' },   // warning color
    { min: 60, max: 69, label: '及格 (60-69)', color: '#F97316' },   // orange
    { min: 0, max: 59, label: '不及格 (0-59)', color: '#EF4444' }    // destructive color
  ]
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化百分比
 */
const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

/**
 * 获取科目列表
 */
const extractSubjects = (gradeData: any[]): string[] => {
  if (!gradeData || gradeData.length === 0) return [];
  
  const subjects = new Set<string>();
  gradeData.forEach(record => {
    if (record.subject && record.subject.trim()) {
      subjects.add(record.subject.trim());
    }
  });
  
  return Array.from(subjects).sort();
};

// ============================================================================
// 加载状态组件
// ============================================================================

const ScoreDistributionSkeleton = () => (
  <div className="space-y-6">
    {/* 控制面板骨架 */}
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </CardHeader>
    </Card>

    {/* 统计卡片骨架 */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-12 mx-auto" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* 图表骨架 */}
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-80 w-full" />
      </CardContent>
    </Card>
  </div>
);

// ============================================================================
// 主组件
// ============================================================================

const ScoreDistribution: React.FC<ScoreDistributionProps> = ({
  examId,
  classFilter,
  className = '',
  displayMode = 'both',
  showDetailedStats = true,
  data
}) => {
  // 尝试从Context获取数据，如果失败则使用传入的data
  let selectedExam: any = null;
  let gradeData: any[] = [];
  let isLoading = false;
  let error: any = null;
  
  try {
    const context = useGradeAnalysis();
    selectedExam = context.selectedExam;
    gradeData = context.gradeData;
    isLoading = context.isLoading;
    error = context.error;
  } catch (e) {
    // 如果没有Context，使用传入的数据
    gradeData = data || [];
    isLoading = false;
    error = null;
  }
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // 确定要分析的考试ID
  const analysisExamId = examId || selectedExam?.id;

  // 获取可用科目列表
  const availableSubjects = useMemo(() => {
    const subjects = extractSubjects(gradeData || []);
    return [{ value: 'all', label: '全部科目' }, ...subjects.map(s => ({ value: s, label: s }))];
  }, [gradeData]);

  // 过滤和处理数据
  const processedData = useMemo(() => {
    if (!gradeData || gradeData.length === 0) {
      return {
        filteredData: [],
        scoreRanges: [],
        subjectStats: [],
        overallStats: calculateBasicStatistics([])
      };
    }

    // 应用筛选条件
    let filteredData = gradeData;

    // 班级筛选
    if (classFilter && classFilter.length > 0) {
      filteredData = filteredData.filter(record => 
        classFilter.includes(record.class_name || '')
      );
    }

    // 科目筛选
    if (selectedSubject !== 'all') {
      filteredData = filteredData.filter(record => 
        record.subject === selectedSubject
      );
    }

    // 提取有效分数
    const validScores = filteredData
      .map(record => record.score)
      .filter((score): score is number => typeof score === 'number' && !isNaN(score) && score >= 0);

    if (validScores.length === 0) {
      return {
        filteredData: [],
        scoreRanges: [],
        subjectStats: [],
        overallStats: calculateBasicStatistics([])
      };
    }

    // 计算分数段分布
    const scoreRangeAnalysis = analyzeScoreRanges(validScores, DEFAULT_SCORE_RANGES);
    const scoreRanges: ScoreRangeData[] = scoreRangeAnalysis.map((item, index) => ({
      range: item.range,
      count: item.count,
      percentage: item.percentage,
      color: DEFAULT_SCORE_RANGES.ranges[index]?.color || CHART_COLORS.primary[index % CHART_COLORS.primary.length],
      minScore: DEFAULT_SCORE_RANGES.ranges[index]?.min || 0,
      maxScore: DEFAULT_SCORE_RANGES.ranges[index]?.max || 100
    }));

    // 按科目统计
    const subjectGroups = groupBy(filteredData, record => record.subject || '未知科目');
    const subjectStats: SubjectStatistics[] = Object.entries(subjectGroups).map(([subject, records]) => {
      const scores = records
        .map(r => r.score)
        .filter((score): score is number => typeof score === 'number' && !isNaN(score));
      
      const stats = calculateBasicStatistics(scores);
      const rates = calculateRates(scores);

      return {
        subject,
        count: scores.length,
        average: stats.average,
        min: stats.min,
        max: stats.max,
        passRate: rates.passRate,
        excellentRate: rates.excellentRate
      };
    }).sort((a, b) => b.average - a.average);

    // 整体统计
    const overallStats = calculateBasicStatistics(validScores);

    return {
      filteredData,
      scoreRanges,
      subjectStats,
      overallStats
    };
  }, [gradeData, classFilter, selectedSubject]);

  // 自定义工具提示
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium text-gray-900">{data.range}</p>
          <p className="text-blue-600">
            人数: <span className="font-semibold">{data.count}</span>
          </p>
          <p className="text-gray-600">
            占比: <span className="font-semibold">{formatPercentage(data.percentage)}</span>
          </p>
          <p className="text-sm text-gray-500">
            分数范围: {data.minScore}-{data.maxScore}分
          </p>
        </div>
      );
    }
    return null;
  };

  // 加载状态
  if (isLoading) {
    return <ScoreDistributionSkeleton />;
  }

  // 错误状态
  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center min-h-[12rem] text-red-600">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <div className="text-center">
              <div className="font-medium">加载分数分布数据失败</div>
              <div className="text-sm text-red-500 mt-1">{error.message}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (processedData.filteredData.length === 0) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center min-h-[12rem] text-gray-500">
            <BarChart3 className="h-8 w-8 mb-3 text-gray-400" />
            <div className="text-center">
              <div className="font-medium text-gray-600">暂无分数分布数据</div>
              <div className="text-sm text-gray-500 mt-1">请先导入成绩数据或调整筛选条件</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 - 响应式优化 */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-lg md:text-xl font-semibold text-gray-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                分数分布分析
                {selectedExam && (
                  <Badge variant="outline" className="text-xs">
                    {selectedExam.title}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                查看成绩在不同分数段的分布情况
              </CardDescription>
            </div>

            {/* 控制按钮组 - 响应式优化 */}
            <div className="flex flex-wrap items-center gap-3">
              {/* 科目筛选 */}
              {availableSubjects.length > 1 && (
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-[140px] md:w-[160px]">
                    <SelectValue placeholder="选择科目" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map(subject => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* 图表类型切换 */}
              {displayMode === 'both' && (
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <Button
                    variant={chartType === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('bar')}
                    className="rounded-none px-3"
                    aria-label="柱状图"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={chartType === 'pie' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('pie')}
                    className="rounded-none px-3"
                    aria-label="饼图"
                  >
                    <PieChartIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* 导出按钮 */}
              <Button variant="outline" size="sm" className="text-sm">
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">导出</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 关键统计指标 - 响应式优化 */}
      {showDetailedStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-900 mb-1">
                  {processedData.filteredData.length}
                </div>
                <div className="text-xs md:text-sm text-blue-700 flex items-center justify-center gap-1">
                  <Users className="h-3 w-3" />
                  参与人数
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-900 mb-1">
                  {processedData.overallStats.average.toFixed(1)}
                </div>
                <div className="text-xs md:text-sm text-green-700 flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  平均分
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-orange-900 mb-1">
                  {formatPercentage(calculateRates([...processedData.filteredData.map(d => d.score).filter(s => typeof s === 'number' && !isNaN(s))]).passRate)}
                </div>
                <div className="text-xs md:text-sm text-orange-700 flex items-center justify-center gap-1">
                  <Award className="h-3 w-3" />
                  及格率
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-purple-900 mb-1">
                  {formatPercentage(calculateRates([...processedData.filteredData.map(d => d.score).filter(s => typeof s === 'number' && !isNaN(s))]).excellentRate)}
                </div>
                <div className="text-xs md:text-sm text-purple-700 flex items-center justify-center gap-1">
                  <Award className="h-3 w-3" />
                  优秀率
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 主要图表 - 响应式优化 */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg md:text-xl flex items-center gap-2">
              {chartType === 'bar' ? <BarChart3 className="h-5 w-5 text-blue-600" /> : <PieChartIcon className="h-5 w-5 text-purple-600" />}
              分数段分布
            </CardTitle>
            <Badge variant="secondary" className="text-xs w-fit">
              {processedData.scoreRanges.length} 个分数段
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80 lg:h-96 flex items-center justify-center">
            {chartType === 'bar' || displayMode === 'bar' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.scoreRanges} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="人数"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.scoreRanges}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, percentage }) => `${range}: ${formatPercentage(percentage)}`}
                    outerRadius={window.innerWidth < 768 ? 80 : 120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {processedData.scoreRanges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 分数段详情 - 响应式优化 */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">分数段详细统计</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {processedData.scoreRanges.map((range, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: range.color }}
                  ></div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm md:text-base">{range.range}</div>
                    <div className="text-xs md:text-sm text-gray-600">
                      分数范围: {range.minScore}-{range.maxScore}分
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <div className="font-semibold text-gray-900 text-sm md:text-base">{range.count} 人</div>
                    <div className="text-xs md:text-sm text-gray-600">{formatPercentage(range.percentage)}</div>
                  </div>
                  
                  <div className="w-20 md:w-24">
                    <Progress 
                      value={range.percentage} 
                      className="h-2"
                      aria-label={`${range.range} 占比 ${formatPercentage(range.percentage)}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 科目对比（当选择全部科目时） - 响应式优化 */}
      {selectedSubject === 'all' && processedData.subjectStats.length > 1 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">科目表现对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedData.subjectStats.map((subject, index) => (
                <div key={subject.subject} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    {index === 0 && <Award className="h-4 w-4 text-yellow-600" />}
                    <div>
                      <div className="font-medium text-gray-900 text-sm md:text-base">{subject.subject}</div>
                      <div className="text-xs md:text-sm text-gray-600">{subject.count} 人参与</div>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right">
                    <div className="font-semibold text-gray-900 text-sm md:text-base">
                      平均 {subject.average.toFixed(1)}分
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      及格率 {formatPercentage(subject.passRate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScoreDistribution;
