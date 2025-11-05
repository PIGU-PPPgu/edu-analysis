import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  FileText,
  Brain,
  RefreshCw,
  Settings,
  Filter,
  Search,
  BookOpen,
  Award,
  Target,
} from "lucide-react";

// 导入增强功能库
import {
  DataExporter,
  exportTemplates,
  BatchExporter,
} from "@/lib/export-utils";
import {
  EnhancedAnalyzer,
  type GradeRecord,
  type TrendAnalysisResult,
  type PerformanceInsight,
} from "@/lib/enhanced-analysis";
import {
  EnhancedWarningSystem,
  type WarningAlert,
  type WarningAnalytics,
} from "@/lib/enhanced-warning-system";

// 导入UX组件
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import {
  LoadingSpinner,
  PageLoading,
  EmptyState,
} from "@/components/shared/LoadingStates";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  MobileCard,
} from "@/components/shared/ResponsiveLayout";

// 导入hooks
import { useLoadingState } from "@/hooks/useLoadingState";
import { useErrorHandling } from "@/hooks/useErrorHandling";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentAnalysis {
  studentId: string;
  studentName: string;
  className: string;
  gradeRecords: GradeRecord[];
  trendAnalysis: TrendAnalysisResult;
  insights: PerformanceInsight[];
  warnings: WarningAlert[];
  overallScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

const EnhancedAnalysisHub: React.FC = () => {
  // 状态管理
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [analysisData, setAnalysisData] = useState<StudentAnalysis | null>(
    null
  );
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [warningAnalytics, setWarningAnalytics] =
    useState<WarningAnalytics | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  // UX状态管理
  const { isLoading, setLoading, withLoading } = useLoadingState();
  const { error, setError, clearError, handleAsyncError } = useErrorHandling();

  // 数据加载
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await withLoading(
      async () => {
        // 加载学生列表
        const { data: students } = await supabase
          .from("students")
          .select("student_id, name, class_name")
          .order("name");

        setAllStudents(students || []);

        // 加载预警分析数据
        const analytics =
          await EnhancedWarningSystem.getWarningAnalytics("month");
        setWarningAnalytics(analytics);
      },
      {
        message: "正在加载分析数据...",
        operation: "initial_load",
      }
    );
  };

  // 分析选中的学生
  const analyzeStudent = async (studentId: string) => {
    if (!studentId) return;

    const result = await handleAsyncError(async () => {
      await withLoading(
        async () => {
          // 获取学生成绩数据
          const { data: grades } = await supabase
            .from("grade_data")
            .select(
              `
            student_id,
            name,
            class_name,
            subject,
            score,
            exam_date,
            exam_title
          `
            )
            .eq("student_id", studentId)
            .order("exam_date", { ascending: false });

          if (!grades || grades.length === 0) {
            throw new Error("未找到该学生的成绩数据");
          }

          const student = allStudents.find((s) => s.student_id === studentId);
          if (!student) {
            throw new Error("未找到学生信息");
          }

          // 转换数据格式
          const gradeRecords: GradeRecord[] = grades.map((g) => ({
            student_id: g.student_id,
            name: g.name,
            class_name: g.class_name,
            subject: g.subject,
            score: g.score,
            exam_date: g.exam_date || "",
            exam_title: g.exam_title || "",
          }));

          // 趋势分析
          const scores = gradeRecords.map((g) => g.score);
          const timePoints = gradeRecords.map((g) => g.exam_date);
          const trendAnalysis = EnhancedAnalyzer.analyzeTrend(
            scores,
            timePoints
          );

          // 性能洞察
          const insights =
            EnhancedAnalyzer.generatePerformanceInsights(gradeRecords);

          // 预警评估
          const rules = EnhancedWarningSystem.getDefaultRules().map(
            (rule, index) => ({
              ...rule,
              id: `rule_${index}`,
              isActive: true,
              priority: index + 1,
              autoResolve: false,
              conditions: rule.conditions || [],
              triggers: rule.triggers || [],
              actions: rule.actions || [],
            })
          ) as any[];

          const warnings = await EnhancedWarningSystem.evaluateStudent(
            studentId,
            rules
          );

          // 计算综合评分和风险等级
          const overallScore =
            scores.reduce((sum, score) => sum + score, 0) / scores.length;
          let riskLevel: "low" | "medium" | "high" | "critical" = "low";

          if (warnings.some((w) => w.severity === "critical")) {
            riskLevel = "critical";
          } else if (warnings.some((w) => w.severity === "high")) {
            riskLevel = "high";
          } else if (
            warnings.some((w) => w.severity === "medium") ||
            overallScore < 70
          ) {
            riskLevel = "medium";
          }

          const analysis: StudentAnalysis = {
            studentId,
            studentName: student.name,
            className: student.class_name,
            gradeRecords,
            trendAnalysis,
            insights,
            warnings,
            overallScore,
            riskLevel,
          };

          setAnalysisData(analysis);
          toast.success("学生分析完成", {
            description: `已完成对 ${student.name} 的综合分析`,
          });
        },
        {
          message: "正在分析学生数据...",
          operation: "analyze_student",
        }
      );
    });

    return result;
  };

  // 导出功能
  const handleExport = async (format: "excel" | "csv" | "pdf" | "json") => {
    if (!analysisData) {
      toast.error("请先选择学生进行分析");
      return;
    }

    await withLoading(
      async () => {
        const exportData = exportTemplates.studentGrades(
          analysisData.gradeRecords
        );

        DataExporter.export(exportData, {
          format,
          fileName: `${analysisData.studentName}_成绩分析报告`,
          includeTimestamp: true,
        });

        toast.success(`${format.toUpperCase()} 文件导出成功`);
      },
      {
        message: "正在导出数据...",
        operation: "export_data",
      }
    );
  };

  // 批量导出
  const handleBatchExport = async () => {
    await withLoading(
      async () => {
        const batchExporter = new BatchExporter();

        // 添加多种格式的导出任务
        if (analysisData) {
          const baseData = exportTemplates.studentGrades(
            analysisData.gradeRecords
          );

          batchExporter
            .addExport(baseData, {
              format: "excel",
              fileName: `${analysisData.studentName}_详细报告.xlsx`,
            })
            .addExport(baseData, {
              format: "pdf",
              fileName: `${analysisData.studentName}_摘要报告.pdf`,
            })
            .addExport(baseData, {
              format: "json",
              fileName: `${analysisData.studentName}_数据备份.json`,
            });
        }

        await batchExporter.execute((current, total) => {
          toast.info(`正在导出... (${current}/${total})`);
        });

        toast.success("批量导出完成！");
      },
      {
        message: "正在批量导出...",
        operation: "batch_export",
      }
    );
  };

  // 筛选学生
  const filteredStudents = allStudents.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.includes(searchTerm);
    const matchesClass =
      selectedClass === "all" || student.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  // 获取班级列表
  const classList = Array.from(
    new Set(allStudents.map((s) => s.class_name))
  ).sort();

  // 渲染风险级别标签
  const renderRiskBadge = (riskLevel: string) => {
    const configs = {
      low: {
        variant: "secondary" as const,
        text: "低风险",
        color: "text-green-600",
      },
      medium: {
        variant: "default" as const,
        text: "中风险",
        color: "text-yellow-600",
      },
      high: {
        variant: "destructive" as const,
        text: "高风险",
        color: "text-orange-600",
      },
      critical: {
        variant: "destructive" as const,
        text: "极高风险",
        color: "text-red-600",
      },
    };

    const config = configs[riskLevel as keyof typeof configs] || configs.low;

    return (
      <Badge variant={config.variant} className={config.color}>
        {config.text}
      </Badge>
    );
  };

  // 渲染趋势图标
  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <ErrorBoundary>
      <ResponsiveContainer className="space-y-6 p-4">
        {/* 页面标题 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              智能分析中心
            </h1>
            <p className="text-gray-600 mt-1">
              深度数据分析、智能预警、个性化建议
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleBatchExport}
              disabled={!analysisData || isLoading}
            >
              <Download className="w-4 h-4 mr-2" />
              批量导出
            </Button>
            <Button onClick={loadInitialData} disabled={isLoading}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              刷新数据
            </Button>
          </div>
        </div>

        {/* 学生选择区域 */}
        <MobileCard className="p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              选择学生
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  搜索学生
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="输入姓名或学号..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  筛选班级
                </label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择班级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部班级</SelectItem>
                    {classList.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  选择学生
                </label>
                <Select
                  value={selectedStudent}
                  onValueChange={(value) => {
                    setSelectedStudent(value);
                    analyzeStudent(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择要分析的学生" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStudents.map((student) => (
                      <SelectItem
                        key={student.student_id}
                        value={student.student_id}
                      >
                        {student.name} ({student.class_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </MobileCard>

        {/* 分析结果展示 */}
        {analysisData ? (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="trends">趋势分析</TabsTrigger>
              <TabsTrigger value="insights">深度洞察</TabsTrigger>
              <TabsTrigger value="warnings">预警信息</TabsTrigger>
            </TabsList>

            {/* 概览标签页 */}
            <TabsContent value="overview" className="space-y-6">
              <ResponsiveGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MobileCard className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">
                        学生信息
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {analysisData.studentName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {analysisData.className}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">
                        平均分
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {analysisData.overallScore.toFixed(1)}
                      </p>
                      <div className="mt-1">
                        {renderRiskBadge(analysisData.riskLevel)}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                      <Award className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">
                        成绩趋势
                      </p>
                      <div className="flex items-center mt-1">
                        {renderTrendIcon(analysisData.trendAnalysis.trend)}
                        <span className="text-2xl font-bold text-gray-900 ml-2">
                          {analysisData.trendAnalysis.trend === "up"
                            ? "上升"
                            : analysisData.trendAnalysis.trend === "down"
                              ? "下降"
                              : "稳定"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        变化率:{" "}
                        {analysisData.trendAnalysis.changeRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </MobileCard>

                <MobileCard className="p-6">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">
                        预警数量
                      </p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {analysisData.warnings.length}
                      </p>
                      <p className="text-sm text-gray-600">需要关注的问题</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </MobileCard>
              </ResponsiveGrid>

              {/* 快速导出区域 */}
              <MobileCard className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Download className="w-5 h-5 mr-2" />
                  快速导出
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleExport("excel")}
                    disabled={isLoading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport("pdf")}
                    disabled={isLoading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport("csv")}
                    disabled={isLoading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport("json")}
                    disabled={isLoading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              </MobileCard>
            </TabsContent>

            {/* 趋势分析标签页 */}
            <TabsContent value="trends" className="space-y-6">
              <MobileCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  成绩趋势分析
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        趋势概述
                      </h4>
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="text-gray-600">趋势方向:</span>
                          <span className="ml-2 font-medium">
                            {analysisData.trendAnalysis.trend === "up"
                              ? " 上升趋势"
                              : analysisData.trendAnalysis.trend === "down"
                                ? " 下降趋势"
                                : " 保持稳定"}
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">趋势强度:</span>
                          <span className="ml-2 font-medium">
                            {(
                              analysisData.trendAnalysis.trendStrength * 100
                            ).toFixed(1)}
                            %
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">变化率:</span>
                          <span className="ml-2 font-medium">
                            {analysisData.trendAnalysis.changeRate > 0
                              ? "+"
                              : ""}
                            {analysisData.trendAnalysis.changeRate.toFixed(1)}%
                          </span>
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">预测分数:</span>
                          <span className="ml-2 font-medium">
                            {analysisData.trendAnalysis.prediction.toFixed(1)}分
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        智能建议
                      </h4>
                      <Alert>
                        <Brain className="h-4 w-4" />
                        <AlertDescription>
                          {analysisData.trendAnalysis.suggestion}
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                </div>
              </MobileCard>
            </TabsContent>

            {/* 深度洞察标签页 */}
            <TabsContent value="insights" className="space-y-6">
              <MobileCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  性能洞察分析
                </h3>

                {analysisData.insights.length > 0 ? (
                  <div className="space-y-4">
                    {analysisData.insights.map((insight, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <Badge
                              variant={
                                insight.priority === "high"
                                  ? "destructive"
                                  : insight.priority === "medium"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {insight.priority === "high"
                                ? "🔴 高优先级"
                                : insight.priority === "medium"
                                  ? "🟡 中优先级"
                                  : "🟢 低优先级"}
                            </Badge>
                            {insight.subject && (
                              <Badge variant="outline" className="ml-2">
                                {insight.subject}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary">
                            {insight.type === "strength"
                              ? " 优势"
                              : insight.type === "weakness"
                                ? " 薄弱"
                                : insight.type === "improvement"
                                  ? " 进步"
                                  : " 关注"}
                          </Badge>
                        </div>

                        <h4 className="font-medium text-gray-900 mb-2">
                          {insight.description}
                        </h4>

                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                          <strong>建议:</strong> {insight.actionSuggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="暂无深度洞察"
                    message="需要更多成绩数据来生成深度分析洞察"
                  />
                )}
              </MobileCard>
            </TabsContent>

            {/* 预警信息标签页 */}
            <TabsContent value="warnings" className="space-y-6">
              <MobileCard className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  智能预警系统
                </h3>

                {analysisData.warnings.length > 0 ? (
                  <div className="space-y-4">
                    {analysisData.warnings.map((warning, index) => (
                      <Alert
                        key={index}
                        className={
                          warning.severity === "critical"
                            ? "border-red-500 bg-red-50"
                            : warning.severity === "high"
                              ? "border-orange-500 bg-orange-50"
                              : warning.severity === "medium"
                                ? "border-yellow-500 bg-yellow-50"
                                : "border-blue-500 bg-blue-50"
                        }
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{warning.title}</h4>
                            <Badge
                              variant={
                                warning.severity === "critical" ||
                                warning.severity === "high"
                                  ? "destructive"
                                  : "default"
                              }
                            >
                              {warning.severity === "critical"
                                ? " 严重"
                                : warning.severity === "high"
                                  ? " 高"
                                  : warning.severity === "medium"
                                    ? "🟡 中"
                                    : "🔵 低"}
                            </Badge>
                          </div>
                          <AlertDescription>
                            {warning.description}
                          </AlertDescription>
                        </div>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert className="border-green-500 bg-green-50">
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      <strong>表现良好!</strong>{" "}
                      该学生当前没有触发任何预警规则，继续保持！
                    </AlertDescription>
                  </Alert>
                )}
              </MobileCard>
            </TabsContent>
          </Tabs>
        ) : selectedStudent ? (
          <PageLoading message="正在分析学生数据..." showProgress={true} />
        ) : (
          <EmptyState
            title="选择学生开始分析"
            message="请在上方选择一名学生来查看详细的智能分析报告"
            action={
              <Button onClick={loadInitialData} disabled={isLoading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新学生列表
              </Button>
            }
          />
        )}
      </ResponsiveContainer>
    </ErrorBoundary>
  );
};

export default EnhancedAnalysisHub;
