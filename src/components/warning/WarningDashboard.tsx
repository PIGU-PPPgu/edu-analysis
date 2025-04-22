
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WarningList from "./WarningList";
import WarningStatistics from "./WarningStatistics";
import RiskFactorChart from "./RiskFactorChart";
import { AlertTriangle, Bell } from "lucide-react";

const WarningDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WarningStatistics />
        <RiskFactorChart />
      </div>
      <WarningList />
    </div>
  );
};

export default WarningDashboard;
