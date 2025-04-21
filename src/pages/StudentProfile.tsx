
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { toast } from "sonner";
import Navbar from "../components/analysis/Navbar";
import AIConnector from "../components/analysis/AIConnector";

interface StudentData {
  studentId: string;
  name: string;
  className?: string;
  age?: number;
  scores: {
    subject: string;
    score: number;
    examDate?: string;
    examType?: string;
  }[];
}

const mockStudentData: StudentData = {
  studentId: "20230001",
  name: "张三",
  className: "一年级(1)班",
  age: 7,
  scores: [
    { subject: "语文", score: 92, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "数学", score: 88, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "英语", score: 76, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "科学", score: 85, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "音乐", score: 96, examDate: "2023-09-01", examType: "期中考试" },
    { subject: "体育", score: 90, examDate: "2023-09-01", examType: "期中考试" },
  ]
};

// 能力维度评估数据
const abilityRadarData = [
  { ability: "阅读理解", value: 85 },
  { ability: "数学运算", value: 90 },
  { ability: "逻辑思维", value: 75 },
  { ability: "记忆能力", value: 95 },
  { ability: "创新思维", value: 65 },
  { ability: "沟通表达", value: 80 },
];

const StudentProfile: React.FC = () => {
  const { toast: uiToast } = useToast();
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  useEffect(() => {
    // 在实际应用中，这里应该从API获取学生数据
    // 这里使用模拟数据
    setStudent(mockStudentData);
  }, [studentId]);

  const handleAIConnect = (apiKey: string, provider: string, enabled: boolean) => {
    setIsAIEnabled(enabled);
    console.log(`AI已连接，使用${provider}，API密钥: ${apiKey.substring(0, 3)}...`);
  };

  const generateAIInsights = () => {
    if (!isAIEnabled) {
      uiToast({
        title: "AI未启用",
        description: "请先在侧边栏连接AI服务",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingInsights(true);

    // 模拟AI分析过程
    setTimeout(() => {
      const mockInsights = `
## 学生优势分析

张三同学表现出对语言类学科的显著优势，语文成绩（92分）处于班级前10%，展示出较强的阅读理解和表达能力。音乐学科成绩（96分）更是突出，显示出艺术方面的天赋。

## 学习短板

英语学科（76分）是相对薄弱环节，低于其他科目平均水平16分，建议增加英语学习时间和针对性训练。创新思维能力评分较低（65分），可以通过开放性问题训练提升。

## 学习建议

1. **针对英语**：建议每天固定15-20分钟的英语听力练习，增强语感
2. **提升创新思维**：鼓励参与开放性问题讨论，定期进行创造性思维训练
3. **发挥优势**：可以鼓励在语文和音乐方面进一步深造，参与相关竞赛活动

## 发展预测

基于当前学习轨迹，预计下学期语文和数学成绩将保持稳定，英语有望提升5-8分。建议关注科学学科的学习状态，防止出现下滑趋势。
      `;

      setAiInsights(mockInsights);
      setIsLoadingInsights(false);
    }, 2000);
  };

  if (!student) {
    return (
      <div className="bg-white min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-10">
          <div className="flex justify-center items-center h-64">
            <p>加载学生数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/grade-analysis">返回成绩分析</Link>
                </Button>
                <h1 className="text-3xl font-bold">学生画像分析</h1>
              </div>
              <p className="text-gray-500 mt-1">
                全方位评估学生学习情况，智能生成个性化学习方案
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{student.name}</CardTitle>
                      <CardDescription>
                        学号: {student.studentId} | 班级: {student.className} | 年龄: {student.age}岁
                      </CardDescription>
                    </div>
                    <Button 
                      className="bg-[#B9FF66] gap-2.5 text-black font-medium hover:bg-[#a8e85c] transition-colors" 
                      onClick={() => uiToast({
                        title: "成功生成报告",
                        description: "学生个人报告已成功生成并导出",
                      })}
                    >
                      导出学生报告
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="mb-6">
                      <TabsTrigger value="overview">成绩概览</TabsTrigger>
                      <TabsTrigger value="ability">能力评估</TabsTrigger>
                      <TabsTrigger value="trends">趋势分析</TabsTrigger>
                      <TabsTrigger value="details">详细数据</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview">
                      <div className="space-y-6">
                        <div className="grid grid-cols-4 gap-4">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-gray-500">平均分</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">
                                {(student.scores.reduce((sum, score) => sum + score.score, 0) / student.scores.length).toFixed(1)}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-gray-500">最高分</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">
                                {Math.max(...student.scores.map(s => s.score))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {student.scores.find(s => s.score === Math.max(...student.scores.map(s => s.score)))?.subject}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-gray-500">最低分</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">
                                {Math.min(...student.scores.map(s => s.score))}
                              </div>
                              <div className="text-xs text-gray-500">
                                {student.scores.find(s => s.score === Math.min(...student.scores.map(s => s.score)))?.subject}
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-gray-500">班级排名</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">5</div>
                              <div className="text-xs text-gray-500">超过90%同学</div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">各科目成绩</CardTitle>
                            <CardDescription>该学生在各学科的得分情况</CardDescription>
                          </CardHeader>
                          <CardContent className="h-72">
                            <ChartContainer config={{
                              score: { color: "#B9FF66" }
                            }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={student.scores}
                                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="subject" />
                                  <YAxis domain={[0, 100]} />
                                  <ChartTooltip />
                                  <Legend />
                                  <Bar dataKey="score" name="分数" fill="#B9FF66" />
                                </BarChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="ability">
                      <div className="space-y-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">学习能力雷达图</CardTitle>
                            <CardDescription>多维度评估学生各方面能力</CardDescription>
                          </CardHeader>
                          <CardContent className="h-80">
                            <ChartContainer config={{
                              score: { color: "#8884d8" }
                            }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={abilityRadarData}>
                                  <PolarGrid />
                                  <PolarAngleAxis dataKey="ability" />
                                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                  <Radar name="能力值" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                  <Tooltip />
                                </RadarChart>
                              </ResponsiveContainer>
                            </ChartContainer>
                          </CardContent>
                        </Card>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">优势能力</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                <li className="flex items-center justify-between">
                                  <span>记忆能力</span>
                                  <span className="font-medium text-green-600">95</span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>数学运算</span>
                                  <span className="font-medium text-green-600">90</span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>阅读理解</span>
                                  <span className="font-medium text-green-600">85</span>
                                </li>
                              </ul>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">提升空间</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                <li className="flex items-center justify-between">
                                  <span>创新思维</span>
                                  <span className="font-medium text-orange-500">65</span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>逻辑思维</span>
                                  <span className="font-medium text-orange-500">75</span>
                                </li>
                                <li className="flex items-center justify-between">
                                  <span>沟通表达</span>
                                  <span className="font-medium text-orange-500">80</span>
                                </li>
                              </ul>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="trends">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">成绩趋势分析</CardTitle>
                          <CardDescription>展示学生近期成绩变化趋势</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center h-60">
                            <p className="text-gray-500">尚无足够的历史数据，请导入更多考试成绩</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="details">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">详细成绩记录</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>科目</TableHead>
                                  <TableHead>分数</TableHead>
                                  <TableHead>考试日期</TableHead>
                                  <TableHead>考试类型</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {student.scores.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.subject}</TableCell>
                                    <TableCell className="font-medium">{item.score}</TableCell>
                                    <TableCell>{item.examDate}</TableCell>
                                    <TableCell>{item.examType}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              <AIConnector onConnect={handleAIConnect} />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI学习分析与建议</CardTitle>
                  <CardDescription>
                    基于学生成绩和能力，AI提供学习建议
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!aiInsights ? (
                    <div className="space-y-4">
                      <p className="text-gray-500 text-sm">
                        点击下方按钮生成AI分析报告，了解学生优势短板和学习建议
                      </p>
                      <Button 
                        className="w-full bg-[#B9FF66] text-black hover:bg-[#a8e85c]"
                        onClick={generateAIInsights}
                        disabled={isLoadingInsights}
                      >
                        {isLoadingInsights ? "分析中..." : "生成AI分析"}
                      </Button>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: aiInsights.replace(/\n/g, '<br/>').replace(/## (.*)/g, '<h3>$1</h3>') }} />
                      <div className="mt-4 pt-4 border-t flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setAiInsights(null)}
                        >
                          重新分析
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => uiToast({
                            title: "已保存",
                            description: "AI分析结果已保存到学生档案",
                          })}
                        >
                          保存分析结果
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">学习计划生成</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" onClick={() => toast("学习计划生成功能即将推出")}>
                    生成个性化学习计划
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
