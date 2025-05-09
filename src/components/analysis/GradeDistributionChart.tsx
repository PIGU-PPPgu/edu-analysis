import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { getGradeDistribution } from "@/services/homeworkAnalysisService";
import { Skeleton } from "@/components/ui/skeleton";

interface GradeDistributionChartProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
}

// 保留模拟数据作为后备
const mockData = [
  {
    name: "优秀",
    数量: 18,
    颜色: "#4ade80",
  },
  {
    name: "良好",
    数量: 25,
    颜色: "#60a5fa",
  },
  {
    name: "及格",
    数量: 12,
    颜色: "#facc15",
  },
  {
    name: "不及格",
    数量: 5,
    颜色: "#f87171",
  },
];

export default function GradeDistributionChart({
  className,
  data: propData,
  title = "成绩等级分布",
  description = "作业成绩不同等级的数量分布"
}: GradeDistributionChartProps) {
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
        const result = await getGradeDistribution();
        if (result) {
          setData(result);
        } else {
          // 如果API返回null，使用模拟数据
          setData(mockData);
          setError("无法获取真实数据，显示模拟数据");
        }
      } catch (err) {
        console.error("获取成绩分布数据失败:", err);
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
              <p>无法显示成绩分布图</p>
              <p className="text-sm mt-2">暂无足够数据生成有效图表</p>
            </div>
          </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  allowDecimals={false} 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value, name) => [`${value}份`, "数量"]} 
                  labelFormatter={(label) => `${label}作业`}
                />
                <Legend 
                  verticalAlign="top"
                  height={36}
                />
                <Bar 
                  dataKey="数量" 
                  name="数量" 
                  fill="#60a5fa"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={60}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.颜色 || "#60a5fa"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 