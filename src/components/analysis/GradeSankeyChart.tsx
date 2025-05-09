import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveContainer, Sankey, Tooltip, Layer, Rectangle, Text } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface GradeSankeyChartProps {
  className?: string;
  title?: string;
  description?: string;
}

// 保留模拟数据作为后备
const mockData = {
  nodes: [
    { name: "优秀(前)" },
    { name: "良好(前)" },
    { name: "及格(前)" },
    { name: "不及格(前)" },
    { name: "优秀(后)" },
    { name: "良好(后)" },
    { name: "及格(后)" },
    { name: "不及格(后)" },
  ],
  links: [
    { source: 0, target: 4, value: 8 },  // 优秀 -> 优秀
    { source: 0, target: 5, value: 2 },  // 优秀 -> 良好
    { source: 1, target: 4, value: 3 },  // 良好 -> 优秀
    { source: 1, target: 5, value: 7 },  // 良好 -> 良好
    { source: 1, target: 6, value: 2 },  // 良好 -> 及格
    { source: 2, target: 5, value: 2 },  // 及格 -> 良好
    { source: 2, target: 6, value: 5 },  // 及格 -> 及格
    { source: 2, target: 7, value: 1 },  // 及格 -> 不及格
    { source: 3, target: 6, value: 2 },  // 不及格 -> 及格
    { source: 3, target: 7, value: 4 },  // 不及格 -> 不及格
  ]
};

/**
 * 从数据库获取学生成绩流向数据
 */
async function getGradeFlowData() {
  try {
    // 获取最近两次作业
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

    // 获取这两次作业的提交记录
    const { data: submissions, error: submissionsError } = await supabase
      .from('homework_submissions')
      .select('homework_id, student_id, score')
      .in('homework_id', [homeworks[0].id, homeworks[1].id])
      .not('score', 'is', null);

    if (submissionsError) {
      console.error('获取作业提交记录失败:', submissionsError);
      return null;
    }

    if (!submissions || submissions.length === 0) {
      return mockData;
    }

    const prevHomeworkId = homeworks[1].id;
    const currHomeworkId = homeworks[0].id;

    // 按学生ID分组，收集每个学生的前后等级
    const studentGrades = new Map();
    
    submissions.forEach(submission => {
      const { student_id, homework_id, score } = submission;
      
      if (!studentGrades.has(student_id)) {
        studentGrades.set(student_id, {});
      }
      
      const record = studentGrades.get(student_id);
      
      if (homework_id === prevHomeworkId) {
        record.prevGrade = getGradeLevel(score);
      } else if (homework_id === currHomeworkId) {
        record.currGrade = getGradeLevel(score);
      }
      
      studentGrades.set(student_id, record);
    });

    // 构建桑基图数据
    const gradeIndices = {
      "优秀": { prev: 0, curr: 4 },
      "良好": { prev: 1, curr: 5 },
      "及格": { prev: 2, curr: 6 },
      "不及格": { prev: 3, curr: 7 }
    };
    
    // 初始化流向计数
    const flowCounts = {};
    for (const prevGrade in gradeIndices) {
      for (const currGrade in gradeIndices) {
        const source = gradeIndices[prevGrade].prev;
        const target = gradeIndices[currGrade].curr;
        const key = `${source}-${target}`;
        flowCounts[key] = 0;
      }
    }

    // 统计每个流向的数量
    Array.from(studentGrades.values()).forEach(record => {
      if (record.prevGrade && record.currGrade) {
        const source = gradeIndices[record.prevGrade].prev;
        const target = gradeIndices[record.currGrade].curr;
        const key = `${source}-${target}`;
        flowCounts[key] += 1;
      }
    });

    // 构建桑基图链接数据
    const links = [];
    for (const key in flowCounts) {
      if (flowCounts[key] > 0) {
        const [source, target] = key.split('-').map(Number);
        links.push({
          source,
          target,
          value: flowCounts[key]
        });
      }
    }

    return {
      nodes: mockData.nodes, // 节点名称保持不变
      links
    };
  } catch (error) {
    console.error('获取成绩流向数据异常:', error);
    toast.error(`获取成绩流向数据失败: ${error.message || '未知错误'}`);
    return null;
  }
}

/**
 * 获取分数对应的等级
 */
function getGradeLevel(score) {
  if (score >= 90) return "优秀";
  if (score >= 80) return "良好";
  if (score >= 60) return "及格";
  return "不及格";
}

// 获取等级对应的颜色
function getGradeLevelColor(name) {
  if (name.includes("优秀")) return "#4ade80";
  if (name.includes("良好")) return "#60a5fa";
  if (name.includes("及格")) return "#facc15";
  return "#f87171";
}

export default function GradeSankeyChart({
  className,
  title = "成绩流向图",
  description = "展示学生成绩等级的流动趋势"
}: GradeSankeyChartProps) {
  const [data, setData] = useState<any>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getGradeFlowData();
        if (result) {
          setData(result);
        } else {
          setData(mockData);
          setError("无法获取真实数据，显示模拟数据");
        }
      } catch (err) {
        console.error("获取成绩流向数据失败:", err);
        setData(mockData);
        setError("加载失败，显示模拟数据");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 自定义桑基图节点
  const CustomNode = ({ x, y, width, height, index, payload }) => {
    const isLeft = index < 4;
    const color = getGradeLevelColor(payload.name);
    
    return (
      <Layer key={`CustomNode-${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          fillOpacity="0.8"
        />
        <Text
          x={isLeft ? x - 5 : x + width + 5}
          y={y + height / 2}
          textAnchor={isLeft ? "end" : "start"}
          verticalAnchor="middle"
          fontSize={12}
          fill="#666"
        >
          {payload.name}
        </Text>
      </Layer>
    );
  };

  // 确认数据有效性
  const hasValidData = data && 
                      data.nodes && 
                      data.links && 
                      data.nodes.length > 0 && 
                      data.links.length > 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {error ? <span className="text-yellow-500">{error}</span> : description}
        </CardDescription>
      </CardHeader>
      <CardContent className="h-full min-h-[450px]">
        {loading ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : !hasValidData ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <div className="text-center text-muted-foreground">
              <p>无法显示流向图</p>
              <p className="text-sm mt-2">暂无足够数据生成有效图表</p>
            </div>
          </div>
        ) : (
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <Sankey
                data={data}
                node={<CustomNode />}
                nodePadding={20}
                nodeWidth={10}
                margin={{ top: 10, right: 160, left: 160, bottom: 10 }}
                link={{ stroke: "#aaa", strokeOpacity: 0.2 }}
              >
                <Tooltip 
                  formatter={(value, name) => [`${value}人`, name]}
                />
              </Sankey>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 