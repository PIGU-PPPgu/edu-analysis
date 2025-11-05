import React from "react";
import {
  Brain,
  BarChart,
  LineChart,
  ArrowUp,
  ArrowDown,
  Clock,
  BookOpen,
  Target,
  Star,
  Lightbulb,
  Users,
  FileQuestion,
  FilePlus2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AIAnalysisProps {
  homeworkData: any;
}

const AIAnalysisPanel: React.FC<AIAnalysisProps> = ({ homeworkData }) => {
  // 这部分会根据实际数据结构调整，目前使用模拟数据
  const submissions = homeworkData?.submissions || [];
  const totalStudents = homeworkData?.classes?.student_count || 0;
  const submissionCount = submissions.length;
  const completionRate = totalStudents
    ? Math.round((submissionCount / totalStudents) * 100)
    : 0;

  // 模拟知识点掌握情况的数据
  const knowledgePoints = [
    { id: 1, name: "数据结构", mastery: 85 },
    { id: 2, name: "算法复杂度", mastery: 72 },
    { id: 3, name: "排序算法", mastery: 65 },
    { id: 4, name: "二叉树", mastery: 78 },
  ];

  // 模拟难点问题
  const difficultQuestions = [
    "第三题：二叉树的平衡性检查算法",
    "第五题：时间复杂度分析",
    "第七题：快速排序优化",
  ];

  // 模拟趋势数据
  const trends = {
    improvement: true,
    changePercent: 12,
    previousAverage: 72,
    currentAverage: 81,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium">人工智能分析</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">完成率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{completionRate}%</span>
                <Badge variant={completionRate >= 80 ? "default" : "outline"}>
                  {completionRate >= 80 ? "优秀" : "需跟进"}
                </Badge>
              </div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {submissionCount}/{totalStudents} 名学生已完成
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均分数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {trends.currentAverage}
                </span>
                <Badge
                  variant={trends.improvement ? "default" : "destructive"}
                  className="gap-1"
                >
                  {trends.improvement ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  {trends.changePercent}%
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <LineChart className="h-3 w-3" />
                <span>相比上次作业{trends.improvement ? "提高" : "下降"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">问题集中区域</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium bg-muted rounded-md p-1.5">
                {difficultQuestions[0]}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileQuestion className="h-3 w-3" />
                <span>共发现 {difficultQuestions.length} 个难点</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mastery">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="mastery" className="flex-1">
            知识点掌握情况
          </TabsTrigger>
          <TabsTrigger value="students" className="flex-1">
            学生表现分析
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex-1">
            教学建议
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mastery" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">知识点掌握分析</CardTitle>
              <CardDescription>基于学生作业的知识点掌握情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {knowledgePoints.map((point) => (
                  <div key={point.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{point.name}</span>
                      <span className="text-sm">{point.mastery}%</span>
                    </div>
                    <Progress value={point.mastery} className="h-2" />
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>
                        {point.mastery >= 80
                          ? "优秀"
                          : point.mastery >= 60
                            ? "良好"
                            : "需加强"}
                      </span>
                      {point.mastery < 70 && (
                        <Badge variant="outline" className="h-5 text-xs">
                          建议重点关注
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">常见问题</CardTitle>
              <CardDescription>学生在作业中的常见问题</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {difficultQuestions.map((question, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-sm">
                      {question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm space-y-2">
                        <p>
                          约有 {Math.round(30 + Math.random() * 40)}%
                          的学生在这个问题上遇到困难。
                        </p>
                        <p>主要问题点：</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          <li>概念理解不清晰</li>
                          <li>算法实现步骤混淆</li>
                          <li>边界条件处理不当</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">学生表现分布</CardTitle>
              <CardDescription>学生表现的分布情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">优秀</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {Math.round(submissionCount * 0.25)}
                  </p>
                  <p className="text-xs text-muted-foreground">学生人数</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">良好</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {Math.round(submissionCount * 0.35)}
                  </p>
                  <p className="text-xs text-muted-foreground">学生人数</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm font-medium">一般</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {Math.round(submissionCount * 0.3)}
                  </p>
                  <p className="text-xs text-muted-foreground">学生人数</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium">待提高</span>
                  </div>
                  <p className="text-xl font-semibold">
                    {Math.round(submissionCount * 0.1)}
                  </p>
                  <p className="text-xs text-muted-foreground">学生人数</p>
                </div>
              </div>

              <div className="h-40 flex items-end gap-2">
                <div className="flex-1 bg-green-500/20 rounded-t-md h-[80%]"></div>
                <div className="flex-1 bg-blue-500/20 rounded-t-md h-[65%]"></div>
                <div className="flex-1 bg-blue-500/20 rounded-t-md h-[55%]"></div>
                <div className="flex-1 bg-yellow-500/20 rounded-t-md h-[45%]"></div>
                <div className="flex-1 bg-yellow-500/20 rounded-t-md h-[40%]"></div>
                <div className="flex-1 bg-yellow-500/20 rounded-t-md h-[35%]"></div>
                <div className="flex-1 bg-red-500/20 rounded-t-md h-[25%]"></div>
                <div className="flex-1 bg-red-500/20 rounded-t-md h-[15%]"></div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>0</span>
                <span>10</span>
                <span>20</span>
                <span>30</span>
                <span>40</span>
                <span>50</span>
                <span>60</span>
                <span>70</span>
                <span>80</span>
                <span>90</span>
                <span>100</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">需要特别关注的学生</CardTitle>
              <CardDescription>可能需要额外帮助的学生</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">学生 {index}</span>
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2 text-xs">
                        得分低于均值 25%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        连续3次未达标
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">教学建议</CardTitle>
              <CardDescription>基于学生表现的教学建议</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    <h4 className="text-sm font-medium">重点加强知识点</h4>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>排序算法的时间复杂度分析</li>
                    <li>二叉树的平衡性概念</li>
                    <li>算法复杂度的计算方法</li>
                  </ul>
                </div>

                <div className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <h4 className="text-sm font-medium">教学方法建议</h4>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>增加实际编程练习，强化算法实现能力</li>
                    <li>可以采用可视化工具来演示算法执行过程</li>
                    <li>组织学生分组讨论，互相解释难点概念</li>
                    <li>设计更多的案例练习，加深理解</li>
                  </ul>
                </div>

                <div className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <FilePlus2 className="h-4 w-4 text-green-500" />
                    <h4 className="text-sm font-medium">补充材料建议</h4>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>分享排序算法的详细实现步骤指南</li>
                    <li>提供二叉树平衡性检查的练习题</li>
                    <li>推荐优质学习资源和视频教程</li>
                  </ul>
                </div>

                <div className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-500" />
                    <h4 className="text-sm font-medium">下次作业建议</h4>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>针对薄弱点增加更多基础练习</li>
                    <li>考虑降低部分难题的复杂度</li>
                    <li>添加更详细的解题引导说明</li>
                    <li>设计阶梯式难度的题目，让学生逐步提高</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIAnalysisPanel;
