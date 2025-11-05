import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Award,
  BookOpen,
  Brain,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { StudentData } from "./types";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface LearningBehaviorProps {
  student: StudentData;
  learningBehaviors?: {
    attendanceRate: number;
    homeworkCompletionRate: number;
    classParticipation: number;
    focusDuration: number;
    learningConsistency: number;
    problemSolvingSpeed: number;
  };
  learningPatterns?: {
    pattern: string;
    description: string;
    strength: boolean;
  }[];
}

const LearningBehaviorAnalysis: React.FC<LearningBehaviorProps> = ({
  student,
  learningBehaviors = {
    attendanceRate: 95,
    homeworkCompletionRate: 87,
    classParticipation: 78,
    focusDuration: 82,
    learningConsistency: 75,
    problemSolvingSpeed: 80,
  },
  learningPatterns = [
    {
      pattern: "视觉学习偏好",
      description: "通过视觉图表和示意图学习效果最佳，对图表数据理解速度快。",
      strength: true,
    },
    {
      pattern: "持续学习型",
      description: "习惯于每天固定时间学习，有较强的学习纪律性。",
      strength: true,
    },
    {
      pattern: "实践学习者",
      description: "通过实际操作和练习掌握知识点，学习效果好。",
      strength: true,
    },
    {
      pattern: "压力应对能力",
      description: "在考试等高压环境下表现不稳定，需要加强心理调适能力。",
      strength: false,
    },
    {
      pattern: "合作学习",
      description: "在小组合作环境中效率偏低，需要提升团队协作能力。",
      strength: false,
    },
  ],
}) => {
  const [activeTab, setActiveTab] = React.useState("behaviors");

  const generateDetailedAnalysis = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
      loading: "正在生成详细行为分析...",
      success: "详细行为分析已生成",
      error: "分析生成失败，请稍后再试",
    });
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) return "bg-green-500";
    if (value >= 75) return "bg-blue-500";
    if (value >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5" />
          学习行为分析
        </CardTitle>
        <CardDescription>学生学习行为模式和习惯分析</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="behaviors">行为指标</TabsTrigger>
            <TabsTrigger value="patterns">学习模式</TabsTrigger>
            <TabsTrigger value="recommendations">学习建议</TabsTrigger>
          </TabsList>

          <TabsContent value="behaviors" className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> 出勤率
                </span>
                <span className="font-medium">
                  {learningBehaviors.attendanceRate}%
                </span>
              </div>
              <Progress
                value={learningBehaviors.attendanceRate}
                className={`h-2 ${getProgressColor(learningBehaviors.attendanceRate)}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> 作业完成率
                </span>
                <span className="font-medium">
                  {learningBehaviors.homeworkCompletionRate}%
                </span>
              </div>
              <Progress
                value={learningBehaviors.homeworkCompletionRate}
                className={`h-2 ${getProgressColor(learningBehaviors.homeworkCompletionRate)}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" /> 课堂参与度
                </span>
                <span className="font-medium">
                  {learningBehaviors.classParticipation}%
                </span>
              </div>
              <Progress
                value={learningBehaviors.classParticipation}
                className={`h-2 ${getProgressColor(learningBehaviors.classParticipation)}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> 学习专注度
                </span>
                <span className="font-medium">
                  {learningBehaviors.focusDuration}%
                </span>
              </div>
              <Progress
                value={learningBehaviors.focusDuration}
                className={`h-2 ${getProgressColor(learningBehaviors.focusDuration)}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5" /> 学习连贯性
                </span>
                <span className="font-medium">
                  {learningBehaviors.learningConsistency}%
                </span>
              </div>
              <Progress
                value={learningBehaviors.learningConsistency}
                className={`h-2 ${getProgressColor(learningBehaviors.learningConsistency)}`}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> 解题速度
                </span>
                <span className="font-medium">
                  {learningBehaviors.problemSolvingSpeed}%
                </span>
              </div>
              <Progress
                value={learningBehaviors.problemSolvingSpeed}
                className={`h-2 ${getProgressColor(learningBehaviors.problemSolvingSpeed)}`}
              />
            </div>
          </TabsContent>

          <TabsContent value="patterns">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm mb-2 text-green-700">
                    优势学习模式
                  </h3>
                  <div className="space-y-3">
                    {learningPatterns
                      .filter((pattern) => pattern.strength)
                      .map((pattern, index) => (
                        <div
                          key={index}
                          className="bg-green-50 p-3 rounded-lg border border-green-200"
                        >
                          <p className="font-medium text-sm text-green-700">
                            {pattern.pattern}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            {pattern.description}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-sm mb-2 text-amber-700">
                    待提升学习模式
                  </h3>
                  <div className="space-y-3">
                    {learningPatterns
                      .filter((pattern) => !pattern.strength)
                      .map((pattern, index) => (
                        <div
                          key={index}
                          className="bg-amber-50 p-3 rounded-lg border border-amber-200"
                        >
                          <p className="font-medium text-sm text-amber-700">
                            {pattern.pattern}
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            {pattern.description}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                  onClick={generateDetailedAnalysis}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  生成详细行为分析
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="recommendations">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-700 mb-2">
                  个性化学习建议
                </h3>
                <ul className="space-y-2 text-sm text-blue-700">
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>
                      利用视觉化学习工具，如思维导图、图表等帮助理解抽象概念
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>维持当前良好的学习习惯，坚持每日固定时间学习</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>
                      创建模拟考试环境，提前熟悉考试氛围，减轻考试焦虑
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>
                      参与更多小组讨论活动，主动承担小组任务，锻炼协作能力
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>
                      学习简单的减压技巧，如深呼吸、正念思考等，应对考试压力
                    </span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-medium text-slate-700 mb-2">
                  教师指导重点
                </h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>提供更多实践性和可视化的教学材料</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>安排小组协作任务，并给予针对性指导</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>正面强化学生良好的学习习惯</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block mr-2 mt-0.5">•</span>
                    <span>引导学生建立应对考试压力的策略</span>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LearningBehaviorAnalysis;
