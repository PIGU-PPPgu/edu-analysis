import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ClassPerformanceTableProps {
  className?: string;
  title?: string;
  description?: string;
}

export default function ClassPerformanceTable({
  className,
  title = "班级表现一览",
  description = "班级整体表现与关键指标",
}: ClassPerformanceTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setData([]);
          setError("暂无班级数据");
          return;
        }
        
        const performanceData = [];
        
        // 获取每个班级的学生
        for (const classItem of classes) {
          // 获取班级学生
          const { data: students, error: studentsError } = await supabase
            .from("students")
            .select("id, name")
            .eq("class_id", classItem.id);
            
          if (studentsError) throw studentsError;
          
          if (!students || students.length === 0) {
            continue;
          }
          
          // 学生ID列表
          const studentIds = students.map(s => s.id);
          
          // 获取最近5个作业
          const { data: homeworks, error: homeworksError } = await supabase
            .from("homework")
            .select("id, title")
            .order("created_at", { ascending: false })
            .limit(5);
            
          if (homeworksError) throw homeworksError;
          
          if (!homeworks || homeworks.length === 0) {
            continue;
          }
          
          // 计算各项指标
          let totalSubmissions = 0;
          let totalScores = 0;
          let totalSubmitted = 0;
          let totalCompletedOnTime = 0;
          let totalHomeworkCount = homeworks.length;
          let totalStudentCount = students.length;
          let previousClassAvg = null;
          let currentClassAvg = null;
          
          // 按时间排序，最新的在前面
          for (let hwIndex = 0; hwIndex < homeworks.length; hwIndex++) {
            const homework = homeworks[hwIndex];
            
            // 获取该班级学生在此作业的提交
            const { data: submissions, error: submissionsError } = await supabase
              .from("homework_submissions")
              .select("id, score, status, submitted_at, student_id")
              .eq("homework_id", homework.id)
              .in("student_id", studentIds);
              
            if (submissionsError) throw submissionsError;
            
            if (!submissions || submissions.length === 0) {
              continue;
            }
            
            // 统计数据
            const submittedCount = submissions.filter(s => 
              s.status === "submitted" || s.status === "graded"
            ).length;
            
            const scoresWithValues = submissions.filter(s => s.score !== null && s.score !== undefined);
            const avgScore = scoresWithValues.length > 0 
              ? scoresWithValues.reduce((sum, s) => sum + s.score, 0) / scoresWithValues.length 
              : 0;
            
            totalSubmissions += submissions.length;
            totalScores += avgScore * scoresWithValues.length;
            totalSubmitted += submittedCount;
            
            // 计算当前和前一个作业的平均分，用于趋势
            if (hwIndex === 0) {
              currentClassAvg = avgScore;
            } else if (hwIndex === 1) {
              previousClassAvg = avgScore;
            }
          }
          
          // 计算整体指标
          const submissionRate = totalSubmissions > 0
            ? (totalSubmitted / totalSubmissions) * 100
            : 0;
            
          const averageScore = totalSubmitted > 0
            ? totalScores / totalSubmitted
            : 0;
            
          // 确定趋势
          let trend = "neutral";
          if (previousClassAvg !== null && currentClassAvg !== null) {
            if (currentClassAvg > previousClassAvg + 5) {
              trend = "up";
            } else if (currentClassAvg < previousClassAvg - 5) {
              trend = "down";
            }
          }
          
          performanceData.push({
            id: classItem.id,
            className: classItem.name,
            studentCount: totalStudentCount,
            averageScore: averageScore.toFixed(1),
            submissionRate: submissionRate.toFixed(1),
            trend
          });
        }
        
        setData(performanceData);
      } catch (err: any) {
        console.error("获取班级表现数据失败:", err);
        setError(`加载失败: ${err.message || "未知错误"}`);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  // 根据提交率获取颜色
  function getSubmissionRateColor(rate) {
    rate = parseFloat(rate);
    if (rate >= 90) return "bg-green-100 text-green-800";
    if (rate >= 75) return "bg-blue-100 text-blue-800";
    if (rate >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  }
  
  // 根据平均分获取颜色
  function getScoreColor(score) {
    score = parseFloat(score);
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-blue-100 text-blue-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
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
      <CardContent>
        {loading ? (
          <div className="flex flex-col space-y-4 w-full">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex justify-center items-center h-[200px]">
            <div className="text-center text-muted-foreground">
              <p>暂无班级表现数据</p>
              <p className="text-sm mt-2">请先添加班级和学生信息</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>班级</TableHead>
                  <TableHead>学生数</TableHead>
                  <TableHead>平均分</TableHead>
                  <TableHead>提交率</TableHead>
                  <TableHead className="text-right">趋势</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.className}</TableCell>
                    <TableCell>{item.studentCount}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getScoreColor(item.averageScore)}>
                        {item.averageScore}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getSubmissionRateColor(item.submissionRate)}>
                        {item.submissionRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.trend === "up" ? (
                        <span className="inline-flex items-center text-green-600">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          上升
                        </span>
                      ) : item.trend === "down" ? (
                        <span className="inline-flex items-center text-red-600">
                          <TrendingDown className="h-4 w-4 mr-1" />
                          下降
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-gray-500">
                          <Minus className="h-4 w-4 mr-1" />
                          持平
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 