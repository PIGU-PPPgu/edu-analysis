import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface KnowledgePointHeatmapProps {
  className?: string;
  data?: any[];
  title?: string;
  description?: string;
}

// 保留模拟数据作为后备
const mockData = [
  {
    name: "数据结构",
    平均水平: 75,
    最高水平: 95,
    学生数: 28,
  },
  {
    name: "算法设计",
    平均水平: 68,
    最高水平: 90,
    学生数: 32,
  },
  {
    name: "面向对象",
    平均水平: 82,
    最高水平: 97,
    学生数: 25,
  },
  {
    name: "网络编程",
    平均水平: 60,
    最高水平: 85,
    学生数: 18,
  },
  {
    name: "函数式编程",
    平均水平: 65,
    最高水平: 88,
    学生数: 22,
  },
  {
    name: "系统设计",
    平均水平: 72,
    最高水平: 92,
    学生数: 30,
  },
  {
    name: "数据库",
    平均水平: 78,
    最高水平: 94,
    学生数: 27,
  },
];

/**
 * 获取知识点掌握度数据
 */
async function getKnowledgePointsData() {
  try {
    // 获取所有作业的知识点评估数据
    const { data: masteryData, error: masteryError } = await supabase
      .from('student_knowledge_mastery')
      .select(`
        mastery_level,
        student_id,
        knowledge_points (
          id,
          name
        )
      `);

    if (masteryError) {
      console.error('获取知识点掌握度失败:', masteryError);
      toast.error(`获取知识点掌握度失败: ${masteryError.message}`);
      return null;
    }

    if (!masteryData || masteryData.length === 0) {
      return [];
    }

    // 按知识点分类并计算统计数据
    const knowledgePointsMap = new Map();
    
    masteryData.forEach(item => {
      if (!item.knowledge_points) return;
      
      const kpName = item.knowledge_points.name;
      const level = item.mastery_level;
      const studentId = item.student_id;
      
      if (!knowledgePointsMap.has(kpName)) {
        knowledgePointsMap.set(kpName, {
          levels: [level],
          maxLevel: level,
          students: new Set([studentId])
        });
      } else {
        const data = knowledgePointsMap.get(kpName);
        data.levels.push(level);
        data.maxLevel = Math.max(data.maxLevel, level);
        data.students.add(studentId);
        knowledgePointsMap.set(kpName, data);
      }
    });

    // 生成热力图数据
    const result = Array.from(knowledgePointsMap.entries())
      .map(([kpName, data]) => {
        // 计算平均分
        const avgLevel = data.levels.reduce((sum, level) => sum + level, 0) / data.levels.length;
        
        return {
          name: kpName.length > 10 ? kpName.substring(0, 10) + '...' : kpName,
          平均水平: Math.round(avgLevel),
          最高水平: data.maxLevel,
          学生数: data.students.size
        };
      })
      // 按平均水平排序
      .sort((a, b) => b.平均水平 - a.平均水平);

    return result;
  } catch (error) {
    console.error('获取知识点数据异常:', error);
    toast.error(`获取知识点数据失败: ${error.message || '未知错误'}`);
    return null;
  }
}

// 获取水平对应的颜色
function getLevelColor(level) {
  if (level >= 90) return "#4ade80"; // 绿色 - 优秀
  if (level >= 80) return "#60a5fa"; // 蓝色 - 良好
  if (level >= 60) return "#facc15"; // 黄色 - 及格
  return "#f87171"; // 红色 - 不及格
}

export default function KnowledgePointHeatmap({
  className,
  data: propData,
  title = "知识点掌握热力图",
  description = "各知识点的掌握度与学生分布"
}: KnowledgePointHeatmapProps) {
  const [data, setData] = useState<any[]>(propData || mockData);
  const [loading, setLoading] = useState(!propData);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("average");

  // 限制只显示前10个知识点 (增加了可显示的知识点数量)
  const displayData = data.slice(0, 10);

  // 检查数据有效性
  const hasValidData = displayData && displayData.length > 0;

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
        const result = await getKnowledgePointsData();
        if (result && result.length > 0) {
          setData(result);
        } else {
          // 如果API返回null或空数组，使用模拟数据
          setData(mockData);
          setError("无法获取真实数据，显示模拟数据");
        }
      } catch (err) {
        console.error("获取知识点掌握度数据失败:", err);
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
      <CardContent className="h-full">
        {loading ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : !hasValidData ? (
          <div className="flex flex-col h-full w-full space-y-4 justify-center items-center">
            <div className="text-center text-muted-foreground">
              <p>无法显示知识点热力图</p>
              <p className="text-sm mt-2">暂无足够数据生成有效图表</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <Tabs 
              defaultValue="average" 
              className="w-full"
              onValueChange={setActiveTab}
            >
              <TabsList className="w-full grid grid-cols-2 mb-4">
                <TabsTrigger value="average">平均掌握度</TabsTrigger>
                <TabsTrigger value="maximum">最高掌握度</TabsTrigger>
              </TabsList>
              <TabsContent value="average" className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={displayData}
                    margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120} 
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}分`, "平均掌握度"]}
                      labelFormatter={(label) => `知识点: ${label}`}
                    />
                    <Bar 
                      dataKey="平均水平" 
                      radius={[0, 4, 4, 0]}
                    >
                      {displayData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getLevelColor(entry.平均水平)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
              <TabsContent value="maximum" className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={displayData}
                    margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}分`, "最高掌握度"]}
                      labelFormatter={(label) => `知识点: ${label}`}
                    />
                    <Bar 
                      dataKey="最高水平" 
                      radius={[0, 4, 4, 0]}
                    >
                      {displayData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getLevelColor(entry.最高水平)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
            <div className="text-xs text-muted-foreground text-center mt-2">
              * 颜色深浅表示掌握程度，绿色为优秀，蓝色为良好，黄色为及格，红色为不及格
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 