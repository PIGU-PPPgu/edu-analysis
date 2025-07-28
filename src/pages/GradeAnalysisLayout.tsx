/**
 * 🎨 现代化成绩分析页面
 * 基于新的架构和设计理念重构
 */

import React from "react";
import { ModernGradeAnalysisProvider } from "@/contexts/ModernGradeAnalysisContext";
import CompleteAnalyticsDashboard from "@/components/analysis/dashboard/CompleteAnalyticsDashboard_Safe";
import Navbar from "@/components/shared/Navbar";

const GradeAnalysisLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <ModernGradeAnalysisProvider>
        <CompleteAnalyticsDashboard />
      </ModernGradeAnalysisProvider>
    </div>
  );
};

export default GradeAnalysisLayout;
