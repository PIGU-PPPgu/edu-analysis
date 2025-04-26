import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface HomeworkSubmissionTrendProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
  scoreDisplayMode?: "numeric" | "grade";
}

const mockData = [
  {
    day: "周一",
    优秀: 5,
    良好: 12,
    中等: 8,
    及格: 3,
    不及格: 2
  },
  {
    day: "周二",
    优秀: 7,
    良好: 15,
    中等: 6,
    及格: 2,
    不及格: 1
  },
  {
    day: "周三",
    优秀: 9,
    良好: 14,
    中等: 5,
    及格: 2,
    不及格: 0
  },
  {
    day: "周四",
    优秀: 4,
    良好: 8,
    中等: 10,
    及格: 4,
    不及格: 1
  },
  {
    day: "周五",
    优秀: 6,
    良好: 10,
    中等: 7,
    及格: 5,
    不及格: 3
  },
  {
    day: "周六",
    优秀: 3,
    良好: 5,
    中等: 4,
    及格: 2,
    不及格: 1
  },
  {
    day: "周日",
    优秀: 8,
    良好: 13,
    中等: 6,
    及格: 3,
    不及格: 2
  }
];

const HomeworkSubmissionTrend: React.FC<HomeworkSubmissionTrendProps> = ({
  className,
  data = mockData,
  title = "作业提交等级趋势",
  description = "每天不同等级作业的提交次数分布",
  scoreDisplayMode = "numeric"
}) => {
  // 根据评分模式调整图例名称
  const getLegendName = (key: string) => {
    if (scoreDisplayMode === "grade") {
      switch (key) {
        case "优秀": return "A/A+";
        case "良好": return "B/B+";
        case "中等": return "C/C+";
        case "及格": return "D/D+";
        case "不及格": return "F";
        default: return key;
      }
    } else {
      switch (key) {
        case "优秀": return "优秀(90-100)";
        case "良好": return "良好(80-89)";
        case "中等": return "中等(70-79)";
        case "及格": return "及格(60-69)";
        case "不及格": return "不及格(<60)";
        default: return key;
      }
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis label={{ value: '提交次数', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => [`${value} 次`, ""]} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="优秀" 
              stackId="1" 
              stroke="#4ade80" 
              fill="#4ade80" 
              name={getLegendName("优秀")} 
            />
            <Area 
              type="monotone" 
              dataKey="良好" 
              stackId="1" 
              stroke="#60a5fa" 
              fill="#60a5fa" 
              name={getLegendName("良好")} 
            />
            <Area 
              type="monotone" 
              dataKey="中等" 
              stackId="1" 
              stroke="#facc15" 
              fill="#facc15" 
              name={getLegendName("中等")} 
            />
            <Area 
              type="monotone" 
              dataKey="及格" 
              stackId="1" 
              stroke="#f97316" 
              fill="#f97316" 
              name={getLegendName("及格")} 
            />
            <Area 
              type="monotone" 
              dataKey="不及格" 
              stackId="1" 
              stroke="#ef4444" 
              fill="#ef4444" 
              name={getLegendName("不及格")} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default HomeworkSubmissionTrend; 