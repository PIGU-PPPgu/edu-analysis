/**
 * 跨班级对比组件 - 显示同年级所有班级的关键指标对比
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClassStats {
  className: string;
  averageScore: number;
  passRate: number; // 及格率
  excellentRate: number; // 优秀率
  studentCount: number;
  rank: number;
  isCurrentClass: boolean;
}

interface ClassComparisonProps {
  className: string;
  grade?: string; // 年级，如"高一"
}

export function ClassComparison({ className, grade }: ClassComparisonProps) {
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentClassStats, setCurrentClassStats] = useState<ClassStats | null>(null);

  useEffect(() => {
    loadClassComparison();
  }, [className, grade]);

  const loadClassComparison = async () => {
    if (!className) return;

    setIsLoading(true);
    try {
      // 1. 推断年级（如果没有提供）
      const inferredGrade =
        grade || inferGradeFromClassName(className);

      // 2. 获取同年级所有班级的成绩数据（最近一次考试）
      const { data: recentExam } = await supabase
        .from("grade_data_new")
        .select("exam_id, exam_date")
        .order("exam_date", { ascending: false })
        .limit(1)
        .single();

      if (!recentExam) {
        toast.error("没有找到考试数据");
        return;
      }

      // 3. 获取该考试的所有成绩数据
      const { data: allGrades, error } = await supabase
        .from("grade_data_new")
        .select("class_name, total_score")
        .eq("exam_id", recentExam.exam_id)
        .not("total_score", "is", null);

      if (error) {
        console.error("获取成绩数据失败:", error);
        toast.error("获取数据失败");
        return;
      }

      if (!allGrades || allGrades.length === 0) {
        return;
      }

      // 4. 按班级分组统计
      const classGroups = new Map<string, number[]>();
      allGrades.forEach((record: any) => {
        const cls = record.class_name;
        if (!cls) return;

        // 简单的年级匹配
        const recordGrade = inferGradeFromClassName(cls);
        if (recordGrade !== inferredGrade) return;

        if (!classGroups.has(cls)) {
          classGroups.set(cls, []);
        }
        classGroups.get(cls)!.push(record.total_score);
      });

      // 5. 计算各班级统计指标
      const stats: ClassStats[] = Array.from(classGroups.entries()).map(
        ([cls, scores]) => {
          const average =
            scores.reduce((sum, s) => sum + s, 0) / scores.length;
          const passCount = scores.filter((s) => s >= 60).length;
          const excellentCount = scores.filter((s) => s >= 85).length;

          return {
            className: cls,
            averageScore: Math.round(average * 10) / 10,
            passRate: Math.round((passCount / scores.length) * 100),
            excellentRate: Math.round((excellentCount / scores.length) * 100),
            studentCount: scores.length,
            rank: 0, // 待计算
            isCurrentClass: cls === className,
          };
        }
      );

      // 6. 计算排名（按平均分降序）
      stats.sort((a, b) => b.averageScore - a.averageScore);
      stats.forEach((stat, index) => {
        stat.rank = index + 1;
      });

      // 7. 找出当前班级
      const current = stats.find((s) => s.isCurrentClass);

      setClassStats(stats);
      setCurrentClassStats(current || null);
    } catch (error) {
      console.error("加载班级对比数据异常:", error);
      toast.error("加载对比数据失败");
    } finally {
      setIsLoading(false);
    }
  };

  const inferGradeFromClassName = (cls: string): string => {
    if (cls.includes("高一")) return "高一";
    if (cls.includes("高二")) return "高二";
    if (cls.includes("高三")) return "高三";
    if (cls.includes("初一") || cls.includes("七")) return "初一";
    if (cls.includes("初二") || cls.includes("八")) return "初二";
    if (cls.includes("初三") || cls.includes("九")) return "初三";
    return "未知";
  };

  const getRankBadgeColor = (rank: number, total: number) => {
    if (rank === 1) return "bg-yellow-500 text-white";
    if (rank <= total * 0.3) return "bg-green-500 text-white";
    if (rank <= total * 0.6) return "bg-blue-500 text-white";
    return "bg-gray-500 text-white";
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (classStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>跨班级对比</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>暂无对比数据</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>年级班级对比</span>
          {currentClassStats && (
            <Badge className={getRankBadgeColor(currentClassStats.rank, classStats.length)}>
              <Award className="w-4 h-4 mr-1" />
              年级第 {currentClassStats.rank} 名
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 当前班级关键指标卡片 */}
        {currentClassStats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">平均分</div>
              <div className="text-2xl font-bold text-blue-600">
                {currentClassStats.averageScore}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">及格率</div>
              <div className="text-2xl font-bold text-green-600">
                {currentClassStats.passRate}%
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">优秀率</div>
              <div className="text-2xl font-bold text-purple-600">
                {currentClassStats.excellentRate}%
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">年级排名</div>
              <div className="text-2xl font-bold text-orange-600">
                {currentClassStats.rank}/{classStats.length}
              </div>
            </div>
          </div>
        )}

        {/* 平均分对比柱状图 */}
        <div>
          <h3 className="text-sm font-medium mb-4">平均分对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="className" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="averageScore"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 及格率和优秀率对比 */}
        <div>
          <h3 className="text-sm font-medium mb-4">及格率与优秀率对比</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="className" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="passRate" fill="#10b981" name="及格率(%)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="excellentRate" fill="#8b5cf6" name="优秀率(%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 班级排名表格 */}
        <div>
          <h3 className="text-sm font-medium mb-4">班级排名详情</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">排名</th>
                  <th className="px-4 py-2 text-left">班级</th>
                  <th className="px-4 py-2 text-right">平均分</th>
                  <th className="px-4 py-2 text-right">及格率</th>
                  <th className="px-4 py-2 text-right">优秀率</th>
                  <th className="px-4 py-2 text-right">人数</th>
                </tr>
              </thead>
              <tbody>
                {classStats.map((stat) => (
                  <tr
                    key={stat.className}
                    className={`border-t ${
                      stat.isCurrentClass ? "bg-blue-50 font-medium" : ""
                    }`}
                  >
                    <td className="px-4 py-2">
                      <Badge className={getRankBadgeColor(stat.rank, classStats.length)}>
                        {stat.rank}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {stat.className}
                      {stat.isCurrentClass && (
                        <Badge variant="outline" className="ml-2">
                          当前
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {stat.averageScore}
                    </td>
                    <td className="px-4 py-2 text-right">{stat.passRate}%</td>
                    <td className="px-4 py-2 text-right">
                      {stat.excellentRate}%
                    </td>
                    <td className="px-4 py-2 text-right">
                      {stat.studentCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
