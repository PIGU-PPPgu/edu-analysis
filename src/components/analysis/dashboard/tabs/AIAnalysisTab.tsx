import React from "react";
import ClassAIDiagnostician from "@/components/analysis/ai/ClassAIDiagnostician";
import StudentAIAdvisor from "@/components/analysis/ai/StudentAIAdvisor";

interface AIAnalysisTabProps {
  filteredGradeData: any[];
}

const AIAnalysisTab: React.FC<AIAnalysisTabProps> = ({ filteredGradeData }) => {
  return (
    <div className="space-y-6">
      <ClassAIDiagnostician gradeData={filteredGradeData} className="" />
      <StudentAIAdvisor gradeData={filteredGradeData} className="" />
    </div>
  );
};

export default AIAnalysisTab;
