"use client";

/**
 * 增值报告菜单仪表板
 * 提供19个报告维度的卡片式导航
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  Award,
  Users,
  Target,
  LineChart,
  BarChart3,
  PieChart,
  Activity,
  Download,
  ArrowRight,
  GitCompare,
  Info,
  Sparkles,
} from "lucide-react";
import { ClassValueAddedReport } from "../class/ClassValueAddedReport";
import { EnhancedClassValueAddedReport } from "../class/EnhancedClassValueAddedReport";
import { ClassAbilityReport } from "../class/ClassAbilityReport";
import { ClassScoreTrendSingleReport } from "../class/ClassScoreTrendSingleReport";
import { ClassScoreTrendGradeReport } from "../class/ClassScoreTrendGradeReport";
import { ClassAbilityTrendSingleReport } from "../class/ClassAbilityTrendSingleReport";
import { ClassScoreTrendMultiReport } from "../class/ClassScoreTrendMultiReport";
import { ClassAbilityTrendMultiReport } from "../class/ClassAbilityTrendMultiReport";
import { TeacherValueAddedReport } from "../teacher/TeacherValueAddedReport";
import { EnhancedTeacherValueAddedReport } from "../teacher/EnhancedTeacherValueAddedReport";
import { TeacherAbilityReport } from "../teacher/TeacherAbilityReport";
import { TeacherScoreTrendReport } from "../teacher/TeacherScoreTrendReport";
import { TeacherAbilityTrendReport } from "../teacher/TeacherAbilityTrendReport";
import { StudentValueAddedReport } from "../student/StudentValueAddedReport";
import { StudentDetailDownload } from "../student/StudentDetailDownload";
import { StudentScoreMultiReport } from "../student/StudentScoreMultiReport";
import { StudentAbilitySingleReport } from "../student/StudentAbilitySingleReport";
import { StudentAbilityMultiReport } from "../student/StudentAbilityMultiReport";
import { StudentTrendReport } from "../student/StudentTrendReport";
import { SubjectBalanceReport } from "../subject/SubjectBalanceReport";
import { SubjectScoreComparisonReport } from "../subject/SubjectScoreComparisonReport";
import { SubjectAbilityComparisonReport } from "../subject/SubjectAbilityComparisonReport";
import { ComparisonAnalysisTool } from "../comparison/ComparisonAnalysisTool";
import { AIAnalysisReport } from "../ai/AIAnalysisReport";
import type {
  ClassValueAdded,
  TeacherValueAdded,
  StudentValueAdded,
  SubjectBalanceAnalysis,
} from "@/types/valueAddedTypes";

interface ReportsMenuDashboardProps {
  classData: ClassValueAdded[];
  teacherData: TeacherValueAdded[];
  studentData: StudentValueAdded[];
  subjectBalanceData: SubjectBalanceAnalysis[];
  currentActivity: { id: string; name: string } | null;
  loading: boolean;
}

interface ReportCard {
  id: string;
  title: string;
  description: string;
  badge: "总体" | "教学班" | "行政班" | "个人";
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  available: boolean;
}

export function ReportsMenuDashboard({
  classData,
  teacherData,
  studentData,
  subjectBalanceData,
  currentActivity,
  loading,
}: ReportsMenuDashboardProps) {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [exitExamId, setExitExamId] = useState<string | null>(null);

  // 从activity获取exit_exam_id
  useEffect(() => {
    const fetchExitExamId = async () => {
      if (!currentActivity?.id) {
        setExitExamId(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("value_added_activities")
          .select("exit_exam_id")
          .eq("id", currentActivity.id)
          .single();

        if (error) {
          console.error("查询exit_exam_id失败:", error);
          setExitExamId(null);
        } else {
          setExitExamId(data.exit_exam_id);
        }
      } catch (err) {
        console.error("获取exit_exam_id异常:", err);
        setExitExamId(null);
      }
    };

    fetchExitExamId();
  }, [currentActivity]);

  // 数据统计（调试用）
  console.log("📊 [ReportsMenuDashboard] Data stats:", {
    classData: classData.length,
    teacherData: teacherData.length,
    studentData: studentData.length,
    subjectBalanceData: subjectBalanceData.length,
    exitExamId,
  });

  // 19个报告维度定义
  const reportCards: ReportCard[] = [
    // AI智能分析
    {
      id: "ai-analysis",
      title: "AI智能分析",
      description: "基于趋势预测算法，自动生成进步排行、诊断建议和未来表现预测",
      badge: "总体",
      icon: Sparkles,
      category: "AI智能分析",
      available: studentData.length > 0,
    },

    // 教师增值评价
    {
      id: "teacher-score",
      title: "教师成绩进步排名",
      description: "分析教师所教班级的分数增值率、进步人数占比、标准分变化",
      badge: "总体",
      icon: Award,
      category: "教师增值评价",
      available: teacherData.length > 0,
    },
    {
      id: "teacher-ability",
      title: "教师教学能力评估",
      description: "评估教师的巩固率、转化率、贡献率等能力培养指标",
      badge: "总体",
      icon: Target,
      category: "教师增值评价",
      available: teacherData.length > 0,
    },

    // 班级增值评价
    {
      id: "class-score",
      title: "班级成绩进步分析",
      description: "展示班级入口/出口分、标准分、排名、增值率、进步人数占比",
      badge: "教学班",
      icon: TrendingUp,
      category: "班级增值评价",
      available: classData.length > 0,
    },
    {
      id: "class-ability",
      title: "班级整体能力分析",
      description: "分析班级的巩固率、转化率、贡献率等能力提升情况",
      badge: "教学班",
      icon: BarChart3,
      category: "班级增值评价",
      available: classData.length > 0,
    },

    // 学科均衡分析
    {
      id: "subject-balance",
      title: "各科目均衡度分析",
      description: "分析行政班总分增值和各学科偏离度，识别薄弱学科",
      badge: "行政班",
      icon: PieChart,
      category: "学科均衡分析",
      available: subjectBalanceData.length > 0,
    },
    {
      id: "subject-score-comparison",
      title: "各科目成绩对比",
      description: "横向对比行政班各学科的分数增值表现",
      badge: "行政班",
      icon: BarChart3,
      category: "学科均衡分析",
      available: classData.length > 0, // 放宽条件：只要有班级数据就可以对比
    },
    {
      id: "subject-ability-comparison",
      title: "各科目能力对比",
      description: "横向对比行政班各学科的能力增值表现",
      badge: "行政班",
      icon: Activity,
      category: "学科均衡分析",
      available: classData.length > 0,
    },

    // 教师趋势分析
    {
      id: "teacher-score-trend",
      title: "教师成绩趋势",
      description: "追踪教师历次均分、标准分、分数增值率的变化趋势",
      badge: "总体",
      icon: LineChart,
      category: "教师趋势分析",
      available: true,
    },
    {
      id: "teacher-ability-trend",
      title: "教师能力趋势",
      description: "追踪教师历次优秀率、贡献率、巩固率、转化率的变化",
      badge: "总体",
      icon: LineChart,
      category: "教师趋势分析",
      available: true,
    },

    // 班级趋势分析
    {
      id: "class-score-trend-grade",
      title: "年级班级成绩对比",
      description: "同一科目所有班级的历次走势对比，支持筛选班级",
      badge: "总体",
      icon: GitCompare,
      category: "班级趋势分析",
      available: true,
    },
    {
      id: "class-score-trend-single",
      title: "单科成绩趋势",
      description: "教学班单科目历次得分表现分析",
      badge: "教学班",
      icon: LineChart,
      category: "班级趋势分析",
      available: true,
    },
    {
      id: "class-ability-trend-single",
      title: "单科能力趋势",
      description: "教学班单科目历次能力表现分析",
      badge: "教学班",
      icon: LineChart,
      category: "班级趋势分析",
      available: true,
    },
    {
      id: "class-score-trend-multi",
      title: "多科成绩趋势",
      description: "行政班各学科历次得分表现分析",
      badge: "行政班",
      icon: LineChart,
      category: "班级趋势分析",
      available: true,
    },
    {
      id: "class-ability-trend-multi",
      title: "多科能力趋势",
      description: "行政班各学科历次能力表现分析",
      badge: "行政班",
      icon: LineChart,
      category: "班级趋势分析",
      available: true,
    },

    // 学生成绩详情
    {
      id: "student-detail-download",
      title: "学生成绩明细下载",
      description: "下载查看所有学生的详细增值数据",
      badge: "个人",
      icon: Download,
      category: "学生成绩详情",
      available: studentData.length > 0,
    },
    {
      id: "student-score-single",
      title: "学生单科成绩分析",
      description: "查看学生单科出入口原始分、标准分、增值率",
      badge: "个人",
      icon: Users,
      category: "学生成绩详情",
      available: studentData.length > 0,
    },
    {
      id: "student-ability-single",
      title: "学生单科能力分析",
      description: "查看学生单科出入口等级、等级变化情况",
      badge: "个人",
      icon: Target,
      category: "学生成绩详情",
      available: studentData.length > 0,
    },
    {
      id: "student-score-multi",
      title: "学生多科成绩对比",
      description: "对比学生各学科的分数增值表现",
      badge: "个人",
      icon: BarChart3,
      category: "学生成绩详情",
      available: studentData.length > 0,
    },
    {
      id: "student-ability-multi",
      title: "学生多科能力对比",
      description: "对比学生各学科的能力增值表现",
      badge: "个人",
      icon: Activity,
      category: "学生成绩详情",
      available: studentData.length > 0,
    },

    // 学生趋势分析
    {
      id: "student-trend",
      title: "学生成绩趋势",
      description: "追踪学生单科历次原始分、标准分、等级变化",
      badge: "个人",
      icon: LineChart,
      category: "学生趋势分析",
      available: true,
    },

    // 数据对比分析
    {
      id: "comparison-tool",
      title: "数据对比工具",
      description: "支持时间段、班级、科目、教师四维度对比分析",
      badge: "总体",
      icon: GitCompare,
      category: "数据对比分析",
      available: true,
    },
  ];

  // 按类别分组
  const categories = [
    "AI智能分析",
    "教师增值评价",
    "班级增值评价",
    "学科均衡分析",
    "教师趋势分析",
    "班级趋势分析",
    "学生成绩详情",
    "学生趋势分析",
    "数据对比分析",
  ];

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case "总体":
        return "bg-blue-100 text-blue-700";
      case "教学班":
        return "bg-green-100 text-green-700";
      case "行政班":
        return "bg-purple-100 text-purple-700";
      case "个人":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleViewReport = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const handleBackToMenu = () => {
    setSelectedReport(null);
  };

  // 如果选择了具体报告，渲染对应的报告组件
  if (selectedReport) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={handleBackToMenu}>
          <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
          返回报告菜单
        </Button>

        {selectedReport === "ai-analysis" && (
          <AIAnalysisReport
            activityId={currentActivity?.id || null}
            activityName={currentActivity?.name || ""}
            loading={loading}
            studentData={studentData}
          />
        )}
        {selectedReport === "class-score" && (
          <EnhancedClassValueAddedReport
            data={classData}
            loading={loading}
            exitExamId={exitExamId}
          />
        )}
        {selectedReport === "class-ability" && (
          <ClassAbilityReport
            data={classData}
            subject="全科"
            loading={loading}
          />
        )}
        {selectedReport === "class-score-trend-grade" && (
          <ClassScoreTrendGradeReport loading={loading} />
        )}
        {selectedReport === "class-score-trend-single" && (
          <ClassScoreTrendSingleReport loading={loading} />
        )}
        {selectedReport === "class-ability-trend-single" && (
          <ClassAbilityTrendSingleReport loading={loading} />
        )}
        {selectedReport === "class-score-trend-multi" && (
          <ClassScoreTrendMultiReport loading={loading} />
        )}
        {selectedReport === "class-ability-trend-multi" && (
          <ClassAbilityTrendMultiReport loading={loading} />
        )}
        {selectedReport === "teacher-score" && (
          <EnhancedTeacherValueAddedReport
            data={teacherData}
            loading={loading}
          />
        )}
        {selectedReport === "teacher-ability" && (
          <TeacherAbilityReport
            data={teacherData}
            subject="全科"
            loading={loading}
          />
        )}
        {selectedReport === "teacher-score-trend" && (
          <TeacherScoreTrendReport loading={loading} />
        )}
        {selectedReport === "teacher-ability-trend" && (
          <TeacherAbilityTrendReport loading={loading} />
        )}
        {selectedReport === "student-score-single" && (
          <StudentValueAddedReport data={studentData} loading={loading} />
        )}
        {selectedReport === "student-detail-download" && (
          <StudentDetailDownload data={studentData} loading={loading} />
        )}
        {selectedReport === "subject-balance" && (
          <SubjectBalanceReport data={subjectBalanceData} loading={loading} />
        )}
        {selectedReport === "subject-score-comparison" && (
          <SubjectScoreComparisonReport
            classData={classData}
            subjectBalanceData={subjectBalanceData}
            loading={loading}
          />
        )}
        {selectedReport === "subject-ability-comparison" && (
          <SubjectAbilityComparisonReport
            classData={classData}
            loading={loading}
          />
        )}
        {selectedReport === "student-score-multi" && (
          <StudentScoreMultiReport data={studentData} loading={loading} />
        )}
        {selectedReport === "student-ability-single" && (
          <StudentAbilitySingleReport data={studentData} loading={loading} />
        )}
        {selectedReport === "student-ability-multi" && (
          <StudentAbilityMultiReport data={studentData} loading={loading} />
        )}
        {selectedReport === "student-trend" && (
          <StudentTrendReport loading={loading} />
        )}
        {selectedReport === "comparison-tool" && (
          <ComparisonAnalysisTool loading={loading} />
        )}

        {/* 其他报告组件待实现 */}
        {![
          "ai-analysis",
          "class-score",
          "class-ability",
          "class-score-trend-single",
          "class-ability-trend-single",
          "class-score-trend-multi",
          "class-ability-trend-multi",
          "teacher-score",
          "teacher-ability",
          "teacher-score-trend",
          "teacher-ability-trend",
          "student-score-single",
          "student-detail-download",
          "subject-balance",
          "subject-score-comparison",
          "subject-ability-comparison",
          "student-score-multi",
          "student-ability-single",
          "student-ability-multi",
          "student-trend",
          "comparison-tool",
        ].includes(selectedReport) && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">该报告功能正在开发中...</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // 渲染报告菜单
  return (
    <div className="space-y-8">
      {/* 数据统计卡片 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {currentActivity && (
            <div className="mb-2">
              当前增值活动：
              <strong className="text-primary">{currentActivity.name}</strong>
            </div>
          )}
          <div>
            当前已有数据：
            <strong className="mx-1">{classData.length}</strong>条班级报告、
            <strong className="mx-1">{teacherData.length}</strong>条教师报告、
            <strong className="mx-1">{studentData.length}</strong>条学生报告、
            <strong className="mx-1">{subjectBalanceData.length}</strong>
            条学科均衡报告
          </div>
          {classData.length === 0 &&
            teacherData.length === 0 &&
            studentData.length === 0 && (
              <span className="block mt-1 text-amber-600">
                暂无数据，请先在"增值活动"标签页完成活动计算
              </span>
            )}
        </AlertDescription>
      </Alert>

      {categories.map((category) => {
        const categoryReports = reportCards.filter(
          (r) => r.category === category
        );

        return (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {category}
              </h3>
              <Badge variant="outline" className="text-xs">
                {categoryReports.filter((r) => r.available).length} /{" "}
                {categoryReports.length} 可用
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryReports.map((report) => {
                const Icon = report.icon;

                return (
                  <Card
                    key={report.id}
                    className={`transition-all hover:shadow-md ${
                      !report.available ? "opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              report.available ? "bg-blue-50" : "bg-gray-50"
                            }`}
                          >
                            <Icon
                              className={`h-5 w-5 ${
                                report.available
                                  ? "text-blue-600"
                                  : "text-gray-400"
                              }`}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {report.title}
                            </CardTitle>
                            <Badge
                              className={`${getBadgeColor(report.badge)} mt-1 text-xs`}
                            >
                              {report.badge}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription className="mt-2 text-sm">
                        {report.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant={report.available ? "default" : "outline"}
                        className="w-full"
                        disabled={!report.available}
                        onClick={() =>
                          report.available && handleViewReport(report.id)
                        }
                      >
                        {report.available ? (
                          <>
                            点击查看
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          <>暂无数据</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
