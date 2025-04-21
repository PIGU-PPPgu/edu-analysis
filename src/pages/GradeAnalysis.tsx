
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
import Navbar from "../components/analysis/Navbar";

interface GradeData {
  studentId: string;
  name: string;
  score: number;
  subject: string;
}

const GradeAnalysis: React.FC = () => {
  const { toast } = useToast();
  const [gradeData, setGradeData] = useState<GradeData[]>([]);
  const [isDataUploaded, setIsDataUploaded] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // 假设上传的是CSV文件，格式为: 学号,姓名,分数,科目
        const csvData = e.target?.result as string;
        const rows = csvData.split('\n');
        const parsedData: GradeData[] = [];

        for (let i = 1; i < rows.length; i++) { // 跳过标题行
          const row = rows[i].trim();
          if (row) {
            const [studentId, name, scoreStr, subject] = row.split(',');
            const score = parseFloat(scoreStr);
            
            if (!isNaN(score)) {
              parsedData.push({
                studentId,
                name,
                score,
                subject
              });
            }
          }
        }

        setGradeData(parsedData);
        setIsDataUploaded(true);
        toast({
          title: "数据导入成功",
          description: `成功导入 ${parsedData.length} 条成绩记录`,
        });
        
        // 重置文件输入以允许上传相同文件
        setFileInputKey(Date.now());
      } catch (error) {
        console.error("解析文件时出错:", error);
        toast({
          title: "数据导入失败",
          description: "文件格式不正确，请确保上传CSV格式文件",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
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

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">成绩智能分析平台</h1>
            <div className="flex gap-4">
              <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-5 py-3 rounded-[14px]">
                上传成绩数据
                <Input 
                  type="file" 
                  key={fileInputKey}
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
              
              <Button 
                className="bg-[#191A23] text-white hover:bg-[#2d2e3d]"
                disabled={!isDataUploaded}
                onClick={() => {
                  toast({
                    title: "数据已导出",
                    description: "分析报告已成功导出为PDF格式",
                  });
                }}
              >
                导出分析报告
              </Button>
            </div>
          </div>

          {!isDataUploaded ? (
            <div className="flex flex-col items-center justify-center bg-[#F3F3F3] rounded-[45px] p-20 text-center">
              <img 
                src="https://cdn.builder.io/api/v1/image/assets/TEMP/4fe1208f8c09d90ba2c1f91b4ef04b843588e53e?placeholderIfAbsent=true" 
                alt="Upload illustration" 
                className="w-48 h-48 mb-6" 
              />
              <h2 className="text-2xl font-medium mb-3">开始您的成绩分析</h2>
              <p className="text-lg text-gray-600 max-w-lg mb-6">
                上传成绩数据CSV文件，系统将自动分析并生成各类图表。
                文件格式：学号,姓名,分数,科目
              </p>
              <label className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors cursor-pointer px-5 py-3 rounded-[14px]">
                点击上传文件
                <Input 
                  type="file" 
                  key={fileInputKey + 1}
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </label>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="distributions">分数分布</TabsTrigger>
                <TabsTrigger value="subjects">科目分析</TabsTrigger>
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
                            <TableHead className="text-right">分数</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {gradeData.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.studentId}</TableCell>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.subject}</TableCell>
                              <TableCell className="text-right font-medium">
                                {item.score}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradeAnalysis;
