import React, { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Grid,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Download,
  BarChart3
} from 'lucide-react';

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

interface CorrelationData {
  subject1: string;
  subject2: string;
  correlation: number;
  pValue: number;
  sampleSize: number;
  significance: 'high' | 'medium' | 'low' | 'none';
}

interface SubjectCorrelationAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

// 计算皮尔逊相关系数
const calculatePearsonCorrelation = (x: number[], y: number[]): { correlation: number; pValue: number } => {
  if (x.length !== y.length || x.length < 3) {
    return { correlation: 0, pValue: 1 };
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return { correlation: 0, pValue: 1 };
  }

  const correlation = numerator / denominator;
  
  // 简化的p值计算（基于t分布近似）
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = Math.min(1, Math.max(0, 2 * (1 - Math.abs(t) / Math.sqrt(n - 2 + t * t))));

  return { correlation, pValue };
};

// 获取相关性强度等级
const getCorrelationStrength = (correlation: number, pValue: number): 'high' | 'medium' | 'low' | 'none' => {
  const absCorr = Math.abs(correlation);
  
  if (pValue > 0.05) return 'none';
  if (absCorr >= 0.7) return 'high';
  if (absCorr >= 0.4) return 'medium';
  if (absCorr >= 0.2) return 'low';
  return 'none';
};

// 计算所有科目间的相关性
const calculateCorrelationMatrix = (gradeData: GradeRecord[]): CorrelationData[] => {
  // 按科目分组数据
  const subjectData = gradeData.reduce((acc, record) => {
    if (!record.subject || !record.score || isNaN(Number(record.score))) return acc;
    
    if (!acc[record.subject]) {
      acc[record.subject] = {};
    }
    acc[record.subject][record.student_id] = Number(record.score);
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const subjects = Object.keys(subjectData);
  const correlations: CorrelationData[] = [];

  // 计算每对科目的相关性
  for (let i = 0; i < subjects.length; i++) {
    for (let j = i + 1; j < subjects.length; j++) {
      const subject1 = subjects[i];
      const subject2 = subjects[j];
      
      // 找到两个科目都有成绩的学生
      const commonStudents = Object.keys(subjectData[subject1]).filter(
        studentId => studentId in subjectData[subject2]
      );

      if (commonStudents.length < 3) continue;

      const scores1 = commonStudents.map(studentId => subjectData[subject1][studentId]);
      const scores2 = commonStudents.map(studentId => subjectData[subject2][studentId]);

      const { correlation, pValue } = calculatePearsonCorrelation(scores1, scores2);
      const significance = getCorrelationStrength(correlation, pValue);

      correlations.push({
        subject1,
        subject2,
        correlation,
        pValue,
        sampleSize: commonStudents.length,
        significance
      });
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
};

// 获取相关性颜色
const getCorrelationColor = (correlation: number, significance: string) => {
  if (significance === 'none') return 'bg-gray-100 text-gray-600';
  
  const intensity = Math.abs(correlation);
  if (correlation > 0) {
    if (intensity >= 0.7) return 'bg-green-100 text-green-800';
    if (intensity >= 0.4) return 'bg-green-50 text-green-700';
    return 'bg-green-25 text-green-600';
  } else {
    if (intensity >= 0.7) return 'bg-red-100 text-red-800';
    if (intensity >= 0.4) return 'bg-red-50 text-red-700';
    return 'bg-red-25 text-red-600';
  }
};

const SubjectCorrelationAnalysis: React.FC<SubjectCorrelationAnalysisProps> = ({
  gradeData,
  title = "科目相关性分析",
  className = ""
}) => {
  const correlations = useMemo(() => calculateCorrelationMatrix(gradeData), [gradeData]);
  
  const subjects = useMemo(() => {
    return Array.from(new Set(gradeData.map(record => record.subject).filter(Boolean)));
  }, [gradeData]);

  const strongCorrelations = correlations.filter(c => c.significance === 'high');
  const averageCorrelation = correlations.length > 0 
    ? correlations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / correlations.length 
    : 0;

  // 导出相关性数据
  const handleExportData = () => {
    const csvContent = [
      ['科目1', '科目2', '相关系数', 'P值', '样本量', '显著性'],
      ...correlations.map(c => [
        c.subject1,
        c.subject2,
        c.correlation.toFixed(4),
        c.pValue.toFixed(4),
        c.sampleSize.toString(),
        c.significance === 'high' ? '强相关' :
        c.significance === 'medium' ? '中等相关' :
        c.significance === 'low' ? '弱相关' : '无显著相关'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '科目相关性分析.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (subjects.length < 2) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Grid className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">需要至少2个科目的数据</p>
          <p className="text-sm text-gray-500 mt-1">请确保导入的数据包含多个科目的成绩</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和统计摘要 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Grid className="h-6 w-6 text-blue-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            分析 {subjects.length} 个科目间的相关性 • {correlations.length} 个科目对 • 平均相关性 {averageCorrelation.toFixed(3)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            强相关 {strongCorrelations.length} 对
          </Badge>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-1" />
            导出数据
          </Button>
        </div>
      </div>

      {/* 分析说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>相关性分析说明</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 text-sm">
            <p>• <strong>相关系数范围</strong>: -1 到 1，绝对值越大相关性越强</p>
            <p>• <strong>正相关</strong>: 一个科目分数高，另一个科目分数也倾向于高</p>
            <p>• <strong>负相关</strong>: 一个科目分数高，另一个科目分数倾向于低</p>
            <p>• <strong>显著性</strong>: 基于p值判断，p&lt;0.05为显著相关</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{subjects.length}</div>
            <div className="text-sm text-gray-600">分析科目数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{correlations.length}</div>
            <div className="text-sm text-gray-600">科目对数量</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{strongCorrelations.length}</div>
            <div className="text-sm text-gray-600">强相关对数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{averageCorrelation.toFixed(3)}</div>
            <div className="text-sm text-gray-600">平均相关性</div>
          </CardContent>
        </Card>
      </div>

      {/* 相关性矩阵 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            科目相关性矩阵
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {correlations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Grid className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>暂无相关性数据</p>
                <p className="text-sm">需要至少3名学生在两个科目都有成绩</p>
              </div>
            ) : (
              correlations.map((corr, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {corr.correlation > 0.1 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : corr.correlation < -0.1 ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <Minus className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">
                        {corr.subject1} ↔ {corr.subject2}
                      </p>
                      <p className="text-sm text-gray-500">
                        样本量: {corr.sampleSize} 名学生 • p值: {corr.pValue.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getCorrelationColor(corr.correlation, corr.significance)}`}>
                        {corr.correlation.toFixed(3)}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        corr.significance === 'high' ? 'default' :
                        corr.significance === 'medium' ? 'secondary' :
                        corr.significance === 'low' ? 'outline' : 'destructive'
                      }
                    >
                      {corr.significance === 'high' ? '强相关' :
                       corr.significance === 'medium' ? '中等相关' :
                       corr.significance === 'low' ? '弱相关' : '无显著相关'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 分析洞察 */}
      {strongCorrelations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              关键发现
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {strongCorrelations.slice(0, 3).map((corr, index) => (
                <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="font-medium text-green-800">
                    {corr.subject1} 与 {corr.subject2} 存在强{corr.correlation > 0 ? '正' : '负'}相关
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    相关系数: {corr.correlation.toFixed(3)} | 
                    这意味着学生在 {corr.subject1} 上的表现与 {corr.subject2} 上的表现
                    {corr.correlation > 0 ? '呈正向关联' : '呈反向关联'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(SubjectCorrelationAnalysis); 