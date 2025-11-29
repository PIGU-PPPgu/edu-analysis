import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        const { data: studentsData, error } = await supabase
          .from("students")
          .select(
            `
            id,
            name,
            class_info!inner(class_name)
          `
          )
          .not(
            "id",
            "in",
            `(${warningStudentsData.map((s) => s.id).join(",") || "NULL"})`
          )
          .limit(6 - warningStudentsData.length);

        if (error) throw error;

        const formattedStudents =
          studentsData?.map((student) => ({
            id: student.id,
            name: student.name,
            class_name: (student as any).class_info?.class_name,
            averageScore: Math.random() * 40 + 60, // 模拟数据
            recentScores: [
              Math.floor(Math.random() * 40 + 60),
              Math.floor(Math.random() * 40 + 60),
              Math.floor(Math.random() * 40 + 60),
            ],
            trend: ["up", "down", "stable"][Math.floor(Math.random() * 3)] as
              | "up"
              | "down"
              | "stable",
          })) || [];

        setRecentStudents(formattedStudents);
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
              <BookOpen className="h-8 w-8 text-blue-600" />
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
              <Users className="h-8 w-8 text-green-600" />
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
              <TrendingUp className="h-8 w-8 text-purple-600" />
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
              <Target className="h-8 w-8 text-orange-600" />
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
              className="text-blue-600 hover:text-blue-700"
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
                    className={
                      showWarningStudents ? "bg-red-500 hover:bg-red-600" : ""
                    }
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
              className="text-blue-600 hover:text-blue-700"
            >
              查看全部
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {showWarningStudents && warningStudents.length > 0 ? (
            <WarningStudentView
              students={warningStudents}
              onViewStudent={handleViewStudent}
              onViewWarningDetails={handleViewWarningDetails}
            />
          ) : (
            <StudentQuickView
              students={recentStudents}
              onViewStudent={handleViewStudent}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
