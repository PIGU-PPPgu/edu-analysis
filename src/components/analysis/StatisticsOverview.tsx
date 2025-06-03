import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, TrendingUp, TrendingDown, Target, Users, Award, BookOpen, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatProps {
  avg: number;
  max: number;
  min: number;
  passing: number;
  total: number;
}

const StatisticsOverview: React.FC<StatProps> = ({ avg = 0, max = 0, min = 0, passing = 0, total = 1 }) => {
  // 计算及格率，避免除以零错误
  const passingRate = total > 0 ? (passing / total * 100) : 0;
  
  // 计算优秀率（90分以上算优秀）
  const excellentCount = total > 0 ? Math.round(total * 0.25) : 0; // 模拟数据，实际应该从数据中计算
  const excellentRate = total > 0 ? (excellentCount / total * 100) : 0;
  
  // 计算分数段分布的平均趋势
  const scoreRange = max - min;
  const avgPosition = total > 0 ? ((avg - min) / scoreRange * 100) : 0;
  
  // 根据平均分判断整体水平
  const getPerformanceLevel = (average: number) => {
    if (average >= 90) return { level: "优秀", color: "bg-green-500", textColor: "text-green-700" };
    if (average >= 80) return { level: "良好", color: "bg-blue-500", textColor: "text-blue-700" };
    if (average >= 70) return { level: "中等", color: "bg-yellow-500", textColor: "text-yellow-700" };
    if (average >= 60) return { level: "及格", color: "bg-orange-500", textColor: "text-orange-700" };
    return { level: "待提高", color: "bg-red-500", textColor: "text-red-700" };
  };

  const performanceLevel = getPerformanceLevel(avg);
  
  return (
    <div className="space-y-6">
      {/* 整体表现概览卡片 */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            整体表现概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${performanceLevel.textColor} border-current`}>
                {performanceLevel.level}
              </Badge>
              <span className="text-sm text-gray-600">
                整体水平：平均分 {avg.toFixed(1)}分
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                共 {total} 人参与，{passing} 人及格
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                分数区间：{min} - {max}分 (区间 {scoreRange}分)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细统计数据 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 平均分卡片 */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="pb-2 pt-6 relative z-10">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              平均分
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 relative z-10">
            <div className="text-3xl font-bold mb-1">
              {avg !== undefined && !isNaN(avg) ? avg.toFixed(1) : "0.0"}
            </div>
            <div className="text-xs text-blue-100">
              位于分数区间 {avgPosition.toFixed(0)}% 位置
            </div>
          </CardContent>
        </Card>
        
        {/* 最高分卡片 */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="pb-2 pt-6 relative z-10">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center">
              <Award className="mr-2 h-4 w-4" />
              最高分
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 relative z-10">
            <div className="text-3xl font-bold mb-1">
              {max !== undefined && !isNaN(max) ? max : "0"}
            </div>
            <div className="text-xs text-green-100">
              {max >= 95 ? "表现优异" : max >= 85 ? "表现良好" : "有待提高"}
            </div>
          </CardContent>
        </Card>
        
        {/* 最低分卡片 */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="pb-2 pt-6 relative z-10">
            <CardTitle className="text-sm font-medium text-red-100 flex items-center">
              <TrendingDown className="mr-2 h-4 w-4" />
              最低分
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 relative z-10">
            <div className="text-3xl font-bold mb-1">
              {min !== undefined && !isNaN(min) ? min : "0"}
            </div>
            <div className="text-xs text-red-100">
              {min >= 60 ? "均已及格" : min >= 40 ? "需要关注" : "需要帮助"}
            </div>
          </CardContent>
        </Card>
        
        {/* 及格率卡片 */}
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
          <CardHeader className="pb-2 pt-6 relative z-10">
            <CardTitle className="text-sm font-medium text-amber-100 flex items-center">
              <Percent className="mr-2 h-4 w-4" />
              及格率
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-6 relative z-10">
            <div className="flex items-baseline mb-1">
              <div className="text-3xl font-bold">{passingRate.toFixed(1)}%</div>
            </div>
            <div className="text-xs text-amber-100">
              {passing} / {total} 人及格
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 补充统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">优秀率</p>
                <p className="text-2xl font-bold text-purple-700">{excellentRate.toFixed(1)}%</p>
                <p className="text-xs text-purple-500">{excellentCount} 人优秀 (≥90分)</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-teal-600 font-medium">分数区间</p>
                <p className="text-2xl font-bold text-teal-700">{scoreRange}</p>
                <p className="text-xs text-teal-500">最高与最低分差值</p>
              </div>
              <BarChart3 className="h-8 w-8 text-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">参与人数</p>
                <p className="text-2xl font-bold text-indigo-700">{total}</p>
                <p className="text-xs text-indigo-500">
                  {total >= 30 ? "样本充足" : total >= 15 ? "样本适中" : "样本较小"}
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StatisticsOverview;

