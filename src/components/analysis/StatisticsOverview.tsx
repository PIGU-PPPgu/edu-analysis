import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">平均分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avg !== undefined && !isNaN(avg) ? avg.toFixed(2) : "0.00"}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">最高分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{max !== undefined ? max : "0"}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">最低分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{min !== undefined ? min : "0"}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">及格率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {!isNaN(passingRate) ? passingRate.toFixed(2) : "0.00"}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsOverview;

