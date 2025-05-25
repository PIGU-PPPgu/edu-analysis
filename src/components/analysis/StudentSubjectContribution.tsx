import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { Loader2, TrendingUp, TrendingDown, Search, User, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// 学生科目表现类型
interface SubjectPerformance {
  subject: string;            // 科目名称
  score: number;              // 原始分数
  avgScore: number;           // 班级平均分
  maxScore: number;           // 班级最高分
  contribution: number;       // 贡献度分数 (-5 到 5)
  performanceLevel: string;   // 表现级别: "优秀", "良好", "一般", "较弱", "待提高"
  gap: number;                // 与平均分差距
  gapPercentage: number;      // 与平均分差距百分比
  suggestion: string;         // 提升建议
}

interface StudentData {
  id: string;
  name: string;
  className: string;
  subjects: SubjectPerformance[];
  totalContribution: number;  // 总贡献度
  strengthSubjects: string[]; // 优势科目
  weakSubjects: string[];     // 弱势科目
}

interface StudentSubjectContributionProps {
  examId?: string;
  studentId?: string;
}

// 获取贡献度对应的颜色类名
const getContributionColorClass = (value: number): string => {
  if (value >= 4) return "text-green-600 font-bold";
  if (value >= 2) return "text-green-500";
  if (value >= 0) return "text-gray-600";
  if (value >= -2) return "text-orange-500";
  return "text-red-600 font-bold";
};

// 获取表现级别对应的颜色类名
const getPerformanceLevelClass = (level: string): string => {
  switch (level) {
    case "优秀": return "bg-green-100 text-green-800 border-green-300";
    case "良好": return "bg-blue-100 text-blue-800 border-blue-300";
    case "一般": return "bg-gray-100 text-gray-800 border-gray-300";
    case "较弱": return "bg-orange-100 text-orange-800 border-orange-300";
    case "待提高": return "bg-red-100 text-red-800 border-red-300";
    default: return "bg-gray-100 text-gray-800";
  }
};

// 班级数据不完整时的警告组件
const MissingDataWarning = ({ type }: { type: 'class' | 'student' | 'subject' }) => {
  const messages = {
    class: {
      title: "班级数据不完整",
      details: "未找到完整的班级信息，这可能影响分析结果的准确性。请确保导入数据时正确映射了班级字段。"
    },
    student: {
      title: "学生信息缺失",
      details: "无法获取完整的学生信息，请检查数据导入是否成功，以及学生ID是否正确。"
    },
    subject: {
      title: "科目数据不完整",
      details: "未找到完整的科目成绩数据，请检查导入的数据是否包含科目字段和分数。"
    }
  };

  const message = messages[type];

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium text-yellow-800">{message.title}</p>
          <p className="text-sm text-yellow-700 mt-1">{message.details}</p>
        </div>
      </div>
    </div>
  );
};

