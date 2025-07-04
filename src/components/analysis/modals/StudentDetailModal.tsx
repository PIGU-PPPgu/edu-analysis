/**
 * 🎯 学生详细信息模态框
 * 显示学生的详细成绩信息和分析
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
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
  BarChart,
  Bar
} from 'recharts';
import {
  User,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  BookOpen,
  Calendar,
  Download,
  X
} from 'lucide-react';

import type { GradeRecord } from '@/contexts/ModernGradeAnalysisContext';

interface StudentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  studentGrades: GradeRecord[];
  allGrades: GradeRecord[];
}

// 计算学生统计信息
const calculateStudentStats = (grades: GradeRecord[]) => {
  if (grades.length === 0) return null;

  const scores = grades.map(g => g.score || g.total_score).filter(Boolean) as number[];
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const passCount = scores.filter(score => score >= 60).length;
  const excellentCount = scores.filter(score => score >= 90).length;

  // 科目表现
  const subjectPerformance = grades.reduce((acc, grade) => {
    if (!grade.subject || !grade.score) return acc;
    
    if (!acc[grade.subject]) {
      acc[grade.subject] = { scores: [], count: 0 };
    }
    acc[grade.subject].scores.push(grade.score);
    acc[grade.subject].count++;
    return acc;
  }, {} as Record<string, { scores: number[]; count: number }>);

  const subjectStats = Object.entries(subjectPerformance).map(([subject, data]) => ({
    subject,
    avgScore: data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length,
    maxScore: Math.max(...data.scores),
    minScore: Math.min(...data.scores),
    count: data.count
  }));

  return {
    avgScore: Math.round(avgScore * 10) / 10,
    maxScore,
    minScore,
    totalExams: grades.length,
    passRate: Math.round((passCount / scores.length) * 100),
    excellentRate: Math.round((excellentCount / scores.length) * 100),
    subjectStats
  };
};

// 计算趋势数据
const calculateTrendData = (grades: GradeRecord[]) => {
  return grades
    .filter(g => g.exam_date && (g.score || g.total_score))
    .sort((a, b) => new Date(a.exam_date!).getTime() - new Date(b.exam_date!).getTime())
    .map(grade => ({
      examDate: new Date(grade.exam_date!).toLocaleDateString('zh-CN'),
      score: grade.score || grade.total_score,
      subject: grade.subject,
      examTitle: grade.exam_title
    }));
};

// 获取成绩等级和颜色
const getGradeLevel = (score: number) => {
  if (score >= 90) return { level: '优秀', color: 'bg-green-100 text-green-800' };
  if (score >= 80) return { level: '良好', color: 'bg-blue-100 text-blue-800' };
  if (score >= 70) return { level: '中等', color: 'bg-yellow-100 text-yellow-800' };
  if (score >= 60) return { level: '及格', color: 'bg-orange-100 text-orange-800' };
  return { level: '不及格', color: 'bg-red-100 text-red-800' };
};

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  open,
  onOpenChange,
  studentId,
  studentName,
  studentGrades,
  allGrades
}) => {
  const studentStats = useMemo(() => calculateStudentStats(studentGrades), [studentGrades]);
  const trendData = useMemo(() => calculateTrendData(studentGrades), [studentGrades]);

  // 雷达图数据
  const radarData = useMemo(() => {
    if (!studentStats) return [];
    
    return studentStats.subjectStats.map(stat => ({
      subject: stat.subject,
      score: stat.avgScore,
      fullMark: 100
    }));
  }, [studentStats]);

  // 导出学生报告
  const handleExportReport = () => {
    const reportData = {
      学生信息: {
        学号: studentId,
        姓名: studentName,
        统计时间: new Date().toLocaleString('zh-CN')
      },
      成绩统计: studentStats,
      详细成绩: studentGrades.map(grade => ({
        考试: grade.exam_title,
        科目: grade.subject,
        分数: grade.score || grade.total_score,
        等级: grade.grade,
        班级排名: grade.rank_in_class,
        年级排名: grade.rank_in_grade,
        考试日期: grade.exam_date
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { 
      type: 'application/json;charset=utf-8;' 
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${studentName}_成绩报告_${new Date().toLocaleDateString('zh-CN')}.json`;
    link.click();
  };

  if (!studentStats) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>学生详情</DialogTitle>
            <DialogDescription>暂无该学生的成绩数据</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-blue-100">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                {studentName} 
                <Badge variant="outline" className="ml-2">{studentId}</Badge>
              </DialogTitle>
              <DialogDescription className="mt-2">
                详细成绩分析与表现评估
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="w-4 h-4 mr-2" />
                导出报告
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">平均分</p>
                  <p className="text-xl font-bold text-blue-900">{studentStats.avgScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-700">最高分</p>
                  <p className="text-xl font-bold text-green-900">{studentStats.maxScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-700">及格率</p>
                  <p className="text-xl font-bold text-purple-900">{studentStats.passRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-700">考试次数</p>
                  <p className="text-xl font-bold text-orange-900">{studentStats.totalExams}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="trends">成绩趋势</TabsTrigger>
            <TabsTrigger value="subjects">科目分析</TabsTrigger>
            <TabsTrigger value="details">详细记录</TabsTrigger>
          </TabsList>

          {/* 总览 */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 科目雷达图 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-600" />
                    科目能力雷达图
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tick={{ fontSize: 10 }}
                      />
                      <Radar
                        name="成绩"
                        dataKey="score"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 科目表现排名 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    科目表现排名
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {studentStats.subjectStats
                      .sort((a, b) => b.avgScore - a.avgScore)
                      .map((stat, index) => {
                        const gradeLevel = getGradeLevel(stat.avgScore);
                        return (
                          <div key={stat.subject} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{stat.subject}</p>
                                <p className="text-sm text-gray-600">{stat.count} 次考试</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{stat.avgScore.toFixed(1)}</p>
                              <Badge className={`text-xs ${gradeLevel.color}`}>
                                {gradeLevel.level}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 成绩趋势 */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  成绩变化趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      dataKey="examDate" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 shadow-lg rounded-lg border">
                              <p className="font-medium">{label}</p>
                              <p className="text-blue-600">
                                分数: {payload[0].value}
                              </p>
                              <p className="text-gray-600 text-sm">
                                科目: {payload[0].payload.subject}
                              </p>
                              <p className="text-gray-600 text-sm">
                                考试: {payload[0].payload.examTitle}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 科目分析 */}
          <TabsContent value="subjects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-600" />
                  各科目表现对比
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={studentStats.subjectStats}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar 
                      dataKey="avgScore" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 详细记录 */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  详细成绩记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-3 font-medium">考试</th>
                        <th className="text-left p-3 font-medium">科目</th>
                        <th className="text-right p-3 font-medium">分数</th>
                        <th className="text-left p-3 font-medium">等级</th>
                        <th className="text-right p-3 font-medium">班级排名</th>
                        <th className="text-left p-3 font-medium">日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentGrades.map((grade, index) => {
                        const score = grade.score || grade.total_score;
                        const gradeLevel = score ? getGradeLevel(score) : null;
                        
                        return (
                          <tr 
                            key={grade.id} 
                            className={`border-b border-gray-100 hover:bg-gray-50 ${
                              index % 2 === 0 ? 'bg-gray-25' : ''
                            }`}
                          >
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{grade.exam_title}</p>
                                <p className="text-xs text-gray-500">{grade.exam_type}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs">
                                {grade.subject}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-lg font-semibold">{score || '-'}</span>
                            </td>
                            <td className="p-3">
                              {gradeLevel && (
                                <Badge className={`text-xs ${gradeLevel.color}`}>
                                  {gradeLevel.level}
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {grade.rank_in_class ? `第${grade.rank_in_class}名` : '-'}
                            </td>
                            <td className="p-3 text-gray-600">
                              {grade.exam_date ? 
                                new Date(grade.exam_date).toLocaleDateString('zh-CN') : 
                                '-'
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailModal;