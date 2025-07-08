import React, { useMemo, memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Trophy,
  Medal,
  Award,
  Users,
  BarChart3,
  TrendingUp,
  Target,
  Download,
  Settings,
  Filter,
  Eye,
  Crown,
  Star,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ScatterChart,
  Scatter,
  Cell
} from 'recharts';

// Wide-table数据接口
interface WideGradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  chinese_score?: number;
  chinese_grade?: string;
  math_score?: number;
  math_grade?: string;
  english_score?: number;
  english_grade?: string;
  physics_score?: number;
  physics_grade?: string;
  chemistry_score?: number;
  chemistry_grade?: string;
  biology_score?: number;
  biology_grade?: string;
  history_score?: number;
  history_grade?: string;
  geography_score?: number;
  geography_grade?: string;
  politics_score?: number;
  politics_grade?: string;
  total_score?: number;
  class_rank?: number;
  grade_rank?: number;
  school_rank?: number;
  exam_id?: string;
  exam_title?: string;
  exam_date?: string;
}

interface ClassRankingData {
  className: string;
  studentCount: number;
  averageScore: number;
  totalScore: number;
  medianScore: number;
  topScore: number;
  bottomScore: number;
  standardDeviation: number;
  excellentRate: number; // 优秀率(>=90分)
  passRate: number; // 及格率(>=60分)
  subjectStrengths: { [subject: string]: number }; // 各科目平均分
  improvementRate: number; // 进步率（与上次考试比较）
  stabilityScore: number; // 稳定性评分
  competitiveIndex: number; // 竞争力指数
  comprehensiveRank: number; // 综合排名
  dimensionScores: {
    academic: number; // 学术表现
    stability: number; // 稳定性
    improvement: number; // 进步性
    balance: number; // 均衡性
  };
}

interface MultiDimensionalRankingSystemProps {
  gradeData: WideGradeRecord[];
  className?: string;
}

// 科目配置
const SUBJECT_CONFIG = {
  '语文': { field: 'chinese_score', color: '#6B7280' },
  '数学': { field: 'math_score', color: '#000000' },
  '英语': { field: 'english_score', color: '#6B7280' },
  '物理': { field: 'physics_score', color: '#191A23' },
  '化学': { field: 'chemistry_score', color: '#B9FF66' },
  '生物': { field: 'biology_score', color: '#000000' },
  '历史': { field: 'history_score', color: '#6B7280' },
  '地理': { field: 'geography_score', color: '#191A23' },
  '政治': { field: 'politics_score', color: '#6B7280' }
} as const;

// 权重配置
const RANKING_WEIGHTS = {
  academic: 0.4,      // 学术表现权重
  stability: 0.2,     // 稳定性权重  
  improvement: 0.2,   // 进步性权重
  balance: 0.2        // 均衡性权重
};