const StudentSubjectContribution: React.FC<StudentSubjectContributionProps> = ({ examId, studentId }) => {
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Array<{id: string, name: string}>>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(studentId || null);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [barData, setBarData] = useState<any[]>([]);
  
  // 添加刷新状态
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchData = async () => {
    if (!examId || !selectedStudent) {
      setError('请选择考试和学生');
      return;
    }
    
    setLoading(true);
    setError(null);
    setIsRefreshing(true);
    
    try {
      // 获取学科贡献度数据
      const { data, error } = await supabase.functions.invoke('get-student-subject-contribution-data', {
        body: { exam_id: examId, student_id: selectedStudent }
      });
      
      if (error) {
        console.error('获取学生科目贡献度数据失败:', error);
        setError('获取数据失败，请稍后再试');
        return;
      }
      
      if (!data || !data.studentData) {
        setError('未找到学生科目数据');
        setStudentData(null);
        return;
      }
      
      setStudentData(data.studentData);
      
      // 处理雷达图数据
      const radar = prepareRadarData(data.studentData);
      setRadarData(radar);
      
      // 处理柱状图数据
      const bar = prepareBarData(data.studentData);
      setBarData(bar);
      
      // 获取考试的所有学生列表
      if (data.students && data.students.length > 0) {
        setStudents(data.students);
        
        // 如果未设置选中的学生，默认选择第一个
        if (!selectedStudent && data.students.length > 0) {
          setSelectedStudent(data.students[0].id);
        }
      }
    } catch (err) {
      console.error('获取学生科目贡献度数据时出错:', err);
      setError('获取数据时出错');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // 初次加载和ID变化时获取数据
  useEffect(() => {
    if (examId && selectedStudent) {
      fetchData();
    }
  }, [examId, selectedStudent]);
  
  // 手动刷新数据
  const handleRefresh = () => {
    fetchData();
  };
  
  // 切换学生
  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
  };
  
  // 处理图表数据
  const prepareRadarData = (studentData: StudentData | null) => {
    if (!studentData || !studentData.subjects || studentData.subjects.length === 0) {
      return [];
    }
    
    return studentData.subjects.map(subject => ({
      subject: subject.subject,
      contribution: subject.contribution + 5, // 映射到0-10范围
      fullMark: 10
    }));
  };
  
  const prepareBarData = (studentData: StudentData | null) => {
    if (!studentData || !studentData.subjects || studentData.subjects.length === 0) {
      return [];
    }
    
    return studentData.subjects.map(subject => ({
      subject: subject.subject,
      贡献度: subject.contribution,
      与平均分差距: subject.gap,
      fill: subject.contribution > 0 ? '#82ca9d' : '#ff7f7f'
    }));
  };
  
  const handleDownloadReport = () => {
    // 实现报告下载功能...
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-medium">学科贡献度分析</CardTitle>
          <CardDescription>分析各科目对学生总成绩的贡献情况</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          {students.length > 0 && (
            <Select onValueChange={handleStudentChange} value={selectedStudent || undefined}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择学生" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* 添加刷新按钮 */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          
          <Button variant="outline" size="icon" onClick={handleDownloadReport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {loading && !isRefreshing ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
            <p className="text-muted-foreground">{error}</p>
            {error === '未找到学生科目数据' && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleRefresh}
              >
                刷新数据
              </Button>
            )}
          </div>
        ) : !studentData ? (
          <MissingDataWarning type="student" />
        ) : studentData.subjects.length === 0 ? (
          <MissingDataWarning type="subject" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 雷达图 - 学科贡献度 */}
            <div className="h-[300px]">
              <h3 className="text-sm font-medium mb-2">学科贡献度雷达图</h3>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart 
                  cx="50%" 
                  cy="50%" 
                  outerRadius="70%" 
                  data={radarData}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis domain={[0, 10]} axisLine={false} />
                  <Radar
                    name="贡献度"
                    dataKey="contribution"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            {/* 柱状图 - 与平均分差距 */}
            <div className="h-[300px]">
              <h3 className="text-sm font-medium mb-2">各科目与平均分差距</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="与平均分差距" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* 学科贡献表格 */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-sm font-medium mb-2">学科详细分析</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>科目</TableHead>
                      <TableHead>成绩</TableHead>
                      <TableHead>班级平均</TableHead>
                      <TableHead>差距</TableHead>
                      <TableHead>贡献度</TableHead>
                      <TableHead>表现评级</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentData.subjects.map((subject) => (
                      <TableRow key={subject.subject}>
                        <TableCell>{subject.subject}</TableCell>
                        <TableCell>{subject.score}</TableCell>
                        <TableCell>{subject.avgScore.toFixed(1)}</TableCell>
                        <TableCell className={subject.gap > 0 ? "text-green-600" : "text-red-600"}>
                          {subject.gap > 0 ? "+" : ""}{subject.gap.toFixed(1)}
                        </TableCell>
                        <TableCell className={subject.contribution > 0 ? "text-green-600" : "text-red-600"}>
                          {subject.contribution > 0 ? "+" : ""}{subject.contribution.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPerformanceLevelClass(subject.performanceLevel)}>
                            {subject.performanceLevel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
            {/* 优势和薄弱科目建议 */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-green-800">优势学科</CardTitle>
                </CardHeader>
                <CardContent>
                  {studentData.strengthSubjects.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {studentData.strengthSubjects.map(subject => (
                          <Badge key={subject} variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-green-700">
                        这些学科表现优秀，建议保持良好学习状态，可适当分享学习方法给其他同学。
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂未发现显著优势学科</p>
                  )}
                </CardContent>
              </Card>
              
              <Card className="bg-amber-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-800">待提升学科</CardTitle>
                </CardHeader>
                <CardContent>
                  {studentData.weakSubjects.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {studentData.weakSubjects.map(subject => (
                          <Badge key={subject} variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-amber-700">
                        这些学科需要加强，建议增加练习时间，必要时寻求教师辅导或参考优秀同学的学习方法。
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">暂未发现明显薄弱学科</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentSubjectContribution; 