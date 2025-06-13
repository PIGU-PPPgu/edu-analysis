import React, { useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Info,
  Download,
  Eye,
  Filter,
  BarChart3,
  Users
} from 'lucide-react';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

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

interface AnomalyData {
  student_id: string;
  name: string;
  class_name?: string;
  subject: string;
  score: number;
  expected_score: number;
  deviation: number;
  z_score: number;
  anomaly_type: 'outlier_high' | 'outlier_low' | 'sudden_drop' | 'sudden_rise' | 'missing_pattern';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

interface AnomalyDetectionAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

// 计算Z分数
const calculateZScore = (value: number, mean: number, stdDev: number): number => {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
};

// 计算标准差
const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

// 检测异常值
const detectAnomalies = (gradeData: GradeRecord[]): AnomalyData[] => {
  const anomalies: AnomalyData[] = [];
  
  // 按科目分组数据
  const subjectGroups = gradeData.reduce((acc, record) => {
    if (!record.subject || !record.score || isNaN(Number(record.score))) return acc;
    
    if (!acc[record.subject]) {
      acc[record.subject] = [];
    }
    acc[record.subject].push({
      ...record,
      score: Number(record.score)
    });
    return acc;
  }, {} as Record<string, (GradeRecord & { score: number })[]>);

  // 对每个科目进行异常检测
  Object.entries(subjectGroups).forEach(([subject, records]) => {
    if (records.length < 3) return; // 样本太少，无法进行异常检测

    const scores = records.map(r => r.score);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const stdDev = calculateStandardDeviation(scores, mean);
    
    // 设置异常检测阈值
    const outlierThreshold = 2.5; // Z分数阈值
    const extremeThreshold = 3.0; // 极端异常阈值

    records.forEach(record => {
      const zScore = calculateZScore(record.score, mean, stdDev);
      const absZScore = Math.abs(zScore);
      
      if (absZScore > outlierThreshold) {
        let anomalyType: AnomalyData['anomaly_type'];
        let severity: AnomalyData['severity'];
        let description: string;

        if (zScore > extremeThreshold) {
          anomalyType = 'outlier_high';
          severity = 'high';
          description = `${subject}成绩异常偏高，远超班级平均水平`;
        } else if (zScore < -extremeThreshold) {
          anomalyType = 'outlier_low';
          severity = 'high';
          description = `${subject}成绩异常偏低，远低于班级平均水平`;
        } else if (zScore > outlierThreshold) {
          anomalyType = 'sudden_rise';
          severity = 'medium';
          description = `${subject}成绩明显高于预期，可能存在异常`;
        } else {
          anomalyType = 'sudden_drop';
          severity = 'medium';
          description = `${subject}成绩明显低于预期，需要关注`;
        }

        anomalies.push({
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subject,
          score: record.score,
          expected_score: mean,
          deviation: record.score - mean,
          z_score: zScore,
          anomaly_type: anomalyType,
          severity,
          description
        });
      }
    });
  });

  return anomalies.sort((a, b) => Math.abs(b.z_score) - Math.abs(a.z_score));
};

// 获取异常类型的颜色和图标
const getAnomalyStyle = (type: AnomalyData['anomaly_type'], severity: AnomalyData['severity']) => {
  const baseStyles = {
    outlier_high: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: TrendingUp },
    outlier_low: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: TrendingDown },
    sudden_rise: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', icon: TrendingUp },
    sudden_drop: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: TrendingDown },
    missing_pattern: { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200', icon: AlertCircle }
  };

  return baseStyles[type] || baseStyles.missing_pattern;
};

// 获取严重程度的样式
const getSeverityBadge = (severity: AnomalyData['severity']) => {
  switch (severity) {
    case 'high':
      return <Badge variant="destructive">高风险</Badge>;
    case 'medium':
      return <Badge variant="secondary">中风险</Badge>;
    case 'low':
      return <Badge variant="outline">低风险</Badge>;
    default:
      return <Badge variant="outline">未知</Badge>;
  }
};

