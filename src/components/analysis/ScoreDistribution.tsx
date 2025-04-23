
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DistributionData {
  range: string;
  count: number;
  color: string;
}

interface Props {
  data?: DistributionData[];
}

const COLORS = ["#4CAF50", "#8BC34A", "#CDDC39", "#FFEB3B", "#F44336"];
const SCORE_RANGES = [
  { range: "90-100分", min: 90, max: 100, color: COLORS[0] },
  { range: "80-89分", min: 80, max: 89, color: COLORS[1] },
  { range: "70-79分", min: 70, max: 79, color: COLORS[2] },
  { range: "60-69分", min: 60, max: 69, color: COLORS[3] },
  { range: "60分以下", min: 0, max: 59, color: COLORS[4] }
];

const ScoreDistribution: React.FC<Props> = ({ data: initialData }) => {
  const [data, setData] = useState<DistributionData[]>([]);
  const [isLoading, setIsLoading] = useState(!initialData);
  
  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setData(initialData);
      return;
    }
    
    const fetchScoreDistribution = async () => {
      try {
        setIsLoading(true);
        
        const { data: grades, error } = await supabase
          .from('grades')
          .select('score');
        
        if (error) throw error;
        
        if (!grades || grades.length === 0) {
          setData([]);
          return;
        }
        
        // 初始化分数段统计
        const distribution = SCORE_RANGES.map(range => ({
          ...range,
          count: 0
        }));
        
        // 统计各分数段的人数
        grades.forEach(item => {
          const score = item.score;
          for (const range of distribution) {
            if (score >= range.min && score <= range.max) {
              range.count++;
              break;
            }
          }
        });
        
        setData(distribution);
      } catch (error) {
        console.error("获取分数分布数据失败:", error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchScoreDistribution();
  }, [initialData]);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>分数段分布</CardTitle>
        <CardDescription>各分数段学生人数</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] flex items-center justify-center">
        {isLoading ? (
          <div className="text-gray-500">加载中...</div>
        ) : data.length > 0 && data.some(item => item.count > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="count"
                nameKey="range"
                label={({ range, count }) => count > 0 ? `${range}: ${count}人` : ''}
                labelLine={{ stroke: "#D1D5DB", strokeWidth: 1 }}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}人`, name]} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: 20 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500">暂无分数分布数据</div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreDistribution;
