import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getGradeTrend } from "@/services/homeworkAnalysisService";
import { Skeleton } from "@/components/ui/skeleton";

interface GradeTrendChartProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
}

// 保留模拟数据作为后备
const mockData = [
  {
    name: "作业1",
    平均分: 85,
    提交率: 95,
  },
  {
    name: "作业2",
    平均分: 82,
    提交率: 90,
  },
  {
    name: "作业3",
    平均分: 88,
    提交率: 85,
  },
  {
    name: "作业4",
    平均分: 90,
    提交率: 88,
  },
  {
    name: "作业5",
    平均分: 86,
    提交率: 92,
  }
];

export default function GradeTrendChart({
  className,
  data: propData,
  title = "作业成绩趋势",
  description = "各次作业的平均分和提交率走势"
}: GradeTrendChartProps) {
  const [data, setData] = useState<any[]>(propData || mockData);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);

  // 检查数据有效性
  const hasValidData = data && data.length > 0;

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
        const result = await getGradeTrend();
        if (result) {
          setData(result);
        } else {
          // 如果API返回null，使用模拟数据
          setData(mockData);
          setError("无法获取真实数据，显示模拟数据");
        }
      } catch (err) {
        console.error("获取成绩趋势数据失败:", err);
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
      <CardContent className="h-full min-h-[350px]">
        {loading ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : !hasValidData ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <div className="text-center text-muted-foreground">
              <p>无法显示成绩趋势图</p>
              <p className="text-sm mt-2">暂无足够数据生成有效图表</p>
            </div>
          </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="left" 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "平均分") return [`${value}分`, "平均分"];
                    if (name === "提交率") return [`${value}%`, "提交率"];
                    return [value, name];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                />
                <Line 
                  type="monotone" 
                  dataKey="平均分" 
                  stroke="#4ade80" 
                  yAxisId="left"
                  activeDot={{ r: 8 }} 
                  name="平均分"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="提交率" 
                  stroke="#60a5fa" 
                  yAxisId="right"
                  activeDot={{ r: 8 }} 
                  name="提交率"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 