import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Users,
  TrendingUp,
  FileSpreadsheet,
  BarChart3,
  ArrowRight,
  AlertTriangle,
  Clock,
  Target,
} from "lucide-react";
import { Navbar } from "@/components/shared";
import { getAllClasses } from "@/services/classService";
import { showError } from "@/services/errorHandler";
import QuickActions from "@/components/teacher/QuickActions";
import StudentQuickView from "@/components/student/StudentQuickView";
import WarningStudentView from "@/components/student/WarningStudentView";
import {
  getActiveWarningStudents,
  WarningStudentData,
} from "@/services/warningStudentService";
import { supabase } from "@/integrations/supabase/client";

interface Class {
  id: string;
  name: string;
  grade: string;
  studentCount?: number;
  averageScore?: number;
  excellentRate?: number;
}

interface StudentData {
  id: string;
  name: string;
  class_name?: string;
  averageScore?: number;
  recentScores?: number[];
  trend?: "up" | "down" | "stable";
}

const TeacherDashboard: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [recentStudents, setRecentStudents] = useState<StudentData[]>([]);
  const [warningStudents, setWarningStudents] = useState<WarningStudentData[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [showWarningStudents, setShowWarningStudents] = useState(true); // 默认显示预警学生
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // 加载班级数据
      const classesData = await getAllClasses();
      setClasses(classesData.slice(0, 4));

      // 优先加载预警学生数据
      const warningStudentsData = await getActiveWarningStudents(6);
      setWarningStudents(warningStudentsData);

      // 如果预警学生数量不足，补充常规学生数据
      if (warningStudentsData.length < 6) {
        const warningStudentIds = warningStudentsData.map((s) => s.id);

        // 使用真实查询获取学生成绩数据
        const { data: studentsData, error } = await supabase.rpc(
          "get_student_score_summary",
          {
            exclude_ids: warningStudentIds,
            row_limit: 6 - warningStudentsData.length,
          }
        );

        if (error) {
          // 如果 RPC 函数不存在，回退到基础查询
          console.warn("RPC function not found, using fallback query:", error);

          const { data: fallbackData, error: fallbackError } = await supabase
            .from("students")
            .select(
              `
              id,
              name,
              class_name
            `
            )
            .not("id", "in", `(${warningStudentIds.join(",") || "NULL"})`)
            .limit(6 - warningStudentsData.length);

          if (fallbackError) throw fallbackError;

          // 获取每个学生的成绩统计
          const formattedStudents = await Promise.all(
            (fallbackData || []).map(async (student) => {
              const { data: gradeData } = await supabase
                .from("grade_data")
                .select("total_score, exam_date")
                .eq("student_id", student.id)
                .order("exam_date", { ascending: false })
                .limit(3);

              const scores =
                gradeData?.map((g) => g.total_score).filter(Boolean) || [];
              const avgScore =
                scores.length > 0
                  ? scores.reduce((a, b) => a + b, 0) / scores.length
                  : undefined;

              // 计算趋势
              let trend: "up" | "down" | "stable" = "stable";
              if (scores.length >= 2) {
                const diff = scores[0] - scores[1];
                if (diff > 5) trend = "up";
                else if (diff < -5) trend = "down";
              }

              return {
                id: student.id,
                name: student.name,
                class_name: student.class_name,
                averageScore: avgScore,
                recentScores: scores.slice(0, 3),
                trend,
              };
            })
          );

          setRecentStudents(formattedStudents);
        } else {
          // RPC 函数存在，使用返回的数据
          const formattedStudents =
            studentsData?.map((student: any) => {
              const scores = student.recent_scores || [];
              let trend: "up" | "down" | "stable" = "stable";
              if (scores.length >= 2) {
                const diff = scores[0] - scores[1];
                if (diff > 5) trend = "up";
                else if (diff < -5) trend = "down";
              }

              return {
                id: student.id,
                name: student.name,
                class_name: student.class_name,
                averageScore: student.average_score,
                recentScores: scores.slice(0, 3),
                trend,
              };
            }) || [];

          setRecentStudents(formattedStudents);
        }
      }
    } catch (error) {
      showError(error, { operation: "获取教师工作台数据" });
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = (classItem: Class) => {
    navigate("/class-management", {
      state: { selectedClass: classItem },
    });
  };

  const handleViewStudent = (studentId: string) => {
    navigate(`/student-management?student=${studentId}`);
  };

  const handleViewWarningDetails = (studentId: string) => {
    navigate(`/warning-analysis?student=${studentId}`);
  };

  const toggleStudentView = () => {
    setShowWarningStudents(!showWarningStudents);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">教师工作台</h1>
          <p className="text-gray-600 mt-2">快速访问您的班级和学生信息</p>
        </div>

        {/* 数据概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-[#B9FF66]/10 rounded-lg">
                <BookOpen className="h-8 w-8 text-gray-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  管理班级
                </p>
                <div className="text-2xl font-bold">{classes.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-[#B9FF66]/20 rounded-lg">
                <Users className="h-8 w-8 text-gray-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  学生总数
                </p>
                <div className="text-2xl font-bold">
                  {classes.reduce(
                    (sum, cls) => sum + (cls.studentCount || 0),
                    0
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-gray-100 rounded-lg">
                <TrendingUp className="h-8 w-8 text-gray-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  平均成绩
                </p>
                <div className="text-2xl font-bold">
                  {classes.length > 0
                    ? (
                        classes.reduce(
                          (sum, cls) => sum + (cls.averageScore || 0),
                          0
                        ) / classes.length
                      ).toFixed(1)
                    : "0.0"}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Target className="h-8 w-8 text-gray-700" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  优秀率
                </p>
                <div className="text-2xl font-bold">
                  {classes.length > 0
                    ? (
                        classes.reduce(
                          (sum, cls) => sum + (cls.excellentRate || 0),
                          0
                        ) / classes.length
                      ).toFixed(1)
                    : "0.0"}
                  %
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快捷操作区 */}
        <QuickActions />

        {/* 我的班级概览 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">我的班级</h2>
            <Button
              variant="ghost"
              onClick={() => navigate("/class-management")}
              className="text-gray-700 hover:text-black font-medium"
            >
              查看全部
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                <BookOpen className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">
                暂无班级信息
              </h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                您还没有管理的班级
                <br />
                请联系管理员分配班级
              </p>
              <Button
                onClick={() => navigate("/class-management")}
                className="bg-[#B9FF66] text-black hover:bg-[#a8e85c] font-medium shadow-md"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                前往班级管理
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {classes.map((classItem) => (
                <Card
                  key={classItem.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleClassClick(classItem)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-medium">
                          {classItem.name}
                        </CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {classItem.grade}
                        </Badge>
                      </div>
                      <BookOpen className="h-5 w-5 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">学生人数</span>
                        <span className="font-medium">
                          {classItem.studentCount || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">平均分</span>
                        <span className="font-medium">
                          {classItem.averageScore?.toFixed(1) || "0.0"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">优秀率</span>
                        <span className="font-medium">
                          {classItem.excellentRate?.toFixed(1) || "0.0"}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 关注学生区域 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {showWarningStudents && warningStudents.length > 0
                  ? "预警学生"
                  : "最近关注学生"}
              </h2>
              {warningStudents.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={showWarningStudents ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowWarningStudents(true)}
                    className={cn(
                      showWarningStudents && "bg-red-500 hover:bg-red-600"
                    )}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    预警学生({warningStudents.length})
                  </Button>
                  <Button
                    variant={!showWarningStudents ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowWarningStudents(false)}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    常规学生
                  </Button>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                navigate(
                  showWarningStudents
                    ? "/warning-analysis"
                    : "/student-management"
                )
              }
              className="text-gray-700 hover:text-black font-medium"
            >
              查看全部
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : showWarningStudents && warningStudents.length > 0 ? (
            <WarningStudentView
              students={warningStudents}
              onViewStudent={handleViewStudent}
              onViewWarningDetails={handleViewWarningDetails}
            />
          ) : recentStudents.length > 0 ? (
            <StudentQuickView
              students={recentStudents}
              onViewStudent={handleViewStudent}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                <Users className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">
                暂无学生数据
              </h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                {showWarningStudents
                  ? "目前没有需要预警的学生"
                  : "还没有学生成绩数据"}
                <br />
                {showWarningStudents
                  ? "请切换到常规学生查看"
                  : "请导入学生成绩后再查看"}
              </p>
              <Button
                onClick={() =>
                  showWarningStudents
                    ? setShowWarningStudents(false)
                    : navigate("/")
                }
                className="bg-[#B9FF66] text-black hover:bg-[#a8e85c] font-medium shadow-md"
              >
                {showWarningStudents ? (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    查看常规学生
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    前往数据导入
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
