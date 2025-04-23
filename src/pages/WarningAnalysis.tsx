
import React from "react";
import Navbar from "@/components/analysis/Navbar";
import WarningDashboard from "@/components/warning/WarningDashboard";
import WarningRules from "@/components/warning/WarningRules";
import WarningList from "@/components/warning/WarningList";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Settings, AlertTriangle } from "lucide-react";

const WarningAnalysis = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">预警分析</h1>
            <p className="text-gray-500 mt-1">
              基于多维度数据的学生学习预警系统，整合成绩、出勤、作业和参与度等数据
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/ai-settings">
              <Settings className="mr-2 h-4 w-4" />
              AI配置
            </Link>
          </Button>
        </div>
        
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="h-6 w-6 text-amber-500 mr-2" />
            <div>
              <h4 className="font-medium">预警系统说明</h4>
              <p className="text-sm mt-1">
                本系统通过分析多种维度的学生数据，识别潜在风险因素并生成预警。
                您可以设置基于不同数据维度（成绩、出勤率、作业完成情况等）的预警规则，
                系统将自动评估并向您提供学生风险分析。
              </p>
            </div>
          </div>
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
