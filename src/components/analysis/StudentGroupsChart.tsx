import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveBar } from "@nivo/bar";

interface StudentGroupsChartProps {
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
    id: "总体",
    "优秀": 15,
    "优秀Color": "hsl(152, 70%, 50%)",
    "良好": 25,
    "良好Color": "hsl(207, 70%, 50%)",
    "中等": 30,
    "中等Color": "hsl(272, 70%, 50%)",
    "及格": 20,
    "及格Color": "hsl(56, 70%, 50%)",
    "不及格": 10,
    "不及格Color": "hsl(0, 70%, 50%)"
  }
];

export default function StudentGroupsChart({
  className,
  title = "学生能力分组",
  description = "按能力水平划分的学生群体分布",
}: StudentGroupsChartProps) {
  const [data, setData] = useState<any[]>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classesData, setClassesData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 获取班级列表
        const { data: classes, error: classesError } = await supabase
          .from("classes")
          .select("id, name")
          .order("name");
          
        if (classesError) throw classesError;
        
        if (!classes || classes.length === 0) {
          setData(mockData);
          setError("暂无班级数据，显示模拟数据");
          return;
        }
        
        // 获取学生及其平均成绩数据
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select(`
            id, 
            name,
            class_id,
            classes(name)
          `);
          
        if (studentsError) throw studentsError;
        
        if (!students || students.length === 0) {
          setData(mockData);
          setError("暂无学生数据，显示模拟数据");
          return;
        }
        
        // 获取作业提交记录来计算平均成绩
        const { data: submissions, error: submissionsError } = await supabase
          .from("homework_submissions")
          .select(`
            id,
            student_id,
            score
          `)
          .not("score", "is", null);
          
        if (submissionsError) throw submissionsError;
        
        if (!submissions || submissions.length === 0) {
          setData(mockData);
          setError("暂无作业提交数据，显示模拟数据");
          return;
        }

        // 计算每个学生的平均成绩
        const studentAvgScores: Record<string, number> = {};
        const studentSubmissions: Record<string, number> = {};
        
        submissions.forEach(sub => {
          if (sub.score !== null) {
            if (!studentAvgScores[sub.student_id]) {
              studentAvgScores[sub.student_id] = 0;
              studentSubmissions[sub.student_id] = 0;
            }
            
            studentAvgScores[sub.student_id] += sub.score;
            studentSubmissions[sub.student_id]++;
          }
        });
        
        // 计算平均分
        Object.keys(studentAvgScores).forEach(studentId => {
          if (studentSubmissions[studentId] > 0) {
            studentAvgScores[studentId] = studentAvgScores[studentId] / studentSubmissions[studentId];
          }
        });
        
        // 按能力水平分组学生
        const totalGroups: Record<string, number> = {
          "优秀": 0,
          "良好": 0,
          "中等": 0,
          "及格": 0,
          "不及格": 0
        };
        
        // 按班级分组的数据
        const classGroups: Record<string, Record<string, number>> = {};
        
        // 初始化班级分组数据
        classes.forEach(cls => {
          classGroups[cls.id] = {
            "优秀": 0,
            "良好": 0,
            "中等": 0,
            "及格": 0,
            "不及格": 0
          };
        });
        
        // 为每个有成绩的学生分配能力组
        students.forEach(student => {
          if (studentAvgScores[student.id]) {
            const score = studentAvgScores[student.id];
            const group = getAbilityGroup(score);
            
            // 增加总计
            totalGroups[group]++;
            
            // 增加班级计数
            if (student.class_id && classGroups[student.class_id]) {
              classGroups[student.class_id][group]++;
            }
          }
        });
        
        // 准备图表数据
        const chartData = [
          {
            id: "总体",
            ...totalGroups,
            "优秀Color": abilityGroups["优秀"].color,
            "良好Color": abilityGroups["良好"].color,
            "中等Color": abilityGroups["中等"].color,
            "及格Color": abilityGroups["及格"].color,
            "不及格Color": abilityGroups["不及格"].color
          }
        ];
        
        // 添加班级数据
        const classChartData = classes.map(cls => ({
          id: cls.name,
          ...classGroups[cls.id],
          "优秀Color": abilityGroups["优秀"].color,
          "良好Color": abilityGroups["良好"].color,
          "中等Color": abilityGroups["中等"].color,
          "及格Color": abilityGroups["及格"].color,
          "不及格Color": abilityGroups["不及格"].color
        }));
        
        setData(chartData);
        setClassesData(classChartData);
      } catch (err: any) {
        console.error("获取学生分组数据失败:", err);
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

  // 切换总体视图和班级视图
  const [showClasses, setShowClasses] = useState(false);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>
              {error ? (
                <span className="text-yellow-500">{error}</span>
              ) : (
                description
              )}
            </CardDescription>
          </div>
          <div>
            <button 
              onClick={() => setShowClasses(!showClasses)}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80"
            >
              {showClasses ? "显示总体分布" : "显示班级分布"}
            </button>
          </div>
        </div>
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
              data={showClasses && classesData.length > 0 ? classesData : data}
              keys={["优秀", "良好", "中等", "及格", "不及格"]}
              indexBy="id"
              margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
              padding={0.3}
              valueScale={{ type: "linear" }}
              indexScale={{ type: "band", round: true }}
              colors={({ id, data }) => String(data[`${id}Color`])}
              borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: showClasses ? "班级" : "分组",
                legendPosition: "middle",
                legendOffset: 32
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: "学生数量",
                legendPosition: "middle",
                legendOffset: -40
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{ from: "color", modifiers: [["darker", 1.6]] }}
              legends={[
                {
                  dataFrom: "keys",
                  anchor: "bottom-right",
                  direction: "column",
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: "left-to-right",
                  itemOpacity: 0.85,
                  symbolSize: 20,
                  effects: [
                    {
                      on: "hover",
                      style: {
                        itemOpacity: 1
                      }
                    }
                  ]
                }
              ]}
              role="application"
              ariaLabel="学生能力分组"
              barAriaLabel={e => e.id + ": " + e.formattedValue + " 名学生"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 