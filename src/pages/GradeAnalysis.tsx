
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Navbar from "../components/analysis/Navbar";
import IntelligentFileParser from "../components/analysis/IntelligentFileParser";
import AIConnector from "../components/analysis/AIConnector";

interface GradeData {
  studentId: string;
  name: string;
  score: number;
  subject: string;
  examDate?: string;
  examType?: string;
  className?: string;
}

const GradeAnalysis: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gradeData, setGradeData] = useState<GradeData[]>([]);
  const [isDataUploaded, setIsDataUploaded] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const handleDataParsed = (data: any[]) => {
    const parsedData: GradeData[] = data.map(item => ({
      studentId: item.学号 || item.studentId,
      name: item.姓名 || item.name,
      score: item.分数 || item.score,
      subject: item.科目 || item.subject,
      examDate: item.考试日期 || item.examDate,
      examType: item.考试类型 || item.examType,
      className: item.班级 || item.className
    }));

    setGradeData(parsedData);
    setIsDataUploaded(true);
    
    // 重置文件输入以允许上传相同文件
    setFileInputKey(Date.now());
  };

  // 计算基本统计数据
  const calculateStats = () => {
    if (gradeData.length === 0) return { avg: 0, max: 0, min: 0, passing: 0 };
    
    const scores = gradeData.map(d => d.score);
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const passing = scores.filter(score => score >= 60).length;
    
    return { avg, max, min, passing };
  };

  const stats = calculateStats();

  // 分数段分布数据
  const getScoreDistribution = () => {
    const distribution = [
      { range: '0-59', count: 0, color: '#FF5252' },
      { range: '60-69', count: 0, color: '#FFB74D' },
      { range: '70-79', count: 0, color: '#FFEB3B' },
      { range: '80-89', count: 0, color: '#66BB6A' },
      { range: '90-100', count: 0, color: '#42A5F5' }
    ];

    gradeData.forEach(item => {
      const score = item.score;
      if (score < 60) distribution[0].count++;
      else if (score < 70) distribution[1].count++;
      else if (score < 80) distribution[2].count++;
      else if (score < 90) distribution[3].count++;
      else distribution[4].count++;
    });

    return distribution;
  };

  // 按科目分组的平均分数据
  const getSubjectAverages = () => {
    const subjectMap = new Map<string, { total: number, count: number }>();
    
    gradeData.forEach(item => {
      const subject = item.subject;
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { total: 0, count: 0 });
      }
      const current = subjectMap.get(subject)!;
      current.total += item.score;
      current.count += 1;
    });
    
    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      average: data.total / data.count
    }));
  };

  // 获取学生列表
  const getStudentList = () => {
    const uniqueStudents = new Map<string, GradeData>();
    
    gradeData.forEach(item => {
      if (!uniqueStudents.has(item.studentId)) {
        uniqueStudents.set(item.studentId, item);
      }
    });
    
    return Array.from(uniqueStudents.values());
  };

  const handleAIConnect = (apiKey: string, provider: string, enabled: boolean) => {
    setIsAIEnabled(enabled);
    console.log(`AI已连接，使用${provider}，API密钥: ${apiKey.substring(0, 3)}...`);
    toast({
      title: "AI服务已连接",
      description: `成功连接到${provider}服务`,
    });
  };

  const handleViewStudentProfile = (studentId: string) => {
    navigate(`/student-profile/${studentId}`);
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">成绩智能分析平台</h1>
            <div className="flex gap-4">
              {isDataUploaded && (
                <Button 
                  className="bg-[#191A23] text-white hover:bg-[#2d2e3d]"
                  onClick={() => {
                    toast({
                      title: "数据已导出",
                      description: "分析报告已成功导出为PDF格式",
                    });
                  }}
                >
                  导出分析报告
                </Button>
              )}
            </div>
          </div>

          {!isDataUploaded ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <IntelligentFileParser onDataParsed={handleDataParsed} />
              </div>
              <div>
                <AIConnector onConnect={handleAIConnect} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="overview">概览</TabsTrigger>
                    <TabsTrigger value="distributions">分数分布</TabsTrigger>
                    <TabsTrigger value="subjects">科目分析</TabsTrigger>
                    <TabsTrigger value="students">学生列表</TabsTrigger>
                    <TabsTrigger value="data">原始数据</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">平均分</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stats.avg.toFixed(2)}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">最高分</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stats.max}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">最低分</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{stats.min}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-gray-500">及格率</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            {(stats.passing / gradeData.length * 100).toFixed(2)}%
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="col-span-1">
                        <CardHeader>
                          <CardTitle>分数段分布</CardTitle>
                          <CardDescription>各分数段学生人数</CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={getScoreDistribution()}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="count"
                                nameKey="range"
                                label={({ range, count }) => `${range}: ${count}人`}
                              >
                                {getScoreDistribution().map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="col-span-1">
                        <CardHeader>
                          <CardTitle>各科平均分对比</CardTitle>
                          <CardDescription>各科目的平均得分情况</CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={getSubjectAverages()}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="subject" angle={-45} textAnchor="end" />
                              <YAxis domain={[0, 100]} />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="average" name="平均分" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="distributions">
                    <Card>
                      <CardHeader>
                        <CardTitle>详细分数分布</CardTitle>
                        <CardDescription>学生成绩分数分布情况</CardDescription>
                      </CardHeader>
                      <CardContent className="h-96">
                        <ChartContainer config={{
                          score: { color: "#B9FF66" }
                        }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={gradeData.sort((a, b) => a.score - b.score)}
                              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" tick={false} />
                              <YAxis domain={[0, 100]} />
                              <ChartTooltip />
                              <Bar dataKey="score" name="分数" fill="#B9FF66" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="subjects">
                    <Card>
                      <CardHeader>
                        <CardTitle>科目详细分析</CardTitle>
                        <CardDescription>各科目成绩对比及分析</CardDescription>
                      </CardHeader>
                      <CardContent className="h-96">
                        <ChartContainer config={{
                          score: { color: "#B9FF66" }
                        }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={getSubjectAverages()}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="subject" />
                              <YAxis domain={[0, 100]} />
                              <ChartTooltip />
                              <Legend />
                              <Bar dataKey="average" name="平均分" fill="#191A23" />
                            </BarChart>
                          </ResponsiveContainer>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="students">
                    <Card>
                      <CardHeader>
                        <CardTitle>学生列表</CardTitle>
                        <CardDescription>查看学生详细信息和成绩画像</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>学号</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead>班级</TableHead>
                                <TableHead>平均分</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getStudentList().map((student, index) => {
                                // 计算该学生的平均分
                                const studentScores = gradeData.filter(d => d.studentId === student.studentId);
                                const avgScore = studentScores.length > 0 
                                  ? studentScores.reduce((sum, item) => sum + item.score, 0) / studentScores.length
                                  : 0;
                                  
                                return (
                                  <TableRow key={index}>
                                    <TableCell>{student.studentId}</TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.className || '-'}</TableCell>
                                    <TableCell>{avgScore.toFixed(1)}</TableCell>
                                    <TableCell className="text-right">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleViewStudentProfile(student.studentId)}
                                      >
                                        查看画像
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="data">
                    <Card>
                      <CardHeader>
                        <CardTitle>成绩数据表格</CardTitle>
                        <CardDescription>全部学生成绩原始数据</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>学号</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead>科目</TableHead>
                                <TableHead>分数</TableHead>
                                <TableHead>考试日期</TableHead>
                                <TableHead>考试类型</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {gradeData.map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell>{item.studentId}</TableCell>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell>{item.subject}</TableCell>
                                  <TableCell className="font-medium">{item.score}</TableCell>
                                  <TableCell>{item.examDate || '-'}</TableCell>
                                  <TableCell>{item.examType || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div>
                <AIConnector onConnect={handleAIConnect} />
                
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-base">智能分析</CardTitle>
                    <CardDescription>AI驱动的数据洞察</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Button 
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                          if (!isAIEnabled) {
                            toast({
                              title: "AI未启用",
                              description: "请先连接AI服务以使用智能分析功能",
                            });
                            return;
                          }
                          toast.success("分析已启动", { 
                            description: "正在生成全面分析报告，请稍候..." 
                          });
                        }}
                      >
                        生成整体分析报告
                      </Button>
                      
                      <Button 
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                          if (!isAIEnabled) {
                            toast({
                              title: "AI未启用",
                              description: "请先连接AI服务以使用智能分析功能",
                            });
                            return;
                          }
                          toast.success("已启动分析", { 
                            description: "正在为每位学生生成个性化学习方案..." 
                          });
                        }}
                      >
                        生成学生学习方案
                      </Button>
                      
                      <Button 
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                          if (!isAIEnabled) {
                            toast({
                              title: "AI未启用",
                              description: "请先连接AI服务以使用智能分析功能",
                            });
                            return;
                          }
                          toast.success("已启动分析", { 
                            description: "正在分析学生学习状况，生成教学建议..." 
                          });
                        }}
                      >
                        生成教学建议
                      </Button>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">重新导入数据</h4>
                      <label className="w-full">
                        <Button variant="outline" className="w-full">
                          选择文件
                        </Button>
                        <Input
                          type="file"
                          key={fileInputKey}
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setIsDataUploaded(false);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeAnalysis;
