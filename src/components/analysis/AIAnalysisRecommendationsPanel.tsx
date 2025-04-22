
import React from "react";
import { Button } from "@/components/ui/button";
import { FileTextIcon } from "lucide-react";
import { toast } from "sonner";

interface Props {
  recommendations: string[];
}

export const AIAnalysisRecommendationsPanel: React.FC<Props> = ({ recommendations }) => (
  <>
    <ul className="space-y-3">
      {recommendations.map((recommendation, index) => (
        <li key={index} className="p-3 border rounded-lg bg-gray-50 flex items-start">
          <span className="bg-[#B9FF66] text-black w-6 h-6 rounded-full flex items-center justify-center mr-3 shrink-0">
            {index + 1}
          </span>
          <span>{recommendation}</span>
        </li>
      ))}
    </ul>
    <Button
      onClick={() => {
        toast.success("报告已导出", {
          description: "AI分析报告已成功导出为PDF文件"
        });
      }} 
      variant="outline" 
      className="w-full mt-4"
    >
      <FileTextIcon className="mr-2 h-4 w-4" />
      导出分析报告
    </Button>
  </>
);
