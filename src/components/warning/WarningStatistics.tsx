
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bell, Signal } from "lucide-react";

const WarningStatistics = () => {
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
            <p className="text-2xl font-bold text-red-500">5</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">中风险学生</p>
            <p className="text-2xl font-bold text-yellow-500">12</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">低风险学生</p>
            <p className="text-2xl font-bold text-blue-500">24</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">总预警数</p>
            <p className="text-2xl font-bold">41</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WarningStatistics;
