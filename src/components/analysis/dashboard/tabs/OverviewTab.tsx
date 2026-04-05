import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Target,
  Award,
  ArrowUpRight,
  Brain,
} from "lucide-react";
import GradeLevelDistribution from "@/components/analysis/charts/GradeLevelDistribution";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "green" | "black" | "white" | "gray";
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "green",
  className,
}) => {
  const colorClasses = {
    green: "bg-white border border-black shadow-[4px_4px_0px_0px_#B9FF66]",
    black: "bg-white border border-black shadow-[4px_4px_0px_0px_#191A23]",
    gray: "bg-white border border-black shadow-[4px_4px_0px_0px_#6B7280]",
    white: "bg-white border border-black shadow-[4px_4px_0px_0px_#6B7280]",
  };
  const iconBgClasses = {
    green: "bg-[#B9FF66]",
    black: "bg-[#191A23]",
    gray: "bg-[#6B7280]",
    white: "bg-white",
  };
  const iconColorClasses = {
    green: "text-black",
    black: "text-white",
    gray: "text-white",
    white: "text-black",
  };

  return (
    <Card
      className={cn(
        "transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_currentColor]",
        colorClasses[color],
        className
      )}
    >
      <CardContent className="p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "p-2 rounded-full border-2 border-black",
                  iconBgClasses[color]
                )}
              >
                <Icon className={cn("w-5 h-5", iconColorClasses[color])} />
              </div>
              <p className="text-base font-bold text-black uppercase tracking-wide">
                {title}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-black leading-none">
                {value}
              </h3>
              {trend && trendValue && (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-black text-sm font-bold",
                    trend === "up" && "bg-[#B9FF66] text-black",
                    trend === "down" && "bg-[#6B7280] text-white",
                    trend === "neutral" && "bg-white text-black"
                  )}
                >
                  {trend === "up" && <ArrowUpRight className="w-4 h-4" />}
                  {trend === "down" && (
                    <ArrowUpRight className="w-4 h-4 rotate-180" />
                  )}
                  <span className="uppercase tracking-wide">{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-[#6B7280] font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface OverviewTabProps {
  statistics: any;
  filteredGradeData: any[];
}

// 计算各科目平均分，返回最弱科目名
function getWeakestSubject(data: any[]): { name: string; avg: number } | null {
  const subjectScores: Record<string, number[]> = {};
  data.forEach((r) => {
    const subj = r.subject;
    const score = r.score ?? r.total_score;
    if (subj && subj !== "总分" && score != null) {
      if (!subjectScores[subj]) subjectScores[subj] = [];
      subjectScores[subj].push(Number(score));
    }
  });
  const entries = Object.entries(subjectScores).filter(
    ([, scores]) => scores.length >= 3
  );
  if (entries.length === 0) return null;
  const avgs = entries.map(([name, scores]) => ({
    name,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
  return avgs.sort((a, b) => a.avg - b.avg)[0];
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  statistics,
  filteredGradeData,
}) => {
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [showAllAtRisk, setShowAllAtRisk] = useState(false);

  // 动态计算：最弱科目 + 学困生（总分60%以下）
  const weakestSubject = getWeakestSubject(filteredGradeData);
  const atRiskList = filteredGradeData.filter((r) => {
    const score = r.score ?? r.total_score;
    const maxScore = r.total_max_score ?? 100;
    return score != null && score / maxScore < 0.6;
  });
  const atRiskCount = atRiskList.length;
  const displayedAtRisk = showAllAtRisk ? atRiskList : atRiskList.slice(0, 5);

  return (
    <div className="space-y-8">
      {statistics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <StatCard
              title="平均分"
              value={
                statistics.comparisonAvailable
                  ? `${Math.round(statistics.totalScoreStats?.avgScore || 0)}分`
                  : "—"
              }
              subtitle={
                statistics.comparisonAvailable
                  ? `比上次${statistics.scoreComparison > 0 ? "提高" : statistics.scoreComparison < 0 ? "下降" : "持平"} ${Math.abs(statistics.scoreComparison || 0).toFixed(1)}分`
                  : "暂无历史考试用于对比"
              }
              icon={BarChart3}
              trend={
                !statistics.comparisonAvailable
                  ? "neutral"
                  : statistics.scoreComparison > 0
                    ? "up"
                    : statistics.scoreComparison < 0
                      ? "down"
                      : "neutral"
              }
              trendValue={
                statistics.comparisonAvailable
                  ? `${statistics.scoreComparison > 0 ? "+" : ""}${(statistics.scoreComparison || 0).toFixed(1)}`
                  : ""
              }
              color="green"
            />
            <StatCard
              title="及格率"
              value={
                statistics.comparisonAvailable
                  ? `${Math.round(statistics.totalScoreStats?.passRate || 0)}%`
                  : "—"
              }
              subtitle={
                statistics.comparisonAvailable
                  ? `优秀率 ${Math.round(statistics.totalScoreStats?.excellentRate || 0)}%`
                  : "暂无历史考试用于对比"
              }
              icon={CheckCircle}
              trend={
                !statistics.comparisonAvailable
                  ? "neutral"
                  : statistics.passRateComparison > 0
                    ? "up"
                    : statistics.passRateComparison < 0
                      ? "down"
                      : "neutral"
              }
              trendValue={
                statistics.comparisonAvailable
                  ? `${statistics.passRateComparison > 0 ? "+" : ""}${(statistics.passRateComparison || 0).toFixed(1)}%`
                  : ""
              }
              color="black"
            />
          </div>

          {showAllMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <StatCard
                title="学困生预警"
                value={statistics.atRiskStudents || 0}
                subtitle={`共 ${statistics.totalStudents} 名学生`}
                icon={AlertTriangle}
                color="gray"
              />
              <StatCard
                title="最佳科目"
                value={statistics.topSubject || "暂无"}
                subtitle={`平均分 ${Math.round(statistics.topSubjectScore || 0)} 分`}
                icon={Award}
                color="white"
              />
            </div>
          )}

          <div className="flex justify-center">
            <Button
              onClick={() => setShowAllMetrics(!showAllMetrics)}
              variant="outline"
              className="border border-black bg-white hover:bg-gray-50 text-black font-bold shadow-[2px_2px_0px_0px_#191A23] hover:shadow-[3px_3px_0px_0px_#191A23] transition-all"
            >
              {showAllMetrics ? "收起指标" : "展开更多指标"}
              <ArrowUpRight
                className={cn(
                  "ml-2 w-4 h-4 transition-transform",
                  showAllMetrics && "rotate-180"
                )}
              />
            </Button>
          </div>
        </div>
      )}

      <GradeLevelDistribution gradeData={filteredGradeData} className="" />

      {statistics && filteredGradeData.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem
            value="insights"
            className="border border-black bg-white shadow-[4px_4px_0px_0px_#B9FF66]"
          >
            <AccordionTrigger className="px-8 py-6 bg-[#B9FF66] hover:bg-[#B9FF66] border-b border-black data-[state=open]:border-b-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#191A23]" />
                <span className="text-[#191A23] font-black uppercase tracking-wide">
                  智能教学洞察与建议
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-8 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="p-6 bg-[#B9FF66]/20 border border-[#B9FF66] rounded-lg">
                  <h4 className="font-black text-[#191A23] mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    教学亮点
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {statistics.topSubject && (
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#B9FF66] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          {statistics.topSubject} 科目表现优异，平均分达{" "}
                          {statistics.topSubjectScore?.toFixed(1)} 分
                        </span>
                      </li>
                    )}
                    {statistics.totalScoreStats?.passRate != null && (
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#B9FF66] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          整体及格率{" "}
                          {statistics.totalScoreStats.passRate.toFixed(1)}
                          %，表现良好
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-6 bg-[#6B7280]/20 border border-[#6B7280] rounded-lg">
                  <h4 className="font-black text-[#191A23] mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    改进建议
                  </h4>
                  <ul className="space-y-2 text-sm">
                    {atRiskCount > 0 && (
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#6B7280] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          关注 {atRiskCount} 名学困生，建议个性化辅导
                        </span>
                      </li>
                    )}
                    {weakestSubject && (
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#6B7280] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          {weakestSubject.name} 科目平均分最低（
                          {weakestSubject.avg.toFixed(1)} 分），建议加强教学
                        </span>
                      </li>
                    )}
                    {atRiskCount === 0 && !weakestSubject && (
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-[#6B7280] rounded-full mt-2 flex-shrink-0 border border-black"></div>
                        <span className="text-[#191A23] font-medium">
                          整体表现良好，继续保持
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-6 bg-[#6B7280]/20 border border-[#6B7280] rounded-lg">
                  <h4 className="font-black text-[#191A23] mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    学困生预警
                    {atRiskCount > 0 && (
                      <Badge className="ml-auto bg-[#6B7280] text-white border border-black font-bold text-xs">
                        {atRiskCount} 人
                      </Badge>
                    )}
                  </h4>
                  <div className="space-y-2">
                    {displayedAtRisk.map((record, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-[#6B7280]/10 border border-[#6B7280] rounded text-xs"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-[#191A23]">
                            {record.name}
                          </span>
                          {record.class_name && (
                            <span className="text-[#6B7280]">
                              {record.class_name}
                            </span>
                          )}
                        </div>
                        <Badge className="bg-[#6B7280] text-white border border-black font-bold">
                          {record.score ?? record.total_score}分
                        </Badge>
                      </div>
                    ))}
                    {atRiskCount > 5 && (
                      <button
                        onClick={() => setShowAllAtRisk(!showAllAtRisk)}
                        className="w-full text-xs text-[#6B7280] font-bold hover:text-[#191A23] transition-colors py-1"
                      >
                        {showAllAtRisk ? "收起" : `查看全部 ${atRiskCount} 人`}
                      </button>
                    )}
                    {atRiskCount === 0 && (
                      <div className="text-center py-2">
                        <CheckCircle className="w-6 h-6 text-[#B9FF66] mx-auto mb-1" />
                        <p className="text-xs font-bold text-[#191A23]">
                          暂无学困生
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

export default OverviewTab;
