/**
 * AI智能分析报告
 * 整合趋势预测、进步排行、AI诊断建议
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
} from "lucide-react";
import TrendForecast from "@/components/analysis/value-added/TrendForecast";
import { supabase } from "@/integrations/supabase/client";
import type {
  ValueAddedMetrics,
  StudentValueAdded,
} from "@/types/valueAddedTypes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [loading, setLoading] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("全部科目");

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

  // 获取所有科目及数量
  const subjects = useMemo(() => {
    const subjectSet = new Set<string>();
    studentData.forEach((s) => subjectSet.add(s.subject));
    return ["全部科目", ...Array.from(subjectSet).sort()];
  }, [studentData]);

  // 计算每个科目的学生数量
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { 全部科目: studentData.length };
    studentData.forEach((s) => {
      counts[s.subject] = (counts[s.subject] || 0) + 1;
    });
    return counts;
  }, [studentData]);

  // 过滤数据
  const filteredData = useMemo(() => {
    if (selectedSubject === "全部科目") {
      return studentData;
    }
    return studentData.filter((s) => s.subject === selectedSubject);
  }, [studentData, selectedSubject]);

  // 转换为ValueAddedMetrics格式用于趋势预测
  const metricsData: ValueAddedMetrics[] = useMemo(() => {
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
  }, [filteredData]);

  // 统计数据
  const stats = useMemo(() => {
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
  }, [filteredData]);

  // AI诊断建议（基于统计数据生成）
  const aiDiagnostics = useMemo(() => {
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
  }, [stats]);

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

      {/* 科目筛选 */}
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
            onClick={() => setSelectedSubject(subject)}
          >
            {subject} ({subjectCounts[subject] || 0})
          </Badge>
        ))}
      </div>

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
            <CardTitle>学生成绩趋势预测</CardTitle>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            基于线性回归算法，预测学生未来考试的可能表现（显示进步最快和退步最快的各5名学生）
          </p>
        </CardHeader>
        <CardContent>
          {metricsData.length > 0 ? (
            <TrendForecast metrics={metricsData} topN={5} />
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
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
