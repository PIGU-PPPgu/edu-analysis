
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const AIAnalysisOptions: React.FC = () => (
  <div className="space-y-3">
    <Label>AI分析选项</Label>
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Switch id="student-analysis" defaultChecked />
        <Label htmlFor="student-analysis">学生个体分析</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="class-analysis" defaultChecked />
        <Label htmlFor="class-analysis">班级整体分析</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="improvement-suggestions" defaultChecked />
        <Label htmlFor="improvement-suggestions">改进建议</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="performance-prediction" defaultChecked />
        <Label htmlFor="performance-prediction">成绩趋势预测</Label>
      </div>
    </div>
  </div>
);
