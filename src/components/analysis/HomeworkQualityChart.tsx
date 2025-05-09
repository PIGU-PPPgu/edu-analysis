import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from "recharts";
import { getHomeworkQualityData } from "@/services/homeworkAnalysisService";
import { Skeleton } from "@/components/ui/skeleton";

interface HomeworkQualityChartProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
}

// 保留模拟数据作为后备
const mockData = [
  {
    subject: "内容完整性",
    A: 90,
    B: 75,
    fullMark: 100,
  },
  {
    subject: "理解深度",
    A: 85,
    B: 80,
    fullMark: 100,
  },
  {
    subject: "创新性",
    A: 65,
    B: 85,
    fullMark: 100,
  },
  {
    subject: "技术应用",
    A: 95,
    B: 70,
    fullMark: 100,
  },
  {
    subject: "表达清晰度",
    A: 80,
    B: 90,
    fullMark: 100,
  },
];

export default function HomeworkQualityChart({
  className,
  data: propData,
  title = "作业质量分析",
  description = "各知识点掌握度的最优与平均水平对比"
}: HomeworkQualityChartProps) {
  const [data, setData] = useState<any[]>(propData || mockData);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 如果通过props提供了数据，直接使用
    if (propData) {
      setData(propData);
      return;
    }

    // 否则从API获取数据
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getHomeworkQualityData();
        if (result && result.length > 0) {
          setData(result);
        } else {
          // 如果API返回null或空数组，使用模拟数据
          setData(mockData);
          setError("无法获取真实数据，显示模拟数据");
        }
      } catch (err) {
        console.error("获取作业质量数据失败:", err);
        setData(mockData);
        setError("加载失败，显示模拟数据");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propData]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {error ? <span className="text-yellow-500">{error}</span> : description}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        {loading ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[250px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="最高水平"
                dataKey="A"
                stroke="#4ade80"
                fill="#4ade80"
                fillOpacity={0.5}
              />
              <Radar
                name="平均水平"
                dataKey="B"
                stroke="#60a5fa"
                fill="#60a5fa"
                fillOpacity={0.5}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
} 