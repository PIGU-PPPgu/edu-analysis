import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnomalyStats as AnomalyStatsType } from "../types/anomaly";

interface AnomalyStatsProps {
  stats: AnomalyStatsType;
}

const AnomalyStats: React.FC<AnomalyStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#9C88FF] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#9C88FF]">
        <CardContent className="p-6 text-center">
          <div className="text-3xl font-black text-[#191A23] mb-2">
            {stats.totalStudents}
          </div>
          <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
            总学生数
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardContent className="p-6 text-center">
          <div className="text-3xl font-black text-[#191A23] mb-2">
            {stats.affectedStudents}
          </div>
          <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
            异常学生数
          </div>
          <div className="text-xs font-medium text-[#191A23]/70 mt-1">
            ({stats.affectedRate.toFixed(1)}%)
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardContent className="p-6 text-center">
          <div className="text-3xl font-black text-[#191A23] mb-2">
            {stats.highRiskCount}
          </div>
          <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
            高风险异常
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#B9FF66] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#B9FF66]">
        <CardContent className="p-6 text-center">
          <div className="text-3xl font-black text-[#191A23] mb-2">
            {stats.mediumRiskCount}
          </div>
          <div className="text-sm font-bold text-[#191A23] uppercase tracking-wide">
            中风险异常
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(AnomalyStats);
