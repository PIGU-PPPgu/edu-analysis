/**
 * AI智能分析报告
 * 整合趋势预测、进步排行、AI诊断建议
 * Phase 1优化：优先读取预计算的AI分析摘要缓存
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
  Target,
  Users,
  BookOpen,
  Activity,
} from "lucide-react";
import TrendForecast from "@/components/analysis/value-added/TrendForecast";
import { supabase } from "@/integrations/supabase/client";
import type {
  ValueAddedMetrics,
  StudentValueAdded,
} from "@/types/valueAddedTypes";
import type { AIAnalysisSummary } from "@/services/ai/diagnosticEngine";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 科目名称到grade_data字段的映射
const SUBJECT_FIELD_MAP: Record<string, string> = {
  总分: "total_score",
  语文: "chinese_score",
  数学: "math_score",
  英语: "english_score",
  物理: "physics_score",
  化学: "chemistry_score",
  生物: "biology_score",
  政治: "politics_score",
  历史: "history_score",
  地理: "geography_score",
};

// 根据科目名获取对应的分数字段
function getSubjectScoreField(subjectName: string): string {
  return SUBJECT_FIELD_MAP[subjectName] || "total_score";
}

interface AIAnalysisReportProps {
  activityId: string | null;
  activityName: string;
  loading: boolean;
  studentData?: StudentValueAdded[]; // 可选：优先使用传入的数据，避免重复查询
}

export function AIAnalysisReport({
  activityId,
  activityName,
  loading: externalLoading,
  studentData: externalStudentData, // 从父组件接收的数据
}: AIAnalysisReportProps) {
  const [studentData, setStudentData] = useState<StudentValueAdded[]>(
    externalStudentData || [] // 优先使用传入的数据
  );
  const [aiSummary, setAiSummary] = useState<AIAnalysisSummary | null>(null); // Phase 1新增：缓存的AI摘要
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("全部科目");
  const [selectedClass, setSelectedClass] = useState<string>("全部班级");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]); // 新增：选中的学生ID列表
  const [historicalScores, setHistoricalScores] = useState<
    Map<string, Array<{ exam: string; score: number; date: string }>>
  >(new Map());

  // Phase 1新增：加载AI分析摘要缓存（优先级最高）
  useEffect(() => {
    const loadAISummary = async () => {
      if (!activityId) return;

      try {
        const { data, error } = await supabase
          .from("value_added_cache")
          .select("result")
          .eq("activity_id", activityId)
          .eq("report_type", "ai_analysis_summary")
          .maybeSingle();

        if (error) throw error;

        if (data?.result) {
          setAiSummary(data.result as AIAnalysisSummary);
          console.log(
            "✅ [AIAnalysisReport] 加载AI分析摘要缓存成功:",
            data.result.performanceMetrics
          );
        } else {
          console.log("⏭️ [AIAnalysisReport] 未找到AI摘要缓存，将使用实时计算");
        }
      } catch (err) {
        console.error("❌ [AIAnalysisReport] 加载AI摘要缓存失败:", err);
        // 不阻断流程，fallback到实时计算
      }
    };

    loadAISummary();
  }, [activityId]);

  // 当外部数据变化时，更新本地状态
  useEffect(() => {
    if (externalStudentData && externalStudentData.length > 0) {
      console.log(
        "✅ [AIAnalysisReport] 使用外部传入数据:",
        externalStudentData.length
      );
      setStudentData(externalStudentData);
    }
  }, [externalStudentData]);

  // 加载学生增值数据（仅在没有外部数据时查询）
  useEffect(() => {
    const loadData = async () => {
      // 如果有外部数据，跳过查询
      if (externalStudentData && externalStudentData.length > 0) {
        console.log(
          "⏭️ [AIAnalysisReport] 已有外部数据，跳过查询:",
          externalStudentData.length
        );
        return;
      }

      if (!activityId) {
        setStudentData([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("value_added_cache")
          .select("result")
          .eq("activity_id", activityId)
          .eq("report_type", "student_value_added");

        if (error) throw error;

        const students =
          data
            ?.map((item) => item.result as StudentValueAdded)
            .filter(Boolean) || [];

        setStudentData(students);

        if (students.length > 0) {
          console.log(
            "✅ [AIAnalysisReport] 自主查询加载学生数据成功:",
            students.length
          );
        }
      } catch (err) {
        console.error("❌ [AIAnalysisReport] 加载数据失败:", err);
        toast.error("加载数据失败");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activityId, externalStudentData]);

  // 过滤数据（必须在历史成绩加载之前定义）
  const filteredData = useMemo(() => {
    let filtered = studentData;

    // 科目筛选
    if (selectedSubject !== "全部科目") {
      filtered = filtered.filter((s) => s.subject === selectedSubject);
    }

    // 班级筛选
    if (selectedClass !== "全部班级") {
      filtered = filtered.filter((s) => s.class_name === selectedClass);
    }

    // 学生筛选（新增）
    if (selectedStudents.length > 0) {
      filtered = filtered.filter((s) =>
        selectedStudents.includes(s.student_id)
      );
    }

    return filtered;
  }, [studentData, selectedSubject, selectedClass, selectedStudents]);

  // 加载学生历史成绩数据（用于多点线性拟合）
  useEffect(() => {
    const loadHistoricalScores = async () => {
      if (
        !activityId ||
        studentData.length === 0 ||
        selectedClass === "全部班级"
      ) {
        return;
      }

      try {
        // 获取当前筛选学生的student_id列表
        const studentIds = filteredData.map((s) => s.student_id);

        // 根据选中科目确定要查询的分数字段
        const scoreField = getSubjectScoreField(selectedSubject);

        console.log(
          `🔍 [AIAnalysisReport] 加载历史成绩 - 科目:${selectedSubject}, 字段:${scoreField}`
        );

        // 从grade_data表查询这些学生的所有历史考试
        const { data, error } = await supabase
          .from("grade_data")
          .select(`student_id, exam_title, exam_date, ${scoreField}`)
          .in("student_id", studentIds)
          .eq("class_name", filteredData[0]?.class_name || selectedClass)
          .not(scoreField, "is", null)
          .not("exam_date", "is", null) // 排除无日期记录
          .order("exam_date");

        if (error) throw error;

        // 按学生分组历史成绩
        const scoreMap = new Map<
          string,
          Array<{ exam: string; score: number; date: string }>
        >();

        data?.forEach((row: any) => {
          if (!scoreMap.has(row.student_id)) {
            scoreMap.set(row.student_id, []);
          }
          scoreMap.get(row.student_id)!.push({
            exam: row.exam_title,
            score: row[scoreField], // 动态读取字段值
            date: row.exam_date,
          });
        });

        setHistoricalScores(scoreMap);

        console.log(
          `✅ [AIAnalysisReport] 加载历史成绩成功: ${scoreMap.size}名学生, 字段: ${scoreField}`
        );
      } catch (err) {
        console.error("❌ [AIAnalysisReport] 加载历史成绩失败:", err);
      }
    };

    loadHistoricalScores();
  }, [activityId, filteredData, selectedClass, selectedSubject, studentData]);

  // 获取所有科目及数量
  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();
    studentData.forEach((s) => subjectSet.add(s.subject));
    return ["全部科目", ...Array.from(subjectSet).sort()];
  }, [studentData]);

  // 获取所有班级及数量
  const classes = useMemo(() => {
    const classSet = new Set<string>();
    studentData.forEach((s) => classSet.add(s.class_name));
    return ["全部班级", ...Array.from(classSet).sort()];
  }, [studentData]);

  // 计算每个科目的学生数量
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { 全部科目: studentData.length };
    studentData.forEach((s) => {
      counts[s.subject] = (counts[s.subject] || 0) + 1;
    });
    return counts;
  }, [studentData]);

  // 计算每个班级的学生数量（针对当前选中科目）
  const classCounts = useMemo(() => {
    const filteredBySubject =
      selectedSubject === "全部科目"
        ? studentData
        : studentData.filter((s) => s.subject === selectedSubject);

    const counts: Record<string, number> = {
      全部班级: new Set(filteredBySubject.map((s) => s.student_id)).size,
    };
    filteredBySubject.forEach((s) => {
      const key = s.class_name;
      if (!counts[key]) {
        const studentsInClass = new Set(
          filteredBySubject
            .filter((x) => x.class_name === s.class_name)
            .map((x) => x.student_id)
        );
        counts[key] = studentsInClass.size;
      }
    });
    return counts;
  }, [studentData, selectedSubject]);

  // 获取可选学生列表（根据当前筛选条件）
  const availableStudents = useMemo(() => {
    let filtered = studentData;

    // 科目筛选
    if (selectedSubject !== "全部科目") {
      filtered = filtered.filter((s) => s.subject === selectedSubject);
    }

    // 班级筛选
    if (selectedClass !== "全部班级") {
      filtered = filtered.filter((s) => s.class_name === selectedClass);
    }

    // 去重并排序
    const uniqueStudents = Array.from(
      new Map(filtered.map((s) => [s.student_id, s])).values()
    ).sort((a, b) => a.student_name.localeCompare(b.student_name));

    return uniqueStudents;
  }, [studentData, selectedSubject, selectedClass]);

  // 转换为ValueAddedMetrics格式用于趋势预测
  const metricsData: ValueAddedMetrics[] = useMemo(() => {
    console.log("🔍 [AIAnalysisReport] 筛选条件:", {
      selectedSubject,
      selectedClass,
      filteredDataCount: filteredData.length,
      filteredDataSample: filteredData.slice(0, 3).map((s) => ({
        student: s.student_name,
        class: s.class_name,
        subject: s.subject,
      })),
    });

    return filteredData.map((student) => ({
      studentId: student.student_id,
      studentName: student.student_name,
      className: student.class_name,
      subject: student.subject,
      baselineExam: {
        examId: "entry",
        examTitle: "入口考试",
        score: student.entry_score,
        rank: student.entry_rank_in_class,
        level: student.entry_level,
      },
      targetExam: {
        examId: "exit",
        examTitle: "出口考试",
        score: student.exit_score,
        rank: student.exit_rank_in_class,
        level: student.exit_level,
      },
      scoreChange: student.score_value_added,
      scoreChangeRate: student.score_value_added_rate,
      zScoreChange: student.exit_z_score - student.entry_z_score,
      levelChange: student.level_change,
    }));
  }, [filteredData, selectedSubject, selectedClass]);

  // 按班级聚合数据（用于"全部班级"模式）
  const classAggregatedData = useMemo(() => {
    if (selectedClass !== "全部班级") {
      return [];
    }

    // 按班级分组
    const classCMap = new Map<
      string,
      {
        className: string;
        students: ValueAddedMetrics[];
        avgScoreChange: number;
        avgScoreChangeRate: number;
      }
    >();

    metricsData.forEach((student) => {
      if (!classCMap.has(student.className)) {
        classCMap.set(student.className, {
          className: student.className,
          students: [],
          avgScoreChange: 0,
          avgScoreChangeRate: 0,
        });
      }
      classCMap.get(student.className)!.students.push(student);
    });

    // 计算每个班级的平均增值
    const classStats = Array.from(classCMap.values()).map((cls) => {
      const avgScoreChange =
        cls.students.reduce((sum, s) => sum + s.scoreChange, 0) /
        cls.students.length;
      const avgScoreChangeRate =
        cls.students.reduce((sum, s) => sum + s.scoreChangeRate, 0) /
        cls.students.length;

      return {
        className: cls.className,
        studentCount: cls.students.length,
        avgScoreChange,
        avgScoreChangeRate,
        avgBaselineScore:
          cls.students.reduce((sum, s) => sum + s.baselineExam.score, 0) /
          cls.students.length,
        avgTargetScore:
          cls.students.reduce((sum, s) => sum + s.targetExam.score, 0) /
          cls.students.length,
      };
    });

    // 按平均增值排序
    return classStats.sort((a, b) => b.avgScoreChange - a.avgScoreChange);
  }, [metricsData, selectedClass]);

  // 统计数据
  const stats = useMemo(() => {
    // Phase 1优化：优先使用缓存的AI摘要统计
    if (
      aiSummary &&
      selectedSubject === "全部科目" &&
      selectedClass === "全部班级"
    ) {
      console.log("✅ [AIAnalysisReport] 使用缓存的统计数据");
      return aiSummary.overallStats;
    }

    // Fallback：实时计算（筛选时使用）
    if (filteredData.length === 0) {
      return {
        totalStudents: 0,
        avgScoreChange: 0,
        progressRate: 0,
        consolidationRate: 0,
        transformationRate: 0,
      };
    }

    const progressCount = filteredData.filter(
      (s) => s.score_value_added > 0
    ).length;
    const consolidatedCount = filteredData.filter(
      (s) => s.is_consolidated
    ).length;
    const transformedCount = filteredData.filter(
      (s) => s.is_transformed
    ).length;

    return {
      totalStudents: filteredData.length,
      avgScoreChange:
        filteredData.reduce((sum, s) => sum + s.score_value_added, 0) /
        filteredData.length,
      progressRate: (progressCount / filteredData.length) * 100,
      consolidationRate: (consolidatedCount / filteredData.length) * 100,
      transformationRate: (transformedCount / filteredData.length) * 100,
    };
  }, [filteredData, aiSummary, selectedSubject, selectedClass]); // Phase 1：添加aiSummary依赖

  // AI诊断建议（基于统计数据生成）
  const aiDiagnostics = useMemo(() => {
    // Phase 1优化：优先使用缓存的诊断建议
    if (
      aiSummary &&
      selectedSubject === "全部科目" &&
      selectedClass === "全部班级"
    ) {
      console.log("✅ [AIAnalysisReport] 使用缓存的诊断建议");
      // 将diagnosticEngine的格式转换为组件所需格式
      return aiSummary.overallDiagnostics.map((d) => ({
        type: d.type,
        title: d.title,
        description: d.description,
      }));
    }

    // Fallback：实时生成（筛选时使用）
    const suggestions: Array<{
      type: "success" | "warning" | "info";
      title: string;
      description: string;
    }> = [];

    if (stats.totalStudents === 0) {
      return suggestions;
    }

    // 进步率诊断
    if (stats.progressRate >= 70) {
      suggestions.push({
        type: "success",
        title: "整体进步显著",
        description: `${stats.progressRate.toFixed(1)}%的学生实现了成绩进步，教学效果优秀。`,
      });
    } else if (stats.progressRate < 50) {
      suggestions.push({
        type: "warning",
        title: "进步率偏低",
        description: `仅${stats.progressRate.toFixed(1)}%的学生实现进步，建议关注教学方法和学生差异化辅导。`,
      });
    }

    // 转化率诊断
    if (stats.transformationRate >= 15) {
      suggestions.push({
        type: "success",
        title: "能力转化效果好",
        description: `${stats.transformationRate.toFixed(1)}%的学生实现了能力等级的跃升，培优工作成效明显。`,
      });
    } else if (stats.transformationRate < 5) {
      suggestions.push({
        type: "info",
        title: "转化率偏低",
        description: "建议加强中等生的培优辅导，帮助更多学生实现能力突破。",
      });
    }

    // 巩固率诊断
    if (stats.consolidationRate >= 80) {
      suggestions.push({
        type: "success",
        title: "优秀学生保持稳定",
        description: `${stats.consolidationRate.toFixed(1)}%的优秀学生保持了原有水平，基础扎实。`,
      });
    } else if (stats.consolidationRate < 60) {
      suggestions.push({
        type: "warning",
        title: "优秀生巩固不足",
        description:
          "优秀学生中有较多未能保持原有等级，建议关注尖子生培养策略。",
      });
    }

    // 平均增值诊断
    if (stats.avgScoreChange > 10) {
      suggestions.push({
        type: "success",
        title: "平均增值突出",
        description: `学生平均增值${stats.avgScoreChange.toFixed(1)}分，整体教学质量高。`,
      });
    } else if (stats.avgScoreChange < 0) {
      suggestions.push({
        type: "warning",
        title: "平均成绩下滑",
        description: "整体平均分出现下降，需要重点分析原因并调整教学策略。",
      });
    }

    return suggestions;
  }, [stats, aiSummary, selectedSubject, selectedClass]); // Phase 1：添加aiSummary依赖

  const isLoading = loading || externalLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* 标题骨架 */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>

        {/* 科目筛选骨架 */}
        <div className="flex gap-2 flex-wrap">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-gray-200 rounded-full animate-pulse"
            />
          ))}
        </div>

        {/* 统计卡片骨架 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="h-8 w-20 bg-gray-300 rounded animate-pulse" />
                  <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI诊断骨架 */}
        <Card>
          <CardHeader>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>

        {/* 趋势预测骨架 */}
        <Card>
          <CardHeader>
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activityId || studentData.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          暂无数据。请先在"增值活动"标签页选择一个已完成计算的活动。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI智能分析</h2>
            <p className="text-sm text-gray-500">
              基于 <strong>{activityName}</strong> 的趋势预测与诊断建议
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm font-medium px-3 py-1">
            已分析 {Object.keys(subjectCounts).length - 1} 个科目
          </Badge>
          <Badge variant="outline" className="text-sm font-medium px-3 py-1">
            共 {stats.totalStudents} 名学生
          </Badge>
        </div>
      </div>

      {/* 筛选器区域 - 统一样式 */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-4 space-y-4">
          {/* 科目筛选 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">科目</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {subjects.map((subject) => (
                <Badge
                  key={subject}
                  variant={selectedSubject === subject ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedSubject === subject
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-md"
                      : "hover:bg-gray-100 hover:border-gray-400"
                  )}
                  onClick={() => {
                    setSelectedSubject(subject);
                    setSelectedClass("全部班级"); // 切换科目时重置班级筛选
                    setSelectedStudents([]); // 切换科目时清空学生选择
                  }}
                >
                  {subject} ({subjectCounts[subject] || 0})
                </Badge>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-200"></div>

          {/* 班级筛选 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">班级</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {classes.map((className) => (
                <Badge
                  key={className}
                  variant={selectedClass === className ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedClass === className
                      ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-md"
                      : "hover:bg-gray-100 hover:border-gray-400"
                  )}
                  onClick={() => {
                    setSelectedClass(className);
                    setSelectedStudents([]); // 切换班级时清空学生选择
                  }}
                >
                  {className} ({classCounts[className] || 0}人)
                </Badge>
              ))}
            </div>
          </div>

          {/* 学生筛选 */}
          {selectedClass !== "全部班级" && availableStudents.length > 0 && (
            <>
              <div className="border-t border-gray-200"></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-bold text-gray-700">
                      学生（可多选）
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedStudents.length > 0 ? (
                      <>
                        <span className="text-xs text-green-600 font-medium">
                          已选{selectedStudents.length}人，仅显示所选学生
                        </span>
                        <button
                          onClick={() => setSelectedStudents([])}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          清空
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">
                        未选择（自动显示进步/退步Top 5）
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                  {availableStudents.map((student) => (
                    <Badge
                      key={student.student_id}
                      variant={
                        selectedStudents.includes(student.student_id)
                          ? "default"
                          : "outline"
                      }
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedStudents.includes(student.student_id)
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md"
                          : "hover:bg-gray-100 hover:border-gray-400"
                      )}
                      onClick={() => {
                        setSelectedStudents((prev) =>
                          prev.includes(student.student_id)
                            ? prev.filter((id) => id !== student.student_id)
                            : [...prev, student.student_id]
                        );
                      }}
                    >
                      {student.student_name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              平均增值
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-bold">
                {stats.avgScoreChange > 0 ? "+" : ""}
                {stats.avgScoreChange.toFixed(1)}分
              </span>
              <Target className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              进步人数占比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-bold">
                {stats.progressRate.toFixed(1)}%
              </span>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              能力巩固率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-bold">
                {stats.consolidationRate.toFixed(1)}%
              </span>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              能力转化率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xl sm:text-2xl font-bold">
                {stats.transformationRate.toFixed(1)}%
              </span>
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI诊断建议 */}
      {aiDiagnostics.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>AI诊断建议</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiDiagnostics.map((item, idx) => (
              <Alert
                key={idx}
                variant={item.type === "warning" ? "destructive" : "default"}
              >
                <AlertDescription>
                  <div className="flex items-start gap-2">
                    {item.type === "success" && (
                      <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                    )}
                    {item.type === "warning" && (
                      <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />
                    )}
                    {item.type === "info" && (
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    )}
                    <div>
                      <strong>{item.title}</strong>
                      <p className="text-sm mt-1">{item.description}</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 趋势预测 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>
              {selectedClass === "全部班级"
                ? `${selectedSubject} - 各班级整体趋势`
                : `${selectedClass} - ${selectedSubject} 学生趋势预测`}
            </CardTitle>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {selectedClass === "全部班级" ? (
              <>
                展示各班级在
                <strong className="text-primary">{selectedSubject}</strong>
                科目的平均增值情况，按增值从高到低排序
                <br />
                <strong className="text-blue-600">
                  💡 提示：点击具体班级可查看该班学生的详细预测
                </strong>
              </>
            ) : (
              `基于线性回归算法，预测${selectedClass}在${selectedSubject}科目的学生未来表现（显示进步最快和退步最快的各5名）`
            )}
          </p>
        </CardHeader>
        <CardContent>
          {selectedClass === "全部班级" ? (
            // 班级聚合模式
            classAggregatedData.length > 0 ? (
              <div className="space-y-3">
                {classAggregatedData.map((cls) => (
                  <Card
                    key={cls.className}
                    className="border-2 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedClass(cls.className)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="text-base font-bold text-gray-900">
                              {cls.className}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {cls.studentCount}人
                            </Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">平均增值：</span>
                              <span
                                className={cn(
                                  "font-bold ml-1",
                                  cls.avgScoreChange > 0
                                    ? "text-green-600"
                                    : cls.avgScoreChange < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                )}
                              >
                                {cls.avgScoreChange > 0 ? "+" : ""}
                                {cls.avgScoreChange.toFixed(1)}分
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">增值率：</span>
                              <span
                                className={cn(
                                  "font-bold ml-1",
                                  cls.avgScoreChangeRate > 0
                                    ? "text-green-600"
                                    : cls.avgScoreChangeRate < 0
                                      ? "text-red-600"
                                      : "text-gray-600"
                                )}
                              >
                                {cls.avgScoreChangeRate > 0 ? "+" : ""}
                                {(cls.avgScoreChangeRate * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {cls.avgScoreChange > 0 ? (
                            <TrendingUp className="h-6 w-6 text-green-600" />
                          ) : cls.avgScoreChange < 0 ? (
                            <TrendingDown className="h-6 w-6 text-red-600" />
                          ) : (
                            <Activity className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">暂无班级数据</p>
            )
          ) : // 学生个人模式
          selectedStudents.length > 0 && metricsData.length > 0 ? (
            <TrendForecast
              metrics={metricsData}
              topN={5}
              historicalScores={historicalScores}
              useManualSelection={true} // 用户选择了学生时使用手动模式
            />
          ) : selectedStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                请在上方"学生筛选"区域选择要分析的学生
              </p>
              <p className="text-gray-400 text-xs mt-2">
                可多选学生进行趋势对比
              </p>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              暂无足够数据进行趋势预测
            </p>
          )}
        </CardContent>
      </Card>

      {/* 使用说明 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>AI分析说明：</strong>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
            <li>诊断建议基于统计数据自动生成，供教学决策参考</li>
            <li>趋势预测采用线性回归算法，预测准确度受历史数据影响</li>
            <li>建议结合实际教学情况和学生个体差异综合判断</li>
            <li>可切换不同科目查看分科分析结果，更精准定位教学改进方向</li>
            <li>
              <strong>班级筛选：</strong>
              选择"全部班级"查看年级整体情况，选择具体班级深入分析该班学生表现
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
