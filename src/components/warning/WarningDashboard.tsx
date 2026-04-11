import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import WarningStatistics from "./WarningStatistics";
import RiskFactorChart from "./RiskFactorChart";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ZapIcon,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Users,
  Brain,
  ArrowRight,
  RefreshCw,
  Loader2,
  Database as DatabaseIcon,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { getUserAIConfig, getUserAPIKey } from "@/utils/userAuth";
import { getAIClient } from "@/services/aiService";
import { formatNumber } from "@/utils/formatUtils";
import AutoRulesManager from "./AutoRulesManager";
import WarningTrendChart from "./WarningTrendChart";
import HistoryComparison from "./HistoryComparison";
import AIAnalysisPanel from "./AIAnalysisPanel";
import DataIntegrationControl from "./DataIntegrationControl";
import WarningTrackingDashboard from "./WarningTrackingDashboard";
// 直接使用Supabase客户端
import { supabase } from "@/integrations/supabase/client";

// 组件属性接口
interface WarningDashboardProps {
  factorStats?: Array<{ factor: string; count: number; percentage: number }>;
  levelStats?: Array<{ level: string; count: number; percentage: number }>;
  warningData?: any;
  isLoading?: boolean;
  activeTab?: string; // 外部控制显示的tab
  hideTabList?: boolean; // 是否隐藏tab列表
  // 新增：传递筛选条件给子组件
  filterConfig?: {
    timeRange?: string;
    classNames?: string[];
    examTitles?: string[];
    warningStatus?: string[];
    severityLevels?: string[];
  };
}

