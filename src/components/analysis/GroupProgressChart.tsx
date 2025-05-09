import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveLine } from "@nivo/line";

interface GroupProgressChartProps {
  className?: string;
  title?: string;
  description?: string;
}

// 能力水平分组定义
const abilityGroups = {
  "优秀": { min: 90, max: 100, color: "hsl(152, 70%, 50%)" },
  "良好": { min: 80, max: 89.99, color: "hsl(207, 70%, 50%)" },
  "中等": { min: 70, max: 79.99, color: "hsl(272, 70%, 50%)" },
  "及格": { min: 60, max: 69.99, color: "hsl(56, 70%, 50%)" },
  "不及格": { min: 0, max: 59.99, color: "hsl(0, 70%, 50%)" }
};

// 默认模拟数据
const mockData = [
  {
    id: "优秀",
    color: abilityGroups["优秀"].color,
    data: [
      { x: "作业1", y: 95 },
      { x: "作业2", y: 94 },
      { x: "作业3", y: 97 },
      { x: "作业4", y: 96 },
      { x: "作业5", y: 98 }
    ]
  },
  {
    id: "良好",
    color: abilityGroups["良好"].color,
    data: [
      { x: "作业1", y: 82 },
      { x: "作业2", y: 83 },
      { x: "作业3", y: 85 },
      { x: "作业4", y: 86 },
      { x: "作业5", y: 88 }
    ]
  },
  {
    id: "中等",
    color: abilityGroups["中等"].color,
    data: [
      { x: "作业1", y: 72 },
      { x: "作业2", y: 73 },
      { x: "作业3", y: 74 },
      { x: "作业4", y: 75 },
      { x: "作业5", y: 76 }
    ]
  },
  {
    id: "及格",
    color: abilityGroups["及格"].color,
    data: [
      { x: "作业1", y: 62 },
      { x: "作业2", y: 63 },
      { x: "作业3", y: 64 },
      { x: "作业4", y: 66 },
      { x: "作业5", y: 68 }
    ]
  },
  {
    id: "不及格",
    color: abilityGroups["不及格"].color,
    data: [
      { x: "作业1", y: 45 },
      { x: "作业2", y: 48 },
      { x: "作业3", y: 52 },
      { x: "作业4", y: 55 },
      { x: "作业5", y: 58 }
    ]
  }
];

export default function GroupProgressChart({
  className,
  title = "群体进步趋势",
  description = "不同能力群体的学习进步趋势",
}: GroupProgressChartProps) {
  const [data, setData] = useState<any[]>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 获取作业列表，按时间顺序
        const { data: homeworks, error: homeworksError } = await supabase
          .from("homework")
          .select("id, title, created_at")
          .order("created_at")
          .limit(10);
          
        if (homeworksError) throw homeworksError;
        
        if (!homeworks || homeworks.length < 2) {
          setData(mockData);
          setError("作业数量不足，显示模拟数据");
          return;
        }
        
        // 获取学生列表和他们的初始能力分组
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, name");
          
        if (studentsError) throw studentsError;
        
        if (!students || students.length === 0) {
          setData(mockData);
          setError("暂无学生数据，显示模拟数据");
          return;
        }
        
        // 获取所有作业提交
        const { data: submissions, error: submissionsError } = await supabase
          .from("homework_submissions")
          .select(`
            id,
            homework_id,
            student_id,
            score,
            homework(title, created_at)
          `)
          .not("score", "is", null);
          
        if (submissionsError) throw submissionsError;
        
        if (!submissions || submissions.length === 0) {
          setData(mockData);
          setError("暂无作业提交数据，显示模拟数据");
          return;
        }
        
        // 按照作业创建时间排序提交记录
        submissions.sort((a, b) => {
          const dateA = new Date(a.homework.created_at);
          const dateB = new Date(b.homework.created_at);
          return dateA.getTime() - dateB.getTime();
        });
        
        // 获取第一次作业的成绩，确定学生的初始能力分组
        const firstHomeworkId = homeworks[0].id;
        const firstSubmissions = submissions.filter(sub => 
          sub.homework_id === firstHomeworkId && sub.score !== null
        );
        
        // 确定每个学生的初始分组
        const studentGroups: Record<string, string> = {};
        
        firstSubmissions.forEach(sub => {
          if (sub.score !== null) {
            studentGroups[sub.student_id] = getAbilityGroup(sub.score);
          }
        });
        
        // 为每个作业计算不同能力组的平均分
        const homeworkScores: Record<string, Record<string, { sum: number, count: number }>> = {};
        
        // 初始化数据结构
        homeworks.forEach(hw => {
          homeworkScores[hw.id] = {
            "优秀": { sum: 0, count: 0 },
            "良好": { sum: 0, count: 0 },
            "中等": { sum: 0, count: 0 },
            "及格": { sum: 0, count: 0 },
            "不及格": { sum: 0, count: 0 }
          };
        });
        
        // 填充每个学生在每个作业的成绩数据
        submissions.forEach(sub => {
          if (sub.score !== null && studentGroups[sub.student_id]) {
            const group = studentGroups[sub.student_id];
            if (homeworkScores[sub.homework_id] && homeworkScores[sub.homework_id][group]) {
              homeworkScores[sub.homework_id][group].sum += sub.score;
              homeworkScores[sub.homework_id][group].count += 1;
            }
          }
        });
        
        // 计算每个群体在每个作业的平均分
        const progressData: any[] = [];
        
        // 为每个能力组创建一条线
        Object.keys(abilityGroups).forEach(group => {
          const groupData = {
            id: group,
            color: abilityGroups[group as keyof typeof abilityGroups].color,
            data: [] as { x: string, y: number }[]
          };
          
          // 为每个作业添加数据点
          homeworks.forEach(hw => {
            if (homeworkScores[hw.id][group].count > 0) {
              const avg = homeworkScores[hw.id][group].sum / homeworkScores[hw.id][group].count;
              groupData.data.push({
                x: hw.title.length > 8 ? hw.title.substring(0, 8) + '...' : hw.title,
                y: Math.round(avg * 10) / 10
              });
            }
          });
          
          // 只添加有数据的组
          if (groupData.data.length > 0) {
            progressData.push(groupData);
          }
        });
        
        if (progressData.length > 0) {
          setData(progressData);
        } else {
          setData(mockData);
          setError("数据不足，显示模拟数据");
        }
      } catch (err: any) {
        console.error("获取群体进步趋势数据失败:", err);
        setData(mockData);
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // 根据分数确定能力组
  function getAbilityGroup(score: number): string {
    for (const [group, range] of Object.entries(abilityGroups)) {
      if (score >= range.min && score <= range.max) {
        return group;
      }
    }
    return "不及格"; // 默认
  }

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
            <ResponsiveLine
              data={data}
              margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
              xScale={{ type: "point" }}
              yScale={{
                type: "linear",
                min: "auto",
                max: "auto",
                stacked: false,
                reverse: false
              }}
              yFormat=" >-.1f"
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: -45,
                legend: "作业",
                legendOffset: 40,
                legendPosition: "middle"
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "平均分",
                legendOffset: -40,
                legendPosition: "middle"
              }}
              pointSize={10}
              pointColor={{ theme: "background" }}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              pointLabelYOffset={-12}
              useMesh={true}
              legends={[
                {
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 100,
                  translateY: 0,
                  itemsSpacing: 0,
                  itemDirection: "left-to-right",
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: "circle",
                  symbolBorderColor: "rgba(0, 0, 0, .5)",
                  effects: [
                    {
                      on: "hover",
                      style: {
                        itemBackground: "rgba(0, 0, 0, .03)",
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 