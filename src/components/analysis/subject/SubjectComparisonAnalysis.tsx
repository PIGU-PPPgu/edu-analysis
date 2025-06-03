import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGradeAnalysis } from '@/contexts/GradeAnalysisContext';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  LineChart,
  Line
} from 'recharts';

interface SubjectStats {
  name: string;
  averageScore: number;
  maxScore: number;
  minScore: number;
  standardDeviation: number;
  passRate: number;
  excellentRate: number;
  recordCount: number;
}

interface CorrelationData {
  subjectA: string;
  subjectB: string;
  correlation: number;
  strength: 'weak' | 'moderate' | 'strong';
}

const SubjectComparisonAnalysis: React.FC = () => {
  const { gradeData } = useGradeAnalysis();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState<'performance' | 'correlation' | 'distribution'>('performance');

  // 提取所有科目
  const subjects = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return [];
    
    const subjectSet = new Set<string>();
    gradeData.forEach(item => {
      if (item.subject) {
        subjectSet.add(item.subject);
      }
    });
    
    return Array.from(subjectSet).sort();
  }, [gradeData]);

  // 计算每个科目的统计数据
  const subjectStats: SubjectStats[] = useMemo(() => {
    if (!gradeData || gradeData.length === 0) return [];
    
    return subjects.map(subject => {
      const subjectData = gradeData.filter(item => item.subject === subject);
      
      if (subjectData.length === 0) {
        return {
          name: subject,
          averageScore: 0,
          maxScore: 0,
          minScore: 0,
          standardDeviation: 0,
          passRate: 0,
          excellentRate: 0,
          recordCount: 0
        };
      }
      
      const scores = subjectData.map(item => item.score);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      
      // 计算标准差
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - averageScore, 2), 0) / scores.length;
      const standardDeviation = Math.sqrt(variance);
      
      // 计算通过率和优秀率
      const passCount = scores.filter(score => score >= 60).length;
      const excellentCount = scores.filter(score => score >= 90).length;
      const passRate = (passCount / scores.length) * 100;
      const excellentRate = (excellentCount / scores.length) * 100;
      
      return {
        name: subject,
        averageScore,
        maxScore,
        minScore,
        standardDeviation,
        passRate,
        excellentRate,
        recordCount: subjectData.length
      };
    });
  }, [gradeData, subjects]);

  // 计算科目间相关性
  const correlationData: CorrelationData[] = useMemo(() => {
    if (!gradeData || gradeData.length === 0 || subjects.length < 2) return [];
    
    const correlations: CorrelationData[] = [];
    
    // 获取每个学生在各科目的成绩
    const studentScores = new Map<string, Map<string, number>>();
    
    gradeData.forEach(item => {
      if (!item.student_id || !item.subject) return;
      
      if (!studentScores.has(item.student_id)) {
        studentScores.set(item.student_id, new Map());
      }
      
      studentScores.get(item.student_id)!.set(item.subject, item.score);
    });
    
    // 计算每对科目之间的相关性
    for (let i = 0; i < subjects.length; i++) {
      for (let j = i + 1; j < subjects.length; j++) {
        const subjectA = subjects[i];
        const subjectB = subjects[j];
        
        // 获取同时有这两个科目成绩的学生
        const commonStudents: Array<{ scoreA: number; scoreB: number }> = [];
        
        studentScores.forEach((subjectMap, studentId) => {
          if (subjectMap.has(subjectA) && subjectMap.has(subjectB)) {
            commonStudents.push({
              scoreA: subjectMap.get(subjectA)!,
              scoreB: subjectMap.get(subjectB)!
            });
          }
        });
        
        if (commonStudents.length < 3) continue; // 需要至少3个数据点
        
        // 计算皮尔逊相关系数
        const n = commonStudents.length;
        const sumA = commonStudents.reduce((sum, item) => sum + item.scoreA, 0);
        const sumB = commonStudents.reduce((sum, item) => sum + item.scoreB, 0);
        const sumAB = commonStudents.reduce((sum, item) => sum + item.scoreA * item.scoreB, 0);
        const sumA2 = commonStudents.reduce((sum, item) => sum + item.scoreA * item.scoreA, 0);
        const sumB2 = commonStudents.reduce((sum, item) => sum + item.scoreB * item.scoreB, 0);
        
        const numerator = n * sumAB - sumA * sumB;
        const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
        
        if (denominator === 0) continue;
        
        const correlation = numerator / denominator;
        
        // 判断相关性强度
        let strength: 'weak' | 'moderate' | 'strong';
        const absCorr = Math.abs(correlation);
        if (absCorr >= 0.7) strength = 'strong';
        else if (absCorr >= 0.4) strength = 'moderate';
        else strength = 'weak';
        
        correlations.push({
          subjectA,
          subjectB,
          correlation,
          strength
        });
      }
    }
    
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [gradeData, subjects]);

  // 雷达图数据（用于选中科目的对比）
  const radarData = useMemo(() => {
    if (selectedSubjects.length === 0) return [];
    
    const metrics = ['平均分', '及格率', '优秀率', '最高分', '稳定性'];
    
    return metrics.map(metric => {
      const point: any = { metric };
      
      selectedSubjects.forEach(subject => {
        const stats = subjectStats.find(s => s.name === subject);
        if (stats) {
          switch (metric) {
            case '平均分':
              point[subject] = stats.averageScore;
              break;
            case '及格率':
              point[subject] = stats.passRate;
              break;
            case '优秀率':
              point[subject] = stats.excellentRate;
              break;
            case '最高分':
              point[subject] = stats.maxScore;
              break;
            case '稳定性':
              // 稳定性用标准差的倒数表示，标准差越小稳定性越高
              point[subject] = Math.max(0, 100 - stats.standardDeviation * 2);
              break;
          }
        }
      });
      
      return point;
    });
  }, [selectedSubjects, subjectStats]);

  // 处理科目选择
  const handleSubjectToggle = (subject: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        return prev.filter(s => s !== subject);
      } else if (prev.length < 5) { // 最多选择5个科目进行对比
        return [...prev, subject];
      }
      return prev;
    });
  };

  // 获取相关性强度的颜色
  const getCorrelationColor = (strength: string, correlation: number) => {
    const isPositive = correlation > 0;
    switch (strength) {
      case 'strong':
        return isPositive ? 'bg-green-500' : 'bg-red-500';
      case 'moderate':
        return isPositive ? 'bg-blue-500' : 'bg-orange-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <CardHeader>
          <CardTitle>学科对比分析控制面板</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* 分析类型选择 */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">分析类型：</label>
              <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="performance">性能对比</SelectItem>
                  <SelectItem value="correlation">相关性分析</SelectItem>
                  <SelectItem value="distribution">分布分析</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* 科目选择 */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                选择科目进行对比 (最多5个)：
              </label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(subject => (
                  <Button
                    key={subject}
                    variant={selectedSubjects.includes(subject) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSubjectToggle(subject)}
                    disabled={!selectedSubjects.includes(subject) && selectedSubjects.length >= 5}
                  >
                    {subject}
                    {selectedSubjects.includes(subject) && (
                      <span className="ml-1">✓</span>
                    )}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                已选择 {selectedSubjects.length}/5 个科目
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 科目统计概览 */}
      <Card>
        <CardHeader>
          <CardTitle>科目统计概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">科目</th>
                  <th className="text-center p-2">记录数</th>
                  <th className="text-center p-2">平均分</th>
                  <th className="text-center p-2">最高分</th>
                  <th className="text-center p-2">最低分</th>
                  <th className="text-center p-2">标准差</th>
                  <th className="text-center p-2">及格率</th>
                  <th className="text-center p-2">优秀率</th>
                </tr>
              </thead>
              <tbody>
                {subjectStats.map((stats, index) => (
                  <tr key={stats.name} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="p-2 font-medium">{stats.name}</td>
                    <td className="text-center p-2">{stats.recordCount}</td>
                    <td className="text-center p-2">{stats.averageScore.toFixed(1)}</td>
                    <td className="text-center p-2">{stats.maxScore}</td>
                    <td className="text-center p-2">{stats.minScore}</td>
                    <td className="text-center p-2">{stats.standardDeviation.toFixed(1)}</td>
                    <td className="text-center p-2">{stats.passRate.toFixed(1)}%</td>
                    <td className="text-center p-2">{stats.excellentRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 根据分析类型显示不同的图表 */}
      {analysisType === 'performance' && selectedSubjects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 雷达图 */}
          <Card>
            <CardHeader>
              <CardTitle>多维度性能对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={0} domain={[0, 100]} />
                    {selectedSubjects.map((subject, index) => (
                      <Radar
                        key={subject}
                        name={subject}
                        dataKey={subject}
                        stroke={`hsl(${(index * 137.5) % 360}, 70%, 50%)`}
                        fill={`hsl(${(index * 137.5) % 360}, 70%, 50%)`}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 平均分对比 */}
          <Card>
            <CardHeader>
              <CardTitle>平均分对比</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectStats.filter(s => selectedSubjects.includes(s.name))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="averageScore" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 相关性分析 */}
      {analysisType === 'correlation' && correlationData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>科目间相关性分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {correlationData.slice(0, 10).map((corr, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getCorrelationColor(corr.strength, corr.correlation)} text-white`}>
                      {corr.strength === 'strong' ? '强' : 
                       corr.strength === 'moderate' ? '中' : '弱'}
                    </Badge>
                    <span className="font-medium">
                      {corr.subjectA} ↔ {corr.subjectB}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {corr.correlation > 0 ? '+' : ''}{corr.correlation.toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {corr.correlation > 0 ? '正相关' : '负相关'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 分布分析 */}
      {analysisType === 'distribution' && selectedSubjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>成绩分布对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectStats.filter(s => selectedSubjects.includes(s.name))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="passRate" fill="#82ca9d" name="及格率 (%)" />
                  <Bar dataKey="excellentRate" fill="#8884d8" name="优秀率 (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubjectComparisonAnalysis; 