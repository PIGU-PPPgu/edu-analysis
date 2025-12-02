/**
 * 教师Dashboard优先级卡片
 * 显示待批改作业、最新预警、班级成绩趋势等关键信息
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// 待批改作业接口
interface PendingHomework {
  id: string;
  title: string;
  dueDate: string;
  submissionCount: number;
  totalStudents: number;
  className: string;
}

// 预警信息接口
interface RecentWarning {
  id: string;
  studentName: string;
  className: string;
  warningType: string;
  severity: "high" | "medium" | "low";
  createdAt: string;
  details: string;
}

// 班级趋势接口
interface ClassTrend {
  className: string;
  trend: "up" | "down" | "stable";
  currentAvg: number;
  previousAvg: number;
  change: number;
  recentScores: Array<{
    exam: string;
    score: number;
  }>;
}

const PriorityDashboardCards: React.FC = () => {
  const navigate = useNavigate();

  const [pendingHomework, setPendingHomework] = useState<PendingHomework[]>([]);
  const [recentWarnings, setRecentWarnings] = useState<RecentWarning[]>([]);
  const [classTrends, setClassTrends] = useState<ClassTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriorityData();
  }, []);

  const loadPriorityData = async () => {
    try {
      await Promise.all([
        loadPendingHomework(),
        loadRecentWarnings(),
        loadClassTrends(),
      ]);
    } catch (error) {
      console.error("加载优先级数据失败:", error);
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载待批改作业
  const loadPendingHomework = async () => {
    try {
      const { data: homework, error } = await supabase
        .from("homework")
        .select(
          `
          id,
          title,
          due_date,
          class_id,
          classes!inner(name)
        `
        )
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(3);

      if (error) throw error;

      // 获取每个作业的提交情况
      const homeworkWithStats = await Promise.all(
        (homework || []).map(async (hw) => {
          const { count: submissionCount } = await supabase
            .from("homework_submissions")
            .select("*", { count: "exact", head: true })
            .eq("homework_id", hw.id);

          const { count: totalStudents } = await supabase
            .from("students")
            .select("*", { count: "exact", head: true })
            .eq("class_id", hw.class_id);

          return {
            id: hw.id,
            title: hw.title,
            dueDate: hw.due_date,
            submissionCount: submissionCount || 0,
            totalStudents: totalStudents || 0,
            className: (hw as any).classes?.name || "未知班级",
          };
        })
      );

      setPendingHomework(homeworkWithStats);
    } catch (error) {
      console.error("加载待批改作业失败:", error);
    }
  };

  // 加载最新预警
  const loadRecentWarnings = async () => {
    try {
      const { data: warnings, error } = await supabase
        .from("warning_records")
        .select(
          `
          id,
          details,
          created_at,
          students!inner(
            id,
            name,
            class_info!inner(class_name)
          ),
          warning_rules!inner(
            name,
            severity
          )
        `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedWarnings =
        warnings?.map((w: any) => ({
          id: w.id,
          studentName: w.students?.name || "未知学生",
          className: w.students?.class_info?.class_name || "未知班级",
          warningType: w.warning_rules?.name || "未分类预警",
          severity: (w.warning_rules?.severity || "medium") as
            | "high"
            | "medium"
            | "low",
          createdAt: w.created_at,
          details: JSON.stringify(w.details),
        })) || [];

      setRecentWarnings(formattedWarnings);
    } catch (error) {
      console.error("加载预警信息失败:", error);
    }
  };

  // 加载班级成绩趋势
  const loadClassTrends = async () => {
    try {
      // 获取最近两次考试的班级平均分
      const { data: recentExams, error: examsError } = await supabase
        .from("exams")
        .select("id, title, date")
        .order("date", { ascending: false })
        .limit(5);

      if (examsError) throw examsError;

      if (!recentExams || recentExams.length < 2) {
        return;
      }

      // 获取班级列表
      const { data: classes, error: classesError } = await supabase
        .from("class_info")
        .select("class_name")
        .limit(3);

      if (classesError) throw classesError;

      const trends = await Promise.all(
        (classes || []).map(async (cls) => {
          // 获取该班级在最近考试的平均分
          const scores = await Promise.all(
            recentExams.slice(0, 3).map(async (exam) => {
              const { data: grades } = await supabase
                .from("grade_data")
                .select("total_score")
                .eq("exam_id", exam.id)
                .eq("class_name", cls.class_name);

              const avgScore = grades?.length
                ? grades.reduce((sum, g) => sum + (g.total_score || 0), 0) /
                  grades.length
                : 0;

              return {
                exam: exam.title,
                score: Math.round(avgScore * 10) / 10,
              };
            })
          );

          const currentAvg = scores[0]?.score || 0;
          const previousAvg = scores[1]?.score || 0;
          const change = currentAvg - previousAvg;

          let trend: "up" | "down" | "stable" = "stable";
          if (change > 2) trend = "up";
          else if (change < -2) trend = "down";

          return {
            className: cls.class_name,
            trend,
            currentAvg,
            previousAvg,
            change: Math.round(change * 10) / 10,
            recentScores: scores,
          };
        })
      );

      setClassTrends(trends);
    } catch (error) {
      console.error("加载班级趋势失败:", error);
    }
  };

  const getSeverityColor = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-orange-500";
      case "low":
        return "bg-yellow-500";
    }
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "stable":
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* 待批改作业卡片 */}
      <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            待批改作业
            {pendingHomework.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {pendingHomework.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingHomework.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="text-sm">太棒了!暂无待批改作业</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingHomework.map((hw) => (
                <div
                  key={hw.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                  onClick={() => navigate(`/homework/${hw.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {hw.title}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {hw.className}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      截止: {new Date(hw.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>
                        已提交: {hw.submissionCount}/{hw.totalStudents}
                      </span>
                      <span>
                        {Math.round(
                          (hw.submissionCount / hw.totalStudents) * 100
                        )}
                        %
                      </span>
                    </div>
                    <Progress
                      value={(hw.submissionCount / hw.totalStudents) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate("/homework")}
              >
                查看全部
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最新预警卡片 */}
      <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            最新预警
            {recentWarnings.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {recentWarnings.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentWarnings.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
              <p className="text-sm">很好!暂无活跃预警</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentWarnings.slice(0, 3).map((warning) => (
                <div
                  key={warning.id}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition"
                  onClick={() =>
                    navigate(`/warning-analysis?warning=${warning.id}`)
                  }
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 ${getSeverityColor(warning.severity)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {warning.studentName}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 ml-2"
                        >
                          {warning.className}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        {warning.warningType}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(warning.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate("/warning-analysis")}
              >
                查看全部
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 班级成绩趋势卡片 */}
      <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            班级成绩趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classTrends.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <XCircle className="h-10 w-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">暂无趋势数据</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classTrends.map((trend) => (
                <div
                  key={trend.className}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{trend.className}</h4>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(trend.trend)}
                      <span
                        className={`text-xs font-medium ${
                          trend.change > 0
                            ? "text-green-600"
                            : trend.change < 0
                              ? "text-red-600"
                              : "text-gray-600"
                        }`}
                      >
                        {trend.change > 0 ? "+" : ""}
                        {trend.change}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    当前平均分: {trend.currentAvg} 分
                  </div>
                  <ResponsiveContainer width="100%" height={60}>
                    <LineChart data={trend.recentScores}>
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Tooltip
                        contentStyle={{
                          fontSize: "12px",
                          padding: "4px 8px",
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate("/class-management")}
              >
                查看详情
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PriorityDashboardCards;