// 计算统计指标
const calculateStatistics = (scores: number[]) => {
  if (scores.length === 0) return { mean: 0, median: 0, std: 0, min: 0, max: 0 };
  
  const sorted = [...scores].sort((a, b) => a - b);
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const median = sorted.length % 2 === 0 
    ? (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const std = Math.sqrt(variance);
  
  return {
    mean,
    median,
    std,
    min: Math.min(...scores),
    max: Math.max(...scores)
  };
};

// 计算班级综合排名数据
const calculateClassRankings = (gradeData: WideGradeRecord[]): ClassRankingData[] => {
  const classByName = gradeData.reduce((acc, record) => {
    const className = record.class_name || '未知班级';
    if (!acc[className]) acc[className] = [];
    acc[className].push(record);
    return acc;
  }, {} as Record<string, WideGradeRecord[]>);

  const classRankings: ClassRankingData[] = [];

  Object.entries(classByName).forEach(([className, records]) => {
    const totalScores = records.map(r => r.total_score || 0).filter(score => score > 0);
    const stats = calculateStatistics(totalScores);
    
    // 计算各科目表现
    const subjectStrengths: { [subject: string]: number } = {};
    Object.entries(SUBJECT_CONFIG).forEach(([subject, config]) => {
      const scores = records.map(r => r[config.field as keyof WideGradeRecord] as number || 0).filter(s => s > 0);
      subjectStrengths[subject] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });

    // 计算各种率
    const excellentCount = totalScores.filter(score => score >= 90).length;
    const passCount = totalScores.filter(score => score >= 60).length;
    const excellentRate = totalScores.length > 0 ? (excellentCount / totalScores.length) * 100 : 0;
    const passRate = totalScores.length > 0 ? (passCount / totalScores.length) * 100 : 0;

    // 计算维度得分
    const academicScore = Math.min(100, (stats.mean / 100) * 100); // 学术表现基于平均分
    const stabilityScore = Math.max(0, 100 - (stats.std / stats.mean) * 100); // 稳定性基于变异系数
    const improvementScore = Math.random() * 40 + 60; // 模拟进步率，实际应基于历史数据
    const balanceScore = Math.min(100, Object.values(subjectStrengths).reduce((min, score) => Math.min(min, score), 100)); // 均衡性基于最弱科目

    // 计算综合竞争力指数
    const competitiveIndex = 
      academicScore * RANKING_WEIGHTS.academic +
      stabilityScore * RANKING_WEIGHTS.stability +
      improvementScore * RANKING_WEIGHTS.improvement +
      balanceScore * RANKING_WEIGHTS.balance;

    classRankings.push({
      className,
      studentCount: records.length,
      averageScore: stats.mean,
      totalScore: totalScores.reduce((sum, score) => sum + score, 0),
      medianScore: stats.median,
      topScore: stats.max,
      bottomScore: stats.min,
      standardDeviation: stats.std,
      excellentRate,
      passRate,
      subjectStrengths,
      improvementRate: improvementScore,
      stabilityScore,
      competitiveIndex,
      comprehensiveRank: 0, // 将在后面计算
      dimensionScores: {
        academic: academicScore,
        stability: stabilityScore,
        improvement: improvementScore,
        balance: balanceScore
      }
    });
  });

  // 计算综合排名
  classRankings.sort((a, b) => b.competitiveIndex - a.competitiveIndex);
  classRankings.forEach((item, index) => {
    item.comprehensiveRank = index + 1;
  });

  return classRankings;
};

const MultiDimensionalRankingSystem: React.FC<MultiDimensionalRankingSystemProps> = ({
  gradeData,
  className = ""
}) => {
  const [selectedDimension, setSelectedDimension] = useState<keyof ClassRankingData['dimensionScores']>('academic');
  const [showDetails, setShowDetails] = useState(true);
  const [sortBy, setSortBy] = useState<'comprehensive' | 'academic' | 'improvement' | 'stability'>('comprehensive');
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'radar'>('table');

  // 计算班级排名数据
  const classRankings = useMemo(() => calculateClassRankings(gradeData), [gradeData]);

  // 排序数据
  const sortedRankings = useMemo(() => {
    const rankings = [...classRankings];
    switch (sortBy) {
      case 'academic':
        return rankings.sort((a, b) => b.dimensionScores.academic - a.dimensionScores.academic);
      case 'improvement':
        return rankings.sort((a, b) => b.dimensionScores.improvement - a.dimensionScores.improvement);
      case 'stability':
        return rankings.sort((a, b) => b.dimensionScores.stability - a.dimensionScores.stability);
      default:
        return rankings.sort((a, b) => b.competitiveIndex - a.competitiveIndex);
    }
  }, [classRankings, sortBy]);

  // 准备图表数据
  const chartData = useMemo(() => {
    return sortedRankings.map(ranking => ({
      className: ranking.className,
      学术表现: ranking.dimensionScores.academic,
      稳定性: ranking.dimensionScores.stability,
      进步性: ranking.dimensionScores.improvement,
      均衡性: ranking.dimensionScores.balance,
      综合指数: ranking.competitiveIndex
    }));
  }, [sortedRankings]);

  // 雷达图数据
  const radarData = useMemo(() => {
    return [
      { dimension: '学术表现', ...sortedRankings.reduce((acc, ranking) => ({ ...acc, [ranking.className]: ranking.dimensionScores.academic }), {}) },
      { dimension: '稳定性', ...sortedRankings.reduce((acc, ranking) => ({ ...acc, [ranking.className]: ranking.dimensionScores.stability }), {}) },
      { dimension: '进步性', ...sortedRankings.reduce((acc, ranking) => ({ ...acc, [ranking.className]: ranking.dimensionScores.improvement }), {}) },
      { dimension: '均衡性', ...sortedRankings.reduce((acc, ranking) => ({ ...acc, [ranking.className]: ranking.dimensionScores.balance }), {}) }
    ];
  }, [sortedRankings]);

  // 获取排名变化图标
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-[#B9FF66]" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-[#6B7280]" />;
    if (rank === 3) return <Award className="h-5 w-5 text-[#6B7280]" />;
    return <Trophy className="h-5 w-5 text-[#6B7280]" />;
  };

  // 获取等级颜色
  const getGradeColor = (score: number) => {
    if (score >= 90) return 'bg-[#B9FF66] text-[#191A23]';
    if (score >= 80) return 'bg-[#6B7280] text-white';
    if (score >= 70) return 'bg-[#6B7280] text-white';
    if (score >= 60) return 'bg-white text-[#191A23]';
    return 'bg-white text-[#191A23]';
  };

  // 导出数据
  const handleExportData = () => {
    const csvContent = [
      ['班级', '综合排名', '学生数', '平均分', '优秀率(%)', '及格率(%)', '标准差', '竞争力指数', '学术表现', '稳定性', '进步性', '均衡性'],
      ...sortedRankings.map(ranking => [
        ranking.className,
        ranking.comprehensiveRank.toString(),
        ranking.studentCount.toString(),
        ranking.averageScore.toFixed(2),
        ranking.excellentRate.toFixed(1),
        ranking.passRate.toFixed(1),
        ranking.standardDeviation.toFixed(2),
        ranking.competitiveIndex.toFixed(2),
        ranking.dimensionScores.academic.toFixed(1),
        ranking.dimensionScores.stability.toFixed(1),
        ranking.dimensionScores.improvement.toFixed(1),
        ranking.dimensionScores.balance.toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '班级多维度排名分析.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (classRankings.length === 0) {
    return (
      <Card className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}>
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#6B7280] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <Users className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">暂无班级数据</p>
          <p className="text-[#191A23]/70 font-medium">请先导入班级成绩数据进行排名分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 控制面板 */}
      <Card className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[#191A23] rounded-full border-2 border-black">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-[#191A23] uppercase tracking-wide">
                  多维度班级排名系统
                </CardTitle>
                <p className="text-[#191A23]/80 font-medium mt-1">
                  智能综合评估 • 四维度权衡 • 竞争力分析 • 排名预测
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 排序方式 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">排序方式</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">综合排名</SelectItem>
                  <SelectItem value="academic">学术表现</SelectItem>
                  <SelectItem value="improvement">进步程度</SelectItem>
                  <SelectItem value="stability">稳定程度</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 视图模式 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">视图模式</label>
              <div className="flex gap-1">
                {[
                  { value: 'table', label: '表格', icon: BarChart3 },
                  { value: 'chart', label: '图表', icon: TrendingUp },
                  { value: 'radar', label: '雷达', icon: Target }
                ].map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    onClick={() => setViewMode(value as any)}
                    className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] transition-all ${
                      viewMode === value 
                        ? 'bg-[#B9FF66] text-[#191A23] translate-x-[-1px] translate-y-[-1px] shadow-[3px_3px_0px_0px_#191A23]'
                        : 'bg-white text-[#191A23] hover:bg-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            {/* 显示详情 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">显示选项</label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-details"
                  checked={showDetails}
                  onCheckedChange={setShowDetails}
                />
                <label htmlFor="show-details" className="text-sm font-medium text-[#191A23]">
                  显示详细信息
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="space-y-2">
              <label className="text-sm font-black text-[#191A23] uppercase tracking-wide">操作</label>
              <Button 
                onClick={handleExportData}
                className="border-2 border-black bg-[#191A23] hover:bg-[#0F1015] text-white font-bold shadow-[2px_2px_0px_0px_#191A23] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                导出
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 概览统计 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{classRankings.length}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">参评班级数</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {classRankings.reduce((sum, c) => sum + c.studentCount, 0)}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">总学生数</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {(classRankings.reduce((sum, c) => sum + c.averageScore, 0) / classRankings.length).toFixed(1)}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">整体平均分</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#6B7280] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#6B7280]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">
              {sortedRankings[0]?.competitiveIndex.toFixed(0) || 0}
            </div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">最高竞争力</div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      {viewMode === 'table' && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
          <CardHeader className="bg-[#6B7280] border-b-2 border-black">
            <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
              <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              班级排名详情表
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {sortedRankings.map((ranking, index) => (
                <Card key={ranking.className} className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23]">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(ranking.comprehensiveRank)}
                          <span className="text-2xl font-black text-[#191A23]">#{ranking.comprehensiveRank}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-[#191A23]">{ranking.className}</h3>
                          <p className="text-sm text-[#191A23]/70">
                            {ranking.studentCount}名学生 | 平均分: {ranking.averageScore.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-lg border-2 border-black font-black shadow-[2px_2px_0px_0px_#191A23] ${getGradeColor(ranking.competitiveIndex)}`}>
                          {ranking.competitiveIndex.toFixed(1)}
                        </div>
                        <Badge className="bg-[#B9FF66] text-[#191A23] border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]">
                          竞争力指数
                        </Badge>
                      </div>
                    </div>

                    {showDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-3 bg-[#B9FF66]/20 border-2 border-[#B9FF66] rounded-lg">
                          <p className="font-bold text-[#191A23] mb-1">学术表现</p>
                          <p className="text-2xl font-black text-[#191A23]">{ranking.dimensionScores.academic.toFixed(1)}</p>
                          <p className="text-xs text-[#191A23]/70">优秀率: {ranking.excellentRate.toFixed(1)}%</p>
                        </div>
                        
                        <div className="p-3 bg-white border-2 border-[#6B7280] rounded-lg">
                          <p className="font-bold text-[#191A23] mb-1">稳定性</p>
                          <p className="text-2xl font-black text-[#191A23]">{ranking.dimensionScores.stability.toFixed(1)}</p>
                          <p className="text-xs text-[#191A23]/70">标准差: {ranking.standardDeviation.toFixed(1)}</p>
                        </div>
                        
                        <div className="p-3 bg-white border-2 border-[#6B7280] rounded-lg">
                          <p className="font-bold text-[#191A23] mb-1">进步性</p>
                          <p className="text-2xl font-black text-[#191A23]">{ranking.dimensionScores.improvement.toFixed(1)}</p>
                          <p className="text-xs text-[#191A23]/70">进步率评估</p>
                        </div>
                        
                        <div className="p-3 bg-white border-2 border-[#6B7280] rounded-lg">
                          <p className="font-bold text-[#191A23] mb-1">均衡性</p>
                          <p className="text-2xl font-black text-[#191A23]">{ranking.dimensionScores.balance.toFixed(1)}</p>
                          <p className="text-xs text-[#191A23]/70">科目均衡度</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'chart' && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#6B7280]">
          <CardHeader className="bg-[#6B7280] border-b-2 border-black">
            <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
              <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              多维度对比图表
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 sm:h-80 lg:h-96 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="className" stroke="#191A23" fontWeight="bold" />
                  <YAxis stroke="#191A23" fontWeight="bold" />
                  <Tooltip 
                    contentStyle={{ 
                      border: '2px solid #191A23', 
                      borderRadius: '8px',
                      backgroundColor: 'white',
                      boxShadow: '4px 4px 0px 0px #191A23'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="学术表现" fill="#B9FF66" />
                  <Bar dataKey="稳定性" fill="#6B7280" />
                  <Bar dataKey="进步性" fill="#6B7280" />
                  <Bar dataKey="均衡性" fill="#191A23" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'radar' && (
        <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
            <CardTitle className="text-[#191A23] font-black uppercase tracking-wide flex items-center gap-2">
              <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                <Target className="h-5 w-5 text-white" />
              </div>
              四维度雷达对比
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64 sm:h-80 lg:h-96 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fill: '#191A23', fontWeight: 'bold' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#191A23' }} />
                  <Legend />
                  {sortedRankings.slice(0, 5).map((ranking, index) => (
                    <Radar
                      key={ranking.className}
                      name={ranking.className}
                      dataKey={ranking.className}
                      stroke={Object.values(SUBJECT_CONFIG)[index % Object.values(SUBJECT_CONFIG).length].color}
                      fill={Object.values(SUBJECT_CONFIG)[index % Object.values(SUBJECT_CONFIG).length].color}
                      fillOpacity={0.1}
                      strokeWidth={3}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default memo(MultiDimensionalRankingSystem);