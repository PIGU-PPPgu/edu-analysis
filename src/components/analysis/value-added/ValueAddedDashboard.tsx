/**
 * 增值评价主仪表板
 * 整合考试选择、数据计算、统计展示和榜单展示
 */

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, Users, Award, Activity } from "lucide-react";
import { toast } from "sonner";
import { useModernGradeAnalysis } from "@/contexts/ModernGradeAnalysisContext";
import ExamSelector from "./ExamSelector";
import ProgressLeaderboard from "./ProgressLeaderboard";
import NineLevelMatrix from "./NineLevelMatrix";
import LearningDiagnosisPanel from "./LearningDiagnosisPanel";
import LevelDistributionChart from "./LevelDistributionChart";
import SubjectValueAddedTable from "./SubjectValueAddedTable";
import SubjectGroupAnalysis from "./SubjectGroupAnalysis";
import TrendForecast from "./TrendForecast";
import type {
  ExamSelectionState,
  ValueAddedMetrics,
  ValueAddedSummary,
  ExamInfo,
} from "@/types/valueAddedTypes";
import {
  calculateValueAddedMetrics,
  calculateLevelEvaluation,
  calculateValueAddedSummary,
  getDefaultLevelConfig,
} from "../services/valueAddedUtils";

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  description,
}) => {
  const trendColors = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600",
  };

  const trendColor = trend ? trendColors[trend] : "text-black";

  return (
    <Card className="border-2 border-black shadow-[3px_3px_0px_0px_#000]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className={`text-3xl font-black ${trendColor}`}>{value}</p>
            {description && (
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className="bg-[#B9FF66] p-3 rounded-lg border-2 border-black">
            <Icon className="w-6 h-6 text-black" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ValueAddedDashboard: React.FC = () => {
  const {
    wideGradeData,
    examList,
    filter,
    loading: contextLoading,
  } = useModernGradeAnalysis();

  // 考试选择状态
  const [selection, setSelection] = useState<ExamSelectionState>({
    baselineExamId: null,
    targetExamId: null,
    comparisonScope: "class",
    className: filter?.classNames?.[0],
  });

  // 计算结果
  const [metrics, setMetrics] = useState<ValueAddedMetrics[]>([]);
  const [calculating, setCalculating] = useState(false);

  // 保存原始数据供科目分析使用
  const [baselineData, setBaselineData] = useState<any[]>([]);
  const [targetData, setTargetData] = useState<any[]>([]);

  // 将examList转换为ExamInfo格式
  const examInfoList: ExamInfo[] = useMemo(() => {
    return examList.map((exam) => ({
      id: exam.id || "",
      title: exam.title || "",
      date: exam.date || "",
      type: exam.type || "",
    }));
  }, [examList]);

  // 计算统计摘要
  const summary: ValueAddedSummary | null = useMemo(() => {
    if (metrics.length === 0) return null;
    return calculateValueAddedSummary(metrics);
  }, [metrics]);

  // 处理计算
  const handleCalculate = () => {
    if (!selection.baselineExamId || !selection.targetExamId) {
      toast.error("请选择基准考试和目标考试");
      return;
    }

    if (selection.baselineExamId === selection.targetExamId) {
      toast.error("请选择两次不同的考试");
      return;
    }

    if (selection.comparisonScope === "class" && !filter?.classNames?.[0]) {
      toast.error("请先在页面顶部筛选器中选择班级", {
        description: "班级范围对比需要先选定班级",
      });
      return;
    }

    setCalculating(true);

    try {
      // 筛选基准考试和目标考试的数据
      const baselineDataFiltered = wideGradeData.filter(
        (r: any) => r.exam_id === selection.baselineExamId
      );
      const targetDataFiltered = wideGradeData.filter(
        (r: any) => r.exam_id === selection.targetExamId
      );

      if (
        baselineDataFiltered.length === 0 ||
        targetDataFiltered.length === 0
      ) {
        toast.error("选中的考试没有成绩数据");
        setCalculating(false);
        return;
      }

      // 保存原始数据供科目分析使用
      setBaselineData(baselineDataFiltered);
      setTargetData(targetDataFiltered);

      // 计算增值指标
      const result = calculateValueAddedMetrics(
        baselineDataFiltered,
        targetDataFiltered,
        selection.comparisonScope,
        filter?.classNames?.[0]
      );

      if (!result.success) {
        toast.error(result.error || "计算失败");
        setCalculating(false);
        return;
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach((warning) => {
          toast.warning(warning);
        });
      }

      // 分配段位
      const config = getDefaultLevelConfig();
      const metricsWithLevel = calculateLevelEvaluation(
        result.data || [],
        config
      );

      setMetrics(metricsWithLevel);

      toast.success("增值分析计算完成", {
        description: `共分析 ${metricsWithLevel.length} 名学生`,
      });
    } catch (error) {
      console.error("增值分析计算错误:", error);
      toast.error("计算过程中发生错误，请重试");
    } finally {
      setCalculating(false);
    }
  };

  // 同步班级信息
  React.useEffect(() => {
    if (filter?.classNames?.[0]) {
      setSelection((prev) => ({
        ...prev,
        className: filter.classNames[0],
      }));
    }
  }, [filter?.classNames]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="bg-[#B9FF66] p-3 rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_#000]">
          <TrendingUp className="w-8 h-8 text-black" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-black">增值评价分析</h1>
          <p className="text-gray-600 mt-1">
            对比两次考试，评估学生进步幅度和学习成效
          </p>
        </div>
      </div>

      {/* 考试选择器 */}
      <ExamSelector
        examList={examInfoList}
        selection={selection}
        onSelectionChange={setSelection}
        onCalculate={handleCalculate}
        loading={calculating}
        disabled={contextLoading}
      />

      {/* 统计卡片 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="平均进步分"
            value={
              summary.avgImprovement > 0
                ? `+${summary.avgImprovement.toFixed(1)}`
                : summary.avgImprovement.toFixed(1)
            }
            icon={Activity}
            trend={
              summary.avgImprovement > 0
                ? "up"
                : summary.avgImprovement < 0
                  ? "down"
                  : "neutral"
            }
            description={`进步率: ${summary.avgImprovementRate > 0 ? "+" : ""}${summary.avgImprovementRate.toFixed(1)}%`}
          />
          <StatCard
            title="进步人数"
            value={summary.improvedCount}
            icon={Users}
            trend="up"
            description={`占比: ${summary.improvedRate.toFixed(1)}%`}
          />
          <StatCard
            title="需要关注"
            value={summary.regressionCount}
            icon={Users}
            trend="down"
            description={`退步人数: ${summary.regressionCount}人`}
          />
          <StatCard
            title="最大进步"
            value={
              summary.topImprover
                ? `+${summary.topImprover.improvementScore.toFixed(1)}`
                : "-"
            }
            icon={Award}
            trend="up"
            description={summary.topImprover?.studentName || "暂无数据"}
          />
        </div>
      )}

      {/* 进步榜单 */}
      {metrics.length > 0 && (
        <ProgressLeaderboard metrics={metrics} loading={calculating} />
      )}

      {/* 九段矩阵 */}
      {metrics.length > 0 && <NineLevelMatrix metrics={metrics} />}

      {/* 学情诊断 */}
      {metrics.length > 0 && <LearningDiagnosisPanel metrics={metrics} />}

      {/* 段位分布图表 */}
      {metrics.length > 0 && <LevelDistributionChart metrics={metrics} />}

      {/* 科目维度分析 */}
      {metrics.length > 0 &&
        baselineData.length > 0 &&
        targetData.length > 0 && (
          <>
            <SubjectValueAddedTable
              baselineData={baselineData}
              targetData={targetData}
              scope={selection.comparisonScope}
              className={filter?.classNames?.[0]}
            />
            <SubjectGroupAnalysis
              baselineData={baselineData}
              targetData={targetData}
              scope={selection.comparisonScope}
              className={filter?.classNames?.[0]}
            />
          </>
        )}

      {/* 趋势预测 */}
      {metrics.length > 0 && <TrendForecast metrics={metrics} topN={5} />}

      {/* 空态提示 */}
      {metrics.length === 0 && !calculating && (
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
          <CardContent className="p-12">
            <div className="text-center text-gray-500 space-y-4">
              <div className="flex justify-center">
                <div className="bg-[#B9FF66] p-8 rounded-lg border-2 border-black">
                  <Activity className="w-16 h-16 text-black" />
                </div>
              </div>
              <div>
                <p className="text-xl font-bold mb-2">开始增值评价分析</p>
                <p className="text-sm">
                  请在上方选择两次考试，系统将自动计算学生的进步幅度和段位评价
                </p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-left text-sm max-w-md mx-auto">
                <p className="font-bold text-blue-900 mb-2">使用提示：</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• 选择基准考试（起点）和目标考试（终点）</li>
                  <li>• 选择对比范围（本班级/同年级/全校）</li>
                  <li>• 系统会自动计算进步分、进步率和九段评价</li>
                  <li>• 查看进步榜单，识别进步之星和需要关注的学生</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据不足提示 */}
      {examInfoList.length < 2 && (
        <Alert className="border-2 border-yellow-400 bg-yellow-50">
          <AlertDescription className="text-yellow-800">
            至少需要2次考试数据才能进行增值分析。请先导入更多考试成绩。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ValueAddedDashboard;
