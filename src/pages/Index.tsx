import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/unified/modules/AuthModule";
import { Navbar } from "@/components/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Users,
  Loader2,
  List,
  BarChart3,
  ListFilter,
  Download,
  FileSpreadsheet,
  FileInput,
  Plus,
  BookOpen,
  AlertTriangle,
  User,
  Upload,
  TrendingUp,
  Brain,
  Construction,
  CheckCircle,
  RotateCcw,
  Play,
  RefreshCw,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradeAnalysisService } from "@/services/gradeAnalysisService";
import StudentDataImporter from "@/components/analysis/core/StudentDataImporter";
// 导入智能成绩导入组件
import { SimpleGradeImporter } from "@/components/import/SimpleGradeImporter";
import { FileUploader } from "@/components/analysis/core/grade-importer";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
// 🧠 Master-AI-Data: 智能推荐系统
import RecommendationPanel from "@/components/ai/RecommendationPanel";
// import { useUserBehaviorTracker } from "@/services/ai/userBehaviorTracker"; // 暂时禁用
import { Separator } from "@/components/ui/separator";
// import Footer from "@/components/shared/Footer"; // 暂时移除

// 使用AI增强的成绩导入组件 - 包含完整的AI解析功能
// 校验面板组件
import GradeValidationPanel from "@/components/grade/GradeValidationPanel";
import {
  gradeDataValidator,
  type ValidationReport,
  type ValidationOptions,
} from "@/services/gradeDataValidator";
import { autoSyncService } from "@/services/autoSyncService";
import { showError } from "@/services/errorHandler";

