import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveLine } from "@nivo/line";
import { Input } from "@/components/ui/input";

interface StudentVsGroupChartProps {
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
    id: "学生成绩",
    color: "hsl(207, 70%, 50%)",
    data: [
      { x: "作业1", y: 85 },
      { x: "作业2", y: 82 },
      { x: "作业3", y: 88 },
      { x: "作业4", y: 90 },
      { x: "作业5", y: 92 }
    ]
  },
  {
    id: "群体平均",
    color: "hsl(272, 70%, 50%)",
    data: [
      { x: "作业1", y: 82 },
      { x: "作业2", y: 83 },
      { x: "作业3", y: 85 },
      { x: "作业4", y: 86 },
      { x: "作业5", y: 88 }
    ]
  },
  {
    id: "总体平均",
    color: "hsl(25, 70%, 50%)",
    data: [
      { x: "作业1", y: 75 },
      { x: "作业2", y: 76 },
      { x: "作业3", y: 78 },
      { x: "作业4", y: 79 },
      { x: "作业5", y: 80 }
    ]
  }
];

interface Student {
  id: string;
  name: string;
  class_name?: string;
  class_id?: string;
}

interface Class {
  id: string;
  name: string;
}

export default function StudentVsGroupChart({
  className,
  title = "个体与群体表现对比",
  description = "学生个体与所在群体的表现对比",
}: StudentVsGroupChartProps) {
  const [data, setData] = useState<any[]>(mockData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchName, setSearchName] = useState<string>("");
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [studentGroups, setStudentGroups] = useState<Record<string, string>>({});
  const [groupScores, setGroupScores] = useState<Record<string, Record<string, { sum: number, count: number }>>>({});
  const [totalAverages, setTotalAverages] = useState<Record<string, { sum: number, count: number }>>({});

  // 获取基础数据：班级、学生、作业和提交记录
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // 获取班级列表
        const { data: classesData, error: classesError } = await supabase
          .from("classes")
          .select("id, name")
          .order("name");
          
        if (classesError) throw classesError;
        
        if (classesData && classesData.length > 0) {
          setClasses(classesData);
        }
        
        // 获取学生列表
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(`
            id, 
            name,
            class_id,
            classes(name)
          `)
          .order("name");
          
        if (studentsError) throw studentsError;
        
        if (!studentsData || studentsData.length === 0) {
          setError("暂无学生数据");
          return;
        }
        
        // 处理学生数据
        const processedStudents = studentsData.map(student => ({
          id: student.id,
          name: student.name,
          class_name: student.classes?.name,
          class_id: student.class_id
        }));
        
        setStudents(processedStudents);
        setFilteredStudents(processedStudents);
        
        // 获取作业列表，按时间顺序
        const { data: homeworksData, error: homeworksError } = await supabase
          .from("homework")
          .select("id, title, created_at")
          .order("created_at");
          
        if (homeworksError) throw homeworksError;
        
        if (!homeworksData || homeworksData.length < 2) {
          setError("作业数量不足");
          return;
        }
        
        setHomeworks(homeworksData);
        
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
          setError("暂无作业提交数据");
          return;
        }
        
        // 按作业创建时间排序提交记录
        submissions.sort((a, b) => {
          const dateA = new Date(a.homework.created_at);
          const dateB = new Date(b.homework.created_at);
          return dateA.getTime() - dateB.getTime();
        });
        
        // 获取第一次作业的成绩，确定学生的初始能力分组
        const firstHomeworkId = homeworksData[0].id;
        const firstSubmissions = submissions.filter(sub => 
          sub.homework_id === firstHomeworkId && sub.score !== null
        );
        
        // 确定每个学生的初始分组
        const initialStudentGroups: Record<string, string> = {};
        
        firstSubmissions.forEach(sub => {
          if (sub.score !== null) {
            initialStudentGroups[sub.student_id] = getAbilityGroup(sub.score);
          }
        });
        
        setStudentGroups(initialStudentGroups);
        
        // 为每个作业计算不同能力组的平均分
        const homeworkScores: Record<string, Record<string, { sum: number, count: number }>> = {};
        
        // 计算每个作业的总体平均分
        const overallAverages: Record<string, { sum: number, count: number }> = {};
        
        // 初始化数据结构
        homeworksData.forEach(hw => {
          homeworkScores[hw.id] = {
            "优秀": { sum: 0, count: 0 },
            "良好": { sum: 0, count: 0 },
            "中等": { sum: 0, count: 0 },
            "及格": { sum: 0, count: 0 },
            "不及格": { sum: 0, count: 0 }
          };
          
          // 初始化总体平均分数据
          overallAverages[hw.id] = { sum: 0, count: 0 };
        });
        
        // 填充每个学生在每个作业的成绩数据
        submissions.forEach(sub => {
          if (sub.score !== null) {
            // 累加总体平均分
            if (overallAverages[sub.homework_id]) {
              overallAverages[sub.homework_id].sum += sub.score;
              overallAverages[sub.homework_id].count += 1;
            }
            
            // 累加能力组平均分
            if (initialStudentGroups[sub.student_id]) {
              const group = initialStudentGroups[sub.student_id];
              if (homeworkScores[sub.homework_id] && homeworkScores[sub.homework_id][group]) {
                homeworkScores[sub.homework_id][group].sum += sub.score;
                homeworkScores[sub.homework_id][group].count += 1;
              }
            }
          }
        });
        
        setGroupScores(homeworkScores);
        setTotalAverages(overallAverages);
        
        // 设置默认选中的学生（如果有的话）
        if (processedStudents.length > 0) {
          setSelectedStudent(processedStudents[0].id);
        }
        
        // 初始状态下显示默认数据
        setData(mockData);
      } catch (err: any) {
        console.error("获取个体与群体对比数据失败:", err);
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // 处理班级选择变化
  useEffect(() => {
    if (selectedClass && selectedClass !== "all") {
      const filtered = students.filter(student => student.class_id === selectedClass);
      setFilteredStudents(filtered);
      
      // 如果当前选中的学生不在筛选后的列表中，重置选择
      if (!filtered.find(s => s.id === selectedStudent) && filtered.length > 0) {
        setSelectedStudent(filtered[0].id);
      } else if (filtered.length === 0) {
        setSelectedStudent("");
      }
    } else {
      // 按名称搜索筛选
      const filtered = students.filter(student => 
        student.name.toLowerCase().includes(searchName.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  }, [selectedClass, searchName, students]);

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchName(e.target.value);
    // 清除班级筛选
    setSelectedClass("all");
  };

  // 处理班级选择变化
  const handleClassChange = (value: string) => {
    setSelectedClass(value);
    // 清除搜索框
    setSearchName("");
  };

  // 当选择学生变化时更新图表
  useEffect(() => {
    if (!selectedStudent || homeworks.length === 0 || Object.keys(studentGroups).length === 0) {
      return;
    }
    
    // 获取所选学生的成绩数据
    async function fetchStudentScores() {
      try {
        setLoading(true);
        
        const { data: submissions, error: submissionsError } = await supabase
          .from("homework_submissions")
          .select(`
            homework_id,
            score,
            homework(title, created_at)
          `)
          .eq("student_id", selectedStudent)
          .not("score", "is", null);
          
        if (submissionsError) throw submissionsError;
        
        if (!submissions || submissions.length === 0) {
          setData(mockData);
          setError("所选学生没有提交记录，显示模拟数据");
          return;
        }
        
        // 按照作业创建时间排序
        submissions.sort((a, b) => {
          const dateA = new Date(a.homework.created_at);
          const dateB = new Date(b.homework.created_at);
          return dateA.getTime() - dateB.getTime();
        });
        
        // 学生所在的能力组
        const studentGroup = studentGroups[selectedStudent];
        
        if (!studentGroup) {
          setData(mockData);
          setError("无法确定学生能力组，显示模拟数据");
          return;
        }
        
        // 准备学生成绩数据
        const studentScoreData = {
          id: "学生成绩",
          color: "hsl(207, 70%, 50%)",
          data: [] as { x: string, y: number }[]
        };
        
        // 准备群体平均成绩数据
        const groupAvgData = {
          id: `${studentGroup}组平均`,
          color: abilityGroups[studentGroup as keyof typeof abilityGroups].color,
          data: [] as { x: string, y: number }[]
        };
        
        // 准备总体平均成绩数据
        const totalAvgData = {
          id: "总体平均",
          color: "hsl(25, 70%, 50%)",
          data: [] as { x: string, y: number }[]
        };
        
        // 遍历作业，添加数据点
        homeworks.forEach(hw => {
          // 查找该学生在该作业的成绩
          const submission = submissions.find(sub => sub.homework_id === hw.id);
          
          if (submission && submission.score !== null) {
            const displayTitle = hw.title.length > 8 ? hw.title.substring(0, 8) + '...' : hw.title;
            
            studentScoreData.data.push({
              x: displayTitle,
              y: submission.score
            });
            
            // 获取该群体在该作业的平均成绩
            if (groupScores[hw.id] && 
                groupScores[hw.id][studentGroup] && 
                groupScores[hw.id][studentGroup].count > 0) {
              
              const avg = groupScores[hw.id][studentGroup].sum / groupScores[hw.id][studentGroup].count;
              
              groupAvgData.data.push({
                x: displayTitle,
                y: Math.round(avg * 10) / 10
              });
            }
            
            // 获取总体平均成绩
            if (totalAverages[hw.id] && totalAverages[hw.id].count > 0) {
              const total = totalAverages[hw.id].sum / totalAverages[hw.id].count;
              
              totalAvgData.data.push({
                x: displayTitle,
                y: Math.round(total * 10) / 10
              });
            }
          }
        });
        
        // 只有当学生有数据时才显示
        if (studentScoreData.data.length > 0) {
          // 确保所有数据集有相同的x值（作业）
          const chartData = [studentScoreData];
          
          if (groupAvgData.data.length > 0) {
            // 过滤群体数据，只保留与学生数据相同的作业
            const studentHomeworkTitles = studentScoreData.data.map(d => d.x);
            groupAvgData.data = groupAvgData.data.filter(d => studentHomeworkTitles.includes(d.x));
            
            chartData.push(groupAvgData);
          }
          
          // 添加总体平均线
          if (totalAvgData.data.length > 0) {
            // 过滤总体数据，只保留与学生数据相同的作业
            const studentHomeworkTitles = studentScoreData.data.map(d => d.x);
            totalAvgData.data = totalAvgData.data.filter(d => studentHomeworkTitles.includes(d.x));
            
            chartData.push(totalAvgData);
          }
          
          setData(chartData);
          setError(null);
        } else {
          setData(mockData);
          setError("所选学生没有足够的成绩数据，显示模拟数据");
        }
      } catch (err: any) {
        console.error("获取学生成绩数据失败:", err);
        setData(mockData);
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudentScores();
  }, [selectedStudent, homeworks, studentGroups, groupScores, totalAverages]);

  // 根据分数确定能力组
  function getAbilityGroup(score: number): string {
    for (const [group, range] of Object.entries(abilityGroups)) {
      if (score >= range.min && score <= range.max) {
        return group;
      }
    }
    return "不及格"; // 默认
  }

  // 查找选中学生的完整信息
  const selectedStudentInfo = students.find(s => s.id === selectedStudent);
  const studentDisplayName = selectedStudentInfo 
    ? `${selectedStudentInfo.name}${selectedStudentInfo.class_name ? ` (${selectedStudentInfo.class_name})` : ''}`
    : "选择学生";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col space-y-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>
            {error ? (
              <span className="text-yellow-500">{error}</span>
            ) : (
              description
            )}
          </CardDescription>
          
          <div className="mt-2 flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start">
            {/* 班级筛选 */}
            <div className="w-full max-w-xs">
              <Select 
                value={selectedClass} 
                onValueChange={handleClassChange}
                disabled={loading || classes.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部班级</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 学生姓名搜索 */}
            <div className="w-full max-w-xs">
              <Input
                placeholder="搜索学生姓名"
                value={searchName}
                onChange={handleSearchChange}
                disabled={loading}
              />
            </div>
            
            {/* 学生选择 */}
            <div className="w-full max-w-xs">
              <Select 
                value={selectedStudent} 
                onValueChange={setSelectedStudent}
                disabled={loading || filteredStudents.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择学生" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}{student.class_name ? ` (${student.class_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* 显示当前选中的学生 */}
          {selectedStudentInfo && (
            <div className="text-sm text-muted-foreground">
              当前选中: <span className="font-medium">{studentDisplayName}</span>
              {studentGroups[selectedStudent] && (
                <span className="ml-2">
                  能力水平: <span className="font-medium">{studentGroups[selectedStudent]}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {loading ? (
          <div className="flex flex-col h-[350px] w-full space-y-4 justify-center items-center">
            <Skeleton className="h-[300px] w-full rounded-md" />
            <div className="text-sm text-muted-foreground">加载中...</div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <p className="text-muted-foreground">没有符合条件的学生</p>
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
              curve="cardinal"
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
                legend: "分数",
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