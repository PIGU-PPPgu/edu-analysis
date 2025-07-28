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
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Brain, AlertCircle } from "lucide-react";
import { StudentData } from "./types";

interface LearningStyleAnalysisProps {
  student: StudentData;
  learningStyleData?: {
    name: string;
    value: number;
    description: string;
    color: string;
  }[];
}

const defaultLearningStyleData = [
  {
    name: "视觉型学习",
    value: 40,
    description: "通过看和观察学习效果最好，如图表、视频等",
    color: "#10b981",
  },
  {
    name: "听觉型学习",
    value: 25,
    description: "通过听和讨论学习效果好，如讲座、对话等",
    color: "#3b82f6",
  },
  {
    name: "读写型学习",
    value: 20,
    description: "通过阅读和写作学习效果好，如做笔记、阅读材料等",
    color: "#8b5cf6",
  },
  {
    name: "实践型学习",
    value: 15,
    description: "通过动手实践学习效果好，如实验、角色扮演等",
    color: "#f59e0b",
  },
];

const LearningStyleAnalysis: React.FC<LearningStyleAnalysisProps> = ({
  student,
  learningStyleData = defaultLearningStyleData,
}) => {
  const dominantStyle = React.useMemo(() => {
    return learningStyleData.reduce((prev, current) =>
      prev.value > current.value ? prev : current
    );
  }, [learningStyleData]);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="500"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-5 w-5" />
          学习风格分析
        </CardTitle>
        <CardDescription>学生学习风格特点和偏好</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-[250px]">
            <ChartContainer
              config={{
                style: { color: "#000" },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={learningStyleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {learningStyleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "比例"]}
                    labelFormatter={(index) => learningStyleData[index].name}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-medium text-slate-800 flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-indigo-500" />
                主导学习风格
              </h3>
              <p className="font-bold text-indigo-600 mb-2">
                {dominantStyle.name} ({dominantStyle.value}%)
              </p>
              <p className="text-sm text-slate-600">
                {dominantStyle.description}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                学习风格解读
              </h3>
              <p className="text-sm text-blue-700 mb-3">
                该学生是一个{dominantStyle.name.replace("型学习", "")}
                型学习者，适合通过
                {dominantStyle.name === "视觉型学习" && "图像、视频等视觉资料"}
                {dominantStyle.name === "听觉型学习" && "听讲、讨论等听觉活动"}
                {dominantStyle.name === "读写型学习" &&
                  "阅读、记笔记等文字活动"}
                {dominantStyle.name === "实践型学习" &&
                  "动手实践、实验等体验活动"}
                进行学习。
              </p>
              <p className="text-sm text-blue-700">
                建议教师在教学过程中，针对该学生的学习特点，增加
                {dominantStyle.name === "视觉型学习" &&
                  "图表、视频等视觉辅助工具"}
                {dominantStyle.name === "听觉型学习" &&
                  "讨论、讲解等听觉互动环节"}
                {dominantStyle.name === "读写型学习" &&
                  "阅读材料、写作练习等活动"}
                {dominantStyle.name === "实践型学习" &&
                  "实验、角色扮演等实践性活动"}
                的比例，以提高学习效果。
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="font-medium text-sm">学习风格详解</h3>
          {learningStyleData.map((style, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border"
              style={{
                borderColor: style.color,
                backgroundColor: `${style.color}10`,
              }}
            >
              <p
                className="font-medium text-sm mb-1"
                style={{ color: style.color }}
              >
                {style.name} ({style.value}%)
              </p>
              <p className="text-xs text-gray-600">{style.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningStyleAnalysis;
