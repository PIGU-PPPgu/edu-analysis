
import React from "react";
import { GradeAnalysisProvider } from "@/contexts/GradeAnalysisContext";
import GradeAnalysisLayout from "./GradeAnalysisLayout";

const GradeAnalysis: React.FC = () => {
  return (
    <GradeAnalysisProvider>
      <GradeAnalysisLayout />
    </GradeAnalysisProvider>
  );
};

export default GradeAnalysis;
