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

// 🎨 获取Positivus风格异常类型的颜色和图标
const getAnomalyStyle = (type: AnomalyData['anomaly_type'], severity: AnomalyData['severity']) => {
  const baseStyles = {
    outlier_high: { 
      color: 'text-[#191A23]', 
      bg: 'bg-[#B9FF66]/20', 
      border: 'border-[#B9FF66] border-2', 
      cardStyle: 'shadow-[4px_4px_0px_0px_#B9FF66]',
      icon: TrendingUp 
    },
    outlier_low: { 
      color: 'text-white', 
      bg: 'bg-[#B9FF66]/20', 
      border: 'border-[#B9FF66] border-2', 
      cardStyle: 'shadow-[4px_4px_0px_0px_#B9FF66]',
      icon: TrendingDown 
    },
    sudden_rise: { 
      color: 'text-[#191A23]', 
      bg: 'bg-[#B9FF66]/10', 
      border: 'border-[#B9FF66] border-2', 
      cardStyle: 'shadow-[4px_4px_0px_0px_#B9FF66]',
      icon: TrendingUp 
    },
    sudden_drop: { 
      color: 'text-white', 
      bg: 'bg-[#B9FF66]/20', 
      border: 'border-[#B9FF66] border-2', 
      cardStyle: 'shadow-[4px_4px_0px_0px_#B9FF66]',
      icon: TrendingDown 
    },
    missing_pattern: { 
      color: 'text-[#191A23]', 
      bg: 'bg-[#9C88FF]/20', 
      border: 'border-[#9C88FF] border-2', 
      cardStyle: 'shadow-[4px_4px_0px_0px_#9C88FF]',
      icon: AlertCircle 
    }
  };

  return baseStyles[type] || baseStyles.missing_pattern;
};

