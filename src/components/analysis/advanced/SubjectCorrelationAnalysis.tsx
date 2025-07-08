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

// 获取Positivus风格相关性颜色
const getCorrelationColor = (correlation: number, significance: string) => {
  if (significance === 'none') return 'bg-[#F3F3F3] text-[#191A23] border-2 border-black';
  
  const intensity = Math.abs(correlation);
  if (correlation > 0) {
    if (intensity >= 0.7) return 'bg-[#B9FF66] text-[#191A23] border-2 border-black font-black';
    if (intensity >= 0.4) return 'bg-[#B9FF66]/70 text-[#191A23] border-2 border-black font-bold';
    return 'bg-[#B9FF66]/40 text-[#191A23] border-2 border-black font-medium';
  } else {
    if (intensity >= 0.7) return 'bg-[#FF6B6B] text-white border-2 border-black font-black';
    if (intensity >= 0.4) return 'bg-[#FF6B6B]/70 text-white border-2 border-black font-bold';
    return 'bg-[#FF6B6B]/40 text-[#191A23] border-2 border-black font-medium';
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
      <Card className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#F7931E] ${className}`}>
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <Grid className="h-16 w-16 text-black" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">数据不足</p>
          <p className="text-[#6B7280] font-medium">需要至少2个科目的成绩数据进行相关性分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Positivus风格标题和控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <Grid className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-black uppercase tracking-wide">
                  {title}
                </CardTitle>
                <p className="text-black font-medium mt-1">
                  分析 {subjects.length} 个科目间的相关性 | {correlations.length} 个科目对 | 平均相关性 {averageCorrelation.toFixed(3)}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wide">
                <TrendingUp className="h-4 w-4 mr-2" />
                强相关 {strongCorrelations.length} 对
              </Badge>
              <Button 
                onClick={handleExportData}
                className="border-2 border-black bg-[#B9FF66] hover:bg-[#A8E055] text-[#191A23] font-bold shadow-[4px_4px_0px_0px_#191A23] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#191A23] transition-all uppercase tracking-wide"
              >
                <Download className="h-4 w-4 mr-2" />
                导出数据
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Positivus风格分析说明 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-4">
          <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <Info className="h-4 w-4 text-white" />
            </div>
            相关性分析说明
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">相关系数范围</p>
              <p className="text-sm text-[#6B7280]">-1 到 1，绝对值越大相关性越强</p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">正相关含义</p>
              <p className="text-sm text-[#6B7280]">一个科目分数高，另一个科目分数也倾向于高</p>
            </div>
            <div className="p-4 bg-[#6B7280]/10 border-2 border-[#6B7280] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">负相关含义</p>
              <p className="text-sm text-[#6B7280]">一个科目分数高，另一个科目分数倾向于低</p>
            </div>
            <div className="p-4 bg-[#6B7280]/10 border-2 border-[#6B7280] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">显著性标准</p>
              <p className="text-sm text-[#6B7280]">基于p值判断，p&lt;0.05为显著相关</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{subjects.length}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">分析科目数</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{correlations.length}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">科目对数量</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{strongCorrelations.length}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">强相关对数</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{averageCorrelation.toFixed(3)}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">平均相关性</div>
          </CardContent>
        </Card>
      </div>

      {/* Positivus风格相关性矩阵 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-black font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            科目相关性矩阵
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {correlations.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
                  <Grid className="h-12 w-12 text-black" />
                </div>
                <p className="text-xl font-black text-[#191A23] uppercase tracking-wide mb-2">暂无相关性数据</p>
                <p className="text-[#6B7280] font-medium">需要至少3名学生在两个科目都有成绩</p>
              </div>
            ) : (
              correlations.map((corr, index) => (
                <Card key={index} className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full border-2 border-black ${
                          corr.correlation > 0.1 ? 'bg-[#B9FF66]' :
                          corr.correlation < -0.1 ? 'bg-[#6B7280]' :
                          'bg-white'
                        }`}>
                          {corr.correlation > 0.1 ? (
                            <TrendingUp className="w-5 h-5 text-[#191A23]" />
                          ) : corr.correlation < -0.1 ? (
                            <TrendingDown className="w-5 h-5 text-white" />
                          ) : (
                            <Minus className="w-5 h-5 text-[#191A23]" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-[#191A23] text-lg">
                            {corr.subject1} ↔ {corr.subject2}
                          </p>
                          <p className="text-sm font-medium text-[#6B7280]">
                            样本量: {corr.sampleSize} 名学生 | p值: {corr.pValue.toFixed(4)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-lg text-lg font-black shadow-[2px_2px_0px_0px_#191A23] ${getCorrelationColor(corr.correlation, corr.significance)}`}>
                          {corr.correlation.toFixed(3)}
                        </div>
                        <Badge className={`font-bold shadow-[2px_2px_0px_0px_#191A23] border-2 border-black ${
                          corr.significance === 'high' ? 'bg-[#B9FF66] text-[#191A23]' :
                          corr.significance === 'medium' ? 'bg-[#6B7280] text-white' :
                          corr.significance === 'low' ? 'bg-[#6B7280] text-white' : 'bg-[#6B7280] text-white'
                        }`}>
                          {corr.significance === 'high' ? '强相关' :
                           corr.significance === 'medium' ? '中等相关' :
                           corr.significance === 'low' ? '弱相关' : '无显著相关'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* 分析洞察 */}
      {strongCorrelations.length > 0 && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
              <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              关键发现与洞察
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {strongCorrelations.slice(0, 3).map((corr, index) => (
                <Card key={index} className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66]">
                  <CardContent className="p-4 bg-[#B9FF66]/20">
                    <p className="font-black text-[#191A23] text-lg mb-2">
                      {corr.subject1} 与 {corr.subject2} 存在强{corr.correlation > 0 ? '正' : '负'}相关
                    </p>
                    <p className="font-medium text-[#191A23] leading-relaxed">
                      相关系数: <span className="font-black text-[#B9FF66]">{corr.correlation.toFixed(3)}</span> | 
                      这意味着学生在 <span className="font-bold">{corr.subject1}</span> 上的表现与 <span className="font-bold">{corr.subject2}</span> 上的表现
                      <span className="font-black">{corr.correlation > 0 ? '呈正向关联' : '呈反向关联'}</span>
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(SubjectCorrelationAnalysis); 