import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { TrendingUp, Users, Award, Target } from 'lucide-react';

interface GradeRecord {
  id: string;
  student_id: string;
  name: string;
  class_name?: string;
  subject?: string;
  score?: number;
  total_score?: number;
  grade?: string;
}

interface BasicGradeStatsProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

export const BasicGradeStats: React.FC<BasicGradeStatsProps> = ({
  gradeData,
  title = "成绩统计",
  className = ""
}) => {
  // 计算基础统计数据
  const stats = useMemo(() => {
    if (!gradeData || gradeData.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        passRate: 0,
        excellentRate: 0,
        scoreDistribution: [],
        classStats: [],
        subjectStats: []
      };
    }

    const validScores = gradeData
      .filter(record => record.score && !isNaN(Number(record.score)))
      .map(record => Number(record.score));

    if (validScores.length === 0) {
      return {
        totalStudents: gradeData.length,
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        passRate: 0,
        excellentRate: 0,
        scoreDistribution: [],
        classStats: [],
        subjectStats: []
      };
    }

    const totalStudents = gradeData.length;
    const averageScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    const maxScore = Math.max(...validScores);
    const minScore = Math.min(...validScores);
    
    const passCount = validScores.filter(score => score >= 60).length;
    const excellentCount = validScores.filter(score => score >= 90).length;
    const passRate = (passCount / validScores.length) * 100;
    const excellentRate = (excellentCount / validScores.length) * 100;

    // 分数段分布
    const scoreDistribution = [
      { range: '90-100', count: validScores.filter(s => s >= 90).length, color: '#10B981' },
      { range: '80-89', count: validScores.filter(s => s >= 80 && s < 90).length, color: '#3B82F6' },
      { range: '70-79', count: validScores.filter(s => s >= 70 && s < 80).length, color: '#F59E0B' },
      { range: '60-69', count: validScores.filter(s => s >= 60 && s < 70).length, color: '#EF4444' },
      { range: '0-59', count: validScores.filter(s => s < 60).length, color: '#6B7280' }
    ];

    // 班级统计
    const classGroups = gradeData.reduce((acc, record) => {
      const className = record.class_name || '未知班级';
      if (!acc[className]) {
        acc[className] = [];
      }
      if (record.score && !isNaN(Number(record.score))) {
        acc[className].push(Number(record.score));
      }
      return acc;
    }, {} as Record<string, number[]>);

    const classStats = Object.entries(classGroups).map(([className, scores]) => ({
      className,
      count: scores.length,
      average: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      passRate: scores.length > 0 ? (scores.filter(s => s >= 60).length / scores.length) * 100 : 0
    })).sort((a, b) => b.average - a.average);

    // 科目统计
    const subjectGroups = gradeData.reduce((acc, record) => {
      const subject = record.subject || '总分';
      if (!acc[subject]) {
        acc[subject] = [];
      }
      if (record.score && !isNaN(Number(record.score))) {
        acc[subject].push(Number(record.score));
      }
      return acc;
    }, {} as Record<string, number[]>);

    const subjectStats = Object.entries(subjectGroups).map(([subject, scores]) => ({
      subject,
      count: scores.length,
      average: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      passRate: scores.length > 0 ? (scores.filter(s => s >= 60).length / scores.length) * 100 : 0
    })).sort((a, b) => b.average - a.average);

    return {
      totalStudents,
      averageScore,
      maxScore,
      minScore,
      passRate,
      excellentRate,
      scoreDistribution,
      classStats,
      subjectStats
    };
  }, [gradeData]);

  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <p>暂无成绩数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题 */}
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-gray-600">共 {stats.totalStudents} 名学生</p>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">总人数</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalStudents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">平均分</p>
                <p className="text-2xl font-bold text-green-600">{stats.averageScore.toFixed(1)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">及格率</p>
                <p className="text-2xl font-bold text-orange-600">{stats.passRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">优秀率</p>
                <p className="text-2xl font-bold text-purple-600">{stats.excellentRate.toFixed(1)}%</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 分数分布图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>分数段分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>分数段占比</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.scoreDistribution.filter(item => item.count > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count }) => `${range}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 班级统计 */}
      {stats.classStats.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>班级表现排名</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.classStats.slice(0, 5).map((classData, index) => (
                <div key={classData.className} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={index === 0 ? "default" : "secondary"}>
                      #{index + 1}
                    </Badge>
                    <span className="font-medium">{classData.className}</span>
                    <span className="text-sm text-gray-600">({classData.count}人)</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold">{classData.average.toFixed(1)}分</p>
                      <p className="text-sm text-gray-600">及格率 {classData.passRate.toFixed(1)}%</p>
                    </div>
                    <Progress value={classData.passRate} className="w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 科目统计 */}
      {stats.subjectStats.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>科目表现分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.subjectStats.map((subjectData, index) => (
                <div key={subjectData.subject} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{subjectData.subject}</span>
                    <span className="text-sm text-gray-600">({subjectData.count}人次)</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-semibold">{subjectData.average.toFixed(1)}分</p>
                      <p className="text-sm text-gray-600">及格率 {subjectData.passRate.toFixed(1)}%</p>
                    </div>
                    <Progress value={subjectData.passRate} className="w-20" />
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