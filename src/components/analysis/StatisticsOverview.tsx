import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Percent, TrendingUp, TrendingDown, Target, Users } from "lucide-react";

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
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
            <TrendingUp className="mr-2 h-4 w-4 text-blue-500" />
            平均分
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-2xl font-bold text-blue-600">{avg !== undefined && !isNaN(avg) ? avg.toFixed(2) : "0.00"}</div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
            <Target className="mr-2 h-4 w-4 text-green-500" />
            最高分
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-2xl font-bold text-green-600">{max !== undefined && !isNaN(max) ? max : "0"}</div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
            <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
            最低分
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-2xl font-bold text-red-600">{min !== undefined && !isNaN(min) ? min : "0"}</div>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm border-gray-100">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
            <Percent className="mr-2 h-4 w-4 text-amber-500" />
            及格率
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-baseline">
            <div className="text-2xl font-bold text-amber-600">{passingRate.toFixed(2)}%</div>
            <div className="ml-2 text-sm text-gray-500">({passing}/{total})</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsOverview;

