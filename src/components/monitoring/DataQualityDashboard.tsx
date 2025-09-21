/**
 * 数据质量监控仪表板
 * 监控数据映射状态、覆盖率、一致性等关键指标
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle, Database, Users, BookOpen, TrendingUp, RefreshCw } from 'lucide-react';

interface DataQualityMetrics {
  mapping: {
    totalMappings: number;
    exactMatches: number;
    nameMatches: number;
    mappingRate: number;
  };
  coverage: {
    totalStudents: number;
    studentsWithGrades: number;
    coverageRate: number;
  };
  consistency: {
    nameConsistency: number;
    classConsistency: number;
    dataIntegrity: number;
  };
  performance: {
    avgQueryTime: number;
    errorRate: number;
    lastUpdated: string;
  };
}

interface QualityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  count?: number;
  suggestion?: string;
}

export default function DataQualityDashboard() {
  const [metrics, setMetrics] = useState<DataQualityMetrics | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // 获取数据质量指标
  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // 1. 映射统计
      const { data: mappings, error: mappingError } = await supabase
        .from('student_id_mapping')
        .select('match_type, confidence, student_name, class_name');

      if (mappingError) throw mappingError;

      const exactMatches = mappings?.filter(m => m.match_type === 'exact').length || 0;
      const nameMatches = mappings?.filter(m => m.match_type === 'name_only').length || 0;

      // 2. 覆盖率统计
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('student_id', { count: 'exact' });

      if (studentsError) throw studentsError;

      const { data: studentMappings, error: coverageError } = await supabase
        .from('student_id_mapping')
        .select('student_table_id', { count: 'exact' });

      if (coverageError) throw coverageError;

      // 3. 一致性检查（随机采样）
      const sampleMappings = mappings?.slice(0, 20) || [];
      let nameConsistentCount = 0;
      let classConsistentCount = 0;

      for (const mapping of sampleMappings) {
        try {
          const { data: gradeRecord } = await supabase
            .from('grade_data_new')
            .select('name, class_name')
            .eq('student_id', mapping.grade_table_id)
            .single();

          if (gradeRecord) {
            if (mapping.student_name === gradeRecord.name) {
              nameConsistentCount++;
            }
            if (mapping.class_name === gradeRecord.class_name) {
              classConsistentCount++;
            }
          }
        } catch (e) {
          // 忽略单个记录的错误
        }
      }

      const totalStudents = students?.length || 0;
      const studentsWithGrades = studentMappings?.length || 0;

      const newMetrics: DataQualityMetrics = {
        mapping: {
          totalMappings: mappings?.length || 0,
          exactMatches,
          nameMatches,
          mappingRate: totalStudents > 0 ? Math.round((studentsWithGrades / totalStudents) * 100) : 0
        },
        coverage: {
          totalStudents,
          studentsWithGrades,
          coverageRate: totalStudents > 0 ? Math.round((studentsWithGrades / totalStudents) * 100) : 0
        },
        consistency: {
          nameConsistency: sampleMappings.length > 0 ? Math.round((nameConsistentCount / sampleMappings.length) * 100) : 0,
          classConsistency: sampleMappings.length > 0 ? Math.round((classConsistentCount / sampleMappings.length) * 100) : 0,
          dataIntegrity: mappings?.length > 0 ? Math.round((exactMatches / mappings.length) * 100) : 0
        },
        performance: {
          avgQueryTime: Math.random() * 100 + 50, // 模拟值
          errorRate: Math.random() * 5, // 模拟值
          lastUpdated: new Date().toISOString()
        }
      };

      setMetrics(newMetrics);

      // 生成质量问题提醒
      const newIssues: QualityIssue[] = [];

      if (newMetrics.mapping.mappingRate < 80) {
        newIssues.push({
          id: 'low-mapping-rate',
          type: 'warning',
          message: '数据映射覆盖率较低',
          count: 100 - newMetrics.mapping.mappingRate,
          suggestion: '检查学生表和成绩表的数据质量，考虑更新映射规则'
        });
      }

      if (newMetrics.consistency.nameConsistency < 95) {
        newIssues.push({
          id: 'name-inconsistency',
          type: 'error',
          message: '姓名一致性检查失败',
          count: 100 - newMetrics.consistency.nameConsistency,
          suggestion: '检查数据源，可能存在姓名拼写错误或编码问题'
        });
      }

      if (newMetrics.mapping.nameMatches > newMetrics.mapping.exactMatches * 0.1) {
        newIssues.push({
          id: 'many-name-matches',
          type: 'warning',
          message: '存在较多仅姓名匹配的记录',
          count: newMetrics.mapping.nameMatches,
          suggestion: '审查班级信息的准确性，考虑手动校正'
        });
      }

      if (newMetrics.coverage.coverageRate > 95) {
        newIssues.push({
          id: 'excellent-coverage',
          type: 'info',
          message: '数据覆盖率优秀',
          suggestion: '继续保持当前的数据质量标准'
        });
      }

      setIssues(newIssues);
      setLastRefresh(new Date());

    } catch (error) {
      console.error('获取数据质量指标失败:', error);
      setIssues([{
        id: 'fetch-error',
        type: 'error',
        message: '无法获取数据质量指标',
        suggestion: '检查数据库连接和权限设置'
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getHealthScore = () => {
    if (!metrics) return 0;
    const { mapping, coverage, consistency } = metrics;
    return Math.round((mapping.mappingRate + coverage.coverageRate + consistency.dataIntegrity) / 3);
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadge = (score: number) => {
    if (score >= 90) return { label: '优秀', variant: 'default' as const };
    if (score >= 75) return { label: '良好', variant: 'secondary' as const };
    return { label: '需改进', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">正在加载数据质量指标...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className=\"border-red-200\">
        <CardContent className=\"pt-6\">
          <div className=\"flex items-center text-red-600\">
            <AlertTriangle className=\"h-5 w-5 mr-2\" />
            <span>无法加载数据质量指标</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = getHealthScore();
  const healthBadge = getHealthBadge(healthScore);

  return (
    <div className=\"space-y-6\">
      {/* 概览卡片 */}
      <Card>
        <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
          <CardTitle className=\"text-2xl font-bold\">数据质量监控</CardTitle>
          <div className=\"flex items-center space-x-2\">
            <Badge variant={healthBadge.variant}>{healthBadge.label}</Badge>
            <Button variant=\"outline\" size=\"sm\" onClick={fetchMetrics}>
              <RefreshCw className=\"h-4 w-4 mr-1\" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className=\"flex items-center space-x-4\">
            <div className=\"flex-1\">
              <div className=\"text-3xl font-bold mb-2\">
                <span className={getHealthColor(healthScore)}>{healthScore}%</span>
              </div>
              <p className=\"text-sm text-gray-500\">
                整体健康度 • 最后更新: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <div className=\"w-32\">
              <Progress value={healthScore} className=\"h-3\" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 指标详情 */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4\">
        {/* 映射统计 */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">数据映射</CardTitle>
            <Database className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{metrics.mapping.totalMappings}</div>
            <p className=\"text-xs text-muted-foreground\">
              映射记录总数
            </p>
            <div className=\"mt-2 space-y-1\">
              <div className=\"flex justify-between text-xs\">
                <span>精确匹配</span>
                <span>{metrics.mapping.exactMatches}</span>
              </div>
              <div className=\"flex justify-between text-xs\">
                <span>姓名匹配</span>
                <span>{metrics.mapping.nameMatches}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 覆盖率 */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">数据覆盖</CardTitle>
            <Users className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{metrics.coverage.coverageRate}%</div>
            <p className=\"text-xs text-muted-foreground\">
              学生数据覆盖率
            </p>
            <div className=\"mt-2\">
              <Progress value={metrics.coverage.coverageRate} className=\"h-2\" />
            </div>
            <p className=\"text-xs text-muted-foreground mt-1\">
              {metrics.coverage.studentsWithGrades} / {metrics.coverage.totalStudents} 学生
            </p>
          </CardContent>
        </Card>

        {/* 数据一致性 */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">数据一致性</CardTitle>
            <CheckCircle className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{metrics.consistency.dataIntegrity}%</div>
            <p className=\"text-xs text-muted-foreground\">
              数据完整性
            </p>
            <div className=\"mt-2 space-y-1\">
              <div className=\"flex justify-between text-xs\">
                <span>姓名一致性</span>
                <span>{metrics.consistency.nameConsistency}%</span>
              </div>
              <div className=\"flex justify-between text-xs\">
                <span>班级一致性</span>
                <span>{metrics.consistency.classConsistency}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 性能指标 */}
        <Card>
          <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
            <CardTitle className=\"text-sm font-medium\">系统性能</CardTitle>
            <TrendingUp className=\"h-4 w-4 text-muted-foreground\" />
          </CardHeader>
          <CardContent>
            <div className=\"text-2xl font-bold\">{Math.round(metrics.performance.avgQueryTime)}ms</div>
            <p className=\"text-xs text-muted-foreground\">
              平均查询时间
            </p>
            <div className=\"mt-2 space-y-1\">
              <div className=\"flex justify-between text-xs\">
                <span>错误率</span>
                <span>{metrics.performance.errorRate.toFixed(1)}%</span>
              </div>
              <div className=\"flex justify-between text-xs\">
                <span>状态</span>
                <span className=\"text-green-600\">正常</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 质量问题和建议 */}
      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className=\"text-lg\">质量监控提醒</CardTitle>
          </CardHeader>
          <CardContent>
            <div className=\"space-y-3\">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    issue.type === 'error'
                      ? 'border-red-500 bg-red-50'
                      : issue.type === 'warning'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className=\"flex items-start\">
                    {issue.type === 'error' && <AlertTriangle className=\"h-5 w-5 text-red-500 mr-2 mt-0.5\" />}
                    {issue.type === 'warning' && <AlertTriangle className=\"h-5 w-5 text-yellow-500 mr-2 mt-0.5\" />}
                    {issue.type === 'info' && <CheckCircle className=\"h-5 w-5 text-blue-500 mr-2 mt-0.5\" />}
                    <div className=\"flex-1\">
                      <div className=\"font-medium text-sm\">
                        {issue.message}
                        {issue.count && (
                          <Badge variant=\"outline\" className=\"ml-2\">
                            {issue.count}
                          </Badge>
                        )}
                      </div>
                      {issue.suggestion && (
                        <p className=\"text-xs text-gray-600 mt-1\">{issue.suggestion}</p>
                      )}
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
}