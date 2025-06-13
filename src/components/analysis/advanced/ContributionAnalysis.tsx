import React, { useMemo, memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users,
  BookOpen,
  Target,
  Info,
  Download,
  Star,
  AlertTriangle,
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

interface ContributionAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

interface StudentContribution {
  student_id: string;
  name: string;
  class_name: string;
  subjects: {
    subject: string;
    score: number;
    classAverage: number;
    contribution: number;
    rank: number;
    percentile: number;
  }[];
  totalContribution: number;
  averageContribution: number;
  strongSubjects: string[];
  weakSubjects: string[];
}

interface ClassSubjectStats {
  class_name: string;
  subject: string;
  average: number;
  count: number;
  students: { student_id: string; score: number }[];
}

const ContributionAnalysis: React.FC<ContributionAnalysisProps> = ({
  gradeData,
  title = "学生科目贡献度分析",
  className = ""
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');

  // 计算班级科目统计数据
  const classSubjectStats = useMemo(() => {
    const stats: Record<string, ClassSubjectStats> = {};
    
    gradeData.forEach(record => {
      if (!record.class_name || !record.subject || !record.score) return;
      
      const key = `${record.class_name}-${record.subject}`;
      if (!stats[key]) {
        stats[key] = {
          class_name: record.class_name,
          subject: record.subject,
          average: 0,
          count: 0,
          students: []
        };
      }
      
      stats[key].students.push({
        student_id: record.student_id,
        score: Number(record.score)
      });
    });
    
    // 计算平均分
    Object.values(stats).forEach(stat => {
      const scores = stat.students.map(s => s.score);
      stat.average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      stat.count = scores.length;
    });
    
    return stats;
  }, [gradeData]);

  // 计算学生贡献度数据
  const studentContributions = useMemo(() => {
    const contributions: Record<string, StudentContribution> = {};
    
    gradeData.forEach(record => {
      if (!record.class_name || !record.subject || !record.score || !record.name) return;
      
      const key = `${record.class_name}-${record.subject}`;
      const classSubjectStat = classSubjectStats[key];
      if (!classSubjectStat) return;
      
      const studentKey = `${record.student_id}-${record.class_name}`;
      if (!contributions[studentKey]) {
        contributions[studentKey] = {
          student_id: record.student_id,
          name: record.name,
          class_name: record.class_name,
          subjects: [],
          totalContribution: 0,
          averageContribution: 0,
          strongSubjects: [],
          weakSubjects: []
        };
      }
      
      const score = Number(record.score);
      const classAverage = classSubjectStat.average;
      const contribution = ((score - classAverage) / classAverage) * 100;
      
      // 计算排名和百分位
      const sortedScores = classSubjectStat.students
        .map(s => s.score)
        .sort((a, b) => b - a);
      const rank = sortedScores.findIndex(s => s <= score) + 1;
      const percentile = ((classSubjectStat.count - rank + 1) / classSubjectStat.count) * 100;
      
      contributions[studentKey].subjects.push({
        subject: record.subject,
        score,
        classAverage,
        contribution: Number(contribution.toFixed(2)),
        rank,
        percentile: Number(percentile.toFixed(1))
      });
    });
    
    // 计算总贡献度和强弱科目
    Object.values(contributions).forEach(student => {
      const totalContribution = student.subjects.reduce((sum, subject) => sum + subject.contribution, 0);
      student.totalContribution = Number(totalContribution.toFixed(2));
      student.averageContribution = Number((totalContribution / student.subjects.length).toFixed(2));
      
      // 识别强弱科目（基于贡献度）
      const sortedSubjects = [...student.subjects].sort((a, b) => b.contribution - a.contribution);
      student.strongSubjects = sortedSubjects.slice(0, 2).map(s => s.subject);
      student.weakSubjects = sortedSubjects.slice(-2).map(s => s.subject);
    });
    
    return Object.values(contributions);
  }, [gradeData, classSubjectStats]);

  // 获取可用的班级和学生列表
  const availableClasses = useMemo(() => {
    return Array.from(new Set(gradeData.map(r => r.class_name).filter(Boolean)));
  }, [gradeData]);

  const availableStudents = useMemo(() => {
    const filtered = selectedClass === 'all' 
      ? studentContributions 
      : studentContributions.filter(s => s.class_name === selectedClass);
    return filtered.map(s => ({ id: s.student_id, name: s.name }));
  }, [studentContributions, selectedClass]);

  // 过滤数据
  const filteredStudents = useMemo(() => {
    let filtered = studentContributions;
    
    if (selectedClass !== 'all') {
      filtered = filtered.filter(s => s.class_name === selectedClass);
    }
    
    if (selectedStudent !== 'all') {
      filtered = filtered.filter(s => s.student_id === selectedStudent);
    }
    
    return filtered.sort((a, b) => b.totalContribution - a.totalContribution);
  }, [studentContributions, selectedClass, selectedStudent]);

  // 统计数据
  const stats = useMemo(() => {
    const totalStudents = filteredStudents.length;
    const topPerformers = filteredStudents.filter(s => s.averageContribution > 10).length;
    const balancedStudents = filteredStudents.filter(s => s.averageContribution >= -10 && s.averageContribution <= 10).length;
    const needsSupport = filteredStudents.filter(s => s.averageContribution < -10).length;
    const avgContribution = totalStudents > 0 
      ? (filteredStudents.reduce((sum, s) => sum + s.averageContribution, 0) / totalStudents).toFixed(1)
      : '0.0';

    return {
      totalStudents,
      topPerformers,
      balancedStudents,
      needsSupport,
      avgContribution
    };
  }, [filteredStudents]);

  const handleExportData = () => {
    const exportData = filteredStudents.map(student => ({
      学号: student.student_id,
      姓名: student.name,
      班级: student.class_name,
      总贡献度: student.totalContribution,
      平均贡献度: student.averageContribution,
      优势科目: student.strongSubjects.join(', '),
      劣势科目: student.weakSubjects.join(', '),
      科目详情: student.subjects.map(s => 
        `${s.subject}: ${s.score}分(${s.contribution > 0 ? '+' : ''}${s.contribution}%)`
      ).join('; ')
    }));

    const csvContent = [
      Object.keys(exportData[0]).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `学生贡献度分析_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 如果没有数据
  if (!gradeData || gradeData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">暂无学生数据</p>
          <p className="text-sm text-gray-500 mt-1">需要学生成绩数据进行贡献度分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 标题和控制面板 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            分析 {stats.totalStudents} 名学生在各科目相对于班级的表现贡献度
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="选择班级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有班级</SelectItem>
              {availableClasses.map(className => (
                <SelectItem key={className} value={className}>{className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="选择学生" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有学生</SelectItem>
              {availableStudents.map(student => (
                <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-1" />
            导出数据
          </Button>
        </div>
      </div>

      {/* 分析说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>贡献度分析说明</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 text-sm">
            <p>• <strong>贡献度计算</strong>: (学生分数 - 班级平均分) / 班级平均分 × 100%</p>
            <p>• <strong>正值</strong>: 表示高于班级平均水平，对班级成绩有正向贡献</p>
            <p>• <strong>负值</strong>: 表示低于班级平均水平，需要重点关注和帮助</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalStudents}</div>
            <div className="text-sm text-gray-600">总学生数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.topPerformers}</div>
            <div className="text-sm text-gray-600">优秀学生</div>
            <div className="text-xs text-gray-500">贡献度&gt;10%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.balancedStudents}</div>
            <div className="text-sm text-gray-600">均衡学生</div>
            <div className="text-xs text-gray-500">-10%≤贡献度≤10%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.needsSupport}</div>
            <div className="text-sm text-gray-600">需要帮助</div>
            <div className="text-xs text-gray-500">贡献度&lt;-10%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.avgContribution}%</div>
            <div className="text-sm text-gray-600">平均贡献度</div>
          </CardContent>
        </Card>
      </div>

      {/* 学生贡献度排行 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            学生总贡献度排行
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredStudents.slice(0, 10).map((student, index) => (
              <div key={`${student.student_id}-${student.class_name}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.class_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={student.totalContribution > 0 ? "default" : "destructive"}>
                    {student.totalContribution > 0 ? '+' : ''}{student.totalContribution}%
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">总贡献度</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 学生详细信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStudents.slice(0, 6).map((student) => (
          <Card key={`${student.student_id}-${student.class_name}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {student.name}
                </div>
                <Badge variant={student.averageContribution > 5 ? "default" : student.averageContribution < -5 ? "destructive" : "secondary"}>
                  {student.averageContribution > 0 ? '+' : ''}{student.averageContribution}%
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                {student.class_name} | 学号: {student.student_id}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 科目贡献度列表 */}
                <div className="space-y-2">
                  {student.subjects.map((subject) => (
                    <div key={subject.subject} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{subject.subject}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {subject.score}分 (班均{subject.classAverage.toFixed(1)})
                        </span>
                        <Badge 
                          variant={subject.contribution > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {subject.contribution > 0 ? '+' : ''}{subject.contribution}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* 优势和劣势科目 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      优势科目
                    </p>
                    <div className="space-y-1">
                      {student.strongSubjects.map(subject => (
                        <Badge key={subject} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      需要提升
                    </p>
                    <div className="space-y-1">
                      {student.weakSubjects.map(subject => (
                        <Badge key={subject} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default memo(ContributionAnalysis); 