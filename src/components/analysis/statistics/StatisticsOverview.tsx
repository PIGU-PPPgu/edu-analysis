import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Percent, TrendingUp, TrendingDown, Target, Users, Award, 
  BookOpen, BarChart3, GraduationCap, Sparkles, Bot, AlertTriangle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGradeAnalysis } from "@/contexts/GradeAnalysisContext";
import { 
  calculateBasicStatistics, 
  calculateRates, 
  groupBy,
  type BasicStatistics 
} from "@/components/analysis/services/calculationUtils";
import { UnifiedDataService, type GradeRecord } from "@/components/analysis/services/unifiedDataService";

// ============================================================================
// 类型定义
// ============================================================================

interface StatisticsOverviewProps {
  /** 考试ID（可选，如果未提供将使用当前选择的考试） */
  examId?: string;
  /** 班级筛选（可选） */
  classFilter?: string[];
  /** 科目筛选（可选） */
  subjectFilter?: string[];
  /** 是否显示AI分析结果 */
  showAIAnalysis?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

interface ClassStatistics {
  className: string;
  studentCount: number;
  averageScore: number;
  statistics: BasicStatistics;
  rates: {
    passRate: number;
    goodRate: number;
    excellentRate: number;
  };
}

interface PerformanceLevel {
  level: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 根据平均分判断整体表现水平（符合UI规范的色彩系统）
 */
const getPerformanceLevel = (average: number): PerformanceLevel => {
  if (average >= 90) {
    return { 
      level: "优秀", 
      color: "bg-green-600", 
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    };
  }
  if (average >= 80) {
    return { 
      level: "良好", 
      color: "bg-blue-600", 
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    };
  }
  if (average >= 70) {
    return { 
      level: "中等", 
      color: "bg-yellow-600", 
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200"
    };
  }
  if (average >= 60) {
    return { 
      level: "及格", 
      color: "bg-orange-600", 
      textColor: "text-orange-700",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200"
    };
  }
  return { 
    level: "待提高", 
    color: "bg-red-600", 
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200"
  };
};

/**
 * 格式化数字显示
 */
const formatNumber = (num: number, decimals: number = 1): string => {
  return Number(num).toFixed(decimals);
};

/**
 * 格式化百分比显示
 */
const formatPercentage = (num: number): string => {
  return `${formatNumber(num, 1)}%`;
};

// ============================================================================
// 加载状态组件
// ============================================================================

const StatisticsOverviewSkeleton = () => (
  <div className="space-y-6">
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ============================================================================
// 主组件
// ============================================================================

const StatisticsOverview: React.FC<StatisticsOverviewProps> = ({
  examId,
  classFilter,
  subjectFilter,
  showAIAnalysis = false,
  className = ""
}) => {
  const { selectedExam, gradeData, isLoading, error } = useGradeAnalysis();

  // 确定要分析的考试ID
  const analysisExamId = examId || selectedExam?.id;

  // 计算整体统计数据
  const overallStatistics = useMemo(() => {
    if (!gradeData || gradeData.length === 0) {
      return {
        statistics: calculateBasicStatistics([]),
        rates: { passRate: 0, goodRate: 0, excellentRate: 0 },
        totalStudents: 0,
        totalRecords: 0
      };
    }

    // 过滤数据
    let filteredData = gradeData;
    
    if (classFilter && classFilter.length > 0) {
      filteredData = filteredData.filter(record => 
        classFilter.includes(record.class_name || '')
      );
    }
    
    if (subjectFilter && subjectFilter.length > 0) {
      filteredData = filteredData.filter(record => 
        subjectFilter.includes(record.subject || '')
      );
    }

    // 按学生分组，避免重复计算
    const studentGroups = groupBy(filteredData, record => record.student_id);
    const studentScores: number[] = [];

    Object.values(studentGroups).forEach(records => {
      const scores = records
        .map(r => r.score)
        .filter((score): score is number => typeof score === 'number' && !isNaN(score));
      
      if (scores.length > 0) {
        // 使用学生的平均分
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        studentScores.push(avgScore);
      }
    });

    const statistics = calculateBasicStatistics(studentScores);
    const rates = calculateRates(studentScores);

    return {
      statistics,
      rates,
      totalStudents: Object.keys(studentGroups).length,
      totalRecords: filteredData.length
    };
  }, [gradeData, classFilter, subjectFilter]);

  // 计算班级统计数据
  const classStatistics = useMemo((): ClassStatistics[] => {
    if (!gradeData || gradeData.length === 0) return [];

    // 按班级分组
    const classByName = groupBy(gradeData, record => record.class_name || '未知班级');

    return Object.entries(classByName).map(([className, records]) => {
      // 按学生分组避免重复计算
      const studentGroups = groupBy(records, record => record.student_id);
      const studentScores: number[] = [];

      Object.values(studentGroups).forEach(studentRecords => {
        const scores = studentRecords
          .map(r => r.score)
          .filter((score): score is number => typeof score === 'number' && !isNaN(score));
        
        if (scores.length > 0) {
          const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          studentScores.push(avgScore);
        }
      });

      const statistics = calculateBasicStatistics(studentScores);
      const rates = calculateRates(studentScores);

      return {
        className,
        studentCount: Object.keys(studentGroups).length,
        averageScore: statistics.average,
        statistics,
        rates
      };
    }).sort((a, b) => b.averageScore - a.averageScore); // 按平均分降序排列
  }, [gradeData]);

  // 计算表现水平
  const performanceLevel = useMemo(() => 
    getPerformanceLevel(overallStatistics.statistics.average), 
    [overallStatistics.statistics.average]
  );

  // 加载状态
  if (isLoading) {
    return <StatisticsOverviewSkeleton />;
  }

  // 错误状态
  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center min-h-[8rem] text-red-600">
            <AlertTriangle className="h-6 w-6 mr-2" />
            <div className="text-center">
              <div className="font-medium">加载统计数据失败</div>
              <div className="text-sm text-red-500 mt-1">{error.message}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 无数据状态
  if (overallStatistics.totalRecords === 0) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center min-h-[8rem] text-gray-500">
            <BarChart3 className="h-8 w-8 mb-3 text-gray-400" />
            <div className="text-center">
              <div className="font-medium text-gray-600">暂无成绩数据</div>
              <div className="text-sm text-gray-500 mt-1">请先导入成绩数据或调整筛选条件</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* 整体表现概览卡片 - 响应式优化 */}
      <Card className={`${performanceLevel.bgColor} ${performanceLevel.borderColor} border-2 shadow-sm hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg md:text-xl font-semibold text-gray-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              整体表现概览
            </CardTitle>
            {selectedExam && (
              <Badge variant="outline" className="text-xs w-fit">
                {selectedExam.title}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 表现水平和基础信息 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${performanceLevel.textColor} border-current font-medium px-3 py-1`}
              >
                {performanceLevel.level}
              </Badge>
              <div className="text-sm md:text-base text-gray-700 font-medium">
                平均分 {formatNumber(overallStatistics.statistics.average)}分
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                共 {overallStatistics.totalStudents} 名学生
              </div>
              {classStatistics.length > 1 && (
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  {classStatistics.length} 个班级
                </div>
              )}
            </div>
          </div>

          {/* 关键指标网格 - 响应式优化 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                {formatNumber(overallStatistics.statistics.max)}
              </div>
              <div className="text-xs md:text-sm text-gray-600 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                最高分
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                {formatNumber(overallStatistics.statistics.min)}
              </div>
              <div className="text-xs md:text-sm text-gray-600 flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" />
                最低分
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-xl md:text-2xl font-bold text-green-600 mb-1">
                {formatPercentage(overallStatistics.rates.passRate)}
              </div>
              <div className="text-xs md:text-sm text-gray-600 flex items-center justify-center gap-1">
                <Target className="h-3 w-3 text-green-600" />
                及格率
              </div>
              <Progress 
                value={overallStatistics.rates.passRate} 
                className="h-1 mt-2"
                aria-label={`及格率 ${formatPercentage(overallStatistics.rates.passRate)}`}
              />
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
              <div className="text-xl md:text-2xl font-bold text-blue-600 mb-1">
                {formatPercentage(overallStatistics.rates.excellentRate)}
              </div>
              <div className="text-xs md:text-sm text-gray-600 flex items-center justify-center gap-1">
                <Award className="h-3 w-3 text-blue-600" />
                优秀率
              </div>
              <Progress 
                value={overallStatistics.rates.excellentRate} 
                className="h-1 mt-2"
                aria-label={`优秀率 ${formatPercentage(overallStatistics.rates.excellentRate)}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 班级表现对比 - 响应式优化 */}
      {classStatistics.length > 1 && (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-lg md:text-xl font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                班级表现对比
              </CardTitle>
              <Badge variant="secondary" className="text-xs w-fit">
                {classStatistics.length} 个班级
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classStatistics.slice(0, 5).map((classData, index) => (
                <div
                  key={classData.className}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border transition-colors ${
                    index === 0 
                      ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    {index === 0 && <Award className="h-4 w-4 text-yellow-600" />}
                    <div>
                      <div className="font-medium text-gray-900 text-sm md:text-base">
                        {classData.className}
                      </div>
                      <div className="text-xs md:text-sm text-gray-600">
                        {classData.studentCount} 名学生
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right">
                    <div className="font-semibold text-gray-900 text-sm md:text-base">
                      {formatNumber(classData.averageScore)}分
                    </div>
                    <div className="text-xs md:text-sm text-gray-600">
                      及格率 {formatPercentage(classData.rates.passRate)}
                    </div>
                  </div>
                </div>
              ))}
              
              {classStatistics.length > 5 && (
                <div className="text-center pt-4">
                  <Button variant="outline" size="sm" className="text-sm">
                    查看全部 {classStatistics.length} 个班级
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据质量提示 - 改进版 */}
      {overallStatistics.statistics.standardDeviation > 20 && (
        <Card className="bg-amber-50 border-amber-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-amber-800 text-sm md:text-base">数据质量提示</div>
                <div className="text-xs md:text-sm text-amber-700 mt-1">
                  成绩分布较为分散（标准差: {formatNumber(overallStatistics.statistics.standardDeviation)}），
                  建议关注学习困难学生的辅导需求。
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StatisticsOverview;

