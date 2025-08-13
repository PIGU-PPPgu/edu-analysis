import React, { useEffect, useRef, useState } from "react";
import Navbar from "@/components/shared/Navbar";
import WarningDashboard from "@/components/warning/WarningDashboard";
import WarningRules from "@/components/warning/WarningRules";
import WarningList from "@/components/warning/WarningList";
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
  WarningStatistics,
} from "@/services/warningService";
import { useUrlParams } from "@/hooks/useUrlParams";
import { requestCache } from "@/utils/cacheUtils";
import WarningFilters, {
  WarningFilterConfig,
} from "@/components/warning/WarningFilters";

// 使用新的筛选配置接口

const WarningAnalysis = () => {
  // 添加组件挂载状态ref以防止任何潜在的问题
  const isMountedRef = useRef(true);
  const { params, isFromAnomalyDetection, hasExamFilter } = useUrlParams();

  // 移除分析模式状态 统一使用筛选器驱动

  const [isLoading, setIsLoading] = useState(false);
  const [warningStats, setWarningStats] = useState<WarningStatistics | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("overview");

  // 筛选配置状态 - 支持URL参数初始化
  const [filterConfig, setFilterConfig] = useState<WarningFilterConfig>(() => {
    const config: WarningFilterConfig = {
      timeRange: "semester",
      examTypes: ["月考", "期中考试", "期末考试", "模拟考试"],
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

  // 清理任何潜在的副作用
  useEffect(() => {
    fetchWarningData();

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
          console.log("获取预警数据...");

          // 根据筛选配置调用API
          const rawStats = await getWarningStatistics({
            timeRange: filterConfig.timeRange,
            examTypes: filterConfig.examTypes,
            mixedAnalysis: filterConfig.mixedAnalysis,
            analysisMode: filterConfig.analysisMode,
            startDate: filterConfig.startDate,
            endDate: filterConfig.endDate,
            severityLevels: filterConfig.severityLevels,
            warningStatus: filterConfig.warningStatus,
          });

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
        setWarningStats(stats);

        // 显示适当的提示信息
        const dataSource = isFromAnomalyDetection ? "异常检测系统" : "预警系统";
        console.log(`预警数据加载完成 [来源: ${dataSource}]`);
      }
    } catch (error) {
      console.error("获取预警数据失败:", error);
      if (isMountedRef.current) {
        toast.error("获取预警数据失败", {
          description:
            "预警数据格式错误或未找到 这可能是因为预警统计表尚未创建 ",
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

  // 筛选配置更新处理
  const handleFilterChange = (newFilter: WarningFilterConfig) => {
    setFilterConfig(newFilter);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

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
                    使用筛选器可以针对特定时间范围 考试类型或风险等级进行精准分析 
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
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger
                  value="overview"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
                >
                  <BarChart3 className="h-4 w-4" />
                  概览分析
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
                >
                  <AlertTriangle className="h-4 w-4" />
                  预警列表
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="flex items-center gap-2 data-[state=active]:bg-[#c0ff3f] data-[state=active]:text-black"
                >
                  <Settings className="h-4 w-4" />
                  预警规则
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <WarningDashboard
                  warningData={warningStats}
                  factorStats={warningStats?.commonRiskFactors}
                />
              </TabsContent>

              <TabsContent value="list" className="space-y-6">
                <WarningList />
              </TabsContent>

              <TabsContent value="rules" className="space-y-6">
                <WarningRules />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarningAnalysis;
