import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ResponsiveBar } from "@nivo/bar";

interface QuestionDifficultyChartProps {
  className?: string;
  title?: string;
  description?: string;
}

// 准备一些模拟数据
const mockData = [
  { id: "作业1", 难度: 65, 平均分: 35 },
  { id: "作业2", 难度: 45, 平均分: 55 },
  { id: "作业3", 难度: 75, 平均分: 25 },
  { id: "作业4", 难度: 55, 平均分: 45 },
  { id: "作业5", 难度: 35, 平均分: 65 },
];

export default function QuestionDifficultyChart({
  className,
  title = "题目难度分析",
  description = "展示题目的难度与平均分关系",
}: QuestionDifficultyChartProps) {
  const [data, setData] = useState<any[]>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 获取作业列表
        const { data: homeworks, error: homeworksError } = await supabase
          .from("homework")
          .select("id, title")
          .order("created_at", { ascending: false })
          .limit(5); // 最近5个作业
        
        if (homeworksError) throw homeworksError;
        
        if (!homeworks || homeworks.length === 0) {
          setData(mockData);
          setError("暂无作业数据，显示模拟数据");
          return;
        }

        // 创建分析数据数组
        const analysisData = [];
        
        // 为每个作业处理数据
        for (const homework of homeworks) {
          // 获取该作业的提交记录
          const { data: submissions, error: submissionsError } = await supabase
            .from("homework_submissions")
            .select("id, score, student_id")
            .eq("homework_id", homework.id)
            .not("score", "is", null);
            
          if (submissionsError) throw submissionsError;
          
          if (!submissions || submissions.length < 5) {
            // 跳过提交记录太少的作业
            continue;
          }
          
          // 计算平均分
          const scores = submissions.map(s => s.score);
          const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          
          // 计算难度指数 (基于平均分)
          // 难度指数 = 100 - 平均分
          const difficulty = 100 - avgScore;
          
          analysisData.push({
            id: homework.title.length > 6 ? homework.title.substring(0, 6) + '...' : homework.title,
            难度: Math.round(difficulty),
            平均分: Math.round(avgScore)
          });
        }
        
        if (analysisData.length === 0) {
          setData(mockData);
          setError("无足够作业数据，显示模拟数据");
        } else {
          setData(analysisData);
        }
      } catch (err: any) {
        console.error("获取题目难度数据失败:", err);
        setData(mockData);
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {error ? (
            <span className="text-yellow-500">{error}</span>
          ) : (
            description
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {loading ? (
          <div className="flex flex-col h-[350px] w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveBar
              data={data}
              keys={["难度", "平均分"]}
              indexBy="id"
              margin={{ top: 50, right: 50, bottom: 50, left: 60 }}
              padding={0.3}
              groupMode="grouped"
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={{ scheme: "nivo" }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "作业",
                legendPosition: "middle",
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "分数 / 难度",
                legendPosition: "middle",
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              animate={true}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 