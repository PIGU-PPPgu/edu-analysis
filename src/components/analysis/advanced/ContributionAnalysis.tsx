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
      <Card className={`bg-white border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] ${className}`}>
        <CardContent className="p-12 text-center">
          <div className="p-4 bg-[#B9FF66] rounded-full border-2 border-black mx-auto mb-6 w-fit">
            <Users className="h-16 w-16 text-white" />
          </div>
          <p className="text-2xl font-black text-[#191A23] uppercase tracking-wide mb-3">暂无学生数据</p>
          <p className="text-[#191A23]/70 font-medium">需要学生成绩数据进行贡献度分析</p>
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
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-white uppercase tracking-wide">
                  {title}
                </CardTitle>
                <p className="text-white/90 font-medium mt-1">
                  分析 {stats.totalStudents} 名学生在各科目相对于班级的表现贡献度
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[140px] bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                  <SelectItem value="all">全部班级</SelectItem>
                  {availableClasses.map(className => (
                    <SelectItem key={className} value={className}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#191A23]" />
                        <span className="font-medium">{className}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-[140px] bg-white border-2 border-black font-medium text-[#191A23] focus:border-[#B9FF66] focus:ring-2 focus:ring-[#B9FF66] shadow-[2px_2px_0px_0px_#191A23] transition-all">
                  <SelectValue placeholder=" 选择学生" />
                </SelectTrigger>
                <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#191A23]">
                  <SelectItem value="all">全部学生</SelectItem>
                  {availableStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#191A23]" />
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
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
            贡献度分析说明
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">贡献度计算</p>
              <p className="text-sm text-[#191A23]/80">(学生分数 - 班级平均分) / 班级平均分 × 100%</p>
            </div>
            <div className="p-4 bg-[#B9FF66]/10 border-2 border-[#B9FF66] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">正值含义</p>
              <p className="text-sm text-[#191A23]/80">表示高于班级平均水平，对班级成绩有正向贡献</p>
            </div>
            <div className="p-4 bg-[#FF6B6B]/10 border-2 border-[#FF6B6B] rounded-lg">
              <p className="font-black text-[#191A23] mb-2">负值含义</p>
              <p className="text-sm text-[#191A23]/80">表示低于班级平均水平，需要重点关注和帮助</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.totalStudents}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">总学生数</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.topPerformers}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">优秀学生</div>
            <div className="text-xs font-medium text-[#191A23]/70 mt-1">贡献度&gt;10%</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.balancedStudents}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">均衡学生</div>
            <div className="text-xs font-medium text-[#191A23]/70 mt-1">-10%≤贡献度≤10%</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#FF6B6B] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#FF6B6B]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.needsSupport}</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">需要帮助</div>
            <div className="text-xs font-medium text-[#191A23]/70 mt-1">贡献度&lt;-10%</div>
          </CardContent>
        </Card>
        
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-black text-[#191A23] mb-2">{stats.avgContribution}%</div>
            <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">平均贡献度</div>
          </CardContent>
        </Card>
      </div>

      {/* Positivus风格学生贡献度排行 */}
      <Card className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
          <CardTitle className="text-white font-black uppercase tracking-wide flex items-center gap-2">
            <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            学生总贡献度排行
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredStudents.slice(0, 10).map((student, index) => (
              <Card key={`${student.student_id}-${student.class_name}`} className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#191A23]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black border-2 border-black ${
                        index === 0 ? 'bg-[#B9FF66] text-[#191A23]' : 
                        index === 1 ? 'bg-[#B9FF66] text-white' : 
                        index === 2 ? 'bg-[#B9FF66] text-white' : 
                        'bg-[#F3F3F3] text-[#191A23]'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-black text-[#191A23] text-lg">{student.name}</p>
                        <p className="font-medium text-[#191A23]/70">{student.class_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] text-lg px-4 py-2 ${
                        student.totalContribution > 0 ? 'bg-[#B9FF66] text-[#191A23]' : 'bg-[#FF6B6B] text-white'
                      }`}>
                        {student.totalContribution > 0 ? '+' : ''}{student.totalContribution}%
                      </Badge>
                      <p className="text-xs font-bold text-[#191A23] mt-1 uppercase tracking-wide">总贡献度</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Positivus风格学生详细信息 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStudents.slice(0, 6).map((student) => (
          <Card key={`${student.student_id}-${student.class_name}`} className="border-2 border-black shadow-[6px_6px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#B9FF66]">
            <CardHeader className="bg-[#B9FF66] border-b-2 border-black">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#191A23] rounded-full border-2 border-black">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-white font-black uppercase tracking-wide">{student.name}</span>
                </div>
                <Badge className={`border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23] ${
                  student.averageContribution > 5 ? 'bg-[#B9FF66] text-[#191A23]' : 
                  student.averageContribution < -5 ? 'bg-[#FF6B6B] text-white' : 
                  'bg-[#B9FF66] text-white'
                }`}>
                  {student.averageContribution > 0 ? '+' : ''}{student.averageContribution}%
                </Badge>
              </CardTitle>
              <p className="text-white/90 font-medium">
                {student.class_name} | 学号: {student.student_id}
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* 科目贡献度列表 */}
                <div className="space-y-3">
                  <h4 className="font-black text-[#191A23] uppercase tracking-wide mb-3">科目贡献度详情</h4>
                  {student.subjects.map((subject, index) => (
                    <Card key={`${student.student_id}-${subject.subject}-${index}`} className="border-2 border-black shadow-[2px_2px_0px_0px_#191A23]">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-1 bg-[#B9FF66] rounded border border-black">
                              <BookOpen className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-[#191A23]">{subject.subject}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-[#191A23]">
                              {subject.score}分 <span className="text-[#191A23]/60">(班均{subject.classAverage.toFixed(1)})</span>
                            </span>
                            <Badge className={`border-2 border-black font-bold shadow-[1px_1px_0px_0px_#191A23] ${
                              subject.contribution > 0 ? 'bg-[#B9FF66] text-[#191A23]' : 'bg-[#FF6B6B] text-white'
                            }`}>
                              {subject.contribution > 0 ? '+' : ''}{subject.contribution}%
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* 优势和劣势科目 */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-2 border-black shadow-[2px_2px_0px_0px_#B9FF66]">
                    <CardHeader className="bg-[#B9FF66] border-b-2 border-black py-2">
                      <CardTitle className="text-xs font-black text-[#191A23] uppercase tracking-wide flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        优势科目
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {student.strongSubjects.map((subject, index) => (
                          <Badge key={`${student.student_id}-strong-${subject}-${index}`} className="bg-[#B9FF66] text-[#191A23] border border-black font-bold text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2 border-black shadow-[2px_2px_0px_0px_#FF6B6B]">
                    <CardHeader className="bg-[#FF6B6B] border-b-2 border-black py-2">
                      <CardTitle className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        需要提升
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {student.weakSubjects.map((subject, index) => (
                          <Badge key={`${student.student_id}-weak-${subject}-${index}`} className="bg-[#FF6B6B] text-white border border-black font-bold text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
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