
import React from "react";
import Navbar from "@/components/analysis/Navbar";
import WarningDashboard from "@/components/warning/WarningDashboard";
import { Card } from "@/components/ui/card";

const WarningAnalysis = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">预警分析</h1>
          <p className="text-gray-500 mt-1">
            基于成绩和AI分析的学生学习预警系统
          </p>
        </div>
        <WarningDashboard />
      </div>
    </div>
  );
};

export default WarningAnalysis;
