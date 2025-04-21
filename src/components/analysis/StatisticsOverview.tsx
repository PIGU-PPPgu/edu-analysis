
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatProps {
  avg: number;
  max: number;
  min: number;
  passing: number;
  total: number;
}

const StatisticsOverview: React.FC<StatProps> = ({ avg, max, min, passing, total }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">平均分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avg.toFixed(2)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">最高分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{max}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">最低分</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{min}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">及格率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(passing / total * 100).toFixed(2)}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatisticsOverview;