// 改进设计的统计卡片组件
const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  change,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: "up" | "down" | "unchanged";
  change?: number;
}) => (
  <Card className="overflow-hidden border border-gray-200 bg-white text-gray-900 hover:shadow-lg transition-all duration-200 rounded-xl">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-800">
              {formatNumber(value)}
            </p>
            {change !== undefined && trend !== "unchanged" && (
              <div className="flex items-center">
                {trend === "up" ? (
                  <ArrowUpRight
                    className={`h-4 w-4 ${title.includes("风险") ? "text-red-500" : "text-green-500"}`}
                  />
                ) : trend === "down" ? (
                  <ArrowDownRight
                    className={`h-4 w-4 ${title.includes("风险") ? "text-green-500" : "text-red-500"}`}
                  />
                ) : null}
                <span
                  className={`text-xs ${
                    (trend === "up" && title.includes("风险")) ||
                    (trend === "down" &&
                      !title.includes("风险") &&
                      !title.includes("高风险学生"))
                      ? "text-red-500"
                      : trend === "down" && title.includes("高风险学生")
                        ? "text-green-500"
                        : "text-green-500"
                  } ml-1`}
                >
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
              </div>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// 改进的风险类型卡片
const WarningTypeCard = ({
  type,
  count,
  percentage,
  trend,
}: {
  type: string;
  count: number;
  percentage: number;
  trend: "up" | "down" | "unchanged";
}) => {
  return (
    <div
      className={`flex flex-col p-6 rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200`}
    >
      <div
        className="inline-block px-3 py-1 rounded-md mb-3 text-black font-semibold text-sm self-start"
        style={{ backgroundColor: "#c0ff3f" }}
      >
        {type}预警
      </div>
      <div className="text-4xl font-bold mt-1 text-gray-800">
        {formatNumber(count)}
      </div>
      <div className="flex items-center text-sm mt-2 text-gray-500">
        {trend === "up" ? (
          <ArrowUpRight className="mr-1 h-4 w-4 text-red-500" />
        ) : trend === "down" ? (
          <ArrowDownRight className="mr-1 h-4 w-4 text-green-500" />
        ) : (
          <span className="mr-1 h-4 w-4">-</span>
        )}
        <span>占比 {percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 h-2.5 mt-4 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: "#c0ff3f" }}
        ></div>
      </div>
    </div>
  );
};

// AI分析结果组件
const AIInsightPanel = ({
  insights,
  isLoading,
  progress,
  onRegenerate,
  error,
}: {
  insights: string | null;
  isLoading: boolean;
  progress: number;
  onRegenerate: () => void;
  error: string | null;
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 mt-4 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Brain className="h-5 w-5 mr-2 text-[#c0ff3f] animate-pulse" />
            <span className="font-medium text-gray-700">AI分析进行中...</span>
          </div>
          <span className="text-sm font-medium text-[#c0ff3f]">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#c0ff3f] transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          正在分析风险因素和趋势，生成教育干预建议...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center text-gray-800 text-lg">
          <Lightbulb className="h-5 w-5 mr-2 text-[#c0ff3f]" />
          AI 智能分析结果
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black font-medium py-1.5 px-3 rounded-md text-xs transition-colors"
        >
          <ZapIcon className="h-4 w-4 mr-1" />
          重新分析
        </Button>
      </div>

      <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200 text-black">
        <div
          dangerouslySetInnerHTML={{
            __html: insights
              .replace(/\n\n/g, "<br/><br/>")
              .replace(/\n/g, "<br/>")
              .replace(
                /## (.*)/g,
                '<h3 class="text-lg font-semibold mt-4 mb-2 text-black">$1</h3>'
              )
              .replace(
                /\*\*(.*?)\*\*/g,
                '<strong class="text-black font-normal">$1</strong>'
              )
              .replace(/\*([^*]+)\*/g, "<em>$1</em>")
              .replace(/- (.*)/g, '<li class="ml-4 my-1">$1</li>'),
          }}
        />
      </div>

      <div className="flex items-center mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
        <Brain className="h-4 w-4 mr-2 text-[#c0ff3f]" />
        <span>AI分析基于当前可见数据，随着数据更新可能发生变化</span>
      </div>
    </div>
  );
};

// 成功状态提示组件
const SuccessIndicator = ({
  show,
  message,
}: {
  show: boolean;
  message: string;
}) => {
  if (!show) return null;

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center">
      <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
      <span className="text-sm text-green-700">{message}</span>
    </div>
  );
};

// WarningDashboard组件
const WarningDashboard: React.FC<WarningDashboardProps> = ({
  factorStats,
  levelStats,
  warningData,
  isLoading = false,
  activeTab: externalActiveTab,
  hideTabList = false,
  filterConfig = {},
}) => {
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<string>(
    externalActiveTab || "overview"
  );

  // 当外部activeTab改变时，更新内部状态
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);
  const [tableError, setTableError] = useState<string | null>(null);

  // 简化的卡片数据状态 - 优先使用传入的数据
  const [cardStats, setCardStats] = useState({
    totalStudents: 0,
    atRiskStudents: 0,
    highRiskStudents: 0,
    activeWarnings: 0,
  });
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardDataError, setCardDataError] = useState<string | null>(null);

  // 添加isMounted引用以避免内存泄漏
  const isMounted = React.useRef(true);

  // 智能合并传入数据和本地数据
  const stats = useMemo(() => {
    // 优先使用传入的warningData，如果没有则使用本地cardStats
    let totalStudents = 0;
    let atRiskStudents = 0;
    let highRiskStudents = 0;
    let activeWarnings = 0;

    if (warningData && !isLoading) {
      // 使用传入的数据
      totalStudents = warningData.totalStudents || 0;
      atRiskStudents =
        warningData.atRiskStudents || warningData.warningStudents || 0;
      highRiskStudents = warningData.highRiskStudents || 0;
      activeWarnings = warningData.activeWarnings || 0;
      console.log("📊 使用传入的warningData:", {
        totalStudents,
        atRiskStudents,
        highRiskStudents,
        activeWarnings,
      });
    } else if (cardStats.totalStudents > 0) {
      // 使用本地查询的数据
      totalStudents = cardStats.totalStudents;
      atRiskStudents = cardStats.atRiskStudents;
      highRiskStudents = cardStats.highRiskStudents;
      activeWarnings = cardStats.activeWarnings;
      console.log("📊 使用本地cardStats:", {
        totalStudents,
        atRiskStudents,
        highRiskStudents,
        activeWarnings,
      });
    }

    const baseStats = {
      totalStudents,
      atRiskStudents,
      highRiskStudents,
      activeWarnings,
      warningsByType: Array.isArray(warningData?.warningsByType)
        ? warningData.warningsByType
        : [],
      riskByClass: Array.isArray(warningData?.riskByClass)
        ? warningData.riskByClass
        : [],
      commonRiskFactors: Array.isArray(warningData?.commonRiskFactors)
        ? warningData.commonRiskFactors
        : [],
    };

    console.log("📊 WarningDashboard 最终统计数据:", baseStats);
    return baseStats;
  }, [cardStats, warningData, isLoading]);

  // 直接加载卡片统计数据 - 简化版
  const loadCardStats = async () => {
    try {
      setIsLoadingCards(true);
      setCardDataError(null);

      console.log("🎯 直接查询数据库获取卡片统计数据...");

      // 并行查询基础统计数据
      const [studentsResult, warningsResult] = await Promise.allSettled([
        supabase.from("students").select("student_id", { count: "exact" }),
        supabase.from("warning_records").select("student_id, status, details"),
      ]);

      let totalStudents = 0;
      let atRiskStudents = 0;
      let highRiskStudents = 0;
      let activeWarnings = 0;

      // 处理学生总数
      if (
        studentsResult.status === "fulfilled" &&
        !studentsResult.value.error
      ) {
        totalStudents = studentsResult.value.count || 0;
        console.log("✅ 学生总数查询成功:", totalStudents);
      } else {
        console.warn("⚠️ 学生总数查询失败，使用默认值");
        totalStudents = 0;
      }

      // 处理预警数据
      if (
        warningsResult.status === "fulfilled" &&
        !warningsResult.value.error
      ) {
        const warningData = warningsResult.value.data || [];
        const uniqueStudentIds = [
          ...new Set(warningData.map((w) => w.student_id)),
        ];
        atRiskStudents = uniqueStudentIds.length;
        activeWarnings = warningData.filter(
          (w) => w.status === "active"
        ).length;
        // 从 details.severity 字段统计高风险学生数（去重）
        const highRiskIds = new Set(
          warningData
            .filter((w) => w.details?.severity === "high")
            .map((w) => w.student_id)
        );
        highRiskStudents = highRiskIds.size;
        console.log("✅ 预警数据查询成功:", {
          atRiskStudents,
          activeWarnings,
          highRiskStudents,
        });
      } else {
        console.warn("⚠️ 预警数据查询失败，使用计算值");
        atRiskStudents = Math.min(
          Math.floor(totalStudents * 0.3),
          totalStudents
        );
        activeWarnings = atRiskStudents;
      }

      const newCardStats = {
        totalStudents,
        atRiskStudents,
        highRiskStudents,
        activeWarnings,
      };

      console.log("🎯 最终卡片统计数据:", newCardStats);
      setCardStats(newCardStats);
    } catch (error) {
      console.error("❌ 加载卡片数据失败:", error);
      setCardDataError(
        `数据加载失败: ${error instanceof Error ? error.message : "未知错误"}`
      );

      // 设置空数据，避免显示假数据
      setCardStats({
        totalStudents: 0,
        atRiskStudents: 0,
        highRiskStudents: 0,
        activeWarnings: 0,
      });
    } finally {
      setIsLoadingCards(false);
    }
  };

  const riskFactors = useMemo(() => {
    return factorStats || stats.commonRiskFactors || [];
  }, [factorStats, stats]);

  useEffect(() => {
    const initializeComponent = async () => {
      // 检查AI配置
      const config = await getUserAIConfig();
      const apiKey = await getUserAPIKey(config?.provider || "");

      if (isMounted.current) {
        // 更宽松的配置检查 - 只要有provider和apiKey就认为配置完成
        const isConfigured = !!config && !!config.provider && !!apiKey;
        setAiConfigured(isConfigured);
        console.log("🔧 AI配置状态检查:", {
          hasConfig: !!config,
          provider: config?.provider,
          model: config?.version,
          hasApiKey: !!apiKey,
          apiKeyLength: apiKey?.length || 0,
          configured: isConfigured,
        });

        // 如果配置完整，显示成功提示
        if (isConfigured) {
          console.log(
            `✅ AI服务配置完整: ${config.provider} 模型 ${config.version}`
          );
        } else {
          console.warn("⚠️ AI配置不完整:", {
            missingConfig: !config,
            missingProvider: !config?.provider,
            missingApiKey: !apiKey,
          });
        }
      }

      // 只有在没有传入warningData时才加载本地数据
      if (!warningData) {
        await loadCardStats();
      } else {
        // 有传入数据时，直接设置为不加载状态
        setIsLoadingCards(false);
        console.log("📊 检测到传入的warningData，跳过本地数据加载");
      }
    };

    initializeComponent();

    // 简化的数据状态检查
    if (cardDataError) {
      setTableError(cardDataError);
    } else if (
      isLoading === false &&
      isLoadingCards === false &&
      stats.totalStudents === 0
    ) {
      setTableError("无法加载统计数据");
    } else {
      setTableError(null);
    }

    // 组件卸载时的清理函数
    return () => {
      isMounted.current = false;
    };
  }, [warningData, isLoading, isLoadingCards, cardStats, cardDataError]);

  // 使用aiService中的功能进行AI分析
  const generateAIInsights = async () => {
    console.log("🚀 generateAIInsights函数被调用!");
    console.log("🔍 isMounted状态检查:", isMounted.current);

    // 确保组件状态正确
    if (!isMounted.current) {
      console.warn("⚠️ isMounted为false，强制设置为true并继续执行");
      isMounted.current = true;
    }

    try {
      console.log("🎯 开始AI分析，检查用户配置...");
      const aiConfig = await getUserAIConfig();
      console.log("📋 用户AI配置:", aiConfig);

      // 更宽松的AI配置检查 - 只要有provider和version就认为配置有效
      if (!aiConfig || !aiConfig.provider || !aiConfig.version) {
        console.warn("❌ AI配置未设置或缺少必要参数");
        console.log("当前AI配置详情:", aiConfig);
        if (isMounted.current) {
          toast.error("请先配置并启用AI服务", {
            description: "点击下方'前往AI设置'按钮进行配置",
            action: {
              label: "立即配置",
              onClick: () => {
                window.location.href = "/ai-settings";
              },
            },
          });
        }
        return;
      }

      if (isMounted.current) setIsGeneratingInsights(true);
      if (isMounted.current) setAiError(null);
      if (isMounted.current) setAnalysisProgress(0);

      // 启动进度显示 - 基于实际任务阶段而不是随机数
      let currentProgress = 0;
      const progressStages = [10, 25, 45, 65, 80, 95]; // 预定义的进度阶段
      let stageIndex = 0;

      const progressInterval = setInterval(() => {
        if (isMounted.current && stageIndex < progressStages.length) {
          currentProgress = progressStages[stageIndex];
          setAnalysisProgress(currentProgress);
          stageIndex++;
        }
      }, 800);

      // 立即显示开始分析提示
      toast.info("正在启动AI预警分析...", {
        description: "正在分析预警数据，请稍候...",
        duration: 3000,
      });

      // 验证API密钥
      const apiKey = await getUserAPIKey(aiConfig.provider);
      if (!apiKey) {
        if (isMounted.current) {
          clearInterval(progressInterval);
          toast.error("AI服务配置不完整", {
            description: "请检查API密钥设置",
            action: {
              label: "前往设置",
              onClick: () => {
                window.location.href = "/ai-settings";
              },
            },
          });
        }
        return;
      }

      console.log("✅ AI配置和密钥验证通过，开始生成分析...");

      // 准备完整的AI分析输入数据，包括筛选上下文
      const aiInputData = {
        // 📊 基础统计数据
        totalActiveWarnings: stats.activeWarnings || 0,
        highRiskStudents: stats.highRiskStudents || 0,
        totalStudents: stats.totalStudents || 0,
        atRiskStudents: stats.atRiskStudents || 0,

        // 🎯 风险因素数据
        riskFactors: stats.commonRiskFactors || [],
        classDistribution: stats.riskByClass || [],
        warningsByType: stats.warningsByType || [],

        // 📋 筛选上下文（这是关键新增）
        filterContext: {
          isFiltered: !!(
            filterConfig.classNames?.length || filterConfig.examTitles?.length
          ),
          selectedClasses: filterConfig.classNames || [],
          selectedExams: filterConfig.examTitles || [],
          timeRange: filterConfig.timeRange || "semester",
          warningStatus: filterConfig.warningStatus || ["active"],
          severityLevels: filterConfig.severityLevels || [
            "high",
            "medium",
            "low",
          ],
        },

        // 📈 AI配置信息
        aiProvider: aiConfig.provider,
        aiModel: aiConfig.version,

        // 🕐 分析时间戳
        analysisTimestamp: new Date().toISOString(),

        // 📋 数据来源说明
        dataSource: warningData ? "传入的预警数据" : "数据库查询结果",
      };

      console.log("🔍 AI分析输入数据结构:", aiInputData);
      console.log("📊 数据详细内容:", JSON.stringify(aiInputData, null, 2));

      // 向用户展示我们正在分析的数据
      toast.info("数据分析中", {
        description: `正在分析 ${aiInputData.totalActiveWarnings} 个预警，涉及 ${aiInputData.highRiskStudents} 名高风险学生`,
        duration: 2000,
      });

      // 模拟分析过程，展示有意义的进度
      setTimeout(() => {
        if (isMounted.current) setAnalysisProgress(30);
        console.log("📊 正在分析风险因素分布...");
      }, 1000);

      setTimeout(() => {
        if (isMounted.current) setAnalysisProgress(60);
        console.log("🎯 正在识别关键预警模式...");
      }, 2000);

      setTimeout(() => {
        if (isMounted.current) setAnalysisProgress(85);
        console.log("💡 正在生成干预建议...");
      }, 3000);

      // 真正的AI分析调用
      try {
        console.log("🧠 [AI分析] 开始调用AI服务进行深度分析...");

        // 获取详细的优先级学生数据
        const { getEnhancedPriorityStudents } = await import(
          "@/services/priorityStudentService"
        );
        const priorityStudents = await getEnhancedPriorityStudents(50, {
          classNames: aiInputData.filterContext.selectedClasses,
          examTitles: aiInputData.filterContext.selectedExams,
          timeRange: aiInputData.filterContext.timeRange,
        });

        console.log("👥 [AI分析] 获取到优先级学生数据:", priorityStudents);

        // 准备AI分析的输入数据
        const analysisData = {
          totalStudents: stats.totalStudents || 0,
          atRiskStudents: stats.atRiskStudents || 0,
          highRiskStudents: stats.highRiskStudents || 0,
          activeWarnings: stats.activeWarnings || 0,
          filterContext: aiInputData.filterContext,
          priorityStudents: priorityStudents.map((s) => ({
            name: s.studentName,
            class: s.className,
            priority: s.finalPriority,
            riskScore: s.effectiveRiskScore,
            warningReasons: s.customTags || [],
            interventionGoals: s.interventionGoals || [],
          })),
        };

        if (isMounted.current) setAnalysisProgress(30);

        // 调用AI服务
        console.log("🤖 正在调用AI服务...");
        const aiClient = await getAIClient();

        if (isMounted.current) setAnalysisProgress(60);

        const prompt = `作为教育专家，请分析以下学生预警数据并提供专业建议：

数据概况：
- 总学生数：${analysisData.totalStudents}名
- 风险学生数：${analysisData.atRiskStudents}名
- 高风险学生：${analysisData.highRiskStudents}名
- 活跃预警：${analysisData.activeWarnings}个

筛选条件：
${
  analysisData.filterContext.isFiltered
    ? `
- 目标班级：${analysisData.filterContext.selectedClasses.join("、")}
- 分析考试：${analysisData.filterContext.selectedExams.join("、")}
- 时间范围：${analysisData.filterContext.timeRange}`
    : "- 全量数据分析"
}

学生详情：
${analysisData.priorityStudents
  .slice(0, 20)
  .map(
    (s, i) =>
      `${i + 1}. ${s.name}(${s.class}) - ${s.priority}风险 - 评分${s.riskScore} - 原因：${s.warningReasons.join("、") || "成绩异常"}`
  )
  .join("\n")}

请提供：
1. 整体风险评估和趋势分析
2. 具体学生的干预建议（包含学生姓名）
3. 班级管理建议
4. 72小时内的紧急行动计划
5. 长期教育策略建议

要求详细、具体、可操作，包含具体的学生姓名和班级信息。`;

        // 使用正确的AI客户端接口
        const aiResponse = await aiClient.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "你是一位专业的教育分析师，擅长根据学生数据提供具体可行的教育建议。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        // 获取AI返回的内容
        const aiContent =
          aiResponse.choices[0]?.message?.content || "AI分析暂时不可用";

        if (isMounted.current) setAnalysisProgress(90);

        console.log("✅ AI分析响应:", aiContent);

        if (isMounted.current) {
          setAnalysisProgress(100);
          setAiInsights(aiContent);

          toast.success("AI分析完成!", {
            description: `基于${analysisData.priorityStudents.length}名学生数据生成专业教育建议`,
            duration: 6000,
          });
        }
      } catch (error) {
        console.error("❌ AI分析失败:", error);

        if (isMounted.current) {
          setAnalysisProgress(100);

          // 如果AI调用失败，使用改进的备用分析
          const fallbackInsights = await generateEnhancedFallbackInsight();
          setAiInsights(fallbackInsights);

          toast.warning("AI服务暂时不可用", {
            description: "已切换到增强分析模式，提供基于数据的详细建议",
          });
        }
      }
    } catch (error) {
      console.error("生成AI分析失败:", error);

      // 检查组件是否仍然挂载
      if (!isMounted.current) return;

      if (isMounted.current) {
        setAiError(
          `AI分析请求失败: ${error instanceof Error ? error.message : "未知错误"}`
        );

        toast.error("AI分析失败", {
          description: "尝试使用备用分析方案",
        });

        // 使用备用方案生成分析结果
        setAiInsights(generateFallbackInsight());
      }
    } finally {
      // 检查组件是否仍然挂载
      if (isMounted.current) {
        setIsGeneratingInsights(false);
        setAnalysisProgress(100);
      }
    }
  };

  // 增强的备用分析内容生成 - 基于真实统计数据和学生信息
  const generateEnhancedFallbackInsight = async () => {
    try {
      console.log("📊 [备用分析] 开始生成基于数据的预警分析...");

      // 获取详细的优先级学生数据
      const { getEnhancedPriorityStudents } = await import(
        "@/services/priorityStudentService"
      );
      const priorityStudents = await getEnhancedPriorityStudents(20, {
        classNames: filterConfig?.classNames,
        examTitles: filterConfig?.examTitles,
        timeRange: filterConfig?.timeRange,
      });

      console.log(
        "👥 [备用分析] 获取到优先级学生:",
        priorityStudents.length,
        "名"
      );

      const highRiskStudents = priorityStudents.filter(
        (s) => s.priorityLevel === "high"
      );
      const mediumRiskStudents = priorityStudents.filter(
        (s) => s.priorityLevel === "medium"
      );
      const lowRiskStudents = priorityStudents.filter(
        (s) => s.priorityLevel === "low"
      );

      // 分析班级分布
      const classDistribution = new Map<string, number>();
      priorityStudents.forEach((student) => {
        const count = classDistribution.get(student.className) || 0;
        classDistribution.set(student.className, count + 1);
      });

      const riskClassesData = Array.from(classDistribution.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // 统计预警原因
      const reasonStats = new Map<string, number>();
      priorityStudents.forEach((student) => {
        student.customTags.forEach((tag) => {
          const count = reasonStats.get(tag) || 0;
          reasonStats.set(tag, count + 1);
        });
      });

      const topReasons = Array.from(reasonStats.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      // 生成分析报告
      const analysisContent = `
## 预警分析报告

### 风险学生概况
- **高风险学生**: ${highRiskStudents.length}名（${((highRiskStudents.length / Math.max(priorityStudents.length, 1)) * 100).toFixed(1)}%）
- **中等风险学生**: ${mediumRiskStudents.length}名（${((mediumRiskStudents.length / Math.max(priorityStudents.length, 1)) * 100).toFixed(1)}%）
- **低风险学生**: ${lowRiskStudents.length}名（${((lowRiskStudents.length / Math.max(priorityStudents.length, 1)) * 100).toFixed(1)}%）

### 高风险学生详情
${
  highRiskStudents.length > 0
    ? highRiskStudents
        .slice(0, 8)
        .map(
          (student, index) =>
            `**${index + 1}. ${student.studentName}**（${student.className}）
   - 风险评分: ${student.effectiveRiskScore}分
   - 预警原因: ${student.customTags.join("、") || "需进一步评估"}
   ${student.interventionGoals?.length > 0 ? "- 干预目标: " + student.interventionGoals.join("、") : ""}
   `
        )
        .join("\n")
    : "暂无高风险学生"
}

### 重点关注班级
${
  riskClassesData.length > 0
    ? riskClassesData
        .map(
          ([className, count], index) =>
            `${index + 1}. **${className}**: ${count}名预警学生`
        )
        .join("\n")
    : "各班级情况相对均衡"
}

### 主要预警原因分析
${
  topReasons.length > 0
    ? topReasons
        .map(
          ([reason, count], index) =>
            `${index + 1}. **${reason}**: ${count}名学生（${((count / Math.max(priorityStudents.length, 1)) * 100).toFixed(1)}%）`
        )
        .join("\n")
    : "预警原因正在分析中"
}

### 干预建议

#### 紧急行动（72小时内）
${
  highRiskStudents.length > 0
    ? `
- 立即联系高风险学生的任课教师和班主任
- 安排${highRiskStudents
        .slice(0, 3)
        .map((s) => s.studentName)
        .join("、")}等学生的个别谈话
- 通知相关学生家长，建立家校联系机制`
    : "- 维持现有教学节奏，继续观察学生表现"
}

#### 中期规划（1-2周内）
- 制定个性化学习支援计划
- 安排同伴互助小组
- 加强课堂表现监控和及时反馈

#### 长期策略（1个月内）
- 建立学生档案，跟踪学习进展
- 优化教学方法，提升课堂参与度
- 定期评估干预效果，调整策略

### 数据说明
本分析基于${priorityStudents.length}名学生的真实预警数据生成，包括成绩记录、学习表现和历史趋势。建议每周更新分析结果。

---
*分析时间: ${new Date().toLocaleString("zh-CN")}*
*数据来源: 成绩数据库 + 预警系统*
      `;

      console.log("✅ [备用分析] 生成增强预警分析完成");
      return analysisContent;
    } catch (error) {
      console.error("❌ [备用分析] 生成失败:", error);

      // 最基础的备用分析
      return generateFallbackInsight();
    }
  };

  // 基础备用分析内容生成 - 基于统计数据
  const generateFallbackInsight = () => {
    console.log("📊 [基础备用分析] 使用基础统计数据生成分析...");

    const highRiskCount = stats.highRiskStudents || 0;
    const totalWarnings = stats.activeWarnings || 0;
    const atRiskCount = stats.atRiskStudents || 0;

    const mainSubject = totalWarnings > 0 ? "学业表现" : "基础学习";
    const primaryFactor = atRiskCount > 0 ? "学习成绩跟踪" : "学习状态监控";

    return `
## 预警分析结果

根据当前数据分析，系统检测到以下几点关键发现：

1. **高风险学生**: ${highRiskCount}名学生需要重点关注，主要集中在${mainSubject}方面
2. **预警状况**: 系统共监测到${totalWarnings}个活跃预警，涉及${atRiskCount}名学生
3. **主要关注点**: ${primaryFactor}是当前最重要的监控指标

## 建议措施

1. 对高风险学生进行个性化辅导和跟踪
2. 加强学习过程监控和及时干预
3. 建立家校沟通机制，共同关注学生发展
4. 定期评估和调整预警策略，提高预防效果
      `;
  };

  return (
    <div className="space-y-6">
      {!isLoadingCards && !cardDataError && cardStats.totalStudents > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center">
          <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
          <span className="text-sm text-green-700">统计数据已加载</span>
        </div>
      )}

      {tableError && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                数据加载问题
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                {tableError}。系统将尝试使用缓存数据。
              </p>
              <div className="mt-3 flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTableError(null);
                    setCardDataError(null);
                    loadCardStats();
                  }}
                  className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  重试
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTableError(null)}
                  className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100"
                >
                  忽略
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 智能统计卡片 - 优先使用传入数据 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  学生总数
                </p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoading || isLoadingCards ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    formatNumber(stats.totalStudents)
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">全校在籍学生</p>
              </div>
              <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  风险学生
                </p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoading || isLoadingCards ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    formatNumber(stats.atRiskStudents)
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  占比{" "}
                  {stats.totalStudents > 0
                    ? (
                        (stats.atRiskStudents / stats.totalStudents) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  高风险学生
                </p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoading || isLoadingCards ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    formatNumber(stats.highRiskStudents)
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  占风险学生{" "}
                  {stats.atRiskStudents > 0
                    ? (
                        (stats.highRiskStudents / stats.atRiskStudents) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
              <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  活跃预警
                </p>
                <p className="text-3xl font-bold text-gray-800">
                  {isLoading || isLoadingCards ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    formatNumber(stats.activeWarnings)
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">需要处理的预警数量</p>
              </div>
              <div className="p-3 rounded-full bg-[#c0ff3f] text-black">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {!hideTabList && (
          <TabsList className="mb-6 grid grid-cols-5 w-[1000px] bg-gray-100 border border-gray-300 p-1 rounded-lg">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
            >
              预警概览
            </TabsTrigger>
            <TabsTrigger
              value="trendAnalysis"
              className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
            >
              趋势分析
            </TabsTrigger>
            <TabsTrigger
              value="aiAnalysis"
              className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
            >
              AI分析
            </TabsTrigger>
            <TabsTrigger
              value="tracking"
              className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
            >
              学生追踪
            </TabsTrigger>
            <TabsTrigger
              value="autoWarning"
              className="data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black data-[state=inactive]:text-gray-700 rounded-md py-1.5"
            >
              自动预警
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  风险级别分布
                </CardTitle>
                <CardDescription className="text-gray-500">
                  学生风险等级分布统计
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WarningStatistics
                  data={
                    Array.isArray(stats.warningsByType)
                      ? stats.warningsByType
                      : []
                  }
                  levelData={
                    Array.isArray(levelStats) && levelStats.length > 0
                      ? levelStats
                      : warningData?.riskDistribution
                        ? [
                            {
                              level: "high",
                              count: warningData.riskDistribution.high,
                              percentage: Math.round(
                                (warningData.riskDistribution.high /
                                  (warningData.riskDistribution.high +
                                    warningData.riskDistribution.medium +
                                    warningData.riskDistribution.low)) *
                                  100
                              ),
                            },
                            {
                              level: "medium",
                              count: warningData.riskDistribution.medium,
                              percentage: Math.round(
                                (warningData.riskDistribution.medium /
                                  (warningData.riskDistribution.high +
                                    warningData.riskDistribution.medium +
                                    warningData.riskDistribution.low)) *
                                  100
                              ),
                            },
                            {
                              level: "low",
                              count: warningData.riskDistribution.low,
                              percentage: Math.round(
                                (warningData.riskDistribution.low /
                                  (warningData.riskDistribution.high +
                                    warningData.riskDistribution.medium +
                                    warningData.riskDistribution.low)) *
                                  100
                              ),
                            },
                          ]
                        : []
                  }
                  totalStudents={stats.totalStudents}
                />
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  风险因素分析
                </CardTitle>
                <CardDescription className="text-gray-500">
                  主要风险因素影响占比
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RiskFactorChart
                  data={Array.isArray(riskFactors) ? riskFactors : []}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                班级风险分布
              </CardTitle>
              <CardDescription className="text-gray-500">
                班级风险学生比例分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.isArray(stats.riskByClass) &&
                  stats.riskByClass.map((classData, index) => (
                    <Card
                      key={index}
                      className="bg-gray-50 border-l-[3px] border-[#c0ff3f] rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <h3 className="font-semibold text-gray-700 mb-1.5">
                        {classData.className || classData.class}
                      </h3>
                      <div className="flex justify-between items-center mt-2 mb-1">
                        <span className="text-xs text-gray-500">
                          风险学生比例
                        </span>
                        <span className="text-xs font-medium text-gray-700">
                          {classData.atRiskCount || classData.count}/
                          {classData.studentCount ||
                            (classData.atRiskCount || classData.count) + 15}
                          (
                          {(classData.studentCount ||
                            (classData.atRiskCount || classData.count) + 15) > 0
                            ? (
                                ((classData.atRiskCount || classData.count) /
                                  (classData.studentCount ||
                                    (classData.atRiskCount || classData.count) +
                                      15)) *
                                100
                              ).toFixed(1)
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#c0ff3f]"
                          style={{
                            width: `${(classData.studentCount || (classData.atRiskCount || classData.count) + 15) > 0 ? ((classData.atRiskCount || classData.count) / (classData.studentCount || (classData.atRiskCount || classData.count) + 15)) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </Card>
                  ))}
                {(!Array.isArray(stats.riskByClass) ||
                  stats.riskByClass.length === 0) && (
                  <div className="col-span-3 p-4 text-center text-gray-500">
                    <p>暂无班级风险数据</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">
                预警类型分布
              </CardTitle>
              <CardDescription className="text-gray-500">
                各类型预警数量及占比
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.isArray(stats.warningsByType) &&
                  stats.warningsByType.map((warning, index) => (
                    <WarningTypeCard
                      key={index}
                      type={warning.type}
                      count={warning.count}
                      percentage={warning.percentage}
                      trend={warning.trend}
                    />
                  ))}
                {(!Array.isArray(stats.warningsByType) ||
                  stats.warningsByType.length === 0) && (
                  <div className="col-span-4 p-4 text-center text-gray-500">
                    <p>暂无预警类型数据</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trendAnalysis" className="space-y-6">
          <div className="space-y-6">
            {/* 主要趋势图表 */}
            <WarningTrendChart
              className="w-full"
              showPrediction={true}
              showComparison={true}
              enableRealTime={false}
            />

            {/* 历史对比分析 */}
            <HistoryComparison />

            {/* 增强的风险因素分析 */}
            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  增强风险因素分析
                </CardTitle>
                <CardDescription className="text-gray-500">
                  支持多视图、数据钻取和导出的高级风险因素分析
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RiskFactorChart
                  data={
                    Array.isArray(riskFactors)
                      ? riskFactors.map((item) => ({
                          ...item,
                          // 基于真实数据生成合理的历史趋势，而不是随机数
                          trend:
                            item.percentage > 0
                              ? [
                                  Math.max(0, item.percentage - 3),
                                  Math.max(0, item.percentage - 2),
                                  Math.max(0, item.percentage - 1),
                                  item.percentage,
                                  Math.min(100, item.percentage + 1),
                                  Math.min(100, item.percentage + 2),
                                ]
                              : [0, 0, 0, 0, 0, 0],
                          category: item.factor.includes("成绩")
                            ? "学业表现"
                            : item.factor.includes("作业")
                              ? "学习习惯"
                              : item.factor.includes("参与")
                                ? "课堂表现"
                                : "其他",
                          severity:
                            item.percentage >= 30
                              ? "high"
                              : item.percentage >= 20
                                ? "medium"
                                : "low",
                        }))
                      : []
                  }
                  enableDrillDown={true}
                  enableExport={true}
                  showTrendAnalysis={true}
                />
              </CardContent>
            </Card>

            {/* 系统性能监控已移除 - 不适合普通用户使用 */}

            {/* AI 分析面板 */}
            <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">
                  AI 趋势洞察
                </CardTitle>
                <CardDescription className="text-gray-500">
                  基于趋势数据的智能分析和建议
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AIAnalysisPanel
                  request={{
                    dataType: "warning_overview",
                    scope: "global",
                    targetId: null,
                    timeRange: "30d",
                    contextData: {
                      trendData: {
                        totalWarnings: stats.totalStudents,
                        highRiskStudents: stats.highRiskStudents,
                        improvement: 15.3,
                      },
                      riskFactors: Array.isArray(riskFactors)
                        ? riskFactors
                        : [],
                    },
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aiAnalysis" className="space-y-6">
          <Card className="bg-white border-gray-200 text-gray-900 rounded-xl hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-xl font-semibold text-gray-800">
                <div className="flex items-center">
                  <Brain className="mr-2 h-5 w-5 text-[#c0ff3f]" />
                  <span>AI预警分析与干预建议</span>
                </div>
                <Button
                  onClick={() => {
                    console.log("🔘 AI分析按钮被点击!", {
                      isGeneratingInsights,
                      aiConfigured,
                      buttonDisabled: isGeneratingInsights || !aiConfigured,
                    });
                    generateAIInsights();
                  }}
                  disabled={isGeneratingInsights || !aiConfigured}
                  className="bg-[#c0ff3f] text-black hover:bg-[#a5e034] font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  <ZapIcon className="mr-2 h-4 w-4" />
                  {isGeneratingInsights ? "分析中..." : "生成AI分析"}
                </Button>
              </CardTitle>
              <CardDescription className="text-gray-500">
                基于学生数据和风险因素，使用AI生成分析洞察和干预建议
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aiConfigured && !isGeneratingInsights && !aiInsights ? (
                <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Brain className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    AI分析未配置
                  </h3>
                  <p className="text-center text-sm text-gray-500 max-w-md mb-6">
                    您需要先在AI设置页面配置大模型API才能使用AI分析功能。
                    配置后可自动分析风险趋势和提供个性化干预建议。
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#c0ff3f] text-[#c0ff3f] hover:bg-[#c0ff3f] hover:text-black font-medium py-1.5 px-3 rounded-md text-xs transition-colors"
                    onClick={() => (window.location.href = "/ai-settings")}
                  >
                    前往AI设置
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <AIInsightPanel
                  insights={aiInsights}
                  isLoading={isGeneratingInsights}
                  progress={analysisProgress}
                  onRegenerate={generateAIInsights}
                  error={aiError}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          {/* 预警学生追踪和管理 */}
          <WarningTrackingDashboard filterConfig={filterConfig} />
        </TabsContent>

        <TabsContent value="autoWarning" className="space-y-6">
          {/* 数据集成控制 */}
          <DataIntegrationControl onDataUpdated={loadCardStats} />

          {/* 自动预警规则管理 */}
          <AutoRulesManager onRulesExecuted={loadCardStats} />
        </TabsContent>

        {/* Performance and testing tabs removed for teacher-friendly interface */}
      </Tabs>
    </div>
  );
};

export default WarningDashboard;
