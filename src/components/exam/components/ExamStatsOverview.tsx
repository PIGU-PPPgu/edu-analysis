/**
 * 考试统计概览组件
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  Users,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from "lucide-react";
import { ExamStatistics } from "../types";

interface ExamStatsOverviewProps {
  statistics: ExamStatistics;
  isLoading?: boolean;
}

export const ExamStatsOverview: React.FC<ExamStatsOverviewProps> = ({
  statistics,
  isLoading = false,
}) => {
  const statsCards = [
    {
      title: "考试总数",
      value: statistics.total,
      icon: <BookOpen className="h-4 w-4 text-blue-600" />,
      bgColor: "bg-blue-50",
      textColor: "text-blue-900",
    },
    {
      title: "待进行",
      value: statistics.upcoming,
      icon: <Clock className="h-4 w-4 text-orange-600" />,
      bgColor: "bg-orange-50",
      textColor: "text-orange-900",
    },
    {
      title: "进行中",
      value: statistics.ongoing,
      icon: <Calendar className="h-4 w-4 text-green-600" />,
      bgColor: "bg-green-50",
      textColor: "text-green-900",
    },
    {
      title: "已完成",
      value: statistics.completed,
      icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-900",
    },
  ];

  const progressCards = [
    {
      title: "平均参与率",
      value: statistics.averageParticipation,
      unit: "%",
      progress: statistics.averageParticipation,
      icon: <Users className="h-4 w-4 text-purple-600" />,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "平均分数",
      value: statistics.averageScore,
      unit: "分",
      progress: (statistics.averageScore / 100) * 100,
      icon: <BarChart3 className="h-4 w-4 text-indigo-600" />,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "改善率",
      value: statistics.improvementRate,
      unit: "%",
      progress: Math.max(0, statistics.improvementRate),
      icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "风险考试",
      value: statistics.riskExams,
      unit: "场",
      progress: Math.min((statistics.riskExams / statistics.total) * 100, 100),
      icon: <AlertTriangle className="h-4 w-4 text-red-600" />,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-300 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-300 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
              <div className="h-2 bg-gray-300 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 基础统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.textColor}`}>
                {stat.value.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 进度条统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {progressCards.map((stat, index) => (
          <Card
            key={index}
            className="hover:shadow-md transition-shadow duration-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div
                className={`text-2xl font-bold ${stat.color} flex items-baseline`}
              >
                {stat.value.toLocaleString()}
                <span className="text-sm text-gray-500 ml-1">{stat.unit}</span>
              </div>
              <div className="space-y-1">
                <Progress
                  value={Math.max(0, Math.min(100, stat.progress))}
                  className="h-2"
                />
                <div className="text-xs text-gray-500">
                  {stat.progress > 0
                    ? `${stat.progress.toFixed(1)}%`
                    : "无数据"}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 总体健康度指标 */}
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-2" />
            考试管理健康度
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 完成率 */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">完成率</div>
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg
                  className="w-16 h-16 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    className="text-gray-300"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={`${(statistics.completed / Math.max(statistics.total, 1)) * 100}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-700">
                    {statistics.total > 0
                      ? Math.round(
                          (statistics.completed / statistics.total) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {statistics.completed}/{statistics.total} 已完成
              </div>
            </div>

            {/* 参与度 */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">参与度</div>
              <div className="relative w-16 h-16 mx-auto mb-2">
                <svg
                  className="w-16 h-16 transform -rotate-90"
                  viewBox="0 0 36 36"
                >
                  <path
                    className="text-gray-300"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-purple-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={`${statistics.averageParticipation}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-gray-700">
                    {Math.round(statistics.averageParticipation)}%
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">平均参与率</div>
            </div>

            {/* 质量评级 */}
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">质量评级</div>
              <div className="relative w-16 h-16 mx-auto mb-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {statistics.averageScore >= 90
                      ? "A"
                      : statistics.averageScore >= 80
                        ? "B"
                        : statistics.averageScore >= 70
                          ? "C"
                          : statistics.averageScore >= 60
                            ? "D"
                            : "E"}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                平均 {Math.round(statistics.averageScore)} 分
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
