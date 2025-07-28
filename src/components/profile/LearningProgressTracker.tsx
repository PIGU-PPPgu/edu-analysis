import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Calendar, Award, Flag } from "lucide-react";
import { StudentData } from "./types";

interface LearningProgressTrackerProps {
  student: StudentData;
  progressData?: {
    date: string;
    average: number;
    studentScore: number;
  }[];
  achievements?: {
    id: string;
    title: string;
    date: string;
    description: string;
    type: "academic" | "behavior" | "milestone" | "improvement";
    icon: string;
  }[];
}

const defaultProgressData = [
  { date: "2023-09", average: 76, studentScore: 78 },
  { date: "2023-10", average: 77, studentScore: 80 },
  { date: "2023-11", average: 78, studentScore: 83 },
  { date: "2023-12", average: 75, studentScore: 82 },
  { date: "2024-01", average: 79, studentScore: 85 },
  { date: "2024-02", average: 77, studentScore: 87 },
  { date: "2024-03", average: 78, studentScore: 86 },
  { date: "2024-04", average: 80, studentScore: 89 },
  { date: "2024-05", average: 79, studentScore: 90 },
];

const defaultAchievements = [
  {
    id: "1",
    title: "学习进步之星",
    date: "2024-05-15",
    description: "连续三次考试成绩显著提升",
    type: "improvement" as const,
    icon: "trending-up",
  },
  {
    id: "2",
    title: "数学竞赛二等奖",
    date: "2024-04-20",
    description: "在校级数学竞赛中获得二等奖",
    type: "academic" as const,
    icon: "award",
  },
  {
    id: "3",
    title: "完成个人学习目标",
    date: "2024-03-10",
    description: "提前完成期中考试备考计划",
    type: "milestone" as const,
    icon: "flag",
  },
  {
    id: "4",
    title: "全勤奖",
    date: "2024-02-28",
    description: "本学期至今全勤，无缺席记录",
    type: "behavior" as const,
    icon: "calendar",
  },
  {
    id: "5",
    title: "英语演讲比赛参与奖",
    date: "2023-12-15",
    description: "积极参与英语演讲比赛",
    type: "academic" as const,
    icon: "award",
  },
];

const LearningProgressTracker: React.FC<LearningProgressTrackerProps> = ({
  student,
  progressData = defaultProgressData,
  achievements = defaultAchievements,
}) => {
  // 计算进步率
  const calculateImprovementRate = () => {
    if (progressData.length < 2) return { rate: 0, trend: "neutral" };

    const firstScore = progressData[0].studentScore;
    const lastScore = progressData[progressData.length - 1].studentScore;
    const rate = (((lastScore - firstScore) / firstScore) * 100).toFixed(1);

    return {
      rate: parseFloat(rate),
      trend:
        parseFloat(rate) > 0
          ? "positive"
          : parseFloat(rate) < 0
            ? "negative"
            : "neutral",
    };
  };

  const improvementInfo = calculateImprovementRate();

  // 获取图标组件
  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case "trophy":
        return <Trophy className="h-5 w-5 text-amber-500" />;
      case "trending-up":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "calendar":
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case "award":
        return <Award className="h-5 w-5 text-purple-500" />;
      case "flag":
        return <Flag className="h-5 w-5 text-red-500" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };

  // 获取成就类型标签
  const getAchievementTypeBadge = (type: string) => {
    switch (type) {
      case "academic":
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
            学术成就
          </Badge>
        );
      case "behavior":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            行为表现
          </Badge>
        );
      case "milestone":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            学习里程碑
          </Badge>
        );
      case "improvement":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            进步成就
          </Badge>
        );
      default:
        return <Badge>其他成就</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          学习成果追踪
        </CardTitle>
        <CardDescription>学生成绩进步和学习成就记录</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-sm text-gray-600 mb-1">总体进步率</span>
                  <span
                    className={`text-2xl font-bold ${improvementInfo.trend === "positive" ? "text-green-600" : improvementInfo.trend === "negative" ? "text-red-600" : "text-gray-600"}`}
                  >
                    {improvementInfo.rate > 0 ? "+" : ""}
                    {improvementInfo.rate}%
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-sm text-gray-600 mb-1">目前成绩</span>
                  <span className="text-2xl font-bold text-indigo-600">
                    {progressData[progressData.length - 1]?.studentScore ||
                      "暂无"}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <div className="flex flex-col items-center justify-center h-full">
                  <span className="text-sm text-gray-600 mb-1">获得成就</span>
                  <span className="text-2xl font-bold text-amber-600">
                    {achievements.length}项
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="h-[250px]">
            <ChartContainer
              config={{
                score: { color: "#10b981" },
                average: { color: "#94a3b8" },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={progressData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[60, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="studentScore"
                    name="学生成绩"
                    stroke="#10b981"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="average"
                    name="班级平均"
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-4">学习成就记录</h3>
            <div className="space-y-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50"
                >
                  <div className="p-2 bg-white rounded-md">
                    {getAchievementIcon(achievement.icon)}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <span className="text-xs text-gray-500">
                        {achievement.date}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {achievement.description}
                    </p>
                    {getAchievementTypeBadge(achievement.type)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningProgressTracker;
