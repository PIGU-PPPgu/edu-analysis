import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, FunnelChart, Funnel, FunnelItem, LabelList, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GradeChangeFunnelChartProps {
  className?: string;
  homeworkId?: string;
  title?: string;
  description?: string;
}

// 模拟数据作为后备
const mockData = [
  { name: "优秀", value: 10, fill: "#4ade80" },
  { name: "良好", value: 15, fill: "#60a5fa" },
  { name: "及格", value: 8, fill: "#facc15" },
  { name: "不及格", value: 3, fill: "#f87171" },
];

/**
 * 从数据库获取学生成绩等级变化数据
 */
async function getGradeChangeData(homeworkId?: string) {
  try {
    if (!homeworkId) {
      // 如果没有指定作业ID，获取最近两次作业的数据进行对比
      const { data: homeworks, error: homeworksError } = await supabase
        .from('homework')
        .select('id, title, due_date')
        .order('due_date', { ascending: false })
        .limit(2);

      if (homeworksError) {
        console.error('获取作业列表失败:', homeworksError);
        toast.error(`获取作业列表失败: ${homeworksError.message}`);
        return null;
      }

      if (!homeworks || homeworks.length < 2) {
        // 如果没有足够的作业用于比较
        return mockData;
      }

      // 获取最近两次作业的成绩分布
      const homeworkIds = homeworks.map(h => h.id);
      const { data: submissions, error: submissionsError } = await supabase
        .from('homework_submissions')
        .select('homework_id, score')
        .in('homework_id', homeworkIds)
        .not('score', 'is', null);

      if (submissionsError) {
        console.error('获取作业提交记录失败:', submissionsError);
        return null;
      }

      // 按作业分组
      const prevHomeworkId = homeworks[1].id;
      const currHomeworkId = homeworks[0].id;

      // 获取等级变化数据
      return processGradeChanges(submissions, prevHomeworkId, currHomeworkId);
    } else {
      // 如果指定了作业ID，获取该作业和前一次作业的数据
      const { data: homework, error: homeworkError } = await supabase
        .from('homework')
        .select('due_date')
        .eq('id', homeworkId)
        .single();

      if (homeworkError) {
        console.error('获取作业信息失败:', homeworkError);
        return null;
      }

      // 获取前一次作业
      const { data: prevHomework, error: prevHomeworkError } = await supabase
        .from('homework')
        .select('id')
        .lt('due_date', homework.due_date)
        .order('due_date', { ascending: false })
        .limit(1)
        .single();

      if (prevHomeworkError && prevHomeworkError.code !== 'PGRST116') {
        // PGRST116是"单行结果未找到"的错误，表示没有更早的作业
        console.error('获取前一次作业失败:', prevHomeworkError);
        return null;
      }

      if (!prevHomework) {
        // 如果没有前一次作业，返回模拟数据
        return mockData;
      }

      // 获取这两次作业的提交记录
      const { data: submissions, error: submissionsError } = await supabase
        .from('homework_submissions')
        .select('homework_id, score')
        .in('homework_id', [homeworkId, prevHomework.id])
        .not('score', 'is', null);

      if (submissionsError) {
        console.error('获取作业提交记录失败:', submissionsError);
        return null;
      }

      // 处理等级变化数据
      return processGradeChanges(submissions, prevHomework.id, homeworkId);
    }
  } catch (error) {
    console.error('获取成绩等级变化数据异常:', error);
    toast.error(`获取成绩等级变化数据失败: ${error.message || '未知错误'}`);
    return null;
  }
}

/**
 * 处理成绩等级变化数据
 */
function processGradeChanges(submissions, prevHomeworkId, currHomeworkId) {
  // 分组数据
  const prevSubmissions = submissions.filter(s => s.homework_id === prevHomeworkId);
  const currSubmissions = submissions.filter(s => s.homework_id === currHomeworkId);

  // 定义等级划分函数
  const getGradeLevel = (score) => {
    if (score >= 90) return "优秀";
    if (score >= 80) return "良好";
    if (score >= 60) return "及格";
    return "不及格";
  };

  // 统计各等级人数
  const gradeCounts = {
    "优秀": { prev: 0, curr: 0 },
    "良好": { prev: 0, curr: 0 },
    "及格": { prev: 0, curr: 0 },
    "不及格": { prev: 0, curr: 0 }
  };

  // 统计前一次作业等级分布
  prevSubmissions.forEach(s => {
    const grade = getGradeLevel(s.score);
    gradeCounts[grade].prev++;
  });

  // 统计当前作业等级分布
  currSubmissions.forEach(s => {
    const grade = getGradeLevel(s.score);
    gradeCounts[grade].curr++;
  });

  // 格式化为漏斗图数据
  const colors = {
    "优秀": "#4ade80",
    "良好": "#60a5fa",
    "及格": "#facc15",
    "不及格": "#f87171"
  };

  return [
    { name: "优秀", value: gradeCounts["优秀"].curr, prevValue: gradeCounts["优秀"].prev, fill: colors["优秀"] },
    { name: "良好", value: gradeCounts["良好"].curr, prevValue: gradeCounts["良好"].prev, fill: colors["良好"] },
    { name: "及格", value: gradeCounts["及格"].curr, prevValue: gradeCounts["及格"].prev, fill: colors["及格"] },
    { name: "不及格", value: gradeCounts["不及格"].curr, prevValue: gradeCounts["不及格"].prev, fill: colors["不及格"] }
  ];
}

export default function GradeChangeFunnelChart({
  className,
  homeworkId,
  title = "成绩等级变化",
  description = "展示学生成绩等级变化趋势"
}: GradeChangeFunnelChartProps) {
  const [data, setData] = useState<any[]>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getGradeChangeData(homeworkId);
        if (result) {
          setData(result);
        } else {
          setData(mockData);
          setError("无法获取真实数据，显示模拟数据");
        }
      } catch (err) {
        console.error("获取成绩等级变化数据失败:", err);
        setData(mockData);
        setError("加载失败，显示模拟数据");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [homeworkId]);

  // 检查数据有效性
  const hasValidData = data && data.length > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {error ? <span className="text-yellow-500">{error}</span> : description}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full min-h-[400px]">
        {loading ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : !hasValidData ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <div className="text-center text-muted-foreground">
              <p>无法显示等级变化图</p>
              <p className="text-sm mt-2">暂无足够数据生成有效图表</p>
            </div>
          </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (name === "prevValue") return [`上次: ${props.payload.prevValue}人`, "上次"];
                    return [`本次: ${value}人`, "当前"];
                  }}
                  labelFormatter={(label) => `${label}等级`}
                />
                <Funnel
                  dataKey="value"
                  data={data}
                  isAnimationActive
                  width="80%"
                >
                  <LabelList 
                    position="right"
                    fill="#888"
                    stroke="none"
                    dataKey="name"
                  />
                  <LabelList
                    position="left"
                    fill="#888"
                    stroke="none"
                    dataKey="value"
                    formatter={(value) => `${value}人`}
                  />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 