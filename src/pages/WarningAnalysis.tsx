
import React from "react";
import Navbar from "@/components/analysis/Navbar";
import WarningDashboard from "@/components/warning/WarningDashboard";
import WarningRules from "@/components/warning/WarningRules";
import WarningList from "@/components/warning/WarningList";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings } from "lucide-react";

const WarningAnalysis = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">预警分析</h1>
            <p className="text-gray-500 mt-1">
              基于成绩和AI分析的学生学习预警系统
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai-settings">
              <Settings className="mr-2 h-4 w-4" />
              AI配置
            </Link>
          </Button>
        </div>
        
        <div className="space-y-6">
          <WarningDashboard />
          <WarningList />
          <WarningRules />
        </div>
      </div>
    </div>
  );
};

export default WarningAnalysis;
