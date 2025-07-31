/**
 * 优化的统计面板组件
 * 使用记忆化和渐进式渲染优化性能
 */

import React, { useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { GradeData } from "@/types/grade";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatisticsPanelProps {
  data: GradeData[];
  showTrends?: boolean;
  compareWith?: GradeData[];
  className?: string;
}

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  description?: string;
  color?: string;
}

// 统计卡片组件
const StatisticCard = memo<{ stat: StatCard; index: number }>(
  ({ stat, index }) => {
    const {
      title,
      value,
      icon: Icon,
      trend,
      description,
      color = "blue",
    } = stat;

    const colorClasses = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-500",
      red: "bg-red-500",
      purple: "bg-purple-500",
    };

    const trendIcon =
      trend?.direction === "up"
        ? ArrowUp
        : trend?.direction === "down"
          ? ArrowDown
          : Minus;
    const TrendIcon = trendIcon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <div
            className={cn(
              "absolute inset-0 opacity-10",
              colorClasses[color as keyof typeof colorClasses]
            )}
          />
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                {description && (
                  <p className="text-xs text-gray-500 mt-1">{description}</p>
                )}
                {trend && (
                  <div
                    className={cn(
                      "flex items-center gap-1 mt-2",
                      trend.direction === "up"
                        ? "text-green-600"
                        : trend.direction === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                    )}
                  >
                    <TrendIcon className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {Math.abs(trend.value)}%
                    </span>
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "p-3 rounded-lg",
                  colorClasses[color as keyof typeof colorClasses],
                  "bg-opacity-20"
                )}
              >
                <Icon className={cn("h-6 w-6", `text-${color}-600`)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

const StatisticsPanel: React.FC<StatisticsPanelProps> = memo(
  ({ data, showTrends = true, compareWith, className }) => {
    // 计算统计数据
    const statistics = useMemo(() => {
      if (!data || data.length === 0) {
        return {
          avgScore: 0,
          maxScore: 0,
          minScore: 0,
          studentCount: 0,
          passRate: 0,
          excellentRate: 0,
          improvementRate: 0,
          avgRank: 0,
        };
      }

      const scores = data.map((d) => d.total_score || 0).filter((s) => s > 0);
      const ranks = data
        .map((d) => d.total_rank_in_grade || 0)
        .filter((r) => r > 0);

      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length || 0;
      const maxScore = Math.max(...scores, 0);
      const minScore = Math.min(...scores.filter((s) => s > 0), 0);
      const studentCount = data.length;
      const passCount = scores.filter((s) => s >= 60).length;
      const excellentCount = scores.filter((s) => s >= 90).length;
      const passRate = (passCount / studentCount) * 100 || 0;
      const excellentRate = (excellentCount / studentCount) * 100 || 0;
      const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length || 0;

      // 计算改进率（如果有对比数据）
      let improvementRate = 0;
      if (compareWith && compareWith.length > 0) {
        const compareAvg =
          compareWith
            .map((d) => d.total_score || 0)
            .filter((s) => s > 0)
            .reduce((a, b) => a + b, 0) / compareWith.length || 0;
        improvementRate =
          compareAvg > 0 ? ((avgScore - compareAvg) / compareAvg) * 100 : 0;
      }

      return {
        avgScore,
        maxScore,
        minScore,
        studentCount,
        passRate,
        excellentRate,
        improvementRate,
        avgRank,
      };
    }, [data, compareWith]);

    // 生成统计卡片数据
    const statCards: StatCard[] = useMemo(() => {
      const cards: StatCard[] = [
        {
          title: "平均分",
          value: statistics.avgScore.toFixed(1),
          icon: BarChart3,
          color: "blue",
          description: `最高 ${statistics.maxScore} / 最低 ${statistics.minScore}`,
          trend:
            showTrends && statistics.improvementRate !== 0
              ? {
                  value: Math.abs(statistics.improvementRate),
                  direction: statistics.improvementRate > 0 ? "up" : "down",
                }
              : undefined,
        },
        {
          title: "学生人数",
          value: statistics.studentCount,
          icon: Users,
          color: "purple",
          description: "参与统计人数",
        },
        {
          title: "及格率",
          value: `${statistics.passRate.toFixed(1)}%`,
          icon: Target,
          color:
            statistics.passRate >= 80
              ? "green"
              : statistics.passRate >= 60
                ? "yellow"
                : "red",
          description: `${Math.round((statistics.passRate * statistics.studentCount) / 100)} 人及格`,
        },
        {
          title: "优秀率",
          value: `${statistics.excellentRate.toFixed(1)}%`,
          icon: Trophy,
          color:
            statistics.excellentRate >= 30
              ? "green"
              : statistics.excellentRate >= 15
                ? "yellow"
                : "red",
          description: `${Math.round((statistics.excellentRate * statistics.studentCount) / 100)} 人优秀`,
        },
      ];

      if (statistics.avgRank > 0) {
        cards.push({
          title: "平均排名",
          value: Math.round(statistics.avgRank),
          icon: TrendingUp,
          color: "purple",
          description: "年级平均排名",
        });
      }

      return cards;
    }, [statistics, showTrends]);

    // 成绩分布
    const gradeDistribution = useMemo(() => {
      const distribution = {
        "优秀 (90-100)": 0,
        "良好 (80-89)": 0,
        "中等 (70-79)": 0,
        "及格 (60-69)": 0,
        "不及格 (0-59)": 0,
      };

      data.forEach((item) => {
        const score = item.total_score || 0;
        if (score >= 90) distribution["优秀 (90-100)"]++;
        else if (score >= 80) distribution["良好 (80-89)"]++;
        else if (score >= 70) distribution["中等 (70-79)"]++;
        else if (score >= 60) distribution["及格 (60-69)"]++;
        else if (score > 0) distribution["不及格 (0-59)"]++;
      });

      return distribution;
    }, [data]);

    if (data.length === 0) {
      return (
        <Card className={className}>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-gray-500">暂无统计数据</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className={cn("space-y-6", className)}>
        {/* 统计卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <StatisticCard key={stat.title} stat={stat} index={index} />
          ))}
        </div>

        {/* 成绩分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">成绩分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(gradeDistribution).map(([grade, count]) => {
                const percentage = (count / statistics.studentCount) * 100 || 0;
                const colors = {
                  "优秀 (90-100)": "bg-green-500",
                  "良好 (80-89)": "bg-blue-500",
                  "中等 (70-79)": "bg-yellow-500",
                  "及格 (60-69)": "bg-orange-500",
                  "不及格 (0-59)": "bg-red-500",
                };

                return (
                  <div key={grade} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{grade}</span>
                      <span className="font-medium">
                        {count} 人 ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className="h-2"
                      indicatorClassName={colors[grade as keyof typeof colors]}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

StatisticsPanel.displayName = "StatisticsPanel";

export default StatisticsPanel;
