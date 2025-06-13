import React, { useMemo, memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChartPie,
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Target,
  Info,
  Download,
  Filter,
  Grid,
  Layers
} from 'lucide-react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter
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

interface CrossAnalysisProps {
  gradeData: GradeRecord[];
  title?: string;
  className?: string;
}

interface ClassSubjectPerformance {
  class_name: string;
  subject: string;
  average: number;
  count: number;
  max: number;
  min: number;
  stdDev: number;
}

// 计算标准差
const calculateStandardDeviation = (values: number[], mean: number): number => {
  if (values.length <= 1) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
};

// 计算班级-科目交叉分析数据
const calculateClassSubjectAnalysis = (gradeData: GradeRecord[]): ClassSubjectPerformance[] => {
  const classSubjectGroups = gradeData.reduce((acc, record) => {
    if (!record.class_name || !record.subject || !record.score || isNaN(Number(record.score))) return acc;
    
    const key = `${record.class_name}-${record.subject}`;
    if (!acc[key]) {
      acc[key] = {
        class_name: record.class_name,
        subject: record.subject,
        scores: []
      };
    }
    acc[key].scores.push(Number(record.score));
    return acc;
  }, {} as Record<string, { class_name: string; subject: string; scores: number[] }>);

  return Object.values(classSubjectGroups).map(group => {
    const scores = group.scores;
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const stdDev = calculateStandardDeviation(scores, average);

    return {
      class_name: group.class_name,
      subject: group.subject,
      average: Number(average.toFixed(2)),
      count: scores.length,
      max,
      min,
      stdDev: Number(stdDev.toFixed(2))
    };
  }).sort((a, b) => b.average - a.average);
};

const CrossAnalysis: React.FC<CrossAnalysisProps> = ({
  gradeData,
  title = "多维交叉分析",
  className = ""
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // 计算分析数据
  const classSubjectData = useMemo(() => calculateClassSubjectAnalysis(gradeData), [gradeData]);

  // 获取可用的班级和科目列表
  const availableClasses = useMemo(() => {
    return Array.from(new Set(gradeData.map(r => r.class_name).filter(Boolean)));
  }, [gradeData]);

  const availableSubjects = useMemo(() => {
    return Array.from(new Set(gradeData.map(r => r.subject).filter(Boolean)));
  }, [gradeData]);

  // 过滤数据
  const filteredClassSubjectData = useMemo(() => {
    return classSubjectData.filter(item => {
      const classMatch = selectedClass === 'all' || item.class_name === selectedClass;
      const subjectMatch = selectedSubject === 'all' || item.subject === selectedSubject;
      return classMatch && subjectMatch;
    });
  }, [classSubjectData, selectedClass, selectedSubject]);

  // 统计数据
  const stats = useMemo(() => {
    const totalClasses = availableClasses.length;
    const totalSubjects = availableSubjects.length;
    const totalStudents = new Set(gradeData.map(r => r.student_id)).size;
    const totalRecords = gradeData.length;
    
    return {
      totalClasses,
      totalSubjects,
      totalStudents,
      totalRecords,
      avgClassSize: totalStudents / totalClasses,
      dataCompleteness: (totalRecords / (totalStudents * totalSubjects)) * 100
    };
  }, [gradeData, availableClasses, availableSubjects]);

  // 导出数据
  const handleExportData = () => {
    const csvContent = [
      ['班级', '科目', '平均分', '学生数', '最高分', '最低分', '标准差'],
      ...filteredClassSubjectData.map(item => [
        item.class_name,
        item.subject,
        item.average.toString(),
        item.count.toString(),
        item.max.toString(),
        item.min.toString(),
        item.stdDev.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '多维交叉分析.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (availableClasses.length === 0 || availableSubjects.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Grid className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-600">暂无足够数据</p>
          <p className="text-sm text-gray-500 mt-1">需要至少2个班级和2个科目的数据进行交叉分析</p>
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
            <Layers className="h-6 w-6 text-blue-600" />
            {title}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            分析 {stats.totalClasses} 个班级、{stats.totalSubjects} 个科目、{stats.totalStudents} 名学生的多维关系
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
          
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="选择科目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有科目</SelectItem>
              {availableSubjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
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
        <AlertTitle>交叉分析说明</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 text-sm">
            <p>• <strong>班级-科目分析</strong>: 展示不同班级在各科目的表现差异</p>
            <p>• <strong>数据完整度</strong>: 当前数据覆盖率为 {stats.dataCompleteness.toFixed(1)}%</p>
            <p>• <strong>应用建议</strong>: 识别教学重点，优化资源配置，实现精准教学</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalClasses}</div>
            <div className="text-sm text-gray-600">班级数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalSubjects}</div>
            <div className="text-sm text-gray-600">科目数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalStudents}</div>
            <div className="text-sm text-gray-600">学生数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalRecords}</div>
            <div className="text-sm text-gray-600">成绩记录</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.avgClassSize.toFixed(1)}</div>
            <div className="text-sm text-gray-600">平均班级规模</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">{stats.dataCompleteness.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">数据完整度</div>
          </CardContent>
        </Card>
      </div>

      {/* 班级-科目表现图表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            班级-科目平均分对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredClassSubjectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="subject" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value}分`,
                    name === 'average' ? '平均分' : name
                  ]}
                  labelFormatter={(label) => `科目: ${label}`}
                />
                <Legend />
                <Bar dataKey="average" fill="#3b82f6" name="平均分" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 班级-科目详细数据表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid className="h-5 w-5" />
            详细数据表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-2 text-left">班级</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">科目</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">平均分</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">学生数</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">最高分</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">最低分</th>
                  <th className="border border-gray-200 px-4 py-2 text-right">标准差</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassSubjectData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">{item.class_name}</td>
                    <td className="border border-gray-200 px-4 py-2">{item.subject}</td>
                    <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                      {item.average}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-right">{item.count}</td>
                    <td className="border border-gray-200 px-4 py-2 text-right text-green-600">
                      {item.max}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-right text-red-600">
                      {item.min}
                    </td>
                    <td className="border border-gray-200 px-4 py-2 text-right">
                      {item.stdDev}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 分析洞察 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            分析洞察
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 最佳表现班级-科目组合 */}
            {filteredClassSubjectData.length > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="font-medium text-green-800">
                  🏆 最佳表现: {filteredClassSubjectData[0].class_name} - {filteredClassSubjectData[0].subject}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  平均分: {filteredClassSubjectData[0].average}分，学生数: {filteredClassSubjectData[0].count}人
                </p>
              </div>
            )}
            
            {/* 需要关注的班级-科目组合 */}
            {filteredClassSubjectData.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-800">
                  ⚠️ 需要关注: {filteredClassSubjectData[filteredClassSubjectData.length - 1].class_name} - {filteredClassSubjectData[filteredClassSubjectData.length - 1].subject}
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  平均分: {filteredClassSubjectData[filteredClassSubjectData.length - 1].average}分，建议加强教学支持
                </p>
              </div>
            )}
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-800">
                💡 教学建议
              </p>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• 关注平均分较低的班级-科目组合，分析原因并制定改进措施</li>
                <li>• 学习优秀班级的教学经验，推广有效的教学方法</li>
                <li>• 注意标准差较大的组合，可能存在学生水平差异较大的情况</li>
                <li>• 定期进行交叉分析，跟踪教学效果的变化趋势</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(CrossAnalysis); 