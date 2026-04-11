"use client";

/**
 * 增值报告菜单仪表板
 * 提供19个报告维度的卡片式导航
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Search,
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
import { NineSegmentReport } from "./NineSegmentReport";
import { RelativeProgressReport } from "./RelativeProgressReport";
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

function getBadgeColor(badge: string) {
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("全部");

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

  // Cmd+K 搜索快捷键
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // 19个报告维度定义
  const reportCards: ReportCard[] = useMemo(
    () => [
      // AI智能分析
      {
        id: "ai-analysis",
        title: "AI智能分析",
        description:
          "基于趋势预测算法，自动生成进步排行、诊断建议和未来表现预测",
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
      {
        id: "nine-segment",
        title: "段位分布分析",
        description:
          "展示各班级入口→出口的九段（或六段）人数分布变化，直观呈现段位流动",
        badge: "行政班",
        icon: BarChart3,
        category: "班级增值评价",
        available: studentData.length > 0,
      },
      {
        id: "relative-progress",
        title: "相对进步率分析",
        description:
          "基于深圳市教科院增值评价模型，计算各班保持值、进步值、退步值及相对进步率",
        badge: "行政班",
        icon: TrendingUp,
        category: "班级增值评价",
        available: studentData.length > 0,
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
    ],
    [classData.length, teacherData.length, studentData.length]
  );

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

  const filteredReports = useMemo(() => {
    if (activeCategory === "全部") return reportCards;
    return reportCards.filter((r) => r.category === activeCategory);
  }, [activeCategory, reportCards]);

  const handleViewReport = (reportId: string) => {
    setSelectedReport(reportId);
  };

  const handleBackToMenu = () => {
    setSelectedReport(null);
  };

  const renderReportCard = useCallback(
    (report: ReportCard, index: number) => {
      const Icon = report.icon;
      const isHero = report.id === "ai-analysis";
      const isWide = [
        "teacher-score",
        "class-score",
        "subject-balance",
        "comparison-tool",
      ].includes(report.id);

      return (
        <motion.div
          key={report.id}
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            duration: 0.3,
            delay: index * 0.03,
            layout: { duration: 0.3 },
          }}
          className={`
            group relative rounded-2xl border bg-card text-card-foreground overflow-hidden
            transition-all duration-300 cursor-pointer
            ${isHero ? "col-span-2 row-span-2 md:col-span-2 lg:col-span-2" : ""}
            ${isWide && !isHero ? "col-span-2 md:col-span-2 lg:col-span-2" : ""}
            ${!report.available ? "opacity-50 pointer-events-none" : ""}
            hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5
            hover:border-primary/20
          `}
          onClick={() => report.available && handleViewReport(report.id)}
        >
          {isHero && (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-purple-50/30 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/10" />
          )}

          <div
            className={`relative h-full flex flex-col justify-between ${isHero ? "p-8" : "p-5"}`}
          >
            <div className="flex items-start justify-between">
              <div
                className={`
                  rounded-xl flex items-center justify-center
                  ${isHero ? "h-14 w-14 bg-primary/10" : "h-10 w-10 bg-muted"}
                  transition-colors group-hover:bg-primary/10
                `}
              >
                <Icon
                  className={`
                    ${isHero ? "h-7 w-7" : "h-5 w-5"}
                    ${report.available ? "text-primary" : "text-muted-foreground"}
                    transition-transform group-hover:scale-110
                  `}
                />
              </div>
              <Badge className={`${getBadgeColor(report.badge)} text-xs`}>
                {report.badge}
              </Badge>
            </div>

            <div className="space-y-1">
              <h3
                className={`font-semibold leading-tight ${isHero ? "text-xl" : "text-sm"}`}
              >
                {report.title}
              </h3>
              <p
                className={`
                  text-muted-foreground leading-snug
                  ${
                    isHero
                      ? "text-sm opacity-100"
                      : "text-xs opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
                  }
                `}
              >
                {report.description}
              </p>
            </div>

            {report.available && (
              <div className="absolute bottom-4 right-4 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        </motion.div>
      );
    },
    [getBadgeColor, handleViewReport]
  );

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
          <>
            <EnhancedClassValueAddedReport
              data={classData}
              loading={loading}
              exitExamId={exitExamId}
            />
            <RelativeProgressReport
              studentData={studentData}
              mode="overview"
              loading={loading}
            />
          </>
        )}
        {selectedReport === "class-ability" && (
          <ClassAbilityReport
            data={classData}
            subject="全科"
            loading={loading}
          />
        )}
        {selectedReport === "class-score-trend-grade" && (
          <ClassScoreTrendGradeReport
            loading={loading}
            activityId={currentActivity?.id}
          />
        )}
        {selectedReport === "class-score-trend-single" && (
          <ClassScoreTrendSingleReport
            loading={loading}
            activityId={currentActivity?.id}
          />
        )}
        {selectedReport === "class-ability-trend-single" && (
          <ClassAbilityTrendSingleReport
            loading={loading}
            activityId={currentActivity?.id}
          />
        )}
        {selectedReport === "class-score-trend-multi" && (
          <ClassScoreTrendMultiReport
            loading={loading}
            activityId={currentActivity?.id}
          />
        )}
        {selectedReport === "class-ability-trend-multi" && (
          <ClassAbilityTrendMultiReport
            loading={loading}
            activityId={currentActivity?.id}
          />
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
          <TeacherScoreTrendReport
            loading={loading}
            activityId={currentActivity?.id}
          />
        )}
        {selectedReport === "teacher-ability-trend" && (
          <TeacherAbilityTrendReport
            loading={loading}
            activityId={currentActivity?.id}
          />
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
        {selectedReport === "nine-segment" && (
          <NineSegmentReport studentData={studentData} loading={loading} />
        )}
        {selectedReport === "relative-progress" && (
          <RelativeProgressReport
            studentData={studentData}
            mode="overview"
            loading={loading}
          />
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
          "nine-segment",
          "relative-progress",
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
    <div className="space-y-6">
      {/* Command Palette Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="搜索报告..." />
        <CommandList>
          <CommandEmpty>未找到匹配的报告</CommandEmpty>
          {categories.map((cat) => {
            const catReports = reportCards.filter(
              (r) => r.category === cat && r.available
            );
            if (catReports.length === 0) return null;
            return (
              <CommandGroup key={cat} heading={cat}>
                {catReports.map((report) => {
                  const Icon = report.icon;
                  return (
                    <CommandItem
                      key={report.id}
                      onSelect={() => {
                        handleViewReport(report.id);
                        setSearchOpen(false);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{report.title}</span>
                      <Badge
                        className={`${getBadgeColor(report.badge)} ml-auto text-xs`}
                      >
                        {report.badge}
                      </Badge>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            );
          })}
        </CommandList>
      </CommandDialog>

      {/* Top Bar: Activity Info + Search Trigger */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          {currentActivity && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              当前活动：
              <span className="font-semibold text-foreground">
                {currentActivity.name}
              </span>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {classData.length} 班级 · {teacherData.length} 教师 ·{" "}
            {studentData.length} 学生 · {subjectBalanceData.length} 学科
          </div>
        </div>
        <Button
          variant="outline"
          className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4 xl:mr-2" />
          <span className="hidden xl:inline-flex">搜索报告...</span>
          <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </Button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {["全部", ...categories].map((cat) => {
          const count =
            cat === "全部"
              ? reportCards.filter((r) => r.available).length
              : reportCards.filter((r) => r.category === cat && r.available)
                  .length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all
                ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }
              `}
            >
              {cat === "全部"
                ? "全部"
                : cat
                    .replace("分析", "")
                    .replace("评价", "")
                    .replace("详情", "")}
              <span
                className={`text-xs ${
                  activeCategory === cat
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground/60"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* No Data Warning */}
      {classData.length === 0 &&
        teacherData.length === 0 &&
        studentData.length === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-amber-600">
              暂无数据，请先在"增值活动"标签页完成活动计算
            </AlertDescription>
          </Alert>
        )}

      {/* Bento Grid */}
      {activeCategory === "全部" ? (
        <div className="space-y-8">
          {categories.map((cat) => {
            const catReports = reportCards.filter((r) => r.category === cat);
            if (catReports.length === 0) return null;
            const availCount = catReports.filter((r) => r.available).length;
            return (
              <div key={cat}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-base font-bold text-foreground whitespace-nowrap">
                    {cat}
                  </h3>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {availCount}/{catReports.length} 可用
                  </span>
                </div>
                <motion.div
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[140px]"
                  layout
                >
                  {catReports.map((report, index) =>
                    renderReportCard(report, index)
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[140px]"
          layout
        >
          <AnimatePresence mode="popLayout">
            {filteredReports.map((report, index) =>
              renderReportCard(report, index)
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
