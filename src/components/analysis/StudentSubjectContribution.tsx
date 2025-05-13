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
import { Loader2, TrendingUp, TrendingDown, Search, User, Download } from "lucide-react";

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

// 辅助函数：生成随机学生数据
const generateMockStudentData = (): StudentData[] => {
  const students: StudentData[] = [];
  const classNames = ["高一(1)班", "高一(2)班", "高二(1)班", "高二(2)班", "高三(1)班"];
  const subjects = ["语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理", "政治"];
  
  // 生成模拟学生数据
  for (let i = 0; i < 50; i++) {
    const studentId = `S${10000 + i}`;
    const studentName = `学生${i + 1}`;
    const className = classNames[Math.floor(Math.random() * classNames.length)];
    
    // 为每个学生生成各科目表现
    const subjectPerformances: SubjectPerformance[] = [];
    let totalContribution = 0;
    const strengthSubjects: string[] = [];
    const weakSubjects: string[] = [];
    
    subjects.forEach(subject => {
      // 生成基础分数，保证各科目有差异
      let baseScore = 65 + Math.random() * 25; // 基础分在65-90之间
      
      // 模拟学生在不同科目的偏好，每个学生有1-2个强项，1-2个弱项
      const isStrength = Math.random() < 0.2; // 20%概率是强项
      const isWeak = !isStrength && Math.random() < 0.25; // 25%概率是弱项(如果不是强项)
      
      if (isStrength) {
        baseScore += 10 + Math.random() * 10; // 强项加10-20分
        baseScore = Math.min(baseScore, 100); // 最高100分
        strengthSubjects.push(subject);
      } else if (isWeak) {
        baseScore -= 10 + Math.random() * 15; // 弱项减10-25分
        baseScore = Math.max(baseScore, 40); // 最低40分
        weakSubjects.push(subject);
      }
      
      const score = Math.round(baseScore);
      const avgScore = Math.round(70 + Math.random() * 10); // 班级平均分在70-80之间
      const maxScore = Math.min(avgScore + 10 + Math.random() * 10, 100); // 班级最高分
      
      // 计算与平均分差距
      const gap = score - avgScore;
      const gapPercentage = Math.round((gap / avgScore) * 100);
      
      // 计算贡献度得分 (-5到5)
      // 贡献度算法：根据分数与平均分的差距计算，差距越大贡献度越高/低
      let contribution = 0;
      if (gap > 0) {
        // 正贡献
        contribution = Math.min(Math.round((gap / 20) * 5), 5); // 高出20分为满分贡献5分
      } else {
        // 负贡献
        contribution = Math.max(Math.round((gap / 20) * 5), -5); // 低于20分为最低贡献-5分
      }
      
      totalContribution += contribution;
      
      // 确定表现级别
      let performanceLevel = "一般";
      if (score >= maxScore - 5) {
        performanceLevel = "优秀";
      } else if (score >= avgScore + 10) {
        performanceLevel = "良好";
      } else if (score >= avgScore - 5) {
        performanceLevel = "一般";
      } else if (score >= avgScore - 15) {
        performanceLevel = "较弱";
      } else {
        performanceLevel = "待提高";
      }
      
      // 生成提升建议
      let suggestion = "";
      if (performanceLevel === "优秀") {
        suggestion = "保持优势，建议参加竞赛或担任科目组长";
      } else if (performanceLevel === "良好") {
        suggestion = "有潜力提升，建议强化复习巩固知识点";
      } else if (performanceLevel === "一般") {
        suggestion = "需要更多练习，重点关注基础知识掌握";
      } else if (performanceLevel === "较弱") {
        suggestion = "建议增加学习时间，针对性补习基础内容";
      } else {
        suggestion = "需要特别关注，建议制定专项辅导计划";
      }
      
      subjectPerformances.push({
        subject,
        score,
        avgScore,
        maxScore,
        contribution,
        performanceLevel,
        gap,
        gapPercentage,
        suggestion
      });
    });
    
    students.push({
      id: studentId,
      name: studentName,
      className,
      subjects: subjectPerformances,
      totalContribution,
      strengthSubjects,
      weakSubjects
    });
  }
  
  return students;
};

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

