import React, { useEffect, useRef, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import WarningDashboard from "@/components/warning/WarningDashboard";
import WarningList from "@/components/warning/WarningList";
import WarningTrendChart from "@/components/warning/WarningTrendChart";
import HistoryComparison from "@/components/warning/HistoryComparison";
import AIAnalysisPanel from "@/components/warning/AIAnalysisPanel";
import WarningTrackingDashboard from "@/components/warning/WarningTrackingDashboard";
import AutoRulesManager from "@/components/warning/AutoRulesManager";
import DataIntegrationControl from "@/components/warning/DataIntegrationControl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
  Settings,
  AlertTriangle,
  RefreshCcw,
  BarChart3,
  Target,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  getWarningStatistics,
  WarningStatistics as WarningStatisticsType,
} from "@/services/warningService";
import { useUrlParams } from "@/hooks/useUrlParams";
import { requestCache } from "@/utils/cacheUtils";
import WarningFilters, {
  WarningFilterConfig,
} from "@/components/warning/WarningFilters";
import { supabase } from "@/integrations/supabase/client";

// 使用新的筛选配置接口

const WarningAnalysis = () => {
  // 添加组件挂载状态ref以防止任何潜在的问题
  const isMountedRef = useRef(true);
  const { params, isFromAnomalyDetection, hasExamFilter } = useUrlParams();

  // 移除分析模式状态 统一使用筛选器驱动

  const [isLoading, setIsLoading] = useState(false);
  const [warningStats, setWarningStats] =
    useState<WarningStatisticsType | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // 筛选配置状态 - 支持URL参数初始化
  const [filterConfig, setFilterConfig] = useState<WarningFilterConfig>(() => {
    const config: WarningFilterConfig = {
      timeRange: "semester",
      examTypes: ["月考", "期中考试", "期末考试", "模拟考试"],
      classNames: [], // 新增：班级筛选，初始为空，后续从数据库加载
      examTitles: [], // 新增：具体考试筛选
      mixedAnalysis: true,
      analysisMode: "student",
      startDate: undefined,
      endDate: undefined,
      severityLevels: ["high", "medium", "low"],
      warningStatus: ["active", "resolved", "dismissed"],
    };

    // 如果来自异常检测且有考试信息 自动设置筛选条件
    if (isFromAnomalyDetection && params.exam) {
      config.examTypes = []; // 清空默认选择
      config.mixedAnalysis = false; // 专注单一考试分析
      // 根据考试标题推断考试类型
      const examTitle = params.exam.toLowerCase();
      if (examTitle.includes("月考")) {
        config.examTypes = ["月考"];
      } else if (examTitle.includes("期中")) {
        config.examTypes = ["期中考试"];
      } else if (examTitle.includes("期末")) {
        config.examTypes = ["期末考试"];
      } else if (examTitle.includes("模拟")) {
        config.examTypes = ["模拟考试"];
      } else {
        // 默认作为月考处理
        config.examTypes = ["月考"];
      }

      // 设置时间范围为自定义 如果有考试日期的话
      if (params.date) {
        config.timeRange = "custom";
        config.startDate = params.date;
        config.endDate = params.date;
      }
    }

    return config;
  });

  // 控制筛选器显示状态
  const [showFilters, setShowFilters] = useState(false);

  // 可用选项数据
  const [availableClassNames, setAvailableClassNames] = useState<string[]>([]);
  const [availableExamTitles, setAvailableExamTitles] = useState<string[]>([]);

  // 添加调试信息 - 监控筛选选项状态变化
  React.useEffect(() => {
    console.log("🎯 筛选选项状态更新:", {
      availableClassNames: availableClassNames.length,
      availableExamTitles: availableExamTitles.length,
      classNames: availableClassNames.slice(0, 3),
      examTitles: availableExamTitles.slice(0, 3),
    });
  }, [availableClassNames, availableExamTitles]);

  // 清理任何潜在的副作用
  useEffect(() => {
    fetchWarningData();
    fetchAvailableOptions(); // 获取筛选选项数据

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 当筛选条件改变时 重新加载数据
  useEffect(() => {
    fetchWarningData();
  }, [filterConfig]);

  // 获取预警数据 - 支持缓存和双模式
  const fetchWarningData = async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);

      // 根据筛选条件和参数构建缓存键
      const cacheKey = `warning_analysis_${JSON.stringify({ ...params, ...filterConfig })}}`;

      const stats = await requestCache.get(
        cacheKey,
        async () => {
          console.log("🚀 页面级别 - 开始获取预警数据...");

          // 根据筛选配置调用API
          const rawStats = await getWarningStatistics({
            timeRange: filterConfig.timeRange,
            examTypes: filterConfig.examTypes,
            classNames: filterConfig.classNames, // 新增：传递班级筛选
            examTitles: filterConfig.examTitles, // 新增：传递考试筛选
            gradeLevel: filterConfig.gradeLevel, // 新增：传递年级筛选
            mixedAnalysis: filterConfig.mixedAnalysis,
            analysisMode: filterConfig.analysisMode,
            startDate: filterConfig.startDate,
            endDate: filterConfig.endDate,
            severityLevels: filterConfig.severityLevels,
            warningStatus: filterConfig.warningStatus,
          });

          console.log(
            "📊 页面级别 - getWarningStatistics 返回:",
            rawStats ? "有数据" : "无数据",
            rawStats?.totalStudents,
            "学生"
          );

          // 添加上下文信息
          const contextualStats = {
            ...rawStats,
            analysisContext: {
              examFilter: hasExamFilter ? params.exam : null,
              dateFilter: hasExamFilter ? params.date : null,
              fromAnomalyDetection: isFromAnomalyDetection,
              filterConfig,
            },
          };

          return contextualStats;
        },
        10 * 60 * 1000 // 10分钟缓存
      );

      if (isMountedRef.current) {
        console.log(
          "✅ 页面级别 - 数据加载完成，传递给WarningDashboard:",
          stats?.totalStudents,
          "学生"
        );
        setWarningStats(stats);
      }
    } catch (error) {
      console.error("❌ 获取预警数据失败:", error);
      if (isMountedRef.current) {
        // 设置null状态，让组件显示无数据状态而不是模拟数据
        setWarningStats(null);
        toast.error("获取预警数据失败", {
          description: `数据库连接异常: ${error instanceof Error ? error.message : "未知错误"}`,
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchWarningData();
  };

  // 移除模式切换处理 使用筛选器控制

  // 获取筛选选项数据
  const fetchAvailableOptions = async () => {
    try {
      console.log("🔍 开始获取筛选选项数据...");

      // 📚 获取班级列表 - 优先从classes表获取
      console.log("📚 从classes表获取班级列表...");
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("name")
        .order("name");

      console.log("📚 classes表查询结果:", {
        count: classesData?.length,
        error: classesError,
        sample: classesData?.slice(0, 3),
      });

      let finalClassNames = [];

      if (!classesError && classesData && classesData.length > 0) {
        finalClassNames = [
          ...new Set(classesData.map((item) => item.name).filter(Boolean)),
        ];
        console.log("✅ 从classes表获取班级列表:", finalClassNames);
      }

      // 如果classes表没有数据，尝试从students表的class_name字段获取
      if (finalClassNames.length === 0) {
        console.log("📚 classes表无数据，尝试从students表获取班级...");
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("class_name")
          .not("class_name", "is", null);

        console.log("📚 students查询结果:", {
          count: studentsData?.length,
          error: studentsError,
          sample: studentsData?.slice(0, 3),
        });

        if (!studentsError && studentsData && studentsData.length > 0) {
          finalClassNames = [
            ...new Set(
              studentsData.map((item) => item.class_name).filter(Boolean)
            ),
          ];
          console.log("✅ 从students表获取班级列表:", finalClassNames);
        }
      }

      // 设置班级数据
      if (finalClassNames.length > 0) {
        setAvailableClassNames(finalClassNames);
        // 初始化时设置所有班级为选中状态
        setFilterConfig((prev) => ({
          ...prev,
          classNames: finalClassNames,
        }));
        console.log("✅ 最终班级列表设置成功:", finalClassNames);
      } else {
        console.warn(
          "⚠️ 未找到任何班级数据 - 这是正常的，说明用户还没有上传数据"
        );
        // 设置空列表（不使用默认值，避免显示其他用户的数据）
        setAvailableClassNames([]);
        setFilterConfig((prev) => ({
          ...prev,
          classNames: [],
        }));
        console.log("🔧 班级列表为空 - 用户需要先上传数据");
      }

      // 📊 获取考试列表 - 从grades表获取
      console.log("📊 从grades表获取考试列表...");
      const { data: examData, error: examError } = await supabase
        .from("grades")
        .select("exam_title")
        .not("exam_title", "is", null)
        .limit(1000);

      console.log("📊 考试数据查询结果:", {
        count: examData?.length,
        error: examError,
        sample: examData?.slice(0, 5),
      });

      let finalExamTitles = [];

      if (!examError && examData && examData.length > 0) {
        finalExamTitles = [
          ...new Set(examData.map((item) => item.exam_title).filter(Boolean)),
        ];
        console.log(
          "✅ 从grades表获取考试列表:",
          finalExamTitles.slice(0, 5),
          "等共",
          finalExamTitles.length,
          "个"
        );
      } else {
        console.warn(
          "⚠️ 未找到任何考试数据 - 这是正常的，说明用户还没有上传数据"
        );
        // 设置空列表（不使用默认值，避免显示其他用户的数据）
        finalExamTitles = [];
        console.log("🔧 考试列表为空 - 用户需要先上传数据");
      }

      setAvailableExamTitles(finalExamTitles);
      console.log(
        "✅ 最终考试列表设置成功，共",
        finalExamTitles.length,
        "个考试"
      );

      // 向用户显示加载成功信息
      if (finalClassNames.length > 0 || finalExamTitles.length > 0) {
        toast.success("筛选选项加载成功", {
          description: `找到${finalClassNames.length}个班级，${finalExamTitles.length}个考试`,
        });
      }
    } catch (error) {
      console.error("获取筛选选项失败:", error);
      toast.error("获取筛选选项失败", {
        description: "无法加载班级和考试数据，请检查数据库连接",
      });

      // 出错时设置空列表（不使用默认值）
      setAvailableClassNames([]);
      setAvailableExamTitles([]);
    }
  };

  // 筛选配置更新处理
  const handleFilterChange = (newFilter: WarningFilterConfig) => {
    setFilterConfig(newFilter);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* 维护横幅 */}
      <div className="bg-red-600 text-white text-center py-3 px-4 font-semibold text-sm tracking-wide">
        🚧 仍在开发维护中，暂不可用
      </div>

      {/* 顶部标题栏 - 参考基础分析风格 */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#B9FF66] rounded-full border-2 border-black">
                <AlertTriangle className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-[#191A23] tracking-tight">
                  预警分析中心
                </h1>
                <p className="text-[#191A23]/70 font-medium mt-1">
                  分析学生预警数据 发现问题并制定干预措施
                  {isFromAnomalyDetection && params.exam && (
                    <span className="text-[#9C88FF] font-bold">
                      专注于 {params.exam} 异常分析
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 筛选器切换按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-2 border-black bg-white hover:bg-gray-50 text-black font-bold shadow-[2px_2px_0px_0px_#000]"
              >
                <Filter className="h-4 w-4 mr-2" />
                筛选器
                {showFilters && <span className="ml-1 text-[#B9FF66]"> </span>}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="border-2 border-black bg-white hover:bg-gray-50 text-black font-bold shadow-[2px_2px_0px_0px_#000]"
              >
                <RefreshCcw
                  className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                {isLoading ? "刷新中..." : "刷新"}
              </Button>
            </div>
          </div>

          {/* 状态标识栏 */}
          <div className="flex items-center gap-2 mt-4">
            {isFromAnomalyDetection && (
              <Badge className="bg-[#9C88FF] text-white border-2 border-black font-bold shadow-[2px_2px_0px_0px_#191A23]">
                来自异常检测
              </Badge>
            )}
            {hasExamFilter && params.exam && (
              <Badge
                variant="outline"
                className="border-2 border-[#B9FF66] text-[#B9FF66] font-bold"
              >
                当前考试: {params.exam}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 主要内容区域 - 使用flex布局 */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* 侧边筛选器 */}
          {showFilters && (
            <div className="w-80 flex-shrink-0">
              <WarningFilters
                filter={filterConfig}
                onFilterChange={handleFilterChange}
                onClose={() => setShowFilters(false)}
                initialExamFilter={params.exam}
                initialDateFilter={params.date}
                fromAnomalyDetection={isFromAnomalyDetection}
                availableClassNames={availableClassNames}
                availableExamTitles={availableExamTitles}
              />
            </div>
          )}

          {/* 主内容区域 */}
          <div className="flex-1 space-y-6">
            {/* 来自异常检测的上下文信息 */}
            {isFromAnomalyDetection && params.exam && (
              <Card className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-[#9C88FF] rounded-full border-2 border-black">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[#191A23]">
                          {params.exam}
                        </h3>
                        <p className="text-sm text-[#191A23]/70">
                          {params.date && `考试日期: ${params.date}`}
                          <span className="text-[#9C88FF] font-medium">
                            来源: 异常检测系统
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
              <div className="flex">
                <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
                <div>
                  <h4 className="font-medium">预警系统说明</h4>
                  <p className="text-sm mt-1">
                    本系统通过分析多种维度的学生数据 识别潜在风险因素并生成预警
                    使用筛选器可以针对特定时间范围
                    考试类型或风险等级进行精准分析
                    系统将自动评估并向您提供学生风险分析和干预建议
                  </p>
                </div>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="mb-6 grid grid-cols-5 w-[1000px] bg-gray-100 border border-gray-300 p-1 rounded-lg">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
                >
                  <BarChart3 className="h-4 w-4" />
                  预警概览
                </TabsTrigger>
                <TabsTrigger
                  value="trendAnalysis"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
                >
                  <BarChart3 className="h-4 w-4" />
                  趋势分析
                </TabsTrigger>
                <TabsTrigger
                  value="aiAnalysis"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
                >
                  <BarChart3 className="h-4 w-4" />
                  AI分析
                </TabsTrigger>
                <TabsTrigger
                  value="tracking"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
                >
                  <BarChart3 className="h-4 w-4" />
                  学生追踪
                </TabsTrigger>
                <TabsTrigger
                  value="autoWarning"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
                >
                  <Settings className="h-4 w-4" />
                  预警规则
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <WarningDashboard
                  warningData={warningStats}
                  factorStats={warningStats?.commonRiskFactors}
                  isLoading={isLoading}
                  activeTab="overview"
                  hideTabList={true}
                  filterConfig={filterConfig}
                />
              </TabsContent>

              <TabsContent value="trendAnalysis" className="space-y-6">
                <WarningDashboard
                  warningData={warningStats}
                  factorStats={warningStats?.commonRiskFactors}
                  isLoading={isLoading}
                  activeTab="trendAnalysis"
                  hideTabList={true}
                  filterConfig={filterConfig}
                />
              </TabsContent>

              <TabsContent value="aiAnalysis" className="space-y-6">
                <WarningDashboard
                  warningData={warningStats}
                  factorStats={warningStats?.commonRiskFactors}
                  isLoading={isLoading}
                  activeTab="aiAnalysis"
                  hideTabList={true}
                  filterConfig={filterConfig}
                />
              </TabsContent>

              <TabsContent value="tracking" className="space-y-6">
                <WarningDashboard
                  warningData={warningStats}
                  factorStats={warningStats?.commonRiskFactors}
                  isLoading={isLoading}
                  activeTab="tracking"
                  hideTabList={true}
                  filterConfig={filterConfig}
                />
              </TabsContent>

              <TabsContent value="autoWarning" className="space-y-6">
                <WarningDashboard
                  warningData={warningStats}
                  factorStats={warningStats?.commonRiskFactors}
                  isLoading={isLoading}
                  activeTab="autoWarning"
                  hideTabList={true}
                  filterConfig={filterConfig}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarningAnalysis;