// 🎨 获取Positivus风格严重程度的样式
const getSeverityBadge = (severity: AnomalyData['severity']) => {
  switch (severity) {
    case 'high':
      return <Badge className="bg-[#B9FF66] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">🚨 高风险</Badge>;
    case 'medium':
      return <Badge className="bg-[#B9FF66] text-white border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">⚠️ 中风险</Badge>;
    case 'low':
      return <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">✅ 低风险</Badge>;
    default:
      return <Badge className="bg-[#F3F3F3] text-[#191A23] border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23]">❓ 未知</Badge>;
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
      <Card className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}>
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <AlertTriangle className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">📊 暂无成绩数据</p>
          <p className="text-[#191A23]/70 font-medium">请先导入学生成绩数据进行异常检测</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 🎨 Positivus风格标题和控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                  🔍 {title}
                </CardTitle>
                <p className="text-white/90 font-medium mt-1">
                  检测 {stats.totalStudents} 名学生在 {subjects.length} 个科目中的异常表现
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-[#B9FF66] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wide">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {stats.totalAnomalies} 个异常
              </Badge>
              <Button 
                onClick={handleExportData}
                className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
              >
                <Download className="h-4 w-4 mr-2" />
                导出报告
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 🎨 Positivus风格分析说明 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
        <CardHeader className="bg-[#9C88FF] border-b-2 border-black py-4">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Info className="h-4 w-4 text-white" />
            </div>
            📊 异常检测说明
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#9C88FF]/10 border-2 border-[#9C88FF] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">🔬 检测方法</p>
              <p className="text-sm text-[#191A23]/80">基于Z分数统计方法，识别偏离正常范围的成绩</p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">📏 异常阈值</p>
              <p className="text-sm text-[#191A23]/80">Z分数绝对值 &gt; 2.5 为异常，&gt; 3.0 为极端异常</p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">⚠️ 风险等级</p>
              <p className="text-sm text-[#191A23]/80">高风险需要立即关注，中风险建议跟进</p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">💡 应用建议</p>
              <p className="text-sm text-[#191A23]/80">结合学生具体情况分析，避免单纯依赖数据判断</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🎨 Positivus风格统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#9C88FF]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.totalStudents}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">👥 总学生数</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.affectedStudents}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">🔍 异常学生数</div>
            <div className="text-xs font-medium text-[#191A23]/70 mt-1">({stats.affectedRate.toFixed(1)}%)</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.highRiskCount}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">🚨 高风险异常</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.mediumRiskCount}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">⚠️ 中风险异常</div>
          </CardContent>
        </Card>
      </div>

      {/* 🎨 Positivus风格科目异常统计 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            📊 各科目异常统计
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAnomalies}>
                <CartesianGrid strokeDasharray="3 3" stroke="#191A23" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="subject" 
                  stroke="#191A23" 
                  fontSize={12} 
                  fontWeight="bold"
                />
                <YAxis 
                  stroke="#191A23" 
                  fontSize={12} 
                  fontWeight="bold"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #191A23',
                    borderRadius: '8px',
                    boxShadow: '4px 4px 0px 0px #191A23',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'anomalies' ? `${value} 个异常` : `${value} 名学生`,
                    name === 'anomalies' ? '异常数量' : '学生总数'
                  ]}
                />
                <Legend 
                  wrapperStyle={{ fontWeight: 'bold', color: '#191A23' }}
                />
                <Bar 
                  dataKey="anomalies" 
                  fill="#B9FF66" 
                  name="异常数量" 
                  stroke="#191A23" 
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="students" 
                  fill="#B9FF66" 
                  name="学生总数" 
                  stroke="#191A23" 
                  strokeWidth={2}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 🎨 Positivus风格异常详情列表 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#9C88FF]">
        <CardHeader className="bg-[#9C88FF] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Eye className="h-5 w-5 text-white" />
            </div>
            🔍 异常详情列表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {anomalies.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-[#9C88FF] rounded-full border-2 border-black mx-auto mb-6 w-fit">
                  <AlertTriangle className="h-12 w-12 text-white" />
                </div>
                <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">✅ 未检测到异常成绩</p>
                <p className="text-[#191A23]/70 font-medium">所有学生成绩都在正常范围内</p>
              </div>
            ) : (
              anomalies.map((anomaly, index) => {
                const style = getAnomalyStyle(anomaly.anomaly_type, anomaly.severity);
                const IconComponent = style.icon;
                
                return (
                  <Card key={index} className={`${style.border} ${style.cardStyle} transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]`}>
                    <CardContent className={`p-4 ${style.bg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full border-2 border-black ${
                            anomaly.anomaly_type === 'outlier_high' ? 'bg-[#B9FF66]' :
                            anomaly.anomaly_type === 'outlier_low' ? 'bg-[#B9FF66]' :
                            anomaly.anomaly_type === 'sudden_rise' ? 'bg-[#B9FF66]' :
                            anomaly.anomaly_type === 'sudden_drop' ? 'bg-[#B9FF66]' :
                            'bg-[#9C88FF]'
                          }`}>
                            <IconComponent className={`w-5 h-5 ${
                              anomaly.anomaly_type === 'outlier_low' || anomaly.anomaly_type === 'sudden_drop' ? 'text-white' : 'text-[#191A23]'
                            }`} />
                          </div>
                          <div>
                            <p className="font-black text-[#191A23] text-lg">
                              {anomaly.name} ({anomaly.student_id})
                            </p>
                            <p className="text-sm font-medium text-[#191A23]/80">
                              {anomaly.class_name} • {anomaly.subject} • 
                              实际: <span className="font-bold text-[#B9FF66]">{anomaly.score}分</span> • 预期: <span className="font-bold text-[#9C88FF]">{anomaly.expected_score.toFixed(1)}分</span>
                            </p>
                            <p className="text-sm font-medium text-[#191A23] mt-2 leading-relaxed">
                              📝 {anomaly.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-black text-[#191A23] px-3 py-1 bg-white rounded-lg border-2 border-black">
                              Z分数: {anomaly.z_score.toFixed(2)}
                            </div>
                            <div className="text-xs font-bold text-[#191A23]/70 mt-1">
                              偏差: {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}分
                            </div>
                          </div>
                          {getSeverityBadge(anomaly.severity)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 🎨 Positivus风格建议和行动指南 */}
      {stats.totalAnomalies > 0 && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
              <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                <Users className="h-5 w-5 text-white" />
              </div>
              💡 建议和行动指南
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {stats.highRiskCount > 0 && (
                <Card className="border-2 border-[#B9FF66] shadow-[4px_4px_0px_0px_#B9FF66]">
                  <CardContent className="p-4 bg-[#B9FF66]/20">
                    <p className="font-black text-[#191A23] text-lg mb-2">
                      🚨 高风险异常 ({stats.highRiskCount} 个)
                    </p>
                    <p className="font-medium text-[#191A23] leading-relaxed">
                      建议立即与相关学生和家长沟通，了解具体情况，制定针对性的帮扶措施。
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {stats.mediumRiskCount > 0 && (
                <Card className="border-2 border-[#B9FF66] shadow-[4px_4px_0px_0px_#B9FF66]">
                  <CardContent className="p-4 bg-[#B9FF66]/20">
                    <p className="font-black text-[#191A23] text-lg mb-2">
                      ⚠️ 中风险异常 ({stats.mediumRiskCount} 个)
                    </p>
                    <p className="font-medium text-[#191A23] leading-relaxed">
                      建议持续关注这些学生的学习状态，适时提供额外的学习支持和指导。
                    </p>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border-2 border-[#9C88FF] shadow-[4px_4px_0px_0px_#9C88FF]">
                <CardContent className="p-4 bg-[#9C88FF]/20">
                  <p className="font-black text-[#191A23] text-lg mb-3">
                    💡 总体建议
                  </p>
                  <div className="space-y-2">
                    <div className="p-2 bg-white border border-[#9C88FF] rounded-lg">
                      <p className="text-sm font-medium text-[#191A23]">• 结合学生平时表现和学习态度综合分析</p>
                    </div>
                    <div className="p-2 bg-white border border-[#9C88FF] rounded-lg">
                      <p className="text-sm font-medium text-[#191A23]">• 关注是否存在考试作弊或数据录入错误</p>
                    </div>
                    <div className="p-2 bg-white border border-[#9C88FF] rounded-lg">
                      <p className="text-sm font-medium text-[#191A23]">• 对于成绩突然提升的学生，了解学习方法的改进</p>
                    </div>
                    <div className="p-2 bg-white border border-[#9C88FF] rounded-lg">
                      <p className="text-sm font-medium text-[#191A23]">• 对于成绩下降的学生，及时提供学习帮助</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(AnomalyDetectionAnalysis); 