const StudentSubjectContribution: React.FC<StudentSubjectContributionProps> = ({ examId, studentId }) => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("bar");
  
  // 加载数据
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // 生成模拟数据
        const mockStudents = generateMockStudentData();
        setStudents(mockStudents);
        
        // 如果提供了studentId，则选中该学生
        if (studentId) {
          const foundStudent = mockStudents.find(s => s.id === studentId);
          if (foundStudent) {
            setSelectedStudent(foundStudent);
          } else {
            setSelectedStudent(mockStudents[0]);
          }
        } else {
          // 默认选择第一个学生
          setSelectedStudent(mockStudents[0]);
        }
      } catch (error) {
        console.error("获取学生科目贡献度数据失败:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [examId, studentId]);
  
  // 处理学生选择变更
  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
    }
  };
  
  // 过滤学生列表
  const filteredStudents = students.filter(student => 
    student.name.includes(searchQuery) || 
    student.id.includes(searchQuery)
  );
  
  // 准备雷达图数据
  const prepareRadarData = (studentData: StudentData | null) => {
    if (!studentData) return [];
    
    return studentData.subjects.map(subject => ({
      subject: subject.subject,
      score: subject.score,
      average: subject.avgScore,
      fullMark: 100
    }));
  };
  
  // 准备柱状图数据
  const prepareBarData = (studentData: StudentData | null) => {
    if (!studentData) return [];
    
    return studentData.subjects.map(subject => ({
      subject: subject.subject,
      score: subject.score,
      average: subject.avgScore,
      gap: subject.gap,
      contribution: subject.contribution
    }));
  };
  
  // 下载学生分析报告
  const handleDownloadReport = () => {
    if (!selectedStudent) return;
    
    // 实际应用中应该生成PDF或Excel报告
    console.log("导出学生分析报告", selectedStudent);
    alert(`${selectedStudent.name} 的优劣势分析报告已导出`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>学生科目贡献度分析</CardTitle>
        <CardDescription>
          分析学生在各科目的表现差异，识别优势与薄弱科目
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="md:w-1/3">
            <label className="block text-sm font-medium mb-1 text-gray-700">搜索学生</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="输入学生姓名或学号搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="md:w-2/3">
            <label className="block text-sm font-medium mb-1 text-gray-700">选择学生</label>
            <Select 
              value={selectedStudent?.id || ""}
              onValueChange={handleStudentChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择学生" />
              </SelectTrigger>
              <SelectContent>
                {filteredStudents.map(student => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} ({student.className})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
              <p className="text-sm text-gray-500">加载学生贡献度数据中...</p>
            </div>
          </div>
        ) : selectedStudent ? (
          <div className="space-y-6">
            {/* 学生基本信息 */}
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 mb-3 md:mb-0">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                    <p className="text-sm text-gray-500">{selectedStudent.id} | {selectedStudent.className}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">总体贡献度:</span>
                    <span className={`font-bold ${selectedStudent.totalContribution > 0 ? "text-green-600" : "text-red-600"}`}>
                      {selectedStudent.totalContribution > 0 ? "+" : ""}{selectedStudent.totalContribution}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-8"
                      onClick={handleDownloadReport}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      导出分析报告
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 优劣势科目总结 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    优势科目
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.strengthSubjects.length > 0 ? (
                      selectedStudent.strengthSubjects.map((subject, index) => (
                        <Badge key={index} className="bg-green-100 text-green-800 border-green-300">
                          {subject}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">暂无明显优势科目</p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    薄弱科目
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.weakSubjects.length > 0 ? (
                      selectedStudent.weakSubjects.map((subject, index) => (
                        <Badge key={index} className="bg-red-100 text-red-800 border-red-300">
                          {subject}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">暂无明显薄弱科目</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* 图表显示 */}
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
              <TabsList>
                <TabsTrigger value="bar">柱状图视图</TabsTrigger>
                <TabsTrigger value="radar">雷达图视图</TabsTrigger>
                <TabsTrigger value="table">表格视图</TabsTrigger>
              </TabsList>
              
              <TabsContent value="bar" className="mt-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareBarData(selectedStudent)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="subject" 
                        angle={-45} 
                        textAnchor="end"
                        height={70} 
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" name="学生分数" fill="#8884d8" />
                      <Bar dataKey="average" name="班级平均" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="radar" className="mt-4">
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={120} data={prepareRadarData(selectedStudent)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="学生分数"
                        dataKey="score"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                      <Radar
                        name="班级平均"
                        dataKey="average"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="table" className="mt-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>科目</TableHead>
                        <TableHead>学生分数</TableHead>
                        <TableHead>班级平均</TableHead>
                        <TableHead>差距</TableHead>
                        <TableHead>贡献度</TableHead>
                        <TableHead>表现级别</TableHead>
                        <TableHead>建议</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStudent.subjects.map((subject, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{subject.subject}</TableCell>
                          <TableCell>{subject.score}</TableCell>
                          <TableCell>{subject.avgScore}</TableCell>
                          <TableCell className={subject.gap >= 0 ? "text-green-600" : "text-red-600"}>
                            {subject.gap > 0 ? "+" : ""}{subject.gap} ({subject.gapPercentage}%)
                          </TableCell>
                          <TableCell className={getContributionColorClass(subject.contribution)}>
                            {subject.contribution > 0 ? "+" : ""}{subject.contribution}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={getPerformanceLevelClass(subject.performanceLevel)}
                            >
                              {subject.performanceLevel}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-xs text-gray-600 truncate" title={subject.suggestion}>
                              {subject.suggestion}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 text-gray-500">
            请选择一个学生进行分析
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentSubjectContribution; 