type TableStatus =
  | "idle"
  | "checking"
  | "ready"
  | "missing"
  | "initializing"
  | "error";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tableStatus, setTableStatus] = useState<TableStatus>("checking");
  const [tableError, setTableError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, isAuthReady } = useAuth();

  // 校验相关状态
  const [validationReport, setValidationReport] =
    useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  // 🧠 Master-AI-Data: 用户行为追踪（暂时禁用）
  // const { trackPageView, trackEvent, setUserId } = useUserBehaviorTracker();

  // 整合GradeDataImport的状态
  const [gradesActiveTab, setGradesActiveTab] = useState("import");
  const [importedData, setImportedData] = useState<any[]>([]);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);

  // 主Tab状态（学生导入 vs 成绩导入）
  const [mainActiveTab, setMainActiveTab] = useState("students");

  // 统一使用智能导入模式
  // 移除了旧的导入方式选择，简化用户体验

  const checkTables = useCallback(async () => {
    setTableStatus("checking");
    setTableError(null);
    try {
      const { error } = await supabase
        .from("grade_data")
        .select("*", { count: "exact", head: true })
        .limit(1);

      if (error) {
        if (error.code === "42P01") {
          setTableStatus("missing");
          setTableError("缺少成绩数据表，请初始化");
        } else {
          setTableStatus("error");
          setTableError(error.message || "检查数据表失败");
        }
      } else {
        setTableStatus("ready");
        setLastCheckTime(new Date().toLocaleString());
      }
    } catch (err) {
      setTableStatus("error");
      setTableError(err instanceof Error ? err.message : "检查数据表失败");
    }
  }, []);

  const initializeTables = useCallback(async () => {
    setTableStatus("initializing");
    setTableError(null);
    try {
      const result = await gradeAnalysisService.initializeTables();
      if (result.success) {
        toast.success("数据表初始化成功", {
          description: "成绩分析所需的数据表已创建",
        });
        await checkTables();
      } else if (result.needsManualExecution) {
        setTableStatus("missing");
        setTableError("无法自动创建数据表，请在 Supabase 控制台执行 SQL");
        toast.warning("需要手动执行初始化 SQL", {
          description: "请联系管理员处理",
        });
      } else {
        setTableStatus("error");
        setTableError(result.message || "数据表初始化失败");
        toast.error("数据表初始化失败", {
          description: result.message || "请查看控制台了解详情",
        });
      }
    } catch (error) {
      setTableStatus("error");
      setTableError(
        error instanceof Error ? error.message : "数据表初始化失败"
      );
      toast.error("数据表初始化失败", {
        description:
          error instanceof Error ? error.message : "请查看控制台了解详情",
      });
    }
  }, [checkTables]);

  useEffect(() => {
    if (isAuthReady && user) {
      checkTables();
    }
  }, [isAuthReady, user, checkTables]);

  useEffect(() => {
    // 用AuthContext统一处理认证状态，避免重复逻辑
    if (isAuthReady) {
      setIsLoading(false);
    }
  }, [isAuthReady]);

  // 🧠 Master-AI-Data: 初始化用户行为追踪
  useEffect(() => {
    if (user?.id) {
      // setUserId(user.id);
      // trackPageView("/dashboard");
    }
  }, [user?.id]); // , setUserId, trackPageView - 暂时禁用

  // 处理成绩分析跳转
  const handleGoToAnalysis = () => {
    setIsAnalysisLoading(true);

    // 🧠 Master-AI-Data: 追踪用户导航行为（暂时禁用）
    // trackEvent("page_navigation", {
    //   source_page: "/dashboard",
    //   target_page: "/grade-analysis",
    //   action_type: "quick_access_button",
    // });

    // 模拟加载过程
    setTimeout(() => {
      navigate("/grade-analysis");
      setIsAnalysisLoading(false);
    }, 800);
  };

  // 整合GradeDataImport的处理函数
  const handleDataImported = (data: any[]) => {
    // 重置校验状态
    setValidationReport(null);
    setShowValidationPanel(false);
    setImportedData(data);
    setGradesActiveTab("preview");

    toast.success("数据导入成功", {
      description: `已成功导入 ${data.length} 条成绩记录`,
    });
  };

  const handleStudentDataImported = (data: any[]) => {
    toast.success("数据导入成功", {
      description: `已成功导入 ${data.length} 条记录`,
    });
  };

  // 处理简化导入完成
  const handleSimpleImportComplete = async (result: any) => {
    console.log("简化导入完成:", result);
    setValidationReport(null);
    setShowValidationPanel(false);

    const imported = result?.importedData || [];
    const recordCount = result?.successRecords || imported.length || 0;

    if (recordCount === 0) {
      toast.warning("导入完成", {
        description: "未检测到可预览的数据，请检查文件格式或映射配置",
      });
      return;
    }

    setImportedData(imported);
    setGradesActiveTab("preview");

    toast.success("导入完成", {
      description: `成功导入 ${recordCount} 条记录`,
    });

    // 如果有实际导入的数据，进行数据校验
    if (imported.length > 0) {
      console.log("📋 开始对导入的数据进行校验...");
      await handleValidateData(imported, {
        enableAutoFix: true,
        skipWarnings: false,
        skipInfo: true,
        enableDataCleaning: true,
        strictMode: false,
        maxErrors: 500,
      });
    }
  };

  // 校验相关方法
  const handleValidateData = async (
    data: any[],
    options?: ValidationOptions
  ) => {
    if (!data || data.length === 0) {
      toast.error("没有可校验的数据");
      return;
    }
    setIsValidating(true);
    try {
      console.log("🔍 开始数据校验:", data.length, "条记录");
      const report = await gradeDataValidator.validateGradeData(data, options);
      setValidationReport(report);
      setShowValidationPanel(true);

      if (report.success) {
        toast.success("数据校验完成", {
          description: `数据质量: ${report.dataQuality.score}分 (${report.dataQuality.label})`,
        });
      } else {
        toast.warning("发现数据问题", {
          description: `发现 ${report.summary.critical} 个严重错误，${report.summary.errors} 个错误`,
        });
      }
    } catch (error) {
      console.error("数据校验失败:", error);
      showError(error, { operation: "数据校验", recordCount: data.length });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRevalidate = () => {
    if (importedData.length > 0) {
      handleValidateData(importedData);
    }
  };

  const handleExportValidationReport = () => {
    if (!validationReport) return;

    const reportData = {
      ...validationReport,
      exportTime: new Date().toISOString(),
      totalRecords: validationReport.totalRecords,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `validation-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("校验报告已导出");
  };

  const handleApplyFixes = async (fixIds: string[]) => {
    if (!validationReport) return;

    try {
      // 动态导入数据修复服务
      const { dataFixService } = await import("@/services/dataFixService");

      // 执行数据质量诊断
      toast.info("正在诊断数据质量问题...");
      const diagnosticReport = await dataFixService.diagnoseDataQuality();

      if (diagnosticReport.totalIssues === 0) {
        toast.success("数据质量良好，无需修复");
        return;
      }

      // 应用修复
      toast.info(`发现 ${diagnosticReport.totalIssues} 个问题，正在修复...`);
      const results = await dataFixService.autoFixAll(diagnosticReport);

      const successCount = results.filter((r) => r.success).length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`成功修复 ${successCount} 个问题`, {
          description:
            failedCount > 0 ? `${failedCount} 个问题需要人工处理` : undefined,
        });
      }

      if (failedCount > 0) {
        toast.warning(`${failedCount} 个问题无法自动修复`, {
          description: "请手动检查数据完整性",
        });
      }

      // 刷新验证报告
      // TODO: 重新验证数据
    } catch (error) {
      console.error("[自动修复] 修复失败:", error);
      toast.error("自动修复失败", {
        description:
          error instanceof Error ? error.message : "请查看控制台日志",
      });
    }
  };

  const actionsDisabled =
    tableStatus === "checking" ||
    tableStatus === "initializing" ||
    tableStatus === "missing" ||
    tableStatus === "error" ||
    isValidating;

  const statusLabel =
    tableStatus === "ready"
      ? "数据库就绪"
      : tableStatus === "checking"
        ? "正在检查数据库..."
        : tableStatus === "initializing"
          ? "正在初始化数据表..."
          : tableStatus === "missing"
            ? "缺少必需数据表"
            : "数据库状态异常";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
        <span>正在加载...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="flex gap-8">
          {/* 主要内容区域 */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">数据导入中心</h1>
            <p className="text-gray-500 mb-4">导入和管理学生信息与成绩数据</p>

            {/* 新功能提示 */}
            <div className="mb-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  🎉 新版导入功能上线！
                </span>
              </div>
              <p className="text-sm text-green-700">
                体验全新的智能导入流程：
                <strong>一键上传 → AI智能识别 → 快速完成</strong>
                ，让数据导入变得更简单！
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <Badge
                  className={`border ${tableStatus === "ready" ? "bg-green-100 text-green-800 border-green-300" : "bg-amber-100 text-amber-800 border-amber-300"}`}
                >
                  {statusLabel}
                </Badge>
                {lastCheckTime && (
                  <span className="text-gray-600">
                    上次检查：{lastCheckTime}
                  </span>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={checkTables}
                    disabled={tableStatus === "checking"}
                  >
                    重新检查
                  </Button>
                  <Button
                    size="sm"
                    onClick={initializeTables}
                    disabled={tableStatus === "initializing"}
                  >
                    初始化表
                  </Button>
                </div>
              </div>
            </div>

            {tableStatus !== "ready" && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>数据库未就绪</AlertTitle>
                <AlertDescription>
                  {tableError ||
                    "成绩分析系统需要的数据库表尚未创建或检查失败，请先初始化。"}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={checkTables}
                      disabled={tableStatus === "checking"}
                    >
                      重新检查
                    </Button>
                    <Button
                      size="sm"
                      onClick={initializeTables}
                      disabled={tableStatus === "initializing"}
                    >
                      初始化数据表
                    </Button>
                    <Link
                      to="/tools/init-tables"
                      className="text-sm underline font-medium"
                    >
                      手动初始化指南
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Tabs
              key="main-tabs"
              value={mainActiveTab}
              onValueChange={setMainActiveTab}
              className="w-full"
            >
              <TabsList className="mb-6 bg-white border shadow-sm">
                <TabsTrigger
                  value="students"
                  className="gap-2 data-[state=active]:bg-[#F2FCE2]"
                >
                  <Users className="h-4 w-4" />
                  学生信息导入
                </TabsTrigger>
                <TabsTrigger
                  value="grades"
                  className="gap-2 data-[state=active]:bg-[#E5DEFF]"
                >
                  <FileText className="h-4 w-4" />
                  成绩数据导入
                </TabsTrigger>
              </TabsList>

              <TabsContent value="students">
                <div className="grid gap-6">
                  <Card className="border-t-4 border-t-green-400">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        学生信息导入
                      </CardTitle>
                      <CardDescription>
                        导入学生基本信息，包括学号、姓名、班级等必填信息及其他选填信息
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <StudentDataImporter
                        onDataImported={handleStudentDataImported}
                        onSuccess={() => setMainActiveTab("grades")}
                      />
                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => navigate("/student-management")}
                        >
                          <List className="h-4 w-4" />
                          查看学生列表
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="grades">
                <div className="grid gap-6">
                  <Card className="border-t-4 border-t-purple-400">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        成绩数据导入
                      </CardTitle>
                      <CardDescription>
                        通过学号或姓名关联学生，导入各科目成绩数据
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* 智能导入说明 */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          智能成绩导入
                        </h3>
                        <p className="text-xs text-gray-700">
                          🌟 一键智能识别，三步完成导入，支持大文件和Web
                          Worker加速处理
                        </p>
                      </div>

                      {/* 简化的成绩导入 */}
                      <Tabs
                        key="grades-tabs"
                        defaultValue="import"
                        className="w-full"
                        onValueChange={setGradesActiveTab}
                        value={gradesActiveTab}
                      >
                        <TabsList className="mb-6 w-full justify-start">
                          <TabsTrigger
                            value="import"
                            className="flex items-center gap-1"
                          >
                            <FileInput className="h-4 w-4" />
                            <span>数据导入</span>
                          </TabsTrigger>
                          <TabsTrigger
                            value="preview"
                            className="flex items-center gap-1"
                          >
                            <ListFilter className="h-4 w-4" />
                            <span>数据预览</span>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="import" className="space-y-6">
                          <SimpleGradeImporter
                            onComplete={handleSimpleImportComplete}
                            onCancel={() => console.log("用户取消导入")}
                          />
                        </TabsContent>

                        <TabsContent value="preview">
                          {importedData.length > 0 ? (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">
                                      导入数据总量
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-2xl font-bold">
                                      {importedData.length}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      条成绩记录
                                    </p>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">
                                      数据完整率
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-2xl font-bold">
                                      {validationReport
                                        ? `${Math.round((validationReport.validRecords / validationReport.totalRecords) * 100)}%`
                                        : "100%"}
                                    </div>
                                    <Progress
                                      value={
                                        validationReport
                                          ? (validationReport.validRecords /
                                              validationReport.totalRecords) *
                                            100
                                          : 100
                                      }
                                      className="h-1 mt-1"
                                    />
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">
                                      班级覆盖
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-2xl font-bold">
                                      {
                                        new Set(
                                          importedData.map(
                                            (item) => item.class_name
                                          )
                                        ).size
                                      }
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                      个班级
                                    </p>
                                  </CardContent>
                                </Card>

                                <Card>
                                  <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">
                                      {validationReport
                                        ? "数据质量"
                                        : "科目类型"}
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    {validationReport ? (
                                      <div className="flex items-center space-x-2">
                                        <div
                                          className="text-2xl font-bold"
                                          style={{
                                            color:
                                              validationReport.dataQuality
                                                .color,
                                          }}
                                        >
                                          {validationReport.dataQuality.score}
                                        </div>
                                        <Badge
                                          variant="outline"
                                          style={{
                                            color:
                                              validationReport.dataQuality
                                                .color,
                                          }}
                                        >
                                          {validationReport.dataQuality.label}
                                        </Badge>
                                      </div>
                                    ) : (
                                      <div className="text-2xl font-bold">
                                        {
                                          new Set(
                                            importedData.map(
                                              (item) => item.subject
                                            )
                                          ).size
                                        }
                                      </div>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                      {validationReport ? "质量评分" : "个科目"}
                                    </p>
                                  </CardContent>
                                </Card>
                              </div>

                              <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">
                                  导入数据预览
                                </h2>
                                <div className="flex items-center gap-2">
                                  {importedData.length > 0 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleValidateData(importedData)
                                      }
                                      disabled={isValidating}
                                    >
                                      {isValidating ? (
                                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                      )}
                                      数据校验
                                    </Button>
                                  )}
                                  {validationReport && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        setShowValidationPanel(
                                          !showValidationPanel
                                        )
                                      }
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      {showValidationPanel
                                        ? "隐藏校验"
                                        : "查看校验"}
                                    </Button>
                                  )}
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4 mr-1" />
                                    导出数据
                                  </Button>
                                </div>
                              </div>

                              {/* 数据校验面板 */}
                              {showValidationPanel && validationReport && (
                                <GradeValidationPanel
                                  report={validationReport}
                                  isLoading={isValidating}
                                  onRevalidate={handleRevalidate}
                                  onExportReport={handleExportValidationReport}
                                  onApplyFixes={handleApplyFixes}
                                  className="mt-6"
                                />
                              )}

                              <div className="flex justify-end gap-4">
                                <Button
                                  variant="outline"
                                  onClick={() => setGradesActiveTab("import")}
                                >
                                  返回导入
                                </Button>
                                <Button
                                  onClick={handleGoToAnalysis}
                                  className="bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
                                  disabled={isAnalysisLoading}
                                >
                                  {isAnalysisLoading ? (
                                    <>
                                      <BarChart3 className="mr-2 h-4 w-4 animate-pulse" />
                                      正在准备分析...
                                    </>
                                  ) : (
                                    <>
                                      <BarChart3 className="mr-2 h-4 w-4" />
                                      前往成绩分析
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                              <FileSpreadsheet className="h-16 w-16 text-slate-300 mb-4" />
                              <h3 className="text-xl font-medium mb-2">
                                暂无导入数据
                              </h3>
                              <p className="text-slate-500 mb-6 text-center max-w-md">
                                请先使用数据导入功能导入成绩数据，导入后的数据将在此处预览
                              </p>
                              <Button
                                onClick={() => setGradesActiveTab("import")}
                                className="bg-[#c0ff3f] text-black hover:bg-[#a8e85c]"
                              >
                                <FileInput className="mr-2 h-4 w-4" />
                                去导入数据
                              </Button>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 🧠 Master-AI-Data: 智能推荐侧边栏 */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-4">
              <RecommendationPanel
                maxItems={6}
                variant="compact"
                className="mb-6"
              />
            </div>
          </div>
        </div>
      </div>
      {/* <Footer /> */}
    </div>
  );
};

export default Index;
