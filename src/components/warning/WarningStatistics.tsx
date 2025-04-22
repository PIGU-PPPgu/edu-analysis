
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

type WarningStats = {
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  total: number;
};

const WarningStatistics = () => {
  // Use mock data instead of database query for now
  const mockWarningStats: WarningStats = {
    high_risk: 5,
    medium_risk: 12,
    low_risk: 24,
    total: 41
  };

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['warningStats'],
    queryFn: async () => {
      // Simulate API call
      return new Promise<WarningStats>((resolve) => {
        setTimeout(() => {
          resolve(mockWarningStats);
        }, 500);
      });
    }
  });

  if (error) {
    toast.error("获取统计数据失败");
    return null;
  }

  if (isLoading) {
    return <div>加载中...</div>;
  }

  const warningStats = stats as WarningStats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          预警统计
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">高风险学生</p>
            <p className="text-2xl font-bold text-red-500">{warningStats?.high_risk || 0}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">中风险学生</p>
            <p className="text-2xl font-bold text-yellow-500">{warningStats?.medium_risk || 0}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">低风险学生</p>
            <p className="text-2xl font-bold text-blue-500">{warningStats?.low_risk || 0}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">总预警数</p>
            <p className="text-2xl font-bold">{warningStats?.total || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WarningStatistics;