const AnomalyDetectionAnalysis: React.FC<AnomalyDetectionAnalysisProps> = ({
  gradeData,
  title = "成绩异常检测",
  className = ""
}) => {
  const anomalies = useMemo(() => detectAnomalies(gradeData), [gradeData]);
  
  const subjects = useMemo(() => {
    return Array.from(new Set(gradeData.map(record => record.subject).filter(Boolean)));
  }, [gradeData]);

  // 统计数据
  const stats = useMemo(() => {
    const totalStudents = new Set(gradeData.map(r => r.student_id)).size;
    const affectedStudents = new Set(anomalies.map(a => a.student_id)).size;
    const highRiskCount = anomalies.filter(a => a.severity === 'high').length;
    const mediumRiskCount = anomalies.filter(a => a.severity === 'medium').length;
    
    return {
      totalStudents,
      affectedStudents,
      affectedRate: totalStudents > 0 ? (affectedStudents / totalStudents * 100) : 0,
      highRiskCount,
      mediumRiskCount,
      totalAnomalies: anomalies.length
    };
  }, [anomalies, gradeData]);

  // 按科目统计异常
  const subjectAnomalies = useMemo(() => {
    const subjectStats = subjects.map(subject => {
      const subjectAnomaliesCount = anomalies.filter(a => a.subject === subject).length;
      const subjectStudentsCount = new Set(
        gradeData.filter(r => r.subject === subject).map(r => r.student_id)
      ).size;
      
      return {
        subject,
        anomalies: subjectAnomaliesCount,
        students: subjectStudentsCount,
        rate: subjectStudentsCount > 0 ? (subjectAnomaliesCount / subjectStudentsCount * 100) : 0
      };
    });
    
    return subjectStats.sort((a, b) => b.rate - a.rate);
  }, [anomalies, subjects, gradeData]);

  // 导出异常数据
  const handleExportData = () => {
    const csvContent = [
      ['学号', '姓名', '班级', '科目', '实际分数', '预期分数', '偏差', 'Z分数', '异常类型', '风险等级', '描述'],
      ...anomalies.map(a => [
        a.student_id,
        a.name,
        a.class_name || '',
        a.subject,
        a.score.toString(),
        a.expected_score.toFixed(2),
        a.deviation.toFixed(2),
        a.z_score.toFixed(3),
        a.anomaly_type === 'outlier_high' ? '异常偏高' :
        a.anomaly_type === 'outlier_low' ? '异常偏低' :
        a.anomaly_type === 'sudden_rise' ? '突然上升' :
        a.anomaly_type === 'sudden_drop' ? '突然下降' : '其他异常',
        a.severity === 'high' ? '高风险' :
        a.severity === 'medium' ? '中风险' : '低风险',
        a.description
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '成绩异常检测报告.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (subjects.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">暂无成绩数据</p>
          <p className="text-sm text-gray-500 mt-1">请先导入学生成绩数据进行异常检测</p>
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
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            检测 {stats.totalStudents} 名学生在 {subjects.length} 个科目中的异常表现
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-orange-50 text-orange-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {stats.totalAnomalies} 个异常
          </Badge>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-1" />
            导出报告
          </Button>
        </div>
      </div>

      {/* 分析说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>异常检测说明</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 text-sm">
            <p>• <strong>检测方法</strong>: 基于Z分数统计方法，识别偏离正常范围的成绩</p>
            <p>• <strong>异常阈值</strong>: Z分数绝对值 > 2.5 为异常，> 3.0 为极端异常</p>
            <p>• <strong>风险等级</strong>: 高风险需要立即关注，中风险建议跟进</p>
            <p>• <strong>应用建议</strong>: 结合学生具体情况分析，避免单纯依赖数据判断</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
            <div className="text-sm text-gray-600">总学生数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.affectedStudents}</div>
            <div className="text-sm text-gray-600">异常学生数</div>
            <div className="text-xs text-gray-500">({stats.affectedRate.toFixed(1)}%)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.highRiskCount}</div>
            <div className="text-sm text-gray-600">高风险异常</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.mediumRiskCount}</div>
            <div className="text-sm text-gray-600">中风险异常</div>
          </CardContent>
        </Card>
      </div>

      {/* 科目异常统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            各科目异常统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAnomalies}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="subject" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'anomalies' ? `${value} 个异常` : `${value} 名学生`,
                    name === 'anomalies' ? '异常数量' : '学生总数'
                  ]}
                />
                <Legend />
                <Bar dataKey="anomalies" fill="#f59e0b" name="异常数量" />
                <Bar dataKey="students" fill="#3b82f6" name="学生总数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 异常详情列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            异常详情列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {anomalies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>未检测到异常成绩</p>
                <p className="text-sm">所有学生成绩都在正常范围内</p>
              </div>
            ) : (
              anomalies.map((anomaly, index) => {
                const style = getAnomalyStyle(anomaly.anomaly_type, anomaly.severity);
                const IconComponent = style.icon;
                
                return (
                  <div key={index} className={`flex items-center justify-between p-4 border rounded-lg ${style.bg} ${style.border} hover:shadow-sm transition-shadow`}>
                    <div className="flex items-center gap-3">
                      <IconComponent className={`w-5 h-5 ${style.color}`} />
                      <div>
                        <p className="font-medium">
                          {anomaly.name} ({anomaly.student_id})
                        </p>
                        <p className="text-sm text-gray-600">
                          {anomaly.class_name} • {anomaly.subject} • 
                          实际: {anomaly.score}分 • 预期: {anomaly.expected_score.toFixed(1)}分
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {anomaly.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${style.color}`}>
                          Z分数: {anomaly.z_score.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          偏差: {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}分
                        </div>
                      </div>
                      {getSeverityBadge(anomaly.severity)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 建议和行动指南 */}
      {stats.totalAnomalies > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              建议和行动指南
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.highRiskCount > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-medium text-red-800">
                    🚨 高风险异常 ({stats.highRiskCount} 个)
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    建议立即与相关学生和家长沟通，了解具体情况，制定针对性的帮扶措施。
                  </p>
                </div>
              )}
              
              {stats.mediumRiskCount > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="font-medium text-yellow-800">
                    ⚠️ 中风险异常 ({stats.mediumRiskCount} 个)
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    建议持续关注这些学生的学习状态，适时提供额外的学习支持和指导。
                  </p>
                </div>
              )}
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-800">
                  💡 总体建议
                </p>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• 结合学生平时表现和学习态度综合分析</li>
                  <li>• 关注是否存在考试作弊或数据录入错误</li>
                  <li>• 对于成绩突然提升的学生，了解学习方法的改进</li>
                  <li>• 对于成绩下降的学生，及时提供学习帮助</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(AnomalyDetectionAnalysis); 